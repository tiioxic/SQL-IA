from flask import Flask, render_template, request, jsonify
from models.llm_handler import llm
from db.connection import db_manager
import json
import os
from datetime import datetime
from dotenv import load_dotenv
import sqlparse
import re
import pandas as pd
import numpy as np

from db.seed_data import run_seeding

load_dotenv()

app = Flask(__name__)

HISTORY_FILE = "db/history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4, ensure_ascii=False)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/editor")
def editor():
    return render_template("editor.html")

@app.route("/api/upload_schema", methods=["POST"])
def upload_schema():
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nom de fichier vide"}), 400
    
    # On sauvegarde le schéma dans le dossier docs
    schema_path = os.path.join("docs", "database_schema.md")
    file.save(schema_path)
    
    # On fait aussi une copie dans static pour l'accès direct via fetch dans le JS
    static_path = os.path.join("static", "database_schema.md")
    with open(schema_path, 'rb') as f:
        content = f.read()
    with open(static_path, 'wb') as f:
        f.write(content)
        
    return jsonify({"status": "Schéma mis à jour avec succès"})

@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.json
    user_query = data.get("query")
    mode = data.get("mode", "editor") # Default to editor
    print(f"DEBUG: Requête reçue (Mode: {mode}): {user_query}")
    if not user_query:
        return jsonify({"error": "La requête est vide"}), 400
    
    llm_res = llm.generate_sql(user_query, mode=mode)
    
    if isinstance(llm_res, str):
        return jsonify({"sql": llm_res, "explanation": "Erreur ou requête invalide."})

    sql = llm_res.get("sql", "")
    explanation = llm_res.get("explanation", "Voici votre requête.")

    # Formatage SQL
    if sql and not sql.startswith("Error:"):
        try:
            sql = sqlparse.format(sql, reindent=True, keyword_case='upper', strip_comments=False)
        except:
            pass
        
    print(f"DEBUG: SQL généré: {sql}")
    return jsonify({"sql": sql, "explanation": explanation})

def compute_stats(columns, data):
    if not data:
        return []
    
    df = pd.DataFrame(data, columns=columns)
    stats = []
    
    for col in columns:
        col_data = df[col]
        
        # Basic stats
        total_rows = len(df)
        null_count = col_data.isna().sum()
        unique_count = col_data.nunique()
        
        # Type detection (simple)
        dtype = "string"
        if pd.api.types.is_numeric_dtype(col_data):
            dtype = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(col_data):
            dtype = "date"
            
        # Value distribution (Top 5)
        top_values = []
        counts = col_data.value_counts().head(5)
        for val, count in counts.items():
            top_values.append({
                "value": str(val),
                "count": int(count),
                "percentage": round((count / total_rows) * 100, 1)
            })
            
        stats.append({
            "column": col,
            "type": dtype,
            "null_count": int(null_count),
            "null_percentage": round((null_count / total_rows) * 100, 1),
            "unique_count": int(unique_count),
            "top_values": top_values,
            "min": str(col_data.min()) if dtype == "numeric" else None,
            "max": str(col_data.max()) if dtype == "numeric" else None,
            "mean": float(col_data.mean()) if dtype == "numeric" else None
        })
        
    return stats

@app.route("/api/execute", methods=["POST"])
def execute():
    data = request.json
    sql = data.get("sql", "").strip()
    if sql.endswith(';'):
        sql = sql[:-1].strip()
        
    print(f"DEBUG: Exécution SQL demandée (nettoyée): {sql}")
    if not sql:
        return jsonify({"error": "Le SQL est vide"}), 400
    
    # --- VÉRIFICATION DE SÉCURITÉ ---
    sql_upper = sql.upper()
    forbidden_keywords = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "ALTER", "CREATE", "GRANT", "REVOKE", "INSERT"]
    
    for kw in forbidden_keywords:
        # On vérifie avec un regex pour s'assurer que c'est le mot entier (pas une colonne type 'STATUT_UPDATE')
        if re.search(r'\b' + kw + r'\b', sql_upper):
            return jsonify({"error": f"Sécurité : L'instruction '{kw}' n'est pas autorisée dans cet éditeur."}), 403
    
    import time
    start_time = time.perf_counter()
    
    result, error = db_manager.execute_query(sql)
    execution_time = (time.perf_counter() - start_time) * 1000 # en ms
    
    if error:
        print(f"DEBUG: Erreur Oracle détectée: {error}")
        return jsonify({"error": error, "execution_time": round(execution_time, 2)}), 200 # On renvoie 200 pour que le front gère l'erreur proprement sans erreur réseau 500
    
    print("DEBUG: Requête exécutée avec succès")
    
    # On ajoute les stats si c'est un SELECT (dict avec colonnes et données)
    if isinstance(result, dict) and "columns" in result and "data" in result:
        try:
            result["stats"] = compute_stats(result["columns"], result["data"])
        except Exception as e:
            print(f"DEBUG: Error computing stats: {e}")
            result["stats"] = []
            
    result["execution_time"] = round(execution_time, 2)
    return jsonify(result)

@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify(load_history())

@app.route("/api/history", methods=["POST"])
def add_to_history():
    data = request.json
    query = data.get("query")
    sql = data.get("sql")
    
    history = load_history()
    history.insert(0, {
        "id": len(history) + 1,
        "query": query,
        "sql": sql,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    save_history(history[:50])
    return jsonify({"status": "ok"})

@app.route("/api/init_db", methods=["POST"])
def init_db():
    sql_path = os.path.join("db", "init_schema.sql")
    if not os.path.exists(sql_path):
        return jsonify({"error": "Fichier init_schema.sql introuvable"}), 404
        
    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Découpage par le séparateur explicite défini dans le fichier
        commands = content.split('-- SEPARATOR --')
        
        success_count = 0
        errors = []
        
        for cmd in commands:
            cmd = cmd.strip()
            
            # On retire les commentaires vides ou les lignes de commentaires pour vérifier s'il reste du SQL
            clean_cmd = re.sub(r'--.*$', '', cmd, flags=re.MULTILINE).strip()
            if not clean_cmd:
                continue
                
            # Nettoyage du point-virgule terminal pour Oracle (sauf blocs PL/SQL BEGIN/END)
            if not clean_cmd.upper().startswith('BEGIN') and clean_cmd.endswith(';'):
                cmd = cmd.rstrip().rstrip(';').strip()
            
            # Log plus propre
            log_name = clean_cmd.split('\n')[0][:50]
            
            print(f"DEBUG: Initialisation - Exécution de : {log_name}...")
            res, error = db_manager.execute_query(cmd)
            if error:
                print(f"DEBUG: Erreur rencontrée : {error}")
                errors.append(f"Erreur sur : {log_name} -> {error}")
            else:
                success_count += 1
               
        if errors:
            return jsonify({
                "status": "partial_success",
                "message": f"{success_count} commandes exécutées, {len(errors)} erreurs.",
                "errors": errors
            })
            
        return jsonify({"status": "success", "message": "Base de données initialisée avec succès !"})
       
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/seed_db", methods=["POST"])
def seed_db():
    success, message = run_seeding(db_manager)
    if success:
        return jsonify({"status": "success", "message": message})
    else:
        return jsonify({"status": "error", "error": message}), 500

@app.route("/api/history/delete", methods=["POST"])
def delete_history():
    data = request.json
    item_id = data.get("id")
    if item_id is None:
        return jsonify({"error": "ID manquant"}), 400
    
    history = load_history()
    # On filtre pour garder tout sauf celui à supprimer
    # item_id peut être string ou int selon JSON
    new_history = [item for item in history if str(item.get("id")) != str(item_id)]
    save_history(new_history)
    return jsonify({"status": "ok"})

@app.route("/api/fix_sql", methods=["POST"])
def fix_sql():
    from routes.fix_sql import fix_sql_route
    return fix_sql_route()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

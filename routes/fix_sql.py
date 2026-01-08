from flask import request, jsonify
from models.llm_handler import llm
import sqlparse
import re

def fix_sql_route():
    """
    Endpoint de correction SQL.
    Approche mixte : Regex pour les erreurs évidentes, IA simplifiée pour le reste.
    """
    data = request.json
    sql = data.get("sql", "").strip()
    error = data.get("error", "").strip()
    
    if not sql or not error:
        return jsonify({"error": "SQL et erreur requis"}), 400
    
    explanation = ""
    fixed_sql = sql
    
    # ---------------------------------------------------------
    # 1. CORRECTION ALGORITHMIQUE (RÈGLES LOCALES)
    # ---------------------------------------------------------
    
    corrected_locally = False
    
    # Règle 1: LIMIT -> FETCH FIRST
    if "LIMIT" in fixed_sql.upper() and ("ORA-00933" in error or "ORA-00900" in error or "ORA-03049" in error):
        if re.search(r'\bLIMIT\s+\d+', fixed_sql, re.IGNORECASE):
            fixed_sql = re.sub(
                r'\bLIMIT\s+(\d+)(\s*;)?',
                r'FETCH FIRST \1 ROWS ONLY',
                fixed_sql,
                flags=re.IGNORECASE
            )
            explanation = "Correction syntaxe : LIMIT remplacé par FETCH FIRST (Oracle)."
            corrected_locally = True

    # Règle 2: NOW() -> SYSDATE
    if "NOW()" in fixed_sql.upper():
        fixed_sql = fixed_sql.replace("NOW()", "SYSDATE").replace("now()", "SYSDATE")
        explanation = "Correction syntaxe : NOW() remplacé par SYSDATE (Oracle)."
        corrected_locally = True

    if corrected_locally:
        try:
            fixed_sql = sqlparse.format(fixed_sql, reindent=True, keyword_case='upper', strip_comments=False)
        except:
            pass
        return jsonify({"fixed_sql": fixed_sql, "explanation": explanation})
        
    # ---------------------------------------------------------
    # 2. APPEL À L'IA (Style Autocomplétion)
    # ---------------------------------------------------------
    
    # Prompt simplifié au maximum pour éviter que le modèle ne s'embrouille
    fix_prompt = f"""/*
 * Database: Oracle SQL
 * Task: Fix the query below based on the error message.
 * Error Message: {error}
 */

-- Original Query:
{sql}

-- Corrected Query (Oracle Syntax):
"""
    
    try:
        from models.llm_handler import LLMHandler
        llm_instance = LLMHandler()
        
        import requests
        payload = {
            "model": llm_instance.model_name,
            "prompt": fix_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1, # Très faible créativité pour rester factuel
                "stop": [";", "```"] # Stop dès que la requête est finie
            }
        }
        
        response = requests.post(llm_instance.api_url, json=payload, timeout=45)
        response.raise_for_status()
        llm_data = response.json()
        raw_response = llm_data.get("response", "").strip()
        
        print(f"DEBUG: Réponse IA brute: {raw_response}")
        
        # Nettoyage
        cleaned_response = re.sub(r'</?s>', '', raw_response) # Supprime balises de fin de phrase
        cleaned_response = re.sub(r'```sql', '', cleaned_response)
        cleaned_response = re.sub(r'```', '', cleaned_response)
        cleaned_response = cleaned_response.strip()
        
        # Si la réponse commence par "SELECT" (ou autre) c'est gagné
        # Sinon, on cherche le premier bloc SQL valide
        if not re.match(r'^(SELECT|INSERT|UPDATE|DELETE|WITH)', cleaned_response, re.IGNORECASE):
            # Recherche d'un motif SQL
            match = re.search(r'(SELECT|INSERT|UPDATE|DELETE|WITH).*', cleaned_response, re.IGNORECASE | re.DOTALL)
            if match:
                cleaned_response = match.group(0)
        
        # Validation minimale
        if len(cleaned_response) < 10:
             return jsonify({"fixed_sql": sql, "explanation": "L'IA n'a pas pu identifier la correction."})

        fixed_sql = cleaned_response
        explanation = f"Correction suggérée pour l'erreur : {error}"

        # Formatage
        try:
            fixed_sql = sqlparse.format(fixed_sql, reindent=True, keyword_case='upper', strip_comments=False)
        except:
            pass
        
        return jsonify({"fixed_sql": fixed_sql, "explanation": explanation})
        
    except Exception as e:
        print(f"DEBUG: Erreur IA: {str(e)}")
        return jsonify({"error": f"Erreur technique: {str(e)}"}), 500

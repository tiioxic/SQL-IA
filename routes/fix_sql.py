from flask import request, jsonify
from models.llm_handler import llm
import sqlparse
import re

def fix_sql_route():
    """
    Endpoint pour corriger une requête SQL en utilisant l'IA.
    Reçoit le SQL erroné et le message d'erreur Oracle, puis demande à l'IA de corriger.
    """
    data = request.json
    sql = data.get("sql", "").strip()
    error = data.get("error", "").strip()
    
    if not sql or not error:
        return jsonify({"error": "SQL et erreur requis"}), 400
    
    # Prompt de correction pour l'IA - VERSION STRICTE
    fix_prompt = f"""### Task
You are an Oracle SQL expert. The following query has an error. Your job is to return the COMPLETE CORRECTED query.

### Original Query (WITH ERROR)
{sql}

### Oracle Error Message
{error}

### CRITICAL RULES
1. You MUST return the ENTIRE corrected SQL query from SELECT (or other command) to the end.
2. DO NOT return only a fragment like "ORDER BY ..." or "FROM ...".
3. Start with a comment (--) explaining the fix in FRENCH.
4. Replace any MySQL/PostgreSQL syntax with Oracle syntax:
   - REPLACE 'LIMIT n' WITH 'FETCH FIRST n ROWS ONLY'
   - Use SYSDATE not NOW()
   - Use || for concatenation
5. Don't use a semi-colon at the end.

### Example of GOOD response (COMPLETE QUERY)
-- Correction: Remplacement de LIMIT 10 par FETCH FIRST 10 ROWS ONLY
SELECT CLIENTS.NOM, CLIENTS.PRENOM, SUM(COMMANDES.MONTANT_TOTAL) AS total
FROM CLIENTS
JOIN COMMANDES ON CLIENTS.CLIENT_ID = COMMANDES.CLIENT_ID
GROUP BY CLIENTS.NOM, CLIENTS.PRENOM
ORDER BY total DESC
FETCH FIRST 10 ROWS ONLY

### Example of BAD response (FRAGMENT - DO NOT DO THIS)
ORDER BY total DESC FETCH FIRST 10 ROWS ONLY

### Your Complete Corrected Query (start with --)
"""
    
    try:
        # Appel à l'IA pour la correction
        from models.llm_handler import LLMHandler
        llm_instance = LLMHandler()
        
        import requests
        payload = {
            "model": llm_instance.model_name,
            "prompt": fix_prompt,
            "stream": False,
            "options": {"temperature": 0}
        }
        
        response = requests.post(llm_instance.api_url, json=payload, timeout=45)
        response.raise_for_status()
        llm_data = response.json()
        fixed_code = llm_data.get("response", "").strip()
        
        print(f"DEBUG: Réponse de correction brute: {fixed_code}")
        
        # Nettoyage agressif des tokens spéciaux et balises
        fixed_code = re.sub(r'</?s>', '', fixed_code)  # Supprimer <s> et </s>
        fixed_code = re.sub(r'<\|.*?\|>', '', fixed_code)  # Supprimer <|...|>
        fixed_code = re.sub(r'^\s*[^\w\-]+', '', fixed_code)  # Supprimer caractères bizarres au début
        fixed_code = fixed_code.strip()
        
        print(f"DEBUG: Après nettoyage: {fixed_code}")
        
        # Vérification que la réponse contient bien SELECT (ou autre commande SQL)
        if not re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b', fixed_code, re.IGNORECASE):
            # L'IA a renvoyé un fragment, on utilise le fallback
            print("DEBUG: Fragment détecté, utilisation du fallback automatique...")
            fixed_code = sql  # On part de l'original
        
        # FALLBACK AUTOMATIQUE : Remplacement de LIMIT par FETCH FIRST
        if re.search(r'\bLIMIT\s+\d+', fixed_code, re.IGNORECASE):
            print("DEBUG: LIMIT détecté, remplacement automatique...")
            fixed_code = re.sub(
                r'\bLIMIT\s+(\d+)\b',
                r'FETCH FIRST \1 ROWS ONLY',
                fixed_code,
                flags=re.IGNORECASE
            )
            explanation = "Remplacement automatique de LIMIT par FETCH FIRST ROWS ONLY (syntaxe Oracle)."
        else:
            # Extraction de l'explication depuis les commentaires
            comments = re.findall(r'^--\s*(.*)', fixed_code, re.MULTILINE)
            explanation = " ".join(comments[:2]) if comments else "Requête corrigée."
            if "Correction:" in explanation:
                explanation = explanation.split("Correction:")[1].strip()
        
        # Nettoyage final du SQL
        fixed_sql = fixed_code.replace('\\n', '\n').replace('\\"', '"')
        
        # Formatage avec sqlparse
        if fixed_sql and not fixed_sql.startswith("Error:"):
            try:
                fixed_sql = sqlparse.format(fixed_sql, reindent=True, keyword_case='upper', strip_comments=False)
            except Exception as e:
                print(f"DEBUG: Erreur formatage sqlparse: {e}")
                pass
        
        print(f"DEBUG: SQL final à renvoyer: {fixed_sql}")
        
        return jsonify({"fixed_sql": fixed_sql, "explanation": explanation})
        
    except Exception as e:
        print(f"DEBUG: Erreur correction: {str(e)}")
        return jsonify({"error": f"Impossible de corriger: {str(e)}"}), 500

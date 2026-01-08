import requests
import json
import os

class LLMHandler:
    def __init__(self, model_name="llama3", base_url="http://127.0.0.1:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.api_url = f"{base_url}/api/generate"

    def get_system_prompt(self):
        schema_path = os.path.join(os.path.dirname(__file__), '..', 'docs', 'database_schema.md')
        try:
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_doc = f.read()
        except FileNotFoundError:
            schema_doc = "Documentation du schéma non disponible."

        return f"""Tu es un expert Oracle SQL. Ta tâche est de traduire une demande en langage naturel en une requête Oracle SQL valide.
Utilise uniquement le schéma suivant pour construire tes requêtes :
{schema_doc}

Règles importantes :
1. Réponds UNIQUEMENT avec le code SQL, sans explication.
2. Si la demande de l'utilisateur est incohérente, composée de caractères aléatoires (ex: "dqdqd"), ou n'a aucun rapport avec une base de données, réponds EXACTEMENT : "INVALID_QUERY".
3. Utilise la syntaxe Oracle SQL (ex: TO_DATE pour les dates).
4. Ne pas mettre de guillemets autour des noms de tables ou colonnes.
5. NE JAMAIS terminer la requête par un point-virgule (;).
"""

    def generate_sql(self, user_query):
        # Vérification rapide avant l'appel (optionnel mais efficace pour les cas évidents)
        if len(user_query.strip()) < 3 or user_query.strip().lower() in ["abc", "test", "test1"]:
            return "INVALID_QUERY"

        prompt = f"{self.get_system_prompt()}\n\nDemande utilisateur : {user_query}\nSQL :"
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0
            }
        }
        
        try:
            print(f"DEBUG: Envoi à Ollama ({self.model_name})...")
            response = requests.post(self.api_url, json=payload, timeout=45)
            response.raise_for_status()
            data = response.json()
            sql_code = data.get("response", "").strip()
            
            print(f"DEBUG: Réponse brute Ollama: {sql_code}")

            if "INVALID_QUERY" in sql_code:
                return "INVALID_QUERY"

            if sql_code.startswith("```"):
                sql_code = sql_code.replace("```sql", "").replace("```", "").strip()
            return sql_code
        except Exception as e:
            err_msg = f"Error: Impossible de contacter Ollama ({str(e)})"
            print(f"DEBUG: {err_msg}")
            return err_msg

llm = LLMHandler()

import requests
import json
import os

class LLMHandler:
    def __init__(self, model_name="sqlcoder:7b", base_url="http://127.0.0.1:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.api_url = f"{base_url}/api/generate"

    def get_schema(self):
        schema_path = os.path.join(os.path.dirname(__file__), '..', 'docs', 'database_schema.md')
        try:
            with open(schema_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return "Documentation du schéma non disponible."

    def get_editor_prompt(self):
        # Prompt STICT pour l'éditeur : SQL pur, règles rigides
        schema_doc = self.get_schema()
        return f"""### Task
Translate the natural language query into a valid Oracle SQL query.
Use the following database schema:
{schema_doc}

### Rules
1. Respond with a valid ORACLE SQL query ONLY.
2. ORACLE SYNTAX SPECIFICS:
   - NO 'LIMIT' clause. NEVER use LIMIT. Use 'FETCH FIRST n ROWS ONLY' instead.
   - Use 'SYSDATE' for the current date (not NOW() or CURRENT_TIMESTAMP).
   - Use '||' for string concatenation (not CONCAT or +).
   - Use 'TO_DATE' for date literals.
3. IMPORTANT: Start the query with a few lines of comments (using --) explaining what the query does in FRENCH.
4. Don't use a semi-colon at the end.
### Response Format
-- Explication: [Ton explication en français ici]
SELECT ...
"""

    def get_chat_prompt(self):
        # Prompt pour le CHAT (Index) : Peut être un peu plus complet ou conversationnel si besoin
        # Pour l'instant on garde une structure similaire mais on peut l'adapter facilement
        # Le user veut "deux fichiers différents" -> ici deux méthodes distinctes.
        schema_doc = self.get_schema()
        return f"""### Task
You are an intelligent Oracle SQL Assistant. Your goal is to help the user by generating the correct SQL query based on their request.
Use the following database schema:
{schema_doc}

### Rules
1. Always respond with a VALID Oracle SQL query.
2. ORACLE RULES:
   - Use 'FETCH FIRST n ROWS ONLY' instead of LIMIT.
   - Use 'SYSDATE' for dates.
   - Use '||' for concatenation.
3. Start your response with a clear comment in FRENCH explaining your logic ("-- Explication: ...").
4. If the request is ambiguous, make a reasonable assumption and mention it in the comments.
5. Do not include markdown code block syntax (```sql) inside the SQL part if possible, but the parser handles it.

### Response Format
-- Explication: [Explication détaillée en français]
SELECT ...
"""

    def generate_sql(self, user_query, mode="editor"):
        # Vérification rapide
        if len(user_query.strip()) < 3 or user_query.strip().lower() in ["abc", "test", "test1"]:
            return "INVALID_QUERY"

        # Choix du prompt selon le mode
        if mode == "chat":
            system_prompt = self.get_chat_prompt()
        else:
            system_prompt = self.get_editor_prompt()

        prompt = f"{system_prompt}\n\nDemande utilisateur : {user_query}\nSQL :"

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0
            }
        }

        try:
            print(f"DEBUG: Envoi à Ollama ({self.model_name}) [Mode: {mode}]...")
            response = requests.post(self.api_url, json=payload, timeout=45)
            response.raise_for_status()
            data = response.json()
            sql_code = data.get("response", "").strip()

            print(f"DEBUG: Réponse brute Ollama: {sql_code}")

            if "INVALID_QUERY" in sql_code:
                return "INVALID_QUERY"

            # Tentative d'extraction du JSON plus robuste pour Python re
            import re
            first_brace = sql_code.find('{')
            last_brace = sql_code.rfind('}')

            if first_brace != -1 and last_brace != -1:
                try:
                    json_str = sql_code[first_brace:last_brace+1]
                    data_json = json.loads(json_str)
                    if 'sql' in data_json:
                        return data_json
                except:
                    pass

            # Fallback : Si l'IA n'a pas respecté le JSON, on cherche le SQL intelligemment
            sql_only = sql_code
            explanation = "Requête générée."

            # Extraction de l'explication depuis les commentaires (si présents)
            comments = re.findall(r'^--\s*(.*)', sql_code, re.MULTILINE)
            if comments:
                # On concatène les premières lignes de commentaires pour l'explication
                explanation = " ".join(comments[:2])
                if "Explication:" in explanation:
                    explanation = explanation.split("Explication:")[1].strip()

            # 1. On cherche par blocs markdown
            if "```sql" in sql_code:
                sql_only = sql_code.split("```sql")[1].split("```")[0].strip()
            elif "```" in sql_code:
                sql_only = sql_code.split("```")[1].split("```")[0].strip()
            # 2. On tente d'extraire la valeur après "sql":
            elif '"sql":' in sql_code:
                try:
                    # On prend ce qu'il y a entre les guillemets après "sql":
                    parts = sql_code.split('"sql":')[1].strip()
                    if parts.startswith('"'):
                        sql_only = parts[1:].split('"', 1)[0]
                except:
                    pass

            # Nettoyage final pour Oracle (virer les résidus de JSON ou caractères spéciaux en début)
            sql_only = sql_only.replace('\\n', '\n').replace('\\"', '"')
            # Supprimer tout ce qui n'est pas une lettre, un chiffre, un commentaire ou un espace au tout début
            sql_only = re.sub(r'^[^a-zA-Z0-9\-\s/]+', '', sql_only).strip()

            return {"sql": sql_only, "explanation": explanation}
        except Exception as e:
            err_msg = f"Error: Impossible de contacter Ollama ({str(e)})"
            print(f"DEBUG: {err_msg}")
            return err_msg

llm = LLMHandler()

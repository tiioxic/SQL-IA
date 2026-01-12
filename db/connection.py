import oracledb
import os

class DBManager:
    def __init__(self):
        # Paramètres par défaut chargés depuis l'environnement ou config
        self.user = os.getenv("ORACLE_USER", "appuser")
        self.password = os.getenv("ORACLE_PASSWORD", "ChangeMeApp1!")
        self.dsn = os.getenv("ORACLE_DSN", "192.168.1.14:1521/FREEPDB1")
        self.pool = None

    def get_connection(self):
        try:
            # On utilise le driver thin par défaut
            conn = oracledb.connect(
                user=self.user,
                password=self.password,
                dsn=self.dsn
            )
            return conn
        except Exception as e:
            print(f"Erreur de connexion Oracle (DSN={self.dsn}, User={self.user}) : {e}")
            return None

    def execute_query(self, sql):
        conn = self.get_connection()
        if not conn:
            return None, "Erreur de connexion à la base de données."
        
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            
            # Si c'est un SELECT, on récupère les colonnes et les données
            if sql.strip().upper().startswith("SELECT"):
                columns = [col[0] for col in cursor.description]
                data = cursor.fetchall()
                return {"columns": columns, "data": data}, None
            else:
                conn.commit()
                return {"message": "Requête exécutée avec succès (DML/DDL)."}, None
                
        except Exception as e:
            return None, str(e)
        finally:
            if conn:
                conn.close()

db_manager = DBManager()

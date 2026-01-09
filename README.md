# SQLIA - Application Text-to-SQL pour Oracle

Cette application permet de générer des requêtes Oracle SQL à partir du langage naturel en utilisant une IA locale (Ollama).

## Fonctionnalités
- **Text-to-SQL** : Traduction intelligente avec prise en compte du schéma de la BDD.
- **Exécution Directe** : Lancez les requêtes sur votre base Oracle et voyez les résultats.
- **Historique** : Retrouvez vos anciennes requêtes dans la sidebar (style ChatGPT).
- **Interface Moderne** : Design inspiré d'Affine avec support Dark/Light mode et accents de couleurs personnalisables.
- **Jeux de données** : Scripts inclus pour générer ~3000 lignes par table pour tester.

## Installation et Lancement

1. **Prérequis** :
   - Python 3.10+
   - Ollama installé (avec le modèle `sqlcoder:7b` ou `llama3`)
   - Un accès à une base de données Oracle

2. **Configuration** :
   Éditez les variables d'environnement ou le fichier `db/connection.py` pour configurer vos accès Oracle :
   - `ORACLE_USER`
   - `ORACLE_PASSWORD`
   - `ORACLE_DSN`

3. **Lancement de l'application** :
   ```bash
   # Création de l'environnement virtuel et installation des dépendances
   python -m venv venv
   source venv/bin/activate  # Sur Linux/Mac
   pip install -r requirements.txt # Ou utilisez les scripts fournis
   
   # Lancement du serveur
   python app.py
   ```
   Accédez ensuite à `http://localhost:5000`.

4. **Génération des données (Optionnel)** :
   Si vous voulez tester avec des données fictives :
   ```bash
   python db/seed_data.py
   # Puis exécutez db/init_schema.sql et db/seed_data.sql dans votre client Oracle (SQL Developer, etc.)
   ```

## Architecture du Code
- `app.py` : Serveur Flask et routes API.
- `models/llm_handler.py` : Logique d'interaction avec Ollama.
- `db/connection.py` : Gestionnaire de connexion Oracle.
- `docs/database_schema.md` : Documentation fournie à l'IA pour comprendre votre schéma.
- `static/` : CSS, JS et images.
- `templates/` : Structure HTML.

## Développement et Contribution

Pour garantir la qualité des messages de commit, nous utilisons des **hooks Git partagés**.

**Installation du hook :**
Après avoir cloné le projet, exécutez cette commande pour activer les vérifications automatiques (emojis, format, longueur) :
```bash
git config core.hooksPath .githooks
```
Cela forcera vos commits à respecter la convention (ex: `feat: ajout de ...`) et ajoutera automatiquement les emojis appropriés.


#!/bin/bash

# SQLIA Launcher Script

echo "========================================"
echo "          SQLIA - ORACLE IDE            "
echo "========================================"

# 1. Vérifie si Ollama est installé
if ! command -v ollama &> /dev/null; then
    echo "❌ Erreur: Ollama n'est pas installé."
    echo "Veuillez installer Ollama d'abord : https://ollama.ai/"
    exit 1
fi

# 2. Vérifie si le modèle sqlcoder:7b est présent
if ! ollama list | grep -q "sqlcoder:7b"; then
    echo "⚠️  Modèle sqlcoder:7b introuvable. Téléchargement..."
    ollama pull sqlcoder:7b
fi

echo "✅ Modèle IA OK."

# 3. Lance Ollama en arrière-plan (si pas déjà lancé)
if ! pgrep -x "ollama" > /dev/null; then
    echo "🚀 Démarrage du service Ollama..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 2
else
    echo "✅ Service Ollama déjà actif."
fi

# 4. Active l'environnement virtuel Python
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "⚠️  Environnement virtuel non trouvé. Utilisation du Python système."
fi

# 5. Lance l'application Flask
echo "🚀 Démarrage de l'interface Web SQLIA..."
echo "👉 Ouvrez http://127.0.0.1:5000 dans votre navigateur"
echo "========================================"

python app.py

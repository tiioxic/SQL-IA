@echo off
chcp 65001 >nul
echo ========================================
echo          SQLIA - ORACLE IDE            
echo ========================================

:: 1. Verifie si Ollama est installe
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Erreur: Ollama n'est pas installe.
    echo Veuillez installer Ollama d'abord : https://ollama.ai/
    pause
    exit /b 1
)

:: 2. Verifie si le modele sqlcoder:7b est present
ollama list | findstr "sqlcoder:7b" >nul
if %errorlevel% neq 0 (
    echo [!] Modele sqlcoder:7b introuvable. Telechargement...
    ollama pull sqlcoder:7b
)

echo [V] Modele IA OK.

:: 3. Lance Ollama (si besoin)
:: Note : Sur Windows, Ollama tourne souvent en tache de fond (tray).
:: On essaie de voir si le serveur repond, sinon on conseille de le lancer.
:: start /B ollama serve >nul 2>nul
echo [!] Assurez-vous que Ollama est lance (System Tray ou service).

:: 4. Active l'environnement virtuel Python
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [!] Environnement virtuel non trouve. Utilisation du Python systeme.
)

:: 5. Lance l'application Flask
echo [V] Demarrage de l'interface Web SQLIA...
echo [>] Ouvrez http://127.0.0.1:5000 dans votre navigateur
echo ========================================

python app.py

pause

FROM python:3.11-slim

WORKDIR /app

# Installation des dépendances système si nécessaire (ex: curl pour healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copie des requirements et installation
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Gunicorn pour la prod
RUN pip install gunicorn

# Copie du code de l'application
COPY . .

# Variables d'environnement par défaut
ENV FLASK_APP=app.py
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# Exposition du port
EXPOSE 5000

# Commande de démarrage
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]

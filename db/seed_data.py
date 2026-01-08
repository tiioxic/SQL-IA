import random
from faker import Faker
import datetime

fake = Faker(['fr_FR'])

def run_seeding(db_manager):
    """Exécute le seeding directement via le db_manager"""
    try:
        # 1. Nettoyage rapide (facultatif si init_db a été fait)
        # Mais on va juste ajouter des données
        
        # Clients (~100 pour la démo, pour que ce soit rapide)
        print("Génération des clients...")
        for i in range(1, 101):
            nom = fake.last_name().replace("'", "''")
            prenom = fake.first_name().replace("'", "''")
            email = fake.unique.email()
            ville = fake.city().replace("'", "''")
            date_ins = fake.date_between(start_date='-2y', end_date='today')
            sql = f"INSERT INTO CLIENTS (CLIENT_ID, NOM, PRENOM, EMAIL, VILLE, DATE_INSCRIPTION) VALUES ({i}, '{nom}', '{prenom}', '{email}', '{ville}', TO_DATE('{date_ins}', 'YYYY-MM-DD'))"
            db_manager.execute_query(sql)
        
        # Produits (~20)
        print("Génération des produits...")
        categories = ['Électronique', 'Vêtements', 'Maison', 'Sport', 'Livres', 'Jouets']
        produits_data = []
        for i in range(1, 21):
            libelle = (fake.word().capitalize() + " " + fake.word()).replace("'", "''")
            cat = random.choice(categories)
            prix = round(random.uniform(5.0, 500.0), 2)
            stock = random.randint(10, 100)
            produits_data.append({'id': i, 'prix': prix})
            sql = f"INSERT INTO PRODUITS (PRODUIT_ID, LIBELLE, CATEGORIE, PRIX_UNITAIRE, STOCK) VALUES ({i}, '{libelle}', '{cat}', {prix}, {stock})"
            db_manager.execute_query(sql)
            
        # Commandes (~50)
        print("Génération des commandes...")
        commandes_ids = []
        for i in range(1, 51):
            client_id = random.randint(1, 100)
            date_cmd = fake.date_between(start_date='-1y', end_date='today')
            statut = random.choice(['LIVRÉ', 'EN COURS', 'ANNULÉ'])
            commandes_ids.append(i)
            sql = f"INSERT INTO COMMANDES (COMMANDE_ID, CLIENT_ID, DATE_COMMANDE, STATUT, MONTANT_TOTAL) VALUES ({i}, {client_id}, TO_DATE('{date_cmd}', 'YYYY-MM-DD'), '{statut}', 0)"
            db_manager.execute_query(sql)
            
        # Détails Commandes (~150)
        print("Génération des détails...")
        totals_commande = {i: 0 for i in commandes_ids}
        for i in range(1, 151):
            cmd_id = random.choice(commandes_ids)
            prod = random.choice(produits_data)
            qte = random.randint(1, 3)
            prix_ligne = round(prod['prix'] * qte, 2)
            totals_commande[cmd_id] += prix_ligne
            sql = f"INSERT INTO DETAILS_COMMANDES (DETAIL_ID, COMMANDE_ID, PRODUIT_ID, QUANTITE, PRIX_LIGNE) VALUES ({i}, {cmd_id}, {prod['id']}, {qte}, {prix_ligne})"
            db_manager.execute_query(sql)
            
        # Mise à jour des montants totaux
        print("Mise à jour des totaux...")
        for cmd_id, total in totals_commande.items():
            if total > 0:
                sql = f"UPDATE COMMANDES SET MONTANT_TOTAL = {round(total, 2)} WHERE COMMANDE_ID = {cmd_id}"
                db_manager.execute_query(sql)
        
        return True, "Base de données alimentée avec succès (100 clients, 20 produits, 50 commandes)!"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    from connection import db_manager
    success, msg = run_seeding(db_manager)
    print(msg)

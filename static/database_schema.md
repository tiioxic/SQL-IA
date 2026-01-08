# Documentation de la Base de Données Oracle (E-Commerce)

Cette base de données gère un système de vente en ligne simplifié.

## Tables

### 1. CLIENTS (CUSTOMERS)
Stocke les informations personnelles des clients.
- `CLIENT_ID` (NUMBER, PK) : Identifiant unique du client.
- `NOM` (VARCHAR2) : Nom de famille.
- `PRENOM` (VARCHAR2) : Prénom.
- `EMAIL` (VARCHAR2) : Adresse email unique.
- `VILLE` (VARCHAR2) : Ville de résidence.
- `DATE_INSCRIPTION` (DATE) : Date de création du compte.

### 2. PRODUITS (PRODUCTS)
Catalogue des produits disponibles.
- `PRODUIT_ID` (NUMBER, PK) : Identifiant unique du produit.
- `LIBELLE` (VARCHAR2) : Nom du produit.
- `CATEGORIE` (VARCHAR2) : Catégorie (Électronique, Vêtements, Maison, etc.).
- `PRIX_UNITAIRE` (NUMBER) : Prix d'un article.
- `STOCK` (NUMBER) : Quantité disponible en stock.

### 3. COMMANDES (ORDERS)
Enregistre les transactions globales.
- `COMMANDE_ID` (NUMBER, PK) : Identifiant unique de la commande.
- `CLIENT_ID` (NUMBER, FK -> CLIENTS) : Référence au client ayant passé la commande.
- `DATE_COMMANDE` (DATE) : Date de l'achat.
- `STATUT` (VARCHAR2) : État de la commande (LIVRÉ, EN COURS, ANNULÉ).
- `MONTANT_TOTAL` (NUMBER) : Somme totale de la commande (calculée).

### 4. DETAILS_COMMANDES (ORDER_DETAILS)
Lien entre les commandes et les produits (Lignes de commande).
- `DETAIL_ID` (NUMBER, PK) : Identifiant unique de la ligne.
- `COMMANDE_ID` (NUMBER, FK -> COMMANDES) : Référence à la commande parente.
- `PRODUIT_ID` (NUMBER, FK -> PRODUITS) : Référence au produit acheté.
- `QUANTITE` (NUMBER) : Nombre d'articles achetés.
- `PRIX_LIGNE` (NUMBER) : Prix total pour cette ligne (QUANTITE * PRIX_UNITAIRE).

## Vues (Views)

### 1. V_CHIFFRE_AFFAIRES_CLIENT
Affiche le total dépensé par chaque client.
- `NOM`, `PRENOM`, `TOTAL_DEPENSE`.

### 2. V_PRODUITS_POPULAIRES
Liste les produits les plus vendus.
- `LIBELLE`, `TOTAL_VENDU`.

## Relations transverses
- Un **Client** peut avoir plusieurs **Commandes**.
- une **Commande** contient plusieurs **Produits** via **Details_Commandes**.
- Les jointures se font principalement sur `CLIENT_ID`, `PRODUIT_ID` et `COMMANDE_ID`.

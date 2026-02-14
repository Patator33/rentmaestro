# Rentmaestro 🏠

Application de gestion locative moderne construite avec Next.js 16, Prisma et SQLite.

## ✨ Fonctionnalités

- 📊 **Dashboard** : Vue d'ensemble des statistiques
- 🏢 **Gestion des Appartements** : CRUD complet avec historique des locataires
- 👥 **Gestion des Locataires** : Support colocataires + upload de documents
- 📝 **Gestion des Baux** : Détection automatique des conflits
- 💰 **Suivi des Loyers** : Tableau de bord avec statuts de paiement
- 📧 **Relances Email** : Envoi de rappels automatiques
- 📈 **Statistiques** : Taux d'occupation, revenus mensuels

## 🚀 Déploiement avec Docker Compose

### Prérequis

- Docker
- Docker Compose

### Installation

1. **Cloner le repository**
```bash
git clone <votre-repo-url>
cd rentmaestro
```

2. **Lancer l'application**
```bash
docker-compose up -d
```

3. **Initialiser la base de données** (première installation)
```bash
docker-compose exec rentmaestro npx prisma db push
docker-compose exec rentmaestro npx prisma db seed
```

4. **Accéder à l'application**
```
http://localhost:3000
```

### Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer
docker-compose restart

# Arrêter
docker-compose down

# Rebuild après modifications
docker-compose up -d --build
```

## 📦 Développement Local

### Prérequis

- Node.js 18+
- npm

### Installation

```bash
# Installer les dépendances
npm install

# Initialiser la base de données
npx prisma db push
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### Scripts disponibles

```bash
npm run dev      # Développement (hot reload)
npm run build    # Build production
npm start        # Démarrer en production
npm run lint     # ESLint
```

## 🗂️ Structure du Projet

```
rentmaestro/
├── prisma/
│   ├── schema.prisma       # Schéma de base de données
│   └── seed.ts             # Données de test
├── public/
│   └── uploads/            # Documents uploadés
├── src/
│   ├── actions/            # Server Actions (Next.js)
│   ├── app/                # Pages & routes (App Router)
│   │   ├── apartments/
│   │   ├── leases/
│   │   ├── rents/
│   │   ├── stats/
│   │   └── tenants/
│   └── lib/
│       └── prisma.ts       # Client Prisma
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🗄️ Base de Données

SQLite avec Prisma ORM.

**Modèles principaux :**
- `Apartment` : Appartements
- `Tenant` : Locataires (avec support colocataire)
- `Lease` : Baux
- `RentPayment` : Paiements de loyer
- `TenantDocument` : Documents attachés aux locataires

## 🔐 Variables d'Environnement

Créer un fichier `.env` :

```env
DATABASE_URL="file:./prisma/dev.db"
```

## 📝 Sauvegarde GitHub

### Initialisation

```bash
cd rentmaestro
git init
git add .
git commit -m "Initial commit: Rentmaestro application"
```

### Pousser vers GitHub

```bash
# Créer d'abord un repo sur GitHub, puis :
git remote add origin https://github.com/<votre-username>/rentmaestro.git
git branch -M main
git push -u origin main
```

## 🎨 Design

Interface moderne avec :
- Palette vibrante (Indigo/Violet/Amber)
- Gradients animés
- Bordures gradient sur les cartes
- Animations CSS fluides

## 📄 Licence

MIT

## 👨‍💻 Auteur

Créé avec ❤️ par Antigravity AI


- GitHub Backup: 02/14/2026 22:37:53

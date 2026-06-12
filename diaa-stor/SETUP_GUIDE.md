# 🛒 Diaa Store — Guide de configuration complet
## Illuminate Your Shopping

---

## 📋 Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Configuration Supabase](#3-configuration-supabase)
4. [Configuration Telegram Bot](#4-configuration-telegram-bot)
5. [Configuration Google Sheets](#5-configuration-google-sheets)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Déploiement sur Netlify](#7-déploiement-sur-netlify)
8. [Utilisation du dashboard admin](#8-utilisation-du-dashboard-admin)
9. [Résolution de problèmes](#9-résolution-de-problèmes)

---

## 1. Vue d'ensemble

**Diaa Store** est un site e-commerce complet avec :
- 🛍️ Boutique en ligne responsive (mobile-first)
- 🛒 Panier + achat direct
- 📦 Livraison dans les 58 wilayas d'Algérie
- 💳 Paiement à la livraison uniquement (COD)
- 📬 Notifications Telegram pour chaque commande
- 📊 Export automatique vers Google Sheets
- 💬 Bouton WhatsApp flottant
- 🌙 Mode sombre/clair
- 🌍 Multilingue (Français, Arabe, Anglais)
- 🔒 Dashboard admin protégé par mot de passe

**Architecture :**
```
Commande client
     ↓
Supabase (stockage principal)
     ↓
Telegram (notification instantanée) + Google Sheets (vue admin)
```

---

## 2. Prérequis

Vous avez besoin de :
- Un compte **GitHub** (gratuit) → https://github.com
- Un compte **Netlify** (gratuit) → https://netlify.com
- Un compte **Supabase** (gratuit) → https://supabase.com
- Un compte **Google** (pour Google Sheets)
- Un compte **Telegram** (pour les notifications)

---

## 3. Configuration Supabase

### Étape 3.1 — Créer un projet

1. Allez sur https://supabase.com
2. Cliquez **"New Project"**
3. Choisissez un nom : `diaa-store`
4. Choisissez un mot de passe de base de données (notez-le !)
5. Région : choisissez **"EU West"** (plus proche de l'Algérie)
6. Cliquez **"Create New Project"** — attendez ~2 minutes

### Étape 3.2 — Installer le schéma SQL

1. Dans votre projet Supabase, allez dans le menu gauche : **"SQL Editor"**
2. Cliquez **"New Query"**
3. Ouvrez le fichier `supabase/schema.sql` de ce projet
4. Copiez TOUT le contenu et collez-le dans l'éditeur SQL
5. Cliquez **"Run"** (bouton vert)
6. Vous devriez voir : `Schema installed successfully! ✅`

### Étape 3.3 — Récupérer les clés API

1. Dans Supabase, menu gauche → **"Project Settings"** (icône engrenage)
2. Cliquez sur **"API"**
3. Notez ces 3 valeurs :
   - **Project URL** → c'est votre `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → c'est votre `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → c'est votre `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ La `service_role` key est secrète ! Ne la partagez jamais publiquement.

---

## 4. Configuration Telegram Bot

### Étape 4.1 — Créer un bot

1. Ouvrez Telegram et cherchez **@BotFather**
2. Envoyez `/newbot`
3. Donnez un nom à votre bot : ex. `Diaa Store Notifications`
4. Donnez un username : ex. `diaastore_bot`
5. BotFather vous enverra un **token** — c'est votre `TELEGRAM_BOT_TOKEN`
   - Format : `1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Étape 4.2 — Obtenir le Chat ID

**Option A — Canal privé (recommandé) :**
1. Créez un nouveau canal Telegram (privé)
2. Ajoutez votre bot en tant qu'administrateur
3. Envoyez un message dans le canal
4. Visitez cette URL dans votre navigateur :
   `https://api.telegram.org/bot{VOTRE_TOKEN}/getUpdates`
5. Cherchez `"chat":{"id":` dans la réponse — c'est votre `TELEGRAM_CHAT_ID`
   - Pour les canaux : le format est `-100xxxxxxxxxx`

**Option B — Conversation directe :**
1. Envoyez n'importe quel message à votre bot
2. Visitez `https://api.telegram.org/bot{VOTRE_TOKEN}/getUpdates`
3. Cherchez votre Chat ID (nombre positif pour les conversations privées)

---

## 5. Configuration Google Sheets

### Étape 5.1 — Créer le Google Sheet

1. Allez sur https://sheets.google.com
2. Créez un nouveau fichier
3. Renommez-le : `Diaa Store — Commandes`
4. Renommez l'onglet (en bas) : `Commandes`
5. Copiez l'**ID du sheet** depuis l'URL :
   - URL : `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`**`/edit`
   - L'ID est la partie en gras → c'est votre `GOOGLE_SHEET_ID`

### Étape 5.2 — Créer un compte de service Google

1. Allez sur https://console.cloud.google.com
2. Créez un nouveau projet (ou utilisez un existant)
3. Menu gauche → **"APIs & Services"** → **"Library"**
4. Cherchez **"Google Sheets API"** → cliquez dessus → **"Enable"**
5. Menu gauche → **"APIs & Services"** → **"Credentials"**
6. Cliquez **"+ Create Credentials"** → **"Service Account"**
7. Nom : `diaa-store-sheets`
8. Cliquez **"Create and Continue"** → **"Done"**
9. Cliquez sur le compte de service créé
10. Allez dans l'onglet **"Keys"**
11. **"Add Key"** → **"Create new key"** → **JSON** → **"Create"**
12. Un fichier JSON se télécharge automatiquement — **gardez-le précieusement !**

### Étape 5.3 — Partager le Sheet avec le compte de service

1. Ouvrez le fichier JSON téléchargé dans un éditeur de texte
2. Copiez la valeur de `"client_email"` (ressemble à `nom@projet.iam.gserviceaccount.com`)
3. Retournez dans votre Google Sheet
4. Cliquez **"Partager"** (bouton vert en haut à droite)
5. Collez l'email du compte de service
6. Donnez-lui le rôle **"Éditeur"**
7. Décochez "Notifier les personnes"
8. Cliquez **"Partager"**

### Étape 5.4 — Préparer la variable d'environnement

1. Ouvrez le fichier JSON du compte de service
2. Convertissez-le en une seule ligne (supprimez tous les sauts de ligne, ou utilisez un outil en ligne)
3. Cette valeur complète sera votre `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## 6. Variables d'environnement

### Pour le développement local

Copiez `.env.local.example` en `.env.local` :
```bash
cp .env.local.example .env.local
```

Puis remplissez toutes les valeurs dans `.env.local`.

### Pour Netlify (production)

1. Allez dans votre site Netlify
2. **"Site Configuration"** → **"Environment Variables"**
3. Ajoutez chaque variable une par une :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | votre anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | votre service_role key |
| `ADMIN_PASSWORD` | votre mot de passe admin choisi |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `213XXXXXXXXX` |
| `TELEGRAM_BOT_TOKEN` | `1234567890:AAF...` |
| `TELEGRAM_CHAT_ID` | `-100xxxxxxxxxx` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | le JSON complet en une ligne |
| `GOOGLE_SHEET_ID` | l'ID de votre sheet |

---

## 7. Déploiement sur Netlify

### Étape 7.1 — Préparer le code sur GitHub

1. Créez un compte sur https://github.com
2. Créez un nouveau dépôt (repository) : **"New Repository"**
3. Nom : `diaa-store`
4. **Privé** (recommandé pour la sécurité)
5. Sur votre ordinateur, ouvrez un terminal dans le dossier `diaa-stor`
6. Exécutez :
```bash
git init
git add .
git commit -m "Initial commit — Diaa Store"
git remote add origin https://github.com/VOTRE_USERNAME/diaa-store.git
git push -u origin main
```

### Étape 7.2 — Connecter Netlify à GitHub

1. Allez sur https://netlify.com → **"Add new site"**
2. Choisissez **"Import an existing project"**
3. Cliquez **"GitHub"** → autorisez l'accès
4. Sélectionnez votre dépôt `diaa-store`
5. Configuration build :
   - **Build command** : `npm run build`
   - **Publish directory** : `.next`
6. Cliquez **"Deploy site"**

### Étape 7.3 — Ajouter les variables d'environnement

1. Une fois le site créé, allez dans **"Site Configuration"**
2. **"Environment Variables"** → ajoutez toutes les variables listées en section 6
3. **"Deploys"** → **"Trigger deploy"** → **"Deploy site"** pour redéployer

### Étape 7.4 — Installer le plugin Netlify Next.js

Dans le fichier `netlify.toml` (déjà inclus dans le projet), le plugin est configuré. 
Si besoin, dans Netlify : **"Plugins"** → cherchez **"Next.js"** → **"Install"**.

### Étape 7.5 — Domaine personnalisé (optionnel)

1. **"Domain Management"** → **"Add custom domain"**
2. Entrez votre domaine : ex. `diaastore.dz`
3. Suivez les instructions DNS

---

## 8. Utilisation du dashboard admin

### Accès

URL : `https://votre-site.netlify.app/admin`

Entrez le mot de passe que vous avez mis dans `ADMIN_PASSWORD`.

### Fonctionnalités

| Section | Ce que vous pouvez faire |
|---------|--------------------------|
| **Tableau de bord** | Statistiques, dernières commandes |
| **Produits** | Ajouter/modifier/supprimer, upload photos, cacher/afficher |
| **Commandes** | Voir toutes les commandes, changer le statut, définir "Nombre" pour le tri |
| **Catégories** | Créer des catégories avec emoji |
| **Promotions** | Créer des offres avec dates de début/fin |
| **Bannières** | Gérer les slides de la page d'accueil |
| **Paramètres** | Prix de livraison, numéro WhatsApp, Telegram |

### Gestion du "Nombre" (tri Google Sheets)

Dans la section **Commandes**, la colonne **"Nb."** permet d'entrer un nombre.
Ce nombre est envoyé à Google Sheets dans la colonne "Nombre" et les lignes sont
automatiquement triées par ordre croissant selon cette valeur.

**Exemple :**
- Commande prioritaire → mettez `1`
- Commande normale → mettez `10`
- Commande livrée → mettez `99`

---

## 9. Résolution de problèmes

### ❌ "Non autorisé" sur l'admin

→ Vérifiez que `ADMIN_PASSWORD` est bien configuré sur Netlify et que vous entrez exactement le même mot de passe.

### ❌ Les commandes ne s'enregistrent pas

→ Vérifiez :
1. `SUPABASE_SERVICE_ROLE_KEY` est correct sur Netlify
2. Le schéma SQL a bien été exécuté
3. La table `orders` existe dans Supabase → **Table Editor**

### ❌ Pas de notification Telegram

→ Vérifiez :
1. Le bot est admin du canal/groupe
2. `TELEGRAM_BOT_TOKEN` ne contient pas d'espaces
3. `TELEGRAM_CHAT_ID` commence par `-100` pour les canaux
4. Testez manuellement : `https://api.telegram.org/bot{TOKEN}/getMe`

### ❌ Google Sheets ne se remplit pas

→ Vérifiez :
1. Le compte de service a le rôle **Éditeur** sur le sheet
2. L'onglet s'appelle exactement `Commandes`
3. `GOOGLE_SHEET_ID` est correct
4. `GOOGLE_SERVICE_ACCOUNT_JSON` est du JSON valide (une seule ligne)

### ❌ Images qui ne s'affichent pas

→ Vérifiez :
1. Le bucket `product-images` existe dans Supabase → **Storage**
2. Le bucket est en mode **Public**
3. `NEXT_PUBLIC_SUPABASE_URL` est correct

### ❌ Les images ne s'uploadent pas

→ Dans Supabase → Storage → `product-images` → Policies, vérifiez qu'une policy
**"Service role manage product images"** existe, ou créez-en une manuellement.

---

## 📱 Test en local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et remplir les variables d'environnement
cp .env.local.example .env.local
# → Éditez .env.local avec vos vraies valeurs

# 3. Lancer en développement
npm run dev

# 4. Ouvrir http://localhost:3000
```

---

## 🏗️ Structure du projet

```
diaa-stor/
├── pages/
│   ├── index.tsx              ← Page d'accueil
│   ├── cart.tsx               ← Panier
│   ├── product/[slug].tsx     ← Page produit
│   ├── admin/index.tsx        ← Dashboard admin
│   ├── 404.tsx                ← Page erreur
│   ├── _app.tsx               ← Configuration globale
│   ├── _document.tsx          ← HTML de base
│   └── api/
│       ├── orders/create.ts   ← Créer une commande
│       └── admin/
│           ├── products.ts    ← CRUD produits
│           ├── orders.ts      ← Gestion commandes
│           ├── categories.ts  ← CRUD catégories
│           ├── promotions.ts  ← CRUD promotions
│           ├── banners.ts     ← CRUD bannières
│           ├── settings.ts    ← Paramètres
│           └── upload.ts      ← Upload images
├── components/
│   ├── layout/
│   │   ├── Layout.tsx         ← Wrapper principal
│   │   ├── Navbar.tsx         ← Navigation
│   │   └── Footer.tsx         ← Pied de page
│   ├── product/
│   │   ├── ProductCard.tsx    ← Carte produit
│   │   └── OrderForm.tsx      ← Formulaire commande
│   └── ui/
│       └── WhatsAppButton.tsx ← Bouton WhatsApp flottant
├── context/
│   └── CartContext.tsx        ← État du panier
├── lib/
│   ├── supabase.ts            ← Client Supabase
│   ├── telegram.ts            ← Notifications Telegram
│   ├── googleSheets.ts        ← Export Google Sheets
│   ├── adminAuth.ts           ← Auth middleware
│   └── algeria.ts             ← Wilayas + communes
├── public/
│   ├── logo.png               ← Logo Diaa Store
│   └── locales/               ← Traductions
│       ├── fr/common.json
│       ├── ar/common.json
│       └── en/common.json
├── styles/
│   └── globals.css            ← Styles globaux Tailwind
├── supabase/
│   └── schema.sql             ← Schéma de base de données
├── .env.local.example         ← Modèle variables d'env
├── netlify.toml               ← Config déploiement
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

*Diaa Store — Illuminate Your Shopping* ✨

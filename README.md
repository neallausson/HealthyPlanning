# 💛 Healthy Planning

Petit site perso de suivi quotidien (digestion, migraines, sommeil, énergie, stress, cycle, hydratation, compléments), protégé par mot de passe, responsive (téléphone, tablette, ordinateur) et déployable gratuitement sur Vercel.

> *Pas besoin d'être parfaite : l'important est la régularité et les notes. Un jour « raté » n'annule rien.*

## Onglets

| Onglet | Contenu |
|---|---|
| ☀️ **Aujourd'hui** | Guide quotidien à cocher (matin → soir, compléments du mois inclus), suivi de l'eau (+1 verre / infusion), conseils selon l'énergie du jour |
| 📝 **Journal** | Questionnaire ludique : curseurs colorés avec adjectifs (« Ventre tout plat 🌸 » → « Ballon de baudruche 💥 »), Oui/Non, échelle de Bristol, sommeil, migraine, cycle, eau, compléments, marche, notes. Enregistrement automatique. |
| 📅 **Calendrier** | Vue du mois avec filtres (migraine, Imigrane, règles, spotting, eau OK, marche, bruxisme, repas à problème, notes) et coloration des jours par indicateur. Toucher un jour = détail + modifier. |
| 📊 **Récap** | Synthèse mensuelle pour le médecin : jours de migraine, jours d'Imigrane (alerte au-delà du seuil), dates des règles/spotting, moyennes (ballonnements, selles, énergie, sommeil, stress, eau), suivi des compléments, graphique jour par jour, notes, bilan « ce qui a marché / posé problème ». **Imprimer / PDF**, **Excel du mois**, **copier le texte**. |
| 🥗 **Aliments** | À privilégier / à réduire par phase + recherche « est-ce que je peux manger… ? » |
| ⚙️ **Options** | Date de début du programme, phase, paliers d'eau par semaine, taille du verre, infusions comptées ou non, objectif sommeil, seuil d'alerte Imigrane, seuil « journée difficile », compléments (moment, mois de début/fin), listes d'aliments, thème clair/sombre, export/import, déconnexion |

## Exporter les données

- **Récap → 📊 Excel du mois** : CSV du mois (s'ouvre directement dans Excel, format français).
- **Options → 📊 Export Excel** : CSV de toutes les journées.
- **Options → 💾 Sauvegarde complète (JSON)** : tout (journal, réglages, bilans mensuels) — réimportable via « Restaurer une sauvegarde ».
- **Récap → 🖨️ Imprimer / PDF** : version imprimable pour le médecin.

## Déployer sur Vercel

1. **Importer le dépôt** : sur [vercel.com](https://vercel.com) → *Add New… → Project* → importer `HealthyPlanning`. Framework preset : **Other**. Rien d'autre à changer (pas de build).
2. **Ajouter la base de données** (gratuite) : dans le projet Vercel → onglet **Storage** → *Create / Browse Marketplace* → **Upstash for Redis** → plan *Free* → **Connect** au projet. Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont ajoutées automatiquement.
3. **Définir le mot de passe** : *Settings → Environment Variables* :
   - `APP_PASSWORD` = le mot de passe du site
   - `SESSION_SECRET` = une longue chaîne aléatoire, générée avec :
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
4. **Redéployer** (*Deployments → … → Redeploy*) pour prendre en compte les variables.
5. Sur le téléphone : ouvrir le site → menu du navigateur → **« Ajouter à l'écran d'accueil »**.

Changer `SESSION_SECRET` (ou `APP_PASSWORD` si `SESSION_SECRET` est vide) déconnecte tous les appareils.

## 🔒 Sécurité / dépôt public

- **Aucun secret dans le code** : mot de passe et clés de base de données sont uniquement dans les variables d'environnement Vercel (ou `.env.local` en local, ignoré par git).
- Toutes les données passent par l'API, qui exige un cookie de session signé (HttpOnly, Secure, 180 jours). Les pages HTML/JS ne contiennent aucune donnée.
- Le site est marqué `noindex` (pas référencé par Google).

## Développement local

Prérequis : Node.js 18+. Aucune dépendance à installer.

```bash
cp .env.example .env.local   # puis mettre un APP_PASSWORD
npm run dev                  # → http://localhost:3000
```

Sans variables Upstash, les données sont stockées dans `.data/db.json` (ignoré par git).

## Structure

```
api/          Fonctions serverless (login, logout, session, data, entry, month, settings, import)
lib/          Auth (cookie HMAC), stockage (Upstash Redis REST / fichier local), utilitaires HTTP
public/       Site statique : index.html, css/, js/ (app, état + synchro hors ligne, vues par onglet)
public/js/config.js   Valeurs par défaut : questionnaire, aliments, compléments, paliers d'eau, guide
dev-server.js Serveur local qui imite Vercel
```

Les modifications sont enregistrées d'abord sur l'appareil puis envoyées au serveur : si le réseau coupe, elles sont renvoyées automatiquement plus tard (indicateur en haut à droite).

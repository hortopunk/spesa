# SPESA — ARCHITECTURE.md

Document cardinal du projet. Toute décision de développement s'appuie sur lui. En cas de conflit avec un autre document (ancien cahier des charges compris), ce fichier fait foi. Il se met à jour à chaque décision structurante.

Version : 1.0 — 2 octobre 2026

---

## 1. Vision et objectif v1

**SPESA** est une application personnelle de courses alimentaires. Elle sert à économiser en rationalisant les achats : on choisit des recettes, on retire ce qu'on a déjà, on obtient une liste fusionnée et rangée par rayon, puis on la coche en magasin.

- Utilisateur : moi seul. Smartphone Android, usage à une main en magasin.
- Priorité v1 : des fonctionnalités basiques qui fonctionnent, fiables, sans fioritures.
- Interface en français. Le corse viendra après la v1 : l'architecture le prévoit dès maintenant (section 6).

**La v1 est réussie si :**
- je saisis ou j'importe mes recettes ;
- je compose une liste, je décoche ce que j'ai déjà, j'obtiens une liste fusionnée par rayon ;
- en magasin, je coche d'une main, hors-ligne ;
- mes données sont toujours là à la réouverture ;
- je peux sauvegarder et restaurer en quelques appuis.

## 2. Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Format | PWA : HTML, CSS, JavaScript natif, sans compilation | Pas d'outillage lourd, installation depuis Chrome |
| Plateforme | Android (Chrome), installation sur l'écran d'accueil | Usage réel |
| Stockage | LocalStorage, accès isolé dans `db.js` | Suffisant pour du texte. IndexedDB est dans le même « casier » côté Android, il n'apporte pas plus de sécurité |
| Persistance | Appel à `navigator.storage.persist()` au premier lancement | Réduit le risque que le navigateur vide les données |
| Hors-ligne | 100 % local, service worker avec cache de tous les fichiers | Aucun réseau requis |
| Sauvegarde | Manuelle, voir section 9 | Une PWA ne peut pas écrire seule vers Drive ou un dossier |
| Design | Un seul fichier CSS écrit à la main, police système, icônes SVG en ligne | Tailwind et Lucide via CDN ne marchent pas hors-ligne sans réglage supplémentaire |
| Hébergement | GitHub Pages (gratuit) | Simple |
| Développement | Assistant de code IA, par petites étapes, une validation par étape | Voir section 11 |

Hors périmètre v1 : synchronisation PC/téléphone, comptes, serveur, prix et budget, stock permanent, OCR intégré, partage de listes.

## 3. Structure des fichiers

```
SPESA_dev/
├── index.html            Squelette, onglets, appel des scripts
├── manifest.json         Nom, icône, couleurs, mode d'affichage
├── service-worker.js     Cache hors-ligne
├── css/
│   └── style.css         Tout le style
├── langues/
│   ├── fr.json           Tous les textes de l'interface (français)
│   └── co.json           Corse : vide au départ
├── js/
│   ├── db.js             Lecture/écriture LocalStorage (seul fichier qui y touche)
│   ├── logic.js          Normalisation, fusion, conversion d'unités, parts
│   ├── langue.js         Fonction t("cle") et changement de langue
│   ├── backup.js         Export, import, rappel de sauvegarde
│   ├── ui.js             Rendu de l'interface (DOM)
│   └── app.js            Démarrage et événements (clics, saisies)
├── icons/                Icônes de l'appli (192 et 512 px)
├── ARCHITECTURE.md       Ce document
└── (fichier de consignes) Consignes pour l'assistant de code, non publié (à créer à l'étape 0)
```

Règles de séparation :
- `db.js` est le seul à lire/écrire le stockage.
- `logic.js` ne touche ni au DOM ni au stockage : fonctions pures, testables.
- `ui.js` ne contient aucune règle métier.
- `app.js` relie les trois.
- Aucun texte visible en dur dans le code : tout passe par `t("cle")`.

## 4. Modèle de données

Tout est stocké en JSON sous quelques clés LocalStorage, préfixées `spesa_`.

**Recette** (`spesa_recettes`, tableau)
```json
{
  "id": "r_001",
  "titre": "Ratatouille",
  "parts": 4,
  "ingredients": [
    { "nom": "aubergine", "quantite": 2, "unite": "piece" },
    { "nom": "huile d'olive", "quantite": 3, "unite": "cs" }
  ],
  "etapes": ["Couper les légumes.", "Faire revenir."],
  "notes": "Meilleure le lendemain."
}
```

**Dictionnaire** (`spesa_dico`, objet) : clé normalisée → fiche
```json
{ "aubergine": { "libelle": "aubergine", "rayon": "fruits_legumes" } }
```
Un nouvel ingrédient validé est ajouté automatiquement. Le rayon est demandé une seule fois, puis mémorisé.

**Liste en cours** (`spesa_liste`, objet)
```json
{
  "recettes": [{ "id": "r_001", "parts": 6 }],
  "manuels": [{ "nom": "papier toilette", "quantite": 1, "unite": "piece", "rayon": "hygiene" }],
  "decoches": ["huile d'olive"],
  "etat": "revision",
  "coches": []
}
```
`etat` : `ajouts`, `revision`, `courses`.

**Historique** (`spesa_historique`, tableau) : copies figées des listes validées, avec date. Consultation seule.

**Réglages** (`spesa_reglages`) : langue, date de dernière sauvegarde, version du schéma.

Chaque jeu de données porte un numéro de version de schéma, pour migrer proprement si le modèle change.

## 5. Règles métier

**Normalisation** : minuscules, sans accents, espaces et ponctuation nettoyés. « Oliu », « OLIU », « oliu » donnent la même clé. Le libellé affiché reste celui saisi la première fois.

**Autocomplétion** : à la saisie d'un ingrédient, suggestions issues du dictionnaire (début de mot, puis contient).

**Calculateur de parts** : quantité × (parts voulues ÷ parts de la recette). Résultat arrondi à un affichage lisible (ex. 0,5 ; 1,25 ; jamais 1,2500001).

**Fusion** : deux lignes fusionnent si leur clé normalisée est identique ET si leurs unités sont compatibles.
- Conversion automatique : g ↔ kg, ml ↔ l. Résultat affiché dans l'unité la plus lisible (1 500 g devient 1,5 kg).
- Unités non convertibles (pièce, pincée, cuillère à soupe, etc.) : fusion seulement entre unités identiques. Sinon, deux lignes distinctes.
- Pas de conversion entre masse et volume.

**Rayons** (liste fixe, ordre modifiable plus tard dans le code) : fruits et légumes, boulangerie, boucherie-poissonnerie, crèmerie, épicerie salée, épicerie sucrée, surgelés, boissons, hygiène et entretien, autre. Cette liste est une proposition à ajuster à l'ordre de ton magasin habituel.

## 6. Langues (traduction de l'interface)

- `langue.js` est le « traducteur » de l'appli : il permet de changer de langue sans toucher au code.
- Tous les textes sont dans `langues/fr.json`, sous forme de clés : `"ajouter": "Ajouter"`.
- Le code appelle `t("ajouter")`.
- `co.json` existe dès le départ, vide. Si une clé manque en corse, l'appli retombe sur le français.
- Un réglage de langue est prévu dans les réglages (un seul choix, « Français », en v1).
- Les contenus saisis par l'utilisateur (titres de recettes, ingrédients) restent dans la langue saisie : ils ne sont pas traduits.
- Traduire en corse plus tard = remplir `co.json`, ajouter l'option dans le réglage.

## 7. Flux principal

1. **Ajouts** : choisir des recettes (avec ajustement des parts) et ajouter des articles libres (hors-recette).
2. **Panier (révision)** : inventaire global, tout est coché par défaut. On décoche ce qu'on a déjà. Le décochage ne vaut que pour cette liste (pas de stock permanent).
3. **Liste finale** : fusion des quantités, rangement par rayon.
4. **Mode courses** : cochage d'une pression, article grisé et barré. Gros éléments tactiles (44 px minimum). Bouton de fin : « Terminer les courses », qui archive la liste dans l'historique et propose la sauvegarde.

L'historique se consulte seulement : pas de recréation d'une liste depuis une ancienne.

## 8. Import de recettes

Principe : l'appli ne lit pas les images. un assistant IA s'en charge, l'appli reçoit un fichier propre.

1. Photo d'une recette manuscrite ou capture d'écran web, envoyée à un assistant IA avec un prompt fixe.
2. L'assistant renvoie un fichier JSON au format standard (celui de la section 4, plus une clé `format: "spesa-recette-v1"`).
3. Dans l'appli : bouton « Importer une recette » : on choisit le fichier (ou on colle le texte). L'appli affiche un **aperçu à valider** (titre, ingrédients, étapes) avant d'enregistrer.
4. Les ingrédients inconnus sont ajoutés au dictionnaire (avec demande de rayon).

Le prompt standard est stocké dans l'appli (bouton « Copier le prompt »). Le fichier JSON de chaque recette peut aussi être conservé dans un dossier Drive : c'est une sauvegarde naturelle des recettes.

Le prompt exigera : unités parmi une liste fermée (`g`, `kg`, `ml`, `l`, `cs`, `cc`, `piece`, `pincee`, etc.), quantités en nombres, noms d'ingrédients au singulier et en minuscules, aucune invention : en cas d'illisibilité, le signaler au lieu de deviner. Le texte exact du prompt sera rédigé à l'étape 3 et ajouté à ce document.

## 9. Sauvegarde

- Bouton flottant en bas à droite, toujours visible : « Sauvegarder ».
- Au toucher : génération d'un fichier `spesa-sauvegarde-AAAA-MM-JJ.json` (recettes, dictionnaire, historique, réglages) puis ouverture du menu de partage Android (Web Share API) pour l'envoyer vers Drive. Si le partage de fichier n'est pas disponible, repli sur un simple téléchargement.
- « Restaurer » (dans les réglages) : choix d'un fichier de sauvegarde, avec confirmation avant d'écraser.
- Rappel : bandeau discret si la dernière sauvegarde date de plus de 7 jours. Proposition de sauvegarde aussi à la fin des courses.
- La date de dernière sauvegarde est enregistrée dans les réglages.

Limite assumée : la sauvegarde est manuelle (deux appuis environ). Évolution possible (v2) : envoi automatique vers Google Drive via l'API Drive. `backup.js` est isolé pour pouvoir être remplacé sans toucher au reste.

## 10. Design

Petit projet, besoin esthétique modéré, mais soigné et lisible.
- Minimaliste, clair. 2 ou 3 couleurs (fond, texte, une couleur d'accent). Mode sombre non prévu en v1.
- Police système (aucun chargement externe). Une seule police embarquée est possible plus tard.
- Zones tactiles : 44 px minimum. Navigation en bas de l'écran (à portée du pouce) : Recettes, Liste, Courses, Réglages.
- Icônes : quelques SVG en ligne, sans bibliothèque.
- Aucune dépendance externe : tout fonctionne sans réseau.

## 11. Méthode de développement

- Outil : assistant de code IA, dans le dossier `SPESA_dev` (Windows), versionné avec Git, publié sur GitHub.
- Fichier de consignes à la racine (non publié) : rappelle les règles de ce document (structure, séparation des responsabilités, aucun texte en dur, aucune dépendance externe).
- Petites étapes : une étape = un résultat testable dans Chrome. On valide avant de passer à la suivante. Pas de gros blocs de code d'un coup.
- Test : ouverture de `index.html` via un petit serveur local (nécessaire pour le service worker), puis test sur le téléphone après déploiement.

### Plan des étapes

| # | Étape | Résultat attendu |
|---|---|---|
| 0 | Environnement | Dossier, Git, dépôt GitHub, fichier de consignes, ce document dedans |
| 1 | Squelette et langues | `index.html`, `style.css`, navigation, `t()` avec `fr.json` |
| 2 | Données et recettes | `db.js`, créer/modifier/supprimer une recette, recherche, parts |
| 3 | Import de recettes | Format JSON, aperçu de validation, prompt stocké (texte à rédiger ici) |
| 4 | Dictionnaire et rayons | Normalisation, autocomplétion, rayon par ingrédient |
| 5 | Flux panier | Ajouts, révision (décochage), fusion et conversion, liste par rayon |
| 6 | Mode courses | Cochage tactile, fin des courses |
| 7 | Historique | Archivage et consultation |
| 8 | Sauvegarde | Bouton flottant, export, restauration, rappel 7 jours |
| 9 | PWA | `manifest.json`, `service-worker.js`, icônes, stockage persistant |
| 10 | Déploiement | GitHub Pages, installation sur le téléphone, test réel |

Ordre non négociable : 1 → 2 → 4 → 5 → 6 sont le cœur. 3, 7, 8 peuvent s'intercaler selon l'envie, mais 8 doit être faite avant d'utiliser l'appli pour de vrai.

## 12. Points ouverts

- Liste des rayons et leur ordre exact (à caler sur ton magasin habituel).
- Liste fermée des unités à confirmer à l'étape 3.
- Choix de la couleur d'accent et de l'icône de l'appli.
- Décision v2 : passer à Drive automatique si la sauvegarde manuelle gêne à l'usage.

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

Mise en œuvre PWA (étape 9) :
- `manifest.json` (nom SPESA, affichage plein écran, couleur d'accent `#2e7d4f`, icônes 192 et 512 px). Les icônes sont provisoires : coche blanche sur fond vert, à remplacer quand l'icône définitive sera choisie.
- `service-worker.js` : cache « d'abord le cache, puis le réseau ». Tous les fichiers de l'appli sont mis en cache à l'installation, en bloc (tout ou rien), ce qui évite de mélanger deux versions.
- **Règle de mise à jour : à chaque modification d'un fichier de l'appli, changer `VERSION` dans `service-worker.js`** (ex. `spesa-v2`). Sinon les téléphones gardent l'ancienne version. Tout nouveau fichier de l'appli doit aussi être ajouté à la liste `FICHIERS`.
- Sur `localhost`, le service worker est désactivé pour voir chaque modification tout de suite. Pour tester le hors-ligne en local : `http://localhost:8080/?sw`.
- `navigator.storage.persist()` est appelé à chaque démarrage (sans effet s'il est déjà accordé) : Chrome peut le refuser avant l'installation sur l'écran d'accueil et l'accorder après.

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

Un ingrédient sans quantité (ex. « sel ») est autorisé : `"quantite": null, "unite": ""`. Unités v1 : `g`, `kg`, `ml`, `l`, `cs`, `cc`, `piece`, `pincee`. Les identifiants de recettes sont de la forme `r_` + code unique.

**Dictionnaire** (`spesa_dico`, objet) : clé normalisée → fiche
```json
{ "aubergine": { "libelle": "aubergine", "rayon": "fruits_legumes" } }
```
Un nouvel ingrédient validé est ajouté automatiquement. Le rayon est demandé une seule fois, puis mémorisé.

Mise en œuvre (étape 4) : chaque ligne d'ingrédient du formulaire de recette porte un champ « Rayon ». Il est prérempli si l'ingrédient est connu, obligatoire sinon. Le modifier dans une recette met à jour la fiche du dictionnaire. Identifiants de rayons, dans l'ordre : `fruits_legumes`, `boulangerie`, `boucherie_poissonnerie`, `cremerie`, `epicerie_salee`, `epicerie_sucree`, `surgeles`, `boissons`, `hygiene_entretien`, `autre`.

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

Précisions (étape 5) : `decoches` contient des clés normalisées (ex. `huile d olive`), pas des libellés. Un décochage vaut pour toutes les lignes de l'ingrédient, quelle que soit l'unité. Un article libre (`manuels`) mémorise aussi son rayon dans le dictionnaire. Une recette supprimée disparaît de la liste à l'affichage suivant.

**Historique** (`spesa_historique`, tableau) : copies figées des listes validées, avec date. Consultation seule. Chaque entrée est autonome (elle ne dépend plus des recettes ni du dictionnaire) :
```json
{
  "date": "2026-10-02T12:05:26.760Z",
  "recettes": [{ "titre": "Crêpes", "parts": 4 }],
  "lignes": [{ "libelle": "Lait", "rayon": "cremerie", "quantites": [{ "quantite": 500, "unite": "ml" }], "coche": true }]
}
```
L'archivage est fait par « Terminer les courses » (étape 6). L'écran de consultation (étape 7) s'ouvre par le bouton « Historique des courses » de l'onglet Courses : liste des courses terminées (la plus récente en premier), puis détail d'une liste (recettes, articles par rayon, cochés = étaient dans le caddie). Aucune modification ni suppression possible.

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

Mise en œuvre (étape 3) :
- Le JSON accepte une clé facultative `avertissements` (liste de phrases) où l'assistant signale ses doutes. Elle s'affiche dans l'aperçu et n'est pas enregistrée dans la recette.
- Le texte est lu même s'il est entouré de blabla ou de ``` (on garde de la première `{` à la dernière `}`). Format, titre, ingrédients, quantités et unités sont vérifiés avant tout aperçu.
- Parts absentes : 4 par défaut, signalé dans l'aperçu.
- L'aperçu à valider est le formulaire de recette lui-même, prérempli : on relit, on corrige, on choisit le rayon des ingrédients inconnus, puis on enregistre. Rien n'est enregistré avant.
- Liste fermée des unités (confirmée) : `g`, `kg`, `ml`, `l`, `cs`, `cc`, `piece`, `pincee`. Les éléments comptés (gousse, tranche, boîte, botte...) passent en `piece`, le type étant dans le nom (« gousse d'ail »).
- Le prompt est stocké dans `langues/fr.json` (clé `prompt_import`). Texte actuel :

```
Tu reçois la photo ou la capture d'écran d'une recette. Transforme-la en un fichier JSON strictement conforme au format ci-dessous. Réponds uniquement avec ce JSON, sans aucun autre texte.

Format :
{
  "format": "spesa-recette-v1",
  "titre": "Ratatouille",
  "parts": 4,
  "ingredients": [
    { "nom": "aubergine", "quantite": 2, "unite": "piece" },
    { "nom": "huile d'olive", "quantite": 3, "unite": "cs" },
    { "nom": "sel", "quantite": null, "unite": "" }
  ],
  "etapes": ["Couper les légumes.", "Faire revenir."],
  "notes": "",
  "avertissements": []
}

Règles :
- "unite" : une seule valeur parmi g, kg, ml, l, cs (cuillère à soupe), cc (cuillère à café), piece, pincee. Ne convertis pas les quantités : 250 g reste 250 g.
- Pour les éléments comptés (gousse, tranche, boîte, botte, sachet, brin...), utilise "piece" et mets le type dans le nom : "gousse d'ail", quantité 2, unité "piece".
- "quantite" : un nombre écrit avec un point (1.5, jamais "1 1/2" ni "1,5"), ou null s'il n'y a pas de quantité (sel, poivre "à votre goût"). Dans ce cas "unite" vaut "".
- "nom" : au singulier, en minuscules, sans quantité ni indication de préparation ("oignon", pas "2 oignons émincés").
- "parts" : le nombre de personnes ou de parts indiqué, en nombre entier. S'il est absent, mets null.
- "etapes" : une phrase courte par étape, dans l'ordre. Liste vide si la recette n'en donne aucune.
- "notes" : conseils ou remarques de la recette, sinon une chaîne vide.
- N'invente rien. Si un mot, un nombre ou une unité est illisible ou ambigu, ne devine pas en silence : donne ton meilleur choix si tu en as un et signale le doute dans "avertissements" (une phrase par doute, par exemple "Quantité de farine peu lisible : 250 g ?"). Si tout est clair, laisse "avertissements" vide.
```

## 9. Sauvegarde

- Bouton flottant en bas à droite, toujours visible : « Sauvegarder ».
- Au toucher : génération d'un fichier `spesa-sauvegarde-AAAA-MM-JJ.json` (recettes, dictionnaire, historique, réglages) puis ouverture du menu de partage Android (Web Share API) pour l'envoyer vers Drive. Si le partage de fichier n'est pas disponible, repli sur un simple téléchargement.
- « Restaurer » (dans les réglages) : choix d'un fichier de sauvegarde, avec confirmation avant d'écraser.
- Rappel : bandeau discret si la dernière sauvegarde date de plus de 7 jours. Proposition de sauvegarde aussi à la fin des courses.
- La date de dernière sauvegarde est enregistrée dans les réglages.

Mise en œuvre (étape 8) : le fichier contient `format: "spesa-sauvegarde-v1"`, `date`, `version_schema`, puis `recettes`, `dico`, `historique`, `reglages`. La liste en cours n'est pas sauvegardée. À la restauration, le fichier est vérifié (format, version, contenu) avant toute modification des données. Le bouton « Restaurer » est dans l'écran Réglages, avec le bouton « Sauvegarder » et la date de dernière sauvegarde. Le bandeau de rappel n'apparaît que si l'appli contient des données. Une proposition de sauvegarde suit « Terminer les courses ».

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
- Choix de la couleur d'accent et de l'icône de l'appli.
- Décision v2 : passer à Drive automatique si la sauvegarde manuelle gêne à l'usage.

---

## 13. Version 1.1 : améliorations (plan du 2 octobre 2026)

Origine : test de l'appli avec trois recettes réelles (un colis de livraison, un aligot, une purée). Aucun plantage, mais des défauts d'usage. Cette section est le plan de travail de la v1.1 ; elle suit les mêmes règles que la v1 (une étape à la fois, validation, un commit par étape).

### 13.1 Constats à corriger

| Réf. | Constat | Exemple observé |
|---|---|---|
| C1 | Fractions de pièces absurdes, surtout quand les parts changent | 0,5 carotte ; 4,5 gousses d'ail ; à 1 part : 0,13 carotte, 0,06 bouillon cube |
| C2 | Variantes d'un même ingrédient non fusionnées | « pomme de terre » 1 kg et « pomme de terre à chair farineuse » 1 kg restent deux lignes |
| C3 | Pièces mal lisibles | « gousse d'ail 4,5 pièce(s) », « paquet de lait de coco 0,5 pièce(s) » |
| C4 | Noms affichés en minuscules | « carotte » |
| C5 | Parts absentes à l'import : 4 par défaut, ce qui fausse les quantités des recettes calculées « par personne » | colis : quantités pour 1 personne, importées comme 4 parts |
| C6 | Autocomplétion trop limitée : elle ne propose que ce qui a déjà été saisi (rien au départ), ne tolère ni pluriel ni faute, et rien n'empêche de créer un doublon | « tomate » / « tomates » / « tomatte » donneraient trois ingrédients |
| C7 | Unité en centimètres inexistante (gingembre « 1 cm ») | noté « 1 pièce » : imprécis, accepté pour la v1.1 |

### 13.2 Décisions proposées (à valider avant l'étape concernée)

**Quantités et affichage**
- **Affichage des fractions** : les pièces, pincées et cuillères s'affichent en fractions courantes (½, ⅓, ¼, ⅔, ¾, « 1 ½ ») quand la valeur est proche, sinon en décimales. Les g, kg, ml et l restent en décimales (« 1,5 kg »).
- **Pièces : « × »** : « 4,5 × gousse d'ail » plutôt que « gousse d'ail 4,5 pièce(s) ». Pour les autres unités, l'affichage ne change pas.
- **Majuscule** : première lettre du nom en majuscule à l'affichage seulement. Le texte enregistré ne change pas.
- **Arrondi des pièces dans la liste de courses** : on additionne d'abord les quantités exactes, puis on arrondit à l'entier supérieur pour les pièces et les pincées (0,5 + 0,5 carotte = 1 ; 4,5 gousses = 5). Les cuillères, g et ml ne sont pas arrondis. La page d'une recette garde les quantités exactes. Compromis : on peut acheter un peu trop, jamais trop peu.
- **Parts obligatoires à l'import** : si les parts sont absentes, le champ reste vide et doit être rempli avant d'enregistrer, au lieu d'un « 4 » par défaut trompeur.

**Éviter les doublons (astuces simples, cumulées)**
1. **Dictionnaire de départ** : environ 200 ingrédients courants avec leur rayon, ajoutés au premier lancement sans jamais écraser tes choix. L'autocomplétion marche dès le premier jour, et les ingrédients courants n'ont plus besoin de rayon à saisir.
2. **Comparaison tolérante** : la clé de comparaison ignore le pluriel (« tomates » = « tomate », « oeufs » = « oeuf ») et les petits mots (« huile d'olive » = « huile olive »). Une courte liste d'exceptions évite les faux positifs (pois, riz, noix, maïs…). Cela change la clé des ingrédients : migration des données nécessaire (voir étape 14).
3. **Autocomplétion améliorée**, partout où l'on tape un ingrédient : recettes, import et **articles libres de la liste**. Elle propose d'abord les noms qui commencent par la saisie, puis ceux qui contiennent un mot de la saisie, puis les noms proches malgré une faute de frappe. Une dernière ligne « Nouvel ingrédient : … » rend la création explicite.
4. **« Tu voulais dire ? »** : quand un nom tapé n'existe pas mais ressemble à un existant (faute de frappe, ou nom qui contient un ingrédient connu), l'appli demande avant de créer : « Utiliser *pomme de terre* ? » avec deux boutons, « Oui » ou « Non, c'est différent ». Elle ne pose la question qu'à la création : un nom déjà connu ne redemande rien. Exemple : « oignon nouveau » déclenche la question ; la réponse « différent » règle le cas une fois pour toutes.
5. **Badges dans l'aperçu d'import** : chaque ingrédient importé est marqué « connu » ou « nouveau », avec « proche de : … » quand c'est le cas, et un appui pour le remplacer.
6. **Prompt d'import amélioré** : il demande le nom générique (« pomme de terre », la variété va dans les notes) et, au moment de copier, il contient la liste des noms déjà connus pour que l'assistant les réutilise tels quels.
7. **Écran « Ingrédients »** (dans les Réglages) : liste avec recherche ; pour chaque ingrédient : renommer, changer le rayon, **fusionner dans un autre** (les recettes et la liste en cours sont réécrites), supprimer s'il n'est utilisé nulle part. Pas de nouveau champ dans le modèle : une fusion réécrit les recettes plutôt que de créer des alias.

### 13.3 Plan des étapes

| # | Étape | Résultat attendu |
|---|---|---|
| 11 | Tests de `logic.js` | Un fichier de tests lançable avec Node (aucune dépendance, non publié dans l'appli) qui vérifie normalisation, fusion, conversion, parts, lecture d'import. Il se relance avant chaque commit pour éviter les régressions (les étapes 13 à 16 touchent beaucoup la logique) |
| 12 | Affichage des quantités | Majuscule, « × » pour les pièces, fractions ½ ¼ ¾ dans le détail des recettes, la révision et les courses (C1, C3, C4) |
| 13 | Arrondi et parts à l'import | Pièces arrondies à l'entier supérieur dans la liste de courses ; parts obligatoires à l'import (C1, C5) |
| 14 | Comparaison tolérante | Pluriel et petits mots ignorés dans la clé ; **migration des données** (schéma 2) avec copie de sécurité automatique avant, et fusion des clés devenues identiques (C2, C6) |
| 15 | Dictionnaire de départ et autocomplétion | Liste d'environ 200 ingrédients que tu relis et ajustes (rayons selon ton magasin) ; autocomplétion tolérante aux fautes et ligne « Nouvel ingrédient » dans le formulaire de recette et dans les articles libres (C6) |
| 16 | Anti-doublons à la création | Question « Tu voulais dire ? » avant de créer un nom proche d'un existant ; badges « connu / nouveau / proche de » dans l'aperçu d'import (C2, C6) |
| 17 | Écran « Ingrédients » | Renommer, changer le rayon, fusionner, supprimer les inutilisés (C2) |
| 18 | Prompt d'import amélioré | Noms génériques demandés, liste des noms connus ajoutée à la copie du prompt (C2, C6) |

Mises en ligne par lots, à la demande : après l'étape 13, après la 16, puis après la 18. À chaque mise en ligne : changer `VERSION` du service worker, `git push`, test sur le téléphone.

Ordre : 11 → 12 → 13 d'abord (corrigent ce qui est visible tout de suite, sans toucher aux données). L'étape 14 est la plus risquée (elle réécrit des clés) : elle exige une sauvegarde faite juste avant. Les étapes 15 à 18 s'appuient sur elle.

### 13.4 Risques et coûts

- **Étape 14** : si la règle du pluriel se trompe, deux ingrédients différents peuvent être confondus. Parades : liste d'exceptions, tests de l'étape 11, copie de sécurité avant migration, et vérification sur tes recettes réelles.
- **Étape 15** : la liste de départ est un contenu à relire par toi (rayons selon ton magasin). Elle ne doit jamais écraser un choix déjà fait.
- **Étape 16** : la question « Tu voulais dire ? » ajoute un appui à la création d'un ingrédient ; c'est le prix de la prévention des doublons. Elle ne s'affiche qu'en cas de ressemblance.
- **Étape 17** : la fusion réécrit les recettes ; elle demande une confirmation et conseille une sauvegarde.
- Aucune étape n'ajoute de dépendance externe.

### 13.5 Idées en réserve (non planifiées)

Écran allumé pendant les courses ; ordre des rayons réglable ; message « nouvelle version disponible » ; icône et couleur définitives ; mode sombre ; unité habituelle mémorisée par ingrédient ; ingrédients fréquents proposés en un appui dans les articles libres ; annulation de la suppression d'une recette ; suppression dans l'historique ; photo de recette (demande IndexedDB) ; sauvegarde automatique vers Drive ; corse.

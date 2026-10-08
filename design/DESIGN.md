# DESIGN.md — Spesa Sporta

Version 0.4 — 2026-10-08. Source de vérité du design. Mobile uniquement (PWA), thème unique, français + corse.
Les valeurs en px sont des px CSS (référence : écran 390 × 844). Si l'app n'est pas web, transposer en gardant les rapports.
Légende : **[DÉCIDÉ]** validé par Romain · **[À VALIDER]** proposé, non tranché · **[BROUILLON]** à faire relire · **[À MAQUETTER]** écran pas encore dessiné.
Maquettes : dossier `design/mockups/` (voir section 14). En cas d'écart entre une maquette et ce fichier, **ce fichier prévaut**.

## 0. Règles pour Claude Code

1. Ne jamais inventer de couleur, taille, rayon ou forme : tout vient des tokens (section 2) et des tables (sections 5 et 6). Valeur absente → demander.
2. Pas d'ombres, pas de dégradés (seule exception : le motif de tirets de la perforation, 5.4), pas d'émojis, pas de bibliothèque d'icônes. Icônes : SVG à trait simple (section 5.20).
3. Aucun texte dans un composant : tout passe par les fichiers de langue `fr` et `co` (section 11).
4. Travailler par petites étapes, dans l'ordre de la section 13. Une étape = un résultat à tester sur téléphone avant la suivante.
5. Ne pas lancer de captures ni de vérifications visuelles sans demande (coût en tokens).
6. Les hauteurs sont des **minimums** (`min-height`), jamais fixes : le texte doit pouvoir grossir à 200 %. Corse : +30 % de longueur, sans troncature.
7. Contrôles natifs uniquement (`button`, `a`, `input` + `label`, `textarea`) : jamais de `div` cliquable.
8. Les maquettes sont écrites dans un format propre à l'outil de design (balises `<x-dc>`, `{{trous}}`, `<sc-for>`, `<sc-if>`). Ne pas copier ce format : lire les valeurs de style (inline) et la logique d'état, puis réimplémenter dans la pile de l'app.

## 1. Principes

1. **Noir = toile, cartes = coupons.** Fond noir pur ; les cartes claires touchent les deux bords de l'écran. **[DÉCIDÉ]**
2. **Tout est dans une carte.** Aucun élément flottant sur le noir. **[DÉCIDÉ]**
3. **En-tête et pied de page = demi-cartes** collées au bord de l'écran ; arrondi uniquement du côté qui rejoint les cartes principales. **[DÉCIDÉ]**
4. **La couleur désigne ce qu'on touche ou ce qui compte** (section 2). Une couleur d'accent colore soit une carte entière de saisie, soit un encadré dans une carte claire. **[DÉCIDÉ]**
5. **Formes simples à la place d'illustrations** : une forme géométrique par rayon, et la forme (pas la couleur) porte l'identité du rayon. **[DÉCIDÉ]**
6. **Pensé pour le magasin** : une main, debout, lumière forte. Contraste et taille des cibles passent avant le style.
7. **Séparer sans espace : la perforation.** Des éléments liés dans une même carte sont séparés par une ligne de tirets « à déchirer » (5.4). **[DÉCIDÉ]**

## 2. Couleurs (palette fermée de 9 teintes)

Thème unique, pas de mode clair/sombre. **[DÉCIDÉ]**

| Token | Valeur | Usage |
|---|---|---|
| `canvas` | #000000 | Fond de l'app ; texte et formes sur carte claire (`ink` = `canvas`) ; fond des tuiles de comptage ; pastilles actives |
| `card` | #EDEDED | Carte standard ; texte sur noir (`ink-on-dark` = `card`) |
| `ink-soft` | #4A4A4A | Texte secondaire, libellés de champ, texte indicatif, contour des pastilles non choisies, bouton désactivé |
| `muted` | #BDBDBD | Texte secondaire sur `card-done` ; vignettes Crèmerie et Autre |
| `card-done` | #1A1A1A | Carte d'un article coché ; bloc de texte à copier ; carte de résumé d'erreurs |
| `accent-blue` | #8FD9E8 | Carte de recherche ; vignette Boissons |
| `accent-yellow` | #FFD84A | Cartes de saisie (Article, Quantité, Titre, Parts) ; encadré du stepper de parts ; vignette Boulangerie |
| `accent-green` | #A8D26B | Bouton d'action principal ; vignette Légumes |
| `accent-orange` | #FF8A3D | Sticker « Aperçu » ; vignettes Épicerie salée et sucrée |

**Couleurs hors palette, réservées aux vignettes de rayon** (aucun autre usage) : `#E5484D` Fruits · `#E8788A` Boucherie-poissonnerie · `#8FA3B8` Surgelés · `#F7A8D8` Hygiène et entretien.

Règles :
- Texte et icônes sur toute couleur d'accent : noir `#000000` uniquement, jamais de blanc.
- Sur `canvas` ou sur un fond noir (pastille active, tuile de comptage) : texte `#EDEDED`.
- Une information n'est jamais portée par la couleur seule : toujours une forme, une icône ou un texte en plus.
- Contrastes estimés à la main (à revalider avec un outil avant production) : noir sur `card` ≈ 18:1 ; `ink-soft` sur `card` ≈ 7,5:1, sur jaune ≈ 6,5:1, sur bleu ≈ 5,5:1 ; `muted` sur `card-done` ≈ 9:1. Cible : ≥ 4,5:1 (texte), ≥ 3:1 (grands titres, contours, formes noires sur vignette).

Bloc à créer dans le CSS global :
```css
:root {
  --canvas:#000000; --card:#EDEDED; --card-done:#1A1A1A;
  --ink:#000000; --ink-soft:#4A4A4A; --ink-on-dark:#EDEDED; --muted:#BDBDBD;
  --blue:#8FD9E8; --yellow:#FFD84A; --green:#A8D26B; --orange:#FF8A3D;
  --r-card:32px; --r-tile:24px; --r-box:16px; --r-pill:999px; --gap-card:4px;
}
```

## 3. Typographie

Police unique : **Archivo** (variable, axe de graisse), **hébergée dans l'app** (pas de CDN : usage en magasin, réseau faible). **[DÉCIDÉ]** Fichier : `archivo-latin-wght-normal.woff2` (paquet Fontsource), licence SIL OFL 1.1 ; couverture des accents du corse (à è ì ò ù) et de « œ » vérifiée.
```css
@font-face {
  font-family: "Archivo"; font-style: normal; font-weight: 100 900; font-display: swap;
  src: url("/fonts/archivo-latin-wght-normal.woff2") format("woff2");
}
body { font-family: "Archivo", system-ui, sans-serif; }
```
Précharger le fichier (`<link rel="preload" as="font" type="font/woff2" crossorigin>`) et le mettre en cache hors ligne. Graisse de base 600 pour les titres et valeurs, 500 pour le texte courant, 400 pour les méta ; hiérarchie par la taille. **14 px est le minimum absolu.**

| Rôle | Taille / interligne | Graisse | Couleur |
|---|---|---|---|
| Titre d'écran | 32 / 34 | 600 | noir |
| Résumé sous le titre | 17 / 22 | 500 | `ink-soft` |
| Texte de recherche | 20 | 600 | noir |
| Nom d'article / de recette, titre de carte | 20 / 24 | 600 | noir |
| Champ de saisie pleine carte (Article, Titre) | 24 / 28 | 600 | noir |
| Valeur de quantité / de parts | 28 / 32 | 600 | noir |
| Unité à côté d'une valeur (« parts ») | 17 / 24 | 500 | noir |
| Champ dans un encadré, texte courant, étape | 17 / 24 | 600 (champ) / 500 (texte) | noir |
| Bouton principal | 18 | 600 | noir |
| Bouton secondaire, pastille d'import | 17 / 16 | 600 | noir / `ink-on-dark` |
| Pastille de filtre / d'unité, sélecteur | 15 | 600 | noir ou `ink-on-dark` |
| Libellé de champ, méta, légende, onglet | 14 / 18 | 600 (libellé, onglet) / 400-500 (méta) | `ink-soft` (onglet : noir ou `ink-on-dark`) |
| Message d'erreur | 14 / 20 | 600 | noir |

## 4. Mise en page

- Canevas noir. Cartes pleine largeur (bord à bord), séparées de **4 px** (`--gap-card`). **[DÉCIDÉ]**
- Rayons : carte 32 · vignette 80 px : 24 · vignette 48 : 16 · vignette 32 : 10 · bouton carré (case, ajout rapide, retirer, sélecteur, champ) : 16 · boutons et pastilles : 999 · liste de suggestions : 20 · encadré de stepper : 24.
- Marges intérieures d'une carte : **24 à gauche, 28 à droite** (le rayon mange 4 px à droite) ; verticalement 14 (cartes de saisie, de texte), 8 (cartes à vignette 80 px).
- Grille de 4 px. Pas d'ombres.
- **En-tête** : demi-carte `card` collée en haut, rayon `0 0 32 32`, `min-height` 96, `padding: 0 28px 0 24px`, contenu centré verticalement. Deux variantes : (a) écran racine : titre + résumé ; (b) écran secondaire : bouton retour 44 × 44 rond (contour 1,5 noir, flèche 22) + titre, gap 12.
- **Pied de page** : demi-carte `card` collée en bas, rayon `32 32 0 0`, `padding: 20px 24px`. Trois variantes (5.3). **[DÉCIDÉ]**
- Zones système : ajouter `env(safe-area-inset-top)` à l'en-tête et `env(safe-area-inset-bottom)` au pied de page, en gardant les 20 px visibles.
- Zone centrale entre l'en-tête et le pied : `flex: 1; min-height: 0; overflow-y: auto`, gap 4, **barre de défilement masquée** (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`). **[DÉCIDÉ]** Garder une carte coupée en bas pour signaler qu'on peut défiler.
- Clavier ouvert : le pied de page remonte au-dessus du clavier.

## 5. Composants

### 5.1 Carte
`card`, rayon 32, `padding: 14px 28px 14px 24px` (ou `8px 28px 8px 24px` pour une carte à vignette 80 px, `min-height` 96). Variantes de fond : `card`, `card-done`, `accent-yellow` (saisie), `accent-blue` (recherche).

### 5.2 En-tête
Voir section 4. Titre 32/34 ; résumé 17/22 `ink-soft`. Plus de pastille de langue : la langue se règle dans Réglages. **[DÉCIDÉ]**

### 5.3 Pied de page (trois variantes)
- **Action seule** (écrans secondaires : Ajout, Détail, Formulaire, Import) : un ou deux boutons, `display:flex; flex-wrap:wrap; gap:8`.
- **Action + onglets, « coupon à deux étages »** (écrans racine : Courses, Recettes) : étage du haut = bouton(s) d'action ; perforation (5.4, variante pied) ; étage du bas = barre d'onglets (5.5). Hauteur ≈ 181 px. **[DÉCIDÉ]**
- **Onglets seuls** (≈ 92 px) : pour un écran racine sans action [À MAQUETTER : Réglages].
- **Feuille modale** (5.17) : remplace temporairement le pied de page, sans onglets.

### 5.4 Perforation « tiret détachable » **[DÉCIDÉ]**
Ligne décorative (`aria-hidden`, aucun comportement), toujours **à l'intérieur** d'une carte ou entre deux cartes jointes :
- conteneur `position:relative; z-index:1; height:1px` ;
- ligne : `position:absolute; left:22px; right:22px; top:0; height:1px; background-image: repeating-linear-gradient(90deg, #000 0, #000 18px, transparent 18px, transparent 32px)` (18 de trait, 14 de blanc) ; pas de `border-style: dashed` (rendu variable selon le navigateur) ;
- deux encoches : disques noirs de 24 px, `left:-12px` et `right:-12px`, `top:-11.5px` (demi-coupés par les bords de l'écran).
Variantes de marges : **jonction** de deux cartes jaunes (Ajout : Article `32 32 0 0` / Quantité `0 0 32 32`, plus d'espace de 4 px, le conteneur a le fond jaune, trait noir) ; **entre lignes d'une carte** : `margin: 14px -28px 14px -24px` (Formulaire, Import) ou `12px -28px 12px -24px` (Détail) ; **dans le pied** : `margin: 16px -24px`.

### 5.5 Barre d'onglets
`<nav aria-label>` de 3 liens : Recettes · Courses · Réglages, `display:flex; gap:8`. Onglet : `flex:1; min-height:52; border-radius:999; flex-direction:column; align-items:center; justify-content:center; gap:2`, icône 22 (trait 2) + libellé 14/18 600. **Actif** : fond noir, texte `ink-on-dark`, `aria-current="page"`. **Inactif** : transparent, texte noir. Présente uniquement sur les 3 écrans racine. Icônes : Recettes = livre ouvert ; Courses = liste à coches ; Réglages = deux curseurs (voir les maquettes pour les tracés).

### 5.6 Boutons
| Bouton | Spécification |
|---|---|
| **Principal (vert)** | `min-height:56; padding:0 16px; radius 999; fond accent-green; texte noir 18/600; icône 22 à gauche (« + » ajout, coche enregistrer)` ; seul bouton plein de l'écran |
| **Secondaire (contouré)** | `min-height:56` (48 dans une carte dense), `padding:0 20px; radius 999; border 2.5px solid noir; fond transparent; texte 17/600`, icône 20 optionnelle |
| **Pastille sombre** | « Importer » : fond noir, texte `ink-on-dark` 16/600, `min-height:56`, `padding:0 20px`, icône 20, `aria-label` complet |
| **Rond** | 44 (retour) ou 48 (− / +) ; `border 1.5px solid noir`; fond transparent |
| **Carré** | 48 × 48, radius 16, `border 2.5px solid noir` : case à cocher, ajout rapide, retirer (corbeille, contour 1,5) |
| **Désactivé** | fond transparent, `border: 2.5px dashed #4A4A4A`, texte `ink-soft`, `disabled` + `aria-disabled="true"` ; jamais seulement grisé |
| **Retrait doux** | « Retirer de la liste » : pleine largeur, `min-height:48`, `border 2.5px dashed noir` |
Cible tactile ≥ 44, visée 48, espacées d'au moins 8. Le vert est un **encadré dans la carte claire**, jamais le fond d'une carte. **[DÉCIDÉ]**

### 5.7 Pastilles (filtres, unités)
Hauteur 44, `padding:0 18px`, radius 999, texte 15/600, `aria-pressed`, `role="group"` + libellé. Choisie : fond noir, texte `ink-on-dark`. Non choisie : transparente, contour 1,5 `ink-soft` (filtres) ou noir (unités). Passent à la ligne si le texte grossit.

### 5.8 Champs de saisie
- **Sur une carte jaune** (Article, Titre) : champ transparent, 24/28 600, libellé 14/18 600 `ink-soft` au-dessus, texte indicatif `ink-soft`. Focus : contour 3 `#EDEDED` en dedans (`outline-offset:-3px`) sur la carte.
- **Dans une carte claire** (Formulaire, Import) : l'encadré garde le **fond de la carte** (`#EDEDED`), `border: 1.5px solid noir`, radius 16, `min-height:48`, `padding:0 12px`, texte 17/24 600 (zone de texte : 500, `padding:10px 12px`). Focus : `outline: 3px solid noir; outline-offset:2px`.
- **Libellé visible obligatoire** (14/18 600 `ink-soft`, `label for`), jamais le texte indicatif seul.
- **Erreur** (sans rouge) **[DÉCIDÉ]** : bordure de l'encadré passe à 3 px noir ; sous le champ, pastille « ! » (5.20) + message 14/20 600 noir (`role="alert"`) ; le champ reçoit `aria-invalid="true"` + `aria-describedby`.
- **Sélecteur** (unité, rayon) : bouton `min-height:48; padding:4px 10px; radius 16; border 1.5 noir; fond transparent`, texte 15/18 600, chevron 20 à droite ; le sélecteur de rayon contient la vignette 32 + le nom (peut passer à la ligne).

### 5.9 Carte article (écran Liste)
`min-height:96`, gap 12. De gauche à droite : vignette 80 × 80 (radius 24, couleur du rayon, forme noire 44 au centre) · bloc texte (nom 20/24, méta « quantité · rayon » 14/18 `ink-soft`) · case à cocher 48 × 48 (carré, `aria-pressed`). Cochée : fond `card` + coche noire 26/3. **Article coché** : carte `card-done`, vignette à 45 % d'opacité, nom en `muted` barré, méta `muted`, case remplie. Les articles cochés **restent en place** (liste triée par rayon). **[DÉCIDÉ]** Libellé accessible : « Lait demi-écrémé, 2 L, crèmerie, non coché ».

### 5.10 Carte de recherche
`accent-blue`, `min-height:64`, loupe 22 à gauche, champ `type="search"` transparent 20/600, texte indicatif `ink-soft`. Insensible aux accents et à la casse.

### 5.11 Carte de filtres
`card`, `min-height:68`, pastilles Tout / À prendre / Pris.

### 5.12 Carte vide
Même forme qu'une carte article, vignette 80 : À prendre → vert + coche, « Rien à prendre » / « Tout est dans le panier » ; Pris → `muted` + tiret, « Rien de pris » / « Aucun article dans le panier » ; Recettes → vignette noire « 0 », « Aucune recette » / texte d'aide ; recherche sans résultat → vignette noire « 0 », « Aucune recette trouvée » / « Essaie un autre mot ».

### 5.13 Carte recette (écran Recettes)
`min-height:96`, `padding: 8px 28px 8px 24px`, gap 12. Zone cliquable (lien vers Détail, radius 24 pour le focus) : tuile noire 80 × 80 radius 24 (nombre d'ingrédients 32/34 600 `ink-on-dark` + « ingr. » 14/18 600) · titre 20/24 600 · méta 14/18 `ink-soft` (« Pas dans la liste » ou « Dans la liste · N parts »). **Les parts n'apparaissent pas sur la carte.** **[DÉCIDÉ]** À droite : bouton carré 48 « ajout rapide » : fond noir + « + » `ink-on-dark` (pas dans la liste) / transparent + « ✓ » noir (dans la liste). Il **ouvre la feuille de parts** (5.17), il n'ajoute pas directement. `aria-label` : « Ajouter {titre} à la liste » / « {titre}, dans la liste pour N parts, modifier ».

### 5.14 Stepper
Boutons ronds 48 (− et +, contour 1,5, `aria-label` explicite) autour d'une valeur 28/32 600 (`aria-live="polite"`) suivie de l'unité 17/24 500. Parts : min 1, max 99. Quantité (Ajout) : min 1.

### 5.15 Vignette de rayon et sélecteur de rayon
Voir section 6. Sélecteur de la grille (Ajout) : 3 colonnes, gap 6/8 ; chaque rayon = vignette de 64 de haut (radius 22, forme 36, bordure 3 transparente) + libellé 14/18 dessous. Sélectionné : bordure 3 noir, pastille noire 22 en haut à droite (top/right 3) avec coche `ink-on-dark`, libellé en 700.

### 5.16 Sticker « Aperçu »
Pastille `accent-orange`, texte noir 14/20 700, `padding:3px 12px`, radius 999, inclinée de −4°, en haut à droite (top 10, right 24). Réserver sa place (`padding-right` ≈ 88 sur le titre voisin).

### 5.17 Feuille de parts (Recettes) **[DÉCIDÉ]**
Remplace le pied de page (pas d'onglets), `role="dialog" aria-modal="true"`, radius `32 32 0 0`, `padding:20px 24px`. Contenu : « Pour combien de parts ? » 20/24 600 · nom de la recette 14/18 `ink-soft` · encadré jaune (`margin-top:12; padding:8; radius 24`) contenant le stepper en `space-between` · boutons (`margin-top:12`, flex-wrap, gap 8) : vert « Ajouter à la liste » (devient « Mettre à jour » si déjà dedans) `flex:1 1 180` + « Annuler » contouré `flex:1 1 100` · si déjà dans la liste : « Retirer de la liste » (retrait doux). Valeur initiale : parts de la recette, ou parts déjà choisies. Échap = annuler ; le focus entre dans la feuille et revient au bouton d'origine à la fermeture.

### 5.18 Ligne d'ingrédient (Détail) et segment (Formulaire)
- **Détail** : une seule carte, lignes `min-height:44`, gap 12 : vignette de rayon 32 (radius 10, forme 20) · quantité `min-width:84`, 17/24 600 · nom 17/24 500 avec le nom du rayon dessous (14/18 `ink-soft`). Séparées par la perforation (marge 12). Le `role="list"` / `listitem`.
- **Formulaire** : segments séparés par la perforation (marge 14) : [champ « Ingrédient n » + bouton retirer 48] · liste de suggestions · [Quantité (92 de large) | Unité (sélecteur, `flex:1 1 80`) | Rayon (sélecteur, `flex:2 1 150`)] en `flex-wrap`, gap 8, libellé 14/18 au-dessus de chaque champ.

### 5.19 Suggestions d'ingrédient
Sous le champ nom : `role="listbox"`, `margin-top:8`, radius 20, bordure 1,5 noir, fond `card`. Lignes `role="option"`, `min-height:56`, `padding:4px 12px`, gap 12, séparées par un trait pointillé 1 px noir (`border-top: 1px dashed`) ; vignette de rayon 32 + nom 17/22 500 (début saisi en 800) + rayon 14/18 `ink-soft`. Choisir une suggestion préremplit le rayon. Rayon par défaut d'un nouvel ingrédient : **Autre**.

### 5.20 Icônes et pastilles
SVG `viewBox 0 0 24 24`, `fill:none; stroke:currentColor; stroke-linecap:round; stroke-linejoin:round`, trait 2 à 3 (coches 3, plus/moins 2,5, flèche 2,2). Tracés : plus `M12 5v14M5 12h14` ; moins `M5 12h14` ; coche `M5 12.5l4.5 4.5L19 7.5` ; retour `M19 12H5M11 6l-6 6 6 6` ; corbeille `M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13` ; crayon `M4 20h4L19 9l-4-4L4 16z` ; loupe cercle (11,11,r7) + `M20 20l-4-4` ; chevron `M6 9l6 6 6-6` ; import `M12 4v10M8 10l4 4 4-4M5 20h14`. **Pastille « ! »** : disque noir de 24, « ! » `ink-on-dark` (trait 2,6 arrondi + point r1,5) ; sur carte sombre, inversée (disque `#EDEDED`, « ! » `#1A1A1A`). **Pastille numérotée** : disque noir 32, chiffre 16/600 `ink-on-dark` (étapes, étapes d'import).

## 6. Rayons (11) et formes **[DÉCIDÉ]**

La **forme porte l'identité** : deux rayons n'ont jamais la même forme. Forme toujours noire sur la vignette ; le nom du rayon est toujours écrit à côté. Tailles : 80 (liste, radius 24, forme 44) · 64 (grille Ajout, radius 22, forme 36) · 48 (radius 16) · 32 (ligne de texte, radius 10, forme 20). `viewBox 0 0 40 40`.

| # | Rayon | Couleur | Forme | Tracé SVG (noir) |
|---|---|---|---|---|
| 1 | Fruits | #E5484D | cercle | `<circle cx="20" cy="20" r="17"/>` |
| 2 | Légumes | #A8D26B | feuille | `<path d="M4 20A16 16 0 0 1 20 4H36V20A16 16 0 0 1 20 36H4Z"/>` |
| 3 | Boulangerie | #FFD84A | triangle | `<polygon points="20,3 37,35 3,35"/>` |
| 4 | Boucherie-poissonnerie | #E8788A | demi-disque incliné de 35° | `<g transform="rotate(35 20 22)"><path d="M3 30A17 17 0 0 1 37 30Z"/></g>` |
| 5 | Crèmerie | #BDBDBD | carré arrondi | `<rect x="4" y="4" width="32" height="32" rx="6"/>` |
| 6 | Épicerie salée | #FF8A3D | demi-disque | `<path d="M3 30A17 17 0 0 1 37 30Z"/>` |
| 7 | Épicerie sucrée | #FF8A3D | quart de disque | `<path d="M5 35V5A30 30 0 0 1 35 35Z"/>` |
| 8 | Surgelés | #8FA3B8 | flocon (3 traits) | `<g stroke="#000" stroke-width="4" stroke-linecap="round"><path d="M20 4V36"/><path d="M6.1 12L33.9 28"/><path d="M6.1 28L33.9 12"/></g>` |
| 9 | Boissons | #8FD9E8 | losange | `<polygon points="20,2 38,20 20,38 2,20"/>` |
| 10 | Hygiène et entretien | #F7A8D8 | maison | `<path d="M20 3L37 19H32V36H8V19H3Z"/>` |
| 11 | Autre | #BDBDBD | tiret | `<rect x="5" y="17" width="30" height="6" rx="3"/>` |

Écarts avec la demande initiale (assumés, une valeur à changer pour revenir en arrière) : Épicerie sucrée = quart de disque (elle était identique à Épicerie salée) ; Légumes = feuille (elle était un cercle comme Fruits) ; Crèmerie #B8B8B8 → #BDBDBD et Boissons #8FC7FF → #8FD9E8 (couleurs déjà dans la palette).
Points de vigilance : le demi-disque incliné (4) et le demi-disque (6) se ressemblent à 32 px (la couleur les départage, le nom reste obligatoire) ; Crèmerie et Autre ont le même gris (seule la forme les distingue). L'ordre de la liste de courses suit l'ordre 1 → 11. Implémentation conseillée : un composant `RayonTile({rayon, size})` alimenté par une table de données unique (id, couleur, forme), jamais de couleur en dur ailleurs.

## 7. Écrans

### 7.1 Liste (Courses) [Main.dc.html] **[DÉCIDÉ]**
Ordre : en-tête (« Courses » + résumé « Il reste N article(s) » / « Tout est dans le panier ») · recherche (bleu) · filtres · cartes article (zone défilante) · pied à deux étages (vert « + Ajouter un article » → Ajout ; perforation ; onglets, Courses actif). Cocher bascule l'état ; le résumé compte les non cochés.

### 7.2 Ajout d'un article [Ajout.dc.html] **[DÉCIDÉ]**
En-tête (retour + « Nouvel article ») puis zone défilante : **Article** + **Quantité** (cartes jaunes jointes par la perforation de jonction ; Quantité = stepper + pastilles d'unité pièce/kg/g/L) · **Rayon** (carte `card`, grille 3 colonnes × 4 des 11 rayons, 5.15) · **Aperçu** (carte article avec sticker orange, mise à jour en direct ; l'unité « pièce » n'affiche pas d'unité) · pied d'action seule (vert « Ajouter à la liste »). Le nom vide doit désactiver le bouton (style désactivé 5.6) ou afficher l'erreur du champ (5.8).

### 7.3 Recettes [Recettes.dc.html, RecettesVide.dc.html, RecettesParts.dc.html] **[DÉCIDÉ]**
En-tête (« Recettes » + « N recettes ») · recherche bleue « Rechercher une recette » · cartes recette (5.13) · pied à deux étages : étage du haut = vert « + Nouvelle recette » (→ Formulaire) + pastille sombre « Importer » (→ Import) ; perforation ; onglets (Recettes actif). Appui sur le bouton d'ajout rapide → feuille de parts (5.17, maquette RecettesParts). État vide : une carte (« Aucune recette » + aide).

### 7.4 Détail d'une recette [Detail.dc.html] **[DÉCIDÉ]**
En-tête (retour → Recettes + titre de la recette) · carte jaune « Parts » (stepper, base = parts de la recette ; les quantités sont recalculées au prorata, arrondies à 0,1, virgule décimale) · carte « Ingrédients » (5.18) · carte « Étapes » (pastilles numérotées 32, texte 17/24 500, gap 12) · carte « Notes » · carte d'actions (« Modifier » avec crayon → Formulaire ; « Supprimer » avec corbeille ; contourés noirs, **pas de rouge**) · pied d'action seule : vert « Ajouter à la liste » ↔ contouré « Dans la liste » + coche (`aria-pressed`), au nombre de parts affiché. « Supprimer » déclenche le message « Supprimé. Annuler » (7.9).

### 7.5 Formulaire de recette (création / modification) [Form.dc.html, FormErreur.dc.html] **[DÉCIDÉ]**
En-tête (retour + « Nouvelle recette » / « Modifier la recette ») · **Titre** (carte jaune, champ 24/28) · **Parts** (carte jaune, stepper) · **Ingrédients** (carte claire, segments 5.18, bouton contouré « Ajouter un ingrédient » `margin-top:16`) · **Étapes** (carte claire, segments : pastille numérotée + zone de texte `min-height:88` qui grandit + retirer 48, perforation entre étapes, « Ajouter une étape ») · **Notes** (carte claire, zone de texte `min-height:96`) · pied d'action seule : vert « Enregistrer » + contouré « Annuler ». Enregistrer reste actif : au clic avec erreurs, afficher la **carte de résumé** (en tête de la zone défilante : fond `card-done`, « ! » inversé, « N champs à corriger » 20/24 600 `ink-on-dark`, liste 14/18 `muted`, `role="alert"`) et y déplacer le focus. Erreurs prévues : titre vide (« Donne un titre à la recette. ») ; quantité non numérique (« Quantité : écris un nombre, par exemple 2 ou 0,5. »). Ingrédient sans nom : à signaler de même.

### 7.6 Import d'une recette [Import.dc.html, ImportApercu.dc.html] **[DÉCIDÉ]**
En-tête (retour + « Importer »). Carte 1 « Demande à une IA » (pastille 1) : phrase d'aide, bloc de texte à copier (`card-done`, texte `ink-on-dark` 14/20, radius 20, `padding:12px 14px`), bouton contouré « Copier le texte » → « Copié » + coche (2 s, `aria-live`). Carte 2 « Colle le résultat » (pastille 2) : zone de texte (5.8, hauteur 128, texte 14/20) ; boutons contourés `min-height:48` « Coller » et « Choisir un fichier ». Carte 3 : vide = vignette noire + « Aperçu » + « Il apparaît ici dès que le texte est collé » ; remplie = sticker « Aperçu », titre, « 4 parts · 6 ingrédients · 3 étapes », perforation, « 2 avertissements » avec « ! », une ligne par avertissement (vignette de rayon 32 + phrase complète, ex. « « sel » : quantité absente, laissée vide. » / « « mascarpone » : rayon deviné (Crèmerie), à vérifier. »). Pied d'action seule : « Enregistrer la recette » **désactivé** (5.6) tant que rien de valide, vert ensuite. Un avertissement ne bloque pas. Après enregistrement : ouvrir le Détail de la recette.

### 7.7 À MAQUETTER (lots C et D) — intentions déjà fixées
- **Liste en préparation** : recettes choisies avec leurs parts (modifiables), choix d'une recette à ajouter, articles libres, « Valider la liste ».
- **Révision de la liste** : articles regroupés par rayon, à décocher (« déjà à la maison »), « Valider la liste ».
- **Fin de courses** : confirmation « Terminer les courses » (« il reste N articles non cochés ») ; historique des courses ; détail d'une course terminée.
- **Réglages** (3e onglet) : sauvegarde (bouton + date de la dernière), restauration d'un fichier, liste des ingrédients (renommer, changer de rayon, fusionner, supprimer), **langue FR / CO** (c'est ici, et seulement ici, que se change la langue).
- **Transverses** : rappel de sauvegarde, alerte (stockage plein, données abîmées), message « Supprimé. Annuler ».
- **États des composants** : pressé, désactivé, erreur, focus clavier, premier lancement.
Ne pas improviser ces écrans : demander les maquettes. Réutiliser strictement les composants de la section 5.

### 7.8 Navigation
Onglets : Recettes · Courses · Réglages (écrans racine). Courses → Ajout (retour : Courses). Recettes → Détail → Formulaire (modifier) ; Recettes → Formulaire (nouvelle) ; Recettes → Import → Détail. Écran secondaire = flèche retour en en-tête, pas d'onglets.

### 7.9 Message « Supprimé. Annuler » [À MAQUETTER]
Après toute suppression : message avec action « Annuler » pendant quelques secondes ; l'action est aussi atteignable au clavier et annoncée (`role="status"`). Apparence à maquetter dans le lot D (dans une carte, jamais flottant sur le noir).

## 8. États et interactions

- Cibles tactiles ≥ 44, visées 48, espacées d'≥ 8.
- **Focus clavier** : sur carte claire, `outline: 3px solid #000; outline-offset:2px` ; sur carte de recherche bleue et cartes jaunes : `outline: 3px solid #EDEDED; outline-offset:-3px` (en dedans). Pas d'ombre.
- **Erreur** : 5.8. **Désactivé** : 5.6. **Pressé** : [À MAQUETTER] (proposition : fond du bouton inversé noir/transparent pendant l'appui, sans animation si `prefers-reduced-motion`).
- Mouvement : 150–250 ms, une seule courbe ; cocher = légère contraction + changement d'état ; simple fondu si `prefers-reduced-motion`. Tout geste (balayer) a un bouton équivalent.
- Premier lancement (liste vide) : cartes vides de 5.12 ; [À MAQUETTER] pour le guidage initial.

## 9. Comportements (logique à implémenter)

- Filtres : Tout / À prendre / Pris ; le résumé compte les articles non cochés.
- Ajout : quantité minimale 1 ; l'unité « pièce » n'affiche pas d'unité ; aperçu en direct.
- Recherche de recettes : insensible aux accents et à la casse (`normalize('NFD')`, retirer les diacritiques).
- Parts : 1 à 99 ; quantités d'une recette = quantité de base × parts / parts de base, arrondi à 0,1, affichées avec une virgule.
- Ajout rapide d'une recette : toujours via la feuille de parts ; mise à jour ou retrait si déjà dans la liste.
- Suggestions d'ingrédient : filtrer la table des ingrédients connus (début de mot, sans accents) ; choisir préremplit le rayon.
- Import : le texte collé est validé ; erreurs bloquantes → bouton désactivé ; avertissements → listés, non bloquants.
- Données : tout est local (hors ligne) ; sauvegarde et restauration par fichier (lot D).

## 10. Accessibilité (WCAG 2.2 AA, base non négociable)

- Contraste ≥ 4,5:1 (texte) et ≥ 3:1 (contours, grands titres, formes), validé à l'outil avant production.
- Texte jusqu'à 200 % sans coupure ni chevauchement (hauteurs en `min-height`, éléments en `flex-wrap`).
- Rien porté par la couleur seule : rayon = forme + nom ; erreur = contour épais + « ! » + texte ; désactivé = tirets ; sélection = coche ; onglet actif = fond noir + `aria-current`.
- Contrôles natifs ; boutons à icône seule avec `aria-label` ; groupes de pastilles `role="group"` + libellé ; chaque champ a un `label` visible ; erreurs reliées par `aria-describedby`.
- Dialogue (feuille de parts) : `role="dialog"`, `aria-modal`, focus piégé et restitué, Échap pour fermer.
- Listes (ingrédients, suggestions) : rôles `list`/`listitem` et `listbox`/`option`.
- Valeurs qui changent (parts, quantité, « Copié ») : `aria-live="polite"`.
- Animations réductibles ; aucun geste obligatoire. La barre de défilement masquée retire un repère : garder une carte coupée en bas.

## 11. Langues

Français (par défaut) et corse. Libellés dans `fr` et `co`, jamais dans les composants. +30 % de longueur prévue : texte sur 2 lignes, sans troncature. **Le corse est un brouillon à faire relire par un locuteur natif** avant toute mise en production.

| Clé | FR | CO **[BROUILLON]** |
|---|---|---|
| onglets | Recettes / Courses / Réglages | Ricette / Spesa / Parametri |
| titre liste | Courses | Spesa |
| recherche | Rechercher | Cercà |
| filtres | Tout / À prendre / Pris | Tuttu / Da piglià / Pigliatu |
| résumé (n > 1) | Il reste N articles | N articuli da piglià |
| résumé (tout pris) | Tout est dans le panier | Tuttu hè in u carrettu |
| vide (À prendre) | Rien à prendre | Nunda da piglià |
| vide (Pris) | Rien de pris | Nunda pigliatu |
| bouton liste | Ajouter un article | Aghjunghje un articulu |
| titre ajout | Nouvel article | Novu articulu |
| libellés | Article / Quantité / Rayon | Articulu / Quantità / Reparu |
| unités | pièce, kg, g, L | pezzu, kg, g, L |
| rayons (1→11) | Fruits, Légumes, Boulangerie, Boucherie-poissonnerie, Crèmerie, Épicerie salée, Épicerie sucrée, Surgelés, Boissons, Hygiène et entretien, Autre | Frutti, Legumi, Pane, Carne è pesciu, Latticini, Dispensa salata, Dispensa dolce, Surgelati, Bevande, Igiena è pulizia, Altru |
| sticker | Aperçu | Anteprima |
| bouton ajout | Ajouter à la liste | Aghjunghje à a lista |
| Recettes | Recettes · N recettes · Rechercher une recette · ingr. · Pas dans la liste · Dans la liste · N parts · Nouvelle recette · Importer · Importer une recette · Aucune recette · Aucune recette trouvée · Essaie un autre mot | à produire |
| feuille de parts | Pour combien de parts ? · Ajouter à la liste · Mettre à jour · Retirer de la liste · Annuler | à produire |
| Détail | Parts · Ingrédients · Étapes · Notes · Modifier · Supprimer · Ajouter à la liste · Dans la liste | à produire |
| Formulaire | Nouvelle recette · Titre · Parts · Ingrédients · Ingrédient n · Quantité · Unité · Rayon · Étapes · Notes · Ajouter un ingrédient · Ajouter une étape · Enregistrer · Annuler · N champs à corriger · Donne un titre à la recette. · Quantité : écris un nombre, par exemple 2 ou 0,5. | à produire |
| Import | Importer · Demande à une IA · Copier le texte · Copié · Colle le résultat · Coller · Choisir un fichier · Aperçu · N avertissements · Enregistrer la recette | à produire |
Pluriels : « part/parts », « ingrédient/ingrédients », « article/articles » selon N ; prévoir la règle du corse.

## 12. Décisions prises / ouvertes

**Prises** : pied à deux étages (action + onglets) ; pastille FR/CO retirée (langue dans Réglages) ; articles cochés restent en place ; erreur = contour 3 noir + « ! » + texte ; parts retirées de la liste de recettes, choisies à l'ajout ; ingrédients en lignes jointes par perforation ; 11 rayons identifiés par la forme ; champs dans une carte claire = fond de la carte + contour noir ; palette de 9 teintes + 4 couleurs de vignette.
**Ouvertes** : (1) recherche et filtres de la Liste : fusionner en une carte pour gagner de la place (le pied à deux étages coûte ≈ 85 px) ; (2) gris des cartes #EDEDED : éblouissement la nuit, tester sur téléphone, garder les tokens réglables ; (3) ajout rapide d'un article (saisie + Entrée, rayon deviné d'après l'historique, dernière unité mémorisée) ; (4) distinction demi-disque incliné / demi-disque à 32 px ; (5) collision de sens des couleurs (le vert = action = Légumes ; le bleu = recherche = Boissons ; le jaune = saisie = Boulangerie ; l'orange = sticker = Épicerie) : acceptable car les vignettes portent une forme, à surveiller ; (6) corse : « Reparu » (rayon) est le choix le plus incertain.

## 13. Ordre d'implémentation (pour Claude Code)

1. **Tokens** : bloc `:root` (section 2) + rayons/espacements (section 4). Critère : plus aucune valeur de couleur en dur ailleurs.
2. **Police** : `@font-face` hébergé (section 3). Critère : « œ à è ì ò ù » affichés en Archivo, hors ligne.
3. **Composants de base** : Carte, En-tête (2 variantes), Pied (3 variantes), Perforation, Boutons, Pastilles, Champs (5.8), Pastille « ! », Pastille numérotée, `RayonTile` + table des rayons.
4. **Liste** (7.1), puis **Ajout** (7.2). Tester sur téléphone.
5. **Recettes** (7.3) avec la feuille de parts, puis **Détail** (7.4).
6. **Formulaire** (7.5), puis **Import** (7.6).
7. Lots C et D seulement quand leurs maquettes existent (7.7). Corse : brancher `co` en dernier, texte relu.
À chaque étape : une seule fonctionnalité, test sur téléphone, commit.

## 14. Maquettes de référence (`design/mockups/`)

| Fichier | Écran / état |
|---|---|
| Main.dc.html · Corse.dc.html | Liste FR · CO (brouillon) |
| Ajout.dc.html · AjoutCo.dc.html | Ajout FR · CO (brouillon) |
| Recettes.dc.html | Recettes (interactive : recherche, feuille de parts) |
| RecettesVide.dc.html | Recettes, état vide |
| RecettesParts.dc.html | Recettes, feuille de parts ouverte |
| Detail.dc.html | Détail d'une recette (parts recalculées, ajout à la liste) |
| Form.dc.html · FormErreur.dc.html | Formulaire de recette · avec erreurs |
| Import.dc.html · ImportApercu.dc.html | Import vide · avec aperçu et avertissements |
| Rayons.dc.html | Référence des 11 rayons |
Lecture : valeurs de style en ligne (px, couleurs, rayons) = vérité visuelle ; logique d'état dans le `<script type="text/x-dc">` en bas de chaque fichier.

### À coller dans CLAUDE.md
```
## Design
Le design de l'app est défini dans design/DESIGN.md (source de vérité) ; les maquettes sont dans design/mockups/.
Lis DESIGN.md avant tout travail d'interface. Ne jamais inventer couleur, taille, rayon ou forme : utiliser les tokens.
Textes dans les fichiers de langue (fr, co). Hauteurs en min-height. Contrôles natifs uniquement.
Travailler par petites étapes dans l'ordre de la section 13 ; tester sur téléphone entre chaque.
```

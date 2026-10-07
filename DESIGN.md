# DESIGN.md — Spesa Sporta

Version 0.5 — 2026-10-07. Source de vérité du design. Mobile uniquement, thème unique, français + corse.
Les valeurs en px sont des px CSS (référence : écran 390 × 844). Si l'app n'est pas web, transposer en gardant les rapports.
Légende : **[DÉCIDÉ]** validé par Romain · **[À VALIDER]** proposé, non tranché · **[BROUILLON]** à faire relire.

## 0. Règles pour Claude Code

1. Ne jamais inventer de couleur, taille ou rayon : tout vient des tokens (section 2). Valeur absente → demander.
2. Pas d'ombres, pas de dégradés, pas d'émojis, pas de bibliothèque d'icônes décorative. Icônes : SVG simples à trait, formes de la section 6.
3. Aucun texte dans un composant : tout passe par les fichiers de langue (section 9).
4. Travailler par petites étapes, dans cet ordre : (1) tokens, (2) police, (3) composant Carte, (4) écran Liste, (5) écran Ajout. Une étape = un résultat à tester sur téléphone avant la suivante.
5. Ne pas lancer de captures ni de vérifications visuelles sans demande (coût en tokens).
6. Les hauteurs sont des **minimums** (`min-height`), jamais fixes : le texte doit pouvoir grossir à 200 %.

## 1. Principes

1. **Noir = toile, cartes = coupons.** Le fond est noir pur ; les cartes blanches touchent les deux bords de l'écran et ressemblent à des coupons découpés. **[DÉCIDÉ]**
2. **Tout est dans une carte.** Aucun élément flottant sur le noir : titre, recherche, filtres, saisies, boutons, aperçu. **[DÉCIDÉ]**
3. **En-tête et pied de page = demi-cartes**, coupées par le bord de l'écran : arrondi uniquement du côté qui rejoint les cartes principales. **[DÉCIDÉ]**
4. **La couleur désigne ce qu'on touche ou ce qui compte** (section 2). **[DÉCIDÉ]**
5. **Formes simples à la place d'illustrations** : une forme géométrique par rayon. **[DÉCIDÉ]**
6. **Pensé pour le magasin** : une main, debout, lumière forte. Le contraste et la taille des cibles passent avant le style.

## 2. Couleurs

Thème unique, pas de mode clair/sombre. **[DÉCIDÉ]**

Palette fermée : **9 teintes** pour l'interface. Seules exceptions : les 6 teintes de vignette de rayon (section 6). Les tokens de rôle ci-dessous pointent chacun vers l'une d'elles.

| Teinte | Valeur | Tokens de rôle (usage) |
|---|---|---|
| noir | #000000 | `canvas` (fond de l'app, pixels éteints sur OLED) · `ink` (texte principal et formes sur carte) |
| papier | #EDEDED | `card` (carte standard, valeur à tester de nuit, voir 11) · `ink-on-dark` (texte sur noir ou sur `ink`) |
| gris foncé | #4A4A4A | `ink-soft` (texte secondaire, libellés, contours de filtres) · `ink-placeholder` (texte indicatif des champs) |
| gris clair | #BDBDBD | `ink-done` (nom et méta d'un article coché) · `tile-neutral` (vignette neutre de la carte vide) |
| fond coché | #1A1A1A | `card-done` (carte d'un article coché) **[À VALIDER]** |
| bleu | #8FD9E8 | `accent-blue` (carte de recherche) |
| jaune | #FFD84A | `accent-yellow` (cartes de saisie : Article, Quantité) |
| vert | #A8D26B | `accent-green` (bouton d'action principal) |
| orange | #FF8A3D | `accent-orange` (sticker « Aperçu ») |

Supprimés par rapport à 0.3 : #0A0A0A, #F5F5F5, #3F3F3F, #9A9A9A, #C8C8C8, corail #F2674A. Le rose #F7A8D8 ne reste que comme vignette Maison.

Règles :
- Texte et icônes sur toute couleur d'accent : `ink` uniquement, jamais de blanc.
- Une information n'est jamais portée par la couleur seule (forme, icône ou texte en plus).
- Les vignettes de rayon réutilisent le jaune, le vert, l'orange et le gris clair, et ajoutent 6 teintes propres (rouge, gris, bleu ciel, rose, bleu acier, rouge rosé : section 6, tokens `--tile-*`). L'identité d'un rayon est portée par la **forme**, pas par la couleur. Voir risque en 11.
- Rapports de contraste calculés par script (2026-10-07) : noir sur papier 17,9 · gris foncé sur papier 7,6, sur jaune 6,4, sur bleu 5,6 · noir sur bleu 13,3, jaune 15,2, vert 12,1, orange 9,0 · papier sur noir 17,9 · gris clair sur fond coché 9,3. Cible : ≥ 4,5:1 (texte), ≥ 3:1 (grands titres, contours).
- **Sous 3:1 (limites de formes, pas du texte)** : carte cochée contre le noir 1,2 · vignette neutre contre la carte vide 1,6 · bleu/jaune/vert/orange contre le papier 1,2 à 2,0. Ces limites ne portent aucune information seule (texte, forme et coche sont à côté). À valider avec Romain. Formes noires sur les vignettes : de 5,4 à 15,2, toutes lisibles. Vignettes contre le papier : de 1,5 à 3,3 (rouge 3,3 ; bleu ciel, rose, gris sous 2).

## 3. Typographie

Police unique : **Archivo** (variable, v5.3.0, licence OFL-1.1, fichier `polices/archivo-latin-wght-normal.woff2`, pile `'Archivo', system-ui, sans-serif`), **hébergée dans l'app** (pas de Google Fonts : usage en magasin, réseau faible). **[DÉCIDÉ]**
Avant de l'intégrer : vérifier que les accents du corse (à è ì ò ù) et « œ » s'affichent ; vérifier la licence du fichier utilisé.
Graisse de base 600 pour presque tout ; hiérarchie par la taille.

| Rôle | Taille / interligne | Graisse | Couleur |
|---|---|---|---|
| Titre d'écran | 32 / 34 | 600 | `ink` |
| Résumé (sous le titre) | 17 / 22 | 500 | `ink-soft` |
| Texte de recherche | 20 | 600 | `ink` |
| Nom d'article | 20 / 24 | 600 | `ink` |
| Champ de saisie | 24 / 28 | 600 | `ink` |
| Valeur de quantité | 28 / 32 | 600 | `ink` |
| Bouton principal | 18 | 600 | `ink` |
| Pastille de filtre / unité | 15 | 600 | `ink` ou `ink-on-dark` |
| Libellé de carte, méta, légende | 14 / 18 | 600 (libellé) / 400 (méta) | `ink-soft` |

14 px est le minimum absolu.

## 4. Mise en page

- Canevas : noir. Cartes pleine largeur (bord à bord), séparées de **4 px**. **[DÉCIDÉ]**
- Rayon de carte : **32**. Vignette : 24. Boutons et pastilles : 999. Case à cocher : 16.
- Marges intérieures d'une carte : **24 à gauche, 28 à droite** (le rayon mange 4 px à droite). Verticalement : 8 à 14 selon la carte.
- Grille de 4 px.
- Pas d'ombres.
- En-tête : demi-carte collée en haut, rayon `0 0 32 32`, `min-height` 96, contenu **centré verticalement**.
- Pied de page : demi-carte collée en bas, rayon `32 32 0 0`, `padding: 20px 24px`, bouton de 56 → hauteur 96 : symétrique de l'en-tête. **[DÉCIDÉ]**
- Zones système : ajouter `env(safe-area-inset-top)` à l'en-tête et `env(safe-area-inset-bottom)` au pied de page, en gardant les 20 px visibles. À tester sur un vrai téléphone.
- Zone de liste : défile, **barre de défilement masquée** (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`). **[DÉCIDÉ]** Garder une carte coupée en bas pour signaler qu'on peut défiler.

## 5. Composants

### 5.1 Carte article (composant maître)
`min-height` 96, `card`, `padding: 8px 28px 8px 24px`, gap 12. De gauche à droite :
vignette 80 × 80 (rayon 24, couleur de rayon, forme noire de 44 au centre) · bloc texte (nom 20/24, puis « quantité · rayon » en méta 14/18) · case à cocher à droite.

Case à cocher : bouton 48 × 48, rayon 16, contour 2,5 `ink`, `aria-pressed`. Cochée : fond `card`, coche `ink` de 26.
Article coché : carte `card-done`, vignette à 45 % d'opacité, nom en `ink-done` barré, méta en `ink-done`, case remplie.
Pas d'alternance gauche/droite de la vignette. **[DÉCIDÉ]**

### 5.2 En-tête de liste
Demi-carte `card` : titre à gauche (32/34), résumé dessous (« Il reste N article(s) » / « Tout est dans le panier »), pastille de langue à droite (44 × 44, fond `ink`, texte `ink-on-dark`, « FR » ou « CO »). Comportement de la pastille : **[À VALIDER]** (voir 11).

### 5.3 Carte de recherche
`accent-blue`, hauteur ≥ 64, rayon 32, loupe 22 à gauche, champ `type="search"` transparent 20/600, texte indicatif `ink-placeholder`.

### 5.4 Carte de filtres
`card`, hauteur ≥ 68, pastilles de 44 de haut : Tout / À prendre / Pris. Sélectionnée : fond `ink`, texte `ink-on-dark`. Non sélectionnée : fond transparent, contour 1,5 `ink-soft`. `aria-pressed`. Les pastilles passent à la ligne si le texte grossit.

### 5.5 Carte « liste vide »
Même forme qu'une carte article. Filtre À prendre : vignette verte avec coche, « Rien à prendre » / « Tout est dans le panier ». Filtre Pris : vignette `tile-neutral` (gris clair #BDBDBD) avec tiret, « Rien de pris » / « Aucun article dans le panier ».

### 5.6 Bouton principal (pied de page)
Dans une demi-carte `card` : bouton de 56, rayon 999, fond `accent-green`, texte `ink` 18/600, centré ; « + » à gauche sur la liste. **Le vert est un encadré dans la carte blanche, pas le fond de la carte.** **[DÉCIDÉ]**

### 5.7 Écran Ajout — cartes dans l'ordre
1. **En-tête** : flèche retour (bouton 44, rond, contour 1,5 `ink`) + titre.
2. **Article** : carte `accent-yellow`, libellé 14/600 `ink-soft`, champ transparent 24/28, texte indicatif `ink-placeholder`. **[DÉCIDÉ]**
3. **Quantité** : carte `accent-yellow`. Boutons − et + ronds de 48 (contour 1,5 `ink`), valeur au centre (28/32, `aria-live="polite"`), puis pastilles d'unité (pièce, kg, g, L) comme les filtres mais contour/fond `ink`.
4. **Rayon** : carte `card`. Grille de 3 colonnes (gap 6/8). Chaque rayon : vignette de 64 de haut (rayon 22) avec sa forme de 36, libellé 14 dessous. Sélectionné : contour 3 `ink` + pastille noire 22 en haut à droite avec coche blanche + libellé en gras.
5. **Aperçu** : carte `card` montrant la future carte article (section 5.1) avec le **sticker orange** : pastille `accent-orange`, texte `ink` 14/20 gras, inclinée de −4°, en haut à droite (top 10, right 24). Réserver la place du sticker pour qu'un nom long ne passe pas dessous.
6. **Pied de page** : demi-carte `card` + bouton vert « Ajouter à la liste ».
**Perforation Article / Quantité.** **[DÉCIDÉ]** Les deux cartes jaunes forment un seul coupon « à déchirer » : plus d'espace de 4 px entre elles, et l'arrondi de 32 ne reste qu'aux angles extérieurs (Article `32 32 0 0`, Quantité `0 0 32 32`). La jonction (fond `accent-yellow`) est une perforation :
- ligne `ink` de 1 d'épaisseur, en longs tirets : 18 de trait, 14 de blanc, avec 22 de marge de chaque côté, centrée sur la jonction ;
- deux encoches rondes noires (`canvas`) de 24 de diamètre, aux extrémités de la ligne, à demi coupées par les bords gauche et droit de l'écran ;
- purement décorative (`aria-hidden`), aucun comportement.
Les tirets sont dessinés par un motif répété (`repeating-linear-gradient`), pas par `border-style: dashed`, dont la longueur et l'espacement varient selon le navigateur ; un SVG est une alternative équivalente. Usage limité à Article/Quantité pour l'instant ; l'étendre à d'autres cartes est une décision à prendre.
Les cartes Article et Quantité (fond jaune) vs recherche (fond bleu) : voir règle de couleur en 11.

## 6. Rayons et formes

Onze rayons, alignés sur ceux de l'appli (`Logic.RAYONS`, ARCHITECTURE.md). Un rayon est un couple **(couleur, forme)** : la forme porte l'identité. Forme noire (`ink`) dans une vignette, viewBox 40. Les couleurs de vignette viennent de Romain (v0.5) ; leurs valeurs exactes sont des propositions **[À VALIDER]**.

| Rayon (id) | Vignette | Forme |
|---|---|---|
| Fruits (`fruits`) | rouge #E5484D | cercle (r 17) |
| Légumes (`legumes`) | vert #A8D26B | cercle (r 17) |
| Boulangerie (`boulangerie`) | jaune #FFD84A | triangle (20,3 37,35 3,35) |
| Boucherie-poissonnerie (`boucherie_poissonnerie`) | rouge rosé #E8788A | demi-disque incliné de 35° (M3 30 A17 17 0 0 1 37 30 Z, rotation 35° autour de 20,24) |
| Crèmerie (`cremerie`) | gris #B8B8B8 | carré arrondi (4,4 → 36 × 36, rx 6) |
| Épicerie salée et sucrée (`epicerie_salee`, `epicerie_sucree`) | orange #FF8A3D | demi-disque (M3 30 A17 17 0 0 1 37 30 Z) |
| Surgelés (`surgeles`) | gris bleu acier #8FA3B8 | flocon : trois traits de 34 qui se croisent au centre (0°, 60°, 120°), trait 3,5, bouts ronds |
| Boissons (`boissons`) | bleu ciel #8FC7FF | losange (20,2 38,20 20,38 2,20) |
| Hygiène et entretien (`hygiene_entretien`, appelé « Maison » dans le design) | rose #F7A8D8 | maison (20,3 38,19 32,19 32,37 8,37 8,19 2,19) |
| Autre (`autre`) | gris clair #BDBDBD | tiret (8,17 → 24 × 6, rx 3) |

Fruits et Légumes ont la même forme (cercle) : seule la couleur les sépare (rouge / vert). Les deux demi-disques (Épicerie, Boucherie) ne se distinguent que par l'inclinaison. À surveiller.

Chaque forme reste distincte en niveaux de gris. Une catégorie = une forme + une couleur, partout. 

## 7. États et interactions

- Cibles tactiles ≥ 44, visées 48, espacées d'≥ 8.
- Focus clavier / lecteur d'écran : sur une carte ou un bouton, contour 3 `ink` décalé de 2 plus un trait extérieur 2 `ink-on-dark` ; sur un champ, contour 3 `ink-on-dark` décalé de 2.
- Libellé de lecteur d'écran d'un article : « Lait demi-écrémé, 2 L, crèmerie, non coché ».
- États à concevoir **[À FAIRE]** : pressé, désactivé, erreur de saisie, premier lancement (liste vide).
- Mouvement : 150–250 ms, une seule courbe ; cocher = légère contraction + changement d'état ; remplacé par un simple fondu si `prefers-reduced-motion`.
- Tout geste (balayer) a un bouton équivalent.

## 8. Comportements (maquette)

- Filtres : Tout / À prendre / Pris ; le résumé compte les articles non cochés.
- Cocher bascule l'état de l'article. Où va l'article coché (reste en place ou descend en bas) : **[À VALIDER]**, recommandé : en bas.
- Ajout : quantité minimale 1 ; unité « pièce » n'affiche pas d'unité dans l'aperçu ; l'aperçu se met à jour en direct.
- Le bouton « Ajouter à la liste » ne valide pas encore le nom vide : **à traiter dans le code** (désactiver le bouton ou afficher une erreur).
- Clavier ouvert sur l'écran Ajout : le pied de page doit remonter au-dessus du clavier.

## 9. Langues

Français (par défaut) et corse. Libellés dans des fichiers de langue (`fr`, `co`), jamais dans les composants. Prévoir +30 % de longueur : les textes passent sur 2 lignes, sans troncature.

| Clé | FR | CO **[BROUILLON]** |
|---|---|---|
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
| rayons | Fruits, Légumes, Boulangerie, Boucherie-poissonnerie, Crèmerie, Épicerie salée, Épicerie sucrée, Surgelés, Boissons, Hygiène et entretien, Autre | Frutti, Legumi, Pane, … **[À TRADUIRE]** (seuls Frutti, Pane, Bevande et Latticini étaient proposés) |
| sticker | Aperçu | Anteprima |
| bouton ajout | Ajouter à la liste | Aghjunghje à a lista |

Tout le corse ci-dessus est un brouillon : le faire relire par un locuteur avant toute mise en production.

## 10. Accessibilité (WCAG 2.2 AA, base non négociable)

- Contraste ≥ 4,5:1 (texte) et ≥ 3:1 (contours, grands titres), validé à l'outil.
- Cibles ≥ 44, texte jusqu'à 200 % sans coupure ni chevauchement (hauteurs en `min-height`).
- Rien porté par la couleur seule ; chaque contrôle natif (`button`, `a`, `input` + `label`), jamais de `div` cliquable.
- Boutons icône seule : `aria-label`. Groupes de pastilles : `role="group"` + libellé.
- Animations réductibles ; aucun geste obligatoire.
- La barre de défilement masquée retire un repère : conserver la carte coupée en bas.

## 11. Décisions ouvertes

1. **Règle de couleur.** État actuel : recherche et Quantité et Article = *fond* de carte coloré ; bouton et sticker = *encadré* coloré dans une carte blanche. Recommandé : un seul principe (encadré partout, cartes toujours blanches). Non tranché.
2. **Articles cochés** : rester en place ou descendre en bas ? Recommandé : en bas. Avec `card-done` plus clair que #1A1A1A (ex. #2A2A2A) pour rester lisible sur le noir.
3. **Recherche et filtres** : fusionner en une carte ? Interface fixe ≈ 324 px sur 844 (38 %) → il resterait ~3 articles sur un petit téléphone (hypothèse).
4. **Langue** : où se change-t-elle ? Aujourd'hui la pastille FR/CO n'est qu'un dessin.
5. **Collision de couleurs** : le vert (action) = Légumes ; l'orange (sticker) = Épicerie ; le jaune (saisie) = Boulangerie ; le bleu (recherche) est proche du bleu ciel de Boissons (#8FD9E8 / #8FC7FF). Les vignettes sont petites et portent une forme, mais le sens de la couleur est partagé. À surveiller à l'usage.
6. **Gris des cartes** (#EDEDED) : éblouissement la nuit et économie OLED limitée (cartes claires sur la majorité de l'écran). Tester sur téléphone ; garder le token réglable.
7. **Ajout rapide** : saisie + Entrée, rayon deviné d'après l'historique, dernière unité mémorisée (4 gestes minimum aujourd'hui).
8. **Suppression et modification** d'un article, réglages : écrans à maquetter.
9. **Corse** : relecture par un locuteur ; « Reparu » (rayon) est le choix le plus incertain.

## 12. Référence

Maquettes (écrans Liste FR/CO, Ajout FR/CO) : canvas de design du projet. Cette maquette est une illustration : en cas d'écart, ce fichier prévaut.

### À coller dans CLAUDE.md
```
## Design
Le design de l'app est défini dans DESIGN.md (source de vérité). Lis-le avant tout travail d'interface.
Ne jamais inventer couleur, taille ou rayon. Utiliser les tokens. Textes dans les fichiers de langue (fr, co).
Travailler par petites étapes : tokens, police, carte, écran Liste, écran Ajout.
```

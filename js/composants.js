// composants.js — éléments de base du design (DESIGN.md, section 5).
// Des fonctions qui construisent du DOM. Aucune règle métier, aucun texte en dur :
// les textes (déjà traduits avec t()) arrivent en paramètres. Chargé avant ui.js.

// Petit outil pour créer un élément HTML.
// el("p", { class: "vide", texte: "Bonjour" }, [enfants])
function el(balise, props = {}, enfants = []) {
  const e = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(props)) {
    if (valeur === false || valeur === null) continue;
    if (cle === "texte") e.textContent = valeur;
    else if (cle === "class") e.className = valeur;
    else e.setAttribute(cle, valeur === true ? "" : valeur);
  }
  enfants.filter(Boolean).forEach((enfant) => e.append(enfant));   // `false` = pas d'enfant
  return e;
}

// Crée un dessin SVG à partir d'une liste [balise, attributs]
function svg(viewBox, formes, classe) {
  const NS = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", viewBox);
  s.setAttribute("aria-hidden", "true");
  if (classe) s.setAttribute("class", classe);
  formes.forEach(([balise, attributs]) => {
    const f = document.createElementNS(NS, balise);
    for (const [cle, valeur] of Object.entries(attributs)) f.setAttribute(cle, valeur);
    s.append(f);
  });
  return s;
}

// ---------- Icônes (DESIGN.md, 5.20) : viewBox 24, trait simple, couleur = celle du texte ----------
const ICONES = {
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  moins: [["path", { d: "M5 12h14" }]],
  coche: [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]],
  retour: [["path", { d: "M19 12H5M11 6l-6 6 6 6" }]],
  corbeille: [["path", { d: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" }]],
  crayon: [["path", { d: "M4 20h4L19 9l-4-4L4 16z" }]],
  loupe: [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "M20 20l-4-4" }]],
  chevron: [["path", { d: "M6 9l6 6 6-6" }]],
  importer: [["path", { d: "M12 4v10M8 10l4 4 4-4M5 20h14" }]]
};

// `trait` : 2 à 3 selon l'icône (coches 3, plus et moins 2,5, flèche 2,2)
function icone(nom, { taille = 22, trait = 2.5 } = {}) {
  const s = svg("0 0 24 24", ICONES[nom], "icone");
  s.setAttribute("width", taille);
  s.setAttribute("height", taille);
  s.setAttribute("stroke-width", trait);
  return s;
}

// ---------- Rayons (DESIGN.md, section 6) : une table unique, la forme porte l'identité ----------
// Formes dessinées dans un carré de 40. Forme pleine en couleur `ink`, sauf le flocon (traits).
const FORMES = {
  cercle: [["circle", { cx: 20, cy: 20, r: 17 }]],
  carre: [["rect", { x: 4, y: 4, width: 32, height: 32, rx: 6 }]],
  triangle: [["polygon", { points: "20,3 37,35 3,35" }]],
  demidisque: [["path", { d: "M3 30A17 17 0 0 1 37 30Z" }]],
  demidisqueIncline: [["path", { d: "M3 30A17 17 0 0 1 37 30Z", transform: "rotate(35 20 22)" }]],
  quart: [["path", { d: "M5 35V5A30 30 0 0 1 35 35Z" }]],
  feuille: [["path", { d: "M4 20A16 16 0 0 1 20 4H36V20A16 16 0 0 1 20 36H4Z" }]],
  losange: [["polygon", { points: "20,2 38,20 20,38 2,20" }]],
  maison: [["path", { d: "M20 3L37 19H32V36H8V19H3Z" }]],
  tiret: [["rect", { x: 5, y: 17, width: 30, height: 6, rx: 3 }]],
  // Flocon : trois traits qui se croisent au centre (90°, 30°, 150°)
  flocon: [
    ["line", { x1: 20, y1: 4, x2: 20, y2: 36, class: "trait" }],
    ["line", { x1: 6.1, y1: 12, x2: 33.9, y2: 28, class: "trait" }],
    ["line", { x1: 6.1, y1: 28, x2: 33.9, y2: 12, class: "trait" }]
  ]
};

// Un rayon = une couleur de vignette (classe CSS `tuile-…`) + une forme
const VIGNETTES = {
  fruits: ["tuile-fruits", "cercle"],
  legumes: ["tuile-legumes", "feuille"],
  boulangerie: ["tuile-boulangerie", "triangle"],
  boucherie_poissonnerie: ["tuile-boucherie", "demidisqueIncline"],
  cremerie: ["tuile-cremerie", "carre"],
  epicerie_salee: ["tuile-epicerie", "demidisque"],
  epicerie_sucree: ["tuile-epicerie", "quart"],
  surgeles: ["tuile-surgeles", "flocon"],
  boissons: ["tuile-boissons", "losange"],
  hygiene_entretien: ["tuile-maison", "maison"],
  autre: ["tuile-autre", "tiret"]
};

// Vignette d'un rayon. `taille` : 80 (liste), 64 ou 32 (ligne de texte). Rayon inconnu = « autre ».
function rayonTile(rayon, taille = 80) {
  const [classeTuile, forme] = VIGNETTES[rayon] || VIGNETTES.autre;
  return el("span", { class: "vignette v" + taille + " " + classeTuile }, [svg("0 0 40 40", FORMES[forme])]);
}

// ---------- Structure : en-tête, perforation ----------
// En-tête (5.2). Écran racine : titre + résumé. Écran secondaire : `retour` = { action, libelle } ajoute la flèche.
// `resume` = attributs du paragraphe de résumé (ex. { id: "resume-courses", role: "status" }), son texte vient après.
function entete({ titre, resume = null, retour = null }) {
  const titreEl = el("h1", { texte: titre });
  const contenu = [];
  if (retour) {
    contenu.push(el("button", { type: "button", class: "bouton-retour", "data-action": retour.action, "aria-label": retour.libelle }, [
      icone("retour", { trait: 2.2 })
    ]));
    contenu.push(titreEl);
  } else {
    contenu.push(el("div", {}, [titreEl, resume && el("p", { class: "resume", ...resume })]));
  }
  return el("header", { class: "entete-carte" }, contenu);
}

// Perforation « tiret détachable » (5.4), décorative. `marge` :
//   "jonction" (défaut) : entre deux cartes jaunes jointes ;
//   "ligne" : entre deux lignes d'une carte claire ; "detail" : idem, plus serrée ; "pied" : dans le pied de page.
function perforation(marge = "jonction") {
  return el("div", { class: "perforation" + (marge === "jonction" ? "" : " perf-" + marge), "aria-hidden": "true" }, [
    el("div", { class: "perforation-trait" }),
    el("span", { class: "encoche gauche" }),
    el("span", { class: "encoche droite" })
  ]);
}

// ---------- Pastilles ----------
// Pastille « ! » (5.20) : disque noir 24. `inverse` pour une carte sombre.
function pastilleAlerte({ inverse = false } = {}) {
  return svg("0 0 24 24", [
    ["circle", { cx: 12, cy: 12, r: 12, class: "disque" }],
    ["path", { d: "M12 6.5v7", class: "marque" }],
    ["circle", { cx: 12, cy: 17.5, r: 1.5, class: "point" }]
  ], "pastille-alerte" + (inverse ? " inverse" : ""));
}

// Pastille numérotée (5.20) : disque noir 32, chiffre dedans (étapes, étapes d'import)
function pastilleNumero(n) {
  return el("span", { class: "pastille-numero", "aria-hidden": "true", texte: String(n) });
}

// Pastille de filtre ou d'unité (5.7), à placer dans un conteneur role="group" avec un libellé.
function pastille(texte, { action, pressee = false, donnees = {} } = {}) {
  const props = { type: "button", class: "filtre", "aria-pressed": pressee ? "true" : "false", texte };
  if (action) props["data-action"] = action;
  for (const [cle, valeur] of Object.entries(donnees)) props["data-" + cle] = valeur;
  return el("button", props);
}

// ---------- Boutons (5.6) ----------
// `role` : "principal" (vert), "secondaire" (contouré), "sombre" (pastille noire), "retrait" (tirets, pleine largeur).
// `desactive` : tirets + aria-disabled (jamais seulement grisé) ; le clic est ignoré par app.js.
function bouton(role, { texte, action = null, icone: nomIcone = null, libelle = null, desactive = false, presse = null, donnees = {} }) {
  const classes = { principal: "bouton-ajout", secondaire: "bouton-contour", sombre: "bouton-importer", retrait: "bouton-contour tirets retrait-doux" };
  const props = { type: "button", class: classes[role], "aria-label": libelle };
  if (action) props["data-action"] = action;
  if (desactive) props["aria-disabled"] = "true";
  if (presse !== null) props["aria-pressed"] = presse ? "true" : "false";   // bouton à bascule (ex. « Dans la liste »)
  for (const [cle, valeur] of Object.entries(donnees)) props["data-" + cle] = valeur;
  const enfants = [];
  if (nomIcone) enfants.push(icone(nomIcone, { taille: role === "principal" ? 22 : 20, trait: nomIcone === "coche" ? 3 : 2.5 }));
  enfants.push(el("span", { texte }));
  return el("button", props, enfants);
}

// Bouton rond 48 (− et +), icône seule
function boutonRond(nomIcone, { action, libelle }) {
  return el("button", { type: "button", class: "bouton-rond", "data-action": action, "aria-label": libelle }, [icone(nomIcone)]);
}

// Bouton carré 48 (retirer, ajout rapide). `plein` : fond noir, icône claire.
function boutonCarre(nomIcone, { action, libelle, plein = false, donnees = {} }) {
  const props = { type: "button", class: "bouton-carre" + (plein ? " plein" : ""), "data-action": action, "aria-label": libelle };
  for (const [cle, valeur] of Object.entries(donnees)) props["data-" + cle] = valeur;
  return el("button", props, [icone(nomIcone, { trait: nomIcone === "corbeille" ? 1.5 : 2.5 })]);
}

// ---------- Champs (5.8) ----------
// Champ dans une carte claire : libellé visible, encadré (fond de la carte, contour noir), message d'erreur réservé dessous.
// `multiligne` : zone de texte. Renvoie { racine, saisie }.
function champ({ id, libelle, valeur = "", type = "text", placeholder = null, multiligne = false, lignes = 3 }) {
  const saisie = multiligne
    ? el("textarea", { id, class: "champ-encadre", rows: lignes, placeholder, texte: valeur })
    : el("input", { id, class: "champ-encadre", type, placeholder, value: valeur, autocomplete: "off" });
  const racine = el("div", { class: "champ" }, [
    el("label", { for: id, class: "libelle-carte", texte: libelle }),
    saisie,
    el("p", { id: id + "-erreur", class: "erreur-champ", role: "alert", hidden: true })
  ]);
  return { racine, saisie };
}

// Signale (message) ou efface (message = null) l'erreur d'un champ créé par champ() : contour épais,
// pastille « ! » + texte, aria-invalid et aria-describedby. Jamais de rouge.
function erreurChamp(saisie, message) {
  const p = document.getElementById(saisie.id + "-erreur");
  if (!message) {
    p.hidden = true;
    p.replaceChildren();
    saisie.removeAttribute("aria-invalid");
    saisie.removeAttribute("aria-describedby");
    return;
  }
  p.replaceChildren(pastilleAlerte(), el("span", { texte: message }));
  p.hidden = false;
  saisie.setAttribute("aria-invalid", "true");
  saisie.setAttribute("aria-describedby", p.id);
}

// Sélecteur (unité) : un vrai <select> avec un chevron. `options` = [{ valeur, texte }].
function selecteur({ id, libelle, options, valeur }) {
  const select = el("select", { id, class: "selecteur-saisie" }, options.map((o) =>
    el("option", { value: o.valeur, selected: o.valeur === valeur, texte: o.texte })
  ));
  return el("div", { class: "selecteur" }, [
    el("label", { for: id, class: "libelle-carte", texte: libelle }),
    el("div", { class: "selecteur-boite" }, [select, icone("chevron", { taille: 20, trait: 2 })])
  ]);
}

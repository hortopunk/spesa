// ui.js — rendu de l'interface uniquement. Aucune règle métier ici.

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

// Formes des vignettes de rayon (DESIGN.md, section 6), dessinées dans un carré de 40.
// Chaque entrée : [balise SVG, attributs]. Forme pleine en couleur `ink`, sauf le flocon (traits).
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

const UI = {
  // Affiche l'écran demandé et surligne l'onglet correspondant
  afficherEcran(nom) {
    document.querySelectorAll(".ecran").forEach((ecran) => {
      ecran.hidden = ecran.dataset.ecran !== nom;
    });
    document.querySelectorAll(".onglet").forEach((onglet) => {
      const actif = onglet.dataset.cible === nom;
      onglet.classList.toggle("actif", actif);
      // Indique à un lecteur d'écran quel onglet est ouvert
      if (actif) onglet.setAttribute("aria-current", "page");
      else onglet.removeAttribute("aria-current");
    });
    this.ecranCourant = nom;
    this.majBoutonSauvegarde();
    this.majHabillage();
  },

  // En mode courses (liste validée), le bouton flottant masquerait des quantités : on le cache
  // (le bandeau de rappel et les Réglages permettent de sauvegarder)
  ecranCourant: "recettes",
  modeCourses: false,

  definirModeCourses(actif) {
    this.modeCourses = actif;
    this.majBoutonSauvegarde();
    this.majHabillage();
  },

  // Le nouvel habillage (fond noir, cartes) s'applique à l'écran Courses quand la liste est validée.
  // Les autres écrans gardent l'ancien style en attendant leur tour.
  majHabillage() {
    const vueDesign = !document.getElementById("vue-panier").hidden || !document.getElementById("vue-ajout").hidden;
    const actif = this.ecranCourant === "liste" && this.modeCourses && vueDesign;
    document.body.classList.toggle("design", actif);
  },

  majBoutonSauvegarde() {
    document.getElementById("bouton-sauvegarde").hidden = this.ecranCourant === "liste" && this.modeCourses;
  },

  // Titre de l'écran Liste : « Liste » pendant la préparation, « Courses » une fois validée
  titreListe(texte) {
    document.getElementById("titre-liste").textContent = texte;
  },

  // Dans l'écran Recettes : "liste", "detail", "form" ou "import"
  afficherVueRecettes(nom) {
    ["liste", "detail", "form", "import"].forEach((vue) => {
      document.getElementById("vue-" + vue).hidden = vue !== nom;
    });
    window.scrollTo(0, 0);
  },

  // --- Liste des recettes ---
  // `dansLaListe` : identifiants des recettes déjà dans la liste de courses (le bouton affiche alors ✓)
  rendreListe(recettes, rechercheActive, dansLaListe) {
    const ul = document.getElementById("liste-recettes");
    ul.replaceChildren();
    recettes.forEach((r) => {
      const dejaLa = dansLaListe.includes(r.id);
      ul.append(el("li", {}, [
        el("button", { class: "carte", "data-action": "ouvrir", "data-id": r.id }, [
          el("span", { class: "carte-titre", texte: r.titre })
        ]),
        // Ajout rapide à la liste de courses, avec les parts de la recette
        el("button", {
          class: "bouton ajout-rapide" + (dejaLa ? " ajoute" : ""),
          "data-action": "ajout-rapide", "data-id": r.id,
          "aria-label": t(dejaLa ? "deja_dans_la_liste" : "ajouter_a_la_liste") + " : " + r.titre
        }, [this.iconePanier(dejaLa)])
      ]));
    });
    const vide = document.getElementById("vide-recettes");
    vide.hidden = recettes.length > 0;
    vide.textContent = rechercheActive ? t("aucun_resultat") : t("vide_recettes");
  },

  // Icône panier « + » (ou panier « ✓ » une fois ajouté), dessinée en SVG sans bibliothèque
  iconePanier(coche) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const chemin = document.createElementNS(ns, "path");
    chemin.setAttribute("d", "M3 4h2l2.5 11h10l2-8H6.5M9 20h.01M17 20h.01" + (coche ? "M9.5 11l2.2 2.2 3.8-4" : "M12.5 8.5v5M10 11h5"));
    svg.append(chemin);
    return svg;
  },

  // --- Détail d'une recette ---
  // `lignes` = ingrédients déjà recalculés pour `partsVoulues`
  rendreDetail(recette, partsVoulues, lignes) {
    const vue = document.getElementById("vue-detail");
    vue.replaceChildren(
      el("button", { class: "bouton lien", "data-action": "retour", texte: "‹ " + t("retour") }),
      el("h1", { texte: recette.titre }),
      el("div", { class: "parts" }, [
        el("span", { texte: t("pour") }),
        el("button", { class: "bouton rond", "data-action": "parts-moins", "aria-label": t("diminuer_parts"), texte: "−" }),
        el("strong", { class: "parts-nombre", texte: partsVoulues }),
        el("button", { class: "bouton rond", "data-action": "parts-plus", "aria-label": t("augmenter_parts"), texte: "+" }),
        el("span", { texte: partsVoulues > 1 ? t("parts") : t("part") })
      ]),
      el("h2", { texte: t("section_ingredients") }),
      el("ul", { class: "ingredients" }, lignes.map((l) => {
        return el("li", {}, [
          el("span", { texte: Logic.majuscule(l.nom) }),
          el("span", { class: "quantite", texte: l.quantite === null ? "" : UI.texteQuantite(l) })
        ]);
      }))
    );
    if (recette.etapes.length > 0) {
      vue.append(
        el("h2", { texte: t("section_etapes") }),
        el("ol", { class: "etapes" }, recette.etapes.map((e) => el("li", { texte: e })))
      );
    }
    if (recette.notes !== "") {
      vue.append(el("h2", { texte: t("section_notes") }), el("p", { class: "notes", texte: recette.notes }));
    }
    vue.append(el("div", { class: "actions" }, [
      el("button", { class: "bouton", "data-action": "modifier", texte: t("modifier") }),
      el("button", { class: "bouton danger", "data-action": "supprimer", texte: t("supprimer") })
    ]));
  },

  // --- Import d'une recette (texte JSON collé ou fichier) ---
  rendreImport() {
    document.getElementById("vue-import").replaceChildren(
      el("h1", { texte: t("titre_import") }),
      el("p", { class: "aide", texte: t("aide_import") }),
      el("button", { class: "bouton", "data-action": "import-copier", texte: t("copier_prompt") }),
      el("details", { id: "import-prompt" }, [
        el("summary", { texte: t("voir_prompt") }),
        el("textarea", { readonly: true, rows: "8", texte: t("prompt_import") })
      ]),
      el("label", { "for": "import-texte", texte: t("champ_import") }),
      el("textarea", { id: "import-texte", rows: "8" }),
      el("p", { id: "import-message", role: "alert", hidden: true }),
      el("div", { class: "actions" }, [
        el("button", { class: "bouton principal", "data-action": "import-apercu", texte: t("apercu_import") }),
        el("button", { class: "bouton", "data-action": "import-fichier", texte: t("choisir_fichier") }),
        el("button", { class: "bouton", "data-action": "annuler-import", texte: t("annuler") })
      ])
    );
  },

  // Message de l'écran d'import (réussite ou erreur)
  messageImport(texte, erreur) {
    const p = document.getElementById("import-message");
    p.textContent = texte;
    p.className = erreur ? "erreur" : "succes";
    // Une erreur est annoncée tout de suite, un succès poliment
    p.setAttribute("role", erreur ? "alert" : "status");
    p.hidden = false;
  },

  // Déplie le prompt pour le copier à la main
  deplierPrompt() {
    document.getElementById("import-prompt").open = true;
  },

  // --- Formulaire de création / modification ---
  // `ingredients` = ingrédients de la recette avec leur rayon (voir Logic.ingredientsAvecRayon)
  // `options` (import) : { titre: titre de la vue, avertissements: [textes à vérifier] }
  rendreFormulaire(recette, ingredients, options = {}) {
    const vue = document.getElementById("vue-form");
    const avertissements = options.avertissements || [];
    vue.replaceChildren(
      el("h1", { texte: options.titre || (recette ? t("titre_modifier_recette") : t("titre_nouvelle_recette")) }),
      ...(avertissements.length === 0 ? [] : [
        el("div", { class: "avertissements" }, [
          el("p", { texte: t("avertissements_import") }),
          el("ul", {}, avertissements.map((a) => el("li", { texte: a })))
        ])
      ]),
      el("label", { "for": "f-titre", texte: t("champ_titre") }),
      el("input", { id: "f-titre", type: "text", value: recette ? recette.titre : "" }),
      el("label", { "for": "f-parts", texte: t("champ_parts") }),
      el("input", {
        id: "f-parts", type: "text", inputmode: "numeric", placeholder: t("parts_obligatoire"),
        value: recette ? recette.parts : 4   // import sans parts : null, le champ reste vide
      }),
      el("p", { class: "aide aide-champ", texte: t("aide_parts") }),
      el("h2", { texte: t("section_ingredients") }),
      el("div", { id: "f-ingredients" }),
      el("button", { class: "bouton", "data-action": "ajouter-ingredient", texte: "+ " + t("ajouter_ingredient") }),
      el("label", { "for": "f-etapes", texte: t("champ_etapes") }),
      el("textarea", { id: "f-etapes", rows: "5", texte: recette ? recette.etapes.join("\n") : "" }),
      el("label", { "for": "f-notes", texte: t("champ_notes") }),
      el("textarea", { id: "f-notes", rows: "3", texte: recette ? recette.notes : "" }),
      el("p", { id: "f-erreur", class: "erreur", role: "alert", hidden: true }),
      el("div", { class: "actions" }, [
        el("button", { class: "bouton principal", "data-action": "enregistrer", texte: t("enregistrer") }),
        el("button", { class: "bouton", "data-action": "annuler", texte: t("annuler") })
      ])
    );
    // Nouvelle recette : une seule ligne vide
    const conteneur = document.getElementById("f-ingredients");
    (recette ? ingredients : [undefined]).forEach((ing) => this.ajouterLigneIngredient(conteneur, ing));
  },

  // Ajoute une ligne d'ingrédient (nom, quantité, unité, rayon) dans `conteneur`.
  // Utilisée par le formulaire de recette et par les articles libres de la liste.
  ajouterLigneIngredient(conteneur, ing = { nom: "", quantite: null, unite: "piece", rayon: "" }, avecRetrait = true) {
    const options = Logic.UNITES.map((u) =>
      el("option", { value: u, selected: u === (ing.unite || "piece"), texte: t("unite_" + u) })
    );
    const optionsRayon = [el("option", { value: "", texte: t("choisir_rayon") })].concat(
      Logic.RAYONS.map((r) => el("option", { value: r, selected: r === ing.rayon, texte: t("rayon_" + r) }))
    );
    const suggestions = el("ul", { class: "suggestions", hidden: true });
    // Garde le focus dans le champ quand on touche une suggestion
    suggestions.addEventListener("mousedown", (e) => e.preventDefault());
    const rayon = el("select", { class: "i-rayon", "aria-label": t("champ_rayon") }, optionsRayon);
    if (ing.rayon) rayon.dataset.auto = "1";   // rayon repris du dictionnaire
    conteneur.append(
      el("div", { class: "ligne-ingredient" + (avecRetrait ? "" : " sans-retrait") }, [
        el("input", { class: "i-nom", type: "text", autocomplete: "off", placeholder: t("champ_nom_ingredient"), value: ing.nom }),
        suggestions,
        el("input", {
          class: "i-quantite", type: "text", inputmode: "decimal",
          placeholder: t("champ_quantite"), value: ing.quantite === null ? "" : String(ing.quantite).replace(".", ",")
        }),
        el("select", { class: "i-unite" }, options),
        avecRetrait && el("button", { class: "bouton rond", "data-action": "retirer-ingredient", "aria-label": t("retirer_ingredient"), texte: "✕" }),
        rayon
      ])
    );
  },

  // Affiche (ou cache si la liste est vide) les suggestions d'une ligne
  rendreSuggestions(ligne, libelles) {
    const ul = ligne.querySelector(".suggestions");
    ul.replaceChildren(...libelles.map((libelle) =>
      el("li", {}, [el("button", { type: "button", class: "suggestion", "data-action": "choisir-suggestion", texte: libelle })])
    ));
    ul.hidden = libelles.length === 0;
  },

  // Remplace le nom saisi par la suggestion choisie
  remplirNom(ligne, libelle) {
    ligne.querySelector(".i-nom").value = libelle;
  },

  // Rayon d'une ligne : prérempli si l'ingrédient est connu (`rayon`). Sinon, remis
  // à vide s'il avait été prérempli pour un autre nom. Un rayon choisi à la main
  // n'est jamais écrasé par un vide.
  proposerRayon(ligne, rayon) {
    const champ = ligne.querySelector(".i-rayon");
    if (rayon) {
      champ.value = rayon;
      champ.dataset.auto = "1";
    } else if (champ.dataset.auto === "1") {
      champ.value = "";
      delete champ.dataset.auto;
    }
  },

  retirerLigneIngredient(bouton) {
    bouton.closest(".ligne-ingredient").remove();
  },

  // Lit ce qui est saisi dans le formulaire (du texte brut, rien n'est vérifié ici)
  lireFormulaire() {
    return {
      titre: document.getElementById("f-titre").value,
      parts: document.getElementById("f-parts").value,
      ingredients: [...document.querySelectorAll("#f-ingredients .ligne-ingredient")].map((ligne) => this.lireLigne(ligne)),
      etapes: document.getElementById("f-etapes").value,
      notes: document.getElementById("f-notes").value
    };
  },

  // Message d'alerte en haut de l'écran (stockage plein, données abîmées...), fermable
  afficherAlerte(texte) {
    document.getElementById("alerte-texte").textContent = texte;
    document.getElementById("alerte").hidden = false;
  },

  fermerAlerte() {
    document.getElementById("alerte").hidden = true;
  },

  // Message temporaire avec un bouton « Annuler » (après une suppression)
  afficherAnnulation(texte) {
    document.getElementById("annulation-texte").textContent = texte;
    document.getElementById("annulation").hidden = false;
  },

  cacherAnnulation() {
    document.getElementById("annulation").hidden = true;
  },

  // Lit une ligne d'ingrédient (texte brut)
  lireLigne(ligne) {
    return {
      nom: ligne.querySelector(".i-nom").value,
      quantite: ligne.querySelector(".i-quantite").value,
      unite: ligne.querySelector(".i-unite").value,
      rayon: ligne.querySelector(".i-rayon").value
    };
  },

  // Message d'erreur dans la zone `id` (celle du formulaire de recette par défaut)
  afficherErreur(message, id = "f-erreur") {
    const p = document.getElementById(id);
    p.textContent = message;
    p.hidden = false;
  },

  // --- Liste : texte d'une ou plusieurs quantités, ex. "1,5 kg + 2 pièce(s)" ---
  texteQuantites(quantites) {
    return quantites.map((q) => this.texteQuantite(q)).join(" + ");
  },

  // Une quantité : "500 ml", "½ c. à soupe" ; les pièces s'écrivent "× 4,5"
  texteQuantite(q) {
    const nombre = Logic.formaterNombre(q.quantite, q.unite);
    return q.unite === "piece" ? "× " + nombre : nombre + " " + t("unite_" + q.unite);
  },

  // --- Liste, étape « ajouts » ---
  // choisies : [{ index, titre, parts }] ; disponibles : [{ id, titre }] ;
  // manuels : articles libres ; choixOuvert : le choix de recette est déplié
  rendreAjouts(choisies, disponibles, manuels, choixOuvert) {
    const c = document.getElementById("contenu-liste");
    c.replaceChildren(el("h2", { texte: t("section_recettes") }));

    if (choisies.length === 0) c.append(el("p", { class: "vide", texte: t("liste_sans_recette") }));
    choisies.forEach((r) => c.append(el("div", { class: "ligne-liste" }, [
      el("span", { class: "ligne-titre", texte: r.titre }),
      el("div", { class: "parts" }, [
        el("button", { class: "bouton rond", "data-action": "liste-parts-moins", "data-index": r.index, "aria-label": t("diminuer_parts"), texte: "−" }),
        el("strong", { class: "parts-nombre", texte: r.parts }),
        el("button", { class: "bouton rond", "data-action": "liste-parts-plus", "data-index": r.index, "aria-label": t("augmenter_parts"), texte: "+" }),
        el("span", { texte: r.parts > 1 ? t("parts") : t("part") })
      ]),
      el("button", { class: "bouton rond retrait", "data-action": "liste-retirer-recette", "data-index": r.index, "aria-label": t("retirer"), texte: "✕" })
    ])));

    c.append(el("button", {
      class: "bouton", "data-action": "liste-choix-recette",
      texte: choixOuvert ? t("fermer") : "+ " + t("ajouter_recette")
    }));
    if (choixOuvert) {
      if (disponibles.length === 0) c.append(el("p", { class: "vide", texte: t("aucune_recette_disponible") }));
      c.append(el("ul", { class: "cartes" }, disponibles.map((r) => el("li", {}, [
        el("button", { class: "carte", "data-action": "liste-ajouter-recette", "data-id": r.id }, [
          el("span", { class: "carte-titre", texte: r.titre })
        ])
      ]))));
    }

    c.append(el("h2", { texte: t("section_articles") }));
    manuels.forEach((m, index) => c.append(el("div", { class: "ligne-liste" }, [
      el("span", { class: "ligne-titre", texte: Logic.majuscule(m.nom) }),
      el("span", { class: "quantite", texte: m.quantite === null ? "" : this.texteQuantites([m]) }),
      el("button", { class: "bouton rond retrait", "data-action": "liste-retirer-article", "data-index": index, "aria-label": t("retirer"), texte: "✕" })
    ])));
    c.append(el("div", { id: "m-ligne" }));
    this.ajouterLigneIngredient(document.getElementById("m-ligne"), undefined, false);
    c.append(
      el("button", { class: "bouton", "data-action": "liste-ajouter-article", texte: "+ " + t("ajouter_article") }),
      el("p", { id: "m-erreur", class: "erreur", role: "alert", hidden: true }),
      el("div", { class: "actions" }, [
        el("button", {
          class: "bouton principal", "data-action": "liste-reviser",
          disabled: choisies.length === 0 && manuels.length === 0, texte: t("passer_revision")
        }),
        el("button", { class: "bouton danger", "data-action": "liste-effacer", texte: t("tout_effacer") })
      ])
    );
  },

  // Ligne de l'article libre en cours de saisie (`conteneur` : "m-ligne" dans Liste, "c-ligne" dans Courses)
  lireArticle(conteneur = "m-ligne") {
    return this.lireLigne(document.querySelector("#" + conteneur + " .ligne-ingredient"));
  },

  // Brouillon de l'article libre (Liste) : gardé quand l'écran est redessiné, pour ne pas perdre la saisie
  lireBrouillonArticle() {
    const ligne = document.querySelector("#m-ligne .ligne-ingredient");
    if (!ligne) return null;
    return { ...this.lireLigne(ligne), auto: ligne.querySelector(".i-rayon").dataset.auto === "1" };
  },

  restaurerBrouillonArticle(brouillon) {
    const ligne = document.querySelector("#m-ligne .ligne-ingredient");
    if (!brouillon || !ligne) return;
    ligne.querySelector(".i-nom").value = brouillon.nom;
    ligne.querySelector(".i-quantite").value = brouillon.quantite;
    ligne.querySelector(".i-unite").value = brouillon.unite;
    const rayon = ligne.querySelector(".i-rayon");
    rayon.value = brouillon.rayon;
    if (brouillon.auto) rayon.dataset.auto = "1"; else delete rayon.dataset.auto;
  },

  // --- Liste, étape « révision » : tout est coché, on décoche ce qu'on a déjà ---
  rendreRevision(groupes, decoches) {
    const c = document.getElementById("contenu-liste");
    c.replaceChildren(
      el("button", { class: "bouton lien", "data-action": "revision-retour", texte: "‹ " + t("retour_ajouts") }),
      el("h2", { texte: t("titre_revision") }),
      el("p", { class: "aide", texte: t("aide_revision") })
    );
    groupes.forEach((groupe) => {
      c.append(el("h3", { texte: t("rayon_" + groupe.rayon) }));
      groupe.lignes.forEach((l) => c.append(el("label", { class: "coche-ligne" }, [
        el("input", { type: "checkbox", "data-action": "basculer", "data-cle": l.cle, checked: !decoches.includes(l.cle) }),
        el("span", { class: "coche-nom", texte: Logic.majuscule(l.libelle) }),
        el("span", { class: "quantite", texte: this.texteQuantites(l.quantites) })
      ])));
    });
    c.append(el("div", { class: "actions" }, [
      el("button", { class: "bouton principal", "data-action": "revision-valider", texte: t("valider_liste") })
    ]));
  },

  // --- Liste, étape « courses » (liste validée) : liste finale rangée par rayon ---
  // Carte article (DESIGN.md, 5.1) : vignette du rayon, nom, « quantité · rayon », case à cocher.
  // `ligne` = { cle, libelle, rayon, quantites }. Le bouton porte data-action="cocher".
  carteArticle(ligne, coche) {
    const [classeTuile, forme] = VIGNETTES[ligne.rayon] || VIGNETTES.autre;
    const nom = Logic.majuscule(ligne.libelle);
    const quantite = this.texteQuantites(ligne.quantites);
    const rayon = t("rayon_" + ligne.rayon);
    const carte = el("div", { class: "carte-article" }, [
      el("span", { class: "vignette " + classeTuile }, [svg("0 0 40 40", FORMES[forme])]),
      el("span", { class: "carte-texte" }, [
        el("span", { class: "carte-nom", texte: nom }),
        el("span", { class: "carte-meta", texte: quantite ? quantite + " · " + rayon : rayon })
      ]),
      el("button", {
        type: "button", class: "case", "data-action": "cocher", "data-cle": ligne.cle,
        "data-description": [nom, quantite, rayon.toLowerCase()].filter(Boolean).join(", ")
      }, [svg("0 0 24 24", [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]], "coche-icone")])
    ]);
    this.majEtatCarte(carte.querySelector(".case"), coche);
    return carte;
  },

  // Met à jour la carte quand on coche ou décoche (sans la redessiner)
  // et le libellé lu par un lecteur d'écran : « Lait, 2 L, crèmerie, non coché ».
  majEtatCarte(bouton, coche) {
    bouton.setAttribute("aria-pressed", coche ? "true" : "false");
    bouton.setAttribute("aria-label", bouton.dataset.description + ", " + t(coche ? "article_coche" : "article_non_coche"));
    bouton.closest(".carte-article").classList.toggle("coche", coche);
  },

  // Écran « Nouvel article » (DESIGN.md 5.7). `ajout` = { nom, quantite, unite, rayon } (texte saisi).
  // La coque est dessinée ici une fois ; majAjout la met à jour sans perdre le focus du champ.
  rendreAjout(ajout) {
    const v = document.getElementById("vue-ajout");
    v.replaceChildren();

    v.append(el("header", { class: "entete-carte" }, [
      el("button", { type: "button", class: "bouton-retour", "data-action": "ajout-retour", "aria-label": t("retour_courses") }, [
        svg("0 0 24 24", [["path", { d: "M19 12H5M11 6l-6 6 6 6" }]], "icone-trait")
      ]),
      el("h1", { texte: t("titre_ajout") })
    ]));

    // Coupon jaune : Article + Quantité, séparés par une perforation décorative
    const champNom = el("input", {
      id: "ajout-nom", type: "text", autocomplete: "off", placeholder: t("ajout_exemple"), value: ajout.nom
    });
    const suggestions = el("div", { id: "ajout-suggestions", class: "puces", hidden: true });
    suggestions.addEventListener("mousedown", (e) => e.preventDefault());   // garde le clavier ouvert
    const champQuantite = el("input", {
      id: "ajout-quantite", class: "valeur-quantite", type: "text", inputmode: "decimal",
      "aria-label": t("champ_quantite"), value: ajout.quantite
    });
    const coupon = el("div", { class: "coupon" }, [
      el("div", { class: "carte-champ haut" }, [
        el("label", { for: "ajout-nom", class: "libelle-carte", texte: t("libelle_article") }),
        champNom,
        suggestions
      ]),
      el("div", { class: "perforation", "aria-hidden": "true" }, [
        el("div", { class: "perforation-trait" }),
        el("span", { class: "encoche gauche" }),
        el("span", { class: "encoche droite" })
      ]),
      el("div", { class: "carte-champ bas" }, [
        el("div", { class: "libelle-carte", texte: t("champ_quantite") }),
        el("div", { class: "stepper" }, [
          el("button", { type: "button", class: "bouton-rond", "data-action": "ajout-moins", "aria-label": t("quantite_moins") }, [
            svg("0 0 24 24", [["path", { d: "M5 12h14" }]], "icone-trait")
          ]),
          champQuantite,
          el("button", { type: "button", class: "bouton-rond", "data-action": "ajout-plus", "aria-label": t("quantite_plus") }, [
            svg("0 0 24 24", [["path", { d: "M12 5v14M5 12h14" }]], "icone-trait")
          ])
        ]),
        el("div", { class: "puces", role: "group", "aria-label": t("libelle_unite") },
          Logic.UNITES.map((u) => el("button", {
            type: "button", class: "filtre", "data-action": "ajout-unite", "data-unite": u, texte: t("unite_" + u)
          }))
        )
      ])
    ]);

    // Rayon : grille de vignettes (même couleur et même forme que sur les cartes)
    const carteRayon = el("div", { class: "carte-simple" }, [
      el("div", { class: "libelle-carte", texte: t("champ_rayon") }),
      el("div", { class: "grille-rayons", role: "group", "aria-label": t("champ_rayon") },
        Logic.RAYONS.map((r) => {
          const [classeTuile, forme] = VIGNETTES[r];
          return el("button", { type: "button", class: "rayon-choix", "data-action": "ajout-rayon", "data-rayon": r }, [
            el("span", { class: "rayon-tuile " + classeTuile }, [
              svg("0 0 40 40", FORMES[forme]),
              el("span", { class: "rayon-coche" }, [svg("0 0 24 24", [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]], "icone-trait")])
            ]),
            el("span", { class: "rayon-nom", texte: t("rayon_" + r) })
          ]);
        })
      )
    ]);

    // Aperçu : la future carte article, avec son autocollant
    const apercu = el("div", { class: "carte-article carte-apercu", id: "ajout-apercu" }, [
      el("span", { class: "vignette" }),
      el("span", { class: "carte-texte" }, [
        el("span", { class: "carte-nom" }),
        el("span", { class: "carte-meta" })
      ]),
      el("span", { class: "autocollant", texte: t("sticker_apercu") })
    ]);

    v.append(
      el("div", { class: "zone-liste" }, [coupon, carteRayon, apercu]),
      el("div", { class: "pied-carte" }, [
        el("p", { id: "ajout-erreur", class: "erreur-carte", role: "alert", hidden: true }),
        el("button", { type: "button", class: "bouton-ajout", "data-action": "ajout-valider", texte: t("bouton_ajout") })
      ])
    );
    this.majAjout(ajout, []);
  },

  // Met à jour l'écran Ajout : unité et rayon choisis, quantité, aperçu, suggestions
  majAjout(ajout, suggestions) {
    document.querySelectorAll("[data-action='ajout-unite']").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.unite === ajout.unite ? "true" : "false"));
    document.querySelectorAll("[data-action='ajout-rayon']").forEach((b) => {
      const choisi = b.dataset.rayon === ajout.rayon;
      b.setAttribute("aria-pressed", choisi ? "true" : "false");
      b.classList.toggle("choisi", choisi);
    });
    const quantite = document.getElementById("ajout-quantite");
    if (document.activeElement !== quantite) quantite.value = ajout.quantite;

    const puces = document.getElementById("ajout-suggestions");
    puces.replaceChildren(...suggestions.map((s) =>
      el("button", { type: "button", class: "filtre", "data-action": "ajout-suggestion", texte: s })));
    puces.hidden = suggestions.length === 0;

    // Aperçu : même rendu que la carte de la liste
    const nombre = Logic.lireNombre(ajout.quantite);
    const texteQuantite = nombre === null || ajout.quantite.trim() === "" ? "" : this.texteQuantite({ quantite: nombre, unite: ajout.unite });
    const rayon = ajout.rayon ? t("rayon_" + ajout.rayon) : "";
    const [classeTuile, forme] = VIGNETTES[ajout.rayon] || VIGNETTES.autre;
    const apercu = document.getElementById("ajout-apercu");
    const vignette = apercu.querySelector(".vignette");
    vignette.className = "vignette " + (ajout.rayon ? classeTuile : "tuile-autre");
    vignette.replaceChildren(svg("0 0 40 40", ajout.rayon ? FORMES[forme] : FORMES.tiret));
    apercu.querySelector(".carte-nom").textContent = ajout.nom.trim() === "" ? t("apercu_nom_vide") : Logic.majuscule(ajout.nom.trim());
    apercu.querySelector(".carte-meta").textContent = [texteQuantite, rayon].filter(Boolean).join(" · ");
  },

  // Écran Courses (DESIGN.md 5.2 à 5.6) : en-tête, recherche, filtres, cartes qui défilent, bouton vert.
  // `filtres` = { filtre, recherche }. La coque est dessinée ici ; les cartes par majZoneCourses.
  rendreCourses(groupes, coches, filtres) {
    const c = document.getElementById("contenu-liste");
    c.replaceChildren();

    c.append(el("header", { class: "entete-carte" }, [
      el("div", {}, [
        el("h1", { texte: t("titre_courses") }),
        el("p", { id: "resume-courses", class: "resume", role: "status" })
      ]),
      // Pastille de langue : pour l'instant un simple repère, sans action (DESIGN.md, décision 4)
      el("span", { class: "pastille-langue", role: "img", "aria-label": t("langue_actuelle"), texte: t("langue_code") })
    ]));

    const champ = el("input", { type: "search", id: "recherche-courses", "aria-label": t("recherche_article"), placeholder: t("recherche_courses") });
    champ.value = filtres.recherche;
    c.append(el("div", { class: "carte-recherche" }, [
      svg("0 0 24 24", [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "M20 20l-4-4" }]], "icone-trait loupe"),
      champ
    ]));

    c.append(el("div", { class: "carte-filtres", role: "group", "aria-label": t("filtres_courses") },
      ["tout", "a_prendre", "pris"].map((f) => el("button", {
        type: "button", class: "filtre", "data-action": "courses-filtre", "data-filtre": f,
        "aria-pressed": f === filtres.filtre ? "true" : "false", texte: t("filtre_" + f)
      }))
    ));

    // Zone qui défile : cartes (redessinées à chaque filtre) puis carte de fin
    c.append(el("div", { class: "zone-liste", id: "zone-courses" }, [
      el("div", { id: "cartes-courses" }),
      el("div", { class: "carte-fin" }, [
        el("div", { class: "actions" }, [
          el("button", { class: "bouton principal", "data-action": "terminer-courses", texte: t("terminer_courses") }),
          el("button", { class: "bouton", "data-action": "liste-modifier", texte: t("modifier_liste") }),
          el("button", { class: "bouton", "data-action": "historique-ouvrir", texte: t("historique_ouvrir") })
        ])
      ])
    ]));

    c.append(el("div", { class: "pied-carte" }, [
      el("button", { type: "button", class: "bouton-ajout", "data-action": "courses-ouvrir-ajout" }, [
        svg("0 0 24 24", [["path", { d: "M12 5v14M5 12h14" }]], "icone-trait plus"),
        el("span", { texte: t("ajouter_un_article") })
      ])
    ]));

    this.majZoneCourses(groupes, coches, filtres);
  },

  // Redessine les cartes selon le filtre et la recherche, sans toucher au reste ni remonter la liste
  majZoneCourses(groupes, coches, filtres) {
    const lignes = Logic.filtrerLignes(groupes, coches, filtres.filtre, filtres.recherche);
    const zone = document.getElementById("zone-courses");
    const haut = zone.scrollTop;
    const compte = Logic.compterCoches(groupes, coches);
    let cartes;
    if (lignes.length > 0) {
      cartes = lignes.map((l) => this.carteArticle(l, coches.includes(l.cle)));
    } else if (filtres.recherche.trim() !== "") {
      cartes = [this.carteVide(false, "vide_recherche_titre", "vide_recherche_meta")];
    } else if (filtres.filtre === "pris") {
      cartes = [this.carteVide(false, "vide_pris_titre", "vide_pris_meta")];
    } else {
      cartes = [this.carteVide(true, "vide_a_prendre_titre", compte.total === 0 ? "courses_liste_vide" : "vide_a_prendre_meta")];
    }
    document.getElementById("cartes-courses").replaceChildren(...cartes);
    zone.scrollTop = haut;
    document.querySelectorAll(".filtre").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filtre === filtres.filtre ? "true" : "false"));
    this.majResume(compte.coches, compte.total);
  },

  // Carte « liste vide » (DESIGN.md 5.5) : vignette verte avec coche, ou grise avec tiret
  carteVide(positive, cleTitre, cleMeta) {
    return el("div", { class: "carte-article" }, [
      el("span", { class: "vignette " + (positive ? "tuile-legumes" : "tuile-autre") }, [
        svg("0 0 24 24", [["path", { d: positive ? "M5 12.5l4.5 4.5L19 7.5" : "M6 12h12" }]], "icone-trait")
      ]),
      el("span", { class: "carte-texte" }, [
        el("span", { class: "carte-nom", texte: t(cleTitre) }),
        el("span", { class: "carte-meta", texte: t(cleMeta) })
      ])
    ]);
  },

  // --- Historique (consultation seule) ---
  // Dans l'écran Liste : "panier" (liste en cours) ou "historique"
  afficherVueListe(nom) {
    document.getElementById("vue-panier").hidden = nom !== "panier";
    document.getElementById("vue-ajout").hidden = nom !== "ajout";
    document.getElementById("vue-historique").hidden = nom !== "historique";
    this.majHabillage();
    window.scrollTo(0, 0);
  },

  // entrees : [{ index, date, resume }], de la plus récente à la plus ancienne
  rendreHistorique(entrees) {
    const vue = document.getElementById("vue-historique");
    vue.replaceChildren(
      el("button", { class: "bouton lien", "data-action": "historique-fermer", texte: "‹ " + t("retour") }),
      el("h1", { texte: t("titre_historique") })
    );
    if (entrees.length === 0) return vue.append(el("p", { class: "vide", texte: t("historique_vide") }));
    vue.append(el("ul", { class: "cartes" }, entrees.map((e) => el("li", {}, [
      el("button", { class: "carte carte-historique", "data-action": "historique-detail", "data-index": e.index }, [
        el("span", { class: "carte-titre", texte: e.date }),
        el("span", { class: "carte-info", texte: e.resume })
      ])
    ]))));
  },

  // Une liste terminée : recettes, puis articles par rayon (cochés = étaient dans le caddie)
  rendreDetailHistorique(entree, date, groupes) {
    const vue = document.getElementById("vue-historique");
    vue.replaceChildren(
      el("button", { class: "bouton lien", "data-action": "historique-retour", texte: "‹ " + t("retour") }),
      el("h1", { texte: date })
    );
    if (entree.recettes.length > 0) {
      vue.append(
        el("h2", { texte: t("section_recettes") }),
        el("ul", { class: "ingredients" }, entree.recettes.map((r) => el("li", {}, [
          el("span", { texte: r.titre }),
          el("span", { class: "quantite", texte: r.parts + " " + (r.parts > 1 ? t("parts") : t("part")) })
        ])))
      );
    }
    vue.append(el("h2", { texte: t("section_articles_achetes") }), el("p", { class: "aide", texte: t("aide_historique") }));
    groupes.forEach((groupe) => {
      vue.append(el("h3", { texte: t("rayon_" + groupe.rayon) }));
      groupe.lignes.forEach((l) => vue.append(el("div", { class: "ligne-course" }, [
        el("input", { type: "checkbox", disabled: true, checked: l.coche }),
        el("span", { class: "coche-nom", texte: Logic.majuscule(l.libelle) }),
        el("span", { class: "quantite", texte: this.texteQuantites(l.quantites) })
      ])));
    });
  },

  // --- Sauvegarde ---
  // Bandeau de rappel : `texte` à afficher, ou null pour le cacher
  afficherBandeau(texte) {
    document.getElementById("bandeau-sauvegarde").hidden = texte === null;
    if (texte !== null) document.getElementById("bandeau-texte").textContent = texte;
  },

  // Écran Réglages : `texteDate` = phrase sur la dernière sauvegarde
  // `texteSecours` : phrase sur la copie d'avant restauration, ou null s'il n'y en a pas
  rendreReglages(texteDate, texteSecours) {
    document.getElementById("contenu-reglages").replaceChildren(
      el("h2", { texte: t("section_sauvegarde") }),
      el("p", { texte: texteDate }),
      el("p", { class: "aide", texte: t("aide_sauvegarde") }),
      el("div", { class: "actions" }, [
        el("button", { class: "bouton principal", "data-action": "sauvegarder", texte: t("sauvegarder") }),
        el("button", { class: "bouton", "data-action": "restaurer", texte: t("restaurer") })
      ]),
      ...(texteSecours === null ? [] : [el("div", { class: "secours" }, [
        el("p", { class: "aide", texte: texteSecours }),
        el("button", { class: "bouton danger", "data-action": "annuler-restauration", texte: t("annuler_restauration") })
      ])]),
      el("p", { id: "message-reglages", role: "alert", hidden: true })
    );
  },

  // Message sous les boutons (réussite ou erreur)
  messageReglages(texte, erreur) {
    const p = document.getElementById("message-reglages");
    if (!p) return;
    p.textContent = texte;
    p.className = erreur ? "erreur" : "succes";
    p.setAttribute("role", erreur ? "alert" : "status");
    p.hidden = false;
  },

  // Résumé sous le titre : « Il reste 3 articles » (compte les articles pas encore cochés)
  majResume(coches, total) {
    const p = document.getElementById("resume-courses");
    if (!p) return;
    const reste = total - coches;
    if (total === 0) p.textContent = t("courses_liste_vide");
    else if (reste === 0) p.textContent = t("resume_tout_pris");
    else if (reste === 1) p.textContent = t("resume_reste_un");
    else p.textContent = t("resume_reste_n").replace("{n}", reste);
  }
};

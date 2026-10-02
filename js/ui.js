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

const UI = {
  // Affiche l'écran demandé et surligne l'onglet correspondant
  afficherEcran(nom) {
    document.querySelectorAll(".ecran").forEach((ecran) => {
      ecran.hidden = ecran.dataset.ecran !== nom;
    });
    document.querySelectorAll(".onglet").forEach((onglet) => {
      onglet.classList.toggle("actif", onglet.dataset.cible === nom);
    });
  },

  // Dans l'écran Recettes : "liste", "detail", "form" ou "import"
  afficherVueRecettes(nom) {
    ["liste", "detail", "form", "import"].forEach((vue) => {
      document.getElementById("vue-" + vue).hidden = vue !== nom;
    });
    window.scrollTo(0, 0);
  },

  // --- Liste des recettes ---
  rendreListe(recettes, rechercheActive) {
    const ul = document.getElementById("liste-recettes");
    ul.replaceChildren();
    recettes.forEach((r) => {
      const unite = r.parts > 1 ? t("parts") : t("part");
      ul.append(el("li", {}, [
        el("button", { class: "carte", "data-action": "ouvrir", "data-id": r.id }, [
          el("span", { class: "carte-titre", texte: r.titre }),
          el("span", { class: "carte-info", texte: r.parts + " " + unite })
        ])
      ]));
    });
    const vide = document.getElementById("vide-recettes");
    vide.hidden = recettes.length > 0;
    vide.textContent = rechercheActive ? t("aucun_resultat") : t("vide_recettes");
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
        let quantite = "";
        if (l.quantite !== null) {
          quantite = Logic.formaterNombre(l.quantite) + " " + t("unite_" + l.unite);
        }
        return el("li", {}, [
          el("span", { texte: l.nom }),
          el("span", { class: "quantite", texte: quantite })
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
      el("p", { id: "import-message", hidden: true }),
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
      el("input", { id: "f-parts", type: "text", inputmode: "numeric", value: recette ? recette.parts : 4 }),
      el("h2", { texte: t("section_ingredients") }),
      el("div", { id: "f-ingredients" }),
      el("button", { class: "bouton", "data-action": "ajouter-ingredient", texte: "+ " + t("ajouter_ingredient") }),
      el("label", { "for": "f-etapes", texte: t("champ_etapes") }),
      el("textarea", { id: "f-etapes", rows: "5", texte: recette ? recette.etapes.join("\n") : "" }),
      el("label", { "for": "f-notes", texte: t("champ_notes") }),
      el("textarea", { id: "f-notes", rows: "3", texte: recette ? recette.notes : "" }),
      el("p", { id: "f-erreur", class: "erreur", hidden: true }),
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
    return quantites.map((q) => Logic.formaterNombre(q.quantite) + " " + t("unite_" + q.unite)).join(" + ");
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
      el("span", { class: "ligne-titre", texte: m.nom }),
      el("span", { class: "quantite", texte: m.quantite === null ? "" : this.texteQuantites([m]) }),
      el("button", { class: "bouton rond retrait", "data-action": "liste-retirer-article", "data-index": index, "aria-label": t("retirer"), texte: "✕" })
    ])));
    c.append(el("div", { id: "m-ligne" }));
    this.ajouterLigneIngredient(document.getElementById("m-ligne"), undefined, false);
    c.append(
      el("button", { class: "bouton", "data-action": "liste-ajouter-article", texte: "+ " + t("ajouter_article") }),
      el("p", { id: "m-erreur", class: "erreur", hidden: true }),
      el("div", { class: "actions" }, [
        el("button", {
          class: "bouton principal", "data-action": "liste-reviser",
          disabled: choisies.length === 0 && manuels.length === 0, texte: t("passer_revision")
        }),
        el("button", { class: "bouton danger", "data-action": "liste-effacer", texte: t("tout_effacer") })
      ])
    );
  },

  // Ligne de l'article libre en cours de saisie
  lireArticle() {
    return this.lireLigne(document.querySelector("#m-ligne .ligne-ingredient"));
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
        el("span", { class: "coche-nom", texte: l.libelle }),
        el("span", { class: "quantite", texte: this.texteQuantites(l.quantites) })
      ])));
    });
    c.append(el("div", { class: "actions" }, [
      el("button", { class: "bouton principal", "data-action": "revision-valider", texte: t("valider_liste") })
    ]));
  },

  // --- Liste, étape « courses » (liste validée) ---
  rendreListeValidee() {
    document.getElementById("contenu-liste").replaceChildren(
      el("p", { texte: t("liste_validee") }),
      el("div", { class: "actions" }, [
        el("button", { class: "bouton", "data-action": "liste-modifier", texte: t("modifier_liste") })
      ])
    );
  },

  // --- Onglet Courses : liste finale rangée par rayon ---
  // Mode courses : une ligne = une grande zone tactile qui coche l'article.
  // `coches` = clés des articles déjà dans le caddie.
  rendreCourses(groupes, listeValidee, coches) {
    const c = document.getElementById("contenu-courses");
    c.replaceChildren();
    if (!listeValidee) return c.append(el("p", { class: "vide", texte: t("courses_pas_prete") }));
    if (groupes.length > 0) c.append(el("p", { id: "compteur-courses", class: "aide" }));
    if (groupes.length === 0) c.append(el("p", { class: "vide", texte: t("courses_liste_vide") }));
    groupes.forEach((groupe) => {
      c.append(el("h3", { texte: t("rayon_" + groupe.rayon) }));
      groupe.lignes.forEach((l) => c.append(el("label", { class: "ligne-course" }, [
        el("input", { type: "checkbox", "data-action": "cocher", "data-cle": l.cle, checked: coches.includes(l.cle) }),
        el("span", { class: "coche-nom", texte: l.libelle }),
        el("span", { class: "quantite", texte: this.texteQuantites(l.quantites) })
      ])));
    });
    c.append(el("div", { class: "actions" }, [
      el("button", { class: "bouton principal", "data-action": "terminer-courses", texte: t("terminer_courses") })
    ]));
  },

  // --- Historique (consultation seule) ---
  // Dans l'écran Courses : "courses" (liste en cours) ou "historique"
  afficherVueCourses(nom) {
    document.getElementById("vue-courses").hidden = nom !== "courses";
    document.getElementById("vue-historique").hidden = nom !== "historique";
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
        el("span", { class: "coche-nom", texte: l.libelle }),
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
  rendreReglages(texteDate) {
    document.getElementById("contenu-reglages").replaceChildren(
      el("h2", { texte: t("section_sauvegarde") }),
      el("p", { texte: texteDate }),
      el("p", { class: "aide", texte: t("aide_sauvegarde") }),
      el("div", { class: "actions" }, [
        el("button", { class: "bouton principal", "data-action": "sauvegarder", texte: t("sauvegarder") }),
        el("button", { class: "bouton", "data-action": "restaurer", texte: t("restaurer") })
      ]),
      el("p", { id: "message-reglages", hidden: true })
    );
  },

  // Message sous les boutons (réussite ou erreur)
  messageReglages(texte, erreur) {
    const p = document.getElementById("message-reglages");
    if (!p) return;
    p.textContent = texte;
    p.className = erreur ? "erreur" : "succes";
    p.hidden = false;
  },

  // Met à jour « 3 / 12 » sans tout redessiner
  majCompteur(coches, total) {
    const p = document.getElementById("compteur-courses");
    if (p) p.textContent = coches + " / " + total + " " + t("articles_coches");
  }
};

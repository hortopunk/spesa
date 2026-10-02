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
  enfants.forEach((enfant) => e.append(enfant));
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

  // Dans l'écran Recettes : "liste", "detail" ou "form"
  afficherVueRecettes(nom) {
    ["liste", "detail", "form"].forEach((vue) => {
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

  // --- Formulaire de création / modification ---
  rendreFormulaire(recette) {
    const vue = document.getElementById("vue-form");
    vue.replaceChildren(
      el("h1", { texte: recette ? t("titre_modifier_recette") : t("titre_nouvelle_recette") }),
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
    const ingredients = recette ? recette.ingredients : [{ nom: "", quantite: null, unite: "piece" }];
    ingredients.forEach((ing) => this.ajouterLigneIngredient(ing));
  },

  // Ajoute une ligne d'ingrédient au formulaire
  ajouterLigneIngredient(ing = { nom: "", quantite: null, unite: "piece" }) {
    const options = Logic.UNITES.map((u) =>
      el("option", { value: u, selected: u === (ing.unite || "piece"), texte: t("unite_" + u) })
    );
    document.getElementById("f-ingredients").append(
      el("div", { class: "ligne-ingredient" }, [
        el("input", { class: "i-nom", type: "text", placeholder: t("champ_nom_ingredient"), value: ing.nom }),
        el("input", {
          class: "i-quantite", type: "text", inputmode: "decimal",
          placeholder: t("champ_quantite"), value: ing.quantite === null ? "" : String(ing.quantite).replace(".", ",")
        }),
        el("select", { class: "i-unite" }, options),
        el("button", { class: "bouton rond", "data-action": "retirer-ingredient", "aria-label": t("retirer_ingredient"), texte: "✕" })
      ])
    );
  },

  retirerLigneIngredient(bouton) {
    bouton.closest(".ligne-ingredient").remove();
  },

  // Lit ce qui est saisi dans le formulaire (du texte brut, rien n'est vérifié ici)
  lireFormulaire() {
    return {
      titre: document.getElementById("f-titre").value,
      parts: document.getElementById("f-parts").value,
      ingredients: [...document.querySelectorAll(".ligne-ingredient")].map((ligne) => ({
        nom: ligne.querySelector(".i-nom").value,
        quantite: ligne.querySelector(".i-quantite").value,
        unite: ligne.querySelector(".i-unite").value
      })),
      etapes: document.getElementById("f-etapes").value,
      notes: document.getElementById("f-notes").value
    };
  },

  afficherErreur(message) {
    const p = document.getElementById("f-erreur");
    p.textContent = message;
    p.hidden = false;
  }
};

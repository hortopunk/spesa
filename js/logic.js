// logic.js — fonctions pures : ni DOM, ni stockage.

const Logic = {
  // Liste fermée des unités (à confirmer à l'étape 3)
  UNITES: ["g", "kg", "ml", "l", "cs", "cc", "piece", "pincee"],

  // Normalisation : minuscules, sans accents, ponctuation et espaces nettoyés
  normaliser(texte) {
    return String(texte)
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  // Lit un nombre saisi à la française ("1,5" ou "1.5").
  // Renvoie null si le texte n'est pas un nombre positif ou nul.
  lireNombre(texte) {
    const propre = String(texte).trim().replace(",", ".");
    if (propre === "") return null;
    const n = Number(propre);
    return Number.isFinite(n) && n >= 0 ? n : null;
  },

  // Arrondi lisible : jamais 1,2500001
  arrondir(n) {
    return Math.round(n * 100) / 100;
  },

  // Affichage à la française : 1.25 devient "1,25"
  formaterNombre(n) {
    return String(this.arrondir(n)).replace(".", ",");
  },

  // Calculateur de parts : quantité × (parts voulues ÷ parts de la recette)
  quantiteAjustee(quantite, partsRecette, partsVoulues) {
    return this.arrondir(quantite * (partsVoulues / partsRecette));
  },

  // Ingrédients d'une recette recalculés pour un nombre de parts
  ingredientsPourParts(recette, partsVoulues) {
    return recette.ingredients.map((ing) => ({
      nom: ing.nom,
      unite: ing.unite,
      quantite: ing.quantite === null ? null : this.quantiteAjustee(ing.quantite, recette.parts, partsVoulues)
    }));
  },

  // Recherche : le texte doit se trouver dans le titre ou dans un ingrédient
  filtrerRecettes(recettes, recherche) {
    const motif = this.normaliser(recherche);
    if (motif === "") return recettes;
    return recettes.filter((r) =>
      this.normaliser(r.titre).includes(motif) ||
      r.ingredients.some((ing) => this.normaliser(ing.nom).includes(motif))
    );
  },

  // Transforme la saisie du formulaire (du texte) en recette propre.
  // Renvoie { recette } si tout va bien, sinon { erreur: "cle_de_texte" }.
  construireRecette(saisie, id) {
    const titre = saisie.titre.trim();
    if (titre === "") return { erreur: "erreur_titre" };

    const parts = this.lireNombre(saisie.parts);
    if (parts === null || parts < 1 || !Number.isInteger(parts)) return { erreur: "erreur_parts" };

    const ingredients = [];
    for (const ligne of saisie.ingredients) {
      const nom = ligne.nom.trim();
      const texteQuantite = ligne.quantite.trim();
      if (nom === "" && texteQuantite === "") continue;   // ligne vide : ignorée
      if (nom === "") return { erreur: "erreur_ingredient_nom" };
      if (texteQuantite === "") {
        // Pas de quantité (ex. « sel ») : accepté
        ingredients.push({ nom, quantite: null, unite: "" });
        continue;
      }
      const quantite = this.lireNombre(texteQuantite);
      if (quantite === null) return { erreur: "erreur_quantite" };
      ingredients.push({ nom, quantite, unite: ligne.unite });
    }
    if (ingredients.length === 0) return { erreur: "erreur_ingredient_vide" };

    const etapes = saisie.etapes.split("\n").map((e) => e.trim()).filter((e) => e !== "");

    return { recette: { id, titre, parts, ingredients, etapes, notes: saisie.notes.trim() } };
  }
};

// logic.js — fonctions pures : ni DOM, ni stockage.

const Logic = {
  // Liste fermée des unités (à confirmer à l'étape 3)
  UNITES: ["g", "kg", "ml", "l", "cs", "cc", "piece", "pincee"],

  // Rayons, dans l'ordre d'affichage (à ajuster selon ton magasin habituel)
  RAYONS: [
    "fruits_legumes", "boulangerie", "boucherie_poissonnerie", "cremerie", "epicerie_salee",
    "epicerie_sucree", "surgeles", "boissons", "hygiene_entretien", "autre"
  ],

  // Normalisation : minuscules, sans accents, ponctuation et espaces nettoyés
  normaliser(texte) {
    return String(texte)
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  // Lit un nombre saisi à la française ("1,5" ou "1.5").
  // Renvoie null si le texte n'est pas un nombre positif ou nul.
  // Seuls les chiffres, une virgule ou un point sont acceptés (pas de « 1e3 » ni « 0x10 »).
  lireNombre(texte) {
    const propre = String(texte).trim().replace(",", ".");
    if (!/^(\d+\.?\d*|\.\d+)$/.test(propre)) return null;
    const n = Number(propre);
    return Number.isFinite(n) ? n : null;
  },

  // Arrondi lisible : jamais 1,2500001
  arrondir(n) {
    return Math.round(n * 100) / 100;
  },

  // Unités qui s'affichent en fractions (½, ¼...) : une demi-pièce, une demi-cuillère.
  // Les poids et volumes restent en décimales (1,5 kg).
  UNITES_FRACTIONS: ["piece", "pincee", "cs", "cc"],
  FRACTIONS: [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]],

  // Affichage à la française : 1.25 devient "1,25". Avec une unité à fractions
  // (`unite`), 1.5 devient "1 ½" ; une valeur sans fraction courante (0,13) reste décimale.
  formaterNombre(n, unite) {
    if (!this.UNITES_FRACTIONS.includes(unite)) return String(this.arrondir(n)).replace(".", ",");
    const entier = Math.floor(n);
    const reste = n - entier;
    if (reste < 0.02) return String(entier);
    if (reste > 0.98) return String(entier + 1);
    const fraction = this.FRACTIONS.find(([valeur]) => Math.abs(reste - valeur) < 0.02);
    if (!fraction) return String(this.arrondir(n)).replace(".", ",");
    return (entier > 0 ? entier + " " : "") + fraction[1];
  },

  // Première lettre en majuscule, pour l'affichage seulement (le texte enregistré ne change pas)
  majuscule(texte) {
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  },

  // Calculateur de parts : quantité × (parts voulues ÷ parts de la recette)
  // Valeur exacte, non arrondie : on arrondit seulement à l'affichage, après l'addition
  // (sinon 6 × « 1/6 de carotte » arrondi à 0,17 donnerait 2 carottes au lieu de 1).
  quantiteAjustee(quantite, partsRecette, partsVoulues) {
    return quantite * (partsVoulues / partsRecette);
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

  // Autocomplétion : libellés du dictionnaire qui correspondent à la saisie.
  // D'abord ceux qui commencent par la saisie, puis ceux dont un mot commence
  // par elle, puis ceux qui la contiennent. Maximum `max` suggestions.
  suggerer(dico, saisie, max = 5) {
    const motif = this.normaliser(saisie);
    if (motif === "") return [];
    const trouves = [];
    for (const [cle, fiche] of Object.entries(dico)) {
      if (cle === motif) continue;   // déjà tapé en entier : rien à suggérer
      let rang;
      if (cle.startsWith(motif)) rang = 0;
      else if (cle.split(" ").some((mot) => mot.startsWith(motif))) rang = 1;
      else if (cle.includes(motif)) rang = 2;
      else continue;
      trouves.push({ rang, libelle: fiche.libelle });
    }
    trouves.sort((a, b) => a.rang - b.rang || a.libelle.localeCompare(b.libelle, "fr"));
    return trouves.slice(0, max).map((x) => x.libelle);
  },

  // Ajoute à chaque ingrédient le rayon connu du dictionnaire ("" si inconnu)
  ingredientsAvecRayon(ingredients, dico) {
    return ingredients.map((ing) => {
      const fiche = dico[this.normaliser(ing.nom)];
      return { ...ing, rayon: fiche ? fiche.rayon : "" };
    });
  },

  // Renvoie un nouveau dictionnaire avec les ingrédients [{ nom, rayon }] ajoutés.
  // Un ingrédient déjà connu garde son libellé d'origine ; seul son rayon est mis à jour.
  mettreAJourDico(dico, entrees) {
    const nouveau = { ...dico };
    entrees.forEach(({ nom, rayon }) => {
      const cle = this.normaliser(nom);
      nouveau[cle] = nouveau[cle] ? { ...nouveau[cle], rayon } : { libelle: nom, rayon };
    });
    return nouveau;
  },

  // Transforme une ligne saisie { nom, quantite, unite, rayon } (du texte) en ingrédient propre.
  // Renvoie { vide: true }, { erreur } ou { ingredient, rayon } (rayon à mémoriser dans le dictionnaire).
  construireLigne(ligne) {
    const nom = ligne.nom.trim();
    const texteQuantite = ligne.quantite.trim();
    if (nom === "" && texteQuantite === "") return { vide: true };
    if (nom === "") return { erreur: "erreur_ingredient_nom" };
    if (!this.RAYONS.includes(ligne.rayon)) return { erreur: "erreur_rayon" };
    const rayon = { nom, rayon: ligne.rayon };
    // Pas de quantité (ex. « sel ») : accepté
    if (texteQuantite === "") return { ingredient: { nom, quantite: null, unite: "" }, rayon };
    const quantite = this.lireNombre(texteQuantite);
    if (quantite === null) return { erreur: "erreur_quantite" };
    return { ingredient: { nom, quantite, unite: ligne.unite }, rayon };
  },

  // --- Liste de courses ---

  // Toutes les lignes brutes de la liste : recettes (quantités recalculées pour les
  // parts choisies) puis articles libres. Une recette supprimée est ignorée.
  lignesDeListe(liste, recettes) {
    const lignes = [];
    liste.recettes.forEach((choix) => {
      const recette = recettes.find((r) => r.id === choix.id);
      if (recette) lignes.push(...this.ingredientsPourParts(recette, choix.parts));
    });
    liste.manuels.forEach((m) => lignes.push({ nom: m.nom, quantite: m.quantite, unite: m.unite, rayon: m.rayon }));
    return lignes;
  },

  // Ramène une quantité à l'unité de base de sa famille (kg -> g, l -> ml).
  // Les autres unités ne se convertissent pas : elles forment leur propre famille.
  versBase(quantite, unite) {
    if (unite === "kg") return { famille: "g", valeur: quantite * 1000 };
    if (unite === "l") return { famille: "ml", valeur: quantite * 1000 };
    return { famille: unite, valeur: quantite };
  },

  // Total d'une ligne de la liste de courses, dans l'unité la plus lisible :
  // 1500 g devient 1,5 kg. Les pièces et les pincées sont arrondies à l'entier supérieur
  // (on n'achète pas une demi-carotte : 0,5 + 0,5 = 1 ; 4,5 gousses = 5).
  // Les autres unités gardent leurs décimales.
  lisible(total, famille) {
    if (famille === "g" && total >= 1000) return { quantite: this.arrondir(total / 1000), unite: "kg" };
    if (famille === "ml" && total >= 1000) return { quantite: this.arrondir(total / 1000), unite: "l" };
    if (famille === "piece" || famille === "pincee") {
      return { quantite: Math.ceil(this.arrondir(total) - 1e-9), unite: famille };
    }
    return { quantite: this.arrondir(total), unite: famille };
  },

  // Fusion : même clé normalisée = même ligne. Les quantités s'additionnent si les unités
  // sont compatibles (g/kg, ml/l, ou unité identique), sinon elles restent côte à côte.
  // Renvoie [{ cle, libelle, rayon, quantites: [{ quantite, unite }] }].
  // `quantites` est vide pour un ingrédient sans quantité (ex. « sel »).
  fusionner(lignes, dico) {
    const groupes = new Map();
    lignes.forEach((ligne) => {
      const cle = this.normaliser(ligne.nom);
      if (!groupes.has(cle)) {
        const fiche = dico[cle];
        const rayon = fiche ? fiche.rayon : ligne.rayon;
        groupes.set(cle, {
          cle,
          libelle: fiche ? fiche.libelle : ligne.nom,
          rayon: this.RAYONS.includes(rayon) ? rayon : "autre",
          totaux: new Map()
        });
      }
      if (ligne.quantite === null) return;
      const { famille, valeur } = this.versBase(ligne.quantite, ligne.unite);
      const totaux = groupes.get(cle).totaux;
      totaux.set(famille, (totaux.get(famille) || 0) + valeur);
    });
    return [...groupes.values()].map((g) => ({
      cle: g.cle,
      libelle: g.libelle,
      rayon: g.rayon,
      quantites: [...g.totaux].map(([famille, total]) => this.lisible(total, famille))
    }));
  },

  // Cochages à conserver quand la liste est validée de nouveau : ceux dont l'article
  // existe encore dans la liste finale (`groupes`).
  garderCoches(coches, groupes) {
    const cles = groupes.flatMap((g) => g.lignes.map((l) => l.cle));
    return coches.filter((cle) => cles.includes(cle));
  },

  // Enlève les ingrédients décochés (clés normalisées) pendant la révision
  retirerDecoches(lignes, decoches) {
    return lignes.filter((l) => !decoches.includes(l.cle));
  },

  // Range par rayon (dans l'ordre de RAYONS), puis par ordre alphabétique
  grouperParRayon(lignes) {
    return this.RAYONS
      .map((rayon) => ({
        rayon,
        lignes: lignes.filter((l) => l.rayon === rayon).sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"))
      }))
      .filter((groupe) => groupe.lignes.length > 0);
  },

  // Nombre d'articles de la liste finale et nombre d'articles cochés
  compterCoches(groupes, coches) {
    const cles = groupes.flatMap((g) => g.lignes.map((l) => l.cle));
    return { total: cles.length, coches: cles.filter((cle) => coches.includes(cle)).length };
  },

  // Copie figée d'une liste terminée, pour l'historique : elle ne dépend plus des
  // recettes ni du dictionnaire, qui peuvent changer ensuite.
  construireArchive(liste, recettes, groupes, dateISO) {
    return {
      date: dateISO,
      recettes: liste.recettes
        .map((choix) => ({ choix, recette: recettes.find((r) => r.id === choix.id) }))
        .filter((x) => x.recette)
        .map((x) => ({ titre: x.recette.titre, parts: x.choix.parts })),
      lignes: groupes.flatMap((g) => g.lignes.map((l) => ({
        libelle: l.libelle,
        rayon: l.rayon,
        quantites: l.quantites,
        coche: liste.coches.includes(l.cle)
      })))
    };
  },

  // --- Import de recettes ---
  FORMAT_IMPORT: "spesa-recette-v1",

  // Lit le texte d'un import (fichier ou texte collé) et le vérifie.
  // Renvoie { erreur, detail? } ou { recette, avertissements, partsAbsentes }.
  // Si la page ne dit pas pour combien de personnes les quantités sont écrites,
  // `recette.parts` vaut null : l'utilisateur devra le renseigner avant d'enregistrer.
  // `recette` n'a pas d'id : elle sera validée et enregistrée comme une saisie normale.
  lireRecetteImportee(texte) {
    // L'IA peut entourer le JSON de texte ou de ``` : on garde de la première { à la dernière }
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    if (debut < 0 || fin < debut) return { erreur: "erreur_import_illisible" };
    let donnees;
    try {
      donnees = JSON.parse(texte.slice(debut, fin + 1));
    } catch (e) {
      return { erreur: "erreur_import_illisible" };
    }
    if (donnees.format !== this.FORMAT_IMPORT) return { erreur: "erreur_import_format" };

    const titre = typeof donnees.titre === "string" ? donnees.titre.trim() : "";
    if (titre === "") return { erreur: "erreur_import_titre" };

    // Parts absentes ou invalides : on n'invente pas de valeur, le champ restera vide
    const partsValides = Number.isInteger(donnees.parts) && donnees.parts >= 1;
    const parts = partsValides ? donnees.parts : null;

    if (!Array.isArray(donnees.ingredients) || donnees.ingredients.length === 0) {
      return { erreur: "erreur_import_ingredients" };
    }
    const ingredients = [];
    for (const brut of donnees.ingredients) {
      const nom = brut && typeof brut.nom === "string" ? brut.nom.trim() : "";
      if (nom === "") return { erreur: "erreur_import_ingredient_nom" };
      if (brut.quantite === null || brut.quantite === undefined || brut.quantite === "") {
        ingredients.push({ nom, quantite: null, unite: "" });
        continue;
      }
      const quantite = typeof brut.quantite === "number"
        ? (Number.isFinite(brut.quantite) && brut.quantite >= 0 ? brut.quantite : null)
        : this.lireNombre(brut.quantite);
      if (quantite === null) return { erreur: "erreur_import_quantite", detail: nom };
      if (!this.UNITES.includes(brut.unite)) {
        return { erreur: "erreur_import_unite", detail: nom + " (" + brut.unite + ")" };
      }
      ingredients.push({ nom, quantite, unite: brut.unite });
    }

    const textes = (liste) => (Array.isArray(liste) ? liste : [])
      .filter((x) => typeof x === "string").map((x) => x.trim()).filter((x) => x !== "");
    return {
      recette: {
        titre, parts, ingredients,
        etapes: textes(donnees.etapes),
        notes: typeof donnees.notes === "string" ? donnees.notes.trim() : ""
      },
      avertissements: textes(donnees.avertissements),
      partsAbsentes: !partsValides
    };
  },

  // Transforme la saisie du formulaire (du texte) en recette propre.
  // Renvoie { recette, rayons } si tout va bien (rayons = [{ nom, rayon }] à mémoriser
  // dans le dictionnaire), sinon { erreur: "cle_de_texte" }.
  construireRecette(saisie, id) {
    const titre = saisie.titre.trim();
    if (titre === "") return { erreur: "erreur_titre" };

    const parts = this.lireNombre(saisie.parts);
    if (parts === null || parts < 1 || !Number.isInteger(parts)) return { erreur: "erreur_parts" };

    const ingredients = [];
    const rayons = [];
    for (const ligne of saisie.ingredients) {
      const resultat = this.construireLigne(ligne);
      if (resultat.vide) continue;   // ligne vide : ignorée
      if (resultat.erreur) return { erreur: resultat.erreur };
      ingredients.push(resultat.ingredient);
      rayons.push(resultat.rayon);
    }
    if (ingredients.length === 0) return { erreur: "erreur_ingredient_vide" };

    const etapes = saisie.etapes.split("\n").map((e) => e.trim()).filter((e) => e !== "");

    return { recette: { id, titre, parts, ingredients, etapes, notes: saisie.notes.trim() }, rayons };
  }
};

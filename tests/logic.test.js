// Tests de logic.js et backup.js (fonctions pures).
// Lancer depuis le dossier du projet :  node --test tests/
// Aucune dépendance : on utilise seulement ce que Node fournit.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// logic.js et backup.js sont écrits pour le navigateur (ils définissent une constante globale).
// On les charge ici en lisant le fichier et en récupérant cette constante.
function charger(fichier, nom) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", fichier), "utf8");
  return new Function(code + "\nreturn " + nom + ";")();
}
const Logic = charger("logic.js", "Logic");
const Backup = charger("backup.js", "Backup");

// Petits outils pour écrire les données de test
const ing = (nom, quantite, unite) => ({ nom, quantite, unite });
const recette = (id, titre, parts, ingredients) => ({ id, titre, parts, ingredients, etapes: [], notes: "" });
const DICO = {
  farine: { libelle: "Farine", rayon: "epicerie_salee" },
  lait: { libelle: "Lait", rayon: "cremerie" },
  oeuf: { libelle: "Oeuf", rayon: "cremerie" },
  "huile d olive": { libelle: "Huile d'olive", rayon: "epicerie_salee" }
};

// ---------- Normalisation et nombres ----------

test("normaliser : minuscules, sans accents, ponctuation nettoyée", () => {
  assert.equal(Logic.normaliser("Œufs  Frais!"), "oeufs frais");
  assert.equal(Logic.normaliser("Huile d'olive"), "huile d olive");
  assert.equal(Logic.normaliser("ÉPICES"), "epices");
  assert.equal(Logic.normaliser("  "), "");
});

test("lireNombre : virgule ou point, null si invalide ou négatif", () => {
  assert.equal(Logic.lireNombre("1,5"), 1.5);
  assert.equal(Logic.lireNombre(" 2 "), 2);
  assert.equal(Logic.lireNombre("0"), 0);
  assert.equal(Logic.lireNombre(""), null);
  assert.equal(Logic.lireNombre("abc"), null);
  assert.equal(Logic.lireNombre("-1"), null);
  assert.equal(Logic.lireNombre("1 5"), null);
  assert.equal(Logic.lireNombre("1e3"), null);   // notation scientifique refusée
  assert.equal(Logic.lireNombre("0x10"), null);
  assert.equal(Logic.lireNombre(".5"), 0.5);
});

test("formaterNombre : jamais 1,2500001", () => {
  assert.equal(Logic.formaterNombre(1.25), "1,25");
  assert.equal(Logic.formaterNombre(1.2500001), "1,25");
  assert.equal(Logic.formaterNombre(2), "2");
});

test("formaterNombre avec unité : fractions pour pièces, pincées et cuillères", () => {
  const cas = [
    [0.5, "piece", "½"], [1.5, "piece", "1 ½"], [4.5, "piece", "4 ½"],
    [0.25, "cs", "¼"], [0.33, "piece", "⅓"], [0.67, "cc", "⅔"], [2.75, "piece", "2 ¾"],
    [3, "piece", "3"], [2.999, "piece", "3"], [1.001, "pincee", "1"],
    [0.13, "piece", "0,13"], [0.06, "piece", "0,06"]   // pas de fraction courante : décimale
  ];
  for (const [valeur, unite, attendu] of cas) {
    assert.equal(Logic.formaterNombre(valeur, unite), attendu, valeur + " " + unite);
  }
});

test("formaterNombre avec unité : poids et volumes restent en décimales", () => {
  assert.equal(Logic.formaterNombre(1.5, "kg"), "1,5");
  assert.equal(Logic.formaterNombre(0.5, "g"), "0,5");
  assert.equal(Logic.formaterNombre(1.25, "l"), "1,25");
  assert.equal(Logic.formaterNombre(1.5), "1,5");   // sans unité : décimales
});

test("majuscule : première lettre seulement, texte enregistré inchangé", () => {
  assert.equal(Logic.majuscule("carotte"), "Carotte");
  assert.equal(Logic.majuscule("œuf"), "Œuf");
  assert.equal(Logic.majuscule("pomme de terre"), "Pomme de terre");
  assert.equal(Logic.majuscule("Déjà"), "Déjà");
  assert.equal(Logic.majuscule(""), "");
});

// ---------- Parts ----------

test("quantiteAjustee : quantité × parts voulues ÷ parts de la recette", () => {
  assert.equal(Logic.quantiteAjustee(250, 4, 6), 375);
  assert.equal(Logic.quantiteAjustee(2, 4, 1), 0.5);
});

test("quantiteAjustee : valeur exacte, l'arrondi vient après l'addition (6 × 1/6 de carotte = 1)", () => {
  const r = recette("r1", "Test", 6, [ing("carotte", 1, "piece")]);
  const lignes = [];
  for (let i = 0; i < 6; i++) lignes.push(...Logic.ingredientsPourParts(r, 1));
  assert.deepEqual(Logic.fusionner(lignes, {})[0].quantites, [{ quantite: 1, unite: "piece" }]);
});

test("ingredientsPourParts : recalcule, laisse « sans quantité » intact", () => {
  const r = recette("r1", "Test", 4, [ing("farine", 200, "g"), ing("sel", null, "")]);
  assert.deepEqual(Logic.ingredientsPourParts(r, 8), [
    { nom: "farine", unite: "g", quantite: 400 },
    { nom: "sel", unite: "", quantite: null }
  ]);
});

// ---------- Recherche et autocomplétion ----------

test("filtrerRecettes : par titre ou ingrédient, sans accents ni majuscules", () => {
  const liste = [recette("a", "Crêpes", 4, [ing("Farine", 1, "kg")]), recette("b", "Salade", 2, [ing("tomate", 2, "piece")])];
  assert.deepEqual(Logic.filtrerRecettes(liste, "CREPE").map((r) => r.id), ["a"]);
  assert.deepEqual(Logic.filtrerRecettes(liste, "tomat").map((r) => r.id), ["b"]);
  assert.equal(Logic.filtrerRecettes(liste, "").length, 2);
  assert.equal(Logic.filtrerRecettes(liste, "zzz").length, 0);
});

test("suggerer : début de nom, puis début de mot, puis contient ; jamais la saisie exacte", () => {
  const dico = {
    automate: { libelle: "Automate" },                 // contient « tom » au milieu d'un mot : rang 3
    "sauce tomate": { libelle: "Sauce tomate" },       // un mot commence par « tom » : rang 2
    tomate: { libelle: "Tomate" },                     // commence par « tom » : rang 1
    olive: { libelle: "Olive" },
    "huile d olive": { libelle: "Huile d'olive" },
    "pate d olive": { libelle: "Pâte d'olive" }
  };
  assert.deepEqual(Logic.suggerer(dico, "tom"), ["Tomate", "Sauce tomate", "Automate"]);
  // même rang : ordre alphabétique ; « Olive » est exclue car déjà tapée en entier
  assert.deepEqual(Logic.suggerer(dico, "olive"), ["Huile d'olive", "Pâte d'olive"]);
  assert.deepEqual(Logic.suggerer(dico, ""), []);
});

test("suggerer : 5 suggestions au maximum", () => {
  const dico = {};
  for (let i = 0; i < 9; i++) dico["tomate " + i] = { libelle: "Tomate " + i };
  assert.equal(Logic.suggerer(dico, "tom").length, 5);
});

// ---------- Dictionnaire ----------

test("ingredientsAvecRayon : rayon connu ou vide", () => {
  const res = Logic.ingredientsAvecRayon([ing("Lait", 1, "l"), ing("inconnu", 1, "g")], DICO);
  assert.equal(res[0].rayon, "cremerie");
  assert.equal(res[1].rayon, "");
});

test("mettreAJourDico : garde le libellé d'origine, met à jour le rayon, ne modifie pas l'original", () => {
  const avant = JSON.stringify(DICO);
  const res = Logic.mettreAJourDico(DICO, [{ nom: "LAIT", rayon: "boissons" }, { nom: "Courgette", rayon: "legumes" }]);
  assert.deepEqual(res.lait, { libelle: "Lait", rayon: "boissons" });
  assert.deepEqual(res.courgette, { libelle: "Courgette", rayon: "legumes" });
  assert.equal(JSON.stringify(DICO), avant);
});

// ---------- Saisie ----------

test("construireLigne : vide, erreurs, sans quantité, rayon obligatoire", () => {
  const ligne = (nom, quantite, unite, rayon) => ({ nom, quantite, unite, rayon });
  assert.deepEqual(Logic.construireLigne(ligne("", "", "g", "")), { vide: true });
  assert.equal(Logic.construireLigne(ligne("", "2", "g", "autre")).erreur, "erreur_ingredient_nom");
  assert.equal(Logic.construireLigne(ligne("riz", "1", "g", "")).erreur, "erreur_rayon");
  assert.equal(Logic.construireLigne(ligne("riz", "beaucoup", "g", "autre")).erreur, "erreur_quantite");
  const sel = Logic.construireLigne(ligne("sel", "", "piece", "epicerie_salee"));
  assert.deepEqual(sel.ingredient, { nom: "sel", quantite: null, unite: "" });
  const riz = Logic.construireLigne(ligne(" riz ", "1,5", "kg", "epicerie_salee"));
  assert.deepEqual(riz.ingredient, { nom: "riz", quantite: 1.5, unite: "kg" });
  assert.deepEqual(riz.rayon, { nom: "riz", rayon: "epicerie_salee" });
});

test("construireRecette : validations et résultat", () => {
  const base = {
    titre: "Pâtes", parts: "4", etapes: " Cuire.\n\n Servir. ", notes: " ok ",
    ingredients: [{ nom: "pâtes", quantite: "500", unite: "g", rayon: "epicerie_salee" }, { nom: "", quantite: "", unite: "g", rayon: "" }]
  };
  assert.equal(Logic.construireRecette({ ...base, titre: " " }, "r1").erreur, "erreur_titre");
  for (const mauvais of ["0", "1,5", "abc", ""]) {
    assert.equal(Logic.construireRecette({ ...base, parts: mauvais }, "r1").erreur, "erreur_parts", "parts = " + mauvais);
  }
  assert.equal(Logic.construireRecette({ ...base, ingredients: [] }, "r1").erreur, "erreur_ingredient_vide");
  const ok = Logic.construireRecette(base, "r1");
  assert.equal(ok.erreur, undefined);
  assert.deepEqual(ok.recette, {
    id: "r1", titre: "Pâtes", parts: 4, etapes: ["Cuire.", "Servir."], notes: "ok",
    ingredients: [{ nom: "pâtes", quantite: 500, unite: "g" }]
  });
  assert.deepEqual(ok.rayons, [{ nom: "pâtes", rayon: "epicerie_salee" }]);
});

// ---------- Fusion et conversion ----------

test("lisible : bascule en kg et en l à partir de 1000", () => {
  assert.deepEqual(Logic.lisible(999, "g"), { quantite: 999, unite: "g" });
  assert.deepEqual(Logic.lisible(1000, "g"), { quantite: 1, unite: "kg" });
  assert.deepEqual(Logic.lisible(1500, "ml"), { quantite: 1.5, unite: "l" });
  assert.deepEqual(Logic.lisible(3, "piece"), { quantite: 3, unite: "piece" });
});

test("lisible : pièces et pincées arrondies à l'entier supérieur, le reste garde ses décimales", () => {
  assert.equal(Logic.lisible(4.5, "piece").quantite, 5);
  assert.equal(Logic.lisible(0.25, "piece").quantite, 1);
  assert.equal(Logic.lisible(0.13, "piece").quantite, 1);
  assert.equal(Logic.lisible(1, "piece").quantite, 1);          // déjà entier : inchangé
  assert.equal(Logic.lisible(3.004, "piece").quantite, 3);      // bruit de calcul : pas d'arrondi vers le haut
  assert.equal(Logic.lisible(0.5, "pincee").quantite, 1);
  assert.equal(Logic.lisible(1.5, "cs").quantite, 1.5);         // cuillères : décimales conservées
  assert.equal(Logic.lisible(0.5, "cc").quantite, 0.5);
  assert.equal(Logic.lisible(250.5, "g").quantite, 250.5);
});

test("fusionner : 0,5 + 0,5 carotte = 1 ; 4,5 gousses = 5 ; l'arrondi vient après la somme", () => {
  const carottes = Logic.fusionner([ing("carotte", 0.5, "piece"), ing("Carotte", 0.5, "piece")], {});
  assert.deepEqual(carottes[0].quantites, [{ quantite: 1, unite: "piece" }]);
  const ail = Logic.fusionner([ing("gousse d'ail", 0.5, "piece"), ing("gousse d'ail", 4, "piece")], {});
  assert.deepEqual(ail[0].quantites, [{ quantite: 5, unite: "piece" }]);
  // 0,3 + 0,3 = 0,6 : arrondi une seule fois (1), pas une fois par ligne (2)
  const petit = Logic.fusionner([ing("x", 0.3, "piece"), ing("x", 0.3, "piece")], {});
  assert.deepEqual(petit[0].quantites, [{ quantite: 1, unite: "piece" }]);
});

test("fusionner : g + kg, accents et majuscules", () => {
  const res = Logic.fusionner([ing("Farine", 800, "g"), ing("farine", 0.7, "kg")], DICO);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].quantites, [{ quantite: 1.5, unite: "kg" }]);
  const oeufs = Logic.fusionner([ing("Œuf", 2, "piece"), ing("oeuf", 3, "piece")], DICO);
  assert.equal(oeufs.length, 1);
  assert.deepEqual(oeufs[0].quantites, [{ quantite: 5, unite: "piece" }]);
});

test("fusionner : unités incompatibles côte à côte, pas de conversion masse/volume", () => {
  const res = Logic.fusionner([ing("lait", 250, "ml"), ing("lait", 1, "l"), ing("lait", 2, "cs"), ing("lait", 100, "g")], DICO);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].quantites, [
    { quantite: 1.25, unite: "l" },
    { quantite: 2, unite: "cs" },
    { quantite: 100, unite: "g" }
  ]);
});

test("fusionner : « sans quantité » donne une ligne sans quantités", () => {
  const res = Logic.fusionner([ing("sel", null, ""), ing("Sel", null, "")], { sel: { libelle: "Sel", rayon: "epicerie_salee" } });
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].quantites, []);
});

test("fusionner : rayon du dictionnaire, sinon de la ligne, sinon « autre »", () => {
  const res = Logic.fusionner([
    ing("lait", 1, "l"),
    { ...ing("thé", 1, "piece"), rayon: "boissons" },
    { ...ing("truc", 1, "piece"), rayon: "inconnu" },
    ing("machin", 1, "piece")
  ], DICO);
  const par = Object.fromEntries(res.map((l) => [l.cle, l.rayon]));
  assert.equal(par.lait, "cremerie");
  assert.equal(par.the, "boissons");
  assert.equal(par.truc, "autre");
  assert.equal(par.machin, "autre");
});

test("fusionner : somme exacte sans erreur de virgule flottante", () => {
  const res = Logic.fusionner([ing("farine", 0.1, "kg"), ing("farine", 0.2, "kg")], DICO);
  assert.deepEqual(res[0].quantites, [{ quantite: 300, unite: "g" }]);
});

// ---------- Liste ----------

test("lignesDeListe : recettes aux parts choisies et articles libres, recette supprimée ignorée", () => {
  const recettes = [recette("a", "Crêpes", 4, [ing("farine", 200, "g")])];
  const liste = {
    recettes: [{ id: "a", parts: 8 }, { id: "supprimee", parts: 2 }],
    manuels: [{ nom: "papier", quantite: 1, unite: "piece", rayon: "hygiene_entretien" }],
    decoches: [], etat: "ajouts", coches: []
  };
  const lignes = Logic.lignesDeListe(liste, recettes);
  assert.equal(lignes.length, 2);
  assert.equal(lignes[0].quantite, 400);
  assert.equal(lignes[1].nom, "papier");
});

test("filtrerLignes : filtre « à prendre / pris » et recherche sans accents ni majuscules", () => {
  const groupes = [
    { rayon: "cremerie", lignes: [{ cle: "lait", libelle: "Lait demi-écrémé" }, { cle: "oeufs", libelle: "Œufs" }] },
    { rayon: "epicerie_salee", lignes: [{ cle: "cafe", libelle: "Café moulu" }] }
  ];
  const cles = (lignes) => lignes.map((l) => l.cle);
  const coches = ["oeufs"];
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "tout", "")), ["lait", "oeufs", "cafe"]);
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "a_prendre", "")), ["lait", "cafe"]);
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "pris", "")), ["oeufs"]);
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "tout", "CAFE")), ["cafe"]);
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "tout", "oeuf")), ["oeufs"]);
  assert.deepEqual(cles(Logic.filtrerLignes(groupes, coches, "pris", "lait")), []);
});

test("rayonActuel : l'ancien rayon « fruits_legumes » devient « legumes », les autres ne changent pas", () => {
  assert.equal(Logic.rayonActuel("fruits_legumes"), "legumes");
  assert.equal(Logic.rayonActuel("fruits"), "fruits");
  assert.equal(Logic.rayonActuel("cremerie"), "cremerie");
});

test("grouperParRayon : une ancienne ligne « fruits_legumes » (historique) apparaît dans « legumes »", () => {
  const groupes = Logic.grouperParRayon([{ cle: "a", libelle: "Aubergine", rayon: "fruits_legumes" }]);
  assert.deepEqual(groupes.map((g) => g.rayon), ["legumes"]);
});

test("grouperParRayon : ordre des rayons, ordre alphabétique, rayons vides ignorés", () => {
  const lignes = [
    { cle: "b", libelle: "Beurre", rayon: "cremerie" },
    { cle: "a", libelle: "Aubergine", rayon: "legumes" },
    { cle: "l", libelle: "Lait", rayon: "cremerie" }
  ];
  const groupes = Logic.grouperParRayon(lignes);
  assert.deepEqual(groupes.map((g) => g.rayon), ["legumes", "cremerie"]);
  assert.deepEqual(groupes[1].lignes.map((l) => l.libelle), ["Beurre", "Lait"]);
});

test("garderCoches : garde les articles encore dans la liste, oublie les autres", () => {
  const groupes = [{ rayon: "cremerie", lignes: [{ cle: "lait" }, { cle: "oeuf" }] }];
  assert.deepEqual(Logic.garderCoches(["lait", "beurre"], groupes), ["lait"]);
  assert.deepEqual(Logic.garderCoches([], groupes), []);
});

test("retirerDecoches et compterCoches", () => {
  const lignes = [{ cle: "sel" }, { cle: "lait" }, { cle: "farine" }];
  assert.deepEqual(Logic.retirerDecoches(lignes, ["sel"]).map((l) => l.cle), ["lait", "farine"]);
  const groupes = [{ rayon: "autre", lignes }];
  assert.deepEqual(Logic.compterCoches(groupes, ["lait", "absent"]), { total: 3, coches: 1 });
});

test("construireArchive : copie autonome avec les cochages, recette supprimée ignorée", () => {
  const recettes = [recette("a", "Crêpes", 4, [])];
  const liste = { recettes: [{ id: "a", parts: 6 }, { id: "x", parts: 1 }], manuels: [], decoches: [], etat: "courses", coches: ["lait"] };
  const groupes = [{ rayon: "cremerie", lignes: [
    { cle: "lait", libelle: "Lait", rayon: "cremerie", quantites: [{ quantite: 1, unite: "l" }] },
    { cle: "beurre", libelle: "Beurre", rayon: "cremerie", quantites: [] }
  ] }];
  const archive = Logic.construireArchive(liste, recettes, groupes, "2026-10-02T10:00:00.000Z");
  assert.equal(archive.date, "2026-10-02T10:00:00.000Z");
  assert.deepEqual(archive.recettes, [{ titre: "Crêpes", parts: 6 }]);
  assert.deepEqual(archive.lignes.map((l) => [l.libelle, l.coche]), [["Lait", true], ["Beurre", false]]);
});

// ---------- Import de recettes ----------

const IMPORT = {
  format: "spesa-recette-v1", titre: "Ratatouille", parts: 4,
  ingredients: [ing("aubergine", 2, "piece"), ing("huile d'olive", 3, "cs"), ing("sel", null, "")],
  etapes: ["Couper.", "Faire revenir."], notes: "", avertissements: ["Quantité de sel illisible"]
};
const erreurImport = (donnees) => Logic.lireRecetteImportee(typeof donnees === "string" ? donnees : JSON.stringify(donnees)).erreur;

test("lireRecetteImportee : recette correcte, texte entouré de blabla accepté", () => {
  const ok = Logic.lireRecetteImportee(JSON.stringify(IMPORT));
  assert.equal(ok.recette.titre, "Ratatouille");
  assert.equal(ok.recette.ingredients.length, 3);
  assert.deepEqual(ok.avertissements, ["Quantité de sel illisible"]);
  assert.equal(ok.partsAbsentes, false);
  assert.equal(ok.recette.parts, 4);
  const entoure = Logic.lireRecetteImportee("Voici :\n```json\n" + JSON.stringify(IMPORT) + "\n```\nBon appétit");
  assert.equal(entoure.recette.titre, "Ratatouille");
});

test("lireRecetteImportee : erreurs claires", () => {
  assert.equal(erreurImport("bonjour"), "erreur_import_illisible");
  assert.equal(erreurImport('{"format": '), "erreur_import_illisible");
  assert.equal(erreurImport({ ...IMPORT, format: "autre" }), "erreur_import_format");
  assert.equal(erreurImport({ ...IMPORT, titre: " " }), "erreur_import_titre");
  assert.equal(erreurImport({ ...IMPORT, ingredients: [] }), "erreur_import_ingredients");
  assert.equal(erreurImport({ ...IMPORT, ingredients: [ing("", 1, "g")] }), "erreur_import_ingredient_nom");
  assert.equal(erreurImport({ ...IMPORT, ingredients: [ing("riz", "beaucoup", "g")] }), "erreur_import_quantite");
  const unite = Logic.lireRecetteImportee(JSON.stringify({ ...IMPORT, ingredients: [ing("riz", 1, "tasse")] }));
  assert.equal(unite.erreur, "erreur_import_unite");
  assert.equal(unite.detail, "riz (tasse)");
});

test("lireRecetteImportee : parts absentes ou invalides = null (jamais de valeur inventée)", () => {
  for (const parts of [null, 0, 1.5, "quatre", undefined]) {
    const res = Logic.lireRecetteImportee(JSON.stringify({ ...IMPORT, parts }));
    assert.equal(res.partsAbsentes, true, "parts = " + parts);
    assert.equal(res.recette.parts, null, "parts = " + parts);
  }
});

test("lireRecetteImportee : quantité en texte acceptée, champs facultatifs absents", () => {
  const texte = Logic.lireRecetteImportee(JSON.stringify({ ...IMPORT, ingredients: [ing("riz", "1,5", "kg")] }));
  assert.equal(texte.recette.ingredients[0].quantite, 1.5);
  const minimale = Logic.lireRecetteImportee(JSON.stringify({ ...IMPORT, etapes: undefined, avertissements: undefined }));
  assert.deepEqual(minimale.recette.etapes, []);
  assert.deepEqual(minimale.avertissements, []);
});

// ---------- Sauvegarde (backup.js) ----------

test("Backup.analyser : accepte une sauvegarde valide, refuse le reste", () => {
  const valide = Backup.construire(
    { recettes: [recette("r1", "A", 4, [])], dico: {}, historique: [], reglages: { langue: "fr" } },
    "2026-10-02T10:00:00.000Z", 1
  );
  assert.ok(Backup.analyser(JSON.stringify(valide), 1).sauvegarde);
  assert.equal(Backup.analyser("pas du json", 1).erreur, "erreur_sauvegarde_illisible");
  assert.equal(Backup.analyser(JSON.stringify({ a: 1 }), 1).erreur, "erreur_sauvegarde_format");
  assert.equal(Backup.analyser(JSON.stringify({ ...valide, version_schema: 2 }), 1).erreur, "erreur_sauvegarde_version");
  assert.equal(Backup.analyser(JSON.stringify({ ...valide, recettes: [{ id: 1 }] }), 1).erreur, "erreur_sauvegarde_contenu");
  assert.equal(Backup.analyser(JSON.stringify({ ...valide, dico: [] }), 1).erreur, "erreur_sauvegarde_contenu");
});

test("Backup.analyser : refuse les recettes et l'historique mal formés (ils feraient planter l'affichage)", () => {
  const base = { recettes: [recette("r1", "A", 4, [ing("lait", 1, "l")])], dico: { lait: { libelle: "Lait", rayon: "cremerie" } }, historique: [], reglages: {} };
  const fichier = (modif) => JSON.stringify(Backup.construire({ ...base, ...modif }, "2026-10-02T10:00:00.000Z", 1));
  const archive = { date: "2026-10-02", recettes: [{ titre: "A", parts: 4 }], lignes: [{ libelle: "Lait", rayon: "cremerie", quantites: [{ quantite: 1, unite: "l" }], coche: true }] };
  assert.ok(Backup.analyser(fichier({ historique: [archive] }), 1).sauvegarde);
  const mal = "erreur_sauvegarde_contenu";
  assert.equal(Backup.analyser(fichier({ recettes: [{ id: "r1", titre: "A", parts: 4, ingredients: [] }] }), 1).erreur, mal);   // sans etapes ni notes
  assert.equal(Backup.analyser(fichier({ recettes: [recette("r1", "A", 0, [])] }), 1).erreur, mal);
  assert.equal(Backup.analyser(fichier({ recettes: [recette("r1", "A", 4, [{ nom: "x", quantite: "2", unite: "g" }])] }), 1).erreur, mal);
  assert.equal(Backup.analyser(fichier({ historique: [{ date: "x" }] }), 1).erreur, mal);
  assert.equal(Backup.analyser(fichier({ historique: [{ ...archive, lignes: [{ libelle: "Lait" }] }] }), 1).erreur, mal);
  assert.equal(Backup.analyser(fichier({ dico: { lait: "Lait" } }), 1).erreur, mal);
});

test("Backup.rappel : rien si l'appli est vide, jamais, plus de 7 jours", () => {
  const maintenant = new Date("2026-10-10T12:00:00Z");
  assert.equal(Backup.rappel(null, maintenant, false), null);
  assert.deepEqual(Backup.rappel(null, maintenant, true), { jamais: true });
  assert.equal(Backup.rappel("2026-10-03T12:00:00Z", maintenant, true), null);      // 7 jours : pas encore
  assert.deepEqual(Backup.rappel("2026-10-02T11:00:00Z", maintenant, true), { jours: 8 });
});

test("Backup.nomFichier : spesa-sauvegarde-AAAA-MM-JJ.json (date locale)", () => {
  const midi = new Date(2026, 9, 2, 12, 0, 0).toISOString();
  assert.equal(Backup.nomFichier(midi), "spesa-sauvegarde-2026-10-02.json");
});

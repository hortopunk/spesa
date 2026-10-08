// Tests de db.js avec un faux LocalStorage (en mémoire, avec une limite de place).
// Lancer depuis le dossier du projet :  node --test

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Faux LocalStorage : `limite` = nombre maximal de caractères stockés (valeurs seules)
function fauxStockage(limite = Infinity) {
  const donnees = new Map();
  const taille = () => [...donnees.values()].reduce((n, v) => n + v.length, 0);
  return {
    donnees,
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    removeItem: (k) => { donnees.delete(k); },
    setItem(k, v) {
      const reste = taille() - (donnees.has(k) ? donnees.get(k).length : 0);
      if (reste + String(v).length > limite) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
      }
      donnees.set(k, String(v));
    }
  };
}

// db.js attend un `localStorage` global : on le lui passe en paramètre
function chargerDB(stockage) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "db.js"), "utf8");
  return new Function("localStorage", code + "\nreturn DB;")(stockage);
}

const recette = (id) => ({ id, titre: "T" + id, parts: 4, ingredients: [], etapes: [], notes: "" });

test("ecrireLot : tout est écrit, ou rien (stockage plein = anciennes valeurs remises)", () => {
  const st = fauxStockage(60);
  const DB = chargerDB(st);
  DB.ecrire("a", "un");
  assert.throws(() => DB.ecrireLot([["a", "deux"], ["b", "x".repeat(100)]]), { name: "QuotaExceededError" });
  assert.equal(DB.lire("a", null), "un");        // la première écriture est annulée
  assert.equal(DB.lire("b", null), null);        // la seconde n'existe pas
});

test("enregistrerRecette : recette et dictionnaire ensemble ; si le dictionnaire ne passe pas, la recette non plus", () => {
  const st = fauxStockage(400);
  const DB = chargerDB(st);
  DB.enregistrerRecette(recette("r1"), { lait: { libelle: "Lait", rayon: "cremerie" } });
  assert.equal(DB.recettes().length, 1);
  const gros = {}; for (let i = 0; i < 50; i++) gros["ingredient" + i] = { libelle: "x", rayon: "autre" };
  assert.throws(() => DB.enregistrerRecette(recette("r2"), gros), { name: "QuotaExceededError" });
  assert.equal(DB.recettes().length, 1);                      // pas de recette à moitié enregistrée
  assert.deepEqual(Object.keys(DB.dico()), ["lait"]);         // dictionnaire inchangé
});

test("terminerCourses : archive et liste vidée ensemble", () => {
  const DB = chargerDB(fauxStockage());
  DB.enregistrerListe({ ...DB.listeVide(), etat: "courses", coches: ["lait"] });
  DB.terminerCourses({ date: "2026-10-02", recettes: [], lignes: [] });
  assert.equal(DB.historique().length, 1);
  assert.deepEqual(DB.liste(), DB.listeVide());
});

test("lire : un texte illisible est mis de côté (pas écrasé) et signalé", () => {
  const st = fauxStockage();
  const DB = chargerDB(st);
  st.setItem("spesa_recettes", '[{"id":"r1","titre":"Cou');   // JSON coupé
  assert.deepEqual(DB.recettes(), []);
  assert.deepEqual(DB.anomalies, ["recettes"]);
  const copies = [...st.donnees.keys()].filter((k) => k.startsWith("spesa_recettes_abime_"));
  assert.equal(copies.length, 1);
  assert.equal(st.getItem(copies[0]), '[{"id":"r1","titre":"Cou');
  DB.enregistrerRecette(recette("r2"), {});                  // l'enregistrement suivant n'écrase pas la copie
  assert.equal(st.getItem(copies[0]), '[{"id":"r1","titre":"Cou');
  assert.equal(DB.anomalies.length, 1);                      // signalé une seule fois
});

test("lire : clé absente = valeur par défaut, sans anomalie", () => {
  const DB = chargerDB(fauxStockage());
  assert.deepEqual(DB.recettes(), []);
  assert.deepEqual(DB.anomalies, []);
});

test("restauration : copie de secours, remplacement complet, retour en arrière", () => {
  const DB = chargerDB(fauxStockage());
  DB.enregistrerRecette(recette("avant"), { lait: { libelle: "Lait", rayon: "cremerie" } });
  assert.equal(DB.secours(), null);
  DB.garderSecours("2026-10-06T10:00:00.000Z");
  DB.remplacerTout({ recettes: [recette("apres")], dico: {}, historique: [], reglages: { langue: "fr", version_schema: 1 } });
  assert.deepEqual(DB.recettes().map((r) => r.id), ["apres"]);
  const secours = DB.secours();
  assert.equal(secours.date, "2026-10-06T10:00:00.000Z");
  DB.remplacerTout(secours);
  DB.supprimerSecours();
  assert.deepEqual(DB.recettes().map((r) => r.id), ["avant"]);
  assert.deepEqual(Object.keys(DB.dico()), ["lait"]);
  assert.equal(DB.secours(), null);
});

test("remplacerTout : stockage plein = aucune donnée modifiée (pas de mélange de deux sauvegardes)", () => {
  const st = fauxStockage(300);
  const DB = chargerDB(st);
  DB.enregistrerRecette(recette("avant"), {});
  const gros = Array.from({ length: 20 }, (_, i) => recette("n" + i));
  assert.throws(() => DB.remplacerTout({ recettes: gros, dico: {}, historique: [], reglages: {} }), { name: "QuotaExceededError" });
  assert.deepEqual(DB.recettes().map((r) => r.id), ["avant"]);
});

test("chargerDonneesDev : remplace tout, liste en cours comprise (ou liste vide si elle est absente ou mal formée)", () => {
  const DB = chargerDB(fauxStockage());
  DB.enregistrerRecette(recette("ancienne"), {});
  const donnees = { recettes: [recette("fichier")], dico: {}, historique: [], reglages: {} };
  DB.chargerDonneesDev({ ...donnees, liste: { recettes: [{ id: "fichier", parts: 2 }], manuels: [], decoches: [], coches: [], etat: "courses" } });
  assert.deepEqual(DB.recettes().map((r) => r.id), ["fichier"]);
  assert.equal(DB.liste().etat, "courses");
  assert.equal(DB.reglages().langue, "fr");                  // réglages complétés
  DB.chargerDonneesDev({ ...donnees, liste: { etat: "n'importe quoi" } });
  assert.deepEqual(DB.liste(), DB.listeVide());
  DB.chargerDonneesDev(donnees);
  assert.deepEqual(DB.liste(), DB.listeVide());
});

test("migrerSchema : copie de sécurité puis données corrigées ; une seule fois ; rien si stockage plein", () => {
  const transformer = (d) => ({ dico: { ...d.dico, x: { libelle: "X", rayon: "fruits" } }, historique: d.historique, liste: d.liste, changements: 1 });
  const st = fauxStockage();
  const DB = chargerDB(st);
  DB.ecrire("reglages", { langue: "fr", derniere_sauvegarde: null, version_schema: 1 });
  DB.ecrire("dico", { a: { libelle: "A", rayon: "fruits_legumes" } });
  assert.equal(DB.migrerSchema(transformer), true);
  assert.equal(DB.reglages().version_schema, DB.VERSION_SCHEMA);
  assert.equal(DB.dico().x.rayon, "fruits");
  assert.equal(DB.lire("avant_migration", null).dico.a.rayon, "fruits_legumes");   // données d'origine gardées
  assert.equal(DB.migrerSchema(transformer), false);                                // déjà fait

  // Stockage trop petit pour la copie + les données : rien ne change, l'erreur remonte
  const petit = fauxStockage(200);
  const DB2 = chargerDB(petit);
  DB2.ecrire("reglages", { langue: "fr", version_schema: 1 });
  DB2.ecrire("dico", { a: { libelle: "A", rayon: "fruits_legumes" } });
  assert.throws(() => DB2.migrerSchema(transformer), { name: "QuotaExceededError" });
  assert.equal(DB2.reglages().version_schema, 1);
  assert.equal(DB2.dico().a.rayon, "fruits_legumes");
});

test("migrerSchema : sans rayon à changer, seul le numéro de schéma passe à 2 (pas de copie inutile)", () => {
  const DB = chargerDB(fauxStockage());
  DB.ecrire("reglages", { langue: "fr", version_schema: 1 });
  DB.migrerSchema((d) => ({ ...d, changements: 0 }));
  assert.equal(DB.reglages().version_schema, DB.VERSION_SCHEMA);
  assert.equal(DB.lire("avant_migration", null), null);
});

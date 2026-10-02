// db.js — seul fichier qui lit et écrit dans le LocalStorage.
// Toutes les clés commencent par "spesa_".

const DB = {
  PREFIXE: "spesa_",
  VERSION_SCHEMA: 1,

  // Lecture générique : renvoie `defaut` si la clé n'existe pas ou est illisible
  lire(nom, defaut) {
    try {
      const brut = localStorage.getItem(this.PREFIXE + nom);
      return brut === null ? defaut : JSON.parse(brut);
    } catch (e) {
      return defaut;
    }
  },

  // Écriture générique
  ecrire(nom, valeur) {
    localStorage.setItem(this.PREFIXE + nom, JSON.stringify(valeur));
  },

  // Au démarrage : crée les réglages par défaut s'ils n'existent pas
  init() {
    const reglages = this.reglages();
    if (!reglages.version_schema) {
      this.ecrire("reglages", { langue: "fr", derniere_sauvegarde: null, version_schema: this.VERSION_SCHEMA });
    }
  },

  // --- Réglages ---
  reglages() {
    return this.lire("reglages", {});
  },

  // --- Dictionnaire des ingrédients (clé normalisée -> { libelle, rayon }) ---
  dico() {
    return this.lire("dico", {});
  },

  enregistrerDico(dico) {
    this.ecrire("dico", dico);
  },

  // --- Liste en cours ---
  listeVide() {
    return { recettes: [], manuels: [], decoches: [], etat: "ajouts", coches: [] };
  },

  liste() {
    return this.lire("liste", this.listeVide());
  },

  enregistrerListe(liste) {
    this.ecrire("liste", liste);
  },

  // --- Historique : listes terminées, copies figées (consultation seule) ---
  historique() {
    return this.lire("historique", []);
  },

  ajouterHistorique(entree) {
    const historique = this.historique();
    historique.push(entree);
    this.ecrire("historique", historique);
  },

  // --- Recettes ---
  recettes() {
    return this.lire("recettes", []);
  },

  recette(id) {
    return this.recettes().find((r) => r.id === id) || null;
  },

  // Identifiant unique pour une nouvelle recette
  nouvelId() {
    return "r_" + Date.now().toString(36);
  },

  // Ajoute la recette, ou remplace celle qui a le même id
  enregistrerRecette(recette) {
    const liste = this.recettes();
    const position = liste.findIndex((r) => r.id === recette.id);
    if (position >= 0) {
      liste[position] = recette;
    } else {
      liste.push(recette);
    }
    this.ecrire("recettes", liste);
  },

  supprimerRecette(id) {
    this.ecrire("recettes", this.recettes().filter((r) => r.id !== id));
  }
};

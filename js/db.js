// db.js — seul fichier qui lit et écrit dans le LocalStorage.
// Toutes les clés commencent par "spesa_".

const DB = {
  PREFIXE: "spesa_",
  VERSION_SCHEMA: 1,

  // Données illisibles rencontrées pendant cette session (noms de clés) : app.js prévient l'utilisateur
  anomalies: [],

  // Lecture générique : renvoie `defaut` si la clé n'existe pas ou est illisible.
  // Un texte illisible n'est pas perdu : on le met de côté (voir mettreDeCote) avant qu'un
  // enregistrement ne l'écrase.
  lire(nom, defaut) {
    let brut = null;
    try {
      brut = localStorage.getItem(this.PREFIXE + nom);
      return brut === null ? defaut : JSON.parse(brut);
    } catch (e) {
      if (brut !== null) this.mettreDeCote(nom, brut);
      return defaut;
    }
  },

  // Copie le texte abîmé sous `spesa_<nom>_abime_<date>`, puis libère la clé d'origine.
  // Si la copie échoue (stockage plein), on laisse l'original en place.
  mettreDeCote(nom, brut) {
    try {
      localStorage.setItem(this.PREFIXE + nom + "_abime_" + new Date().toISOString(), brut);
      localStorage.removeItem(this.PREFIXE + nom);
      this.anomalies.push(nom);
    } catch (e) {
      // rien de plus à faire ici
    }
  },

  // Écriture générique. Peut échouer (stockage plein) : l'appelant doit prévoir l'erreur.
  ecrire(nom, valeur) {
    localStorage.setItem(this.PREFIXE + nom, JSON.stringify(valeur));
  },

  // Écrit plusieurs données liées en tout-ou-rien : si une écriture échoue, les précédentes
  // sont annulées (anciennes valeurs remises) puis l'erreur est relancée.
  // `paires` = [[nom, valeur], ...]
  ecrireLot(paires) {
    const anciennes = paires.map(([nom]) => [nom, localStorage.getItem(this.PREFIXE + nom)]);
    try {
      paires.forEach(([nom, valeur]) => this.ecrire(nom, valeur));
    } catch (e) {
      anciennes.forEach(([nom, brut]) => {
        try {
          if (brut === null) localStorage.removeItem(this.PREFIXE + nom);
          else localStorage.setItem(this.PREFIXE + nom, brut);
        } catch (e2) {
          // la remise en place libère de la place : elle ne devrait pas échouer
        }
      });
      throw e;
    }
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

  // --- Sauvegarde (utilisé par backup.js via app.js) ---
  // Tout ce qui est sauvegardé : recettes, dictionnaire, historique, réglages
  exporterTout() {
    return { recettes: this.recettes(), dico: this.dico(), historique: this.historique(), reglages: this.reglages() };
  },

  // Remplace toutes les données par celles d'une sauvegarde (la liste en cours n'est pas touchée).
  // Tout-ou-rien : jamais un mélange de deux sauvegardes.
  remplacerTout(donnees) {
    this.ecrireLot([
      ["recettes", donnees.recettes],
      ["dico", donnees.dico],
      ["historique", donnees.historique],
      ["reglages", donnees.reglages]
    ]);
  },

  // --- Copie de secours avant une restauration ---
  // Les données actuelles sont gardées dans `spesa_avant_restauration` pour pouvoir annuler.
  // Écrit une seule copie (la précédente est remplacée).
  garderSecours(dateISO) {
    this.ecrire("avant_restauration", { date: dateISO, ...this.exporterTout() });
  },

  // La copie de secours, ou null s'il n'y en a pas
  secours() {
    return this.lire("avant_restauration", null);
  },

  supprimerSecours() {
    localStorage.removeItem(this.PREFIXE + "avant_restauration");
  },

  // Note la date de dernière sauvegarde dans les réglages
  marquerSauvegarde(dateISO) {
    const reglages = this.reglages();
    reglages.derniere_sauvegarde = dateISO;
    this.ecrire("reglages", reglages);
  },

  // --- Dictionnaire des ingrédients (clé normalisée -> { libelle, rayon }) ---
  dico() {
    return this.lire("dico", {});
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

  // Dictionnaire et liste ensemble (ajout d'un article libre)
  enregistrerDicoEtListe(dico, liste) {
    this.ecrireLot([["dico", dico], ["liste", liste]]);
  },

  // --- Historique : listes terminées, copies figées (consultation seule) ---
  historique() {
    return this.lire("historique", []);
  },

  // Fin des courses : l'archive et la liste vidée s'enregistrent ensemble
  terminerCourses(entree) {
    const historique = this.historique();
    historique.push(entree);
    this.ecrireLot([["historique", historique], ["liste", this.listeVide()]]);
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

  // Ajoute la recette (ou remplace celle qui a le même id) et met à jour le dictionnaire, ensemble
  enregistrerRecette(recette, dico) {
    const liste = this.recettes();
    const position = liste.findIndex((r) => r.id === recette.id);
    if (position >= 0) {
      liste[position] = recette;
    } else {
      liste.push(recette);
    }
    this.ecrireLot([["recettes", liste], ["dico", dico]]);
  },

  supprimerRecette(id) {
    this.ecrire("recettes", this.recettes().filter((r) => r.id !== id));
  }
};

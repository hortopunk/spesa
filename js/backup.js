// backup.js — sauvegarde et restauration. Isolé et remplaçable (ex. envoi vers Drive en v2).
// Ne touche ni au stockage ni au DOM : app.js lui donne les données et reçoit le résultat.

const Backup = {
  FORMAT: "spesa-sauvegarde-v1",
  JOURS_RAPPEL: 7,

  // Contenu du fichier de sauvegarde
  construire(donnees, dateISO, versionSchema) {
    return { format: this.FORMAT, date: dateISO, version_schema: versionSchema, ...donnees };
  },

  // spesa-sauvegarde-AAAA-MM-JJ.json (date locale)
  nomFichier(dateISO) {
    const d = new Date(dateISO);
    const deux = (n) => String(n).padStart(2, "0");
    return "spesa-sauvegarde-" + d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()) + ".json";
  },

  // Envoie le fichier : menu de partage Android si possible, sinon téléchargement.
  // Renvoie "partage", "telechargement" ou "annule" (l'utilisateur a fermé le menu).
  async envoyer(sauvegarde, nom) {
    const texte = JSON.stringify(sauvegarde, null, 2);
    const fichier = new File([texte], nom, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier], title: nom });
        return "partage";
      } catch (e) {
        if (e.name === "AbortError") return "annule";
        // Autre erreur (ex. partage refusé) : on retombe sur le téléchargement
      }
    }
    this.telecharger(fichier);
    return "telechargement";
  },

  // Téléchargement simple : un lien invisible sur lequel on clique
  telecharger(fichier) {
    const adresse = URL.createObjectURL(fichier);
    const lien = document.createElement("a");
    lien.href = adresse;
    lien.download = fichier.name;
    document.body.append(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 1000);
  },

  // Lit et vérifie le texte d'un fichier de sauvegarde.
  // Renvoie { sauvegarde } ou { erreur: "cle_de_texte" }.
  analyser(texte, versionSchemaApp) {
    let s;
    try {
      s = JSON.parse(texte);
    } catch (e) {
      return { erreur: "erreur_sauvegarde_illisible" };
    }
    if (!s || s.format !== this.FORMAT) return { erreur: "erreur_sauvegarde_format" };
    if (!(s.version_schema <= versionSchemaApp)) return { erreur: "erreur_sauvegarde_version" };
    const recettesValides = Array.isArray(s.recettes) && s.recettes.every((r) => this.recetteValide(r));
    const reste = this.objet(s.dico) && Object.values(s.dico).every((f) =>
        this.objet(f) && typeof f.libelle === "string" && typeof f.rayon === "string") &&
      Array.isArray(s.historique) && s.historique.every((h) => this.archiveValide(h)) &&
      this.objet(s.reglages);
    if (!recettesValides || !reste) return { erreur: "erreur_sauvegarde_contenu" };
    return { sauvegarde: s };
  },

  // --- Vérifications de forme : tout ce que l'appli lit ensuite doit exister ---
  objet(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
  },

  recetteValide(r) {
    return this.objet(r) && typeof r.id === "string" && typeof r.titre === "string" &&
      Number.isFinite(r.parts) && r.parts >= 1 &&
      Array.isArray(r.ingredients) && r.ingredients.every((i) =>
        this.objet(i) && typeof i.nom === "string" && typeof i.unite === "string" &&
        (i.quantite === null || Number.isFinite(i.quantite))) &&
      Array.isArray(r.etapes) && r.etapes.every((e) => typeof e === "string") &&
      typeof r.notes === "string";
  },

  // Une entrée de l'historique : date, recettes (titre, parts) et lignes figées
  archiveValide(h) {
    return this.objet(h) && typeof h.date === "string" &&
      Array.isArray(h.recettes) && h.recettes.every((r) =>
        this.objet(r) && typeof r.titre === "string" && Number.isFinite(r.parts)) &&
      Array.isArray(h.lignes) && h.lignes.every((l) =>
        this.objet(l) && typeof l.libelle === "string" && typeof l.rayon === "string" &&
        typeof l.coche === "boolean" &&
        Array.isArray(l.quantites) && l.quantites.every((q) =>
          this.objet(q) && Number.isFinite(q.quantite) && typeof q.unite === "string"));
  },

  // Faut-il rappeler de sauvegarder ? Renvoie null (non), { jamais: true } ou { jours: n }.
  // `aDesDonnees` : inutile de rappeler si l'appli est encore vide.
  rappel(derniereSauvegarde, maintenant, aDesDonnees) {
    if (!aDesDonnees) return null;
    if (!derniereSauvegarde) return { jamais: true };
    const jours = Math.floor((maintenant - new Date(derniereSauvegarde)) / 86400000);
    return jours > this.JOURS_RAPPEL ? { jours } : null;
  }
};

// langue.js — le « traducteur » de l'appli.
// Le code appelle t("cle") ; le texte vient de langues/<langue>.json.
// Si une clé manque dans la langue choisie, on retombe sur le français.

const Langue = {
  courante: "fr",
  textes: {},      // textes de la langue choisie
  secours: {},     // textes français, utilisés si une clé manque

  // Charge un fichier de langue (renvoie {} s'il est introuvable)
  async charger(code) {
    try {
      const reponse = await fetch("langues/" + code + ".json");
      return await reponse.json();
    } catch (e) {
      return {};
    }
  },

  // Charge le français (secours) puis la langue demandée
  async init(code) {
    this.courante = code || "fr";
    this.secours = await this.charger("fr");
    this.textes = this.courante === "fr" ? this.secours : await this.charger(this.courante);
  },

  // Remplace le texte de tous les éléments marqués data-i18n="cle"
  appliquer() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
  }
};

// Fonction courte utilisée partout dans le code
function t(cle) {
  return Langue.textes[cle] || Langue.secours[cle] || cle;
}

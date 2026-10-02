// ui.js — rendu de l'interface uniquement. Aucune règle métier ici.

const UI = {
  // Affiche l'écran demandé et surligne l'onglet correspondant
  afficherEcran(nom) {
    document.querySelectorAll(".ecran").forEach((ecran) => {
      ecran.hidden = ecran.dataset.ecran !== nom;
    });
    document.querySelectorAll(".onglet").forEach((onglet) => {
      onglet.classList.toggle("actif", onglet.dataset.cible === nom);
    });
  }
};

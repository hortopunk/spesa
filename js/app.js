// app.js — démarrage et événements. Relie db, logic, langue et ui.

// Ce que l'appli « a en tête » à l'écran
const etat = {
  recherche: "",
  ouverteId: null,     // recette affichée en détail
  partsVoulues: 1,     // parts choisies dans le détail (non enregistrées)
  editionId: null      // recette en cours de modification (null = nouvelle)
};

function afficherListe() {
  const filtrees = Logic.filtrerRecettes(DB.recettes(), etat.recherche);
  UI.rendreListe(filtrees, etat.recherche.trim() !== "");
  UI.afficherVueRecettes("liste");
}

function afficherDetail(id) {
  const recette = DB.recette(id);
  if (!recette) return afficherListe();
  etat.ouverteId = id;
  UI.rendreDetail(recette, etat.partsVoulues, Logic.ingredientsPourParts(recette, etat.partsVoulues));
  UI.afficherVueRecettes("detail");
}

// Ouvre une recette avec ses propres parts de départ
function ouvrirRecette(id) {
  const recette = DB.recette(id);
  if (!recette) return afficherListe();
  etat.partsVoulues = recette.parts;
  afficherDetail(id);
}

function afficherFormulaire(id) {
  etat.editionId = id;
  UI.rendreFormulaire(id ? DB.recette(id) : null);
  UI.afficherVueRecettes("form");
}

function enregistrer() {
  const id = etat.editionId || DB.nouvelId();
  const resultat = Logic.construireRecette(UI.lireFormulaire(), id);
  if (resultat.erreur) return UI.afficherErreur(t(resultat.erreur));
  DB.enregistrerRecette(resultat.recette);
  ouvrirRecette(id);
}

// Tous les clics de l'écran Recettes passent par ici (un bouton = un data-action)
function gererClic(evenement) {
  const bouton = evenement.target.closest("[data-action]");
  if (!bouton) return;
  switch (bouton.dataset.action) {
    case "nouvelle": afficherFormulaire(null); break;
    case "ouvrir": ouvrirRecette(bouton.dataset.id); break;
    case "retour": afficherListe(); break;
    case "parts-moins":
      if (etat.partsVoulues > 1) { etat.partsVoulues--; afficherDetail(etat.ouverteId); }
      break;
    case "parts-plus": etat.partsVoulues++; afficherDetail(etat.ouverteId); break;
    case "modifier": afficherFormulaire(etat.ouverteId); break;
    case "supprimer":
      if (confirm(t("confirmer_suppression"))) {
        DB.supprimerRecette(etat.ouverteId);
        afficherListe();
      }
      break;
    case "ajouter-ingredient": UI.ajouterLigneIngredient(); break;
    case "retirer-ingredient": UI.retirerLigneIngredient(bouton); break;
    case "enregistrer": enregistrer(); break;
    case "annuler": etat.editionId ? afficherDetail(etat.editionId) : afficherListe(); break;
  }
}

async function demarrer() {
  DB.init();
  await Langue.init(DB.reglages().langue);
  Langue.appliquer();

  // Navigation du bas
  document.querySelectorAll(".onglet").forEach((onglet) => {
    onglet.addEventListener("click", () => UI.afficherEcran(onglet.dataset.cible));
  });

  // Écran Recettes
  document.getElementById("ecran-recettes").addEventListener("click", gererClic);
  document.getElementById("recherche").addEventListener("input", (e) => {
    etat.recherche = e.target.value;
    afficherListe();
  });

  afficherListe();
}

demarrer();

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
  const recette = id ? DB.recette(id) : null;
  UI.rendreFormulaire(recette, recette ? Logic.ingredientsAvecRayon(recette.ingredients, DB.dico()) : []);
  UI.afficherVueRecettes("form");
}

function enregistrer() {
  const id = etat.editionId || DB.nouvelId();
  const resultat = Logic.construireRecette(UI.lireFormulaire(), id);
  if (resultat.erreur) return UI.afficherErreur(t(resultat.erreur));
  DB.enregistrerRecette(resultat.recette);
  DB.enregistrerDico(Logic.mettreAJourDico(DB.dico(), resultat.rayons));
  ouvrirRecette(id);
}

// Quand on tape un nom d'ingrédient : suggestions + rayon connu
function surSaisieNom(champ) {
  const ligne = champ.closest(".ligne-ingredient");
  const dico = DB.dico();
  UI.rendreSuggestions(ligne, Logic.suggerer(dico, champ.value));
  const fiche = dico[Logic.normaliser(champ.value)];
  UI.proposerRayon(ligne, fiche ? fiche.rayon : null);
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
    case "choisir-suggestion": {
      const ligne = bouton.closest(".ligne-ingredient");
      UI.remplirNom(ligne, bouton.textContent);
      surSaisieNom(ligne.querySelector(".i-nom"));
      break;
    }
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

  // Formulaire : autocomplétion des ingrédients. Les lignes sont recréées à chaque
  // ouverture, donc on écoute le conteneur fixe #vue-form.
  const formulaire = document.getElementById("vue-form");
  formulaire.addEventListener("input", (e) => {
    if (e.target.matches(".i-nom")) surSaisieNom(e.target);
  });
  formulaire.addEventListener("focusout", (e) => {
    if (e.target.matches(".i-nom")) UI.rendreSuggestions(e.target.closest(".ligne-ingredient"), []);
  });
  formulaire.addEventListener("change", (e) => {
    // Rayon choisi à la main : il ne sera plus remis à zéro automatiquement
    if (e.target.matches(".i-rayon")) delete e.target.dataset.auto;
  });

  afficherListe();
}

demarrer();

// app.js — démarrage et événements. Relie db, logic, langue et ui.

// Ce que l'appli « a en tête » à l'écran
const etat = {
  recherche: "",
  ouverteId: null,     // recette affichée en détail
  partsVoulues: 1,     // parts choisies dans le détail (non enregistrées)
  editionId: null,     // recette en cours de modification (null = nouvelle)
  choixRecette: false  // écran Liste : le choix d'une recette à ajouter est déplié
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
    case "ajouter-ingredient": UI.ajouterLigneIngredient(document.getElementById("f-ingredients")); break;
    case "retirer-ingredient": UI.retirerLigneIngredient(bouton); break;
    case "choisir-suggestion": {
      const ligne = bouton.closest(".ligne-ingredient");
      UI.remplirNom(ligne, bouton.textContent);
      surSaisieNom(ligne.querySelector(".i-nom"));
      break;
    }
    case "enregistrer": enregistrer(); break;
    case "annuler": etat.editionId ? afficherDetail(etat.editionId) : afficherListe(); break;

    // Écran Liste
    case "liste-choix-recette": etat.choixRecette = !etat.choixRecette; afficherEcranListe(); break;
    case "liste-ajouter-recette": modifierListe((l) => {
      const recette = DB.recette(bouton.dataset.id);
      if (recette) l.recettes.push({ id: recette.id, parts: recette.parts });
    }); break;
    case "liste-retirer-recette": modifierListe((l) => l.recettes.splice(Number(bouton.dataset.index), 1)); break;
    case "liste-parts-moins": modifierListe((l) => {
      const choix = l.recettes[Number(bouton.dataset.index)];
      if (choix.parts > 1) choix.parts--;
    }); break;
    case "liste-parts-plus": modifierListe((l) => l.recettes[Number(bouton.dataset.index)].parts++); break;
    case "liste-ajouter-article": ajouterArticle(); break;
    case "liste-retirer-article": modifierListe((l) => l.manuels.splice(Number(bouton.dataset.index), 1)); break;
    case "liste-effacer":
      if (confirm(t("confirmer_effacer_liste"))) {
        etat.choixRecette = false;
        modifierListe((l) => { l.recettes = []; l.manuels = []; l.decoches = []; });
      }
      break;
    case "liste-reviser": modifierListe((l) => { l.etat = "revision"; }); break;
    case "revision-retour": modifierListe((l) => { l.etat = "ajouts"; }); break;
    case "revision-valider":
      modifierListe((l) => { l.etat = "courses"; l.coches = []; });
      UI.afficherEcran("courses");
      break;
    case "liste-modifier": modifierListe((l) => { l.etat = "revision"; }); break;
    case "basculer": {
      // Décocher = « je l'ai déjà » : la clé est mémorisée dans `decoches`
      const liste = DB.liste();
      liste.decoches = liste.decoches.filter((cle) => cle !== bouton.dataset.cle);
      if (!bouton.checked) liste.decoches.push(bouton.dataset.cle);
      DB.enregistrerListe(liste);
      break;
    }
  }
}

// --- Liste de courses ---

// Lignes de la liste, fusionnées, rangées par rayon (sans les décochés si `final`)
function groupesDeLaListe(liste, final) {
  let lignes = Logic.fusionner(Logic.lignesDeListe(liste, DB.recettes()), DB.dico());
  if (final) lignes = Logic.retirerDecoches(lignes, liste.decoches);
  return Logic.grouperParRayon(lignes);
}

// Affiche l'écran Liste selon l'étape en cours (ajouts, révision, courses)
function afficherEcranListe() {
  const liste = DB.liste();
  // Une recette supprimée disparaît de la liste
  liste.recettes = liste.recettes.filter((choix) => DB.recette(choix.id));

  if (liste.etat === "revision") {
    const groupes = groupesDeLaListe(liste, false);
    // On oublie les décochés qui ne sont plus dans la liste
    const cles = groupes.flatMap((g) => g.lignes.map((l) => l.cle));
    liste.decoches = liste.decoches.filter((cle) => cles.includes(cle));
    DB.enregistrerListe(liste);
    UI.rendreRevision(groupes, liste.decoches);
  } else if (liste.etat === "courses") {
    DB.enregistrerListe(liste);
    UI.rendreListeValidee();
  } else {
    DB.enregistrerListe(liste);
    const choisies = liste.recettes.map((choix, index) => ({
      index, titre: DB.recette(choix.id).titre, parts: choix.parts
    }));
    const dejaChoisies = liste.recettes.map((choix) => choix.id);
    const disponibles = DB.recettes().filter((r) => !dejaChoisies.includes(r.id));
    UI.rendreAjouts(choisies, disponibles, liste.manuels, etat.choixRecette);
  }
}

// Affiche l'onglet Courses : liste finale rangée par rayon
function afficherEcranCourses() {
  const liste = DB.liste();
  UI.rendreCourses(groupesDeLaListe(liste, true), liste.etat === "courses");
}

// Applique un changement à la liste, l'enregistre et réaffiche
function modifierListe(changement) {
  const liste = DB.liste();
  changement(liste);
  DB.enregistrerListe(liste);
  afficherEcranListe();
  afficherEcranCourses();
}

// Ajoute l'article libre saisi (nom, quantité, unité, rayon) à la liste
function ajouterArticle() {
  const resultat = Logic.construireLigne(UI.lireArticle());
  if (resultat.vide) return UI.afficherErreur(t("erreur_article_vide"), "m-erreur");
  if (resultat.erreur) return UI.afficherErreur(t(resultat.erreur), "m-erreur");
  DB.enregistrerDico(Logic.mettreAJourDico(DB.dico(), [resultat.rayon]));
  modifierListe((l) => l.manuels.push({ ...resultat.ingredient, rayon: resultat.rayon.rayon }));
}

async function demarrer() {
  DB.init();
  await Langue.init(DB.reglages().langue);
  Langue.appliquer();

  // Navigation du bas : on réaffiche l'écran choisi, car ses données ont pu changer
  document.querySelectorAll(".onglet").forEach((onglet) => {
    onglet.addEventListener("click", () => {
      UI.afficherEcran(onglet.dataset.cible);
      if (onglet.dataset.cible === "liste") afficherEcranListe();
      if (onglet.dataset.cible === "courses") afficherEcranCourses();
    });
  });

  // Tous les clics passent par gererClic. Les boutons et lignes sont recréés à chaque
  // affichage, donc on écoute le document (délégation) plutôt que chaque bouton.
  document.addEventListener("click", gererClic);
  document.getElementById("recherche").addEventListener("input", (e) => {
    etat.recherche = e.target.value;
    afficherListe();
  });

  // Lignes d'ingrédient (recette ou article libre) : autocomplétion et rayon
  document.addEventListener("input", (e) => {
    if (e.target.matches(".i-nom")) surSaisieNom(e.target);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.matches(".i-nom")) UI.rendreSuggestions(e.target.closest(".ligne-ingredient"), []);
  });
  document.addEventListener("change", (e) => {
    // Rayon choisi à la main : il ne sera plus remis à zéro automatiquement
    if (e.target.matches(".i-rayon")) delete e.target.dataset.auto;
  });

  afficherListe();
  afficherEcranListe();
  afficherEcranCourses();
}

demarrer();

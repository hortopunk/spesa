// app.js — démarrage et événements. Relie db, logic, langue et ui.

// Ce que l'appli « a en tête » à l'écran
const etat = {
  recherche: "",
  ouverteId: null,     // recette affichée en détail
  partsVoulues: 1,     // parts choisies dans le détail (non enregistrées)
  editionId: null,     // recette en cours de modification (null = nouvelle)
  choixRecette: false, // écran Liste : le choix d'une recette à ajouter est déplié
  courses: { filtre: "tout", recherche: "" },  // mode courses : filtre (tout, a_prendre, pris) et texte cherché
  ajout: { nom: "", quantite: "1", unite: "piece", rayon: "", auto: false },   // écran « Nouvel article » (auto = rayon repris du dictionnaire)
  import: null,        // aperçu de l'import en cours (résultat de Logic.apercuImport)
  feuille: { id: null, parts: 1, dedans: false }   // feuille de parts de l'écran Recettes
};

// Dessine les cartes de recettes sans changer de vue ni remonter l'écran (utile après un ajout rapide)
function redessinerRecettes() {
  const toutes = DB.recettes();
  const filtrees = Logic.filtrerRecettes(toutes, etat.recherche);
  UI.rendreListe(filtrees, etat.recherche.trim() !== "", DB.liste().recettes, toutes.length, etat.recherche);
}

function afficherListe() {
  redessinerRecettes();
  UI.afficherVueRecettes("liste");
}

// Parts de la recette dans la liste de courses, ou null si elle n'y est pas
function partsDansListe(id) {
  const choix = DB.liste().recettes.find((c) => c.id === id);
  return choix ? choix.parts : null;
}

// Ingrédients de la recette ouverte, recalculés pour les parts affichées, avec leur rayon
function lignesDetail(recette) {
  return Logic.ingredientsAvecRayon(Logic.ingredientsPourParts(recette, etat.partsVoulues), DB.dico());
}

function afficherDetail(id) {
  const recette = DB.recette(id);
  if (!recette) return afficherListe();
  etat.ouverteId = id;
  UI.rendreDetail(recette, etat.partsVoulues, lignesDetail(recette), partsDansListe(id));
  UI.afficherVueRecettes("detail");
}

// Met à jour le détail déjà affiché après un changement de parts
function majDetail() {
  const recette = DB.recette(etat.ouverteId);
  if (recette) UI.majDetail(etat.partsVoulues, lignesDetail(recette), partsDansListe(recette.id));
}

// Ouvre une recette : parts de la liste si elle y est, sinon ses propres parts
function ouvrirRecette(id) {
  const recette = DB.recette(id);
  if (!recette) return afficherListe();
  etat.partsVoulues = partsDansListe(id) || recette.parts;
  afficherDetail(id);
}

function afficherFormulaire(id) {
  etat.editionId = id;
  const recette = id ? DB.recette(id) : null;
  UI.rendreFormulaire(recette, recette ? Logic.ingredientsAvecRayon(recette.ingredients, DB.dico()) : []);
  UI.afficherVueRecettes("form");
}

function enregistrer() {
  const saisie = UI.lireFormulaire();
  // Toutes les erreurs d'un coup : contours, messages et carte de résumé (le bouton reste actif)
  const erreurs = Logic.validerRecette(saisie);
  UI.afficherErreursFormulaire(erreurs);
  if (erreurs.length > 0) return;
  const id = etat.editionId || DB.nouvelId();
  const resultat = Logic.construireRecette(saisie, id);
  if (resultat.erreur) return signalerErreur(new Error(resultat.erreur));   // ne devrait pas arriver après la vérification
  DB.enregistrerRecette(resultat.recette, Logic.mettreAJourDico(DB.dico(), resultat.rayons));
  rafraichirBandeau();
  ouvrirRecette(id);
}

// --- Import de recettes (DESIGN.md 7.6) ---

function afficherImport() {
  etat.import = null;
  UI.rendreImport();
  UI.afficherVueRecettes("import");
}

async function copierPrompt() {
  UI.messageImport("");
  try {
    await navigator.clipboard.writeText(t("prompt_import"));
    UI.confirmerCopie(true);
    setTimeout(() => UI.confirmerCopie(false), 2000);
  } catch (e) {
    UI.messageImport(t("prompt_copie_echec"));
  }
}

// Colle le presse-papiers dans la zone de texte (le navigateur peut refuser : on le dit)
async function collerImport() {
  UI.messageImport("");
  try {
    const texte = await navigator.clipboard.readText();
    document.getElementById("import-texte").value = texte;
    analyserImport();
  } catch (e) {
    UI.messageImport(t("coller_echec"));
  }
}

// Relit la zone de texte et met l'aperçu à jour (à chaque saisie, collage ou fichier choisi)
function analyserImport() {
  const texte = document.getElementById("import-texte").value;
  etat.import = Logic.apercuImport(texte, DB.dico(), DB.recettes());
  UI.majApercuImport(etat.import);
}

// « Enregistrer la recette » : enregistre et ouvre le détail. Si le nombre de parts manque,
// on ouvre le formulaire (rempli) pour le demander : on n'invente pas de valeur.
function validerImport() {
  const apercu = etat.import;
  if (!apercu || apercu.vide || apercu.erreur) return;
  if (apercu.partsAbsentes) {
    etat.editionId = null;   // c'est une nouvelle recette
    UI.rendreFormulaire(
      apercu.recette,
      Logic.ingredientsAvecRayon(apercu.recette.ingredients, DB.dico()),
      { titre: t("titre_apercu_import"), avertissements: apercu.avertissements.map((a) => UI.texteAvertissement(a)) }
    );
    UI.afficherVueRecettes("form");
    return;
  }
  const id = DB.nouvelId();
  const dico = DB.dico();
  DB.enregistrerRecette({ ...apercu.recette, id }, Logic.mettreAJourDico(dico, Logic.rayonsImport(apercu.recette.ingredients, dico)));
  rafraichirBandeau();
  etat.import = null;
  ouvrirRecette(id);
}

// Quand on tape un nom d'ingrédient : suggestions + rayon connu
function surSaisieNom(champ) {
  const ligne = champ.closest(".ligne-ingredient, .segment-ingredient");
  const dico = DB.dico();
  const suggestions = Logic.suggerer(dico, champ.value).map((libelle) => {
    const fiche = dico[Logic.normaliser(libelle)];
    return { libelle, rayon: fiche ? fiche.rayon : "autre" };
  });
  UI.rendreSuggestions(ligne, suggestions, champ.value);
  const fiche = dico[Logic.normaliser(champ.value)];
  UI.proposerRayon(ligne, fiche ? fiche.rayon : null);
}

// Message à l'écran quand une écriture échoue (stockage plein) ou qu'une erreur survient
function signalerErreur(erreur) {
  console.error(erreur);
  const plein = erreur && (erreur.name === "QuotaExceededError" || erreur.name === "NS_ERROR_DOM_QUOTA_REACHED");
  UI.afficherAlerte(t(plein ? "erreur_stockage" : "erreur_inattendue"));
}

// --- Annuler une suppression ---
// Après une suppression, un message propose « Annuler » pendant 6 secondes.
// Une seule annulation possible à la fois : la dernière suppression.
let actionDefaire = null;
let minuteurDefaire = null;

function proposerAnnulation(texte, retablir) {
  clearTimeout(minuteurDefaire);
  actionDefaire = retablir;
  UI.afficherAnnulation(texte);
  minuteurDefaire = setTimeout(oublierAnnulation, 6000);
}

function oublierAnnulation() {
  clearTimeout(minuteurDefaire);
  actionDefaire = null;
  UI.cacherAnnulation();
}

function defaire() {
  const retablir = actionDefaire;
  oublierAnnulation();
  if (retablir) retablir();
}

// Tous les clics passent par ici (un bouton = un data-action). Une erreur ne doit jamais
// laisser l'écran figé sans explication.
function gererClic(evenement) {
  const bouton = evenement.target.closest("[data-action]");
  if (!bouton) return;
  if (bouton.getAttribute("aria-disabled") === "true") return;   // bouton désactivé : le clic ne fait rien
  try {
    executerAction(bouton);
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

function executerAction(bouton) {
  switch (bouton.dataset.action) {
    case "nouvelle": afficherFormulaire(null); break;
    case "importer": afficherImport(); break;
    case "import-copier": copierPrompt(); break;
    case "import-coller": collerImport(); break;
    case "import-valider": validerImport(); break;
    case "import-fichier": document.getElementById("fichier-import").click(); break;
    case "annuler-import": afficherListe(); break;
    case "ouvrir": ouvrirRecette(bouton.dataset.id); break;
    case "ajout-rapide": {
      // Ouvre la feuille de parts (n'ajoute pas directement). Valeur de départ : parts déjà choisies, sinon celles de la recette.
      const recette = DB.recette(bouton.dataset.id);
      if (!recette) break;
      const choix = DB.liste().recettes.find((c) => c.id === recette.id);
      etat.feuille = { id: recette.id, parts: choix ? choix.parts : recette.parts, dedans: Boolean(choix) };
      UI.ouvrirFeuilleParts(recette, etat.feuille.parts, etat.feuille.dedans);
      break;
    }
    case "feuille-moins": case "feuille-plus": {
      const suivant = etat.feuille.parts + (bouton.dataset.action === "feuille-plus" ? 1 : -1);
      etat.feuille.parts = Math.min(99, Math.max(1, suivant));   // entre 1 et 99
      UI.majFeuilleParts(etat.feuille.parts);
      break;
    }
    case "feuille-valider": {
      const { id, parts } = etat.feuille;
      UI.fermerFeuille();
      modifierListe((l) => {
        const choix = l.recettes.find((c) => c.id === id);
        if (choix) choix.parts = parts;
        else l.recettes.push({ id, parts });
      });
      redessinerRecettes();
      break;
    }
    case "feuille-retirer": {
      const { id } = etat.feuille;
      UI.fermerFeuille();
      modifierListe((l) => { l.recettes = l.recettes.filter((c) => c.id !== id); });
      redessinerRecettes();
      break;
    }
    case "feuille-annuler": UI.fermerFeuille(); break;
    case "retour": afficherListe(); break;
    case "parts-moins":
      if (etat.partsVoulues > 1) { etat.partsVoulues--; majDetail(); }
      break;
    case "parts-plus":
      if (etat.partsVoulues < 99) { etat.partsVoulues++; majDetail(); }
      break;
    case "detail-liste": {
      // Ajoute à la liste (aux parts affichées), met à jour les parts, ou retire si c'est déjà exactement ça
      const id = etat.ouverteId;
      const dans = partsDansListe(id);
      modifierListe((l) => {
        if (dans === null) l.recettes.push({ id, parts: etat.partsVoulues });
        else if (dans !== etat.partsVoulues) l.recettes.find((c) => c.id === id).parts = etat.partsVoulues;
        else l.recettes = l.recettes.filter((c) => c.id !== id);
      });
      majDetail();
      break;
    }
    case "modifier": afficherFormulaire(etat.ouverteId); break;
    case "supprimer": {
      // Pas de question : on supprime tout de suite et on laisse 6 secondes pour annuler
      const recette = DB.recette(etat.ouverteId);
      if (!recette) break;
      DB.supprimerRecette(recette.id);
      afficherListe();
      proposerAnnulation(t("recette_supprimee"), () => {
        DB.enregistrerRecette(recette, DB.dico());
        redessinerRecettes();
      });
      break;
    }
    case "ajouter-ingredient": {
      const lignes = [...UI.lireIngredients(), UI.ingredientVide()];
      UI.rendreSegmentsIngredients(lignes, lignes.length - 1);
      break;
    }
    case "retirer-ingredient": {
      const lignes = UI.lireIngredients().filter((l, i) => i !== Number(bouton.dataset.index));
      if (lignes.length === 0) lignes.push(UI.ingredientVide());
      UI.rendreSegmentsIngredients(lignes, Math.min(Number(bouton.dataset.index), lignes.length - 1));
      break;
    }
    case "ajouter-etape": {
      const etapes = [...UI.lireEtapes(), ""];
      UI.rendreSegmentsEtapes(etapes, etapes.length - 1);
      break;
    }
    case "retirer-etape": {
      const etapes = UI.lireEtapes().filter((e, i) => i !== Number(bouton.dataset.index));
      UI.rendreSegmentsEtapes(etapes);
      document.querySelector('#vue-form [data-action="ajouter-etape"]').focus();
      break;
    }
    case "form-parts-moins": case "form-parts-plus": {
      const champ = document.getElementById("f-parts");
      const actuel = Logic.lireNombre(champ.value);
      const suivant = (actuel === null ? 0 : Math.floor(actuel)) + (bouton.dataset.action === "form-parts-plus" ? 1 : -1);
      champ.value = Math.min(99, Math.max(1, suivant));   // entre 1 et 99
      if (champ.getAttribute("aria-invalid") === "true") UI.effacerChampFormulaire(champ);
      break;
    }
    case "choisir-suggestion": {
      const ligne = bouton.closest(".ligne-ingredient, .segment-ingredient");
      UI.remplirNom(ligne, bouton.dataset.libelle);
      surSaisieNom(ligne.querySelector(".i-nom"));
      UI.rendreSuggestions(ligne, []);   // choisie : la liste se referme
      ligne.querySelector(".i-nom").focus();
      break;
    }
    case "enregistrer": enregistrer(); break;
    case "annuler": etat.editionId ? afficherDetail(etat.editionId) : afficherListe(); break;

    // Écran Liste
    case "liste-choix-recette": etat.choixRecette = !etat.choixRecette; redessinerListe(); break;
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
    case "aller-reglages": document.querySelector('.onglet[data-cible="reglages"]').click(); break;
    case "confirmation-oui": {
      const suite = suiteConfirmation;
      suiteConfirmation = null;
      UI.fermerFeuille();
      if (suite) suite();
      break;
    }
    case "confirmation-non": suiteConfirmation = null; UI.fermerFeuille(); break;
    case "langue": changerLangue(bouton.dataset.langue); break;
    case "liste-retirer-article": modifierListe((l) => l.manuels.splice(Number(bouton.dataset.index), 1)); break;
    case "liste-effacer": {
      const avant = DB.liste();
      etat.choixRecette = false;
      modifierListe((l) => { l.recettes = []; l.manuels = []; l.decoches = []; });
      proposerAnnulation(t("liste_effacee"), () => {
        DB.enregistrerListe(avant);
        redessinerListe();
      });
      break;
    }
    case "defaire": defaire(); break;
    case "liste-reviser": modifierListe((l) => { l.etat = "revision"; }); break;
    case "revision-retour": modifierListe((l) => { l.etat = "ajouts"; }); break;
    case "revision-valider":
      // Les articles déjà cochés restent cochés (ceux qui ont disparu de la liste sont oubliés)
      etat.courses = { filtre: "tout", recherche: "" };
      modifierListe((l) => { l.etat = "courses"; l.coches = Logic.garderCoches(l.coches, groupesDeLaListe(l, true)); });
      window.scrollTo(0, 0);
      break;
    case "liste-modifier": modifierListe((l) => { l.etat = "revision"; }); window.scrollTo(0, 0); break;
    case "cocher": {
      // Mode courses : article dans le caddie ou non (pas de nouveau dessin, pour ne pas faire sauter l'écran)
      const liste = DB.liste();
      const coche = bouton.getAttribute("aria-pressed") !== "true";   // la case est un bouton à bascule
      liste.coches = liste.coches.filter((cle) => cle !== bouton.dataset.cle);
      if (coche) liste.coches.push(bouton.dataset.cle);
      DB.enregistrerListe(liste);
      UI.majEtatCarte(bouton, coche);
      // Avec un filtre actif, l'article coché change de liste : on redessine les cartes
      if (etat.courses.filtre !== "tout") redessinerCartesCourses();
      else {
        const compte = Logic.compterCoches(groupesDeLaListe(liste, true), liste.coches);
        UI.majResume(compte.coches, compte.total);
      }
      break;
    }
    case "courses-filtre":
      etat.courses.filtre = bouton.dataset.filtre;
      redessinerCartesCourses();
      break;
    case "courses-ouvrir-ajout": ouvrirAjout(); break;

    // Écran « Nouvel article »
    case "ajout-retour": UI.afficherVueListe("panier"); break;
    case "ajout-moins": case "ajout-plus": {
      const n = Logic.lireNombre(etat.ajout.quantite) || 0;
      const suivant = bouton.dataset.action === "ajout-plus" ? n + 1 : Math.max(1, n - 1);
      etat.ajout.quantite = Logic.formaterNombre(suivant);
      majAjout();
      break;
    }
    case "ajout-unite": etat.ajout.unite = bouton.dataset.unite; majAjout(); break;
    case "ajout-rayon": etat.ajout.rayon = bouton.dataset.rayon; etat.ajout.auto = false; UI.effacerErreurAjout("rayon"); majAjout(); break;
    case "ajout-suggestion":
      document.getElementById("ajout-nom").value = bouton.textContent;
      surSaisieAjout(bouton.textContent);
      break;
    case "ajout-valider":
      if (ajoutValide() && enregistrerArticle(etat.ajout, "ajout-erreur")) UI.afficherVueListe("panier");
      break;
    case "terminer-courses": terminerCourses(); break;

    // Historique
    case "historique-ouvrir": afficherHistorique(); break;
    case "historique-detail": afficherArchive(Number(bouton.dataset.index)); break;
    case "historique-retour": afficherHistorique(); break;
    case "historique-fermer": UI.afficherVueListe("panier"); break;

    // Sauvegarde
    case "sauvegarder": sauvegarder(); break;
    case "annuler-restauration": annulerRestauration(); break;
    case "fermer-alerte": UI.fermerAlerte(); break;
    case "restaurer": document.getElementById("fichier-restauration").click(); break;
    case "basculer": {
      // « Déjà à la maison » : la clé est mémorisée dans `decoches` (la carte passe en sombre)
      const liste = DB.liste();
      const maison = bouton.getAttribute("aria-pressed") !== "true";   // la case est un bouton à bascule
      liste.decoches = liste.decoches.filter((cle) => cle !== bouton.dataset.cle);
      if (maison) liste.decoches.push(bouton.dataset.cle);
      DB.enregistrerListe(liste);
      UI.majEtatCarte(bouton, maison);
      break;
    }
  }
}

// --- Liste de courses ---

// Redessine seulement les cartes du mode courses (filtre ou recherche changés)
function redessinerCartesCourses() {
  const liste = DB.liste();
  UI.majZoneCourses(groupesDeLaListe(liste, true), liste.coches, etat.courses);
}

// Lignes de la liste, fusionnées, rangées par rayon (sans les décochés si `final`)
function groupesDeLaListe(liste, final) {
  let lignes = Logic.fusionner(Logic.lignesDeListe(liste, DB.recettes()), DB.dico());
  if (final) lignes = Logic.retirerDecoches(lignes, liste.decoches);
  return Logic.grouperParRayon(lignes);
}

// Affiche l'écran Liste selon l'étape en cours (ajouts, révision, courses)
function afficherEcranListe() {
  const liste = DB.liste();
  const avant = JSON.stringify(liste);
  // Une recette supprimée disparaît de la liste
  liste.recettes = liste.recettes.filter((choix) => DB.recette(choix.id));

  if (liste.etat === "revision") {
    const groupes = groupesDeLaListe(liste, false);
    // On oublie les décochés qui ne sont plus dans la liste
    const cles = groupes.flatMap((g) => g.lignes.map((l) => l.cle));
    liste.decoches = liste.decoches.filter((cle) => cles.includes(cle));
    enregistrerSiChange(liste, avant);
    UI.rendreRevision(groupes, liste.decoches);
  } else if (liste.etat === "courses") {
    enregistrerSiChange(liste, avant);
    const groupes = groupesDeLaListe(liste, true);
    UI.rendreCourses(groupes, liste.coches, etat.courses);
  } else {
    enregistrerSiChange(liste, avant);
    const choisies = liste.recettes.map((choix, index) => ({
      index, titre: DB.recette(choix.id).titre, parts: choix.parts
    }));
    const dejaChoisies = liste.recettes.map((choix) => choix.id);
    const disponibles = DB.recettes().filter((r) => !dejaChoisies.includes(r.id));
    UI.rendreAjouts(choisies, disponibles, liste.manuels, etat.choixRecette);
  }
}

// N'écrit dans le stockage que si la liste a vraiment changé (afficher un écran n'est pas une raison d'écrire)
function enregistrerSiChange(liste, avant) {
  if (JSON.stringify(liste) !== avant) DB.enregistrerListe(liste);
}

function redessinerListe() {
  afficherEcranListe();
}

// --- Sauvegarde et restauration (le travail est dans backup.js) ---

// "2 octobre 2026" à partir d'une date enregistrée
function formaterDate(dateISO) {
  return new Date(dateISO).toLocaleDateString(Langue.courante, { day: "numeric", month: "long", year: "numeric" });
}

function textePhraseSauvegarde() {
  const date = DB.reglages().derniere_sauvegarde;
  if (!date) return t("derniere_sauvegarde_jamais");
  return t("derniere_sauvegarde").replace("{date}", formaterDate(date));
}

// --- Historique ---

// Liste des courses terminées, de la plus récente à la plus ancienne
function afficherHistorique() {
  const entrees = DB.historique()
    .map((archive, index) => {
      const nb = archive.lignes.length;
      const articles = nb + " " + (nb > 1 ? t("articles") : t("article"));
      const titres = archive.recettes.map((r) => r.titre).join(", ");
      return { index, date: formaterDate(archive.date), nombre: nb, resume: titres ? titres + " · " + articles : articles };
    })
    .reverse();
  UI.rendreHistorique(entrees);
  UI.afficherVueListe("historique");
}

function afficherArchive(index) {
  const archive = DB.historique()[index];
  if (!archive) return afficherHistorique();
  UI.rendreDetailHistorique(archive, formaterDate(archive.date), Logic.grouperParRayon(archive.lignes));
}

function afficherReglages() {
  const secours = DB.secours();
  const texteSecours = secours ? t("secours_info").replace("{date}", formaterDate(secours.date)) : null;
  UI.rendreReglages(textePhraseSauvegarde(), texteSecours, Langue.courante);
}

// Affiche ou cache le bandeau « pense à sauvegarder »
function rafraichirBandeau() {
  const aDesDonnees = DB.recettes().length > 0 || DB.historique().length > 0;
  const rappel = Backup.rappel(DB.reglages().derniere_sauvegarde, new Date(), aDesDonnees);
  if (rappel === null) return UI.afficherBandeau(null);
  UI.afficherBandeau(rappel.jamais ? t("rappel_jamais") : t("rappel_jours").replace("{n}", rappel.jours));
}

async function sauvegarder() {
  try {
    const date = new Date().toISOString();
    const fichier = Backup.construire(DB.exporterTout(), date, DB.VERSION_SCHEMA);
    const resultat = await Backup.envoyer(fichier, Backup.nomFichier(date));
    if (resultat === "annule") return;   // menu de partage fermé : rien n'a été sauvegardé
    DB.marquerSauvegarde(date);
    rafraichirBandeau();
    afficherReglages();
    UI.messageReglages(t(resultat === "partage" ? "sauvegarde_envoyee" : "sauvegarde_telechargee"), false);
  } catch (erreur) {
    signalerErreur(erreur);
  }
}

// Réaffiche tous les écrans après un changement massif des données
function toutRedessiner() {
  afficherListe();
  afficherEcranListe();
  rafraichirBandeau();
  afficherReglages();
}

// Met à niveau (schéma actuel) des données venant d'une sauvegarde ou d'une copie de secours.
// Idempotent : des données déjà à jour ne changent pas.
function mettreAJourSauvegarde(s) {
  const m = Logic.migrerRayons({ dico: s.dico, historique: s.historique });
  s.dico = m.dico;
  s.historique = m.historique;
  s.reglages.version_schema = DB.VERSION_SCHEMA;
}

async function restaurer(fichier) {
  const resultat = Backup.analyser(await fichier.text(), DB.VERSION_SCHEMA);
  if (resultat.erreur) return UI.messageReglages(t(resultat.erreur), true);
  const s = resultat.sauvegarde;
  demanderConfirmation({
    titre: t("titre_confirmer_restauration"),
    texte: t("confirmer_restauration").replace("{n}", s.recettes.length),
    confirmer: t("restaurer_bouton")
  }, () => appliquerRestauration(s));
}

function appliquerRestauration(s) {
  // Réglages complétés si le fichier est incomplet ; la date de sauvegarde = celle du fichier
  s.reglages.langue = s.reglages.langue || "fr";
  mettreAJourSauvegarde(s);
  s.reglages.derniere_sauvegarde = isNaN(new Date(s.date)) ? null : s.date;
  try {
    DB.garderSecours(new Date().toISOString());   // copie des données actuelles pour pouvoir annuler
    DB.remplacerTout(s);                          // tout ou rien
  } catch (erreur) {
    return signalerErreur(erreur);
  }
  toutRedessiner();
  UI.messageReglages(t("sauvegarde_restauree").replace("{n}", s.recettes.length), false);
}

// Remet les données d'avant la dernière restauration
function annulerRestauration() {
  const secours = DB.secours();
  if (!secours) return;
  demanderConfirmation({
    titre: t("titre_confirmer_annuler_restauration"), texte: t("confirmer_annuler_restauration"), confirmer: t("revenir_bouton")
  }, () => {
    mettreAJourSauvegarde(secours);   // une copie faite par une ancienne version peut être au schéma 1
    DB.remplacerTout(secours);
    DB.supprimerSecours();
    toutRedessiner();
    UI.messageReglages(t("restauration_annulee"), false);
  });
}

// Termine les courses : archive la liste dans l'historique, puis repart d'une liste vide
function terminerCourses() {
  const liste = DB.liste();
  const groupes = groupesDeLaListe(liste, true);
  const compte = Logic.compterCoches(groupes, liste.coches);
  const reste = compte.total - compte.coches;
  demanderConfirmation({
    titre: t("titre_confirmer_terminer"),
    texte: reste > 0 ? t("terminer_texte_reste").replace("{n}", reste) : t("terminer_texte"),
    confirmer: t("terminer_courses")
  }, () => {
    DB.terminerCourses(Logic.construireArchive(liste, DB.recettes(), groupes, new Date().toISOString()));
    etat.choixRecette = false;
    afficherEcranListe();
    UI.afficherEcran("liste");
    rafraichirBandeau();
    // Fin des courses : bon moment pour sauvegarder (l'historique vient de changer)
    demanderConfirmation({
      titre: t("titre_proposer_sauvegarde"), texte: t("proposer_sauvegarde"), confirmer: t("sauvegarder"), annuler: t("plus_tard")
    }, sauvegarder);
  });
}

// --- Feuilles de confirmation (à la place des fenêtres du navigateur) ---
// `suiteConfirmation` : ce qu'on fait si la personne confirme (oubliée si elle annule ou appuie sur Échap)
let suiteConfirmation = null;
function demanderConfirmation(options, suite) {
  suiteConfirmation = suite;
  UI.ouvrirConfirmation(options);
}

// Changement de langue (Réglages) : on recharge les textes puis on redessine tous les écrans
async function changerLangue(code) {
  if (code === Langue.courante) return;
  const reglages = DB.reglages();
  reglages.langue = code;
  try {
    DB.ecrire("reglages", reglages);
  } catch (erreur) {
    return signalerErreur(erreur);
  }
  await Langue.init(code);
  Langue.appliquer();
  document.documentElement.lang = code;
  document.getElementById("vue-liste").replaceChildren();   // la coque de la liste des recettes est dessinée une seule fois : on la refait
  toutRedessiner();
}

// Applique un changement à la liste, l'enregistre et réaffiche.
function modifierListe(changement) {
  const liste = DB.liste();
  changement(liste);
  DB.enregistrerListe(liste);
  afficherEcranListe();
}

// Ajoute l'article libre saisi (nom, quantité, unité, rayon) à la liste.
// `conteneur` et `idErreur` : la ligne de saisie et son message d'erreur (écran Liste ou Courses).


// Ouvre l'écran « Nouvel article », vide
function ouvrirAjout() {
  etat.ajout = { nom: "", quantite: "1", unite: "piece", rayon: "", auto: false };
  UI.rendreAjout(etat.ajout);
  UI.afficherVueListe("ajout");
  document.getElementById("ajout-nom").focus();
}

// Vérifie les trois champs de l'écran Ajout ; affiche toutes les erreurs d'un coup. Renvoie true si tout est bon.
function ajoutValide() {
  const a = etat.ajout;
  const erreurs = [];
  if (a.nom.trim() === "") erreurs.push({ champ: "nom", message: t("erreur_article_vide") });
  if (a.quantite.trim() !== "" && Logic.lireNombre(a.quantite.trim()) === null) erreurs.push({ champ: "quantite", message: t("erreur_ajout_quantite") });
  if (!Logic.RAYONS.includes(a.rayon)) erreurs.push({ champ: "rayon", message: t("erreur_ajout_rayon") });
  if (erreurs.length === 0) return true;
  UI.afficherErreursAjout(erreurs);
  return false;
}

// Rafraîchit l'écran Ajout : suggestions du dictionnaire selon le nom tapé
function majAjout() {
  UI.majAjout(etat.ajout, Logic.suggerer(DB.dico(), etat.ajout.nom));
}

// Le nom a changé : le rayon connu du dictionnaire est proposé (tant qu'on ne l'a pas choisi à la main)
function surSaisieAjout(nom) {
  etat.ajout.nom = nom;
  UI.effacerErreurAjout("nom");
  const fiche = DB.dico()[Logic.normaliser(nom)];
  if (fiche) {
    etat.ajout.rayon = fiche.rayon;
    etat.ajout.auto = true;
  } else if (etat.ajout.auto) {
    etat.ajout.rayon = "";
    etat.ajout.auto = false;
  }
  majAjout();
}

// Ajoute un article libre { nom, quantite, unite, rayon } (texte saisi) à la liste. Renvoie true si c'est fait.
function enregistrerArticle(saisie, idErreur) {
  const resultat = Logic.construireLigne(saisie);
  if (resultat.vide || saisie.nom.trim() === "") { UI.afficherErreur(t("erreur_article_vide"), idErreur); return false; }
  if (resultat.erreur) { UI.afficherErreur(t(resultat.erreur), idErreur); return false; }
  const liste = DB.liste();
  liste.manuels.push({ ...resultat.ingredient, rayon: resultat.rayon.rayon });
  // Un article ajouté doit apparaître et être à acheter : ni décoché ni déjà dans le caddie
  const cle = Logic.normaliser(resultat.ingredient.nom);
  liste.decoches = liste.decoches.filter((c) => c !== cle);
  liste.coches = liste.coches.filter((c) => c !== cle);
  DB.enregistrerDicoEtListe(Logic.mettreAJourDico(DB.dico(), [resultat.rayon]), liste);
  afficherEcranListe();
  return true;
}

// Hors-ligne et stockage durable (voir service-worker.js)
function demarrerPWA() {
  // Demande au navigateur de ne pas vider nos données quand il manque de place
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

  if (!("serviceWorker" in navigator)) return;
  // Sur ton PC (localhost), pas de cache : tu vois chaque modification tout de suite.
  // Pour tester le hors-ligne en local, ouvrir http://localhost:8080/?sw
  const enLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (enLocal && !location.search.includes("sw")) {
    navigator.serviceWorker.getRegistrations().then((liste) => liste.forEach((r) => r.unregister()));
    caches.keys().then((noms) => noms.forEach((n) => caches.delete(n)));
    return;
  }
  navigator.serviceWorker.register("service-worker.js")
    .catch((erreur) => console.warn("Hors-ligne indisponible :", erreur));
}

// Mode développement : sur le PC (localhost), si le fichier dev/donnees.json existe, il remplace les
// données du navigateur à chaque chargement de la page. Ce fichier n'est jamais publié (voir .git/info/exclude),
// donc le téléphone et GitHub Pages ne le voient pas. `?sans-dev` dans l'adresse = on garde les données du navigateur.
// Renvoie true si les données ont été chargées.
async function chargerDonneesDev() {
  const enLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!enLocal || location.search.includes("sans-dev")) return false;
  try {
    const reponse = await fetch("dev/donnees.json", { cache: "no-store" });
    if (!reponse.ok) return false;
    const brut = await reponse.text();
    const resultat = Backup.analyser(brut, DB.VERSION_SCHEMA);
    if (resultat.erreur) {
      console.warn("dev/donnees.json refusé :", resultat.erreur);
      return false;
    }
    // La liste en cours (facultative) n'est pas vérifiée par Backup : db.js s'en charge
    DB.chargerDonneesDev({ ...resultat.sauvegarde, liste: JSON.parse(brut).liste });
    return true;
  } catch (erreur) {
    console.warn("dev/donnees.json illisible :", erreur);
    return false;
  }
}

async function demarrer() {
  demarrerPWA();
  const donneesDev = await chargerDonneesDev();
  DB.init();
  // Schéma 1 -> 2 (fruits / légumes) : copie de sécurité puis écriture en tout-ou-rien.
  // En cas d'échec les données restent intactes ; on prévient et on réessaiera au prochain lancement.
  let migrationImpossible = false;
  try {
    DB.migrerSchema((donnees) => Logic.migrerRayons(donnees));
  } catch (erreur) {
    migrationImpossible = true;
  }
  await Langue.init(DB.reglages().langue);
  Langue.appliquer();
  document.documentElement.lang = Langue.courante;

  // Navigation du bas : on réaffiche l'écran choisi, car ses données ont pu changer
  document.querySelectorAll(".onglet").forEach((onglet) => {
    onglet.addEventListener("click", () => {
      UI.afficherEcran(onglet.dataset.cible);
      if (onglet.dataset.cible === "recettes") redessinerRecettes();   // les ✓ suivent la liste en cours
      if (onglet.dataset.cible === "liste") {
        UI.afficherVueListe("panier");   // on revient toujours à la liste en cours
        afficherEcranListe();
      }
      if (onglet.dataset.cible === "reglages") afficherReglages();
      rafraichirBandeau();
    });
  });

  // Import : fichier choisi dans le sélecteur caché, lu puis analysé tout de suite
  const champImport = document.getElementById("fichier-import");
  champImport.addEventListener("change", async () => {
    const fichier = champImport.files[0];
    champImport.value = "";
    if (fichier) {
      document.getElementById("import-texte").value = await fichier.text();
      analyserImport();
    }
  });

  // Restauration : fichier choisi dans le sélecteur caché
  const champFichier = document.getElementById("fichier-restauration");
  champFichier.addEventListener("change", () => {
    if (champFichier.files[0]) restaurer(champFichier.files[0]);
    champFichier.value = "";   // permet de rechoisir le même fichier ensuite
  });

  // Tous les clics passent par gererClic. Les boutons et lignes sont recréés à chaque
  // affichage, donc on écoute le document (délégation) plutôt que chaque bouton.
  document.addEventListener("click", gererClic);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { suiteConfirmation = null; UI.fermerFeuille(); }   // Échap = annuler
  });

  // Lignes d'ingrédient (recette ou article libre) : autocomplétion et rayon
  document.addEventListener("input", (e) => {
    if (e.target.matches(".i-nom")) surSaisieNom(e.target);
    // Formulaire : une erreur s'efface dès que le champ est corrigé ; l'étape grandit avec son texte
    if (e.target.closest("#vue-form") && e.target.getAttribute("aria-invalid") === "true") UI.effacerChampFormulaire(e.target);
    if (e.target.matches(".i-etape")) UI.ajusterZone(e.target);
    if (e.target.id === "import-texte") analyserImport();
    if (e.target.id === "recherche") {
      etat.recherche = e.target.value;
      redessinerRecettes();   // seules les cartes sont redessinées : le champ garde le focus
    }
    if (e.target.id === "ajout-nom") surSaisieAjout(e.target.value);
    if (e.target.id === "ajout-quantite") { etat.ajout.quantite = e.target.value; UI.effacerErreurAjout("quantite"); majAjout(); }
    if (e.target.id === "recherche-courses") {
      etat.courses.recherche = e.target.value;
      redessinerCartesCourses();
    }
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.matches(".i-nom")) UI.rendreSuggestions(e.target.closest(".ligne-ingredient, .segment-ingredient"), []);
  });
  document.addEventListener("change", (e) => {
    // Rayon choisi à la main : il ne sera plus remis à zéro automatiquement
    if (e.target.matches(".i-rayon")) {
      delete e.target.dataset.auto;
      majVignetteRayon(e.target);
      if (e.target.getAttribute("aria-invalid") === "true") UI.effacerChampFormulaire(e.target);
    }
  });

  afficherListe();
  afficherEcranListe();
  afficherReglages();
  rafraichirBandeau();
  // Des données illisibles ont été mises de côté pendant le démarrage : on le dit
  if (DB.anomalies.length > 0) UI.afficherAlerte(t("alerte_donnees_abimees"));
  if (donneesDev) UI.afficherAlerte(t("alerte_mode_dev"));
  if (migrationImpossible) UI.afficherAlerte(t("alerte_migration_impossible"));
}

demarrer();

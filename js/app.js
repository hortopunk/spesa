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
  rafraichirBandeau();
  ouvrirRecette(id);
}

// --- Import de recettes ---

function afficherImport() {
  UI.rendreImport();
  UI.afficherVueRecettes("import");
}

async function copierPrompt() {
  try {
    await navigator.clipboard.writeText(t("prompt_import"));
    UI.messageImport(t("prompt_copie"), false);
  } catch (e) {
    UI.deplierPrompt();
    UI.messageImport(t("prompt_copie_echec"), true);
  }
}

// Vérifie le texte importé. S'il est bon, il s'affiche dans le formulaire de recette,
// qui sert d'aperçu : on relit, on corrige, on choisit les rayons inconnus, puis on enregistre.
function analyserImport(texte) {
  const resultat = Logic.lireRecetteImportee(texte);
  if (resultat.erreur) {
    return UI.messageImport(t(resultat.erreur).replace("{detail}", resultat.detail || ""), true);
  }
  const avertissements = resultat.partsAbsentes
    ? [t("avertissement_parts"), ...resultat.avertissements]
    : resultat.avertissements;
  etat.editionId = null;   // c'est une nouvelle recette
  UI.rendreFormulaire(
    resultat.recette,
    Logic.ingredientsAvecRayon(resultat.recette.ingredients, DB.dico()),
    { titre: t("titre_apercu_import"), avertissements }
  );
  UI.afficherVueRecettes("form");
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
    case "importer": afficherImport(); break;
    case "import-copier": copierPrompt(); break;
    case "import-apercu": analyserImport(document.getElementById("import-texte").value); break;
    case "import-fichier": document.getElementById("fichier-import").click(); break;
    case "annuler-import": afficherListe(); break;
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
    case "cocher": {
      // Mode courses : article dans le caddie ou non (pas de nouveau dessin, pour ne pas faire sauter l'écran)
      const liste = DB.liste();
      liste.coches = liste.coches.filter((cle) => cle !== bouton.dataset.cle);
      if (bouton.checked) liste.coches.push(bouton.dataset.cle);
      DB.enregistrerListe(liste);
      const compte = Logic.compterCoches(groupesDeLaListe(liste, true), liste.coches);
      UI.majCompteur(compte.coches, compte.total);
      break;
    }
    case "terminer-courses": terminerCourses(); break;

    // Historique
    case "historique-ouvrir": afficherHistorique(); break;
    case "historique-detail": afficherArchive(Number(bouton.dataset.index)); break;
    case "historique-retour": afficherHistorique(); break;
    case "historique-fermer": UI.afficherVueCourses("courses"); break;

    // Sauvegarde
    case "sauvegarder": sauvegarder(); break;
    case "restaurer": document.getElementById("fichier-restauration").click(); break;
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
  const groupes = groupesDeLaListe(liste, true);
  UI.rendreCourses(groupes, liste.etat === "courses", liste.coches);
  const compte = Logic.compterCoches(groupes, liste.coches);
  UI.majCompteur(compte.coches, compte.total);
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
      return { index, date: formaterDate(archive.date), resume: titres ? titres + " · " + articles : articles };
    })
    .reverse();
  UI.rendreHistorique(entrees);
  UI.afficherVueCourses("historique");
}

function afficherArchive(index) {
  const archive = DB.historique()[index];
  if (!archive) return afficherHistorique();
  UI.rendreDetailHistorique(archive, formaterDate(archive.date), Logic.grouperParRayon(archive.lignes));
}

function afficherReglages() {
  UI.rendreReglages(textePhraseSauvegarde());
}

// Affiche ou cache le bandeau « pense à sauvegarder »
function rafraichirBandeau() {
  const aDesDonnees = DB.recettes().length > 0 || DB.historique().length > 0;
  const rappel = Backup.rappel(DB.reglages().derniere_sauvegarde, new Date(), aDesDonnees);
  if (rappel === null) return UI.afficherBandeau(null);
  UI.afficherBandeau(rappel.jamais ? t("rappel_jamais") : t("rappel_jours").replace("{n}", rappel.jours));
}

async function sauvegarder() {
  const date = new Date().toISOString();
  const fichier = Backup.construire(DB.exporterTout(), date, DB.VERSION_SCHEMA);
  const resultat = await Backup.envoyer(fichier, Backup.nomFichier(date));
  if (resultat === "annule") return;   // menu de partage fermé : rien n'a été sauvegardé
  DB.marquerSauvegarde(date);
  rafraichirBandeau();
  afficherReglages();
  UI.messageReglages(t(resultat === "partage" ? "sauvegarde_envoyee" : "sauvegarde_telechargee"), false);
}

async function restaurer(fichier) {
  const resultat = Backup.analyser(await fichier.text(), DB.VERSION_SCHEMA);
  if (resultat.erreur) return UI.messageReglages(t(resultat.erreur), true);
  const s = resultat.sauvegarde;
  if (!confirm(t("confirmer_restauration").replace("{n}", s.recettes.length))) return;
  // Réglages complétés si le fichier est incomplet ; la date de sauvegarde = celle du fichier
  s.reglages.langue = s.reglages.langue || "fr";
  s.reglages.version_schema = s.reglages.version_schema || DB.VERSION_SCHEMA;
  s.reglages.derniere_sauvegarde = isNaN(new Date(s.date)) ? null : s.date;
  DB.remplacerTout(s);
  afficherListe();
  afficherEcranListe();
  afficherEcranCourses();
  rafraichirBandeau();
  afficherReglages();
  UI.messageReglages(t("sauvegarde_restauree").replace("{n}", s.recettes.length), false);
}

// Termine les courses : archive la liste dans l'historique, puis repart d'une liste vide
function terminerCourses() {
  const liste = DB.liste();
  const groupes = groupesDeLaListe(liste, true);
  const compte = Logic.compterCoches(groupes, liste.coches);
  const reste = compte.total - compte.coches;
  const question = reste > 0
    ? t("confirmer_terminer_reste").replace("{n}", reste)
    : t("confirmer_terminer");
  if (!confirm(question)) return;
  DB.ajouterHistorique(Logic.construireArchive(liste, DB.recettes(), groupes, new Date().toISOString()));
  DB.enregistrerListe(DB.listeVide());
  etat.choixRecette = false;
  afficherEcranListe();
  afficherEcranCourses();
  UI.afficherEcran("liste");
  rafraichirBandeau();
  // Fin des courses : bon moment pour sauvegarder (l'historique vient de changer)
  if (confirm(t("proposer_sauvegarde"))) sauvegarder();
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

async function demarrer() {
  demarrerPWA();
  DB.init();
  await Langue.init(DB.reglages().langue);
  Langue.appliquer();

  // Navigation du bas : on réaffiche l'écran choisi, car ses données ont pu changer
  document.querySelectorAll(".onglet").forEach((onglet) => {
    onglet.addEventListener("click", () => {
      UI.afficherEcran(onglet.dataset.cible);
      if (onglet.dataset.cible === "liste") afficherEcranListe();
      if (onglet.dataset.cible === "courses") {
        UI.afficherVueCourses("courses");   // on revient toujours à la liste en cours
        afficherEcranCourses();
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
    if (fichier) analyserImport(await fichier.text());
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
  afficherReglages();
  rafraichirBandeau();
}

demarrer();

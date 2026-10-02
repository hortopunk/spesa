// app.js — démarrage et événements. Relie langue, ui (et plus tard db, logic).

async function demarrer() {
  // Langue : français pour l'instant (le réglage viendra avec db.js, étape 2)
  await Langue.init("fr");
  Langue.appliquer();

  // Un clic sur un onglet change d'écran
  document.querySelectorAll(".onglet").forEach((onglet) => {
    onglet.addEventListener("click", () => UI.afficherEcran(onglet.dataset.cible));
  });
}

demarrer();

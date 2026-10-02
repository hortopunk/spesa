// Contrôles sur les fichiers de l'appli : ce qui doit rester cohérent même sans toucher à la logique.
// Lancer depuis le dossier du projet :  node --test tests/

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..");
const lire = (f) => fs.readFileSync(path.join(racine, f), "utf8");
const fichiersDe = (dossier) => fs.readdirSync(path.join(racine, dossier)).map((f) => dossier + "/" + f);

// --- Cache hors-ligne (service-worker.js) ---

const liste = eval(lire("service-worker.js").match(/const FICHIERS = (\[[\s\S]*?\]);/)[1]);

test("service worker : chaque fichier de la liste existe (sinon l'installation échoue)", () => {
  const manquants = liste.filter((f) => f !== "./" && !fs.existsSync(path.join(racine, f)));
  assert.deepEqual(manquants, []);
});

test("service worker : aucun fichier de l'appli oublié dans la liste", () => {
  const reels = [...fichiersDe("js"), ...fichiersDe("css"), ...fichiersDe("langues"), ...fichiersDe("icons"), "index.html", "manifest.json"];
  assert.deepEqual(reels.filter((f) => !liste.includes(f)), []);
});

test("index.html : chaque script appelé existe et figure dans le cache", () => {
  const scripts = [...lire("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0);
  scripts.forEach((s) => {
    assert.ok(fs.existsSync(path.join(racine, s)), s + " introuvable");
    assert.ok(liste.includes(s), s + " absent de la liste du cache");
  });
});

test("manifest.json : valide, icônes présentes", () => {
  const m = JSON.parse(lire("manifest.json"));
  assert.equal(m.display, "standalone");
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(racine, i.src)), i.src + " introuvable"));
});

// --- Textes de l'interface (langues/fr.json) ---

const fr = JSON.parse(lire("langues/fr.json"));
const code = ["js/app.js", "js/ui.js", "js/logic.js", "js/backup.js"].map(lire).join("\n") + lire("index.html");

test("fr.json : toute clé utilisée dans le code existe", () => {
  const utilisees = new Set();
  for (const m of code.matchAll(/\bt\("([a-z_0-9]+)"\)/g)) utilisees.add(m[1]);            // t("cle")
  for (const m of code.matchAll(/data-i18n(?:-placeholder)?="([a-z_0-9]+)"/g)) utilisees.add(m[1]);   // HTML
  for (const m of code.matchAll(/"(erreur_[a-z_0-9]+)"/g)) utilisees.add(m[1]);            // erreurs renvoyées par la logique
  const absentes = [...utilisees].filter((k) => !(k in fr));
  assert.deepEqual(absentes, []);
});

test("fr.json : clés construites (rayons et unités) toutes définies", () => {
  const Logic = new Function(lire("js/logic.js") + "\nreturn Logic;")();
  const manquantes = [
    ...Logic.RAYONS.map((r) => "rayon_" + r),
    ...Logic.UNITES.map((u) => "unite_" + u)
  ].filter((k) => !(k in fr));
  assert.deepEqual(manquantes, []);
});

test("co.json : valide (peut rester vide)", () => {
  assert.doesNotThrow(() => JSON.parse(lire("langues/co.json")));
});

// --- Règle : aucun texte visible en dur dans index.html ---

test("index.html : aucun texte visible en dur (tout passe par data-i18n)", () => {
  const html = lire("index.html").replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<title>[\s\S]*?<\/title>/, "");
  const textes = [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter((t) => t !== "");
  assert.deepEqual(textes, []);
});

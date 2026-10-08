// Contrôles du design (design/DESIGN.md) : palette fermée, contrastes, interdits (ombres, dégradés).
// Lancer depuis le dossier du projet :  node --test

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");

// --- Jetons de couleur (blocs :root) ---
const jetons = {};
for (const bloc of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
  for (const m of bloc[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) jetons[m[1]] = m[2].toLowerCase();
}

// Contraste WCAG 2 entre deux couleurs #rrggbb
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test("palette : 9 teintes + 4 couleurs de vignette, rien d'autre", () => {
  const attendues = ["#000000", "#ededed", "#4a4a4a", "#bdbdbd", "#1a1a1a", "#8fd9e8", "#ffd84a", "#a8d26b", "#ff8a3d",
    "#e5484d", "#e8788a", "#8fa3b8", "#f7a8d8"];
  assert.deepEqual([...new Set(Object.values(jetons))].sort(), [...attendues].sort());
});

test("aucune couleur en dur hors des jetons :root", () => {
  const horsRoot = css.replace(/:root\s*\{[^}]*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.deepEqual(horsRoot.match(/#[0-9a-fA-F]{3,8}\b/g) || [], []);
  assert.deepEqual(horsRoot.match(/\brgba?\(/g) || [], []);
});

test("pas d'ombre floue ni de dégradé (sauf le motif de tirets de la perforation)", () => {
  const nettoye = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const ombres = (nettoye.match(/box-shadow:[^;]*/g) || []).filter((o) => !/^box-shadow:\s*0 0 0 \d/.test(o));
  assert.deepEqual(ombres, []);
  const degrades = (nettoye.match(/[a-z-]*gradient\(/g) || []).filter((d) => d !== "repeating-linear-gradient(");
  assert.deepEqual(degrades, []);
});

test("contrastes : texte ≥ 4,5:1, formes, contours et anneaux de focus ≥ 3:1", () => {
  const j = { ...jetons, canvas: jetons.noir, card: jetons.papier, "ink-on-dark": jetons.papier, "card-done": jetons["fond-coche"] };
  const texte = [
    ["noir sur carte", j.canvas, j.card], ["gris foncé sur carte", j["gris-fonce"], j.card],
    ["gris foncé sur jaune", j["gris-fonce"], j.jaune], ["gris foncé sur bleu", j["gris-fonce"], j.bleu],
    ["texte clair sur carte cochée", j["ink-on-dark"], j["card-done"]], ["gris clair sur carte cochée", j["gris-clair"], j["card-done"]],
    ["texte clair sur noir", j["ink-on-dark"], j.canvas], ["noir sur vert (bouton)", j.canvas, j.vert],
    ["noir sur orange (sticker)", j.canvas, j.orange], ["noir sur jaune", j.canvas, j.jaune], ["noir sur bleu", j.canvas, j.bleu]
  ];
  for (const [nom, a, b] of texte) assert.ok(contraste(a, b) >= 4.5, nom + " : " + contraste(a, b).toFixed(2));

  const formes = [["noir sur chaque vignette", null]];
  for (const clef of ["tile-fruits", "tile-boucherie", "tile-surgeles", "tile-maison", "vert", "jaune", "orange", "bleu", "gris-clair"]) {
    assert.ok(contraste(j.canvas, j[clef]) >= 3, "forme noire sur " + clef);
  }
  // Anneaux de focus : noir sur carte, jaune, bleu ; clair sur carte sombre ; contour des pastilles non choisies
  for (const fond of [j.card, j.jaune, j.bleu]) assert.ok(contraste(j.canvas, fond) >= 3);
  assert.ok(contraste(j["ink-on-dark"], j["card-done"]) >= 3);
  assert.ok(contraste(j["gris-fonce"], j.card) >= 3 && contraste(j["gris-fonce"], j.jaune) >= 3);
  assert.equal(formes.length, 1);
});

test("l'anneau de focus clair #EDEDED sur jaune ou bleu ne passerait pas (raison du noir en dedans)", () => {
  assert.ok(contraste(jetons.papier, jetons.jaune) < 3);
  assert.ok(contraste(jetons.papier, jetons.bleu) < 3);
});

# SPESA — Audit d'avant V2

Date : 12 octobre 2026. État audité : commit `887f6fa` (cache `spesa-v35`), identique à `origin/main`.
Méthode : relecture de tout le code (`js/`, `service-worker.js`, `manifest.json`), d'`ARCHITECTURE.md` et de l'audit du 3 octobre (`AUDIT.md`) ; `node --test` relancé (69 tests, tous OK). Pas de test sur téléphone de ma part.

---

## 1. Verdict en bref

**Le socle est sain.** Les failles graves de l'audit du 3 octobre sont corrigées (écritures tout-ou-rien, données abîmées mises de côté, copie avant restauration, cochages conservés, ajout depuis Courses, confirmations intégrées, bouton Coller). Aucun `innerHTML`, aucune dépendance, séparation des fichiers respectée, 69 tests.

**Mais la v1.1 n'est pas finie.** Le chantier design (≈ 20 commits) est passé devant les **étapes 14 à 18** : le problème des doublons d'ingrédients (« tomate » / « tomates », « pomme de terre » / « pomme de terre à chair farineuse »), constaté sur tes vraies recettes, est toujours là. C'est le plus gros manque fonctionnel, et il s'aggrave à chaque recette saisie (plus il y a de doublons, plus la migration sera lourde).

**Trois angles morts** dominent :
1. **Une seule copie de tes données** sur le téléphone, protégée seulement par ta discipline de sauvegarde manuelle.
2. **Pas de signal de mise à jour** : tu ne sais jamais quelle version tourne sur le téléphone.
3. **Documentation qui dérive** : `ARCHITECTURE.md` se contredit à plusieurs endroits, alors que c'est la « source qui fait foi ».

---

## 2. Suivi de l'audit du 3 octobre

| Réf. | Sujet | État |
|---|---|---|
| F1 / B3 | Cochages perdus, ajout en magasin | ✅ Corrigé |
| F2 / D1 | Stockage plein silencieux | ✅ Corrigé (`DB.ecrireLot`, message) |
| F3 / D2 | Données abîmées écrasées | ✅ Corrigé (`_abime_<date>`) |
| F5 / D3 | Restauration sans filet | ✅ Corrigé (`avant_restauration`) |
| F9 | `confirm()` du navigateur | ✅ Corrigé (feuilles modales) |
| A2 | Bouton Coller | ✅ Fait |
| F7 | Contraste du gris | ✅ Vérifié par `tests/design.test.js` |
| F4 | Hors-ligne jamais vu sur un vrai appareil | ❓ Je ne sais pas si tu l'as testé |
| F6 / D4 | Stockage protégé : oui/non, invisible | ❌ Toujours ouvert (`app.js:721` demande, ne lit jamais la réponse) |
| F8 | Aucun test sur `app.js` / `ui.js` | ❌ Ouvert |
| F10 | README, `.gitattributes`, doc à jour | ❌ Ouvert |
| F11 | Historique sans limite ni suppression | ❌ Ouvert (sans urgence) |
| Étapes 14–18 | Anti-doublons, dictionnaire de départ, écran Ingrédients, prompt amélioré | ❌ **Non commencées** |
| A1, B1, C1, B4 | Partage vers SPESA, basiques à la maison, écran allumé, ordre des rayons | ❌ Non commencés |

---

## 3. Qualité du code

### Ce qui va bien
- Découpage clair, chaque fichier fait ce que dit `CLAUDE.md`. `logic.js` vraiment pur et bien testé.
- Robustesse des données au-dessus de la moyenne pour une appli perso (tout-ou-rien, quarantaine, copies de sécurité, migration versionnée).
- Code commenté en français, noms parlants, aucune astuce obscure.

### Défauts (du plus utile au moins utile)

**Q1 — Règles de validation en double (risque de divergence).**
`Logic.validerRecette` (`logic.js:178`) et `Logic.construireRecette` / `construireLigne` (`logic.js:205`, `logic.js:437`) vérifient les mêmes choses chacune de leur côté. Le jour où une règle change dans l'une et pas dans l'autre, le formulaire dira « OK » et l'enregistrement échouera (ou l'inverse). `app.js:76` le reconnaît : « ne devrait pas arriver ».
*Solution* : `construireRecette` appelle `validerRecette` et s'arrête s'il y a des erreurs. Coût : petit. À faire avant l'étape 14 qui touche à ces fonctions.

**Q2 — Une règle métier dans `app.js`.**
`ajoutValide()` (`app.js:671`) contient la validation de l'écran Ajout : elle n'est pas testée et duplique encore `construireLigne`. *Solution* : `Logic.validerArticle(saisie)` sur le modèle de `validerRecette`, avec un test.

**Q3 — Petits bugs réels.**
- **Annuler une suppression de recette ne la remet pas dans la liste de courses** si tu es passé par l'onglet Courses pendant les 6 secondes (`afficherEcranListe` l'a retirée pour de bon, `app.js:447`). La recette revient aussi en fin de liste. *Solution* : garder `{ recette, choixDansListe }` et tout remettre en une écriture.
- `liste-parts-plus` (`app.js:329`) n'a pas de plafond, alors que partout ailleurs c'est 99.
- `restaurer()` (`app.js:561`) n'est pas protégée : si la lecture du fichier échoue, rien ne s'affiche (erreur seulement dans la console).
- Reste orphelin : un commentaire sans fonction en `app.js:658-660` ; `redessinerListe()` n'est qu'un alias de `afficherEcranListe()`.

**Q4 — `ui.js` devient gros (1 128 lignes).** Pas un problème aujourd'hui. Si la V2 ajoute des écrans (Ingrédients, Rayons…), le découper par écran (`ui-recettes.js`, `ui-courses.js`, `ui-reglages.js`). Compromis : plus de fichiers à lister dans `FICHIERS` et `index.html`, mais chaque fichier tient en une lecture (moins de tokens pour l'assistant à chaque étape).

**Q5 — Pas de tests du parcours.** Toute la mécanique des boutons (`executerAction`, 60 cas) n'est vérifiée qu'à la main. *Solution sans dépendance* : une liste de contrôle manuelle versionnée (`tests/parcours.md`), à dérouler avant chaque mise en ligne. Les vrais tests d'interface demanderaient un outil externe (Playwright) : hors règle, à n'envisager que pour les tests.

---

## 4. Fonctionnalités manquantes (promises par le plan, non faites)

| Étape | Ce qui manque | Pourquoi c'est important |
|---|---|---|
| 14 | Comparaison tolérante (pluriel, petits mots) + migration | Sans elle, la fusion — cœur de l'appli — rate des cas évidents |
| 15 | Dictionnaire de départ (~200 ingrédients) + autocomplétion tolérante | Au premier jour, rien n'est suggéré ; chaque rayon est à saisir |
| 16 | « Tu voulais dire ? » + badges à l'import | Empêche les doublons de naître |
| 17 | Écran Ingrédients (renommer, fusionner, supprimer) | **Seul moyen de réparer** les doublons déjà créés. Aujourd'hui, un rayon mal choisi ne se corrige qu'en modifiant une recette |
| 18 | Prompt d'import avec les noms connus | Les recettes importées réutilisent tes noms |

---

## 5. Angles morts

1. **Une seule copie des données.** LocalStorage sur Android peut être vidé par « Effacer les données de Chrome », une réinitialisation, un changement de téléphone. La sauvegarde est manuelle, et la **liste en cours n'est jamais sauvegardée** (choix assumé, mais à savoir). Le rappel ne s'affiche qu'après 7 jours.
2. **Versions invisibles.** Le service worker installe la nouvelle version en silence (`service-worker.js:33`) ; elle ne s'affiche qu'au lancement suivant. Aucun numéro de version visible dans les Réglages : impossible de savoir si le téléphone a bien la dernière.
3. **Persistance non vérifiée.** `navigator.storage.persist()` est demandé mais la réponse n'est jamais montrée (F6).
4. **Doc qui se contredit.** `ARCHITECTURE.md` : « Version 1.0 » (l.5) ; `co.json` « vide » (l.169) puis « brouillon » (l.58) ; bouton flottant décrit (l.233, l.277) puis supprimé (l.252) ; arborescence `SPESA_dev/`. Comme ce fichier « fait foi », chaque contradiction peut faire refaire une erreur à l'assistant.
5. **Fichier de 900 Ko non suivi à la racine** : `Spesa Sporta — Liste de courses.html` (une maquette exportée, semble-t-il). Risque de le committer par erreur et de le publier sur GitHub Pages. *Solution* : le déplacer dans `design/` ou l'ajouter à `.git/info/exclude`.
6. **Le corse** : brouillon non relu, 34 clés sur 245. Visible dans les Réglages comme une vraie langue.
7. **L'objectif « économiser » n'est pas mesuré** (déjà noté le 3 octobre, toujours vrai).
8. **Deux onglets ouverts sur PC** s'écrasent mutuellement (pas d'écoute de l'évènement `storage`). Sans effet sur ton téléphone ; à savoir pendant le développement.

---

## 6. Ajouts bienvenus (petits, forte valeur)

| # | Ajout | Valeur | Coût | Modèle de données ? |
|---|---|---|---|---|
| P1 | **Écran allumé en mode courses** (Wake Lock, natif) | Forte en magasin | S | Non |
| P2 | **Version + « Stockage protégé : oui/non »** dans Réglages | Lève deux angles morts | S | Non |
| P3 | **« Nouvelle version disponible — Relancer »** | Fini les doutes de version | S | Non |
| P4 | **Basiques à la maison** (sel, huile… arrivent décochés) | Très forte : fin du décochage répétitif | S–M | **Oui** (champ dans le dictionnaire) |
| P5 | **Ordre des rayons réglable** | Forte (point ouvert n°1 depuis le début) | M | **Oui** (réglage) |
| P6 | **Partager vers SPESA** depuis l'appli IA (`share_target`) | Très forte pour l'import | M | Non. À tester sur ton téléphone |
| P7 | Envoyer la liste en texte (partage Android) | Moyenne | S | Non, mais « partage de listes » est hors périmètre v1 |
| P8 | Supprimer une entrée d'historique | Faible | S | Non |

---

## 7. Plan proposé vers la V2

Principe : **finir la v1.1 avant d'ajouter**. La V2 n'a de sens que si la fusion est fiable.

### Phase 0 — Hygiène (½ journée, aucun risque)
- Mettre `ARCHITECTURE.md` à jour (contradictions §5.4), version « 1.1 en cours ».
- `README.md` court, `.gitattributes` (fins de ligne), ranger le fichier de 900 Ko.
- Q3 (petits bugs) et nettoyage du code mort.

### Phase 1 — Préparer le terrain de l'étape 14 (1 étape)
- Q1 + Q2 : une seule source de validation, testée.
- P2 : version et état du stockage visibles. Utile pour vérifier la migration sur le téléphone.

### Phase 2 — Finir la v1.1 (étapes 14 → 18, inchangées)
Ordre conseillé : **15 (dictionnaire de départ) avant 14** si tu veux, car la liste de 200 ingrédients sert de jeu d'essai pour régler la règle du pluriel. Sinon, ordre du plan. Sauvegarde obligatoire juste avant la 14.

### Phase 3 — Le confort en magasin (petit lot)
P1 (écran allumé), P3 (nouvelle version), P4 (basiques à la maison).

### Phase 4 — V2 proprement dite (à décider selon ton usage réel)
| Thème | Contenu | Coût | Compromis |
|---|---|---|---|
| Import sans frottement | P6 partage vers SPESA, import de plusieurs recettes d'un coup | M | Dépend du comportement de ton téléphone |
| Magasin | P5 ordre des rayons (un ou plusieurs magasins) | M | Modèle de données |
| Rationaliser | Suggestions anti-gaspi (recettes qui partagent un ingrédient), indicateurs « achats évités » dans l'historique | M | Utile seulement avec 20+ recettes |
| Sauvegarde automatique | Envoi vers Drive | L | Demande une connexion Google : casse « 100 % local, zéro dépendance ». **Je le déconseille** tant que le rappel manuel suffit |
| Corse | Faire relire `co.json`, compléter les 211 clés manquantes | M (surtout hors code) | Rien de technique |
| Prix et budget | Prix au caddie, total | L | Hors périmètre ; seulement si tu veux mesurer l'économie en euros |

**Coût en tokens** : phases 0 à 3 ≈ 10 étapes courtes, chacune ne lit que 2 ou 3 fichiers. L'étape 14 est la seule lourde (logique + migration + tests).

---

## 8. Décisions que j'attends de toi

1. Valides-tu « **finir la v1.1 avant la V2** » (phases 0 → 2 d'abord) ?
2. Étape 15 avant la 14, ou ordre du plan ?
3. **P4 (basiques à la maison)** et **P5 (ordre des rayons)** : accord pour modifier le modèle de données ?
4. As-tu déjà testé l'appli installée sur ton téléphone, en mode avion (F4) ? Qu'as-tu constaté ?
5. Que faire du fichier `Spesa Sporta — Liste de courses.html` : le ranger dans `design/` ou l'exclure de Git ?

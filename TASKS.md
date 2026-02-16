# Galien Outreach 2026 - Convention & Templates

## Contexte
Refonte complete du messaging outreach de la Galien Foundation.
Objectif : un funnel propre, reproductible, pour chaque pipeline.

## Outils crees
- **`~/email-editor.html`** : Outreach Manager visuel (4 pipelines, 11 steps chacune, editeur Gmail-like)
- **`~/outreach-convention.html`** : Matrice reference (obsolete, remplace par l'email editor)

## Structure du funnel (identique pour chaque pipeline)
| # | Etape | Source | Description |
|---|-------|--------|-------------|
| 0 | Call for Partners/Candidates | Lemlist (eblast MR/KF) | Envoi unique officiel |
| 0b | Reprise de contact | Espanso | Contactes l'an dernier non convertis |
| 1 | Email 1 | Lemlist (EC) | Premier outreach perso |
| 2 | Email 2 | Lemlist (EC) | Follow-up avec docs |
| 3 | Email 3 | Lemlist (EC) | Dernier follow-up |
| 4 | LinkedIn 1 | Lemlist (EC) | Premier message LI |
| 5 | LinkedIn 2 | Lemlist (EC) | Follow-up LI |
| 6 | LinkedIn 3 | Lemlist (EC) | Dernier message LI |
| 7 | Journey | Espanso | Ils montrent interet / s'inscrivent |
| 8 | FU Journey | Espanso | Relance courte si pas de reponse |
| 9 | After Meeting | Espanso | Post-call avec docs |
| 10 | FU After Meeting | Espanso | Relance courte post-meeting |

## Pipelines
1. **Partners Forum** - Campagne existante (Lemlist "GPS 2026 Partners campaign EC 3")
2. **Partners GPS** - A CREER entierement
3. **Candidats (SU/DH/IAE)** - Campagne existante, templates Espanso existants
4. **Candidats P1 (Patient First)** - Campagne existante, some templates manquants

## Etat d'avancement - Partners Forum (pipeline prioritaire)

### Review methodique step by step :
- [ ] **Step 0 - Call for Partners MR** : Lu. Eblast officiel signe MR/KF/Sharp/Tessier-Lavigne. Contenu charge.
- [ ] **Step 0b - Reprise de contact** : A ECRIRE
- [ ] **Step 1 - Email 1** : Lu (Partners EC E1). A REVOIR messaging (trop salesy selon Edouard)
- [ ] **Step 2 - Email 2** : Lu (Partners EC E2). A REVOIR
- [ ] **Step 3 - Email 3** : Lu (Partners EC E3). "Kind reminder :)" avec faux thread forward. A REVOIR
- [ ] **Steps 4-6 - LinkedIn 1-3** : A lire et revoir
- [ ] **Step 7 - Journey (:journeypartners)** : Lu. A REVOIR (trop long, docs a reduire)
- [ ] **Step 8 - FU Journey** : A ECRIRE
- [ ] **Step 9 - After Meeting (:afterpartners)** : A ECRIRE
- [ ] **Step 10 - FU After Meeting** : A ECRIRE

### Review methodique - Partners GPS :
- [ ] Tout a creer (0-10)

### Review methodique - Candidats :
- [ ] **Steps 0-6** : Existent dans Lemlist, pas de review prevu pour l'instant
- [ ] **Step 8 - FU Journey** : A ECRIRE
- [ ] **Step 10 - FU After Meeting** : A ECRIRE

### Review methodique - Candidats P1 :
- [ ] **Step 8 - FU Journey** : A ECRIRE
- [ ] **Step 10 - FU After Meeting** : A ECRIRE

## Fichiers Lemlist (source locale)
Base : `~/Documents/00_Galien/00_Promotion-Tools/00_USA/2026/Templates/Lemlist Campaign Templates/`
- `#5.1 GPS 2026 Call for Partners MR/` (1 email)
- `#5.1 GPS 2026 Partners campaign EC 3/` (6 emails = 3 email + 3 linkedin avec branches)
- `#2. PG USA 2026 Call for candidates V2/` (1 email)
- `#2. PG USA 2026 Candidates campaign EC/` (8 emails)

## Templates Espanso
Fichier : `~/.config/espanso/match/emails.yml`

## Feedback copywriter (session 13 fev)
- journeypartners trop long (~300 mots → viser 170)
- Pas de mention AMNH (normal - venue ceremony seulement)
- "If it's relevant and if you are available" = OK, ton humble et respectueux
- "Thank you for reaching out" = OK pour inquiry, enlever "it's a pleasure to connect"
- Trop de docs en premier contact (8 liens) → reduire a 1-2 max
- Speakers incomplets : ajouter Greenstreet (Alnylam) + Rob Davies (Merck)
- Ajouter mention 4 Nobel Laureates

## Phase 2 (apres templates)
- Revoir messaging Lemlist Partners Forum (moins salesy)
- Creer pipeline GPS Partners dans Lemlist
- Eventuellement : connecter email-editor a API Lemlist (push direct)

## Derniere session
Date: 2026-02-16 18:00
Progression:
- **Fix footer stuck in draft mode** : `selectStep()` appelait `swapFooterForDrafts(false)` conditionnellement → maintenant systématique
- **Suggestions step-driven** : supprimé auto-show + force-navigate. La suggestion s'affiche contextuellement quand on navigue sur un step qui en a une
- **Lemlist HTML normalization** : `normalizeLemlistHtml()` ajoute `margin: 0px` sur tous les `<p>` (jamais font-size/family/color). Regex corrigée pour matcher `<p id="...">` etc.
- **Preview text** : champ "Preview" dans l'UI, extrait du HTML au chargement, injecté via `buildLemlistHtml()` au Copy HTML / Push
- **Font size/family toolbar** : sélecteurs dans la toolbar, utilise `execCommand` + conversion `<font>` → `<span style>`
- **Copy HTML = buildLemlistHtml()** : même pipeline que Push (margins + preview)
- **CSS !important retiré** : `.compose-body *` ne force plus `inherit !important` sur font-size/family

Session precedente: 2026-02-14 13:30
Progression:
- **Emails chargés (steps 1-3)** : Forum + Candidats = branche A avec icebreaker
- **LinkedIn chargés (steps 4-6)** : Forum + Candidats = vrais messages LinkedIn API avec toggle branche A/B
- **Push to Lemlist** : bouton fonctionnel dans l'éditeur (PATCH API, testé sur campagne test)
  - Mapping complet des step IDs pour Candidats + Partners (emails + LinkedIn, branches A/B)
  - Serveur `/push-lemlist` endpoint avec sélecteur de cibles
  - HTML envoyé tel quel (pas de nettoyage automatique)
- **LinkedIn sauvegardé localement** : 10 fichiers .txt (Partners + Candidats, branches A/B, LI 1-3)
- **Campagnes identifiées** :
  - Candidats : `cam_JG329n7hnmWaBdmhP` = "#2. PG USA 2026 Candidates campaign EC"
  - Partners : `cam_Kvounxdy85thBMDNs` = "#5.1 GPS 2026 Partners campaign EC 3"
- **P1 pipeline** : Steps 1-6 restent en placeholder

Session 2026-02-14 12:00:
- 12 templates HTML locaux chargés, 11 subjects mis à jour

Session 2026-02-13 18:30:
- Template Editor complet + serveur Node.js auto-save
- Push GitHub : https://github.com/edouardc555/galien-template-editor

Prochaine etape:
- **Bosser les templates** (contenu) : revoir messaging, écrire les manquants
- Revoir messaging Partners Forum (steps 1-3) - trop salesy
- Créer templates P1 Patient First
- Écrire les steps manquants (FU Journey, FU After Meeting, Reprise, etc.)
- Pipeline GPS Partners : tout à créer (0-10)
- Future : envoyer campagnes via Unipile (bypass Lemlist, rotation adresses)
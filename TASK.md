# TASK.md — Système de Gestion des Bulletins de Paie SOLUTECH
> Rédigé par : TOURE Prince Nafis — Année académique 2025-2026
> Stack : **Next.js 16.3.3 (App Router) · Shadcn/ui · MySQL (sans ORM) · NextAuth · PDFKit**
> Base de données : MySQL — requêtes SQL pures (`mysql2/promise`)

---

## LÉGENDE
- `[ ]` Tâche à faire
- `[x]` Tâche terminée
- `🔴 CRITIQUE` Bloquant
- `🟠 HAUTE` Important
- `🟡 MOYENNE` Non bloquant

---

## PHASE 2 — Base de données & Infrastructure (Semaine 1)

### 2.0 Initialisation du projet Next.js
- [ ] 🔴 Créer le projet : `npx create-next-app@latest solutech-paie --typescript --tailwind --app`
- [ ] 🔴 Installer Shadcn/ui : `npx shadcn@latest init`
- [ ] 🔴 Installer les composants Shadcn nécessaires :
  ```bash
  npx shadcn@latest add button input label card table form
  npx shadcn@latest add select dialog alert-dialog badge
  npx shadcn@latest add dropdown-menu sidebar navigation-menu
  npx shadcn@latest add tabs separator skeleton toast
  npx shadcn@latest add calendar date-picker switch
  ```
- [ ] 🔴 Installer les dépendances :
  ```bash
  npm install mysql2 next-auth bcryptjs
  npm install pdfkit
  npm install exceljs nodemailer
  npm install react-hook-form zod @hookform/resolvers
  npm install recharts date-fns
  npm install @types/bcryptjs @types/nodemailer --save-dev
  ```
- [ ] 🔴 Configurer `.env.local` :
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=solutech_paie
  NEXTAUTH_SECRET=your_secret_key_here
  NEXTAUTH_URL=http://localhost:3000
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  ```
- [ ] 🔴 Créer la structure de dossiers complète (voir PROMPT.md)

### 2.1 Connexion MySQL
- [ ] 🔴 Créer `src/lib/db.ts` — pool MySQL2 avec fonctions `query<T>()`, `queryOne<T>()`, `pool`
- [ ] 🔴 Tester la connexion depuis une route API de test

### 2.2 Création de toutes les tables SQL
- [ ] 🔴 Créer `database/schema.sql` avec les tables dans cet ordre (respect des FK) :
  - [ ] Table `utilisateurs`
  - [ ] Table `employes`
  - [ ] Table `rubriques`
  - [ ] Table `bareme_irpp` (barème officiel togolais OTR — 8 tranches)
  - [ ] Table `parametres`
  - [ ] Table `periodes_paie`
  - [ ] Table `compteur_bulletins`
  - [ ] Table `bulletins`
  - [ ] Table `lignes_bulletin`
  - [ ] Table `cumuls`
  - [ ] Table `audit_logs`

### 2.3 Données initiales (seed)
- [ ] 🔴 Créer `database/seed.sql` :
  - [ ] Utilisateur admin par défaut (`admin@solutech.com`, mdp haché)
  - [ ] Les **21 rubriques** dans l'**ordre exact du bulletin** :
    ```
    ordre 1  : SB01  — Salaire de Base               gain   saisie
    ordre 2  : PA02  — Prime d'Ancienneté             gain   calculé
    ordre 3  : HS03  — Forfait Heures Supplémentaires gain   saisie
    ordre 4  : ICL13 — Indemnité Logement             gain   saisie
    ordre 5  : ICT14 — Indemnité Transport            gain   saisie
    ordre 6  : TIP16 — Total Indemnités Imposables    gain   calculé
    ordre 7  : SS05  — Sursalaire                     gain   saisie
    ordre 8  : SB06  — Salaire Brut                   gain   calculé ← SALAIRE BRUT
    ordre 9  : IRPP08— IRPP                           retenue calculé (barème OTR)
    ordre 10 : CS07  — CNSS                           retenue calculé (4%)
    ordre 11 : AM3   — AMU                            retenue calculé (5%)
    ordre 12 : RL10  — Total Retenues Légales         retenue calculé
    ordre 13 : SNR11 — Salaire Net Après Retenues     gain   calculé
    ordre 14 : RT17  — Rémunération Totale            gain   calculé ← juste après SNR11
    ordre 15 : IR04  — Primes de Caisse               gain   saisie
    ordre 16 : IR12  — Primes de Salissure            gain   saisie
    ordre 17 : ICH15 — Primes de Cantine              gain   saisie
    ordre 18 : RAS18 — Retenue/Avance sur Salaire     retenue saisie
    ordre 19 : AR19  — Autres Retenues                retenue saisie
    ordre 20 : TR20  — Total Autres Retenues          retenue calculé
    ordre 21 : SN21  — Rémunération Nette             gain   calculé ← RÉSULTAT FINAL
    ```
  - [ ] Barème IRPP officiel OTR togolais (8 tranches annuelles en XOF) :
    ```
    Tranche 1 : 0         → 900 000      → 0%
    Tranche 2 : 900 001   → 3 000 000    → 3%
    Tranche 3 : 3 000 001 → 6 000 000    → 10%
    Tranche 4 : 6 000 001 → 9 000 000    → 15%
    Tranche 5 : 9 000 001 → 12 000 000   → 20%
    Tranche 6 : 12 000 001→ 15 000 000   → 25%
    Tranche 7 : 15 000 001→ 20 000 000   → 30%
    Tranche 8 : 20 000 001→ NULL         → 35%
    ```
  - [ ] Paramètres globaux :
    ```
    taux_cnss             = 0.04   (4%)
    taux_amu              = 0.05   (5%)
    taux_cotisations_irpp = 0.09   (9% = CNSS + AMU pour base IRPP)
    abattement_irpp_taux  = 0.28   (28%)
    abattement_irpp_plafond = 2800000 (plafond 28% de 10M annuel)
    anciennete_seuil_min  = 2      (déclenchement à 2 ans accomplis)
    anciennete_taux_base  = 0.02   (2% à partir de 2 ans)
    anciennete_taux_par_an= 0.01   (+1% par année supplémentaire)
    anciennete_plafond    = 0.25   (25% maximum)
    nb_jours_travail      = 30
    ```
- [ ] 🔴 Créer `database/migrate.ts` — exécute schema.sql puis seed.sql
- [ ] 🔴 Ajouter scripts dans `package.json` : `db:migrate`, `db:seed`

---

## PHASE 3 — Authentification (Semaine 1–2)

### 3.1 Configuration NextAuth
- [ ] 🔴 Créer `src/lib/auth.ts` — Credentials Provider :
  - [ ] Vérifier email + bcrypt.compare(password, hash)
  - [ ] Mettre à jour `derniere_connexion` à chaque login
  - [ ] Retourner `{ id, nom, email, role }` dans le token JWT
  - [ ] Logger connexion dans `audit_logs`
- [ ] 🔴 Créer `src/app/api/auth/[...nextauth]/route.ts`
- [ ] 🔴 Créer `src/types/next-auth.d.ts` — étendre Session/JWT avec `id` et `role`
- [ ] 🔴 Créer `src/middleware.ts` — protéger `/dashboard/*` et `/api/*` sauf `/api/auth/*`

### 3.2 Helpers d'authentification
- [ ] 🔴 Créer `src/lib/auth-helpers.ts` :
  - [ ] `requireAuth(req)` → retourne la session ou lève 401
  - [ ] `requireRole(req, roles[])` → vérifie le rôle ou lève 403

### 3.3 Page de connexion
- [ ] 🔴 Créer `src/app/(auth)/login/page.tsx` (Shadcn : Card, Input, Button, Toast)
- [ ] 🔴 Créer `src/app/(auth)/layout.tsx`

### 3.4 Layout Dashboard
- [ ] 🔴 Créer `src/app/(dashboard)/layout.tsx` avec Sidebar Shadcn
- [ ] 🔴 Créer `src/components/layout/Sidebar.tsx` — navigation filtrée par rôle
- [ ] 🔴 Créer `src/components/layout/Header.tsx` — nom user + déconnexion

---

## PHASE 4 — Module 1 : Gestion des Employés (Semaine 2)

### 4.1 Calcul de l'ancienneté (règle togolaise)
- [ ] 🔴 Créer dans `src/lib/calcul-paie.ts` la fonction `calculerAnciennete()` :
  - Calcul en **années entières** (de date à date depuis `date_entree`)
  - Retourner `{ annees: number, mois: number }`
- [ ] 🔴 Créer la fonction `calculerTauxAnciennete(annees: number): number` :
  - Moins de 2 ans accomplis → taux = **0%**
  - 2 ans accomplis → taux = **2%**
  - 3 ans → 3%, 4 ans → 4%, ..., N ans → N% (avec N >= 2)
  - Plafond maximum → **25%**
  - Formule : `taux = min(annees >= 2 ? annees : 0, 25) / 100`

### 4.2 API Routes — Employés
- [ ] 🔴 `GET /api/employes` — liste avec filtres (search, actif)
- [ ] 🔴 `POST /api/employes` — créer avec validation Zod
  - [ ] Générer matricule format `XXXX/SOLUTECH/MM/AA`
  - [ ] Vérifier unicité NIF + N° CNSS
  - [ ] Logger dans `audit_logs`
- [ ] 🔴 `GET /api/employes/[id]` — détail
- [ ] 🔴 `PUT /api/employes/[id]` — modifier + logger
- [ ] 🟠 `DELETE /api/employes/[id]` — désactiver (soft delete `actif=0`)
- [ ] 🟠 `GET /api/employes/[id]/bulletins` — bulletins d'un employé

### 4.3 Pages Frontend — Employés (Shadcn)
- [ ] 🔴 `src/app/(dashboard)/employes/page.tsx` — DataTable + recherche + badges
- [ ] 🔴 `src/app/(dashboard)/employes/nouveau/page.tsx` — formulaire react-hook-form + Zod
  - Sections : Informations personnelles | Professionnelles | Administratives
  - Champs : nom, prénom, date_naissance, date_entree, situation_matrimoniale,
    nb_personnes_charge, poste, departement, classement, salaire_base,
    salaire_categoriel, nif, numero_cnss, numero_compte, etablissement_financier
  - Affichage dynamique de l'ancienneté calculée
- [ ] 🔴 `src/app/(dashboard)/employes/[id]/page.tsx` — fiche détail
- [ ] 🟠 `src/app/(dashboard)/employes/[id]/modifier/page.tsx`

---

## PHASE 5 — Module 2 : Paramétrage (Semaine 2–3)

### 5.1 API Routes — Paramètres et Rubriques
- [ ] 🔴 `GET /api/parametres` — tous les paramètres
- [ ] 🔴 `PUT /api/parametres/[cle]` — modifier (admin uniquement) + logger
- [ ] 🔴 `GET /api/rubriques` — toutes les rubriques (actives)
- [ ] 🟠 `PUT /api/rubriques/[id]` — activer/désactiver, modifier taux
- [ ] 🔴 `GET /api/parametres/bareme-irpp` — toutes les tranches OTR
- [ ] 🟠 `PUT /api/parametres/bareme-irpp` — modifier les tranches

### 5.2 Pages Frontend — Paramétrage (Shadcn Tabs)
- [ ] 🟠 `src/app/(dashboard)/parametres/page.tsx` :
  - Onglet 1 "Paramètres globaux" : taux CNSS, AMU, abattement IRPP, ancienneté, nb jours
  - Onglet 2 "Rubriques" : DataTable + toggle actif/inactif
  - Onglet 3 "Barème IRPP (OTR)" : tableau des 8 tranches éditables

---

## PHASE 6 — Module 3 : Moteur de Calcul & Bulletins (Semaine 3–4)

### 6.1 Moteur de calcul IRPP (règle OTR officielle)
- [ ] 🔴 Créer `calculerIRPP(salaireBrutMensuel, cotisationsSociales, nbPersonnesCharge, bareme)` :

  **Étape 1 — Base Imposable Annuelle :**
  ```
  salaireBrutAnnuel     = salaireBrutMensuel × 12
  cotisationsSocialesAnnuelles = salaireBrutAnnuel × 0.09
  salaireSocial         = salaireBrutAnnuel - cotisationsSocialesAnnuelles
  abattement            = min(salaireSocial × 0.28, 2_800_000)
  RNI_annuel            = salaireSocial - abattement
  ```

  **Étape 2 — Barème progressif OTR (8 tranches annuelles) :**
  ```
  Pour chaque tranche du barème officiel OTR :
    montantDansTranche = min(RNI_annuel, tranche_max) - tranche_min
    si montantDansTranche > 0 :
      impot += montantDansTranche × taux_tranche
  impotAnnuelTheorique = somme de tous les montants par tranche
  ```

  **Étape 3 — Quotient Familial (charges de famille) :**
  ```
  Célibataire / 0 charge   → réduction = 0 FCFA
  1 personne à charge       → réduction = X FCFA (à confirmer OTR)
  Marié + enfants           → réduction progressive selon nb parts
  impotAnnuelNet = impotAnnuelTheorique - reductionsFamiliales
  ```

  **Résultat mensuel :**
  ```
  IRPP_mensuel = impotAnnuelNet / 12
  (arrondi à l'entier supérieur, minimum = 0)
  ```

  **Validation avec bulletin de référence N°20-2026 :**
  ```
  SB06 = 72 450 FCFA/mois
  Brut annuel   = 72 450 × 12 = 869 400
  Cotisations   = 869 400 × 9% = 78 246
  Salaire social= 869 400 - 78 246 = 791 154
  Abattement    = 791 154 × 28% = 221 523
  RNI annuel    = 791 154 - 221 523 = 569 631
  Tranche 1 (0→900 000 à 0%) : RNI < 900 000 → impôt = 0
  IRPP mensuel  = 0 / 12 = 0 ✅ (case vide sur le bulletin)
  ```

### 6.2 Moteur de calcul PA02 (règle togolaise officielle)
- [ ] 🔴 Créer `calculerPrimeAnciennete(salaireCategoriel, annees)` :
  ```
  si annees < 2 :
    taux = 0%
  sinon :
    taux = min(annees, 25)%
    (2 ans = 2%, 3 ans = 3%, ..., 25 ans et + = 25%)

  PA02 = salaireCategoriel × taux

  Note : la base est le SALAIRE CATÉGORIEL (grille salariale togolaise)
  et NON le salaire brut total.
  ```

  **Validation avec bulletin de référence N°20-2026 :**
  ```
  Ancienneté = 1 an → taux = 0% → PA02 devrait = 0
  Mais le bulletin affiche PA02 = 450
  → Base = 45 000, Taux = 1%
  → Hypothesis : l'employé a exactement 1 an et la convention
    collective appliquée ici utilise 1% dès la 1ère année
    (à confirmer avec SOLUTECH)
  → En attendant : implémenter la règle togolaise standard (seuil 2 ans)
    ET prévoir un paramètre configurable "seuil_declenchement_anciennete"
  ```

### 6.3 Toutes les fonctions du moteur — `src/lib/calcul-paie.ts`
- [ ] 🔴 Implémenter dans l'ordre exact du bulletin :
  ```typescript
  calculerAnciennete(dateEntree: Date): { annees: number, mois: number }
  calculerTauxAnciennete(annees: number, seuilMin: number): number
  calculerPrimeAnciennete(salaireCategoriel: number, annees: number, seuilMin: number): number
  calculerTIP16(pa02, hs03, icl13, ict14): number
    // TIP16 = PA02 + HS03 + ICL13 + ICT14  (hors SB01)
  calculerSalaireBrut(sb01, tip16, ss05): number
    // SB06 = SB01 + TIP16 + SS05
  calculerIRPP(sb06, nbPersonnesCharge, bareme): number
    // Règle OTR complète : annualisation → cotisations → abattement → tranches → quotient
  calculerCNSS(sb06: number, taux: number): number
    // CS07 = SB06 × 0.04
  calculerAMU(sb06: number, taux: number): number
    // AM3 = SB06 × 0.05
  calculerTotalRetenuesLegales(irpp, cnss, amu): number
    // RL10 = IRPP08 + CS07 + AM3
  calculerSalaireNetApresRetenues(sb06, rl10): number
    // SNR11 = SB06 - RL10
  calculerRemunerationTotale(snr11): number
    // RT17 = SNR11 (sur ce bulletin, RT17 = SNR11 à ce stade)
  calculerTotalAutresRetenues(ras18, ar19): number
    // TR20 = RAS18 + AR19
  calculerRemunerationNette(rt17, ir04, ir12, ich15, tr20): number
    // SN21 = RT17 + IR04 + IR12 + ICH15 - TR20
  calculerBulletinComplet(employe, periode, elementsVariables, params, bareme): BulletinCalcule
    // Fonction principale qui enchaîne toutes les fonctions ci-dessus dans l'ordre
  ```

- [ ] 🔴 Valider CHAQUE fonction avec les valeurs du bulletin N°20-2026 :
  ```
  TIP16  = 450 + 7000 + 10000 + 10000 = 27 450 ✅
  SB06   = 45000 + 27450 + 0 = 72 450 ✅
  CS07   = 72450 × 4% = 2 898 ✅
  AM3    = 72450 × 5% = 3 622.5 ≈ 3 623 ✅
  IRPP08 = 0 (RNI < 900 000) ✅
  RL10   = 0 + 2898 + 3623 = 6 521 ✅
  SNR11  = 72450 - 6521 = 65 930 ✅  (arrondi 65 929→65 930)
  RT17   = 65 930 ✅
  SN21   = 65930 + 10000 + 25000 + 0 - 0 = 100 930 ✅
  (TR20 affiché 35 000 à titre info mais non déduit sur ce bulletin)
  ```

### 6.4 Numérotation automatique des bulletins
- [ ] 🔴 Créer `genererNumeroBulletin(mois, annee)` :
  - Lire + incrémenter `compteur_bulletins` pour (mois, annee)
  - Format : `N°{numero}-{annee}` (ex. N°20-2026)

### 6.5 API Routes — Bulletins
- [ ] 🔴 `POST /api/bulletins/calculer` — calculer et sauvegarder en brouillon
  - Vérifier période non clôturée
  - Récupérer paramètres + barème IRPP OTR depuis BDD
  - Appeler `calculerBulletinComplet()`
  - INSERT dans `bulletins` + `lignes_bulletin`
  - Mettre à jour `cumuls` (ON DUPLICATE KEY UPDATE)
  - Logger dans `audit_logs`
- [ ] 🟠 `POST /api/bulletins/calculer-lot` — tous les employés d'une période
- [ ] 🔴 `GET /api/bulletins` — liste avec filtres (periode_id, employe_id, statut)
- [ ] 🔴 `GET /api/bulletins/[id]` — détail complet avec lignes
- [ ] 🔴 `POST /api/bulletins/[id]/valider` — valider (statut → `valide`)
  - Refuser si statut ≠ `brouillon`
  - Logger dans `audit_logs`
- [ ] 🔴 Sécuriser : bulletin `valide` ou `archive` = immuable côté serveur

### 6.6 Mise à jour des cumuls
- [ ] 🔴 SQL cumuls (INSERT ... ON DUPLICATE KEY UPDATE) après chaque bulletin validé
- [ ] 🔴 `GET /api/cumuls/[employe_id]/[annee]` — cumuls annuels

### 6.7 Pages Frontend — Bulletins (Shadcn)
- [ ] 🔴 `src/app/(dashboard)/bulletins/page.tsx` — DataTable + filtres + badges statut
- [ ] 🔴 `src/app/(dashboard)/bulletins/nouveau/page.tsx`
  - Select employé + Select période
  - Éléments variables : HS03, ICL13, ICT14, SS05, IR04, IR12, ICH15, RAS18, AR19
  - Aperçu calculé en temps réel
- [ ] 🔴 `src/app/(dashboard)/bulletins/[id]/page.tsx`
  - Tableau complet dans l'ordre exact des 21 rubriques
  - Section cumuls MOIS/EXERCICE
  - Bouton "Valider" (si brouillon + rôle)
  - Bouton "Télécharger PDF"
- [ ] 🟠 `src/components/bulletins/BulletinPreview.tsx`

---

## PHASE 7 — Module 4 : Génération PDF (Semaine 4)

### 7.1 Service PDF — `src/lib/pdf-bulletin.ts`
- [ ] 🔴 Fonction `genererBulletinPDF(bulletin: BulletinComplet): Promise<Buffer>` (PDFKit)
- [ ] 🔴 Reproduire fidèlement le modèle N°20-2026 :
  - **En-tête** : logo SOLUTECH | titre "BULLETIN DE PAIE N°XX-XXXX"
  - **Bandeau** : Matricule | Classement | Situation Matri. | N°CNSS | NIF | Mois | Période
  - **Tableau rubriques** : Code | Désignation | Base | Taux/Nb | Retenues | Gains
    → 21 lignes dans l'ordre exact (ordres 1 à 21 définis en Phase 2)
    → Ligne "SALAIRE NET :" à la fin du tableau
  - **Tableau bas** : Désignation | Nb Jours | Base IRPP | Cum. IRPP | CUM CNSS | BRUT/PENSION
    → Lignes MOIS et EXERCICE avec les cumuls
  - **Règlement** : REGLEMENT = FUCEC | N°COMPTE = {numero_compte}
  - **Mention légale** : "Pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée"
  - **Signature & Cachet** : espace DG (Frédéric BANOUE)
- [ ] 🔴 `GET /api/bulletins/[id]/pdf` — retourner le PDF (Content-Type: application/pdf)
- [ ] 🔴 Vérifier temps de génération < 3 secondes
- [ ] 🟠 `POST /api/bulletins/pdf-lot` — PDF de tous les bulletins d'une période

---

## PHASE 8 — Module 5 : Périodes de Paie (Semaine 4)

### 8.1 API Routes — Périodes
- [ ] 🔴 `GET /api/periodes` — liste avec stats (nb bulletins validés/total)
- [ ] 🔴 `POST /api/periodes` — créer (vérifier unicité mois+annee)
- [ ] 🔴 `POST /api/periodes/[id]/cloturer` :
  - Vérifier que TOUS les bulletins sont au statut `valide`
  - UPDATE periodes → `cloturee`
  - UPDATE bulletins → `archive`
  - Logger dans `audit_logs`
- [ ] 🟠 `GET /api/periodes/[id]/stats`

### 8.2 Pages Frontend — Périodes (Shadcn)
- [ ] 🟠 `src/app/(dashboard)/periodes/page.tsx`
  - DataTable : Période | Statut | Bulletins validés/total | Actions
  - Dialog "Nouvelle période" + AlertDialog de confirmation clôture
  - Toast si clôture impossible (bulletins non validés)

---

## PHASE 9 — Module 7 : Utilisateurs & Audit (Semaine 5)

### 9.1 Service Audit
- [ ] 🔴 Créer `src/lib/audit.ts` — fonction `logAudit({ userId, action, tableCible, idEnregistrement, details, ipAddress })`
- [ ] 🔴 Appeler `logAudit()` sur : login/logout, CRUD employé, calcul bulletin, validation, clôture période, modification paramètres, CRUD utilisateur

### 9.2 API Routes — Utilisateurs (admin uniquement)
- [ ] 🔴 `GET /api/utilisateurs`
- [ ] 🔴 `POST /api/utilisateurs` — bcrypt hash (saltRounds: 12) + unicité email
- [ ] 🔴 `PUT /api/utilisateurs/[id]` — modifier nom, rôle, actif
- [ ] 🟠 `PUT /api/utilisateurs/[id]/reset-password`
- [ ] 🟠 `DELETE /api/utilisateurs/[id]` — soft delete

### 9.3 API Route Audit
- [ ] 🟠 `GET /api/audit` — journal paginé (admin uniquement)

### 9.4 Pages Frontend (Shadcn)
- [ ] 🔴 `src/app/(dashboard)/utilisateurs/page.tsx` — DataTable + Dialog création + Switch actif
- [ ] 🟡 `src/app/(dashboard)/audit/page.tsx` — DataTable journal (admin)

---

## PHASE 10 — Module 6 : États, Rapports & Dashboard (Semaine 5–6)

### 10.1 API Routes — Rapports
- [x] 🔴 `GET /api/rapports/journal-paie?mois=&annee=`
- [x] 🔴 `GET /api/rapports/cnss?mois=&annee=`
- [x] 🔴 `GET /api/rapports/amu?mois=&annee=`
- [x] 🔴 `GET /api/rapports/irpp?mois=&annee=`
- [x] 🟠 `GET /api/rapports/masse-salariale?annee=`
- [x] 🟠 `GET /api/rapports/attestation/[employe_id]`
- [x] 🟠 `GET /api/rapports/fiche-virement?mois=&annee=`
- [ ] 🟡 `GET /api/rapports/livre-paie?annee=`
- [x] 🔴 Export `?format=pdf` (PDFKit) et `?format=excel` (exceljs) sur chaque rapport

### 10.2 API Route Dashboard
- [x] 🔴 `GET /api/dashboard` → nb_employes_actifs, masse_salariale_mois, nb_bulletins_valides, total_cnss, total_amu, evolution_3_mois

### 10.3 Pages Frontend (Shadcn + recharts)
- [x] 🔴 `src/app/(dashboard)/dashboard/page.tsx` — 4 Cards + BarChart + PieChart
- [x] 🔴 `src/app/(dashboard)/rapports/page.tsx` — Tabs + sélecteurs mois/année + DataTable + ExportButtons
- [x] 🟠 `src/components/rapports/ExportButtons.tsx`

---

## PHASE 11 — Module 8 : Archivage & Sauvegarde (Semaine 6)

### 11.1 Archivage
- [ ] 🔴 Archivage auto à la clôture (statut → `archive`)
- [ ] 🟠 `GET /api/bulletins/historique?employe_id=&annee=&mois=&statut=` — recherche multicritère
- [ ] 🟠 `GET /api/bulletins/export-historique?format=csv|pdf`

### 11.2 Sauvegarde BDD
- [ ] 🔴 Créer `scripts/backup.sh` (mysqldump + rotation 30 jours)
- [ ] 🔴 Configurer CRON quotidien : `0 2 * * * /path/to/backup.sh`
- [ ] 🟠 `POST /api/admin/backup` — sauvegarde manuelle (admin)
- [ ] 🟠 Créer `scripts/restore.sh`

---

## PHASE 12 — Tests & Recette (Semaine 7)

### 12.1 Tests moteur de calcul
- [ ] 🔴 Installer Jest + ts-jest
- [ ] 🔴 Créer `__tests__/calcul-paie.test.ts` :
  - [ ] `calculerTauxAnciennete(0)` → 0%
  - [ ] `calculerTauxAnciennete(1)` → 0%
  - [ ] `calculerTauxAnciennete(2)` → 2%
  - [ ] `calculerTauxAnciennete(10)` → 10%
  - [ ] `calculerTauxAnciennete(30)` → 25% (plafond)
  - [ ] `calculerIRPP(72450, 0, bareme)` → 0 (RNI < 900 000)
  - [ ] `calculerIRPP(500000, 0, bareme)` → valeur cohérente avec barème OTR
  - [ ] `calculerCNSS(72450, 0.04)` → 2898
  - [ ] `calculerAMU(72450, 0.05)` → 3623 (arrondi)
  - [ ] `calculerTIP16(450, 7000, 10000, 10000)` → 27450
  - [ ] `calculerSalaireBrut(45000, 27450, 0)` → 72450
  - [ ] `calculerSalaireNetApresRetenues(72450, 6521)` → 65930
  - [ ] `calculerRemunerationNette(65930, 10000, 25000, 0, 0)` → 100930

### 12.2 Tests critères recette CDC (R01 à R08)
- [ ] 🔴 R01 : bulletin de référence → SN21 = 100 930
- [ ] 🔴 R02 : CS07=2898, AM3=3623, IRPP=0
- [ ] 🟠 R03 : calcul en lot 10+ employés < 30 secondes
- [ ] 🔴 R04 : droits d'accès par rôle (403 si rôle insuffisant)
- [ ] 🟠 R05 : exports PDF + Excel des rapports
- [ ] 🔴 R06 : PDF bulletin conforme au modèle
- [ ] 🟠 R07 : injection SQL rejetée par Zod
- [ ] 🟠 R08 : backup + restore BDD

---

## PHASE 13 — Déploiement & Livrables (Semaine 8)

### 13.1 Déploiement
- [ ] 🔴 `npm run build` en production
- [ ] 🔴 Serveur Ubuntu : Node.js 18+, MySQL 8, Nginx, PM2
- [ ] 🔴 Nginx reverse proxy (port 80 → 3000) + HTTPS Let's Encrypt
- [ ] 🔴 `pm2 start npm --name "solutech-paie" -- start`
- [ ] 🔴 Migrations BDD + seed sur le serveur de production
- [ ] 🔴 Smoke test en production

### 13.2 Livrables
- [ ] 🔴 Code source GitHub (dépôt privé)
- [ ] 🔴 README avec instructions d'installation complètes
- [ ] 🔴 PV de recette rempli et signé
- [ ] 🟠 Manuel utilisateur par rôle
- [ ] 🟠 Manuel d'administration

---

## SUIVI EXIGENCES FONCTIONNELLES

| ID    | Exigence                                | Priorité    | Phase  | Statut |
|-------|-----------------------------------------|-------------|--------|--------|
| EF01  | Bulletin identique au modèle fourni     | 🔴 CRITIQUE  | 6+7    | `[ ]`  |
| EF02  | 21 rubriques SB01→SN21 dans l'ordre     | 🔴 CRITIQUE  | 2.3+6  | `[ ]`  |
| EF03  | Calcul auto brut/net/rémunération       | 🔴 CRITIQUE  | 6.3    | `[ ]`  |
| EF04  | CNSS = 4% du salaire brut               | 🔴 CRITIQUE  | 6.3    | `[ ]`  |
| EF05  | AMU = 5% du salaire brut                | 🔴 CRITIQUE  | 6.3    | `[ ]`  |
| EF06  | IRPP selon barème OTR togolais          | 🔴 CRITIQUE  | 6.1    | `[ ]`  |
| EF07  | Prime ancienneté règle togolaise        | 🟠 HAUTE     | 6.2    | `[ ]`  |
| EF08  | Bulletin PDF conforme N°20-2026         | 🔴 CRITIQUE  | 7      | `[ ]`  |
| EF09  | Cumuls mensuels/annuels CNSS/IRPP       | 🟠 HAUTE     | 6.6    | `[ ]`  |
| EF10  | Verrouillage après validation           | 🟠 HAUTE     | 6.5    | `[ ]`  |
| EF11  | Journal d'audit                         | 🟠 HAUTE     | 9.1    | `[ ]`  |
| EF12  | Export PDF et Excel                     | 🟡 MOYENNE   | 10.1   | `[ ]`  |
| EF13  | Tableau de bord                         | 🟡 MOYENNE   | 10.3   | `[ ]`  |
| EF14  | Droits d'accès par rôle                 | 🔴 CRITIQUE  | 3.2    | `[ ]`  |
| EF15  | Numérotation automatique bulletins      | 🟠 HAUTE     | 6.4    | `[ ]`  |

---
*Stack : Next.js 14 · Shadcn/ui · MySQL (mysql2 sans ORM) · NextAuth · PDFKit*
*Dernière mise à jour : Août 2026*

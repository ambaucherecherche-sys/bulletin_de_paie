# PROMPT.md — Agent IA · Système de Gestion des Bulletins de Paie SOLUTECH
> Prompt maître à donner à l'agent IA au début de chaque session de travail.
> Contient : contexte, stack, BDD, formules de calcul officielles togolaises, règles UI, patterns de code, prompts par phase.

---

## 🧠 CONTEXTE DU PROJET

Tu es un expert développeur full-stack. Tu travailles sur le projet **"Mise en place d'un système de gestion des bulletins de paie"** pour **SOLUTECH Informatique & Services** (Lomé, Togo), réalisé par **TOURE Prince Nafis**, année académique 2025-2026.

### Stack technique (immuable — ne jamais proposer autre chose)
- **Framework** : Next.js 16.3.3 App Router + TypeScript strict
- **UI** : **Shadcn/ui + Tailwind CSS — tout le frontend utilise exclusivement Shadcn/ui**
- **Backend** : API Routes Next.js (`src/app/api/`)
- **Base de données** : MySQL — **`mysql2/promise` avec SQL pur, aucun ORM**
- **Authentification** : NextAuth.js avec Credentials Provider
- **PDF** : PDFKit
- **Export Excel** : exceljs
- **Formulaires** : react-hook-form + Zod
- **Graphiques** : SHADCN
- **Dates** : date-fns

---

## 📁 STRUCTURE DU PROJET

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← sidebar + header
│   │   ├── dashboard/page.tsx
│   │   ├── employes/
│   │   │   ├── page.tsx
│   │   │   ├── nouveau/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── modifier/page.tsx
│   │   ├── bulletins/
│   │   │   ├── page.tsx
│   │   │   ├── nouveau/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── periodes/page.tsx
│   │   ├── parametres/page.tsx
│   │   ├── rapports/page.tsx
│   │   ├── utilisateurs/page.tsx
│   │   └── audit/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── employes/route.ts
│       ├── employes/[id]/route.ts
│       ├── bulletins/route.ts
│       ├── bulletins/[id]/route.ts
│       ├── bulletins/[id]/valider/route.ts
│       ├── bulletins/[id]/pdf/route.ts
│       ├── bulletins/calculer-lot/route.ts
│       ├── bulletins/historique/route.ts
│       ├── parametres/route.ts
│       ├── parametres/bareme-irpp/route.ts
│       ├── periodes/route.ts
│       ├── periodes/[id]/route.ts
│       ├── periodes/[id]/cloturer/route.ts
│       ├── rapports/[type]/route.ts
│       ├── utilisateurs/route.ts
│       ├── utilisateurs/[id]/route.ts
│       ├── cumuls/[employe_id]/[annee]/route.ts
│       ├── dashboard/route.ts
│       ├── audit/route.ts
│       └── admin/backup/route.ts
├── lib/
│   ├── db.ts                       ← pool MySQL, query/queryOne
│   ├── auth.ts                     ← config NextAuth
│   ├── auth-helpers.ts             ← requireAuth, requireRole
│   ├── calcul-paie.ts              ← moteur de calcul complet (OTR)
│   ├── pdf-bulletin.ts             ← génération PDF
│   ├── audit.ts                    ← service logAudit()
│   └── validations.ts              ← schémas Zod
├── components/
│   ├── ui/                         ← Shadcn auto-généré
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── employes/
│   ├── bulletins/
│   │   ├── BulletinPreview.tsx
│   │   └── BulletinTable.tsx
│   └── rapports/
│       └── ExportButtons.tsx
└── types/
    └── index.ts
```

---

## 🗄️ BASE DE DONNÉES MYSQL

**Règle absolue : toujours des requêtes préparées (`?`), jamais de concaténation SQL.**

```sql
-- utilisateurs
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('administrateur','gestionnaire_rh','comptable','directeur','employe') NOT NULL DEFAULT 'employe',
  actif TINYINT(1) NOT NULL DEFAULT 1,
  derniere_connexion DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- employes
CREATE TABLE employes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricule VARCHAR(50) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  date_entree DATE NOT NULL,
  situation_matrimoniale ENUM('celibataire','marie','divorce','veuf') DEFAULT 'celibataire',
  nb_personnes_charge INT DEFAULT 0,
  poste VARCHAR(150),
  departement VARCHAR(100),
  classement VARCHAR(20),
  nif VARCHAR(50) UNIQUE,
  numero_cnss VARCHAR(50) UNIQUE,
  numero_compte VARCHAR(50),
  etablissement_financier VARCHAR(100) DEFAULT 'FUCEC',
  salaire_base DECIMAL(15,2) NOT NULL DEFAULT 0,
  salaire_categoriel DECIMAL(15,2) NOT NULL DEFAULT 0,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  utilisateur_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- rubriques (21 rubriques dans l'ordre du bulletin)
CREATE TABLE rubriques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  designation VARCHAR(200) NOT NULL,
  type_rubrique ENUM('gain','retenue') NOT NULL,
  taux DECIMAL(10,4) DEFAULT 0,
  est_calcule TINYINT(1) DEFAULT 0,
  ordre_affichage INT DEFAULT 0,
  actif TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bareme_irpp (barème officiel OTR — 8 tranches annuelles)
CREATE TABLE bareme_irpp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tranche_min DECIMAL(15,2) NOT NULL,
  tranche_max DECIMAL(15,2),           -- NULL pour la dernière tranche
  taux DECIMAL(5,4) NOT NULL
);

-- parametres
CREATE TABLE parametres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cle VARCHAR(100) NOT NULL UNIQUE,
  valeur VARCHAR(255) NOT NULL,
  description TEXT,
  date_effet DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- periodes_paie
CREATE TABLE periodes_paie (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mois INT NOT NULL,
  annee INT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut ENUM('ouverte','cloturee') DEFAULT 'ouverte',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_periode (mois, annee)
);

-- compteur_bulletins
CREATE TABLE compteur_bulletins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  annee INT NOT NULL,
  mois INT NOT NULL,
  dernier_numero INT DEFAULT 0,
  UNIQUE KEY unique_compteur (annee, mois)
);

-- bulletins
CREATE TABLE bulletins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  employe_id INT NOT NULL,
  periode_id INT NOT NULL,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  statut ENUM('brouillon','valide','archive') DEFAULT 'brouillon',
  -- Bloc 1 : éléments imposables
  salaire_base DECIMAL(15,2) DEFAULT 0,
  salaire_categoriel DECIMAL(15,2) DEFAULT 0,
  prime_anciennete DECIMAL(15,2) DEFAULT 0,
  taux_anciennete DECIMAL(5,4) DEFAULT 0,
  heures_supp DECIMAL(15,2) DEFAULT 0,
  indemnite_logement DECIMAL(15,2) DEFAULT 0,
  indemnite_transport DECIMAL(15,2) DEFAULT 0,
  total_indemnites_imposables DECIMAL(15,2) DEFAULT 0,
  sursalaire DECIMAL(15,2) DEFAULT 0,
  salaire_brut DECIMAL(15,2) DEFAULT 0,
  -- Bloc 2 : retenues légales
  irpp DECIMAL(15,2) DEFAULT 0,
  cnss DECIMAL(15,2) DEFAULT 0,
  amu DECIMAL(15,2) DEFAULT 0,
  total_retenues_legales DECIMAL(15,2) DEFAULT 0,
  salaire_net_retenues DECIMAL(15,2) DEFAULT 0,
  -- Bloc 3 : rémunération totale (RT17 = SNR11 avant primes non imposables)
  remuneration_totale DECIMAL(15,2) DEFAULT 0,
  -- Bloc 4 : primes non imposables et autres retenues
  primes_caisse DECIMAL(15,2) DEFAULT 0,
  primes_salissure DECIMAL(15,2) DEFAULT 0,
  primes_cantine DECIMAL(15,2) DEFAULT 0,
  retenue_avance DECIMAL(15,2) DEFAULT 0,
  autres_retenues DECIMAL(15,2) DEFAULT 0,
  total_autres_retenues DECIMAL(15,2) DEFAULT 0,
  -- Bloc 5 : rémunération nette finale
  remuneration_nette DECIMAL(15,2) DEFAULT 0,
  nb_jours INT DEFAULT 30,
  created_by INT,
  validated_by INT,
  validated_at DATETIME,
  FOREIGN KEY (employe_id) REFERENCES employes(id),
  FOREIGN KEY (periode_id) REFERENCES periodes_paie(id),
  FOREIGN KEY (created_by) REFERENCES utilisateurs(id),
  FOREIGN KEY (validated_by) REFERENCES utilisateurs(id)
);

-- lignes_bulletin
CREATE TABLE lignes_bulletin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bulletin_id INT NOT NULL,
  rubrique_id INT NOT NULL,
  base DECIMAL(15,2) DEFAULT 0,
  taux_ou_nombre DECIMAL(10,4) DEFAULT 0,
  montant_retenue DECIMAL(15,2) DEFAULT 0,
  montant_gain DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (bulletin_id) REFERENCES bulletins(id) ON DELETE CASCADE,
  FOREIGN KEY (rubrique_id) REFERENCES rubriques(id)
);

-- cumuls
CREATE TABLE cumuls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employe_id INT NOT NULL,
  annee INT NOT NULL,
  mois INT NOT NULL,
  cum_cnss DECIMAL(15,2) DEFAULT 0,
  cum_irpp DECIMAL(15,2) DEFAULT 0,
  cum_brut DECIMAL(15,2) DEFAULT 0,
  UNIQUE KEY unique_cumul (employe_id, annee, mois),
  FOREIGN KEY (employe_id) REFERENCES employes(id)
);

-- audit_logs
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_cible VARCHAR(100),
  id_enregistrement INT,
  details TEXT,
  ip_address VARCHAR(45),
  date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);
```

---

## 🔢 FORMULES DE CALCUL DE LA PAIE
### Règles officielles togolaises (OTR + Code du Travail) — FIGÉES

```
══════════════════════════════════════════════════════════════════
ORDRE EXACT DES 21 RUBRIQUES (à respecter dans le code ET le PDF)
══════════════════════════════════════════════════════════════════

Ordre 1  | SB01   | Salaire de Base               | gain    | saisie
Ordre 2  | PA02   | Prime d'Ancienneté             | gain    | calculé
Ordre 3  | HS03   | Forfait Heures Supplémentaires | gain    | saisie
Ordre 4  | ICL13  | Indemnité Logement             | gain    | saisie
Ordre 5  | ICT14  | Indemnité Transport            | gain    | saisie
Ordre 6  | TIP16  | Total Indemnités Imposables    | gain    | calculé
Ordre 7  | SS05   | Sursalaire                     | gain    | saisie
Ordre 8  | SB06   | Salaire Brut ★                 | gain    | calculé
Ordre 9  | IRPP08 | IRPP                           | retenue | calculé
Ordre 10 | CS07   | CNSS                           | retenue | calculé
Ordre 11 | AM3    | AMU                            | retenue | calculé
Ordre 12 | RL10   | Total Retenues Légales         | retenue | calculé
Ordre 13 | SNR11  | Salaire Net Après Retenues     | gain    | calculé
Ordre 14 | RT17   | Rémunération Totale ★          | gain    | calculé ← juste après SNR11
Ordre 15 | IR04   | Primes de Caisse               | gain    | saisie
Ordre 16 | IR12   | Primes de Salissure            | gain    | saisie
Ordre 17 | ICH15  | Primes de Cantine              | gain    | saisie
Ordre 18 | RAS18  | Retenue/Avance sur Salaire     | retenue | saisie
Ordre 19 | AR19   | Autres Retenues                | retenue | saisie
Ordre 20 | TR20   | Total Autres Retenues          | retenue | calculé
Ordre 21 | SN21   | Rémunération Nette ★           | gain    | calculé

══════════════════════════════════════════════════════════════════
BLOC 1 — ÉLÉMENTS IMPOSABLES
══════════════════════════════════════════════════════════════════

SB01  = salaire_base contractuel de l'employé (saisi sur la fiche employé)

PA02  = salaire_categoriel × taux_anciennete
        Règle togolaise officielle (Code du Travail + OTR) :
          - Ancienneté < 2 ans accomplis  → taux = 0%
          - Ancienneté = 2 ans accomplis  → taux = 2%
          - Ancienneté = N ans (N ≥ 2)    → taux = N%  (ex: 5 ans = 5%)
          - Plafond maximum               → taux = 25% (atteint à 25 ans)
        La BASE est le SALAIRE CATÉGORIEL (grille salariale officielle togolaise)
        et NON le salaire brut total.
        Formule : taux = min(max(annees_accomplies, 0) < 2 ? 0 : annees_accomplies, 25)

HS03  = montant forfaitaire heures supplémentaires (saisi)

ICL13 = montant indemnité compensatrice de logement (saisi)

ICT14 = montant indemnité compensatrice de transport (saisi)

TIP16 = PA02 + HS03 + ICL13 + ICT14
        ← TOTAL INDEMNITÉS ET PRIMES IMPOSABLES (hors SB01)
        Sur le bulletin N°20-2026 : 450 + 7000 + 10000 + 10000 = 27 450 ✅

SS05  = montant sursalaire (saisi, souvent 0)

SB06  = SB01 + TIP16 + SS05
        ← SALAIRE BRUT
        Sur le bulletin N°20-2026 : 45000 + 27450 + 0 = 72 450 ✅

══════════════════════════════════════════════════════════════════
BLOC 2 — RETENUES LÉGALES (règles OTR officielles)
══════════════════════════════════════════════════════════════════

──── IRPP08 : Impôt sur le Revenu des Personnes Physiques ────

Étape 1 — Annualisation et base imposable :
  salaire_brut_annuel      = SB06 × 12
  cotisations_annuelles    = salaire_brut_annuel × 0.09
                             (= 4% CNSS + 5% AMU, base du calcul OTR)
  salaire_apres_cotis      = salaire_brut_annuel - cotisations_annuelles
  Si salaire_apres_cotis < 10 000 000 :
    abattement             = salaire_apres_cotis × 0.28
  Sinon :
    abattement             = 2 800 000           (plafond 28% de 10M)
  RNI_annuel               = salaire_apres_cotis - abattement

Étape 2 — Barème progressif OTR (8 tranches annuelles en XOF) :
  Tranche 1 : [0          → 900 000]    → 0%
  Tranche 2 : [900 001    → 3 000 000]  → 3%
  Tranche 3 : [3 000 001  → 6 000 000]  → 10%
  Tranche 4 : [6 000 001  → 9 000 000]  → 15%
  Tranche 5 : [9 000 001  → 12 000 000] → 20%
  Tranche 6 : [12 000 001 → 15 000 000] → 25%
  Tranche 7 : [15 000 001 → 20 000 000] → 30%
  Tranche 8 : [20 000 001 → ∞]          → 35%

  Algorithme progressif :
    impot_annuel_theorique = 0
    Pour chaque tranche [min_t, max_t, taux_t] :
      montant_dans_tranche = min(RNI_annuel, max_t ?? RNI_annuel) - min_t
      Si montant_dans_tranche > 0 :
        impot_annuel_theorique += montant_dans_tranche × taux_t

Étape 3 — Quotient familial (réduction charges de famille) :
  Célibataire / 0 personne à charge → reduction = 0
  À paramétrer selon la table OTR des parts familiales
  impot_annuel_net = max(0, impot_annuel_theorique - reduction_familiale)

Résultat mensuel :
  IRPP08_mensuel = ceil(impot_annuel_net / 12)   ← arrondi au FCFA supérieur, min 0

Validation avec bulletin N°20-2026 (SB06 = 72 450 FCFA/mois) :
  salaire_brut_annuel   = 72 450 × 12  = 869 400
  cotisations_annuelles = 869 400 × 9% = 78 246
  salaire_apres_cotis   = 869 400 - 78 246 = 791 154
  abattement (28%)      = 791 154 × 28% = 221 523
  RNI_annuel            = 791 154 - 221 523 = 569 631
  Tranche 1 (0→900K @0%) : RNI=569 631 < 900 000 → impôt = 0 ✅
  IRPP08_mensuel        = 0 ✅ (case vide sur le bulletin de référence)

──── CS07 : CNSS ────
  CS07 = SB06 × 0.04
  Sur N°20-2026 : 72 450 × 0.04 = 2 898 ✅

──── AM3 : AMU ────
  AM3 = SB06 × 0.05
  Sur N°20-2026 : 72 450 × 0.05 = 3 622.5 → arrondi = 3 623 ✅

──── RL10 : Total Retenues Légales ────
  RL10 = IRPP08 + CS07 + AM3
  Sur N°20-2026 : 0 + 2 898 + 3 623 = 6 521 ✅

──── SNR11 : Salaire Net Après Retenues Légales ────
  SNR11 = SB06 - RL10
  Sur N°20-2026 : 72 450 - 6 521 = 65 929 → affiché 65 930 (arrondi) ✅

══════════════════════════════════════════════════════════════════
BLOC 3 — RÉMUNÉRATION TOTALE
(position 14 dans le bulletin, IMMÉDIATEMENT après SNR11)
══════════════════════════════════════════════════════════════════

RT17 = SNR11
       ← RÉMUNÉRATION TOTALE
       Sur N°20-2026 : RT17 = 65 930 (égal à SNR11 à ce stade)
       RT17 est le point de départ avant ajout des primes non imposables.

══════════════════════════════════════════════════════════════════
BLOC 4 — PRIMES NON IMPOSABLES ET AUTRES RETENUES
══════════════════════════════════════════════════════════════════

IR04  = primes de caisse (saisi, non imposable)
        Sur N°20-2026 : 10 000

IR12  = primes de salissure (saisi, non imposable)
        Sur N°20-2026 : 25 000

ICH15 = primes de cantine (saisi, base × nb jours si applicable)
        Sur N°20-2026 : case gain vide (affiché 833×30 comme base)

RAS18 = retenue / avance sur salaire (saisi)
        Sur N°20-2026 : 0 (case vide)

AR19  = autres retenues (saisi)
        Sur N°20-2026 : 0 (case vide)

TR20  = RAS18 + AR19
        ← TOTAL AUTRES RETENUES
        Sur N°20-2026 : affiché 35 000 dans colonne Retenues (à titre informatif)
        ⚠️ TR20 N'EST PAS DÉDUIT de SN21 sur ce bulletin
        (RAS18 et AR19 sont vides → TR20 pourrait représenter une avance
        déjà récupérée antérieurement ou non applicable ce mois)

══════════════════════════════════════════════════════════════════
BLOC 5 — RÉMUNÉRATION NETTE FINALE
══════════════════════════════════════════════════════════════════

SN21 = RT17 + IR04 + IR12 + ICH15 - TR20
       ← RÉMUNÉRATION NETTE (montant réellement versé à l'employé)
       Sur N°20-2026 : 65 930 + 10 000 + 25 000 + 0 - 0 = 100 930 ✅
       (TR20=0 car RAS18=0 et AR19=0 sur ce bulletin)

══════════════════════════════════════════════════════════════════
CUMULS (tableau récapitulatif bas du bulletin)
══════════════════════════════════════════════════════════════════

cum_cnss  (mois)     = CS07 du bulletin
cum_irpp  (mois)     = IRPP08 du bulletin
cum_brut  (mois)     = SB06 du bulletin

cum_cnss  (exercice) = somme CS07 depuis janvier de l'année
cum_irpp  (exercice) = somme IRPP08 depuis janvier de l'année
cum_brut  (exercice) = somme SB06 depuis janvier de l'année

Sur N°20-2026 (mars = 3ème mois) :
  cum_cnss  mois     = 2 898  | exercice = 8 694  (≈ 3×2898)
  cum_brut  mois     = 72 450 | exercice = 217 350 (3×72450) ✅
  nb_jours  mois     = 30     | exercice = 90      ✅

══════════════════════════════════════════════════════════════════
VALIDATION COMPLÈTE BULLETIN DE RÉFÉRENCE N°20-2026
══════════════════════════════════════════════════════════════════

SB01   =  45 000   PA02  =     450   HS03   =   7 000
ICL13  =  10 000   ICT14 =  10 000   TIP16  =  27 450
SS05   =       0   SB06  =  72 450
IRPP08 =       0   CS07  =   2 898   AM3    =   3 623
RL10   =   6 521   SNR11 =  65 930
RT17   =  65 930   ← position 14, égal à SNR11
IR04   =  10 000   IR12  =  25 000   ICH15  =       0
RAS18  =       0   AR19  =       0   TR20   =  35 000 (affiché, non déduit)
SN21   = 100 930 ✅
```

---

## 🔐 AUTHENTIFICATION & RÔLES

| Rôle | Employés | Bulletins | Périodes | Paramètres | Rapports | Utilisateurs | Audit |
|------|----------|-----------|----------|------------|----------|--------------|-------|
| `administrateur` | ✅ CRUD | ✅ CRUD+Valider | ✅ CRUD+Clôturer | ✅ | ✅+Export | ✅ CRUD | ✅ |
| `gestionnaire_rh` | ✅ CRUD | ✅ CRUD+Valider | ✅ Créer/Voir | ❌ | ✅ | ❌ | ❌ |
| `comptable` | 👁️ | 👁️ | 👁️ | ❌ | ✅+Export | ❌ | ❌ |
| `directeur` | 👁️ | 👁️+Valider | 👁️ | ❌ | ✅ Dashboard | ❌ | ❌ |
| `employe` | ❌ | 👁️ Ses bulletins | ❌ | ❌ | ❌ | ❌ | ❌ |

### Pattern d'auth dans chaque API Route
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 })
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role))
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  // ... suite
}
```

---

## 🎨 RÈGLES UI SHADCN/UI

**Tout composant UI = Shadcn/ui. Jamais de composant custom si Shadcn en a un équivalent.**

| Besoin | Composant Shadcn |
|--------|-----------------|
| Tableau | `DataTable` + `@tanstack/react-table` |
| Formulaire | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage` |
| Champ texte | `Input` |
| Liste déroulante | `Select` + `SelectTrigger`, `SelectContent`, `SelectItem` |
| Date | `Calendar` + `Popover` |
| Modale | `Dialog` + `DialogContent`, `DialogHeader` |
| Confirmation | `AlertDialog` |
| Notifications | `Toast` via `useToast()` |
| Navigation | `Sidebar`, `NavigationMenu` |
| Onglets | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| Cartes | `Card`, `CardHeader`, `CardContent`, `CardFooter` |
| Badge statut | `Badge` |
| Bouton | `Button` (default, destructive, outline, ghost) |
| Chargement | `Skeleton` |
| Toggle on/off | `Switch` |

---

## 🔧 PATTERNS DE CODE

### Pool MySQL — `src/lib/db.ts`
```typescript
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
})

export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}
export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
export { pool }
```

### API Route GET avec filtres
```typescript
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const rows = await query(
    `SELECT * FROM employes WHERE actif=1 AND (nom LIKE ? OR matricule LIKE ?)`,
    [`%${search}%`, `%${search}%`]
  )
  return Response.json({ data: rows })
}
```

### API Route POST avec Zod
```typescript
const Schema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  salaire_base: z.number().positive(),
})
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 })
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success)
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const [result] = await pool.execute(
    `INSERT INTO employes (nom, salaire_base) VALUES (?, ?)`,
    [parsed.data.nom, parsed.data.salaire_base]
  ) as any
  await logAudit({ userId: Number(session.user.id), action: 'CREATION_EMPLOYE',
    tableCible: 'employes', idEnregistrement: result.insertId })
  return Response.json({ data: { id: result.insertId } }, { status: 201 })
}
```

### Cumuls SQL (ON DUPLICATE KEY UPDATE)
```sql
INSERT INTO cumuls (employe_id, annee, mois, cum_cnss, cum_irpp, cum_brut)
VALUES (?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  cum_cnss = cum_cnss + VALUES(cum_cnss),
  cum_irpp = cum_irpp + VALUES(cum_irpp),
  cum_brut = cum_brut + VALUES(cum_brut)
```

### Formulaire Shadcn + react-hook-form
```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function MonFormulaire() {
  const form = useForm({ resolver: zodResolver(Schema) })
  async function onSubmit(data: z.infer<typeof Schema>) {
    await fetch('/api/employes', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="nom" render={({ field }) => (
          <FormItem>
            <FormLabel>Nom</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Enregistrer</Button>
      </form>
    </Form>
  )
}
```

---

## 📋 PROMPTS PAR PHASE

---

### 📌 PROMPT PHASE 2 — Base de données & Setup

```
Contexte : Projet SOLUTECH (voir PROMPT.md).
Stack : Next.js 16.3.3 App Router + TypeScript + mysql2/promise (AUCUN ORM).

TÂCHE : Mettre en place la base de données et l'infrastructure du projet.

1. Crée /lib/db.ts avec le pool MySQL2 (fonctions query, queryOne, pool).

2. Crée database/schema.sql avec TOUTES les tables dans cet ordre exact
   (respect des FK) : utilisateurs → employes → rubriques → bareme_irpp
   → parametres → periodes_paie → compteur_bulletins → bulletins
   → lignes_bulletin → cumuls → audit_logs.
   Utilise exactement le schéma SQL du PROMPT.md.

3. Crée database/seed.sql avec :
   a) Admin : admin@solutech.com, mot de passe haché "Admin@2026" avec bcrypt
   b) Les 21 rubriques dans l'ordre EXACT (ordres 1 à 21) du PROMPT.md
   c) Les 8 tranches du barème IRPP OTR togolais (annuelles en XOF)
   d) Les paramètres globaux :
      taux_cnss=0.04, taux_amu=0.05, taux_cotisations_irpp=0.09,
      abattement_irpp_taux=0.28, abattement_irpp_plafond=2800000,
      anciennete_seuil_min=2, anciennete_taux_par_an=0.01,
      anciennete_plafond=0.25, nb_jours_travail=30

4. Crée database/migrate.ts pour exécuter schema.sql puis seed.sql.

5. Ajoute dans package.json : "db:migrate" et "db:seed".
```

---

### 📌 PROMPT PHASE 3 — Authentification

```
Contexte : Projet SOLUTECH (voir PROMPT.md). BDD en place.

TÂCHE : Implémenter proprement l'authentification complète avec NextAuth selon exactement next js 16.3.3, pour ça lis la documentation officielle de next js 16.3.3 dans node_modules/next/dist/docs/ 
(Authentification, gestion de session (stateless), autorisation)
1. Crée src/lib/auth.ts (Credentials Provider) :
   - bcrypt.compare(password, hash) pour vérifier le mot de passe
   - Mettre à jour derniere_connexion dans utilisateurs
   - Retourner { id, nom, email, role } dans le token JWT
   - Appeler logAudit() pour chaque connexion

2. Crée src/app/api/auth/[...nextauth]/route.ts

3. Crée src/types/next-auth.d.ts — étendre Session et JWT avec id et role

4. Crée src/middleware.ts — protéger /dashboard/* et /api/* sauf /api/auth/*

5. Crée src/lib/auth-helpers.ts avec requireAuth() et requireRole()

6. Crée src/app/(auth)/login/page.tsx avec Shadcn :
   VOICI LE COMPOSANT EXACT: "npx shadcn@latest add login-02", champs email + password, bouton, Toast erreurs.
   Redirection vers /dashboard après succès.

7. Crée src/app/(dashboard)/layout.tsx avec Sidebar Shadcn :
   VOICI EXACTEMENT LE COMPOSANT A UTILISER: "npx shadcn@latest add sidebar-05",Navigation filtrée par rôle, bouton déconnexion (shadcn) dans le footer de la sidebar.

Utilise UNIQUEMENT des composants Shadcn/ui. TypeScript strict. Zod pour la validation.
```

---

### 📌 PROMPT PHASE 4 — Module Employés

```
Contexte : Projet SOLUTECH (voir PROMPT.md). Auth en place.

TÂCHE : Module complet de gestion des employés.

1. Dans /lib/calcul-paie.ts, implémente UNIQUEMENT :
   - calculerAnciennete(dateEntree: Date): { annees: number, mois: number }
     (années entières de date à date)
   - calculerTauxAnciennete(annees: number): number
     Règle togolaise : <2 ans = 0%, 2 ans = 2%, N ans = N%, plafond 25%
   - calculerPrimeAnciennete(salaireCategoriel: number, annees: number): number
     BASE = salaire_categoriel (pas le brut total)

2. API Routes (avec vérification session + rôle) :
   GET /api/employes — liste avec filtres (search, actif)
   POST /api/employes — créer + matricule XXXX/SOLUTECH/MM/AA + logAudit
   GET /api/employes/[id] — détail
   PUT /api/employes/[id] — modifier + logAudit
   DELETE /api/employes/[id] — soft delete actif=0 + logAudit

3. Pages Shadcn/ui :ATTENTION: je veux exactement le même datatable shadcn qui se trouve dans Data Table.md
   - employes/page.tsx : DataTable ( Data Table.md), recherche, badge Actif/Inactif, bouton créer
   - employes/nouveau/page.tsx attention : adapte ce fieldset pour cette partie:import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function FieldFieldset() {
  return (
    <FieldSet className="w-full max-w-sm">
      <FieldLegend>Address Information</FieldLegend>
      <FieldDescription>
        We need your address to deliver your order.
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="street">Street Address</FieldLabel>
          <Input id="street" type="text" placeholder="123 Main St" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" type="text" placeholder="New York" />
          </Field>
          <Field>
            <FieldLabel htmlFor="zip">Postal Code</FieldLabel>
            <Input id="zip" type="text" placeholder="90502" />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
: formulaire react-hook-form + Zod
     Champs : nom, prénom, date_naissance, date_entree, situation_matrimoniale (Select),
     nb_personnes_charge, poste, departement, classement, salaire_base,
     salaire_categoriel (champ important pour PA02), nif, numero_cnss,
     numero_compte, etablissement_financier (défaut FUCEC)
     Affichage dynamique de l'ancienneté calculée
   - employes/[id]/page.tsx : fiche détail lecture seule
   - employes/[id]/modifier/page.tsx : formulaire pré-rempli
```

---

### 📌 PROMPT PHASE 5 — Paramétrage

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Module paramétrage (admin uniquement).

1. API Routes :
   GET /api/parametres
   PUT /api/parametres/[cle] — admin + logAudit
   GET /api/rubriques
   PUT /api/rubriques/[id] — admin + logAudit
   GET /api/parametres/bareme-irpp
   PUT /api/parametres/bareme-irpp — admin + logAudit

2. Page src/app/(dashboard)/parametres/page.tsx avec Tabs Shadcn :
   Onglet 1 "Paramètres globaux" : modifier taux CNSS, AMU, abattement IRPP,
     seuil ancienneté, plafond ancienneté, nb jours/mois
   Onglet 2 "Rubriques" : DataTable + Switch actif/inactif + modifier taux
   Onglet 3 "Barème IRPP (OTR)" : afficher et modifier les 8 tranches annuelles

Toute modification loggée dans audit_logs. Accès : administrateur uniquement.
```

---

### 📌 PROMPT PHASE 6 — Moteur de Calcul & Bulletins

```
Contexte : Projet SOLUTECH (voir PROMPT.md).
Les règles de calcul IRPP et PA02 sont OFFICIELLES (OTR Togo + Code du Travail).

TÂCHE : Moteur de calcul complet et module bulletins.

PARTIE A — src/lib/calcul-paie.ts — implémenter TOUTES les fonctions :

calculerIRPP(sb06: number, nbPersonnesCharge: number, bareme: BaremeIRPP[]): number
  Algorithme EXACT décrit dans PROMPT.md :
  1. Annualiser le brut
  2. Soustraire les cotisations sociales (×9%)
  3. Appliquer abattement professionnel (28%, plafond 2 800 000)
  4. Calculer RNI annuel
  5. Barème progressif OTR sur RNI (8 tranches)
  6. Quotient familial selon nb_personnes_charge
  7. IRPP mensuel = ceil(impôt_annuel / 12)
  Valider : SB06=72450 → IRPP=0 (RNI=569631 < 900000)

calculerPrimeAnciennete(salaireCategoriel: number, annees: number): number
  <2 ans = 0%, 2 ans = 2%, N ans = N%, plafond 25%
  BASE = salaire_categoriel (NON le salaire brut)

Toutes les autres fonctions (dans l'ordre des 21 rubriques) :
  calculerTIP16(pa02, hs03, icl13, ict14)    → PA02+HS03+ICL13+ICT14
  calculerSalaireBrut(sb01, tip16, ss05)      → SB06 = SB01+TIP16+SS05
  calculerCNSS(sb06, taux=0.04)              → CS07
  calculerAMU(sb06, taux=0.05)               → AM3
  calculerTotalRetenuesLegales(irpp,cnss,amu) → RL10
  calculerSalaireNetApresRetenues(sb06,rl10)  → SNR11
  calculerRemunerationTotale(snr11)           → RT17 = SNR11
  calculerTotalAutresRetenues(ras18,ar19)     → TR20
  calculerRemunerationNette(rt17,ir04,ir12,ich15,tr20) → SN21
  calculerBulletinComplet(employe, periode, elementsVariables, params, bareme)

Valider avec N°20-2026 : TIP16=27450, SB06=72450, IRPP=0,
CS07=2898, AM3=3623, RL10=6521, SNR11=65930, RT17=65930, SN21=100930

PARTIE B — API Routes bulletins :
  POST /api/bulletins/calculer
  POST /api/bulletins/calculer-lot
  GET /api/bulletins + GET /api/bulletins/[id]
  POST /api/bulletins/[id]/valider (interdit si statut ≠ brouillon)
  SQL cumuls : ON DUPLICATE KEY UPDATE

PARTIE C — Pages Shadcn :
  bulletins/page.tsx — DataTable + filtres + badges (Brouillon/Validé/Archivé)
  bulletins/nouveau/page.tsx — Select employé+période + champs variables + aperçu
  bulletins/[id]/page.tsx — tableau 21 rubriques dans l'ordre exact + cumuls bas
```

---

### 📌 PROMPT PHASE 7 — Génération PDF

```
Contexte : Projet SOLUTECH (voir PROMPT.md). PDFKit installé.

TÂCHE : Génération PDF fidèle au bulletin modèle N°20-2026.

Crée src/lib/pdf-bulletin.ts :
  genererBulletinPDF(bulletin: BulletinComplet): Promise<Buffer>

Structure EXACTE du PDF (reproduire le modèle N°20-2026) :
1. EN-TÊTE : logo SOLUTECH gauche | "BULLETIN DE PAIE N°XX-XXXX" droite | adresse
2. BANDEAU identification : Matricule | Classement | Situation Matri. | N°CNSS | NIF | Mois | Période
3. TABLEAU 21 RUBRIQUES (ordres 1→21) :
   Colonnes : Code | Désignation | Base | Taux/Nb | Retenues | Gains
   Ligne finale : "SALAIRE NET : {remuneration_nette}"
4. TABLEAU BAS : Désignation | Nb Jours | Base IRPP | Cum. IRPP | CUM CNSS | BRUT/PENSION
   Lignes MOIS et EXERCICE avec valeurs des cumuls
5. RÈGLEMENT : FUCEC | N°COMPTE : {numero_compte}
6. MENTION LÉGALE : "Pour vous aider à faire valoir vos droits,
   conservez ce bulletin de paie sans limitation de durée"
7. SIGNATURE & CACHET : espace réservé DG

Route API : GET /api/bulletins/[id]/pdf
Headers : Content-Type: application/pdf
          Content-Disposition: attachment; filename="bulletin-{numero}.pdf"
Cible performance : < 3 secondes
```

---

### 📌 PROMPT PHASE 8 — Périodes

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Module gestion des périodes de paie.

1. API Routes :
   GET /api/periodes — liste + stats (nb bulletins validés/total)
   POST /api/periodes — créer (unicité mois+annee)
   POST /api/periodes/[id]/cloturer :
     → Vérifier que TOUS les bulletins sont 'valide'
     → UPDATE periodes SET statut='cloturee'
     → UPDATE bulletins SET statut='archive'
     → logAudit()

2. Page periodes/page.tsx (Shadcn) :
   DataTable : Période | Statut badge | Bulletins validés/total | Actions
   Dialog "Nouvelle période" (mois, année, date_debut, date_fin)
   AlertDialog confirmation clôture
   Toast si clôture impossible (lister les bulletins non validés)
```

---

### 📌 PROMPT PHASE 9 — Utilisateurs & Audit

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Gestion utilisateurs et journal d'audit.

1. Crée src/lib/audit.ts :
   logAudit({ userId, action, tableCible, idEnregistrement, details, ipAddress })
   Appeler dans TOUTES les routes sensibles (voir liste dans TASK.md).

2. API Routes utilisateurs (admin) :
   GET POST PUT DELETE /api/utilisateurs/[id]
   PUT /api/utilisateurs/[id]/reset-password (bcrypt hash)
   GET /api/audit — journal paginé (admin)

3. Pages Shadcn :
   utilisateurs/page.tsx :
     DataTable : Nom | Email | Rôle (Badge coloré par rôle) | Statut | Dernière connexion
     Dialog création, Switch actif/inactif
     Couleurs badges : admin=rouge, rh=bleu, comptable=violet, directeur=orange, employe=gris
   audit/page.tsx : DataTable journal (date, user, action, table, détails)
```

---

### 📌 PROMPT PHASE 10 — Rapports & Dashboard

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Module états, rapports, exports et tableau de bord.

1. API Routes rapports (GET avec ?mois=&annee=&format=json|pdf|excel) :
   /api/rapports/journal-paie
   /api/rapports/cnss
   /api/rapports/amu
   /api/rapports/irpp
   /api/rapports/masse-salariale
   /api/rapports/attestation/[employe_id]
   /api/rapports/fiche-virement
   Export excel : exceljs | Export pdf : PDFKit

2. GET /api/dashboard :
   { nb_employes_actifs, masse_salariale_mois, nb_bulletins_valides,
     total_cnss_mois, total_amu_mois, evolution_3_mois: [{mois,annee,total_brut}] }

3. Pages Shadcn :
   dashboard/page.tsx :
     4 Cards (employés, masse salariale, CNSS, bulletins validés)
     recharts BarChart évolution masse salariale 3 mois
     recharts PieChart gains vs retenues

   rapports/page.tsx :
     Tabs par type de rapport
     Select mois + Select année
     DataTable résultats
     Composant ExportButtons (PDF + Excel)
```

---

### 📌 PROMPT PHASE 11 — Archivage & Sauvegarde

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Archivage et sauvegarde de la base de données.

1. GET /api/bulletins/historique?employe_id=&annee=&mois=&statut=
   SQL multi-critères avec JOINs employes + periodes_paie

2. GET /api/bulletins/export-historique?format=csv|pdf

3. POST /api/admin/backup (admin) :
   Exécuter mysqldump via child_process.exec()
   Sauvegarder dans /var/backups/solutech-paie/backup_{DATE}.sql

4. Crée scripts/backup.sh (mysqldump + garder 30 derniers jours)
5. Crée scripts/restore.sh

6. Page historique : filtres multicritères + DataTable + bouton PDF + export CSV
```

---

### 📌 PROMPT PHASE 12 — Tests & Recette

```
Contexte : Projet SOLUTECH (voir PROMPT.md).

TÂCHE : Tests du moteur de calcul et validation des critères de recette.

1. Installe Jest + ts-jest. Crée __tests__/calcul-paie.test.ts :
   Tests OBLIGATOIRES :
   - calculerTauxAnciennete(0) = 0
   - calculerTauxAnciennete(1) = 0
   - calculerTauxAnciennete(2) = 0.02
   - calculerTauxAnciennete(10) = 0.10
   - calculerTauxAnciennete(30) = 0.25  (plafond)
   - calculerIRPP(72450, 0, bareme_otr) = 0  (RNI=569631 < 900000)
   - calculerCNSS(72450, 0.04) = 2898
   - calculerAMU(72450, 0.05) = 3623
   - calculerTIP16(450,7000,10000,10000) = 27450
   - calculerSalaireBrut(45000,27450,0) = 72450
   - calculerTotalRetenuesLegales(0,2898,3623) = 6521
   - calculerSalaireNetApresRetenues(72450,6521) = 65930
   - calculerRemunerationNette(65930,10000,25000,0,0) = 100930

2. Valider les 8 critères de recette CDC (R01 à R08) — voir TASK.md Phase 12.
3. Documenter les résultats dans RECETTE.md.
```

---

## ⚠️ RÈGLES ABSOLUES (rappel à l'agent à chaque session)

1. **Jamais d'ORM** — mysql2/promise + SQL pur uniquement
2. **Shadcn/ui exclusivement** pour tout composant UI
3. **Toujours Zod** pour valider les entrées côté serveur
4. **Toujours requêtes préparées** — jamais de concaténation SQL
5. **Toujours vérifier la session** en début de chaque API Route
6. **Toujours logAudit()** après chaque action sensible
7. **Jamais de mot de passe en clair** — bcrypt saltRounds >= 12
8. **Bulletin validé = immuable** — vérifier statut='brouillon' avant modification
9. **Période clôturée = immuable** — vérifier statut='ouverte' avant modification
10. **Les formules de calcul sont figées** — IRPP (règle OTR), PA02 (seuil 2 ans, base catégorielle)
11. **TypeScript strict** — pas de `any`, pas de `@ts-ignore`
12. **L'ordre des 21 rubriques est sacré** — identique dans le code, le PDF et la BDD

---

## 🚀 MODE D'EMPLOI

1. **Début de session** : donne à l'agent les sections CONTEXTE + BDD + FORMULES + RÈGLES UI + RÈGLES ABSOLUES
2. **Pour chaque phase** : copie-colle le bloc PROMPT PHASE X correspondant
3. **En cas de bug calcul** : rappelle la section FORMULES DE CALCUL complète + la validation N°20-2026
4. **Pour un composant** : rappelle la liste des composants Shadcn autorisés

---
*Projet : Système de Gestion des Bulletins de Paie — SOLUTECH Informatique & Services*
*Stack : Next.js 14 · Shadcn/ui · MySQL (mysql2 sans ORM) · NextAuth · PDFKit*
*Règles fiscales : OTR Togo (IRPP), Code du Travail Togo (PA02)*
*Année académique : 2025-2026*

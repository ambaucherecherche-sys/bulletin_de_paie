/**
 * lib/calcul-paie.ts
 * Moteur de calcul SOLUTECH — formules officielles.
 * PA02 et IRPP sont calculés via taux saisis manuellement (pas de barème automatique).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Paramètres globaux (lus depuis la table `parametres`)
// ─────────────────────────────────────────────────────────────────────────────

export interface ParametresGlobaux {
  taux_cnss: number;   // en % (ex: 4)
  taux_amu: number;    // en % (ex: 5)
  taux_irpp: number;   // en % (ex: 0 = non appliqué)
  nb_jours_travail: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Info employé minimal nécessaire
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployePaieInfo {
  id: number;
  salaire_base: number;
  salaire_categoriel: number;
  date_entree: string | Date;
  nb_personnes_charge: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Éléments variables saisis manuellement par le RH
// ─────────────────────────────────────────────────────────────────────────────

export interface ElementsVariables {
  base_pa02: number;    // base pour calcul PA02 (pré-rempli avec salaire_base)
  taux_pa02: number;    // taux PA02 en % saisi manuellement (ex: 2.5)
  hs03: number;         // HS03 — Forfait heures supplémentaires
  icl13: number;        // ICL13 — Indemnité logement
  ict14: number;        // ICT14 — Indemnité transport
  ss05: number;         // SS05 — Sursalaire (défaut 0)
  ir04: number;         // IR04 — Primes de Caisse → direct dans gains
  ir12: number;         // IR12 — Primes de Salissure → direct dans gains
  base_ich15: number;   // Base cantine
  taux_ich15?: number;  // Nombre de jours cantine (alias de compatibilité)
  nb_jours_ich15?: number; // Nombre de jours cantine
  ras18: number;        // RAS18 — Retenu/Avance sur salaire
  ar19: number;         // AR19 — Autres retenues
}

// ─────────────────────────────────────────────────────────────────────────────
// Résultat calculé complet
// ─────────────────────────────────────────────────────────────────────────────

export interface BulletinCalcule {
  // Rubriques calculées
  pa02: number;          // base_pa02 × taux_pa02/100
  tip16: number;         // PA02 + HS03 + ICL13 + ICT14
  sb06: number;          // SB01 + TIP16 + SS05
  irpp08: number;        // SB06 × taux_irpp/100
  cs07: number;          // SB06 × taux_cnss/100
  am3: number;           // SB06 × taux_amu/100
  rl10: number;          // IRPP08 + CS07 + AM3
  snr11: number;         // SB06 - RL10
  rt17: number;          // = SNR11
  ich15: number;         // base_ich15 × nb_jours_ich15
  tr20: number;          // IR04 + IR12 + ICH15
  sn21: number;          // (SB06 + TR20) - (RL10 + RAS18)

  base_ich15?: number;
  nb_jours_ich15?: number;

  // Reprises des saisies (pour affichage complet)
  sb01: number;
  hs03: number;
  icl13: number;
  ict14: number;
  ss05: number;
  ir04: number;
  ir12: number;
  ras18: number;
  ar19: number;

  // Champs de compatibilité avec la BDD existante
  salaire_base: number;
  salaire_categoriel: number;
  prime_anciennete: number;   // = pa02
  taux_anciennete: number;    // = taux_pa02 (stocké tel quel)
  heures_supp: number;        // = hs03
  indemnite_logement: number; // = icl13
  indemnite_transport: number;// = ict14
  total_indemnites_imposables: number; // = tip16
  sursalaire: number;         // = ss05
  salaire_brut: number;       // = sb06
  irpp: number;               // = irpp08
  cnss: number;               // = cs07
  amu: number;                // = am3
  total_retenues_legales: number;      // = rl10
  salaire_net_retenues: number;        // = snr11
  remuneration_totale: number;         // = rt17
  primes_caisse: number;      // = ir04
  primes_salissure: number;   // = ir12
  primes_cantine: number;     // = ich15
  retenue_avance: number;     // = ras18
  autres_retenues: number;    // = ar19
  total_autres_retenues: number;       // = tr20
  remuneration_nette: number; // = sn21
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale de calcul
// ─────────────────────────────────────────────────────────────────────────────

export function calculerBulletinComplet(
  employe: EmployePaieInfo,
  elementsVariables: ElementsVariables,
  params: ParametresGlobaux
): BulletinCalcule {

  const sb01 = Number(employe.salaire_base) || 0;
  const ev = elementsVariables as any;

  const base_pa02 = Number(ev.base_pa02 ?? sb01);
  const taux_pa02 = Number(ev.taux_pa02 ?? 0);
  const hs03 = Number(ev.hs03 ?? ev.heures_supp ?? 0);
  const icl13 = Number(ev.icl13 ?? ev.indemnite_logement ?? 0);
  const ict14 = Number(ev.ict14 ?? ev.indemnite_transport ?? 0);
  const ss05 = Number(ev.ss05 ?? ev.sursalaire ?? 0);
  const ir04 = Number(ev.ir04 ?? ev.primes_caisse ?? 0);
  const ir12 = Number(ev.ir12 ?? ev.primes_salissure ?? 0);
  const base_ich15 = Number(ev.base_ich15 ?? 0);
  const nb_jours_ich15 = Number(ev.nb_jours_ich15 ?? ev.taux_ich15 ?? 0);
  const ras18 = Number(ev.ras18 ?? ev.retenue_avance ?? 0);
  const ar19 = Number(ev.ar19 ?? ev.autres_retenues ?? 0);

  // PA02 = base_pa02 × (taux_pa02 / 100)
  const pa02 = Math.round(base_pa02 * (taux_pa02 / 100));

  // TIP16 = PA02 + HS03 + ICL13 + ICT14  (NE PAS inclure SB01)
  const tip16 = pa02 + hs03 + icl13 + ict14;

  // SB06 = SB01 + TIP16 + SS05
  const sb06 = sb01 + tip16 + ss05;

  // IRPP08 = SB06 × (taux_irpp / 100)
  const irpp08 = Math.round(sb06 * (Number(params.taux_irpp || 0) / 100));

  // CS07 = SB06 × (taux_cnss / 100)
  const cs07 = Math.round(sb06 * (Number(params.taux_cnss || 0) / 100));

  // AM3 = SB06 × (taux_amu / 100)
  const am3 = Math.round(sb06 * (Number(params.taux_amu || 0) / 100));

  // RL10 = IRPP08 + CS07 + AM3
  const rl10 = irpp08 + cs07 + am3;

  // SNR11 = SB06 - RL10
  const snr11 = sb06 - rl10;

  // RT17 = SNR11
  const rt17 = snr11;

  // ICH15 = base_ich15 × nb_jours_ich15 (nombre de jours, pas en pourcentage)
  const ich15 = Math.round(base_ich15 * nb_jours_ich15);

  // TR20 = IR04 + IR12 + ICH15  (TOTAL AUTRES PRIMES)
  const tr20 = ir04 + ir12 + ich15;

  // SN21 = (SB06 + TR20) - (RL10 + RAS18)
  const sn21 = (sb06 + tr20) - (rl10 + ras18);

  return {
    // Rubriques calculées (noms courts)
    pa02,
    tip16,
    sb06,
    irpp08,
    cs07,
    am3,
    rl10,
    snr11,
    rt17,
    ich15,
    tr20,
    sn21,
    base_ich15,
    nb_jours_ich15,

    // Reprises des saisies
    sb01,
    hs03,
    icl13,
    ict14,
    ss05,
    ir04,
    ir12,
    ras18,
    ar19,

    // Aliases de compatibilité BDD
    salaire_base: sb01,
    salaire_categoriel: Number(employe.salaire_categoriel) || sb01,
    prime_anciennete: pa02,
    taux_anciennete: taux_pa02,
    heures_supp: hs03,
    indemnite_logement: icl13,
    indemnite_transport: ict14,
    total_indemnites_imposables: tip16,
    sursalaire: ss05,
    salaire_brut: sb06,
    irpp: irpp08,
    cnss: cs07,
    amu: am3,
    total_retenues_legales: rl10,
    salaire_net_retenues: snr11,
    remuneration_totale: rt17,
    primes_caisse: ir04,
    primes_salissure: ir12,
    primes_cantine: ich15,
    retenue_avance: ras18,
    autres_retenues: ar19,
    total_autres_retenues: tr20,
    remuneration_nette: sn21,
  };
}

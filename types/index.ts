export interface ElementsVariables {
  base_pa02: number;        // base pour calcul PA02
  taux_pa02: number;        // taux en % saisi manuellement
  hs03: number;
  icl13: number;
  ict14: number;
  ss05: number;
  ir04: number;             // primes de caisse → direct dans gains
  ir12: number;             // primes de salissure → direct dans gains
  base_ich15: number;       // base cantine
  taux_ich15?: number;      // nombre de jours cantine (alias)
  nb_jours_ich15?: number;  // nombre de jours cantine
  ras18: number;            // retenu/avance sur salaire
  ar19: number;
}

export interface BulletinCalcule {
  // Rubriques calculées
  pa02: number;             // base_pa02 × taux_pa02/100
  tip16: number;            // PA02 + HS03 + ICL13 + ICT14
  sb06: number;             // SB01 + TIP16 + SS05
  irpp08: number;           // SB06 × taux_irpp/100
  cs07: number;             // SB06 × taux_cnss/100
  am3: number;              // SB06 × taux_amu/100
  rl10: number;             // IRPP08 + CS07 + AM3
  snr11: number;            // SB06 - RL10
  rt17: number;             // = SNR11
  ich15: number;            // base_ich15 × nb_jours_ich15 (nombre de jours)
  tr20: number;             // IR04 + IR12 + ICH15
  sn21: number;             // (SB06 + TR20) - (RL10 + RAS18)

  base_ich15?: number;
  nb_jours_ich15?: number;

  // Reprises des saisies
  sb01: number;
  hs03: number;
  icl13: number;
  ict14: number;
  ss05: number;
  ir04: number;
  ir12: number;
  ras18: number;
  ar19: number;

  // Compatibilité BDD
  salaire_base?: number;
  salaire_categoriel?: number;
  prime_anciennete?: number;
  taux_anciennete?: number;
  heures_supp?: number;
  indemnite_logement?: number;
  indemnite_transport?: number;
  total_indemnites_imposables?: number;
  sursalaire?: number;
  salaire_brut?: number;
  irpp?: number;
  cnss?: number;
  amu?: number;
  total_retenues_legales?: number;
  salaire_net_retenues?: number;
  remuneration_totale?: number;
  primes_caisse?: number;
  primes_salissure?: number;
  primes_cantine?: number;
  retenue_avance?: number;
  autres_retenues?: number;
  total_autres_retenues?: number;
  remuneration_nette?: number;
}

export type BulletinData = BulletinCalcule;

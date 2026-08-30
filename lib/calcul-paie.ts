import { differenceInYears, differenceInMonths } from 'date-fns';

export interface BaremeIRPP {
  tranche_min: number;
  tranche_max: number | null;
  taux: number;
}

export interface ParametresGlobaux {
  taux_cnss: number;
  taux_amu: number;
  taux_cotisations_irpp: number;
  abattement_irpp_taux: number;
  abattement_irpp_plafond: number;
  anciennete_seuil_min: number;
  anciennete_taux_par_an: number;
  anciennete_plafond: number;
  nb_jours_travail: number;
}

export interface EmployePaieInfo {
  id: number;
  salaire_base: number;
  salaire_categoriel: number;
  date_entree: string | Date;
  nb_personnes_charge: number;
}

export interface ElementsVariables {
  heures_supp: number;
  indemnite_logement: number;
  indemnite_transport: number;
  sursalaire: number;
  primes_caisse: number;
  primes_salissure: number;
  primes_cantine: number;
  retenue_avance: number;
  autres_retenues: number;
}

export interface BulletinCalcule {
  salaire_base: number;
  salaire_categoriel: number;
  taux_anciennete: number;
  prime_anciennete: number; // PA02
  heures_supp: number; // HS03
  indemnite_logement: number; // ICL13
  indemnite_transport: number; // ICT14
  total_indemnites_imposables: number; // TIP16
  sursalaire: number; // SS05
  salaire_brut: number; // SB06
  
  irpp: number; // IRPP08
  cnss: number; // CS07
  amu: number; // AM3
  total_retenues_legales: number; // RL10
  salaire_net_retenues: number; // SNR11
  
  remuneration_totale: number; // RT17
  
  primes_caisse: number; // IR04
  primes_salissure: number; // IR12
  primes_cantine: number; // ICH15
  retenue_avance: number; // RAS18
  autres_retenues: number; // AR19
  total_autres_retenues: number; // TR20
  
  remuneration_nette: number; // SN21
}

export function calculerAnciennete(dateEntree: Date, dateCalcul: Date = new Date()): { annees: number; mois: number } {
  const annees = differenceInYears(dateCalcul, dateEntree);
  const mois = differenceInMonths(dateCalcul, dateEntree) % 12;
  return { annees, mois };
}

export function calculerPrimeAnciennete(salaireCategoriel: number, anneesAccomplies: number, params: ParametresGlobaux): { taux: number, montant: number } {
  let taux = 0;
  if (anneesAccomplies >= params.anciennete_seuil_min) {
    taux = anneesAccomplies * params.anciennete_taux_par_an;
  }
  taux = Math.min(taux, params.anciennete_plafond);
  const montant = Math.round(salaireCategoriel * taux);
  return { taux, montant };
}

export function calculerIRPP(sb06: number, nbPersonnesCharge: number, bareme: BaremeIRPP[], params: ParametresGlobaux): number {
  const salaireBrutAnnuel = sb06 * 12;
  const cotisationsAnnuelles = salaireBrutAnnuel * params.taux_cotisations_irpp;
  const salaireApresCotis = salaireBrutAnnuel - cotisationsAnnuelles;
  
  const abattementTheorique = salaireApresCotis * params.abattement_irpp_taux;
  const abattement = Math.min(abattementTheorique, params.abattement_irpp_plafond);
  const rniAnnuel = salaireApresCotis - abattement;
  
  if (rniAnnuel <= 0) return 0;

  let impotAnnuelTheorique = 0;
  for (const tranche of bareme) {
    if (rniAnnuel > Number(tranche.tranche_min)) {
      const maxTranche = tranche.tranche_max !== null ? Number(tranche.tranche_max) : rniAnnuel;
      const baseTranche = Math.min(rniAnnuel, maxTranche) - Number(tranche.tranche_min);
      if (baseTranche > 0) {
        impotAnnuelTheorique += baseTranche * Number(tranche.taux);
      }
    }
  }

  let reductionFamiliale = 0; 
  const impotAnnuelNet = Math.max(0, impotAnnuelTheorique - reductionFamiliale);

  return Math.ceil(impotAnnuelNet / 12);
}

export function calculerTIP16(pa02: number, hs03: number, icl13: number, ict14: number): number {
  return pa02 + hs03 + icl13 + ict14;
}

export function calculerSalaireBrut(sb01: number, tip16: number, ss05: number): number {
  return sb01 + tip16 + ss05;
}

export function calculerCNSS(sb06: number, taux: number): number {
  return Math.round(sb06 * taux);
}

export function calculerAMU(sb06: number, taux: number): number {
  return Math.round(sb06 * taux);
}

export function calculerTotalRetenuesLegales(irpp: number, cnss: number, amu: number): number {
  return irpp + cnss + amu;
}

export function calculerSalaireNetApresRetenues(sb06: number, rl10: number): number {
  return sb06 - rl10;
}

export function calculerRemunerationTotale(snr11: number): number {
  return snr11;
}

export function calculerTotalAutresRetenues(ras18: number, ar19: number): number {
  return ras18 + ar19;
}

export function calculerRemunerationNette(rt17: number, ir04: number, ir12: number, ich15: number, tr20: number): number {
  return rt17 + ir04 + ir12 + ich15 - tr20;
}

export function calculerBulletinComplet(
  employe: EmployePaieInfo,
  anneesAccomplies: number,
  elementsVariables: ElementsVariables,
  params: ParametresGlobaux,
  bareme: BaremeIRPP[]
): BulletinCalcule {
  
  const anciennete = calculerPrimeAnciennete(employe.salaire_categoriel, anneesAccomplies, params);
  const pa02 = anciennete.montant;
  
  const tip16 = calculerTIP16(pa02, elementsVariables.heures_supp, elementsVariables.indemnite_logement, elementsVariables.indemnite_transport);
  const sb06 = calculerSalaireBrut(employe.salaire_base, tip16, elementsVariables.sursalaire);
  
  const irpp = calculerIRPP(sb06, employe.nb_personnes_charge, bareme, params);
  const cnss = calculerCNSS(sb06, params.taux_cnss);
  const amu = calculerAMU(sb06, params.taux_amu);
  
  const rl10 = calculerTotalRetenuesLegales(irpp, cnss, amu);
  const snr11 = calculerSalaireNetApresRetenues(sb06, rl10);
  
  const rt17 = calculerRemunerationTotale(snr11);
  const tr20 = calculerTotalAutresRetenues(elementsVariables.retenue_avance, elementsVariables.autres_retenues);
  const sn21 = calculerRemunerationNette(rt17, elementsVariables.primes_caisse, elementsVariables.primes_salissure, elementsVariables.primes_cantine, tr20);
  
  return {
    salaire_base: employe.salaire_base,
    salaire_categoriel: employe.salaire_categoriel,
    taux_anciennete: anciennete.taux,
    prime_anciennete: pa02,
    heures_supp: elementsVariables.heures_supp,
    indemnite_logement: elementsVariables.indemnite_logement,
    indemnite_transport: elementsVariables.indemnite_transport,
    total_indemnites_imposables: tip16,
    sursalaire: elementsVariables.sursalaire,
    salaire_brut: sb06,
    irpp,
    cnss,
    amu,
    total_retenues_legales: rl10,
    salaire_net_retenues: snr11,
    remuneration_totale: rt17,
    primes_caisse: elementsVariables.primes_caisse,
    primes_salissure: elementsVariables.primes_salissure,
    primes_cantine: elementsVariables.primes_cantine,
    retenue_avance: elementsVariables.retenue_avance,
    autres_retenues: elementsVariables.autres_retenues,
    total_autres_retenues: tr20,
    remuneration_nette: sn21
  };
}

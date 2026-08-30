import { differenceInYears, differenceInMonths } from 'date-fns';

/**
 * Calcule l'ancienneté d'un employé en années et mois entiers.
 */
export function calculerAnciennete(dateEntree: Date): { annees: number; mois: number } {
  const maintenant = new Date();
  const annees = differenceInYears(maintenant, dateEntree);
  const mois = differenceInMonths(maintenant, dateEntree) % 12;
  return { annees, mois };
}

/**
 * Calcule le taux d'ancienneté selon le Code du Travail togolais.
 * - < 2 ans accomplis → 0%
 * - 2 ans → 2%
 * - N ans (N ≥ 2) → N% (plafonné à 25%)
 */
export function calculerTauxAnciennete(annees: number): number {
  if (annees < 2) return 0;
  return Math.min(annees, 25) / 100;
}

/**
 * Calcule la prime d'ancienneté.
 * BASE = salaire_categoriel (pas le salaire brut total)
 */
export function calculerPrimeAnciennete(salaireCategoriel: number, annees: number): number {
  const taux = calculerTauxAnciennete(annees);
  return Math.round(salaireCategoriel * taux);
}

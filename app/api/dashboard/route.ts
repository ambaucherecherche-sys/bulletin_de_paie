import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { peutAcceder } from '@/lib/permissions';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !peutAcceder(session.user.role as any, 'dashboard')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Statistiques globales
    const { nb_employes_actifs } = await queryOne<any>(`SELECT COUNT(*) as nb_employes_actifs FROM employes WHERE actif = 1`) || { nb_employes_actifs: 0 };
    
    // Dernière période
    const dernierePeriode = await queryOne<any>(`SELECT id, mois, annee FROM periodes_paie ORDER BY annee DESC, mois DESC LIMIT 1`);
    
    let masse_salariale_mois = 0;
    let nb_bulletins_valides = 0;
    let total_cnss_mois = 0;
    let total_amu_mois = 0;

    if (dernierePeriode) {
      const statsMois = await queryOne<any>(
        `SELECT SUM(salaire_brut) as masse_salariale, COUNT(id) as nb_bulletins, SUM(cnss) as total_cnss, SUM(amu) as total_amu
         FROM bulletins WHERE periode_id = ? AND statut IN ('valide', 'archive')`,
        [dernierePeriode.id]
      );
      if (statsMois) {
        masse_salariale_mois = Number(statsMois.masse_salariale) || 0;
        nb_bulletins_valides = Number(statsMois.nb_bulletins) || 0;
        total_cnss_mois = Number(statsMois.total_cnss) || 0;
        total_amu_mois = Number(statsMois.total_amu) || 0;
      }
    }

    // Évolution sur les 3 derniers mois avec bulletins validés
    const evolution_3_mois = await query<any>(
      `SELECT pp.mois, pp.annee, SUM(b.salaire_brut) as total_brut
       FROM periodes_paie pp
       JOIN bulletins b ON b.periode_id = pp.id
       WHERE b.statut IN ('valide', 'archive')
       GROUP BY pp.id, pp.mois, pp.annee
       ORDER BY pp.annee DESC, pp.mois DESC
       LIMIT 3`
    );

    // Gains vs Retenues (sur l'année en cours)
    const anneeEnCours = new Date().getFullYear();
    const gainsVsRetenues = await queryOne<any>(
      `SELECT 
        SUM(b.salaire_brut) as total_gains,
        SUM(b.total_retenues_legales + b.total_autres_retenues) as total_retenues
       FROM bulletins b
       JOIN periodes_paie pp ON b.periode_id = pp.id
       WHERE pp.annee = ? AND b.statut IN ('valide', 'archive')`,
      [anneeEnCours]
    ) || { total_gains: 0, total_retenues: 0 };

    return NextResponse.json({
      nb_employes_actifs,
      masse_salariale_mois,
      nb_bulletins_valides,
      total_cnss_mois,
      total_amu_mois,
      evolution_3_mois: evolution_3_mois.reverse(), // ordre chronologique
      gains_vs_retenues: {
        total_gains: Number(gainsVsRetenues.total_gains) || 0,
        total_retenues: Number(gainsVsRetenues.total_retenues) || 0,
      }
    });

  } catch (err) {
    console.error('Erreur API Dashboard:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

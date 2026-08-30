import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { 
  calculerBulletinComplet, 
  EmployePaieInfo, 
  ParametresGlobaux, 
  BaremeIRPP,
  ElementsVariables,
  calculerAnciennete
} from '@/lib/calcul-paie';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { employe_id, periode_id, elements_variables } = body;

    if (!employe_id || !periode_id || !elements_variables) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 1. Récupérer l'employé
    const employes = await query<EmployePaieInfo>('SELECT id, salaire_base, salaire_categoriel, date_entree, nb_personnes_charge FROM employes WHERE id = ?', [employe_id]);
    if (employes.length === 0) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }
    const employe = employes[0];

    // 2. Récupérer la période pour date de calcul
    const periodes = await query<any>('SELECT date_fin FROM periodes_paie WHERE id = ?', [periode_id]);
    if (periodes.length === 0) {
      return NextResponse.json({ error: 'Période introuvable' }, { status: 404 });
    }
    const periodeDateFin = new Date(periodes[0].date_fin);

    // 3. Récupérer les paramètres globaux
    const parametresRows = await query<any>('SELECT cle, valeur FROM parametres');
    const params: Partial<ParametresGlobaux> = {};
    parametresRows.forEach(row => {
      const val = parseFloat(row.valeur);
      if (!isNaN(val)) {
        (params as any)[row.cle] = val;
      }
    });

    // 4. Récupérer le barème IRPP
    const baremeRows = await query<any>('SELECT tranche_min, tranche_max, taux FROM bareme_irpp ORDER BY tranche_min ASC');
    const bareme: BaremeIRPP[] = baremeRows.map(row => ({
      tranche_min: parseFloat(row.tranche_min),
      tranche_max: row.tranche_max !== null ? parseFloat(row.tranche_max) : null,
      taux: parseFloat(row.taux)
    }));

    // 5. Calculer l'ancienneté en années accomplies
    const { annees } = calculerAnciennete(new Date(employe.date_entree), periodeDateFin);

    // 6. Calculer le bulletin
    const bulletinCalcule = calculerBulletinComplet(employe, annees, elements_variables as ElementsVariables, params as ParametresGlobaux, bareme);

    return NextResponse.json({ success: true, data: bulletinCalcule });
  } catch (error) {
    console.error('Erreur POST /api/bulletins/calculer:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

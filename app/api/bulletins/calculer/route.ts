import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { 
  calculerBulletinComplet, 
  EmployePaieInfo, 
  ParametresGlobaux,
  ElementsVariables,
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
    const employes = await query<EmployePaieInfo>(
      'SELECT id, salaire_base, salaire_categoriel, date_entree, nb_personnes_charge FROM employes WHERE id = ?',
      [employe_id]
    );
    if (employes.length === 0) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }
    const employe = employes[0];

    // 2. Récupérer les paramètres globaux depuis la table `parametres`
    // Les taux sont stockés en % (ex: 4 pour 4%, 5 pour 5%, 0 pour IRPP désactivé)
    const parametresRows = await query<any>('SELECT cle, valeur FROM parametres');
    const paramsMap: Record<string, string> = {};
    parametresRows.forEach((row: any) => { paramsMap[row.cle] = row.valeur; });

    const params: ParametresGlobaux = {
      taux_cnss: parseFloat(paramsMap['taux_cnss'] ?? '4'),
      taux_amu:  parseFloat(paramsMap['taux_amu']  ?? '5'),
      taux_irpp: parseFloat(paramsMap['taux_irpp'] ?? '0'),
      nb_jours_travail: parseFloat(paramsMap['nb_jours_travail'] ?? paramsMap['nb_jours_mois'] ?? '30'),
    };

    // 3. Calculer le bulletin avec les nouvelles formules
    const bulletinCalcule = calculerBulletinComplet(
      employe,
      elements_variables as ElementsVariables,
      params
    );

    return NextResponse.json({ success: true, data: bulletinCalcule });
  } catch (error) {
    console.error('Erreur POST /api/bulletins/calculer:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

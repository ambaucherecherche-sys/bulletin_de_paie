import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get('statut');

  let sql = 'SELECT * FROM periodes_paie WHERE 1=1';
  const params: any[] = [];

  if (statut) {
    sql += ' AND statut = ?';
    params.push(statut);
  }

  sql += ' ORDER BY annee DESC, mois DESC';

  const rows = await query(sql, params);
  return Response.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await req.json();
  const { mois, annee } = body;

  if (!mois || !annee) {
    return Response.json({ error: 'Mois et année requis' }, { status: 400 });
  }

  // Calcul auto des dates
  const dateDebut = new Date(annee, mois - 1, 1);
  const dateFin = new Date(annee, mois, 0); // dernier jour du mois

  const result = await query(
    'INSERT INTO periodes_paie (mois, annee, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, "ouverte")',
    [mois, annee, dateDebut.toISOString().split('T')[0], dateFin.toISOString().split('T')[0]]
  ) as any;

  return Response.json({ id: result.insertId }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statut = searchParams.get('statut');

    let sql = `
      SELECT 
        p.id, p.mois, p.annee, p.date_debut, p.date_fin, p.statut, p.created_at,
        COUNT(b.id) as total_bulletins,
        SUM(CASE WHEN b.statut = 'valide' THEN 1 ELSE 0 END) as bulletins_valides,
        SUM(CASE WHEN b.statut = 'archive' THEN 1 ELSE 0 END) as bulletins_archives
      FROM periodes_paie p
      LEFT JOIN bulletins b ON p.id = b.periode_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (statut) {
      sql += ' AND p.statut = ?';
      params.push(statut);
    }

    sql += ' GROUP BY p.id ORDER BY p.annee DESC, p.mois DESC';

    const periodes = await query<any>(sql, params);

    // Cast BigInts from COUNT/SUM to Numbers for JSON serialization
    const data = periodes.map(p => ({
      ...p,
      total_bulletins: Number(p.total_bulletins || 0),
      bulletins_valides: Number(p.bulletins_valides || 0),
      bulletins_archives: Number(p.bulletins_archives || 0)
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Erreur GET /api/periodes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await req.json();
    const { mois, annee, date_debut, date_fin } = body;

    if (!mois || !annee) {
      return NextResponse.json({ error: 'Mois et année requis' }, { status: 400 });
    }

    // Default dates if not provided by client
    const dateDebut = date_debut ? new Date(date_debut) : new Date(annee, mois - 1, 1);
    const dateFin = date_fin ? new Date(date_fin) : new Date(annee, mois, 0);

    // Check uniqueness
    const existing = await query<any>('SELECT id FROM periodes_paie WHERE mois = ? AND annee = ?', [mois, annee]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Une période existe déjà pour ce mois et cette année.' }, { status: 400 });
    }

    const [result] = await pool.execute(
      'INSERT INTO periodes_paie (mois, annee, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, "ouverte")',
      [mois, annee, dateDebut.toISOString().split('T')[0], dateFin.toISOString().split('T')[0]]
    );
    
    const newId = (result as any).insertId;

    await logAudit({
      userId: Number(session.user.id),
      action: 'CREATION_PERIODE',
      tableCible: 'periodes_paie',
      idEnregistrement: newId,
      details: `Création période ${mois}/${annee}`,
      ipAddress: req.headers.get('x-forwarded-for') || undefined
    });

    return NextResponse.json({ id: newId, message: 'Période créée avec succès' }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /api/periodes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

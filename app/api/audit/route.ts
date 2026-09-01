import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId    = searchParams.get('userId');
    const action    = searchParams.get('action');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin   = searchParams.get('dateFin');
    const page      = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit     = 50;
    const offset    = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];

    if (userId) {
      conditions.push('al.user_id = ?');
      values.push(Number(userId));
    }
    if (action) {
      conditions.push('al.action = ?');
      values.push(action);
    }
    if (dateDebut) {
      conditions.push('al.date_heure >= ?');
      values.push(dateDebut);
    }
    if (dateFin) {
      // Include full day
      conditions.push('al.date_heure < DATE_ADD(?, INTERVAL 1 DAY)');
      values.push(dateFin);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const logs = await query<any>(
      `SELECT
         al.id,
         al.action,
         al.table_cible,
         al.id_enregistrement,
         al.details,
         al.ip_address,
         al.date_heure,
         u.nom  AS user_nom,
         u.email AS user_email,
         u.role  AS user_role
       FROM audit_logs al
       LEFT JOIN utilisateurs u ON al.user_id = u.id
       ${where}
       ORDER BY al.date_heure DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [countRow] = await query<any>(
      `SELECT COUNT(*) as total FROM audit_logs al ${where}`,
      values
    );

    return NextResponse.json({
      data: logs,
      pagination: {
        total: countRow.total,
        page,
        limit,
        totalPages: Math.ceil(countRow.total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/audit:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

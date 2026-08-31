import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (!['administrateur', 'gestionnaire_rh', 'directeur'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    // Await params if Next 15 requires it, otherwise context.params.id works in 14.
    // The project uses Next 14, but standard approach handles both.
    const resolvedParams = await context.params;
    const periodeId = Number(resolvedParams.id);

    if (isNaN(periodeId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const periodes = await query<any>('SELECT * FROM periodes_paie WHERE id = ?', [periodeId]);
    if (periodes.length === 0) {
      return NextResponse.json({ error: 'Période introuvable' }, { status: 404 });
    }

    const periode = periodes[0];
    if (periode.statut === 'cloturee') {
      return NextResponse.json({ error: 'La période est déjà clôturée' }, { status: 400 });
    }

    // Check bulletins status
    const nonValides = await query<any>(
      `SELECT b.numero, e.nom, e.prenom, b.statut 
       FROM bulletins b 
       JOIN employes e ON b.employe_id = e.id 
       WHERE b.periode_id = ? AND b.statut != 'valide'`, 
      [periodeId]
    );

    if (nonValides.length > 0) {
      const messages = nonValides.map((b: any) => `${b.numero} (${b.prenom} ${b.nom}) - ${b.statut}`);
      return NextResponse.json({ 
        error: 'Impossible de clôturer : certains bulletins ne sont pas validés.',
        details: messages
      }, { status: 400 });
    }

    // Proceed to close
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Update periode
      await connection.execute(
        'UPDATE periodes_paie SET statut = "cloturee" WHERE id = ?',
        [periodeId]
      );

      // 2. Archive bulletins
      await connection.execute(
        'UPDATE bulletins SET statut = "archive" WHERE periode_id = ? AND statut = "valide"',
        [periodeId]
      );

      await connection.commit();
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }

    await logAudit({
      userId: Number(session.user.id),
      action: 'CLOTURE_PERIODE',
      tableCible: 'periodes_paie',
      idEnregistrement: periodeId,
      details: `Clôture de la période ${periode.mois}/${periode.annee}`,
      ipAddress: req.headers.get('x-forwarded-for') || undefined
    });

    return NextResponse.json({ message: 'Période clôturée avec succès' });
  } catch (error: any) {
    console.error('Erreur POST /api/periodes/[id]/cloturer:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

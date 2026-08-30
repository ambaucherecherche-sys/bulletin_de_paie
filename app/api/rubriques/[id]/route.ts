import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { actif, taux } = body;

    const existing: any = await query('SELECT * FROM rubriques WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Rubrique introuvable' }, { status: 404 });
    }

    const oldRubrique = existing[0];
    
    // We only update what is provided
    const newActif = actif !== undefined ? actif : oldRubrique.actif;
    const newTaux = taux !== undefined ? taux : oldRubrique.taux;

    await query('UPDATE rubriques SET actif = ?, taux = ? WHERE id = ?', [newActif, newTaux, id]);

    // Log the change
    let details = `Rubrique ${oldRubrique.code} modifiée.`;
    if (actif !== undefined && actif !== oldRubrique.actif) {
      details += ` Statut: ${oldRubrique.actif ? 'Actif' : 'Inactif'} -> ${actif ? 'Actif' : 'Inactif'}.`;
    }
    if (taux !== undefined && taux !== oldRubrique.taux) {
      details += ` Taux: ${oldRubrique.taux} -> ${taux}.`;
    }

    await logAudit({
      userId: Number(session.user.id),
      action: 'UPDATE',
      tableCible: 'rubriques',
      idEnregistrement: Number(id),
      details,
    });

    return NextResponse.json({ success: true, message: 'Rubrique mise à jour' });
  } catch (error) {
    console.error('Erreur API rubriques PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

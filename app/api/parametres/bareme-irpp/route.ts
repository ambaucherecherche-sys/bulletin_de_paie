import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const bareme = await query('SELECT * FROM bareme_irpp ORDER BY tranche_min ASC');
    return NextResponse.json(bareme);
  } catch (error) {
    console.error('Erreur API bareme_irpp GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { tranches } = body; // Expects an array of { id, tranche_min, tranche_max, taux }

    if (!tranches || !Array.isArray(tranches)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

    for (const tranche of tranches) {
      if (tranche.id) {
        await query(
          'UPDATE bareme_irpp SET tranche_min = ?, tranche_max = ?, taux = ? WHERE id = ?',
          [tranche.tranche_min, tranche.tranche_max !== undefined ? tranche.tranche_max : null, tranche.taux, tranche.id]
        );
      }
    }

    await logAudit({
      userId: Number(session.user.id),
      action: 'UPDATE',
      tableCible: 'bareme_irpp',
      details: 'Mise à jour complète du barème IRPP',
    });

    return NextResponse.json({ success: true, message: 'Barème IRPP mis à jour' });
  } catch (error) {
    console.error('Erreur API bareme_irpp PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

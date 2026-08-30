import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: Request, { params }: { params: Promise<{ cle: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { cle } = await params;
    const { valeur } = await request.json();

    if (valeur === undefined) {
      return NextResponse.json({ error: 'La valeur est requise' }, { status: 400 });
    }

    // Check if the parameter exists
    const existing: any = await query('SELECT id FROM parametres WHERE cle = ?', [cle]);
    let paramId: number | null = null;
    let oldVal = null;

    if (existing.length === 0) {
      // Create if it doesn't exist
      const insertResult: any = await query('INSERT INTO parametres (cle, valeur) VALUES (?, ?)', [cle, valeur]);
      paramId = insertResult.insertId;
    } else {
      paramId = existing[0].id;
      const oldParam: any = await query('SELECT valeur FROM parametres WHERE cle = ?', [cle]);
      oldVal = oldParam[0]?.valeur;
      await query('UPDATE parametres SET valeur = ? WHERE cle = ?', [valeur, cle]);
    }

    // Log the change
    await logAudit({
      userId: Number(session.user.id),
      action: 'UPDATE',
      tableCible: 'parametres',
      idEnregistrement: paramId || undefined,
      details: `Paramètre ${cle} modifié de ${oldVal || 'rien'} à ${valeur}`,
    });

    return NextResponse.json({ success: true, message: 'Paramètre mis à jour' });
  } catch (error) {
    console.error('Erreur API parametres PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

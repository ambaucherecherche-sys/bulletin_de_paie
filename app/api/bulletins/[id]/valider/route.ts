import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    
    // Vérifier si le bulletin existe et s'il est au statut brouillon
    const bulletins = await query<any>('SELECT * FROM bulletins WHERE id = ?', [id]);
    if (bulletins.length === 0) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    const bulletin = bulletins[0];
    if (bulletin.statut !== 'brouillon') {
      return NextResponse.json({ error: 'Ce bulletin n\'est pas un brouillon et ne peut plus être validé' }, { status: 400 });
    }

    // Récupérer la période (pour vérifier mois/année)
    const periodes = await query<any>('SELECT mois, annee FROM periodes_paie WHERE id = ?', [bulletin.periode_id]);
    if (periodes.length === 0) {
      return NextResponse.json({ error: 'Période introuvable' }, { status: 400 });
    }
    const { mois, annee } = periodes[0];

    // Mettre à jour le statut du bulletin
    await query(`
      UPDATE bulletins 
      SET statut = 'valide', validated_by = ?, validated_at = NOW() 
      WHERE id = ?
    `, [session.user.id, id]);

    // Mettre à jour les cumuls avec ON DUPLICATE KEY UPDATE
    await query(`
      INSERT INTO cumuls (employe_id, annee, mois, cum_cnss, cum_irpp, cum_brut)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        cum_cnss = cum_cnss + VALUES(cum_cnss),
        cum_irpp = cum_irpp + VALUES(cum_irpp),
        cum_brut = cum_brut + VALUES(cum_brut)
    `, [
      bulletin.employe_id, 
      annee, 
      mois, 
      bulletin.cnss, 
      bulletin.irpp, 
      bulletin.salaire_brut
    ]);

    // Logger l'action
    await logAudit({
      userId: Number(session.user.id),
      action: 'VALIDATION_BULLETIN',
      tableCible: 'bulletins',
      idEnregistrement: Number(id),
      details: `Validation du bulletin N°${bulletin.numero}`
    });

    return NextResponse.json({ success: true, message: 'Bulletin validé avec succès' });
  } catch (error) {
    console.error('Erreur POST /api/bulletins/[id]/valider:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

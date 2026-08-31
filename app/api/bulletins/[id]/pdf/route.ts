import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { genererBulletinPDF } from '@/lib/pdf-bulletin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !['administrateur', 'gestionnaire_rh', 'comptable', 'directeur'].includes(
        session.user.role
      )
    ) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;

    // ── Fetch bulletin + employee + period ─────────────────────────────────
    const bulletins = await query<any>(`
      SELECT b.*,
             e.nom, e.prenom, e.matricule, e.date_entree, e.classement,
             e.situation_matrimoniale, e.numero_cnss, e.nif, e.numero_compte,
             p.mois, p.annee, p.date_debut, p.date_fin
      FROM bulletins b
      JOIN employes e ON b.employe_id = e.id
      JOIN periodes_paie p ON b.periode_id = p.id
      WHERE b.id = ?
    `, [id]);

    if (bulletins.length === 0) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    const bulletin = bulletins[0];

    // ── Fetch cumuls ────────────────────────────────────────────────────────
    const cumuls = await query<any>(`
      SELECT cum_cnss, cum_irpp, cum_brut
      FROM cumuls
      WHERE employe_id = ? AND annee = ? AND mois = ?
    `, [bulletin.employe_id, bulletin.annee, bulletin.mois]);

    const cumul =
      cumuls.length > 0
        ? cumuls[0]
        : { cum_cnss: 0, cum_irpp: 0, cum_brut: 0 };

    // ── Generate PDF ────────────────────────────────────────────────────────
    const pdfBuffer = await genererBulletinPDF(bulletin, cumul);

    const filename = `bulletin-${bulletin.numero}.pdf`;

    // Buffer.buffer gives the underlying ArrayBuffer which is always a valid BodyInit
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/bulletins/[id]/pdf:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

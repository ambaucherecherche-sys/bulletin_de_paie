import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { genererBulletinPDF } from '@/lib/pdf-bulletin';

export const runtime = 'nodejs';

async function handlePdfRequest(
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

    // ── Fetch ICH15 base & nb_jours from lignes_bulletin ───────────────────
    const lignesIch15 = await query<any>(`
      SELECT l.base, l.taux_ou_nombre
      FROM lignes_bulletin l
      JOIN rubriques r ON l.rubrique_id = r.id
      WHERE l.bulletin_id = ? AND r.code = 'ICH15'
      LIMIT 1
    `, [id]);
    if (lignesIch15.length > 0) {
      bulletin.base_ich15    = Number(lignesIch15[0].base);
      bulletin.nb_jours_ich15 = Number(lignesIch15[0].taux_ou_nombre);
    }

    // ── Generate PDF ────────────────────────────────────────────────────────
    // genererBulletinPDF calcule les cumuls exercice à la volée via le numéro du mois
    const pdfBuffer = await genererBulletinPDF(bulletin, Number(bulletin.mois) || 1);
    if (pdfBuffer.length === 0) {
      throw new Error('La génération du PDF a produit un fichier vide');
    }

    const safeNumero = String(bulletin.numero || id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `bulletin-${safeNumero}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/bulletins/[id]/pdf:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la génération du PDF' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handlePdfRequest(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handlePdfRequest(request, context);
}

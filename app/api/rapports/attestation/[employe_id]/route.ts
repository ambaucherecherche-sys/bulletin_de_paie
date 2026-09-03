import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { peutAcceder } from '@/lib/permissions';
import type { NextRequest } from 'next/server';
import PDFDocument from 'pdfkit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ employe_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !peutAcceder(session.user.role as any, 'rapports')) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { employe_id } = await params;
    const employeId = parseInt(employe_id, 10);
    if (isNaN(employeId)) return Response.json({ error: 'ID invalide' }, { status: 400 });

    const format = new URL(req.url).searchParams.get('format') || 'json';

    const employe = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [employeId]);
    if (!employe) return Response.json({ error: 'Employé introuvable' }, { status: 404 });

    const dernierBulletin = await queryOne<any>(
      `SELECT b.*, pp.mois, pp.annee
       FROM bulletins b
       JOIN periodes_paie pp ON b.periode_id = pp.id
       WHERE b.employe_id = ? AND b.statut IN ('valide', 'archive')
       ORDER BY pp.annee DESC, pp.mois DESC
       LIMIT 1`,
      [employeId]
    );

    if (!dernierBulletin) {
      return Response.json({ error: 'Aucun bulletin validé pour cet employé' }, { status: 400 });
    }

    if (format === 'pdf') {
      const buf = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).font('Helvetica-Bold').text('SOLUTECH', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(16).text('ATTESTATION DE SALAIRE', { align: 'center', underline: true });
        doc.moveDown(3);
        doc.fontSize(12).font('Helvetica');

        doc.text(`Je soussigné, représentant légal de la société SOLUTECH, atteste par la présente que :`, { align: 'justify' });
        doc.moveDown(1);
        
        doc.font('Helvetica-Bold');
        doc.text(`M./Mme ${employe.nom} ${employe.prenom}`, { indent: 20 });
        doc.text(`Matricule : ${employe.matricule}`, { indent: 20 });
        doc.text(`Embauché(e) le : ${new Date(employe.date_entree).toLocaleDateString('fr-FR')}`, { indent: 20 });
        doc.text(`En qualité de : ${employe.poste || 'Non renseigné'}`, { indent: 20 });
        doc.font('Helvetica');
        
        doc.moveDown(1);
        doc.text(`Est employé(e) au sein de notre structure et perçoit à ce titre une rémunération brute mensuelle de :`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(14).text(`${new Intl.NumberFormat('fr-TG').format(dernierBulletin.salaire_brut)} FCFA`, { align: 'center' });
        doc.font('Helvetica').fontSize(12).moveDown(2);

        doc.text(`Cette attestation est délivrée pour servir et valoir ce que de droit.`);
        doc.moveDown(3);
        
        doc.text(`Fait à Lomé, le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
        doc.moveDown(3);
        doc.font('Helvetica-Bold').text(`La Direction Générale`, { align: 'right' });

        doc.end();
      });

      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="attestation-${employe.matricule.replace(/\//g, '-')}.pdf"`,
        },
      });
    }

    return Response.json({ employe, dernierBulletin });
  } catch (err) {
    console.error('Erreur GET /api/rapports/attestation:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

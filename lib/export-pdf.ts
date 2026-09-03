import PDFDocument from 'pdfkit';

export interface ColonnePDF {
  label: string;
  cle: string;
  largeur: number; // en points
  align?: 'left' | 'center' | 'right';
  type?: 'nombre' | 'texte';
}

export interface TotalPDF {
  cle: string;
  valeur: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-TG').format(Math.round(n));
}

/**
 * Génère un buffer PDF à partir de données tabulaires.
 */
export function exporterPDF(
  titre: string,
  sousTitre: string,
  colonnes: ColonnePDF[],
  lignes: Record<string, any>[],
  totaux?: TotalPDF[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width - 80; // marges 40pt de chaque côté

    // ── En-tête ──────────────────────────────────────────────────────────────
    doc.rect(40, 40, pageW, 50).fill('#1E3A5F');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text('SOLUTECH', 50, 50, { width: 200 });
    doc.fontSize(13).text(titre, 250, 50, { width: pageW - 200, align: 'center' });
    doc.fontSize(9).font('Helvetica').text(sousTitre, 250, 68, { width: pageW - 200, align: 'center' });
    doc.fillColor('#000000');

    // ── En-têtes du tableau ───────────────────────────────────────────────────
    let y = 105;
    const rowH = 18;

    doc.rect(40, y, pageW, rowH).fill('#2563EB');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    let x = 40;
    colonnes.forEach((col) => {
      doc.text(col.label, x + 2, y + 4, { width: col.largeur - 4, align: col.align ?? 'left' });
      x += col.largeur;
    });
    y += rowH;

    // ── Lignes ────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    lignes.forEach((ligne, i) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(40, y, pageW, rowH).fill(bg);
      doc.fillColor('#000000');
      let cx = 40;
      colonnes.forEach((col) => {
        const val = ligne[col.cle];
        const txt = col.type === 'nombre' && typeof val === 'number' ? fmt(val) : (val ?? '—');
        doc.text(String(txt), cx + 2, y + 4, { width: col.largeur - 4, align: col.type === 'nombre' ? 'right' : (col.align ?? 'left') });
        cx += col.largeur;
      });
      y += rowH;
    });

    // ── Totaux ────────────────────────────────────────────────────────────────
    if (totaux?.length) {
      doc.rect(40, y, pageW, rowH).fill('#DBEAFE');
      doc.fillColor('#1E40AF').font('Helvetica-Bold');
      let cx = 40;
      colonnes.forEach((col) => {
        const t = totaux.find((t) => t.cle === col.cle);
        const txt = t ? fmt(t.valeur) : (col.cle === colonnes[0].cle ? 'TOTAL' : '');
        doc.text(String(txt), cx + 2, y + 4, { width: col.largeur - 4, align: t ? 'right' : 'left' });
        cx += col.largeur;
      });
      y += rowH;
    }

    // ── Pied de page ──────────────────────────────────────────────────────────
    const footerY = doc.page.height - 35;
    doc.fillColor('#6B7280').fontSize(7).font('Helvetica')
      .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — SOLUTECH Paie`, 40, footerY, { align: 'center', width: pageW });

    doc.end();
  });
}

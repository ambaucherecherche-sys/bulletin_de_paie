import ExcelJS from 'exceljs';

export interface ColonneExcel {
  cle: string;
  label: string;
  largeur?: number;
  type?: 'nombre' | 'texte' | 'date';
}

export interface TotalExcel {
  cle: string;
  valeur: number;
}

/**
 * Génère un buffer Excel (.xlsx) à partir de données tabulaires.
 */
export async function exporterExcel(
  titre: string,
  colonnes: ColonneExcel[],
  lignes: Record<string, any>[],
  totaux?: TotalExcel[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SOLUTECH Paie';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(titre.slice(0, 31));

  // ── Titre fusionné ──────────────────────────────────────────────────────────
  sheet.mergeCells(1, 1, 1, colonnes.length);
  const titreCell = sheet.getCell('A1');
  titreCell.value = titre;
  titreCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titreCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // ── En-têtes ────────────────────────────────────────────────────────────────
  const headerRow = sheet.addRow(colonnes.map((c) => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
    };
  });

  // ── Données ─────────────────────────────────────────────────────────────────
  lignes.forEach((ligne, i) => {
    const row = sheet.addRow(colonnes.map((c) => ligne[c.cle] ?? ''));
    const bg = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
    row.eachCell((cell, colIdx) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      const col = colonnes[colIdx - 1];
      if (col?.type === 'nombre') {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  // ── Totaux ──────────────────────────────────────────────────────────────────
  if (totaux?.length) {
    const totalRow = sheet.addRow(
      colonnes.map((c) => {
        const t = totaux.find((x) => x.cle === c.cle);
        if (t) return t.valeur;
        return c.cle === colonnes[0].cle ? 'TOTAL' : '';
      })
    );
    totalRow.eachCell((cell, colIdx) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      const col = colonnes[colIdx - 1];
      if (col?.type === 'nombre') {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
      cell.border = { top: { style: 'thin', color: { argb: 'FF93C5FD' } } };
    });
  }

  // ── Largeurs des colonnes ────────────────────────────────────────────────────
  colonnes.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.largeur ?? 18;
  });

  // ── Export en Buffer ─────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

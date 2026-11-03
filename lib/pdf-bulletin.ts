/**
 * lib/pdf-bulletin.ts
 * Génération PDF du bulletin de paie SOLUTECH — reproduit fidèlement le modèle N°20-2026.
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BulletinComplet {
  // Identité bulletin
  id: number;
  numero: string;
  statut: string;
  mois: number;
  annee: number;
  date_debut: string;
  date_fin: string;

  // Identité employé
  nom: string;
  prenom: string;
  matricule: string;
  classement: string | null;
  situation_matrimoniale: string | null;
  numero_cnss: string | null;
  nif: string | null;
  numero_compte: string | null;
  date_entree: string;

  // Rubriques de paie
  salaire_base: number;
  salaire_categoriel: number;
  taux_anciennete: number;  // = taux_pa02 (en %)
  prime_anciennete: number; // = pa02 calculé
  // PA02 affichage : base = salaire_categoriel, taux = taux_anciennete%
  heures_supp: number;
  indemnite_logement: number;
  indemnite_transport: number;
  total_indemnites_imposables: number;
  sursalaire: number;
  salaire_brut: number;
  irpp: number;
  cnss: number;
  amu: number;
  total_retenues_legales: number;
  salaire_net_retenues: number;
  remuneration_totale: number;
  primes_caisse: number;
  primes_salissure: number;
  primes_cantine: number;   // = ich15 calculé
  base_ich15?: number;       // base unitaire cantine (depuis lignes_bulletin)
  nb_jours_ich15?: number;   // nombre de jours cantine (depuis lignes_bulletin)
  retenue_avance: number;
  autres_retenues: number;
  total_autres_retenues: number; // = tr20 = IR04+IR12+ICH15
  remuneration_nette: number;
}

export interface CumulBulletin {
  cum_cnss: number;
  cum_irpp: number;
  cum_brut: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, keepDash = false): string {
  if (v === null || v === undefined || v === 0) return keepDash ? '-' : '';
  const num = Number(v);
  if (isNaN(num)) return String(v);
  return Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num).replace(/\s/g, ' ');
}

function moisLabel(mois: number): string {
  const noms = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN',
                 'JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE'];
  return noms[mois - 1] ?? '';
}

function dateShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

// Arrondi à la dizaine supérieure  : 65 929 → 65 930
function roundUp10(v: number | string | null | undefined): number | null {
  const n = Number(v);
  if (!v || isNaN(n) || n === 0) return null;
  return Math.ceil(n / 10) * 10;
}

// Arrondi à la centaine supérieure : 24 990 → 25 000
function roundUp100(v: number | string | null | undefined): number | null {
  const n = Number(v);
  if (!v || isNaN(n) || n === 0) return null;
  return Math.ceil(n / 100) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row builder for 21 rubriques
// ─────────────────────────────────────────────────────────────────────────────

interface Row {
  code: string;
  label: string;
  base?: number | null;
  taux?: number | string | null;
  retenues?: number | null;
  gains?: number | null;
  bold?: boolean;
  keepDashGains?: boolean;
  keepDashRetenues?: boolean;
}

function buildRows(b: BulletinComplet): Row[] {
  // taux_anciennete en BDD stocke le taux_pa02 en %
  const tauxPa02 = Number(b.taux_anciennete);
  // Pour ICH15, on approxime la base en rétro-calculant si besoin.
  // La base est stockée dans salaire_categoriel, le calcul est : primes_cantine = base_ich15 × taux_ich15/100
  // On affiche primes_cantine comme gain, et on laisse base / taux vides (non restockés séparément)

  const displayedTr20 = roundUp100(b.total_autres_retenues) || 0;
  const displayedSn21 = roundUp10((Number(b.salaire_brut) + displayedTr20) - (Number(b.total_retenues_legales) + Number(b.retenue_avance)));

  return [
    { code: 'SB01',   label: 'SALAIRE DE BASE',                              base: b.salaire_base,               taux: 30,   retenues: null, gains: b.salaire_base },
    { code: 'PA02',   label: "PRIME D'ANCIENNETE",                           base: b.salaire_categoriel,         taux: tauxPa02 > 0 ? `${tauxPa02}%` : null, retenues: null, gains: b.prime_anciennete },
    { code: 'HS03',   label: 'FORFAIT HEURES SUPPLEMENTAIRES',               base: b.heures_supp || null,        taux: b.heures_supp > 0 ? 30 : null, retenues: null, gains: b.heures_supp },
    { code: 'ICL13',  label: 'INDEMNITE COMPENSATRICE DE LOGEMENT',          base: b.indemnite_logement || null, taux: null, retenues: null, gains: b.indemnite_logement },
    { code: 'ICT14',  label: 'INDEMNITE COMPENSATRICE DE TRANSPORT',         base: b.indemnite_transport || null,taux: null, retenues: null, gains: b.indemnite_transport },
    { code: 'TIP16',  label: 'TOTAL INDEMNITES ET PRIMES IMPOSABLES', bold: true, base: null, taux: null, retenues: null, gains: b.total_indemnites_imposables },
    { code: 'SS05',   label: 'SURSALAIRE',                                   base: null,                         taux: null, retenues: null, gains: b.sursalaire, keepDashGains: true },
    { code: 'SB06',   label: 'SALAIRE BRUT',                         bold: true, base: null, taux: null, retenues: null, gains: b.salaire_brut },
    { code: 'IRPP08', label: 'IRPP',                                         base: null,                         taux: null, retenues: b.irpp, gains: null },
    { code: 'CS07',   label: 'CNSS',                                         base: b.salaire_brut,               taux: '4%', retenues: b.cnss, gains: null },
    { code: 'AM3',    label: 'AMU',                                          base: b.salaire_brut,               taux: '5%', retenues: b.amu, gains: null },
    { code: 'RL10',   label: 'TOTAL RETENUES LEGALES',                bold: true, base: null, taux: null, retenues: b.total_retenues_legales, gains: null },
    { code: 'SNR11',  label: 'SALAIRE NET APRES RETENUES LEGALES',    bold: true, base: null, taux: null, retenues: null, gains: roundUp10(b.salaire_net_retenues) },
    { code: 'RT17',   label: 'REMUNERATION TOTALE',                   bold: true, base: null, taux: null, retenues: null, gains: roundUp10(b.remuneration_totale) },
    { code: 'IR04',   label: 'PRIMES DE CAISSE',                             base: null,                         taux: null, retenues: null, gains: b.primes_caisse, keepDashGains: true },
    { code: 'IR12',   label: 'PRIMES DE SALISSURE',                         base: null,                         taux: null, retenues: null, gains: b.primes_salissure },
    { code: 'ICH15',  label: 'PRIMES DE CANTINE',                           base: b.base_ich15 || null,             taux: b.nb_jours_ich15 || null, retenues: null, gains: roundUp100(b.primes_cantine) },
    { code: 'RAS18',  label: 'RETENU/AVANCE SUR SALAIRE',                   base: null,                         taux: null, retenues: b.retenue_avance, gains: null, keepDashRetenues: true },
    { code: 'AR19',   label: 'AUTRES RETENUES',                             base: null,                         taux: null, retenues: b.autres_retenues, gains: null },
    { code: 'TR20',   label: 'TOTAL AUTRES PRIMES',                   bold: true, base: null, taux: null, retenues: displayedTr20, gains: null },
    { code: 'SN21',   label: 'REMUNERATION NETTE',                    bold: true, base: null, taux: null, retenues: null, gains: displayedSn21 },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────

export async function genererBulletinPDF(
  bulletin: BulletinComplet,
  mois: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 22, bottom: 20, left: 28, right: 28 },
      info: {
        Title: `Bulletin de Paie N\u00b0${bulletin.numero}`,
        Author: 'SOLUTECH Informatique & Services',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Palette ──────────────────────────────────────────────────────────────
    const BLUE_HEADER = '#5190d9';
    const LIGHT_BLUE  = '#bdd7ee';
    const GRAY_HEADER = '#d0d0d0';
    const BLACK       = '#000000';
    const RED_ITALIC  = '#c00000';

    const PW  = doc.page.width;   // 595.28
    const ML  = doc.page.margins.left;   // 28
    const MR  = doc.page.margins.right;  // 28
    const CW  = PW - ML - MR;    // content width ~539

    let Y = doc.page.margins.top;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. EN-TÊTE
    // ─────────────────────────────────────────────────────────────────────────
    const logoPath = path.join(process.cwd(), 'public', 'logo_solutech.jpeg');
    const logoExists = fs.existsSync(logoPath);

    const HDR_H = 80;
    
    // Background: LIGHT_BLUE everywhere except white for "bulletin n.."
    doc.rect(ML, Y, CW, HDR_H).fill(LIGHT_BLUE);
    doc.rect(ML + 350, Y, CW - 350, 50).fill('#ffffff');
    doc.rect(ML, Y, CW, HDR_H).stroke(BLACK);

    // ── Left: Nom + Prénom + Classement ──────────────────────────────────────
    doc
      .font('Times-BoldItalic')
      .fontSize(14)
      .fillColor(BLACK)
      .text(`M. ${bulletin.prenom} ${bulletin.nom}`.toUpperCase(), ML + 10, Y + 10, { width: 190, lineBreak: false });
      
    doc
      .font('Times-BoldItalic')
      .fontSize(10)
      .fillColor(BLACK)
      .text('DEVELOPPEUR D\'APPLICATION', ML + 10, Y + 40, { width: 190, lineBreak: false });

    // ── Center: Logo ─────────────────────────────────────────────────────────
    if (logoExists) {
      doc.image(logoPath, ML + 220, Y + 5, { width: 100, height: 50 });
    }

    // ── Right: Titre bulletin ─────────────────────────────────────────────────
    doc
      .font('Times-BoldItalic')
      .fontSize(18)
      .fillColor(BLACK)
      .text('BULLETIN DE PAIE', ML + 350, Y + 10, { width: CW - 350, align: 'center' });

    doc
      .font('Times-BoldItalic')
      .fontSize(16)
      .fillColor(BLACK)
      .text(`N\u00b0${bulletin.numero}`, ML + 350, Y + 30, { width: CW - 350, align: 'center' });

    // ── Address line ──────────────────────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(BLACK)
      .text('INTEGRATEUR DE SOLUTIONS INFORMATIQUE & TELECOMS 22 BP 176 Lome - Togo', ML + 220, Y + 60, { width: CW - 220, align: 'left' });
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('Tel. : 70 41 60 73', ML + 220, Y + 70, { width: CW - 220, align: 'left' });
      
    Y += HDR_H;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BANDEAU D'IDENTIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    const BAND_H = 25;

    const bandCols = [
      { label: 'Matricule',        value: bulletin.matricule,                     w: 120, color: BLACK },
      { label: 'Classement',       value: bulletin.classement || '',              w: 55, color: BLACK },
      { label: 'Sit. Matri',       value: bulletin.situation_matrimoniale || '',  w: 50, color: BLACK },
      { label: 'N\u00b0CNSS',      value: bulletin.numero_cnss || '',             w: 54, color: RED_ITALIC },
      { label: 'NIF',              value: bulletin.nif || '',                     w: 70, color: BLACK },
      { label: '',                 value: moisLabel(bulletin.mois),               w: 50, color: BLACK, centerVal: true },
      { label: '',                 value: `Du ${dateShort(bulletin.date_debut)} AU - ${dateShort(bulletin.date_fin)}`, w: 140, color: BLACK, centerVal: true },
    ];

    let bx = ML;
    for (const col of bandCols) {
      const cw = col.w;
      doc.rect(bx, Y, cw, BAND_H).fillAndStroke(LIGHT_BLUE, BLACK);
      
      if (col.label) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#444444')
           .text(col.label, bx + 2, Y + 2, { width: cw - 4, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(col.color)
           .text(col.value, bx + 2, Y + 12, { width: cw - 4, lineBreak: false });
      } else {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(col.color)
           .text(col.value, bx + 2, Y + 8, { width: cw - 4, align: 'center', lineBreak: false });
      }
      bx += cw;
    }

    Y += BAND_H;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TABLEAU 21 RUBRIQUES
    // ─────────────────────────────────────────────────────────────────────────

    const COL = {
      code:        40,
      designation: CW - 40 - 70 - 50 - 70 - 70, // remaining (~239)
      base:        70,
      taux:        50,
      retenues:    70,
      gains:       70,
    };

    const TH_H = 18;
    const headers = [
      { label: 'Code',        w: COL.code,        align: 'left'   as const },
      { label: 'Designation', w: COL.designation, align: 'center' as const },
      { label: 'Base',        w: COL.base,        align: 'center' as const },
      { label: 'Taux/Nb',    w: COL.taux,        align: 'center' as const },
      { label: 'Retenues',   w: COL.retenues,    align: 'center' as const },
      { label: 'Gains',      w: COL.gains,       align: 'center' as const },
    ];

    doc.rect(ML, Y, CW, TH_H).fillAndStroke(LIGHT_BLUE, BLACK);
    let hx = ML;
    for (const h of headers) {
      doc.rect(hx, Y, h.w, TH_H).stroke(BLACK);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(BLACK)
        .text(h.label, hx + 2, Y + 5, { width: h.w - 4, align: h.align, lineBreak: false });
      hx += h.w;
    }
    Y += TH_H;

    const rows = buildRows(bulletin);
    const ROW_H = 24; // 21 rows * 24 = 504 height

    // Draw main body border and vertical lines
    const bodyHeight = 21 * ROW_H;
    doc.rect(ML, Y, CW, bodyHeight).stroke(BLACK);
    
    let lineX = ML;
    for (const h of headers) {
      lineX += h.w;
      if (lineX < ML + CW) {
        doc.moveTo(lineX, Y).lineTo(lineX, Y + bodyHeight).stroke(BLACK);
      }
    }

    for (const row of rows) {
      let rx = ML;
      const font = row.bold ? 'Helvetica-Bold' : 'Helvetica';

      // Code
      doc.font(font).fontSize(8).fillColor(BLACK)
         .text(row.code, rx + 3, Y + 7, { width: COL.code - 6, lineBreak: false });
      rx += COL.code;

      // Désignation
      doc.font(font).fontSize(8).fillColor(BLACK)
         .text(row.label, rx + 3, Y + 7, { width: COL.designation - 6, lineBreak: false });
      rx += COL.designation;

      // Base
      doc.font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(fmt(row.base), rx + 2, Y + 7, { width: COL.base - 4, align: 'right', lineBreak: false });
      rx += COL.base;

      // Taux
      const tauxStr = typeof row.taux === 'string'
        ? row.taux
        : (row.taux !== null && row.taux !== undefined ? String(row.taux) : '');
      doc.font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(tauxStr, rx + 2, Y + 7, { width: COL.taux - 4, align: 'center', lineBreak: false });
      rx += COL.taux;

      // Retenues
      doc.font(font).fontSize(8).fillColor(BLACK)
         .text(fmt(row.retenues, row.keepDashRetenues), rx + 2, Y + 7, { width: COL.retenues - 4, align: 'right', lineBreak: false });
      rx += COL.retenues;

      // Gains
      doc.font(font).fontSize(8).fillColor(BLACK)
         .text(fmt(row.gains, row.keepDashGains), rx + 2, Y + 7, { width: COL.gains - 4, align: 'right', lineBreak: false });

      Y += ROW_H;
    }

    const gapStartY = Y;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SALAIRE NET encadré (sous tableau)
    // ─────────────────────────────────────────────────────────────────────────
    const SN_H = 16;

    const snBoxW  = COL.gains;
    const snBoxX  = ML + CW - snBoxW;

    // Recalcul SN21 dynamically for the footer (to sync with the row calculation)
    const displayedTr20 = roundUp100(bulletin.total_autres_retenues) || 0;
    const displayedSn21 = roundUp10((Number(bulletin.salaire_brut) + displayedTr20) - (Number(bulletin.total_retenues_legales) + Number(bulletin.retenue_avance)));

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BLACK)
      .text('SALAIRE NET :', ML, Y + 5, { width: CW - snBoxW - 10, align: 'right', lineBreak: false });

    doc.rect(snBoxX, Y, snBoxW, SN_H).stroke(BLACK);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BLACK)
      .text(fmt(displayedSn21), snBoxX + 2, Y + 5, { width: snBoxW - 4, align: 'right', lineBreak: false });

    Y += SN_H + 4;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. RÈGLEMENT
    // ─────────────────────────────────────────────────────────────────────────
    const reglY = Y;
    const REGL_H = 34;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text('REGLEMENT', ML + 5, reglY + 5, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(':  FUCEC', ML + 80, reglY + 5, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text('N\u00b0COMPTE', ML + 5, reglY + 20, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(`:  ${bulletin.numero_compte || '-'}`, ML + 80, reglY + 20, { lineBreak: false });

    Y = reglY + REGL_H;

    const gapEndY = Y;
    doc.moveTo(ML, gapStartY).lineTo(ML, gapEndY).stroke(BLACK);
    doc.moveTo(ML + CW, gapStartY).lineTo(ML + CW, gapEndY).stroke(BLACK);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. TABLEAU BAS CUMULS
    // ─────────────────────────────────────────────────────────────────────────
    const cumColDefs = [
      { label: 'DESIGNATION', pct: 0.18, align: 'left'   as const },
      { label: 'NB JOURS',    pct: 0.12, align: 'center' as const },
      { label: 'BASE IRPP',   pct: 0.15, align: 'center' as const },
      { label: 'CUM. IRPP',   pct: 0.15, align: 'right'  as const },
      { label: 'CUM CNSS',    pct: 0.15, align: 'right'  as const },
      { label: 'BRUT',        pct: 0.15, align: 'right'  as const },
      { label: 'PENSION',     pct: 0.10, align: 'right'  as const },
    ];
    const cumColW = cumColDefs.map(c => Math.round(CW * c.pct));

    const CTH_H = 16;
    doc.rect(ML, Y, CW, CTH_H).fillAndStroke(GRAY_HEADER, BLACK);
    let cx = ML;
    for (let i = 0; i < cumColDefs.length; i++) {
      const cw = cumColW[i];
      doc.rect(cx, Y, cw, CTH_H).stroke(BLACK);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
        .text(cumColDefs[i].label, cx + 2, Y + 4, { width: cw - 4, align: cumColDefs[i].align, lineBreak: false });
      cx += cw;
    }
    Y += CTH_H;

    // Calcul des cumuls exercice à la volée
    // moisNum = numéro du mois (1=janv, 2=févr, ..., 12=déc)
    const moisNum = Math.max(1, Math.min(12, Number(mois) || Number(bulletin.mois) || 1));
    const cumDataRows = [
      ['MOIS',     '30',                   '-', fmt(bulletin.irpp),           fmt(bulletin.cnss),              fmt(bulletin.salaire_brut),              '-'],
      ['EXERCICE', String(moisNum * 30),   '-', fmt(bulletin.irpp * moisNum), fmt(bulletin.cnss * moisNum),    fmt(bulletin.salaire_brut * moisNum),    '-'],
    ];

    const CR_H = 16;
    for (const cr of cumDataRows) {
      doc.rect(ML, Y, CW, CR_H).fillAndStroke('#ffffff', BLACK);
      let vx = ML;
      for (let i = 0; i < cr.length; i++) {
        const cw = cumColW[i];
        doc.rect(vx, Y, cw, CR_H).stroke(BLACK);
        doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(BLACK)
          .text(cr[i], vx + 2, Y + 4, {
            width: cw - 4,
            align: i === 0 ? 'left' : 'right',
            lineBreak: false,
          });
        vx += cw;
      }
      Y += CR_H;
    }

    Y += 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 7. MENTION LÉGALE
    // ─────────────────────────────────────────────────────────────────────────
    doc
      .font('Helvetica-Oblique')
      .fontSize(7.5)
      .fillColor(RED_ITALIC)
      .text(
        'Pour vous aider a faire valoir vos droits, conservez ce bulletin de paie sans limitation de duree',
        ML, Y,
        { width: CW }
      );

    Y += 22;

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SIGNATURE & CACHET
    // ─────────────────────────────────────────────────────────────────────────
    const sigBoxW = 160;
    const sigX    = ML + CW - sigBoxW;

    doc
      .font('Times-BoldItalic')
      .fontSize(9)
      .fillColor(BLACK)
      .text('SIGNATURE & CACHET', sigX, Y, { width: sigBoxW, align: 'center' });

    // Rest of signature area left blank for manual signature/stamp
    
    doc.end();
  });
}

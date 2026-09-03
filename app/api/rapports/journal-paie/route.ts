import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { peutAcceder } from '@/lib/permissions';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { exporterExcel } from '@/lib/export-excel';
import { exporterPDF } from '@/lib/export-pdf';

const ParamsSchema = z.object({
  mois:   z.coerce.number().int().min(1).max(12),
  annee:  z.coerce.number().int().min(2000).max(2100),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

const COLONNES_EXCEL = [
  { cle: 'matricule',          label: 'Matricule',         largeur: 18 },
  { cle: 'nom',                label: 'Nom',               largeur: 20 },
  { cle: 'prenom',             label: 'Prénom',            largeur: 20 },
  { cle: 'salaire_brut',       label: 'Salaire Brut',      largeur: 16, type: 'nombre' as const },
  { cle: 'cnss',               label: 'CNSS (4%)',         largeur: 14, type: 'nombre' as const },
  { cle: 'amu',                label: 'AMU (5%)',          largeur: 14, type: 'nombre' as const },
  { cle: 'irpp',               label: 'IRPP',              largeur: 14, type: 'nombre' as const },
  { cle: 'total_retenues_legales', label: 'Tot. Retenues', largeur: 15, type: 'nombre' as const },
  { cle: 'remuneration_nette', label: 'Rémun. Nette',      largeur: 16, type: 'nombre' as const },
];

const COLONNES_PDF = [
  { cle: 'matricule',          label: 'Matricule',    largeur: 65 },
  { cle: 'nom',                label: 'Nom',          largeur: 75 },
  { cle: 'prenom',             label: 'Prénom',       largeur: 75 },
  { cle: 'salaire_brut',       label: 'Brut',         largeur: 65, type: 'nombre' as const },
  { cle: 'cnss',               label: 'CNSS',         largeur: 55, type: 'nombre' as const },
  { cle: 'amu',                label: 'AMU',          largeur: 55, type: 'nombre' as const },
  { cle: 'irpp',               label: 'IRPP',         largeur: 55, type: 'nombre' as const },
  { cle: 'remuneration_nette', label: 'Net',          largeur: 65, type: 'nombre' as const },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !peutAcceder(session.user.role as any, 'rapports')) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const p = ParamsSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!p.success) return Response.json({ error: 'Paramètres invalides', details: p.error.flatten() }, { status: 400 });
    const { mois, annee, format } = p.data;

    const lignes = await query<any>(
      `SELECT e.matricule, e.nom, e.prenom,
              b.salaire_brut, b.cnss, b.amu, b.irpp,
              b.total_retenues_legales, b.remuneration_nette
       FROM bulletins b
       JOIN employes e ON b.employe_id = e.id
       JOIN periodes_paie pp ON b.periode_id = pp.id
       WHERE pp.mois = ? AND pp.annee = ?
         AND b.statut IN ('valide', 'archive')
       ORDER BY e.nom, e.prenom`,
      [mois, annee]
    );

    const periode = `${String(mois).padStart(2, '0')}/${annee}`;
    const titre = `Journal de Paie — ${periode}`;

    if (format === 'excel') {
      const totaux = [
        { cle: 'salaire_brut',           valeur: lignes.reduce((s: number, l: any) => s + Number(l.salaire_brut), 0) },
        { cle: 'cnss',                   valeur: lignes.reduce((s: number, l: any) => s + Number(l.cnss), 0) },
        { cle: 'amu',                    valeur: lignes.reduce((s: number, l: any) => s + Number(l.amu), 0) },
        { cle: 'irpp',                   valeur: lignes.reduce((s: number, l: any) => s + Number(l.irpp), 0) },
        { cle: 'total_retenues_legales', valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_retenues_legales), 0) },
        { cle: 'remuneration_nette',     valeur: lignes.reduce((s: number, l: any) => s + Number(l.remuneration_nette), 0) },
      ];
      const buf = await exporterExcel(titre, COLONNES_EXCEL, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="journal-paie-${mois}-${annee}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const totaux = [
        { cle: 'salaire_brut',       valeur: lignes.reduce((s: number, l: any) => s + Number(l.salaire_brut), 0) },
        { cle: 'cnss',               valeur: lignes.reduce((s: number, l: any) => s + Number(l.cnss), 0) },
        { cle: 'amu',                valeur: lignes.reduce((s: number, l: any) => s + Number(l.amu), 0) },
        { cle: 'irpp',               valeur: lignes.reduce((s: number, l: any) => s + Number(l.irpp), 0) },
        { cle: 'remuneration_nette', valeur: lignes.reduce((s: number, l: any) => s + Number(l.remuneration_nette), 0) },
      ];
      const buf = await exporterPDF(titre, `Période : ${periode}`, COLONNES_PDF, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="journal-paie-${mois}-${annee}.pdf"`,
        },
      });
    }

    return Response.json({ data: lignes, total: lignes.length, periode });
  } catch (err) {
    console.error('Erreur GET /api/rapports/journal-paie:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { peutAcceder } from '@/lib/permissions';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { exporterExcel } from '@/lib/export-excel';
import { exporterPDF } from '@/lib/export-pdf';

const ParamsSchema = z.object({
  annee:  z.coerce.number().int().min(2000).max(2100),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

const COLONNES_EXCEL = [
  { cle: 'mois_str',           label: 'Mois',                 largeur: 20 },
  { cle: 'nb_bulletins',       label: 'Nb. Bulletins',        largeur: 15, type: 'nombre' as const },
  { cle: 'total_brut',         label: 'Masse Salariale Brute',largeur: 25, type: 'nombre' as const },
  { cle: 'total_cnss',         label: 'Total CNSS',           largeur: 20, type: 'nombre' as const },
  { cle: 'total_amu',          label: 'Total AMU',            largeur: 20, type: 'nombre' as const },
  { cle: 'total_irpp',         label: 'Total IRPP',           largeur: 20, type: 'nombre' as const },
  { cle: 'total_net',          label: 'Total Net Payé',       largeur: 25, type: 'nombre' as const },
];

const COLONNES_PDF = [
  { cle: 'mois_str',           label: 'Mois',          largeur: 60 },
  { cle: 'nb_bulletins',       label: 'Nb.',           largeur: 40, type: 'nombre' as const },
  { cle: 'total_brut',         label: 'Total Brut',    largeur: 70, type: 'nombre' as const },
  { cle: 'total_cnss',         label: 'Tot. CNSS',     largeur: 60, type: 'nombre' as const },
  { cle: 'total_amu',          label: 'Tot. AMU',      largeur: 60, type: 'nombre' as const },
  { cle: 'total_irpp',         label: 'Tot. IRPP',     largeur: 60, type: 'nombre' as const },
  { cle: 'total_net',          label: 'Total Net',     largeur: 70, type: 'nombre' as const },
];

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !peutAcceder(session.user.role as any, 'rapports')) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const p = ParamsSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!p.success) return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    const { annee, format } = p.data;

    const lignes = await query<any>(
      `SELECT pp.mois,
              COUNT(b.id) as nb_bulletins,
              SUM(b.salaire_brut) as total_brut,
              SUM(b.cnss) as total_cnss,
              SUM(b.amu) as total_amu,
              SUM(b.irpp) as total_irpp,
              SUM(b.remuneration_nette) as total_net
       FROM periodes_paie pp
       LEFT JOIN bulletins b ON b.periode_id = pp.id AND b.statut IN ('valide', 'archive')
       WHERE pp.annee = ?
       GROUP BY pp.mois
       ORDER BY pp.mois`,
      [annee]
    );

    const lignesFormatees = lignes.map((l: any) => ({
      ...l,
      mois_str: MOIS_NOMS[l.mois - 1],
    }));

    const titre = `Masse Salariale — Année ${annee}`;

    if (format === 'excel') {
      const totaux = [
        { cle: 'nb_bulletins', valeur: lignes.reduce((s: number, l: any) => s + Number(l.nb_bulletins), 0) },
        { cle: 'total_brut',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_brut), 0) },
        { cle: 'total_cnss',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_cnss), 0) },
        { cle: 'total_amu',    valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_amu), 0) },
        { cle: 'total_irpp',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_irpp), 0) },
        { cle: 'total_net',    valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_net), 0) },
      ];
      const buf = await exporterExcel(titre, COLONNES_EXCEL, lignesFormatees, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="masse-salariale-${annee}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const totaux = [
        { cle: 'nb_bulletins', valeur: lignes.reduce((s: number, l: any) => s + Number(l.nb_bulletins), 0) },
        { cle: 'total_brut',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_brut), 0) },
        { cle: 'total_cnss',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_cnss), 0) },
        { cle: 'total_amu',    valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_amu), 0) },
        { cle: 'total_irpp',   valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_irpp), 0) },
        { cle: 'total_net',    valeur: lignes.reduce((s: number, l: any) => s + Number(l.total_net), 0) },
      ];
      const buf = await exporterPDF(titre, `Année : ${annee}`, COLONNES_PDF, lignesFormatees, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="masse-salariale-${annee}.pdf"`,
        },
      });
    }

    return Response.json({ data: lignesFormatees, total: lignesFormatees.length, annee });
  } catch (err) {
    console.error('Erreur GET /api/rapports/masse-salariale:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

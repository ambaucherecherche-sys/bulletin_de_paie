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
  { cle: 'matricule',    label: 'Matricule',     largeur: 18 },
  { cle: 'nom',          label: 'Nom',           largeur: 20 },
  { cle: 'prenom',       label: 'Prénom',        largeur: 20 },
  { cle: 'numero_cnss',  label: 'N° CNSS',       largeur: 18 },
  { cle: 'salaire_brut', label: 'Salaire Brut',  largeur: 16, type: 'nombre' as const },
  { cle: 'cnss',         label: 'Cotisation CNSS (4%)', largeur: 20, type: 'nombre' as const },
];

const COLONNES_PDF = [
  { cle: 'matricule',    label: 'Matricule',   largeur: 70 },
  { cle: 'nom',          label: 'Nom',         largeur: 80 },
  { cle: 'prenom',       label: 'Prénom',      largeur: 80 },
  { cle: 'numero_cnss',  label: 'N° CNSS',     largeur: 80 },
  { cle: 'salaire_brut', label: 'Brut',        largeur: 80, type: 'nombre' as const },
  { cle: 'cnss',         label: 'CNSS (4%)',   largeur: 80, type: 'nombre' as const },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !peutAcceder(session.user.role as any, 'rapports')) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const p = ParamsSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!p.success) return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    const { mois, annee, format } = p.data;

    const lignes = await query<any>(
      `SELECT e.matricule, e.nom, e.prenom, e.numero_cnss,
              b.salaire_brut, b.cnss
       FROM bulletins b
       JOIN employes e ON b.employe_id = e.id
       JOIN periodes_paie pp ON b.periode_id = pp.id
       WHERE pp.mois = ? AND pp.annee = ?
         AND b.statut IN ('valide', 'archive')
       ORDER BY e.nom, e.prenom`,
      [mois, annee]
    );

    const periode = `${String(mois).padStart(2, '0')}/${annee}`;
    const titre = `Déclaration CNSS — ${periode}`;

    if (format === 'excel') {
      const totaux = [
        { cle: 'salaire_brut', valeur: lignes.reduce((s: number, l: any) => s + Number(l.salaire_brut), 0) },
        { cle: 'cnss',         valeur: lignes.reduce((s: number, l: any) => s + Number(l.cnss), 0) },
      ];
      const buf = await exporterExcel(titre, COLONNES_EXCEL, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="cnss-${mois}-${annee}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const totaux = [
        { cle: 'salaire_brut', valeur: lignes.reduce((s: number, l: any) => s + Number(l.salaire_brut), 0) },
        { cle: 'cnss',         valeur: lignes.reduce((s: number, l: any) => s + Number(l.cnss), 0) },
      ];
      const buf = await exporterPDF(titre, `Période : ${periode}`, COLONNES_PDF, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="cnss-${mois}-${annee}.pdf"`,
        },
      });
    }

    return Response.json({ data: lignes, total: lignes.length, periode });
  } catch (err) {
    console.error('Erreur GET /api/rapports/cnss:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

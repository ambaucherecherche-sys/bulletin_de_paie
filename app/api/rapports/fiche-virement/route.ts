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
  { cle: 'matricule',               label: 'Matricule',       largeur: 18 },
  { cle: 'nom',                     label: 'Nom',             largeur: 20 },
  { cle: 'prenom',                  label: 'Prénom',          largeur: 20 },
  { cle: 'etablissement_financier', label: 'Banque',          largeur: 25 },
  { cle: 'numero_compte',           label: 'N° Compte',       largeur: 25 },
  { cle: 'remuneration_nette',      label: 'Montant à Virer', largeur: 20, type: 'nombre' as const },
];

const COLONNES_PDF = [
  { cle: 'matricule',               label: 'Matricule',   largeur: 60 },
  { cle: 'nom',                     label: 'Nom',         largeur: 70 },
  { cle: 'prenom',                  label: 'Prénom',      largeur: 70 },
  { cle: 'etablissement_financier', label: 'Banque',      largeur: 100 },
  { cle: 'numero_compte',           label: 'N° Compte',   largeur: 120 },
  { cle: 'remuneration_nette',      label: 'Montant',     largeur: 70, type: 'nombre' as const },
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
      `SELECT e.matricule, e.nom, e.prenom, e.etablissement_financier, e.numero_compte,
              b.remuneration_nette
       FROM bulletins b
       JOIN employes e ON b.employe_id = e.id
       JOIN periodes_paie pp ON b.periode_id = pp.id
       WHERE pp.mois = ? AND pp.annee = ?
         AND b.statut IN ('valide', 'archive')
         AND e.numero_compte IS NOT NULL
         AND e.numero_compte != ''
       ORDER BY e.etablissement_financier, e.nom, e.prenom`,
      [mois, annee]
    );

    const periode = `${String(mois).padStart(2, '0')}/${annee}`;
    const titre = `Fiche de Virement — ${periode}`;

    if (format === 'excel') {
      const totaux = [
        { cle: 'remuneration_nette', valeur: lignes.reduce((s: number, l: any) => s + Number(l.remuneration_nette), 0) },
      ];
      const buf = await exporterExcel(titre, COLONNES_EXCEL, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="virements-${mois}-${annee}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const totaux = [
        { cle: 'remuneration_nette', valeur: lignes.reduce((s: number, l: any) => s + Number(l.remuneration_nette), 0) },
      ];
      const buf = await exporterPDF(titre, `Période : ${periode}`, COLONNES_PDF, lignes, totaux);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="virements-${mois}-${annee}.pdf"`,
        },
      });
    }

    return Response.json({ data: lignes, total: lignes.length, periode });
  } catch (err) {
    console.error('Erreur GET /api/rapports/fiche-virement:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

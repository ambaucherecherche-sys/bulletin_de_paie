import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const EmployeUpdateSchema = z.object({
  nom: z.string().min(1, 'Nom requis').optional(),
  prenom: z.string().min(1, 'Prénom requis').optional(),
  date_naissance: z.string().optional().nullable(),
  date_entree: z.string().optional(),
  situation_matrimoniale: z.enum(['celibataire', 'marie', 'divorce', 'veuf']).optional(),
  nb_personnes_charge: z.number().int().min(0).optional(),
  poste: z.string().optional().nullable(),
  departement: z.string().optional().nullable(),
  classement: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  numero_cnss: z.string().optional().nullable(),
  numero_compte: z.string().optional().nullable(),
  etablissement_financier: z.string().optional(),
  salaire_base: z.number().min(0).optional(),
  salaire_categoriel: z.number().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;
  const employe = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [id]);
  if (!employe) return Response.json({ error: 'Employé non trouvé' }, { status: 404 });

  // Un employé ne peut voir que ses propres données
  if (session.user.role === 'employe' && employe.utilisateur_id !== Number(session.user.id)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return Response.json({ data: employe });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = EmployeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const fields = Object.keys(d).filter(k => d[k as keyof typeof d] !== undefined);
  if (fields.length === 0) return Response.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => d[f as keyof typeof d]);

  await query(`UPDATE employes SET ${setClause} WHERE id = ?`, [...values, id]);

  await logAudit({
    userId: Number(session.user.id),
    action: 'MODIFICATION_EMPLOYE',
    tableCible: 'employes',
    idEnregistrement: Number(id),
    details: `Champs modifiés : ${fields.join(', ')}`,
  });

  const updated = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [id]);
  return Response.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await params;
  await query('UPDATE employes SET actif = 0 WHERE id = ?', [id]);

  await logAudit({
    userId: Number(session.user.id),
    action: 'SUPPRESSION_EMPLOYE',
    tableCible: 'employes',
    idEnregistrement: Number(id),
    details: 'Soft delete — actif=0',
  });

  return Response.json({ data: { success: true } });
}

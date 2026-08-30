import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { format } from 'date-fns';

const EmployeSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  date_naissance: z.string().optional(),
  date_entree: z.string().min(1, 'Date d\'entrée requise'),
  situation_matrimoniale: z.enum(['celibataire', 'marie', 'divorce', 'veuf']).default('celibataire'),
  nb_personnes_charge: z.number().int().min(0).default(0),
  poste: z.string().optional(),
  departement: z.string().optional(),
  classement: z.string().optional(),
  nif: z.string().optional(),
  numero_cnss: z.string().optional(),
  numero_compte: z.string().optional(),
  etablissement_financier: z.string().default('FUCEC'),
  salaire_base: z.number().min(0),
  salaire_categoriel: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!['administrateur', 'gestionnaire_rh', 'comptable', 'directeur'].includes(session.user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const actif = searchParams.get('actif');

  let sql = `SELECT * FROM employes WHERE 1=1`;
  const params: any[] = [];

  if (search) {
    sql += ` AND (nom LIKE ? OR prenom LIKE ? OR matricule LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (actif !== null) {
    sql += ` AND actif = ?`;
    params.push(actif === 'true' ? 1 : 0);
  }

  sql += ` ORDER BY nom, prenom`;

  const rows = await query(sql, params);
  return Response.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = EmployeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // Générer le matricule : XXXX/SOLUTECH/MM/AA
  const now = new Date();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const AA = String(now.getFullYear()).slice(-2);

  // Obtenir le prochain numéro séquentiel
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) as count FROM employes',
    []
  ) as any;
  const seq = String(Number(count) + 1).padStart(4, '0');
  const matricule = `${seq}/SOLUTECH/${MM}/${AA}`;

  const [result] = await pool.execute(
    `INSERT INTO employes (matricule, nom, prenom, date_naissance, date_entree, situation_matrimoniale,
     nb_personnes_charge, poste, departement, classement, nif, numero_cnss, numero_compte,
     etablissement_financier, salaire_base, salaire_categoriel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      matricule, d.nom, d.prenom,
      d.date_naissance || null,
      d.date_entree,
      d.situation_matrimoniale,
      d.nb_personnes_charge,
      d.poste || null,
      d.departement || null,
      d.classement || null,
      d.nif || null,
      d.numero_cnss || null,
      d.numero_compte || null,
      d.etablissement_financier,
      d.salaire_base,
      d.salaire_categoriel,
    ]
  ) as any;

  await logAudit({
    userId: Number(session.user.id),
    action: 'CREATION_EMPLOYE',
    tableCible: 'employes',
    idEnregistrement: result.insertId,
    details: `Employé créé : ${d.nom} ${d.prenom} (${matricule})`,
  });

  return Response.json({ data: { id: result.insertId, matricule } }, { status: 201 });
}

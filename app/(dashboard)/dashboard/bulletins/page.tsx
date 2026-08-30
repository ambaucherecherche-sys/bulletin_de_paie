import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

import { DataTable } from './data-table';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { NouveauBulletinDrawer } from '@/components/bulletins/NouveauBulletinDrawer';

export default async function BulletinsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const bulletins = await query<any>(`
    SELECT b.id, b.numero, b.statut, b.salaire_brut, b.remuneration_nette, b.date_creation, b.employe_id, b.periode_id,
           e.nom, e.prenom, e.matricule,
           p.mois, p.annee
    FROM bulletins b
    JOIN employes e ON b.employe_id = e.id
    JOIN periodes_paie p ON b.periode_id = p.id
    ORDER BY b.id DESC
  `);

  const peutCreer = ['administrateur', 'gestionnaire_rh'].includes(session.user.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulletins de Paie</h1>
          <p className="text-muted-foreground">Gérez les fiches de paie des employés</p>
        </div>
        {peutCreer && (
          <NouveauBulletinDrawer />
        )}
      </div>

      <DataTable columns={columns} data={bulletins} />
    </div>
  );
}

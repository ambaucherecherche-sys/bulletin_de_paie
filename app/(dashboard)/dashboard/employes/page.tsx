import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

import { DataTable } from './data-table';
import { columns } from './columns';
import { Button } from '@/components/ui/button';

export default async function EmployesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const employes = await query<any>('SELECT * FROM employes ORDER BY nom, prenom');

  const peutCreer = ['administrateur', 'gestionnaire_rh'].includes(session.user.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employés</h1>
          <p className="text-muted-foreground">Gestion des employés de SOLUTECH</p>
        </div>
        {peutCreer && (
          <Button render={<Link href="/dashboard/employes/nouveau" />} nativeButton={false}>
            + Nouvel employé
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={employes} />
    </div>
  );
}

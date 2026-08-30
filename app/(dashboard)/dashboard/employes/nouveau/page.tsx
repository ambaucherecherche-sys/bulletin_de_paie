import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmployeForm } from '@/components/employes/EmployeForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function NouvelEmployePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) redirect('/dashboard/employes');

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="w-full max-w-4xl flex justify-start">
        <Button variant="outline" render={<Link href="/dashboard/employes" />} nativeButton={false}>
          ← Retour
        </Button>
      </div>
      <div className="w-full max-w-4xl">
        <EmployeForm mode="create" />
      </div>
    </div>
  );
}

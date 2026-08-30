import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { EmployeDetailView } from '@/components/employes/EmployeDetailView';

export default async function EmployeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { id } = await params;
  const employe = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [id]);
  if (!employe) notFound();

  const canEdit = ['administrateur', 'gestionnaire_rh'].includes(session.user.role);

  return <EmployeDetailView employe={employe} canEdit={canEdit} employeId={id} />;
}

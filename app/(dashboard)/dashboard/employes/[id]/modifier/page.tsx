import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { EmployeForm } from '@/components/employes/EmployeForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ModifierEmployePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!['administrateur', 'gestionnaire_rh'].includes(session.user.role)) redirect('/dashboard/employes');

  const { id } = await params;
  const employe = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [id]);
  if (!employe) notFound();

  // Convertir les dates en string ISO pour les champs date
  const defaultValues = {
    nom: employe.nom,
    prenom: employe.prenom,
    date_naissance: employe.date_naissance
      ? new Date(employe.date_naissance).toISOString().split('T')[0]
      : undefined,
    date_entree: employe.date_entree
      ? new Date(employe.date_entree).toISOString().split('T')[0]
      : '',
    situation_matrimoniale: employe.situation_matrimoniale,
    nb_personnes_charge: employe.nb_personnes_charge,
    poste: employe.poste ?? '',
    departement: employe.departement ?? '',
    classement: employe.classement ?? '',
    salaire_base: Number(employe.salaire_base),
    salaire_categoriel: Number(employe.salaire_categoriel),
    nif: employe.nif ?? '',
    numero_cnss: employe.numero_cnss ?? '',
    numero_compte: employe.numero_compte ?? '',
    etablissement_financier: employe.etablissement_financier ?? 'FUCEC',
  };

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="w-full max-w-4xl flex items-center gap-4">
        <Button variant="outline" render={<Link href={`/dashboard/employes/${id}`} />} nativeButton={false}>
          ← Retour
        </Button>

      </div>
      <div className="w-full max-w-4xl">
        <EmployeForm mode="edit" employeId={Number(id)} defaultValues={defaultValues as any} />
      </div>
    </div>
  );
}

'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { type DataTableFeatures } from './data-table-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Employe = {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string | null;
  departement: string | null;
  salaire_base: number;
  salaire_categoriel: number;
  date_entree: string;
  actif: number;
  situation_matrimoniale: string;
};

const columnHelper = createColumnHelper<DataTableFeatures, Employe>();

function ActionsCell({ row }: { row: any }) {
  const router = useRouter();
  const employe = row.original as Employe;

  const handleDelete = async () => {
    if (!confirm(`Désactiver ${employe.nom} ${employe.prenom} ?`)) return;
    await fetch(`/api/employes/${employe.id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
        <span className="sr-only">Ouvrir le menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/employes/${employe.id}`)}>
            Voir la fiche
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/employes/${employe.id}/modifier`)}>
            Modifier
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          Désactiver
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns = columnHelper.columns([
  columnHelper.accessor('matricule', {
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Matricule
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  }),
  columnHelper.accessor('nom', {
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Nom
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => `${row.original.nom} ${row.original.prenom}`,
  }),
  columnHelper.accessor('poste', {
    header: 'Poste',
    cell: ({ row }) => row.original.poste ?? <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('departement', {
    header: 'Département',
    cell: ({ row }) => row.original.departement ?? <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('salaire_base', {
    header: () => <div className="text-right">Salaire de base</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat('fr-TG', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(row.original.salaire_base)}
      </div>
    ),
  }),
  columnHelper.accessor('actif', {
    header: 'Statut',
    cell: ({ row }) => (
      <Badge variant={row.original.actif ? 'default' : 'secondary'}>
        {row.original.actif ? 'Actif' : 'Inactif'}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  }),
]);

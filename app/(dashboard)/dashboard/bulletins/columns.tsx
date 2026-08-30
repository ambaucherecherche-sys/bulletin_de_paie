'use client';

import * as React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { type DataTableFeatures } from './data-table-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NouveauBulletinDrawer } from '@/components/bulletins/NouveauBulletinDrawer';

export type BulletinRow = {
  id: number;
  numero: string;
  statut: 'brouillon' | 'valide' | 'archive';
  salaire_brut: string;
  remuneration_nette: string;
  date_creation: string;
  nom: string;
  prenom: string;
  matricule: string;
  mois: number;
  annee: number;
  employe_id: number;
  periode_id: number;
};

const columnHelper = createColumnHelper<DataTableFeatures, BulletinRow>();

function ActionsCell({ row }: { row: any }) {
  const router = useRouter();
  const bulletin = row.original as BulletinRow;
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/bulletins/${bulletin.id}`)}>
              Voir bulletin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setIsDrawerOpen(true);
            }}>
              Modifier
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <NouveauBulletinDrawer
        trigger={null}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        defaultValues={{
          employeId: bulletin.employe_id.toString(),
          periodeId: bulletin.periode_id.toString(),
        }}
        bulletinId={bulletin.id}
      />
    </>
  );
}

export const columns: any[] = [
  columnHelper.accessor('numero', {
    header: 'N° Bulletin',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('nom', {
    header: 'Employé',
    cell: (info) => (
      <div>
        <div>{info.row.original.prenom} {info.getValue()}</div>
        <div className="text-xs text-muted-foreground">{info.row.original.matricule}</div>
      </div>
    ),
  }),
  columnHelper.accessor('mois', {
    header: 'Période',
    cell: (info) => `${String(info.getValue()).padStart(2, '0')}/${info.row.original.annee}`,
  }),
  columnHelper.accessor('salaire_brut', {
    header: 'Brut',
    cell: (info) => Number(info.getValue()).toLocaleString('fr-FR') + ' F',
  }),
  columnHelper.accessor('remuneration_nette', {
    header: 'Net à Payer',
    cell: (info) => <span className="font-semibold">{Number(info.getValue()).toLocaleString('fr-FR')} F</span>,
  }),
  columnHelper.accessor('statut', {
    header: 'Statut',
    cell: (info) => {
      const status = info.getValue();
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      if (status === 'brouillon') variant = 'secondary';
      if (status === 'valide') variant = 'default';
      if (status === 'archive') variant = 'outline';

      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  }),
];

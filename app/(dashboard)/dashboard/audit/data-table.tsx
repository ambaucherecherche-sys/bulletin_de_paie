'use client';

import * as React from 'react';
import {
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type ColumnVisibilityState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import { features, type DataTableFeatures } from './data-table-features';
import type { AuditLog } from './columns';

const ACTIONS = [
  'CONNEXION',
  'CREATION_UTILISATEUR',
  'CREATION_EMPLOYE',
  'CREATION_PERIODE',
  'MODIFICATION_UTILISATEUR',
  'MODIFICATION_EMPLOYE',
  'DESACTIVATION_UTILISATEUR',
  'CHANGEMENT_MOT_DE_PASSE',
  'RESET_MOT_DE_PASSE_ADMIN',
  'VALIDATION_BULLETIN',
  'CLOTURE_PERIODE',
];

type Utilisateur = { id: number; nom: string; email: string };

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  utilisateurs: Utilisateur[];
  // Server-side filter state
  filters: { userId: string; action: string; dateDebut: string; dateFin: string };
  onFiltersChange: (f: { userId: string; action: string; dateDebut: string; dateFin: string }) => void;
  pagination: { page: number; totalPages: number; total: number };
  onPageChange: (page: number) => void;
}

function DatePickerField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" className={cn('w-40 justify-start font-normal text-sm', !date && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy', { locale: fr }) : placeholder}
        </Button>
      } />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DataTable<TData extends RowData>({
  columns, data, utilisateurs, filters, onFiltersChange, pagination, onPageChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
    manualPagination: true,
  });

  const hasFilters = filters.userId || filters.action || filters.dateDebut || filters.dateFin;

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 py-4">
        {/* Select utilisateur */}
        <Select
          value={filters.userId || '__all__'}
          onValueChange={(v) => onFiltersChange({ ...filters, userId: (v ?? '') === '__all__' ? '' : (v ?? '') })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les utilisateurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__all__">Tous les utilisateurs</SelectItem>
              {utilisateurs.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nom}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Select action */}
        <Select
          value={filters.action || '__all__'}
          onValueChange={(v) => onFiltersChange({ ...filters, action: (v ?? '') === '__all__' ? '' : (v ?? '') })}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__all__">Toutes les actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Date début */}
        <DatePickerField
          value={filters.dateDebut}
          onChange={(v) => onFiltersChange({ ...filters, dateDebut: v })}
          placeholder="Date début"
        />

        {/* Date fin */}
        <DatePickerField
          value={filters.dateFin}
          onChange={(v) => onFiltersChange({ ...filters, dateFin: v })}
          placeholder="Date fin"
        />

        {/* Reset */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ userId: '', action: '', dateDebut: '', dateFin: '' })}
          >
            <X className="mr-1 h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Aucun événement trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {pagination.total} événement(s) — Page {pagination.page} / {pagination.totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
            Précédent
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

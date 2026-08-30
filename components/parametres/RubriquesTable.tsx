'use client';

import * as React from 'react';
import {
  createColumnHelper,
  useTable,
  tableFeatures,
  columnVisibilityFeature
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Rubrique {
  id: number;
  code: string;
  designation: string;
  type_rubrique: 'gain' | 'retenue';
  taux: number;
  est_calcule: number;
  ordre_affichage: number;
  actif: number;
}

const features = tableFeatures({
  columnVisibilityFeature,
});
type DataTableFeatures = typeof features;

const columnHelper = createColumnHelper<DataTableFeatures, Rubrique>();

export function RubriquesTable() {
  const [data, setData] = React.useState<Rubrique[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRubriques = async () => {
    try {
      const res = await fetch('/api/rubriques');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      toast.error('Erreur lors du chargement des rubriques');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRubriques();
  }, []);

  const updateRubrique = async (id: number, updates: Partial<Rubrique>) => {
    try {
      const res = await fetch(`/api/rubriques/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Update failed');
      toast.success('Rubrique mise à jour');
      // Update local state to reflect change immediately
      setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) {
      toast.error('Erreur lors de la mise à jour de la rubrique');
      fetchRubriques(); // revert on error
    }
  };

  const columns = React.useMemo(() => columnHelper.columns([
    columnHelper.accessor('code', {
      header: 'Code',
      cell: info => <span className="font-mono text-xs font-semibold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('designation', {
      header: 'Désignation',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('type_rubrique', {
      header: 'Type',
      cell: info => (
        <span className="capitalize text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('taux', {
      header: 'Taux',
      cell: info => {
        const value = info.getValue();
        const [localVal, setLocalVal] = React.useState(value.toString());
        
        React.useEffect(() => {
          setLocalVal(value.toString());
        }, [value]);

        const onBlur = () => {
          const numVal = parseFloat(localVal);
          if (!isNaN(numVal) && numVal !== value) {
            updateRubrique(info.row.original.id, { taux: numVal });
          } else {
            setLocalVal(value.toString()); // Revert if invalid
          }
        };

        return (
          <Input
            type="number"
            step="any"
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onBlur={onBlur}
            className="w-24 h-8 border-transparent shadow-none hover:border-input focus-visible:border-input focus-visible:shadow-sm bg-transparent"
          />
        );
      }
    }),
    columnHelper.accessor('actif', {
      header: 'Actif',
      cell: info => {
        const isActive = info.getValue() === 1;
        return (
          <Checkbox
            checked={isActive}
            onCheckedChange={(checked) => {
              updateRubrique(info.row.original.id, { actif: checked ? 1 : 0 });
            }}
          />
        );
      }
    })
  ]), []);

  const table = useTable({
    data,
    columns,
    features,
  });

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Rubriques</h2>
        <p className="text-sm text-muted-foreground">Activez, désactivez ou modifiez les taux des rubriques de paie.</p>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : <table.FlexRender header={header} />}
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucune rubrique trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

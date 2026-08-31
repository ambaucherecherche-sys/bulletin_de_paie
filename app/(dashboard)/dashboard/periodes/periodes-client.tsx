'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildColumns, type Periode } from './columns';
import { DataTable } from './data-table';
import { NouvelleperiodeDialog } from './periode-form';

export default function PeriodesClient() {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeriodes = useCallback(async () => {
    try {
      const res = await fetch('/api/periodes');
      const json = await res.json();
      setPeriodes(json.data ?? []);
    } catch {
      console.error('Erreur lors du chargement des périodes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriodes();
  }, [fetchPeriodes]);

  const columns = buildColumns(fetchPeriodes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Périodes de paie</h1>
          <p className="text-muted-foreground">Gestion des périodes de paie de SOLUTECH</p>
        </div>
        <NouvelleperiodeDialog onSuccess={fetchPeriodes} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <DataTable columns={columns} data={periodes} />
      )}
    </div>
  );
}

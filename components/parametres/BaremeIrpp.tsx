'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface TrancheIrpp {
  id: number;
  tranche_min: number;
  tranche_max: number | null;
  taux: number;
}

export function BaremeIrpp() {
  const [tranches, setTranches] = React.useState<TrancheIrpp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function fetchBareme() {
      try {
        const res = await fetch('/api/parametres/bareme-irpp');
        if (res.ok) {
          const data: TrancheIrpp[] = await res.json();
          setTranches(data);
        }
      } catch (err) {
        toast.error('Erreur de chargement du barème IRPP');
      } finally {
        setLoading(false);
      }
    }
    fetchBareme();
  }, []);

  const handleChange = (index: number, field: keyof TrancheIrpp, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    setTranches(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: numValue };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/parametres/bareme-irpp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tranches }),
      });
      if (res.ok) {
        toast.success('Barème IRPP enregistré avec succès');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde du barème');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="mx-auto w-full max-w-4xl py-6 px-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Barème IRPP (OTR)</h2>
        <p className="text-sm text-muted-foreground">Modifiez les tranches annuelles d'imposition.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
          <div>Tranche Min (FCFA)</div>
          <div>Tranche Max (FCFA)</div>
          <div>Taux (%)</div>
        </div>

        {tranches.map((tranche, idx) => (
          <div key={tranche.id} className="grid grid-cols-3 gap-4 items-center">
            <Input
              type="number"
              step="any"
              value={tranche.tranche_min}
              onChange={(e) => handleChange(idx, 'tranche_min', e.target.value)}
            />
            <Input
              type="number"
              step="any"
              placeholder="Illimité (laisser vide)"
              value={tranche.tranche_max === null ? '' : tranche.tranche_max}
              onChange={(e) => handleChange(idx, 'tranche_max', e.target.value)}
            />
            <Input
              type="number"
              step="any"
              value={tranche.taux}
              onChange={(e) => handleChange(idx, 'taux', e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save data-icon="inline-start" />
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}

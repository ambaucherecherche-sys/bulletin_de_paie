'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface Parametre {
  id: number;
  cle: string;
  valeur: string;
}

const DEFAULT_PARAMS = [
  { cle: 'TAUX_CNSS', label: 'Taux CNSS (%)', def: '4' },
  { cle: 'TAUX_AMU', label: 'Taux AMU (%)', def: '5' },
  { cle: 'ABATTEMENT_IRPP', label: 'Abattement forfaitaire IRPP (%)', def: '28' },
  { cle: 'SEUIL_ANCIENNETE', label: 'Seuil minimum ancienneté (années)', def: '2' },
  { cle: 'PLAFOND_ANCIENNETE', label: 'Plafond ancienneté (%)', def: '25' },
  { cle: 'NB_JOURS_MOIS', label: 'Nombre de jours par mois', def: '30' },
];

export function ParametresGlobaux() {
  const [params, setParams] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function fetchParams() {
      try {
        const res = await fetch('/api/parametres');
        if (res.ok) {
          const data: Parametre[] = await res.json();
          const map: Record<string, string> = {};
          data.forEach(p => { map[p.cle] = p.valeur; });
          setParams(map);
        }
      } catch (err) {
        toast.error('Erreur de chargement des paramètres');
      } finally {
        setLoading(false);
      }
    }
    fetchParams();
  }, []);

  const handleChange = (cle: string, val: string) => {
    setParams(prev => ({ ...prev, [cle]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of DEFAULT_PARAMS) {
        const val = params[item.cle] || item.def;
        await fetch(`/api/parametres/${item.cle}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valeur: val })
        });
      }
      toast.success('Paramètres enregistrés avec succès');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="mx-auto w-full max-w-4xl py-6 px-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Paramètres globaux</h2>
        <p className="text-sm text-muted-foreground">Configuration générale pour le calcul de la paie.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {DEFAULT_PARAMS.map((item) => (
          <Field key={item.cle} className="flex flex-col gap-2">
            <FieldLabel htmlFor={item.cle}>{item.label}</FieldLabel>
            <Input
              id={item.cle}
              type="number"
              step="any"
              value={params[item.cle] ?? item.def}
              onChange={(e) => handleChange(item.cle, e.target.value)}
            />
          </Field>
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

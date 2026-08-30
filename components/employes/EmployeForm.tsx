'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldError,
} from '@/components/ui/field';

const EmployeSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  date_naissance: z.string().optional(),
  date_entree: z.string().min(1, 'Date d\'entrée requise'),
  situation_matrimoniale: z.enum(['celibataire', 'marie', 'divorce', 'veuf']),
  nb_personnes_charge: z.coerce.number().int().min(0),
  poste: z.string().optional(),
  departement: z.string().optional(),
  classement: z.string().optional(),
  salaire_base: z.coerce.number().min(0, 'Salaire requis'),
  salaire_categoriel: z.coerce.number().min(0, 'Salaire catégoriel requis'),
  nif: z.string().optional(),
  numero_cnss: z.string().optional(),
  numero_compte: z.string().optional(),
  etablissement_financier: z.string().optional(),
});

type EmployeFormData = z.infer<typeof EmployeSchema>;

interface EmployeFormProps {
  defaultValues?: Partial<EmployeFormData>;
  employeId?: number;
  mode: 'create' | 'edit';
}

function ControlledDatePicker({ value, onChange, placeholder = "Sélectionner une date" }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
          {date ? format(date, 'dd MMMM yyyy', { locale: fr }) : placeholder}
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

export function EmployeForm({ defaultValues, employeId, mode }: EmployeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anciennete, setAnciennete] = useState<{ annees: number; mois: number } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EmployeFormData>({
    resolver: zodResolver(EmployeSchema),
    defaultValues: {
      situation_matrimoniale: 'celibataire',
      nb_personnes_charge: 0,
      etablissement_financier: 'FUCEC',
      ...defaultValues,
    },
  });

  const dateEntree = watch('date_entree');
  const salaireCategoriel = watch('salaire_categoriel');

  // Calcul dynamique de l'ancienneté côté client
  useEffect(() => {
    if (!dateEntree) { setAnciennete(null); return; }
    const entree = new Date(dateEntree);
    if (isNaN(entree.getTime())) { setAnciennete(null); return; }
    const now = new Date();
    const totalMois = (now.getFullYear() - entree.getFullYear()) * 12 + (now.getMonth() - entree.getMonth());
    const annees = Math.floor(totalMois / 12);
    const mois = totalMois % 12;
    setAnciennete({ annees, mois });
  }, [dateEntree]);

  const taux = anciennete ? (anciennete.annees < 2 ? 0 : Math.min(anciennete.annees, 25)) : 0;
  const primeAnciennete = salaireCategoriel ? Math.round(Number(salaireCategoriel) * taux / 100) : 0;

  const onSubmit = async (data: EmployeFormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = mode === 'create' ? '/api/employes' : `/api/employes/${employeId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Une erreur est survenue');
        return;
      }
      router.push('/dashboard/employes');
      router.refresh();
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">{error}</div>
      )}

      {/* Section : Identité */}
      <FieldSet>
        <FieldLegend>Identité</FieldLegend>
        <FieldDescription>Informations personnelles de l'employé</FieldDescription>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="nom">Nom *</FieldLabel>
              <Input id="nom" {...register('nom')} placeholder="DUPONT" />
              <FieldError errors={errors.nom ? [{ message: errors.nom.message }] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="prenom">Prénom *</FieldLabel>
              <Input id="prenom" {...register('prenom')} placeholder="Jean" />
              <FieldError errors={errors.prenom ? [{ message: errors.prenom.message }] : []} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="date_naissance">Date de naissance</FieldLabel>
              <Controller
                control={control}
                name="date_naissance"
                render={({ field }) => (
                  <ControlledDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="situation_matrimoniale">Situation matrimoniale</FieldLabel>
              <Controller
                control={control}
                name="situation_matrimoniale"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="celibataire">Célibataire</SelectItem>
                        <SelectItem value="marie">Marié(e)</SelectItem>
                        <SelectItem value="divorce">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="nb_personnes_charge">Nombre de personnes à charge</FieldLabel>
            <Input id="nb_personnes_charge" type="number" min={0} {...register('nb_personnes_charge')} />
          </Field>
        </FieldGroup>
      </FieldSet>

      {/* Section : Poste */}
      <FieldSet>
        <FieldLegend>Poste & Ancienneté</FieldLegend>
        <FieldDescription>Informations professionnelles et ancienneté dans l'entreprise</FieldDescription>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="poste">Poste</FieldLabel>
              <Input id="poste" {...register('poste')} placeholder="Développeur" />
            </Field>
            <Field>
              <FieldLabel htmlFor="departement">Département</FieldLabel>
              <Input id="departement" {...register('departement')} placeholder="Informatique" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="classement">Classement</FieldLabel>
              <Input id="classement" {...register('classement')} placeholder="Ex: C3" />
            </Field>
            <Field>
              <FieldLabel htmlFor="date_entree">Date d'entrée *</FieldLabel>
              <Controller
                control={control}
                name="date_entree"
                render={({ field }) => (
                  <ControlledDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldError errors={errors.date_entree ? [{ message: errors.date_entree.message }] : []} />
            </Field>
          </div>

        </FieldGroup>
      </FieldSet>

      {/* Section : Rémunération */}
      <FieldSet>
        <FieldLegend>Rémunération</FieldLegend>
        <FieldDescription>Salaires contractuels (en FCFA)</FieldDescription>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="salaire_base">Salaire de base (SB01) *</FieldLabel>
              <Input id="salaire_base" type="number" min={0} {...register('salaire_base')} placeholder="0" />
              <FieldError errors={errors.salaire_base ? [{ message: errors.salaire_base.message }] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="salaire_categoriel">Salaire catégoriel (base PA02) *</FieldLabel>
              <Input id="salaire_categoriel" type="number" min={0} {...register('salaire_categoriel')} placeholder="0" />
              <FieldDescription>Sert de base au calcul de la prime d'ancienneté</FieldDescription>
              <FieldError errors={errors.salaire_categoriel ? [{ message: errors.salaire_categoriel.message }] : []} />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      {/* Section : Informations légales */}
      <FieldSet>
        <FieldLegend>Informations légales & Bancaires</FieldLegend>
        <FieldDescription>Identifiants fiscaux et informations bancaires</FieldDescription>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="nif">NIF</FieldLabel>
              <Input id="nif" {...register('nif')} placeholder="Numéro Identifiant Fiscal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="numero_cnss">Numéro CNSS</FieldLabel>
              <Input id="numero_cnss" {...register('numero_cnss')} placeholder="Numéro CNSS" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="numero_compte">Numéro de compte</FieldLabel>
              <Input id="numero_compte" {...register('numero_compte')} placeholder="Compte bancaire" />
            </Field>
            <Field>
              <FieldLabel htmlFor="etablissement_financier">Établissement financier</FieldLabel>
              <Input id="etablissement_financier" {...register('etablissement_financier')} placeholder="FUCEC" />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer l\'employé' : 'Enregistrer les modifications'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

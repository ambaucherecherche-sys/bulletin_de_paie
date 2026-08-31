'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

const MOIS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const currentYear = new Date().getFullYear();
const ANNEES = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

const PeriodeSchema = z.object({
  mois: z.string().min(1, 'Mois requis'),
  annee: z.string().min(1, 'Année requise'),
  date_debut: z.string().min(1, 'Date de début requise'),
  date_fin: z.string().min(1, 'Date de fin requise'),
});

type PeriodeFormData = z.infer<typeof PeriodeSchema>;

function ControlledDatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
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

function PeriodeFormContent({
  onSuccess,
  className,
}: {
  onSuccess: () => void;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PeriodeFormData>({
    resolver: zodResolver(PeriodeSchema),
    defaultValues: {
      mois: String(new Date().getMonth() + 1),
      annee: String(currentYear),
      date_debut: '',
      date_fin: '',
    },
  });

  const moisWatch = watch('mois');
  const anneeWatch = watch('annee');

  // Auto-fill dates when mois and annee change
  React.useEffect(() => {
    if (moisWatch && anneeWatch) {
      const m = Number(moisWatch);
      const a = Number(anneeWatch);
      const debut = new Date(a, m - 1, 1);
      const fin = new Date(a, m, 0);
      setValue('date_debut', format(debut, 'yyyy-MM-dd'));
      setValue('date_fin', format(fin, 'yyyy-MM-dd'));
    }
  }, [moisWatch, anneeWatch, setValue]);

  const onSubmit = async (data: PeriodeFormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/periodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mois: Number(data.mois), annee: Number(data.annee) }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.add({ title: 'Erreur', description: json.error, type: 'error' });
      } else {
        toast.add({ title: 'Période créée', description: 'La nouvelle période de paie a été créée.', type: 'success' });
        onSuccess();
      }
    } catch {
      toast.add({ title: 'Erreur réseau', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      <FieldSet>
        <FieldLegend>Période de paie</FieldLegend>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Mois *</FieldLabel>
              <Controller
                control={control}
                name="mois"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Mois..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {MOIS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.mois ? [{ message: errors.mois.message }] : []} />
            </Field>

            <Field>
              <FieldLabel>Année *</FieldLabel>
              <Controller
                control={control}
                name="annee"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Année..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ANNEES.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.annee ? [{ message: errors.annee.message }] : []} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Date de début *</FieldLabel>
              <Controller
                control={control}
                name="date_debut"
                render={({ field }) => (
                  <ControlledDatePicker value={field.value} onChange={field.onChange} placeholder="Début" />
                )}
              />
              <FieldError errors={errors.date_debut ? [{ message: errors.date_debut.message }] : []} />
            </Field>

            <Field>
              <FieldLabel>Date de fin *</FieldLabel>
              <Controller
                control={control}
                name="date_fin"
                render={({ field }) => (
                  <ControlledDatePicker value={field.value} onChange={field.onChange} placeholder="Fin" />
                )}
              />
              <FieldError errors={errors.date_fin ? [{ message: errors.date_fin.message }] : []} />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-3 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer la période'}
        </Button>
      </div>
    </form>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

export function NouvelleperiodeDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSuccess = () => {
    setOpen(false);
    onSuccess();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>
          + Nouvelle période
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle période de paie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle période mensuelle. Les dates sont remplies automatiquement.
            </DialogDescription>
          </DialogHeader>
          <PeriodeFormContent onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button />}>
        + Nouvelle période
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Nouvelle période de paie</DrawerTitle>
          <DrawerDescription>
            Créez une nouvelle période mensuelle.
          </DrawerDescription>
        </DrawerHeader>
        <PeriodeFormContent onSuccess={handleSuccess} className="px-4 pb-6" />
      </DrawerContent>
    </Drawer>
  );
}

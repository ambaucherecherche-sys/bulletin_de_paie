'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { Utilisateur } from './columns';

const ROLES = [
  { value: 'administrateur',  label: 'Administrateur' },
  { value: 'gestionnaire_rh', label: 'Gestionnaire RH' },
  { value: 'comptable',       label: 'Comptable' },
  { value: 'directeur',       label: 'Directeur' },
  { value: 'employe',         label: 'Employé' },
];

// ─── Création ────────────────────────────────────────────
const CreateSchema = z.object({
  nom:   z.string().min(2, 'Au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  role:  z.enum(['administrateur', 'gestionnaire_rh', 'comptable', 'directeur', 'employe']),
});
type CreateData = z.infer<typeof CreateSchema>;

// ─── Modification ─────────────────────────────────────────
const EditSchema = z.object({
  nom:  z.string().min(2, 'Au moins 2 caractères').optional(),
  role: z.enum(['administrateur', 'gestionnaire_rh', 'comptable', 'directeur', 'employe']).optional(),
});
type EditData = z.infer<typeof EditSchema>;

// ──────────────────────────────────────────────────────────
// Formulaire création
// ──────────────────────────────────────────────────────────
function CreateFormContent({ onSuccess, className }: { onSuccess: (email: string) => void; className?: string }) {
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<CreateData>({
    resolver: zodResolver(CreateSchema),
    defaultValues: { nom: '', email: '', role: 'employe' },
  });

  const onSubmit = async (data: CreateData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.add({ title: 'Erreur', description: typeof json.error === 'string' ? json.error : 'Erreur de validation', type: 'error' });
      } else {
        onSuccess(data.email);
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
        <FieldLegend>Informations du compte</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Nom complet *</FieldLabel>
            <Controller
              name="nom"
              control={control}
              render={({ field }) => <Input placeholder="Prénom Nom" {...field} />}
            />
            <FieldError errors={errors.nom ? [{ message: errors.nom.message }] : []} />
          </Field>

          <Field>
            <FieldLabel>Email *</FieldLabel>
            <Controller
              name="email"
              control={control}
              render={({ field }) => <Input type="email" placeholder="email@solutech.tg" {...field} />}
            />
            <FieldError errors={errors.email ? [{ message: errors.email.message }] : []} />
          </Field>

          <Field>
            <FieldLabel>Rôle *</FieldLabel>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un rôle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.role ? [{ message: errors.role.message }] : []} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-3 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Création en cours...' : 'Créer et envoyer l\'invitation'}
        </Button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────
// Formulaire modification
// ──────────────────────────────────────────────────────────
function EditFormContent({
  utilisateur,
  onSuccess,
  className,
}: {
  utilisateur: Utilisateur;
  onSuccess: () => void;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<EditData>({
    resolver: zodResolver(EditSchema),
    defaultValues: { nom: utilisateur.nom, role: utilisateur.role },
  });

  const onSubmit = async (data: EditData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/utilisateurs/${utilisateur.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.add({ title: 'Erreur', description: typeof json.error === 'string' ? json.error : 'Erreur', type: 'error' });
      } else {
        toast.add({ title: 'Utilisateur modifié', type: 'success' });
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
        <FieldLegend>Modifier l'utilisateur</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Nom complet</FieldLabel>
            <Controller
              name="nom"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
            <FieldError errors={errors.nom ? [{ message: errors.nom.message }] : []} />
          </Field>

          <Field>
            <FieldLabel>Rôle</FieldLabel>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.role ? [{ message: errors.role.message }] : []} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-3 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────
// Media query hook
// ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────
// Dialog nouvel utilisateur
// ──────────────────────────────────────────────────────────
export function NouvelUtilisateurDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSuccess = (email: string) => {
    toast.add({
      title: 'Utilisateur créé',
      description: `Un email d'invitation a été envoyé à ${email}.`,
      type: 'success',
    });
    setOpen(false);
    onSuccess();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>
          + Nouvel utilisateur
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Un email d'invitation avec un mot de passe temporaire sera envoyé automatiquement.
            </DialogDescription>
          </DialogHeader>
          <CreateFormContent onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button />}>
        + Nouvel utilisateur
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Nouvel utilisateur</DrawerTitle>
          <DrawerDescription>
            Un email d'invitation sera envoyé automatiquement.
          </DrawerDescription>
        </DrawerHeader>
        <CreateFormContent onSuccess={handleSuccess} className="px-4 pb-6" />
      </DrawerContent>
    </Drawer>
  );
}

// ──────────────────────────────────────────────────────────
// Dialog modification utilisateur (contrôlé depuis columns.tsx)
// ──────────────────────────────────────────────────────────
export function UtilisateurFormDialog({
  open,
  onOpenChange,
  utilisateur,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  utilisateur: Utilisateur;
  onSuccess: () => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifiez le nom ou le rôle de {utilisateur.nom}.</DialogDescription>
          </DialogHeader>
          <EditFormContent utilisateur={utilisateur} onSuccess={onSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Modifier l'utilisateur</DrawerTitle>
          <DrawerDescription>Modifiez le nom ou le rôle de {utilisateur.nom}.</DrawerDescription>
        </DrawerHeader>
        <EditFormContent utilisateur={utilisateur} onSuccess={onSuccess} className="px-4 pb-6" />
      </DrawerContent>
    </Drawer>
  );
}

"use client"

import { useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"

const ChangePasswordSchema = z.object({
  nouveauMotDePasse: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[!@#$%&*]/, 'Au moins un caractère spécial'),
  confirmation: z.string(),
}).refine(d => d.nouveauMotDePasse === d.confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmation'],
})

type FormData = z.infer<typeof ChangePasswordSchema>

function RequirementItem({ met, label }: { met: boolean, label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: "onChange",
    defaultValues: {
      nouveauMotDePasse: "",
      confirmation: "",
    },
  })

  const pwd = watch("nouveauMotDePasse") || ""
  
  const rules = useMemo(() => {
    return {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%&*]/.test(pwd),
    }
  }, [pwd])

  const allRulesMet = Object.values(rules).every(Boolean)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.add({ 
          title: "Erreur", 
          description: typeof json.error === 'string' ? json.error : "Une erreur est survenue", 
          type: "error" 
        })
        setLoading(false)
        return
      }

      toast.add({ 
        title: "Mot de passe mis à jour", 
        description: "Veuillez vous reconnecter.", 
        type: "success" 
      })
      
      await signOut({ redirect: false })
      router.push("/login")
    } catch (e) {
      toast.add({ title: "Erreur", description: "Erreur de connexion au serveur", type: "error" })
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            <img src="/logo.png" alt="Logo S.I.G" className="size-16 object-contain" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            
            <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup>
                <div className="flex flex-col gap-2 text-center mb-4">
                  <h1 className="text-2xl font-bold">Changement requis</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Pour la sécurité de votre compte, vous devez définir un nouveau mot de passe avant de continuer.
                  </p>
                </div>
                
                <Field>
                  <FieldLabel htmlFor="nouveauMotDePasse">Nouveau mot de passe</FieldLabel>
                  <Controller
                    name="nouveauMotDePasse"
                    control={control}
                    render={({ field }) => (
                      <Input id="nouveauMotDePasse" type="password" {...field} />
                    )}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmation">Confirmer le mot de passe</FieldLabel>
                  <Controller
                    name="confirmation"
                    control={control}
                    render={({ field }) => (
                      <Input id="confirmation" type="password" {...field} />
                    )}
                  />
                  <FieldError errors={errors.confirmation ? [{ message: errors.confirmation.message }] : []} />
                </Field>

                <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-md mt-2">
                  <RequirementItem met={rules.length} label="Au moins 8 caractères" />
                  <RequirementItem met={rules.uppercase} label="Au moins une majuscule" />
                  <RequirementItem met={rules.number} label="Au moins un chiffre" />
                  <RequirementItem met={rules.special} label="Au moins un caractère spécial (!@#$%&*)" />
                  <RequirementItem met={pwd.length > 0} label="Différent du mot de passe temporaire initial" />
                </div>

                <Field className="mt-4">
                  <Button type="submit" disabled={loading || !allRulesMet} className="w-full">
                    {loading ? "Mise à jour..." : "Définir mon mot de passe"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>

          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/login-side-image.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

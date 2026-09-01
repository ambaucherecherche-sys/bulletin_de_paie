import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { queryOne, pool } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { estDifferentDuTemporaire, hacherMotDePasse } from '@/lib/password'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Récupérer le token JWT
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    // 2. Vérifier que token existe ET est restreint (must_change_password)
    if (!token || !token.isRestricted) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // 3. Valider le corps de la requête avec Zod
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

    const parsed = ChangePasswordSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // 4. Récupérer l'utilisateur en BDD
    const user = await queryOne<any>('SELECT * FROM utilisateurs WHERE id = ?', [token.id])
    if (!user) return Response.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // 5. Vérifier que le nouveau mdp ≠ le mdp temporaire
    const estDifferent = await estDifferentDuTemporaire(
      parsed.data.nouveauMotDePasse,
      user.temp_password_hash
    )
    if (!estDifferent) {
      return Response.json({
        error: 'Le nouveau mot de passe doit être différent du mot de passe temporaire fourni.'
      }, { status: 400 })
    }

    // 6. Hacher le nouveau mot de passe
    const newHash = await hacherMotDePasse(parsed.data.nouveauMotDePasse)

    // 7. Mettre à jour en BDD
    await pool.execute(`
      UPDATE utilisateurs SET
        password_hash        = ?,
        must_change_password = 0,
        temp_password_hash   = NULL,
        password_expires_at  = NULL,
        derniere_connexion   = NOW()
      WHERE id = ?
    `, [newHash, token.id])

    // 8. Logger dans audit_logs
    await logAudit({
      userId: Number(token.id),
      action: 'CHANGEMENT_MOT_DE_PASSE',
      tableCible: 'utilisateurs',
      idEnregistrement: Number(token.id),
      details: 'Changement de mot de passe obligatoire effectué avec succès',
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/auth/change-password:', error)
    return Response.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

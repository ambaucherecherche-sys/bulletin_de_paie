import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne, pool } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { genererMotDePasseTemporaire, hacherMotDePasse } from '@/lib/password'
import { envoyerEmailInvitation } from '@/lib/email'

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await context.params
    const targetId = Number(id)

    const user = await queryOne<any>('SELECT nom, email, role, actif FROM utilisateurs WHERE id = ?', [targetId])
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (!user.actif) {
      return NextResponse.json({ error: 'Impossible de réinitialiser le mot de passe d\'un utilisateur inactif' }, { status: 400 })
    }

    const mdpTemp = genererMotDePasseTemporaire()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const hash = await hacherMotDePasse(mdpTemp)

    await pool.execute(
      `UPDATE utilisateurs SET 
       password_hash = ?, 
       temp_password_hash = ?, 
       must_change_password = 1, 
       password_expires_at = ? 
       WHERE id = ?`,
      [hash, hash, expiresAt, targetId]
    )

    await envoyerEmailInvitation({
      destinataire: user.email,
      nom: user.nom,
      motDePasseTemporaire: mdpTemp,
      role: user.role,
      expiresAt: expiresAt
    })

    await logAudit({
      userId: Number(session.user.id),
      action: 'RESET_MOT_DE_PASSE_ADMIN',
      tableCible: 'utilisateurs',
      idEnregistrement: targetId,
      details: 'Réinitialisation du mot de passe par un administrateur',
      ipAddress: req.headers.get('x-forwarded-for') || undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/utilisateurs/[id]/reset-password:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

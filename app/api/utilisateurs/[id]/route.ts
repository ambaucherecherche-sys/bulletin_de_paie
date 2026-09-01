import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { query, queryOne, pool } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await context.params
    const utilisateur = await queryOne<any>(
      `SELECT id, nom, email, role, actif, must_change_password, password_expires_at, derniere_connexion, created_at, updated_at 
       FROM utilisateurs WHERE id = ?`,
      [Number(id)]
    )

    if (!utilisateur) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: utilisateur })
  } catch (error) {
    console.error('Erreur GET /api/utilisateurs/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const UpdateUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  role: z.enum(['administrateur', 'gestionnaire_rh', 'comptable', 'directeur', 'employe']).optional(),
  actif: z.boolean().optional()
})

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await context.params
    const targetId = Number(id)
    const body = await req.json()
    
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { nom, role, actif } = parsed.data

    const existingUser = await queryOne<any>('SELECT * FROM utilisateurs WHERE id = ?', [targetId])
    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const updates: string[] = []
    const values: any[] = []
    const detailsObj: Record<string, { old: any, new: any }> = {}

    if (nom !== undefined && nom !== existingUser.nom) {
      updates.push('nom = ?')
      values.push(nom)
      detailsObj.nom = { old: existingUser.nom, new: nom }
    }
    
    if (role !== undefined && role !== existingUser.role) {
      updates.push('role = ?')
      values.push(role)
      detailsObj.role = { old: existingUser.role, new: role }
    }
    
    if (actif !== undefined) {
      const actifValue = actif ? 1 : 0
      if (actifValue !== existingUser.actif) {
        updates.push('actif = ?')
        values.push(actifValue)
        detailsObj.actif = { old: existingUser.actif, new: actifValue }
      }
    }

    if (updates.length > 0) {
      values.push(targetId)
      await pool.execute(
        `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      await logAudit({
        userId: Number(session.user.id),
        action: 'MODIFICATION_UTILISATEUR',
        tableCible: 'utilisateurs',
        idEnregistrement: targetId,
        details: `Champs modifiés: ${JSON.stringify(detailsObj)}`,
        ipAddress: req.headers.get('x-forwarded-for') || undefined
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PUT /api/utilisateurs/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await context.params
    const targetId = Number(id)

    // Cannot delete yourself
    if (targetId === Number(session.user.id)) {
      return NextResponse.json({ error: 'Impossible de désactiver votre propre compte' }, { status: 400 })
    }

    const targetUser = await queryOne<any>('SELECT role, actif FROM utilisateurs WHERE id = ?', [targetId])
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (targetUser.role === 'administrateur') {
      const activeAdmins = await queryOne<any>(
        `SELECT COUNT(*) as count FROM utilisateurs WHERE role = 'administrateur' AND actif = 1`
      )
      if (activeAdmins.count <= 1) {
        return NextResponse.json({ error: 'Impossible de désactiver le dernier administrateur actif' }, { status: 400 })
      }
    }

    await pool.execute('UPDATE utilisateurs SET actif = 0 WHERE id = ?', [targetId])

    await logAudit({
      userId: Number(session.user.id),
      action: 'DESACTIVATION_UTILISATEUR',
      tableCible: 'utilisateurs',
      idEnregistrement: targetId,
      details: 'Désactivation du compte utilisateur',
      ipAddress: req.headers.get('x-forwarded-for') || undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/utilisateurs/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

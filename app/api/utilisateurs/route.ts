import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { query, queryOne, pool } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { genererMotDePasseTemporaire, hacherMotDePasse } from '@/lib/password'
import { envoyerEmailInvitation } from '@/lib/email'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const utilisateurs = await query<any>(
      `SELECT id, nom, email, role, actif, must_change_password, password_expires_at, derniere_connexion, created_at, updated_at 
       FROM utilisateurs ORDER BY nom ASC`
    )

    return NextResponse.json({ data: utilisateurs })
  } catch (error) {
    console.error('Erreur GET /api/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const CreateUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.enum(['administrateur', 'gestionnaire_rh', 'comptable', 'directeur', 'employe'])
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { nom, email, role } = parsed.data

    // Vérifier unicité email
    const existing = await queryOne('SELECT id FROM utilisateurs WHERE email = ?', [email])
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const mdpTemp = genererMotDePasseTemporaire()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const hash = await hacherMotDePasse(mdpTemp)

    const [result] = await pool.execute(
      `INSERT INTO utilisateurs 
       (nom, email, password_hash, role, actif, must_change_password, password_expires_at, temp_password_hash)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      [nom, email, hash, role, expiresAt, hash]
    )
    
    const insertId = (result as any).insertId

    await envoyerEmailInvitation({
      destinataire: email,
      nom: nom,
      motDePasseTemporaire: mdpTemp,
      role: role,
      expiresAt: expiresAt
    })

    await logAudit({
      userId: Number(session.user.id),
      action: 'CREATION_UTILISATEUR',
      tableCible: 'utilisateurs',
      idEnregistrement: insertId,
      details: `Création de l'utilisateur ${email} avec le rôle ${role}`,
      ipAddress: req.headers.get('x-forwarded-for') || undefined
    })

    return NextResponse.json({ 
      data: { id: insertId, nom, email, role } 
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

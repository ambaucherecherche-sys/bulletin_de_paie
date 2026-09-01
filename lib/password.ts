import crypto from 'crypto'
import bcrypt from 'bcrypt'

// Génère un mot de passe temporaire fort (12 chars min)
// Format : 2 majuscules + 2 chiffres + 2 symboles + reste aléatoire
// Exemple : "Kx7!mP2@vQnR"
export function genererMotDePasseTemporaire(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '!@#$%&*'
  const all     = upper + lower + digits + symbols

  const getRandom = (chars: string) =>
    chars[crypto.randomInt(0, chars.length)]

  const parts = [
    getRandom(upper), getRandom(upper),
    getRandom(digits), getRandom(digits),
    getRandom(symbols), getRandom(symbols),
    ...Array.from({ length: 6 }, () => getRandom(all)),
  ]
  // Mélanger le tableau pour éviter un pattern prévisible
  return parts.sort(() => crypto.randomInt(0, 2) - 0.5).join('')
}

// Hacher un mot de passe (saltRounds: 12)
export async function hacherMotDePasse(mdp: string): Promise<string> {
  return bcrypt.hash(mdp, 12)
}

// Vérifier un mot de passe
export async function verifierMotDePasse(mdp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(mdp, hash)
}

// Vérifier que le nouveau mdp ≠ l'ancien (temporaire)
export async function estDifferentDuTemporaire(
  nouveauMdp: string,
  tempHash: string | null
): Promise<boolean> {
  if (!tempHash) return true
  const identique = await bcrypt.compare(nouveauMdp, tempHash)
  return !identique  // true = différent = autorisé
}

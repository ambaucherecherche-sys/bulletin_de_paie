import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes autorisées sans token plein
const PUBLIC_ROUTES = ['/login', '/api/auth']
// Route autorisée avec token restreint uniquement
const CHANGE_PASSWORD_ROUTE = '/change-password'
// Route API autorisée avec token restreint
const CHANGE_PASSWORD_API = '/api/auth/change-password'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const path  = request.nextUrl.pathname

  // 1. Route publique → laisser passer
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) return NextResponse.next()

  // 2. Pas de token → rediriger vers /login
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  // 3. Token restreint (must_change_password) :
  //    → Autoriser UNIQUEMENT /change-password et /api/auth/change-password
  //    → BLOQUER tout le reste (même /dashboard)
  if (token.isRestricted) {
    if (path === CHANGE_PASSWORD_ROUTE || path.startsWith(CHANGE_PASSWORD_API)) {
      return NextResponse.next()
    }
    // Bloquer toute autre route
    return NextResponse.redirect(new URL('/change-password', request.url))
  }

  // 4. Token valide et non restreint → protéger /dashboard selon le rôle
  // (logique de rôles déjà en place dans l'application)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

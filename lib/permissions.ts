export type Role = 'administrateur' | 'gestionnaire_rh' | 'comptable' | 'directeur' | 'employe'
export type Module =
  | 'employes'
  | 'bulletins_calculer'
  | 'bulletins_valider'
  | 'bulletins_lire'
  | 'periodes'
  | 'periodes_cloturer'
  | 'parametres'
  | 'rapports'
  | 'rapports_export'
  | 'utilisateurs'
  | 'audit'
  | 'dashboard'

// Matrice des permissions
export const PERMISSIONS: Record<Role, Module[]> = {
  administrateur: [
    'employes', 'bulletins_calculer', 'bulletins_valider', 'bulletins_lire',
    'periodes', 'periodes_cloturer', 'parametres', 'rapports', 'rapports_export',
    'utilisateurs', 'audit', 'dashboard',
  ],
  gestionnaire_rh: [
    'employes', 'bulletins_calculer', 'bulletins_valider', 'bulletins_lire',
    'periodes', 'rapports', 'rapports_export', 'dashboard',
  ],
  comptable: [
    'bulletins_lire', 'rapports', 'rapports_export', 'dashboard',
  ],
  directeur: [
    'bulletins_lire', 'bulletins_valider', 'rapports', 'dashboard',
  ],
  employe: [
    'bulletins_lire',  // uniquement ses propres bulletins
  ],
}

// Vérifie si un rôle a accès à un module
export function peutAcceder(role: Role, module: Module): boolean {
  return PERMISSIONS[role]?.includes(module) ?? false
}

// Middleware helper — à utiliser dans chaque API Route
export function verifierPermission(role: string, module: Module): boolean {
  return peutAcceder(role as Role, module)
}

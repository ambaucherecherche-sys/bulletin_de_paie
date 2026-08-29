import { query } from './db';

interface AuditParams {
  userId?: number;
  action: string;
  tableCible?: string;
  idEnregistrement?: number;
  details?: string;
  ipAddress?: string;
}

export async function logAudit({ userId, action, tableCible, idEnregistrement, details, ipAddress }: AuditParams) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, table_cible, id_enregistrement, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, action, tableCible || null, idEnregistrement || null, details || null, ipAddress || null]
    );
  } catch (error) {
    console.error('Erreur lors du logging d\'audit:', error);
  }
}

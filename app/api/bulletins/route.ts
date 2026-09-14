import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh', 'comptable', 'directeur'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const periode = searchParams.get('periode') || '';

    let sql = `
      SELECT b.id, b.numero, b.statut, b.salaire_brut, b.remuneration_nette, b.date_creation,
             e.nom, e.prenom, e.matricule,
             p.mois, p.annee
      FROM bulletins b
      JOIN employes e ON b.employe_id = e.id
      JOIN periodes_paie p ON b.periode_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ? OR b.numero LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (periode) {
      sql += ` AND b.periode_id = ?`;
      params.push(Number(periode));
    }

    sql += ` ORDER BY b.id DESC`;

    const rows = await query(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erreur GET /api/bulletins:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { employe_id, periode_id, result_calcule } = body;

    if (!employe_id || !periode_id || !result_calcule) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 1. Vérifier que la période est ouverte
    const periodes = await query<any>('SELECT mois, annee, statut FROM periodes_paie WHERE id = ?', [periode_id]);
    if (periodes.length === 0 || periodes[0].statut !== 'ouverte') {
      return NextResponse.json({ error: 'Période invalide ou clôturée' }, { status: 400 });
    }
    const { mois, annee } = periodes[0];

    // 2. Vérifier si un bulletin existe déjà pour cet employé et cette période
    const existant = await query<any>('SELECT id FROM bulletins WHERE employe_id = ? AND periode_id = ?', [employe_id, periode_id]);
    if (existant.length > 0) {
      return NextResponse.json({ error: 'Un bulletin existe déjà pour cet employé sur cette période.' }, { status: 400 });
    }

    // 3. Générer le numéro de bulletin (N°X-YYYY)
    await query(`
      INSERT INTO compteur_bulletins (annee, mois, dernier_numero) 
      VALUES (?, ?, 1) 
      ON DUPLICATE KEY UPDATE dernier_numero = dernier_numero + 1
    `, [annee, mois]);

    const compteurs = await query<any>('SELECT dernier_numero FROM compteur_bulletins WHERE annee = ? AND mois = ?', [annee, mois]);
    const nextNumber = compteurs[0].dernier_numero;
    const numeroStr = `${nextNumber}-${annee}`;

    // 4. Insérer le bulletin
    // taux_anciennete stocke le taux_pa02 (en %) pour rétrocompatibilité
    const insertSql = `
      INSERT INTO bulletins (
        numero, employe_id, periode_id, created_by,
        salaire_base, salaire_categoriel, prime_anciennete, taux_anciennete,
        heures_supp, indemnite_logement, indemnite_transport, total_indemnites_imposables,
        sursalaire, salaire_brut,
        irpp, cnss, amu, total_retenues_legales, salaire_net_retenues,
        remuneration_totale,
        primes_caisse, primes_salissure, primes_cantine,
        retenue_avance, autres_retenues, total_autres_retenues,
        remuneration_nette
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
      numeroStr, employe_id, periode_id, session.user.id,
      result_calcule.salaire_base,
      result_calcule.salaire_categoriel,
      result_calcule.prime_anciennete,      // = pa02
      result_calcule.taux_anciennete,       // = taux_pa02
      result_calcule.heures_supp,
      result_calcule.indemnite_logement,
      result_calcule.indemnite_transport,
      result_calcule.total_indemnites_imposables,
      result_calcule.sursalaire,
      result_calcule.salaire_brut,
      result_calcule.irpp,
      result_calcule.cnss,
      result_calcule.amu,
      result_calcule.total_retenues_legales,
      result_calcule.salaire_net_retenues,
      result_calcule.remuneration_totale,
      result_calcule.primes_caisse,
      result_calcule.primes_salissure,
      result_calcule.primes_cantine,        // = ich15 calculé
      result_calcule.retenue_avance,
      result_calcule.autres_retenues,
      result_calcule.total_autres_retenues, // TR20 = IR04 + IR12 + ICH15 (TOTAL AUTRES PRIMES)
      result_calcule.remuneration_nette,
    ];

    const insertResult: any = await query(insertSql, insertParams);
    const bulletinId = insertResult.insertId;

    // 5. Insérer les lignes (Rubriques)
    const rubriques = await query<any>('SELECT id, code FROM rubriques');
    const getRubId = (code: string) => rubriques.find((r: any) => r.code === code)?.id;

    const lignes = [
      { code: 'SB01',   base: result_calcule.salaire_base,           gain: result_calcule.salaire_base },
      // PA02 : base = base_pa02 (salaire_categoriel stocké), taux = taux_pa02
      { code: 'PA02',   base: result_calcule.salaire_categoriel,     gain: result_calcule.prime_anciennete,  taux: result_calcule.taux_anciennete },
      { code: 'HS03',   base: result_calcule.heures_supp,            gain: result_calcule.heures_supp },
      { code: 'SS05',   base: result_calcule.sursalaire,             gain: result_calcule.sursalaire },
      { code: 'ICL13',  base: result_calcule.indemnite_logement,     gain: result_calcule.indemnite_logement },
      { code: 'ICT14',  base: result_calcule.indemnite_transport,    gain: result_calcule.indemnite_transport },
      { code: 'IRPP08', base: result_calcule.salaire_brut,           retenue: result_calcule.irpp },
      { code: 'CS07',   base: result_calcule.salaire_brut,           retenue: result_calcule.cnss },
      { code: 'AM3',    base: result_calcule.salaire_brut,           retenue: result_calcule.amu },
      { code: 'IR04',   base: result_calcule.primes_caisse,          gain: result_calcule.primes_caisse },
      { code: 'IR12',   base: result_calcule.primes_salissure,       gain: result_calcule.primes_salissure },
      // ICH15 : base = base_ich15, taux = nb_jours_ich15, gain = primes_cantine (calculé)
      { code: 'ICH15',  base: result_calcule.base_ich15 ?? result_calcule.primes_cantine, taux: result_calcule.nb_jours_ich15 ?? result_calcule.taux_ich15, gain: result_calcule.primes_cantine },
      { code: 'RAS18',  base: result_calcule.retenue_avance,         retenue: result_calcule.retenue_avance },
      { code: 'AR19',   base: result_calcule.autres_retenues,        retenue: result_calcule.autres_retenues },
    ];

    for (const ligne of lignes) {
      const rid = getRubId(ligne.code);
      const gain = (ligne as any).gain ?? 0;
      const retenue = (ligne as any).retenue ?? 0;
      if (rid && (gain > 0 || retenue > 0 || ligne.code === 'SB01')) {
        await query(`
          INSERT INTO lignes_bulletin (bulletin_id, rubrique_id, base, taux_ou_nombre, montant_retenue, montant_gain)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          bulletinId,
          rid,
          ligne.base || 0,
          (ligne as any).taux || 0,
          retenue,
          gain,
        ]);
      }
    }

    await logAudit({
      userId: Number(session.user.id),
      action: 'CREATION_BULLETIN',
      tableCible: 'bulletins',
      idEnregistrement: bulletinId,
      details: `Création brouillon N°${numeroStr}`
    });

    return NextResponse.json({ success: true, bulletin_id: bulletinId, numero: numeroStr }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/bulletins:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh', 'comptable', 'directeur'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    
    const bulletins = await query<any>(`
      SELECT b.*, 
             e.nom, e.prenom, e.matricule, e.date_entree, e.classement, e.situation_matrimoniale, e.numero_cnss, e.nif, e.numero_compte,
             p.mois, p.annee, p.date_debut, p.date_fin
      FROM bulletins b
      JOIN employes e ON b.employe_id = e.id
      JOIN periodes_paie p ON b.periode_id = p.id
      WHERE b.id = ?
    `, [id]);

    if (bulletins.length === 0) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    const bulletin = bulletins[0];

    const lignes = await query(`
      SELECT l.*, r.code, r.designation, r.type_rubrique, r.ordre_affichage
      FROM lignes_bulletin l
      JOIN rubriques r ON l.rubrique_id = r.id
      WHERE l.bulletin_id = ?
      ORDER BY r.ordre_affichage ASC
    `, [id]);

    // Calcul des cumuls à la volée (valeur_mois × numéro_du_mois)
    // Ligne MOIS = valeurs du bulletin courant
    // Ligne EXERCICE = valeurs × mois (ex: mars = × 3)
    const moisNum = Number(bulletin.mois) || 1;
    const cumulActuel = {
      cum_cnss:  Number(bulletin.cnss)         * moisNum,
      cum_irpp:  Number(bulletin.irpp)         * moisNum,
      cum_brut:  Number(bulletin.salaire_brut) * moisNum,
      nb_jours_exercice: moisNum * 30,
    };

    return NextResponse.json({ 
      bulletin, 
      lignes,
      cumulActuel
    });

  } catch (error) {
    console.error('Erreur GET /api/bulletins/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { employe_id, periode_id, result_calcule } = body;

    if (!employe_id || !periode_id || !result_calcule) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const bulletins = await query<any>('SELECT statut, numero FROM bulletins WHERE id = ?', [id]);
    if (bulletins.length === 0) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }
    if (bulletins[0].statut !== 'brouillon') {
      return NextResponse.json({ error: 'Impossible de modifier un bulletin validé ou archivé' }, { status: 400 });
    }

    const periodes = await query<any>('SELECT statut FROM periodes_paie WHERE id = ?', [periode_id]);
    if (periodes.length === 0 || periodes[0].statut !== 'ouverte') {
      return NextResponse.json({ error: 'Période invalide ou clôturée' }, { status: 400 });
    }

    // Update bulletin
    // taux_anciennete stocke taux_pa02, total_autres_retenues = TR20 = IR04+IR12+ICH15
    const updateSql = `
      UPDATE bulletins SET
        employe_id = ?, periode_id = ?,
        salaire_base = ?, salaire_categoriel = ?, prime_anciennete = ?, taux_anciennete = ?,
        heures_supp = ?, indemnite_logement = ?, indemnite_transport = ?, total_indemnites_imposables = ?,
        sursalaire = ?, salaire_brut = ?,
        irpp = ?, cnss = ?, amu = ?, total_retenues_legales = ?, salaire_net_retenues = ?,
        remuneration_totale = ?,
        primes_caisse = ?, primes_salissure = ?, primes_cantine = ?,
        retenue_avance = ?, autres_retenues = ?, total_autres_retenues = ?,
        remuneration_nette = ?
      WHERE id = ?
    `;
    const updateParams = [
      employe_id, periode_id,
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
      result_calcule.total_autres_retenues, // TR20 = IR04+IR12+ICH15 (TOTAL AUTRES PRIMES)
      result_calcule.remuneration_nette,
      id
    ];
    await query(updateSql, updateParams);

    // Update lignes_bulletin (delete and recreate)
    await query('DELETE FROM lignes_bulletin WHERE bulletin_id = ?', [id]);

    const rubriques = await query<any>('SELECT id, code FROM rubriques');
    const getRubId = (code: string) => rubriques.find(r => r.code === code)?.id;

    const lignes = [
      { code: 'SB01',   base: result_calcule.salaire_base,        gain: result_calcule.salaire_base },
      { code: 'PA02',   base: result_calcule.salaire_categoriel,  gain: result_calcule.prime_anciennete, taux: result_calcule.taux_anciennete },
      { code: 'HS03',   base: result_calcule.heures_supp,         gain: result_calcule.heures_supp },
      { code: 'SS05',   base: result_calcule.sursalaire,          gain: result_calcule.sursalaire },
      { code: 'ICL13',  base: result_calcule.indemnite_logement,  gain: result_calcule.indemnite_logement },
      { code: 'ICT14',  base: result_calcule.indemnite_transport, gain: result_calcule.indemnite_transport },
      { code: 'IRPP08', base: result_calcule.salaire_brut,        retenue: result_calcule.irpp },
      { code: 'CS07',   base: result_calcule.salaire_brut,        retenue: result_calcule.cnss },
      { code: 'AM3',    base: result_calcule.salaire_brut,        retenue: result_calcule.amu },
      { code: 'IR04',   base: result_calcule.primes_caisse,       gain: result_calcule.primes_caisse },
      { code: 'IR12',   base: result_calcule.primes_salissure,    gain: result_calcule.primes_salissure },
      { code: 'ICH15',  base: result_calcule.base_ich15 ?? result_calcule.primes_cantine, taux: result_calcule.nb_jours_ich15 ?? result_calcule.taux_ich15, gain: result_calcule.primes_cantine },
      { code: 'RAS18',  base: result_calcule.retenue_avance,      retenue: result_calcule.retenue_avance },
      { code: 'AR19',   base: result_calcule.autres_retenues,     retenue: result_calcule.autres_retenues },
    ];

    for (const ligne of lignes) {
      const rid = getRubId(ligne.code);
      if (rid && (ligne.gain > 0 || ligne.retenue > 0 || ligne.code === 'SB01')) {
        await query(`
          INSERT INTO lignes_bulletin (bulletin_id, rubrique_id, base, taux_ou_nombre, montant_retenue, montant_gain)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id, rid, ligne.base || 0, ligne.taux || 0, ligne.retenue || 0, ligne.gain || 0
        ]);
      }
    }

    await logAudit({
      userId: Number(session.user.id),
      action: 'MODIFICATION_BULLETIN',
      tableCible: 'bulletins',
      idEnregistrement: Number(id),
      details: `Modification du brouillon N°${bulletins[0].numero}`
    });

    return NextResponse.json({ success: true, bulletin_id: id });
  } catch (error) {
    console.error('Erreur PUT /api/bulletins/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['administrateur', 'gestionnaire_rh'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    
    const bulletins = await query<any>('SELECT numero, statut FROM bulletins WHERE id = ?', [id]);
    if (bulletins.length === 0) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    if (bulletins[0].statut !== 'brouillon') {
      return NextResponse.json({ error: 'Impossible de supprimer un bulletin validé ou archivé' }, { status: 400 });
    }

    await query('DELETE FROM bulletins WHERE id = ?', [id]);

    await logAudit({
      userId: Number(session.user.id),
      action: 'SUPPRESSION_BULLETIN',
      tableCible: 'bulletins',
      idEnregistrement: Number(id),
      details: `Suppression du brouillon N°${bulletins[0].numero}`
    });

    return NextResponse.json({ success: true, message: 'Bulletin supprimé' });
  } catch (error) {
    console.error('Erreur DELETE /api/bulletins/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

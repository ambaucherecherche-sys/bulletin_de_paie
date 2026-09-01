-- utilisateurs
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('administrateur','gestionnaire_rh','comptable','directeur','employe') NOT NULL DEFAULT 'employe',
  actif TINYINT(1) NOT NULL DEFAULT 1,
  derniere_connexion DATETIME,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  password_expires_at DATETIME,
  temp_password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- employes
CREATE TABLE employes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricule VARCHAR(50) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  date_entree DATE NOT NULL,
  situation_matrimoniale ENUM('celibataire','marie','divorce','veuf') DEFAULT 'celibataire',
  nb_personnes_charge INT DEFAULT 0,
  poste VARCHAR(150),
  departement VARCHAR(100),
  classement VARCHAR(20),
  nif VARCHAR(50) UNIQUE,
  numero_cnss VARCHAR(50) UNIQUE,
  numero_compte VARCHAR(50),
  etablissement_financier VARCHAR(100) DEFAULT 'FUCEC',
  salaire_base DECIMAL(15,2) NOT NULL DEFAULT 0,
  salaire_categoriel DECIMAL(15,2) NOT NULL DEFAULT 0,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  utilisateur_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- rubriques (21 rubriques dans l'ordre du bulletin)
CREATE TABLE rubriques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  designation VARCHAR(200) NOT NULL,
  type_rubrique ENUM('gain','retenue') NOT NULL,
  taux DECIMAL(10,4) DEFAULT 0,
  est_calcule TINYINT(1) DEFAULT 0,
  ordre_affichage INT DEFAULT 0,
  actif TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bareme_irpp (barème officiel OTR — 8 tranches annuelles)
CREATE TABLE bareme_irpp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tranche_min DECIMAL(15,2) NOT NULL,
  tranche_max DECIMAL(15,2),           -- NULL pour la dernière tranche
  taux DECIMAL(5,4) NOT NULL
);

-- parametres
CREATE TABLE parametres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cle VARCHAR(100) NOT NULL UNIQUE,
  valeur VARCHAR(255) NOT NULL,
  description TEXT,
  date_effet DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- periodes_paie
CREATE TABLE periodes_paie (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mois INT NOT NULL,
  annee INT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut ENUM('ouverte','cloturee') DEFAULT 'ouverte',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_periode (mois, annee)
);

-- compteur_bulletins
CREATE TABLE compteur_bulletins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  annee INT NOT NULL,
  mois INT NOT NULL,
  dernier_numero INT DEFAULT 0,
  UNIQUE KEY unique_compteur (annee, mois)
);

-- bulletins
CREATE TABLE bulletins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  employe_id INT NOT NULL,
  periode_id INT NOT NULL,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  statut ENUM('brouillon','valide','archive') DEFAULT 'brouillon',
  -- Bloc 1 : éléments imposables
  salaire_base DECIMAL(15,2) DEFAULT 0,
  salaire_categoriel DECIMAL(15,2) DEFAULT 0,
  prime_anciennete DECIMAL(15,2) DEFAULT 0,
  taux_anciennete DECIMAL(5,4) DEFAULT 0,
  heures_supp DECIMAL(15,2) DEFAULT 0,
  indemnite_logement DECIMAL(15,2) DEFAULT 0,
  indemnite_transport DECIMAL(15,2) DEFAULT 0,
  total_indemnites_imposables DECIMAL(15,2) DEFAULT 0,
  sursalaire DECIMAL(15,2) DEFAULT 0,
  salaire_brut DECIMAL(15,2) DEFAULT 0,
  -- Bloc 2 : retenues légales
  irpp DECIMAL(15,2) DEFAULT 0,
  cnss DECIMAL(15,2) DEFAULT 0,
  amu DECIMAL(15,2) DEFAULT 0,
  total_retenues_legales DECIMAL(15,2) DEFAULT 0,
  salaire_net_retenues DECIMAL(15,2) DEFAULT 0,
  -- Bloc 3 : rémunération totale (RT17 = SNR11 avant primes non imposables)
  remuneration_totale DECIMAL(15,2) DEFAULT 0,
  -- Bloc 4 : primes non imposables et autres retenues
  primes_caisse DECIMAL(15,2) DEFAULT 0,
  primes_salissure DECIMAL(15,2) DEFAULT 0,
  primes_cantine DECIMAL(15,2) DEFAULT 0,
  retenue_avance DECIMAL(15,2) DEFAULT 0,
  autres_retenues DECIMAL(15,2) DEFAULT 0,
  total_autres_retenues DECIMAL(15,2) DEFAULT 0,
  -- Bloc 5 : rémunération nette finale
  remuneration_nette DECIMAL(15,2) DEFAULT 0,
  nb_jours INT DEFAULT 30,
  created_by INT,
  validated_by INT,
  validated_at DATETIME,
  FOREIGN KEY (employe_id) REFERENCES employes(id),
  FOREIGN KEY (periode_id) REFERENCES periodes_paie(id),
  FOREIGN KEY (created_by) REFERENCES utilisateurs(id),
  FOREIGN KEY (validated_by) REFERENCES utilisateurs(id)
);

-- lignes_bulletin
CREATE TABLE lignes_bulletin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bulletin_id INT NOT NULL,
  rubrique_id INT NOT NULL,
  base DECIMAL(15,2) DEFAULT 0,
  taux_ou_nombre DECIMAL(10,4) DEFAULT 0,
  montant_retenue DECIMAL(15,2) DEFAULT 0,
  montant_gain DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (bulletin_id) REFERENCES bulletins(id) ON DELETE CASCADE,
  FOREIGN KEY (rubrique_id) REFERENCES rubriques(id)
);

-- cumuls
CREATE TABLE cumuls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employe_id INT NOT NULL,
  annee INT NOT NULL,
  mois INT NOT NULL,
  cum_cnss DECIMAL(15,2) DEFAULT 0,
  cum_irpp DECIMAL(15,2) DEFAULT 0,
  cum_brut DECIMAL(15,2) DEFAULT 0,
  UNIQUE KEY unique_cumul (employe_id, annee, mois),
  FOREIGN KEY (employe_id) REFERENCES employes(id)
);

-- audit_logs
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_cible VARCHAR(100),
  id_enregistrement INT,
  details TEXT,
  ip_address VARCHAR(45),
  date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

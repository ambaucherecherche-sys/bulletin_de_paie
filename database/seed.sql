-- a) Admin : admin@solutech.com, mot de passe haché "Admin@2026" avec bcrypt
INSERT INTO utilisateurs (nom, email, password_hash, role)
VALUES ('Admin', 'admin@solutech.com', '$2b$10$aqXx6hA/bQtUi5V1Oxpw0eLwUsLMUsUimi886iCBGRS1mBhqjfeZC', 'administrateur');
-- (Hash de "Admin@2026" généré avec bcrypt)

-- b) Les 21 rubriques dans l'ordre EXACT (ordres 1 à 21) du PROMPT.md
INSERT INTO rubriques (code, designation, type_rubrique, est_calcule, ordre_affichage) VALUES
('SB01', 'Salaire de Base', 'gain', 0, 1),
('PA02', 'Prime d''Ancienneté', 'gain', 1, 2),
('HS03', 'Forfait Heures Supplémentaires', 'gain', 0, 3),
('ICL13', 'Indemnité Logement', 'gain', 0, 4),
('ICT14', 'Indemnité Transport', 'gain', 0, 5),
('TIP16', 'Total Indemnités Imposables', 'gain', 1, 6),
('SS05', 'Sursalaire', 'gain', 0, 7),
('SB06', 'Salaire Brut', 'gain', 1, 8),
('IRPP08', 'IRPP', 'retenue', 1, 9),
('CS07', 'CNSS', 'retenue', 1, 10),
('AM3', 'AMU', 'retenue', 1, 11),
('RL10', 'Total Retenues Légales', 'retenue', 1, 12),
('SNR11', 'Salaire Net Après Retenues', 'gain', 1, 13),
('RT17', 'Rémunération Totale', 'gain', 1, 14),
('IR04', 'Primes de Caisse', 'gain', 0, 15),
('IR12', 'Primes de Salissure', 'gain', 0, 16),
('ICH15', 'Primes de Cantine', 'gain', 0, 17),
('RAS18', 'Retenu/Avance sur Salaire', 'retenue', 0, 18),
('AR19', 'Autres Retenues', 'retenue', 0, 19),
('TR20', 'Total Autres Primes', 'gain', 1, 20),
('SN21', 'Rémunération Nette', 'gain', 1, 21);

-- c) Paramètres globaux (taux en %)
INSERT INTO parametres (cle, valeur, description) VALUES
('taux_cnss', '4', 'Taux CNSS en % (prérempli, modifiable)'),
('taux_amu', '5', 'Taux AMU en % (prérempli, modifiable)'),
('taux_irpp', '0', 'Taux IRPP en % (0 = non appliqué)'),
('nb_jours_mois', '30', 'Nombre de jours par mois'),
('nb_jours_travail', '30', 'Nombre de jours de travail par mois par défaut');

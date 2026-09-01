-- Migration : Ajout des colonnes de gestion des mots de passe temporaires
-- À exécuter une seule fois sur la base de données existante.

ALTER TABLE utilisateurs
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN password_expires_at  DATETIME DEFAULT NULL,
  ADD COLUMN temp_password_hash   VARCHAR(255) DEFAULT NULL;

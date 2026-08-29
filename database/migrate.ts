import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: join(process.cwd(), '.env') });

async function run() {
  const isSeed = process.argv.includes('--seed');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    if (!isSeed || process.argv.includes('--both')) {
      console.log('Exécution de schema.sql...');
      const schemaSql = readFileSync(join(process.cwd(), 'database/schema.sql'), 'utf-8');
      await pool.query(schemaSql);
      console.log('Schéma créé avec succès.');
    }

    if (isSeed || process.argv.includes('--both')) {
      console.log('Exécution de seed.sql...');
      const seedSql = readFileSync(join(process.cwd(), 'database/seed.sql'), 'utf-8');
      await pool.query(seedSql);
      console.log('Données initiales insérées avec succès.');
    }
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

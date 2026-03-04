const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function init() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    // Run schema SQL
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    console.log('Tables created successfully');

    // Seed admin user
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hash, 'Admin', 'admin']
    );
    console.log('Admin user seeded (username: admin, password: admin123)');
    console.log('Done!');
  } catch (err) {
    console.error('Init failed:', err.message);
  } finally {
    await pool.end();
  }
}

init();

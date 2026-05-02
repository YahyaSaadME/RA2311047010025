require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const pool = require('./connection');
const Log  = require('../../logging_middleware/log');

async function initSchema() {
  await Log('backend', 'info', 'db', 'Running database schema initialisation');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    await Log('backend', 'info', 'db', 'Schema applied successfully');
    console.log('Database schema applied.');
  } catch (err) {
    await Log('backend', 'error', 'db', `Schema initialisation failed: ${err.message}`);
    console.error('Schema error:', err.message);
  } finally {
    await pool.end();
  }
}

initSchema();

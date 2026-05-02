require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const Log = require('../../logging_middleware/log');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'campus_notifications',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:                  20,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  Log('backend', 'debug', 'db', 'New client connected to PostgreSQL pool').catch(() => {});
});

pool.on('error', (err) => {
  Log('backend', 'error', 'db', `Unexpected PostgreSQL pool error: ${err.message}`).catch(() => {});
});

module.exports = pool;

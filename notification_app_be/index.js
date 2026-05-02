require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express            = require('express');
const notificationRoutes = require('./routes/notifications');
const Log                = require('../logging_middleware/log');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(async (req, res, next) => {
  await Log('backend', 'info', 'middleware',
    `Incoming request: ${req.method} ${req.path}`).catch(() => {});
  next();
});

app.get('/health', async (req, res) => {
  await Log('backend', 'debug', 'handler', 'Health check endpoint hit').catch(() => {});
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', notificationRoutes);

app.use(async (req, res) => {
  await Log('backend', 'warn', 'handler',
    `404 — route not found: ${req.method} ${req.path}`).catch(() => {});
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(async (err, req, res, _next) => {
  await Log('backend', 'error', 'handler',
    `Unhandled error on ${req.method} ${req.path}: ${err.message}`).catch(() => {});
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, async () => {
  await Log('backend', 'info', 'config',
    `Campus notification service started on port ${PORT}`).catch(() => {});
  console.log(`\nNotification service running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health\n`);
});

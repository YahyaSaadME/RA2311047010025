const pool = require('../db/connection');
const Log  = require('../../logging_middleware/log');

const notificationService = {

  async getNotifications(studentId, { page, limit, type, isRead }) {
    const offset = (page - 1) * limit;
    const params = [studentId];
    const filters = ['student_id = $1'];

    if (type) {
      params.push(type);
      filters.push(`type = $${params.length}`);
    }

    if (isRead !== undefined) {
      params.push(isRead);
      filters.push(`is_read = $${params.length}`);
    }

    const where = filters.join(' AND ');

    const countParams = [...params];
    const dataParams  = [...params, limit, offset];

    const countQuery = `SELECT COUNT(*) FROM notifications WHERE ${where}`;
    const dataQuery  = `
      SELECT id, type, message, is_read, created_at
      FROM notifications
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    await Log('backend', 'debug', 'db',
      `Querying notifications for student ${studentId} — page ${page}, limit ${limit}`);

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);

    return {
      notifications: dataRes.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getUnreadCount(studentId) {
    await Log('backend', 'debug', 'db', `Fetching unread count for student ${studentId}`);
    const res = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE student_id = $1 AND is_read = FALSE',
      [studentId]
    );
    return parseInt(res.rows[0].count, 10);
  },

  async markAsRead(notificationId, studentId) {
    await Log('backend', 'debug', 'db',
      `Marking notification ${notificationId} as read for student ${studentId}`);
    const res = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND student_id = $2
       RETURNING id`,
      [notificationId, studentId]
    );
    return res.rowCount > 0;
  },

  async markAllRead(studentId) {
    await Log('backend', 'debug', 'db', `Marking all notifications read for student ${studentId}`);
    const res = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE student_id = $1 AND is_read = FALSE`,
      [studentId]
    );
    return res.rowCount;
  },

  async deleteNotification(notificationId, studentId) {
    await Log('backend', 'debug', 'db',
      `Deleting notification ${notificationId} for student ${studentId}`);
    const res = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND student_id = $2 RETURNING id',
      [notificationId, studentId]
    );
    return res.rowCount > 0;
  },

  async createNotifications(studentIds, type, message) {
    await Log('backend', 'info', 'db',
      `Bulk inserting ${studentIds.length} notifications of type ${type}`);
    const res = await pool.query(
      `INSERT INTO notifications (student_id, type, message)
       SELECT unnest($1::uuid[]), $2, $3
       RETURNING id`,
      [studentIds, type, message]
    );
    return res.rowCount;
  },
};

module.exports = notificationService;

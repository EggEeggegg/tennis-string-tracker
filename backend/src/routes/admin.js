const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require auth + admin
router.use(auth);
router.use(adminOnly);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, is_active, created_at,
       (SELECT COUNT(*)::int FROM records WHERE records.user_id = users.id) as record_count
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'username, password, and name are required' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, username, name, role, is_active, created_at`,
      [username, hash, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active, password } = req.body;

    let query = 'UPDATE users SET updated_at = now()';
    const params = [];

    if (name !== undefined) {
      params.push(name);
      query += `, name = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active);
      query += `, is_active = $${params.length}`;
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      query += `, password = $${params.length}`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING id, username, name, role, is_active`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/report?start=&end=&user_id=
router.get('/report', async (req, res) => {
  try {
    const { start, end, user_id } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (user_id) { params.push(user_id); where += ` AND r.user_id = $${params.length}`; }
    if (start) { params.push(start); where += ` AND r.date >= $${params.length}`; }
    if (end) { params.push(end); where += ` AND r.date <= $${params.length}`; }

    // Overall summary
    const summary = await pool.query(`
      SELECT COUNT(*)::int as total_records,
             SUM(price)::int as total_revenue,
             COUNT(DISTINCT r.user_id)::int as active_users,
             COUNT(DISTINCT r.date)::int as active_days,
             COUNT(CASE WHEN price = 200 THEN 1 END)::int as count_200,
             COUNT(CASE WHEN price = 300 THEN 1 END)::int as count_300
      FROM records r ${where}
    `, params);

    // Per-user summary
    const perUser = await pool.query(`
      SELECT u.id, u.name, u.username,
             COUNT(*)::int as record_count,
             SUM(r.price)::int as total_revenue
      FROM records r
      JOIN users u ON u.id = r.user_id
      ${where}
      GROUP BY u.id, u.name, u.username
      ORDER BY total_revenue DESC
    `, params);

    // Daily breakdown
    const daily = await pool.query(`
      SELECT r.date, COUNT(*)::int as count, SUM(r.price)::int as total
      FROM records r ${where}
      GROUP BY r.date ORDER BY r.date DESC LIMIT 30
    `, params);

    res.json({
      summary: summary.rows[0],
      per_user: perUser.rows,
      daily: daily.rows,
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/export?format=excel&start=&end=
router.get('/export', async (req, res) => {
  try {
    const { format, start, end } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (start) { params.push(start); where += ` AND r.date >= $${params.length}`; }
    if (end) { params.push(end); where += ` AND r.date <= $${params.length}`; }

    const result = await pool.query(`
      SELECT r.date, r.seq, u.name as user_name, r.racket, r.string1, r.string2,
             r.price, r.note, r.created_at, r.updated_at
      FROM records r
      JOIN users u ON u.id = r.user_id
      ${where}
      ORDER BY r.date DESC, u.name, r.seq
    `, params);

    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Records');

      ws.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: '#', key: 'seq', width: 5 },
        { header: 'User', key: 'user_name', width: 15 },
        { header: 'Racket', key: 'racket', width: 25 },
        { header: 'String 1', key: 'string1', width: 20 },
        { header: 'String 2', key: 'string2', width: 20 },
        { header: 'Price', key: 'price', width: 10 },
        { header: 'Note', key: 'note', width: 20 },
        { header: 'Created', key: 'created_at', width: 18 },
        { header: 'Updated', key: 'updated_at', width: 18 },
      ];

      // Style header
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      result.rows.forEach(row => {
        ws.addRow({
          ...row,
          date: new Date(row.date).toLocaleDateString('th-TH'),
          created_at: new Date(row.created_at).toLocaleString('th-TH'),
          updated_at: new Date(row.updated_at).toLocaleString('th-TH'),
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=tennis-tracker-report.xlsx');
      await wb.xlsx.write(res);
    } else {
      // JSON fallback
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(auth);

// GET /api/records?date=YYYY-MM-DD&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, start, end } = req.query;

    let query = 'SELECT * FROM records WHERE user_id = $1';
    const params = [userId];

    if (date) {
      params.push(date);
      query += ` AND date = $${params.length}`;
    } else {
      if (start) {
        params.push(start);
        query += ` AND date >= $${params.length}`;
      }
      if (end) {
        params.push(end);
        query += ` AND date <= $${params.length}`;
      }
    }

    query += ' ORDER BY date DESC, seq ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get records error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/records/summary/daily?start=&end=
router.get('/summary/daily', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    let query = `
      SELECT date, COUNT(*)::int as count, SUM(price)::int as total
      FROM records WHERE user_id = $1`;
    const params = [userId];

    if (start) { params.push(start); query += ` AND date >= $${params.length}`; }
    if (end) { params.push(end); query += ` AND date <= $${params.length}`; }

    query += ' GROUP BY date ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Daily summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/records/summary/monthly?year=2025
router.get('/summary/monthly', async (req, res) => {
  try {
    const userId = req.user.id;
    const year = req.query.year || new Date().getFullYear();

    const result = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*)::int as count, SUM(price)::int as total
      FROM records
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
    `, [userId, year]);

    res.json(result.rows);
  } catch (err) {
    console.error('Monthly summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/records
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, racket, string1, string2, price, note } = req.body;

    if (!date || !racket || !price) {
      return res.status(400).json({ error: 'date, racket, and price are required' });
    }

    // Auto-calculate seq
    const seqResult = await pool.query(
      'SELECT COALESCE(MAX(seq), 0) + 1 as next_seq FROM records WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    const seq = seqResult.rows[0].next_seq;

    const result = await pool.query(
      `INSERT INTO records (user_id, date, seq, racket, string1, string2, price, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, date, seq, racket, string1 || '', string2 || '', price, note || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create record error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/records/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { racket, string1, string2, price, note } = req.body;

    const result = await pool.query(
      `UPDATE records
       SET racket = COALESCE($3, racket),
           string1 = COALESCE($4, string1),
           string2 = COALESCE($5, string2),
           price = COALESCE($6, price),
           note = COALESCE($7, note),
           updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, racket, string1, string2, price, note]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update record error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/records/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get the record's date before deleting (for resequencing)
    const record = await pool.query(
      'SELECT date FROM records WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (record.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const recordDate = record.rows[0].date;

    // Delete
    await pool.query('DELETE FROM records WHERE id = $1 AND user_id = $2', [id, userId]);

    // Resequence remaining records for that date
    await pool.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY seq) as new_seq
        FROM records WHERE user_id = $1 AND date = $2
      )
      UPDATE records r SET seq = n.new_seq
      FROM numbered n WHERE r.id = n.id
    `, [userId, recordDate]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete record error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

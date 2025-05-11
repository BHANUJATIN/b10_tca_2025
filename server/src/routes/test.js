const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/ping-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'Connected', time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Connection Failed' });
  }
});

module.exports = router;

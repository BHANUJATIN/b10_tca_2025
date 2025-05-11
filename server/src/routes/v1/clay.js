const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// POST /api/v1/clay-request
router.post('/clay-request', async (req, res) => {
  const { company_domain, key, role, category, webhook_url_1 } = req.body;

  // Basic validation
  if (!company_domain || !key || !category || !webhook_url_1) {
    return res.status(400).json({
      error: 'Missing required fields: company_domain, key, category, or webhook_url_1',
    });
  }

  try {
    await db.query(
      `INSERT INTO clay_requests (company_domain, key, role, category, webhook_url_1)
       VALUES ($1, $2, $3, $4, $5)`,
      [company_domain, key, role || null, category, webhook_url_1]
    );

    res.status(200).json({ message: 'Clay request stored successfully', key });
  } catch (error) {
    console.error('DB insert error:', error);

    // Optional: handle duplicate key scenario
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Duplicate key: request already exists' });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

// server/src/workers/pollRequests.js
const pool = require('../config/db');
const processRequest  = require('../services/processRequests');

async function pollRequests() {
  const client = await pool.connect();

  try {
    const { rows: pendingRequests } = await client.query(
      `SELECT * FROM clay_requests WHERE status = 'pending' LIMIT 5` // Limit for safety
    );

    for (const req of pendingRequests) {
      await processRequest(req); // Pass full row to the processor
    }
  } catch (err) {
    console.error('Error polling requests:', err.message);
  } finally {
    client.release();
  }
}

module.exports = pollRequests;

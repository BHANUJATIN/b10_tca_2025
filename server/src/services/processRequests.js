// server/src/workers/processRequests.js
const pool = require('../config/db');
const fetchPeopleFromApollo = require('../utils/apollo');

async function processRequest(request) {
  const { id, key, category, company_domain, role } = request;
  const roles = role;

  if (!Array.isArray(roles)) {
    console.error(`❌ Invalid role format for request key: ${key} — roles must be an array`);
    return;
  }

  let client;
  let people = [];

  try {
    // Fetch people
    people = await fetchPeopleFromApollo({
      company_domain,
      job_titles: roles,
    });

    if (!Array.isArray(people)) {
      throw new Error('Apollo response is not a valid array');
    }

    client = await pool.connect();
    await client.query('BEGIN');

    for (const person of people) {
      try {
        await client.query(
          `INSERT INTO people_data (request_key, category, person_data)
           VALUES ($1, $2, $3)`,
          [key, category, person]
        );
      } catch (insertErr) {
        console.warn(`⚠️ Failed to insert one person for key ${key}:`, insertErr.message);
        // You can choose to skip or throw — skip keeps partial success
        continue;
      }
    }

    await client.query(
      `UPDATE clay_requests SET status = 'completed', response_time = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    console.log(`✅ Processed ${people.length} people for request key: ${key}`);

  } catch (err) {
    console.error(`❌ Failed to fully process request key: ${key}`, err.stack || err.message);

    // Rollback only if DB client was active
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error(`❌ Rollback failed for request key ${key}:`, rollbackErr.message);
      }
    }

    // Update status as failed
    try {
      await pool.query(
        `UPDATE clay_requests SET status = 'failed', response_time = NOW() WHERE id = $1`,
        [id]
      );
    } catch (statusUpdateErr) {
      console.error(`❌ Failed to mark request as failed in DB for key ${key}:`, statusUpdateErr.message);
    }

  } finally {
    if (client) client.release();
  }
}

module.exports = processRequest;

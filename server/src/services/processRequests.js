// server/src/workers/processRequests.js
const pool = require('../config/db');
const fetchPeopleFromLeadmagic = require('../utils/leadmagic');

async function processRequest(request) {
  const client = await pool.connect();
  const { id, key, category, company_domain, role } = request;

  try {
    // Step 1: Fetch people from Leadmagic
    const people = await fetchPeopleFromLeadmagic({
      company_domain,
      job_title: role
    });

    // Step 2: Insert people data
    for (const person of people) {
      await client.query(
        `INSERT INTO people_data (request_key, category, person_data)
         VALUES ($1, $2, $3)`,
        [key, category, person]
      );
    }

    // Step 3: Update request status
    await client.query(
      `UPDATE clay_requests SET status = 'completed', response_time = NOW() WHERE id = $1`,
      [id]
    );

    console.log(`✅ Processed ${people.length} people for request key: ${key}`);
  } catch (err) {
    console.error(`❌ Failed to process request key: ${key}`, err.message);
    await client.query(
      `UPDATE clay_requests SET status = 'failed', response_time = NOW() WHERE id = $1`,
      [id]
    );
  } finally {
    client.release();
  }
}

module.exports = processRequest;

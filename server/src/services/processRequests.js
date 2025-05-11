// server/src/workers/processRequests.js
const pool = require('../config/db');
const axios = require('axios');

async function processRequest(request) {
  const client = await pool.connect();
  const { id, key, category } = request;

  try {
    // Step 1: Call dummy API
    const response = await axios.get('https://dummyjson.com/c/4e1f-0eba-46cd-bd66');
    const people = response.data?.results?.people || [];

    // console.log('Raw API response:', JSON.stringify(response, null, 2));

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

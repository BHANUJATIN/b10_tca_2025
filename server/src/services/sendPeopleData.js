// server/src/services/sendPeopleData.js
const axios = require('axios');
const pool = require('../config/db');

async function sendPeopleData() {
  const client = await pool.connect();

  try {
    // Step 1: Retrieve the necessary people data with key, category, and webhook URL 1
    const result = await client.query(`
      SELECT pd.id, pd.person_data, pd.sent_to_main, pd.sent_to_icp, cr.webhook_url_1 AS webhook_1, cr.key, cr.category
FROM people_data pd
JOIN clay_requests cr ON pd.request_key = cr.key
WHERE pd.sent_to_main = false OR pd.sent_to_icp = false
LIMIT 1000;
    `);

    const peopleData = result.rows;

    // Step 2: Fetch webhook URL 2 (ICP) from category_webhooks table
    for (const data of peopleData) {
      const categoryResult = await client.query(
        `SELECT webhook_url FROM category_webhooks WHERE category = $1`,
        [data.category]
      );

      const webhookUrl2 = categoryResult.rows[0]?.webhook_url;

      if (!webhookUrl2) {
        console.error(`❌ No webhook URL found for category: ${data.category}`);
        continue;
      }

      // Step 3: Send data to the webhooks
      const payload = {
        key: data.key,
        category: data.category,
        person_data: data.person_data
      };

      // Send to the first webhook (main)
      if (!data.sent_to_main) {
        await axios.post(data.webhook_1, payload);
        await client.query(
          `UPDATE people_data SET sent_to_main = true, sent_time_main = NOW() WHERE id = $1`,
          [data.id]
        );
        console.log("data updated into webhook_1");

      }

      // Send to the second webhook (ICP)
      if (!data.sent_to_icp) {
        await axios.post(webhookUrl2, payload);
        await client.query(
          `UPDATE people_data SET sent_to_icp = true, sent_time_icp = NOW() WHERE id = $1`,
          [data.id]
        );
      }
    }

    console.log('✅ Data sent successfully to both webhooks.');

  } catch (err) {
    console.error('❌ Failed to send data:', err.message);
  } finally {
    client.release();
  }
}

module.exports = sendPeopleData;

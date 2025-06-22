// server/src/services/sendPeopleData.js
const axios = require('axios');
const pool = require('../config/db');

async function sendPeopleData(batchSize = 5) {
  const client = await pool.connect();

  try {
    // Step 1: Lock 1000 unsent & not-in-progress people rows and mark them as in progress
    await client.query('BEGIN');

    const selectResult = await client.query(`
        SELECT pd.id, pd.person_data, pd.sent_to_main, pd.sent_to_icp, cr.webhook_url_1 AS webhook_1, cr.key, cr.category
        FROM people_data pd
        JOIN clay_requests cr ON pd.request_key = cr.key
        WHERE (pd.sent_to_main = false OR pd.sent_to_icp = false) AND pd.sending_in_progress = false
        ORDER BY pd.created_at ASC
        LIMIT 1000
        FOR UPDATE SKIP LOCKED;
    `);

    const peopleData = selectResult.rows;

    const ids = peopleData.map(row => row.id);
    if (ids.length > 0) {
      await client.query(
        `UPDATE people_data SET sending_in_progress = true WHERE id = ANY($1)`,
        [ids]
      );
    }

    await client.query('COMMIT');

    // Step 2: Process in batches
    for (let i = 0; i < peopleData.length; i += batchSize) {
      const batch = peopleData.slice(i, i + batchSize);

      for (const data of batch) {
        const payload = {
          key: data.key,
          category: data.category,
          person_data: data.person_data
        };

        try {
          // Send to Main Webhook
          if (!data.sent_to_main && data.webhook_1) {
            await axios.post(data.webhook_1, payload);
            await client.query(
              `UPDATE people_data SET sent_to_main = true, sent_time_main = NOW() WHERE id = $1`,
              [data.id]
            );
          }
        } catch (err) {
          console.warn(`⚠️ Failed to send to webhook_1 for person ${data.id}:`, err.message);
        }

        try {
          // Get ICP webhook from category
          const categoryResult = await client.query(
            `SELECT webhook_url FROM category_webhooks WHERE category = $1 LIMIT 1`,
            [data.category]
          );

          const webhookUrl2 = categoryResult.rows[0]?.webhook_url;
          if (!webhookUrl2) {
            console.warn(`⚠️ No ICP webhook found for category: ${data.category}`);
            continue;
          }

          // Send to ICP Webhook
          if (!data.sent_to_icp && webhookUrl2) {
            await axios.post(webhookUrl2, payload);
            await client.query(
              `UPDATE people_data SET sent_to_icp = true, sent_time_icp = NOW() WHERE id = $1`,
              [data.id]
            );
          }

        } catch (err) {
          console.warn(`⚠️ Failed to send to webhook_2 for person ${data.id}:`, err.message);
        }

        // Always reset sending_in_progress whether successful or not
        await client.query(
          `UPDATE people_data SET sending_in_progress = false WHERE id = $1`,
          [data.id]
        );
      }
    }

    console.log('✅ All webhook sends finished for this batch.');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    console.error('❌ sendPeopleData failed:', err.message);
  } finally {
    client.release();
  }
}

module.exports = sendPeopleData;

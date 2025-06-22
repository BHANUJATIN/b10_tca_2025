// server/src/utils/webhookSender.js
const axios = require('axios');
const pool = require('../config/db');

async function sendToWebhookInBatches({ requestKey, batchSize = 10 }) {
  const client = await pool.connect();

  try {
    // Step 1: Get request meta info (main webhook + category)
    const requestResult = await client.query(
      `SELECT webhook_url_1, category FROM clay_requests WHERE key = $1 LIMIT 1`,
      [requestKey]
    );

    if (!requestResult.rows.length) {
      throw new Error(`No clay_request found for key: ${requestKey}`);
    }

    const { webhook_url_1, category } = requestResult.rows[0];

    // Step 2: Get ICP webhook URL for the category
    const categoryResult = await client.query(
      `SELECT webhook_url FROM category_webhooks WHERE category = $1 LIMIT 1`,
      [category]
    );

    const webhook_url_2 = categoryResult.rows[0]?.webhook_url;
    if (!webhook_url_2) {
      console.warn(`⚠️ No ICP webhook found for category: ${category}`);
    }

    // Step 3: Get unsent + not in-progress people
    const { rows: peopleRows } = await client.query(
      `SELECT id, person_data, sent_to_main, sent_to_icp
       FROM people_data
       WHERE request_key = $1
         AND (sent_to_main = false OR sent_to_icp = false)
         AND sending_in_progress = false
       LIMIT $2`,
      [requestKey, batchSize * 5] // Load more than batch size to allow for batching
    );

    for (let i = 0; i < peopleRows.length; i += batchSize) {
      const batch = peopleRows.slice(i, i + batchSize);

      for (const person of batch) {
        const { id, person_data, sent_to_main, sent_to_icp } = person;
        const payload = {
          key: requestKey,
          category,
          person_data,
        };

        // Mark as in progress before sending
        await client.query(
          `UPDATE people_data SET sending_in_progress = true WHERE id = $1`,
          [id]
        );

        try {
          // Main webhook
          if (!sent_to_main && webhook_url_1) {
            try {
              await axios.post(webhook_url_1, payload);
              await client.query(
                `UPDATE people_data SET sent_to_main = true, sent_time_main = NOW() WHERE id = $1`,
                [id]
              );
            } catch (err) {
              console.warn(`⚠️ Failed to send to webhook_1 for person ${id}:`, err.message);
            }
          }

          // ICP webhook
          if (!sent_to_icp && webhook_url_2) {
            try {
              await axios.post(webhook_url_2, payload);
              await client.query(
                `UPDATE people_data SET sent_to_icp = true, sent_time_icp = NOW() WHERE id = $1`,
                [id]
              );
            } catch (err) {
              console.warn(`⚠️ Failed to send to webhook_2 for person ${id}:`, err.message);
            }
          }

        } finally {
          // Always reset in-progress flag regardless of outcome
          await client.query(
            `UPDATE people_data SET sending_in_progress = false WHERE id = $1`,
            [id]
          );
        }
      }
    }

    console.log(`✅ Finished sending people for requestKey: ${requestKey}`);

  } catch (err) {
    console.error(`❌ sendToWebhookInBatches failed for key ${requestKey}:`, err.message);
  } finally {
    client.release();
  }
}

module.exports = sendToWebhookInBatches;

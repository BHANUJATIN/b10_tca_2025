require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

// Global Error Handling
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes(':db_termination')) {
    console.error('🔥 DB termination occurred. Attempting recovery...');
    return; // don't crash app
  }

  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  if (reason?.message?.includes(':db_termination')) {
    console.error('🔥 Unhandled DB termination. Continuing...');
    return;
  }

  console.error('🔥 Unhandled Rejection:', reason);
});
// Routes
app.get("/", (req, res) => {
  res.send("Beyond 10 backend is running 🚀");
});

const testRoutes = require('./src/routes/test');
app.use('/test', testRoutes);

const v1ClayRoutes = require('./src/routes/v1/clay');
app.use('/api/v1', v1ClayRoutes);

// Jobs
const pollAndProcessRequests = require('./src/jobs/pollRequests');
const sendPeopleData = require('./src/services/sendPeopleData');

app.get('/cron/poll', async (req, res) => {
  try {
    await pollAndProcessRequests();
    res.status(200).send("Polling job ran successfully.");
  } catch (error) {
    console.error("Polling job error:", error);
    res.status(500).send("Polling job failed.");
  }
});

app.get('/cron/send', async (req, res) => {
  try {
    await sendPeopleData();
    res.status(200).send("Sending job ran successfully.");
  } catch (error) {
    console.error("Sending job error:", error);
    res.status(500).send("Sending job failed.");
  }
});

// Manual Test Routes
app.get('/test-process', async (req, res) => {
  try {
    await pollAndProcessRequests();
    res.status(200).send("Polling completed successfully.");
  } catch (error) {
    console.error("Manual poll error:", error);
    res.status(500).send("Polling failed.");
  }
});

app.get('/test-people-send', async (req, res) => {
  try {
    await sendPeopleData();
    res.status(200).send("Manual send executed successfully.");
  } catch (error) {
    console.error("Manual send error:", error);
    res.status(500).send("Send failed.");
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);

  // 🔁 Poll requests every 15 minutes
  setInterval(async () => {
    console.log("🔄 Running pollAndProcessRequests...");
    try {
      await pollAndProcessRequests();
      console.log("✅ pollAndProcessRequests completed.");
    } catch (err) {
      console.error("❌ pollAndProcessRequests failed:", err.message);
    }
  }, 15 * 60 * 1000); // 15 minutes

  // 🔁 Send people data every 15 minutes
  setInterval(async () => {
    console.log("📤 Running sendPeopleData...");
    try {
      await sendPeopleData();
      console.log("✅ sendPeopleData completed.");
    } catch (err) {
      console.error("❌ sendPeopleData failed:", err.message);
    }
  }, 15 * 60 * 1000); // 15 minutes

  // 🚀 Run both immediately on startup
  (async () => {
    console.log("🚀 Initial poll and send on server start...");
    try {
      await pollAndProcessRequests();
      console.log("✅ Initial poll completed.");
    } catch (err) {
      console.error("❌ Initial poll failed:", err.message);
    }

    try {
      await sendPeopleData();
      console.log("✅ Initial send completed.");
    } catch (err) {
      console.error("❌ Initial send failed:", err.message);
    }
  })();
});
   
module.exports = app;
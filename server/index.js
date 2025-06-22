require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("Beyond 10 backend is running 🚀");
});

// Routes
const testRoutes = require('./src/routes/test');
app.use('/test', testRoutes);

const v1ClayRoutes = require('./src/routes/v1/clay');
app.use('/api/v1', v1ClayRoutes);

// Job routes for Vercel Cron
const pollAndProcessRequests = require('./src/jobs/pollRequests');
const sendPeopleData = require('./src/services/sendPeopleData');

app.post('/test/test-request', async (req, res) => {
  try {
    await pollAndProcessRequests();
    res.status(200).send("Polling job ran successfully.");
  } catch (error) {
    console.error("Polling job error:", error);
    res.status(500).send("Polling job failed.");
  }
});

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

module.exports = app; // Vercel needs this

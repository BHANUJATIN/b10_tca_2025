require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Routes (add later)
app.get("/", (req, res) => {
    res.send("Beyond 10 backend is running 🚀");
});

const testRoutes = require('./routes/test');
app.use('/test', testRoutes);

const v1ClayRoutes = require('./routes/v1/clay');
app.use('/api/v1', v1ClayRoutes);

// Jobs
const pollAndProcessRequests = require('./jobs/pollRequests');

// // ⏱ Auto-poll every 15s
// setInterval(pollAndProcessRequests, 15000);

// 🧪 Manual trigger for testing
app.get('/test-process', async (req, res) => {
  try {
    await pollAndProcessRequests();
    res.status(200).send("Polling completed successfully.");
  } catch (error) {
    console.error("Manual poll error:", error);
    res.status(500).send("Polling failed.");
  }
});


app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
 
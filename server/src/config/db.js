const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 10000, // close idle connections after 10s
  maxLifetimeSeconds: 1800, // force recycle after 30 mins
});

module.exports = pool;

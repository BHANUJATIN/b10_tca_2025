const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // from Supabase
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

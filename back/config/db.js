const sql = require("mssql");
require("dotenv").config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT === "true"
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log("Conectado a SQL Server:", process.env.DB_NAME);
  }
  return pool;
}

module.exports = { sql, getPool };
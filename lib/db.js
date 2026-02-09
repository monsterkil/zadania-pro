const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const schema = require("./schema");

// Vercel/Neon może ustawiać DATABASE_URL lub POSTGRES_URL
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[db] Brak POSTGRES_URL ani DATABASE_URL — połączenie z bazą nie zadziała");
}
const sql = neon(connectionString || "");
const db = drizzle(sql, { schema });

module.exports = { db, sql };

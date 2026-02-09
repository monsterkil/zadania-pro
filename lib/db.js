const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const schema = require("./schema");

const sql = neon(process.env.POSTGRES_URL);
const db = drizzle(sql, { schema });

module.exports = { db, sql };

const { sql } = require("@vercel/postgres");
const { drizzle } = require("drizzle-orm/vercel-postgres");
const schema = require("./schema");

const db = drizzle(sql, { schema });

module.exports = { db };

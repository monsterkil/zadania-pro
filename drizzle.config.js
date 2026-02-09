import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
});

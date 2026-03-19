import postgres from "postgres";

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

const sql = postgres(connectionString, {
  ssl: import.meta.env.PROD ? "require" : false,
  max: 5,
  idle_timeout: 5,
  connect_timeout: 10,
});

export function getSql() {
  return sql;
}
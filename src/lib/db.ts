import postgres from "postgres";

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

export function getSql() {
  return postgres(connectionString, {
    ssl: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}
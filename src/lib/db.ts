import postgres from "postgres";

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

export function getSql() {
  const isProd = import.meta.env.PROD;

  return postgres(connectionString, {
    ssl: isProd ? "require" : false,
    max: 5,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}
import postgres from "postgres";

export function getSql() {
  const connectionString = import.meta.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in environment variables.");
  }

  return postgres(connectionString, {
    ssl: "require",
    max: 5,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}
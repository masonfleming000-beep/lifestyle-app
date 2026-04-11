import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __hublifeSharedSql: ReturnType<typeof postgres> | undefined;
}

function createSharedSqlClient() {
  const connectionString = import.meta.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in environment variables.");
  }

  return postgres(connectionString, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

function getSharedSql() {
  if (!globalThis.__hublifeSharedSql) {
    globalThis.__hublifeSharedSql = createSharedSqlClient();
  }

  return globalThis.__hublifeSharedSql;
}

export function getSql() {
  const sharedSql = getSharedSql();

  return new Proxy(sharedSql, {
    apply(target, thisArg, args) {
      return Reflect.apply(target, thisArg, args);
    },
    get(target, prop, receiver) {
      if (prop === "end") {
        return async () => {};
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as typeof sharedSql;
}

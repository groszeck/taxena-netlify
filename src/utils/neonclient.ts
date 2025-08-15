let client: NeonClient | null = null;

function initClient(): NeonClient {
  if (client) return client;
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing NEON_DATABASE_URL or DATABASE_URL environment variable");
  }
  const config: NeonConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  };
  client = createClient(config);
  return client;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const db = initClient();
  const result = await db.query<T>(sql, params || []);
  return result.rows;
}

export async function execute(sql: string, params?: any[]): Promise<number> {
  const db = initClient();
  const result = await db.query(sql, params || []);
  return result.rowCount;
}

export async function transaction<T = any>(
  actions: ((db: NeonClient) => Promise<T>)[]
): Promise<T[]> {
  const db = initClient();
  await db.query("BEGIN");
  const results: T[] = [];
  try {
    for (const action of actions) {
      const res = await action(db);
      results.push(res);
    }
    await db.query("COMMIT");
    return results;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
let _client

function initClient() {
  if (!_client) {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('Database connection string is not set')
    }
    _client = createClient({ connectionString })
  }
  return _client
}

async function query(sql, params = []) {
  const client = initClient()
  const result = await client.query(sql, params)
  return result.rows
}

async function execute(sql, params = []) {
  const client = initClient()
  const result = await client.query(sql, params)
  return result.rowCount
}

async function transaction(actions = []) {
  const pool = initClient()
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const results = []
    for (const action of actions) {
      const res = await action(conn)
      results.push(res)
    }
    await conn.query('COMMIT')
    return results
  } catch (err) {
    await conn.query('ROLLBACK')
    throw err
  } finally {
    conn.release()
  }
}

export { initClient, query, execute, transaction }
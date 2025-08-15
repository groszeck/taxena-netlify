const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
})

export async function initTasks(): Promise<void> {
  const client = await pool.connect()
  const systemUserId = process.env.SYSTEM_USER_ID
  if (!systemUserId) {
    console.warn('SYSTEM_USER_ID is not set; skipping default tasks initialization.')
    client.release()
    return
  }
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM tasks'
    )
    if (rows[0].count === 0) {
      const defaults = [
        {
          title: 'Welcome to Taxena CRM',
          description: 'Get started by creating new tasks.',
          completed: false,
        },
        {
          title: 'Invite team members',
          description: 'Collaborate with your team.',
          completed: false,
        },
      ]
      const insertText =
        'INSERT INTO tasks(id, user_id, title, description, completed, created_at) VALUES($1, $2, $3, $4, $5, NOW())'
      for (const t of defaults) {
        await client.query(insertText, [
          uuidv4(),
          systemUserId,
          t.title,
          t.description,
          t.completed,
        ])
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error initializing default tasks:', error)
  } finally {
    client.release()
  }
}

export const handler: Handler = async (event) => {
  const client = await pool.connect()
  try {
    const authHeader = event.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || '')
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' }),
      }
    }
    const userId = payload.sub
    if (event.httpMethod === 'GET') {
      const { rows } = await client.query(
        'SELECT id, title, description, completed, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      )
      return {
        statusCode: 200,
        body: JSON.stringify(rows),
      }
    }
    if (event.httpMethod === 'POST') {
      let data: any
      try {
        data = event.body ? JSON.parse(event.body) : {}
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON' }),
        }
      }
      const { title, description = '' } = data
      if (!title) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Title is required' }),
        }
      }
      const id = uuidv4()
      await client.query(
        'INSERT INTO tasks(id, user_id, title, description, completed, created_at) VALUES($1, $2, $3, $4, false, NOW())',
        [id, userId, title, description]
      )
      return {
        statusCode: 201,
        body: JSON.stringify({
          id,
          title,
          description,
          completed: false,
        }),
      }
    }
    return {
      statusCode: 405,
      headers: { Allow: 'GET, POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (e: any) {
    console.error('Tasks function error:', e)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    }
  } finally {
    client.release()
  }
}
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []

const buildHeaders = (origin: string) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
})

async function checkMembership(conversationId: number, userId: number): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  )
  return result.rowCount > 0
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || ''
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || ''
  const headers = buildHeaders(allowOrigin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  let userId: number, companyId: number
  try {
    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('Missing JWT_SECRET')
    const payload = jwt.verify(token, secret) as any
    userId = payload.userId
    companyId = payload.companyId
    if (!userId || !companyId) throw new Error('Invalid token payload')
  } catch {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {}
    const convParam = params.conversation_id
    if (!convParam) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing conversation_id' }) }
    }
    const conversationId = parseInt(convParam, 10)
    if (isNaN(conversationId) || conversationId <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid conversation_id' }) }
    }
    if (!(await checkMembership(conversationId, userId))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) }
    }
    try {
      const result = await db.query(
        `SELECT m.id, m.user_id, u.name AS user_name, m.content, m.created_at
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [conversationId]
      )
      return { statusCode: 200, headers, body: JSON.stringify({ messages: result.rows }) }
    } catch (err) {
      console.error('Error fetching messages:', err)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error fetching messages' }) }
    }
  }

  if (event.httpMethod === 'POST') {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing body' }) }
    }
    let body: any
    try {
      body = JSON.parse(event.body)
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }
    const convParam = body.conversation_id
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!convParam || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing conversation_id or content' }) }
    }
    const conversationId = parseInt(convParam, 10)
    if (isNaN(conversationId) || conversationId <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid conversation_id' }) }
    }
    if (!(await checkMembership(conversationId, userId))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) }
    }
    try {
      const insert = await db.query(
        `INSERT INTO messages (conversation_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, content, created_at`,
        [conversationId, userId, content]
      )
      return { statusCode: 201, headers, body: JSON.stringify({ message: insert.rows[0] }) }
    } catch (err) {
      console.error('Error inserting message:', err)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error inserting message' }) }
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}
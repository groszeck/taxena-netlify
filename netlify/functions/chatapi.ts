const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

function respond(statusCode: number, payload: object) {
  return {
    statusCode,
    body: JSON.stringify(payload),
  }
}

function parseChatId(input: any) {
  if (typeof input !== 'string' || !/^\d+$/.test(input)) {
    throw { statusCode: 400, body: JSON.stringify({ error: 'chatId must be a positive integer string' }) }
  }
  return parseInt(input, 10)
}

async function authenticate(event: any) {
  const auth = event.headers?.authorization || ''
  if (!auth.startsWith('Bearer ')) {
    throw respond(401, { error: 'Unauthorized' })
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (typeof payload === 'object' && payload !== null) {
      return payload
    } else {
      return {}
    }
  } catch {
    throw respond(401, { error: 'Invalid token' })
  }
}

async function getMessages(event: any, user: any) {
  const rawChatId = event.queryStringParameters?.chatId
  if (!rawChatId) {
    throw respond(400, { error: 'chatId is required' })
  }
  const chatId = parseChatId(rawChatId)
  const participant = await sql`SELECT 1 FROM chat_participants WHERE chat_id = ${chatId} AND user_id = ${user.sub}`
  if (participant.rowCount === 0) {
    throw respond(403, { error: 'Forbidden' })
  }
  const messages = await sql`
    SELECT id, chat_id, sender_id, content, created_at
    FROM messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `
  return respond(200, { messages: messages.rows })
}

async function sendMessage(event: any, user: any) {
  if (!event.body) {
    throw respond(400, { error: 'Body is required' })
  }
  let body: any
  try {
    body = JSON.parse(event.body)
  } catch {
    throw respond(400, { error: 'Invalid JSON' })
  }
  const { chatId: rawChatId, content } = body
  if (!rawChatId || typeof content !== 'string') {
    throw respond(400, { error: 'chatId and content are required' })
  }
  const chatId = parseChatId(String(rawChatId))
  const participant = await sql`SELECT 1 FROM chat_participants WHERE chat_id = ${chatId} AND user_id = ${user.sub}`
  if (participant.rowCount === 0) {
    throw respond(403, { error: 'Forbidden' })
  }
  const result = await sql`
    INSERT INTO messages (chat_id, sender_id, content)
    VALUES (${chatId}, ${user.sub}, ${content})
    RETURNING id, chat_id, sender_id, content, created_at
  `
  return respond(201, { message: result.rows[0] })
}

async function createChat(event: any, user: any) {
  if (!event.body) {
    throw respond(400, { error: 'Body is required' })
  }
  let body: any
  try {
    body = JSON.parse(event.body)
  } catch {
    throw respond(400, { error: 'Invalid JSON' })
  }
  const { participantIds } = body
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw respond(400, { error: 'participantIds must be a non-empty array' })
  }
  const uniqueIds = Array.from(new Set(participantIds.map((id: any) => String(id))))
  const numericIds = uniqueIds.map(id => {
    if (!/^\d+$/.test(id)) {
      throw { statusCode: 400, body: JSON.stringify({ error: `Invalid participantId: ${id}` }) }
    }
    return parseInt(id, 10)
  })
  const allIds = Array.from(new Set([user.sub, ...numericIds]))
  const existing = await sql`SELECT id FROM users WHERE id = ANY(${allIds}::int[])`
  const existingIds = existing.rows.map(r => r.id)
  const missing = allIds.filter((id: number) => !existingIds.includes(id))
  if (missing.length > 0) {
    throw respond(400, { error: `Participant IDs not found: ${missing.join(',')}` })
  }
  const chatRes = await sql`INSERT INTO chats DEFAULT VALUES RETURNING id`
  const chatId = chatRes.rows[0].id
  for (const id of allIds) {
    await sql`INSERT INTO chat_participants (chat_id, user_id) VALUES (${chatId}, ${id})`
  }
  return respond(201, { chatId })
}

export const handler: Handler = async event => {
  try {
    const user = await authenticate(event)
    if (event.httpMethod === 'GET') {
      return await getMessages(event, user)
    } else if (event.httpMethod === 'POST') {
      const path = event.path.split('/').pop()
      if (path === 'createChat') {
        return await createChat(event, user)
      } else {
        return await sendMessage(event, user)
      }
    } else {
      return respond(405, { error: 'Method Not Allowed' })
    }
  } catch (err: any) {
    if (err.statusCode && err.body) {
      return err
    }
    return respond(500, { error: 'Internal Server Error' })
  }
}
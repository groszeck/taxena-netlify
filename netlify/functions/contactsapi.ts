const { NEON_DB_URL, JWT_SECRET } = process.env
if (!NEON_DB_URL) {
  throw new Error('Missing required environment variable: NEON_DB_URL')
}
if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET')
}

const client = createClient({ connectionString: NEON_DB_URL })

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const verifyToken = (authHeader?: string) => {
  if (!authHeader) throw new AuthError('Missing auth token')
  const parts = authHeader.split(' ')
  if (parts[0] !== 'Bearer' || !parts[1]) throw new AuthError('Invalid auth header')
  try {
    return jwt.verify(parts[1], JWT_SECRET) as { userId: string; companyId: string }
  } catch (err: any) {
    if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
      throw err
    }
    throw err
  }
}

const parseId = (idParam?: string): number | null => {
  if (!idParam) return null
  const n = parseInt(idParam, 10)
  return isNaN(n) ? null : n
}

const handleOptions = () => ({
  statusCode: 204,
  headers: CORS_HEADERS,
  body: ''
})

const getContacts = async (event: HandlerEvent) => {
  const user = verifyToken(event.headers.authorization)
  const { rows } = await client.query(
    'SELECT id, name, email, phone, created_at, updated_at FROM contacts WHERE company_id = $1 ORDER BY created_at DESC',
    [user.companyId]
  )
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(rows)
  }
}

const createContact = async (event: HandlerEvent) => {
  const user = verifyToken(event.headers.authorization)
  const body = JSON.parse(event.body || '{}')
  const { name, email, phone } = body
  if (!name || !email) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Name and email are required' })
    }
  }
  const { rows } = await client.query(
    'INSERT INTO contacts (company_id, name, email, phone, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, created_at, updated_at',
    [user.companyId, name, email, phone || null, user.userId]
  )
  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify(rows[0])
  }
}

const updateContact = async (event: HandlerEvent) => {
  const user = verifyToken(event.headers.authorization)
  const id = parseId(event.queryStringParameters?.id)
  if (id === null) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid or missing id parameter' })
    }
  }
  const body = JSON.parse(event.body || '{}')
  const allowed = ['name', 'email', 'phone']
  const entries = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (entries.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'No valid fields to update' })
    }
  }
  const fields = entries.map(([k], i) => `${k}=$${i + 1}`)
  const values = entries.map(([, v]) => v)
  values.push(user.companyId, id)
  const q = `
    UPDATE contacts
    SET ${fields.join(', ')}
    WHERE company_id = $${values.length - 1} AND id = $${values.length}
    RETURNING id, name, email, phone, created_at, updated_at
  `
  const { rows } = await client.query(q, values)
  if (rows.length === 0) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Contact not found' })
    }
  }
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(rows[0])
  }
}

const deleteContact = async (event: HandlerEvent) => {
  const user = verifyToken(event.headers.authorization)
  const id = parseId(event.queryStringParameters?.id)
  if (id === null) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid or missing id parameter' })
    }
  }
  const { rowCount } = await client.query(
    'DELETE FROM contacts WHERE company_id = $1 AND id = $2',
    [user.companyId, id]
  )
  if (rowCount === 0) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Contact not found' })
    }
  }
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: ''
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  context.callbackWaitsForEmptyEventLoop = false
  try {
    switch (event.httpMethod) {
      case 'OPTIONS':
        return handleOptions()
      case 'GET':
        return await getContacts(event)
      case 'POST':
        return await createContact(event)
      case 'PUT':
      case 'PATCH':
        return await updateContact(event)
      case 'DELETE':
        return await deleteContact(event)
      default:
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (err: any) {
    const isAuth =
      err.name === 'AuthError' ||
      err.name === 'JsonWebTokenError' ||
      err.name === 'TokenExpiredError'
    const statusCode = isAuth ? 401 : 500
    const message = isAuth ? err.message : 'Server error'
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: message })
    }
  }
}
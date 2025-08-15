const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const CompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().nullable().optional(),
  address: z.string().nullable().optional()
})

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: COMMON_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Authorization header missing' })
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return {
      statusCode: 401,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Invalid authorization format' })
    }
  }

  let decoded: any
  try {
    decoded = jwt.verify(parts[1], JWT_SECRET)
  } catch {
    return {
      statusCode: 401,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    }
  }

  const userId = decoded.userId
  const userRole = decoded.role
  if (userRole !== 'sysadmin') {
    return {
      statusCode: 403,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Insufficient permissions' })
    }
  }

  let parsedBody: any
  try {
    parsedBody = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    }
  }

  let input
  try {
    input = CompanySchema.parse(parsedBody)
  } catch (err: any) {
    const message = err.errors
      ? err.errors.map((e: any) => e.message).join(', ')
      : 'Invalid input'
    return {
      statusCode: 400,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: message })
    }
  }

  try {
    const now = new Date().toISOString()
    const result = await pool.query(
      `INSERT INTO companies (name, domain, address, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, domain, address, created_at, created_by`,
      [input.name, input.domain ?? null, input.address ?? null, now, userId]
    )
    const company = result.rows[0]
    return {
      statusCode: 201,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ company })
    }
  } catch (error) {
    console.error('Error creating company:', error)
    return {
      statusCode: 500,
      headers: COMMON_HEADERS,
      body: JSON.stringify({ error: 'Failed to create company' })
    }
  }
}
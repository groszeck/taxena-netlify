const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable')
}

const TokenSchema = z.object({
  role: z.enum(['superadmin', 'admin']),
  companyId: z.union([z.string(), z.number()])
})

export async function handler(event: HandlerEvent, context: HandlerContext) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true'
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.slice(7)
    let decoded: unknown
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    const parseResult = TokenSchema.safeParse(decoded)
    if (!parseResult.success) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token payload' })
      }
    }

    const { role, companyId } = parseResult.data
    if (role !== 'superadmin' && role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden' })
      }
    }

    let query = 'SELECT id, name, created_at FROM companies WHERE deleted_at IS NULL'
    const params: (string | number)[] = []
    if (role === 'admin') {
      query += ' AND id = $1'
      params.push(companyId)
    }

    const { rows } = await client.query(query, params)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(rows)
    }
  } catch (err) {
    console.error('getCompanies error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}
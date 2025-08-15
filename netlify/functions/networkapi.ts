const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable')
}

interface JwtPayload {
  userId: string
  companyId: string
  iat: number
  exp: number
}

function authorize(event: any): { userId: string; companyId: string } {
  const auth =
    event.headers?.authorization || event.headers?.Authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Missing or invalid authorization header' }
  }
  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    return { userId: payload.userId, companyId: payload.companyId }
  } catch {
    throw { statusCode: 401, message: 'Invalid or expired token' }
  }
}

const connectionBodySchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(7, 'Phone number too short')
    .max(20, 'Phone number too long')
    .optional(),
})

const idParamSchema = z
  .string()
  .regex(/^\d+$/, 'ID must be a numeric string')
  .transform((val) => parseInt(val, 10))

async function getConnections(companyId: string) {
  const query = `
    SELECT id, name, email, phone, created_at
      FROM connections
     WHERE company_id = $1
     ORDER BY created_at DESC
  `
  const result = await client.query(query, [companyId])
  return {
    statusCode: 200,
    body: JSON.stringify({ connections: result.rows }),
  }
}

async function addConnection(event: any, userId: string, companyId: string) {
  if (!event.body) {
    throw { statusCode: 400, message: 'Request body is required' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(event.body)
  } catch {
    throw { statusCode: 400, message: 'Invalid JSON body' }
  }
  let data: z.infer<typeof connectionBodySchema>
  try {
    data = connectionBodySchema.parse(parsed)
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => e.message).join(', ')
      throw { statusCode: 400, message }
    }
    throw err
  }
  const { name, email, phone } = data
  const query = `
    INSERT INTO connections (name, email, phone, company_id, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, phone, created_at
  `
  const params = [name, email, phone ?? null, companyId, userId]
  const result = await client.query(query, params)
  return {
    statusCode: 201,
    body: JSON.stringify({ connection: result.rows[0] }),
  }
}

async function removeConnection(event: any, companyId: string) {
  const params = event.queryStringParameters || {}
  const rawId = params.id
  if (!rawId) {
    throw { statusCode: 400, message: 'Connection ID is required' }
  }
  let id: number
  try {
    id = idParamSchema.parse(rawId)
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => e.message).join(', ')
      throw { statusCode: 400, message }
    }
    throw err
  }
  const query = `
    DELETE FROM connections
     WHERE id = $1
       AND company_id = $2
    RETURNING id
  `
  const result = await client.query(query, [id, companyId])
  if (result.rowCount === 0) {
    throw { statusCode: 404, message: 'Connection not found' }
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ id }),
  }
}

export const handler: Handler = async (event) => {
  try {
    const { userId, companyId } = authorize(event)
    switch (event.httpMethod) {
      case 'GET':
        return await getConnections(companyId)
      case 'POST':
        return await addConnection(event, userId, companyId)
      case 'DELETE':
        return await removeConnection(event, companyId)
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method Not Allowed' }),
        }
    }
  } catch (err: any) {
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    }
  }
}
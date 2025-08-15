const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined
}

const getPool = (): Pool => {
  if (!global.__pgPool__) {
    global.__pgPool__ = new Pool({
      connectionString: process.env.NEON_DB_URL,
      ssl: { rejectUnauthorized: false }
    })
  }
  return global.__pgPool__
}

const authenticate = (event: any): string => {
  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized' }
  }
  const token = authHeader.slice(7)
  let payload: any
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string)
  } catch {
    throw { status: 401, message: 'Unauthorized' }
  }
  const companyId = typeof payload.companyId === 'string'
    ? payload.companyId
    : typeof payload.company_id === 'string'
      ? payload.company_id
      : null
  if (!companyId) {
    throw { status: 401, message: 'Unauthorized' }
  }
  return companyId
}

const getForms = async (companyId: string) => {
  const pool = getPool()
  const result = await pool.query(
    'SELECT id, name, data, created_at FROM forms WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId]
  )
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result.rows)
  }
}

const submitForm = async (companyId: string, bodyStr: string | null) => {
  if (!bodyStr) {
    throw { status: 400, message: 'Missing request body' }
  }
  let payload: any
  try {
    payload = JSON.parse(bodyStr)
  } catch {
    throw { status: 400, message: 'Invalid JSON body' }
  }
  const { name, data } = payload
  if (typeof name !== 'string' || name.trim() === '') {
    throw { status: 400, message: 'Form "name" must be a non-empty string' }
  }
  if (typeof data !== 'object' || data === null) {
    throw { status: 400, message: 'Form "data" must be an object' }
  }
  const pool = getPool()
  const result = await pool.query(
    'INSERT INTO forms (company_id, name, data) VALUES ($1, $2, $3) RETURNING id, name, data, created_at',
    [companyId, name.trim(), data]
  )
  const created = result.rows[0]
  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify(created)
  }
}

const deleteForm = async (companyId: string, id?: string) => {
  if (typeof id !== 'string' || id.trim() === '') {
    throw { status: 400, message: 'Missing form ID' }
  }
  const pool = getPool()
  const result = await pool.query(
    'DELETE FROM forms WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
  )
  if (result.rowCount === 0) {
    throw { status: 404, message: 'Form not found' }
  }
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ id: result.rows[0].id })
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }
  try {
    const companyId = authenticate(event)
    switch (event.httpMethod) {
      case 'GET':
        return await getForms(companyId)
      case 'POST':
        return await submitForm(companyId, event.body)
      case 'DELETE':
        const params = event.queryStringParameters || {}
        return await deleteForm(companyId, params.id)
      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        }
    }
  } catch (err: any) {
    const status = typeof err.status === 'number' ? err.status : 500
    const message = typeof err.message === 'string' ? err.message : 'Internal Server Error'
    return {
      statusCode: status,
      headers: corsHeaders,
      body: JSON.stringify({ error: message })
    }
  }
}
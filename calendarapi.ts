const JWT_SECRET = process.env.JWT_SECRET!
const DATABASE_URL = process.env.DATABASE_URL!

const pool = new Pool({ connectionString: DATABASE_URL })

interface AuthPayload {
  userId: string
  companyId: string
  [key: string]: any
}

function getToken(event: HandlerEvent): string {
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth) throw { statusCode: 401, message: 'Missing Authorization header' }
  const parts = auth.split(' ')
  if (parts[0] !== 'Bearer' || !parts[1]) throw { statusCode: 401, message: 'Invalid Authorization format' }
  return parts[1]
}

function verifyAuth(event: HandlerEvent): AuthPayload {
  try {
    const token = getToken(event)
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    if (!payload || !payload.userId || !payload.companyId) throw new Error()
    return payload
  } catch {
    throw { statusCode: 401, message: 'Unauthorized' }
  }
}

const createEventSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    start: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid start date format' }),
    end: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid end date format' }),
    allDay: z.boolean().optional(),
  })
  .refine((data) => new Date(data.end) >= new Date(data.start), {
    message: 'End date must be on or after start date',
    path: ['end'],
  })

const updateEventSchema = createEventSchema.extend({
  id: z.string().min(1),
})

async function getEvents(event: HandlerEvent, auth: AuthPayload) {
  const { id } = event.queryStringParameters || {}
  const client = await pool.connect()
  try {
    let res
    if (id) {
      res = await client.query(
        `SELECT id, title, description, start, "end", all_day AS "allDay" 
         FROM events 
         WHERE id = $1 AND company_id = $2`,
        [id, auth.companyId]
      )
      if (res.rowCount === 0) throw { statusCode: 404, message: 'Event not found' }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res.rows[0]),
      }
    } else {
      res = await client.query(
        `SELECT id, title, description, start, "end", all_day AS "allDay" 
         FROM events 
         WHERE company_id = $1 
         ORDER BY start`,
        [auth.companyId]
      )
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res.rows),
      }
    }
  } finally {
    client.release()
  }
}

async function createEvent(event: HandlerEvent, auth: AuthPayload) {
  if (!event.body) throw { statusCode: 400, message: 'Missing request body' }
  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    throw { statusCode: 400, message: 'Malformed JSON' }
  }
  const parsed = createEventSchema.safeParse(data)
  if (!parsed.success) {
    throw { statusCode: 400, message: parsed.error.errors.map((e) => e.message).join(', ') }
  }
  const { title, description = '', start, end, allDay = false } = parsed.data
  const client = await pool.connect()
  try {
    const res = await client.query(
      `INSERT INTO events (title, description, start, "end", all_day, company_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, start, "end", all_day AS "allDay"`,
      [title, description, start, end, allDay, auth.companyId, auth.userId]
    )
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res.rows[0]),
    }
  } finally {
    client.release()
  }
}

async function updateEvent(event: HandlerEvent, auth: AuthPayload) {
  if (!event.body) throw { statusCode: 400, message: 'Missing request body' }
  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    throw { statusCode: 400, message: 'Malformed JSON' }
  }
  const parsed = updateEventSchema.safeParse(data)
  if (!parsed.success) {
    throw { statusCode: 400, message: parsed.error.errors.map((e) => e.message).join(', ') }
  }
  const { id, title, description = '', start, end, allDay = false } = parsed.data
  const client = await pool.connect()
  try {
    const res = await client.query(
      `UPDATE events
       SET title = $1, description = $2, start = $3, "end" = $4, all_day = $5
       WHERE id = $6 AND company_id = $7
       RETURNING id, title, description, start, "end", all_day AS "allDay"`,
      [title, description, start, end, allDay, id, auth.companyId]
    )
    if (res.rowCount === 0) throw { statusCode: 404, message: 'Event not found or unauthorized' }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res.rows[0]),
    }
  } finally {
    client.release()
  }
}

async function deleteEvent(event: HandlerEvent, auth: AuthPayload) {
  const { id } = event.queryStringParameters || {}
  if (!id) throw { statusCode: 400, message: 'Missing event id' }
  const client = await pool.connect()
  try {
    const res = await client.query(
      `DELETE FROM events
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [id, auth.companyId]
    )
    if (res.rowCount === 0) throw { statusCode: 404, message: 'Event not found or unauthorized' }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: res.rows[0].id }),
    }
  } finally {
    client.release()
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const auth = verifyAuth(event)
    switch (event.httpMethod) {
      case 'GET':
        return await getEvents(event, auth)
      case 'POST':
        return await createEvent(event, auth)
      case 'PUT':
      case 'PATCH':
        return await updateEvent(event, auth)
      case 'DELETE':
        return await deleteEvent(event, auth)
      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Method Not Allowed' }),
        }
    }
  } catch (err: any) {
    const status = err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    }
  }
}
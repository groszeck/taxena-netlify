const { DATABASE_URL, JWT_SECRET } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL environment variable is required')
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')

declare global {
  var _neonClient: Client | undefined
}

const client: Client = global._neonClient ?? new Client({ connectionString: DATABASE_URL })
if (!global._neonClient) {
  client.connect()
  global._neonClient = client
}

function getUserFromEvent(headers: Record<string, string | undefined>) {
  const auth = headers.authorization || headers.Authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    const err: any = new Error('Unauthorized')
    err.statusCode = 401
    throw err
  }
  const token = auth.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; companyId: string }
    if (!decoded.companyId) {
      const err: any = new Error('Invalid token')
      err.statusCode = 401
      throw err
    }
    return decoded
  } catch {
    const err: any = new Error('Unauthorized')
    err.statusCode = 401
    throw err
  }
}

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number(),
  dueDate: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date format' }),
  status: z.string().min(1),
  description: z.string().optional().nullable(),
})

const updateInvoiceSchema = createInvoiceSchema.partial()

function jsonResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function getInvoices(event: any): Promise<any> {
  try {
    const user = getUserFromEvent(event.headers || {})
    const { rows } = await client.query(
      `SELECT
         id,
         customer_id AS "customerId",
         amount,
         due_date AS "dueDate",
         status,
         description,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM invoices
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [user.companyId]
    )
    return jsonResponse(200, rows)
  } catch (error: any) {
    console.error(error)
    const status = error.statusCode || 500
    const message = status === 500 ? 'Internal Server Error' : error.message
    return jsonResponse(status, { error: message })
  }
}

export async function createInvoice(event: any): Promise<any> {
  try {
    const user = getUserFromEvent(event.headers || {})
    if (!event.body) {
      return jsonResponse(400, { error: 'Missing request body' })
    }
    let parsed: any
    try {
      parsed = JSON.parse(event.body)
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' })
    }
    const result = createInvoiceSchema.safeParse(parsed)
    if (!result.success) {
      const msg = result.error.errors[0].message
      return jsonResponse(400, { error: msg })
    }
    const { customerId, amount, dueDate, status, description } = result.data
    const { rows } = await client.query(
      `INSERT INTO invoices
         (customer_id, amount, due_date, status, description, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         customer_id AS "customerId",
         amount,
         due_date AS "dueDate",
         status,
         description,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [customerId, amount, dueDate, status, description ?? null, user.companyId]
    )
    return jsonResponse(201, rows[0])
  } catch (error: any) {
    console.error(error)
    const status = error.statusCode || 500
    const message = status === 500 ? 'Internal Server Error' : error.message
    return jsonResponse(status, { error: message })
  }
}

export async function updateInvoice(event: any): Promise<any> {
  try {
    const user = getUserFromEvent(event.headers || {})
    const params = event.queryStringParameters || {}
    const id = params.id
    if (!id) {
      return jsonResponse(400, { error: 'Missing invoice id' })
    }
    if (!event.body) {
      return jsonResponse(400, { error: 'Missing request body' })
    }
    let parsed: any
    try {
      parsed = JSON.parse(event.body)
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' })
    }
    const result = updateInvoiceSchema.safeParse(parsed)
    if (!result.success) {
      const msg = result.error.errors[0].message
      return jsonResponse(400, { error: msg })
    }
    const data = result.data
    const allowed = ['customerId', 'amount', 'dueDate', 'status', 'description']
    const fields = Object.entries(data).filter(([key, _]) => allowed.includes(key))
    if (fields.length === 0) {
      return jsonResponse(400, { error: 'No valid fields to update' })
    }
    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1
    for (const [key, value] of fields) {
      let col = key
      if (key === 'customerId') col = 'customer_id'
      if (key === 'dueDate') col = 'due_date'
      setClauses.push(`${col} = $${idx}`)
      values.push(value)
      idx++
    }
    values.push(id, user.companyId)
    const query = `
      UPDATE invoices
      SET ${setClauses.join(', ')}, updated_at = now()
      WHERE id = $${idx} AND company_id = $${idx + 1}
      RETURNING
        id,
        customer_id AS "customerId",
        amount,
        due_date AS "dueDate",
        status,
        description,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `
    const { rows } = await client.query(query, values)
    if (rows.length === 0) {
      return jsonResponse(404, { error: 'Invoice not found' })
    }
    return jsonResponse(200, rows[0])
  } catch (error: any) {
    console.error(error)
    const status = error.statusCode || 500
    const message = status === 500 ? 'Internal Server Error' : error.message
    return jsonResponse(status, { error: message })
  }
}

export async function deleteInvoice(event: any): Promise<any> {
  try {
    const user = getUserFromEvent(event.headers || {})
    const params = event.queryStringParameters || {}
    const id = params.id
    if (!id) {
      return jsonResponse(400, { error: 'Missing invoice id' })
    }
    const { rowCount } = await client.query(
      `DELETE FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, user.companyId]
    )
    if (rowCount === 0) {
      return jsonResponse(404, { error: 'Invoice not found' })
    }
    return { statusCode: 204, headers: {}, body: '' }
  } catch (error: any) {
    console.error(error)
    const status = error.statusCode || 500
    const message = status === 500 ? 'Internal Server Error' : error.message
    return jsonResponse(status, { error: message })
  }
}
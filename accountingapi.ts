var __pgClient: Client | undefined
}

async function getClient(): Promise<Client> {
  if (!globalThis.__pgClient) {
    const client = new Client({ connectionString: process.env.DATABASE_URL! })
    await client.connect()
    globalThis.__pgClient = client
  }
  return globalThis.__pgClient
}

export const handler: Handler = async (event) => {
  try {
    const rawHeaders = event.headers || {}
    const headers = Object.keys(rawHeaders).reduce<Record<string,string>>((acc, key) => {
      acc[key.toLowerCase()] = rawHeaders[key] as string
      return acc
    }, {})
    const authHeader = headers['authorization']
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) }
    }
    const parts = authHeader.split(' ')
    if (parts.length !== 2) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid Authorization header' }) }
    }
    const token = parts[1]
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    } catch {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
    }

    const db = await getClient()
    const action = event.queryStringParameters?.action

    if (event.httpMethod === 'GET' && action === 'getTaxInfo') {
      const res = await db.query(
        'SELECT id, bracket_cap, rate FROM tax_rates WHERE company_id = $1 ORDER BY bracket_cap ASC',
        [payload.companyId]
      )
      return { statusCode: 200, body: JSON.stringify(res.rows) }
    }

    if (event.httpMethod === 'POST' && action === 'calculateTaxes') {
      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Request body required' }) }
      }
      let parsed: any
      try {
        parsed = JSON.parse(event.body)
      } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
      }
      const { taxableIncome } = parsed
      if (typeof taxableIncome !== 'number' || taxableIncome < 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid taxableIncome' }) }
      }
      const ratesRes = await db.query(
        'SELECT bracket_cap, rate FROM tax_rates WHERE company_id = $1 ORDER BY bracket_cap ASC',
        [payload.companyId]
      )
      let remaining = taxableIncome
      let taxOwed = 0
      let prevCap = 0
      for (const row of ratesRes.rows) {
        const cap = Number(row.bracket_cap)
        const rate = Number(row.rate)
        const sliceWidth = cap - prevCap
        const amount = Math.min(remaining, sliceWidth > 0 ? sliceWidth : remaining)
        taxOwed += amount * rate
        remaining -= amount
        prevCap = cap
        if (remaining <= 0) break
      }
      return { statusCode: 200, body: JSON.stringify({ taxableIncome, taxOwed }) }
    }

    if (event.httpMethod === 'POST' && action === 'submitTaxReport') {
      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Request body required' }) }
      }
      let parsed: any
      try {
        parsed = JSON.parse(event.body)
      } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
      }
      const { period, taxableIncome, deductions, taxOwed } = parsed
      if (
        typeof period !== 'string' ||
        typeof taxableIncome !== 'number' ||
        typeof deductions !== 'number' ||
        typeof taxOwed !== 'number'
      ) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payload' }) }
      }
      const insert = await db.query(
        `INSERT INTO tax_reports
          (company_id, user_id, period, taxable_income, deductions, tax_owed, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         RETURNING id`,
        [payload.companyId, payload.userId, period, taxableIncome, deductions, taxOwed]
      )
      const reportId = insert.rows[0]?.id
      return { statusCode: 200, body: JSON.stringify({ reportId }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid route or method' }) }
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Server error' }) }
  }
}
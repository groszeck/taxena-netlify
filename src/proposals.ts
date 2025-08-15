const ALLOWED_STATUSES = ['draft', 'sent', 'accepted', 'rejected']

const parseJson = (body: string | null) => {
  if (!body) throw new HTTPError(400, 'Missing request body')
  try {
    return JSON.parse(body)
  } catch {
    throw new HTTPError(400, 'Invalid JSON')
  }
}

export const handler: Handler = async (event) => {
  let client: any
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) throw new HTTPError(401, 'Missing Authorization header')
    const token = authHeader.split(' ')[1]
    if (!token) throw new HTTPError(401, 'Invalid Authorization header')
    const user = await verifyJWT(token)
    const companyId = user.company_id
    client = await getClient()

    switch (event.httpMethod) {
      case 'GET': {
        const idParam = event.queryStringParameters?.id
        if (idParam) {
          const proposalId = parseInt(idParam, 10)
          if (isNaN(proposalId)) throw new HTTPError(400, 'Invalid proposal id')
          const { rows } = await client.query(
            'SELECT * FROM proposals WHERE id = $1 AND company_id = $2',
            [proposalId, companyId]
          )
          if (rows.length === 0) throw new HTTPError(404, 'Proposal not found')
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rows[0]),
          }
        }
        const all = await client.query(
          'SELECT * FROM proposals WHERE company_id = $1 ORDER BY created_at DESC',
          [companyId]
        )
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(all.rows),
        }
      }

      case 'POST': {
        const body = parseJson(event.body)
        const { title, description, amount, status, dealId } = body

        if (!title || typeof title !== 'string') {
          throw new HTTPError(400, 'Title is required and must be a string')
        }
        if (amount == null || typeof amount !== 'number') {
          throw new HTTPError(400, 'Amount is required and must be a number')
        }
        const finalStatus = status ?? 'draft'
        if (typeof finalStatus !== 'string' || !ALLOWED_STATUSES.includes(finalStatus)) {
          throw new HTTPError(400, `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`)
        }
        const finalDealId = dealId == null ? null : dealId
        if (finalDealId !== null && (!Number.isInteger(finalDealId) || finalDealId <= 0)) {
          throw new HTTPError(400, 'dealId must be a positive integer or null')
        }

        const insert = await client.query(
          `INSERT INTO proposals
             (title, description, amount, status, deal_id, company_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            title,
            description || '',
            amount,
            finalStatus,
            finalDealId,
            companyId,
            user.id,
          ]
        )
        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(insert.rows[0]),
        }
      }

      case 'PUT': {
        const body = parseJson(event.body)
        const { id, title, description, amount, status, dealId } = body
        const proposalId = parseInt(id, 10)
        if (isNaN(proposalId)) throw new HTTPError(400, 'Invalid proposal id')

        if (title != null && typeof title !== 'string') {
          throw new HTTPError(400, 'Title must be a string')
        }
        if (description != null && typeof description !== 'string') {
          throw new HTTPError(400, 'Description must be a string')
        }
        if (amount != null && typeof amount !== 'number') {
          throw new HTTPError(400, 'Amount must be a number')
        }
        if (status != null) {
          if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
            throw new HTTPError(400, `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`)
          }
        }
        const finalDealId = dealId == null ? null : dealId
        if (dealId != null && (!Number.isInteger(finalDealId) || finalDealId <= 0)) {
          throw new HTTPError(400, 'dealId must be a positive integer or null')
        }

        const check = await client.query(
          'SELECT id FROM proposals WHERE id = $1 AND company_id = $2',
          [proposalId, companyId]
        )
        if (check.rows.length === 0) throw new HTTPError(404, 'Proposal not found')

        const updated = await client.query(
          `UPDATE proposals SET
             title       = COALESCE($1, title),
             description = COALESCE($2, description),
             amount      = COALESCE($3, amount),
             status      = COALESCE($4, status),
             deal_id     = COALESCE($5, deal_id),
             updated_at  = NOW()
           WHERE id = $6 AND company_id = $7
           RETURNING *`,
          [
            title,
            description,
            amount,
            status,
            finalDealId,
            proposalId,
            companyId,
          ]
        )
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated.rows[0]),
        }
      }

      case 'DELETE': {
        const idParam = event.queryStringParameters?.id
        if (!idParam) throw new HTTPError(400, 'Missing proposal id')
        const proposalId = parseInt(idParam, 10)
        if (isNaN(proposalId)) throw new HTTPError(400, 'Invalid proposal id')

        const check = await client.query(
          'SELECT id FROM proposals WHERE id = $1 AND company_id = $2',
          [proposalId, companyId]
        )
        if (check.rows.length === 0) throw new HTTPError(404, 'Proposal not found')

        await client.query(
          'DELETE FROM proposals WHERE id = $1 AND company_id = $2',
          [proposalId, companyId]
        )
        return {
          statusCode: 204,
          headers: { 'Content-Type': 'application/json' },
          body: '',
        }
      }

      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Method Not Allowed' }),
        }
    }
  } catch (err: any) {
    if (err instanceof HTTPError) {
      return {
        statusCode: err.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      }
    }
    console.error(err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  } finally {
    if (client && typeof client.release === 'function') {
      client.release()
    }
  }
}
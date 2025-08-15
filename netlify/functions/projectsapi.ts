const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  try {
    const method = event.httpMethod
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }
    const token = authHeader.split(' ')[1]
    let decoded: { userId: string; companyId: string }
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as {
        userId: string
        companyId: string
      }
    } catch {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }
    const { userId, companyId } = decoded

    switch (method) {
      case 'GET': {
        const { rows } = await pool.query(
          `
          SELECT
            id,
            name,
            description,
            created_at,
            created_by
          FROM projects
          WHERE company_id = $1
          ORDER BY created_at DESC
        `,
          [companyId]
        )
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(rows) }
      }

      case 'POST': {
        if (!event.body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing request body' })
          }
        }
        let data: any
        try {
          data = JSON.parse(event.body)
        } catch {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON' })
          }
        }
        const { name, description } = data
        if (!name) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Name is required' })
          }
        }
        const { rows } = await pool.query(
          `
          INSERT INTO projects
            (name, description, company_id, created_by)
          VALUES
            ($1, $2, $3, $4)
          RETURNING
            id,
            name,
            description,
            created_at,
            created_by
        `,
          [name, description || null, companyId, userId]
        )
        return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(rows[0]) }
      }

      case 'PUT': {
        if (!event.body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing request body' })
          }
        }
        let data: any
        try {
          data = JSON.parse(event.body)
        } catch {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON' })
          }
        }
        const { id, name, description } = data
        if (!id) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Project ID is required' })
          }
        }
        const updates: string[] = []
        const values: any[] = []
        let idx = 1
        if (name !== undefined) {
          updates.push(`name = $${idx}`)
          values.push(name)
          idx++
        }
        if (description !== undefined) {
          updates.push(`description = $${idx}`)
          values.push(description)
          idx++
        }
        if (updates.length === 0) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'No fields to update' })
          }
        }
        values.push(id, companyId)
        const { rows } = await pool.query(
          `
          UPDATE projects
          SET ${updates.join(', ')}
          WHERE id = $${idx++} AND company_id = $${idx}
          RETURNING
            id,
            name,
            description,
            created_at,
            created_by
        `,
          values
        )
        if (rows.length === 0) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Project not found' })
          }
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(rows[0]) }
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id
        if (!id) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Project ID is required' })
          }
        }
        const result = await pool.query(
          `
          DELETE FROM projects
          WHERE id = $1 AND company_id = $2
        `,
          [id, companyId]
        )
        if (result.rowCount === 0) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Project not found' })
          }
        }
        return { statusCode: 204, headers: corsHeaders, body: '' }
      }

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        }
    }
  } catch (err: any) {
    return {
      statusCode: err.statusCode || 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    }
  }
}

export { handler }
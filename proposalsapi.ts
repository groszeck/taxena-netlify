const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

const ALLOWED_STATUS = ["draft", "sent", "accepted", "rejected"]

class HttpError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

function parseJSON(body: string): any {
  try {
    return JSON.parse(body)
  } catch {
    throw new HttpError(400, "Invalid JSON body")
  }
}

function validateId(id: string | undefined): number {
  if (!id) {
    throw new HttpError(400, "Missing proposal id")
  }
  const num = Number(id)
  if (!Number.isInteger(num) || num <= 0) {
    throw new HttpError(400, "Invalid proposal id")
  }
  return num
}

const getProposals = async (event: HandlerEvent, user: any) => {
  const params = event.queryStringParameters || {}
  if (params.id !== undefined) {
    const id = validateId(params.id)
    const { rows } = await query(
      "SELECT * FROM proposals WHERE id = $1 AND company_id = $2",
      [id, user.companyId]
    )
    if (rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Proposal not found" })
      }
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(rows[0])
    }
  }
  const { rows } = await query(
    "SELECT * FROM proposals WHERE company_id = $1 ORDER BY created_at DESC",
    [user.companyId]
  )
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(rows)
  }
}

const createProposal = async (event: HandlerEvent, user: any) => {
  if (!event.body) {
    throw new HttpError(400, "Missing request body")
  }
  const body = parseJSON(event.body)
  const { title, description, amount, status } = body
  if (!title || amount == null) {
    throw new HttpError(400, "Missing required fields: title and amount")
  }
  if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
    throw new HttpError(
      400,
      `Invalid status; allowed values: ${ALLOWED_STATUS.join(", ")}`
    )
  }
  const { rows } = await query(
    `INSERT INTO proposals (company_id, created_by, title, description, amount, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      user.companyId,
      user.userId,
      title,
      description || "",
      amount,
      status || "draft"
    ]
  )
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(rows[0])
  }
}

const updateProposal = async (event: HandlerEvent, user: any) => {
  const params = event.queryStringParameters || {}
  const id = validateId(params.id)
  if (!event.body) {
    throw new HttpError(400, "Missing request body")
  }
  const body = parseJSON(event.body)
  const fields: string[] = []
  const values: any[] = []
  let idx = 1
  const allowed = ["title", "description", "amount", "status"]
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "status" && !ALLOWED_STATUS.includes(body.status)) {
        throw new HttpError(
          400,
          `Invalid status; allowed values: ${ALLOWED_STATUS.join(", ")}`
        )
      }
      fields.push(`${key} = $${idx}`)
      values.push(body[key])
      idx++
    }
  }
  if (fields.length === 0) {
    throw new HttpError(400, "No fields to update")
  }
  values.push(id, user.companyId)
  const sql = `
    UPDATE proposals SET ${fields.join(", ")}
    WHERE id = $${idx} AND company_id = $${idx + 1}
    RETURNING *
  `
  const { rows } = await query(sql, values)
  if (rows.length === 0) {
    throw new HttpError(404, "Proposal not found or no permission")
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(rows[0])
  }
}

const deleteProposal = async (event: HandlerEvent, user: any) => {
  const params = event.queryStringParameters || {}
  const id = validateId(params.id)
  const { rows } = await query(
    "DELETE FROM proposals WHERE id = $1 AND company_id = $2 RETURNING id",
    [id, user.companyId]
  )
  if (rows.length === 0) {
    throw new HttpError(404, "Proposal not found or no permission")
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  }
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }
  try {
    const authHeader =
      event.headers.authorization || event.headers.Authorization || ""
    const user = verifyToken(authHeader)
    switch (event.httpMethod) {
      case "GET":
        return await getProposals(event, user)
      case "POST":
        return await createProposal(event, user)
      case "PUT":
        return await updateProposal(event, user)
      case "DELETE":
        return await deleteProposal(event, user)
      default:
        throw new HttpError(405, "Method not allowed")
    }
  } catch (err: any) {
    const statusCode =
      typeof err.statusCode === "number" && err.statusCode >= 400
        ? err.statusCode
        : err.statusCode === 401
        ? 401
        : 500
    const message =
      err.statusCode || err.status === 401
        ? err.message || "Unauthorized"
        : err.message || "Internal Server Error"
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: message })
    }
  }
}
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1d"

if (!JWT_SECRET) {
  throw new Error("Missing required environment variable JWT_SECRET")
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MIN_LENGTH = 1
const NAME_MAX_LENGTH = 100
const COMPANY_MIN_LENGTH = 1
const COMPANY_MAX_LENGTH = 100
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    }
  }

  let body: any
  try {
    body = JSON.parse(event.body || "{}")
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    }
  }

  const { name, email, password, companyName } = body

  if (
    typeof name !== "string" ||
    name.trim().length < NAME_MIN_LENGTH ||
    name.trim().length > NAME_MAX_LENGTH
  ) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Name must be a string between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      }),
    }
  }

  if (
    typeof companyName !== "string" ||
    companyName.trim().length < COMPANY_MIN_LENGTH ||
    companyName.trim().length > COMPANY_MAX_LENGTH
  ) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Company name must be a string between ${COMPANY_MIN_LENGTH} and ${COMPANY_MAX_LENGTH} characters`,
      }),
    }
  }

  if (typeof email !== "string" || !emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid email format" }),
    }
  }

  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      }),
    }
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    )
    if (existingUser.rowCount > 0) {
      await client.query("ROLLBACK")
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email already in use" }),
      }
    }

    const existingCompany = await client.query(
      "SELECT id FROM companies WHERE LOWER(name) = LOWER($1)",
      [companyName.trim()]
    )

    let companyId: number
    if (existingCompany.rowCount > 0) {
      companyId = existingCompany.rows[0].id
    } else {
      const companyResult = await client.query(
        "INSERT INTO companies (name, created_at) VALUES ($1, NOW()) RETURNING id",
        [companyName.trim()]
      )
      companyId = companyResult.rows[0].id
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const userResult = await client.query(
      `INSERT INTO users
        (name, email, password_hash, company_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, role`,
      [name.trim(), email.toLowerCase(), passwordHash, companyId, "admin"]
    )
    const userId = userResult.rows[0].id
    const role = userResult.rows[0].role

    await client.query("COMMIT")

    const token = jwt.sign(
      { userId, companyId, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    )

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }
  } catch (error: any) {
    console.error("Error in signup handler:", error)
    await client.query("ROLLBACK")
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    }
  } finally {
    client.release()
  }
}
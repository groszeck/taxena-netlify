const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const JWT_SECRET = process.env.JWT_SECRET
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: ""
    }
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: defaultHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" })
    }
  }

  let email: string
  let password: string
  try {
    const body = JSON.parse(event.body || "{}")
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      throw new Error("Missing fields")
    }
    email = body.email.trim().toLowerCase()
    password = body.password
    if (!email || !password) {
      throw new Error("Empty email or password")
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format")
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ error: "Invalid request body" })
    }
  }

  let client: any = null
  try {
    client = await pool.connect()
    const result = await client.query(
      `SELECT id, email, password_hash, company_id, role
       FROM users
       WHERE email = $1 AND is_active = TRUE`,
      [email]
    )

    if (result.rowCount === 0) {
      return {
        statusCode: 401,
        headers: defaultHeaders,
        body: JSON.stringify({ error: "Invalid credentials" })
      }
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return {
        statusCode: 401,
        headers: defaultHeaders,
        body: JSON.stringify({ error: "Invalid credentials" })
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        companyId: user.company_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    )

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          companyId: user.company_id,
          role: user.role
        }
      })
    }
  } catch (err) {
    console.error("Login error:", err)
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({ error: "Internal server error" })
    }
  } finally {
    if (client) {
      client.release()
    }
  }
}
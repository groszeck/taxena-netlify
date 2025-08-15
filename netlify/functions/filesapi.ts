const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10)
const FILENAME_REGEX = /^[a-zA-Z0-9._-]{1,255}$/
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

function isAuthError(error: any): boolean {
  return error.name === 'UnauthorizedError' || /jwt/i.test(error.message)
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      const err = new Error('Missing authorization header')
      ;(err as any).statusCode = 401
      throw err
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { userId, companyId } = verifyJwt(token)

    switch (event.httpMethod) {
      case 'POST':
        return await uploadFile(event, userId, companyId)
      case 'GET':
        return await listFiles(event, companyId)
      case 'DELETE':
        return await deleteFile(event, companyId)
      default:
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
    }
  } catch (error: any) {
    const statusCode = error.statusCode || (isAuthError(error) ? 401 : 400)
    const message = error.message || 'Error'
    return { statusCode, body: JSON.stringify({ error: message }) }
  }
}

async function uploadFile(
  event: HandlerEvent,
  userId: string,
  companyId: string
) {
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No body provided' }) }
  }
  let payload: { fileName: string; fileType: string; fileData: string }
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const { fileName, fileType, fileData } = payload
  if (!fileName || !fileType || !fileData) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing file data' }) }
  }
  if (!FILENAME_REGEX.test(fileName)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid file name' }) }
  }
  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid file type' }) }
  }
  let buffer: Buffer
  try {
    buffer = Buffer.from(fileData, 'base64')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'File data is not valid base64' }) }
  }
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return { statusCode: 413, body: JSON.stringify({ error: 'File size exceeds limit' }) }
  }
  try {
    const result = await sql`
      INSERT INTO files (company_id, user_id, file_name, file_type, file_data)
      VALUES (${companyId}, ${userId}, ${fileName}, ${fileType}, ${buffer})
      RETURNING id, file_name AS fileName, file_type AS fileType, octet_length(file_data) AS fileSize, created_at AS createdAt
    `
    const file = result[0]
    return { statusCode: 201, body: JSON.stringify({ file }) }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', detail: err.message })
    }
  }
}

async function listFiles(event: HandlerEvent, companyId: string) {
  const params = event.queryStringParameters || {}
  const limit = Math.min(Math.max(parseInt(params.limit || '50', 10) || 50, 1), 100)
  const offset = Math.max(parseInt(params.offset || '0', 10) || 0, 0)
  try {
    const result = await sql`
      SELECT id, file_name AS fileName, file_type AS fileType, octet_length(file_data) AS fileSize, created_at AS createdAt
      FROM files
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return { statusCode: 200, body: JSON.stringify({ files: result, limit, offset }) }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', detail: err.message })
    }
  }
}

async function deleteFile(event: HandlerEvent, companyId: string) {
  const fileId = event.queryStringParameters?.id
  if (!fileId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing file id' }) }
  }
  try {
    const result = await sql`
      DELETE FROM files
      WHERE id = ${fileId} AND company_id = ${companyId}
      RETURNING id
    `
    if (result.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) }
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, id: result[0].id }) }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', detail: err.message })
    }
  }
}
export const authMiddleware = (handler: Handler): Handler => {
  return async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    const authHeader = event.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const token = authHeader.slice(7).trim()
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET not configured')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      }
    }

    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload & {
        userId: string
        companyId: string
        roles: string[]
      }

      const { userId, companyId, roles } = decoded
      if (!userId || !companyId || !Array.isArray(roles)) {
        throw new Error('Invalid token payload')
      }

      context.user = { userId, companyId, roles }
      return handler(event, context)
    } catch (err: any) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
      return {
        statusCode: 401,
        body: JSON.stringify({ error: message }),
      }
    }
  }
}
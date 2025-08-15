const DURATION_REGEX = /^\d+(ms|s|m|h|d|w|y)$/

let _config: Config | null = null

export function loadConfig(): Config {
  if (_config) {
    return _config
  }

  const {
    NODE_ENV = 'development',
    PORT = '3000',
    DATABASE_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN = '1h',
    CLIENT_ORIGIN
  } = process.env

  const required = [
    { key: 'DATABASE_URL', value: DATABASE_URL },
    { key: 'JWT_SECRET', value: JWT_SECRET }
  ].filter(item => !item.value?.trim())

  if (required.length) {
    const keys = required.map(r => r.key).join(', ')
    throw new Error(`Missing required environment variables: ${keys}`)
  }

  if (!/^\d+$/.test(PORT)) {
    throw new Error(`Invalid PORT format, must be a positive integer: ${PORT}`)
  }
  const port = parseInt(PORT, 10)
  if (port <= 0) {
    throw new Error(`Invalid value for PORT, must be > 0: ${PORT}`)
  }

  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${NODE_ENV}`)
  }

  if (!DURATION_REGEX.test(JWT_EXPIRES_IN)) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN format: ${JWT_EXPIRES_IN}. Expected format like "1h", "30m", "15d", etc.`
    )
  }

  _config = {
    nodeEnv: NODE_ENV as Config['nodeEnv'],
    port,
    databaseUrl: DATABASE_URL as string,
    jwtSecret: JWT_SECRET as string,
    jwtExpiresIn: JWT_EXPIRES_IN,
    clientOrigin: CLIENT_ORIGIN?.trim() ? CLIENT_ORIGIN : undefined
  }

  return _config
}

export function getConfig(): Config {
  return _config || loadConfig()
}
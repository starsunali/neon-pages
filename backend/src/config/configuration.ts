export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  qrStorageDir: process.env.QR_STORAGE_DIR ?? 'uploads/qr',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'https://localhost',
  throttler: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX_LOGIN_ATTEMPTS ?? '5', 10),
  },
  lock: {
    threshold: parseInt(process.env.ACCOUNT_LOCK_THRESHOLD ?? '5', 10),
    minutes: parseInt(process.env.ACCOUNT_LOCK_MINUTES ?? '15', 10),
  },
});
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL!,
  database: {
    url: process.env.DATABASE_URL!,
    prismaUrl: process.env.PRISMA_DATABASE_URL!,
  },
  upstash: {
    redisUrl: process.env.UPSTASH_REDIS_REST_URL!,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
    qstashToken: process.env.QSTASH_TOKEN!,
    qstashCurrentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    qstashNextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL,
    fromName: process.env.BREVO_FROM_NAME || 'School SaaS',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  storage: {
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION,
  },
  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    cnameTarget: process.env.CLOUDFLARE_CNAME_TARGET,
  },
  payments: {
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
    },
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  },
};

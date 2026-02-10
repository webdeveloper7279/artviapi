/**
 * CORS configuration for production deployment.
 * Reads allowed origins from CORS_ORIGINS env (comma-separated).
 */
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

export const corsOptions = {
  origin: ['https://artvia2.vercel.app/'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

export default corsOptions;



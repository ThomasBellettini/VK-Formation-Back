import { config } from "dotenv";
config();

export default {
  ADMIN: {
    JWT_SECRET: process.env.ADMIN_JWT_SECRET || "",
  },
  ENCRYPTION: {
    ENCRYPTION_KEY: process.env.MONGODB_ENCRYPTION_KEY,
    SIGNING_KEY: process.env.MONGODB_SIGNING_KEY,
  },
  BREVO: {
    API_KEY: process.env.BREVO_API_KEY,
  },
  EMAIL: {
    ADMIN: process.env.EMAIL_ADMIN,
  },
};

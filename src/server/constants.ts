import { config } from "dotenv";
import * as process from "node:process";
config();

export default {
  ADMIN: {
    JWT_SECRET: process.env.ADMIN_JWT_SECRET || "",
    API_KEY: process.env.API_KEY || ""
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
  STORAGE: {
    BUNNY_STORAGE_NAME: process.env.BUNNY_STORAGE_NAME,
    BUNNY_ACCESS_KEY: process.env.BUNNY_ACCESS_KEY,
    BUNNY_CDN_URL: process.env.BUNNY_CDN_URL,
    BUNNY_SECURITY_KEY: process.env.BUNNY_SECURITY_KEY,
    TOKEN_EXPIRATION: process.env.TOKEN_EXPIRATION,
  },
  DISCORD: {
    MODULE: process.env.DISCORD_MODULE_URL
  }
};

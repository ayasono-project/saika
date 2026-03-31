// Prisma 7 Configuration
// https://pris.ly/d/prisma7-client-config

import "dotenv/config";

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

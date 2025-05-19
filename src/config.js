import dotenv from 'dotenv';
dotenv.config();

export default {
  PORT: process.env.PORT || 5000,
  WEBAPP_URL: process.env.WEBAPP_URL,
  DISCORD: {
    TOKEN: process.env.DISCORD_TOKEN,
    PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY
  },
  GOOGLE: {
    CREDENTIALS: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    SHEET_IDS: {
      ACE: process.env.SHEET_ID_ACE,
      DUYET_DON: process.env.SHEET_ID_DUYET_DON
    }
  }
};

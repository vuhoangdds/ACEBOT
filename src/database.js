// nếu cần nhiều DB: GoogleSheets, Mongo, Postgres...
import { google } from 'googleapis';
import config from './config.js';

// GoogleAuth chung
const auth = new google.auth.GoogleAuth({
  credentials: config.GOOGLE.CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets('v4');

export default {
  sheets,
  auth,
  // ex: mongoClient, pgClient…
};

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// open database
export const db = await open({
  filename: './database.sqlite',
  driver: sqlite3.Database
});

// create table if not exists
await db.exec(`
  CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId TEXT UNIQUE,
    amount REAL,
    phoneNumber TEXT,
    currency TEXT,
    provider TEXT,
    providerRef TEXT,
    status TEXT
)
`);
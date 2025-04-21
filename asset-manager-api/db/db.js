import Database from 'better-sqlite3'
import fs from 'fs'

// DB 파일이 없으면 새로 생성됨
const db = new Database('./data.db')

// 자산 테이블 생성
const createTable = `
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`

db.exec(createTable)

export default db

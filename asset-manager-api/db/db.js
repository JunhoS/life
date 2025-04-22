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


// 📌 assets_master 테이블
db.exec(`
  CREATE TABLE IF NOT EXISTS assets_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    symbol TEXT,
    description TEXT,
    country TEXT,
    sector TEXT,
    listed INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `)
  
  // 📌 financial_data 테이블
  db.exec(`
  CREATE TABLE IF NOT EXISTS financial_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    quarter TEXT CHECK(quarter IN ('Q1','Q2','Q3','Q4','H1','Y')) NOT NULL,
    report_type TEXT CHECK(report_type IN ('quarterly', 'half', 'annual')) NOT NULL,
    item_code TEXT NOT NULL,
    amount REAL,
    currency TEXT DEFAULT 'KRW',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
    FOREIGN KEY (asset_id) REFERENCES assets_master(id),
    UNIQUE(asset_id, year, quarter, item_code)
  );
  `)

  // 🧱 my_portfolio: 내가 선택한 자산 목록과 목표 비중
db.exec(`
  CREATE TABLE IF NOT EXISTS my_portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    target_ratio REAL NOT NULL,
    latest_price REAL,
    quantity REAL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
    FOREIGN KEY (asset_id) REFERENCES assets_master(id),
    UNIQUE(asset_id)
  );
  `)
  
  // 💰 wallet: 자금 및 투자 전략 관리
  db.exec(`
  CREATE TABLE IF NOT EXISTS wallet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_cash REAL DEFAULT 0,
    monthly_invest_amount REAL DEFAULT 0,
  
    invest_cycle_type TEXT CHECK(invest_cycle_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom_days')),
    invest_cycle_value INTEGER,
  
    rebalance_cycle TEXT CHECK(rebalance_cycle IN ('monthly', 'quarterly', 'annually', 'custom_days')),
    rebalance_cycle_value INTEGER,
  
    rebalance_threshold REAL DEFAULT 5,
    last_rebalance_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `)

export default db



import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, '..', 'data.db'))

// 성능 최적화
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── 기업 기본 정보 ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    corp_code     TEXT UNIQUE NOT NULL,
    corp_name     TEXT NOT NULL,
    stock_code    TEXT,
    corp_cls      TEXT CHECK(corp_cls IN ('Y', 'K', 'N', 'E')),
    sector        TEXT,
    ceo_name      TEXT,
    established   TEXT,
    updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_companies_stock_code ON companies(stock_code);
  CREATE INDEX IF NOT EXISTS idx_companies_corp_cls ON companies(corp_cls);
  CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
`)

// ── 계정과목 표준 매핑 ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS account_mapping (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    standard_code TEXT NOT NULL,
    standard_name TEXT NOT NULL,
    dart_account  TEXT NOT NULL,
    UNIQUE(standard_code, dart_account)
  );

  CREATE TABLE IF NOT EXISTS unmapped_accounts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    dart_account     TEXT NOT NULL UNIQUE,
    occurrence_count INTEGER DEFAULT 1,
    sample_corp      TEXT,
    created_at       TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

// ── 재무제표 ─────────────────────────────────────────────────────────
// amount: 원 단위 정수. SQLite INTEGER는 64비트이므로 수십조까지 안전하게 저장 가능.
// 단, better-sqlite3가 JS Number로 변환할 때 53비트 초과 시 정밀도 손실 발생.
// 따라서 응답 시 TEXT로 직렬화한다.
db.exec(`
  CREATE TABLE IF NOT EXISTS financials (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    corp_code     TEXT NOT NULL,
    fiscal_year   INTEGER NOT NULL,
    report_code   TEXT NOT NULL,
    account_name  TEXT NOT NULL,
    standard_code TEXT,
    amount        INTEGER,
    currency      TEXT DEFAULT 'KRW',
    fs_div        TEXT CHECK(fs_div IN ('CFS', 'OFS')),
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corp_code) REFERENCES companies(corp_code),
    UNIQUE(corp_code, fiscal_year, report_code, account_name, fs_div)
  );
  CREATE INDEX IF NOT EXISTS idx_financials_corp_year ON financials(corp_code, fiscal_year);
  CREATE INDEX IF NOT EXISTS idx_financials_standard_code ON financials(standard_code);
`)

// ── 감사의견 ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_opinions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    corp_code       TEXT NOT NULL,
    fiscal_year     INTEGER NOT NULL,
    auditor_name    TEXT,
    opinion_type    TEXT CHECK(opinion_type IN ('적정', '한정', '부적정', '의견거절')),
    opinion_text    TEXT,
    emphasis_text   TEXT,
    going_concern   INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corp_code) REFERENCES companies(corp_code),
    UNIQUE(corp_code, fiscal_year)
  );
  CREATE INDEX IF NOT EXISTS idx_audit_opinion_type ON audit_opinions(opinion_type, fiscal_year);
  CREATE INDEX IF NOT EXISTS idx_audit_going_concern ON audit_opinions(going_concern);
`)

// ── 수집 진행 상태 (이어받기 + 일일 할당량 관리) ──────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS collection_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type       TEXT NOT NULL,
    fiscal_year     INTEGER,
    total_corps     INTEGER NOT NULL,
    processed_corps INTEGER DEFAULT 0,
    last_corp_code  TEXT,
    status          TEXT DEFAULT 'running' CHECK(status IN ('running', 'paused', 'done', 'failed')),
    api_calls_today INTEGER DEFAULT 0,
    started_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collection_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type   TEXT NOT NULL,
    corp_code   TEXT,
    status      TEXT NOT NULL CHECK(status IN ('success', 'fail', 'skip')),
    error_msg   TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

export default db

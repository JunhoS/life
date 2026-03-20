import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditAlerts, opinionBadge, clsBadge } from '../api/screenerApi'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 - i)

export default function AuditAlertsPage() {
  const navigate = useNavigate()
  const [year, setYear]     = useState(CURRENT_YEAR - 1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage]     = useState(1)

  useEffect(() => {
    setLoading(true)
    getAuditAlerts({ fiscal_year: year, page, limit: 50 })
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, page])

  const handleYearChange = (e) => {
    setYear(Number(e.target.value))
    setPage(1)
  }

  const totalPages = result ? Math.ceil(result.total / result.limit) : 0

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>감사의견 알림</div>
        <div className="form-group">
          <label>기준 연도</label>
          <select value={year} onChange={handleYearChange}>
            {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
      </div>

      {/* 요약 */}
      {result && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-box">
            <div className="stat-label">비적정 · 계속기업 불확실성 종목</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{result.total.toLocaleString()}개</div>
          </div>
        </div>
      )}

      <div className="card">
        {loading && <div className="spinner">불러오는 중...</div>}
        {!loading && result && result.data.length === 0 && (
          <div className="empty">{year}년 알림 대상 종목이 없습니다.</div>
        )}
        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>종목코드</th>
                    <th>기업명</th>
                    <th>시장</th>
                    <th>감사의견</th>
                    <th>계속기업 불확실성</th>
                    <th>감사인</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row) => {
                    const opinion = opinionBadge(row.opinion_type)
                    const market  = clsBadge(row.corp_cls)
                    return (
                      <tr key={row.corp_code} onClick={() => navigate(`/companies/${row.corp_code}`)}>
                        <td style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{row.stock_code || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{row.corp_name}</td>
                        <td><span className={`badge ${market.cls}`}>{market.label}</span></td>
                        <td><span className={`badge ${opinion.cls}`}>{opinion.label}</span></td>
                        <td>
                          {row.going_concern
                            ? <span className="badge badge-yellow">있음</span>
                            : <span className="badge badge-gray">없음</span>}
                        </td>
                        <td className="text-muted">{row.auditor_name || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>이전</button>
                <span className="text-muted" style={{ fontSize: 12 }}>{page} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>다음</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

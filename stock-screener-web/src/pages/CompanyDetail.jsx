import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCompany, getFinancialSummary, getAudit,
  opinionBadge, clsBadge,
} from '../api/screenerApi'
import FinancialSummary from '../components/FinancialSummary'

export default function CompanyDetail() {
  const { corpCode } = useParams()
  const navigate = useNavigate()
  const [company, setCompany]   = useState(null)
  const [financials, setFinancials] = useState([])
  const [audits, setAudits]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [fsDiv, setFsDiv]       = useState('CFS')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCompany(corpCode),
      getFinancialSummary(corpCode, { fs_div: fsDiv }),
      getAudit(corpCode),
    ])
      .then(([c, f, a]) => {
        setCompany(c)
        setFinancials(f)
        setAudits(a)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [corpCode, fsDiv])

  if (loading) return <div className="spinner">불러오는 중...</div>
  if (error)   return <div className="page"><div className="empty" style={{ color: 'var(--danger)' }}>오류: {error}</div></div>
  if (!company) return null

  const market = clsBadge(company.corp_cls)

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← 뒤로</button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{company.corp_name}</h2>
            <span className={`badge ${market.cls}`}>{market.label}</span>
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {company.stock_code && <span style={{ fontFamily: 'monospace', marginRight: 12 }}>{company.stock_code}</span>}
            {company.sector && <span>{company.sector}</span>}
            {company.ceo_name && <span style={{ marginLeft: 12 }}>대표: {company.ceo_name}</span>}
            {company.established && <span style={{ marginLeft: 12 }}>설립: {company.established}</span>}
          </div>
        </div>
      </div>

      {/* 재무제표 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>재무 요약</div>
          <select
            value={fsDiv}
            onChange={(e) => setFsDiv(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', minWidth: 'auto' }}
          >
            <option value="CFS">연결</option>
            <option value="OFS">개별</option>
          </select>
        </div>
        <FinancialSummary rows={financials} />
      </div>

      {/* 감사의견 이력 */}
      <div className="card mt-24">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>감사의견 이력</div>
        {audits.length === 0 ? (
          <div className="empty">감사의견 데이터가 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>사업연도</th>
                  <th>감사인</th>
                  <th>감사의견</th>
                  <th>계속기업 불확실성</th>
                  <th>강조사항/핵심감사사항</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => {
                  const opinion = opinionBadge(a.opinion_type)
                  return (
                    <tr key={a.fiscal_year} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600 }}>{a.fiscal_year}년</td>
                      <td className="text-muted">{a.auditor_name || '-'}</td>
                      <td><span className={`badge ${opinion.cls}`}>{opinion.label}</span></td>
                      <td>
                        {a.going_concern
                          ? <span className="badge badge-yellow">있음</span>
                          : <span className="badge badge-gray">없음</span>}
                      </td>
                      <td className="text-muted" style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.emphasis_text || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

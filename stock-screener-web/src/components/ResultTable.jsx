import { useNavigate } from 'react-router-dom'
import { formatAmount, opinionBadge, clsBadge } from '../api/screenerApi'

export default function ResultTable({ result, onPageChange }) {
  const navigate = useNavigate()

  if (!result) return null

  const { data = [], total, page, limit, fiscal_year } = result

  if (data.length === 0) {
    return <div className="empty">조건에 맞는 종목이 없습니다.</div>
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="text-muted" style={{ fontSize: 13 }}>
          총 <strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong>건 · {fiscal_year}년 기준
        </span>
        <span className="text-muted" style={{ fontSize: 12 }}>{page} / {totalPages} 페이지</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>종목코드</th>
              <th>기업명</th>
              <th>시장</th>
              <th>업종</th>
              <th>감사의견</th>
              <th>계속기업</th>
              <th className="text-right">매출액</th>
              <th className="text-right">영업이익률</th>
              <th className="text-right">부채비율</th>
              <th className="text-right">매출성장률</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const opinion = opinionBadge(row.opinion_type)
              const market = clsBadge(row.corp_cls)
              return (
                <tr key={row.corp_code} onClick={() => navigate(`/companies/${row.corp_code}`)}>
                  <td style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{row.stock_code || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{row.corp_name}</td>
                  <td><span className={`badge ${market.cls}`}>{market.label}</span></td>
                  <td className="text-muted">{row.sector || '-'}</td>
                  <td><span className={`badge ${opinion.cls}`}>{opinion.label}</span></td>
                  <td>
                    {row.going_concern === 1
                      ? <span className="badge badge-yellow">있음</span>
                      : <span className="badge badge-gray">없음</span>}
                  </td>
                  <td className="text-right">{formatAmount(row.revenue)}</td>
                  <td className="text-right">
                    {row.op_margin !== null ? `${row.op_margin}%` : '-'}
                  </td>
                  <td className="text-right">
                    {row.debt_ratio !== null ? `${row.debt_ratio}%` : '-'}
                  </td>
                  <td className="text-right">
                    {row.revenue_growth !== null
                      ? <span style={{ color: row.revenue_growth >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {row.revenue_growth >= 0 ? '+' : ''}{row.revenue_growth}%
                        </span>
                      : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
            return (
              <button
                key={p}
                className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          })}
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            다음
          </button>
        </div>
      )}
    </>
  )
}

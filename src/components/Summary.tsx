import { formatKRW, type summarize } from '../calc'

interface Props {
  summary: ReturnType<typeof summarize>
}

export default function Summary({ summary }: Props) {
  return (
    <section className="summary">
      <div className="stats">
        <div className="stat highlight">
          <span>월 합계</span>
          <strong>{formatKRW(summary.monthly)}</strong>
        </div>
        <div className="stat">
          <span>연 합계</span>
          <strong>{formatKRW(summary.yearly)}</strong>
        </div>
        <div className="stat">
          <span>하루 기준</span>
          <strong>{formatKRW(summary.daily)}</strong>
        </div>
        <div className="stat">
          <span>사용 중</span>
          <strong>{summary.activeCount}개</strong>
        </div>
      </div>

      {summary.categories.length > 0 && (
        <div className="card">
          <h2>카테고리별 월 지출</h2>
          <ul className="bars">
            {summary.categories.map((c) => (
              <li key={c.category}>
                <div className="bar-label">
                  <span>{c.category}</span>
                  <span>
                    {formatKRW(c.monthly)} · {Math.round(c.ratio * 100)}%
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(c.ratio * 100, 2)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

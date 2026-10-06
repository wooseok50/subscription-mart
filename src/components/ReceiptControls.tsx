import type { CSSProperties } from 'react'
import type { ReceiptMode } from '../calc'
import { THEME_IDS, THEMES } from '../themes'
import type { ThemeId } from '../types'

interface Props {
  theme: ThemeId
  mode: ReceiptMode
  cutCount: number
  onTheme: (id: ThemeId) => void
  onMode: (mode: ReceiptMode) => void
  onClearCuts?: () => void
}

export default function ReceiptControls({ theme, mode, cutCount, onTheme, onMode, onClearCuts }: Props) {
  return (
    <div className="r-controls no-print">
      <div className="seg" role="radiogroup" aria-label="영수증 기간">
        {(
          [
            ['year', '앞으로 1년'],
            ['life', '지금까지'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => onMode(m)}>
            {label}
          </button>
        ))}
      </div>

      <div className="theme-pick" role="radiogroup" aria-label="영수증 종류">
        {THEME_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            className={theme === id ? 'on' : ''}
            onClick={() => onTheme(id)}
            style={{ '--swatch': THEMES[id].paper, '--swatch-ink': THEMES[id].accent } as CSSProperties}
          >
            {THEMES[id].label}
          </button>
        ))}
      </div>

      {mode === 'year' && onClearCuts && (
        <p className="cut-hint hand">
          {cutCount > 0 ? (
            <>
              ✂ {cutCount}개 해지해 보는 중{' '}
              <button type="button" className="link" onClick={onClearCuts}>
                원래대로
              </button>
            </>
          ) : (
            '✂ 를 누르면 해지했을 때 합계를 미리 볼 수 있어요'
          )}
        </p>
      )}
    </div>
  )
}

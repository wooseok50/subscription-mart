import { useEffect, useRef, useState } from 'react'
import { renderWrapPng } from '../render/wrapCanvas'
import { downloadBlob, shareImage, type ShareResult } from '../share'
import type { WrapStats } from '../wrap'

interface Props {
  stats: WrapStats
  shareText: string
  onClose: () => void
  onResult: (r: ShareResult) => void
}

export default function WrapCardModal({ stats, shareText, onClose, onResult }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    renderWrapPng(stats, location.host)
      .then((b) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
      })
      .catch(() => setError(true))
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [stats])

  const [filename] = useState(() => `subscription-wrapped-${new Date().toISOString().slice(0, 10)}.png`)

  return (
    <dialog ref={dialogRef} className="wrap-modal" onClose={onClose} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
      <div className="wrap-inner">
        <h2 className="hand">나의 구독 결산 카드</h2>
        <div className="wrap-preview">
          {url ? <img src={url} alt={`구독 결산 카드: 1년 합계와 별명 ${stats.nickname}`} /> : <p>{error ? '카드를 만들지 못했어요.' : '카드 인쇄 중…'}</p>}
        </div>
        <div className="wrap-actions">
          <button type="button" className="btn ghost" onClick={() => dialogRef.current?.close()}>
            닫기
          </button>
          <button type="button" className="btn ghost" disabled={!blob} onClick={() => {
              if (!blob) return
              downloadBlob(blob, filename)
              onResult('downloaded')
            }}>
            저장
          </button>
          <button type="button" className="btn stamp" disabled={!blob} onClick={async () => blob && onResult(await shareImage(blob, filename, shareText))}>
            공유하기
          </button>
        </div>
      </div>
    </dialog>
  )
}

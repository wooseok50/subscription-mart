import { Component, type ReactNode } from 'react'
import { STORAGE_KEY } from '../storage'

interface State {
  failed: boolean
}

/** 저장 데이터 이상 등으로 렌더링 실패 시 빈 화면 대신 복구 수단 제공 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  private backup = () => {
    let raw = ''
    try {
      raw = localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      // 저장소 접근 불가 시 빈 백업
    }
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscription-receipt-recovery.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  private reset = () => {
    if (!confirm('저장된 영수증을 지우고 새로 시작할까요? 먼저 백업을 받아두는 걸 권해요.')) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 무시
    }
    location.replace(location.pathname)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page">
        <section className="crash">
          <p className="eyebrow">구독상회 · 잠시 문 닫음</p>
          <h1>영수증 프린터에 종이가 걸렸어요.</h1>
          <p className="lede">저장된 내용을 읽다가 문제가 생겼어요. 백업을 받아둔 뒤 새로 시작할 수 있어요.</p>
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={() => location.replace(location.pathname)}>
              다시 열기
            </button>
            <button type="button" className="btn ghost" onClick={this.backup}>
              백업 받기
            </button>
            <button type="button" className="btn ghost danger" onClick={this.reset}>
              초기화
            </button>
          </div>
        </section>
      </div>
    )
  }
}

import React from 'react'

type BoundaryState = { error: Error | null }

export class ExperienceBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState { return { error } }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Agaram page rendering failed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <div className="abm-experience-screen">
      <div className="abm-experience-orb abm-experience-orb-a" />
      <div className="abm-experience-orb abm-experience-orb-b" />
      <section className="abm-experience-card" role="alert">
        <div className="abm-experience-mark">A</div>
        <span className="abm-experience-eyebrow">AGARAM BUSINESS MART</span>
        <h1>We hit a small snag.</h1>
        <p>Your store is safe. Refresh the page and we’ll reconnect you to the experience.</p>
        <button className="abm-experience-primary" onClick={() => window.location.reload()}>Refresh the store <span>↗</span></button>
        <small>Reference saved in your browser console for support.</small>
      </section>
    </div>
  }
}

export function ConnectionExperience({ mode, retry, browseOffline }: { mode: 'loading' | 'offline'; retry: () => void; browseOffline: () => void }) {
  return <main className="abm-experience-screen" aria-live="polite">
    <div className="abm-experience-orb abm-experience-orb-a" />
    <div className="abm-experience-orb abm-experience-orb-b" />
    <section className="abm-experience-card">
      <div className={`abm-experience-mark ${mode === 'loading' ? 'abm-experience-mark-loading' : ''}`}>A</div>
      <span className="abm-experience-eyebrow">AGARAM BUSINESS MART</span>
      {mode === 'loading' ? <>
        <h1>Setting your store in motion</h1>
        <p>Warming up the shelves, your account and live order updates.</p>
        <div className="abm-experience-progress"><span /></div>
        <small>Secure connection · just a moment</small>
      </> : <>
        <div className="abm-experience-status"><span /> Connection paused</div>
        <h1>Your store is taking a breather.</h1>
        <p>We couldn’t reach Agaram right now. Check your internet, then reconnect to orders and account updates.</p>
        <button className="abm-experience-primary" onClick={retry}>Try connecting again <span>↻</span></button>
        <button className="abm-experience-secondary" onClick={browseOffline}>Browse saved storefront</button>
        <small>Your cart stays on this device.</small>
      </>}
    </section>
  </main>
}

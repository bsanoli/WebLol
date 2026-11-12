import { Button } from "@/components/ui/button"
import { useEffect, useId, useRef, useState } from "react"

export interface ChampionSummary {
  name: string
  picks: number
  wins: number
  bans: number
  portrait?: string
}
export interface PlayerSummary {
  name: string
  team: string
  lane: string
  n: number
  w: number
  k: number
  d: number
  a: number
}
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
const percent = (value: number) => `${Math.round(value * 100)}%`

export function MetricCard({ label, value, note, portrait }: {
  label: string; value: string | number; note: string; portrait?: string
}) {
  return <div className="metric-card">
    <span>{label}</span>
    <strong className={portrait ? "metric-champion" : undefined}>
      {portrait && <img src={portrait} alt="" width={28} height={28} />}
      {value}
    </strong>
    <small>{note}</small>
  </div>
}

type RankedChampion = ChampionSummary & { segments: { label: string; kind: string; count: number }[]; rate: number }

function RankedBarTrack({ segments, games }: Pick<RankedChampion, "segments"> & { games: number }) {
  const track = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = track.current
    const viewport = element?.ownerDocument.defaultView
    if (!element || !viewport) return
    const observer = new viewport.IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      setVisible(true)
      observer.disconnect()
    }, { threshold: 0.15 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <span className="chart-track" ref={track} data-bar-visible={visible} aria-hidden="true">
    <span className="chart-fill">{segments.map(({ kind, count }) =>
      <i key={kind} className={`series-${kind}`} style={{ width: `${count / games * 100}%` }} />)}</span>
  </span>
}

function RankedBars({ title, description, rows, games }: {
  title: string; description: string; rows: RankedChampion[]; games: number
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const limit = Math.min(rows.length, 15)
  return <section className="wl-panel analytics-panel champion-ranking" aria-labelledby={`${id}-title`}>
    <div className="analytics-heading"><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
    <ol className="ranked-bars" id={`${id}-list`}>
      {rows.slice(0, expanded ? limit : 8).map(({ name, portrait, segments, rate }, index) =>
        <li key={name} data-series={segments.length}>
          <span className="chart-rank" aria-hidden="true">{index + 1}</span>
          <span className="chart-name">{portrait && <img src={portrait} alt="" loading="lazy" />}<b>{name}</b></span>
          <RankedBarTrack segments={segments} games={games} />
          <span className="ranking-counts">{segments.map(({ kind, count, label }) =>
            <span key={kind}><i className={`series-${kind}`} aria-hidden="true" />{count} {label}</span>)}</span>
          <strong className="chart-value">{percent(rate)}</strong>
        </li>
      )}
    </ol>
    <div className="chart-footer"><span>{games} jogos no total</span>{limit > 8 &&
      <Button variant="outline" size="sm" aria-controls={`${id}-list`} aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}>{expanded ? "Mostrar 8" : `Mostrar ${limit}`}</Button>}</div>
  </section>
}

export function TournamentOverview({ champions, games, showSummary = true }: {
  champions: ChampionSummary[]; games: number; showSummary?: boolean
}) {
  if (!champions.length || games <= 0) return <div className="empty-state" role="status">Ainda não há jogos disponíveis para esta análise.</div>
  const picks = [...champions].sort((a, b) => b.picks - a.picks || b.wins - a.wins).slice(0, 15)
  const bans = [...champions].sort((a, b) => b.bans - a.bans || b.picks - a.picks).slice(0, 15)
  const presence = [...champions].sort((a, b) => b.picks + b.bans - a.picks - a.bans).slice(0, 15)
  return <div className="analytics-dashboard">
    <div className={showSummary ? "draft-overview" : undefined}>
      {showSummary && <section className="wl-panel draft-summary" aria-labelledby="draft-summary-title">
        <h2 id="draft-summary-title">Resumo do torneio</h2>
        <div className="metric-grid">
          <MetricCard label="Jogos analisados" value={games} note="Play-In até as semifinais" />
          <MetricCard label="Campeões no draft" value={champions.length} note="Escolhidos ou banidos" />
          <MetricCard label="Mais escolhido" value={picks[0].name} portrait={picks[0].portrait} note={`${picks[0].picks} jogos · ${percent(picks[0].wins / picks[0].picks)} de vitórias`} />
          <MetricCard label="Mais banido" value={bans[0].name} portrait={bans[0].portrait} note={`${bans[0].bans} bans · ${percent(bans[0].bans / games)} dos jogos`} />
        </div>
      </section>}
      <RankedBars title="Prioridade no draft" description="Percentual de jogos em que cada campeão foi escolhido ou banido."
        games={games} rows={presence.map(c => ({ ...c, rate: (c.picks + c.bans) / games,
          segments: [{ label: "picks", kind: "pick", count: c.picks }, { label: "bans", kind: "ban", count: c.bans }] }))} />
    </div>
    <div className="analytics-columns">
      <RankedBars title="Campeões mais escolhidos" description="Vitórias e derrotas nas partidas em que cada campeão foi escolhido. À direita, a taxa de vitória."
        games={games} rows={picks.map(c => ({ ...c, rate: c.picks ? c.wins / c.picks : 0,
          segments: [{ label: "vitórias", kind: "win", count: c.wins }, { label: "derrotas", kind: "loss", count: c.picks - c.wins }] }))} />
      <RankedBars title="Campeões mais banidos" description="Total de bans e percentual de jogos em que cada campeão foi banido."
        games={games} rows={bans.map(c => ({ ...c, rate: c.bans / games,
          segments: [{ label: "bans", kind: "ban", count: c.bans }] }))} />
    </div>
  </div>
}

export function PlayerComparison({ players }: { players: PlayerSummary[] }) {
  const [firstName, setFirst] = useState(players[0]?.name ?? "")
  const first = players.find(p => p.name === firstName) ?? players[0]
  const peers = players.filter(p => p.lane === first?.lane && p.name !== first?.name)
  const [secondName, setSecond] = useState("")
  const second = peers.find(p => p.name === secondName) ?? peers[0]
  if (!first || !second) return <div className="empty-state">A comparação precisa de dois jogadores da mesma posição com dados coletados.</div>
  const metrics = [
    { label: "Taxa de vitória", unit: "%", read: (p: PlayerSummary) => p.n ? p.w / p.n * 100 : 0, limit: 100 },
    { label: "KDA", unit: "", read: (p: PlayerSummary) => p.d ? (p.k + p.a) / p.d : p.k + p.a },
    { label: "Abates / jogo", unit: "", read: (p: PlayerSummary) => p.n ? p.k / p.n : 0 },
    { label: "Mortes / jogo", unit: "", read: (p: PlayerSummary) => p.n ? p.d / p.n : 0 },
    { label: "Assistências / jogo", unit: "", read: (p: PlayerSummary) => p.n ? p.a / p.n : 0 },
  ]
  return <section className="wl-panel analytics-panel player-comparison">
    <div className="analytics-heading"><h3>Comparar jogadores</h3><p>Mesma posição, apenas jogos coletados. As barras usam a mesma escala por métrica; não representam uma nota geral.</p></div>
    <div className="comparison-selectors">
      <label>Jogador A<select value={first.name} onChange={e => setFirst(e.target.value)}>{players.map(p => <option key={p.name} value={p.name}>{p.name} · {p.team} · {p.lane}</option>)}</select><small>{first.n} jogos · {first.w} vitórias · {first.n - first.w} derrotas</small></label>
      <label>Jogador B<select value={second.name} onChange={e => setSecond(e.target.value)}>{peers.map(p => <option key={p.name} value={p.name}>{p.name} · {p.team}</option>)}</select><small>{second.n} jogos · {second.w} vitórias · {second.n - second.w} derrotas</small></label>
    </div>
    <div className="comparison-metrics">{metrics.map(metric => {
      const values = [metric.read(first), metric.read(second)]
      const maximum = metric.limit ?? Math.max(...values, 1)
      return <div className="comparison-metric" key={metric.label}><h4>{metric.label}</h4>{[first, second].map((p, i) => <div className="comparison-row" key={p.name}>
        <span>{p.name}</span><span className="chart-track" aria-hidden="true"><i className={i ? "series-peer" : "series-pick"} style={{ width: `${values[i] / maximum * 100}%` }} /></span><strong>{number.format(values[i])}{metric.unit}</strong>
      </div>)}<small>Escala: 0–{number.format(maximum)}{metric.unit}{metric.label === "Mortes / jogo" ? " · Menor é melhor" : ""}</small></div>
    })}</div>
    <p className="sample-note">KDA = (abates + assistências) ÷ mortes. Sem mortes, usa a soma de abates e assistências. Jogos e campeões cobertos podem variar entre jogadores.</p>
  </section>
}

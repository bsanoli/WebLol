import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

export interface ChampionSummary {
  name: string
  picks: number
  wins: number
  bans: number
  portrait?: string
}
const percent = (value: number) => `${Math.round(value * 100)}%`

function MetricCard({ label, value, note, portrait }: {
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

function RankedBars({ title, description, rows, games, sharedExpansion }: {
  title: string; description: string; rows: RankedChampion[]; games: number
  sharedExpansion?: { expanded: boolean; listId: string }
}) {
  const [localExpanded, setLocalExpanded] = useState(false)
  const id = useId()
  const expanded = sharedExpansion?.expanded ?? localExpanded
  const listId = sharedExpansion?.listId ?? `${id}-list`
  const limit = Math.min(rows.length, 15)
  return <Card className="wl-panel analytics-panel champion-ranking" aria-labelledby={`${id}-title`}>
    <div className="analytics-heading"><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
    <ol className="ranked-bars" id={listId}>
      {rows.slice(0, expanded ? limit : 8).map(({ name, portrait, segments, rate }, index) =>
        <li key={name} data-series={segments.length}>
          <span className="chart-rank" aria-hidden="true">{index + 1}</span>
          <span className="chart-name">{portrait && <img src={portrait} alt="" loading="lazy" />}<b>{name}</b></span>
          <RankedBarTrack segments={segments} games={games} />
          <span className="ranking-counts">{segments.map(({ kind, count, label }) =>
            <span key={kind}><i className={`series-${kind}`} aria-hidden="true" />{count} {label}</span>)}</span>
          <TooltipProvider delayDuration={300}><Tooltip>
            <TooltipTrigger asChild><strong className="chart-value" tabIndex={0}>{percent(rate)}</strong></TooltipTrigger>
            <TooltipContent>{segments.map(segment => `${segment.count} ${segment.label}`).join(" · ")}</TooltipContent>
          </Tooltip></TooltipProvider>
        </li>
      )}
    </ol>
    <div className="chart-footer"><span>{games} jogos no total</span>{!sharedExpansion && limit > 8 &&
      <Button className="cursor-pointer" variant="outline" size="sm" aria-controls={listId} aria-expanded={expanded}
        onClick={() => setLocalExpanded(value => !value)}>
        {expanded ? "Mostrar menos" : "Mostrar mais campeões"}
        {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </Button>}</div>
  </Card>
}

export function TournamentOverview({ champions, games, showSummary = true }: {
  champions: ChampionSummary[]; games: number; showSummary?: boolean
}) {
  const [rankingsExpanded, setRankingsExpanded] = useState(false)
  const picksListId = useId()
  const bansListId = useId()
  if (!champions.length || games <= 0) return <Empty role="status"><EmptyHeader><EmptyDescription>Ainda não há jogos disponíveis para esta análise.</EmptyDescription></EmptyHeader></Empty>
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
        sharedExpansion={{ expanded: rankingsExpanded, listId: picksListId }}
        games={games} rows={picks.map(c => ({ ...c, rate: c.picks ? c.wins / c.picks : 0,
          segments: [{ label: "vitórias", kind: "win", count: c.wins }, { label: "derrotas", kind: "loss", count: c.picks - c.wins }] }))} />
      <RankedBars title="Campeões mais banidos" description="Total de bans e percentual de jogos em que cada campeão foi banido."
        sharedExpansion={{ expanded: rankingsExpanded, listId: bansListId }}
        games={games} rows={bans.map(c => ({ ...c, rate: c.bans / games,
          segments: [{ label: "bans", kind: "ban", count: c.bans }] }))} />
      {champions.length > 8 && <Button className="analytics-rankings-toggle" variant="outline" size="sm"
        aria-controls={`${picksListId} ${bansListId}`} aria-expanded={rankingsExpanded}
        onClick={() => setRankingsExpanded(expanded => !expanded)}>
        {rankingsExpanded ? "Mostrar menos" : "Mostrar mais campeões"}
        {rankingsExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </Button>}
    </div>
  </div>
}

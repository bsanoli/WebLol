import type { Wave } from "../model/battlefield"
import type { MapPoint } from "../model/faelights"

type MovingPieces = { pos: Record<string, MapPoint>; waves: Wave[] }

export function animatePieces(from: MovingPieces, to: MovingPieces, duration: number, active: () => boolean, update: (pieces: MovingPieces) => void) {
  const start = performance.now()
  const previousWaves = new Map(from.waves.map(wave => [wave.lane, wave]))
  return new Promise<boolean>(resolve => {
    function frame(now: number) {
      if (!active()) { resolve(false); return }
      const t = Math.max(0, Math.min(1, (now - start) / duration))
      const progress = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const pos = Object.fromEntries(Object.entries(to.pos).map(([id, end]) => {
        const origin = from.pos[id] ?? end
        return [id, [origin[0] + (end[0] - origin[0]) * progress, origin[1] + (end[1] - origin[1]) * progress] as MapPoint]
      }))
      const waves = to.waves.map(wave => {
        const previous = previousWaves.get(wave.lane)
        return previous
          ? { ...wave, progress: previous.progress + (wave.progress - previous.progress) * progress }
          : wave
      })
      update({ pos, waves })
      if (t < 1) requestAnimationFrame(frame)
      else resolve(true)
    }
    requestAnimationFrame(frame)
  })
}

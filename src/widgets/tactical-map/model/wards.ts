import { faelights, type MapPoint, type MapStyle } from "./faelights"
import { isSide, type Side } from "./battlefield"

// perceptionBubbleRadius em sightward, visionward e bluetrinket (dados do jogo 16.22).
export const wardTypes = [
  { id: "stealth", label: "Sentinela Invisível", sight: 900 },
  { id: "control", label: "Sentinela de Controle", sight: 900 },
  { id: "farsight", label: "Alteração Vidente", sight: 500 },
] as const

type WardType = typeof wardTypes[number]["id"]
export type Ward = { point: MapPoint; type?: WardType; faelightId?: string; side?: Side }

export function getWardType(id: unknown) {
  return wardTypes.find(type => type.id === id) ?? wardTypes[0]
}

export type WardScene = { style: MapStyle; additionalFaelights: boolean }

const faelightsById = new Map(faelights.map(spot => [spot.id, spot]))

export function readWards(value: unknown): Ward[] {
  if (!Array.isArray(value)) return []
  return value.filter((ward): ward is Ward => (
    Array.isArray(ward?.point) && ward.point.length === 2 &&
    ward.point.every((axis: unknown) => typeof axis === "number" && axis >= 0 && axis <= 100)
  ))
}

export function wardOnMap(ward: Ward, scene: WardScene) {
  const spot = ward.faelightId ? faelightsById.get(ward.faelightId) : undefined
  const faelight = spot && (!spot.additional || scene.additionalFaelights) ? spot : undefined
  const type = getWardType(ward.type)
  return {
    point: spot?.[scene.style] ?? ward.point,
    faelight,
    type,
    side: isSide(ward.side) ? ward.side : undefined,
    sight: type.sight * (faelight ? 1.25 : 1),
  }
}

function nearestIndex(target: MapPoint, points: readonly MapPoint[], radius: number) {
  let index = -1
  points.forEach(([x, y], candidate) => {
    const distance = Math.hypot(x - target[0], y - target[1])
    if (distance > radius) return
    radius = distance
    index = candidate
  })
  return index
}

export function placeWard(ward: Ward, point: MapPoint, scene: WardScene): Ward {
  const available = faelights.filter(spot => !spot.additional || scene.additionalFaelights)
  const hit = nearestIndex(point, available.map(spot => spot[scene.style]), 2.2)
  const spot = available[hit]
  return { point: spot?.minimap ?? point, type: ward.type, side: ward.side, faelightId: spot?.id }
}

export function addWard(wards: Ward[], point: MapPoint, scene: WardScene, type: WardType, side?: Side): Ward[] {
  const current = wards.map(ward => wardOnMap(ward, scene).point)
  const ward = placeWard({ point, type, side }, point, scene)
  const placement = wardOnMap(ward, scene).point
  const overlap = nearestIndex(placement, current.map((p, i) => wards[i].side === side ? p : [Infinity, Infinity]), 0.6)
  const previous = wards[overlap]
  if (previous && previous.faelightId === ward.faelightId && getWardType(previous.type).id === type) return wards
  return [...wards.filter((_, index) => index !== overlap), ward]
}

import { faelights, type MapPoint, type MapStyle } from "./faelights"

// perceptionBubbleRadius em sightward, visionward e bluetrinket (dados do jogo 16.22).
export const wardTypes = [
  { id: "stealth", label: "Sentinela Invisível", sight: 900 },
  { id: "control", label: "Sentinela de Controle", sight: 900 },
  { id: "farsight", label: "Alteração Vidente", sight: 500 },
] as const

type WardType = typeof wardTypes[number]["id"]
type Ward = { point: MapPoint; type?: WardType; faelightId?: string }

export function getWardType(id: unknown) {
  return wardTypes.find(type => type.id === id) ?? wardTypes[0]
}

export type WardScene = { style: MapStyle; transformed: boolean }

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
  const faelight = spot && (!spot.afterTransformation || scene.transformed) ? spot : undefined
  const type = getWardType(ward.type)
  return {
    point: spot?.[scene.style] ?? ward.point,
    faelight,
    type,
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

export function editWards(wards: Ward[], action: "ward" | "remove-ward", point: MapPoint, scene: WardScene, type: WardType): Ward[] {
  const current = wards.map(ward => wardOnMap(ward, scene).point)
  if (action === "remove-ward") {
    const hit = nearestIndex(point, current, 2.6)
    return hit < 0 ? wards : wards.filter((_, index) => index !== hit)
  }

  const available = faelights.filter(spot => !spot.afterTransformation || scene.transformed)
  const hit = nearestIndex(point, available.map(spot => spot[scene.style]), 2.2)
  const spot = available[hit]
  const placement = spot?.[scene.style] ?? point
  const overlap = nearestIndex(placement, current, 0.6)
  const previous = wards[overlap]
  if (previous && previous.faelightId === spot?.id && getWardType(previous.type).id === type) return wards
  const ward = spot ? { point: spot.minimap, type, faelightId: spot.id } : { point, type }
  return [...wards.filter((_, index) => index !== overlap), ward]
}

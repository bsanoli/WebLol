import buildAssets from "@dataset/build-assets"

const abilities: Partial<Record<string, Partial<Record<string, { name: string; description: string; icon: string }>>>> = buildAssets.abilities

export function abilityDetail(champion: string, slot: string) {
  const detail = abilities[champion]?.[slot];
  const folder = slot === "P" ? "passive" : "spell";
  return detail && { ...detail, icon: `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/${folder}/${detail.icon}` };
}

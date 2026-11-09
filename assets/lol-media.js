const lolKey = name => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const lolChampions = new Map(Object.entries(LOL_DATA.champions).flatMap(([id, champion]) =>
  [[lolKey(id), champion], [lolKey(champion.name), champion]]));
const lolChampion = name => lolChampions.get(lolKey(name));
const lolAsset = path => `assets/${path}`;
// Visible labels or initials already identify every image in these panels.
const lolImage = (path, className = "") => path
  ? `<img alt="" class="${className}" loading="lazy" src="${lolAsset(path)}" onerror="this.remove()">`
  : "";

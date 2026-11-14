import { lolChampion, lolImage } from "../model/lol-media"

const ini=(n: string)=>n.replace(/[^A-Za-z ]/g,"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
export const ico=(n: string)=>`<span class="av" data-i="${ini(n)}">${lolImage(lolChampion(n)?.portrait)}</span>`;

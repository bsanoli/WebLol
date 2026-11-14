export const ROLES=["top","jg","mid","adc","sup"] as const;
export const RN={top:"TOP",jg:"JG",mid:"MID",adc:"ADC",sup:"SUP"};
export const TOKS=[...ROLES.map(r=>"b_"+r),...ROLES.map(r=>"r_"+r)];
export const sw=([x,y]: number[])=>[y,x]; // espelha lado azul -> vermelho
const PRE={
 base:{top:[4,90],jg:[7,93],mid:[10,96],adc:[4,96],sup:[10,90]},
 lane:{top:[8,38],jg:[24,50],mid:[42,58],adc:[62,93],sup:[60,89]}
};
export function preset(k: keyof typeof PRE){const p: Record<string, number[]>={};for(const r of ROLES){p["b_"+r]=PRE[k][r].slice();p["r_"+r]=sw(PRE[k][r])}return p}
export const blankPlay=(uid: () => string,n?: string)=>({id:uid(),name:n||"Nova jogada",live:{pos:preset("lane"),lines:[]},steps:[],cb:"",cr:""});

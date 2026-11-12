/* ================= utilidades ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const lsGet=(k,d=null)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const fmtD=t=>new Date(t).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
function toast(m,ms=3200){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),ms)}
const KEY="lol-comps-time-v1",UKEY="lol-user",BKEY="lol-base",SKEY="lol-sent",FPKEY="lol-admin-fp",TKEY="lol-team";
// admins do app (Riot ID → e-mail no Firebase). Todos usam a mesma chave de admin, cada um com a sua senha.
const ADMINS={"brunoltz#ltz":"brunoltzinv@gmail.com","panda#zada":"fabiano.rong@gmail.com"};
const ADMIN_FP="fdb898843944d55e"; // impressão digital da chave do admin (fixa no app: um admin.json falso é recusado)
const normId=s=>String(s).replace(/\s+/g,"").toLowerCase();
const dispId=s=>{const[n,t]=String(s).split("#");return n.trim()+"#"+(t||"").trim().toUpperCase()};
const safeName=id=>normId(id).replace("#","_").replace(/[^a-z0-9_\-]/g,"_");
const isAdminId=id=>Object.prototype.hasOwnProperty.call(ADMINS,normId(id));
const adminEmail=id=>ADMINS[normId(id)]||"";

/* ===== IndexedDB (guarda a pasta escolhida e as chaves do admin neste PC) ===== */
const idb=new Promise((res,rej)=>{const r=indexedDB.open("lol-time",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const idbOp=(mode,fn)=>idb.then(db=>new Promise((res,rej)=>{const tx=db.transaction("kv",mode),st=tx.objectStore("kv"),rq=fn(st);tx.oncomplete=()=>res(rq&&rq.result);tx.onerror=()=>rej(tx.error)}));
const idbGet=k=>idbOp("readonly",s=>s.get(k)).catch(()=>null);
const idbSet=(k,v)=>idbOp("readwrite",s=>s.put(v,k));
const idbDel=k=>idbOp("readwrite",s=>s.delete(k));

/* ================= criptografia (Web Crypto do navegador) ================= */
const TE=new TextEncoder(),TD=new TextDecoder(),C=crypto.subtle;
function b64(buf){const u=new Uint8Array(buf);let s="";for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const RSA_GEN={name:"RSA-OAEP",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},RSA_IMP={name:"RSA-OAEP",hash:"SHA-256"};
const ECD={name:"ECDSA",namedCurve:"P-256"},ECS={name:"ECDSA",hash:"SHA-256"};
async function pwKey(pw,salt){const b=await C.importKey("raw",TE.encode(pw),"PBKDF2",false,["deriveKey"]);return C.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function aesEnc(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:b64(iv),ct:b64(await C.encrypt({name:"AES-GCM",iv},key,bytes))}}
const aesDec=(key,o)=>C.decrypt({name:"AES-GCM",iv:ub64(o.iv)},key,ub64(o.ct));
async function fingerprint(admin){const h=await C.digest("SHA-256",TE.encode(admin.encPub.n+admin.sigPub.x+admin.sigPub.y));return[...new Uint8Array(h)].slice(0,8).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function createAdmin(pw){
  const ek=await C.generateKey(RSA_GEN,true,["encrypt","decrypt"]),sk=await C.generateKey(ECD,true,["sign","verify"]);
  const salt=crypto.getRandomValues(new Uint8Array(16)),k=await pwKey(pw,salt);
  return{id:"brunoltz#LTZ",created:Date.now(),salt:b64(salt),encPub:await C.exportKey("jwk",ek.publicKey),sigPub:await C.exportKey("jwk",sk.publicKey),
    encPriv:await aesEnc(k,await C.exportKey("pkcs8",ek.privateKey)),sigPriv:await aesEnc(k,await C.exportKey("pkcs8",sk.privateKey))};
}
// cada admin tem a sua "fechadura": as mesmas chaves privadas, trancadas com a senha dele
const slotOf=(admin,id)=>admin&&(normId(id)===normId(admin.id)?admin:admin.slots?.[normId(id)]);
async function slotRaw(admin,id,pw){const s=slotOf(admin,id);if(!s)throw new Error("noslot");const k=await pwKey(pw,ub64(s.salt));return{enc:await aesDec(k,s.encPriv),sig:await aesDec(k,s.sigPriv)}}
async function makeSlot(raw,pw,temp){const salt=crypto.getRandomValues(new Uint8Array(16)),k=await pwKey(pw,salt);return{salt:b64(salt),encPriv:await aesEnc(k,raw.enc),sigPriv:await aesEnc(k,raw.sig),temp:!!temp,at:Date.now()}}
async function unlockAdmin(admin,pw,id=admin.id){ // lança erro se a senha estiver errada
  const raw=await slotRaw(admin,id,pw);
  const encPriv=await C.importKey("pkcs8",raw.enc,RSA_IMP,false,["decrypt"]);
  const sigPriv=await C.importKey("pkcs8",raw.sig,ECD,false,["sign"]);
  const keys={encPriv,sigPriv,fp:await fingerprint(admin)};await idbSet("adminKeys",keys);return keys;
}
async function seal(admin,obj){ // criptografa para o admin (só a chave privada dele abre)
  const pub=await C.importKey("jwk",admin.encPub,RSA_IMP,false,["encrypt"]);
  const ak=await C.generateKey({name:"AES-GCM",length:256},true,["encrypt"]);
  const body=await aesEnc(ak,TE.encode(JSON.stringify(obj)));
  return{fmt:"lol-time-enc",v:1,wk:b64(await C.encrypt({name:"RSA-OAEP"},pub,await C.exportKey("raw",ak))),...body};
}
async function unseal(keys,o){const raw=await C.decrypt({name:"RSA-OAEP"},keys.encPriv,ub64(o.wk));const ak=await C.importKey("raw",raw,"AES-GCM",false,["decrypt"]);return JSON.parse(TD.decode(await aesDec(ak,o)))}
async function signObj(keys,obj){const body=JSON.stringify(obj);return{body,sig:b64(await C.sign(ECS,keys.sigPriv,TE.encode(body)))}}
async function verifyObj(admin,o){try{const pub=await C.importKey("jwk",admin.sigPub,ECD,false,["verify"]);return await C.verify(ECS,pub,ub64(o.sig),TE.encode(o.body))?JSON.parse(o.body):null}catch(e){return null}}

/* ================= banco online (Firebase / Firestore) ================= */
// Configuração pública do projeto Firebase (não é segredo: quem protege os dados são as regras do banco).
const FB_CONFIG={apiKey:"AIzaSyB5J_tjV5a6XTqZTjI09zeIgMiilcaQ5u4",authDomain:"weblol-42ef7.firebaseapp.com",projectId:"weblol-42ef7",storageBucket:"weblol-42ef7.firebasestorage.app",messagingSenderId:"214350102733",appId:"1:214350102733:web:3cb8d6f4137435f7e62984"};
const FBV="10.12.2";
let ADMIN=null,KEYS=null,OFF=null; // OFF = versão oficial do time {version,at,data,log}
let TEAM=null,MEMB=null; // TEAM = time ativo {id,name,captain}; MEMB = registro em membros/{chave}
const ONLINE=!!FB_CONFIG;
let FB=null;
async function fb(){
  if(FB)return FB;if(!ONLINE)throw new Error("banco online não configurado");
  const u=n=>`https://www.gstatic.com/firebasejs/${FBV}/firebase-${n}.js`;
  const[app,au,fs]=await Promise.all([import(u("app")),import(u("auth")),import(u("firestore"))]);
  const a=app.initializeApp(FB_CONFIG),auth=au.getAuth(a);
  await new Promise(r=>{const off=au.onAuthStateChanged(auth,()=>{off();r()})});
  return FB={db:fs.getFirestore(a),auth,au,fs};
}
const fbIsAdmin=()=>!!FB&&!!FB.auth.currentUser&&Object.values(ADMINS).includes(FB.auth.currentUser.email);
const meId=()=>pendingId||user()?.id||"";
const meKey=()=>safeName(meId());
const playerEmail=id=>safeName(id)+"@weblol.app"; // conta do jogador no Firebase (Riot ID + senha)
const fbEmail=()=>FB?.auth.currentUser?.email||"";
const signedAs=id=>!!fbEmail()&&fbEmail()===(isAdminId(id)?adminEmail(id):playerEmail(id));
async function fbAdminLogin(pw){const{auth,au}=await fb(),em=adminEmail(meId());if(!em)throw new Error("sem e-mail");if(auth.currentUser?.email===em)return;await au.signInWithEmailAndPassword(auth,em,pw)}
async function dbGet(col,id){const{db,fs}=await fb();const s=await fs.getDoc(fs.doc(db,col,id));return s.exists()?s.data():null}
async function dbSet(col,id,data,merge){const{db,fs}=await fb();await fs.setDoc(fs.doc(db,col,id),data,merge?{merge:true}:{})}
async function dbList(col,field,value){const{db,fs}=await fb();const c=fs.collection(db,col);return(await fs.getDocs(field?fs.query(c,fs.where(field,"==",value)):c)).docs.map(d=>({id:d.id,...d.data()}))}
async function dbDel(col,id){const{db,fs}=await fb();await fs.deleteDoc(fs.doc(db,col,id))}
const getJ=async(col,id)=>{const d=await dbGet(col,id);if(!d)return null;try{return JSON.parse(d.json)}catch(e){return null}};
const putJ=(col,id,obj)=>dbSet(col,id,{json:JSON.stringify(obj),at:Date.now()});

/* ===== pasta antiga do OneDrive (só para importar uma vez para o banco) ===== */
async function fDir(root,path){let d=root;for(const p of path)d=await d.getDirectoryHandle(p);return d}
async function fRead(root,path){try{const d=await fDir(root,path.slice(0,-1));return JSON.parse(await (await (await d.getFileHandle(path.at(-1))).getFile()).text())}catch(e){return null}}
async function fList(root,path){try{const d=await fDir(root,path),out=[];for await(const[n,h]of d.entries())out.push([n,h]);return out}catch(e){return[]}}
// acha o admin.json na pasta escolhida: Time (oficial/), pasta de backup do admin, ou a pasta Admin (backup/)
async function findAdmin(root){for(const pre of[["oficial"],[],["backup"],["Time","oficial"]]){const adm=await fRead(root,[...pre,"admin.json"]);if(adm)return{pre,adm}}return null}
async function pickOldFolder(){
  if(!window.showDirectoryPicker){alert("Para importar a pasta use o Google Chrome ou o Microsoft Edge.");return null}
  try{return await showDirectoryPicker({id:"lol-time",mode:"read"})}catch(e){return null}
}

/* ================= dados: diferenças e versões ================= */
const shared=S=>({comps:clone(S?.comps||[]),plays:clone(S?.plays||[])});
const normItem=(kind,it)=>{const o={...it};if(kind==="comp")delete o.updated;else delete o.live;return JSON.stringify(o)};
function hsh(s){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)}
function diff(local,base){
  const ch=[];
  for(const kind of["comp","play"]){const k=kind+"s",L=local[k]||[],B=base[k]||[],bm=new Map(B.map(x=>[x.id,x])),lm=new Map(L.map(x=>[x.id,x]));
    for(const x of L){const b=bm.get(x.id);if(!b)ch.push({kind,op:"add",id:x.id,after:x});else if(normItem(kind,x)!==normItem(kind,b))ch.push({kind,op:"edit",id:x.id,before:b,after:x})}
    for(const b of B)if(!lm.has(b.id))ch.push({kind,op:"del",id:b.id,before:b})}
  ch.forEach(c=>c.h=hsh(c.op+c.id+(c.after?normItem(c.kind,c.after):"")));
  return ch;
}
function applyChanges(data,changes){
  const out={comps:clone(data.comps||[]),plays:clone(data.plays||[])};
  for(const c of changes){const arr=out[c.kind+"s"],i=arr.findIndex(x=>x.id===c.id);
    if(c.op==="del"){if(i>=0)arr.splice(i,1)}else if(i>=0)arr[i]=clone(c.after);else arr.unshift(clone(c.after))}
  return out;
}
const itemName=c=>(c.after||c.before||{}).name||"(sem nome)";
const KN={comp:"Comp",play:"Jogada"},OPN={add:"nova",edit:"alterada",del:"apagada"};
function describe(c){ // resumo legível do que mudou
  if(c.op!=="edit")return c.kind==="comp"&&c.after?`Campeões: ${Object.entries(c.after.lanes||{}).map(([l,a])=>a.length?`<b>${l.toUpperCase()}</b> ${esc(a.join(", "))}`:"").filter(Boolean).join(" · ")||"nenhum"}`:c.kind==="play"&&c.after?`${c.after.steps?.length||0} passos`:"";
  const a=c.after,b=c.before,out=[];
  if(a.name!==b.name)out.push(`Nome: <b>${esc(b.name)}</b> → <b>${esc(a.name)}</b>`);
  if(c.kind==="comp"){
    for(const l of Object.keys({...a.lanes,...b.lanes})){const A=a.lanes?.[l]||[],B=b.lanes?.[l]||[];const add=A.filter(x=>!B.includes(x)),rem=B.filter(x=>!A.includes(x));
      if(add.length||rem.length)out.push(`<b>${l.toUpperCase()}</b>: ${add.length?"+ "+esc(add.join(", ")):""}${add.length&&rem.length?" · ":""}${rem.length?"− "+esc(rem.join(", ")):""}`);
      else if(A.join()!==B.join())out.push(`<b>${l.toUpperCase()}</b>: ordem de prioridade mudou (${esc(A.join(" > "))})`)}
    if((a.notes||"")!==(b.notes||""))out.push("Anotações alteradas");
    if(JSON.stringify(a.laneNotes||{})!==JSON.stringify(b.laneNotes||{}))out.push("Obs. das lanes alteradas");
    if(JSON.stringify(a.draft||{})!==JSON.stringify(b.draft||{}))out.push("Ordem do draft alterada");
  }else{if((a.steps||[]).length!==(b.steps||[]).length)out.push(`Passos: ${(b.steps||[]).length} → ${(a.steps||[]).length}`);else out.push("Posições/passos alterados");
    if(a.cb!==b.cb||a.cr!==b.cr)out.push("Comps das bolinhas alteradas")}
  return out.join("<br>");
}
const user=()=>lsGet(UKEY);
const local=()=>lsGet(KEY);
function pending(){const b=lsGet(BKEY);if(!b)return[];return diff(shared(local()),b.data)}
function isSampleOnly(S){return!S||(S.comps||[]).length<=1&&(!S.comps?.length||/do comps\.xlsx/.test(S.comps[0].name))&&!(S.plays||[]).some(p=>p.steps?.length)}

/* ================= times ================= */
const isCaptain=()=>!!TEAM&&TEAM.captain===meKey();
const canPublish=()=>isCaptain()||(!!user()?.admin&&fbIsAdmin());
const teamPath=sub=>`times/${TEAM.id}/${sub}`;
// lê em que time o usuário está; TEAM só fica preenchido quando ele já foi aceito
async function loadMembership(){
  MEMB=await dbGet("membros",meKey());
  const t=MEMB?await dbGet("times",MEMB.team):null;
  if(MEMB&&t)MEMB.teamName=t.name;
  TEAM=MEMB?.status==="ativo"&&t?{id:MEMB.team,...t}:null;
  if(TEAM&&user()?.solo)lsSet(UKEY,{...user(),solo:false});
  guardTeam();
}
// comps de um time não podem vazar para outro: ao trocar de time (ou de usuário) apaga a cópia local
function guardTeam(){
  const want=user()?.solo?"__solo__":TEAM?.id||null;
  if(lsGet(TKEY)===want)return false;
  for(const k of[KEY,BKEY,SKEY])localStorage.removeItem(k);
  lsSet(TKEY,want);OFF=null;reloadCamp();return true;
}
function clearTeamData(){for(const k of[KEY,BKEY,SKEY,TKEY])localStorage.removeItem(k);OFF=null;TEAM=null;MEMB=null}

/* ================= sincronização ================= */
let reloadCamp=()=>{};
async function readOfficial(){
  if(!TEAM)return{err:"noteam"};
  const d=await dbGet(teamPath("dados"),"oficial");
  if(!d)return{off:{version:0,at:0,data:{comps:[],plays:[]},log:[]}};
  try{return{off:JSON.parse(d.json)}}catch(e){return{err:"bad"}}
}
let NET=false; // última leitura do banco funcionou
async function sync(opts={}){
  if(!ONLINE)return setSync("Banco online não configurado","warn");
  if(!user()||user().solo||!TEAM){updateStatus();return}
  let r;try{await fb();r=await readOfficial()}catch(e){r={err:"net"}}
  NET=!r.err;
  if(r.err){const m={net:"Sem conexão com o banco do time",bad:"Versão oficial do time ilegível",noteam:"Sem time"}[r.err];setSync(m,"bad");updateStatus(true);return}
  OFF=r.off;const base=lsGet(BKEY),S=local()||{};
  let changed=false,notes=[];
  if(!base){
    write(OFF.data);changed=true;
  }else if(base.version!==OFF.version){
    const me=normId(user()?.id||""),rej=new Set(OFF.log.filter(l=>l.status==="rejected"&&normId(l.from)===me).map(l=>l.h));
    const mine=diff(shared(S),base.data).filter(c=>{if(rej.has(c.h)){notes.push(`${KN[c.kind]} "${itemName(c)}" foi recusada pelo capitão`);return false}return true});
    write(applyChanges(OFF.data,mine));changed=true;
  }
  function write(data){const S2=local()||{};const live=new Map((S2.plays||[]).map(p=>[p.id,p.live]));
    S2.comps=data.comps;S2.plays=data.plays.map(p=>live.has(p.id)?{...p,live:live.get(p.id)}:p);
    if(!S2.comps.some(c=>c.id===S2.cur))S2.cur=S2.comps[0]?.id;if(!S2.plays.some(p=>p.id===S2.curPlay))S2.curPlay=S2.plays[0]?.id;
    lsSet(KEY,S2);lsSet(BKEY,{version:OFF.version,data:OFF.data});}
  if(changed&&opts.reload!==false)reloadCamp();
  notes.forEach(n=>toast(n,5000));
  updateStatus();
}
function setSync(t,c){
  $("#sync-label").textContent=t;
  $("#sync").dataset.state=c||"";
  const icon={bad:"warning",ok:"check"}[c]||"reset";
  $("#sync use").setAttribute("href","assets/icons.svg#"+icon);
}
function updateStatus(keepChip){
  const u=user();
  document.body.dataset.accountName = u?.id ?? "";
  document.body.dataset.accountRole = u?.admin?"Admin":isCaptain()?"Capitão":"";
  document.body.classList.toggle("isadmin",!!u?.admin||isCaptain());
  $("#logout").hidden=!u;
  const b=$("#send");
  if(!u){setSync("Identificar-se para o time","warn");$("#sync").onclick=stepId;b.hidden=true;return}
  if(u.solo||!TEAM){
    setSync(u.solo?"Sem time: as comps não são salvas":MEMB?.status==="pendente"?`Aguardando o capitão do ${MEMB.teamName||"time"}`:"Sem time","warn");
    $("#sync").onclick=stepTeam;b.hidden=true;return;
  }
  $("#sync").onclick=refreshTeam;
  if(!ONLINE||!NET||!OFF){
    if(!keepChip)setSync(ONLINE?"Sincronizar com o time":"Banco online não configurado","warn");
    b.hidden=true;
    return;
  }
  if(!keepChip)setSync(`${TEAM.name} · versão oficial v${OFF.version}`,"ok");
  const p=pending(),sent=new Set(lsGet(SKEY,[])),uns=p.filter(c=>!sent.has(c.h)),wait=p.length-uns.length;
  if(canPublish()){b.hidden=!p.length;b.dataset.variant="default";b.disabled=false;b.textContent=`Publicar minhas alterações (${p.length})`;b.onclick=()=>publish(p.map(c=>({...c,sid:"capitao",from:u.id})),[],"Alterações do capitão")}
  else{b.hidden=!p.length;b.dataset.variant=uns.length?"default":"secondary";b.textContent=uns.length?`Enviar para aprovação (${uns.length})`:`${wait} aguardando aprovação`;b.disabled=!uns.length;b.onclick=sendChanges}
}
async function refreshTeam(){
  setSync("Sincronizando com o time…","");
  try{await loadMembership()}catch(e){}
  await sync();
  if(currentScreen==="admin")renderAdmin();
  if(NET&&OFF)toast("Sincronizado");
}
async function sendChanges(){
  const u=user(),base=lsGet(BKEY);if(!TEAM||!base)return toast("Sem conexão com o banco do time");
  const sent=lsGet(SKEY,[]),ch=pending().filter(c=>!sent.includes(c.h));if(!ch.length)return;
  const sub={id:uid(),from:u.id,at:Date.now(),baseVersion:base.version,changes:ch};
  try{await dbSet(teamPath("envios"),sub.id,{from:meKey(),at:sub.at,json:JSON.stringify(sub)});
    lsSet(SKEY,[...sent,...ch.map(c=>c.h)].slice(-500));toast(`${ch.length} alteração(ões) enviada(s) para o capitão aprovar`)}
  catch(e){toast("Não consegui enviar para o banco do time: "+e.message)}
  updateStatus();
}
addEventListener("storage",e=>{if(e.key===KEY)updateStatus()});

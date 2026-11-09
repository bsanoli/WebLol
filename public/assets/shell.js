/* ================= admin: publicar / aprovar ================= */
async function publish(approved,rejected,label){
  if(!KEYS||!fbIsAdmin()){writeRoute(routeRoots.admin);openRoute();return toast("Desbloqueie o admin primeiro")}
  let r;try{r=await readOfficial()}catch(e){r={err:"sem conexão"}}if(r.err&&r.err!=="nodata")return toast("Erro lendo a versão oficial: "+r.err);
  const cur=r.off||{version:0,data:{comps:[],plays:[]},log:[]};
  const v=cur.version+1,at=Date.now();
  const log=[...cur.log,...approved.map(c=>({v,at,sid:c.sid,from:c.from,kind:c.kind,op:c.op,id:c.id,name:itemName(c),h:c.h,status:"approved"})),...rejected.map(c=>({v,at,sid:c.sid,from:c.from,kind:c.kind,op:c.op,id:c.id,name:itemName(c),h:c.h,status:"rejected"}))];
  const off={version:v,at,label,data:applyChanges(cur.data,approved),log};
  const signed=await signObj(KEYS,off);
  try{await putJ("versoes","v"+off.version,signed);await putJ("oficial","dados",signed)}catch(e){return toast("Não consegui publicar: "+e.message)}
  await sync();renderAdmin();toast(`Versão oficial v${off.version} publicada`);
}
// desbloqueia as chaves do admin e entra no banco como admin (mesma senha; se a do banco for outra, usa fbpw)
async function adminUnlock(pw,fbpw){
  const keys=await unlockAdmin(ADMIN,pw,meId());
  try{await fbAdminLogin(fbpw||pw)}catch(e){const err=new Error("fb");err.keys=keys;throw err}
  return keys;
}

/* ================= importar a pasta antiga do OneDrive para o banco ================= */
async function importFolder(root,log=()=>{}){
  const fa=await findAdmin(root);
  if(!fa)throw new Error(`a pasta ${root.name} não tem o admin.json. Escolha a pasta Time (ou a pasta backup do Admin).`);
  const{pre,adm}=fa;
  if(ADMIN_FP&&await fingerprint(adm)!==ADMIN_FP)throw new Error("o admin.json desta pasta não é o original");
  let n=0;
  if(!await dbGet("oficial","admin")){await putJ("oficial","admin",adm);n++}
  const vers=[];for(const[fn,fh]of await fList(root,[...pre,"versoes"])){const m=/^v(\d+)\.json$/.exec(fn);if(!m||fh.kind!=="file")continue;
    const o=JSON.parse(await (await fh.getFile()).text());if(await verifyObj(adm,o)){await putJ("versoes","v"+m[1],o);vers.push(+m[1]);n++;log(`versão v${m[1]}`)}}
  const dados=await fRead(root,[...pre,"dados.json"]),dv=dados&&await verifyObj(adm,dados);
  const cur=await getJ("oficial","dados"),cv=cur&&await verifyObj(adm,cur);
  if(dv&&(!cv||dv.version>cv.version)){await putJ("oficial","dados",dados);n++;log(`versão oficial v${dv.version}`)}
  for(const[uname,uh]of await fList(root,["usuarios"])){if(uh.kind!=="directory")continue;
    for(const[fn,fh]of await fList(root,["usuarios",uname,"envios"])){if(!fn.endsWith(".lolenc"))continue;
      const id=fn.replace(/\.lolenc$/,"");await dbSet("envios",id,{uid:"importado",from:uname,at:(await fh.getFile()).lastModified,enc:await (await fh.getFile()).text()});n++;log(`envio de ${uname}`)}
    try{const f=await (await uh.getFileHandle("backup.lolenc")).getFile();await dbSet("usuarios",uname+"~importado",{uid:"importado",user:uname,at:f.lastModified,backup:await f.text()});n++}catch(e){}
  }
  return n;
}
async function importFlow(){
  const root=await pickOldFolder();if(!root)return;
  toast("Importando a pasta "+root.name+"...",8000);
  try{const n=await importFolder(root,m=>toast("Importado: "+m,1500));await sync();renderAdmin();toast(`Importação concluída: ${n} item(ns) copiados para o banco`,5000)}
  catch(e){alert("Não consegui importar: "+e.message)}
}
async function exportBackup(){ // cópia completa para guardar na pasta Admin do OneDrive
  const vers=(await dbList("versoes")).map(d=>({id:d.id,obj:JSON.parse(d.json)})).sort((a,b)=>+a.id.slice(1)-+b.id.slice(1));
  const out={fmt:"lol-time-backup",at:Date.now(),admin:ADMIN,dados:await getJ("oficial","dados"),versoes:Object.fromEntries(vers.map(v=>[v.id,v.obj]))};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));
  a.download=`backup-time-${new Date().toISOString().slice(0,10)}.json`;a.click();
}

/* ================= tela de login ================= */
function modal(html) {
  const dialog = $("#modal");
  $("#mbox").innerHTML = html;
  $("#mbox h3").id = "modal-title";
  $("#mbox .err")?.setAttribute("role", "alert");
  if (!dialog.open) dialog.showModal();
  $("#mbox input, #mbox .pri")?.focus();
}
$("#modal").addEventListener("cancel", event => event.preventDefault());
const closeModal = () => $("#modal").close();
const merr=m=>{const e=$("#mbox .err");if(e)e.textContent=m};
let pendingId=null;
function stepId(){
  modal(`<span class="eyebrow">Primeiro acesso</span><h3>Identifique-se com seu Riot ID</h3><p>Use o nome e a tag do League of Legends. Sua identificação fica salva neste navegador.</p>

   <div class="rid"><div><label for="rname">Nome no LoL</label><input id="rname" placeholder="Nome (ex: brunoltz)" maxlength="16" autocomplete="off" spellcheck="false"></div><div><label for="rtag">Tag depois do #</label><input id="rtag" placeholder="TAG" maxlength="5" autocomplete="off" spellcheck="false"></div></div>
   <div class="err"></div>
   <div class="row"><button class="pri" id="ok">Continuar</button></div>`);
  const nm=$("#rname"),tg=$("#rtag");
  const go=()=>{const n=nm.value.trim(),tag=tg.value.replace(/[#\s]/g,"").toUpperCase();
    if(n.length<3)return merr("Digite o nome (mínimo 3 letras)."),nm.focus();
    if(!/^[A-Za-z0-9]{2,5}$/.test(tag))return merr("Digite a TAG depois do # (2 a 5 letras ou números)."),tg.focus();
    pendingId=n+"#"+tag;afterId()};
  // se a pessoa digitar ou colar "nome#TAG" no primeiro campo, separa sozinho
  nm.addEventListener("input",()=>{if(nm.value.includes("#")){const[a,...r]=nm.value.split("#");nm.value=a.trim();tg.value=(r.join("")+tg.value).replace(/\s/g,"").slice(0,5);tg.focus()}});
  tg.addEventListener("input",()=>{const p=tg.selectionStart;tg.value=tg.value.replace(/[#\s]/g,"").toUpperCase();tg.setSelectionRange(p,p)});
  nm.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();tg.focus()}});
  tg.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go()}if(e.key==="Backspace"&&!tg.value)nm.focus()});
  $("#ok").onclick=go;
}
async function afterId(){
  merr("Conectando ao banco do time...");
  let r;try{await fb();r=await readOfficial()}catch(e){r={err:"net"}}
  if(r.err==="fp")return modal(`<h3>Banco adulterado</h3><p>A chave do admin guardada no banco do time não é a original. Por segurança o app não vai usar esses dados. Avise o admin.</p><div class="row"><button class="pri" onclick="stepId()">Voltar</button></div>`);
  if(isAdminId(pendingId)){if(!ONLINE)return merr("O banco online ainda não foi configurado neste app.");if(r.err==="net")return merr("Não consegui conectar ao banco do time. Verifique a internet.");if(!ADMIN)return stepImport();if(!slotOf(ADMIN,pendingId))return merr("Este Riot ID ainda não foi liberado como admin. Peça ao Bruno para adicionar você na aba Administração.");return stepAdminPw()}
  if(r.err==="net"||r.err==="noadmin")toast("O banco do time ainda não está disponível. Você pode usar normalmente e enviar depois.",5000);
  finishLogin(false);
}
function stepAdminPw(){
  modal(`<h3>Login do admin</h3><p>Este Riot ID é o administrador. Digite a senha de admin.</p>
   <label for="pw">Senha</label><input type="password" id="pw"><div id="fbw" style="display:none"><label for="fpw">Senha do Firebase (do e-mail ${esc(adminEmail(pendingId))})</label><input type="password" id="fpw"></div><div class="err"></div>
   <div class="row"><button id="back">Voltar</button><button class="pri" id="ok">Entrar</button></div>`);
  const go=async()=>{$("#ok").disabled=true;merr("Verificando...");
    try{const pw=$("#pw").value;KEYS=await adminUnlock(pw,$("#fpw").value);if(slotOf(ADMIN,pendingId).temp)return stepNewPw(pw);finishLogin(true)}
    catch(e){$("#ok").disabled=false;if(e.message==="fb"){$("#fbw").style.display="";merr($("#fpw").value?"Senha do Firebase incorreta.":"A senha do Firebase é diferente da senha de admin. Digite a do Firebase também.");$("#fpw").focus()}else merr("Senha incorreta.")}};
  $("#ok").onclick=go;$("#mbox").querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")go()}));$("#back").onclick=stepId;
}
// primeiro acesso de um admin novo: troca a senha provisória pela senha dele
function stepNewPw(tmp){
  modal(`<h3>Crie a sua senha de admin</h3><p>Você entrou com a senha provisória. Agora crie a sua senha. Só você vai saber, e ela também vira a sua senha do banco do time.</p>
   <label for="np">Nova senha (mínimo 8 caracteres)</label><input type="password" id="np"><label for="np2">Repita a senha</label><input type="password" id="np2"><div class="err"></div>
   <div class="row"><button class="pri" id="ok">Salvar senha</button></div>`);
  const go=async()=>{const a=$("#np").value,b=$("#np2").value;if(a.length<8)return merr("Use pelo menos 8 caracteres.");if(a!==b)return merr("As senhas não são iguais.");if(a===tmp)return merr("Escolha uma senha diferente da provisória.");
    $("#ok").disabled=true;merr("Salvando...");
    try{await setSlot(meId(),await makeSlot(await slotRaw(ADMIN,meId(),tmp),a,false));await FB.au.updatePassword(FB.auth.currentUser,a);finishLogin(true)}
    catch(e){merr("Erro: "+e.message);$("#ok").disabled=false}};
  $("#ok").onclick=go;$("#mbox").querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")go()}));
}
// grava (ou remove, com slot=null) a fechadura de um admin no admin.json do banco
async function setSlot(id,slot){
  const cur=await getJ("oficial","admin");if(!cur||await fingerprint(cur)!==await fingerprint(ADMIN))throw new Error("chave do admin no banco mudou");
  if(normId(id)===normId(cur.id))throw new Error("o admin principal não pode ser alterado aqui");
  const slots={...(cur.slots||{})};if(slot)slots[normId(id)]=slot;else delete slots[normId(id)];cur.slots=slots;
  await putJ("oficial","admin",cur);ADMIN=cur;
}
function stepImport(){
  modal(`<h3>Importar os dados do time</h3><p>O banco online do time ainda está vazio. Escolha a pasta antiga do OneDrive (<b>Time</b>, ou a pasta de backup em <b>Admin</b>) para copiar a chave do admin, a versão oficial e os envios para o banco. Isso só é feito uma vez.</p>
   <div class="err"></div><div class="row"><button id="back">Voltar</button><button class="pri" id="pick">Escolher a pasta</button></div>`);
  $("#back").onclick=stepId;
  $("#pick").onclick=async()=>{const root=await pickOldFolder();if(!root)return merr("Nenhuma pasta escolhida.");
    const fa=await findAdmin(root);if(!fa)return merr(`A pasta ${root.name} não tem o admin.json. Escolha a pasta Time ou a pasta backup do Admin.`);const adm=fa.adm;
    if(ADMIN_FP&&await fingerprint(adm)!==ADMIN_FP)return merr("O admin.json desta pasta não é o original.");
    ADMIN=adm;modal(`<h3>Senha de admin</h3><p>Digite a senha de admin para entrar no banco e copiar os dados da pasta <b>${esc(root.name)}</b>.</p>
     <label for="pw">Senha</label><input type="password" id="pw"><div id="fbw" style="display:none"><label for="fpw">Senha do Firebase (do e-mail ${esc(adminEmail(pendingId))})</label><input type="password" id="fpw"></div><div class="err"></div>
     <div class="row"><button class="pri" id="ok">Importar</button></div>`);
    const go=async()=>{$("#ok").disabled=true;merr("Verificando...");
      try{KEYS=await adminUnlock($("#pw").value,$("#fpw").value)}
      catch(e){$("#ok").disabled=false;if(e.message==="fb"){$("#fbw").style.display="";merr("Digite também a senha do Firebase.")}else merr("Senha incorreta.");return}
      try{merr("Copiando para o banco...");const n=await importFolder(root,m=>merr("Copiando: "+m));toast(`${n} item(ns) copiados para o banco`,5000);finishLogin(true)}
      catch(e){merr("Erro: "+e.message);$("#ok").disabled=false}};
    $("#ok").onclick=go;$("#mbox").querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")go()}))};
}
async function finishLogin(admin){
  lsSet(UKEY,{id:pendingId,admin,created:Date.now()});closeModal();
  if(ONLINE&&!admin){try{const me=await fbUser();await dbSet("usuarios",await devId({id:pendingId}),{uid:me.uid,user:pendingId,created:Date.now(),at:Date.now(),ua:navigator.userAgent},true)}catch(e){}}
  await sync();backupNow();updateStatus();if(admin)renderAdmin();toast(`Bem-vindo, ${pendingId}!`);
}
$("#logout").onclick=async()=>{
  if(!user())return stepId();
  if(!confirm("Sair deste usuário neste aparelho? (as comps salvas continuam aqui)"))return;
  localStorage.removeItem(UKEY);
  await idbDel("adminKeys");
  KEYS=null;
  try{if(FB)await FB.au.signOut(FB.auth)}catch(e){}
  updateStatus();
  pendingId=null;
  if(currentScreen==="admin"){
    writeRoute(routeRoots.camp);
    openRoute();
  }
  if(currentScreen==="camp"&&!$("#modal").open)stepId();
};

/* ================= aba Administração ================= */
async function renderAdmin(){
  const el=$("#admin");if(!user()?.admin)return;
  if(!ONLINE){el.innerHTML=`<h2>Administração</h2><div class="card">O banco online ainda não foi configurado neste app.</div>`;return}
  if(!ADMIN){el.innerHTML=`<h2>Administração</h2><div class="card">O banco do time está vazio ou sem conexão. <button class="pri" id="imp">Importar da pasta</button> <button id="refresh">Tentar de novo</button></div>`;$("#imp").onclick=importFlow;$("#refresh").onclick=async()=>{await sync();renderAdmin()};return}
  try{await fb()}catch(e){}
  if(!KEYS||!fbIsAdmin()){el.innerHTML=`<h2>Administração</h2><div class="card"><p>Digite a senha de admin para desbloquear neste aparelho.</p><input type="password" id="apw" aria-label="Senha de administrador" style="max-width:300px"> <span id="afw" style="display:none"><input type="password" id="afpw" aria-label="Senha do Firebase" placeholder="Senha do Firebase" style="max-width:220px"></span> <button class="pri" id="aok">Desbloquear</button> <span class="bad" id="aerr"></span></div>`;
    const go=async()=>{try{KEYS=await adminUnlock($("#apw").value,$("#afpw").value);renderAdmin()}catch(e){if(e.message==="fb"){$("#afw").style.display="";$("#aerr").textContent="Digite também a senha do Firebase"}else $("#aerr").textContent="Senha incorreta"}};
    $("#aok").onclick=go;el.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")go()}));return}
  el.innerHTML=`<h2>Administração</h2><p class="mut">Carregando envios...</p>`;
  const done=new Set((OFF?.log||[]).map(l=>l.sid)),subs=[],users=new Map();
  let envs=[],regs=[];
  try{[envs,regs]=await Promise.all([dbList("envios"),dbList("usuarios")])}catch(e){el.innerHTML=`<h2>Administração</h2><div class="card bad">Não consegui ler o banco: ${esc(e.message)}</div>`;return}
  for(const d of envs){
    try{const s=await unseal(KEYS,JSON.parse(d.enc));s.doc=d.id;if(done.has(s.id)){await dbDel("envios",d.id);continue}subs.push(s)}catch(e){subs.push({id:d.id,doc:d.id,from:d.from,err:true})}}
  for(const r of regs){const k=normId(r.user||r.id.split("~")[0]),o=users.get(k)||{name:r.user||k,n:0,bk:null};o.n++;
    if(r.backup&&(!o.bk||r.at>o.bk.at))o.bk={at:r.at,doc:r.id,enc:r.backup};users.set(k,o)}
  const ulist=[...users.values()].sort((a,b)=>a.name.localeCompare(b.name));
  subs.sort((a,b)=>(a.at||0)-(b.at||0));
  const mine=pending();
  el.innerHTML=`<h2>Envios aguardando aprovação (${subs.length})</h2>
   ${subs.length?subs.map((s,si)=>s.err?`<div class="card"><span class="bad">Não consegui abrir o envio ${esc(s.id)} de ${esc(s.from)} (corrompido ou de outra chave).</span> <button data-delf="${si}" class="dng">Apagar envio</button></div>`:`
    <div class="card"><div class="hd"><b>${esc(s.from)}</b><span class="mut">${fmtD(s.at)} · baseado na v${s.baseVersion}${OFF&&s.baseVersion<OFF.version?` <span style="color:var(--gold)">(versão oficial agora é v${OFF.version})</span>`:""}</span></div>
     ${s.changes.map((c,ci)=>`<label class="chg"><input type="checkbox" data-s="${si}" data-c="${ci}" checked><div><span class="op ${c.op}">${OPN[c.op]}</span> ${KN[c.kind]} <b>${esc(itemName(c))}</b><div class="det">${describe(c)}</div></div></label>`).join("")}
     <div class="btns"><button class="pri" data-ap="${si}">✓ Aprovar marcadas</button><button class="dng" data-rj="${si}">✕ Recusar tudo</button></div></div>`).join(""):`<div class="card mut">Nenhum envio pendente. 🎉</div>`}
   <h2>Minhas alterações (admin)</h2>
   <div class="card">${mine.length?mine.map(c=>`<div class="chg"><div><span class="op ${c.op}">${OPN[c.op]}</span> ${KN[c.kind]} <b>${esc(itemName(c))}</b><div class="det">${describe(c)}</div></div></div>`).join("")+`<div class="btns"><button class="pri" id="pubmine">Publicar como nova versão</button></div>`:'<span class="mut">Você não tem alterações locais além da versão oficial.</span>'}</div>
   <h2>Histórico (versão oficial v${OFF?.version||"-"})</h2>
   <div class="card"><table><tr><th>Versão</th><th>Data</th><th>De</th><th>O quê</th><th>Status</th></tr>
    ${(OFF?.log||[]).slice().reverse().slice(0,150).map(l=>`<tr><td>v${l.v}</td><td>${fmtD(l.at)}</td><td>${esc(l.from)}</td><td><span class="op ${l.op}">${OPN[l.op]}</span> ${KN[l.kind]} ${esc(l.name)}</td><td class="${l.status==="approved"?"ok":"bad"}">${l.status==="approved"?"aprovada":"recusada"}</td></tr>`).join("")||'<tr><td colspan="5" class="mut">Ainda sem histórico.</td></tr>'}</table></div>
   <h2>Usuários</h2>
   <div class="card"><table><tr><th>Usuário</th><th>Aparelhos</th><th>Última cópia (backup)</th><th></th></tr>
    ${ulist.map((u,i)=>`<tr><td>${esc(u.name)}</td><td>${u.n}</td><td>${u.bk?fmtD(u.bk.at):'<span class="mut">—</span>'}</td><td>${u.bk?`<button data-bk="${i}">Baixar backup</button>`:""}</td></tr>`).join("")||'<tr><td colspan="4" class="mut">Nenhum usuário ainda.</td></tr>'}</table></div>
   <h2>Admins</h2>
   <div class="card"><table><tr><th>Riot ID</th><th>E-mail no banco</th><th>Situação</th><th></th></tr>
    ${Object.entries(ADMINS).map(([id,em])=>{const sl=slotOf(ADMIN,id),main=normId(id)===normId(ADMIN.id),me=normId(id)===normId(user().id);
      const st=main?"principal":!sl?'<span class="mut">não liberado</span>':sl.temp?'<span style="color:var(--gold)">aguardando o 1º acesso</span>':'<span class="ok">ativo</span>';
      return`<tr><td>${esc(dispId(id))}</td><td>${em?esc(em):'<span class="bad">falta o e-mail no app</span>'}</td><td>${st}</td><td>${main||me||!em?"":`<button data-adm="${esc(id)}">${sl?"Nova senha provisória":"Liberar admin"}</button>`}${sl&&!main&&!me?` <button class="dng" data-rmadm="${esc(id)}">Remover</button>`:""}</td></tr>`}).join("")}</table>
    <div id="admform" style="display:none;margin-top:10px"><p>Liberar <b id="admwho"></b>. Primeiro cadastre o e-mail dele no Firebase (Authentication › Usuários) com uma senha provisória. Depois digite aqui a mesma senha provisória e passe para ele. No primeiro acesso ele cria a senha dele.</p>
     <input type="password" id="admmy" placeholder="Sua senha de admin" style="max-width:220px"> <input type="password" id="admtmp" placeholder="Senha provisória dele" style="max-width:220px"> <button class="pri" id="admok">Liberar</button> <span class="bad" id="admerr"></span></div></div>
   <h2>Banco e backup</h2><div class="card"><span class="mut">Chave do admin: ${esc(KEYS.fp)}</span>
    <div class="btns"><button id="exp">Baixar backup completo</button><button id="imp">Importar da pasta</button><button id="lock">Bloquear admin neste aparelho</button><button id="refresh">Atualizar</button></div>
    <p class="mut">Guarde o backup completo na pasta Admin do OneDrive de tempos em tempos.</p></div>`;
  const pick=si=>{const s=subs[si],ap=[],rj=[];document.querySelectorAll(`[data-s="${si}"]`).forEach(cb=>{const c={...s.changes[+cb.dataset.c],sid:s.id,from:s.from};(cb.checked?ap:rj).push(c)});return{s,ap,rj}};
  el.querySelectorAll("[data-ap]").forEach(b=>b.onclick=async()=>{const{s,ap,rj}=pick(+b.dataset.ap);b.disabled=true;await publish(ap,rj,`Envio de ${s.from}`);await dbDel("envios",s.doc).catch(()=>{});renderAdmin()});
  el.querySelectorAll("[data-rj]").forEach(b=>b.onclick=async()=>{const s=subs[+b.dataset.rj];if(!confirm(`Recusar todas as alterações de ${s.from}?`))return;b.disabled=true;await publish([],s.changes.map(c=>({...c,sid:s.id,from:s.from})),`Envio de ${s.from} recusado`);await dbDel("envios",s.doc).catch(()=>{});renderAdmin()});
  el.querySelectorAll("[data-delf]").forEach(b=>b.onclick=async()=>{await dbDel("envios",subs[+b.dataset.delf].doc).catch(()=>{});renderAdmin()});
  el.querySelectorAll("[data-bk]").forEach(b=>b.onclick=async()=>{const u=ulist[+b.dataset.bk];const d=await unseal(KEYS,JSON.parse(u.bk.enc));const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({comps:d.data.comps,plays:d.data.plays},null,2)],{type:"application/json"}));a.download=`backup-${safeName(u.name)}.json`;a.click()});
  const pm=$("#pubmine");if(pm)pm.onclick=()=>publish(mine.map(c=>({...c,sid:"admin",from:user().id})),[],"Alterações do admin");
  let admId=null;
  el.querySelectorAll("[data-adm]").forEach(b=>b.onclick=()=>{admId=b.dataset.adm;$("#admwho").textContent=dispId(admId);$("#admform").style.display="";$("#admmy").focus()});
  $("#admok").onclick=async()=>{const t=$("#admtmp").value;if(t.length<6)return $("#admerr").textContent="A senha provisória precisa de 6 caracteres ou mais";
    $("#admok").disabled=true;$("#admerr").textContent="";
    try{await setSlot(admId,await makeSlot(await slotRaw(ADMIN,user().id,$("#admmy").value),t,true));toast(`${dispId(admId)} liberado como admin. Passe a senha provisória para ele.`,6000);renderAdmin()}
    catch(e){$("#admerr").textContent=e.message==="noslot"?"Seu acesso de admin não foi encontrado":/decrypt|operation/i.test(e.message+e.name)?"Sua senha está incorreta":e.message;$("#admok").disabled=false}};
  el.querySelectorAll("[data-rmadm]").forEach(b=>b.onclick=async()=>{const id=b.dataset.rmadm;if(!confirm(`Remover ${dispId(id)} dos admins? Ele não vai mais conseguir entrar como admin.`))return;try{await setSlot(id,null);renderAdmin()}catch(e){toast("Erro: "+e.message)}});
  $("#exp").onclick=exportBackup;$("#imp").onclick=importFlow;
  $("#lock").onclick=async()=>{await idbDel("adminKeys");KEYS=null;try{await FB.au.signOut(FB.auth)}catch(e){}renderAdmin()};
  $("#refresh").onclick=async()=>{await sync();renderAdmin()};
}

/* ================= abas ================= */
const screens = { worlds: "./worlds.html", camp: "./camp.html" };
const loaded = new Map();
let currentScreen;
const routeRoots = { worlds: "/worlds", camp: "/time", admin: "/admin" };
const frames = [...document.querySelectorAll("#screens iframe")];

function readRoute() {
  const [path, query] = location.hash.slice(1).split("?", 2);
  const [, root, ...parts] = path.split("/");
  const screen = Object.keys(routeRoots).find(name => routeRoots[name] === "/" + root);
  return { screen, parts, params: new URLSearchParams(query) };
}

function writeRoute(path, replace = false) {
  const hash = "#" + path;
  if (location.hash !== hash) history[replace ? "replaceState" : "pushState"](null, "", hash);
}

function applyFrameRoute(frame) {
  const route = readRoute();
  if (frame.id === "v-" + route.screen && route.screen === currentScreen) {
    frame.contentWindow.applyWebLolRoute?.(route.parts, route.params);
  }
}

for (const frame of frames) {
  frame.addEventListener("load", () => applyFrameRoute(frame));
  frame.addEventListener("weblol:navigate", ({ detail }) => {
    if (frame.id !== "v-" + currentScreen) return;
    writeRoute(detail.path, detail.replace);
    if (detail.copy) void copyCurrentLink();
  });
}

function openRoute(fallback = "worlds") {
  const { screen } = readRoute();
  show(screen || fallback);
  for (const frame of frames) applyFrameRoute(frame);
  if (!user() && currentScreen === "camp" && !$("#modal").open) stepId();
  if (!user() && currentScreen === "worlds" && $("#modal").open) closeModal();
}

addEventListener("hashchange", () => openRoute());
async function copyCurrentLink() {
  const url = new URL(location.href);
  if (!readRoute().screen) url.hash = routeRoots[currentScreen];
  try {
    await navigator.clipboard.writeText(url.href);
    toast("Link copiado");
  } catch {
    prompt("Copie o endereço desta tela", url.href);
  }
}
$("#copy-link").onclick = copyCurrentLink;

async function loadScreen(name) {
  if (!loaded.has(name)) {
    const source = fetch(screens[name]).then(response => {
      if (!response.ok) throw new Error("Falha ao carregar " + name);
      return response.text();
    });
    loaded.set(name, source);
    try {
      $("#v-" + name).srcdoc = await source;
    } catch {
      loaded.delete(name);
      if (currentScreen === name) {
        const error = $("#screen-error");
        error.textContent = "Não foi possível carregar esta área. Selecione a aba para tentar novamente.";
        error.hidden = false;
      }
    }
  }
}

function show(t) {
  if(t==="admin"&&!user()?.admin)t="camp";
  currentScreen = t;
  $("#copy-link").hidden = t === "admin";
  $("#screen-error").hidden = true;
  document.querySelectorAll("#top .tab").forEach(button => {
    const active = button.dataset.t === t;
    button.classList.toggle("on", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("on", view.id === "v-" + t));
  if (t === "admin") renderAdmin();
  else void loadScreen(t);
  lsSet("lol-aba-principal", t);
}

reloadCamp = () => {
  const source = loaded.get("camp");
  if (source) source.then(html => { $("#v-camp").srcdoc = html; }, () => {});
};
document.querySelectorAll("#top .tab").forEach(button => {
  button.onclick = () => {
    if (button.dataset.t === currentScreen && readRoute().screen === currentScreen) return;
    writeRoute(routeRoots[button.dataset.t]);
    openRoute();
  };
});

/* ================= início ================= */
(async function init(){
  KEYS=user()?.admin?await idbGet("adminKeys"):null;
  updateStatus();
  const saved=lsGet("lol-aba-principal","worlds");
  openRoute(Object.hasOwn(routeRoots,saved)?saved:"worlds");
  if(user()&&ONLINE){
    setSync("Sincronizando com o time…","");
    await sync();
    if(currentScreen==="admin")renderAdmin();
  }
  setInterval(async()=>{
    if(!ONLINE||!user())return;
    let result;
    try{result=await readOfficial()}catch(e){return}
    if(result.off&&(!NET||!OFF||result.off.version!==OFF.version)){
      const newVersion=result.off.version!==OFF?.version;
      await sync();
      if(NET&&newVersion)toast(`Nova versão oficial v${OFF.version} carregada`);
    }
  },60000);
})();

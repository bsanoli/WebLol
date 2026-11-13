/* ================= capitão / admin: publicar e aprovar ================= */
async function publish(approved,rejected,label){
  if(!TEAM||!canPublish()){writeRoute(routeRoots.admin);openRoute();return toast(user()?.admin?"Desbloqueie o admin primeiro":"Só o capitão publica a versão oficial do time")}
  let r;try{r=await readOfficial()}catch(e){r={err:"sem conexão"}}if(r.err)return toast("Erro lendo a versão oficial: "+r.err);
  const cur=r.off;
  const v=cur.version+1,at=Date.now();
  const log=[...cur.log,...approved.map(c=>({v,at,sid:c.sid,from:c.from,kind:c.kind,op:c.op,id:c.id,name:itemName(c),h:c.h,status:"approved"})),...rejected.map(c=>({v,at,sid:c.sid,from:c.from,kind:c.kind,op:c.op,id:c.id,name:itemName(c),h:c.h,status:"rejected"}))];
  const off={version:v,at,label,by:user().id,data:applyChanges(cur.data,approved),log};
  try{await dbSet(teamPath("dados"),"oficial",{json:JSON.stringify(off),at})}catch(e){return toast("Não consegui publicar: "+e.message)}
  await sync();renderAdmin();toast(`Versão oficial v${off.version} do ${TEAM.name} publicada`);
}
// desbloqueia as chaves do admin e entra no banco como admin (mesma senha; se a do banco for outra, usa fbpw)
async function adminUnlock(pw,fbpw){
  const keys=await unlockAdmin(ADMIN,pw,meId());
  try{await fbAdminLogin(fbpw||pw)}catch(e){const err=new Error("fb");err.keys=keys;throw err}
  return keys;
}
async function loadAdminKey(){
  ADMIN=await getJ("oficial","admin");if(!ADMIN)return"noadmin";
  const fp=await fingerprint(ADMIN),pin=lsGet(FPKEY);
  if((ADMIN_FP&&fp!==ADMIN_FP)||(pin&&pin!==fp)){ADMIN=null;return"fp"}
  lsSet(FPKEY,fp);return"";
}
async function exportBackup(){ // cópia completa de todos os times, para guardar na pasta Admin do OneDrive
  const times=await dbList("times"),membros=await dbList("membros"),dados={};
  for(const t of times){const d=await dbGet(`times/${t.id}/dados`,"oficial");dados[t.id]=d?JSON.parse(d.json):null}
  const out={fmt:"lol-times-backup",at:Date.now(),admin:ADMIN,times,membros,dados};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));
  a.download=`backup-times-${new Date().toISOString().slice(0,10)}.json`;a.click();
}

/* ===== migração única: o time antigo vira o time Fraldinha (capitão brunoltz#LTZ) ===== */
const FIRST_TEAM={id:"fraldinha",name:"Fraldinha",captainId:"brunoltz#LTZ"};
const legacyId=s=>String(s).includes("#")?s:String(s).replace(/_([^_]*)$/,"#$1");
async function migrateToTeams(){
  if(await dbGet("oficial","migracao"))return false; // já foi feita
  if(!ADMIN)await loadAdminKey();
  const raw=await getJ("oficial","dados"),old=raw&&ADMIN?await verifyObj(ADMIN,raw):null;
  // usa o Fraldinha do capitão se ele já existir (ex.: criado à mão), senão cria
  const cap=safeName(FIRST_TEAM.captainId),own=(await dbList("times")).find(t=>t.captain===cap&&t.name.trim().toLowerCase()===FIRST_TEAM.name.toLowerCase());
  const tid=own?.id||FIRST_TEAM.id;
  if(!own)await dbSet("times",tid,{name:FIRST_TEAM.name,captain:cap,captainId:FIRST_TEAM.captainId,created:Date.now()});
  const ids=new Map();
  for(const id of Object.keys(ADMINS))ids.set(safeName(id),dispId(id));
  for(const r of await dbList("usuarios").catch(()=>[]))if(r.user){const id=dispId(legacyId(r.user));ids.set(safeName(id),id)}
  for(const[k,id]of ids)if(!await dbGet("membros",k))await dbSet("membros",k,{team:tid,status:"ativo",riotId:id,at:Date.now()});
  const off=old||{version:0,at:0,data:{comps:[],plays:[]},log:[]};
  const cur=await dbGet(`times/${tid}/dados`,"oficial"),curData=cur?JSON.parse(cur.json).data:null;
  if(!curData||(!curData.comps.length&&!curData.plays.length))
    await dbSet(`times/${tid}/dados`,"oficial",{json:JSON.stringify({...off,label:off.label||"Versão inicial do time"}),at:Date.now()});
  // envios antigos (criptografados para o admin) passam para a fila do capitão do Fraldinha
  if(KEYS){const done=new Set((off.log||[]).map(l=>l.sid));
    for(const d of await dbList("envios").catch(()=>[])){try{const s=await unseal(KEYS,JSON.parse(d.enc));
      if(!done.has(s.id))await dbSet(`times/${tid}/envios`,s.id,{from:safeName(s.from),at:s.at,json:JSON.stringify(s)});await dbDel("envios",d.id)}catch(e){}}}
  await dbSet("oficial","migracao",{team:tid,at:Date.now()});
  return true;
}

/* ================= tela de login ================= */
function modal(html) {
  const dialog = $("#modal");
  $("#mbox").innerHTML = html;
  $("#mbox h3").id = "modal-title";
  $("#mbox .err")?.setAttribute("role", "alert");
  if (!dialog.open) dialog.showModal();
  $("#mbox input, #mbox [data-variant=default]")?.focus();
}
$("#modal").addEventListener("cancel", event => event.preventDefault());
const closeModal = () => $("#modal").close();
const merr=m=>{const e=$("#mbox .err");if(e)e.textContent=m};
const onEnter=go=>$("#mbox").querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go()}}));
let pendingId=null;
function stepId(){
  modal(`<span class="eyebrow">Entrar</span><h3>Identifique-se com seu Riot ID</h3><p>Use o nome e a tag do League of Legends. No próximo passo você entra com a sua senha, ou cria uma no primeiro acesso.</p>

   <div class="rid"><div><label for="rname">Nome no LoL</label><input data-slot="input" id="rname" placeholder="Nome (ex: brunoltz)" maxlength="16" autocomplete="username" spellcheck="false"></div><div><label for="rtag">Tag depois do #</label><input data-slot="input" id="rtag" placeholder="TAG" maxlength="5" autocomplete="off" spellcheck="false"></div></div>
   <div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="default" id="ok">Continuar</button></div>`);
  const nm=$("#rname"),tg=$("#rtag");
  if(pendingId){const[a,b]=dispId(pendingId).split("#");nm.value=a;tg.value=b||""}
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
  if(!ONLINE)return merr("O banco online ainda não foi configurado neste app.");
  try{await fb()}catch(e){return merr("Não consegui conectar ao banco do time. Verifique a internet.")}
  if(isAdminId(pendingId)){
    let e;try{e=await loadAdminKey()}catch(x){e="net"}
    if(e==="net")return merr("Não consegui conectar ao banco do time. Verifique a internet.");
    if(e)return merr("A chave do admin no banco não é a original. Por segurança o login de admin foi bloqueado.");
    if(!slotOf(ADMIN,pendingId))return merr("Este Riot ID ainda não foi liberado como admin. Peça ao Bruno para adicionar você na aba Administração.");
    return stepAdminPw();
  }
  let conta;try{conta=await dbGet("contas",safeName(pendingId))}catch(e){return merr("Não consegui conectar ao banco do time. Verifique a internet.")}
  stepPw(!!conta);
}
// jogador: entra com a senha, ou cria a senha no primeiro acesso
function stepPw(exists){
  const id=dispId(pendingId);
  modal(exists?`<span class="eyebrow">${esc(id)}</span><h3>Digite sua senha</h3><p>Use a senha que você criou no primeiro acesso.</p>
   <label for="pw">Senha</label><input data-slot="input" type="password" id="pw" autocomplete="current-password"><div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="back">Voltar</button><button data-slot="button" data-variant="default" id="ok">Entrar</button></div>`
  :`<span class="eyebrow">${esc(id)}</span><h3>Crie a sua senha</h3><p>É o seu primeiro acesso com este Riot ID. Crie uma senha para entrar de qualquer aparelho. Se esquecer a senha, peça ao admin para liberar de novo.</p>
   <label for="pw">Senha (mínimo 6 caracteres)</label><input data-slot="input" type="password" id="pw" autocomplete="new-password"><label for="pw2">Repita a senha</label><input data-slot="input" type="password" id="pw2" autocomplete="new-password"><div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="back">Voltar</button><button data-slot="button" data-variant="default" id="ok">Criar e entrar</button></div>`);
  $("#back").onclick=stepId;
  const go=async()=>{const pw=$("#pw").value,{auth,au}=FB,email=playerEmail(pendingId);
    if(!exists){if(pw.length<6)return merr("Use pelo menos 6 caracteres.");if(pw!==$("#pw2").value)return merr("As senhas não são iguais.")}
    $("#ok").disabled=true;merr(exists?"Entrando...":"Criando a sua conta...");
    try{
      if(exists)await au.signInWithEmailAndPassword(auth,email,pw);
      else try{await au.createUserWithEmailAndPassword(auth,email,pw)}catch(e){if(!/email-already-in-use/.test(e.code||e.message))throw e;await au.signInWithEmailAndPassword(auth,email,pw)}
      await dbSet("contas",safeName(pendingId),{key:safeName(pendingId),riotId:id,at:Date.now(),...(exists?{}:{created:Date.now()})},true);
      finishLogin(false);
    }catch(e){$("#ok").disabled=false;const c=e.code||e.message;
      merr(/invalid-credential|wrong-password|user-not-found|email-already-in-use/.test(c)?"Senha incorreta.":/too-many-requests/.test(c)?"Muitas tentativas. Espere alguns minutos.":/weak-password/.test(c)?"Senha fraca demais. Use pelo menos 6 caracteres.":"Erro: "+c)}};
  $("#ok").onclick=go;onEnter(go);
}
function stepAdminPw(){
  modal(`<h3>Login do admin</h3><p>Este Riot ID é administrador. Digite a senha de admin.</p>
   <label for="pw">Senha</label><input data-slot="input" type="password" id="pw"><div id="fbw" style="display:none"><label for="fpw">Senha do Firebase (do e-mail ${esc(adminEmail(pendingId))})</label><input data-slot="input" type="password" id="fpw"></div><div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="back">Voltar</button><button data-slot="button" data-variant="default" id="ok">Entrar</button></div>`);
  const go=async()=>{$("#ok").disabled=true;merr("Verificando...");
    try{const pw=$("#pw").value;KEYS=await adminUnlock(pw,$("#fpw").value);if(slotOf(ADMIN,pendingId).temp)return stepNewPw(pw);finishLogin(true)}
    catch(e){$("#ok").disabled=false;if(e.message==="fb"){$("#fbw").style.display="";merr($("#fpw").value?"Senha do Firebase incorreta.":"A senha do Firebase é diferente da senha de admin. Digite a do Firebase também.");$("#fpw").focus()}else merr("Senha incorreta.")}};
  $("#ok").onclick=go;onEnter(go);$("#back").onclick=stepId;
}
// primeiro acesso de um admin novo: troca a senha provisória pela senha dele
function stepNewPw(tmp){
  modal(`<h3>Crie a sua senha de admin</h3><p>Você entrou com a senha provisória. Agora crie a sua senha. Só você vai saber, e ela também vira a sua senha do banco do time.</p>
   <label for="np">Nova senha (mínimo 8 caracteres)</label><input data-slot="input" type="password" id="np"><label for="np2">Repita a senha</label><input data-slot="input" type="password" id="np2"><div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="default" id="ok">Salvar senha</button></div>`);
  const go=async()=>{const a=$("#np").value,b=$("#np2").value;if(a.length<8)return merr("Use pelo menos 8 caracteres.");if(a!==b)return merr("As senhas não são iguais.");if(a===tmp)return merr("Escolha uma senha diferente da provisória.");
    $("#ok").disabled=true;merr("Salvando...");
    try{await setSlot(meId(),await makeSlot(await slotRaw(ADMIN,meId(),tmp),a,false));await FB.au.updatePassword(FB.auth.currentUser,a);finishLogin(true)}
    catch(e){merr("Erro: "+e.message);$("#ok").disabled=false}};
  $("#ok").onclick=go;onEnter(go);
}
// grava (ou remove, com slot=null) a fechadura de um admin no admin.json do banco
async function setSlot(id,slot){
  const cur=await getJ("oficial","admin");if(!cur||await fingerprint(cur)!==await fingerprint(ADMIN))throw new Error("chave do admin no banco mudou");
  if(normId(id)===normId(cur.id))throw new Error("o admin principal não pode ser alterado aqui");
  const slots={...(cur.slots||{})};if(slot)slots[normId(id)]=slot;else delete slots[normId(id)];cur.slots=slots;
  await putJ("oficial","admin",cur);ADMIN=cur;
}
async function finishLogin(admin){
  lsSet(UKEY,{id:dispId(pendingId),admin,created:Date.now()});
  await enterTeam();
  if(TEAM)toast(`Bem-vindo, ${dispId(pendingId)}!`);
}
// depois do login: entra no time, ou mostra a tela de time
async function enterTeam(){
  if(user()?.admin&&fbIsAdmin()){try{if(await migrateToTeams())toast("Time Fraldinha montado com todos os usuários e as comps salvas",5000)}catch(e){toast("Não consegui montar o time Fraldinha: "+e.message,6000)}}
  try{await loadMembership()}catch(e){TEAM=null}
  updateStatus();
  if(TEAM){closeModal();await sync();if(currentScreen==="admin")renderAdmin();return}
  if(user()?.solo){closeModal();return}
  stepTeam();
}

/* ================= tela de time (sem time / pedido pendente) ================= */
async function stepTeam(){
  const u=user();if(!u)return stepId();
  if(MEMB?.status==="pendente"){
    modal(`<span class="eyebrow">${esc(u.id)}</span><h3>Aguardando o capitão</h3><p>Você pediu para entrar no time <b>${esc(MEMB.teamName||MEMB.team)}</b>. Assim que o capitão aceitar, as comps do time aparecem aqui.</p><div class="err"></div>
     <div class="row"><button data-slot="button" data-variant="outline" id="cancel">Cancelar pedido</button><button data-slot="button" data-variant="outline" id="solo">Usar sem time</button><button data-slot="button" data-variant="default" id="check">Verificar de novo</button></div>`);
    $("#cancel").onclick=async()=>{try{await dbDel("membros",meKey());MEMB=null;stepTeam()}catch(e){merr("Erro: "+e.message)}};
    $("#check").onclick=async()=>{merr("Verificando...");await enterTeam();if(!TEAM)merr("O capitão ainda não aceitou.")};
    $("#solo").onclick=useSolo;
    return;
  }
  let times=[];try{times=await dbList("times")}catch(e){}
  modal(`<span class="eyebrow">${esc(u.id)}</span><h3>Você ainda não está em um time</h3><p>Crie um time (você vira o capitão) ou peça para entrar em um time. Sem time, você pode montar comps, mas elas não são salvas.</p>
   <label for="tname">Criar um time</label><div class="rid"><input data-slot="input" id="tname" placeholder="Nome do time" maxlength="24" autocomplete="off"><button data-slot="button" data-variant="default" id="create">Criar time</button></div>
   ${times.length?`<label for="tjoin">Pedir para entrar em um time</label><div class="rid"><select id="tjoin" data-slot="select">${times.sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)} (capitão ${esc(t.captainId||t.captain)})</option>`).join("")}</select><button data-slot="button" data-variant="outline" id="join">Pedir para entrar</button></div>`:""}
   <div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="solo">Usar sem time</button></div>`);
  $("#solo").onclick=useSolo;
  $("#create").onclick=async()=>{const name=$("#tname").value.trim();if(name.length<2)return merr("Digite o nome do time.");
    if(times.some(t=>t.name.toLowerCase()===name.toLowerCase()))return merr("Já existe um time com esse nome.");
    $("#create").disabled=true;merr("Criando o time...");
    const id=name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,20)+"-"+Math.random().toString(36).slice(2,6);
    try{await dbSet("times",id,{name,captain:meKey(),captainId:u.id,created:Date.now()});
      await dbSet("membros",meKey(),{team:id,status:"ativo",riotId:u.id,at:Date.now()});
      await dbSet(`times/${id}/dados`,"oficial",{json:JSON.stringify({version:1,at:Date.now(),label:"Time criado",by:u.id,data:{comps:[],plays:[]},log:[]}),at:Date.now()});
      lsSet(UKEY,{...u,solo:false});await enterTeam();toast(`Time ${name} criado. Você é o capitão.`,5000)}
    catch(e){merr("Erro: "+e.message);$("#create").disabled=false}};
  const j=$("#join");if(j)j.onclick=async()=>{const t=$("#tjoin").value;j.disabled=true;
    try{await dbSet("membros",meKey(),{team:t,status:"pendente",riotId:u.id,at:Date.now()});lsSet(UKEY,{...u,solo:false});await enterTeam()}
    catch(e){merr("Erro: "+e.message);j.disabled=false}};
  $("#tname").addEventListener("keydown",e=>{if(e.key==="Enter")$("#create").click()});
}
// sem time: pode montar comps, mas nada é salvo (a cópia local é apagada ao recarregar)
function useSolo(){
  const u=user();lsSet(UKEY,{...u,solo:true});guardTeam();closeModal();updateStatus();
  toast("Usando sem time: as comps feitas não são salvas.",5000);
}

$("#logout").onclick=async()=>{
  if(!user())return stepId();
  if(!confirm("Sair deste usuário neste aparelho? As comps do time continuam salvas no banco do time."))return;
  localStorage.removeItem(UKEY);
  clearTeamData();
  await idbDel("adminKeys");
  KEYS=null;
  try{if(FB)await FB.au.signOut(FB.auth)}catch(e){}
  reloadCamp();
  updateStatus();
  pendingId=null;
  if(currentScreen==="admin"){
    writeRoute(routeRoots.camp);
    openRoute();
  }
  if(currentScreen==="camp"&&!$("#modal").open)stepId();
};

/* ================= aba Administração (admin e capitão) ================= */
const details=(title,body,open)=>`<details class="wl-panel card"${open?" open":""}><summary>${title}</summary><div style="margin-top:12px">${body}</div></details>`;
async function renderAdmin(){
  const el=$("#admin"),u=user();if(!u?.admin&&!isCaptain())return;
  if(!ONLINE){el.innerHTML=`<h2>Administração</h2><div class="wl-panel card">O banco online ainda não foi configurado neste app.</div>`;return}
  try{await fb()}catch(e){}
  if(u.admin){
    if(!ADMIN){try{await loadAdminKey()}catch(e){}}
    if(!ADMIN){el.innerHTML=`<h2>Administração</h2><div class="wl-panel card">Sem conexão com o banco do time. <button data-slot="button" data-variant="outline" id="refresh">Tentar de novo</button></div>`;$("#refresh").onclick=renderAdmin;return}
    if(!KEYS||!fbIsAdmin()){el.innerHTML=`<h2>Administração</h2><div class="wl-panel card"><p>Digite a senha de admin para desbloquear neste aparelho.</p><input data-slot="input" type="password" id="apw" aria-label="Senha de administrador" style="max-width:300px"> <span id="afw" style="display:none"><input data-slot="input" type="password" id="afpw" aria-label="Senha do Firebase" placeholder="Senha do Firebase" style="max-width:220px"></span> <button data-slot="button" data-variant="default" id="aok">Desbloquear</button> <span class="bad" id="aerr"></span></div>`;
      const go=async()=>{try{KEYS=await adminUnlock($("#apw").value,$("#afpw").value);await enterTeam();renderAdmin()}catch(e){if(e.message==="fb"){$("#afw").style.display="";$("#aerr").textContent="Digite também a senha do Firebase"}else $("#aerr").textContent="Senha incorreta"}};
      $("#aok").onclick=go;el.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")go()}));return}
  }
  el.innerHTML=`<h2>Administração</h2><p class="mut">Carregando...</p>`;
  let envs=[],pedidos=[],membros=[],contas=[],times=[],todos=[];
  try{
    if(TEAM)[envs,membros]=await Promise.all([dbList(teamPath("envios")),dbList("membros","team",TEAM.id)]);
    if(u.admin)[contas,times,todos]=await Promise.all([dbList("contas"),dbList("times"),dbList("membros")]);
  }catch(e){el.innerHTML=`<h2>Administração</h2><div class="wl-panel card bad">Não consegui ler o banco: ${esc(e.message)}</div>`;return}
  pedidos=membros.filter(m=>m.status==="pendente");const ativos=membros.filter(m=>m.status==="ativo");
  const done=new Set((OFF?.log||[]).map(l=>l.sid)),subs=[];
  for(const d of envs){try{const s=JSON.parse(d.json);s.doc=d.id;if(done.has(s.id)){await dbDel(teamPath("envios"),d.id).catch(()=>{});continue}subs.push(s)}catch(e){subs.push({id:d.id,doc:d.id,from:d.from,err:true})}}
  subs.sort((a,b)=>(a.at||0)-(b.at||0));
  const mine=pending(),tname=TEAM?esc(TEAM.name):"";
  const teamHtml=!TEAM?`<div class="wl-panel card mut">Você não está em um time. Os envios e pedidos aparecem aqui quando você for capitão de um time.</div>`:`
   <h2>Pedidos para entrar no ${tname} (${pedidos.length})</h2>
   <div class="wl-panel card">${pedidos.length?`<table><tr><th>Riot ID</th><th>Pedido em</th><th></th></tr>${pedidos.map(m=>`<tr><td>${esc(m.riotId||m.id)}</td><td>${m.at?fmtD(m.at):""}</td><td><button data-slot="button" data-variant="default" data-acc="${esc(m.id)}">Aceitar</button> <button data-slot="button" data-variant="destructive" data-den="${esc(m.id)}">Recusar</button></td></tr>`).join("")}</table>`:'<span class="mut">Nenhum pedido pendente.</span>'}</div>
   <h2>Envios aguardando aprovação (${subs.length})</h2>
   ${subs.length?subs.map((s,si)=>s.err?`<div class="wl-panel card"><span class="bad">Não consegui abrir o envio ${esc(s.id)} de ${esc(s.from)}.</span> <button data-slot="button" data-variant="destructive" data-delf="${si}">Apagar envio</button></div>`:`
    <div class="wl-panel card"><div class="hd"><b>${esc(s.from)}</b><span class="mut">${fmtD(s.at)} · baseado na v${s.baseVersion}${OFF&&s.baseVersion<OFF.version?` <span style="color:var(--gold)">(versão oficial agora é v${OFF.version})</span>`:""}</span></div>
     ${s.changes.map((c,ci)=>`<label class="chg"><input type="checkbox" data-s="${si}" data-c="${ci}" checked><div><span class="op ${c.op}">${OPN[c.op]}</span> ${KN[c.kind]} <b>${esc(itemName(c))}</b><div class="det">${describe(c)}</div></div></label>`).join("")}
     <div class="btns"><button data-slot="button" data-variant="default" data-ap="${si}">✓ Aprovar marcadas</button><button data-slot="button" data-variant="destructive" data-rj="${si}">✕ Recusar tudo</button></div></div>`).join(""):`<div class="wl-panel card mut">Nenhum envio pendente.</div>`}
   <h2>Minhas alterações</h2>
   <div class="wl-panel card">${mine.length?mine.map(c=>`<div class="chg"><div><span class="op ${c.op}">${OPN[c.op]}</span> ${KN[c.kind]} <b>${esc(itemName(c))}</b><div class="det">${describe(c)}</div></div></div>`).join("")+`<div class="btns"><button data-slot="button" data-variant="default" id="pubmine">Publicar como nova versão</button></div>`:'<span class="mut">Você não tem alterações locais além da versão oficial.</span>'}</div>
   ${details(`Membros do ${tname} (${ativos.length})`,`<table><tr><th>Riot ID</th><th>Papel</th><th></th></tr>${ativos.map(m=>`<tr><td>${esc(m.riotId||m.id)}</td><td>${m.id===TEAM.captain?"capitão":"membro"}</td><td>${m.id===TEAM.captain?"":`<button data-slot="button" data-variant="destructive" data-den="${esc(m.id)}">Tirar do time</button>`}</td></tr>`).join("")}</table>`)}
   ${details(`Histórico da versão oficial do ${tname} (v${OFF?.version??"-"})`,`<table><tr><th>Versão</th><th>Data</th><th>De</th><th>O quê</th><th>Status</th></tr>
    ${(OFF?.log||[]).slice().reverse().slice(0,150).map(l=>`<tr><td>v${l.v}</td><td>${fmtD(l.at)}</td><td>${esc(l.from)}</td><td><span class="op ${l.op}">${OPN[l.op]}</span> ${KN[l.kind]} ${esc(l.name)}</td><td class="${l.status==="approved"?"ok":"bad"}">${l.status==="approved"?"aprovada":"recusada"}</td></tr>`).join("")||'<tr><td colspan="5" class="mut">Ainda sem histórico.</td></tr>'}</table>`)}`;
  // usuários (só admin): contas + registros de time
  const tmap=new Map(times.map(t=>[t.id,t])),users=new Map();
  for(const c of contas)users.set(c.id,{key:c.id,riotId:c.riotId||c.id,conta:true});
  for(const m of todos){const o=users.get(m.id)||{key:m.id,riotId:m.riotId||m.id,conta:false};o.m=m;users.set(m.id,o)}
  for(const id of Object.keys(ADMINS)){const k=safeName(id),o=users.get(k)||{key:k,riotId:dispId(id)};o.conta=true;o.admin=true;users.set(k,o)}
  const ulist=[...users.values()].sort((a,b)=>a.riotId.localeCompare(b.riotId));
  const teamOpts=sel=>`<option value="">Sem time</option>${times.sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${esc(t.id)}"${t.id===sel?" selected":""}>${esc(t.name)}</option>`).join("")}`;
  const adminHtml=!u.admin?"":`
   ${details(`Usuários (${ulist.length})`,`<table><tr><th>Riot ID</th><th>Time</th><th>Situação</th><th></th></tr>
    ${ulist.map(x=>{const t=x.m&&tmap.get(x.m.team),cap=t&&t.captain===x.key;
      const st=!x.conta?'<span class="mut">ainda não criou a senha</span>':x.m?.status==="pendente"?'<span style="color:var(--gold)">pedido pendente</span>':cap?"capitão":x.m?"membro":'<span class="mut">sem time</span>';
      return`<tr><td>${esc(x.riotId)}${x.admin?' <small class="mut">admin</small>':""}</td><td><select data-slot="select" data-team="${esc(x.key)}" aria-label="Time de ${esc(x.riotId)}"${cap?' disabled title="Capitão: troque o capitão do time antes"':""}>${teamOpts(x.m?.team||"")}</select></td><td>${st}</td><td>${x.admin||x.key===meKey()?"":`<button data-slot="button" data-variant="destructive" data-delu="${esc(x.key)}">Excluir</button>`}</td></tr>`}).join("")||'<tr><td colspan="4" class="mut">Nenhum usuário ainda.</td></tr>'}</table>
    <p class="mut">Excluir tira o usuário do time e apaga o cadastro dele. Se ele entrar de novo, volta sem time e precisa ser aceito outra vez.</p>`)}
   ${details(`Times (${times.length})`,`<table><tr><th>Time</th><th>Capitão</th><th>Membros</th></tr>${times.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.captainId||t.captain)}</td><td>${todos.filter(m=>m.team===t.id&&m.status==="ativo").length}</td></tr>`).join("")}</table>`)}
   <h2>Admins</h2>
   <div class="wl-panel card"><table><tr><th>Riot ID</th><th>E-mail no banco</th><th>Situação</th><th></th></tr>
    ${Object.entries(ADMINS).map(([id,em])=>{const sl=slotOf(ADMIN,id),main=normId(id)===normId(ADMIN.id),me=normId(id)===normId(u.id);
      const st=main?"principal":!sl?'<span class="mut">não liberado</span>':sl.temp?'<span style="color:var(--gold)">aguardando o 1º acesso</span>':'<span class="ok">ativo</span>';
      return`<tr><td>${esc(dispId(id))}</td><td>${em?esc(em):'<span class="bad">falta o e-mail no app</span>'}</td><td>${st}</td><td>${main||me||!em?"":`<button data-slot="button" data-variant="outline" data-adm="${esc(id)}">${sl?"Nova senha provisória":"Liberar admin"}</button>`}${sl&&!main&&!me?` <button data-slot="button" data-variant="destructive" data-rmadm="${esc(id)}">Remover</button>`:""}</td></tr>`}).join("")}</table>
    <div id="admform" style="display:none;margin-top:10px"><p>Liberar <b id="admwho"></b>. Primeiro cadastre o e-mail dele no Firebase (Authentication › Usuários) com uma senha provisória. Depois digite aqui a mesma senha provisória e passe para ele. No primeiro acesso ele cria a senha dele.</p>
     <input data-slot="input" type="password" id="admmy" placeholder="Sua senha de admin" style="max-width:220px"> <input data-slot="input" type="password" id="admtmp" placeholder="Senha provisória dele" style="max-width:220px"> <button data-slot="button" data-variant="default" id="admok">Liberar</button> <span class="bad" id="admerr"></span></div></div>
   <h2>Banco e backup</h2><div class="wl-panel card"><span class="mut">Chave do admin: ${esc(KEYS.fp)}</span>
    <div class="btns"><button data-slot="button" data-variant="outline" id="exp">Baixar backup completo</button><button data-slot="button" data-variant="outline" id="lock">Bloquear admin neste aparelho</button><button data-slot="button" data-variant="outline" id="refresh">Atualizar</button></div>
    <p class="mut">Guarde o backup completo na pasta Admin do OneDrive de tempos em tempos.</p></div>
   ${details(`Versões da interface${(window.UI_VERSIONS||[])[0]?` <span class="mut">(atual: v${esc(window.UI_VERSIONS[0].version)})</span>`:""}`,(window.UI_VERSIONS||[]).map(v=>`<div style="margin-top:10px"><b>v${esc(v.version)}</b> <span class="mut">${esc(v.date.split("-").reverse().join("/"))}</span><ul style="margin:4px 0 0;padding-left:20px">${v.changes.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>`).join("")||'<span class="mut">Sem histórico.</span>')}`;
  el.innerHTML=teamHtml+adminHtml;
  const again=()=>renderAdmin();
  const pick=si=>{const s=subs[si],ap=[],rj=[];document.querySelectorAll(`[data-s="${si}"]`).forEach(cb=>{const c={...s.changes[+cb.dataset.c],sid:s.id,from:s.from};(cb.checked?ap:rj).push(c)});return{s,ap,rj}};
  el.querySelectorAll("[data-ap]").forEach(b=>b.onclick=async()=>{const{s,ap,rj}=pick(+b.dataset.ap);b.disabled=true;await publish(ap,rj,`Envio de ${s.from}`);await dbDel(teamPath("envios"),s.doc).catch(()=>{});again()});
  el.querySelectorAll("[data-rj]").forEach(b=>b.onclick=async()=>{const s=subs[+b.dataset.rj];if(!confirm(`Recusar todas as alterações de ${s.from}?`))return;b.disabled=true;await publish([],s.changes.map(c=>({...c,sid:s.id,from:s.from})),`Envio de ${s.from} recusado`);await dbDel(teamPath("envios"),s.doc).catch(()=>{});again()});
  el.querySelectorAll("[data-delf]").forEach(b=>b.onclick=async()=>{await dbDel(teamPath("envios"),subs[+b.dataset.delf].doc).catch(()=>{});again()});
  el.querySelectorAll("[data-acc]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await dbSet("membros",b.dataset.acc,{status:"ativo",at:Date.now()},true);toast("Jogador aceito no time")}catch(e){toast("Erro: "+e.message)}again()});
  el.querySelectorAll("[data-den]").forEach(b=>b.onclick=async()=>{const m=membros.find(x=>x.id===b.dataset.den);if(!confirm(`Tirar ${m?.riotId||b.dataset.den} do ${TEAM.name}?`))return;b.disabled=true;try{await dbDel("membros",b.dataset.den)}catch(e){toast("Erro: "+e.message)}again()});
  const pm=$("#pubmine");if(pm)pm.onclick=()=>publish(mine.map(c=>({...c,sid:"capitao",from:u.id})),[],"Alterações do capitão");
  if(!u.admin)return;
  el.querySelectorAll("[data-team]").forEach(s=>s.onchange=async()=>{const k=s.dataset.team,x=users.get(k);s.disabled=true;
    try{if(s.value)await dbSet("membros",k,{team:s.value,status:"ativo",riotId:x.riotId,at:Date.now()});else await dbDel("membros",k);
      toast(s.value?`${x.riotId} agora está no ${tmap.get(s.value).name}`:`${x.riotId} ficou sem time`);if(k===meKey())await enterTeam()}catch(e){toast("Erro: "+e.message)}again()});
  el.querySelectorAll("[data-delu]").forEach(b=>b.onclick=async()=>{const k=b.dataset.delu,x=users.get(k);if(!confirm(`Excluir o usuário ${x.riotId}? Ele sai do time e o cadastro é apagado.`))return;b.disabled=true;
    try{await dbDel("membros",k).catch(()=>{});await dbDel("contas",k);toast(`${x.riotId} excluído`)}catch(e){toast("Erro: "+e.message)}again()});
  let admId=null;
  el.querySelectorAll("[data-adm]").forEach(b=>b.onclick=()=>{admId=b.dataset.adm;$("#admwho").textContent=dispId(admId);$("#admform").style.display="";$("#admmy").focus()});
  $("#admok").onclick=async()=>{const t=$("#admtmp").value;if(t.length<6)return $("#admerr").textContent="A senha provisória precisa de 6 caracteres ou mais";
    $("#admok").disabled=true;$("#admerr").textContent="";
    try{await setSlot(admId,await makeSlot(await slotRaw(ADMIN,u.id,$("#admmy").value),t,true));toast(`${dispId(admId)} liberado como admin. Passe a senha provisória para ele.`,6000);again()}
    catch(e){$("#admerr").textContent=e.message==="noslot"?"Seu acesso de admin não foi encontrado":/decrypt|operation/i.test(e.message+e.name)?"Sua senha está incorreta":e.message;$("#admok").disabled=false}};
  el.querySelectorAll("[data-rmadm]").forEach(b=>b.onclick=async()=>{const id=b.dataset.rmadm;if(!confirm(`Remover ${dispId(id)} dos admins? Ele não vai mais conseguir entrar como admin.`))return;try{await setSlot(id,null);again()}catch(e){toast("Erro: "+e.message)}});
  $("#exp").onclick=exportBackup;
  $("#lock").onclick=async()=>{await idbDel("adminKeys");KEYS=null;try{await FB.au.signOut(FB.auth)}catch(e){}again()};
  $("#refresh").onclick=async()=>{await refreshTeam()};
}

/* ================= abas ================= */
const screens = { worlds: "./worlds.html", soloq: "./soloq.html", camp: "./camp.html" };
const loaded = new Map();
let currentScreen;
const routeRoots = { worlds: "/worlds", soloq: "/soloq", camp: "/time", admin: "/admin" };
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
  frame.addEventListener("weblol:route-ready", () => applyFrameRoute(frame));
  frame.addEventListener("load", () => {
    if (!frame.hasAttribute("srcdoc")) return;
    frame.dataset.ready = "true";
    if (frame.id === "v-" + currentScreen) $("#screen-loading").hidden = true;
    applyFrameRoute(frame);
  });
  frame.addEventListener("weblol:navigate", ({ detail }) => {
    if (frame.id !== "v-" + currentScreen) return;
    writeRoute(detail.path, detail.replace);
    if (detail.copy) void copyCurrentLink();
  });
}

function openRoute() {
  const shortChampionRoute = location.hash.match(/^#\/?((?:builds|campeoes)(?:\/[a-z0-9-]+)?(?:\?.*)?)$/);
  if (shortChampionRoute) writeRoute("/worlds/" + shortChampionRoute[1], true);
  const { screen } = readRoute();
  if (!screen) writeRoute(routeRoots.worlds, true);
  show(screen || "worlds");
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
        $("#screen-loading").hidden = true;
        const error = $("#screen-error");
        error.textContent = "Não foi possível carregar esta área. Selecione a aba para tentar novamente.";
        error.hidden = false;
      }
    }
  }
}

function show(t) {
  if(t==="admin"&&!user()?.admin&&!isCaptain())t="camp";
  currentScreen = t;
  $("#header-tools").hidePopover();
  $("#screen-error").hidden = true;
  $("#screen-loading").hidden = t === "admin" || $("#v-" + t).dataset.ready === "true";
  document.body.dataset.currentScreen = t;
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("on", view.id === "v-" + t));
  if (t === "admin") renderAdmin();
  else void loadScreen(t);
  lsSet("lol-aba-principal", t);
}

reloadCamp = () => {
  const source = loaded.get("camp");
  if (source) source.then(html => { $("#v-camp").srcdoc = html; }, () => {});
};
$("#top").addEventListener("click", event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[data-section]");
  if (!link) return;
  event.preventDefault();
  const section = link.dataset.section;
  if (section === currentScreen && readRoute().screen === currentScreen) return;
  writeRoute(routeRoots[section]);
  openRoute();
});

/* ================= início ================= */
(async function init(){
  if(user()?.solo)localStorage.removeItem(KEY); // sem time: nada fica salvo entre uma visita e outra
  KEYS=user()?.admin?await idbGet("adminKeys"):null;
  updateStatus();
  openRoute();
  if(user()&&ONLINE){
    setSync("Conectando ao time…","");
    try{await fb()}catch(e){}
    if(FB&&!signedAs(user().id)){
      // login antigo (sem senha) ou sessão expirada: pede para entrar de novo com a senha
      pendingId=user().id;localStorage.removeItem(UKEY);clearTeamData();KEYS=null;reloadCamp();updateStatus();
      if(currentScreen==="admin"){writeRoute(routeRoots.camp);openRoute()}
      if(!$("#modal").open)stepId();
      toast("Agora cada jogador entra com Riot ID e senha. Crie a sua senha para continuar.",7000);
    }else if(FB){
      if(user().admin)try{await loadAdminKey()}catch(e){}
      await enterTeam();
    }
  }
  setInterval(async()=>{
    if(!ONLINE||!user()||!FB?.auth.currentUser)return;
    if(!TEAM){
      if(MEMB?.status!=="pendente")return;
      try{await loadMembership()}catch(e){return}
      if(TEAM){toast(`Você foi aceito no time ${TEAM.name}!`,6000);if($("#modal").open)closeModal();await sync()}
      return;
    }
    let result;
    try{result=await readOfficial()}catch(e){return}
    if(result.off&&(!NET||!OFF||result.off.version!==OFF.version)){
      const newVersion=result.off.version!==OFF?.version;
      await sync();
      if(NET&&newVersion)toast(`Nova versão oficial v${OFF.version} carregada`);
    }
  },60000);
})();

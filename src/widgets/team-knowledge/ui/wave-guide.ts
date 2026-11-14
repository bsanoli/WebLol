import { iconMarkup } from "@/shared/ui/icon"
import { gameIconMarkup } from "./game-icon"

export const WAVE_HTML=`
<div class="warn">${iconMarkup("book")} Guia de controle de wave para a temporada 2026. Os números da wave são das notas dos patches 26.1 e 26.9. As técnicas (freeze, slow push, etc.) são os fundamentos de sempre, ajustados aos tempos novos.</div>

<h2 class="ks">Números da wave em 2026</h2>
<table>
<tr><td style="width:230px;color:var(--gold)">1ª wave</td><td>Sai da base aos <b>0:30</b> (antes era 1:05).</td></tr>
<tr><td style="color:var(--gold)">Intervalo entre waves</td><td><b>30s</b> até 14:00 · <b>25s</b> de 14:00 a 30:00 · <b>20s</b> depois dos 30:00.</td></tr>
<tr><td style="color:var(--gold)">Composição</td><td>3 melee + 3 casters. A partir dos 14:00 a wave com canhão vem com 1 melee a menos; depois dos 30:00 vem 1 melee e 1 caster a menos.</td></tr>
<tr><td style="color:var(--gold)">Wave de canhão</td><td>1º canhão na <b>3ª wave</b>, depois a cada 3 waves no início, a cada 2 waves no meio do jogo e em toda wave no fim (aprox. a partir dos 25:00).</td></tr>
<tr><td style="color:var(--gold)">Ouro</td><td>Melee 20 · caster ~14 · canhão 50+ (sobe com o tempo). Uma wave inteira vale ~125 a 195 de ouro.</td></tr>
<tr><td style="color:var(--gold)">Força dos minions</td><td>Ganham vida e dano a cada 90s (a cada 3 waves). No 26.9 as waves ficaram mais resistentes no meio e no fim da fase de rotas, então leva mais tempo para limpar.</td></tr>
<tr><td style="color:var(--gold)">Velocidade</td><td>Os minions andam mais rápido: 350 → 450 conforme o jogo avança. As waves chegam mais cedo e rotações ficam mais apertadas.</td></tr>
<tr><td style="color:var(--gold)">Super minions</td><td>Saem em <b>toda wave</b> enquanto o inibidor estiver caído.</td></tr>
<tr><td style="color:var(--gold)">Torres</td><td>Placas agora são <b>permanentes</b> e existem também nas torres internas e de inibidor. Wave grande batendo na torre vira ouro de placa o jogo todo.</td></tr>
</table>

<h2 class="ks">Quem a wave favorece</h2>
<div class="kgrid">
 <div class="wl-panel obj"><h3>A wave empurra para quem…</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">• tem <b>mais minions vivos</b> (um caster a mais já faz diferença)<br>• tem o <b>canhão</b> na wave (canhão vivo = wave mais forte)<br>• matou a wave inimiga primeiro (a próxima wave dele chega e empurra)<br>• tem campeão com <b>limpeza em área</b> ou mais nível<br>• tem o <b>caçador por perto</b> (pode empurrar sem medo)</p></div>
 <div class="wl-panel obj"><h3>Onde a wave está</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">• <b>Perto da SUA torre:</b> você está seguro, o inimigo fica exposto ao gank e perde farm se não chegar perto.<br>• <b>No meio:</b> neutra, ninguém tem vantagem grande.<br>• <b>Perto da torre DELE:</b> você tem prioridade (pode sair da lane primeiro), mas está exposto a gank.</p></div>
 <div class="wl-panel obj"><h3>Prioridade (prio)</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">Ter <b>prio</b> é ter a wave empurrada para o lado inimigo. Quem tem prio chega primeiro no rio, no dragão, nas vastilarvas e no arauto. Antes de qualquer objetivo, o time precisa de prio em mid e na lane do lado do objetivo.</p></div>
</div>

<h2 class="ks">Técnicas</h2>
<div class="kgrid wv">
 <div class="wl-panel obj"><h3>${iconMarkup("freeze")} Freeze (congelar)</h3>
  <div class="lanefig"><span class="tw b">${gameIconMarkup("tower")}</span><span class="zone">zona do freeze</span><span class="mm b">●●</span><span class="mm r">●●●●●</span><span class="tw r">${gameIconMarkup("tower")}</span></div>
  <p><b>O que é:</b> segurar a wave parada logo <b>fora do alcance da sua torre</b>, só dando last hit.</p>
  <p><b>Como:</b> a wave inimiga precisa ser maior que a sua (uns 3–4 minions a mais) para ficar parada ali. Deixe a wave vir até você, só dê o último golpe e não bata nos minions à toa. Se a sua wave estiver grande demais, deixe ela bater na torre inimiga e monte o freeze com a próxima.</p>
  <p><b>Quando:</b> você está na frente e quer negar farm/XP; o caçador inimigo está do outro lado do mapa; o inimigo não tem como quebrar o freeze sem se arriscar.</p>
  <p><b>Cuidado:</b> freeze não gera prio. Você fica preso na lane e não ajuda em objetivo.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("layers")} Slow push (empilhar)</h3>
  <p><b>O que é:</b> matar só os casters (ou só last hit) para a sua wave sobreviver e se somar com a próxima. Em 2–3 waves vira uma wave gigante.</p>
  <p><b>Quando:</b> antes de um dive; antes de voltar para a base com a wave batendo na torre; para criar pressão enquanto o time faz objetivo do outro lado; quando o canhão está chegando.</p>
  <p><b>Dica:</b> comece o slow push logo depois que a wave "resetou" no meio. O ideal é a wave grande chegar na torre na mesma hora que o seu caçador.</p></div>
 <div class="wl-panel obj"><h3>${gameIconMarkup("push")} Fast push (empurrar rápido)</h3>
  <p><b>O que é:</b> matar a wave o mais rápido possível com habilidades.</p>
  <p><b>Quando:</b> para dar <b>recall</b> sem perder farm; para <b>rotacionar</b> (roam, ajudar no rio); para ter <b>prio</b> antes de dragão, vastilarvas, arauto ou barão; quando o inimigo precisa voltar para a base.</p>
  <p><b>Cuidado:</b> empurrar rápido sem motivo deixa a wave perto da torre inimiga e você exposto a gank.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("reset")} Crash e reset</h3>
  <p><b>O que é:</b> levar uma wave grande até bater na torre inimiga.</p>
  <p><b>Por que:</b> o inimigo perde minions embaixo da torre (difícil de farmar) e a wave "volta" (bounce) para o meio ou para você. É o melhor momento para dar recall: você volta e a wave ainda não chegou na sua torre.</p>
  <p><b>Melhor momento:</b> crashar a <b>wave de canhão</b>, que dura mais embaixo da torre.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("undo")} Puxar a wave (pull)</h3>
  <p><b>O que é:</b> trazer a wave para mais perto da sua torre de propósito.</p>
  <p><b>Como:</b> pare de bater na wave e fique atrás; ou ataque o campeão inimigo perto dos minions dele para eles virarem em você e você recua andando (eles te seguem). Os minions inimigos vão andar até você.</p>
  <p><b>Quando:</b> para montar um freeze; quando você está mais fraco e precisa farmar seguro; quando o caçador inimigo está perto da sua lane.</p></div>
 <div class="wl-panel obj"><h3>${gameIconMarkup("tower")} Stack para dive</h3>
  <p><b>Receita:</b> 2–3 waves empilhadas (slow push) + caçador ou suporte perto + inimigo com pouca vida ou sem Flash.</p>
  <p><b>Timing:</b> entre logo que a wave grande chegar na torre: os minions tomam os tiros e a torre troca de alvo. Quem toma o primeiro tiro sai do alcance e outro segura a torre.</p>
  <p><b>Não mergulhe</b> sem wave: a torre só bate em vocês. Em 2026 a placa quebrada dá <b>20s de resistência extra</b> à torre (Bulwark), então dive depois de quebrar placas fica mais caro.</p></div>
</div>

<h2 class="ks">O que fazer em cada situação</h2>
<table><tr><th>Situação</th><th>O que fazer com a wave</th></tr>
<tr><td>Vou dar recall</td><td>Fast push ou crash a wave na torre e volte. Melhor ainda numa wave de canhão.</td></tr>
<tr><td>Dragão / vastilarvas / arauto em ~1 min</td><td>Mid e a lane do lado do objetivo empurram para ter prio. Bot e mid chegam primeiro no dragão; top e mid nas vastilarvas e no arauto.</td></tr>
<tr><td>Estou na frente na lane</td><td>Freeze perto da sua torre ou slow push para dive com o caçador.</td></tr>
<tr><td>Estou atrás na lane</td><td>Puxe a wave para perto da sua torre e farme seguro. Não brigue pela wave.</td></tr>
<tr><td>Inimigo deu recall</td><td>Slow push: quando ele voltar, encontra uma wave grande batendo na torre e perde farm/placa.</td></tr>
<tr><td>Inimigo sumiu do mapa</td><td>Não empurre além do meio sem visão. Wave perto da sua torre é a mais segura.</td></tr>
<tr><td>Quero roamar (mid/sup)</td><td>Fast push primeiro. Se a wave estiver indo para a sua torre, você perde farm e XP.</td></tr>
<tr><td>Inimigo freezou em mim</td><td>Chame o caçador para quebrar junto, ou dê recall e volte com a próxima wave. Não force sozinho.</td></tr>
<tr><td>Barão / fim de jogo</td><td>Empurre as side lanes antes do objetivo (as waves chegam a cada 20–25s). Waves no lado inimigo puxam a atenção dele.</td></tr>
</table>

<h2 class="ks">Erros comuns</h2>
<table>
<tr><td style="width:230px;color:var(--red)">Empurrar sem motivo</td><td>Wave perto da torre inimiga sem visão = gank fácil.</td></tr>
<tr><td style="color:var(--red)">Recall com a wave vindo</td><td>Você perde a wave inteira na sua torre (e a torre pode perder placa).</td></tr>
<tr><td style="color:var(--red)">Dive sem wave</td><td>A torre só tem você para bater.</td></tr>
<tr><td style="color:var(--red)">Ir para objetivo sem prio</td><td>O inimigo chega primeiro e você briga em desvantagem.</td></tr>
<tr><td style="color:var(--red)">Esquecer o canhão</td><td>Canhão vivo muda quem empurra. Conte as waves: 3ª wave e depois a cada 3 no começo.</td></tr>
</table>
<p style="color:var(--mut);font-size:12px;margin-top:18px">Fontes: <a style="color:var(--acc)" href="https://www.riftpatchnotes.com/lol/system/minions" target="_blank">riftpatchnotes — Minions (26.1, 26.9, 26.10)</a> · <a style="color:var(--acc)" href="https://www.leagueoflegends.com/news/dev/dev-2026-season-one-gameplay-preview/" target="_blank">Riot — /dev 2026 Season One</a> · <a style="color:var(--acc)" href="https://www.nerfplz.com/2026/10/minions-in-lol-10-rules-wave-plays-by.html" target="_blank">nerfplz — Minions in LoL</a></p>`;

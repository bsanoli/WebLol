// @ts-nocheck -- Integração legada com o DOM; os módulos extraídos mantêm seus tipos próprios.
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { Checkbox } from "@/shared/ui/checkbox"
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover"
import { ExistingContent, showDialog } from "@/shared/ui/dialog-controls"
import { Button } from "@/shared/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import DATA from "@dataset/summary"
import { compCard } from "./match-card"
import { lolKey } from "@/entities/champion"
import { ico } from "@/entities/champion"
import { LANES, esc, championSlug, teamLogo, teamRegion } from "@/entities/match"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom";
let compActionsRoot, compStageRoot;
const compositionPopovers = [];
function wireFloatingPicker(trigger, picker, search) {
  const anchor = document.createElement("span");
  trigger.before(anchor);
  const root = createRoot(anchor);
  compositionPopovers.push(root);
  picker.remove();
  picker.hidden = false;
  let open = false;
  const setOpen = next => {
    if (next) for (const other of compositionPopovers) {
      if (other !== root) other.dismiss?.();
    }
    open = next;
    trigger.setAttribute("aria-expanded", String(open));
    root.render(createElement(Popover, { open, onOpenChange: setOpen },
      createElement(PopoverAnchor, { virtualRef: { current: trigger } }),
      createElement(PopoverContent, {
        align: "start", className: "wl-composition-popover", "aria-label": picker.getAttribute("aria-label"),
        onOpenAutoFocus: event => { event.preventDefault(); search().focus(); },
        onCloseAutoFocus: event => event.preventDefault(),
        onInteractOutside: event => {
          if (trigger.contains(event.target)) event.preventDefault();
        },
        onEscapeKeyDown: () => trigger.focus(),
      }, createElement(ExistingContent, { element: picker }))));
  };
  root.dismiss = () => { if (open) setOpen(false); };
  trigger.onclick = () => setOpen(!open);
  return () => { setOpen(false); trigger.focus(); };
}
const compChampionLanes = new Map();
for (const game of DATA.comps) {
  for (const [lane, blue, , , red] of game.p) {
    for (const name of [blue, red]) {
      if (!compChampionLanes.has(name)) compChampionLanes.set(name, new Set());
      compChampionLanes.get(name).add(lane);
    }
  }
}
const compChampions = new Map(
  [...compChampionLanes.keys()]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map(name => [championSlug(name), name]),
);
let cTeam="",cQ="",cSt="",cChamps=new Set();
let cWinsOnly = false;
const teamFilterLabel = () => cTeam ? `${teamLogo(cTeam)}<span class="comp-team-name" title="${esc(cTeam)}">${esc(cTeam)}</span>` : "Todos os times";
function compPicker({id, label, value, hint, options, image, search, empty, clear, category}) {
  return `<div class="comp-picker-field"><span>${label}</span>
    <button id="${id}" class="comp-picker-trigger" type="button" data-slot="button" data-variant="outline" aria-haspopup="dialog" aria-expanded="false"${hint ? ` aria-describedby="${hint}"` : ""}>
      <span class="comp-picker-value">${value}</span>${iconMarkup("descending")}
    </button>
    <div id="${id}-picker" class="comp-picker" role="group" aria-label="Filtro de ${label.toLowerCase()}" hidden>
      <input data-slot="input" class="comp-picker-search" type="search" aria-label="${search}" placeholder="${search}">
      <div class="comp-picker-categories" role="group" aria-label="${category.label}">
        <button type="button" data-category="" data-slot="button" data-variant="outline" aria-pressed="true">${category.all}</button>
        ${category.values.map(name => `<button type="button" data-category="${esc(name)}" data-slot="button" data-variant="outline" aria-label="${esc(name)}" title="${esc(name)}" aria-pressed="false">${category.icon ? category.icon(name) : esc(name)}</button>`).join("")}
      </div>
      <div class="comp-picker-grid" role="group" aria-label="${label} disponíveis">
        ${[...options].map(([key, name]) => `<button type="button" data-option="${esc(key)}" data-categories="${esc(category.forName(name).join(","))}" aria-label="${esc(name)}" aria-pressed="false" title="${esc(name)}">${image(name)}<span class="comp-picker-check">${iconMarkup("check")}</span></button>`).join("")}
      </div>
      <p class="comp-filter-hint" role="status" hidden>${empty}</p>
      <div class="comp-picker-actions">
        <button type="button" data-picker-clear data-slot="button" data-variant="ghost">${iconMarkup("reset")} ${clear}</button>
      </div>
    </div>
  </div>`;
}
function compsView(){
  const teams=[...new Set(DATA.comps.flatMap(g=>[g.b,g.r]))].sort();
  return `<section class="worlds-compositions" aria-labelledby="comps-title">
    <div class="comps-intro">
      <h2 id="comps-title">Composições do Worlds</h2>
      <p class="hint">Compare campeões, jogadores e KDA nas cinco rotas de cada partida. A base reúne ${DATA.mgames} jogos com draft completo.</p>
    </div>
    <div class="wl-panel comp-filters" role="group" aria-label="Filtrar jogos">
      <label for="cq">Buscar<input data-slot="input" id="cq" type="search" placeholder="Campeão ou jogador" value="${esc(cQ||"")}"></label>
      ${compPicker({id:"cc", label:"Campeões", value:`${iconMarkup("champion-add")} Escolher campeões`, hint:"cc-hint",
        options:compChampions, image:ico, search:"Buscar campeão", empty:"Nenhum campeão encontrado.", clear:"Limpar seleções",
        category:{label:"Rota jogada no Worlds", all:"Todas", values:LANES.map(([lane]) => lane), icon:laneIconMarkup, forName:name => [...compChampionLanes.get(name)]}})}
      ${compPicker({id:"ct", label:"Times", value:teamFilterLabel(),
        options:teams.map(team => [team, team]), image:teamLogo, search:"Buscar time", empty:"Nenhum time encontrado.", clear:"Todos os times",
        category:{label:"Região", all:"Todas", values:[...new Set(teams.map(teamRegion).filter(Boolean))].sort(), forName:name => [teamRegion(name)]}})}
      <div class="comp-picker-field"><span id="comp-stage-label">Fase</span><div id="comp-stage"></div></div>
      <div id="comp-filter-actions" class="comp-filter-actions"></div>
      <p id="cc-hint" hidden>A partida precisa ter todos os campeões selecionados, em qualquer lado.</p>
      <div id="cc-active" class="comp-filter-chips" role="group" aria-label="Campeões selecionados" hidden></div>
    </div>
    <p class="comp-count" id="cn" role="status"></p>
    <div class="cgrid" id="cl"></div>

  </section>`;
}
function wireCompPicker(id, {isSelected, onSelect, onClear}) {
  const trigger = document.getElementById(id);
  const picker = document.getElementById(`${id}-picker`);
  const search = picker.querySelector("input");
  const grid = picker.querySelector(".comp-picker-grid");
  const categories = picker.querySelector(".comp-picker-categories");
  let category = "";
  const empty = picker.querySelector('[role="status"]');
  const clear = picker.querySelector("[data-picker-clear]");
  const options = [...grid.querySelectorAll("button")].map(button => ({
    button,
    name: lolKey(button.getAttribute("aria-label")),
    code: button.querySelector("[data-team]")?.dataset.team || "",
    categories: button.dataset.categories.split(","),
  }));
  const close = wireFloatingPicker(trigger, picker, () => search);
  const filterOptions = () => {
    const query = lolKey(search.value);
    for (const option of options) {
      const matchesCategory = !category || option.categories.includes(category);
      option.button.hidden = !matchesCategory || !(option.name.includes(query) || option.code.includes(query));
    }
    empty.hidden = options.some(({button}) => !button.hidden);
    grid.scrollTop = 0;
  };
  const setCategory = value => {
    category = value;
    for (const chip of categories.querySelectorAll("button")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.category === category));
    }
    filterOptions();
  };
  categories.onclick = e => {
    const chip = e.target.closest("button[data-category]");
    if (chip) setCategory(chip.dataset.category);
  };
  search.oninput = filterOptions;
  grid.onclick = e => {
    const option = e.target.closest("button[data-option]");
    if (option) onSelect(option.dataset.option);
  };
  clear.onclick = () => {
    if (clear.getAttribute("aria-disabled") !== "true") onClear();
  };
  return {trigger, close, resetBrowseFilters() {
    search.value = "";
    setCategory("");
  }, sync() {
    let hasSelection = false;
    for (const {button} of options) {
      const selected = isSelected(button.dataset.option);
      button.setAttribute("aria-pressed", String(selected));
      hasSelection ||= selected;
    }
    clear.setAttribute("aria-disabled", String(!hasSelection));
  }};
}
function wireComps(publishWorlds){
  const order=g=>{const m=g.s.match(/(\d+)/g)||[];const base=g.s.startsWith('play')?0:g.s.includes('quarter')?200:g.s.includes('semi')?300:g.s.includes('final')?400:100;return base+(+m[0]||0)*10+(+m[1]||0)/100};
  const all=DATA.comps.slice().sort((a,b)=>order(b)-order(a)||a.g-b.g);
  const matchGrid = document.getElementById("cl");

  matchGrid.onclick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(".match-draft-toggle");
    if (!button) return;
    const card = button.closest(".cg").cloneNode(true) as HTMLElement;
    const panel = card.querySelector<HTMLElement>(".match-draft");
    const title = panel.querySelector<HTMLElement>(".match-draft-title");
    panel.id = "active-match-draft";
    title.id = "active-match-draft-title";
    panel.setAttribute("aria-labelledby", title.id);
    panel.hidden = false;
    const closeButton = card.querySelector<HTMLButtonElement>(".match-draft-toggle");
    closeButton.removeAttribute("aria-haspopup");
    closeButton.removeAttribute("aria-controls");
    closeButton.classList.remove("worlds-detail-action");
    closeButton.classList.replace("match-draft-toggle", "match-dialog-close");
    closeButton.dataset.variant = "ghost";
    closeButton.dataset.size = "icon-lg";
    closeButton.setAttribute("aria-label", "Fechar draft");
    closeButton.innerHTML = iconMarkup("close");
    closeButton.onclick = () => closeDraft();
    const controls = document.createElement("div");
    controls.className = "match-dialog-controls";
    controls.append(closeButton);
    const content = document.createElement("div");
    content.append(controls, card);
    let closeDraft;
    closeDraft = showDialog({ title: "Detalhes da partida e draft", children: content,
      className: "match-dialog", initialFocus: () => closeButton });
    const modeButtons = panel.querySelectorAll<HTMLButtonElement>("[data-draft-mode]");
    for (const mode of modeButtons) {
      mode.onclick = () => {
        const chronological = mode.dataset.draftMode === "order";
        for (const button of modeButtons) button.setAttribute("aria-pressed", String(button === mode));
        for (const view of panel.querySelectorAll<HTMLElement>(".match-draft-team-view")) view.hidden = chronological;
        for (const view of panel.querySelectorAll<HTMLElement>(".match-draft-order-view")) view.hidden = !chronological;
      };
    }
  };
  const activeChampions = document.getElementById("cc-active");
  const search = document.getElementById("cq");
  const stages = [...new Set(all.map(game => game.st))];
  compStageRoot = createRoot(document.getElementById("comp-stage"));
  const drawStage = () => {
    compStageRoot.render(createElement(Select, {
      value: cSt || "all",
      onValueChange: value => {
        cSt = value === "all" ? "" : value;
        drawStage();
        updateResults();
      },
    },
    createElement(SelectTrigger, {
      id: "cs",
      className: "comp-picker-trigger comp-stage-trigger",
      "data-slot": "button",
      "data-variant": "outline",
      "aria-labelledby": "comp-stage-label cs",
    }, createElement(SelectValue)),
    createElement(SelectContent, {
      className: "team-select-panel",
      position: "popper",
      align: "start",
      collisionPadding: 8,
    },
    createElement(SelectGroup, null, createElement(SelectItem, { value: "all" }, "Todas as fases"),
    ...stages.map(stage => createElement(SelectItem, { key: stage, value: stage }, stage))))));
  };
  const hasFilters = () => Boolean(cQ || cTeam || cSt || cChamps.size || cWinsOnly);
  compActionsRoot = createRoot(document.getElementById("comp-filter-actions"));
  const drawActions = () => {
    compActionsRoot.render([
      createElement("label", { key: "wins", className: "comp-wins-label" },
      createElement(Checkbox, {
        className: "comp-wins-check",
        checked: cWinsOnly,
        "aria-describedby": "cc-hint",
        onCheckedChange: checked => {
          cWinsOnly = checked === true;
          updateResults();
        },
      }),
      "Só vitórias",
      ),
      createElement(Button, {
        key: "clear",
        id: "comp-clear-all",
        variant: "ghost",
        size: "sm",
        "aria-label": "Limpar todos os filtros",
        "aria-disabled": !hasFilters(),
        onClick: clearFilters,
      },
      createElement("svg", { className: "icon", "aria-hidden": true },
        createElement("use", { href: "assets/icons.svg#reset" })),
      "Limpar"),
    ]);
  };
  const drawChampions = () => {
    championPicker.sync();
    activeChampions.hidden = cChamps.size === 0;
    activeChampions.innerHTML = [...cChamps].map(slug => {
      const name = compChampions.get(slug);
      return `<button type="button" data-slot="button" data-variant="outline" data-champion="${slug}" aria-label="Remover ${esc(name)} do filtro">${ico(name)}${esc(name)}${iconMarkup("close")}</button>`;
    }).join("");
  };
  const draw=()=>{
    drawActions();
    const q=(cQ||"").trim().toLowerCase();
    const champions = [...cChamps].map(slug => compChampions.get(slug));
    document.getElementById("cc-hint").textContent = cWinsOnly
      ? "Os campeões selecionados, o time e a busca precisam corresponder ao lado vencedor."
      : "A partida precisa ter todos os campeões selecionados, em qualquer lado.";
    const L = all.filter(g => {
      const championColumns = cWinsOnly ? [g.bw ? 1 : 4] : [1, 4];
      const teamMatches = cWinsOnly ? (g.bw ? g.b : g.r) === cTeam : g.b === cTeam || g.r === cTeam;
      return (!cTeam || teamMatches) &&
        (!cSt || g.st === cSt) &&
        champions.every(name => g.p.some(row => championColumns.some(column => row[column] === name))) &&
        (!q || g.p.some(row => championColumns.some(column =>
          row[column].toLowerCase().includes(q) || row[column + 1].toLowerCase().includes(q)
        )));
    });
    let extra="";
    if(cTeam){const w=L.filter(g=>(g.b===cTeam)===g.bw).length;extra=`<span>${esc(cTeam)} · ${w} vitórias · ${L.length-w} derrotas</span>`}
    document.getElementById('cn').innerHTML=`<strong>${L.length} jogo${L.length===1?'':'s'}</strong>${extra}`;
    const highlightedChampions = new Set(champions);
    matchGrid.innerHTML=L.map((g,index)=>compCard(g,q,highlightedChampions,index)).join("")||'<div class="empty-state"><h3>Nenhum jogo encontrado</h3><p>Remova um campeão ou ajuste os outros filtros para ver mais partidas.</p></div>';
  };
  const publish = (replace = false) => publishWorlds("comps", [], {time:cTeam, fase:cSt, busca:cQ, campeoes:[...cChamps].join(","), vitorias:cWinsOnly ? "1" : ""}, replace);
  const updateResults = () => {
    draw();
    enhanceAnalyticsUI();
    publish();
  };
  const updateChampions = () => {
    drawChampions();
    updateResults();
  };
  const championPicker = wireCompPicker("cc", {
    isSelected: slug => cChamps.has(slug),
    onSelect: slug => {
      if (cChamps.has(slug)) cChamps.delete(slug);
      else cChamps.add(slug);
      updateChampions();
    },
    onClear: () => {
      cChamps.clear();
      updateChampions();
    },
  });
  const drawTeam = () => {
    teamPicker.trigger.querySelector(".comp-picker-value").innerHTML = teamFilterLabel();
    teamPicker.sync();
  };
  const selectTeam = team => {
    cTeam = team;
    drawTeam();
    teamPicker.close();
    updateResults();
  };
  const teamPicker = wireCompPicker("ct", {
    isSelected: team => team === cTeam,
    onSelect: selectTeam,
    onClear: () => selectTeam(""),
  });
  activeChampions.onclick = e => {
    const button = e.target.closest("button[data-champion]");
    if (!button) return;
    cChamps.delete(button.dataset.champion);
    updateChampions();
    championPicker.trigger.focus();
  };
  search.oninput = () => { cQ=search.value; draw(); enhanceAnalyticsUI(); publish(true); };
  function clearFilters() {
    if (!hasFilters()) return;
    search.value = cQ = "";
    cSt = "";
    drawStage();
    cTeam = "";
    cWinsOnly = false;
    cChamps.clear();
    championPicker.resetBrowseFilters();
    teamPicker.resetBrowseFilters();
    drawTeam();
    updateChampions();
  }
  teamPicker.sync();
  drawChampions();
  drawStage();
  draw();
  enhanceAnalyticsUI();
}

export function setCompositionRoute(query, params) {
  cQ = query;
  cTeam = params.get("time") || "";
  cWinsOnly = params.get("vitorias") === "1";
  cSt = params.get("fase") || "";
  cChamps = new Set((params.get("campeoes") || "").split(",").filter(slug => compChampions.has(slug)));
  if (!DATA.comps.some(game => game.b === cTeam || game.r === cTeam)) cTeam = "";
  if (!DATA.comps.some(game => game.st === cSt)) cSt = "";
}
export function disposeCompositions() {
  for (const root of compositionPopovers.splice(0)) root.unmount();
  compActionsRoot?.unmount();
  compActionsRoot = undefined;
  compStageRoot?.unmount();
  compStageRoot = undefined;
}
export { compsView, wireComps };

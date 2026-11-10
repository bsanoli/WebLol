import { iconMarkup } from "./icon"
import type { BuildDetail } from "./lol-media"

const glossary = [
  { terms: ["ao contato"], definition: "Efeito aplicado quando um ataque acerta. Algumas habilidades também aplicam efeitos ao contato." },
  { terms: ["estase"], definition: "A unidade fica invulnerável e inalvejável, mas também fica impedida de agir." },
  { terms: ["inalvejável"], definition: "A unidade deixa de ser um alvo válido para novos ataques e habilidades. Efeitos já aplicados podem continuar." },
  { terms: ["ferimento", "ferimentos", "feridas graves"], definition: "Reduz a cura e a recuperação de Vida que o alvo recebe.", tone: "damage" },
  { terms: ["tenacidade"], definition: "Encurta a duração da maioria dos efeitos de controle de grupo. Não reduz, por exemplo, arremessos ao ar ou supressão." },
  { terms: ["letalidade"], definition: "Penetração de Armadura fixa. Cada ponto faz seu dano físico ignorar um ponto de Armadura do alvo.", tone: "damage" },
  { terms: ["penetração de armadura"], definition: "Faz seu dano físico ignorar parte da Armadura do alvo.", tone: "damage" },
  { terms: ["penetração mágica"], definition: "Faz seu dano mágico ignorar parte da Resistência Mágica do alvo.", tone: "magic" },
  { terms: ["dano físico"], definition: "Tipo de dano reduzido pela Armadura do alvo.", tone: "damage" },
  { terms: ["dano mágico"], definition: "Tipo de dano reduzido pela Resistência Mágica do alvo.", tone: "magic" },
  { terms: ["dano verdadeiro"], definition: "Tipo de dano que ignora Armadura e Resistência Mágica." },
  { terms: ["vampirismo universal"], definition: "Recupera Vida com base no dano que você causa, inclusive com habilidades.", tone: "recovery" },
  { terms: ["roubo de vida"], definition: "Recupera Vida com base no dano de ataques básicos e de efeitos que aplicam Roubo de Vida.", tone: "recovery" },
  { terms: ["escudo", "escudos"], definition: "Proteção temporária que absorve dano antes de ele reduzir a Vida. Alguns Escudos absorvem apenas um tipo de dano.", tone: "recovery" },
  { terms: ["aceleração de habilidade"], definition: "Permite usar habilidades com mais frequência. Quanto maior o atributo, menor o intervalo entre usos.", tone: "magic" },
  { terms: ["aceleração de feitiço de invocador"], definition: "Reduz o tempo de recarga dos Feitiços de Invocador." },
  { terms: ["lentidão"], definition: "Reduz temporariamente a Velocidade de Movimento do alvo." },
  { terms: ["imobilizar", "imobilização", "imobiliza"], definition: "Aplicar um efeito que impede o movimento do alvo, como enraizamento ou atordoamento." },
  { terms: ["controle de grupo"], definition: "Efeitos que limitam ações do alvo, como se mover, atacar ou conjurar habilidades." },
  { terms: ["supressão"], definition: "Impede o alvo de se mover, atacar ou usar habilidades. Sua duração não é reduzida por Tenacidade." },
  { terms: ["arremesso ao ar", "arremessos ao ar"], definition: "Deslocamento forçado que impede o alvo de agir enquanto está no ar." },
  { terms: ["executa", "executar"], definition: "Elimina o alvo quando ele cumpre a condição do efeito, normalmente abaixo de um limite de Vida." },
  { terms: ["efeito fantasma"], definition: "Permite atravessar outras unidades sem ser bloqueado pela colisão." },
  { terms: ["ataque energizado", "energizado"], definition: "Mover-se e atacar gera cargas. Com carga completa, o próximo ataque aplica o bônus Energizado do item." },
  { terms: ["força adaptativa"], definition: "Concede Dano de Ataque adicional ou Poder de Habilidade, conforme os atributos do campeão.", tone: "magic" },
  { terms: ["canalização"], definition: "Tempo de preparação antes de um efeito acontecer. Alguns efeitos podem ser interrompidos durante a canalização." },
  { terms: ["vulnerável"], definition: "O alvo recebe mais dano enquanto o efeito estiver ativo.", tone: "damage" },
]
const terms = new Map(glossary.flatMap(entry => entry.terms.map(term => [term, entry] as const)));
const words = [...terms.keys()].sort((a, b) => b.length - a.length).join("|");
const tokens = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${words})(?![\p{L}\p{N}])|\d+(?:[.,]\d+)?(?:%|s\b|x\b)?`, "giu");

const passiveIcons: Partial<Record<string, string>> = {
  "Lâmina Arcana": "matchups",
  "Feridas Dolorosas": "warning",
  "Renascimento": "reset",
  "Energizado": "ascending",
  "Salva-Vidas": "admin",
}

function renderLine(line: string) {
  const fragment = document.createDocumentFragment();
  let end = 0;
  for (const match of line.matchAll(tokens)) {
    const [text] = match;
    fragment.append(line.slice(end, match.index));
    const entry = terms.get(text.toLowerCase());
    const element = document.createElement(entry ? "button" : "b");
    element.textContent = text;
    if (element instanceof HTMLButtonElement && entry) {
      element.type = "button";
      element.className = "effect-term";
      element.dataset.definition = entry.definition;
      if (entry.tone) element.dataset.tone = entry.tone;
    }
    fragment.append(element);
    end = match.index + text.length;
  }
  fragment.append(line.slice(end));
  return fragment;
}

export function effectText(description: string, effects: BuildDetail["effects"]) {
  const body = document.createElement("div");
  body.className = "game-tip-description";
  for (const paragraph of description.split("\n\n")) {
    const lines = paragraph.split("\n");
    const name = Object.keys(effects ?? {}).find(label => lines[0] === label || lines[0].startsWith(label + " ("));
    if (name) {
      const heading = document.createElement("div");
      heading.className = "effect-heading";
      const kind = effects?.[name];
      const icon = kind === "active" ? "play" : passiveIcons[name];
      if (icon) heading.insertAdjacentHTML("beforeend", iconMarkup(icon));
      const label = document.createElement("b");
      label.textContent = lines.shift() ?? "";
      const badge = document.createElement("small");
      badge.textContent = kind === "active" ? "Ativo" : "Passiva";
      heading.append(label, badge);
      body.append(heading);
    }
    const text = document.createElement("p");
    lines.forEach((line, index) => {
      if (index) text.append(document.createElement("br"));
      text.append(renderLine(line));
    });
    body.append(text);
  }
  return body;
}

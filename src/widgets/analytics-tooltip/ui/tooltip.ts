// @ts-nocheck -- Integração legada com o DOM; os módulos extraídos mantêm seus tipos próprios.
import { abilityDetail } from "@/entities/ability"
import { LOL_DATA, lolAsset } from "@/entities/champion"
import { effectText } from "../model/effect-text"

const tipEl = () => document.getElementById("tip");
const tipSelector = "[data-game-tip], [data-tip]";
let tipTarget, dismissedGameTip;
let definitionTerm;
function hideDefinition() {
  if (!definitionTerm) return;
  definitionTerm.removeAttribute("aria-describedby");
  definitionTerm = undefined;
  tipEl().querySelector(".effect-definition")?.remove();
}
function showDefinition(term) {
  if (definitionTerm === term) return;
  hideDefinition();
  const definition = document.createElement("div");
  definition.id = "effect-definition";
  definition.className = "effect-definition";
  definition.setAttribute("role", "tooltip");
  definition.textContent = term.dataset.definition;
  tipEl().append(definition);
  definitionTerm = term;
  term.setAttribute("aria-describedby", definition.id);
  const anchor = term.getBoundingClientRect();
  const panel = tipEl().getBoundingClientRect();
  const {width, height} = definition.getBoundingClientRect();
  const right = document.documentElement.clientWidth - width - 8;
  const beside = panel.right <= right ? panel.right : panel.left - width;
  const fitsBeside = beside >= 8 && beside <= right;
  const left = fitsBeside ? beside : anchor.left + (anchor.width - width) / 2;
  const top = fitsBeside || anchor.bottom + height <= innerHeight - 8 ? anchor.bottom : anchor.top - height;
  definition.style.left = Math.max(8, Math.min(left, right)) + "px";
  definition.style.top = Math.max(8, Math.min(top, innerHeight - height - 8)) + "px";
}
export function hideTip() {
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  tipEl().hidden = true;
  tipTarget = undefined;
}
function showTip(target, x, y) {
  const el = tipEl();
  const { tip, gameTip } = target.dataset;
  if (gameTip && tipTarget === target && !el.hidden) return;
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  el.classList.toggle("game-tip", Boolean(gameTip));
  el.classList.toggle("ability-tip", gameTip?.startsWith("ability:") ?? false);
  el.setAttribute("role", gameTip ? "region" : "tooltip");
  el.removeAttribute("aria-labelledby");
  el.style.maxHeight = "";
  el.textContent = tip ?? "";
  if (gameTip) {
    const [kind, key, slot] = gameTip.split(":");
    const detail = kind === "rune"
      ? { name: LOL_DATA.runeNames[key], description: LOL_DATA.runeDescriptions[key] }
      : kind === "ability" ? abilityDetail(key, slot) : LOL_DATA[`${kind}Details`][key];
    const heading = document.createElement("strong");
    heading.id = "game-tip-title";
    heading.className = "game-tip-title";
    el.setAttribute("aria-labelledby", heading.id);
    const asset = LOL_DATA[kind]?.[key];
    const icon = detail?.icon ?? (asset ? lolAsset(asset) : target.querySelector("img")?.src);
    if (icon) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = icon;
      heading.append(img);
    }
    if (kind === "ability") {
      const shortcut = document.createElement("kbd");
      shortcut.textContent = slot;
      heading.append(shortcut);
    }
    heading.append(target.dataset.tipName ?? detail?.name ?? key);
    if (detail?.description) el.prepend(heading, effectText(detail.description, detail.effects));
    else el.prepend(heading);
  }
  el.hidden = false;
  tipTarget = target;
  const {width, height} = el.getBoundingClientRect();
  if (gameTip) {
    target.setAttribute("aria-describedby", el.id);
    const anchor = target.getBoundingClientRect();
    const above = Math.max(0, anchor.top - 8);
    const below = Math.max(0, innerHeight - anchor.bottom - 8);
    const placeAbove = height <= above || (height > below && above >= below);
    const availableHeight = placeAbove ? above : below;
    el.style.maxHeight = availableHeight + "px";
    const left = anchor.left + (anchor.width - width) / 2;
    const top = placeAbove ? anchor.top - Math.min(height, availableHeight) : anchor.bottom;
    el.style.left = Math.max(8, Math.min(left, document.documentElement.clientWidth - width - 8)) + "px";
    el.style.top = Math.max(8, top) + "px";
    return;
  }
  const left = x + 14 + width > innerWidth - 8 ? x - width - 14 : x + 14;
  const top = y + 16 + height > innerHeight - 8 ? y - height - 12 : y + 16;
  el.style.left = Math.max(8, left) + "px";
  el.style.top = Math.max(8, top) + "px";
}
document.addEventListener("mousemove", e => {
  if (tipEl().contains(e.target)) {
    const term = e.target.closest(".effect-term");
    if (term) showDefinition(term);
    return;
  }
  if (definitionTerm !== document.activeElement) hideDefinition();
  const target = e.target.closest?.(tipSelector);
  if (target && target === dismissedGameTip) return;
  dismissedGameTip = undefined;
  if (target) showTip(target, e.clientX, e.clientY);
  else hideTip();
});
document.addEventListener("focusin", e => {
  if (tipEl().contains(e.target)) {
    if (e.target.matches(".effect-term")) showDefinition(e.target);
    return;
  }
  const target = e.target.closest(tipSelector);
  if (!target) return;
  const {left, bottom} = target.getBoundingClientRect();
  dismissedGameTip = undefined;
  showTip(target, left, bottom);
});
document.addEventListener("click", e => {
  const term = e.target.closest?.(".effect-term");
  if (term && tipEl().contains(term)) {
    showDefinition(term);
    return;
  }
  const target = e.target.closest?.("[data-game-tip]");
  if (target) showTip(target);
});
document.addEventListener("focusout", e => {
  if (!e.relatedTarget || (!tipEl().contains(e.relatedTarget) && e.relatedTarget !== tipTarget)) hideTip();
});
document.addEventListener("keydown", e => {
  const panel = tipEl();
  if (e.key === "Tab" && tipTarget?.dataset.gameTip && !panel.hidden) {
    const terms = panel.querySelectorAll(".effect-term");
    if (!e.shiftKey && e.target === tipTarget && terms.length) {
      e.preventDefault();
      terms[0].focus();
      return;
    }
    if ((e.shiftKey && e.target === terms[0]) || (!e.shiftKey && e.target === terms[terms.length - 1])) {
      if (e.shiftKey) e.preventDefault();
      hideDefinition();
      tipTarget.focus({preventScroll: true});
      if (!e.shiftKey) hideTip();
      return;
    }
  }
  if (e.key !== "Escape") return;
  if (panel.contains(e.target)) tipTarget?.focus({preventScroll: true});
  if (tipTarget?.dataset.gameTip) dismissedGameTip = tipTarget;
  hideTip();
});
document.addEventListener("scroll", e => {
  if (e.target !== tipEl()) {
    hideTip();
    return;
  }
  hideDefinition();
  const term = document.activeElement;
  if (e.target.contains(term) && term.matches(".effect-term:focus-visible")) {
    const {top, bottom} = term.getBoundingClientRect();
    const panel = e.target.getBoundingClientRect();
    if (top >= panel.top && bottom <= panel.bottom) showDefinition(term);
  }
}, true);
document.addEventListener("pointerdown", event => {
  if (tipTarget?.dataset.gameTip && !tipTarget.contains(event.target) && !tipEl().contains(event.target)) hideTip();
});

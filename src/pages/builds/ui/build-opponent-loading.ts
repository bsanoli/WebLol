import { encountersStatus, loadEncounters } from "../model/encounters"

/**
 * Os confrontos do campeão vêm de um arquivo à parte. Enquanto ele não chega, o card mostra o aviso;
 * ao chegar, `redraw` desenha de novo, a menos que `selection` já tenha mudado depois deste desenho
 * (cada desenho enquanto o arquivo carrega registra o seu próprio retorno, então o último vence).
 */
export function loadOpponentEncounters(champion: string, selection: () => string, redraw: () => void) {
  const status = encountersStatus(champion)
  if (status !== "idle" && status !== "loading") return
  const requested = selection()
  void loadEncounters(champion).then(() => {
    if (selection() === requested) redraw()
  })
}

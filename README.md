# LoL — Worlds e Campeonato

Painel do time: estatísticas do Worlds 2026, planejador de comps e draft, mapa tático e conhecimento (objetivos e controle de wave).

**Como usar:** abra o link do GitHub Pages, entre com seu Riot ID (nome#TAG) e pronto. Não precisa escolher pasta.

Os dados do time (comps, jogadas, envios) ficam num banco online grátis (Firebase Firestore):

- a versão oficial é assinada pelo admin, então ninguém consegue falsificar;
- os envios e backups dos jogadores são criptografados no navegador para o admin, e só a senha do admin abre;
- as regras do banco estão em `firestore.rules` (só o admin publica, aprova ou recusa).

O admin pode baixar um backup completo na aba Administração e guardar na pasta Admin do OneDrive. O botão "Importar da pasta" copia para o banco os dados da antiga pasta Time do OneDrive.

# Mini SK para PC — 31/10-D

O MESMO Mini SK de sempre (mesmo nome, mesmos projetos, projetos na pasta C:\Mini-SK — fora de Documentos, longe do OneDrive), no formato de PC com **Electron**, sem Python:
- `electron/main.cjs` abre a janela; `electron/terminal.cjs` liga o **💻 terminal do computador**; `electron/ponte.cjs` liga a **⇅ ponte / 🔄 pasta viva**; `electron/preload.cjs` avisa o Mini SK que ele está no PC.
- A pasta `app/` é o Mini SK v31/10-D: 🗜 abre .tar/.tar.gz/.tgz/.gz, 🧹 Faxina (lixo, segredos e histórico), 🔬 Caça-Bug, 🧩 Modularizar, 🧭 Mapa de Rotas (plano B).
- Já vem com o conserto da tela preta (sem aceleração de vídeo).

## Como gerar o .exe
1. Mande esta pasta para o repositório do Mini SK PC no GitHub (Mini SK → 🐙 GitHub).
2. GitHub → **Actions** → **Programa .exe para Windows** → **Run workflow**.
3. Verde ✔: **Artifacts** → **Mini-SK-Windows** → **Mini-SK-Instalar.exe** (atualiza o que você já tem).
Se der erro: C:\Mini-SK\registro.txt

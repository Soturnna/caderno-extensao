// Faz o clique no ícone da extensão (e o atalho Alt+Shift+C) abrir o painel lateral.
export default defineBackground(() => {
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((erro: unknown) => console.error('Caderno: não foi possível configurar o painel lateral', erro));
});

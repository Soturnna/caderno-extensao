# Caderno de Soluções — Extensão

Extensão para Chrome e Edge que abre, em um painel lateral, as lições de fórmulas Excel (PT-BR), DAX e SQL do time.

**Instalar:** [Chrome Web Store](https://chromewebstore.google.com/detail/ohhdecofbdkkhchjedihdmnfmindmfaa) (publicada em 20/10/2026).

- **Abrir:** clique no ícone da extensão ou use **Alt+Shift+C**.
- **Conteúdo:** lido de `https://soturnna.github.io/caderno-licoes/licoes.json` (repositório [caderno-licoes](https://github.com/Soturnna/caderno-licoes)). Uma lição nova aparece sem atualizar a extensão.
- **Sem internet:** a extensão usa a última cópia baixada ou a cópia embutida no pacote.
- **Privacidade:** a extensão não coleta dados. Ela só baixa o arquivo público de lições e guarda o filtro escolhido no próprio navegador.

## Desenvolvimento

```bash
npm install
npm run dev        # abre um Chrome de teste com a extensão carregada
npm test           # testes da busca, da coloração e do cache
npm run build      # gera .output/chrome-mv3
npm run zip        # pacote para a Chrome Web Store
npm run zip:edge   # pacote para o Edge Add-ons
```

Antes de publicar uma versão nova, atualize a cópia embutida das lições:

```bash
curl -o lib/dados-iniciais.json https://soturnna.github.io/caderno-licoes/licoes.json
```

## Estrutura

```
entrypoints/
  background.ts        ← faz o ícone abrir o painel lateral
  sidepanel/           ← o painel (HTML, CSS e lógica de tela)
lib/
  busca.ts             ← busca sem acento, coloração de fórmulas, marcação
  licoes.ts            ← carregamento: cache local, cópia embutida e rede
  dados-iniciais.json  ← cópia embutida das lições
tests/                 ← testes com o executor nativo do Node
```

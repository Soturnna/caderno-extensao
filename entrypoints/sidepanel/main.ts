// Fontes embutidas na extensão (só o alfabeto latino, que cobre o português).
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import serifLatina from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2?url';
import './style.css';

document.fonts.add(new FontFace('Source Serif 4 Variable', `url(${serifLatina}) format("woff2")`, { weight: '200 900' }));

import { buscarLicoes, tokenizar, trechosMarcados, type Filtro } from '@/lib/busca';
import { atualizarDaRede, carregarLocal, type Armazenamento, type Origem } from '@/lib/licoes';
import type { ArquivoLicoes, Licao, Linguagem } from '@/lib/tipos';
import dadosIniciais from '@/lib/dados-iniciais.json';

/* ---------- Armazenamento local da extensão ---------- */
const armazenamento: Armazenamento = {
  get: (chave) => browser.storage.local.get(chave),
  set: (itens) => browser.storage.local.set(itens)
};

/* ---------- Estado ---------- */
const estado = {
  arquivo: null as ArquivoLicoes | null,
  origem: 'embutido' as Origem,
  offline: false,
  filtro: 'Todas' as Filtro,
  consulta: '',
  licaoId: null as string | null
};

const corpo = document.getElementById('corpo')!;
const status = document.getElementById('status')!;
const anuncio = document.getElementById('anuncio')!;
const botaoAtualizar = document.getElementById('atualizar') as HTMLButtonElement;

/* ---------- Criação de elementos sem innerHTML ---------- */
type Filho = Node | string | null | undefined | false | Filho[];
function h(tag: string, props: Record<string, unknown> | null, ...filhos: Filho[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props ?? {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2).toLowerCase(), valor as EventListener);
    } else if (chave === 'class') {
      el.className = String(valor);
    } else {
      el.setAttribute(chave, valor === true ? '' : String(valor));
    }
  }
  const adicionar = (f: Filho): void => {
    if (f === null || f === undefined || f === false) return;
    if (Array.isArray(f)) f.forEach(adicionar);
    else el.append(f instanceof Node ? f : document.createTextNode(f));
  };
  filhos.forEach(adicionar);
  return el;
}

function icone(caminhos: [string, Record<string, string | number>][]): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const attrs: Record<string, string> = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
  };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  for (const [tag, a] of caminhos) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
const ICONES = {
  lupa: () => icone([['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'm20 20-3.5-3.5' }]]),
  voltar: () => icone([['path', { d: 'm15 18-6-6 6-6' }]]),
  copiar: () => icone([['rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }], ['path', { d: 'M5 15V5a2 2 0 0 1 2-2h10' }]])
};

function codigoColorido(texto: string, linguagem: Linguagem): Filho[] {
  return tokenizar(texto, linguagem).map((t) => (t.tipo === 'txt' ? t.texto : h('span', { class: `t-${t.tipo}` }, t.texto)));
}

function textoMarcado(texto: string): Filho[] {
  return trechosMarcados(texto, estado.consulta).map((p) => (p.marcado ? h('mark', null, p.texto) : p.texto));
}

/* ---------- Telas ---------- */
function render(): void {
  const licao = estado.licaoId ? estado.arquivo?.licoes.find((l) => l.id === estado.licaoId) : null;
  if (estado.licaoId && !licao) estado.licaoId = null;
  corpo.replaceChildren(...(licao ? telaLicao(licao) : telaLista()));
  renderStatus();
}

function renderStatus(): void {
  if (!estado.arquivo) return;
  const data = new Date(estado.arquivo.geradoEm).toLocaleDateString('pt-BR');
  const total = estado.arquivo.licoes.length;
  const sufixo = estado.offline ? ' · sem conexão' : '';
  status.textContent = `${total} ${total === 1 ? 'lição' : 'lições'} · publicadas em ${data}${sufixo}`;
}

function telaLista(): HTMLElement[] {
  const licoes = estado.arquivo?.licoes ?? [];
  const area = h('div', null, listaResultados(buscarLicoes(licoes, estado.consulta, estado.filtro)));

  const campo = h('input', {
    id: 'busca', type: 'search', placeholder: 'Ex.: PROCX, última data, acumulado', autocomplete: 'off'
  }) as HTMLInputElement;
  campo.value = estado.consulta;
  campo.addEventListener('input', () => {
    estado.consulta = campo.value;
    const atuais = estado.arquivo?.licoes ?? [];
    area.replaceChildren(...listaResultados(buscarLicoes(atuais, estado.consulta, estado.filtro)));
  });

  const filtros = (['Todas', 'Excel', 'DAX', 'SQL'] as Filtro[]).map((f) =>
    h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(estado.filtro === f),
      onClick: () => {
        estado.filtro = f;
        void browser.storage.local.set({ filtro: f });
        render();
        document.getElementById('busca')?.focus();
      }
    }, f)
  );

  return [
    h('div', null,
      h('label', { class: 'rotulo', for: 'busca' }, 'Buscar função ou problema'),
      h('div', { class: 'busca' }, ICONES.lupa(), campo)
    ),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por linguagem' }, filtros),
    area
  ];
}

function listaResultados(resultados: Licao[]): HTMLElement[] {
  if (!resultados.length) {
    return [h('p', { class: 'vazio' }, 'Nenhuma lição encontrada. Tente o nome da função sem acento ou outra palavra do problema.')];
  }
  return [
    h('p', { class: 'contagem' }, resultados.length === 1 ? '1 lição' : `${resultados.length} lições`),
    h('div', { class: 'lista' }, resultados.map((l) =>
      h('button', { class: 'card', type: 'button', onClick: () => abrirLicao(l.id) },
        h('p', { class: 'cat' }, `${l.linguagem} · ${l.categoria}`),
        h('h2', null, textoMarcado(l.titulo)),
        h('p', { class: 'resumo' }, textoMarcado(l.resumo)),
        h('span', { class: 'chips' }, l.funcoes.slice(0, 3).map((f) => h('span', { class: 'chip' }, f)))
      )
    ))
  ];
}

function telaLicao(l: Licao): HTMLElement[] {
  const rotulo = h('span', null, 'Copiar');
  const copiar = h('button', { class: 'copiar', type: 'button' }, ICONES.copiar(), rotulo);
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(l.formula);
      rotulo.textContent = 'Copiado';
      anuncio.textContent = 'Fórmula copiada';
    } catch {
      rotulo.textContent = 'Falhou';
      anuncio.textContent = 'Não foi possível copiar a fórmula';
    }
    setTimeout(() => { rotulo.textContent = 'Copiar'; anuncio.textContent = ''; }, 2000);
  });

  const data = new Date(`${l.atualizadoEm}T12:00:00`).toLocaleDateString('pt-BR');

  return [
    h('button', { class: 'voltar', type: 'button', onClick: () => abrirLicao(null) }, ICONES.voltar(), 'Lições'),
    h('div', null,
      h('p', { class: 'cat' }, `${l.linguagem} · ${l.categoria}`),
      h('h2', { class: 'licao-titulo' }, l.titulo),
      h('p', { class: 'meta' }, `Por ${l.autor} · revisada em ${data}`)
    ),
    h('section', { class: 'secao' }, h('h3', null, 'Problema'), h('p', null, l.problema)),
    h('section', { class: 'secao' },
      h('h3', null, 'Solução'),
      h('figure', { class: 'formula' },
        h('div', { class: 'formula-topo' },
          h('span', { class: 'lang' }, l.linguagem === 'Excel' ? 'Excel · PT-BR' : l.linguagem),
          copiar),
        h('pre', null, codigoColorido(l.formula, l.linguagem))
      )
    ),
    h('section', { class: 'secao' },
      h('h3', null, 'Decomposição'),
      h('ol', { class: 'passos' }, l.passos.map((p) =>
        h('li', null, h('div', null,
          h('code', { class: 'trecho' }, codigoColorido(p.trecho, l.linguagem)),
          h('p', null, p.texto)
        ))
      ))
    ),
    h('aside', { class: 'callout porque' }, h('h3', null, 'Por quê'), h('p', null, l.porque)),
    l.atencao ? h('aside', { class: 'callout atencao' }, h('h3', null, 'Atenção'), h('p', null, l.atencao)) : null
  ].filter((x): x is HTMLElement => x !== null);
}

function abrirLicao(id: string | null): void {
  estado.licaoId = id;
  render();
  corpo.scrollTop = 0;
  (document.querySelector(id ? '.voltar' : '#busca') as HTMLElement | null)?.focus();
}

/* ---------- Teclado ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && estado.licaoId) abrirLicao(null);
});

/* ---------- Dados ---------- */
async function atualizar(): Promise<void> {
  botaoAtualizar.disabled = true;
  botaoAtualizar.textContent = 'Atualizando…';
  const resultado = await atualizarDaRede(armazenamento);
  if (resultado) {
    estado.arquivo = resultado.dados;
    estado.origem = 'rede';
    estado.offline = false;
    // Se a pessoa está digitando, atualiza só a lista, sem tirar o foco do campo.
    const campo = document.getElementById('busca');
    if (campo && document.activeElement === campo) {
      campo.dispatchEvent(new Event('input'));
      renderStatus();
    } else {
      render();
    }
  } else {
    estado.offline = true;
    renderStatus();
  }
  botaoAtualizar.disabled = false;
  botaoAtualizar.textContent = 'Atualizar';
}

botaoAtualizar.addEventListener('click', () => void atualizar());

async function iniciar(): Promise<void> {
  const salvo = await browser.storage.local.get('filtro');
  if (['Todas', 'Excel', 'DAX', 'SQL'].includes(salvo.filtro as string)) estado.filtro = salvo.filtro as Filtro;

  const local = await carregarLocal(armazenamento, dadosIniciais as ArquivoLicoes);
  estado.arquivo = local.dados;
  estado.origem = local.origem;
  render();
  document.getElementById('busca')?.focus();

  void atualizar();
}

void iniciar();

import type { Licao, Linguagem, Token, TipoToken } from './tipos';

/** Remove acentos e passa para minúsculas: "MÁXIMOSES" -> "maximoses". */
export function normalizar(texto: string): string {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export type Filtro = 'Todas' | Linguagem;

/**
 * Busca lições. Todas as palavras digitadas precisam aparecer (lógica E).
 * Encontrar o termo na lista de funções vale mais que encontrar no texto.
 */
export function buscarLicoes(licoes: Licao[], consulta: string, filtro: Filtro): Licao[] {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  const pesos = { funcoes: 4, titulo: 3, resumo: 2, problema: 1, formula: 1 } as const;

  return licoes
    .filter((l) => filtro === 'Todas' || l.linguagem === filtro)
    .map((licao) => {
      const campos: Record<keyof typeof pesos, string> = {
        funcoes: normalizar(licao.funcoes.join(' ')),
        titulo: normalizar(licao.titulo),
        resumo: normalizar(licao.resumo),
        problema: normalizar(licao.problema),
        formula: normalizar(licao.formula)
      };
      let pontos = 0;
      for (const termo of termos) {
        let achou = false;
        for (const campo of Object.keys(campos) as (keyof typeof pesos)[]) {
          if (campos[campo].includes(termo)) {
            pontos += pesos[campo];
            achou = true;
          }
        }
        if (!achou) return null;
      }
      return { licao, pontos };
    })
    .filter((r): r is { licao: Licao; pontos: number } => r !== null)
    .sort((a, b) => b.pontos - a.pontos || a.licao.titulo.localeCompare(b.licao.titulo, 'pt-BR'))
    .map((r) => r.licao);
}

/** Quebra uma fórmula em tokens com tipo, para colorir. A primeira regra que casar vence. */
export function tokenizar(formula: string, linguagem: Linguagem): Token[] {
  const numero = linguagem === 'Excel' ? /\d+(?:,\d+)?/y : /\d+(?:\.\d+)?/y;
  const regras: [TipoToken, RegExp][] = [
    ['str', /"(?:[^"]|"")*"?/y],
    ['str', linguagem === 'SQL' ? /'(?:[^']|'')*'?/y : /(?!)/y],
    ['ref', /'[^']*'\[[^\]]*\]/y],
    ['ref', /[A-Za-zÀ-ÿ_][\wÀ-ÿ.]*\[[^\]]*\]/y],
    ['ref', /\[[^\]]*\]/y],
    ['fn', /[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*(?=\s*\()/y],
    ['ref', /\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?(?![\wÀ-ÿ])/y],
    ['ref', /\$?[A-Z]{1,3}:\$?[A-Z]{1,3}(?![\wÀ-ÿ])/y],
    ['num', /(?:VERDADEIRO|FALSO|TRUE|FALSE)(?![\wÀ-ÿ(])/y],
    ['num', numero],
    ['op', /[=;,()&*+\-/<>^:%]+/y],
    ['txt', /\s+/y],
    ['txt', /[A-Za-zÀ-ÿ_][\wÀ-ÿ.]*/y],
    ['txt', /./sy]
  ];

  const tokens: Token[] = [];
  let pos = 0;
  while (pos < formula.length) {
    for (const [tipo, regex] of regras) {
      regex.lastIndex = pos;
      const m = regex.exec(formula);
      if (m && m[0].length > 0) {
        const anterior = tokens[tokens.length - 1];
        if (anterior && tipo === 'txt' && anterior.tipo === 'txt') anterior.texto += m[0];
        else tokens.push({ tipo, texto: m[0] });
        pos += m[0].length;
        break;
      }
    }
  }
  return tokens;
}

/** Divide um texto em trechos marcados e não marcados, ignorando acentos na comparação. */
export function trechosMarcados(texto: string, consulta: string): { marcado: boolean; texto: string }[] {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  const caracteres = Array.from(texto);
  const normalizado = caracteres.map((c) => normalizar(c)).join('');
  if (!termos.length || normalizado.length !== caracteres.length) return [{ marcado: false, texto }];

  const marca = new Array<boolean>(caracteres.length).fill(false);
  for (const termo of termos) {
    let i = normalizado.indexOf(termo);
    while (i !== -1) {
      for (let k = i; k < i + termo.length; k++) marca[k] = true;
      i = normalizado.indexOf(termo, i + termo.length);
    }
  }
  const partes: { marcado: boolean; texto: string }[] = [];
  caracteres.forEach((c, i) => {
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.marcado === (marca[i] ?? false)) ultima.texto += c;
    else partes.push({ marcado: marca[i] ?? false, texto: c });
  });
  return partes;
}

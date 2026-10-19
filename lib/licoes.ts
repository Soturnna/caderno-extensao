import type { ArquivoLicoes } from './tipos';

export const URL_LICOES = 'https://soturnna.github.io/caderno-licoes/licoes.json';
export const VERSAO_SUPORTADA = 1;
const CHAVE_CACHE = 'licoes-cache';

/** Armazenamento mínimo de que precisamos (chrome.storage.local cumpre este contrato). */
export interface Armazenamento {
  get(chave: string): Promise<Record<string, unknown>>;
  set(itens: Record<string, unknown>): Promise<void>;
}

export type Origem = 'cache' | 'embutido' | 'rede';

export interface Resultado {
  dados: ArquivoLicoes;
  origem: Origem;
}

/** Confere se um objeto tem o formato do arquivo publicado. */
export function arquivoValido(dados: unknown): dados is ArquivoLicoes {
  if (!dados || typeof dados !== 'object') return false;
  const d = dados as Partial<ArquivoLicoes>;
  return (
    d.versao === VERSAO_SUPORTADA &&
    typeof d.geradoEm === 'string' &&
    Array.isArray(d.licoes) &&
    d.licoes.every((l) => l && typeof l.id === 'string' && typeof l.formula === 'string' && Array.isArray(l.passos))
  );
}

/**
 * Primeira carga, instantânea: usa o cache local; se não houver,
 * usa a cópia embutida na extensão (funciona mesmo sem internet).
 */
export async function carregarLocal(armazenamento: Armazenamento, embutido: ArquivoLicoes): Promise<Resultado> {
  try {
    const salvo = (await armazenamento.get(CHAVE_CACHE))[CHAVE_CACHE];
    if (arquivoValido(salvo)) {
      // O cache só vence se for mais novo que a cópia embutida na versão instalada.
      if (salvo.geradoEm >= embutido.geradoEm) return { dados: salvo, origem: 'cache' };
    }
  } catch {
    /* cache indisponível: segue para a cópia embutida */
  }
  return { dados: embutido, origem: 'embutido' };
}

/**
 * Busca a versão mais recente na internet e atualiza o cache.
 * Devolve null se não houver internet ou se o arquivo vier em formato inesperado.
 */
export async function atualizarDaRede(
  armazenamento: Armazenamento,
  buscar: typeof fetch = fetch,
  limiteMs = 8000
): Promise<Resultado | null> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limiteMs);
  try {
    const resposta = await buscar(URL_LICOES, { cache: 'no-cache', signal: controle.signal });
    if (!resposta.ok) return null;
    const dados: unknown = await resposta.json();
    if (!arquivoValido(dados)) return null;
    await armazenamento.set({ [CHAVE_CACHE]: dados });
    return { dados, origem: 'rede' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

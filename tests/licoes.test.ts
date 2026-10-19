import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arquivoValido, atualizarDaRede, carregarLocal, type Armazenamento } from '../lib/licoes.ts';
import type { ArquivoLicoes } from '../lib/tipos.ts';

const embutido = JSON.parse(readFileSync(new URL('../lib/dados-iniciais.json', import.meta.url), 'utf8')) as ArquivoLicoes;

function memoria(inicial: Record<string, unknown> = {}): Armazenamento & { dados: Record<string, unknown> } {
  const dados = { ...inicial };
  return { dados, get: async (k) => (k in dados ? { [k]: dados[k] } : {}), set: async (i) => { Object.assign(dados, i); } };
}
const resposta = (corpo: unknown, ok = true) => (async () => ({ ok, json: async () => corpo })) as unknown as typeof fetch;

test('sem cache, usa a cópia embutida', async () => {
  const r = await carregarLocal(memoria(), embutido);
  assert.equal(r.origem, 'embutido');
});

test('cache mais novo vence a cópia embutida', async () => {
  const novo = { ...embutido, geradoEm: '2099-01-01T00:00:00.000Z' };
  const r = await carregarLocal(memoria({ 'licoes-cache': novo }), embutido);
  assert.equal(r.origem, 'cache');
});

test('cache mais antigo que a versão instalada é ignorado', async () => {
  const velho = { ...embutido, geradoEm: '2000-01-01T00:00:00.000Z' };
  const r = await carregarLocal(memoria({ 'licoes-cache': velho }), embutido);
  assert.equal(r.origem, 'embutido');
});

test('rede válida atualiza o cache', async () => {
  const mem = memoria();
  const r = await atualizarDaRede(mem, resposta(embutido));
  assert.equal(r?.origem, 'rede');
  assert.ok(arquivoValido(mem.dados['licoes-cache']));
});

test('rede com erro, formato errado ou versão desconhecida não estraga o cache', async () => {
  const mem = memoria();
  assert.equal(await atualizarDaRede(mem, resposta(null, false)), null);
  assert.equal(await atualizarDaRede(mem, resposta({ qualquer: 1 })), null);
  assert.equal(await atualizarDaRede(mem, resposta({ ...embutido, versao: 2 })), null);
  assert.equal(await atualizarDaRede(mem, (async () => { throw new Error('offline'); }) as unknown as typeof fetch), null);
  assert.deepEqual(mem.dados, {});
});

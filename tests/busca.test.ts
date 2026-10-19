import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buscarLicoes, normalizar, tokenizar, trechosMarcados } from '../lib/busca.ts';
import type { ArquivoLicoes } from '../lib/tipos.ts';

const { licoes } = JSON.parse(readFileSync(new URL('../lib/dados-iniciais.json', import.meta.url), 'utf8')) as ArquivoLicoes;
const ids = (q: string, f: Parameters<typeof buscarLicoes>[2] = 'Todas') => buscarLicoes(licoes, q, f).map((l) => l.id);

test('normalizar remove acentos e maiúsculas', () => {
  assert.equal(normalizar('MÁXIMOSES Última'), 'maximoses ultima');
});

test('busca ignora acentos e exige todos os termos', () => {
  const maximoses = ids('maximoses');
  assert.ok(maximoses.includes('ultima-evolucao'));
  assert.ok(maximoses.every((id) => licoes.find((l) => l.id === id)!.funcoes.includes('MÁXIMOSES')));
  assert.ok(ids('procx').includes('ultima-linha-procx'));
  assert.ok(ids('procx').includes('procx-varios-criterios'));
  assert.ok(ids('ultima data').every((id) => ids('ultima').includes(id)));
});

test('filtro por linguagem', () => {
  assert.deepEqual(ids('acumulado', 'DAX'), ['total-acumulado-ano']);
  assert.deepEqual(ids('acumulado', 'Excel'), []);
  assert.equal(ids('', 'Todas').length, licoes.length);
});

test('tokenizar reconstrói todas as fórmulas sem perda', () => {
  for (const l of licoes) {
    const junto = tokenizar(l.formula, l.linguagem).map((t) => t.texto).join('');
    assert.equal(junto, l.formula, l.id);
  }
});

test('tokenizar classifica funções, referências, textos e números', () => {
  const t = tokenizar('=SEERRO(PROCX(A2; Base[Carteira]; "Ativo"; 0); 1,5)', 'Excel').filter((x) => x.tipo !== 'txt');
  const de = (tipo: string) => t.filter((x) => x.tipo === tipo).map((x) => x.texto);
  assert.deepEqual(de('fn'), ['SEERRO', 'PROCX']);
  assert.deepEqual(de('ref'), ['A2', 'Base[Carteira]']);
  assert.deepEqual(de('str'), ['"Ativo"']);
  assert.deepEqual(de('num'), ['0', '1,5']);
});

test('DAX trata vírgula como separador, não decimal', () => {
  const nums = tokenizar('ROUND(1,5)', 'DAX').filter((x) => x.tipo === 'num').map((x) => x.texto);
  assert.deepEqual(nums, ['1', '5']);
});

test('SQL reconhece texto entre aspas simples', () => {
  const strs = tokenizar("WHERE status = 'Ativo'", 'SQL').filter((x) => x.tipo === 'str').map((x) => x.texto);
  assert.deepEqual(strs, ["'Ativo'"]);
});

test('marcação respeita acentos do texto original', () => {
  assert.deepEqual(trechosMarcados('Última evolução', 'ultima'), [
    { marcado: true, texto: 'Última' },
    { marcado: false, texto: ' evolução' }
  ]);
});

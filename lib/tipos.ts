export type Linguagem = 'Excel' | 'DAX' | 'SQL';

export interface Passo {
  trecho: string;
  texto: string;
}

export interface Licao {
  id: string;
  linguagem: Linguagem;
  categoria: string;
  titulo: string;
  resumo: string;
  problema: string;
  formula: string;
  passos: Passo[];
  porque: string;
  atencao?: string;
  funcoes: string[];
  autor: string;
  atualizadoEm: string;
}

/** Formato do arquivo publicado pelo repositório caderno-licoes. */
export interface ArquivoLicoes {
  versao: number;
  geradoEm: string;
  total: number;
  licoes: Licao[];
}

export type TipoToken = 'str' | 'ref' | 'fn' | 'num' | 'op' | 'txt';

export interface Token {
  tipo: TipoToken;
  texto: string;
}

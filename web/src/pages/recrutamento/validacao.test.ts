import { describe, expect, it } from 'vitest';
import { LIMITES_CANDIDATO, validarCandidato, type DadosCandidato } from './validacao';

// <-------------------TESTES DA VALIDAÇÃO DO CANDIDATO------------------->
// A mesma função valida a tela e o serviço simulado: os limites aqui são os do RF08
const VALIDO: DadosCandidato = { nome: 'Ana Souza', email: 'ana.souza@exemplo.com' };

describe('validarCandidato', () => {
  it('aceita nome e e-mail válidos', () => {
    expect(validarCandidato(VALIDO)).toEqual({});
  });

  it('acusa os dois campos vazios ou só com espaços', () => {
    expect(validarCandidato({ nome: '   ', email: '' })).toEqual({
      nome: 'Informe o nome do candidato.',
      email: 'Informe um e-mail válido.',
    });
  });

  it('confere o tamanho do nome depois de retirar os espaços das pontas', () => {
    const limite = 'a'.repeat(LIMITES_CANDIDATO.nome);
    expect(validarCandidato({ ...VALIDO, nome: `  ${limite}  ` }).nome).toBeUndefined();
    expect(validarCandidato({ ...VALIDO, nome: `${limite}a` }).nome).toBe('Use até 150 caracteres.');
  });

  it('aceita o e-mail no limite de 254 caracteres e recusa o que passa dele', () => {
    const dominio = '@exemplo.com';
    const noLimite = 'a'.repeat(LIMITES_CANDIDATO.email - dominio.length) + dominio;
    expect(noLimite).toHaveLength(254);
    expect(validarCandidato({ ...VALIDO, email: noLimite }).email).toBeUndefined();
    expect(validarCandidato({ ...VALIDO, email: `a${noLimite}` }).email).toBe('Informe um e-mail válido.');
  });

  it.each(['ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana souza@exemplo.com', 'ana@@exemplo.com'])(
    'recusa o e-mail fora do formato: "%s"',
    (email) => {
      expect(validarCandidato({ ...VALIDO, email }).email).toBe('Informe um e-mail válido.');
    },
  );

  it('ignora os espaços das pontas do e-mail', () => {
    expect(validarCandidato({ ...VALIDO, email: '  ana.souza@exemplo.com  ' })).toEqual({});
  });
});

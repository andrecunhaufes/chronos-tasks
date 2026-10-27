import { describe, expect, it } from 'vitest';
import { CircuitoProvedorEmail } from './circuito';
import { PARAMETROS_ENVIO_EMAIL } from './email.constantes';

const INICIO = 1_000_000;

describe('CircuitoProvedorEmail', () => {
  it('permite chamadas enquanto fechado', () => {
    const circuito = new CircuitoProvedorEmail();
    expect(circuito.permiteChamada(INICIO)).toBe(true);
    expect(circuito.estadoAtual()).toBe('fechado');
  });

  it('abre após atingir o limite de falhas dentro da janela', () => {
    const circuito = new CircuitoProvedorEmail();

    for (
      let tentativa = 0;
      tentativa < PARAMETROS_ENVIO_EMAIL.circuitoLimiteFalhas;
      tentativa += 1
    ) {
      circuito.registrarFalha(INICIO + tentativa);
    }

    expect(circuito.estadoAtual()).toBe('aberto');
    expect(circuito.permiteChamada(INICIO)).toBe(false);
  });

  it('não abre quando as falhas caem fora da janela', () => {
    const circuito = new CircuitoProvedorEmail();
    const janelaMs = PARAMETROS_ENVIO_EMAIL.circuitoJanelaFalhasSegundos * 1000;

    for (
      let tentativa = 0;
      tentativa < PARAMETROS_ENVIO_EMAIL.circuitoLimiteFalhas;
      tentativa += 1
    ) {
      circuito.registrarFalha(INICIO + tentativa * (janelaMs + 1));
    }

    expect(circuito.estadoAtual()).toBe('fechado');
  });

  it('vai para meio aberto depois do tempo de espera e fecha após sucessos suficientes', () => {
    const circuito = new CircuitoProvedorEmail();
    const esperaMs = PARAMETROS_ENVIO_EMAIL.circuitoMeioAbertoSegundos * 1000;

    for (
      let tentativa = 0;
      tentativa < PARAMETROS_ENVIO_EMAIL.circuitoLimiteFalhas;
      tentativa += 1
    ) {
      circuito.registrarFalha(INICIO);
    }

    expect(circuito.permiteChamada(INICIO + esperaMs + 1)).toBe(true);
    expect(circuito.estadoAtual()).toBe('meio_aberto');

    for (
      let sucesso = 0;
      sucesso < PARAMETROS_ENVIO_EMAIL.circuitoSucessosMeioAberto;
      sucesso += 1
    ) {
      circuito.registrarSucesso();
    }

    expect(circuito.estadoAtual()).toBe('fechado');
  });

  it('reabre imediatamente se falhar em meio aberto', () => {
    const circuito = new CircuitoProvedorEmail();
    const esperaMs = PARAMETROS_ENVIO_EMAIL.circuitoMeioAbertoSegundos * 1000;

    for (
      let tentativa = 0;
      tentativa < PARAMETROS_ENVIO_EMAIL.circuitoLimiteFalhas;
      tentativa += 1
    ) {
      circuito.registrarFalha(INICIO);
    }

    circuito.permiteChamada(INICIO + esperaMs + 1);
    circuito.registrarFalha(INICIO + esperaMs + 2);

    expect(circuito.estadoAtual()).toBe('aberto');
  });
});

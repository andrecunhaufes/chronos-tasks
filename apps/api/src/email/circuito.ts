import { PARAMETROS_ENVIO_EMAIL } from './email.constantes';

type EstadoCircuito = 'fechado' | 'aberto' | 'meio_aberto';

export class CircuitoProvedorEmail {
  private estado: EstadoCircuito = 'fechado';
  private falhas: number[] = [];
  private sucessosMeioAberto = 0;
  private abertoAte = 0;

  permiteChamada(agora: number = Date.now()): boolean {
    if (this.estado === 'fechado') return true;

    if (this.estado === 'aberto') {
      if (agora < this.abertoAte) return false;
      this.estado = 'meio_aberto';
      this.sucessosMeioAberto = 0;
    }

    return true;
  }

  registrarSucesso(): void {
    if (this.estado !== 'meio_aberto') {
      this.falhas = [];
      return;
    }

    this.sucessosMeioAberto += 1;
    if (this.sucessosMeioAberto >= PARAMETROS_ENVIO_EMAIL.circuitoSucessosMeioAberto) {
      this.estado = 'fechado';
      this.falhas = [];
    }
  }

  registrarFalha(agora: number = Date.now()): void {
    if (this.estado === 'meio_aberto') {
      this.abrir(agora);
      return;
    }

    const inicioJanela = agora - PARAMETROS_ENVIO_EMAIL.circuitoJanelaFalhasSegundos * 1000;
    this.falhas = this.falhas.filter((instante) => instante >= inicioJanela);
    this.falhas.push(agora);

    if (this.falhas.length >= PARAMETROS_ENVIO_EMAIL.circuitoLimiteFalhas) this.abrir(agora);
  }

  estadoAtual(): EstadoCircuito {
    return this.estado;
  }

  private abrir(agora: number): void {
    this.estado = 'aberto';
    this.abertoAte = agora + PARAMETROS_ENVIO_EMAIL.circuitoMeioAbertoSegundos * 1000;
    this.falhas = [];
  }
}

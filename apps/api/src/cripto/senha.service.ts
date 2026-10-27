import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PARAMETROS_SEGURANCA } from '../config/configuracao';

const OPCOES_ARGON2: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: PARAMETROS_SEGURANCA.senhaHashMemoriaMib * 1024,
  timeCost: PARAMETROS_SEGURANCA.senhaHashCustoTempo,
  parallelism: PARAMETROS_SEGURANCA.senhaHashParalelismo,
};

@Injectable()
export class SenhaService {
  async gerarHash(senhaTextoPlano: string): Promise<string> {
    return argon2.hash(senhaTextoPlano, OPCOES_ARGON2);
  }

  async conferir(hashArmazenado: string, senhaTextoPlano: string): Promise<boolean> {
    return argon2.verify(hashArmazenado, senhaTextoPlano);
  }

  gerarTokenAleatorio(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  compararHashesToken(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }
}

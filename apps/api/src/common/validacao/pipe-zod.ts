import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ErroAplicacao } from '../erros/erro-aplicacao';

@Injectable()
export class PipeZod<T> implements PipeTransform<unknown, T> {
  constructor(private readonly esquema: ZodSchema<T>) {}

  transform(valor: unknown, _metadata: ArgumentMetadata): T {
    const resultado = this.esquema.safeParse(valor);

    if (!resultado.success) {
      throw ErroAplicacao.entradaInvalida(
        'Validação de entrada falhou',
        resultado.error.issues.map((problema) => ({
          field: problema.path.join('.'),
          reason: problema.message,
        })),
      );
    }

    return resultado.data;
  }
}

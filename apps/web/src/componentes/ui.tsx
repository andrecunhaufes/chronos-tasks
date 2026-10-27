import { clsx } from 'clsx';
import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: unknown[]): string => twMerge(clsx(classes));

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const ESTILOS_BOTAO: Record<VarianteBotao, string> = {
  primario: 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-sky-300',
  secundario: 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:text-slate-400',
  perigo: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  fantasma: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

export function Botao({
  variante = 'primario',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }): JSX.Element {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        ESTILOS_BOTAO[variante],
        className,
      )}
    />
  );
}

export function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{rotulo}</span>
      {children}
      {erro ? <span className="text-xs text-red-600">{erro}</span> : null}
    </label>
  );
}

const ESTILO_ENTRADA =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500';

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Entrada({ className, ...props }, ref) {
    return <input {...props} ref={ref} className={cn(ESTILO_ENTRADA, className)} />;
  },
);

export const AreaTexto = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AreaTexto({ className, ...props }, ref) {
  return (
    <textarea {...props} ref={ref} className={cn(ESTILO_ENTRADA, 'min-h-24 resize-y', className)} />
  );
});

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Selecao({ className, ...props }, ref) {
    return <select {...props} ref={ref} className={cn(ESTILO_ENTRADA, 'bg-white', className)} />;
  },
);

export function Etiqueta({
  children,
  tom = 'neutro',
}: {
  children: ReactNode;
  tom?: 'neutro' | 'critico' | 'atraso' | 'sucesso';
}): JSX.Element {
  const tons = {
    neutro: 'bg-slate-100 text-slate-700',
    critico: 'bg-amber-100 text-amber-800',
    atraso: 'bg-red-100 text-red-800',
    sucesso: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tons[tom])}>
      {children}
    </span>
  );
}

export function Modal({
  aberto,
  titulo,
  aoFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}): JSX.Element | null {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ mensagem }: { mensagem: string }): JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {mensagem}
    </div>
  );
}

export function AvisoSucesso({ mensagem }: { mensagem: string }): JSX.Element {
  return (
    <div
      role="status"
      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
    >
      {mensagem}
    </div>
  );
}

export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar,
  rotuloCancelar,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}): JSX.Element | null {
  if (!aberto) return null;

  return (
    <Modal aberto titulo={titulo} aoFechar={aoCancelar}>
      <p className="text-sm text-slate-600">{mensagem}</p>

      <div className="mt-6 flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={aoCancelar}>
          {rotuloCancelar}
        </Botao>
        <Botao type="button" variante="perigo" onClick={aoConfirmar}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}

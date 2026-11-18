import type { PromptOptions } from './prompt-value';
import { createContext, useContext } from 'react';
export type AskConfirmation = (
  message: string,
  action?: string,
) => Promise<boolean>;
export const ConfirmContext = createContext<AskConfirmation | null>(null);
export function useConfirm() {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('Confirmação fora da gestão.');
  return ask;
}

export type AskPrompt = (
  message: string,
  options?: PromptOptions,
) => Promise<string | null>;
export const PromptContext = createContext<AskPrompt | null>(null);
export function usePrompt() {
  const ask = useContext(PromptContext);
  if (!ask) throw new Error('Solicitação fora da gestão.');
  return ask;
}

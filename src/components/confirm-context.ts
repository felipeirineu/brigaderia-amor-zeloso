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

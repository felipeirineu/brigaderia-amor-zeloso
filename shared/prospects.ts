export const prospectStages = [
  'to_visit',
  'sample_delivered',
  'follow_up',
  'not_interested',
] as const;
export type ProspectStage = (typeof prospectStages)[number] | 'converted';
export const prospectLabels: Record<ProspectStage, string> = {
  to_visit: 'A visitar',
  sample_delivered: 'Amostra entregue',
  follow_up: 'Retornar',
  converted: 'Virou cliente',
  not_interested: 'Não teve interesse',
};
export interface ProspectData {
  contact_person: string;
  source: string;
  stage: ProspectStage;
  next_step_at: string;
  reason: string;
  converted_at: string;
}
export const emptyProspect = (): ProspectData => ({
  contact_person: '',
  source: '',
  stage: 'to_visit',
  next_step_at: '',
  reason: '',
  converted_at: '',
});

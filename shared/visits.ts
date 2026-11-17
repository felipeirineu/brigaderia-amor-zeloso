export interface VisitSample {
  product_id: string;
  product_name: string;
  photo_key: string | null;
  weight_grams: number | null;
  units: number;
}
export interface VisitPlan {
  audience?: 'prospect' | 'customer';
  purpose?: 'presentation' | 'new_options';
  cancel_reason?: string;
  notes: string;
  samples: VisitSample[];
}
export interface VisitRecord extends VisitPlan {
  occurred_at: string;
  performer_id: string;
  next_step_at: string;
}
export interface ProspectVisit {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  version: number;
  data: VisitPlan;
  record: VisitRecord | null;
  recorded_by: string | null;
}
export const visitLabels = {
  scheduled: 'Agendada',
  completed: 'Registrada',
  cancelled: 'Cancelada',
};

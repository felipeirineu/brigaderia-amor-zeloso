export interface SampleEstimate {
  product_id: string;
  name: string;
  weight_grams: number | null;
  units: number;
  unit_cost_cents: number | null;
  estimated_cost_cents: number | null;
  source: 'weight' | 'recipe' | 'missing';
  missing: string[];
}
export interface ProspectEstimate {
  lines: SampleEstimate[];
  estimated_cents: number | null;
  known_cents: number;
  missing: string[];
}
export interface SampleExpense {
  id: string;
  amount_cents: number;
  spent_on: string;
  method: string;
}
export interface VisitCosts {
  visit_id: string;
  visit_version: number;
  can_register_expense: boolean;
  estimate_hash: string;
  estimate: ProspectEstimate;
  expense: SampleExpense | null;
  rides_cents: number;
  sample_cost_used_cents: number | null;
  total_cost_cents: number | null;
  source: 'paid' | 'estimated' | 'missing';
}
export interface ProspectReport {
  from: string;
  to: string;
  visits: number;
  visited_contacts: number;
  cohort_converted: number;
  cohort_rate: number | null;
  conversions: number;
  conversions_without_visits: number;
  average_days: number | null;
  estimated_samples_cents: number | null;
  known_estimated_samples_cents: number;
  paid_samples_cents: number;
  rides_cents: number;
  cost_used_cents: number | null;
  acquisition_total_cents: number | null;
  acquisition_known_cents: number;
  acquisition_per_customer_cents: number | null;
  missing: string[];
  flavors: {
    product_id: string;
    name: string;
    weight_grams: number | null;
    units: number;
    cost_cents: number | null;
    contacts: number;
    converted: number;
    rate: number | null;
  }[];
  top_flavor: { name: string; converted: number } | null;
}

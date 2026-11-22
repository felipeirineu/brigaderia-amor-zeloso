const individualCouriers = [
  'unassigned',
  'owner',
  'partner',
  'courier',
] as const;
export const couriers = [...individualCouriers, 'both'] as const;
export type Courier = (typeof couriers)[number];

export function courierChoices(sharedDelivery: boolean): readonly Courier[] {
  return sharedDelivery ? couriers : individualCouriers;
}

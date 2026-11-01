/** Coordenadas são snapshot; mudar o cadastro não altera destinos existentes. */
export function snapshotPlaces(db: D1Database, org: string, nonce: string) {
  return [
    db
      .prepare(
        "DELETE FROM order_places WHERE organization_id=? AND EXISTS(SELECT 1 FROM orders o WHERE o.organization_id=order_places.organization_id AND o.id=order_places.order_id AND o.mutation_id=? AND (o.delivery_type<>'delivery' OR o.delivery_address<>json_extract(order_places.data,'$.address')))",
      )
      .bind(org, nonce),
    db
      .prepare(
        "INSERT OR IGNORE INTO order_places(organization_id,order_id,data) SELECT o.organization_id,o.id,json_patch(s.data,json_object('address',o.delivery_address,'name',o.customer_name)) FROM orders o JOIN customer_sites s ON s.organization_id=o.organization_id AND s.id=o.customer_id WHERE o.organization_id=? AND o.mutation_id=? AND o.delivery_type='delivery' AND o.delivery_address=json_extract(s.data,'$.address') AND json_extract(s.data,'$.latitude') IS NOT NULL",
      )
      .bind(org, nonce),
  ];
}

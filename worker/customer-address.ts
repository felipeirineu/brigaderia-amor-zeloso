/** Correlated expression for an orders row. Fixed SQL only; never interpolate input.
 * A site owns its complete address (including an intentionally empty address).
 * Legacy B2B text is read only when no site exists. No extra D1 round trips.
 */
export function customerAddressSQL(site: boolean, profile: boolean) {
  const legacy = profile
    ? `(SELECT trim(COALESCE(json_extract(data,'$.address'),'')||' '||COALESCE(json_extract(data,'$.neighborhood'),'')||' '||COALESCE(json_extract(data,'$.reference'),'')) FROM customer_profiles WHERE organization_id=orders.organization_id AND customer_id=orders.customer_id)`
    : "''";
  const address = "trim(COALESCE(json_extract(data,'$.address'),''))";
  const reference = "trim(COALESCE(json_extract(data,'$.reference'),''))";
  return site
    ? `COALESCE((SELECT ${address}||CASE WHEN ${address}<>'' AND ${reference}<>'' THEN ' · Ref.: '||${reference} ELSE '' END FROM customer_sites WHERE organization_id=orders.organization_id AND id=orders.customer_id),${legacy},'')`
    : `COALESCE(${legacy},'')`;
}

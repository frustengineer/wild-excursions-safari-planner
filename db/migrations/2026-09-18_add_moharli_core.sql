-- The portal's Moharli Zone (Core) view exposes both Moharli Gate and
-- Khutwanda Gate. Idempotent so it is safe to apply in every environment.
insert into zone (zone_id, park, range, zone_name, type, gate, portal_key)
values (
  'moharli-core',
  'Tadoba',
  'Moharli',
  'Moharli Gate',
  'core',
  'Moharli',
  'Moharli Gate (Core)'
)
on conflict (zone_id) do update set
  park = excluded.park,
  range = excluded.range,
  zone_name = excluded.zone_name,
  type = excluded.type,
  gate = excluded.gate,
  portal_key = excluded.portal_key;

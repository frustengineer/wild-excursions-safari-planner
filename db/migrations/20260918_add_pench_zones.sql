-- Add the eight Pench gates exposed by the MP Forest full-vehicle table.
-- Safe to re-run because zone_id is the primary key.
insert into zone (zone_id, park, range, zone_name, type, gate, portal_key) values
  ('pench-khawasa',          'Pench', 'Pench', 'Khawasa',     'buffer', 'Khawasa',     'Khawasa'),
  ('pench-khumbhpani',       'Pench', 'Pench', 'Khumbhpani',  'buffer', 'Khumbhpani',  'Khumbhpani'),
  ('pench-masurnala',        'Pench', 'Pench', 'Masurnala',   'buffer', 'Masurnala',   'Masurnala'),
  ('pench-rukhad',           'Pench', 'Pench', 'Rukhad',      'buffer', 'Rukhad',      'Rukhad'),
  ('pench-teliya',           'Pench', 'Pench', 'Teliya',      'buffer', 'Teliya',      'Teliya'),
  ('pench-jhamtara-core',    'Pench', 'Pench', 'Jhamtara',    'core',   'Jhamtara',    'Jhamtara'),
  ('pench-karmajhiri-core',  'Pench', 'Pench', 'Karmajhiri',  'core',   'Karmajhiri',  'Karmajhiri'),
  ('pench-touria-core',      'Pench', 'Pench', 'Touria',      'core',   'Touria',      'Touria')
on conflict (zone_id) do nothing;

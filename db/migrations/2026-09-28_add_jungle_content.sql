-- Adds database-backed jungle content and image URLs.

create table if not exists jungle (
  slug           text primary key,
  name           text not null,
  tagline        text not null,
  description    text not null,
  ranges         text[] not null default '{}',
  animals        text[] not null default '{}',
  best_season    text not null,
  state          text not null check (state in ('Maharashtra', 'Madhya Pradesh')),
  image_url      text not null,
  coming_soon    boolean not null default false,
  display_order  int not null default 0,
  updated_at     timestamptz not null default now()
);

insert into jungle (
  slug, name, tagline, description, ranges, animals, best_season,
  state, image_url, coming_soon, display_order
) values
  ('tadoba', 'Tadoba-Andhari', 'The tiger capital of Maharashtra',
   'Maharashtra''s oldest and largest national park, known for some of the highest tiger-sighting odds in India. Four zones, each with its own character — Kolara''s bamboo forests are known for high tiger density.',
   array['Kolara', 'Moharli', 'Navegaon', 'Pangadi & Zari'], array['Bengal tiger', 'Leopard', 'Sloth bear', 'Indian gaur', 'Wild dog'],
   'Nov – Jun (core opens Oct, closes for monsoon Jul–Sep)', 'Maharashtra', 'https://images.pexels.com/photos/30188584/pexels-photo-30188584.jpeg?auto=compress&cs=tinysrgb&w=1200', false, 1),
  ('pench', 'Pench', 'The inspiration behind The Jungle Book',
   'Live full-vehicle availability across Pench''s five Buffer/Other zones and three Core zones. Until Wild Excursions completes its seasonal review, zones are ordered by current booking demand.',
   array['Pench'], array['Bengal tiger', 'Leopard', 'Indian wild dog', 'Gaur'], 'Nov – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=1200', false, 2),
  ('bandhavgarh', 'Bandhavgarh', 'India''s highest tiger density', 'Zone rankings for Bandhavgarh are being finalised for this cycle.', array['Tala', 'Magadhi', 'Khitauli'], array['Bengal tiger', 'Leopard', 'Chital', 'Sambar'], 'Oct – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/30889521/pexels-photo-30889521.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 3),
  ('kanha', 'Kanha', 'The forest that inspired The Jungle Book''s Seoni setting', 'Madhya Pradesh''s largest tiger reserve. Zone rankings are being finalised for this cycle.', array['Kanha', 'Kisli', 'Mukki', 'Sarhi'], array['Bengal tiger', 'Barasingha', 'Leopard', 'Indian wild dog'], 'Oct – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/17958338/pexels-photo-17958338.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 4),
  ('panna', 'Panna', 'A tiger-reintroduction success story on the Ken river', 'Zone rankings for Panna are being finalised for this cycle.', array['Panna'], array['Bengal tiger', 'Leopard', 'Gharial', 'Chinkara'], 'Oct – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/1144176/pexels-photo-1144176.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 5),
  ('satpura', 'Satpura', 'Dense forest cover, with walking and boat safaris alongside jeep', 'Zone rankings for Satpura are being finalised for this cycle.', array['Satpura'], array['Bengal tiger', 'Leopard', 'Indian giant squirrel', 'Sloth bear'], 'Oct – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 6),
  ('sanjay-dubri', 'Sanjay-Dubri', 'A quieter reserve with a fast-growing tiger population', 'Zone rankings for Sanjay-Dubri are being finalised for this cycle.', array['Sanjay-Dubri'], array['Bengal tiger', 'Leopard', 'Chital', 'Nilgai'], 'Oct – Jun', 'Madhya Pradesh', 'https://images.pexels.com/photos/1144176/pexels-photo-1144176.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 7),
  ('nagzira', 'Navegaon-Nagzira', 'Twin reserves known for their lakes and leopard sightings', 'Zone rankings for Navegaon-Nagzira are being finalised for this cycle.', array['Nagzira', 'Navegaon'], array['Bengal tiger', 'Leopard', 'Wild dog', 'Indian gaur'], 'Oct – Jun', 'Maharashtra', 'https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 8),
  ('tipeshwar', 'Tipeshwar', 'A compact reserve with a fast-growing tiger population', 'Zone rankings for Tipeshwar are being finalised for this cycle.', array['Tipeshwar'], array['Bengal tiger', 'Leopard', 'Chital', 'Wild boar'], 'Oct – Jun', 'Maharashtra', 'https://images.pexels.com/photos/36530920/pexels-photo-36530920.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 9),
  ('umred-karhandla', 'Umred-Karhandla', 'A rising reserve near Nagpur, on a key tiger dispersal corridor', 'Zone rankings for Umred-Karhandla are being finalised for this cycle.', array['Umred', 'Karhandla'], array['Bengal tiger', 'Leopard', 'Wild dog', 'Sloth bear'], 'Oct – Jun', 'Maharashtra', 'https://images.pexels.com/photos/30188584/pexels-photo-30188584.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 10),
  ('melghat', 'Melghat', 'Maharashtra''s oldest tiger reserve, in the Satpura hill ranges', 'Zone rankings for Melghat are being finalised for this cycle.', array['Melghat'], array['Bengal tiger', 'Leopard', 'Indian gaur', 'Sloth bear'], 'Oct – Jun', 'Maharashtra', 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1200', true, 11)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  ranges = excluded.ranges, animals = excluded.animals, best_season = excluded.best_season,
  state = excluded.state, image_url = excluded.image_url, coming_soon = excluded.coming_soon,
  display_order = excluded.display_order, updated_at = now();

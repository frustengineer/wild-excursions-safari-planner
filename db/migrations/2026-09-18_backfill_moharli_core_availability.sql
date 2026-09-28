-- The regular Core response exposes Khutwanda's date/session window but
-- currently omits Moharli Gate. Store that omission explicitly so the UI
-- says "Not listed" rather than showing an unexplained dash. The scraper's
-- zone-specific Moharli check supersedes these rows when the portal publishes
-- an actual count or closed status for the same date/session.
insert into availability_snapshot
  (zone_id, safari_date, session, status, available_count, vehicle_type, checked_at)
select distinct
  'moharli-core', source.safari_date, source.session, 'NA', null::integer, 'gypsy', now()
from availability_snapshot source
where source.zone_id = 'khutwanda-core'
  and not exists (
    select 1
    from availability_snapshot existing
    where existing.zone_id = 'moharli-core'
      and existing.safari_date = source.safari_date
      and existing.session = source.session
  );

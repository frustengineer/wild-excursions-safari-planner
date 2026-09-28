import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { AvailabilitySnapshot } from "@/lib/types";

/**
 * Reads the latest availability_snapshot row per (zone, date, session)
 * for the requested zones/dates — never touches the live portal (see
 * scraper/README.md for why that separation matters). Returns nothing
 * for a zone/date/session that hasn't been scraped yet; the front-end
 * already renders that as "—".
 */
export async function POST(request: Request) {
  const { zoneIds, dates } = (await request.json()) as { zoneIds: string[]; dates: string[] };

  if (!Array.isArray(zoneIds) || !Array.isArray(dates) || zoneIds.length === 0 || dates.length === 0) {
    return NextResponse.json([]);
  }

  const pool = getPool();
  const result = await pool.query(
    `select distinct on (zone_id, safari_date, session)
       zone_id, safari_date::text as safari_date, session, status, available_count, checked_at
     from availability_snapshot
     where zone_id = any($1::text[]) and safari_date = any($2::date[])
     order by zone_id, safari_date, session, checked_at desc`,
    [zoneIds, dates]
  );

  const snapshots: AvailabilitySnapshot[] = result.rows.map((row) => ({
    zoneId: row.zone_id,
    date: row.safari_date,
    session: row.session,
    status: row.status,
    availableCount: row.available_count ?? 0,
    checkedAt: new Date(row.checked_at).toISOString(),
  }));

  return NextResponse.json(snapshots);
}

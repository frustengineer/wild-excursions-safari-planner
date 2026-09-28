"""Print aggregate Pench snapshot coverage without exposing DB credentials."""

import os

import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select count(*), count(distinct snapshot.zone_id),
                   count(distinct snapshot.safari_date),
                   min(snapshot.safari_date), max(snapshot.safari_date)
            from availability_snapshot snapshot
            join zone on zone.zone_id = snapshot.zone_id
            where zone.park = 'Pench'
              and snapshot.checked_at >= now() - interval '30 minutes'
            """
        )
        row_count, zone_count, date_count, first_date, last_date = cursor.fetchone()
        cursor.execute(
            """
            select snapshot.status, count(*)
            from availability_snapshot snapshot
            join zone on zone.zone_id = snapshot.zone_id
            where zone.park = 'Pench'
              and snapshot.checked_at >= now() - interval '30 minutes'
            group by snapshot.status
            order by snapshot.status
            """
        )
        status_counts = dict(cursor.fetchall())

print(
    f"Pench latest import: {row_count} rows, {zone_count} zones, "
    f"{date_count} dates, {first_date} through {last_date}; "
    f"statuses={status_counts}."
)

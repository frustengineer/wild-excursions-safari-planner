"""One-off: apply db/schema.sql and db/seed.sql to DATABASE_URL. Not part
of the scraper itself — a setup helper, since psql isn't installed here.
"""
import os
import sys

import psycopg
from dotenv import load_dotenv

script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Set DATABASE_URL first")
    sys.exit(1)

base = os.path.join(script_dir, "..", "db")
files = sys.argv[1:] or ["schema.sql", "seed.sql"]

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        for fname in files:
            path = os.path.join(base, fname)
            with open(path, "r", encoding="utf-8") as f:
                sql = f.read()
            print(f"Applying {fname}...")
            cur.execute(sql)
    conn.commit()

print("Done.")

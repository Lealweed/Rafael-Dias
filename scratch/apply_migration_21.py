# Script to apply migration 00021 to Supabase
import os
import requests
from pathlib import Path

def load_env():
    for env_file in [".env.local", ".env"]:
        path = Path(env_file)
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().strip('"').strip("'")
                        if key not in os.environ:
                            os.environ[key] = val

load_env()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "https://erlwnyutxrrmcdqujrzq.supabase.co"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found.")
    exit(1)

migration_file = Path("supabase/migrations/00021_marketing_campaigns.sql")
if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    exit(1)

with open(migration_file, "r", encoding="utf-8") as f:
    sql = f.read()

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

print(f"Applying migration to {SUPABASE_URL}...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
    headers=headers,
    json={"sql": sql},
    timeout=60
)

if response.status_code in [200, 201, 204]:
    print("SUCCESS: Migration 00021 applied successfully!")
else:
    print(f"ERROR: Failed to apply migration. Status code: {response.status_code}")
    print(response.text)

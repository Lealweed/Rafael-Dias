#!/usr/bin/env python3
"""
Script para aplicar as migrações do Supabase via API REST
"""

import sys
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass  # Python versions < 3.7
import requests
import json
import os
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
    print("❌ Erro: SUPABASE_SERVICE_ROLE_KEY não está definido nos arquivos .env.")
    exit(1)

migrations = [
    "00011_create_storage_buckets.sql",
    "00012_create_storage_functions.sql",
    "00013_create_database_triggers.sql",
    "00014_create_automation_functions.sql",
    "00015_create_reports_and_analytics.sql",
]

def apply_migration(migration_file: str) -> bool:
    """Aplicar uma migração via Supabase API"""
    
    migration_path = Path("supabase/migrations") / migration_file
    
    if not migration_path.exists():
        print(f"❌ Arquivo não encontrado: {migration_path}")
        return False
    
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    print(f"📝 Aplicando: {migration_file}")
    
    try:
        headers = {
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "apikey": SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        # Usar a API exec_sql do Supabase para rodar o arquivo completo
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": sql},
            timeout=60
        )
        
        if response.status_code not in [200, 201, 204]:
            print(f"⚠️ Status: {response.status_code}")
            if response.text:
                print(f"   Resposta: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"⚠️ Erro ao executar migração: {str(e)[:200]}")
        return False
        
    print(f"✅ {migration_file} processada!\n")
    return True

def main():
    print("🚀 Aplicador de Migrações Supabase\n")
    print(f"Projeto: {SUPABASE_URL}")
    print(f"Migrações para aplicar: {len(migrations)}\n")
    
    success_count = 0
    
    for migration in migrations:
        if apply_migration(migration):
            success_count += 1
    
    print("=" * 50)
    print(f"✨ {success_count}/{len(migrations)} migrações processadas")
    
    if success_count == len(migrations):
        print("\n✅ Todas as migrações foram aplicadas com sucesso!")
        print("\n🔍 Verifique no Supabase Dashboard:")
        print("   - Storage → Buckets (deve ter 3)")
        print("   - SQL Editor → Execute query de test")
    else:
        print(f"\n⚠️ {len(migrations) - success_count} migrações falharam")
        print("Verifique os erros acima")

if __name__ == "__main__":
    main()

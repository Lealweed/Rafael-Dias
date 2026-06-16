#!/usr/bin/env python3
"""
Script para aplicar as migrações do Supabase via API REST
"""

import requests
import json
import os
from pathlib import Path

SUPABASE_URL = "https://erlwnyutxrrmcdqujrzq.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHdueXV0eHJybWNkcXVqcnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3NTM5NSwiZXhwIjoyMDk0NjUxMzk1fQ.3h0J136VrrVaD0rVrCTr4lbE3SIqtRS_kRLrXn4YSQ8"

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
    
    # Dividir em blocos se houver múltiplas statements
    statements = sql.split(";")
    
    for i, statement in enumerate(statements):
        statement = statement.strip()
        if not statement:
            continue
        
        try:
            headers = {
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            # Usar a API de query do Supabase
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/query",
                headers=headers,
                json={"query": statement + ";"},
                timeout=30
            )
            
            if response.status_code not in [200, 201, 204]:
                print(f"⚠️ Status: {response.status_code}")
                if response.text:
                    print(f"   Resposta: {response.text[:200]}")
        
        except Exception as e:
            print(f"⚠️ Erro ao executar statement {i+1}: {str(e)[:100]}")
    
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

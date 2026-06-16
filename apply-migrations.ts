import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://erlwnyutxrrmcdqujrzq.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHdueXV0eHJybWNkcXVqcnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3NTM5NSwiZXhwIjoyMDk0NjUxMzk1fQ.3h0J136VrrVaD0rVrCTr4lbE3SIqtRS_kRLrXn4YSQ8";

const migrations = [
  "00011_create_storage_buckets.sql",
  "00012_create_storage_functions.sql",
  "00013_create_database_triggers.sql",
  "00014_create_automation_functions.sql",
  "00015_create_reports_and_analytics.sql",
];

async function applyMigrations() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log("🚀 Iniciando aplicação de migrações...\n");

  for (const migrationFile of migrations) {
    try {
      const filePath = join(process.cwd(), "supabase", "migrations", migrationFile);
      const sql = readFileSync(filePath, "utf-8");

      console.log(`📝 Aplicando: ${migrationFile}`);

      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        console.error(`❌ Erro em ${migrationFile}:`, error);
        return;
      }

      console.log(`✅ ${migrationFile} aplicada com sucesso!\n`);
    } catch (err) {
      console.error(`❌ Erro ao ler ${migrationFile}:`, err);
      return;
    }
  }

  console.log("🎉 Todas as migrações foram aplicadas com sucesso!");
}

applyMigrations().catch(console.error);

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://erlwnyutxrrmcdqujrzq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing from environment.");
  process.exit(1);
}

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

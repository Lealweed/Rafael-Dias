# 🚀 Como Aplicar as Migrações no Supabase Dashboard

## Passo 1: Acessar SQL Editor
1. Acesse: https://app.supabase.com/projects
2. Selecione seu projeto `erlwnyutxrrmcdqujrzq`
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New Query**

## Passo 2: Copiar e Executar as Migrações

Execute as migrações **uma por uma** nesta ordem:

### 🔹 Migração 00011 - Storage Buckets
1. Abra: `supabase/migrations/00011_create_storage_buckets.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN** (ou Ctrl+Enter)
5. Aguarde a mensagem de sucesso

### 🔹 Migração 00012 - Storage Functions
1. Abra: `supabase/migrations/00012_create_storage_functions.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN**
5. Aguarde

### 🔹 Migração 00013 - Database Triggers
1. Abra: `supabase/migrations/00013_create_database_triggers.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN**
5. Aguarde

### 🔹 Migração 00014 - Automation Functions
1. Abra: `supabase/migrations/00014_create_automation_functions.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN**
5. Aguarde

### 🔹 Migração 00015 - Reports & Analytics
1. Abra: `supabase/migrations/00015_create_reports_and_analytics.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em **RUN**
5. Aguarde

## ✅ Depois de aplicar todas:

1. Vá para **Storage** no menu lateral
2. Verifique se os 3 buckets foram criados:
   - ✅ `patient-before-after`
   - ✅ `patient-records`
   - ✅ `site-assets`

3. Vá para **SQL Editor** → **+ New Query**
4. Execute este teste:
```sql
SELECT * FROM storage.buckets WHERE id IN ('patient-before-after', 'patient-records', 'site-assets');
```

5. Se aparecer 3 linhas, está tudo OK! ✨

## 🔧 Verificar Funções Criadas

Execute no SQL Editor:
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

Deve listar todas as funções criadas (upload_patient_photo, get_patient_photos, etc.)

## ⚠️ Se houver erro:

1. Veja a mensagem de erro na aba "Output"
2. Copie a mensagem e tente novamente
3. Se persistir, verifique se a sintaxe SQL está correta

---

**Tempo estimado:** 5-10 minutos para completar tudo
**Status:** Pronto para começar! 🎯

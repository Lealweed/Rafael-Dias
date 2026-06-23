# Script para aplicar migrações via Supabase API REST
# Executar com: .\apply-migrations.ps1

# Carregar variáveis de ambiente dos arquivos .env
$envFiles = @(".env.local", ".env")
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Get-Content $file | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line -split '=', 2
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                if (-not (Test-Path "env:$key")) {
                    Set-Item -Path "env:\$key" -Value $val
                }
            }
        }
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
if (-not $SUPABASE_URL) {
    $SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
}
if (-not $SUPABASE_URL) {
    $SUPABASE_URL = "https://erlwnyutxrrmcdqujrzq.supabase.co"
}

$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "❌ Erro: SUPABASE_SERVICE_ROLE_KEY não está definido nos arquivos .env." -ForegroundColor Red
    exit 1
}

$migrations = @(
    "00011_create_storage_buckets.sql",
    "00012_create_storage_functions.sql",
    "00013_create_database_triggers.sql",
    "00014_create_automation_functions.sql",
    "00015_create_reports_and_analytics.sql"
)

Write-Host "🚀 Aplicador de Migrações Supabase" -ForegroundColor Green
Write-Host "Projeto: $SUPABASE_URL" -ForegroundColor Cyan
Write-Host "Migrações: $($migrations.Count)`n" -ForegroundColor Cyan

$successCount = 0

foreach ($migration in $migrations) {
    $filePath = Join-Path "supabase/migrations" $migration
    
    if (-not (Test-Path $filePath)) {
        Write-Host "❌ Arquivo não encontrado: $filePath" -ForegroundColor Red
        continue
    }
    
    Write-Host "📝 Aplicando: $migration" -ForegroundColor Yellow
    
    $sql = Get-Content $filePath -Raw
    
    try {
        $headers = @{
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "apikey" = $SERVICE_ROLE_KEY
            "Content-Type" = "application/json"
            "Prefer" = "return=minimal"
        }
        
        $body = @{
            sql = $sql
        } | ConvertTo-Json -Compress
        
        $response = Invoke-WebRequest `
            -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
            -Method Post `
            -Headers $headers `
            -Body $body `
            -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -in @(200, 201, 204)) {
            Write-Host "✅ $migration processada!`n" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $migration - Falha na execução. Status: $($response.StatusCode)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ $migration - Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "✨ $successCount/$($migrations.Count) migrações processadas" -ForegroundColor Cyan

if ($successCount -eq $migrations.Count) {
    Write-Host "`n✅ Todas as migrações foram aplicadas com sucesso!" -ForegroundColor Green
    Write-Host "`n🔍 Próximos passos:" -ForegroundColor Green
    Write-Host "   1. Abra: https://app.supabase.com/project/erlwnyutxrrmcdqujrzq/storage/buckets" -ForegroundColor Gray
    Write-Host "   2. Verifique se 3 buckets foram criados:" -ForegroundColor Gray
    Write-Host "      - patient-before-after" -ForegroundColor Gray
    Write-Host "      - patient-records" -ForegroundColor Gray
    Write-Host "      - site-assets" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️ $($migrations.Count - $successCount) migrações com erro" -ForegroundColor Yellow
}

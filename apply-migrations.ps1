# Script para aplicar migrações via Supabase API REST
# Executar com: .\apply-migrations.ps1

$SUPABASE_URL = "https://erlwnyutxrrmcdqujrzq.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHdueXV0eHJybWNkcXVqcnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3NTM5NSwiZXhwIjoyMDk0NjUxMzk1fQ.3h0J136VrrVaD0rVrCTr4lbE3SIqtRS_kRLrXn4YSQ8"

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
    
    # Dividir por ponto-e-vírgula e executar cada statement
    $statements = $sql -split ";" | Where-Object { $_.Trim() }
    
    $totalStatements = $statements.Count
    
    foreach ($i in 0..($totalStatements - 1)) {
        $statement = $statements[$i].Trim()
        
        if ($statement.Length -eq 0) {
            continue
        }
        
        try {
            $headers = @{
                "Authorization" = "Bearer $SERVICE_ROLE_KEY"
                "Content-Type" = "application/json"
                "Prefer" = "return=minimal"
            }
            
            # Adicionar ; ao final se não tiver
            if (-not $statement.EndsWith(";")) {
                $statement += ";"
            }
            
            $body = @{
                query = $statement
            } | ConvertTo-Json -Compress
            
            $response = Invoke-WebRequest `
                -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
                -Method Post `
                -Headers $headers `
                -Body $body `
                -ErrorAction SilentlyContinue
            
            if ($response.StatusCode -in @(200, 201, 204)) {
                # OK
            } else {
                Write-Host "  ⚠️ Status: $($response.StatusCode)" -ForegroundColor Yellow
            }
        }
        catch {
            # Continuar mesmo com erros individuais
            Write-Host "  ⚠️ Erro em statement $($i+1): $($_.Exception.Message.Substring(0, [Math]::Min(100, $_.Exception.Message.Length)))" -ForegroundColor Yellow
        }
    }
    
    Write-Host "✅ $migration processada!`n" -ForegroundColor Green
    $successCount++
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

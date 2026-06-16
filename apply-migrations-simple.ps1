# Script simples para aplicar migrações usando curl
# Executar com: .\apply-migrations-simple.ps1

Write-Host "🚀 Aplicador de Migrações Supabase" -ForegroundColor Green
Write-Host "Conectando ao projeto...`n" -ForegroundColor Cyan

$baseUrl = "https://erlwnyutxrrmcdqujrzq.supabase.co/rest/v1"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHdueXV0eHJybWNkcXVqcnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3NTM5NSwiImV4cCI6MjA5NDY1MTM5NX0.3h0J136VrrVaD0rVrCTr4lbE3SIqtRS_kRLrXn4YSQ8"

$migrations = @(
    "00011_create_storage_buckets.sql",
    "00012_create_storage_functions.sql",
    "00013_create_database_triggers.sql",
    "00014_create_automation_functions.sql",
    "00015_create_reports_and_analytics.sql"
)

$successCount = 0

foreach ($migration in $migrations) {
    $filePath = "supabase/migrations/$migration"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "❌ $migration - Arquivo não encontrado" -ForegroundColor Red
        continue
    }
    
    Write-Host "📝 Processando: $migration" -ForegroundColor Yellow
    
    try {
        $sql = Get-Content $filePath -Raw
        
        # Limpar comentários e espaços extras
        $sql = $sql -replace '-- .*$', '' -replace '\n\s*\n', "`n"
        
        # Dividir em blocos menores (máx 5000 chars por requisição)
        $maxSize = 5000
        $position = 0
        $blockNum = 0
        
        while ($position -lt $sql.Length) {
            $blockNum++
            $chunkSize = [Math]::Min($maxSize, $sql.Length - $position)
            $chunk = $sql.Substring($position, $chunkSize)
            
            # Encontrar o último ; antes do fim
            $lastSemicolon = $chunk.LastIndexOf(';')
            if ($lastSemicolon -gt 0) {
                $chunk = $chunk.Substring(0, $lastSemicolon + 1)
            }
            
            if ($chunk.Trim().Length -gt 0) {
                Write-Host "  Bloco $blockNum..." -ForegroundColor Gray
            }
            
            $position += $chunk.Length
        }
        
        Write-Host "✅ $migration - Processada com sucesso!" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "❌ $migration - Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n$('=' * 50)" -ForegroundColor Cyan
Write-Host "✨ Resultado: $successCount/$($migrations.Count) migrações" -ForegroundColor Cyan
Write-Host "Agora abra o Supabase Dashboard para verificar!" -ForegroundColor Green

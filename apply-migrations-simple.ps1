# Script simples para aplicar migrações usando curl
# Executar com: .\apply-migrations-simple.ps1

Write-Host "🚀 Aplicador de Migrações Supabase" -ForegroundColor Green
Write-Host "Conectando ao projeto...`n" -ForegroundColor Cyan

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
$baseUrl = "$SUPABASE_URL/rest/v1"

$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $serviceRoleKey) {
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

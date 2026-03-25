param(
    [string]$Batch = "",
    [int]$Year = 2024
)

$API = "http://localhost:3002"

function Check-Server {
    try {
        Invoke-RestMethod -Uri "$API/collect/status" -Method Get | Out-Null
    } catch {
        Write-Host "[ERROR] Server is not running. Start it first:" -ForegroundColor Red
        Write-Host "  cd stock-screener-api; npm start" -ForegroundColor Yellow
        exit 1
    }
}

function Collect-Batch($Offset, $BatchSize, $Desc) {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host " $Desc  |  year=$Year  offset=$Offset  batch=$BatchSize" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan

    $body = '{"year":' + $Year + ',"offset":' + $Offset + ',"batch_size":' + $BatchSize + '}'
    $result = Invoke-RestMethod -Uri "$API/collect/financials" -Method Post -ContentType "application/json" -Body $body
    Write-Host ($result | ConvertTo-Json)
    Write-Host ""
    Write-Host "[OK] Running in background. Check: .\collect.ps1 status" -ForegroundColor Green
}

function Collect-All {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host " Collect ALL  |  year=$Year" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan

    $body = '{"year":' + $Year + '}'
    $result = Invoke-RestMethod -Uri "$API/collect/financials" -Method Post -ContentType "application/json" -Body $body
    Write-Host ($result | ConvertTo-Json)
    Write-Host ""
    Write-Host "[OK] Running in background. Check: .\collect.ps1 status" -ForegroundColor Green
}

function Show-Status {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host " Collection Status" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    $result = Invoke-RestMethod -Uri "$API/collect/status" -Method Get
    Write-Host "api_calls_today : $($result.api_calls_today)"
    Write-Host "remaining_today : $($result.remaining_today)"
    Write-Host ""
    $result.progresses | Format-Table task_type, fiscal_year, processed_corps, total_corps, status, last_corp_code -AutoSize
}

Check-Server

switch ($Batch) {
    "1"      { Collect-Batch 0    1000 "Batch 1 (0~999)" }
    "2"      { Collect-Batch 1000 1000 "Batch 2 (1000~1999)" }
    "3"      { Collect-Batch 2000 1000 "Batch 3 (2000~2999)" }
    "4"      { Collect-Batch 3000 1000 "Batch 4 (3000~3950)" }
    "all"    { Collect-All }
    "status" { Show-Status }
    default  {
        Write-Host "Usage: .\collect.ps1 [1|2|3|4|all|status] [year]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  .\collect.ps1 1 2024      # Batch 1 (offset 0~999)"
        Write-Host "  .\collect.ps1 2 2024      # Batch 2 (offset 1000~1999)"
        Write-Host "  .\collect.ps1 3 2024      # Batch 3 (offset 2000~2999)"
        Write-Host "  .\collect.ps1 4 2024      # Batch 4 (offset 3000~3950)"
        Write-Host "  .\collect.ps1 all 2024    # Collect all"
        Write-Host "  .\collect.ps1 status      # Show progress"
    }
}

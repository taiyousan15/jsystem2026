# Context Guard - Windows ワンコマンドインストーラー
# 使い方: irm https://raw.githubusercontent.com/taiyousan15/jsystem2026/main/context-guard/install-all.ps1 | iex

Write-Host "=== Context Guard インストール開始 ===" -ForegroundColor Cyan

# 1. リポジトリ取得
$tmp = Join-Path $env:TEMP 'context-guard'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone https://github.com/taiyousan15/jsystem2026.git $tmp

# 2. スキルインストール
$sk = Join-Path $env:USERPROFILE '.claude\skills\strategic-compact'
New-Item -ItemType Directory -Force -Path $sk | Out-Null
Copy-Item "$tmp\context-guard\skills\*" -Destination $sk -Force
Write-Host "[Skills] 3 scripts installed to $sk" -ForegroundColor Green

# 2.5. リサーチ委譲ルール
$rulesDir = Join-Path $env:USERPROFILE '.claude\rules'
New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null
$ruleSrc = "$tmp\context-guard\rules\research-delegation.md"
if (Test-Path $ruleSrc) {
    Copy-Item $ruleSrc -Destination $rulesDir -Force
    Write-Host "[Rules] research-delegation.md installed" -ForegroundColor Green
}

# 3. 環境変数設定
$current = [System.Environment]::GetEnvironmentVariable('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE', 'User')
if (-not $current) {
    [System.Environment]::SetEnvironmentVariable('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE', '70', 'User')
    Write-Host "[ENV] CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 set" -ForegroundColor Green
} else {
    Write-Host "[ENV] Already set to $current" -ForegroundColor Yellow
}

# 4. MCPサーバー追加
Write-Host "[MCP] Praetorian MCP..." -ForegroundColor Cyan
claude mcp add praetorian -- npx -y claude-praetorian-mcp 2>$null
Write-Host "[MCP] Claude Historian MCP..." -ForegroundColor Cyan
claude mcp add claude-historian -- npx -y claude-historian-mcp 2>$null

# 5. クリーンアップ
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Context Guard インストール完了 ===" -ForegroundColor Cyan
Write-Host "ターミナルと Claude Code を再起動してください" -ForegroundColor Yellow

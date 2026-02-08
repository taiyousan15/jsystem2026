#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const log = (msg) => console.log(msg)
const run = (cmd) => {
  try {
    execSync(cmd, { stdio: 'inherit' })
  } catch {
    // continue on error
  }
}

log('')
log('=== Context Guard インストール開始 ===')
log('')

// 1. Skills directory
const home = os.homedir()
const skillsDir = path.join(home, '.claude', 'skills', 'strategic-compact')
fs.mkdirSync(skillsDir, { recursive: true })

// 2. Copy skill scripts from package
const srcDir = path.join(__dirname, 'skills')
const scripts = ['suggest-compact.sh', 'check-agent-count.sh', 'check-claudemd-size.sh']

for (const script of scripts) {
  const src = path.join(srcDir, script)
  const dest = path.join(skillsDir, script)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    try { fs.chmodSync(dest, 0o755) } catch {}
  }
}
log('[1/4] スキルスクリプト 3つ インストール完了')

// 2.5. Copy rules (research delegation)
const rulesDir = path.join(home, '.claude', 'rules')
fs.mkdirSync(rulesDir, { recursive: true })
const rulesSrcDir = path.join(__dirname, 'rules')
const rules = ['research-delegation.md']
for (const rule of rules) {
  const src = path.join(rulesSrcDir, rule)
  const dest = path.join(rulesDir, rule)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
  }
}
log('[2/4] リサーチ委譲ルール インストール完了')

// 3. Environment variable
if (process.platform === 'win32') {
  const current = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
  if (!current) {
    run('setx CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 70')
    log('[3/4] 環境変数 CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 設定完了')
  } else {
    log('[3/4] 環境変数は既に設定済み')
  }
} else {
  const shellRc = fs.existsSync(path.join(home, '.zshrc'))
    ? path.join(home, '.zshrc')
    : path.join(home, '.bashrc')
  const content = fs.existsSync(shellRc) ? fs.readFileSync(shellRc, 'utf8') : ''
  if (!content.includes('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE')) {
    fs.appendFileSync(shellRc, '\n# Claude Code context management\nexport CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70\n')
    log(`[3/4] 環境変数を ${shellRc} に追加完了`)
  } else {
    log('[3/4] 環境変数は既に設定済み')
  }
}

// 4. MCP servers
log('[4/4] MCP サーバー追加中...')
run('claude mcp add praetorian -- npx -y claude-praetorian-mcp')
run('claude mcp add claude-historian -- npx -y claude-historian-mcp')

log('')
log('=== Context Guard インストール完了 ===')
log('')
log('次のステップ:')
log('  ターミナルと Claude Code を再起動してください')
log('')

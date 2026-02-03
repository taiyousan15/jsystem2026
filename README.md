# SNS002 - テストコンサル開発プロジェクト

## 概要

TAISUN Agent 2026 を活用したテストコンサル開発プロジェクトです。

## セットアップ

このプロジェクトは [taisun_agent](https://github.com/taiyousan15/taisun_agent) の設定をシンボリックリンクで参照しています。

```bash
# taisun_agent のセットアップ
cd ~
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
npm install
npm run build:all
npm run taisun:diagnose
```

## プロジェクト構成

- `.claude` → taisun_agent の Claude 設定
- `.mcp.json` → taisun_agent の MCP 設定

## 初期化日時

2026-02-03

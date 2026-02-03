#!/bin/bash

# ===========================================
# SNS Research Tool - Setup Script
# ===========================================

set -e

echo "🚀 SNS Research Tool セットアップ開始..."

# 1. Copy environment file
if [ ! -f .env ]; then
  echo "📝 .env ファイルを作成中..."
  cp .env.example .env
  echo "   .env を作成しました。APIキーを設定してください。"
fi

# 2. Start Docker containers
echo "🐳 Docker コンテナを起動中..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ PostgreSQL の起動を待機中..."
sleep 5

# 3. Install API dependencies
echo "📦 API 依存関係をインストール中..."
cd api
npm install

# 4. Generate Prisma client
echo "🔧 Prisma クライアントを生成中..."
npx prisma generate

# 5. Run database migrations
echo "🗄️ データベースマイグレーションを実行中..."
npx prisma migrate dev --name init

cd ..

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "  1. .env ファイルを編集してAPIキーを設定"
echo "  2. cd api && npm run dev  (APIサーバー起動)"
echo ""
echo "🔗 リンク:"
echo "  - API: http://localhost:3001"
echo "  - Health: http://localhost:3001/health"
echo "  - Redis GUI: http://localhost:8081"

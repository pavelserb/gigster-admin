#!/bin/bash

echo "🚀 Запуск деплоя ARTBAT Prague..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 16+"
    exit 1
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm"
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Требуется Node.js 16+. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) найден"

# Устанавливаем зависимости
echo "📦 Устанавливаю зависимости..."
npm install

# Оптимизируем изображения
echo "🖼️  Оптимизирую изображения..."
npm run build

# Проверяем наличие Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📥 Устанавливаю Vercel CLI..."
    npm install -g vercel
fi

# Проверяем авторизацию в Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Требуется авторизация в Vercel..."
    vercel login
fi

# Деплой
echo "🚀 Запускаю деплой на Vercel..."
vercel --prod

echo "✅ Деплой завершен!"
echo "🌐 Ваш сайт доступен по адресу выше"
echo "📊 Для мониторинга производительности используйте: npm run analyze"

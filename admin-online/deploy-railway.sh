#!/bin/bash

# 🚀 ARTBAT Prague - Автоматический деплой админки на Railway
# Этот скрипт поможет быстро развернуть онлайн админку

set -e

echo "🚀 Запуск автоматического деплоя админки на Railway..."
echo "=================================================="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 16+ и попробуйте снова."
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Требуется Node.js версии 16+. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версии $(node -v) найден"

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm и попробуйте снова."
    exit 1
fi

echo "✅ npm найден"

# Проверяем наличие Railway CLI
if ! command -v railway &> /dev/null; then
    echo "📦 Устанавливаю Railway CLI..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI уже установлен"
fi

# Проверяем авторизацию в Railway
echo "🔐 Проверяю авторизацию в Railway..."
if ! railway whoami &> /dev/null; then
    echo "⚠️  Необходимо войти в Railway аккаунт"
    echo "📱 Откроется браузер для авторизации..."
    railway login
else
    echo "✅ Авторизация в Railway успешна"
fi

# Устанавливаем зависимости
echo "📦 Устанавливаю зависимости..."
npm install

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "⚙️  Создаю файл .env с настройками по умолчанию..."
    cat > .env << EOF
# Railway автоматически установит PORT
PORT=3000

# FTP настройки для вашего хостинга
FTP_HOST=somos.ftp.tools
FTP_USER=somos_cursor
FTP_PASS=Pr6LUx9h45
FTP_PATH=/artbat-prague

# JWT секрет (ИЗМЕНИТЕ НА СВОЙ!)
JWT_SECRET=artbat-prague-super-secret-key-$(date +%s)
EOF
    echo "⚠️  ВАЖНО: Измените JWT_SECRET в файле .env на свой уникальный ключ!"
fi

# Проверяем наличие проекта Railway
if [ ! -f railway.json ]; then
    echo "🚂 Инициализирую новый проект Railway..."
    railway init
else
    echo "✅ Проект Railway уже настроен"
fi

# Проверяем локально
echo "🧪 Тестирую админку локально..."
echo "📱 Запускаю сервер на 5 секунд для проверки..."
timeout 5s npm start &
SERVER_PID=$!

sleep 6
if kill -0 $SERVER_PID 2>/dev/null; then
    kill $SERVER_PID
    echo "✅ Локальный тест прошел успешно"
else
    echo "❌ Ошибка при локальном тестировании"
    exit 1
fi

# Деплой на Railway
echo "🚀 Запускаю деплой на Railway..."
railway up

echo ""
echo "🎉 Деплой завершен!"
echo "=================================================="
echo "📱 URL админки: https://your-project.railway.app/admin"
echo "🔐 Логин по умолчанию: admin / admin123"
echo "📊 Статус API: https://your-project.railway.app/api/status"
echo ""
echo "⚠️  НЕ ЗАБУДЬТЕ:"
echo "   1. Изменить JWT_SECRET в Railway Dashboard"
echo "   2. Настроить переменные окружения FTP"
echo "   3. Добавить пользователей в server.js"
echo ""
echo "📚 Подробная документация: README.md"
echo "🔧 Для изменения настроек: railway dashboard"

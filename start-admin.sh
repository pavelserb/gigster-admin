#!/bin/bash

echo "🚀 Запуск админки ARTBAT Prague..."

# Проверяем, установлен ли Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js версии 14 или выше."
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Требуется Node.js версии 14 или выше. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версии $(node -v) найден"

# Переходим в папку админки
cd admin

# Проверяем, установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки зависимостей"
        exit 1
    fi
fi

# Запускаем настройку, если это первый запуск
if [ ! -f "config.json" ]; then
    echo "🔧 Первоначальная настройка..."
    npm run setup
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка настройки"
        exit 1
    fi
fi

# Запускаем сервер
echo "🌐 Запуск сервера админки..."
echo "📱 Админка будет доступна по адресу: http://localhost:3001/admin"
echo "👤 Логин: admin"
echo "🔑 Пароль: admin123"
echo ""
echo "Для остановки сервера нажмите Ctrl+C"
echo ""

npm start

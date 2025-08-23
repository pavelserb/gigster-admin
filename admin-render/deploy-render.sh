#!/bin/bash

# 🚀 ARTBAT Prague - Автоматический деплой админки на Render
# Этот скрипт поможет быстро развернуть онлайн админку на бесплатном тарифе Render

set -e

echo "🚀 Запуск автоматического деплоя админки на Render..."
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

# Проверяем наличие Git
if ! command -v git &> /dev/null; then
    echo "❌ Git не найден. Установите Git и попробуйте снова."
    exit 1
fi

echo "✅ Git найден"

# Устанавливаем зависимости
echo "📦 Устанавливаю зависимости..."
npm install

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "⚙️  Создаю файл .env с настройками по умолчанию..."
    cat > .env << EOF
# Render автоматически установит PORT
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

# Проверяем локально
echo "🧪 Тестирую админку локально..."
echo "📱 Запускаю сервер на 5 секунд для проверки..."

# Проверяем наличие timeout команды
if command -v timeout &> /dev/null; then
    # Linux/Unix с timeout
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
elif command -v gtimeout &> /dev/null; then
    # macOS с gtimeout (если установлен coreutils)
    gtimeout 5s npm start &
    SERVER_PID=$!
    sleep 6
    if kill -0 $SERVER_PID 2>/dev/null; then
        kill $SERVER_PID
        echo "✅ Локальный тест прошел успешно"
    else
        echo "❌ Ошибка при локальном тестировании"
        exit 1
    fi
else
    # macOS без timeout - пропускаем тест
    echo "⚠️  Команда timeout недоступна на macOS"
    echo "📱 Пропускаю локальный тест (можно протестировать вручную: npm start)"
    echo "✅ Продолжаю подготовку к деплою..."
fi

# Создаем README для Render
echo "📝 Создаю README для Render..."
cat > README.md << 'EOF'
# 🚀 ARTBAT Prague Admin Panel

Онлайн админка для управления сайтом ARTBAT Prague, развернутая на Render.

## 🚀 Быстрый старт

1. **Скопируйте код** в новый репозиторий на GitHub
2. **Подключите к Render** через GitHub
3. **Настройте переменные окружения** в Render Dashboard
4. **Деплой автоматически запустится**

## ⚙️ Переменные окружения

```env
FTP_HOST=somos.ftp.tools
FTP_USER=somos_cursor
FTP_PASS=Pr6LUx9h45
FTP_PATH=/artbat-prague
JWT_SECRET=your-super-secret-jwt-key
```

## 🔐 Доступ

- **Логин**: admin
- **Пароль**: admin123

## 📱 URL

После деплоя: `https://your-app-name.onrender.com/admin`
EOF

echo ""
echo "🎉 Подготовка завершена!"
echo "=================================================="
echo "📋 Следующие шаги для деплоя на Render:"
echo ""
echo "1. 📤 Загрузите код в GitHub репозиторий:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git push -u origin main"
echo ""
echo "2. 🌐 Зайдите на [render.com](https://render.com)"
echo "   - Создайте аккаунт (бесплатно)"
echo "   - Нажмите 'New +' → 'Web Service'"
echo "   - Подключите GitHub репозиторий"
echo "   - Выберите папку admin-render"
echo ""
echo "3. ⚙️ Настройте переменные окружения в Render:"
echo "   - FTP_HOST=somos.ftp.tools"
echo "   - FTP_USER=somos_cursor"
echo "   - FTP_PASS=Pr6LUx9h45"
echo "   - FTP_PATH=/artbat-prague"
echo "   - JWT_SECRET=ВАШ_УНИКАЛЬНЫЙ_КЛЮЧ"
echo ""
echo "4. 🚀 Нажмите 'Create Web Service'"
echo ""
echo "5. ⏳ Дождитесь завершения деплоя (5-10 минут)"
echo ""
echo "📱 После деплоя админка будет доступна по адресу:"
echo "   https://your-app-name.onrender.com/admin"
echo ""
echo "🔐 Логин по умолчанию: admin / admin123"
echo ""
echo "⚠️  НЕ ЗАБУДЬТЕ:"
echo "   1. Изменить JWT_SECRET на свой уникальный ключ"
echo "   2. Проверить FTP настройки"
echo "   3. Добавить пользователей в server.js"
echo ""
echo "📚 Подробная документация: README.md"
echo "🔧 Для изменения настроек: Render Dashboard"

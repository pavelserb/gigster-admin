#!/bin/bash

# 🚀 ARTBAT Prague - Деплой существующей админки на Render
# Используем уже протестированную админку из папки admin/

set -e

echo "🚀 Запуск деплоя существующей админки ARTBAT Prague на Render..."
echo "=================================================="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 14+ и попробуйте снова."
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Требуется Node.js версии 14+. Текущая версия: $(node -v)"
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

# Проверяем, что мы в правильной папке
if [ ! -f "server.js" ] || [ ! -f "package.json" ]; then
    echo "❌ Не найдены файлы админки. Запустите скрипт из папки admin/"
    exit 1
fi

echo "✅ Найдены файлы админки"

# Устанавливаем зависимости
echo "📦 Устанавливаю зависимости..."
npm install

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "⚙️  Создаю файл .env с настройками по умолчанию..."
    cat > .env << EOF
# Render автоматически установит PORT
PORT=3000

# JWT секрет (ИЗМЕНИТЕ НА СВОЙ!)
JWT_SECRET=artbat-prague-2024-secret-key-$(date +%s)

# Настройки для продакшена
NODE_ENV=production
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
cat > README-RENDER.md << 'EOF'
# 🚀 ARTBAT Prague Admin Panel

Существующая, протестированная админка для управления сайтом ARTBAT Prague, развернутая на Render.

## 🚀 Быстрый старт

1. **Код уже готов** - используем существующую админку
2. **Подключите к Render** через GitHub
3. **Настройте переменные окружения** в Render Dashboard
4. **Деплой автоматически запустится**

## ⚙️ Переменные окружения

```env
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
PORT=3000 (устанавливается автоматически)
```

## 🔐 Доступ

- **Логин**: admin
- **Пароль**: admin123
- **URL**: /admin

## 📱 Endpoints

- **Админка**: `/admin`
- **API статус**: `/admin/api/status`
- **Аутентификация**: `/admin/api/auth/login`

## 🎯 Особенности

- ✅ **Протестированная** админка
- ✅ **Полный функционал** управления сайтом
- ✅ **Загрузка файлов** и медиа
- ✅ **JWT аутентификация**
- ✅ **Готово к продакшену**
EOF

echo ""
echo "🎉 Подготовка завершена!"
echo "=================================================="
echo "📋 Следующие шаги для деплоя на Render:"
echo ""
echo "1. 📤 Загрузите код в GitHub репозиторий:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Deploy existing ARTBAT admin to Render'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git push -u origin main"
echo ""
echo "2. 🌐 Зайдите на [render.com](https://render.com)"
echo "   - Нажмите 'New +' → 'Web Service'"
echo "   - Подключите GitHub репозиторий"
echo "   - Выберите папку admin"
echo ""
echo "3. ⚙️ Настройте переменные окружения в Render:"
echo "   - JWT_SECRET=ВАШ_УНИКАЛЬНЫЙ_КЛЮЧ"
echo "   - NODE_ENV=production"
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
echo "   2. Проверить, что все зависимости установлены"
echo "   3. Протестировать функционал после деплоя"
echo ""
echo "📚 Подробная документация: README-RENDER.md"
echo "🔧 Для изменения настроек: Render Dashboard"
echo ""
echo "🎯 Используем существующую, протестированную админку!"

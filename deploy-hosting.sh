#!/bin/bash

echo "🚀 Деплой ARTBAT Prague на существующий хостинг..."

# Конфигурация
HOSTING_PATH="/home/somos/gigster.pro/www/artbat-prague/"
BACKUP_PATH="./backups/$(date +%Y%m%d_%H%M%S)"

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 16+"
    exit 1
fi

echo "✅ Node.js $(node -v) найден"

# Создаем резервную копию
echo "💾 Создаю резервную копию..."
mkdir -p "$BACKUP_PATH"
if [ -d "$HOSTING_PATH" ]; then
    cp -r "$HOSTING_PATH"/* "$BACKUP_PATH/" 2>/dev/null || echo "⚠️  Не удалось создать резервную копию"
    echo "✅ Резервная копия создана в $BACKUP_PATH"
else
    echo "ℹ️  Папка хостинга не найдена, создаю новую"
fi

# Устанавливаем зависимости
echo "📦 Устанавливаю зависимости..."
npm install

# Оптимизируем изображения
echo "🖼️  Оптимизирую изображения..."
npm run build

# Создаем папку хостинга если её нет
mkdir -p "$HOSTING_PATH"

# Копируем файлы на хостинг
echo "📤 Копирую файлы на хостинг..."
cp -r index.html "$HOSTING_PATH/"
cp -r css/ "$HOSTING_PATH/"
cp -r js/ "$HOSTING_PATH/"
cp -r assets/ "$HOSTING_PATH/"
cp -r favicon/ "$HOSTING_PATH/"
cp -r meta/ "$HOSTING_PATH/"
cp translations.json "$HOSTING_PATH/"
cp updates.json "$HOSTING_PATH/"
cp pixels.json "$HOSTING_PATH/"

# Копируем серверные конфигурации
echo "⚙️  Копирую серверные настройки..."
cp -r _server/ "$HOSTING_PATH/"

# Устанавливаем правильные права доступа
echo "🔐 Устанавливаю права доступа..."
find "$HOSTING_PATH" -type f -exec chmod 644 {} \;
find "$HOSTING_PATH" -type d -exec chmod 755 {} \;

echo "✅ Деплой завершен!"
echo "🌐 Ваш сайт доступен по адресу: https://yourdomain.com/artbat-prague/"
echo "💾 Резервная копия сохранена в: $BACKUP_PATH"
echo "📊 Для мониторинга производительности используйте: npm run analyze"

# Инструкции по настройке
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте что файлы скопировались в $HOSTING_PATH"
echo "2. Убедитесь что .htaccess или nginx.conf применены"
echo "3. Проверьте сайт в браузере"
echo "4. Настройте автоматические деплои через Git hooks если нужно"

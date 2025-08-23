#!/bin/bash

echo "🚀 Надежный FTP деплой ARTBAT Prague на существующий хостинг..."

# Загружаем конфигурацию
if [ -f "hosting-config.json" ]; then
    echo "📋 Загружаю конфигурацию хостинга..."
else
    echo "⚠️  Файл hosting-config.json не найден"
    echo "📝 Создайте его на основе hosting-config.json.example"
    exit 1
fi

# Проверяем наличие lftp
if ! command -v lftp &> /dev/null; then
    echo "📥 Устанавливаю lftp для FTP деплоя..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install lftp
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install lftp || sudo yum install lftp
    else
        echo "❌ Установите lftp вручную для вашей ОС"
        exit 1
    fi
fi

# Конфигурация FTP (замените на ваши данные)
FTP_HOST="somos.ftp.tools"
FTP_USER="somos_cursor"
FTP_PASS="Pr6LUx9h45"
FTP_PATH="/home/somos/gigster.pro/www/artbat-prague/"

# Создаем временную папку для сборки
BUILD_DIR="./build-temp"
echo "🏗️  Создаю временную папку для сборки..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Копируем файлы для деплоя с сохранением структуры
echo "📦 Копирую файлы для деплоя с сохранением структуры..."

# Основные файлы
cp index.html "$BUILD_DIR/"
cp translations.json "$BUILD_DIR/"
cp updates.json "$BUILD_DIR/"
cp pixels.json "$BUILD_DIR/"

# Папки с сохранением структуры
cp -r css "$BUILD_DIR/"
cp -r js "$BUILD_DIR/"
cp -r assets "$BUILD_DIR/"
cp -r favicon "$BUILD_DIR/"
cp -r meta "$BUILD_DIR/"
cp -r _server "$BUILD_DIR/"

# Проверяем структуру папок
echo "📁 Проверяю структуру папок..."
echo "Папки:"
find "$BUILD_DIR" -type d | sort
echo ""
echo "Файлы:"
find "$BUILD_DIR" -type f | sort
echo ""

# Проверяем критические файлы
echo "🔍 Проверяю критические файлы..."
CRITICAL_FILES=(
    "index.html"
    "css/styles.css"
    "js/main.js"
    "js/i18n.js"
    "assets/icons/g.svg"
    "translations.json"
    "updates.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$BUILD_DIR/$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - НЕ НАЙДЕН!"
        echo "🚨 Критическая ошибка! Проверьте структуру папок."
        exit 1
    fi
done

echo ""
echo "✅ Все критические файлы найдены!"

# Оптимизируем изображения если скрипт доступен
if [ -f "scripts/optimize-images.js" ]; then
    echo "🖼️  Оптимизирую изображения..."
    node scripts/optimize-images.js
fi

# Создаем .htaccess если его нет
if [ ! -f "$BUILD_DIR/.htaccess" ]; then
    echo "📝 Создаю .htaccess..."
    if [ -f "_server/.htaccess" ]; then
        cp "_server/.htaccess" "$BUILD_DIR/.htaccess"
    elif [ -f "_server/.htaccess-optimized" ]; then
        cp "_server/.htaccess-optimized" "$BUILD_DIR/.htaccess"
    else
        echo "⚠️  .htaccess не найден, создаю базовый..."
        cat > "$BUILD_DIR/.htaccess" << 'EOF'
# Базовый .htaccess для ARTBAT Prague
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Кэширование
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>
EOF
    fi
fi

# FTP деплой с проверкой структуры
echo "📤 Загружаю файлы через FTP с сохранением структуры..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mirror --reverse --delete --verbose --recursive $BUILD_DIR .;
bye;
"

# Проверяем результат деплоя
echo "🔍 Проверяю результат деплоя..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
ls -la;
bye;
"

# Очистка
echo "🧹 Очищаю временные файлы..."
rm -rf "$BUILD_DIR"

echo "✅ Надежный FTP деплой завершен!"
echo "🌐 Ваш сайт доступен по адресу: https://yourdomain.com/artbat-prague/"
echo "📊 Проверьте сайт в браузере"

# Инструкции по проверке
echo ""
echo "📋 Проверьте следующее:"
echo "1. Откройте https://yourdomain.com/artbat-prague/"
echo "2. Проверьте что стили загрузились (не белый текст на черном фоне)"
echo "3. Проверьте что JavaScript работает (меню, анимации)"
echo "4. Проверьте что изображения отображаются"
echo "5. Проверьте что .htaccess работает (HTTPS редирект)"

# Если что-то не работает
echo ""
echo "🚨 Если что-то не работает:"
echo "1. Проверьте права доступа к файлам на сервере"
echo "2. Проверьте логи сервера"
echo "3. Убедитесь что .htaccess загрузился"
echo "4. Проверьте что все папки создались на сервере"

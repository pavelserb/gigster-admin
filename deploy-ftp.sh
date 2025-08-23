#!/bin/bash

echo "🚀 FTP деплой ARTBAT Prague на существующий хостинг..."

# Загружаем конфигурацию
if [ -f "hosting-config.json" ]; then
    echo "📋 Загружаю конфигурацию хостинга..."
    # Здесь можно добавить парсинг JSON для автоматической настройки
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

# Проверяем наличие timeout команды
if ! command -v timeout &> /dev/null; then
    echo "⚠️  Команда timeout не найдена, создаю альтернативу..."
    timeout() {
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS: используем gtimeout если установлен, иначе без таймаута
            if command -v gtimeout &> /dev/null; then
                gtimeout "$@"
            else
                # Без таймаута для macOS
                shift
                "$@"
            fi
        else
            # Linux: используем встроенный timeout
            timeout "$@"
        fi
    }
fi

# Конфигурация FTP (замените на ваши данные)
FTP_HOST="somos.ftp.tools"
FTP_USER="somos_cursor"
FTP_PASS="Pr6LUx9h45"
FTP_PATH="/artbat-prague"

# Проверяем и корректируем путь
if [[ "$FTP_PATH" == */ ]]; then
    FTP_PATH="${FTP_PATH%/}"
fi

# Создаем временную папку для сборки
BUILD_DIR="./build-temp"
echo "🏗️  Создаю временную папку для сборки..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Копируем файлы для деплоя с сохранением структуры
echo "📦 Копирую файлы для деплоя с сохранением структуры..."

# Основные файлы (код сайта)
cp index.html "$BUILD_DIR/"

# Пользовательские данные НЕ копируем - они обновляются через админку
echo "⚠️  Пользовательские данные НЕ копируются (обновляются через админку):"
echo "   - translations.json"
echo "   - updates.json" 
echo "   - pixels.json"
echo "   - config.json"
echo "   - Загруженные изображения"

# Папки с сохранением структуры
echo "→ Копирую CSS..."
cp -r css "$BUILD_DIR/"
echo "→ Копирую JavaScript..."
cp -r js "$BUILD_DIR/"
echo "→ Копирую медиафайлы..."
cp -r assets "$BUILD_DIR/"
echo "→ Копирую фавиконы..."
cp -r favicon "$BUILD_DIR/"
echo "→ Копирую мета файлы..."
cp -r meta "$BUILD_DIR/"
echo "→ Копирую серверные настройки..."
cp -r _server "$BUILD_DIR/"

# Проверяем что все папки создались
echo "📁 Проверяю созданные папки..."
ls -la "$BUILD_DIR"

# Проверяем структуру папок
echo "📁 Проверяю структуру папок..."
find "$BUILD_DIR" -type d | sort
echo "📄 Список файлов:"
find "$BUILD_DIR" -type f | sort

# Оптимизируем изображения если скрипт доступен
if [ -f "scripts/optimize-images.js" ]; then
    echo "🖼️  Оптимизирую изображения..."
    node scripts/optimize-images.js
fi

# Проверяем критические файлы перед деплоем
echo "🔍 Проверяю критические файлы перед деплоем..."
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

# Проверяем подключение к FTP и создаем папку
echo "🔌 Проверяю подключение к FTP..."
timeout 30 lftp -c "
set ssl:verify-certificate no;
set net:timeout 10;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
pwd;
bye;
"

echo "📁 Создаю папку на сервере если её нет..."
timeout 30 lftp -c "
set ssl:verify-certificate no;
set net:timeout 10;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
mkdir -p $FTP_PATH;
cd $FTP_PATH;
pwd;
bye;
"

# FTP деплой с сохранением структуры папок
echo "📤 Загружаю файлы через FTP с сохранением структуры..."
timeout 300 lftp -c "
set ssl:verify-certificate no;
set net:timeout 30;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mirror --reverse --delete --verbose $BUILD_DIR .;
bye;
"

# Проверяем результат деплоя
echo "🔍 Проверяю результат деплоя..."
timeout 30 lftp -c "
set ssl:verify-certificate no;
set net:timeout 10;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
echo '=== Корневая папка ===';
ls -la;
bye;
"

# Очистка
echo "🧹 Очищаю временные файлы..."
rm -rf "$BUILD_DIR"

echo "✅ FTP деплой завершен!"
echo "🌐 Ваш сайт доступен по адресу: https://www.gigster.pro/artbat-prague/"
echo "📊 Проверьте сайт в браузере"

# Инструкции по проверке
echo ""
echo "📋 Проверьте следующее:"
echo "1. Откройте https://www.gigster.pro/artbat-prague/"
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
echo "5. Используйте скрипт исправления: ./fix-ftp-structure.sh"

#!/bin/bash

echo "🔧 Исправление структуры папок на FTP сервере..."

# Конфигурация FTP (замените на ваши данные)
FTP_HOST="somos.ftp.tools"
FTP_USER="somos_cursor"
FTP_PASS="Pr6LUx9h45"
FTP_PATH="/home/somos/gigster.pro/www/artbat-prague/"

# Проверяем наличие lftp
if ! command -v lftp &> /dev/null; then
    echo "❌ lftp не найден. Установите его:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "brew install lftp"
    else
        echo "sudo apt-get install lftp"
    fi
    exit 1
fi

echo "📋 Текущая структура на сервере:"
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
ls -la;
bye;
"

echo ""
echo "🚨 Проблема: файлы загружены без структуры папок"
echo "🔧 Решение: создаем папки и перемещаем файлы"

# Создаем папки на сервере
echo "📁 Создаю папки на сервере..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mkdir css;
mkdir js;
mkdir assets;
mkdir favicon;
mkdir meta;
mkdir _server;
bye;
"

# Перемещаем файлы в правильные папки
echo "📦 Перемещаю файлы в правильные папки..."

# CSS файлы
echo "→ Перемещаю CSS файлы..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mv *.css css/ 2>/dev/null || echo 'CSS файлы уже на месте';
bye;
"

# JavaScript файлы
echo "→ Перемещаю JavaScript файлы..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mv *.js js/ 2>/dev/null || echo 'JS файлы уже на месте';
bye;
"

# Изображения и медиа
echo "→ Перемещаю медиафайлы..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mv *.png *.jpg *.jpeg *.webp *.gif *.mp4 *.webm assets/ 2>/dev/null || echo 'Медиафайлы уже на месте';
bye;
"

# Иконки и фавиконы
echo "→ Перемещаю иконки..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mv *.ico *.svg favicon/ 2>/dev/null || echo 'Иконки уже на месте';
bye;
"

# Мета файлы
echo "→ Перемещаю мета файлы..."
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mv robots.txt sitemap.xml meta/ 2>/dev/null || echo 'Мета файлы уже на месте';
bye;
"

# Проверяем результат
echo ""
echo "🔍 Проверяю исправленную структуру:"
lftp -c "
set ssl:verify-certificate no;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
echo '=== Корневая папка ===';
ls -la;
echo '';
echo '=== CSS папка ===';
ls -la css/;
echo '';
echo '=== JS папка ===';
ls -la js/;
echo '';
echo '=== Assets папка ===';
ls -la assets/;
bye;
"

echo ""
echo "✅ Структура папок исправлена!"
echo "🌐 Проверьте сайт: https://www.gigster.pro/artbat-prague/"

# Инструкции по проверке
echo ""
echo "📋 Проверьте следующее:"
echo "1. Стили загрузились (не белый текст на черном фоне)"
echo "2. JavaScript работает (меню, анимации)"
echo "3. Изображения отображаются"
echo "4. Сайт работает корректно"

# Если нужно полный передеплой
echo ""
echo "💡 Если проблемы остались, используйте полный передеплой:"
echo "./deploy-ftp-robust.sh"

#!/bin/bash

# Скрипт для деплоинга пользовательских данных на хостинг
# Загружает файлы с пользовательскими данными и содержимое папки assets

echo "🚀 Деплой пользовательских данных на статический хостинг..."
echo "=================================================="
echo ""

# Загружаем конфигурацию хостинга
if [ -f "hosting-config.json" ]; then
    echo "📋 Загружаю конфигурацию хостинга..."
    FTP_HOST=$(jq -r '.hosting.ftp.host' hosting-config.json)
    FTP_USER=$(jq -r '.hosting.ftp.username' hosting-config.json)
    FTP_PASS=$(jq -r '.hosting.ftp.password' hosting-config.json)
    FTP_PATH=$(jq -r '.hosting.path' hosting-config.json)
    
    echo "FTP Host: $FTP_HOST"
    echo "FTP User: $FTP_USER"
    echo "FTP Path: $FTP_PATH"
    echo ""
else
    echo "❌ hosting-config.json не найден!"
    echo "Создайте файл hosting-config.json с настройками хостинга"
    exit 1
fi

# Проверяем наличие пользовательских данных
USER_DATA_FILES=(
    "config.json"
    "updates.json"
    "translations.json"
    "pixels.json"
    "users.json"
)

echo "🔍 Проверяю наличие пользовательских данных..."
for file in "${USER_DATA_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file найден"
    else
        echo "❌ $file НЕ найден!"
        exit 1
    fi
done

# Проверяем наличие папки assets
if [ -d "assets" ]; then
    echo "✅ Папка assets найдена"
    ASSETS_COUNT=$(find assets -type f | wc -l)
    echo "📁 Количество файлов в assets: $ASSETS_COUNT"
else
    echo "❌ Папка assets НЕ найдена!"
    exit 1
fi

echo ""
echo "📤 Начинаю деплой пользовательских данных на FTP..."

# Проверяем подключение к FTP
echo "🔌 Проверяю подключение к FTP..."
lftp -c "
set ssl:verify-certificate no;
set net:timeout 10;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
pwd;
bye;
"

if [ $? -ne 0 ]; then
    echo "❌ Ошибка подключения к FTP!"
    exit 1
fi

echo "✅ FTP подключение успешно"
echo ""

# Создаем временную папку для сборки
BUILD_DIR="temp-user-data-$(date +%s)"
echo "🏗️ Создаю временную папку: $BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Копируем пользовательские данные в корень
echo "📁 Копирую пользовательские данные в корень..."
for file in "${USER_DATA_FILES[@]}"; do
    cp "$file" "$BUILD_DIR/"
    echo "  → $file скопирован"
done

# Копируем содержимое папки assets
echo "📁 Копирую содержимое папки assets..."
cp -r assets "$BUILD_DIR/"

echo ""
echo "📊 Структура временной папки:"
tree "$BUILD_DIR" -I 'node_modules|.git|*.log'

echo ""
echo "🌐 Загружаю файлы на FTP..."

# Загружаем пользовательские данные в корень сайта
echo "📤 Загружаю пользовательские данные в корень сайта..."
lftp -c "
set ssl:verify-certificate no;
set net:timeout 30;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
put $BUILD_DIR/config.json;
put $BUILD_DIR/updates.json;
put $BUILD_DIR/translations.json;
put $BUILD_DIR/pixels.json;
put $BUILD_DIR/users.json;
bye;
"

if [ $? -eq 0 ]; then
    echo "✅ Пользовательские данные загружены в корень сайта"
else
    echo "❌ Ошибка загрузки пользовательских данных!"
    rm -rf "$BUILD_DIR"
    exit 1
fi

# Загружаем содержимое папки assets
echo "📤 Загружаю содержимое папки assets..."
lftp -c "
set ssl:verify-certificate no;
set net:timeout 30;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
mirror --reverse --verbose $BUILD_DIR/assets assets;
bye;
"

if [ $? -eq 0 ]; then
    echo "✅ Содержимое папки assets загружено"
else
    echo "❌ Ошибка загрузки папки assets!"
    rm -rf "$BUILD_DIR"
    exit 1
fi

# Очищаем временную папку
echo "🧹 Очищаю временную папку..."
rm -rf "$BUILD_DIR"

echo ""
echo "🎉 Деплой пользовательских данных завершен успешно!"
echo ""
echo "📋 Что было загружено:"
echo "1. config.json - конфигурация сайта"
echo "2. updates.json - обновления и новости"
echo "3. translations.json - переводы"
echo "4. pixels.json - пиксели для аналитики"
echo "5. users.json - пользователи админки"
echo "6. assets/ - все медиафайлы и ресурсы"
echo ""
echo "🌐 Проверьте сайт: https://www.gigster.pro/artbat-prague/"
echo "🔐 Проверьте админку: https://gigster-admin.onrender.com/admin/"
echo ""
echo "✅ Пользовательские данные теперь синхронизированы с хостингом!"

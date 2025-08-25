#!/bin/bash

# Скрипт для загрузки пользовательских данных на хостинг
# Запускать только один раз для первичной настройки

echo "🚀 Загрузка пользовательских данных на хостинг..."
echo "⚠️  ВНИМАНИЕ: Этот скрипт загружает пользовательские данные только один раз!"
echo "   В дальнейшем эти файлы обновляются через админку на Render"
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
else
    echo "❌ hosting-config.json не найден!"
    exit 1
fi

# Проверяем наличие пользовательских данных
USER_DATA_FILES=(
    "translations.json"
    "updates.json"
    "pixels.json"
    "config.json"
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

echo ""
echo "📤 Загружаю пользовательские данные на FTP..."

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

# Загружаем пользовательские данные
echo "📁 Загружаю файлы на FTP..."
lftp -c "
set ssl:verify-certificate no;
set net:timeout 30;
set net:max-retries 3;
open -u $FTP_USER,$FTP_PASS $FTP_HOST;
cd $FTP_PATH;
put translations.json;
put updates.json;
put pixels.json;
put config.json;
bye;
"

if [ $? -eq 0 ]; then
    echo "✅ Пользовательские данные успешно загружены!"
    echo ""
    echo "📋 Что произошло:"
    echo "1. translations.json - загружен на хостинг"
    echo "2. updates.json - загружен на хостинг"
    echo "3. pixels.json - загружен на хостинг"
    echo "4. config.json - загружен на хостинг"
    echo ""
    echo "🎯 Теперь:"
    echo "- Сайт будет работать с пользовательскими данными"
    echo "- Админка сможет редактировать эти файлы"
    echo "- При следующих деплоях сайта эти файлы НЕ будут перезаписываться"
    echo ""
    echo "🌐 Проверьте сайт: https://www.gigster.pro/artbat-prague/"
else
    echo "❌ Ошибка загрузки файлов на FTP!"
    exit 1
fi

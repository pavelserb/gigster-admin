#!/bin/bash

echo "🔄 Конвертация изображений в WebP формат..."

# Проверяем наличие ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick не найден. Установите:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Создаем папку для WebP файлов
mkdir -p assets/images/webp

# Конвертируем JPG файлы
echo "📸 Конвертирую JPG файлы..."
for file in assets/images/*.jpg assets/images/*.jpeg; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        name="${filename%.*}"
        echo "  → $filename → $name.webp"
        convert "$file" -quality 85 "assets/images/webp/$name.webp"
    fi
done

# Конвертируем PNG файлы
echo "🖼️  Конвертирую PNG файлы..."
for file in assets/images/*.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        name="${filename%.*}"
        echo "  → $filename → $name.webp"
        convert "$file" -quality 85 "assets/images/webp/$name.webp"
    fi
done

echo "✅ Конвертация завершена!"
echo "📁 WebP файлы сохранены в: assets/images/webp/"
echo ""
echo "📋 Следующие шаги:"
echo "1. Загрузите WebP файлы через админку"
echo "2. Обновите контент в админке"
echo "3. Удалите старые JPG/PNG файлы"


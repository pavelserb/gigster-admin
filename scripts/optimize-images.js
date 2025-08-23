#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🖼️  Оптимизация изображений для продакшена...');

const assetsDir = path.join(__dirname, '../assets');
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

function optimizeImages(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      optimizeImages(filePath);
    } else if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
      console.log(`Оптимизирую: ${filePath}`);
      
      try {
        // Используем ImageOptim CLI если доступен
        if (process.platform === 'darwin') {
          execSync(`imageoptim "${filePath}"`, { stdio: 'inherit' });
        } else {
          // Альтернатива для других платформ
          console.log(`  Пропускаю ${file} (требуется ImageOptim на macOS)`);
        }
      } catch (error) {
        console.log(`  Ошибка оптимизации ${file}:`, error.message);
      }
    }
  });
}

// Проверяем наличие ImageOptim
if (process.platform === 'darwin') {
  try {
    execSync('which imageoptim', { stdio: 'ignore' });
    console.log('✅ ImageOptim найден, начинаю оптимизацию...');
    optimizeImages(assetsDir);
  } catch (error) {
    console.log('⚠️  ImageOptim не найден. Установите ImageOptim для оптимизации изображений.');
    console.log('   Скачать: https://imageoptim.com/');
  }
} else {
  console.log('⚠️  Автоматическая оптимизация доступна только на macOS с ImageOptim');
  console.log('   Рекомендуем оптимизировать изображения вручную перед деплоем');
}

console.log('✅ Оптимизация завершена!');

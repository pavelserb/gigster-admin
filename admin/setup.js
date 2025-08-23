const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

async function setup() {
  console.log('🔧 Настройка админки ARTBAT Prague...\n');

  try {
    // Создаем папку для загрузок, если её нет
    const uploadsDir = path.join(__dirname, '..', 'assets', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('✅ Папка для загрузок создана');

    // Создаем папку для резервных копий
    const backupsDir = path.join(__dirname, '..', 'backups');
    await fs.mkdir(backupsDir, { recursive: true });
    console.log('✅ Папка для резервных копий создана');

    // Генерируем хеш пароля для админки
    const password = 'admin123'; // Пароль по умолчанию
    const hashedPassword = '$2b$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu';
    
    console.log('\n📋 Информация для входа:');
    console.log('👤 Логин: admin');
    console.log('🔑 Пароль: admin123');
    console.log('\n⚠️  ВАЖНО: Измените пароль после первого входа!');

    // Создаем файл с настройками
    const config = {
      admin: {
        username: 'admin',
        passwordHash: hashedPassword
      },
      server: {
        port: 3001,
        jwtSecret: 'your-secret-key-change-this-in-production'
      }
    };

    const configPath = path.join(__dirname, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Файл конфигурации создан');

    console.log('\n🎉 Настройка завершена!');
    console.log('\n📝 Следующие шаги:');
    console.log('1. Установите зависимости: npm install');
    console.log('2. Запустите сервер: npm start');
    console.log('3. Откройте админку: http://localhost:3001/admin');
    console.log('4. Войдите с учетными данными выше');
    console.log('5. Измените пароль по умолчанию');

  } catch (error) {
    console.error('❌ Ошибка настройки:', error.message);
    process.exit(1);
  }
}

setup();

const ftp = require('basic-ftp');
const fs = require('fs').promises;
const path = require('path');

class FTPClient {
  constructor() {
    this.client = new ftp.Client();
    this.client.ftp.verbose = false; // Отключаем verbose для продакшена
  }

  async connect() {
    try {
      // FTP настройки из переменных окружения
      const config = {
        host: process.env.FTP_HOST || 'somos.ftp.tools',
        user: process.env.FTP_USER || 'somos_cursor',
        password: process.env.FTP_PASSWORD || 'Pr6LUx9h45',
        port: process.env.FTP_PORT || 21,
        secure: false
      };

      console.log('🔌 Попытка подключения к FTP:', {
        host: config.host,
        user: config.user,
        port: config.port,
        hasPassword: !!config.password
      });

      await this.client.access(config);
      console.log('✅ FTP подключение установлено');
      return true;
    } catch (error) {
      console.error('❌ FTP подключение не удалось:', error.message);
      return false;
    }
  }

  async disconnect() {
    try {
      this.client.close();
      console.log('✅ FTP соединение закрыто');
    } catch (error) {
      console.error('❌ Ошибка закрытия FTP:', error.message);
    }
  }

  async uploadFile(localPath, remotePath) {
    try {
      await this.client.uploadFrom(localPath, remotePath);
      console.log(`✅ Файл загружен: ${localPath} -> ${remotePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка загрузки файла ${localPath}:`, error.message);
      return false;
    }
  }

  async downloadFile(remotePath, localPath) {
    try {
      console.log(`🔍 Попытка скачивания: ${remotePath} -> ${localPath}`);
      
      // Создаем локальную папку если её нет
      const localDir = path.dirname(localPath);
      await fs.mkdir(localDir, { recursive: true });
      
      // Проверяем, существует ли файл на FTP
      try {
        const fileInfo = await this.client.stat(remotePath);
        console.log(`📁 Файл найден на FTP: ${remotePath}, размер: ${fileInfo.size} байт`);
      } catch (statError) {
        console.error(`❌ Файл не найден на FTP: ${remotePath}`);
        return false;
      }
      
      await this.client.downloadTo(localPath, remotePath);
      console.log(`✅ Файл скачан: ${remotePath} -> ${localPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка скачивания файла ${remotePath}:`, error.message);
      return false;
    }
  }

  async listFiles(remotePath = '/') {
    try {
      console.log(`🔍 Получаю список файлов из: ${remotePath}`);
      
      // Сначала переходим в нужную папку
      await this.client.cd(remotePath);
      
      // Получаем список файлов
      const list = await this.client.list();
      
      console.log(`📁 Найдено файлов: ${list.length}`);
      
      const result = list.map(item => ({
        name: item.name,
        type: item.type === 2 ? 'dir' : 'file', // 2 = папка, 1 = файл
        size: item.size,
        modified: item.modified
      }));
      
      console.log(`✅ Список файлов получен:`, result.map(f => f.name));
      return result;
    } catch (error) {
      console.error(`❌ Ошибка получения списка файлов ${remotePath}:`, error.message);
      return [];
    }
  }

  async createDirectory(remotePath) {
    try {
      await this.client.ensureDir(remotePath);
      console.log(`✅ Папка создана: ${remotePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка создания папки ${remotePath}:`, error.message);
      return false;
    }
  }

  async deleteFile(remotePath) {
    try {
      await this.client.remove(remotePath);
      console.log(`✅ Файл удален: ${remotePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка удаления файла ${remotePath}:`, error.message);
      return false;
    }
  }
}

module.exports = FTPClient;

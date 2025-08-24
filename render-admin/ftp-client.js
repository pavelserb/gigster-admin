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
      const list = await this.client.list(remotePath);
      return list.map(item => ({
        name: item.name,
        type: item.type,
        size: item.size,
        modified: item.modified
      }));
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

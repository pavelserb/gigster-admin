const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const FTPClient = require('./ftp-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Render deployment trigger - updated FTP integration

// Middleware
app.use(cors());
app.use(express.json());
app.use('/admin', express.static(__dirname));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin credentials - пароль: admin123
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '$2a$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu'
};

// FTP configuration
const FTP_CONFIG = {
  host: process.env.FTP_HOST || 'somos.ftp.tools',
  user: process.env.FTP_USER || 'somos_cursor',
  password: process.env.FTP_PASSWORD || 'Pr6LUx9h45',
  port: process.env.FTP_PORT || 21,
  remotePath: process.env.FTP_REMOTE_PATH || '/artbat-prague'
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = req.query.dir || 'uploads';
    const uploadPath = path.join(__dirname, 'temp', targetDir);
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// FTP helper functions
async function withFTP(operation) {
  const ftpClient = new FTPClient();
  try {
    const connected = await ftpClient.connect();
    if (!connected) {
      throw new Error('FTP подключение не удалось');
    }
    
    const result = await operation(ftpClient);
    return result;
  } finally {
    await ftpClient.disconnect();
  }
}

// Routes

// Login
app.post('/admin/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Verify token
app.get('/admin/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Get config from FTP
app.get('/admin/api/config', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/config.json`;
      const localPath = path.join(__dirname, 'temp', 'config.json');
      
      // Скачиваем файл с FTP
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { message: 'Config file not found on FTP' };
      }
      
      // Читаем локальный файл
      const content = await fs.readFile(localPath, 'utf8');
      return JSON.parse(content);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Ошибка чтения конфигурации' });
  }
});

// Save config to FTP
app.post('/admin/api/config', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'config.json');
      const remotePath = `${FTP_CONFIG.remotePath}/config.json`;
      
      // Сохраняем локально
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      // Загружаем на FTP
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload config to FTP');
      }
      
      return { message: 'Config saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// Alias for client compatibility
app.post('/admin/api/config/save', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'config.json');
      const remotePath = `${FTP_CONFIG.remotePath}/config.json`;
      
      // Сохраняем локально
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      // Загружаем на FTP
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload config to FTP');
      }
      
      return { message: 'Config saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// Get translations from FTP
app.get('/admin/api/translations', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/translations.json`;
      const localPath = path.join(__dirname, 'temp', 'translations.json');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { message: 'Translations file not found on FTP' };
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return JSON.parse(content);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Translations error:', error);
    res.status(500).json({ error: 'Ошибка чтения переводов' });
  }
});

// Save translations to FTP
app.post('/admin/api/translations', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'translations.json');
      const remotePath = `${FTP_CONFIG.remotePath}/translations.json`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload translations to FTP');
      }
      
      return { message: 'Translations saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Translations save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения переводов' });
  }
});

// Alias for client compatibility
app.post('/admin/api/translations/save', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'translations.json');
      const remotePath = `${FTP_CONFIG.remotePath}/translations.json`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload translations to FTP');
      }
      
      return { message: 'Translations saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Translations save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения переводов' });
  }
});

// Get updates from FTP
app.get('/admin/api/updates', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/updates.json`;
      const localPath = path.join(__dirname, 'temp', 'updates.json');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { message: 'Updates file not found on FTP' };
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return JSON.parse(content);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Updates error:', error);
    res.status(500).json({ error: 'Ошибка чтения обновлений' });
  }
});

// Save updates to FTP
app.post('/admin/api/updates', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'updates.json');
      const remotePath = `${FTP_CONFIG.remotePath}/updates.json`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload updates to FTP');
      }
      
      return { message: 'Updates saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Updates save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения обновлений' });
  }
});

// Alias for client compatibility
app.post('/admin/api/updates/save', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'updates.json');
      const remotePath = `${FTP_CONFIG.remotePath}/updates.json`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload updates to FTP');
      }
      
      return { message: 'Updates saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Updates save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения обновлений' });
  }
});

// Get HTML content from FTP
app.get('/admin/api/html', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/index.html`;
      const localPath = path.join(__dirname, 'temp', 'index.html');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { message: 'HTML file not found on FTP' };
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return { content };
    });
    
    res.json(result);
  } catch (error) {
    console.error('HTML error:', error);
    res.status(500).json({ error: 'Ошибка чтения HTML' });
  }
});

// Save HTML content to FTP
app.post('/admin/api/html', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'index.html');
      const remotePath = `${FTP_CONFIG.remotePath}/index.html`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, req.body.content);
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload HTML to FTP');
      }
      
      return { message: 'HTML saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('HTML save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения HTML' });
  }
});

// Alias for client compatibility
app.post('/admin/api/html/save', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'index.html');
      const remotePath = `${FTP_CONFIG.remotePath}/index.html`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, req.body.content);
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload HTML to FTP');
      }
      
      return { message: 'HTML saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('HTML save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения HTML' });
  }
});

// Get media from FTP
app.get('/admin/api/media', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets`;
      const files = await ftp.listFiles(remotePath);
      
      return files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)
      ).map(file => ({
        name: file.name,
        path: `/assets/${file.name}`,
        size: file.size,
        type: 'file'
      }));
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media error:', error);
    res.status(500).json({ error: 'Ошибка чтения медиа файлов' });
  }
});

// Get media tree from FTP
app.get('/admin/api/media/tree', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets`;
      const files = await ftp.listFiles(remotePath);
      
      return files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)
      ).map(file => ({
        name: file.name,
        type: 'file',
        path: `assets/${file.name}`
      }));
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media tree error:', error);
    res.status(500).json({ error: 'Ошибка построения дерева медиа' });
  }
});

// Get pixels from FTP
app.get('/admin/api/pixels', async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/pixels.json`;
      const localPath = path.join(__dirname, 'temp', 'pixels.json');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { message: 'Pixels file not found on FTP' };
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return JSON.parse(content);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Pixels error:', error);
    res.status(500).json({ error: 'Ошибка чтения пикселей' });
  }
});

// Save pixels to FTP
app.post('/admin/api/pixels', async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', 'pixels.json');
      const remotePath = `${FTP_CONFIG.remotePath}/pixels.json`;
      
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, JSON.stringify(req.body, null, 2));
      
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload pixels to FTP');
      }
      
      return { message: 'Pixels saved successfully to FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Pixels save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения пикселей' });
  }
});

// File upload to FTP
app.post('/admin/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const result = await withFTP(async (ftp) => {
      const targetDir = req.query.dir || 'uploads';
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${targetDir}/${req.file.filename}`;
      
      // Создаем папку на FTP если нужно
      await ftp.createDirectory(`${FTP_CONFIG.remotePath}/assets/${targetDir}`);
      
      // Загружаем файл на FTP
      const uploaded = await ftp.uploadFile(req.file.path, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload file to FTP');
      }
      
      return { 
        message: 'Файл загружен успешно на FTP',
        filename: req.file.filename,
        path: `/assets/${targetDir}/${req.file.filename}`
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Media upload endpoint (alias for client compatibility)
app.post('/admin/api/media/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const result = await withFTP(async (ftp) => {
      const targetDir = req.query.dir || 'uploads';
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${targetDir}/${req.file.filename}`;
      
      // Создаем папку на FTP если нужно
      await ftp.createDirectory(`${FTP_CONFIG.remotePath}/assets/${targetDir}`);
      
      // Загружаем файл на FTP
      const uploaded = await ftp.uploadFile(req.file.path, remotePath);
      if (!uploaded) {
        throw new Error('Failed to upload file to FTP');
      }
      
      return { 
        message: 'Файл загружен успешно на FTP',
        filename: req.file.filename,
        path: `/assets/${targetDir}/${req.file.filename}`
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Media directory endpoint
app.get('/admin/api/media/directory', authenticateToken, async (req, res) => {
  try {
    const { dir } = req.query;
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${dir || ''}`;
      const files = await ftp.listFiles(remotePath);
      
      return files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)
      ).map(file => ({
        name: file.name,
        path: `assets/${dir || ''}/${file.name}`,
        size: file.size,
        type: 'file'
      }));
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media directory error:', error);
    res.status(500).json({ error: 'Ошибка чтения папки медиа' });
  }
});

// Delete media file
app.delete('/admin/api/media/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const { dir } = req.query;
    
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${dir || ''}/${filename}`;
      const deleted = await ftp.deleteFile(remotePath);
      
      if (!deleted) {
        throw new Error('Failed to delete file from FTP');
      }
      
      return { message: 'Файл удален успешно с FTP' };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

// Status endpoint for health check
app.get('/admin/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ARTBAT Prague Admin with FTP Integration',
    ftp: {
      host: FTP_CONFIG.host,
      remotePath: FTP_CONFIG.remotePath
    }
  });
});

// Create temp directory
app.use('/admin/temp', express.static(path.join(__dirname, 'temp')));

app.listen(PORT, () => {
  console.log(`🚀 ARTBAT Prague Admin Server с FTP-интеграцией запущен на Render`);
  console.log(`📊 Статус: http://localhost:${PORT}/admin/api/status`);
  console.log(`🔐 Админка: http://localhost:${PORT}/admin`);
  console.log(`🌐 FTP: ${FTP_CONFIG.host}:${FTP_CONFIG.port}${FTP_CONFIG.remotePath}`);
});

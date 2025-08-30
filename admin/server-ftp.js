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

// Render deployment trigger - updated user management system // Force redeploy for user auth

// Middleware
app.use(cors());
app.use(express.json());
app.use('/admin', express.static(__dirname));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin credentials - загружаются из users.json на FTP
let ADMIN_USERS = {
  users: [
    {
      username: 'admin',
      password: '$2a$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu',
      role: 'admin',
      isActive: true
    }
  ]
};

// Функция для загрузки пользователей с FTP
async function loadUsersFromFTP() {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/users.json`;
      const localPath = path.join(__dirname, 'temp', 'users.json');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        console.log('⚠️  users.json не найден на FTP, используем встроенных пользователей');
        return ADMIN_USERS;
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return JSON.parse(content);
    });
    
    ADMIN_USERS = result;
    console.log(`✅ Загружено ${result.users.length} пользователей с FTP`);
  } catch (error) {
    console.error('❌ Ошибка загрузки пользователей:', error);
    console.log('⚠️  Используем встроенных пользователей');
  }
}

// FTP configuration
const FTP_CONFIG = {
  host: process.env.FTP_HOST || 'somos.ftp.tools',
  user: process.env.FTP_USER || 'somos_cursor',
  password: process.env.FTP_PASSWORD || 'Pr6LUx9h45',
  port: process.env.FTP_PORT || 21,
  remotePath: process.env.FTP_REMOTE_PATH || '/artbat-prague'
};

// Log FTP configuration for debugging
console.log('🔧 FTP Configuration:', {
  host: FTP_CONFIG.host,
  user: FTP_CONFIG.user,
  port: FTP_CONFIG.port,
  remotePath: FTP_CONFIG.remotePath,
  hasPassword: !!FTP_CONFIG.password
});

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
  console.log('🔌 Attempting FTP connection...');
  const ftpClient = new FTPClient();
  try {
    const connected = await ftpClient.connect();
    if (!connected) {
      console.error('❌ FTP connection failed');
      throw new Error('FTP подключение не удалось');
    }
    
    console.log('✅ FTP connected successfully');
    const result = await operation(ftpClient);
    return result;
  } catch (error) {
    console.error('❌ FTP operation error:', error);
    throw error;
  } finally {
    await ftpClient.disconnect();
    console.log('🔌 FTP disconnected');
  }
}

// Routes

// Login
app.post('/admin/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Ищем пользователя
    const user = ADMIN_USERS.users.find(u => 
      u.username === username && u.isActive
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден или неактивен' });
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      const token = jwt.sign(
        { 
          username: user.username, 
          role: user.role,
          userId: user.id 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Обновляем время последнего входа
      user.lastLogin = new Date().toISOString();
      
      res.json({ 
        token,
        user: {
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    } else {
      res.status(401).json({ error: 'Неверный пароль' });
    }
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

// Get current HTML content from FTP (for auto-update)
app.get('/admin/api/html/current', authenticateToken, async (req, res) => {
  try {
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/index.html`;
      const localPath = path.join(__dirname, 'temp', 'index.html');
      
      const downloaded = await ftp.downloadFile(remotePath, localPath);
      if (!downloaded) {
        return { error: 'HTML file not found on FTP' };
      }
      
      const content = await fs.readFile(localPath, 'utf8');
      return { content };
    });
    
    res.json(result);
  } catch (error) {
    console.error('HTML current error:', error);
    res.status(500).json({ error: 'Ошибка чтения HTML' });
  }
});

// Auto-update HTML endpoint
app.post('/admin/api/html/update', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 HTML update request received:', {
      hasBody: !!req.body,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type']
    });
    
    const { content, filename } = req.body;
    
    console.log('📝 HTML update data:', {
      hasContent: !!content,
      contentLength: content ? content.length : 0,
      filename: filename,
      contentPreview: content ? content.substring(0, 100) + '...' : 'none'
    });
    
    if (!content || !filename) {
      console.error('❌ Missing required fields:', { hasContent: !!content, hasFilename: !!filename });
      return res.status(400).json({ 
        error: 'Missing content or filename',
        received: {
          hasContent: !!content,
          hasFilename: !!filename,
          bodyKeys: Object.keys(req.body || {})
        }
      });
    }
    
    // CRITICAL: Prevent empty content from overwriting files
    if (typeof content !== 'string' || content.trim().length < 100) {
      console.error('❌ Content too short or invalid:', {
        type: typeof content,
        length: content ? content.length : 0,
        preview: content ? content.substring(0, 200) : 'none'
      });
      return res.status(400).json({ 
        error: 'Content too short or invalid - refusing to overwrite file',
        contentLength: content ? content.length : 0,
        contentType: typeof content
      });
    }
    
    const result = await withFTP(async (ftp) => {
      const localPath = path.join(__dirname, 'temp', filename);
      const remotePath = `${FTP_CONFIG.remotePath}/${filename}`;
      const backupPath = `${FTP_CONFIG.remotePath}/${filename}.backup`;
      
      // Create backup of current file
      console.log('💾 Creating backup of current file...');
      const backupCreated = await ftp.downloadFile(remotePath, path.join(__dirname, 'temp', `${filename}.backup`));
      if (backupCreated) {
        await ftp.uploadFile(path.join(__dirname, 'temp', `${filename}.backup`), backupPath);
        console.log('✅ Backup created successfully');
      } else {
        console.warn('⚠️ Could not create backup - file might not exist');
      }
      
      console.log('💾 Saving HTML locally:', localPath);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, content);
      
      console.log('📤 Uploading HTML to FTP:', remotePath);
      const uploaded = await ftp.uploadFile(localPath, remotePath);
      if (!uploaded) {
        throw new Error(`Failed to upload ${filename} to FTP`);
      }
      
      console.log('✅ HTML uploaded successfully');
      return { message: `${filename} updated successfully on FTP` };
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ HTML update error:', error);
    res.status(500).json({ error: 'Ошибка обновления HTML' });
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
      
      console.log('📁 Получены файлы из FTP:', files);
      
      // Разделяем на папки и файлы
      const directories = [];
      const mediaFiles = [];
      
      files.forEach(file => {
        if (file.type === 'dir' && !file.name.startsWith('.')) {
          // Это папка
          directories.push({
            name: file.name,
            path: `assets/${file.name}`,
            type: 'directory'
          });
        } else if (/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)) {
          // Это медиафайл
          mediaFiles.push({
            name: file.name,
            path: `assets/${file.name}`,
            type: 'file',
            size: file.size,
            modified: file.modified
          });
        }
      });
      
      console.log('📁 Папки:', directories.map(d => d.name));
      console.log('🖼️ Медиафайлы:', mediaFiles.map(f => f.name));
      
      return {
        directories: directories,
        files: mediaFiles,
        total: directories.length + mediaFiles.length
      };
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

// Media directory endpoint (query parameter) - для корневой папки assets
app.get('/admin/api/media/directory', authenticateToken, async (req, res) => {
  try {
    const { dir } = req.query;
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${dir || ''}`;
      const files = await ftp.listFiles(remotePath);
      
      console.log(`📁 Загружаю содержимое папки: ${dir || 'root'}`);
      console.log(`📁 Найдено файлов: ${files.length}`);
      
      // Возвращаем структуру, которую ожидает клиент
      return {
        files: files.filter(file => 
          /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)
        ).map(file => ({
          name: file.name,
          path: `${dir ? dir + '/' : ''}${file.name}`, // Убираем лишний assets/
          size: file.size,
          type: 'file'
        })),
        total: files.filter(file => 
          /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name)
        ).length,
        folder: dir || 'root'
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media directory error:', error);
    res.status(500).json({ error: 'Ошибка чтения папки медиа' });
  }
});

// Media directory endpoint (path parameter) - для совместимости с клиентом
app.get('/admin/api/media/directory/:folder', authenticateToken, async (req, res) => {
  try {
    const { folder } = req.params;
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${folder}`;
      const files = await ftp.listFiles(remotePath);
      
      console.log(`📁 Загружаю содержимое папки: ${folder}`);
      console.log(`📁 Найдено файлов: ${files.length}`);
      
      // Возвращаем структуру, которую ожидает клиент
      return {
        files: files.map(file => ({
          name: file.name,
          path: `${folder}/${file.name}`, // Убираем лишний assets/
          size: file.size,
          type: file.type === 'dir' ? 'directory' : 'file'
        })),
        total: files.length,
        folder: folder
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Media directory error:', error);
    res.status(500).json({ error: 'Ошибка чтения папки медиа' });
  }
});

// Create media directory endpoint
app.post('/admin/api/media/directory', authenticateToken, async (req, res) => {
  try {
    const { name, parentDir = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Название папки обязательно' });
    }
    
    const result = await withFTP(async (ftp) => {
      const remotePath = `${FTP_CONFIG.remotePath}/assets/${parentDir}/${name}`.replace(/\/+/g, '/');
      
      console.log(`📁 Создаю папку: ${remotePath}`);
      
      const created = await ftp.createDirectory(remotePath);
      if (!created) {
        throw new Error('Failed to create directory on FTP');
      }
      
      return { 
        message: 'Папка создана успешно на FTP',
        name: name,
        path: `assets/${parentDir}/${name}`.replace(/\/+/g, '/')
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Create directory error:', error);
    res.status(500).json({ error: 'Ошибка создания папки' });
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

// Main admin route - serve index.html
app.get('/admin', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'index.html');
    await fs.access(indexPath);
    res.sendFile(indexPath);
  } catch (error) {
    console.error('❌ index.html not found:', error);
    res.status(500).json({ 
      error: 'Admin panel not found',
      message: 'index.html file is missing',
      timestamp: new Date().toISOString()
    });
  }
});

// Root route redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Create temp directory
app.use('/admin/temp', express.static(path.join(__dirname, 'temp')));

// Serve static assets from FTP (proxy to static hosting)
app.use('/assets', async (req, res, next) => {
  try {
    // Получаем файл с FTP и отдаем его
    const filePath = req.path;
    const remotePath = `${FTP_CONFIG.remotePath}/assets${filePath}`;
    
    console.log(`📁 Запрос статического файла: ${filePath} -> ${remotePath}`);
    
    const ftpClient = new FTPClient();
    await ftpClient.connect();
    
    // Создаем временный файл
    const tempPath = path.join(__dirname, 'temp', 'static', filePath);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    
    // Скачиваем файл с FTP
    const downloaded = await ftpClient.downloadFile(remotePath, tempPath);
    await ftpClient.disconnect();
    
    if (downloaded) {
      // Определяем MIME тип
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэшируем на 1 час
      
      // Отдаем файл
      res.sendFile(tempPath);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error serving static file:', error);
    res.status(500).send('Internal server error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Not found',
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 ARTBAT Prague Admin Server с FTP-интеграцией запущен на Render`);
  console.log(`📊 Статус: http://localhost:${PORT}/admin/api/status`);
  console.log(`🔐 Админка: http://localhost:${PORT}/admin`);
  console.log(`🌐 FTP: ${FTP_CONFIG.host}:${FTP_CONFIG.port}${FTP_CONFIG.remotePath}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Working directory: ${__dirname}`);
  
  try {
    // Загружаем пользователей с FTP при запуске
    await loadUsersFromFTP();
    console.log('✅ Server initialization completed successfully');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
  }
});

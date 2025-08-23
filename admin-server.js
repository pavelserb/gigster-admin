const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// JWT Secret (в продакшене должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin credentials (в продакшене должны быть в базе данных)
// Пароль: admin123
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '$2a$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu'
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the directory from query params or default to uploads
    const targetDir = req.query.dir || 'uploads';
    const uploadPath = path.join(__dirname, 'assets', targetDir);
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    // Use original filename instead of generating a new one
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
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

// Get config
app.get('/admin/api/config', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'js', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(configContent));
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Ошибка чтения конфигурации' });
  }
});

// Save config
app.post('/admin/api/config', authenticateToken, upload.none(), async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'js', 'config.json');
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Конфигурация сохранена' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// File upload
app.post('/admin/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fileUrl = `/assets/${req.query.dir || 'uploads'}/${req.file.filename}`;
    res.json({ 
      success: true, 
      file: {
        name: req.file.filename,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Get files list
app.get('/admin/api/files', authenticateToken, async (req, res) => {
  try {
    const targetDir = req.query.dir || 'uploads';
    const filesPath = path.join(__dirname, 'assets', targetDir);
    
    try {
      const files = await fs.readdir(filesPath);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(filesPath, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            url: `/assets/${targetDir}/${file}`
          };
        })
      );
      
      res.json({ files: fileStats });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({ files: [] });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Ошибка чтения файлов' });
  }
});

// Delete file
app.delete('/admin/api/files/:filename', authenticateToken, async (req, res) => {
  try {
    const targetDir = req.query.dir || 'uploads';
    const filePath = path.join(__dirname, 'assets', targetDir, req.params.filename);
    
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Файл удален' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

// Status endpoint
app.get('/admin/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Render'
  });
});

// Main page redirect
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ARTBAT Prague Admin Server запущен на Render`);
  console.log(`📊 Статус: http://localhost:${PORT}/admin/api/status`);
  console.log(`🔐 Админка: http://localhost:${PORT}/admin`);
});

module.exports = app;

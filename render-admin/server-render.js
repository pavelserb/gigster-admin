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
app.use('/admin', express.static(__dirname));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin credentials - пароль: admin123
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '$2a$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu'
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = req.query.dir || 'uploads';
    const uploadPath = path.join(__dirname, 'data', targetDir);
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
    const configPath = path.join(__dirname, 'data', 'config.json');
    if (await fs.access(configPath).then(() => true).catch(() => false)) {
      const config = await fs.readFile(configPath, 'utf8');
      res.json(JSON.parse(config));
    } else {
      res.json({ message: 'Config file not found' });
    }
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Ошибка чтения конфигурации' });
  }
});

// Save config
app.post('/admin/api/config', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'config.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Config saved successfully' });
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// Get translations
app.get('/admin/api/translations', authenticateToken, async (req, res) => {
  try {
    const translationsPath = path.join(__dirname, 'data', 'translations.json');
    if (await fs.access(translationsPath).then(() => true).catch(() => false)) {
      const translations = await fs.readFile(translationsPath, 'utf8');
      res.json(JSON.parse(translations));
    } else {
      res.json({ message: 'Translations file not found' });
    }
  } catch (error) {
    console.error('Translations error:', error);
    res.status(500).json({ error: 'Ошибка чтения переводов' });
  }
});

// Save translations
app.post('/admin/api/translations', authenticateToken, async (req, res) => {
  try {
    const translationsPath = path.join(__dirname, 'data', 'translations.json');
    await fs.mkdir(path.dirname(translationsPath), { recursive: true });
    await fs.writeFile(translationsPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Translations saved successfully' });
  } catch (error) {
    console.error('Translations save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения переводов' });
  }
});

// Get updates
app.get('/admin/api/updates', authenticateToken, async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, 'data', 'updates.json');
    if (await fs.access(updatesPath).then(() => true).catch(() => false)) {
      const updates = await fs.readFile(updatesPath, 'utf8');
      res.json(JSON.parse(updates));
    } else {
      res.json({ message: 'Updates file not found' });
    }
  } catch (error) {
    console.error('Updates error:', error);
    res.status(500).json({ error: 'Ошибка чтения обновлений' });
  }
});

// Save updates
app.post('/admin/api/updates', authenticateToken, async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, 'data', 'updates.json');
    await fs.mkdir(path.dirname(updatesPath), { recursive: true });
    await fs.writeFile(updatesPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Updates saved successfully' });
  } catch (error) {
    console.error('Updates save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения обновлений' });
  }
});

// Get HTML content
app.get('/admin/api/html', authenticateToken, async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'data', 'html.json');
    if (await fs.access(htmlPath).then(() => true).catch(() => false)) {
      const html = await fs.readFile(htmlPath, 'utf8');
      res.json(JSON.parse(html));
    } else {
      res.json({ message: 'HTML file not found' });
    }
  } catch (error) {
    console.error('HTML error:', error);
    res.status(500).json({ error: 'Ошибка чтения HTML' });
  }
});

// Save HTML content
app.post('/admin/api/html', authenticateToken, async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'data', 'html.json');
    await fs.mkdir(path.dirname(htmlPath), { recursive: true });
    await fs.writeFile(htmlPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'HTML saved successfully' });
  } catch (error) {
    console.error('HTML save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения HTML' });
  }
});

// Get media
app.get('/admin/api/media', authenticateToken, async (req, res) => {
  try {
    const assetsPath = path.join(__dirname, 'data');
    const files = await fs.readdir(assetsPath, { withFileTypes: true });
    const mediaFiles = files
      .filter(file => file.isFile() && /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name))
      .map(file => ({
        name: file.name,
        path: `/admin/data/${file.name}`,
        size: 0, // We'll get actual size if needed
        type: 'file'
      }));
    res.json(mediaFiles);
  } catch (error) {
    console.error('Media error:', error);
    res.status(500).json({ error: 'Ошибка чтения медиа файлов' });
  }
});

// Get media tree
app.get('/admin/api/media/tree', authenticateToken, async (req, res) => {
  try {
    const assetsPath = path.join(__dirname, 'data');
    const tree = await buildMediaTree(assetsPath);
    res.json(tree);
  } catch (error) {
    console.error('Media tree error:', error);
    res.status(500).json({ error: 'Ошибка построения дерева медиа' });
  }
});

// Get pixels
app.get('/admin/api/pixels', async (req, res) => {
  try {
    const pixelsPath = path.join(__dirname, 'data', 'pixels.json');
    if (await fs.access(pixelsPath).then(() => true).catch(() => false)) {
      const pixels = await fs.readFile(pixelsPath, 'utf8');
      res.json(JSON.parse(pixels));
    } else {
      res.json({ message: 'Pixels file not found' });
    }
  } catch (error) {
    console.error('Pixels error:', error);
    res.status(500).json({ error: 'Ошибка чтения пикселей' });
  }
});

// Save pixels
app.post('/admin/api/pixels', async (req, res) => {
  try {
    const pixelsPath = path.join(__dirname, 'data', 'pixels.json');
    await fs.mkdir(path.dirname(pixelsPath), { recursive: true });
    await fs.writeFile(pixelsPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Pixels saved successfully' });
  } catch (error) {
    console.error('Pixels save error:', error);
    res.status(500).json({ error: 'Ошибка сохранения пикселей' });
  }
});

// File upload
app.post('/admin/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    res.json({ 
      message: 'Файл загружен успешно',
      filename: req.file.filename,
      path: `/admin/data/${req.query.dir || 'uploads'}/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Helper function to build media tree
async function buildMediaTree(dirPath) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const tree = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const children = await buildMediaTree(fullPath);
        tree.push({
          name: item.name,
          type: 'directory',
          children: children
        });
      } else if (/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(item.name)) {
        tree.push({
          name: item.name,
          type: 'file',
          path: path.relative(path.join(__dirname, 'data'), fullPath).replace(/\\/g, '/')
        });
      }
    }
    
    return tree;
  } catch (error) {
    console.error('Build tree error:', error);
    return [];
  }
}

// Status endpoint for health check
app.get('/admin/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ARTBAT Prague Admin'
  });
});

// Serve uploaded files
app.use('/admin/data', express.static(path.join(__dirname, 'data')));

app.listen(PORT, () => {
  console.log(`🚀 ARTBAT Prague Admin Server запущен на Render`);
  console.log(`📊 Статус: http://localhost:${PORT}/admin/api/status`);
  console.log(`🔐 Админка: http://localhost:${PORT}/admin`);
});

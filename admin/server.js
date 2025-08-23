const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(__dirname));

// JWT Secret (в продакшене должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin credentials (в продакшене должны быть в базе данных)
// Пароль: admin123
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '$2b$10$Aa8CTrqmz.IDPDCCdqwEt.gSsWIMe0cknWJGe4MmlHVtFfbBzncGu'
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the directory from query params or default to uploads
    const targetDir = req.query.dir || 'uploads';
    const uploadPath = path.join(__dirname, '..', 'assets', targetDir);
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
    const configPath = path.join(__dirname, '..', 'js', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(configContent));
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Ошибка чтения конфигурации' });
  }
});

// Save config
app.post('/admin/api/config/save', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'js', 'config.json');
    
    // Create backup
    const backupPath = configPath + '.backup.' + Date.now();
    await fs.copyFile(configPath, backupPath);
    
    // Save new content as JSON
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Конфигурация сохранена' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// Get translations
app.get('/admin/api/translations', authenticateToken, async (req, res) => {
  try {
    const translationsPath = path.join(__dirname, '..', 'translations.json');
    const translationsContent = await fs.readFile(translationsPath, 'utf8');
    res.json(JSON.parse(translationsContent));
  } catch (error) {
    console.error('Error reading translations:', error);
    res.status(500).json({ error: 'Ошибка чтения переводов' });
  }
});

// Save translations
app.post('/admin/api/translations/save', authenticateToken, async (req, res) => {
  try {
    const translationsPath = path.join(__dirname, '..', 'translations.json');
    
    // Create backup
    const backupPath = translationsPath + '.backup.' + Date.now();
    await fs.copyFile(translationsPath, backupPath);
    
    // Save new content
    await fs.writeFile(translationsPath, JSON.stringify(req.body, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Переводы сохранены' });
  } catch (error) {
    console.error('Error saving translations:', error);
    res.status(500).json({ error: 'Ошибка сохранения переводов' });
  }
});

// Get updates
app.get('/admin/api/updates', authenticateToken, async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, '..', 'updates.json');
    const updatesContent = await fs.readFile(updatesPath, 'utf8');
    res.json(JSON.parse(updatesContent));
  } catch (error) {
    console.error('Error reading updates:', error);
    res.status(500).json({ error: 'Ошибка чтения обновлений' });
  }
});

// Save updates
app.post('/admin/api/updates/save', authenticateToken, async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, '..', 'updates.json');
    
    // Create backup
    const backupPath = updatesPath + '.backup.' + Date.now();
    await fs.copyFile(updatesPath, backupPath);
    
    // Save new content
    await fs.writeFile(updatesPath, JSON.stringify(req.body, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Обновления сохранены' });
  } catch (error) {
    console.error('Error saving updates:', error);
    res.status(500).json({ error: 'Ошибка сохранения обновлений' });
  }
});

// Get HTML
app.get('/admin/api/html', authenticateToken, async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf8');
    res.json({ content: htmlContent });
  } catch (error) {
    console.error('Error reading HTML:', error);
    res.status(500).json({ error: 'Ошибка чтения HTML' });
  }
});

// Save HTML
app.post('/admin/api/html/save', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const htmlPath = path.join(__dirname, '..', 'index.html');
    
    // Create backup
    const backupPath = htmlPath + '.backup.' + Date.now();
    await fs.copyFile(htmlPath, backupPath);
    
    // Save new content
    await fs.writeFile(htmlPath, content, 'utf8');
    
    res.json({ success: true, message: 'HTML файл сохранен' });
  } catch (error) {
    console.error('Error saving HTML:', error);
    res.status(500).json({ error: 'Ошибка сохранения HTML' });
  }
});

// Upload media files to specific directory
app.post('/admin/api/media/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', { 
      file: req.file, 
      query: req.query, 
      body: req.body 
    });

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Get target directory from query params
    const targetDir = req.query.dir || '';
    const targetPath = path.join(__dirname, '..', 'assets', targetDir);
    
    console.log('Target path:', targetPath);
    
    // Ensure target directory exists
    await fs.mkdir(targetPath, { recursive: true });
    
    // File is already in the correct location thanks to multer storage
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);
    const fileUrl = `/${relativePath.replace(/\\/g, '/')}`;
    
    console.log('File uploaded successfully:', {
      originalName: req.file.originalname,
      path: req.file.path,
      relativePath: relativePath,
      size: req.file.size
    });
    
    res.json({ 
      success: true, 
      message: 'Файл загружен',
      file: {
        name: req.file.originalname,
        filename: req.file.originalname,
        path: relativePath.replace('assets/', ''),
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла: ' + error.message });
  }
});

// Get media files list (root assets directory)
app.get('/admin/api/media', authenticateToken, async (req, res) => {
  try {
    const assetsPath = path.join(__dirname, '..', 'assets');
    const result = await getDirectoryContents(assetsPath, '');
    res.json(result);
  } catch (error) {
    console.error('Error getting media files:', error);
    res.status(500).json({ error: 'Ошибка получения списка файлов' });
  }
});

// Get complete folder tree
app.get('/admin/api/media/tree', authenticateToken, async (req, res) => {
  try {
    const tree = await getCompleteFolderTree();
    res.json({ directories: tree });
  } catch (error) {
    console.error('Error getting folder tree:', error);
    res.status(500).json({ error: 'Ошибка получения дерева папок' });
  }
});

// Get files from specific directory
app.get('/admin/api/media/directory/:dir(*)', authenticateToken, async (req, res) => {
  try {
    const targetDir = req.params.dir;
    const fullPath = path.join(__dirname, '..', 'assets', targetDir);
    
    console.log('Directory request:', { targetDir, fullPath }); // Debug log
    
    // Security check - ensure path is within assets directory
    const assetsPath = path.join(__dirname, '..', 'assets');
    if (!fullPath.startsWith(assetsPath)) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    // Pass the targetDir as is, without modification
    const files = await getDirectoryContents(fullPath, targetDir);
    console.log('Directory response:', files); // Debug log
    res.json(files);
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Ошибка чтения папки' });
  }
});

// Create directory
app.post('/admin/api/media/directory', authenticateToken, async (req, res) => {
  try {
    console.log('Create directory request:', req.body);
    
    const { path: dirPath, name } = req.body;
    const fullPath = path.join(__dirname, '..', 'assets', dirPath, name);
    
    console.log('Full path for directory:', fullPath);
    
    // Security check
    const assetsPath = path.join(__dirname, '..', 'assets');
    if (!fullPath.startsWith(assetsPath)) {
      console.log('Security check failed:', { fullPath, assetsPath });
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    // Check if directory already exists
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return res.status(409).json({ error: 'Папка уже существует' });
      }
    } catch (err) {
      // Directory doesn't exist, which is what we want
    }
    
    await fs.mkdir(fullPath, { recursive: true });
    console.log('Directory created successfully:', fullPath);
    
    res.json({ 
      success: true, 
      message: 'Папка создана',
      path: path.join(dirPath, name).replace(/\\/g, '/')
    });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Ошибка создания папки: ' + error.message });
  }
});

// Delete media file
app.delete('/admin/api/media/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'assets', 'uploads', filename);
    
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Файл удален' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

// Helper function to get media files recursively
async function getMediaFiles(dir) {
  const files = [];
  
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await getMediaFiles(fullPath);
        files.push(...subFiles);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.pdf', '.svg'].includes(ext)) {
          const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
          files.push({
            name: item,
            path: relativePath,
            url: `/${relativePath.replace(/\\/g, '/')}`,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return files;
}

// Helper function to get directory contents
async function getDirectoryContents(fullPath, relativePath) {
  console.log('getDirectoryContents called with:', { fullPath, relativePath }); // Debug log
  
  const contents = {
    path: relativePath,
    files: [],
    directories: []
  };
  
  try {
    const items = await fs.readdir(fullPath);
    console.log('Found items:', items); // Debug log
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const dirPath = relativePath ? path.join(relativePath, item) : item;
        console.log('Adding directory:', { item, dirPath }); // Debug log
        contents.directories.push({
          name: item,
          path: dirPath
        });
      } else {
        const ext = path.extname(item).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.pdf', '.svg'].includes(ext)) {
          const filePath = relativePath ? path.join(relativePath, item) : item;
          console.log('Adding file:', { item, filePath }); // Debug log
          contents.files.push({
            name: item,
            path: filePath,
            url: `/assets/${filePath}`,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  console.log('Returning contents:', contents); // Debug log
  return contents;
}

// New function to get complete folder tree
async function getCompleteFolderTree() {
  const assetsPath = path.join(__dirname, '..', 'assets');
  const tree = [];
  
  try {
    const items = await fs.readdir(assetsPath);
    
    for (const item of items) {
      const itemPath = path.join(assetsPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const subTree = await buildFolderTree(itemPath, item);
        tree.push(subTree);
      }
    }
  } catch (error) {
    console.error('Error building folder tree:', error);
  }
  
  return tree;
}

async function buildFolderTree(fullPath, name) {
  const node = {
    name: name,
    path: path.relative(path.join(__dirname, '..', 'assets'), fullPath).replace(/\\/g, '/'),
    children: []
  };
  
  try {
    const items = await fs.readdir(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const childNode = await buildFolderTree(itemPath, item);
        node.children.push(childNode);
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return node;
}

// Serve admin interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve JavaScript files with no-cache headers
app.get('/js/admin.js', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'js/admin.js'));
});

// Pixel Management API
const PIXELS_FILE = path.join(__dirname, '..', 'pixels.json');

// Get pixels configuration
app.get('/api/pixels', async (req, res) => {
  try {
    if (await fs.access(PIXELS_FILE).then(() => true).catch(() => false)) {
      const data = await fs.readFile(PIXELS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      // Return default configuration if file doesn't exist
      const defaultPixels = {
        gtm: [{ id: '', enabled: false, name: 'GTM Container' }],
        ga: [{ id: '', enabled: false, name: 'GA4 Property' }],
        fb: [{ id: '', enabled: false, name: 'FB Pixel' }],
        tt: [{ id: '', enabled: false, name: 'TikTok Pixel' }],
        custom: [],
        settings: {
          respectConsent: true,
          debugMode: false
        }
      };
      res.json(defaultPixels);
    }
  } catch (error) {
    console.error('Error reading pixels config:', error);
    res.status(500).json({ error: 'Failed to read pixels configuration' });
  }
});

// Save pixels configuration
app.post('/api/pixels', async (req, res) => {
  try {
    const pixels = req.body;
    
    // Validate the structure
    if (!pixels || typeof pixels !== 'object') {
      return res.status(400).json({ error: 'Invalid pixels configuration' });
    }
    
    // Save to file
    await fs.writeFile(PIXELS_FILE, JSON.stringify(pixels, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Pixels configuration saved successfully' });
  } catch (error) {
    console.error('Error saving pixels config:', error);
    res.status(500).json({ error: 'Failed to save pixels configuration' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Admin server running on port ${PORT}`);
  console.log(`Admin interface available at http://localhost:${PORT}/admin`);
  console.log(`Default credentials: admin / admin123`);
});

module.exports = app;

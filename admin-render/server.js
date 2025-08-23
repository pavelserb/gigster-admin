const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const ftp = require('ftp');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Конфигурация
const FTP_CONFIG = {
    host: process.env.FTP_HOST || 'somos.ftp.tools',
    user: process.env.FTP_USER || 'somos_cursor',
    password: process.env.FTP_PASS || 'Pr6LUx9h45',
    path: process.env.FTP_PATH || '/artbat-prague'
};

// Хранение пользователей (в продакшене используйте базу данных)
const users = [
    {
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin'
    }
];

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Аутентификация
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
});

// Получение данных сайта
app.get('/api/site/data', authenticateToken, async (req, res) => {
    try {
        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.get(`${FTP_CONFIG.path}/translations.json`, (err, stream) => {
                if (err) {
                    ftpClient.end();
                    return res.status(404).json({ error: 'Translations file not found' });
                }

                let data = '';
                stream.on('data', chunk => data += chunk);
                stream.on('end', () => {
                    try {
                        const translations = JSON.parse(data);
                        ftpClient.end();
                        res.json({ translations });
                    } catch (e) {
                        ftpClient.end();
                        res.status(500).json({ error: 'Invalid JSON in translations file' });
                    }
                });
            });
        });

        ftpClient.on('error', (err) => {
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch site data', details: error.message });
    }
});

// Обновление переводов
app.post('/api/site/translations', authenticateToken, async (req, res) => {
    try {
        const { translations } = req.body;
        
        // Создаем временный файл
        const tempFile = path.join(__dirname, 'temp', 'translations.json');
        await fs.ensureDir(path.dirname(tempFile));
        await fs.writeJson(tempFile, translations, { spaces: 2 });

        // Загружаем на FTP
        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.put(tempFile, `${FTP_CONFIG.path}/translations.json`, (err) => {
                ftpClient.end();
                
                // Удаляем временный файл
                fs.remove(tempFile);
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to update translations', details: err.message });
                }
                
                res.json({ success: true, message: 'Translations updated successfully' });
            });
        });

        ftpClient.on('error', (err) => {
            fs.remove(tempFile);
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update translations', details: error.message });
    }
});

// Обновление новостей
app.post('/api/site/updates', authenticateToken, async (req, res) => {
    try {
        const { updates } = req.body;
        
        const tempFile = path.join(__dirname, 'temp', 'updates.json');
        await fs.ensureDir(path.dirname(tempFile));
        await fs.writeJson(tempFile, updates, { spaces: 2 });

        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.put(tempFile, `${FTP_CONFIG.path}/updates.json`, (err) => {
                ftpClient.end();
                fs.remove(tempFile);
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to update news', details: err.message });
                }
                
                res.json({ success: true, message: 'News updated successfully' });
            });
        });

        ftpClient.on('error', (err) => {
            fs.remove(tempFile);
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update news', details: error.message });
    }
});

// Обновление аналитики
app.post('/api/site/pixels', authenticateToken, async (req, res) => {
    try {
        const { pixels } = req.body;
        
        const tempFile = path.join(__dirname, 'temp', 'pixels.json');
        await fs.ensureDir(path.dirname(tempFile));
        await fs.writeJson(tempFile, pixels, { spaces: 2 });

        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.put(tempFile, `${FTP_CONFIG.path}/pixels.json`, (err) => {
                ftpClient.end();
                fs.remove(tempFile);
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to update analytics', details: err.message });
                }
                
                res.json({ success: true, message: 'Analytics updated successfully' });
            });
        });

        ftpClient.on('error', (err) => {
            fs.remove(tempFile);
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update analytics', details: error.message });
    }
});

// Загрузка изображений
const upload = multer({ 
    dest: 'temp/uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

app.post('/api/site/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { category } = req.body; // 'artists', 'updates', 'media', etc.
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const remotePath = `${FTP_CONFIG.path}/assets/images/${category}/${fileName}`;

        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.put(req.file.path, remotePath, (err) => {
                ftpClient.end();
                
                // Удаляем временный файл
                fs.remove(req.file.path);
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to upload image', details: err.message });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Image uploaded successfully',
                    url: `/assets/images/${category}/${fileName}`
                });
            });
        });

        ftpClient.on('error', (err) => {
            fs.remove(req.file.path);
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        if (req.file) fs.remove(req.file.path);
        res.status(500).json({ error: 'Failed to upload image', details: error.message });
    }
});

// Получение списка изображений
app.get('/api/site/images/:category', authenticateToken, async (req, res) => {
    try {
        const { category } = req.params;
        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.list(`${FTP_CONFIG.path}/assets/images/${category}`, (err, list) => {
                ftpClient.end();
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to list images', details: err.message });
                }
                
                const images = list
                    .filter(item => item.type === '-') // только файлы
                    .map(item => ({
                        name: item.name,
                        size: item.size,
                        date: item.date,
                        url: `/assets/images/${category}/${item.name}`
                    }));
                
                res.json({ images });
            });
        });

        ftpClient.on('error', (err) => {
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list images', details: error.message });
    }
});

// Удаление изображения
app.delete('/api/site/images/:category/:filename', authenticateToken, async (req, res) => {
    try {
        const { category, filename } = req.params;
        const remotePath = `${FTP_CONFIG.path}/assets/images/${category}/${filename}`;

        const ftpClient = new ftp();
        
        ftpClient.on('ready', () => {
            ftpClient.delete(remotePath, (err) => {
                ftpClient.end();
                
                if (err) {
                    return res.status(500).json({ error: 'Failed to delete image', details: err.message });
                }
                
                res.json({ success: true, message: 'Image deleted successfully' });
            });
        });

        ftpClient.on('error', (err) => {
            res.status(500).json({ error: 'FTP connection failed', details: err.message });
        });

        ftpClient.connect(FTP_CONFIG);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete image', details: error.message });
    }
});

// Статус сервера
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: 'Render'
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 ARTBAT Prague Admin Server запущен на Render`);
    console.log(`📊 Статус: http://localhost:${PORT}/api/status`);
    console.log(`🔐 Админка: http://localhost:${PORT}/admin`);
});

module.exports = app;

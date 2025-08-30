const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Check if index.html exists
app.get('/check-files', async (req, res) => {
  try {
    const files = await fs.readdir(__dirname);
    const hasIndex = files.includes('index.html');
    const hasPackage = files.includes('package.json');
    
    res.json({
      status: 'OK',
      files: files,
      hasIndexHtml: hasIndex,
      hasPackageJson: hasPackage,
      workingDir: __dirname
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read directory',
      message: error.message
    });
  }
});

// Serve index.html
app.get('/admin', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'index.html');
    await fs.access(indexPath);
    res.sendFile(indexPath);
  } catch (error) {
    res.status(500).json({
      error: 'index.html not found',
      message: error.message,
      path: indexPath
    });
  }
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`📁 Working directory: ${__dirname}`);
  console.log(`🔗 Test: http://localhost:${PORT}/test`);
  console.log(`🔗 Check files: http://localhost:${PORT}/check-files`);
  console.log(`🔗 Admin: http://localhost:${PORT}/admin`);
});

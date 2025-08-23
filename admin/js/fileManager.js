class FileManager {
  constructor() {
    console.log('FileManager constructor called');
    this.currentDirectory = '';
    this.selectedFile = null;
    this.targetField = null;
    this.onFileSelect = null;
    this.expandedFolders = new Set();
    this.currentFilter = 'all';
    this.currentSearch = '';
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDirectoryTree();
  }

  bindEvents() {
    // File manager modal events
    document.getElementById('fileManagerClose')?.addEventListener('click', () => this.hide());
    document.getElementById('cancelFileBtn')?.addEventListener('click', () => this.hide());
    document.getElementById('selectFileBtn')?.addEventListener('click', () => this.selectFile());
    document.getElementById('clearFileBtn')?.addEventListener('click', () => this.clearFile());
    document.getElementById('refreshFileManagerBtn')?.addEventListener('click', () => this.refreshCurrentDirectory());
    document.getElementById('fileManagerUploadFileBtn')?.addEventListener('click', () => this.uploadFileModal());
    document.getElementById('fileManagerCreateFolderBtn')?.addEventListener('click', () => this.createDirectoryModal());

    // Close on modal overlay click
    document.getElementById('fileManagerModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'fileManagerModal') {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('fileManagerModal').style.display === 'block') {
        this.hide();
      }
    });

    // File input events
    document.getElementById('fileManagerFileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));

    // Filters and search
    document.getElementById('fileManagerFilter')?.addEventListener('change', (e) => this.filterFiles(e.target.value));
    document.getElementById('fileManagerSearch')?.addEventListener('input', (e) => this.searchFiles(e.target.value));
  }

  show(targetField, onFileSelect) {
    this.targetField = targetField;
    this.onFileSelect = onFileSelect;
    this.selectedFile = null;
    
    document.getElementById('fileManagerModal').style.display = 'block';
    this.loadDirectoryTree();
    this.loadDirectory('');
    this.updateUI();
  }

  hide() {
    document.getElementById('fileManagerModal').style.display = 'none';
    this.targetField = null;
    this.onFileSelect = null;
    this.selectedFile = null;
  }

  async loadDirectoryTree() {
    try {
      const response = await fetch('/admin/api/media/tree', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderDirectoryTree(data);
      }
    } catch (error) {
      console.error('Error loading directory tree:', error);
    }
  }

  renderDirectoryTree(data) {
    const container = document.getElementById('fileManagerFolderTree');
    
    if (!data.directories || data.directories.length === 0) {
      container.innerHTML = '<p class="text-muted">Папки не найдены</p>';
      return;
    }
    
    // Build tree structure
    const treeData = this.buildFolderTree(data.directories);
    
    const html = this.renderFolderTreeHtml(treeData);
    container.innerHTML = html;
    
    // Bind toggle events
    this.bindFolderToggleEvents();
  }

  buildFolderTree(directories) {
    // The server returns a complete tree structure
    // We just need to flatten it for easier processing
    const flatTree = {};
    
    const flattenTree = (nodes, parentPath = '') => {
      nodes.forEach(node => {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        flatTree[fullPath] = {
          name: node.name,
          path: fullPath,
          hasSubfolders: node.children && node.children.length > 0
        };
        
        if (node.children && node.children.length > 0) {
          flattenTree(node.children, fullPath);
        }
      });
    };
    
    flattenTree(directories);
    return flatTree;
  }

  renderFolderTreeHtml(treeData, level = 0) {
    let html = '';
    
    // Add root folder
    html += `
      <div class="media-folder-item ${!this.currentDirectory ? 'active' : ''}"
           onclick="fileManager.selectFolder('')">
        <span class="folder-icon">📁</span>
        <span class="folder-name">assets</span>
      </div>
    `;
    
    // Sort items by path to show parent folders first
    const sortedItems = Object.values(treeData).sort((a, b) => {
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.path.localeCompare(b.path);
    });
    
    sortedItems.forEach(item => {
      const isExpanded = this.expandedFolders.has(item.path);
      
      html += `
        <div class="media-folder-item ${this.currentDirectory === item.path ? 'active' : ''}" data-path="${item.path}">
          ${item.hasSubfolders ? `
            <span class="folder-toggle ${isExpanded ? 'expanded' : ''}" data-path="${item.path}">▶</span>
          ` : '<span class="folder-toggle-placeholder"></span>'}
          <span class="folder-icon">📁</span>
          <span class="folder-name" onclick="fileManager.selectFolder('${item.path}')">${item.name}</span>
        </div>
      `;
      
      if (item.hasSubfolders && isExpanded) {
        // Find and render child folders
        const childFolders = Object.values(treeData).filter(child =>
          child.path.startsWith(item.path + '/') &&
          child.path.split('/').length === item.path.split('/').length + 1
        );
        
        if (childFolders.length > 0) {
          html += `<div class="media-folder-subtree">`;
          childFolders.forEach(child => {
            html += `
              <div class="media-folder-item ${this.currentDirectory === child.path ? 'active' : ''}" data-path="${child.path}">
                ${child.hasSubfolders ? `
                  <span class="folder-toggle ${this.expandedFolders.has(child.path) ? 'expanded' : ''}" data-path="${child.path}">▶</span>
                ` : '<span class="folder-toggle-placeholder"></span>'}
                <span class="folder-icon">📁</span>
                <span class="folder-name" onclick="fileManager.selectFolder('${child.path}')">${child.name}</span>
              </div>
            `;
          });
          html += `</div>`;
        }
      }
    });
    
    return html;
  }

  bindFolderToggleEvents() {
    document.querySelectorAll('.folder-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = toggle.dataset.path;
        this.toggleFolder(path);
      });
    });
  }

  toggleFolder(path) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    
    // Re-render the tree
    this.loadDirectoryTree();
  }

  selectFolder(path) {
    this.currentDirectory = path;
    this.loadDirectory(path);
    this.updateFolderTree();
  }

  updateFolderTree() {
    // Update active states in folder tree
    document.querySelectorAll('.media-folder-item').forEach(item => {
      item.classList.remove('active');
    });
    
    if (!this.currentDirectory) {
      // Root folder is active
      document.querySelector('.media-folder-item').classList.add('active');
    } else {
      // Find and activate the correct folder
      const folderItems = document.querySelectorAll('.media-folder-item');
      folderItems.forEach((item, index) => {
        if (index > 0) { // Skip root folder
          const onclick = item.querySelector('.folder-name').getAttribute('onclick');
          if (onclick && onclick.includes(`'${this.currentDirectory}'`)) {
            item.classList.add('active');
          }
        }
      });
    }
  }

  async loadDirectory(path) {
    try {
      const url = path ? `/admin/api/media/directory/${path}` : '/admin/api/media';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderDirectory(data);
        this.updateBreadcrumb(path);
      } else {
        console.error('Server response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
    }
  }

  renderDirectory(data) {
    const container = document.getElementById('fileManagerFileList');
    
    if (!data.files || data.files.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">Папка пуста</p>';
      return;
    }
    
    // Add header
    let html = `
      <div class="media-file-list-header">
        <div>Превью</div>
        <div>Название</div>
        <div>Размер</div>
      </div>
    `;
    
    // Add files
    html += data.files.map(file => {
      const icon = this.getFileIcon(file.name);
      const size = this.formatFileSize(file.size);
      const preview = this.getFilePreview(file);
      
      return `
        <div class="media-file-item" data-path="${file.path}" onclick="fileManager.selectFileItem(this, '${file.path}')">
          <div class="media-file-preview">
            ${preview}
          </div>
          <div class="media-file-name">${file.name}</div>
          <div class="media-file-size">${size}</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    
    // Apply current filters after rendering
    this.applyFilters();
    
    // Restore filter and search input values
    const filterSelect = document.getElementById('fileManagerFilter');
    const searchInput = document.getElementById('fileManagerSearch');
    
    if (filterSelect) filterSelect.value = this.currentFilter;
    if (searchInput) searchInput.value = this.currentSearch;
    
    return;
  }

  navigateToDirectory(path) {
    this.selectFolder(path);
  }

  selectFileItem(element, path) {
    // Remove previous selection
    document.querySelectorAll('.media-file-item').forEach(item => item.classList.remove('selected'));
    
    // Select current item
    element.classList.add('selected');
    
    this.selectedFile = path;
    this.updateUI();
  }

  selectFile() {
    if (this.selectedFile && this.onFileSelect) {
      // Add 'assets/' prefix to the selected file path for use in configuration fields
      const fullPath = `assets/${this.selectedFile}`;
      this.onFileSelect(fullPath);
      this.hide();
    }
  }

  clearFile() {
    if (this.onFileSelect) {
      this.onFileSelect('');
      this.hide();
    }
  }

  async uploadFileModal() {
    console.log('uploadFileModal called');
    document.getElementById('fileManagerFileInput').click();
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Uploading file:', { name: file.name, size: file.size, currentDir: this.currentDirectory });

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const uploadDir = this.currentDirectory || '';
      const response = await fetch(`/admin/api/media/upload?dir=${uploadDir}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      console.log('Upload response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('File uploaded:', result);
        this.showSuccess('Файл загружен');
        this.refreshCurrentDirectory();
      } else {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        this.showError(`Ошибка загрузки файла: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      this.showError('Ошибка загрузки файла');
    }
    
    // Clear the file input
    event.target.value = '';
  }

  async createDirectoryModal() {
    console.log('createDirectoryModal called');
    const name = prompt('Введите название папки:');
    if (!name) return;

    console.log('Creating directory:', { path: this.currentDirectory || '', name });

    try {
      const response = await fetch('/admin/api/media/directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          path: this.currentDirectory || '',
          name: name
        })
      });

      console.log('Create directory response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Directory created:', result);
        this.showSuccess('Папка создана');
        this.loadDirectoryTree();
        this.loadDirectory(this.currentDirectory || '');
      } else {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        this.showError(`Ошибка создания папки: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      this.showError('Ошибка создания папки');
    }
  }

  refreshCurrentDirectory() {
    this.loadDirectory(this.currentDirectory || '');
  }

  updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('fileManagerBreadcrumb');
    
    if (!path) {
      breadcrumb.innerHTML = '<span class="media-breadcrumb-item">assets</span>';
      return;
    }

    const parts = path.split('/');
    let html = '<span class="media-breadcrumb-item" onclick="fileManager.selectFolder(\'\')">assets</span><span class="media-breadcrumb-separator">/</span>';
    
    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/');
      html += `
        <span class="media-breadcrumb-item" onclick="fileManager.selectFolder('${currentPath}')">${part}</span>
        <span class="media-breadcrumb-separator">/</span>
      `;
    });
    
    // Remove the last separator
    html = html.replace(/<span class="media-breadcrumb-separator">\/<\/span>$/, '');
    breadcrumb.innerHTML = html;
  }

  updateUI() {
    const selectBtn = document.getElementById('selectFileBtn');
    const clearBtn = document.getElementById('clearFileBtn');
    const selectedInfo = document.getElementById('selectedFileInfo');
    const selectedName = document.getElementById('selectedFileName');

    if (this.selectedFile) {
      selectBtn.disabled = false;
      selectedInfo.style.display = 'block';
      selectedName.textContent = this.selectedFile;
    } else {
      selectBtn.disabled = true;
      selectedInfo.style.display = 'none';
    }
  }

  getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'mp4':
      case 'webm':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'pdf':
        return '📄';
      case 'svg':
        return '🎨';
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📁';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showSuccess(message) {
    // Use admin panel's message system
    if (window.admin && admin.showSuccess) {
      admin.showSuccess(message);
    }
  }

  showError(message) {
    // Use admin panel's message system
    if (window.admin && admin.showError) {
      admin.showError(message);
    }
  }

  filterFiles(filterValue) {
    this.currentFilter = filterValue;
    this.applyFilters();
  }

  searchFiles(query) {
    this.currentSearch = query;
    this.applyFilters();
  }

  applyFilters() {
    const fileItems = document.querySelectorAll('.media-file-item');
    
    fileItems.forEach(item => {
      const fileName = item.querySelector('.media-file-name').textContent.toLowerCase();
      
      // Apply type filter
      let shouldShow = true;
      
      switch (this.currentFilter) {
        case 'images':
          shouldShow = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
          break;
        case 'videos':
          shouldShow = /\.(mp4|webm|avi|mov)$/i.test(fileName);
          break;
        case 'documents':
          shouldShow = /\.(pdf|doc|docx|txt)$/i.test(fileName);
          break;
        case 'all':
        default:
          shouldShow = true;
          break;
      }
      
      // Apply search filter
      if (shouldShow && this.currentSearch.trim()) {
        const searchTerm = this.currentSearch.toLowerCase();
        const filePath = item.dataset.path.toLowerCase();
        shouldShow = fileName.includes(searchTerm) || filePath.includes(searchTerm);
      }
      
      item.style.display = shouldShow ? 'grid' : 'none';
    });
  }

  getFilePreview(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return `<img src="/assets/${file.path}" alt="${file.name}" loading="lazy">`;
    } else {
      return `<span class="file-icon">${this.getFileIcon(file.name)}</span>`;
    }
  }
}

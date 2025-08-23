// Система управления пикселями и тегами
class PixelManager {
  constructor() {
    this.pixels = {};
    this.init();
  }
  
  async init() {
    await this.loadPixels();
    this.renderPixels();
    this.setupEventListeners();
  }
  
  async loadPixels() {
    try {
      const response = await fetch('/api/pixels');
      if (response.ok) {
        const data = await response.json();
        // Проверяем структуру данных и конвертируем старый формат в новый
        this.pixels = this.normalizePixelData(data);
      } else {
        console.log('API not available, using localStorage');
        this.pixels = this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Failed to load pixels from API, using localStorage:', error);
      this.pixels = this.loadFromLocalStorage();
    }
  }
  
  normalizePixelData(data) {
    // Конвертируем старый формат в новый
    const normalized = {
      gtm: [],
      ga: [],
      fb: [],
      tt: [],
      custom: data.custom || [],
      settings: data.settings || {
        respectConsent: true,
        debugMode: false
      }
    };
    
    // GTM
    if (Array.isArray(data.gtm)) {
      normalized.gtm = data.gtm;
    } else if (data.gtm && typeof data.gtm === 'object') {
      // Старый формат: { id: '', enabled: false }
      if (data.gtm.id || data.gtm.enabled !== undefined) {
        normalized.gtm = [{
          id: data.gtm.id || '',
          enabled: data.gtm.enabled || false,
          name: data.gtm.name || 'GTM Container'
        }];
      }
    }
    
    // GA4
    if (Array.isArray(data.ga)) {
      normalized.ga = data.ga;
    } else if (data.ga && typeof data.ga === 'object') {
      if (data.ga.id || data.ga.enabled !== undefined) {
        normalized.ga = [{
          id: data.ga.id || '',
          enabled: data.ga.enabled || false,
          name: data.ga.name || 'GA4 Property'
        }];
      }
    }
    
    // FB
    if (Array.isArray(data.fb)) {
      normalized.fb = data.fb;
    } else if (data.fb && typeof data.fb === 'object') {
      if (data.fb.id || data.fb.enabled !== undefined) {
        normalized.fb = [{
          id: data.fb.id || '',
          enabled: data.fb.enabled || false,
          name: data.fb.name || 'FB Pixel'
        }];
      }
    }
    
    // TT
    if (Array.isArray(data.tt)) {
      normalized.tt = data.tt;
    } else if (data.tt && typeof data.tt === 'object') {
      if (data.tt.id || data.tt.enabled !== undefined) {
        normalized.tt = [{
          id: data.tt.id || '',
          enabled: data.tt.enabled || false,
          name: data.tt.name || 'TikTok Pixel'
        }];
      }
    }
    
    return normalized;
  }
  
  loadFromLocalStorage() {
    const stored = localStorage.getItem('site_pixels');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return this.normalizePixelData(data);
      } catch (error) {
        console.error('Error parsing stored pixels:', error);
        return this.getDefaultPixels();
      }
    }
    return this.getDefaultPixels();
  }
  
  getDefaultPixels() {
    return {
      gtm: [{ id: '', enabled: false, name: 'GTM Container' }],
      ga: [{ id: '', enabled: false, name: 'GA4 Property' }],
      fb: [{ id: '', enabled: false, name: 'FB Pixel' }],
      tt: [{ id: '', enabled: false, name: 'TikTok Pixel' }],
      custom: []
    };
  }
  
  renderPixels() {
    const container = document.getElementById('pixelsContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="pixel-section">
        <h3>Google Tag Manager</h3>
        <div id="gtmContainer">
          ${this.renderPixelList('gtm', 'GTM Container', 'GTM-XXXXXXX')}
        </div>
        <button class="btn secondary add-pixel-btn" data-type="gtm">Add GTM Container</button>
        <small class="help-text">Container ID from Google Tag Manager</small>
      </div>
      
      <div class="pixel-section">
        <h3>Google Analytics 4</h3>
        <div id="gaContainer">
          ${this.renderPixelList('ga', 'GA4 Property', 'G-XXXXXXXXXX')}
        </div>
        <button class="btn secondary add-pixel-btn" data-type="ga">Add GA4 Property</button>
        <small class="help-text">Measurement ID from Google Analytics</small>
      </div>
      
      <div class="pixel-section">
        <h3>Facebook Pixel</h3>
        <div id="fbContainer">
          ${this.renderPixelList('fb', 'FB Pixel', 'XXXXXXXXXX')}
        </div>
        <button class="btn secondary add-pixel-btn" data-type="fb">Add Facebook Pixel</button>
        <small class="help-text">Pixel ID from Facebook Business Manager</small>
      </div>
      
      <div class="pixel-section">
        <h3>TikTok Pixel</h3>
        <div id="ttContainer">
          ${this.renderPixelList('tt', 'TikTok Pixel', 'XXXXXXXXXX')}
        </div>
        <button class="btn secondary add-pixel-btn" data-type="tt">Add TikTok Pixel</button>
        <small class="help-text">Pixel ID from TikTok Ads Manager</small>
      </div>
      
      <div class="pixel-section">
        <h3>Custom Tags</h3>
        <div id="customTagsContainer">
          ${this.renderCustomTags()}
        </div>
        <button id="addCustomTag" class="btn secondary">Add Custom Tag</button>
        <small class="help-text">Add custom tracking codes or other pixels</small>
      </div>
      
      <div class="pixel-section">
        <h3>Settings</h3>
        <div class="pixel-input-group">
          <label class="checkbox-label">
            <input type="checkbox" id="respectConsent" ${this.pixels.settings?.respectConsent !== false ? 'checked' : ''}>
            <span>Respect cookie consent</span>
          </label>
        </div>
        <div class="pixel-input-group">
          <label class="checkbox-label">
            <input type="checkbox" id="debugMode" ${this.pixels.settings?.debugMode ? 'checked' : ''}>
            <span>Debug mode (console logging)</span>
          </label>
        </div>
        <small class="help-text">Load pixels only after user consent and enable debug logging</small>
      </div>
      
      <div class="pixel-actions">
        <button id="savePixels" class="btn primary">Save Pixels</button>
        <button id="testPixels" class="btn secondary">Test Pixels</button>
        <button id="generateCode" class="btn secondary">Generate Code</button>
      </div>
      
      <div id="pixelStatus" class="pixel-status"></div>
    `;
  }
  
  renderPixelList(type, defaultName, placeholder) {
    const pixels = this.pixels[type] || [];
    
    // Проверяем, что pixels это массив
    if (!Array.isArray(pixels)) {
      console.warn(`Pixels for type ${type} is not an array:`, pixels);
      return '<p class="no-pixels">No pixels added</p>';
    }
    
    if (pixels.length === 0) {
      return '<p class="no-pixels">No pixels added</p>';
    }
    
    return pixels.map((pixel, index) => `
      <div class="pixel-item" data-type="${type}" data-index="${index}">
        <div class="pixel-item-header">
          <input type="text" class="pixel-name" placeholder="Pixel name" value="${pixel.name || defaultName}">
          <button class="btn small remove-pixel" data-type="${type}" data-index="${index}">Remove</button>
        </div>
        <div class="pixel-input-group">
          <input type="text" class="pixel-id" placeholder="${placeholder}" value="${pixel.id || ''}">
          <label class="checkbox-label">
            <input type="checkbox" class="pixel-enabled" ${pixel.enabled ? 'checked' : ''}>
            <span>Enable</span>
          </label>
        </div>
      </div>
    `).join('');
  }
  
  renderCustomTags() {
    if (!this.pixels.custom || this.pixels.custom.length === 0) {
      return '<p class="no-custom-tags">No custom tags added</p>';
    }
    
    return this.pixels.custom.map((tag, index) => `
      <div class="custom-tag" data-index="${index}">
        <div class="custom-tag-header">
          <input type="text" class="custom-tag-name" placeholder="Tag name" value="${tag.name || ''}">
          <button class="btn small remove-tag" data-index="${index}">Remove</button>
        </div>
        <textarea class="custom-tag-code" placeholder="Paste your tracking code here..." rows="4">${tag.code || ''}</textarea>
        <label class="checkbox-label">
          <input type="checkbox" class="custom-tag-enabled" ${tag.enabled ? 'checked' : ''}>
          <span>Enable</span>
        </label>
      </div>
    `).join('');
  }
  
  setupEventListeners() {
    // Save pixels
    document.getElementById('savePixels')?.addEventListener('click', () => {
      this.savePixels();
    });
    
    // Test pixels
    document.getElementById('testPixels')?.addEventListener('click', () => {
      this.testPixels();
    });
    
    // Generate code
    document.getElementById('generateCode')?.addEventListener('click', () => {
      this.generateCode();
    });
    
    // Add custom tag
    document.getElementById('addCustomTag')?.addEventListener('click', () => {
      this.addCustomTag();
    });
    
    // Add pixel buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-pixel-btn')) {
        const type = e.target.dataset.type;
        this.addPixel(type);
      }
    });
    
    // Remove custom tag
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-tag')) {
        const index = parseInt(e.target.dataset.index);
        this.removeCustomTag(index);
      }
    });
    
    // Remove pixel
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-pixel')) {
        const type = e.target.dataset.type;
        const index = parseInt(e.target.dataset.index);
        this.removePixel(type, index);
      }
    });
  }
  
  async savePixels() {
    // Сначала сохраняем текущие данные из полей
    this.saveCurrentData();
    
    try {
      // Сохраняем в localStorage
      localStorage.setItem('site_pixels', JSON.stringify(this.pixels));
      
      // Пытаемся сохранить на сервер
      const response = await fetch('/api/pixels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.pixels)
      });
      
      if (response.ok) {
        this.showStatus('Pixels saved successfully!', 'success');
      } else {
        this.showStatus('Pixels saved locally. Server save failed.', 'warning');
      }
    } catch (error) {
      console.error('Failed to save pixels:', error);
      this.showStatus('Pixels saved locally only.', 'warning');
    }
  }
  

  
  getCustomTags() {
    const customTags = [];
    const containers = document.querySelectorAll('.custom-tag');
    
    containers.forEach((container, index) => {
      const name = container.querySelector('.custom-tag-name')?.value || '';
      const code = container.querySelector('.custom-tag-code')?.value || '';
      const enabled = container.querySelector('.custom-tag-enabled')?.checked || false;
      
      if (name || code) {
        customTags.push({ name, code, enabled });
      }
    });
    
    return customTags;
  }
  
  addPixel(type) {
    if (!this.pixels[type]) {
      this.pixels[type] = [];
    }
    
    const defaultNames = {
      gtm: 'GTM Container',
      ga: 'GA4 Property',
      fb: 'FB Pixel',
      tt: 'TikTok Pixel'
    };
    
    const newPixel = {
      id: '',
      enabled: false,
      name: defaultNames[type]
    };
    
    this.pixels[type].push(newPixel);
    
    // Перерендериваем только нужную секцию
    this.renderPixelSection(type);
  }
  
  saveCurrentData() {
    // Сохраняем данные из всех полей перед перерендером
    const types = ['gtm', 'ga', 'fb', 'tt'];
    
    types.forEach(type => {
      const container = document.getElementById(`${type}Container`);
      if (container) {
        const pixelItems = container.querySelectorAll('.pixel-item');
        const pixels = [];
        
        pixelItems.forEach((item, index) => {
          const name = item.querySelector('.pixel-name')?.value || '';
          const id = item.querySelector('.pixel-id')?.value || '';
          const enabled = item.querySelector('.pixel-enabled')?.checked || false;
          
          pixels.push({ name, id, enabled });
        });
        
        // Обновляем только если есть данные в DOM
        if (pixels.length > 0) {
          this.pixels[type] = pixels;
        }
      }
    });
    
    // Сохраняем кастомные теги
    this.pixels.custom = this.getCustomTags();
    
    // Сохраняем настройки
    this.pixels.settings = {
      respectConsent: document.getElementById('respectConsent')?.checked !== false,
      debugMode: document.getElementById('debugMode')?.checked || false
    };
  }
  
  renderPixelSection(type) {
    const container = document.getElementById(`${type}Container`);
    if (!container) return;
    
    const placeholders = {
      gtm: 'GTM-XXXXXXX',
      ga: 'G-XXXXXXXXXX',
      fb: 'XXXXXXXXXX',
      tt: 'XXXXXXXXXX'
    };
    
    const defaultNames = {
      gtm: 'GTM Container',
      ga: 'GA4 Property',
      fb: 'FB Pixel',
      tt: 'TikTok Pixel'
    };
    
    // Рендерим только список пикселей, не трогая кнопку
    container.innerHTML = this.renderPixelList(type, defaultNames[type], placeholders[type]);
  }
  
  removePixel(type, index) {
    if (this.pixels[type] && this.pixels[type][index]) {
      // Сохраняем текущие данные из DOM перед удалением
      this.saveCurrentData();
      
      // Удаляем пиксель
      this.pixels[type].splice(index, 1);
      
      // Перерендериваем только нужную секцию
      this.renderPixelSection(type);
    }
  }
  
  addCustomTag() {
    const container = document.getElementById('customTagsContainer');
    const noTagsMessage = container.querySelector('.no-custom-tags');
    
    if (noTagsMessage) {
      noTagsMessage.remove();
    }
    
    const index = this.pixels.custom ? this.pixels.custom.length : 0;
    const tagHtml = `
      <div class="custom-tag" data-index="${index}">
        <div class="custom-tag-header">
          <input type="text" class="custom-tag-name" placeholder="Tag name">
          <button class="btn small remove-tag" data-index="${index}">Remove</button>
        </div>
        <textarea class="custom-tag-code" placeholder="Paste your tracking code here..." rows="4"></textarea>
        <label class="checkbox-label">
          <input type="checkbox" class="custom-tag-enabled" checked>
          <span>Enable</span>
        </label>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', tagHtml);
  }
  
  removeCustomTag(index) {
    const tag = document.querySelector(`.custom-tag[data-index="${index}"]`);
    if (tag) {
      tag.remove();
      
      // Обновляем индексы
      const remainingTags = document.querySelectorAll('.custom-tag');
      remainingTags.forEach((tag, newIndex) => {
        tag.dataset.index = newIndex;
        tag.querySelector('.remove-tag').dataset.index = newIndex;
      });
      
      // Показываем сообщение если нет тегов
      const container = document.getElementById('customTagsContainer');
      if (container.children.length === 0) {
        container.innerHTML = '<p class="no-custom-tags">No custom tags added</p>';
      }
    }
  }
  
  testPixels() {
    // Сначала сохраняем текущие данные из полей
    this.saveCurrentData();
    
    const results = [];
    
    // Проверяем GTM
    const gtmPixels = this.pixels.gtm || [];
    if (gtmPixels.length > 0) {
      const enabledGtm = gtmPixels.filter(p => p.enabled);
      if (enabledGtm.length > 0) {
        results.push(`✅ GTM: ${enabledGtm.length} container(s) configured`);
      } else {
        results.push('⚠️ GTM: Containers added but disabled');
      }
    } else {
      results.push('❌ GTM: No containers configured');
    }
    
    // Проверяем GA4
    const gaPixels = this.pixels.ga || [];
    if (gaPixels.length > 0) {
      const enabledGa = gaPixels.filter(p => p.enabled);
      if (enabledGa.length > 0) {
        results.push(`✅ GA4: ${enabledGa.length} property(ies) configured`);
      } else {
        results.push('⚠️ GA4: Properties added but disabled');
      }
    } else {
      results.push('❌ GA4: No properties configured');
    }
    
    // Проверяем FB Pixel
    const fbPixels = this.pixels.fb || [];
    if (fbPixels.length > 0) {
      const enabledFb = fbPixels.filter(p => p.enabled);
      if (enabledFb.length > 0) {
        results.push(`✅ FB Pixel: ${enabledFb.length} pixel(s) configured`);
      } else {
        results.push('⚠️ FB Pixel: Pixels added but disabled');
      }
    } else {
      results.push('❌ FB Pixel: No pixels configured');
    }
    
    // Проверяем TikTok Pixel
    const ttPixels = this.pixels.tt || [];
    if (ttPixels.length > 0) {
      const enabledTt = ttPixels.filter(p => p.enabled);
      if (enabledTt.length > 0) {
        results.push(`✅ TikTok Pixel: ${enabledTt.length} pixel(s) configured`);
      } else {
        results.push('⚠️ TikTok Pixel: Pixels added but disabled');
      }
    } else {
      results.push('❌ TikTok Pixel: No pixels configured');
    }
    
    this.showStatus(`<strong>Pixel Test Results:</strong><br>${results.join('<br>')}`, 'info');
  }
  
  generateCode() {
    // Сначала сохраняем текущие данные из полей
    this.saveCurrentData();
    
    const gtmPixels = (this.pixels.gtm || []).filter(p => p.enabled);
    const gaPixels = (this.pixels.ga || []).filter(p => p.enabled);
    const fbPixels = (this.pixels.fb || []).filter(p => p.enabled);
    const ttPixels = (this.pixels.tt || []).filter(p => p.enabled);
    
    let code = '<!-- Generated Pixel Code -->\n';
    
    // GTM
    gtmPixels.forEach((pixel, index) => {
      code += `<!-- Google Tag Manager - ${pixel.name} -->\n`;
      code += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n`;
      code += `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n`;
      code += `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n`;
      code += `'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n`;
      code += `})(window,document,'script','dataLayer','${pixel.id}');</script>\n`;
      code += `<!-- End Google Tag Manager - ${pixel.name} -->\n\n`;
    });
    
    // GA4
    gaPixels.forEach((pixel, index) => {
      code += `<!-- Google Analytics 4 - ${pixel.name} -->\n`;
      code += `<script async src="https://www.googletagmanager.com/gtag/js?id=${pixel.id}"></script>\n`;
      code += `<script>\n`;
      code += `window.dataLayer = window.dataLayer || [];\n`;
      code += `function gtag(){dataLayer.push(arguments);}\n`;
      code += `gtag('js', new Date());\n`;
      code += `gtag('config', '${pixel.id}');\n`;
      code += `</script>\n`;
      code += `<!-- End Google Analytics 4 - ${pixel.name} -->\n\n`;
    });
    
    // FB Pixel
    fbPixels.forEach((pixel, index) => {
      code += `<!-- Facebook Pixel - ${pixel.name} -->\n`;
      code += `<script>\n`;
      code += `!function(f,b,e,v,n,t,s)\n`;
      code += `{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n`;
      code += `n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n`;
      code += `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\n`;
      code += `n.queue=[];t=b.createElement(e);t.async=!0;\n`;
      code += `t.src=v;s=b.getElementsByTagName(e)[0];\n`;
      code += `s.parentNode.insertBefore(t,s)}(window, document,'script',\n`;
      code += `'https://connect.facebook.net/en_US/fbevents.js');\n`;
      code += `fbq('init', '${pixel.id}');\n`;
      code += `fbq('track', 'PageView');\n`;
      code += `</script>\n`;
      code += `<!-- End Facebook Pixel - ${pixel.name} -->\n\n`;
    });
    
    // TikTok Pixel
    ttPixels.forEach((pixel, index) => {
      code += `<!-- TikTok Pixel - ${pixel.name} -->\n`;
      code += `<script>\n`;
      code += `!function (w, d, t) {\n`;
      code += `w[t] = w[t] || [];\n`;
      code += `w[t].push({\n`;
      code += `'ttq.load':\n`;
      code += `'${pixel.id}'\n`;
      code += `});\n`;
      code += `var s = d.createElement(t);\n`;
      code += `s.src = 'https://analytics.tiktok.com/i18n/pixel/sdk.js';\n`;
      code += `s.async = true;\n`;
      code += `var e = d.getElementsByTagName(t)[0];\n`;
      code += `e.parentNode.insertBefore(s, e);\n`;
      code += `}(window, document, 'ttq');\n`;
      code += `</script>\n`;
      code += `<!-- End TikTok Pixel - ${pixel.name} -->\n\n`;
    });
    
    // Показываем код в модальном окне
    this.showCodeModal(code);
  }
  
  showCodeModal(code) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Generated Pixel Code</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Copy this code and paste it in the &lt;head&gt; section of your website:</p>
          <pre><code>${code}</code></pre>
        </div>
        <div class="modal-footer">
          <button class="btn primary" onclick="navigator.clipboard.writeText(\`${code}\`)">Copy Code</button>
          <button class="btn secondary modal-close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие модального окна
    modal.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('pixelStatus');
    if (statusEl) {
      statusEl.innerHTML = `<div class="status-message ${type}">${message}</div>`;
      setTimeout(() => {
        statusEl.innerHTML = '';
      }, 5000);
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pixelsContainer')) {
    new PixelManager();
  }
});

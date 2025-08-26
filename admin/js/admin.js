// Admin Panel JavaScript
class AdminPanel {
  constructor() {
    this.config = {};
    this.translations = {};
    this.updates = [];
    this.currentLanguage = 'en';
    this.isAuthenticated = false;
    this.editingItem = null;
    this.editingUpdateIndex = undefined; // Track which update is being edited
    this.currentMediaDirectory = '';
    this.expandedFolders = new Set(); // Track expanded folders in tree view
    
    // Media filter state
    this.currentMediaFilter = 'all';
    this.currentMediaSearch = '';
    
    // Translation save timeout
    this.saveTranslationsTimeout = null;
    
    // Cache frequently used DOM elements
    this._cacheDOMElements();
    
    // Use setTimeout to avoid calling async function in constructor
    setTimeout(() => this.init(), 0);
  }

  _cacheDOMElements() {
    // Cache frequently used DOM elements for better performance
    this._elements = {
      loginScreen: document.getElementById('loginScreen'),
      adminInterface: document.getElementById('adminInterface'),
      modalOverlay: document.getElementById('modalOverlay'),
      modalBody: document.getElementById('modalBody'),
      modalClose: document.getElementById('modalClose')
    };
  }

  // Compact Translation Interface Management
  toggleTranslationField(fieldName) {
    const fieldElement = document.querySelector(`[data-field="${fieldName}"]`);
    if (!fieldElement) return;

    const mainContainer = fieldElement.querySelector('.main-lang-container');
    const content = fieldElement.querySelector('.compact-translation-content');
    
    // Close all other translation fields
    this._closeAllTranslationFields(fieldName);
    
    // Toggle current field
    const isExpanded = content.classList.contains('expanded');
    
    if (isExpanded) {
      this._closeTranslationField(fieldElement);
    } else {
      this._openTranslationField(fieldElement);
    }
  }

  _openTranslationField(fieldElement) {
    const mainContainer = fieldElement.querySelector('.main-lang-container');
    const content = fieldElement.querySelector('.compact-translation-content');
    
    mainContainer.classList.add('expanded');
    content.classList.add('expanded');
  }

  _closeTranslationField(fieldElement) {
    const mainContainer = fieldElement.querySelector('.main-lang-container');
    const content = fieldElement.querySelector('.compact-translation-content');
    
    mainContainer.classList.remove('expanded');
    content.classList.remove('expanded');
  }

  _closeAllTranslationFields(exceptFieldName = null) {
    const allFields = document.querySelectorAll('.compact-translation-field');
    
    allFields.forEach(field => {
      const fieldName = field.getAttribute('data-field');
      if (fieldName !== exceptFieldName) {
        this._closeTranslationField(field);
      }
    });
  }

  // Expand all translation fields
  expandAllTranslations() {
    const allFields = document.querySelectorAll('.compact-translation-field');
    allFields.forEach(field => {
      this._openTranslationField(field);
    });
  }

  // Collapse all translation fields
  collapseAllTranslations() {
    const allFields = document.querySelectorAll('.compact-translation-field');
    allFields.forEach(field => {
      this._closeTranslationField(field);
    });
  }

  // Update translation counter for a field
  updateTranslationCounter(fieldName) {
    const counter = document.getElementById(`${fieldName}-counter`);
    if (!counter) return;

    const enInput = document.getElementById(`${fieldName}_en`);
    const csInput = document.getElementById(`${fieldName}_cs`);
    const ukInput = document.getElementById(`${fieldName}_uk`);

    if (!enInput || !csInput || !ukInput) return;

    const enValue = enInput.value.trim();
    const csValue = csInput.value.trim();
    const ukValue = ukInput.value.trim();

    const filledCount = [enValue, csValue, ukValue].filter(value => value.length > 0).length;
    const totalCount = 3;

    const counterText = counter.querySelector('.counter-text');
    counterText.textContent = `${filledCount}/${totalCount}`;

    // Update counter styling
    counter.classList.remove('filled', 'partial');
    if (filledCount === totalCount) {
      counter.classList.add('filled');
    } else if (filledCount > 0) {
      counter.classList.add('partial');
    }
    
    // Auto-resize textareas after counter update
    setTimeout(() => {
      if (enInput.tagName === 'TEXTAREA') this.autoResizeTextarea(enInput);
      if (csInput.tagName === 'TEXTAREA') this.autoResizeTextarea(csInput);
      if (ukInput.tagName === 'TEXTAREA') this.autoResizeTextarea(ukInput);
    }, 0);
    
    // Update translations object
    this.updateTranslationValue(fieldName, enValue, csValue, ukValue);
  }
  
  // Update translation value in the translations object
  updateTranslationValue(fieldName, enValue, csValue, ukValue) {
    console.log('🔄 Updating translation:', { fieldName, enValue, csValue, ukValue });
    console.log('📊 Current translations object:', this.translations);
    
    // Parse field name to determine the path in translations object
    // Field names are like "nav.about", "cta.tickets", etc.
    const pathParts = fieldName.split('.');
    
    if (pathParts.length >= 2) {
      const section = pathParts[0];
      const key = pathParts.slice(1).join('.');
      
      console.log('🔍 Parsed path:', { section, key });
      
      // Initialize section if it doesn't exist
      if (!this.translations.sections) {
        this.translations.sections = {};
      }
      if (!this.translations.sections.en) {
        this.translations.sections.en = {};
      }
      if (!this.translations.sections.cs) {
        this.translations.sections.cs = {};
      }
      if (!this.translations.sections.uk) {
        this.translations.sections.uk = {};
      }
      if (!this.translations.sections.en[section]) {
        this.translations.sections.en[section] = {};
      }
      if (!this.translations.sections.cs[section]) {
        this.translations.sections.cs[section] = {};
      }
      if (!this.translations.sections.uk[section]) {
        this.translations.sections.uk[section] = {};
      }
      
      // Update the translation values
      this.translations.sections.en[section][key] = enValue;
      this.translations.sections.cs[section][key] = csValue;
      this.translations.sections.uk[section][key] = ukValue;
      
      console.log('✅ Updated translations object:', this.translations);
      
      // Auto-save translations after a short delay
      this.debouncedSaveTranslations();
    } else {
      console.warn('⚠️ Invalid field name format:', fieldName);
    }
  }
  
  // Debounced save translations to avoid too many requests
  debouncedSaveTranslations() {
    if (this.saveTranslationsTimeout) {
      clearTimeout(this.saveTranslationsTimeout);
    }
    this.saveTranslationsTimeout = setTimeout(() => {
      this.saveTranslations().catch(error => {
        console.error('Failed to save translations:', error);
        this.showError('Ошибка сохранения переводов');
      });
    }, 1000); // Save after 1 second of inactivity
  }

  // Initialize translation counters for all fields
  initTranslationCounters() {
    const translationFields = document.querySelectorAll('.compact-translation-field');
    translationFields.forEach(field => {
      const fieldName = field.getAttribute('data-field');
      if (fieldName) {
        this.updateTranslationCounter(fieldName);
      }
    });
  }



  async init() {
    this.bindEvents();
    await this.checkAuth();
    if (this.isAuthenticated) {
      await this.loadData();
      this.setupInterface();
      this.setupLanguageManagement();
      this.initTranslationCounters();
    }
  }

  bindEvents() {
    // Login
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

    // Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Config buttons
    document.getElementById('addSellerBtn')?.addEventListener('click', () => this.addSeller());
    document.getElementById('addTierBtn')?.addEventListener('click', () => this.addTier());
    document.getElementById('addArtistBtn')?.addEventListener('click', () => this.addArtist());
    document.getElementById('addFaqBtn')?.addEventListener('click', () => this.addFaq());
    document.getElementById('addContactBtn')?.addEventListener('click', () => this.addContact());
    document.getElementById('addVenuePhotoBtn')?.addEventListener('click', () => this.addVenuePhoto());

    // Config form fields - auto-save on change
    const configFields = [
      'eventName', 'eventDate', 'eventTime', 'eventTimeEnd', 'eventCity', 'eventCountry', 'eventFlag',
      'heroBackground', 'showCountdown', 'eventAbout',
      'venueName', 'venueAddress', 'venueWebsite', 'venueRoute',
      'ticketsURL'
    ];
    
    configFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => {
          this.updateConfigFromForm();
        });
      }
    });

    // Language selector
    document.getElementById('languageSelect')?.addEventListener('change', (e) => {
      this.currentLanguage = e.target.value;
      this.renderTranslations();
    });

    // Updates
    document.getElementById('addUpdateBtn')?.addEventListener('click', () => this.addUpdate());

    

    // HTML Editor
    document.getElementById('formatHtmlBtn')?.addEventListener('click', () => this.formatHtml());
    document.getElementById('previewHtmlBtn')?.addEventListener('click', () => this.previewHtml());
    document.getElementById('saveHtmlBtn')?.addEventListener('click', () => this.saveHtml());

    // Global actions
    document.getElementById('saveAllBtn')?.addEventListener('click', () => this.saveAll());
    document.getElementById('previewBtn')?.addEventListener('click', () => this.previewSite());

    // Modal
    document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') this.closeModal();
    });

    // Form submissions are handled in setupInterface() to avoid duplication

    // Add event listener for tier individual link checkbox
    document.addEventListener('change', (e) => {
      if (e.target.id === 'tierUseIndividualLink') {
        const individualLinkGroup = document.getElementById('tierIndividualLinkGroup');
        if (individualLinkGroup) {
          individualLinkGroup.style.display = e.target.checked ? 'block' : 'none';
        }
      }
    });
  }

  async checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const response = await fetch('/admin/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        this.isAuthenticated = response.ok;
      } catch (error) {
        this.isAuthenticated = false;
      }
    }
    
    if (this.isAuthenticated) {
      this._elements.loginScreen.style.display = 'none';
      this._elements.adminInterface.style.display = 'block';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const response = await fetch('/admin/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('admin_token', token);
        this.isAuthenticated = true;
        this._elements.loginScreen.style.display = 'none';
        this._elements.adminInterface.style.display = 'block';
        await this.loadData();
        this.setupInterface();
      } else {
        this.showError('Неверные учетные данные');
      }
    } catch (error) {
      this.showError('Ошибка подключения к серверу');
    }
  }

  logout() {
    localStorage.removeItem('admin_token');
    this.isAuthenticated = false;
    this._elements.loginScreen.style.display = 'flex';
    this._elements.adminInterface.style.display = 'none';
  }

  async loadData() {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load config
      const configResponse = await fetch('/admin/api/config', { headers });
      if (configResponse.ok) {
        this.config = await configResponse.json();
        
      }

      // Load translations
      const translationsResponse = await fetch('/admin/api/translations', { headers });
      if (translationsResponse.ok) {
        this.translations = await translationsResponse.json();
        console.log('📊 Translations loaded:', this.translations);
      } else {
        console.warn('⚠️ Translations response not ok:', translationsResponse.status);
        this.translations = {};
      }

      // Load updates
      const updatesResponse = await fetch('/admin/api/updates', { headers });
      if (updatesResponse.ok) {
        const updatesData = await updatesResponse.json();
        console.log('📊 Updates data received:', updatesData);
        console.log('📊 Updates data type:', typeof updatesData);
        console.log('📊 Updates data is array:', Array.isArray(updatesData));
        
        // Handle new structure with languages field and ensure it's always an array
        console.log('📊 Updates data structure:', {
          hasUpdates: !!updatesData.updates,
          updatesIsArray: Array.isArray(updatesData.updates),
          dataIsArray: Array.isArray(updatesData),
          dataKeys: Object.keys(updatesData)
        });
        
        if (updatesData.updates && Array.isArray(updatesData.updates)) {
          console.log('✅ Using updatesData.updates array');
          this.updates = updatesData.updates;
        } else if (Array.isArray(updatesData)) {
          console.log('✅ Using updatesData as array');
          this.updates = updatesData;
        } else {
          console.warn('⚠️ Updates data is not an array, using empty array');
          console.warn('⚠️ Data structure:', updatesData);
          this.updates = [];
        }
        // Store languages if present
        if (updatesData.languages) {
          this.updatesLanguages = updatesData.languages;
        }
      } else {
        console.warn('⚠️ Updates response not ok:', updatesResponse.status);
        this.updates = [];
      }

      // Load HTML
      const htmlResponse = await fetch('/admin/api/html', { headers });
      if (htmlResponse.ok) {
        const { content } = await htmlResponse.json();
        this.htmlContent = content;
      }

    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Ошибка загрузки данных');
    }
  }

      

  setupInterface() {
    this.renderConfig();
    this.renderTranslations();
    this.renderUpdates();
    this.renderUpdateCategories();
    this.renderUpdateBadges();
    this.renderMedia();
    this.renderHtmlEditor();
    
    // Initialize file manager after interface is set up
    if (!window.fileManager) {
      window.fileManager = new FileManager();
    }

    // Initialize updates settings state
    this.initializeUpdatesSettings();

    // Initialize auto-resize for textareas
    this.initializeAutoResize();

    // Bind category management events
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => this.addCategory());
    }

    // Bind badge management events
    const addBadgeBtn = document.getElementById('addBadgeBtn');
    if (addBadgeBtn) {
      addBadgeBtn.addEventListener('click', () => this.addBadge());
    }
  }

  switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  // Config Management
  renderConfig() {
    // Event info - handle new translation structure
    this.renderTranslationField('eventName', this.config.event?.name);
    this.renderTranslationField('eventDate', this.config.event?.date);
    document.getElementById('eventTime').value = this.config.event?.time || '';
    document.getElementById('eventTimeEnd').value = this.config.event?.timeEnd || '';
    this.renderTranslationField('eventCity', this.config.event?.city);
    this.renderTranslationField('eventCountry', this.config.event?.country);
    document.getElementById('eventFlag').value = this.config.event?.flag || '';
    document.getElementById('heroBackground').value = this.config.event?.heroBackground || '';
    document.getElementById('showCountdown').checked = this.config.event?.showCountdown || false;
    this.renderTranslationField('eventAbout', this.config.event?.about);

    // Venue info
    this.renderTranslationField('venueName', this.config.event?.venue?.name);
    this.renderTranslationField('venueAddress', this.config.event?.venue?.address);
    document.getElementById('venueWebsite').value = this.config.event?.venue?.website || '';
    document.getElementById('venueRoute').value = this.config.event?.venue?.route || '';

    // Tickets
    document.getElementById('ticketsURL').value = this.config.ticketsURL || '';

    // Render dynamic lists
    this.renderSellers();
    this.renderTiers();
    this.renderArtists();
    this.renderFaqs();
    this.renderContacts();
    this.renderVenuePhotos();
  }

  renderTranslationField(fieldName, fieldData) {
    if (!fieldData) return;

    if (typeof fieldData === 'object') {
      // New translation structure
      document.getElementById(`${fieldName}_en`).value = fieldData.en || '';
      document.getElementById(`${fieldName}_cs`).value = fieldData.cs || '';
      document.getElementById(`${fieldName}_uk`).value = fieldData.uk || '';
    } else {
      // Old string structure - populate only English
      document.getElementById(`${fieldName}_en`).value = fieldData || '';
      document.getElementById(`${fieldName}_cs`).value = '';
      document.getElementById(`${fieldName}_uk`).value = '';
    }
    
    // Auto-resize textareas after setting values
    setTimeout(() => {
      const enElement = document.getElementById(`${fieldName}_en`);
      const csElement = document.getElementById(`${fieldName}_cs`);
      const ukElement = document.getElementById(`${fieldName}_uk`);
      
      if (enElement && enElement.tagName === 'TEXTAREA') this.autoResizeTextarea(enElement);
      if (csElement && csElement.tagName === 'TEXTAREA') this.autoResizeTextarea(csElement);
      if (ukElement && ukElement.tagName === 'TEXTAREA') this.autoResizeTextarea(ukElement);
    }, 50);
  }

  renderSellers() {
    this._renderDynamicList('sellersContainer', 'seller', this.config.authorizedSellers || []);
  }

  renderTiers() {
    this._renderDynamicList('tiersContainer', 'tier', this.config.tiers || []);
  }

  renderArtists() {
    this._renderDynamicList('artistsContainer', 'artist', this.config.artists || []);
  }

  renderFaqs() {
    this._renderDynamicList('faqsContainer', 'faq', this.config.faqs || []);
  }

  renderContacts() {
    this._renderDynamicList('contactsContainer', 'contact', this.config.contacts || []);
  }

  renderVenuePhotos() {
    const container = document.getElementById('venuePhotosContainer');
    container.innerHTML = '';

    (this.config.event?.venue?.photos || []).forEach((photo, index) => {
      const item = this.createVenuePhotoItem(photo, index);
      container.appendChild(item);
    });
  }

  createVenuePhotoItem(photo, index) {
    const item = document.createElement('div');
    item.className = 'venue-photo-item';
    item.dataset.index = index;
    
    item.innerHTML = `
      <div class="venue-photo-header">
        <div class="venue-photo-path">${photo}</div>
        <div class="venue-photo-actions">
          <button class="btn btn-small btn-secondary" onclick="admin.editVenuePhoto(${index})">Редактировать</button>
          <button class="btn btn-small btn-danger" onclick="admin.deleteVenuePhoto(${index})">Удалить</button>
        </div>
      </div>
    `;

    return item;
  }

  createDynamicItem(type, data, index) {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.dataset.index = index;

    const title = this.getDynamicItemTitle(type, data);
    
    item.innerHTML = `
      <div class="dynamic-item-header">
        <div class="dynamic-item-title">${title}</div>
        <div class="dynamic-item-actions">
          <button class="btn btn-small btn-secondary" onclick="admin.editDynamicItem('${type}', ${index})">Редактировать</button>
          <button class="btn btn-small btn-danger" onclick="admin.deleteDynamicItem('${type}', ${index})">Удалить</button>
        </div>
      </div>
      <div class="dynamic-item-preview">
        ${this.getDynamicItemPreview(type, data)}
      </div>
    `;

    return item;
  }

  getDynamicItemTitle(type, data) {
    switch (type) {
      case 'seller': return this.getTranslationDisplay(data.name, 'Продавец билетов');
      case 'tier': return this.getTranslationDisplay(data.name, 'Категория билетов');
      case 'artist': return this.getTranslationDisplay(data.name, 'Артист');
      case 'faq': return this.getTranslationDisplay(data.q, 'Вопрос');
      case 'contact': return this.getTranslationDisplay(data.type, 'Контакт');
      default: return 'Элемент';
    }
  }

  getDynamicItemPreview(type, data) {
    switch (type) {
      case 'seller':
        return `<div>URL: ${data.url || 'Не указан'}</div>`;
      case 'tier':
        return `<div>Описание: ${this.getTranslationDisplay(data.desc, 'Не указано')}</div><div>Цена: ${data.price || 'Не указана'}</div>`;
      case 'artist':
        return `<div>Биография: ${this.getTranslationDisplay(data.bio, 'Не указана')}</div>`;
      case 'faq':
        return `<div>Ответ: ${this.getTranslationDisplay(data.a, 'Не указан')}</div>`;
      case 'contact':
        return `<div>URL: ${data.url || 'Не указан'}</div>`;
      default:
        return '';
    }
  }

  addSeller() {
    this.editingItem = null; // Ensure we're in add mode
    this.showModal('Добавить продавца билетов', this.getSellerForm());
  }

  addTier() {
    this.editingItem = null; // Ensure we're in add mode
    this.showModal('Добавить категорию билетов', this.getTierForm());
  }

  addArtist() {
    this.editingItem = null; // Ensure we're in add mode
    this.showModal('Добавить артиста', this.getArtistForm());
  }

  addFaq() {
    this.editingItem = null; // Ensure we're in add mode
    this.showModal('Добавить вопрос', this.getFaqForm());
  }

  addContact() {
    this.editingItem = null; // Ensure we're in add mode
    this.showModal('Добавить контакт', this.getContactForm());
  }

  addVenuePhoto() {
    this.showModal('Добавить фото площадки', this.getVenuePhotoForm());
  }

  editVenuePhoto(index) {
    const photo = this.config.event?.venue?.photos?.[index];
    this.editingItem = { type: 'venuePhoto', index };
    this.showModal('Редактировать фото площадки', this.getVenuePhotoForm(photo));
  }

  deleteVenuePhoto(index) {
    if (confirm('Удалить это фото площадки?')) {
      this.config.event.venue.photos.splice(index, 1);
      this.renderVenuePhotos();
      this.saveConfig();
    }
  }

  async updateVenuePhoto(data) {
    const { index } = this.editingItem;
    
    // Ensure venue photos array exists
    if (!this.config.event.venue.photos) {
      this.config.event.venue.photos = [];
    }
    
    // Update the photo path
    this.config.event.venue.photos[index] = data.path;
    
    // Clear editing context
    this.editingItem = null;
    
    // Re-render and save
    this.renderVenuePhotos();
    try {
      await this.saveConfig();
      this.showSuccess('Фото площадки обновлено и сохранено');
    } catch (error) {
      this.showError('Фото площадки обновлено, но не сохранено');
    }
  }

  async addVenuePhotoPath(data) {
    // Ensure venue photos array exists
    if (!this.config.event.venue.photos) {
      this.config.event.venue.photos = [];
    }
    
    // Check if we can add more photos (max 4)
    if (this.config.event.venue.photos.length >= 4) {
      this.showError('Максимум 4 фото для площадки');
      return;
    }
    
    // Add the new photo path
    this.config.event.venue.photos.push(data.path);
    
    // Re-render and save
    this.renderVenuePhotos();
    try {
      await this.saveConfig();
      this.showSuccess('Фото площадки добавлено и сохранено');
    } catch (error) {
      this.showError('Фото площадки добавлено, но не сохранено');
    }
  }

  getSellerForm(seller = null) {
    return `
      <form id="dynamicForm">
        <div class="form-group">
          <label for="sellerName">Название</label>
          <input type="text" id="sellerName" name="name" value="${seller?.name || ''}" required>
        </div>
        <div class="form-group">
          <label for="sellerUrl">URL</label>
          <input type="url" id="sellerUrl" name="url" value="${seller?.url || ''}" required>
        </div>
        <div class="form-group file-input-group">
          <label for="sellerLogo">Логотип (путь к файлу)</label>
          <input type="text" id="sellerLogo" name="logo" value="${seller?.logo || ''}">
          <div class="file-input-actions">
            <button type="button" class="btn btn-secondary" onclick="fileManager.show(document.getElementById('sellerLogo'), (path) => { document.getElementById('sellerLogo').value = path; })">Выбрать</button>
          </div>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="sellerShowInTicketsMenu" name="showInTicketsMenu" ${seller?.showInTicketsMenu !== false ? 'checked' : ''}>
            Включить в меню Buy Tickets
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="sellerShowInTicketsSection" name="showInTicketsSection" ${seller?.showInTicketsSection !== false ? 'checked' : ''}>
            Показывать в разделе Tickets
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${seller ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  getTierForm(tier = null) {
    return `
      <form id="dynamicForm">
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Название</label>
            <div class="translation-counter" id="tierName-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="tierName">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('tierName')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="tierName_en" name="name_en" data-lang="en" class="lang-input main-lang" placeholder="Название на английском" value="${this.getTranslationValue(tier?.name, 'en')}" required oninput="admin.updateTranslationCounter('tierName')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="tierName_cs" name="name_cs" data-lang="cs" class="lang-input" placeholder="Название на чешском" value="${this.getTranslationValue(tier?.name, 'cs')}" oninput="admin.updateTranslationCounter('tierName')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="tierName_uk" name="name_uk" data-lang="uk" class="lang-input" placeholder="Название на украинском" value="${this.getTranslationValue(tier?.name, 'uk')}" oninput="admin.updateTranslationCounter('tierName')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('tierName')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('tierName')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Описание</label>
            <div class="translation-counter" id="tierDesc-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="tierDesc">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('tierDesc')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="tierDesc_en" name="desc_en" data-lang="en" class="lang-input main-lang" placeholder="Описание на английском" value="${this.getTranslationValue(tier?.desc, 'en')}" required oninput="admin.updateTranslationCounter('tierDesc')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="tierDesc_cs" name="desc_cs" data-lang="cs" class="lang-input" placeholder="Описание на чешском" value="${this.getTranslationValue(tier?.desc, 'cs')}" oninput="admin.updateTranslationCounter('tierDesc')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="tierDesc_uk" name="desc_uk" data-lang="uk" class="lang-input" placeholder="Описание на украинском" value="${this.getTranslationValue(tier?.desc, 'uk')}" oninput="admin.updateTranslationCounter('tierDesc')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('tierDesc')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('tierDesc')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="tierPrice">Цена</label>
          <input type="text" id="tierPrice" name="price" value="${tier?.price || ''}" required>
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Примечание</label>
            <div class="translation-counter" id="tierNote-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="tierNote">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('tierNote')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="tierNote_en" name="note_en" data-lang="en" class="lang-input main-lang" placeholder="Примечание на английском" value="${this.getTranslationValue(tier?.note, 'en')}" oninput="admin.updateTranslationCounter('tierNote')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="tierNote_cs" name="note_cs" data-lang="cs" class="lang-input" placeholder="Примечание на чешском" value="${this.getTranslationValue(tier?.note, 'cs')}" oninput="admin.updateTranslationCounter('tierNote')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="tierNote_uk" name="note_uk" data-lang="uk" class="lang-input" placeholder="Примечание на украинском" value="${this.getTranslationValue(tier?.note, 'uk')}" oninput="admin.updateTranslationCounter('tierNote')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('tierNote')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('tierNote')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="tierUseIndividualLink" name="useIndividualLink" ${tier?.useIndividualLink ? 'checked' : ''}>
            Использовать индивидуальную ссылку
          </label>
        </div>
        <div class="form-group" id="tierIndividualLinkGroup" style="display: ${tier?.useIndividualLink ? 'block' : 'none'}">
          <label for="tierIndividualLink">Индивидуальная ссылка</label>
          <input type="url" id="tierIndividualLink" name="individualLink" value="${tier?.individualLink || ''}" placeholder="https://example.com">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${tier ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  getArtistForm(artist = null) {
    const links = artist?.links || [];
    const linksHtml = links.map((link, index) => `
      <div class="link-item" data-index="${index}">
        <div class="form-row">
          <div class="form-group">
            <label>Тип ссылки</label>
            <select name="linkType_${index}" required>
              <option value="">Выберите тип...</option>
              <option value="Website" ${link.t === 'Website' ? 'selected' : ''}>Website</option>
              <option value="Facebook" ${link.t === 'Facebook' ? 'selected' : ''}>Facebook</option>
              <option value="Instagram" ${link.t === 'Instagram' ? 'selected' : ''}>Instagram</option>
              <option value="TikTok" ${link.t === 'TikTok' ? 'selected' : ''}>TikTok</option>
              <option value="YouTube" ${link.t === 'YouTube' ? 'selected' : ''}>YouTube</option>
            </select>
          </div>
          <div class="form-group">
            <label>URL</label>
            <input type="url" name="linkUrl_${index}" value="${link.u || ''}" placeholder="https://example.com" required>
          </div>
          <button type="button" class="btn btn-danger btn-small" onclick="admin.removeLink(${index})">Удалить</button>
        </div>
      </div>
    `).join('');
    
    return `
      <form id="dynamicForm">
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Имя</label>
            <div class="translation-counter" id="artistName-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="artistName">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('artistName')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="artistName_en" name="name_en" data-lang="en" class="lang-input main-lang" placeholder="Имя на английском" value="${this.getTranslationValue(artist?.name, 'en')}" required oninput="admin.updateTranslationCounter('artistName')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="artistName_cs" name="name_cs" data-lang="cs" class="lang-input" placeholder="Имя на чешском" value="${this.getTranslationValue(artist?.name, 'cs')}" oninput="admin.updateTranslationCounter('artistName')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="artistName_uk" name="name_uk" data-lang="uk" class="lang-input" placeholder="Имя на украинском" value="${this.getTranslationValue(artist?.name, 'uk')}" oninput="admin.updateTranslationCounter('artistName')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguage('artistName')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguages('artistName')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group file-input-group">
          <label for="artistImg">Изображение (путь к файлу)</label>
          <input type="text" id="artistImg" name="img" value="${artist?.img || ''}">
          <div class="file-input-actions">
            <button type="button" class="btn btn-secondary" onclick="fileManager.show(document.getElementById('artistImg'), (path) => { document.getElementById('artistImg').value = path; })">Выбрать</button>
          </div>
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Биография</label>
            <div class="translation-counter" id="artistBio-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="artistBio">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('artistBio')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <textarea id="artistBio_en" name="bio_en" data-lang="en" class="lang-input main-lang" rows="4" placeholder="Биография на английском..." oninput="admin.updateTranslationCounter('artistBio')">${this.getTranslationValue(artist?.bio, 'en')}</textarea>
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <textarea id="artistBio_cs" name="bio_cs" data-lang="cs" class="lang-input" rows="4" placeholder="Биография на чешском..." oninput="admin.updateTranslationCounter('artistBio')">${this.getTranslationValue(artist?.bio, 'cs')}</textarea>
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <textarea id="artistBio_uk" name="bio_uk" data-lang="uk" class="lang-input" rows="4" placeholder="Биография на украинском..." oninput="admin.updateTranslationCounter('artistBio')">${this.getTranslationValue(artist?.bio, 'uk')}</textarea>
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguage('artistBio')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguages('artistBio')">Очистить все</button>
              </div>
            </div>
          </div>
          <div class="bio-help">Используйте <code>&lt;br&gt;</code> для переноса строки или <code>&lt;p&gt;</code> для абзацев</div>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="artistHeadliner" name="headliner" ${artist?.headliner ? 'checked' : ''}>
            Хедлайнер (особый стиль карточки)
          </label>
        </div>
        <div class="form-group">
          <label>Ссылки</label>
          <div id="linksContainer">
            ${linksHtml}
          </div>
          <button type="button" class="btn btn-secondary btn-small" onclick="admin.addLink()">Добавить ссылку</button>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${artist ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  getFaqForm(faq = null) {
    return `
      <form id="dynamicForm">
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Вопрос</label>
            <div class="translation-counter" id="faqQuestion-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="faqQuestion">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('faqQuestion')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="faqQuestion_en" name="q_en" data-lang="en" class="lang-input main-lang" placeholder="Вопрос на английском" value="${this.getTranslationValue(faq?.q, 'en')}" required oninput="admin.updateTranslationCounter('faqQuestion')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="faqQuestion_cs" name="q_cs" data-lang="cs" class="lang-input" placeholder="Вопрос на чешском" value="${this.getTranslationValue(faq?.q, 'cs')}" oninput="admin.updateTranslationCounter('faqQuestion')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="faqQuestion_uk" name="q_uk" data-lang="uk" class="lang-input" placeholder="Вопрос на украинском" value="${this.getTranslationValue(faq?.q, 'uk')}" oninput="admin.updateTranslationCounter('faqQuestion')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('faqQuestion')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('faqQuestion')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Ответ</label>
            <div class="translation-counter" id="faqAnswer-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="faqAnswer">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('faqAnswer')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <textarea id="faqAnswer_en" name="a_en" data-lang="en" class="lang-input main-lang" rows="3" placeholder="Ответ на английском..." required oninput="admin.updateTranslationCounter('faqAnswer')">${this.getTranslationValue(faq?.a, 'en')}</textarea>
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <textarea id="faqAnswer_cs" name="a_cs" data-lang="cs" class="lang-input" rows="3" placeholder="Ответ на чешском..." oninput="admin.updateTranslationCounter('faqAnswer')">${this.getTranslationValue(faq?.a, 'cs')}</textarea>
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <textarea id="faqAnswer_uk" name="a_uk" data-lang="uk" class="lang-input" rows="3" placeholder="Ответ на украинском..." oninput="admin.updateTranslationCounter('faqAnswer')">${this.getTranslationValue(faq?.a, 'uk')}</textarea>
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('faqAnswer')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('faqAnswer')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${faq ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  getContactForm(contact = null) {
    return `
      <form id="dynamicForm">
        <div class="form-group">
          <label for="contactType">Тип контакта</label>
          <input type="text" id="contactType" name="type" value="${contact?.type || ''}" placeholder="Facebook, Instagram, Email, Phone..." required>
        </div>
        <div class="form-group">
          <label for="contactUrl">URL</label>
          <input type="url" id="contactUrl" name="url" value="${contact?.url || ''}" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${contact ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  getVenuePhotoForm(photo = null) {
    return `
      <form id="dynamicForm">
        <div class="form-group file-input-group">
          <label for="venuePhotoPath">Путь к файлу</label>
          <input type="text" id="venuePhotoPath" name="path" value="${photo || ''}" required>
          <div class="file-input-actions">
            <button type="button" class="btn btn-secondary" onclick="fileManager.show(document.getElementById('venuePhotoPath'), (path) => { document.getElementById('venuePhotoPath').value = path; })">Выбрать</button>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${photo ? 'Сохранить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  // Translations Management
  renderTranslations() {
    const container = document.getElementById('translationsEditor');
    container.innerHTML = '';

    // Get the current language data from translations.json
    const currentLang = this.currentLanguage || 'en';
    const languageData = this.translations?.sections?.[currentLang] || {};
    
    if (Object.keys(languageData).length === 0) {
      container.innerHTML = `
        <div class="no-translations">
          <div class="no-translations-icon">🌐</div>
          <h3>Нет переводов для языка: ${currentLang}</h3>
          <p>Переводы будут загружены автоматически при добавлении нового языка в систему.</p>
        </div>
      `;
      return;
    }
    
    Object.entries(languageData).forEach(([key, value]) => {
      const group = this.createTranslationGroup(key, value);
      container.appendChild(group);
    });
  }

  createTranslationGroup(key, value) {
    const group = document.createElement('div');
    group.className = 'translation-group';
    
    const icon = this.getTranslationGroupIcon(key);
    
    group.innerHTML = `
      <h4>
        <span class="group-icon">${icon}</span>
        ${this.formatTranslationKey(key)}
      </h4>
      ${this.createTranslationFields(key, value)}
    `;

    return group;
  }

  createTranslationFields(key, value, prefix = '') {
    if (typeof value === 'string') {
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      return `
        <div class="translation-field">
          <label for="${fieldKey}">${this.formatTranslationKey(key)}</label>
          <input type="text" id="${fieldKey}" value="${value}" data-key="${fieldKey}">
        </div>
      `;
    } else if (Array.isArray(value)) {
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      return `
        <div class="translation-field">
          <label for="${fieldKey}">${this.formatTranslationKey(key)} (массив)</label>
          <textarea id="${fieldKey}" rows="3" data-key="${fieldKey}">${value.join('\n')}</textarea>
        </div>
      `;
    } else if (typeof value === 'object' && value !== null) {
      // Check if this is a translation object (has language keys)
      if (value.en !== undefined || value.cs !== undefined || value.uk !== undefined) {
        // This is a translation object, create multi-language fields
        const fieldKey = prefix ? `${prefix}.${key}` : key;
        return `
          <div class="translation-field">
            <div class="field-label-with-counter">
              <label>${this.formatTranslationKey(key)}</label>
              <div class="translation-counter" id="${fieldKey}-counter">
                <span class="counter-icon">🌐</span>
                <span class="counter-text">0/3</span>
              </div>
            </div>
            <div class="compact-translation-field" data-field="${fieldKey}">
              <!-- Основной язык всегда видим -->
              <div class="main-lang-container" onclick="admin.toggleTranslationField('${fieldKey}')">
                <div class="lang-input-group">
                  <span class="lang-flag">🇬🇧</span>
                  <span class="lang-label-fallback">EN:</span>
                  <input type="text" id="${fieldKey}_en" value="${value.en || ''}" data-key="${fieldKey}_en" class="lang-input main-lang" oninput="admin.updateTranslationCounter('${fieldKey}')">
                </div>
              </div>
              <!-- Дополнительные языки (скрыты по умолчанию) -->
              <div class="compact-translation-content">
                <div class="lang-input-group">
                  <span class="lang-flag">🇨🇿</span>
                  <span class="lang-label-fallback">CS:</span>
                  <input type="text" id="${fieldKey}_cs" value="${value.cs || ''}" data-key="${fieldKey}_cs" class="lang-input" oninput="admin.updateTranslationCounter('${fieldKey}')">
                </div>
                <div class="lang-input-group">
                  <span class="lang-flag">🇺🇦</span>
                  <span class="lang-label-fallback">UK:</span>
                  <input type="text" id="${fieldKey}_uk" value="${value.uk || ''}" data-key="${fieldKey}_uk" class="lang-input" oninput="admin.updateTranslationCounter('${fieldKey}')">
                </div>
                <div class="field-actions">
                  <button type="button" class="copy-main" onclick="admin.copyMainLanguage('${fieldKey}')">Копировать EN</button>
                  <button type="button" class="clear-all" onclick="admin.clearAllLanguages('${fieldKey}')">Очистить все</button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // This is a nested object, recurse
        let fields = '';
        Object.entries(value).forEach(([subKey, subValue]) => {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          fields += this.createTranslationFields(subKey, subValue, newPrefix);
        });
        return fields;
      }
    }
    return '';
  }

  formatTranslationKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  getTranslationGroupIcon(key) {
    const icons = {
      nav: '🧭',
      cta: '🎯',
      hero: '⭐',
      about: 'ℹ️',
      artists: '🎵',
      tickets: '🎫',
      location: '📍',
      faq: '❓',
      connect: '📞',
      footer: '📄'
    };
    return icons[key] || '📝';
  }

  // Updates Management
  renderUpdates() {
    const container = document.getElementById('updatesList');
    
    if (!container) {
      console.error('Updates container not found!');
      return;
    }
    
    container.innerHTML = '';

    // Ensure this.updates is always an array
    if (!Array.isArray(this.updates)) {
      console.warn('this.updates is not an array, resetting to empty array');
      this.updates = [];
    }

    if (this.updates.length === 0) {
      container.innerHTML = '<div class="no-updates">Нет обновлений для отображения</div>';
      return;
    }
    
    this.updates.forEach((update, index) => {
      const item = this.createUpdateItem(update, index);
      container.appendChild(item);
    });
  }

  renderUpdateCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const categories = this.config.updateCategories || {};
    
    if (Object.keys(categories).length === 0) {
      container.innerHTML = `
        <div class="no-categories">
          <h3>Нет типов апдейтов</h3>
          <p>Добавьте первый тип, чтобы начать.</p>
        </div>
      `;
      return;
    }
    
    Object.entries(categories).forEach(([key, translations]) => {
      const item = this.createCategoryItem(key, translations);
      container.appendChild(item);
    });
  }

  renderUpdateBadges() {
    const container = document.getElementById('badgesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const badges = this.config.updateBadges || {};
    
    if (Object.keys(badges).length === 0) {
      container.innerHTML = `
        <div class="no-badges">
          <h3>Нет бейджей</h3>
          <p>Добавьте первый бейдж, чтобы начать.</p>
        </div>
      `;
      return;
    }
    
    Object.entries(badges).forEach(([key, translations]) => {
      const item = this.createBadgeItem(key, translations);
      container.appendChild(item);
    });
  }

  createCategoryItem(key, translations) {
    const item = document.createElement('div');
    item.className = 'category-item';
    
    item.innerHTML = this._createTranslationItemHTML('category', key, translations, {
      saveAction: `admin.saveCategory('${key}')`,
      deleteAction: `admin.deleteCategory('${key}')`
    });
    
    return item;
  }

  createBadgeItem(key, translations) {
    const item = document.createElement('div');
    item.className = 'badge-item';
    
    item.innerHTML = `
      <div class="badge-item-header">
        <div class="badge-item-info">
          <div class="badge-item-key">${key}</div>
          <div class="field-label-with-counter">
            <label>Название</label>
            <div class="translation-counter" id="badge_${key}-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="badge_${key}">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('badge_${key}')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="badge_${key}_en" value="${translations.en || ''}" class="lang-input main-lang" placeholder="Название на английском" oninput="admin.updateTranslationCounter('badge_${key}')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="badge_${key}_cs" value="${translations.cs || ''}" class="lang-input" placeholder="Название на чешском" oninput="admin.updateTranslationCounter('badge_${key}')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="badge_${key}_uk" value="${translations.uk || ''}" class="lang-input" placeholder="Название на украинском" oninput="admin.updateTranslationCounter('badge_${key}')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguage('badge_${key}')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguages('badge_${key}')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="badge-item-actions">
          <button class="btn btn-secondary btn-small" onclick="admin.saveBadge('${key}')">💾 Сохранить</button>
          <button class="btn btn-danger btn-small" onclick="admin.deleteBadge('${key}')">🗑️ Удалить</button>
        </div>
      </div>
    `;
    
    return item;
  }

  _createTranslationItemHTML(type, key, translations, actions) {
    return `
      <div class="${type}-item-header">
        <div class="${type}-item-info">
          <div class="${type}-item-key">${key}</div>
          <div class="field-label-with-counter">
            <label>Название</label>
            <div class="translation-counter" id="${type}_${key}-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="${type}_${key}">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('${type}_${key}')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="${type}_${key}_en" value="${translations.en || ''}" class="lang-input main-lang" placeholder="Название на английском" oninput="admin.updateTranslationCounter('${type}_${key}')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="${type}_${key}_cs" value="${translations.cs || ''}" class="lang-input" placeholder="Название на чешском" oninput="admin.updateTranslationCounter('${type}_${key}')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="${type}_${key}_uk" value="${translations.uk || ''}" class="lang-input" placeholder="Название на украинском" oninput="admin.updateTranslationCounter('${type}_${key}')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguage('${type}_${key}')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguages('${type}_${key}')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="${type}-item-actions">
          <button class="btn btn-secondary btn-small" onclick="${actions.saveAction}">💾 Сохранить</button>
          <button class="btn btn-danger btn-small" onclick="${actions.deleteAction}">🗑️ Удалить</button>
        </div>
      </div>
    `;
  }

  createUpdateItem(update, index) {
    const item = document.createElement('div');
    item.className = 'update-item';

    const date = new Date(update.ts).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Get category label from config with translations
    const categoryConfig = this.config.updateCategories?.[update.type];
    const typeLabel = categoryConfig ? 
      `${this.getCategoryIcon(update.type)} ${this.getTranslationDisplay(categoryConfig, update.type)}` : 
      update.type;
    
    // Handle new translation structure
    const title = this.getTranslationDisplay(update.title, 'Без заголовка');
    const body = this.getTranslationDisplay(update.body, 'Без содержания');

    item.innerHTML = `
      <div class="update-item-header">
        <div class="update-item-info">
          <div class="update-item-title">${title}</div>
          <div class="update-item-meta">
            <span class="update-item-type">${typeLabel}</span>
            <span class="update-item-date">${date}</span>
            ${update.important ? '<span class="update-item-badge important">Важное</span>' : ''}
            ${update.pinned ? '<span class="update-item-badge pinned">Закреплено</span>' : ''}
          </div>
        </div>
        <div class="update-item-actions">
          <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); admin.editUpdate(${index})">✏️ Редактировать</button>
          <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); admin.deleteUpdate(${index})">🗑️ Удалить</button>
        </div>
      </div>
      <div class="update-item-body">
        ${body}
      </div>
      ${(update.thumb || update.media) ? `
        <div class="update-item-media">
          ${update.thumb ? `<div class="update-thumb">📷 Миниатюра: ${update.thumb}</div>` : ''}
          ${update.media ? `<div class="update-media">🎬 Медиа: ${update.media}</div>` : ''}
        </div>
      ` : ''}
    `;

    return item;
  }

  addUpdate() {
    
    // Reset editing index when adding new update
    this.editingUpdateIndex = undefined;
    this.showModal('Добавить обновление', this.getUpdateForm());
  }

  getUpdateForm(update = null) {
    // Format date for input field
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
    };
    
    return `
      <form id="updateForm">
        <div class="form-group">
          <label for="updateId">ID</label>
          <input type="text" id="updateId" name="id" value="${update?.id || ''}" required>
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Заголовок</label>
            <div class="translation-counter" id="updateTitle-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="updateTitle">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('updateTitle')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <input type="text" id="updateTitle_en" name="title_en" data-lang="en" class="lang-input main-lang" placeholder="Заголовок на английском" value="${this.getTranslationValue(update?.title, 'en')}" required oninput="admin.updateTranslationCounter('updateTitle')">
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <input type="text" id="updateTitle_cs" name="title_cs" data-lang="cs" class="lang-input" placeholder="Заголовок на чешском" value="${this.getTranslationValue(update?.title, 'cs')}" oninput="admin.updateTranslationCounter('updateTitle')">
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <input type="text" id="updateTitle_uk" name="title_uk" data-lang="uk" class="lang-input" placeholder="Заголовок на украинском" value="${this.getTranslationValue(update?.title, 'uk')}" oninput="admin.updateTranslationCounter('updateTitle')">
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('updateTitle')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('updateTitle')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="updateType">Тип</label>
          <select id="updateType" name="type" required>
            <option value="tickets" ${update?.type === 'tickets' ? 'selected' : ''}>${this.getTranslationDisplay(this.config.updateCategories?.tickets, 'Билеты')}</option>
            <option value="lineup" ${update?.type === 'lineup' ? 'selected' : ''}>${this.getTranslationDisplay(this.config.updateCategories?.lineup, 'Состав')}</option>
            <option value="logistics" ${update?.type === 'logistics' ? 'selected' : ''}>${this.getTranslationDisplay(this.config.updateCategories?.logistics, 'Логистика')}</option>
            <option value="announcement" ${update?.type === 'announcement' ? 'selected' : ''}>${this.getTranslationDisplay(this.config.updateCategories?.announcement, 'Новости')}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="updateCustomDate">Дата (оставьте пустым для текущей даты)</label>
          <input type="datetime-local" id="updateCustomDate" name="customDate" value="${formatDateForInput(update?.ts)}">
        </div>
        <div class="form-group">
          <div class="field-label-with-counter">
            <label>Содержание (каждая строка - отдельный абзац)</label>
            <div class="translation-counter" id="updateBody-counter">
              <span class="counter-icon">🌐</span>
              <span class="counter-text">0/3</span>
            </div>
          </div>
          <div class="compact-translation-field" data-field="updateBody">
            <!-- Основной язык всегда видим -->
            <div class="main-lang-container" onclick="admin.toggleTranslationField('updateBody')">
              <div class="lang-input-group">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-label-fallback">EN:</span>
                <textarea id="updateBody_en" name="body_en" data-lang="en" class="lang-input main-lang" rows="4" placeholder="Содержание на английском..." required oninput="admin.updateTranslationCounter('updateBody')">${this.getTranslationValue(update?.body, 'en')}</textarea>
              </div>
            </div>
            <!-- Дополнительные языки (скрыты по умолчанию) -->
            <div class="compact-translation-content">
              <div class="lang-input-group">
                <span class="lang-flag">🇨🇿</span>
                <span class="lang-label-fallback">CS:</span>
                <textarea id="updateBody_cs" name="body_cs" data-lang="cs" class="lang-input" rows="4" placeholder="Содержание на чешском..." oninput="admin.updateTranslationCounter('updateBody')">${this.getTranslationValue(update?.body, 'cs')}</textarea>
              </div>
              <div class="lang-input-group">
                <span class="lang-flag">🇺🇦</span>
                <span class="lang-label-fallback">UK:</span>
                <textarea id="updateBody_uk" name="body_uk" data-lang="uk" class="lang-input" rows="4" placeholder="Содержание на украинском..." oninput="admin.updateTranslationCounter('updateBody')">${this.getTranslationValue(update?.body, 'uk')}</textarea>
              </div>
              <div class="field-actions">
                <button type="button" class="copy-main" onclick="admin.copyMainLanguageDynamic('updateBody')">Копировать EN</button>
                <button type="button" class="clear-all" onclick="admin.clearAllLanguagesDynamic('updateBody')">Очистить все</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group file-input-group">
          <label for="updateThumb">Миниатюра (путь к файлу)</label>
          <div class="input-row">
            <input type="text" id="updateThumb" name="thumb" value="${update?.thumb || ''}">
            <div class="file-input-actions">
              <button type="button" class="btn btn-secondary" onclick="fileManager.show(document.getElementById('updateThumb'), (path) => { document.getElementById('updateThumb').value = path; })">Выбрать</button>
            </div>
          </div>
        </div>
        <div class="form-group file-input-group">
          <label for="updateMedia">Медиа (путь к файлу)</label>
          <div class="input-row">
            <input type="text" id="updateMedia" name="media" value="${update?.media || ''}">
            <div class="file-input-actions">
              <button type="button" class="btn btn-secondary" onclick="admin.selectUpdateMedia()">Выбрать</button>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="updateImportant" name="important" ${update?.important ? 'checked' : ''}>
            Важное
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="updatePinned" name="pinned" ${update?.pinned ? 'checked' : ''}>
            Закрепленное
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${update ? 'Обновить' : 'Добавить'}</button>
          <button type="button" class="btn btn-secondary" onclick="admin.closeModal()">Отмена</button>
        </div>
      </form>
    `;
  }

  editUpdate(index) {
    
    const update = this.updates[index];
    if (!update) {
      this.showError('Обновление не найдено');
      return;
    }
    
    
    // Store the index for editing
    this.editingUpdateIndex = index;
    this.showModal('Редактировать обновление', this.getUpdateForm(update));
  }

  async deleteUpdate(index) {
    if (confirm('Вы уверены, что хотите удалить это обновление?')) {
      this.updates.splice(index, 1);
      this.renderUpdates();
      
      // Auto-save updates
      try {
        await this.saveUpdates();
        this.showSuccess('Обновление удалено');
      } catch (error) {
        this.showError('Ошибка удаления обновления');
      }
    }
  }



    

  async uploadFiles(files) {
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressBar.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = ((i + 1) / files.length) * 100;
      
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;

      try {
        await this.uploadFile(file);
      } catch (error) {
        this.showError(`Ошибка загрузки файла ${file.name}`);
      }
    }

    setTimeout(() => {
      progressBar.style.display = 'none';
      this.renderMedia();
    }, 1000);
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/admin/api/media/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  }

  async renderMedia() {
    try {
      // Initialize the integrated media manager
      this.initMediaManager();
    } catch (error) {
      console.error('Error rendering media section:', error);
      this.showError('Ошибка отображения раздела медиафайлов');
    }
  }

  initMediaManager() {
    // Bind events
    document.getElementById('createFolderBtn')?.addEventListener('click', () => this.createMediaFolder());
    document.getElementById('uploadFileBtn')?.addEventListener('click', () => this.uploadMediaFile());
    document.getElementById('refreshMediaBtn')?.addEventListener('click', () => this.refreshMediaManager());
    
    // Initialize filters
    document.getElementById('mediaFilter')?.addEventListener('change', (e) => this.filterMediaFiles(e.target.value));
    document.getElementById('mediaSearch')?.addEventListener('input', (e) => this.searchMediaFiles(e.target.value));
    
    // Restore saved filter states
    if (this.currentMediaFilter !== 'all') {
      document.getElementById('mediaFilter').value = this.currentMediaFilter;
    }
    if (this.currentMediaSearch) {
      document.getElementById('mediaSearch').value = this.currentMediaSearch;
    }
    
    // Load initial data
    this.loadMediaFolderTree();
    this.loadMediaDirectory('');
  }

  async loadMediaFolderTree() {
    try {
      const response = await fetch('/admin/api/media/tree', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderMediaFolderTree(data);
      }
    } catch (error) {
      console.error('Error loading media folder tree:', error);
    }
  }

  renderMediaFolderTree(data) {
    const container = document.getElementById('mediaFolderTree');
    
          
    
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
    // The server now returns a complete tree structure
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
      <div class="media-folder-item ${!this.currentMediaDirectory ? 'active' : ''}" 
           onclick="admin.selectMediaFolder('')">
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
        <div class="media-folder-item ${this.currentMediaDirectory === item.path ? 'active' : ''}" data-path="${item.path}">
          ${item.hasSubfolders ? `
            <span class="folder-toggle ${isExpanded ? 'expanded' : ''}" data-path="${item.path}">▶</span>
          ` : '<span class="folder-toggle-placeholder"></span>'}
          <span class="folder-icon">📁</span>
          <span class="folder-name" onclick="admin.selectMediaFolder('${item.path}')">${item.name}</span>
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
              <div class="media-folder-item ${this.currentMediaDirectory === child.path ? 'active' : ''}" data-path="${child.path}">
                ${child.hasSubfolders ? `
                  <span class="folder-toggle ${this.expandedFolders.has(child.path) ? 'expanded' : ''}" data-path="${child.path}">▶</span>
                ` : '<span class="folder-toggle-placeholder"></span>'}
                <span class="folder-icon">📁</span>
                <span class="folder-name" onclick="admin.selectMediaFolder('${child.path}')">${child.name}</span>
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
    this.loadMediaFolderTree();
  }

  async selectMediaFolder(path) {
    this.currentMediaDirectory = path;
    this.loadMediaDirectory(path);
    this.updateMediaFolderTree();
  }

  updateMediaFolderTree() {
    // Update active states in folder tree
    document.querySelectorAll('.media-folder-item').forEach(item => {
      item.classList.remove('active');
    });
    
    if (!this.currentMediaDirectory) {
      // Root folder is active
      document.querySelector('.media-folder-item').classList.add('active');
    } else {
      // Find and activate the correct folder
      const folderItems = document.querySelectorAll('.media-folder-item');
      folderItems.forEach((item, index) => {
        if (index > 0) { // Skip root folder
          const onclick = item.getAttribute('onclick');
          if (onclick && onclick.includes(`'${this.currentMediaDirectory}'`)) {
            item.classList.add('active');
          }
        }
      });
    }
  }

  async loadMediaDirectory(path) {
    try {
      
      
      const url = path ? `/admin/api/media/directory/${path}` : '/admin/api/media/directory';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        this.renderMediaDirectory(data);
        this.updateMediaBreadcrumb(path);
      } else {
        console.error('Server response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading media directory:', error);
    }
  }

  renderMediaDirectory(data) {
    const container = document.getElementById('mediaFileList');
    
    if (!data.files || data.files.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">Папка пуста</p>';
      return;
    }
    
    const html = data.files.map(file => {
      const icon = this.getFileIcon(file.name);
      const size = this.formatFileSize(file.size);
      const preview = this.getFilePreview(file);
      
      return `
        <div class="media-file-item" data-path="${file.path}">
          <div class="media-file-preview">
            ${preview}
          </div>
          <div class="media-file-info">
            <div class="media-file-name">${file.name}</div>
            <div class="media-file-meta">
              <span>${file.path}</span>
              <span>${size}</span>
            </div>
          </div>
          <div class="media-file-actions">
            <button class="btn btn-secondary" onclick="window.admin.copyMediaPath('${file.path}')">Копировать путь</button>
            <button class="btn btn-danger" onclick="window.admin.deleteMediaFile('${file.path}')">Удалить</button>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    
    // Apply saved filters after rendering
    if (this.currentMediaFilter !== 'all') {
      this.filterMediaFiles(this.currentMediaFilter);
    }
    if (this.currentMediaSearch) {
      this.searchMediaFiles(this.currentMediaSearch);
    }
  }

  updateMediaBreadcrumb(path) {
    const breadcrumb = document.getElementById('mediaBreadcrumb');
    
    if (!path) {
      breadcrumb.innerHTML = '<span class="media-breadcrumb-item">assets</span>';
      return;
    }

    const parts = path.split('/');
    let html = '<span class="media-breadcrumb-item" onclick="admin.selectMediaFolder(\'\')">assets</span><span class="media-breadcrumb-separator">/</span>';
    
    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/');
      html += `
        <span class="media-breadcrumb-item" onclick="admin.selectMediaFolder('${currentPath}')">${part}</span>
        <span class="media-breadcrumb-separator">/</span>
      `;
    });
    
    // Remove the last separator
    html = html.replace(/<span class="media-breadcrumb-separator">\/<\/span>$/, '');
    
    breadcrumb.innerHTML = html;
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

  getFilePreview(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return `<img src="/assets/${file.path}" alt="${file.name}" loading="lazy">`;
    } else {
      return `<span class="file-icon">${this.getFileIcon(file.name)}</span>`;
    }
  }

  async createMediaFolder() {
    const name = prompt('Введите название папки:');
    if (!name) return;

    try {
      const response = await fetch('/admin/api/media/directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          path: this.currentMediaDirectory || '',
          name: name
        })
      });

      if (response.ok) {
        this.showSuccess('Папка создана');
        this.loadMediaFolderTree();
        this.loadMediaDirectory(this.currentMediaDirectory || '');
      } else {
        this.showError('Ошибка создания папки');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      this.showError('Ошибка создания папки');
    }
  }

  async uploadMediaFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,.pdf,.svg';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        await this.uploadSingleMediaFile(file);
      }
    };
    
    input.click();
  }

  async uploadSingleMediaFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`/admin/api/media/upload?dir=${this.currentMediaDirectory || ''}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      if (response.ok) {
        this.showSuccess(`Файл ${file.name} загружен`);
        this.loadMediaDirectory(this.currentMediaDirectory || '');
      } else {
        this.showError(`Ошибка загрузки файла ${file.name}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      this.showError(`Ошибка загрузки файла ${file.name}`);
    }
  }

  refreshMediaManager() {
    this.loadMediaFolderTree();
    this.loadMediaDirectory(this.currentMediaDirectory || '');
  }

  filterMediaFiles(filter) {
    // Implement filtering logic
    
  }

  searchMediaFiles(query) {
    // Implement search logic
    
  }

  copyMediaPath(path) {
    const fullPath = `assets/${path}`;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullPath).then(() => {
          this.showSuccess('Путь скопирован в буфер обмена');
        }).catch((error) => {
          console.error('Clipboard API failed:', error);
          this.fallbackCopy(fullPath);
        });
      } else {
        this.fallbackCopy(fullPath);
      }
    } catch (error) {
      console.error('Error in copyMediaPath:', error);
      this.fallbackCopy(fullPath);
    }
  }

  fallbackCopy(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        this.showSuccess('Путь скопирован в буфер обмена');
      } else {
        this.showError('Не удалось скопировать путь');
      }
    } catch (error) {
      console.error('Fallback copy error:', error);
      this.showError('Не удалось скопировать путь');
    }
  }



  async deleteMediaFile(path) {
    if (!confirm(`Удалить файл ${path}?`)) return;

    try {
      const response = await fetch(`/admin/api/media/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });

      if (response.ok) {
        this.showSuccess('Файл удален');
        this.loadMediaDirectory(this.currentMediaDirectory || '');
      } else {
        this.showError('Ошибка удаления файла');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      this.showError('Ошибка удаления файла');
    }
  }

  filterMediaFiles(filterValue) {
    // Save current filter state
    this.currentMediaFilter = filterValue;
    
    const fileItems = document.querySelectorAll('.media-file-item');
    
    fileItems.forEach(item => {
      const fileName = item.querySelector('.media-file-name').textContent.toLowerCase();
      const filePath = item.dataset.path.toLowerCase();
      
      let shouldShow = true;
      
      switch (filterValue) {
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
      
      item.style.display = shouldShow ? 'flex' : 'none';
    });
    
    // Apply search filter on top of type filter
    if (this.currentMediaSearch) {
      this.searchMediaFiles(this.currentMediaSearch);
    }
  }

  searchMediaFiles(query) {
    // Save current search state
    this.currentMediaSearch = query;
    
    if (!query.trim()) {
      // Show all files if search is empty, but respect type filter
      document.querySelectorAll('.media-file-item').forEach(item => {
        let shouldShow = true;
        
        // Apply type filter
        if (this.currentMediaFilter !== 'all') {
          const fileName = item.querySelector('.media-file-name').textContent.toLowerCase();
          switch (this.currentMediaFilter) {
            case 'images':
              shouldShow = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
              break;
            case 'videos':
              shouldShow = /\.(mp4|webm|avi|mov)$/i.test(fileName);
              break;
            case 'documents':
              shouldShow = /\.(pdf|doc|docx|txt)$/i.test(fileName);
              break;
          }
        }
        
        item.style.display = shouldShow ? 'flex' : 'none';
      });
      return;
    }
    
    const fileItems = document.querySelectorAll('.media-file-item');
    const searchTerm = query.toLowerCase();
    
    fileItems.forEach(item => {
      const fileName = item.querySelector('.media-file-name').textContent.toLowerCase();
      const filePath = item.dataset.path.toLowerCase();
      
      const matches = fileName.includes(searchTerm) || filePath.includes(searchTerm);
      
      // Apply both search and type filter
      let shouldShow = matches;
      if (this.currentMediaFilter !== 'all') {
        switch (this.currentMediaFilter) {
          case 'images':
            shouldShow = shouldShow && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
            break;
          case 'videos':
            shouldShow = shouldShow && /\.(mp4|webm|avi|mov)$/i.test(fileName);
            break;
          case 'documents':
            shouldShow = shouldShow && /\.(pdf|doc|docx|txt)$/i.test(fileName);
            break;
        }
      }
      
      item.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  // HTML Editor
  renderHtmlEditor() {
    document.getElementById('htmlEditor').value = this.htmlContent || '';
  }

  formatHtml() {
    const editor = document.getElementById('htmlEditor');
    const content = editor.value;
    
    // Simple HTML formatting (you might want to use a proper HTML formatter)
    const formatted = content
      .replace(/>\s+</g, '>\n<')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    editor.value = formatted;
  }

  previewHtml() {
    const content = document.getElementById('htmlEditor').value;
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(content);
    previewWindow.document.close();
  }

  async saveHtml() {
    const content = document.getElementById('htmlEditor').value;
    
    try {
      const response = await fetch('/admin/api/html/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        this.showSuccess('HTML файл сохранен');
      } else {
        this.showError('Ошибка сохранения HTML');
      }
    } catch (error) {
      this.showError('Ошибка подключения к серверу');
    }
  }

  // Modal Management
  showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    this._elements.modalBody.innerHTML = content;
    this._elements.modalOverlay.style.display = 'flex';
    
    // Bind form submission after a short delay to ensure DOM is ready
    setTimeout(() => {
      // Look for forms in the modal body
      const modalBody = document.getElementById('modalBody');
      const form = modalBody.querySelector('form');
      
      if (form) {
        // Remove existing listeners to avoid duplicates
        const newForm = form.cloneNode(true);
        
        // Ensure the new form has the same ID
        if (form.id) {
          newForm.id = form.id;
        }
        
        form.parentNode.replaceChild(newForm, form);
        
        // Add new listener
        newForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Initialize translation counters for modal fields with multiple attempts
        this.initializeModalTranslationCountersWithRetry();
        
        // Initialize auto-resize for modal textareas
        this.initializeModalAutoResize();
        
      } else {
        console.warn('Form not found in modal body:', title);
      }
    }, 100);
  }

  closeModal() {
    this._elements.modalOverlay.style.display = 'none';
    this._elements.modalBody.innerHTML = '';
    // Clear editing context when modal is closed
    this.editingItem = null;
  }

  initializeModalTranslationCounters() {
    // Find all compact translation fields in the modal
    const modalBody = document.getElementById('modalBody');
    const translationFields = modalBody.querySelectorAll('.compact-translation-field');
    
    console.log(`Found ${translationFields.length} translation fields in modal`);
    
    translationFields.forEach(field => {
      const fieldName = field.getAttribute('data-field');
      if (fieldName) {
        // Update the counter for this field
        this.updateTranslationCounter(fieldName);
        console.log(`Initialized counter for field: ${fieldName}`);
      }
    });
  }

  initializeModalTranslationCountersWithRetry() {
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryInitialize = () => {
      attempts++;
      console.log(`Attempt ${attempts} to initialize translation counters`);
      
      const modalBody = document.getElementById('modalBody');
      const translationFields = modalBody.querySelectorAll('.compact-translation-field');
      
      if (translationFields.length > 0) {
        // Check if fields have values
        let hasValues = false;
        translationFields.forEach(field => {
          const fieldName = field.getAttribute('data-field');
          if (fieldName) {
            const enInput = document.getElementById(`${fieldName}_en`);
            const csInput = document.getElementById(`${fieldName}_cs`);
            const ukInput = document.getElementById(`${fieldName}_uk`);
            
            if (enInput && (enInput.value || csInput?.value || ukInput?.value)) {
              hasValues = true;
            }
          }
        });
        
        if (hasValues || attempts >= maxAttempts) {
          // Initialize counters
          this.initializeModalTranslationCounters();
          return;
        }
      }
      
      // Retry after a short delay
      if (attempts < maxAttempts) {
        setTimeout(tryInitialize, 100);
      }
    };
    
    // Start the retry process
    setTimeout(tryInitialize, 50);
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    // Get the form ID correctly - e.target is the form element
    const formId = e.target.id || e.target.getAttribute('id');
    
    console.log('📋 Form submitted:', formId);
    console.log('📋 Form element tagName:', e.target.tagName);
    console.log('📋 Form element id:', e.target.id);
    console.log('📋 Form element getAttribute("id"):', e.target.getAttribute('id'));
    console.log('📋 Form element outerHTML:', e.target.outerHTML.substring(0, 200) + '...');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    console.log('📋 Form data collected:', data);
    
    await this._processFormSubmission(formId, data);
    this.closeModal();
  }

  async _processFormSubmission(formId, data) {
    console.log('🔍 Processing form submission:', { formId, data });
    console.log('🔍 Form ID type:', typeof formId);
    console.log('🔍 Form ID === "updateForm":', formId === 'updateForm');
    console.log('🔍 Form ID === "dynamicForm":', formId === 'dynamicForm');
    
    if (formId === 'dynamicForm') {
      console.log('📝 Handling dynamic form');
      await this._handleDynamicForm(data);
    } else if (formId === 'updateForm') {
      console.log('📝 Handling update form');
      await this._handleUpdateForm(data);
    } else {
      console.log('❓ Handling unknown form:', formId);
      console.log('❓ Available form IDs:', ['dynamicForm', 'updateForm']);
      await this._handleUnknownForm(data);
    }
  }

  async _handleDynamicForm(data) {
    if (this.editingItem) {
      await this._handleDynamicFormEdit(data);
    } else {
      await this._handleDynamicFormAdd(data);
    }
  }

  async _handleDynamicFormEdit(data) {
    if (this.editingItem.type === 'venuePhoto') {
      await this.updateVenuePhoto(data);
    } else {
      await this.updateDynamicItem(data);
    }
  }

  async _handleDynamicFormAdd(data) {
    if (data.path) {
      await this.addVenuePhotoPath(data);
    } else {
      await this.addDynamicItem(data);
    }
  }

  async _handleUpdateForm(data) {
    console.log('📝 Processing update form data:', data);
    
    // Process translation fields for updates
    const processedData = { ...data };
    
    // Handle title translations
    if (data.title_en || data.title_cs || data.title_uk) {
      processedData.title = {
        en: data.title_en || '',
        cs: data.title_cs || '',
        uk: data.title_uk || ''
      };
      delete processedData.title_en;
      delete processedData.title_cs;
      delete processedData.title_uk;
    }
    
    // Handle body translations
    if (data.body_en || data.body_cs || data.body_uk) {
      processedData.body = {
        en: data.body_en || '',
        cs: data.body_cs || '',
        uk: data.body_uk || ''
      };
      delete processedData.body_en;
      delete processedData.body_cs;
      delete processedData.body_uk;
    }
    
    console.log('📝 Processed update data:', processedData);
    
    await this.saveUpdate(processedData);
  }

  async _handleUnknownForm(data) {
    console.log('❓ _handleUnknownForm called with data:', data);
    console.log('❓ Checking conditions:');
    console.log('❓ - data.title:', !!data.title);
    console.log('❓ - data.type:', !!data.type);
    console.log('❓ - data.body:', !!data.body);
    console.log('❓ - data.title_en:', !!data.title_en);
    console.log('❓ - data.body_en:', !!data.body_en);
    
    if (data.title && data.type && data.body) {
      console.log('✅ Detected as update form (title + type + body)');
      await this.saveUpdate(data);
    } else if (data.title_en && data.type && data.body_en) {
      console.log('✅ Detected as update form (title_en + type + body_en)');
      // Process translation fields for updates
      const processedData = { ...data };
      
      // Handle title translations
      if (data.title_en || data.title_cs || data.title_uk) {
        processedData.title = {
          en: data.title_en || '',
          cs: data.title_cs || '',
          uk: data.title_uk || ''
        };
        delete processedData.title_en;
        delete processedData.title_cs;
        delete processedData.title_uk;
      }
      
      // Handle body translations
      if (data.body_en || data.body_cs || data.body_uk) {
        processedData.body = {
          en: this.processBodyText(data.body_en || ''),
          cs: this.processBodyText(data.body_cs || ''),
          uk: this.processBodyText(data.body_uk || '')
        };
        delete processedData.body_en;
        delete processedData.body_cs;
        delete processedData.body_uk;
      }
      
      console.log('📝 Processed update data in unknown form:', processedData);
      await this.saveUpdate(processedData);
    } else if (data.name || data.q || data.type) {
      console.log('✅ Detected as dynamic form');
      if (this.editingItem) {
        await this.updateDynamicItem(data);
      } else {
        await this.addDynamicItem(data);
      }
    } else {
      console.warn('❌ Cannot determine form type for data:', data);
    }
  }

  processTranslationFields(data) {
    const processedData = { ...data };
    
    // Define all translation fields to process
    const translationFields = ['name', 'bio', 'q', 'a', 'desc', 'note', 'title', 'body'];
    
    // Process each translation field
    translationFields.forEach(field => {
      this._processTranslationField(processedData, field);
    });
    
    return processedData;
  }

  _processTranslationField(processedData, fieldName) {
    const enKey = `${fieldName}_en`;
    const csKey = `${fieldName}_cs`;
    const ukKey = `${fieldName}_uk`;
    
    if (processedData[enKey] || processedData[csKey] || processedData[ukKey]) {
      processedData[fieldName] = {
        en: processedData[enKey] || '',
        cs: processedData[csKey] || '',
        uk: processedData[ukKey] || ''
      };
      
      // Remove individual language fields
      delete processedData[enKey];
      delete processedData[csKey];
      delete processedData[ukKey];
    }
  }

  async addDynamicItem(data) {
    const type = this._determineItemType(data);
    const processedData = this._processItemData(data, type);
    
    this._addItemToConfig(type, processedData);
    await this._saveAndShowSuccess();
  }

  _determineItemType(data) {
    // Check for FAQ first (most specific)
    if ((data.q_en || data.q) && (data.a_en || data.a)) {
      return 'faq';
    }
    // Check for seller (has name and url)
    if ((data.name_en || data.name) && data.url && !data.desc && !data.price) {
      return 'seller';
    }
    // Check for tier (has name, desc, and price)
    if ((data.name_en || data.name) && (data.desc_en || data.desc) && data.price) {
      return 'tier';
    }
    // Check for artist (has name and bio, but not q/a)
    if ((data.name_en || data.name) && (data.bio_en || data.bio) && !data.q && !data.a) {
      return 'artist';
    }
    // Check for contact (has type and url)
    if (data.type && data.url) {
      return 'contact';
    }
    
    return 'item';
  }

  _processItemData(data, type) {
    let processedData = { ...data };
    
    // Process translation fields for all types
    processedData = this.processTranslationFields(processedData);
    
    // Handle special cases for each type
    this._processArtistLinks(processedData, data);
    this._processSellerCheckboxes(processedData, data);
    this._processTierCheckboxes(processedData, data);
    
    // Process bio field for artists to preserve paragraph structure
    if (type === 'artist' && processedData.bio && typeof processedData.bio === 'object') {
      Object.keys(processedData.bio).forEach(lang => {
        if (processedData.bio[lang]) {
          processedData.bio[lang] = this.processBodyText(processedData.bio[lang]).join('\n');
        }
      });
    }
    
    // Process FAQ answers to preserve paragraph structure
    if (type === 'faq' && processedData.a && typeof processedData.a === 'object') {
      Object.keys(processedData.a).forEach(lang => {
        if (processedData.a[lang]) {
          processedData.a[lang] = this.processBodyText(processedData.a[lang]).join('\n');
        }
      });
    }
    
    return processedData;
  }

  _processArtistLinks(processedData, data) {
    if (processedData.type === 'artist') {
      const links = [];
      const linkIndices = new Set();
      
      // Collect all link indices from form data
      Object.keys(data).forEach(key => {
        if (key.startsWith('linkType_')) {
          const linkIndex = key.replace('linkType_', '');
          linkIndices.add(linkIndex);
        }
      });
      
      // Build links array
      linkIndices.forEach(linkIndex => {
        const type = data[`linkType_${linkIndex}`];
        const url = data[`linkUrl_${linkIndex}`];
        if (type && url) {
          links.push({ t: type, u: url });
        }
      });
      
      processedData.links = links;
    }
  }

  _processSellerCheckboxes(processedData, data) {
    if (processedData.type === 'seller') {
      processedData.showInTicketsMenu = this._getCheckboxValue(data.showInTicketsMenu);
      processedData.showInTicketsSection = this._getCheckboxValue(data.showInTicketsSection);
    }
  }

  _processTierCheckboxes(processedData, data) {
    if (processedData.type === 'tier') {
      processedData.useIndividualLink = this._getCheckboxValue(data.useIndividualLink);
      processedData.individualLink = processedData.useIndividualLink ? data.individualLink : '';
    }
  }

  _getCheckboxValue(value) {
    return value === 'on' || value === true;
  }

  _addItemToConfig(type, processedData) {
    const configMap = {
      seller: { array: 'authorizedSellers', render: 'renderSellers' },
      tier: { array: 'tiers', render: 'renderTiers' },
      artist: { array: 'artists', render: 'renderArtists' },
      faq: { array: 'faqs', render: 'renderFaqs' },
      contact: { array: 'contacts', render: 'renderContacts' }
    };

    const config = configMap[type];
    if (config) {
      this._ensureArrayExists(config.array);
      this.config[config.array].push(processedData);
      this[config.render]();
    }
  }

  _ensureArrayExists(arrayName) {
    if (!this.config[arrayName]) {
      this.config[arrayName] = [];
    }
  }

  _renderDynamicList(containerId, type, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    items.forEach((item, index) => {
      const element = this.createDynamicItem(type, item, index);
      fragment.appendChild(element);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Initialize auto-resize for textareas in the rendered list
    setTimeout(() => {
      const textareas = container.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        this.autoResizeTextarea(textarea);
        textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
        textarea.addEventListener('focus', () => this.autoResizeTextarea(textarea));
        textarea.addEventListener('paste', () => {
          setTimeout(() => this.autoResizeTextarea(textarea), 0);
        });
      });
    }, 0);
  }

  async _saveAndShowSuccess() {
    await this._handleAsyncOperation(
      () => this.saveConfig(),
      'Элемент добавлен и сохранен',
      'Элемент добавлен, но не сохранен'
    );
  }

  async _handleAsyncOperation(operation, successMessage, errorMessage) {
    try {
      await operation();
      this.showSuccess(successMessage);
    } catch (error) {
      console.error('Operation failed:', error);
      this.showError(errorMessage);
    }
  }

  async updateDynamicItem(data) {
    const { type, index } = this.editingItem;
    
    // Process data based on type
    let processedData = { ...data };
    
    // Process translation fields for all types
    processedData = this.processTranslationFields(processedData);
    
    // Handle special cases for artist
    if (type === 'artist') {
      // Process links from form fields
      const links = [];
      const linkIndices = new Set();
      
      // Collect all link indices from form data
      Object.keys(data).forEach(key => {
        if (key.startsWith('linkType_')) {
          const linkIndex = key.replace('linkType_', '');
          linkIndices.add(linkIndex);
        }
      });
      
      // Build links array
      linkIndices.forEach(linkIndex => {
        const type = data[`linkType_${linkIndex}`];
        const url = data[`linkUrl_${linkIndex}`];
        if (type && url) {
          links.push({ t: type, u: url });
        }
      });
      
      processedData.links = links;
    }

    // Handle special cases for seller
    if (type === 'seller') {
      // Process checkboxes
      processedData.showInTicketsMenu = data.showInTicketsMenu === 'on' || data.showInTicketsMenu === true;
      processedData.showInTicketsSection = data.showInTicketsSection === 'on' || data.showInTicketsSection === true;
    }

    // Handle special cases for tier
    if (type === 'tier') {
      // Process checkboxes
      processedData.useIndividualLink = data.useIndividualLink === 'on' || data.useIndividualLink === true;
      processedData.individualLink = processedData.useIndividualLink ? data.individualLink : '';
    }
    
    // Update the item in the appropriate array
    switch (type) {
      case 'seller':
        this.config.authorizedSellers[index] = processedData;
        this.renderSellers();
        break;
      case 'tier':
        this.config.tiers[index] = processedData;
        this.renderTiers();
        break;
      case 'artist':
        this.config.artists[index] = processedData;
        this.renderArtists();
        break;
      case 'faq':
        this.config.faqs[index] = processedData;
        this.renderFaqs();
        break;
      case 'contact':
        this.config.contacts[index] = processedData;
        this.renderContacts();
        break;
    }
    
    // Clear editing context
    this.editingItem = null;
    
    // Auto-save config after updating item
    try {
      await this.saveConfig();
      this.showSuccess('Элемент обновлен и сохранен');
    } catch (error) {
      this.showError('Элемент обновлен, но не сохранен');
    }
  }

  addLink() {
    const container = document.getElementById('linksContainer');
    const linkIndex = container.children.length;
    
    const linkHtml = `
      <div class="link-item" data-index="${linkIndex}">
        <div class="form-row">
          <div class="form-group">
            <label>Тип ссылки</label>
            <select name="linkType_${linkIndex}" required>
              <option value="">Выберите тип...</option>
              <option value="Website">Website</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
            </select>
          </div>
          <div class="form-group">
            <label>URL</label>
            <input type="url" name="linkUrl_${linkIndex}" placeholder="https://example.com" required>
          </div>
          <button type="button" class="btn btn-danger btn-small" onclick="admin.removeLink(${linkIndex})">Удалить</button>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', linkHtml);
  }

  removeLink(index) {
    const linkItem = document.querySelector(`[data-index="${index}"]`);
    if (linkItem) {
      linkItem.remove();
      // Reindex remaining links
      const remainingLinks = document.querySelectorAll('.link-item');
      remainingLinks.forEach((item, newIndex) => {
        item.dataset.index = newIndex;
        const typeInput = item.querySelector('input[name^="linkType_"]');
        const urlInput = item.querySelector('input[name^="linkUrl_"]');
        const removeBtn = item.querySelector('button');
        
        if (typeInput) typeInput.name = `linkType_${newIndex}`;
        if (urlInput) urlInput.name = `linkUrl_${newIndex}`;
        if (removeBtn) removeBtn.onclick = () => admin.removeLink(newIndex);
      });
    }
  }

  // Special method for selecting media files for updates
  selectUpdateMedia() {
    // Show file manager with custom callback
    fileManager.show(document.getElementById('updateMedia'), (path) => {
      document.getElementById('updateMedia').value = path;
      
      // If a new file was selected (not empty), ensure it's uploaded
      if (path && path.trim() !== '') {
        console.log('✅ Media file selected for update:', path);
        // The file should already be on FTP since it was selected from fileManager
        // Just update the field value
      }
    });
  }

  async saveUpdate(data) {
    
    try {
      console.log('💾 Saving update with data:', data);
      
      // Generate ID if not provided
      const id = data.id || `update_${Date.now()}`;
      
      // Use custom date if provided, otherwise use current date
      const ts = data.customDate ? new Date(data.customDate).toISOString() : new Date().toISOString();
      
              // Handle body processing - preserve translation structure while ensuring site compatibility
        console.log('📝 Processing body:', { type: typeof data.body, value: data.body });
        
        let processedBody;
        if (typeof data.body === 'string') {
          // If body is a string, convert to translation object
          console.log('📝 Body is string, converting to translation object');
          const bodyText = this.processBodyText(data.body);
          processedBody = {
            en: bodyText,
            cs: bodyText,
            uk: bodyText
          };
        } else if (data.body && typeof data.body === 'object') {
          // If body is an object with translations, preserve structure
          console.log('📝 Body is object with translations, preserving structure');
          if (Array.isArray(data.body.en)) {
            // Already processed as arrays
            processedBody = {
              en: data.body.en,
              cs: data.body.cs || [],
              uk: data.body.uk || []
            };
          } else {
            // Need to split strings into arrays
            processedBody = {
              en: this.processBodyText(data.body.en || ''),
              cs: this.processBodyText(data.body.cs || ''),
              uk: this.processBodyText(data.body.uk || '')
            };
          }
        } else {
          console.log('📝 Body is empty or invalid, using empty translation object');
          processedBody = { en: [], cs: [], uk: [] };
        }
        
        console.log('📝 Processed body result:', processedBody);
        
        // Handle title processing - keep title as object for translations
        console.log('📝 Processing title:', { type: typeof data.title, value: data.title });
        
        let processedTitle;
        if (typeof data.title === 'string') {
          // If title is a string, convert to translation object
          console.log('📝 Title is string, converting to translation object');
          processedTitle = {
            en: data.title,
            cs: data.title,
            uk: data.title
          };
        } else if (data.title && typeof data.title === 'object') {
          // If title is already an object with translations, use as is
          console.log('📝 Title is object with translations, using as is');
          processedTitle = data.title;
        } else {
          console.log('📝 Title is empty or invalid, using empty translation object');
          processedTitle = { en: '', cs: '', uk: '' };
        }
        
        console.log('📝 Processed title result:', processedTitle);
        
        const update = {
          id: id,
          ts: ts,
          type: data.type,
          title: processedTitle,
          body: processedBody, // Translation object for admin panel and site
          important: data.important === 'on' || data.important === true,
          pinned: data.pinned === 'on' || data.pinned === true
        };

      if (data.thumb) {
        update.thumb = data.thumb;
        console.log('📸 Thumbnail path:', data.thumb);
      }
      if (data.media) {
        update.media = data.media;
        console.log('🎬 Media path:', data.media);
      }

              console.log('📝 Final update object:', update);
        console.log('📝 Body structure check:', {
          body: typeof update.body,
          bodyKeys: update.body ? Object.keys(update.body) : 'N/A'
        });

      // Check if this is an edit (existing index) or new update
      if (this.editingUpdateIndex !== undefined && this.editingUpdateIndex >= 0) {
        // Update existing
        console.log(`✏️ Updating existing update at index ${this.editingUpdateIndex}`);
        console.log('📝 Original update body structure:', this.updates[this.editingUpdateIndex]?.body);
        console.log('📝 New update body structure:', update.body);
        
        // Preserve original body structure if it was an object with translations
        const originalUpdate = this.updates[this.editingUpdateIndex];
        if (originalUpdate && originalUpdate.body && typeof originalUpdate.body === 'object' && !Array.isArray(originalUpdate.body)) {
          console.log('🔄 Preserving original body structure with translations');
          
          // Update the content while preserving the translation structure
          if (update.body && typeof update.body === 'object' && update.body.en) {
            console.log('📝 Updating body content while preserving structure');
            // Update each language with new content
            if (Array.isArray(update.body.en)) {
              originalUpdate.body.en = update.body.en;
              originalUpdate.body.cs = update.body.cs;
              originalUpdate.body.uk = update.body.uk;
            } else {
              // If update.body is not in array format, convert it
              originalUpdate.body.en = this.processBodyText(update.body.en || '');
              originalUpdate.body.cs = this.processBodyText(update.body.cs || '');
              originalUpdate.body.uk = this.processBodyText(update.body.uk || '');
            }
            update.body = originalUpdate.body;
          } else {
            // If new body is not in translation format, preserve original
            update.body = originalUpdate.body;
          }
        }
        
        this.updates[this.editingUpdateIndex] = update;
        this.editingUpdateIndex = undefined; // Reset editing index
      } else {
        // Add new
        console.log('➕ Adding new update');
        this.updates.unshift(update);
      }
      
      console.log('📊 Total updates after save:', this.updates.length);
      this.renderUpdates();
      
      // Auto-save updates
      console.log('💾 Saving updates to server...');
      await this.saveUpdates();
      this.showSuccess('Обновление сохранено');
      
    } catch (error) {
      console.error('Error saving update:', error);
      this.showError('Ошибка сохранения обновления');
    }
  }

  // Global Actions
  async saveAll() {
    try {
      // Update config from form data
      this.updateConfigFromForm();
      
      // Save config
      await this.saveConfig();
      
      // Save translations
      await this.saveTranslations();
      
      // Save updates
      await this.saveUpdates();
      
      this.showSuccess('Все изменения сохранены');
    } catch (error) {
      this.showError('Ошибка сохранения');
    }
  }

  updateConfigFromForm() {
    // Update event info
    if (!this.config.event) this.config.event = {};
    this.config.event.name = this.collectTranslationField('eventName');
    this.config.event.date = this.collectTranslationField('eventDate');
    this.config.event.time = document.getElementById('eventTime')?.value || '';
    this.config.event.timeEnd = document.getElementById('eventTimeEnd')?.value || '';
    this.config.event.city = this.collectTranslationField('eventCity');
    this.config.event.country = this.collectTranslationField('eventCountry');
    this.config.event.flag = document.getElementById('eventFlag')?.value || '';
    this.config.event.heroBackground = document.getElementById('heroBackground')?.value || '';
    this.config.event.showCountdown = document.getElementById('showCountdown')?.checked || false;
    // Process about field to preserve paragraph structure
    const aboutField = this.collectTranslationField('eventAbout');
    if (aboutField && typeof aboutField === 'object') {
      Object.keys(aboutField).forEach(lang => {
        if (aboutField[lang]) {
          aboutField[lang] = this.processBodyText(aboutField[lang]).join('\n');
        }
      });
    }
    this.config.event.about = aboutField;

    // Update venue info
    if (!this.config.event.venue) this.config.event.venue = {};
    this.config.event.venue.name = this.collectTranslationField('venueName');
    this.config.event.venue.address = this.collectTranslationField('venueAddress');
    this.config.event.venue.website = document.getElementById('venueWebsite')?.value || '';
    this.config.event.venue.route = document.getElementById('venueRoute')?.value || '';

    // Update tickets
    this.config.ticketsURL = document.getElementById('ticketsURL')?.value || '';
  }

  collectTranslationField(fieldName) {
    const enValue = document.getElementById(`${fieldName}_en`)?.value || '';
    const csValue = document.getElementById(`${fieldName}_cs`)?.value || '';
    const ukValue = document.getElementById(`${fieldName}_uk`)?.value || '';

    // If all values are empty, return empty string
    if (!enValue && !csValue && !ukValue) {
      return '';
    }

    // If only English has value, return string (backward compatibility)
    if (enValue && !csValue && !ukValue) {
      return enValue;
    }

    // Return translation object
    return {
      en: enValue,
      cs: csValue,
      uk: ukValue
    };
  }

  getTranslationValue(fieldData, lang) {
    if (!fieldData) return '';
    
    if (typeof fieldData === 'object') {
      const value = fieldData[lang] || '';
      
      // Special handling for body field to restore line breaks
      if (Array.isArray(value)) {
        return value.join('\n');
      }
      
      return value;
    }
    
    // If it's a string, return it only for English
    return lang === 'en' ? fieldData : '';
  }

  // Process body text to preserve paragraph structure
  processBodyText(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Split by newlines and preserve empty lines for paragraphs
    const lines = text.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // If line is empty and next line is also empty, it's a paragraph break
      if (line === '' && (i + 1 < lines.length && lines[i + 1].trim() === '')) {
        processedLines.push(''); // Keep paragraph break
        i++; // Skip next empty line
      } else if (line !== '') {
        // Non-empty line
        processedLines.push(line);
      }
    }
    
    // Filter out consecutive empty lines at the end
    while (processedLines.length > 0 && processedLines[processedLines.length - 1] === '') {
      processedLines.pop();
    }
    
    return processedLines;
  }

  getTranslationDisplay(fieldData, fallback = 'Не указано') {
    if (!fieldData) return fallback;
    
    if (typeof fieldData === 'object') {
      // Return the first available translation, prioritizing English
      return fieldData.en || fieldData.cs || fieldData.uk || fallback;
    }
    
    // If it's a string, return it directly
    return fieldData;
  }

  getCategoryIcon(categoryType) {
    const icons = {
      'tickets': '🎫',
      'lineup': '🎵',
      'logistics': '🚗',
      'announcement': '📢'
    };
    return icons[categoryType] || '📝';
  }

  addCategory() {
    const key = prompt('Введите ключ для нового типа (например: tickets, lineup):');
    if (!key || !key.trim()) return;
    
    const trimmedKey = key.trim().toLowerCase();
    
    // Check if category already exists
    if (this.config.updateCategories?.[trimmedKey]) {
      alert('Тип с таким ключом уже существует!');
      return;
    }
    
    // Add new category
    if (!this.config.updateCategories) this.config.updateCategories = {};
    this.config.updateCategories[trimmedKey] = {
      en: '',
      cs: '',
      uk: ''
    };
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateCategories();
      this.renderUpdates(); // Re-render updates to show new category
    });
  }

  saveCategory(key) {
    const enValue = document.getElementById(`category_${key}_en`)?.value || '';
    const csValue = document.getElementById(`category_${key}_cs`)?.value || '';
    const ukValue = document.getElementById(`category_${key}_uk`)?.value || '';
    
    if (!this.config.updateCategories) this.config.updateCategories = {};
    this.config.updateCategories[key] = {
      en: enValue,
      cs: csValue,
      uk: ukValue
    };
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateCategories();
      this.renderUpdates(); // Re-render updates to show updated category
    });
  }

  deleteCategory(key) {
    if (!confirm(`Удалить тип "${key}"? Это может повлиять на существующие апдейты.`)) return;
    
    // Check if category is used in updates
    const isUsed = this.updates.some(update => update.type === key);
    if (isUsed) {
      alert('Нельзя удалить тип, который используется в апдейтах! Сначала измените тип у всех апдейтов.');
      return;
    }
    
    // Delete category
    delete this.config.updateCategories[key];
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateCategories();
    });
  }

  addBadge() {
    const key = prompt('Введите ключ для нового бейджа (например: important, pinned):');
    if (!key || !key.trim()) return;
    
    const trimmedKey = key.trim().toLowerCase();
    
    // Check if badge already exists
    if (this.config.updateBadges?.[trimmedKey]) {
      alert('Бейдж с таким ключом уже существует!');
      return;
    }
    
    // Add new badge
    if (!this.config.updateBadges) this.config.updateBadges = {};
    this.config.updateBadges[trimmedKey] = {
      en: '',
      cs: '',
      uk: ''
    };
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateBadges();
      this.renderUpdates(); // Re-render updates to show new badge
    });
  }

  saveBadge(key) {
    const enValue = document.getElementById(`badge_${key}_en`)?.value || '';
    const csValue = document.getElementById(`badge_${key}_cs`)?.value || '';
    const ukValue = document.getElementById(`badge_${key}_uk`)?.value || '';
    
    if (!this.config.updateBadges) this.config.updateBadges = {};
    this.config.updateBadges[key] = {
      en: enValue,
      cs: csValue,
      uk: ukValue
    };
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateBadges();
      this.renderUpdates(); // Re-render updates to show updated badge
    });
  }

  deleteBadge(key) {
    if (!confirm(`Удалить бейдж "${key}"? Это может повлиять на существующие апдейты.`)) return;
    
    // Check if badge is used in updates
    const isUsed = this.updates.some(update => update[key] === true);
    if (isUsed) {
      alert('Нельзя удалить бейдж, который используется в апдейтах! Сначала уберите бейдж у всех апдейтов.');
      return;
    }
    
    // Delete badge
    delete this.config.updateBadges[key];
    
    // Save and re-render
    this.saveConfig().then(() => {
      this.renderUpdateBadges();
    });
  }

  async saveConfig() {
    const response = await fetch('/admin/api/config/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify(this.config)
    });

    if (!response.ok) {
      throw new Error('Config save failed');
    }
  }

  async saveTranslations() {
    console.log('💾 Saving translations:', this.translations);
    
    const response = await fetch('/admin/api/translations/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify(this.translations)
    });

    console.log('📡 Save response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Save error:', errorText);
      throw new Error('Translations save failed');
    }
    
    const result = await response.json();
    console.log('✅ Translations saved successfully:', result);
  }

  async saveUpdates() {
    console.log('💾 Sending updates to server:', this.updates);
    
    const response = await fetch('/admin/api/updates/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify(this.updates)
    });

    console.log('📡 Server response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error:', errorText);
      throw new Error('Updates save failed');
    }
    
    const result = await response.json();
    console.log('✅ Updates saved successfully:', result);
  }

  previewSite() {
    window.open('../index.html', '_blank');
  }

  // Utility Methods
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showWarning(message) {
    this.showMessage(message, 'warning');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  // Dynamic item management
  editDynamicItem(type, index) {
    let item;
    let formContent;
    let title;
    
    // Get the item to edit
    switch (type) {
      case 'seller':
        item = this.config.authorizedSellers[index];
        formContent = this.getSellerForm(item);
        title = 'Редактировать продавца билетов';
        break;
      case 'tier':
        item = this.config.tiers[index];
        formContent = this.getTierForm(item);
        title = 'Редактировать категорию билетов';
        break;
      case 'artist':
        item = this.config.artists[index];
        formContent = this.getArtistForm(item);
        title = 'Редактировать артиста';
        break;
      case 'faq':
        item = this.config.faqs[index];
        formContent = this.getFaqForm(item);
        title = 'Редактировать вопрос';
        break;
      case 'contact':
        item = this.config.contacts[index];
        formContent = this.getContactForm(item);
        title = 'Редактировать контакт';
        break;
      default:
        console.error('Unknown type:', type);
        return;
    }
    
    // Show modal with edit form
    this.showModal(title, formContent);
    
    // Store the edit context
    this.editingItem = { type, index, originalData: { ...item } };
  }

  async deleteDynamicItem(type, index) {
    if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
      switch (type) {
        case 'seller':
          this.config.authorizedSellers.splice(index, 1);
          this.renderSellers();
          break;
        case 'tier':
          this.config.tiers.splice(index, 1);
          this.renderTiers();
          break;
        case 'artist':
          this.config.artists.splice(index, 1);
          this.renderArtists();
          break;
              case 'faq':
        this.config.faqs.splice(index, 1);
        this.renderFaqs();
        break;
      case 'contact':
        this.config.contacts.splice(index, 1);
        this.renderContacts();
        break;
      }
      
      // Auto-save config after deleting item
      try {
        await this.saveConfig();
        this.showSuccess('Элемент удален и сохранен');
      } catch (error) {
        this.showError('Элемент удален, но не сохранен');
      }
    }
  }

  // Media file management
  async deleteMediaFile(filePath) {
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
      try {
        const token = localStorage.getItem('admin_token');
        
        // Разделяем путь на папку и имя файла
        const pathParts = filePath.split('/');
        const filename = pathParts.pop(); // Последняя часть - имя файла
        const dir = pathParts.length > 0 ? pathParts.join('/') : ''; // Остальное - папка
        
        // Формируем URL с query параметром для папки
        const url = `/admin/api/media/${filename}${dir ? `?dir=${dir}` : ''}`;
        
        console.log(`🗑️ Удаляю файл: ${filename} из папки: ${dir || 'root'}`);
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          this.showSuccess('Файл удален');
          // Перезагружаем текущую папку
          this.loadMediaDirectory(this.currentMediaDirectory || '');
        } else {
          this.showError('Ошибка удаления файла');
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        this.showError('Ошибка удаления файла');
      }
    }
  }

  // copyMediaPath function moved to line 1155 with improved functionality

  filterMedia() {
    const filter = document.getElementById('mediaFilter').value;
    const items = document.querySelectorAll('.media-item');
    
    items.forEach(item => {
      const filename = item.dataset.filename;
      const ext = filename.split('.').pop().toLowerCase();
      
      let show = true;
      if (filter === 'images' && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) show = false;
      if (filter === 'videos' && !['mp4', 'webm'].includes(ext)) show = false;
      if (filter === 'documents' && !['pdf', 'svg'].includes(ext)) show = false;
      
      item.style.display = show ? 'block' : 'none';
    });
  }

  searchMedia() {
    const search = document.getElementById('mediaSearch').value.toLowerCase();
    const items = document.querySelectorAll('.media-item');
    
    items.forEach(item => {
      const filename = item.dataset.filename.toLowerCase();
      item.style.display = filename.includes(search) ? 'block' : 'none';
    });
  }

  // Language Management Methods
  setupLanguageManagement() {
    this.renderLanguageList();
    this.bindLanguageEvents();
  }

  renderLanguageList() {
    const languageList = document.getElementById('languageList');
    if (!languageList || !this.config.languages) return;

    languageList.innerHTML = '';
    
    Object.entries(this.config.languages).forEach(([code, lang]) => {
      const langItem = document.createElement('div');
      langItem.className = `language-item ${lang.isActive ? 'active' : 'inactive'}`;
      langItem.dataset.lang = code;
      
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'status-indicator';
      
      const langText = document.createElement('span');
      langText.textContent = lang.code.toUpperCase();
      
      langItem.appendChild(statusIndicator);
      langItem.appendChild(langText);
      
      if (lang.isDefault) {
        langItem.classList.add('default');
        langItem.title = 'Основной язык';
      }
      
      languageList.appendChild(langItem);
    });
  }

  bindLanguageEvents() {
    // Add language button
    document.getElementById('addLanguageBtn')?.addEventListener('click', () => {
      this.showAddLanguageModal();
    });

    // Language settings button
    document.getElementById('languageSettingsBtn')?.addEventListener('click', () => {
      this.showLanguageSettingsModal();
    });

    // Add language form
    document.getElementById('addLanguageForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addLanguage();
    });

    // Cancel add language
    document.getElementById('cancelAddLanguage')?.addEventListener('click', () => {
      this.closeAddLanguageModal();
    });

    // Close modals
    document.getElementById('addLanguageModalClose')?.addEventListener('click', () => {
      this.closeAddLanguageModal();
    });

    document.getElementById('languageSettingsModalClose')?.addEventListener('click', () => {
      this.closeLanguageSettingsModal();
    });

    document.getElementById('closeLanguageSettings')?.addEventListener('click', () => {
      this.closeLanguageSettingsModal();
    });

    // Language item clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.language-item')) {
        const langItem = e.target.closest('.language-item');
        const langCode = langItem.dataset.lang;
        this.toggleLanguage(langCode);
      }
    });
  }

  showAddLanguageModal() {
    const modal = document.getElementById('addLanguageModal');
    if (modal) {
      modal.style.display = 'flex';
      this.populateLanguageSelect();
    }
  }

  closeAddLanguageModal() {
    const modal = document.getElementById('addLanguageModal');
    if (modal) {
      modal.style.display = 'none';
      document.getElementById('addLanguageForm').reset();
    }
  }

  showLanguageSettingsModal() {
    const modal = document.getElementById('languageSettingsModal');
    if (modal) {
      modal.style.display = 'flex';
      this.renderLanguageSettings();
    }
  }

  closeLanguageSettingsModal() {
    const modal = document.getElementById('languageSettingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  populateLanguageSelect() {
    const select = document.getElementById('newLanguageCode');
    if (!select) return;

    // Get existing language codes
    const existingCodes = Object.keys(this.config.languages || {});
    
    // Filter out existing languages
    const availableLanguages = [
      { code: 'de', name: 'Deutsch (German)' },
      { code: 'fr', name: 'Français (French)' },
      { code: 'es', name: 'Español (Spanish)' },
      { code: 'it', name: 'Italiano (Italian)' },
      { code: 'pl', name: 'Polski (Polish)' },
      { code: 'sk', name: 'Slovenčina (Slovak)' },
      { code: 'hu', name: 'Magyar (Hungarian)' },
      { code: 'ro', name: 'Română (Romanian)' }
    ].filter(lang => !existingCodes.includes(lang.code));

    // Clear and populate
    select.innerHTML = '<option value="">Выберите язык</option>';
    availableLanguages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      select.appendChild(option);
    });

    // Auto-fill language name when code is selected
    select.addEventListener('change', (e) => {
      const selectedLang = availableLanguages.find(lang => lang.code === e.target.value);
      if (selectedLang) {
        document.getElementById('newLanguageName').value = selectedLang.name.split(' (')[0];
      }
    });
  }

  async addLanguage() {
    const code = document.getElementById('newLanguageCode').value;
    const name = document.getElementById('newLanguageName').value;

    if (!code || !name) {
      this.showError('Пожалуйста, заполните все поля');
      return;
    }

    try {
      // Add language to config
      if (!this.config.languages) this.config.languages = {};
      this.config.languages[code] = {
        name: name,
        code: code,
        isDefault: false,
        isActive: true,
        isVisible: false // Start as invisible until translations are ready
      };

      // Add language to all translation fields
      this.addLanguageToAllFields(code);

      // Save config
      await this.saveConfig();

      // Update interface
      this.renderLanguageList();
      this.renderAllFields();
      this.closeAddLanguageModal();

      this.showSuccess(`Язык ${name} добавлен успешно`);
    } catch (error) {
      console.error('Error adding language:', error);
      this.showError('Ошибка при добавлении языка');
    }
  }

  addLanguageToAllFields(code) {
    // Add to config.json fields
    this.addLanguageToConfigFields(code);
    
    // Add to translations.json fields
    this.addLanguageToTranslationFields(code);
    
    // Add to updates.json fields
    this.addLanguageToUpdateFields(code);
  }

  addLanguageToConfigFields(code) {
    // Event fields
    if (this.config.event?.name && typeof this.config.event.name === 'object') {
      this.config.event.name[code] = '';
    }
    if (this.config.event?.about && typeof this.config.event.about === 'object') {
      this.config.event.about[code] = '';
    }
    if (this.config.event?.venue?.name && typeof this.config.event.venue.name === 'object') {
      this.config.event.venue.name[code] = '';
    }
    if (this.config.event?.venue?.address && typeof this.config.event.venue.address === 'object') {
      this.config.event.venue.address[code] = '';
    }

    // Tiers
    if (this.config.tiers) {
      this.config.tiers.forEach(tier => {
        if (tier.name && typeof tier.name === 'object') {
          tier.name[code] = '';
        }
        if (tier.desc && typeof tier.desc === 'object') {
          tier.desc[code] = '';
        }
        if (tier.note && typeof tier.note === 'object') {
          tier.note[code] = '';
        }
      });
    }

    // Artists
    if (this.config.artists) {
      this.config.artists.forEach(artist => {
        if (artist.name && typeof artist.name === 'object') {
          artist.name[code] = '';
        }
        if (artist.bio && typeof artist.bio === 'object') {
          artist.bio[code] = '';
        }
      });
    }

    // FAQs
    if (this.config.faqs) {
      this.config.faqs.forEach(faq => {
        if (faq.q && typeof faq.q === 'object') {
          faq.q[code] = '';
        }
        if (faq.a && typeof faq.a === 'object') {
          faq.a[code] = '';
        }
      });
    }
  }

  addLanguageToTranslationFields(code) {
    if (this.translations?.sections) {
      Object.keys(this.translations.sections).forEach(langKey => {
        if (this.translations.sections[langKey]) {
          // Add to all section fields
          this.addLanguageToSectionFields(this.translations.sections[langKey], code);
        }
      });
    }
  }

  addLanguageToSectionFields(section, code) {
    // Add to all text fields in section
    Object.keys(section).forEach(fieldKey => {
      const field = section[fieldKey];
      if (typeof field === 'string') {
        // Convert string to object with new language
        section[fieldKey] = {
          en: field, // Keep existing as English
          [code]: '' // Add empty translation for new language
        };
      } else if (typeof field === 'object' && field !== null) {
        // Field is already an object, add new language
        field[code] = '';
      }
    });
  }

  addLanguageToUpdateFields(code) {
    if (this.updates) {
      this.updates.forEach(update => {
        if (update.title && typeof update.title === 'object') {
          update.title[code] = '';
        }
        if (update.body && typeof update.body === 'object') {
          update.body[code] = '';
        }
        if (update.cta) {
          update.cta.forEach(ctaItem => {
            if (ctaItem.label && typeof ctaItem.label === 'object') {
              ctaItem.label[code] = '';
            }
          });
        }
      });
    }
  }

  renderLanguageSettings() {
    const container = document.getElementById('languageSettingsList');
    if (!container || !this.config.languages) return;

    container.innerHTML = '';
    
    Object.entries(this.config.languages).forEach(([code, lang]) => {
      const item = document.createElement('div');
      item.className = 'language-settings-item';
      
      const info = document.createElement('div');
      info.className = 'language-settings-info';
      
      const name = document.createElement('div');
      name.className = 'language-settings-name';
      name.textContent = lang.name;
      
      const codeSpan = document.createElement('div');
      codeSpan.className = 'language-settings-code';
      codeSpan.textContent = code;
      
      info.appendChild(name);
      info.appendChild(codeSpan);
      
      const actions = document.createElement('div');
      actions.className = 'language-settings-actions';
      
      if (lang.isDefault) {
        const defaultBadge = document.createElement('span');
        defaultBadge.className = 'language-settings-default';
        defaultBadge.textContent = 'Основной';
        actions.appendChild(defaultBadge);
      } else {
        // Active toggle
        const activeToggle = document.createElement('button');
        activeToggle.className = `language-settings-toggle ${lang.isActive ? 'active' : 'inactive'}`;
        activeToggle.textContent = lang.isActive ? 'Активен' : 'Неактивен';
        activeToggle.onclick = () => this.toggleLanguageActivity(code);
        actions.appendChild(activeToggle);
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'language-settings-remove';
        removeBtn.textContent = 'Удалить';
        removeBtn.onclick = () => this.removeLanguage(code);
        actions.appendChild(removeBtn);
      }
      
      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    });
  }

  async toggleLanguageActivity(code) {
    if (this.config.languages[code]) {
      this.config.languages[code].isActive = !this.config.languages[code].isActive;
      
      // If deactivating, also hide from site
      if (!this.config.languages[code].isActive) {
        this.config.languages[code].isVisible = false;
      }
      
      try {
        await this.saveConfig();
        this.renderLanguageList();
        this.renderLanguageSettings();
        this.showSuccess(`Язык ${this.config.languages[code].name} ${this.config.languages[code].isActive ? 'активирован' : 'деактивирован'}`);
      } catch (error) {
        console.error('Error toggling language:', error);
        this.showError('Ошибка при изменении статуса языка');
      }
    }
  }

  async removeLanguage(code) {
    if (code === 'en') {
      this.showError('Нельзя удалить основной язык');
      return;
    }

    if (confirm(`Вы уверены, что хотите удалить язык ${this.config.languages[code].name}? Все переводы будут потеряны.`)) {
      try {
        // Remove from languages
        delete this.config.languages[code];
        
        // Remove from all fields
        this.removeLanguageFromAllFields(code);
        
        // Save config
        await this.saveConfig();
        
        // Update interface
        this.renderLanguageList();
        this.renderLanguageSettings();
        this.renderAllFields();
        
        this.showSuccess(`Язык ${this.config.languages[code].name} удален`);
      } catch (error) {
        console.error('Error removing language:', error);
        this.showError('Ошибка при удалении языка');
      }
    }
  }

  removeLanguageFromAllFields(code) {
    // Remove from config fields
    this.removeLanguageFromConfigFields(code);
    
    // Remove from translation fields
    this.removeLanguageFromTranslationFields(code);
    
    // Remove from update fields
    this.removeLanguageFromUpdateFields(code);
  }

  removeLanguageFromConfigFields(code) {
    // Event fields
    if (this.config.event?.name && typeof this.config.event.name === 'object') {
      delete this.config.event.name[code];
    }
    if (this.config.event?.about && typeof this.config.event.about === 'object') {
      delete this.config.event.about[code];
    }
    if (this.config.event?.venue?.name && typeof this.config.event.venue.name === 'object') {
      delete this.config.event.venue.name[code];
    }
    if (this.config.event?.venue?.address && typeof this.config.event.venue.address === 'object') {
      delete this.config.event.venue.address[code];
    }

    // Tiers
    if (this.config.tiers) {
      this.config.tiers.forEach(tier => {
        if (tier.name && typeof tier.name === 'object') {
          delete tier.name[code];
        }
        if (tier.desc && typeof tier.desc === 'object') {
          delete tier.desc[code];
        }
        if (tier.note && typeof tier.note === 'object') {
          delete tier.note[code];
        }
      });
    }

    // Artists
    if (this.config.artists) {
      this.config.artists.forEach(artist => {
        if (artist.name && typeof artist.name === 'object') {
          delete artist.name[code];
        }
        if (artist.bio && typeof artist.bio === 'object') {
          delete artist.bio[code];
        }
      });
    }

    // FAQs
    if (this.config.faqs) {
      this.config.faqs.forEach(faq => {
        if (faq.q && typeof faq.q === 'object') {
          delete faq.q[code];
        }
        if (faq.a && typeof faq.a === 'object') {
          delete faq.a[code];
        }
      });
    }
  }

  removeLanguageFromTranslationFields(code) {
    if (this.translations?.sections) {
      Object.keys(this.translations.sections).forEach(langKey => {
        if (this.translations.sections[langKey]) {
          this.removeLanguageFromSectionFields(this.translations.sections[langKey], code);
        }
      });
    }
  }

  removeLanguageFromSectionFields(section, code) {
    Object.keys(section).forEach(fieldKey => {
      const field = section[fieldKey];
      if (typeof field === 'object' && field !== null) {
        delete field[code];
      }
    });
  }

  removeLanguageFromUpdateFields(code) {
    if (this.updates) {
      this.updates.forEach(update => {
        if (update.title && typeof update.title === 'object') {
          delete update.title[code];
        }
        if (update.body && typeof update.body === 'object') {
          delete update.body[code];
        }
        if (update.cta) {
          update.cta.forEach(ctaItem => {
            if (ctaItem.label && typeof ctaItem.label === 'object') {
              delete ctaItem.label[code];
            }
          });
        }
      });
    }
  }

  toggleLanguage(code) {
    // Toggle language visibility on site
    if (this.config.languages[code] && !this.config.languages[code].isDefault) {
      this.config.languages[code].isVisible = !this.config.languages[code].isVisible;
      this.renderLanguageList();
    }
  }

  renderAllFields() {
    // Re-render all fields to show new language structure
    this.renderConfig();
    this.renderTranslations();
    this.renderUpdates();
  }

  // Utility methods for translation fields
  copyMainLanguage(fieldName) {
    const mainInput = document.getElementById(`${fieldName}_en`);
    if (!mainInput) return;

    const mainValue = mainInput.value;
    if (!mainValue) return;

    // Copy to all other languages
    ['cs', 'uk'].forEach(lang => {
      const input = document.getElementById(`${fieldName}_${lang}`);
      if (input) {
        input.value = mainValue;
      }
    });

    this.showSuccess('EN текст скопирован во все языки');
  }

  clearAllLanguages(fieldName) {
    // Clear all language inputs for this field
    ['en', 'cs', 'uk'].forEach(lang => {
      const input = document.getElementById(`${fieldName}_${lang}`);
      if (input) {
        input.value = '';
      }
    });

    this.showSuccess('Все поля очищены');
  }

  // Dynamic form translation field methods
  copyMainLanguageDynamic(fieldName) {
    const mainInput = document.getElementById(`${fieldName}_en`);
    if (!mainInput) return;

    const mainValue = mainInput.value;
    if (!mainValue) return;

    // Copy to all other languages
    ['cs', 'uk'].forEach(lang => {
      const input = document.getElementById(`${fieldName}_${lang}`);
      if (input) {
        input.value = mainValue;
      }
    });

    this.showSuccess('EN текст скопирован во все языки');
  }

  clearAllLanguagesDynamic(fieldName) {
    // Clear all language inputs for this field
    ['en', 'cs', 'uk'].forEach(lang => {
      const input = document.getElementById(`${fieldName}_${lang}`);
      if (input) {
        input.value = '';
      }
    });

    this.showSuccess('Все поля очищены');
  }

  toggleUpdatesSettings() {
    const settingsSection = document.querySelector('.updates-settings-section');
    if (settingsSection) {
      settingsSection.classList.toggle('collapsed');
      
      // Save state to localStorage
      const isCollapsed = settingsSection.classList.contains('collapsed');
      localStorage.setItem('updatesSettingsCollapsed', isCollapsed);
    }
  }

  // Initialize updates settings state on load
  initializeUpdatesSettings() {
    const settingsSection = document.querySelector('.updates-settings-section');
    if (settingsSection) {
      const isCollapsed = localStorage.getItem('updatesSettingsCollapsed') === 'true';
      if (isCollapsed) {
        settingsSection.classList.add('collapsed');
      }
    }
  }

  // Auto-resize textarea function
  autoResizeTextarea(textarea) {
    // Check if textarea is properly rendered
    if (!textarea || !textarea.offsetHeight) {
      return;
    }
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the height to match the content
    const newHeight = Math.max(textarea.scrollHeight, textarea.offsetHeight);
    textarea.style.height = newHeight + 'px';
    
    // console.log(`Auto-resized textarea ${textarea.id || 'unnamed'}: ${newHeight}px`);
  }

  // Initialize auto-resize for all textareas
  initializeAutoResize() {
    // Find all textareas in the current interface
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
      // Set initial height
      this.autoResizeTextarea(textarea);
      
      // Add event listeners for input and focus
      textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
      textarea.addEventListener('focus', () => this.autoResizeTextarea(textarea));
      
      // Also handle paste events
      textarea.addEventListener('paste', () => {
        setTimeout(() => this.autoResizeTextarea(textarea), 0);
      });
    });
  }

  // Initialize auto-resize for modal textareas
  initializeModalAutoResize() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryInitialize = () => {
      attempts++;
      console.log(`Attempt ${attempts} to initialize modal auto-resize`);
      
      const textareas = document.querySelectorAll('#modalBody textarea');
      
      if (textareas.length > 0) {
        // Check if textareas have values or are properly rendered
        let hasContent = false;
        textareas.forEach(textarea => {
          if (textarea.value || textarea.offsetHeight > 0) {
            hasContent = true;
          }
        });
        
        if (hasContent || attempts >= maxAttempts) {
          // Initialize auto-resize for all textareas
          textareas.forEach(textarea => {
            // Set initial height
            this.autoResizeTextarea(textarea);
            
            // Add event listeners
            textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
            textarea.addEventListener('focus', () => this.autoResizeTextarea(textarea));
            textarea.addEventListener('paste', () => {
              setTimeout(() => this.autoResizeTextarea(textarea), 0);
            });
            
            // console.log(`Initialized auto-resize for textarea: ${textarea.id || 'unnamed'}`);
          });
          return;
        }
      }
      
      // Retry after a short delay
      if (attempts < maxAttempts) {
        setTimeout(tryInitialize, 100);
      }
    };
    
    // Start the retry process with initial delay
    setTimeout(tryInitialize, 200);
  }
}


// Initialize admin panel
const admin = new AdminPanel();

// Make admin globally accessible
window.admin = admin;

// FileManager is now imported from fileManager.js
// It will be automatically available as window.fileManager

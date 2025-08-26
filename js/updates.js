// Updates Module - Handles all update-related functionality
// Including rendering, filtering, deep linking, and state management

class UpdatesManager {
  constructor() {
    this.items = [];
    this.currentFilter = 'all';
    this.page = 0;
    this.pageSize = 3;
    this.pendingDeepOpen = null;
    this.currentLang = 'en';
    this.L = this.getTranslations();
    
    // DOM references
    this.list = null;
    this.toolbar = null;
    this.moreBtn = null;
    
    // Social meta state
    this.initialSocialMeta = {};
  }

  // Initialize translations for current language
  getTranslations(lang) {
    const translations = {
      en: {
        moreBtn: 'Load more',
        all: 'All'
      },
      cs: {
        moreBtn: 'Načíst více',
        all: 'Vše'
      },
      uk: {
        moreBtn: 'Завантажити ще',
        all: 'Всі'
      }
    };
    return translations[lang] || translations.en;
  }

  // Set current language and update translations
  setLanguage(lang) {
    this.currentLang = lang;
    this.L = this.getTranslations(lang);
    
    // Save to localStorage for persistence
    localStorage.setItem('site_language', lang);
    
    // Update UI elements
    this.updateMoreButtonText();
    this.updateFilterButtons();
    
    // Re-render updates with new language
    this.render();
  }

  // Detect current language from DOM or URL
  detectCurrentLanguage() {
    // Priority 1: Saved language from localStorage
    const savedLang = localStorage.getItem('site_language');
    if (savedLang && ['en', 'cs', 'uk'].includes(savedLang)) {
      return savedLang;
    }
    
    // Priority 2: HTML lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang && ['en', 'cs', 'uk'].includes(htmlLang)) {
      return htmlLang;
    }
    
    // Priority 3: URL lang parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && ['en', 'cs', 'uk'].includes(urlLang)) {
      return urlLang;
    }
    
    // Default to English
    return 'en';
  }

  // Initialize the updates manager
  async init() {
    // Detect and set initial language
    const detectedLang = this.detectCurrentLanguage();
    this.setLanguage(detectedLang);
    
    // Synchronize with main.js language if available
    if (window.CURRENT_LANG && window.CURRENT_LANG !== this.currentLang) {
      this.setLanguage(window.CURRENT_LANG);
    }
    
    // Load updates data
    await this.loadUpdatesData();
    
    // Setup DOM and event listeners
    this.setupDOM();
    this.setupEventListeners();
    
    // Setup social meta
    this.setupSocialMeta();
    
    // Process deep links if any
    this.processDeepLink();
    
    // Initial render
    this.render();
  }

  // Load updates data from JSON
  async loadUpdatesData() {
    try {
      const response = await fetch('updates.json');
      if (!response.ok) {
        throw new Error('Failed to load updates.json');
      }
      
      const data = await response.json();
      this.items = data.updates || [];
      
      // Ensure CONFIG is available for translations
      if (!window.CONFIG) {
        try {
          const configResponse = await fetch('config.json');
          if (configResponse.ok) {
            window.CONFIG = await configResponse.json();
          }
        } catch (error) {
          console.warn('🌐 Updates.js: Failed to load config.json:', error);
        }
      }
      
      // Process each update to ensure proper structure
      this.items.forEach((update, index) => {
        if (!update.id) {
          update.id = `update-${index + 1}`;
        }
      });
      
    } catch (error) {
      console.error('🌐 Updates.js: Error loading updates:', error);
      this.items = [];
    }
  }

  // Setup DOM references
  setupDOM() {
    // Get DOM elements
    this.container = document.getElementById('updatesList');
    this.toolbar = document.querySelector('.upd-toolbar');
    this.moreBtn = document.querySelector('.more-btn');
    
    if (!this.container) {
      console.warn('🌐 Updates.js: Updates container not found');
      return;
    }
    
    // Update more button text
    this.updateMoreButtonText();
    
    // Update filter buttons
    this.updateFilterButtons();
  }

  // Update more button text
  updateMoreButtonText() {
    if (this.moreBtn) {
      this.moreBtn.textContent = this.L.moreBtn;
    }
  }

  // Update filter buttons text
  updateFilterButtons() {
    if (!this.toolbar) return;
    
    const filterButtons = this.toolbar.querySelectorAll('.chip.sm');
    filterButtons.forEach(btn => {
      const filterType = btn.dataset.filter;
      if (!filterType) return;
      
      let translatedText = '';
      
      if (filterType === 'all') {
        translatedText = this.L.all;
      } else {
        // Get translation from CONFIG.updateCategories
        translatedText = this.getUpdateTypeTranslation(filterType);
      }
      
      if (translatedText && btn.textContent !== translatedText) {
        btn.textContent = translatedText;
      }
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Filter buttons
    if (this.toolbar) {
      this.toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip.sm');
        if (!btn) return;
        
        const filterType = btn.dataset.filter;
        if (filterType) {
          this.filterUpdates(filterType);
        }
      });
    }
    
    // Load more button
    if (this.moreBtn) {
      this.moreBtn.addEventListener('click', () => {
        this.loadMore();
      });
    }
    
    // Language change event from main.js
    document.addEventListener('languageChanged', (e) => {
      const newLang = e.detail.language;
      this.setLanguage(newLang);
    });
    
    // Update language switcher UI
    this.updateLanguageSwitcherUI();
  }

  // Process deep link from URL
  processDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const updateId = urlParams.get('update');
    
    if (updateId) {
      const targetUpdate = this.items.find(u => u.id === updateId);
      if (targetUpdate) {
        this.pendingDeepOpen = updateId;
        this.handleDeepLink();
      }
    }
  }

  // Render updates
  render() {
    if (!this.container) return;
    
    const startIndex = 0;
    const endIndex = this.items.length;
    const slice = this.items.slice(startIndex, endIndex);
    
    this.container.innerHTML = '';
    
    slice.forEach(update => {
      const card = this.renderUpdateCard(update);
      this.container.appendChild(card);
    });
    
    // Handle deep link if pending
    if (this.pendingDeepOpen) {
      this.handleDeepLink();
    }
  }

  // Handle deep link after rendering
  handleDeepLink() {
    if (!this.pendingDeepOpen || !this.container) return;
    
    const targetCard = this.container.querySelector(`[data-update-id="${this.pendingDeepOpen}"]`);
    if (targetCard) {
      // Expand the card
      const details = targetCard.querySelector('details');
      if (details) {
        details.setAttribute('open', '');
      }
      
      // Scroll to the card
      this.scrollToCard(targetCard);
      
      // Clear the pending deep link
      this.pendingDeepOpen = null;
    }
  }

  // Hide thumb preview for open card
  hideThumbPreview(card) {
    const thumb = card.querySelector('.thumb');
    if (thumb) {
      thumb.style.display = 'none';
    }
  }

  // Scroll to specific card
  scrollToCard(card) {
    if (!card) return;
    
    const headerHeight = 80;
    const cardTop = card.offsetTop - headerHeight;
    
    window.scrollTo({
      top: cardTop,
      behavior: 'smooth'
    });
  }

  // Clear URL parameter
  clearUrlParameter() {
    const u = new URL(location.href);
    u.searchParams.delete('u');
    history.replaceState(null, '', u);
  }

  // Show thumbnails for cards with has-thumb class
  // But don't show thumb for cards that are already expanded
  showThumbnails() {
    if (!this.list) {
      console.warn('🌐 Updates.js: No list found for showThumbnails');
      return;
    }
    
    this.list.querySelectorAll('.upd.has-thumb .preview .thumb').forEach(thumb => {
      const card = thumb.closest('.upd');
      const isExpanded = card.getAttribute('aria-expanded') === 'true';
      const isThumbMedia = card.classList.contains('thumb-is-media');
      
      // Only show thumb if card is collapsed OR if it's thumb-is-media
      if (!isExpanded || isThumbMedia) {
        thumb.style.display = 'block';
      } else {
        // Keep thumb hidden for expanded cards (unless it's thumb-is-media)
        thumb.style.display = 'none';
      }
    });
  }

  // Render individual update card
  renderUpdateCard(update) {
    const card = document.createElement('article');
    card.className = 'upd';
    card.dataset.updateId = update.id;
    
    // Get translations
    const titleTranslation = this.getTranslation(update.title, '');
    const bodyTranslation = this.getTranslation(update.body, '');
    const ctaLabelTranslation = this.getTranslation(update.cta?.label, '');
    
    // Build card HTML
    card.innerHTML = `
      <header>
        <div class="meta">
          <span class="date">${this.fmtDate(update.ts)}</span>
          ${update.type ? `<span class="type">${this.getUpdateTypeTranslation(update.type)}</span>` : ''}
          ${update.badge ? `<span class="badge ${update.badge}">${this.getUpdateBadgeTranslation(update.badge)}</span>` : ''}
        </div>
        <h3>${this.escapeHTML(titleTranslation)}</h3>
      </header>
      
      <details>
        <summary>${this.escapeHTML(bodyTranslation.split('\n')[0])}</summary>
        <div class="body">
          ${this.escapeHTML(bodyTranslation).split('\n').map(p => `<p>${p}</p>`).join('')}
        </div>
        ${update.cta ? `
          <div class="cta">
            <a href="${update.cta.url}" class="btn" target="_blank" rel="noopener noreferrer">
              ${this.escapeHTML(ctaLabelTranslation)}
            </a>
          </div>
        ` : ''}
      </details>
    `;
    
    return card;
  }

  // Setup card functionality (toggle, read more, share, etc.)
  setupCardFunctionality(wrap, u, paras, bodyId, headId, expandFirst) {
    // Share functionality
    wrap.querySelector('.share')?.addEventListener('click', async (ev) => {
      const uurl = new URL(location.href);
      if (u.id) uurl.searchParams.set('u', u.id);
      try {
        if (navigator.share) {
          await navigator.share({ 
            title: (() => {
              const translation = this.getTranslation(u.title, '') || document.title;
              return translation;
            })(),
            text: (() => {
              const translation = this.getTranslation(u.title, '') || '';
              return translation;
            })(),
            url: uurl.toString() 
          });
        } else {
          await navigator.clipboard.writeText(uurl.toString());
          ev.currentTarget.setAttribute('title', 'Copied!');
          setTimeout(() => ev.currentTarget.setAttribute('title', 'Share'), 1200);
        }
      } catch {}
    });

    // Lazy media loading
    const lazySlot = wrap.querySelector('.lazy-slot');
    let lazyMounted = false;
    const firstGallery = Array.isArray(u.gallery) && u.gallery[0];
    const mediaComparable = u.video ? '' : (u.media || firstGallery || '');
    const sameAsMedia = mediaComparable && u.thumb && mediaComparable === u.thumb;

    const mountLazyOnce = () => {
      if (lazyMounted) return;
      lazyMounted = true;
      if (sameAsMedia) {
        wrap.classList.add('thumb-is-media');
        lazySlot.remove();
      } else {
        lazySlot.insertAdjacentHTML('beforebegin', this.buildMediaHTML(u));
        lazySlot.remove();
      }
    };

    // Toggle functionality
    const updatesRoot = document.querySelector('.updates');
    const toggleBtn = wrap.querySelector('.toggle');
    const readMoreBtn = wrap.querySelector('.readmore');
    const pvThumb = wrap.querySelector('.preview .thumb');

    const openCard = (nowOpen) => {
      // Close other cards
      if (updatesRoot) {
        updatesRoot.querySelectorAll('.upd[aria-expanded="true"]').forEach(x => {
          if (x === wrap) return;
          x.setAttribute('aria-expanded', 'false');
          x.querySelector('.toggle')?.setAttribute('aria-expanded', 'false');
          const rb = x.querySelector('.readmore');
          if (rb) rb.textContent = this.L.readMore;
          const t = x.querySelector('.preview .thumb');
          if (t && !x.classList.contains('thumb-is-media')) t.style.display = '';
        });
      }
      
      // Open/close current card
      wrap.setAttribute('aria-expanded', String(nowOpen));
      toggleBtn.setAttribute('aria-expanded', String(nowOpen));
      if (readMoreBtn) {
        readMoreBtn.textContent = nowOpen ? this.L.readLess : this.L.readMore;
      }

      if (pvThumb) {
        if (nowOpen && !sameAsMedia) pvThumb.style.display = 'none';
        else if (!nowOpen) pvThumb.style.display = '';
      }

      if (nowOpen) {
        mountLazyOnce();
        this.scrollToCard(wrap);
        if (u.id) this.setUrlParameter(u.id);
        this.updateSocialMeta(u);
      } else {
        this.clearUrlParameter();
        this.resetSocialMeta();
      }
    };

    toggleBtn.addEventListener('click', () => 
      openCard(wrap.getAttribute('aria-expanded') !== 'true')
    );
    
    if (readMoreBtn) {
      readMoreBtn.addEventListener('click', () => openCard(true));
    }

    if (expandFirst) {
      mountLazyOnce();
      // Hide thumb immediately if card is expanded on creation
      if (pvThumb && !sameAsMedia) {
        pvThumb.style.display = 'none';
      }
    }
  }

  // Build media HTML
  buildMediaHTML(u) {
    const mediaAlt = u.mediaAlt || u.alt || '';
    if (u.video) {
      return `<div class="media">
        <video controls preload="metadata" ${u.poster ? `poster="${u.poster}"` : ''}>
          <source src="${u.video}" type="video/mp4">
        </video>
      </div>`;
    }
    if (Array.isArray(u.gallery) && u.gallery.length) {
      return `<div class="media">${
        u.gallery.map(src => `<img loading="lazy" decoding="async" src="${src}" alt="${this.escapeHTML(u.galleryAlt || mediaAlt)}">`).join('')
      }</div>`;
    }
    if (u.media) {
      return `<div class="media"><img loading="lazy" decoding="async" src="${u.media}" alt="${this.escapeHTML(mediaAlt)}"></div>`;
    }
    return '';
  }

  // Social meta management
  setupSocialMeta() {
    // Store initial social meta values
    this.initialSocialMeta = {
      title: document.title,
      ogTitle: this.getMetaContent('og:title'),
      ogDesc: this.getMetaContent('og:description'),
      twitterTitle: this.getMetaContent('twitter:title'),
      twitterDesc: this.getMetaContent('twitter:description')
    };
  }
  
  updateSocialMeta(update) {
    if (!update) return;
    
    const title = this.getTranslation(update.title, '') || this.initialSocialMeta.title;
    const body = this.getTranslation(update.body, '') || '';
    
    // Update Open Graph
    this.setMetaContent('og:title', title);
    this.setMetaContent('og:description', body);
    
    // Update Twitter
    this.setMetaContent('twitter:title', title);
    this.setMetaContent('twitter:description', body);
  }
  
  resetSocialMeta() {
    // Restore initial social meta values
    this.setMetaContent('og:title', this.initialSocialMeta.ogTitle);
    this.setMetaContent('og:description', this.initialSocialMeta.ogDesc);
    this.setMetaContent('twitter:title', this.initialSocialMeta.twitterTitle);
    this.setMetaContent('twitter:description', this.initialSocialMeta.twitterDesc);
  }
  
  getMetaContent(property) {
    const meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    return meta ? meta.getAttribute('content') : '';
  }
  
  setMetaContent(property, content) {
    let meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      if (property.startsWith('og:')) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  // Set URL parameter
  setUrlParameter(key, value) {
    const url = new URL(window.location);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url);
  }
  
  clearUrlParameter(key) {
    this.setUrlParameter(key, null);
  }

  // Utility functions
  daysAgo(ts) {
    const now = new Date();
    const then = new Date(ts);
    const diffTime = Math.abs(now - then);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  fmtDate(ts) {
    const date = new Date(ts);
    const result = date.toLocaleDateString(this.currentLang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return result;
  }

  escapeHTML(s) {
    if (!s) return '';
    const result = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return result;
  }

  withUTM(url, medium, campaign) {
    if (!url || !url.startsWith('http')) {
      return url;
    }
    
    const separator = url.includes('?') ? '&' : '?';
    const result = `${url}${separator}utm_source=artbat2025&utm_medium=${medium}&utm_campaign=${campaign}`;
    return result;
  }

  getTranslation(field, fallback = '') {
    if (!field) return fallback;
    
    if (typeof field === 'object') {
      const result = field[this.currentLang] || field.en || fallback;
      return result;
    }
    
    return field;
  }

  getUpdateTypeTranslation(type) {
    if (!type) return '';
    
    if (window.CONFIG && window.CONFIG.updateCategories && window.CONFIG.updateCategories[type]) {
      const translation = this.getTranslation(window.CONFIG.updateCategories[type], type);
      return translation;
    }
    
    // Fallback to original type
    return type;
  }

  getUpdateBadgeTranslation(badgeType) {
    if (!badgeType) return '';
    
    if (window.CONFIG && window.CONFIG.updateBadges && window.CONFIG.updateBadges[badgeType]) {
      const translation = this.getTranslation(window.CONFIG.updateBadges[badgeType], badgeType);
      return translation;
    }
    
    // Fallback to original badge type
    return badgeType;
  }

  // Get language flag emoji
  getLangFlag(lang) {
    const flags = { en: '🇬🇧', cs: '🇨🇿', uk: '🇺🇦' };
    const result = flags[lang] || '🌐';
    return result;
  }

  // Get language name
  getLangName(lang) {
    const names = { en: 'EN', cs: 'CS', uk: 'UK' };
    const result = names[lang] || 'EN';
    return result;
  }

  // Helper functions
  filterUpdates(filterType) {
    if (!this.toolbar) return;
    
    // Update active filter button
    this.toolbar.querySelectorAll('.chip.sm').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.filter === filterType);
    });
    
    // Filter updates
    const filtered = filterType === 'all' ? 
      this.items : 
      this.items.filter(item => item.type === filterType);
    
    // Re-render with filtered items
    this.renderFiltered(filtered);
  }
  
  renderFiltered(filteredItems) {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    
    filteredItems.forEach(update => {
      const card = this.renderUpdateCard(update);
      this.container.appendChild(card);
    });
  }
  
  loadMore() {
    // For now, just re-render all items
    // In the future, this could implement pagination
    this.render();
  }
  
  updateLanguageSwitcherUI() {
    // Update language switcher UI if it exists
    const langSwitcher = document.querySelector('.lang-switcher');
    if (langSwitcher) {
      // Update current language display
      const langCurrent = langSwitcher.querySelector('.lang-current');
      if (langCurrent) {
        const langFlag = langCurrent.querySelector('.lang-flag');
        const langName = langCurrent.querySelector('.lang-name');
        if (langFlag) langFlag.textContent = this.getLangFlag(this.currentLang);
        if (langName) langName.textContent = this.getLangName(this.currentLang);
      }
      
      // Update dropdown options
      const langDropdown = langSwitcher.querySelector('.lang-dropdown');
      if (langDropdown) {
        const options = langDropdown.querySelectorAll('.lang-option');
        options.forEach(option => {
          const lang = option.getAttribute('data-lang');
          if (lang) {
            const flag = option.querySelector('.lang-flag');
            const name = option.querySelector('.lang-name');
            if (flag) flag.textContent = this.getLangFlag(lang);
            if (name) name.textContent = this.getLangName(lang);
          }
        });
      }
    }
  }
}

// Export for use in main.js
window.UpdatesManager = UpdatesManager;

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
    this.container = null;
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
        readMore: 'Read more',
        readLess: 'Read less',
        all: 'All'
      },
      cs: {
        moreBtn: 'Načíst více',
        readMore: 'Více',
        readLess: 'Méně',
        all: 'Vše'
      },
      uk: {
        moreBtn: 'Завантажити ще',
        readMore: 'Читати далі',
        readLess: 'Приховати',
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
      
      const updatesRaw = await response.json();
      // Sort updates: pinned first, then by date (newest first)
      this.items = [...updatesRaw].sort((a, b) => 
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.ts) - new Date(a.ts)
      );
      
      // Process each update to ensure proper structure
      this.items.forEach((update, index) => {
        if (!update.id) {
          update.id = `update-${index + 1}`;
        }
      });
      
      // Hide loading placeholder and show content
      this.hideLoadingPlaceholder();
      
    } catch (error) {
      console.error('🌐 Updates.js: Error loading updates:', error);
      this.items = [];
      this.showErrorState();
    }
  }

  // Setup DOM references
  setupDOM() {
    // Get DOM elements
    this.container = document.getElementById('updatesList');
    this.toolbar = document.querySelector('.upd-toolbar');
    this.moreBtn = document.querySelector('.more-btn') || document.getElementById('updatesMoreBtn');
    
    if (!this.container) {
      console.warn('🌐 Updates.js: Updates container not found');
      return;
    }
    
    // Show loading placeholder
    this.showLoadingPlaceholder();
    
    // Ensure "Load more" button exists
    if (!this.moreBtn) {
      const holder = document.createElement('div');
      holder.className = 'upd-more';
      holder.innerHTML = `<button class="more-btn btn">${this.L.moreBtn}</button>`;
      this.container.after(holder);
      this.moreBtn = holder.querySelector('.more-btn');
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

  // Show loading placeholder
  showLoadingPlaceholder() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="updates-loading">
        <div class="loading-placeholder">
          <div class="placeholder-item skeleton-update">
            <div class="placeholder-header">
              <div class="placeholder-badge skeleton-text"></div>
              <div class="placeholder-date skeleton-text"></div>
            </div>
            <div class="placeholder-title skeleton-text"></div>
            <div class="placeholder-preview skeleton-text"></div>
          </div>
          <div class="placeholder-item skeleton-update">
            <div class="placeholder-header">
              <div class="placeholder-badge skeleton-text"></div>
              <div class="placeholder-date skeleton-text"></div>
            </div>
            <div class="placeholder-title skeleton-text"></div>
            <div class="placeholder-preview skeleton-text"></div>
          </div>
          <div class="placeholder-item skeleton-update">
            <div class="placeholder-header">
              <div class="placeholder-badge skeleton-text"></div>
              <div class="placeholder-date skeleton-text"></div>
            </div>
            <div class="placeholder-title skeleton-text"></div>
            <div class="placeholder-preview skeleton-text"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Hide loading placeholder
  hideLoadingPlaceholder() {
    if (!this.container) return;
    
    // Remove loading placeholder
    const loadingEl = this.container.querySelector('.updates-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  // Show error state
  showErrorState() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="updates-error">
        <div class="error-message">
          <p>⚠️ Failed to load updates</p>
          <button onclick="location.reload()" class="btn">Retry</button>
        </div>
      </div>
    `;
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
      if (newLang) {
        this.setLanguage(newLang);
      }
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
    
    // Filter updates based on current filter
    const filtered = this.currentFilter === 'all' ? 
      this.items : 
      this.items.filter(item => item.type === this.currentFilter);
    
    // Get slice for current page
    const slice = filtered.slice(0, (this.page + 1) * this.pageSize);
    
    this.container.innerHTML = '';
    
    slice.forEach(update => {
      const shouldExpand = this.pendingDeepOpen && update.id === this.pendingDeepOpen;
      const card = this.renderUpdateCard(update, shouldExpand);
      this.container.appendChild(card);
    });
    
    // Show/hide load more button
    if (this.moreBtn) {
      const hasMoreItems = slice.length < filtered.length;
      this.moreBtn.style.display = hasMoreItems ? 'inline-flex' : 'none';
      
      // Update button text
      if (hasMoreItems) {
        const remaining = filtered.length - slice.length;
        const nextBatch = Math.min(remaining, this.pageSize);
        this.moreBtn.textContent = `${this.L.moreBtn} (${nextBatch})`;
      }
    }
    
    // Handle deep link if pending
    if (this.pendingDeepOpen) {
      this.handleDeepLink();
    }
    
    // Show thumbnails
    this.showThumbnails();
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
    const thumb = card.querySelector('.preview .thumb');
    if (thumb && !card.classList.contains('thumb-is-media')) {
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
    if (!this.container) {
      console.warn('🌐 Updates.js: No container found for showThumbnails');
      return;
    }
    
    this.container.querySelectorAll('.upd.has-thumb .preview .thumb').forEach(thumb => {
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
  renderUpdateCard(update, shouldExpand = false) {
    const isNew = this.daysAgo(update.ts) <= 7;
    
    // Parse body text
    const bodyText = this.getTranslation(update.body, '') || '';
    let paras = [];
    
    if (Array.isArray(bodyText)) {
      paras = bodyText.filter(line => line.trim());
    } else if (typeof bodyText === 'string') {
      paras = bodyText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    }
    
    // Create snippet from first two lines
    let snippet = '';
    if (paras.length > 0) {
      const firstTwoLines = paras.slice(0, 2).join(' ');
      snippet = `<div class="snippet">${this.escapeHTML(firstTwoLines)}</div>`;
    }
    
    // Handle CTAs
    const ctas = (update.cta || []);
    const primary = ctas.find(c => c.primary) || ctas[0] || null;
    const extras = ctas.filter(c => c !== primary);
    
    const btnHTML = (c, extra = false) => {
      const url = this.withUTM(c.url || '#', 'updates', 'artbat2025');
      const external = /^https?:\/\//i.test(url);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const cls = (c.primary ? 'btn primary' : 'btn') + (extra ? ' extra' : '');
      const label = this.getTranslation(c.label, 'Learn more') || 'Learn more';
      return `<a class="${cls}" href="${url}"${attrs}>${this.escapeHTML(label)}</a>`;
    };
    
    // Handle thumbnail
    let thumbSrc = '';
    if (update.thumb) {
      thumbSrc = update.thumb;
    } else if (Array.isArray(update.gallery) && update.gallery.length > 0) {
      thumbSrc = update.gallery[0];
    } else if (update.media) {
      thumbSrc = update.media;
    }
    
    const thumbAlt = update.thumbAlt || update.alt || '';
    const thumbHTML = thumbSrc ? 
      `<img class="thumb" src="${thumbSrc}" alt="${this.escapeHTML(thumbAlt)}" loading="lazy" decoding="async">` : '';
    
    // Create card element
    const idSafe = (update.id || Math.random().toString(36).slice(2));
    const bodyId = `upd-body-${idSafe}`;
    const headId = `upd-head-${idSafe}`;
    
    const wrap = document.createElement('article');
    wrap.className = 'upd' + (thumbSrc ? ' has-thumb' : '');
    if (update.pinned) wrap.classList.add('pinned');
    wrap.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
    if (update.id) wrap.dataset.id = update.id;
    
    const shareIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6c.73 0 1.4-.26 1.93-.69l3.2 1.84a3 3 0 1 0 .7-1.24l-3.21-1.85A2.96 2.96 0 0 0 15 8Zm-6 8a3 3 0 1 0 2.83 4H12a3 3 0 0 0 0-6c-.73 0-1.4.26-1.93.69l-3.2 1.84a3 3 0 1 0 .7 1.24l3.21 1.85c-.24.43-.38.93-.38 1.46Z"/>
      </svg>`;
    
    wrap.innerHTML = `
      <div class="head">
        <button class="toggle" aria-expanded="${shouldExpand ? 'true' : 'false'}" aria-controls="${bodyId}" id="${headId}">
          <div class="hrow1">
            <div class="hleft">
              <time datetime="${update.ts}">${this.fmtDate(update.ts)}</time>
              ${isNew ? `<span class="badge new">${this.getUpdateBadgeTranslation('new')}</span>` : ''}
              ${update.type ? `<span class="badge">${this.getUpdateTypeTranslation(update.type) || update.type}</span>` : ''}
            </div>
            <div class="hright">
              ${update.important ? `<span class="badge imp">${this.getUpdateBadgeTranslation('important')}</span>` : ''}
            </div>
          </div>
          <div class="hrow2"><span class="title">${this.escapeHTML(this.getTranslation(update.title, '') || '')}</span></div>
        </button>
        <span class="chev" aria-hidden="true">▾</span>
      </div>
      
      <div class="preview">
        ${snippet}
        ${paras.length > 2 ? `<button class="readmore" type="button">${this.L.readMore || 'Read more'}</button>` : ''}
        ${thumbHTML}
      </div>
      
      <div id="${bodyId}" class="body" role="region" aria-labelledby="${headId}">
        ${paras.slice(2).map(p => `<p class="text">${this.escapeHTML(p)}</p>`).join('')}
        <div class="lazy-slot"></div>
      </div>
      
      <div class="footer">
        <div class="left">
          ${primary ? btnHTML(primary, false) : ''}
          ${extras.map(c => btnHTML(c, true)).join('')}
        </div>
        <div class="right">
          <button class="share" aria-label="Share update" title="Share" data-id="${this.escapeHTML(update.id || '')}">${shareIcon}</button>
        </div>
      </div>
    `;
    
    // Setup card functionality
    this.setupCardFunctionality(wrap, update, paras, bodyId, headId, shouldExpand);
    
    return wrap;
  }

  // Setup card functionality (toggle, read more, share, etc.)
  setupCardFunctionality(wrap, update, paras, bodyId, headId, shouldExpand) {
    // Toggle functionality
    const toggleBtn = wrap.querySelector('.toggle');
    const head = wrap.querySelector('.head');
    const body = wrap.querySelector(`#${bodyId}`);
    const chev = wrap.querySelector('.chev');
    const readMoreBtn = wrap.querySelector('.readmore');
    const lazySlot = wrap.querySelector('.lazy-slot');
    
    // Lazy media loading
    let lazyMounted = false;
    const firstGallery = Array.isArray(update.gallery) && update.gallery[0];
    const mediaComparable = update.video ? '' : (update.media || firstGallery || '');
    const sameAsMedia = mediaComparable && update.thumb && mediaComparable === update.thumb;
    
    const mountLazyOnce = () => {
      if (lazyMounted || !lazySlot) return;
      lazyMounted = true;
      
      if (sameAsMedia) {
        wrap.classList.add('thumb-is-media');
        lazySlot.remove();
      } else {
        const mediaHTML = this.buildMediaHTML(update);
        if (mediaHTML) {
          lazySlot.insertAdjacentHTML('beforebegin', mediaHTML);
        }
        lazySlot.remove();
      }
    };
    
    const toggleCard = () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      const newExpanded = !isExpanded;
      
      // Update button state
      toggleBtn.setAttribute('aria-expanded', newExpanded);
      wrap.setAttribute('aria-expanded', newExpanded);
      chev.textContent = newExpanded ? '▴' : '▾';
      
      // Show/hide body content
      if (newExpanded) {
        body.style.display = 'block';
        this.hideThumbPreview(wrap);
        
        // Load media when expanding
        mountLazyOnce();
      } else {
        body.style.display = 'none';
        this.showThumbnails();
      }
      
      // Update read more button text
      if (readMoreBtn) {
        readMoreBtn.textContent = newExpanded ? (this.L.readLess || 'Read less') : (this.L.readMore || 'Read more');
      }
    };
    
    if (toggleBtn && body) {
      // Click on toggle button
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCard();
      });
      
      // Click on entire head area
      if (head) {
        head.addEventListener('click', (e) => {
          // Don't trigger if clicking on buttons inside head
          if (e.target.closest('button')) return;
          toggleCard();
        });
      }
      
      // Set initial state
      if (shouldExpand) {
        toggleCard(); // Trigger the toggle to expand
        mountLazyOnce(); // Load media immediately if expanded on creation
      } else {
        body.style.display = 'none'; // Hide body initially
      }
    }
    
    // Read more functionality
    if (readMoreBtn) {
      readMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Expand the card when read more is clicked
        if (toggleBtn) {
          toggleCard();
        }
      });
    }
    
    // Share functionality
    const shareBtn = wrap.querySelector('.share');
    if (shareBtn) {
      shareBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const uurl = new URL(location.href);
        if (update.id) uurl.searchParams.set('u', update.id);
        try {
          if (navigator.share) {
            await navigator.share({ 
              title: this.getTranslation(update.title, '') || document.title,
              text: this.getTranslation(update.title, '') || '',
              url: uurl.toString() 
            });
          } else {
            await navigator.clipboard.writeText(uurl.toString());
            ev.currentTarget.setAttribute('title', 'Copied!');
            setTimeout(() => ev.currentTarget.setAttribute('title', 'Share'), 1200);
          }
        } catch (error) {
          console.warn('🌐 Updates.js: Share failed:', error);
        }
      });
    }
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
    // Use global function from main.js if available
    if (window.getTranslation) {
      return window.getTranslation(field, fallback);
    }
    
    // Fallback implementation
    if (!field) return fallback;
    
    if (typeof field === 'object') {
      return field[this.currentLang] || field.en || fallback;
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

  // Get language flag emoji - use global function from main.js
  getLangFlag(lang) {
    if (window.getLangFlag) {
      return window.getLangFlag(lang);
    }
    // Fallback implementation
    const flags = { en: '🇬🇧', cs: '🇨🇿', uk: '🇺🇦' };
    return flags[lang] || '🌐';
  }

  // Get language name - use global function from main.js
  getLangName(lang) {
    if (window.getLangName) {
      return window.getLangName(lang);
    }
    // Fallback implementation
    const names = { en: 'EN', cs: 'CS', uk: 'UK' };
    return names[lang] || 'EN';
  }

  // Helper functions
  filterUpdates(filterType) {
    if (!this.toolbar) return;
    
    // Update active filter button
    this.toolbar.querySelectorAll('.chip.sm').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.filter === filterType);
    });
    
    // Set current filter and reset page
    this.currentFilter = filterType;
    this.page = 0;
    this.pendingDeepOpen = null;
    
    // Re-render with filtered items
    this.render();
  }
  
  loadMore() {
    this.page++;
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

  // Build media HTML for gallery, video, or single media
  buildMediaHTML(update) {
    const mediaAlt = update.mediaAlt || update.alt || '';
    
    // Video
    if (update.video) {
      return `<div class="media">
        <video controls preload="metadata" ${update.poster ? `poster="${update.poster}"` : ''}>
          <source src="${update.video}" type="video/mp4">
        </video>
      </div>`;
    }
    
    // Gallery (multiple images)
    if (Array.isArray(update.gallery) && update.gallery.length > 0) {
      return `<div class="media">${
        update.gallery.map((src, index) => {
          const clickHandler = window.openLightbox ? `onclick="window.openLightbox(${index})"` : '';
          const cursorStyle = window.openLightbox ? 'cursor: pointer;' : '';
          return `<img loading="lazy" decoding="async" src="${src}" alt="${this.escapeHTML(update.galleryAlt || mediaAlt)}" style="${cursorStyle}" ${clickHandler}>`;
        }).join('')
      }</div>`;
    }
    
    // Single media file
    if (update.media) {
      const clickHandler = window.openLightbox ? 'onclick="window.openLightbox(0)"' : '';
      const cursorStyle = window.openLightbox ? 'cursor: pointer;' : '';
      return `<div class="media"><img loading="lazy" decoding="async" src="${update.media}" alt="${this.escapeHTML(mediaAlt)}" style="${cursorStyle}" ${clickHandler}></div>`;
    }
    
    return '';
  }
}

// Export for use in main.js
window.UpdatesManager = UpdatesManager;

// UpdatesManager will be initialized by main.js to ensure proper order
// This prevents conflicts and ensures updates are ready when needed
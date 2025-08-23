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
  getTranslations() {
    const lang = this.currentLang || 'en';
    return {
      en: { moreBtn: 'Load more', readMore: 'Read more', readLess: 'Read less', NEW: 'NEW', IMPORTANT: 'IMPORTANT' },
      uk: { moreBtn: 'Показати щё', readMore: 'Читати далі', readLess: 'Приховати', NEW: 'NEW', IMPORTANT: 'IMPORTANT' },
      cs: { moreBtn: 'Načíst další', readMore: 'Více', readLess: 'Méně', NEW: 'NEW', IMPORTANT: 'IMPORTANT' }
    }[lang] || { moreBtn: 'Load more', readMore: 'Read more', readLess: 'Read less', NEW: 'NEW', IMPORTANT: 'IMPORTANT' };
  }

  // Set current language and update translations
  setLanguage(lang) {
    this.currentLang = lang;
    this.L = this.getTranslations();
    this.updateMoreButtonText();
  }

  // Initialize the updates manager
  async init() {
    await this.loadUpdatesData();
    this.setupDOM();
    this.setupEventListeners();
    this.processDeepLink();
    this.render();
    this.setupSocialMeta();
  }

  // Load updates data from JSON
  async loadUpdatesData() {
    try {
      const response = await fetch('updates.json', { cache: 'no-store' });
      const updatesRaw = await response.json();
      this.items = [...updatesRaw].sort((a, b) => 
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.ts) - new Date(a.ts)
      );
    } catch (error) {
      console.error('Error loading updates:', error);
      this.items = [];
    }
  }

  // Setup DOM references
  setupDOM() {
    this.list = document.getElementById('updatesList');
    this.toolbar = document.querySelector('.upd-toolbar');
    this.moreBtn = document.getElementById('updatesMoreBtn');
    
    if (!this.list) return;
    
    // Ensure "Load more" button exists
    if (!this.moreBtn) {
      const holder = document.createElement('div');
      holder.className = 'upd-more';
      holder.innerHTML = `<button id="updatesMoreBtn" class="btn">Load more</button>`;
      this.list.after(holder);
      this.moreBtn = holder.querySelector('#updatesMoreBtn');
    }
    
    this.updateMoreButtonText();
  }

  // Update more button text
  updateMoreButtonText() {
    if (this.moreBtn) {
      this.moreBtn.textContent = this.L.moreBtn;
      this.moreBtn.setAttribute('aria-label', this.L.moreBtn);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Filter buttons
    this.toolbar?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      
      this.toolbar.querySelectorAll('.chip.sm').forEach(b => 
        b.classList.toggle('is-active', b === btn)
      );
      
      this.currentFilter = btn.getAttribute('data-filter');
      this.page = 0;
      this.pendingDeepOpen = null;
      this.resetSocialMeta();
      this.render();
    });

    // Load more button
    this.moreBtn?.addEventListener('click', () => {
      this.page++;
      this.render();
      this.showThumbnails();
    });
  }

  // Process deep link from URL
  processDeepLink() {
    const qs = new URL(location.href).searchParams;
    const deepId = qs.get('u');
    
    if (deepId) {
      const idx = this.items.findIndex(i => (i.id || '') === deepId);
      if (idx >= 0) {
        this.page = Math.floor(idx / this.pageSize);
        this.pendingDeepOpen = deepId;
        // Force filter to All to not hide the needed card
        this.toolbar?.querySelectorAll('.chip.sm').forEach(b => 
          b.classList.toggle('is-active', b.dataset.filter === 'all')
        );
        this.currentFilter = 'all';
      }
    }
  }

  // Render updates
  render() {
    if (!this.list) return;
    
    this.list.innerHTML = '';
    const filtered = this.items.filter(i => 
      this.currentFilter === 'all' ? true : i.type === this.currentFilter
    );
    const slice = filtered.slice(0, (this.page + 1) * this.pageSize);

    slice.forEach((u) => {
      const shouldExpand = this.pendingDeepOpen && u.id === this.pendingDeepOpen;
      const card = this.renderUpdateCard(u, shouldExpand);
      this.list.appendChild(card);
    });

    // Show/hide load more button
    if (this.moreBtn) {
      this.moreBtn.style.display = slice.length < filtered.length ? 'inline-flex' : 'none';
    }

    // Handle deep link processing
    this.handleDeepLink();
    
    // Show thumbnails
    this.showThumbnails();
  }

  // Handle deep link after rendering
  handleDeepLink() {
    if (!this.pendingDeepOpen || !this.list) return;
    
    const target = Array.from(this.list.querySelectorAll('.upd'))
      .find(x => x.dataset.id === this.pendingDeepOpen);
    
    if (target) {
      // Add flash effect
      target.classList.add('flash');
      setTimeout(() => target.classList.remove('flash'), 1200);
      
      // Hide thumb preview since card is open
      this.hideThumbPreview(target);
      
      // Auto-scroll to card
      this.scrollToCard(target);
      
      // Clear URL after showing card
      setTimeout(() => {
        this.clearUrlParameter();
      }, 1500);
      
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
    const hdr = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 64;
    const y = card.getBoundingClientRect().top + window.scrollY - (hdr + 12);
    window.scrollTo({ top: y, behavior: 'smooth' });
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
    if (!this.list) return;
    
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
  renderUpdateCard(u, expandFirst = false) {
    const isNew = this.daysAgo(u.ts) <= 7;
    
    // Parse body text
    const bodyText = this.getTranslation(u.body, '') || '';
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
    const ctas = (u.cta || []);
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
    if (u.thumb) {
      thumbSrc = u.thumb;
    } else if (Array.isArray(u.gallery) && u.gallery.length > 0) {
      thumbSrc = u.gallery[0];
    } else if (u.media) {
      thumbSrc = u.media;
    }
    
    const thumbAlt = u.thumbAlt || u.alt || '';
    const thumbHTML = thumbSrc ? 
      `<img class="thumb" src="${thumbSrc}" alt="${this.escapeHTML(thumbAlt)}" loading="lazy" decoding="async">` : '';

    // Create card element
    const idSafe = (u.id || Math.random().toString(36).slice(2));
    const bodyId = `upd-body-${idSafe}`;
    const headId = `upd-head-${idSafe}`;

    const wrap = document.createElement('article');
    wrap.className = 'upd' + (thumbSrc ? ' has-thumb' : '');
    if (u.pinned) wrap.classList.add('pinned');
    wrap.setAttribute('aria-expanded', expandFirst ? 'true' : 'false');
    if (u.id) wrap.dataset.id = u.id;

    const shareIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6c.73 0 1.4-.26 1.93-.69l3.2 1.84a3 3 0 1 0 .7-1.24l-3.21-1.85A2.96 2.96 0 0 0 15 8Zm-6 8a3 3 0 1 0 2.83 4H12a3 3 0 0 0 0-6c-.73 0-1.4.26-1.93.69l-3.2-1.84a3 3 0 1 0-.7 1.24l3.21 1.85c-.24.43-.38.93-.38 1.46Z"/>
      </svg>`;

    wrap.innerHTML = `
      <div class="head">
        <button class="toggle" aria-expanded="${expandFirst ? 'true' : 'false'}" aria-controls="${bodyId}" id="${headId}">
          <div class="hrow1">
            <div class="hleft">
              <time datetime="${u.ts}">${this.fmtDate(u.ts)}</time>
              ${isNew ? `<span class="badge new">${this.L.NEW}</span>` : ''}
              ${u.type ? `<span class="badge">${this.getUpdateTypeTranslation(u.type) || u.type}</span>` : ''}
            </div>
            <div class="hright">
              ${u.important ? `<span class="badge imp">${this.getUpdateBadgeTranslation('important')}</span>` : ''}
            </div>
          </div>
          <div class="hrow2"><span class="title">${this.escapeHTML(this.getTranslation(u.title, '') || '')}</span></div>
        </button>
        <span class="chev" aria-hidden="true">▾</span>
      </div>

      <div class="preview">
        ${snippet}
        ${paras.length > 2 ? `<button class="readmore" type="button">${this.L.readMore}</button>` : ''}
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
          <button class="share" aria-label="Share update" title="Share" data-id="${this.escapeHTML(u.id || '')}">${shareIcon}</button>
        </div>
      </div>
    `;

    // Setup card functionality
    this.setupCardFunctionality(wrap, u, paras, bodyId, headId, expandFirst);
    
    return wrap;
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
            title: this.getTranslation(u.title, '') || document.title, 
            text: this.getTranslation(u.title, '') || '', 
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
    const DEFAULT_SHARE_IMAGE = 'assets/updates/social-default.jpg';
    const metaSel = (attr, key) => document.querySelector(`meta[${attr}="${key}"]`);
    const ensureMeta = (attr, key) => {
      let el = metaSel(attr, key);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      return el;
    };
    
    const setOg = (prop, content) => {
      if (!content) return;
      ensureMeta('property', prop).setAttribute('content', content);
    };
    const setTw = (name, content) => {
      if (!content) return;
      ensureMeta('name', name).setAttribute('content', content);
    };

    this.initialSocialMeta = {
      title: document.title,
      desc: metaSel('name', 'description')?.getAttribute('content') || '',
      ogTitle: metaSel('property', 'og:title')?.getAttribute('content') || '',
      ogDesc: metaSel('property', 'og:description')?.getAttribute('content') || '',
      ogImage: metaSel('property', 'og:image')?.getAttribute('content') || DEFAULT_SHARE_IMAGE,
      url: location.href
    };
  }

  // Update social meta for specific update
  updateSocialMeta(u) {
    const bodyText = this.getTranslation(u.body, '') || '';
    let firstPara = this.initialSocialMeta.desc;
    
    if (Array.isArray(bodyText) && bodyText.length > 0) {
      firstPara = bodyText[0].trim() || this.initialSocialMeta.desc;
    } else if (typeof bodyText === 'string') {
      firstPara = bodyText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)[0] || this.initialSocialMeta.desc;
    }
    
    const image = u.media || (Array.isArray(u.gallery) && u.gallery[0]) || u.thumb || this.initialSocialMeta.ogImage;
    const title = this.getTranslation(u.title, '') ? 
      `${this.getTranslation(u.title, '')} • ${this.initialSocialMeta.title}` : this.initialSocialMeta.title;
    
    document.title = title;
    
    const metaSel = (attr, key) => document.querySelector(`meta[${attr}="${key}"]`);
    const ensureMeta = (attr, key) => {
      let el = metaSel(attr, key);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      return el;
    };
    
    const setOg = (prop, content) => {
      if (!content) return;
      ensureMeta('property', prop).setAttribute('content', content);
    };
    const setTw = (name, content) => {
      if (!content) return;
      ensureMeta('name', name).setAttribute('content', content);
    };
    
    if (this.initialSocialMeta.desc) {
      ensureMeta('name', 'description').setAttribute('content', firstPara);
    }
    setOg('og:title', this.getTranslation(u.title, '') || this.initialSocialMeta.ogTitle || this.initialSocialMeta.title);
    setOg('og:description', firstPara);
    setOg('og:image', image);
    setOg('og:url', new URL(location.href).toString());
    setTw('twitter:card', 'summary_large_image');
    setTw('twitter:title', this.getTranslation(u.title, '') || this.initialSocialMeta.ogTitle || this.initialSocialMeta.title);
    setTw('twitter:description', firstPara);
    setTw('twitter:image', image);
  }

  // Reset social meta to initial state
  resetSocialMeta() {
    document.title = this.initialSocialMeta.title;
    
    const metaSel = (attr, key) => document.querySelector(`meta[${attr}="${key}"]`);
    const ensureMeta = (attr, key) => {
      let el = metaSel(attr, key);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      return el;
    };
    
    const setOg = (prop, content) => {
      if (!content) return;
      ensureMeta('property', prop).setAttribute('content', content);
    };
    const setTw = (name, content) => {
      if (!content) return;
      ensureMeta('name', name).setAttribute('content', content);
    };
    
    if (this.initialSocialMeta.desc) {
      ensureMeta('name', 'description').setAttribute('content', this.initialSocialMeta.desc);
    }
    setOg('og:title', this.initialSocialMeta.ogTitle || this.initialSocialMeta.title);
    setOg('og:description', this.initialSocialMeta.ogDesc || this.initialSocialMeta.desc);
    setOg('og:image', this.initialSocialMeta.ogImage);
    setOg('og:url', this.initialSocialMeta.url);
    setTw('twitter:card', 'summary_large_image');
    setTw('twitter:title', this.initialSocialMeta.ogTitle || this.initialSocialMeta.title);
    setTw('twitter:description', this.initialSocialMeta.ogDesc || this.initialSocialMeta.desc);
    setTw('twitter:image', this.initialSocialMeta.ogImage);
  }

  // Set URL parameter
  setUrlParameter(value) {
    const u = new URL(location.href);
    if (value) u.searchParams.set('u', value);
    else u.searchParams.delete('u');
    history.replaceState(null, '', u);
  }

  // Utility functions
  daysAgo(ts) {
    const d = (Date.now() - new Date(ts).getTime()) / 86400000;
    return d;
  }

  fmtDate(ts) {
    try {
      return new Date(ts).toLocaleDateString(document.documentElement.lang || 'en', { 
        day: '2-digit', 
        month: 'short' 
      });
    } catch {
      return ts;
    }
  }

  escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c =>
      c === '&' ? '&amp;' :
      c === '<' ? '&lt;'  :
      c === '>' ? '&gt;'  :
      c === '"' ? '&quot;': '&#39;'
    );
  }

  withUTM(url, medium = 'updates', campaign = 'artbat2025') {
    try {
      const u = new URL(url, location.href);
      if (!/^https?:/i.test(u.protocol)) return url;
      u.searchParams.set('utm_source', 'site');
      u.searchParams.set('utm_medium', medium);
      u.searchParams.set('utm_campaign', campaign);
      return u.toString();
    } catch {
      return url;
    }
  }

  getTranslation(field, fallback = '') {
    if (!field) return fallback;
    
    if (typeof field === 'object') {
      return field[this.currentLang] || field.en || fallback;
    }
    
    return field;
  }

  getUpdateTypeTranslation(type) {
    // This would need to be implemented based on your CONFIG structure
    return type;
  }

  getUpdateBadgeTranslation(badgeType) {
    // This would need to be implemented based on your CONFIG structure
    return badgeType;
  }
}

// Export for use in main.js
window.UpdatesManager = UpdatesManager;

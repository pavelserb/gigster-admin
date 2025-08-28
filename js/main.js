// Global variables
let CONFIG = {};
let CURRENT_LANG = 'en';
let STATIC_TRANSLATIONS = null;
const SUPPORTED_LANGS = ['en', 'cs', 'uk'];

// Initialize UpdatesManager
let updatesManager = null;

// Detect browser language and return supported language
function detectBrowserLanguage() {
  // Priority 1: Saved language from localStorage
  const saved = localStorage.getItem('site_language');
  console.log('🌐 Debug: localStorage language:', saved);
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    console.log('🌐 Debug: Using saved language:', saved);
    return saved;
  }
  
  // Priority 2: HTML lang attribute
  const htmlLang = document.documentElement.lang;
  console.log('🌐 Debug: HTML lang attribute:', htmlLang);
  if (htmlLang && SUPPORTED_LANGS.includes(htmlLang)) {
    console.log('🌐 Debug: Using HTML lang:', htmlLang);
    return htmlLang;
  }
  
  // Priority 3: Browser language
  const browserLang = navigator.language?.split('-')[0];
  console.log('🌐 Debug: Browser language:', browserLang);
  if (browserLang && SUPPORTED_LANGS.includes(browserLang)) {
    console.log('🌐 Debug: Using browser language:', browserLang);
    return browserLang;
  }
  
  // Priority 4: URL lang parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  console.log('🌐 Debug: URL lang parameter:', urlLang);
  if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
    console.log('🌐 Debug: Using URL lang:', urlLang);
    return urlLang;
  }
  
  // Default to English
  console.log('🌐 Debug: Using default language: en');
  return 'en';
}

// Legacy function - removed as it's not used anywhere

// Set current language and apply translations
function setCurrentLang(lang, skipContentUpdate = false) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    console.warn('🌐 Main.js: Invalid language:', lang);
    return;
  }
  
    const previousLang = CURRENT_LANG;
    CURRENT_LANG = lang;
  
  // Save to localStorage for persistence
    localStorage.setItem('site_language', lang);
    
  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Update language display
  updateLanguageDisplay();
  
  // Apply new translations (skip if data not loaded yet)
  if (!skipContentUpdate) {
    applyNewTranslations(lang);
  }
}

// Get translation for a field (supports both string and object formats)
function getTranslation(field, fallback = '') {
  if (!field) return fallback;
  
  if (typeof field === 'object') {
    return field[CURRENT_LANG] || field.en || fallback;
  }
  
  return field;
}

// Load config.json
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    if (response.ok) {
          CONFIG = await response.json();
    } else {
      console.error('🌐 Main.js: Failed to load config.json');
    }
    } catch (error) {
    console.error('🌐 Main.js: Error loading config.json:', error);
  }
}

// Wait for i18n.js to load translations
async function loadTranslations() {
  console.log('🌐 Main.js: Waiting for i18n.js to load translations...');
  // Wait for i18n.js to be ready and load translations
  let attempts = 0;
  while (!window.TRANSLATIONS && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
    if (attempts % 10 === 0) {
      console.log('🌐 Main.js: Still waiting for translations, attempt:', attempts);
    }
  }
  
  if (window.TRANSLATIONS) {
    STATIC_TRANSLATIONS = window.TRANSLATIONS;
    window.STATIC_TRANSLATIONS = window.TRANSLATIONS;
    console.log('🌐 Main.js: Translations loaded from i18n.js successfully');
  } else {
    console.error('🌐 Main.js: Failed to get translations from i18n.js after 50 attempts');
  }
}

// Initialize new language UI
function initNewLangUI() {
  // Setup existing language switcher
  const langSwitcher = document.querySelector('.lang-switcher');
  if (!langSwitcher) {
    console.warn('🌐 Main.js: Language switcher not found');
    return;
  }
  
  // Update current language display
  updateLanguageDisplay();
  
  // Add click outside to close dropdown
  document.addEventListener('click', (e) => {
    if (!langSwitcher.contains(e.target)) {
      langSwitcher.classList.remove('open');
    }
  });
  
  // Toggle dropdown - make entire lang-current clickable
  const langCurrent = langSwitcher.querySelector('.lang-current');
  langCurrent?.addEventListener('click', (e) => {
    e.stopPropagation();
    langSwitcher.classList.toggle('open');
  });
  
  // Setup language option clicks
  const langOptions = langSwitcher.querySelectorAll('.lang-option');
  langOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = option.getAttribute('data-lang');
      setCurrentLang(lang);
      langSwitcher.classList.remove('open');
    });
  });
}

// Update language display
function updateLanguageDisplay() {
  const langSwitcher = document.querySelector('.lang-switcher');
  if (!langSwitcher) return;
  
  // Update current language flag
  const langFlag = langSwitcher.querySelector('.lang-current .lang-flag');
  if (langFlag) {
    langFlag.src = getLangFlagPath(CURRENT_LANG);
    langFlag.alt = getLangName(CURRENT_LANG);
  }
  
  // Update dropdown language options
  const langOptions = langSwitcher.querySelectorAll('.lang-option');
  langOptions.forEach(option => {
    const lang = option.getAttribute('data-lang');
    const flag = option.querySelector('.lang-flag');
    if (flag && lang) {
      flag.src = getLangFlagPath(lang);
      flag.alt = getLangName(lang);
    }
  });
  
  // Auto-detect dropdown layout based on number of languages
  updateDropdownLayout(langSwitcher);
}

// Get language flag SVG path
function getLangFlagPath(lang) {
  const flags = { 
    en: 'assets/flags/flag-en.svg', 
    cs: 'assets/flags/flag-cz.svg', 
    uk: 'assets/flags/flag-uk.svg' 
  };
  return flags[lang] || 'assets/flags/flag-en.svg';
}

// Get language name
function getLangName(lang) {
  const names = { en: 'English', cs: 'Čeština', uk: 'Українська' };
  return names[lang] || 'English';
}

// Auto-detect and update dropdown layout
function updateDropdownLayout(langSwitcher) {
  const dropdown = langSwitcher.querySelector('.lang-dropdown');
  if (!dropdown) return;
  
  const languageCount = dropdown.querySelectorAll('.lang-option').length;
  
  // Remove existing layout classes
  dropdown.classList.remove('horizontal', 'vertical');
  
  // Apply appropriate layout
  if (languageCount <= 3) {
    dropdown.classList.add('horizontal');
    console.log('🌐 Main.js: Applied horizontal layout for', languageCount, 'languages');
  } else {
    dropdown.classList.add('vertical');
    console.log('🌐 Main.js: Applied vertical layout for', languageCount, 'languages');
  }
  
  // Reset animation state for smooth transitions
  const langOptions = dropdown.querySelectorAll('.lang-option');
  langOptions.forEach((option, index) => {
    option.style.transitionDelay = `${(index + 1) * 0.1}s`;
  });
  
  // Debug: log current classes
  console.log('🌐 Main.js: Dropdown classes:', dropdown.className);
}

// Skeleton management functions
function showSkeleton() {
  document.body.classList.add('skeleton-mode');
  console.log('🌐 Main.js: Showing skeleton');
}

function hideSkeleton() {
  document.body.classList.remove('skeleton-mode');
  document.body.classList.add('content-loaded');
  
  // Track performance metrics
  const loadTime = performance.now();
  console.log('🌐 Main.js: Hiding skeleton, content loaded in', Math.round(loadTime), 'ms');
  
  // Track performance for analytics
  if (window.eventTracker) {
    window.eventTracker.track('page_content_loaded', {
      load_time_ms: Math.round(loadTime),
      timestamp: Date.now()
    });
  }
}

function showErrorState() {
  document.body.classList.remove('skeleton-mode');
  document.body.classList.add('error-state');
  console.error('🌐 Main.js: Showing error state');
  
  // Track error for analytics
  if (window.eventTracker) {
    window.eventTracker.track('page_load_error', {
      error_type: 'critical_data_failed',
      timestamp: Date.now()
    });
  }
  
  // Show error message to user
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.innerHTML = `
      <div class="container hero-layout">
        <div class="error-message">
          <h1>⚠️ Loading Error</h1>
          <p>Failed to load event data. Please refresh the page.</p>
          <button onclick="location.reload()" class="btn primary">Refresh Page</button>
        </div>
      </div>
    `;
  }
}

// Apply new translations to the page
function applyNewTranslations(lang) {
  CURRENT_LANG = lang;
  
  // Apply translations from translations.json first
  if (window.applyTranslations) {
    window.applyTranslations(lang);
  } else {
    console.error('🌐 Main.js: applyTranslations function not available');
    // Try to load and apply translations manually
    setTimeout(() => {
      if (window.applyTranslations) {
        window.applyTranslations(lang);
      }
    }, 100);
  }
  
  // Only update content if CONFIG is available
  if (CONFIG && CONFIG.event) {
    // Update all translatable content after translations are loaded
  updateEventInfo();
  updateArtists();
  updateFaqs();
  updateTickets();
  updateStaticTranslations();
  } else {
    console.log('🌐 Main.js: CONFIG not available, keeping static content');
  }
  
  // Update updates manager language
  if (window.updatesManager) {
    window.updatesManager.setLanguage(lang);
  } else {
    console.warn('🌐 Main.js: updatesManager not available');
  }

  // Dispatch language change event for other components
  document.dispatchEvent(new CustomEvent('languageChanged', {
    detail: { language: lang }
  }));
  
  // Update language switcher UI
  const langSwitcher = document.querySelector('.lang-switcher');
  if (langSwitcher) {
    // Update current language display
    const langCurrent = langSwitcher.querySelector('.lang-current');
    if (langCurrent) {
              langCurrent.innerHTML = `
          <img class="lang-flag" src="${getLangFlagPath(lang)}" alt="${getLangName(lang)}" width="24" height="16">
        `;
    }
    
    // Update dropdown options
    const langDropdown = langSwitcher.querySelector('.lang-dropdown');
    if (langDropdown) {
      langDropdown.innerHTML = SUPPORTED_LANGS.filter(l => l !== lang).map(l => `
                  <button class="lang-option" 
                  data-lang="${l}" 
                  onclick="setCurrentLang('${l}')">
            <img class="lang-flag" src="${getLangFlagPath(l)}" alt="${getLangName(l)}" width="24" height="16">
          </button>
      `).join('');
    }
  } else {
    console.warn('🌐 Main.js: Language switcher not found for UI update');
  }
}

// Функция удалена - дублирование с getCurrentLang

// Функция удалена - дублирование с detectBrowserLanguage в начале файла

// Функция удалена - не используется

// Main initialization function
async function init() {
  // Determine language FIRST (before any content rendering)
  const detectedLang = detectBrowserLanguage();
  setCurrentLang(detectedLang, true); // Skip content update until data is loaded
  
  // Start critical UI setup immediately
  setupHeaderOverlay();
  setupMobileMenu();
  
  // Show skeleton while loading critical data
  showSkeleton();
  
  // Load config and translations in parallel
  const [configLoaded, translationsLoaded] = await Promise.allSettled([
    loadConfig(),
    loadTranslations()
  ]);
  
  // Check if both critical files loaded successfully
  if (configLoaded.status === 'fulfilled' && translationsLoaded.status === 'fulfilled') {
    // Hide skeleton and show content
    hideSkeleton();
    
    // Now apply translations and update content
    applyNewTranslations(CURRENT_LANG);
    
    // Initialize language UI (now with correct language)
    initNewLangUI();
    
    // Setup form
    setupForm();
    
    // Initialize analytics
    if (window.EventTracker) {
      window.eventTracker = new window.EventTracker();
      console.log('🌐 Main.js: Analytics initialized');
    }
    
    // Initialize pixels
    if (window.PixelLoader) {
      window.pixelLoader = new window.PixelLoader();
      console.log('🌐 Main.js: Pixels initialized');
    }
    
    // Initialize UpdatesManager (non-blocking)
    if (window.UpdatesManager) {
      updatesManager = new window.UpdatesManager();
      // Start loading updates in background, don't await
      updatesManager.init().then(() => {
        console.log('🌐 Main.js: Updates loaded successfully');
      }).catch(error => {
        console.warn('🌐 Main.js: Updates failed to load:', error);
      });
      // Export to window for language switching
      window.updatesManager = updatesManager;
    } else {
      console.warn('🌐 Main.js: UpdatesManager not available');
    }
    
    // Mount basic content (now with correct language)
    mountBasics();
    
    // Setup tickets island interactions
    setupTicketsIslandInteractions();
    
    // Setup active navigation
    setupActiveNav();
    
    // Initialize media slider
    initMediaSlider();

    // Respect prefers-reduced-motion
    const heroVideo = document.getElementById('heroVideo');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroVideo?.removeAttribute('autoplay');
      heroVideo?.pause();
    }

    // Scroll correction for anchors and sticky header
    window.addEventListener('hashchange', () => {
      if (location.hash) {
        const el = document.querySelector(location.hash);
        if (el) {
          const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 64;
          const y = el.getBoundingClientRect().top + scrollY - (headerH + 12);
          const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          scrollTo({ top: y, behavior: prefersReduce ? 'auto' : 'smooth' });
        }
      }
    });
    
    // Reveal tickets island
    revealTicketsIsland();
  } else {
    // Handle loading errors
    console.error('🌐 Main.js: Failed to load critical data:', {
      config: configLoaded.status,
      translations: translationsLoaded.status
    });
    showErrorState();
  }
}

function setupHeaderOverlay() {
  const header = document.querySelector('header.site');
  const hero = document.getElementById('hero');
  if (!header || !hero) {
    console.warn('🌐 Main.js: No header or hero found for overlay setup');
    return;
  }

  // Watch if hero is visible in viewport
  const io = new IntersectionObserver(([entry]) => {
    const overHero = entry.isIntersecting && entry.intersectionRatio > 0;
    header.classList.toggle('over-hero', overHero);
    header.classList.toggle('solid', !overHero);
  }, { threshold: 0.01 });

  io.observe(hero);

  // Initial state (in case of loading not from top)
  requestAnimationFrame(() => {
    const r = hero.getBoundingClientRect();
    const overHero = r.bottom > 0 && r.top < innerHeight;
    header.classList.toggle('over-hero', overHero);
    header.classList.toggle('solid', !overHero);
  });
}

function openTicketsMenu(){
  const menu = document.getElementById('ticketsMenu');
  const toggle = document.getElementById('ticketsToggle');
  const overlay = document.getElementById('ticketsOverlay');
  
  if (!menu || !toggle) {
    console.warn('🌐 Main.js: No tickets menu or toggle found');
    return;
  }
  
  menu.classList.add('open');
  toggle.setAttribute('aria-expanded','true');
  toggle.textContent = '▼';
  
  // Show overlay
  if (overlay) {
    overlay.removeAttribute('hidden');
  }
}

function closeTicketsMenu(){
  const menu = document.getElementById('ticketsMenu');
  const toggle = document.getElementById('ticketsToggle');
  const overlay = document.getElementById('ticketsOverlay');
  
  if (!menu || !toggle) {
    console.warn('🌐 Main.js: No tickets menu or toggle found');
    return;
  }
  
  menu.classList.remove('open');
  toggle.setAttribute('aria-expanded','false');
  toggle.textContent = '▲';
  
  // Hide overlay
  if (overlay) {
    overlay.setAttribute('hidden', '');
  }
}

function setupTicketsIslandInteractions() {
  // Floating CTA interactions
  const toggleBtn = document.getElementById('ticketsToggle');
  const menuEl = document.getElementById('ticketsMenu');
  
  if (toggleBtn && menuEl) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = menuEl.classList.contains('open');
      if (isOpen) {
      closeTicketsMenu();
    } else {
      openTicketsMenu();
    }
  });

    // Close menu when clicking outside
  document.addEventListener('click', (e) => {
      if (menuEl.classList.contains('open') && 
          !menuEl.contains(e.target) && 
          !toggleBtn.contains(e.target)) {
      closeTicketsMenu();
    }
  });
    
    // Close menu when clicking on overlay
    const overlay = document.getElementById('ticketsOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        closeTicketsMenu();
      });
    }
    
    // Close menu when pressing Escape
  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuEl.classList.contains('open')) {
      closeTicketsMenu();
    }
  });
  }
}

function revealTicketsIsland(delayMs = 900) {
  const island = document.querySelector('.floating-cta');
  if (!island) {
    console.warn('🌐 Main.js: No tickets island found');
    return;
  }

  // If user prefers reduced motion — show without delay and animation
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = reduceMotion ? 0 : delayMs;

  // Ensure initial hidden state (for hot-reload etc.)
  island.classList.remove('show');

  setTimeout(() => {
    // If mobile drawer is open and island is hidden by hidden attribute — don't show
    if (island.hasAttribute('hidden')) return;
    island.classList.add('show');
  }, delay);
}

function mountBasics() {
  // Update event info
  updateEventInfo();
  
  // Update artists
  updateArtists();
  
  // Update FAQs
  updateFaqs();
  
  // Update tickets
  updateTickets();
  
  // Update venue photos
  updateVenuePhotos();
  
  // Setup smart map touch handling
  setupMapTouchHandling();
  
  // Setup contact form
  setupContactForm();
  
  // Update static translations
  updateStaticTranslations();
  
  // Update form placeholders (with retry if translations not ready)
  updateFormPlaceholdersWithRetry();
  
  // Listen for language changes to update form placeholders
  document.addEventListener('languageChanged', () => {
    updateFormPlaceholders();
  });
}

// Adjust --cta-bar-h to actual bar height
const bar = document.querySelector('.cta-bar');
if (bar) {
  document.documentElement.style.setProperty('--cta-bar-h', `${bar.offsetHeight}px`);
}

// Utility functions moved to updates.js module

// Updates functionality moved to updates.js module

  // ---------- card ----------
// Card rendering moved to updates.js module

// Render and event handling moved to updates.js module

function setupActiveNav() {
  const anchors = Array.from(document.querySelectorAll('nav.primary a'));
  const sections = anchors
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  // Создаем основной observer для большинства секций
  const mainObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

  // Наблюдаем за всеми секциями, кроме последней
  sections.slice(0, -1).forEach(s => mainObs.observe(s));

  // Специальная обработка для последней секции и верхней части страницы
  const lastSection = sections[sections.length - 1];
  if (lastSection) {
    // Проверяем позицию скролла для последней секции
    const checkLastSection = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Активируем последний пункт меню только когда мы в конце страницы
      if (scrollY + windowHeight >= documentHeight - 30) {
        anchors.forEach(a => a.classList.remove('active'));
        anchors[anchors.length - 1].classList.add('active');
        } else {
        // Если мы не в конце страницы, убираем принудительную активацию
        // и позволяем Intersection Observer работать нормально
        const lastAnchor = anchors[anchors.length - 1];
        if (lastAnchor.classList.contains('active')) {
          // Проверяем, должна ли быть активна другая секция
          const activeSection = sections.find(s => {
            const rect = s.getBoundingClientRect();
            return rect.top <= windowHeight * 0.1 && rect.bottom >= windowHeight * 0.1;
          });
          
          if (activeSection && activeSection !== lastSection) {
            // Активируем соответствующую секцию
            anchors.forEach(a => a.classList.remove('active'));
            const activeAnchor = anchors.find(a => a.getAttribute('href') === '#' + activeSection.id);
            if (activeAnchor) {
              activeAnchor.classList.add('active');
            }
          }
        }
      }
    };

    // Проверяем при скролле
    window.addEventListener('scroll', checkLastSection, { passive: true });
    
    // Проверяем при загрузке страницы
    checkLastSection();
  }

  // Обработка верхней части страницы (секция hero)
  const checkTopSection = () => {
    const scrollY = window.scrollY;
    
    // Если мы в самом верху страницы (секция hero), убираем подсветку со всех пунктов
    if (scrollY < 100) {
      anchors.forEach(a => a.classList.remove('active'));
    }
  };

  // Проверяем при скролле
  window.addEventListener('scroll', checkTopSection, { passive: true });
  
  // Проверяем при загрузке страницы
  checkTopSection();
}

function setupMobileMenu() {
  const hambBtn = document.getElementById('hambBtn');
  const mnav = document.getElementById('mnav');
  const island = document.querySelector('.floating-cta');

  // Функция закрытия меню
  const closeMenu = () => {
    mnav.setAttribute('hidden', '');
    hambBtn.setAttribute('aria-expanded', 'false');
    island?.removeAttribute('hidden');
  };

  // Функция открытия меню
  const openMenu = () => {
    mnav.removeAttribute('hidden');
    hambBtn.setAttribute('aria-expanded', 'true');
    // Don't hide the floating CTA button - it should remain visible
    closeTicketsMenu(); // Hide dropdown if it was open
  };

  hambBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    const open = mnav.hasAttribute('hidden') === false;
    if (open) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Закрытие по клику на пункты меню
  mnav?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      closeMenu();
    }
  });

  // Закрытие по клику на оверлей
  mnav?.addEventListener('click', (e) => {
    if (e.target.classList.contains('mobile-overlay')) {
      closeMenu();
    }
  });
  
  // Закрытие по клику на оверлей (дополнительная проверка)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('mobile-overlay') && !mnav.hasAttribute('hidden')) {
      closeMenu();
    }
  });

  // Закрытие по клику мимо меню
  document.addEventListener('click', (e) => {
    // Don't close mobile menu if clicking on tickets menu elements
    const ticketsMenu = document.getElementById('ticketsMenu');
    const ticketsToggle = document.getElementById('ticketsToggle');
    if (ticketsMenu?.contains(e.target) || ticketsToggle?.contains(e.target)) {
      return;
    }
    
    if (!mnav.hasAttribute('hidden') && 
        !mnav.contains(e.target) && 
        !hambBtn.contains(e.target)) {
      closeMenu();
    }
  });

  // Закрытие по нажатию Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mnav.hasAttribute('hidden')) {
      closeMenu();
    }
  });

  // Функция для обновления активного состояния пунктов меню
  const updateMobileMenuActive = () => {
    const mobileNav = mnav?.querySelector('nav');
    if (!mobileNav) return;

    const mobileLinks = mobileNav.querySelectorAll('a');
    const currentSection = getCurrentActiveSection();

    mobileLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  };

  // Обновляем активное состояние при скролле
  window.addEventListener('scroll', updateMobileMenuActive, { passive: true });
  
  // Обновляем при загрузке страницы
  updateMobileMenuActive();
}

// Функция для получения текущей активной секции
function getCurrentActiveSection() {
  const activeLink = document.querySelector('nav.primary a.active');
  if (activeLink) {
    const href = activeLink.getAttribute('href');
    const result = href ? href.substring(1) : 'about';
    return result;
  }
  return 'about';
}

function setupForm() {
  document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert("Thanks! We'll get back to you soon.");
  });
}

// Functions to update translations
function updateStaticTranslations() {
  // About description
  const aboutDescriptionEl = document.querySelector('[data-i18n="about.body"]');
  if (aboutDescriptionEl && CONFIG.event?.about) {
    // Get translation for current language
    const aboutText = getTranslation(CONFIG.event.about, '');
    if (aboutText) {
      // Convert text to HTML paragraphs
      const paragraphs = aboutText
        .split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .map(line => `<p>${window.escapeHTML ? window.escapeHTML(line.trim()) : line.trim()}</p>`)
        .join('');
      
      aboutDescriptionEl.innerHTML = paragraphs;
    }
  }

  // Tickets Menu
  const ticketsMenu = document.getElementById('ticketsMenu');
  if (ticketsMenu) {
    ticketsMenu.innerHTML = '';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'cta-menu-header';
    header.textContent = getTranslationFromFile('cta.chooseSeller', 'Choose your seller:');
    ticketsMenu.appendChild(header);
    
    (CONFIG.authorizedSellers || []).forEach(s => {
      if (s.showInTicketsMenu !== false) {
        const button = document.createElement('button');
        button.className = 'cta-menu-item';
        
        let logoHtml = '';
        if (s.logo) {
          logoHtml = `<img src="${s.logo}" alt="${s.name} logo" class="cta-menu-logo">`;
        }
        
        button.innerHTML = `
          <a href="${s.url}" class="cta-menu-text" target="_blank" rel="noopener noreferrer">${getTranslation(s.name, 'Vendor')}</a>
          ${logoHtml}
        `;
        
        button.addEventListener('click', () => {
          window.open(s.url, '_blank', 'noopener,noreferrer');
          closeTicketsMenu();
        });
        ticketsMenu.appendChild(button);
      }
    });
  }
}

function getTranslationFromFile(key, fallback = '') {
  if (!STATIC_TRANSLATIONS) {
    console.warn('🌐 Main.js: No STATIC_TRANSLATIONS available');
    return fallback;
  }
  
  // Get the current language data from sections
  const currentLangData = STATIC_TRANSLATIONS.sections?.[CURRENT_LANG];
  
  if (!currentLangData) {
    console.warn('🌐 Main.js: No translations found for language:', CURRENT_LANG);
    // Try fallback to English
    const fallbackData = STATIC_TRANSLATIONS.sections?.en;
    if (!fallbackData) {
      console.warn('🌐 Main.js: No fallback translations found');
      return fallback;
    }
    return window.getByPath ? window.getByPath(fallbackData, key) || fallback : fallback;
  }
  
  return window.getByPath ? window.getByPath(currentLangData, key) || fallback : fallback;
}

// Функция удалена - дублирование с getByPath в i18n.js

function updateEventInfo() {
  const e = CONFIG.event;

  // --- Titles / hero basics
  const siteTitleEl = document.getElementById('siteTitle');
  const eventNameEl = document.getElementById('eventName');
  if (siteTitleEl) siteTitleEl.textContent = getTranslation(e.name, 'Event Name');
  if (eventNameEl) eventNameEl.textContent = getTranslation(e.name, 'Event Name');

  // Date & time (supports optional timeEnd -> "18:00 – 23:00")
  const dateEl = document.getElementById('eventDate');
  const timeEl = document.getElementById('eventTime');
  if (dateEl) dateEl.textContent = getTranslation(e.date, '');
  if (timeEl) timeEl.textContent = e.timeEnd ? `${e.time} – ${e.timeEnd}` : e.time;

  // City / country / flag
  const cityEl = document.getElementById('eventCity');
  const countryEl = document.getElementById('eventCountry');
  const flagEl = document.getElementById('eventFlag');
  if (cityEl) cityEl.textContent = getTranslation(e.city, '');
  if (countryEl) countryEl.textContent = getTranslation(e.country, '');
  
  // Flag - update only if different from static fallback
  if (flagEl && e.flag && e.flag !== flagEl.src) {
    // Wait for skeleton to be hidden and content to be loaded
    const checkSkeletonHidden = () => {
      if (document.body.classList.contains('content-loaded')) {
        // Small additional delay to ensure smooth animation
        setTimeout(() => {
          flagEl.src = e.flag;
        }, 50);
      } else {
        // Check again in 50ms
        setTimeout(checkSkeletonHidden, 50);
      }
    };
    checkSkeletonHidden();
  }

  // Venue (hero bottom + Location section)
  const venueNameEl = document.getElementById('venueName');
  const venueAddrHeroEl = document.getElementById('venueAddressHero');
  if (venueNameEl) venueNameEl.textContent = getTranslation(e.venue.name, 'Venue Name');
  if (venueAddrHeroEl) venueAddrHeroEl.textContent = getTranslation(e.venue.address, 'Venue Address');

  const locVenueEl = document.getElementById('locVenue');
  const locAddrEl = document.getElementById('locAddr');
  const locSiteEl = document.getElementById('locSite');
  const locRouteEl = document.getElementById('locRoute');
  if (locVenueEl) locVenueEl.textContent = getTranslation(e.venue.name, 'Venue Name');
  if (locAddrEl) locAddrEl.textContent = getTranslation(e.venue.address, 'Venue Address');
  if (locSiteEl) locSiteEl.href = e.venue.website;
  if (locRouteEl) {
    locRouteEl.href = e.venue.route;
    // Set the button content with icon only
    locRouteEl.innerHTML = `
      <img src="assets/icons/route.svg" alt="Get route" class="route-icon">
    `;
  }

  // Event description
  const eventAboutEl = document.getElementById('eventAbout');
  if (eventAboutEl) {
    eventAboutEl.innerHTML = textToParagraphs(getTranslation(e.about, ''));
  }
}

function updateArtists() {
  // Artists
  const artistsGrid = document.getElementById('artistsGrid');
  if (artistsGrid) {
    artistsGrid.innerHTML = '';
    (CONFIG.artists || []).forEach(a => {
    const card = document.createElement('div');
    card.className = 'card artist';
      if (a.headliner) {
      card.classList.add('headliner');
    }
      const linksHtml = (a.links || [])
        .map(l => {
          const icon = getSocialIcon(l.t);
          const iconHtml = icon ? `<img src="${icon}" alt="${l.t}" class="social-icon">` : '';
          return `<a class="btn social-btn" href="${l.u}" target="_blank" rel="noopener noreferrer" aria-label="${l.t}">${iconHtml}</a>`;
        })
      .join('');
      // Create bio content with read more functionality
      const bioText = getTranslation(a.bio, '');
      const bioContent = textToParagraphs(bioText);
      
      // Check if bio is long enough to need read more
      const needsReadMore = bioText.length > 200; // Adjust threshold as needed
    
    card.innerHTML = `
        <img src="${a.img}" alt="${getTranslation(a.name, 'Artist')}" loading="lazy"/>
        <div class="content">
          <h3>${getTranslation(a.name, 'Artist')}</h3>
          <div class="bio-content">${bioContent}</div>
          ${needsReadMore ? '<button class="read-more" data-action="expand">Read more</button>' : ''}
        <div class="links row">${linksHtml}</div>
      </div>`;
    
      // Add read more functionality
      if (needsReadMore) {
        const readMoreBtn = card.querySelector('.read-more');
        const bioContent = card.querySelector('.bio-content');
        const artistName = card.querySelector('h3');
        
        // Function to toggle bio expansion
        const toggleBio = () => {
          const isExpanded = bioContent.classList.contains('expanded');
          if (isExpanded) {
            bioContent.classList.remove('expanded');
            readMoreBtn.textContent = 'Read more';
            readMoreBtn.setAttribute('data-action', 'expand');
          } else {
            bioContent.classList.add('expanded');
            readMoreBtn.textContent = 'Read less';
            readMoreBtn.setAttribute('data-action', 'collapse');
          }
        };
        
        // Click on read more button
        readMoreBtn.addEventListener('click', toggleBio);
        
        // Click on artist name (h3)
        artistName.addEventListener('click', toggleBio);
        artistName.classList.add('clickable');
        
        // Click on bio content
        bioContent.addEventListener('click', toggleBio);
        bioContent.classList.add('clickable');
      }
      artistsGrid.appendChild(card);
    });
  }
}

function updateFaqs() {
  // FAQs
  const faqList = document.getElementById('faqList');
  if (faqList) {
    faqList.innerHTML = '';
    (CONFIG.faqs || []).forEach(f => {
    const d = document.createElement('details');
      d.innerHTML = `<summary>${getTranslation(f.q, 'Question')}</summary><div class="answer">${textToParagraphs(getTranslation(f.a, ''))}</div>`;
      faqList.appendChild(d);
  });
  }
}

function updateTickets() {
  const e = CONFIG.event;

  // Floating CTA: primary + drop-up with vendors
  const primaryBtn = document.getElementById('ticketsPrimary');
  const toggleBtn  = document.getElementById('ticketsToggle');
  const menuEl     = document.getElementById('ticketsMenu');

  const sellers = Array.isArray(CONFIG.authorizedSellers) ? CONFIG.authorizedSellers : [];

  // 1) Determine primary URL: ticketsURL -> primary:true -> first in list -> #tickets
  let primaryURL = CONFIG.ticketsURL
    || (sellers.find(s => s.primary)?.url)
    || (sellers[0]?.url)
    || '#tickets';

  if (primaryBtn) {
    primaryBtn.href = primaryURL;
    const external = /^https?:\/\//i.test(primaryURL);
    if (external) {
      primaryBtn.target = '_blank';
      primaryBtn.rel = 'noopener noreferrer';
      // Добавляем атрибут для отслеживания
      primaryBtn.setAttribute('data-track', 'TicketButtonClick');
    } else {
      primaryBtn.removeAttribute('target');
      primaryBtn.removeAttribute('rel');
      // Убираем атрибут отслеживания для внутренних ссылок
      primaryBtn.removeAttribute('data-track');
    }
  }

  // 2) Build drop-up from all vendors (logos + text)
  if (menuEl) {
    menuEl.innerHTML = '';
    sellers.forEach(s => {
      const url = s.url || '#tickets';
      const external = /^https?:\/\//i.test(url);

      // Use <a> to enable right-click/open in new tab
      const item = document.createElement('a');
      item.className = 'vendor';
      if (s.logoOnly) item.classList.add('logo-only');
      item.setAttribute('role', 'menuitem');
      item.href = url;
      if (external) {
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
      }

      const hasLogo = !!s.logo;
      // HTML item: logo (if exists) + name (or sr-only if logoOnly)
              item.innerHTML = `
          <span class="vendor-name">${getTranslation(s.name, 'Vendor')}</span>
          ${hasLogo ? `<img class="vendor-logo" src="${s.logo}" alt="${getTranslation(s.name, 'Vendor')} logo" loading="lazy" decoding="async">` : ''}
        `;

      menuEl.appendChild(item);
    });

    // Hide arrow if only one vendor
    if (toggleBtn && sellers.length <= 1) toggleBtn.style.display = 'none';
  }

  // Contacts
  const contactMap = [
    ['linkFacebook',  CONFIG.contacts?.find(c => c.type === 'Facebook')?.url],
    ['linkInstagram', CONFIG.contacts?.find(c => c.type === 'Instagram')?.url],
    ['linkTikTok',    CONFIG.contacts?.find(c => c.type === 'TikTok')?.url],
    ['linkWebsite',   CONFIG.contacts?.find(c => c.type === 'Website')?.url],
  ];
  for (const [id, url] of contactMap) {
    const a = document.getElementById(id);
    if (a && url) a.href = url;
  }

  // Authorized ticket sellers
  const sellersWrap = document.getElementById('ticketLinks');
  if (sellersWrap) {
    sellersWrap.innerHTML = '';
    (CONFIG.authorizedSellers || []).forEach(s => {
      if (s.showInTicketsSection !== false) {
              const a = document.createElement('a');
      a.className = 'btn';
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = getTranslation(s.name, 'Vendor');
      // Добавляем атрибут для отслеживания
      a.setAttribute('data-track', 'TicketButtonClick');
      sellersWrap.appendChild(a);
      }
    });
  }

  // Ticket tiers
  const tiersWrap = document.getElementById('tiers');
  if (tiersWrap) {
    tiersWrap.innerHTML = '';
    (CONFIG.tiers || []).forEach(t => {
      const row = document.createElement('div');
      row.className = 'ticket-tier';
      
      let noteHtml = '';
      if (t.note) {
        noteHtml = `<div class="tier-note">${getTranslation(t.note, '')}</div>`;
      }
      
      let linkHtml = '';
      if (t.useIndividualLink && t.individualLink) {
        linkHtml = `<a href="${t.individualLink}" class="tier-link" target="_blank" rel="noopener noreferrer" data-track="TicketButtonClick">Buy</a>`;
      } else if (CONFIG.ticketsURL) {
        linkHtml = `<a href="${CONFIG.ticketsURL}" class="tier-link" target="_blank" rel="noopener noreferrer" data-track="TicketButtonClick">Buy</a>`;
      }
      
      row.innerHTML = `
        <div>
          <strong>${getTranslation(t.name, 'Ticket Tier')}</strong>
          <div class="muted">${getTranslation(t.desc, '') ?? ''}</div>
          ${noteHtml}
        </div>
        <div class="tier-right">
          <div class="nowrap">${t.price ?? ''}</div>
          ${linkHtml}
        </div>`;
      tiersWrap.appendChild(row);
    });
  }
}

function updateVenuePhotos() {
  const venuePhotosSlider = document.getElementById('venuePhotosSlider');
  if (!venuePhotosSlider) {
    console.warn('🌐 Main.js: No venue photos slider found');
    return;
  }

  const photos = CONFIG.event?.venue?.photos || [];
  
  if (photos.length === 0) {
    venuePhotosSlider.innerHTML = '<div class="venue-slide"><div class="venue-placeholder">No photos available</div></div>';
    return;
  }

  venuePhotosSlider.innerHTML = '';
  
  photos.forEach((photo, index) => {
    const slide = document.createElement('div');
    slide.className = 'venue-slide';
    if (index === 0) slide.classList.add('active');
    
    slide.innerHTML = `
      <img src="${photo}" alt="Venue photo ${index + 1}" loading="lazy" decoding="async">
    `;
    
    venuePhotosSlider.appendChild(slide);
  });

  // Initialize venue slider if there are multiple photos
  if (photos.length > 1) {
    initVenueSlider();
  }
}

// Initialize venue photos slider
function initVenueSlider() {
  const slider = document.getElementById('venuePhotosSlider');
  if (!slider) return;

  const slides = slider.querySelectorAll('.venue-slide');
  const totalSlides = slides.length;
  let currentSlide = 0;

  // Create navigation dots if multiple slides
  if (totalSlides > 1) {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'venue-dots';
    
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'venue-dot';
      dot.setAttribute('aria-label', `Go to venue photo ${index + 1}`);
      if (index === 0) dot.classList.add('active');
      
      dot.addEventListener('click', () => {
        goToVenueSlide(index);
      });
      
      dotsContainer.appendChild(dot);
    });
    
    slider.appendChild(dotsContainer);
  }

  function goToVenueSlide(index) {
    // Remove active class from all slides and dots
    slides.forEach(slide => slide.classList.remove('active'));
    const dots = slider.querySelectorAll('.venue-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide and dot
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    
    currentSlide = index;
  }

  // Auto-advance slides every 5 seconds
  if (totalSlides > 1) {
    setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides;
      goToVenueSlide(currentSlide);
    }, 5000);
  }
}

// Update functions moved to updates.js module

// Utility function to convert multi-line text to HTML paragraphs
function textToParagraphs(text) {
  if (!text) {
    return '';
  }
  
  const paragraphs = text.split('\n').filter(p => p.trim());
  return paragraphs.map(p => `<p>${window.escapeHTML ? window.escapeHTML(p) : p}</p>`).join('');
}

// Lightbox functionality
let lightboxCurrentSlide = 0;
let lightboxSlides = [];

function openLightbox(slideIndex) {
  const lightbox = document.getElementById('lightbox');
  const lightboxMedia = lightbox.querySelector('.lightbox-media');
  
  // Get all slides from the slider
  const slider = document.querySelector('.media-slider');
  if (!slider) return;
  
  lightboxSlides = Array.from(slider.querySelectorAll('.slider-slide img, .slider-slide video'));
  lightboxCurrentSlide = slideIndex;
  
  // Show lightbox
  lightbox.hidden = false;
  lightbox.classList.add('show');
  
  // Load current media
  loadLightboxMedia();
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Add event listeners
  setupLightboxEvents();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  
  // Hide lightbox
  lightbox.classList.remove('show');
  setTimeout(() => {
    lightbox.hidden = true;
  }, 300);
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Remove event listeners
  removeLightboxEvents();
}

function loadLightboxMedia() {
  const lightboxMedia = document.querySelector('.lightbox-media');
  const currentMedia = lightboxSlides[lightboxCurrentSlide];
  
  if (!currentMedia) return;
  
  // Clear previous content
  lightboxMedia.innerHTML = '';
  
  // Clone the media element
  const mediaClone = currentMedia.cloneNode(true);
  
  // Remove click handler and cursor style
  mediaClone.style.cursor = 'default';
  mediaClone.removeEventListener('click', () => {});
  
  // Ensure proper sizing for different aspect ratios
  if (mediaClone.tagName === 'IMG') {
    mediaClone.style.maxWidth = '100%';
    mediaClone.style.maxHeight = '100vh';
    mediaClone.style.width = 'auto';
    mediaClone.style.height = 'auto';
    mediaClone.style.objectFit = 'contain';
  } else if (mediaClone.tagName === 'VIDEO') {
    mediaClone.style.maxWidth = '100%';
    mediaClone.style.maxHeight = '100%';
    mediaClone.style.width = 'auto';
    mediaClone.style.height = 'auto';
    mediaClone.controls = true;
    // Ensure video fits properly
    mediaClone.style.maxHeight = '80vh';
  }
  
  // Add to lightbox
  lightboxMedia.appendChild(mediaClone);
  
  // Update navigation button states
  updateLightboxNav();
}

function nextLightboxSlide() {
  if (lightboxCurrentSlide < lightboxSlides.length - 1) {
    lightboxCurrentSlide++;
  } else {
    lightboxCurrentSlide = 0; // Loop to first
  }
  loadLightboxMedia();
}

function prevLightboxSlide() {
  if (lightboxCurrentSlide > 0) {
    lightboxCurrentSlide--;
  } else {
    lightboxCurrentSlide = lightboxSlides.length - 1; // Loop to last
  }
  loadLightboxMedia();
}

function updateLightboxNav() {
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');
  
  // Show/hide navigation buttons based on slide count
  if (lightboxSlides.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'block';
    nextBtn.style.display = 'block';
  }
}

function setupLightboxEvents() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  const overlay = lightbox.querySelector('.lightbox-overlay');
  
  // Close button
  closeBtn.addEventListener('click', closeLightbox);
  
  // Navigation buttons
  prevBtn.addEventListener('click', prevLightboxSlide);
  nextBtn.addEventListener('click', nextLightboxSlide);
  
  // Overlay click
  overlay.addEventListener('click', closeLightbox);
  
  // Keyboard events
  document.addEventListener('keydown', handleLightboxKeydown);
  
  // Touch events for mobile
  let startX = 0;
  let currentX = 0;
  
  const touchHandler = {
    start: (e) => { startX = e.touches[0].clientX; },
    move: (e) => { currentX = e.touches[0].clientX; },
    end: () => {
      const diff = startX - currentX;
      const threshold = 50;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          nextLightboxSlide();
        } else {
          prevLightboxSlide();
        }
      }
    }
  };
  
  lightbox.addEventListener('touchstart', touchHandler.start);
  lightbox.addEventListener('touchmove', touchHandler.move);
  lightbox.addEventListener('touchend', touchHandler.end);
  
  // Store handlers for removal
  lightbox._touchHandlers = touchHandler;
}

function removeLightboxEvents() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  const overlay = lightbox.querySelector('.lightbox-overlay');
  
  // Remove event listeners
  closeBtn.removeEventListener('click', closeLightbox);
  prevBtn.removeEventListener('click', prevLightboxSlide);
  nextBtn.removeEventListener('click', nextLightboxSlide);
  overlay.removeEventListener('click', closeLightbox);
  document.removeEventListener('keydown', handleLightboxKeydown);
  
  // Remove touch handlers
  if (lightbox._touchHandlers) {
    const handlers = lightbox._touchHandlers;
    lightbox.removeEventListener('touchstart', handlers.start);
    lightbox.removeEventListener('touchmove', handlers.move);
    lightbox.removeEventListener('touchend', handlers.end);
    delete lightbox._touchHandlers;
  }
}

function handleLightboxKeydown(e) {
  switch (e.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowLeft':
      prevLightboxSlide();
      break;
    case 'ArrowRight':
      nextLightboxSlide();
      break;
  }
}

// Initialize media slider
function initMediaSlider() {
  const slider = document.querySelector('.media-slider');
  if (!slider) {
    console.warn('🌐 Main.js: No media slider found');
    return;
  }

  const slides = slider.querySelectorAll('.slider-slide');
  const dotsContainer = slider.querySelector('.slider-dots');
  const prevBtn = slider.querySelector('.slider-btn.prev');
  const nextBtn = slider.querySelector('.slider-btn.next');
  
  let currentSlide = 0;
  const totalSlides = slides.length;
  let autoplayInterval = null;
  let isAutoplayActive = false;

  // Setup lazy loading for images
  setupLazyLoading();

  // Create dots
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    if (index === 0) dot.classList.add('active');
    
    dot.addEventListener('click', () => {
      goToSlide(index);
      // Stop autoplay when user manually navigates
      if (isAutoplayActive) {
        stopAutoplay();
      }
    });
    
    dotsContainer.appendChild(dot);
  });

  // Update slide visibility with smooth transitions
  function updateSlides() {
    // First, fade out all slides
    slides.forEach((slide) => {
      slide.classList.remove('active');
    });
    
    // Then, fade in the current slide
    setTimeout(() => {
      slides[currentSlide].classList.add('active');
    }, 0); // Slightly longer delay for smoother transition
    
    // Update dots
    const dots = dotsContainer.querySelectorAll('.slider-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSlide);
    });
    
    // Remove disabled state for looping navigation
    // prevBtn.disabled = currentSlide === 0;
    // nextBtn.disabled = currentSlide === totalSlides - 1;
  }

  // Go to specific slide
  function goToSlide(index) {
    currentSlide = index;
    updateSlides();
  }

  // Next slide
  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlides();
  }

  // Previous slide
  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlides();
  }

  // Event listeners for navigation buttons
  const handlePrevClick = () => {
    prevSlide();
    // Stop autoplay when user manually navigates
    if (isAutoplayActive) {
      stopAutoplay();
    }
  };
  
  const handleNextClick = () => {
    nextSlide();
    // Stop autoplay when user manually navigates
    if (isAutoplayActive) {
      stopAutoplay();
    }
  };
  
  // Setup lazy loading for slider images
  function setupLazyLoading() {
    // Load first image immediately
    const firstSlide = slides[0];
    if (firstSlide) {
      const img = firstSlide.querySelector('img');
      if (img && img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    }

    // Setup intersection observer for other images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before image comes into view
    });

    // Observe all images except the first one
    slides.forEach((slide, index) => {
      if (index > 0) {
        const img = slide.querySelector('img');
        if (img && img.dataset.src) {
          imageObserver.observe(img);
        }
      }
    });
  }

  // Add both click and touch events for better mobile support
  prevBtn.addEventListener('click', handlePrevClick);
  nextBtn.addEventListener('click', handleNextClick);
  
  // Add touch events for mobile devices
  prevBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handlePrevClick();
  });
  
  nextBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleNextClick();
  });
  
  // Autoplay button
  const autoBtn = slider.querySelector('.slider-autoplay-btn');
  if (autoBtn) {
    autoBtn.addEventListener('click', toggleAutoplay);
  }

  // Keyboard navigation
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
      // Stop autoplay when user manually navigates
      if (isAutoplayActive) {
        stopAutoplay();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
      // Stop autoplay when user manually navigates
      if (isAutoplayActive) {
        stopAutoplay();
      }
    }
  });

  // Touch/swipe support
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;

  slider.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = false;
  });

  slider.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX;
    const diff = Math.abs(startX - currentX);
    if (diff > 10) {
      isSwiping = true;
    }
  });

  slider.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    
    const diff = startX - currentX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next slide
        nextSlide();
        // Stop autoplay when user manually navigates
        if (isAutoplayActive) {
          stopAutoplay();
        }
    } else {
        // Swipe right - previous slide
        prevSlide();
        // Stop autoplay when user manually navigates
        if (isAutoplayActive) {
          stopAutoplay();
        }
      }
    }
    
    isSwiping = false;
  });

  // Initialize
  updateSlides();
  
  // Add click handlers for lightbox and video controls
  slides.forEach((slide, index) => {
    const media = slide.querySelector('img, video');
    if (media) {
      media.style.cursor = 'pointer';
      
      // Handle both click and touch events for lightbox
      let touchStartTime = 0;
      let touchStartY = 0;
      
      media.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        touchStartY = e.touches[0].clientY;
      });
      
      media.addEventListener('touchend', (e) => {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        const touchEndY = e.changedTouches[0].clientY;
        const touchDistance = Math.abs(touchStartY - touchEndY);
        
        // Only open lightbox if it's a short tap (not a swipe)
        if (touchDuration < 300 && touchDistance < 10) {
          e.preventDefault();
        openLightbox(index);
        }
      });
      
      media.addEventListener('click', (e) => {
        // Only handle click if it's not a touch device or if it's a mouse click
        if (!('ontouchstart' in window) || e.detail > 0) {
          openLightbox(index);
        }
      });
      
      // Special handling for video elements
      if (media.tagName === 'VIDEO') {
        // Stop autoplay when video starts playing
        media.addEventListener('play', () => {
          if (isAutoplayActive) {
            stopAutoplay();
          }
        });
        
        // Resume autoplay when video ends
        media.addEventListener('ended', () => {
          if (!isAutoplayActive) {
            startAutoplay();
          }
        });
        
        // Stop autoplay when user interacts with video controls
        media.addEventListener('click', (e) => {
          // Don't stop autoplay if clicking on the video itself (for lightbox)
          // Only stop if clicking on controls or when video starts playing
          if (e.target === media && !media.paused) {
            if (isAutoplayActive) {
              stopAutoplay();
            }
          }
        });
      }
    }
  });
  
  // Start autoplay by default
  startAutoplay();
  
  // Autoplay functions
  function toggleAutoplay() {
    if (isAutoplayActive) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }
  
  function startAutoplay() {
    if (isAutoplayActive) {
      return;
    }
    
    isAutoplayActive = true;
    autoBtn.classList.add('playing');
    autoBtn.textContent = '⏸';
    
    autoplayInterval = setInterval(() => {
      nextSlide();
    }, 8000); // 8 seconds
  }
  
  function stopAutoplay() {
    if (!isAutoplayActive) {
      return;
    }
    
    isAutoplayActive = false;
    autoBtn.classList.remove('playing');
    autoBtn.textContent = '▶';
    
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }
  
  // Autoplay is controlled only by button click, not by mouse position
}

// Get social icon by link type
function getSocialIcon(linkType) {
  if (!linkType) return null;
  
  const iconMap = {
    'Website': 'assets/icons/website-white.png',
    'Facebook': 'assets/icons/facebook-white.png',
    'Instagram': 'assets/icons/instagram-outline-white.png',
    'TikTok': 'assets/icons/tiktok-white.png',
    'YouTube': 'assets/icons/youtube-circle-white.png'
  };
  
  // Case-insensitive matching
  const normalizedType = linkType.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (key.toLowerCase() === normalizedType) {
      return icon;
    }
  }
  
  return null;
}

// Update form placeholders with translations
function updateFormPlaceholders() {
  const elements = document.querySelectorAll('[data-i18n-placeholder]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = getFormTranslation(key);
    if (translation) {
      element.placeholder = translation;
      element.setAttribute('aria-label', translation);
    }
  });
}

// Update form placeholders with retry mechanism
function updateFormPlaceholdersWithRetry() {
  // Try to update immediately
  if (typeof window.TRANSLATIONS !== 'undefined') {
    updateFormPlaceholders();
    return;
  }
  
  // If translations not ready, retry after a short delay
  let retryCount = 0;
  const maxRetries = 10;
  
  const retryUpdate = () => {
    if (typeof window.TRANSLATIONS !== 'undefined') {
      updateFormPlaceholders();
      return;
    }
    
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(retryUpdate, 100); // Retry every 100ms
    } else {
      console.warn('🌐 Main.js: Failed to load form translations after', maxRetries, 'retries');
    }
  };
  
  setTimeout(retryUpdate, 100);
}

// Get translation for form fields from i18n.js translations
function getFormTranslation(key) {
  // Check if i18n.js translations are available
  if (typeof window.TRANSLATIONS === 'undefined') {
    console.warn('🌐 Main.js: TRANSLATIONS not available from i18n.js');
    return null;
  }
  
  const currentLang = localStorage.getItem('site_language') || 'en';
  const langData = window.TRANSLATIONS.sections?.[currentLang];
  
  if (!langData) {
    console.warn('🌐 Main.js: No translations found for language:', currentLang);
    return null;
  }
  
  // Get nested value using dot notation
  const keys = key.split('.');
  let current = langData;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      console.warn('🌐 Main.js: Key not found in form translations:', k, 'at path:', key);
      return null;
    }
  }
  
  return current || null;
}

// Setup contact form submission
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    };
    
    // Basic validation
    if (!data.name || !data.email || !data.subject || !data.message) {
      alert('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      
      // Send email using a simple service (you can replace with your preferred method)
      const response = await sendContactEmail(data);
      
      if (response.success) {
        alert('Thank you! Your message has been sent successfully.');
        form.reset();
      } else {
        alert('Sorry, there was an error sending your message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      alert('Sorry, there was an error sending your message. Please try again.');
    } finally {
      // Reset button state
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      }
    });
  }
  
// Send contact email (placeholder function - replace with your email service)
async function sendContactEmail(data) {
  // This is a placeholder implementation
  // You can replace this with your preferred email service:
  // - EmailJS
  // - Formspree
  // - Netlify Forms
  // - Custom backend endpoint
  
  // For now, we'll simulate a successful response
  // In production, replace this with actual email sending logic
  
  console.log('Contact form data:', data);
  
  // Example using EmailJS (you would need to add EmailJS script and configure it)
  // if (window.emailjs) {
  //   return await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
  //     to_email: 'connect@gigster.pro',
  //     from_name: data.name,
  //     from_email: data.email,
  //     subject: data.subject,
  //     message: data.message
  //   });
  // }
  
  // For now, return success (replace with actual implementation)
  return { success: true };
}

// Open full map in new tab
function openFullMap() {
  const venueRoute = CONFIG.event?.venue?.route;
  if (venueRoute) {
    window.open(venueRoute, '_blank', 'noopener,noreferrer');
  } else {
    // Fallback to Google Maps with venue coordinates
    const venueAddress = CONFIG.event?.venue?.address?.en || CONFIG.event?.venue?.address;
    if (venueAddress) {
      const encodedAddress = encodeURIComponent(venueAddress);
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank', 'noopener,noreferrer');
    }
  }
}

// Smart map touch handling - only allow interaction with two fingers
function setupMapTouchHandling() {
  const mapContainer = document.querySelector('.map-container');
  const mapIframe = document.getElementById('mapFrame');
  
  if (!mapContainer || !mapIframe) return;
  
  let touchCount = 0;
  let isMultiTouch = false;
  
  // Track touch events on the container
  mapContainer.addEventListener('touchstart', (e) => {
    touchCount = e.touches.length;
    isMultiTouch = touchCount >= 2;
    
    if (isMultiTouch) {
      // Enable iframe interaction for multi-touch
      mapIframe.style.pointerEvents = 'auto';
    } else {
      // Disable iframe interaction for single touch
      mapIframe.style.pointerEvents = 'none';
      // Prevent default to allow page scrolling
      e.preventDefault();
    }
  }, { passive: false });
  
  mapContainer.addEventListener('touchmove', (e) => {
    touchCount = e.touches.length;
    isMultiTouch = touchCount >= 2;
    
    if (!isMultiTouch) {
      // Disable iframe interaction for single touch
      mapIframe.style.pointerEvents = 'none';
    }
  });
  
  mapContainer.addEventListener('touchend', (e) => {
    touchCount = e.touches.length;
    isMultiTouch = touchCount >= 2;
    
    if (!isMultiTouch) {
      // Disable iframe interaction when multi-touch ends
      mapIframe.style.pointerEvents = 'none';
    }
  });
  
  // Handle mouse events for desktop - only enable on mouse down
  mapContainer.addEventListener('mousedown', () => {
    // Enable iframe interaction when mouse button is pressed
    mapIframe.style.pointerEvents = 'auto';
  });
  
  mapContainer.addEventListener('mouseup', () => {
    // Disable iframe interaction when mouse button is released
    mapIframe.style.pointerEvents = 'none';
  });
  
  mapContainer.addEventListener('mouseleave', () => {
    // Disable interaction when mouse leaves the container
    mapIframe.style.pointerEvents = 'none';
  });
  
  // Prevent wheel events from scrolling the iframe when not actively interacting
  mapContainer.addEventListener('wheel', (e) => {
    if (mapIframe.style.pointerEvents === 'none') {
      // Allow page scrolling when iframe is not active
      return;
    }
    // When iframe is active, let the wheel event pass through to the iframe
  }, { passive: true });
}

// Функция удалена - дублирование с escapeHTML в i18n.js

// Export functions globally for other modules
  window.detectBrowserLanguage = detectBrowserLanguage;
  window.getLangName = getLangName;
  window.getLangFlagPath = getLangFlagPath;
  window.getTranslation = getTranslation;

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}





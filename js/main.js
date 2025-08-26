// Global variables
let CONFIG = {};
let CURRENT_LANG = 'en';
let STATIC_TRANSLATIONS = null;
const SUPPORTED_LANGS = ['en', 'cs', 'uk'];
const eventTracker = {};

// Initialize UpdatesManager
let updatesManager = null;

// Get language from localStorage or default to English
function getCurrentLang() {
  const saved = localStorage.getItem('site_language');
  const result = saved && SUPPORTED_LANGS.includes(saved) ? saved : 'en';
  return result;
}

// Set current language and apply translations
function setCurrentLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    console.warn('🌐 Main.js: Invalid language:', lang);
    return;
  }
  
  const previousLang = CURRENT_LANG;
  CURRENT_LANG = lang;
  
  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Apply new translations
  applyNewTranslations(lang);
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

// Load translations.json
async function loadTranslations() {
  try {
    const response = await fetch('translations.json');
    if (response.ok) {
      const translations = await response.json();
      STATIC_TRANSLATIONS = translations;
    } else {
      console.error('🌐 Main.js: Failed to load translations.json');
    }
  } catch (error) {
    console.error('🌐 Main.js: Error loading translations.json:', error);
  }
}

// Initialize new language UI
function initNewLangUI() {
  // Set initial language
  CURRENT_LANG = getCurrentLang();
  
  // Load and apply translations
  loadAndApplyTranslations();
  
  // Create language switcher in header
  const header = document.querySelector('.container.hdr');
  if (!header) {
    console.warn('🌐 Main.js: Header not found for language switcher');
    return;
  }
  
  const langSwitcher = document.createElement('div');
  langSwitcher.className = 'lang-switcher';
  langSwitcher.innerHTML = `
    <div class="lang-current">
      <span class="lang-flag">${getLangFlag(CURRENT_LANG)}</span>
      <span class="lang-name">${getLangName(CURRENT_LANG)}</span>
      <button class="lang-toggle" aria-label="Сменить язык">▼</button>
    </div>
    <div class="lang-dropdown">
      ${SUPPORTED_LANGS.filter(lang => lang !== CURRENT_LANG).map(lang => `
        <button class="lang-option" 
                data-lang="${lang}" 
                onclick="setCurrentLang('${lang}')">
          <span class="lang-flag">${getLangFlag(lang)}</span>
          <span class="lang-name">${getLangName(lang)}</span>
        </button>
      `).join('')}
    </div>
  `;
  
  // Insert language switcher into header
  const headerRight = header.querySelector('.header-right') || header;
  headerRight.appendChild(langSwitcher);
  
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
}

// Get language flag emoji
function getLangFlag(lang) {
  const flags = { en: '🇬🇧', cs: '🇨🇿', uk: '🇺🇦' };
  return flags[lang] || '🌐';
}

// Get language name
function getLangName(lang) {
  const names = { en: 'EN', cs: 'CS', uk: 'UK' };
  return names[lang] || 'EN';
}

// Load and apply translations from translations.json
async function loadAndApplyTranslations() {
  // Load translations from translations.json
  try {
    const response = await fetch('translations.json', { cache: 'no-store' });
    if (response.ok) {
      window.STATIC_TRANSLATIONS = await response.json();
    } else {
      console.warn('🌐 Main.js: Failed to load translations.json');
      return;
    }
  } catch (error) {
    console.error('🌐 Main.js: Error loading translations:', error);
    return;
  }
  
  // Wait for i18n.js to be ready
  let attempts = 0;
  while (!window.applyTranslations && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.applyTranslations) {
    console.error('🌐 Main.js: applyTranslations function not available after waiting');
    return;
  }
  
  // Apply translations for current language
  try {
    window.applyTranslations(CURRENT_LANG);
  } catch (error) {
    console.error('🌐 Main.js: Error applying translations:', error);
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
  
  // Update all translatable content after translations are loaded
  updateEventInfo();
  updateArtists();
  updateFaqs();
  updateTickets();
  updateStaticTranslations();
  
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
        <span class="lang-flag">${getLangFlag(lang)}</span>
        <span class="lang-name">${getLangName(lang)}</span>
        <button class="lang-toggle" aria-label="Сменить язык">▼</button>
      `;
    }
    
    // Update dropdown options
    const langDropdown = langSwitcher.querySelector('.lang-dropdown');
    if (langDropdown) {
      langDropdown.innerHTML = SUPPORTED_LANGS.filter(l => l !== lang).map(l => `
        <button class="lang-option" 
                data-lang="${l}" 
                onclick="setCurrentLang('${l}')">
          <span class="lang-flag">${getLangFlag(l)}</span>
          <span class="lang-name">${getLangName(l)}</span>
        </button>
      `).join('');
    }
  } else {
    console.warn('🌐 Main.js: Language switcher not found for UI update');
  }
}

// Get current language (alias for compatibility)
function getCurrentLanguage() {
  return CURRENT_LANG;
}

// Detect browser language
function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const shortLang = browserLang.split('-')[0].toLowerCase();
  const result = SUPPORTED_LANGS.includes(shortLang) ? shortLang : 'en';
  return result;
}

// Apply browser language on first visit
function applyBrowserLanguage() {
  const detectedLang = detectBrowserLanguage();
  const savedLang = getCurrentLang();
  const finalLang = savedLang || detectedLang;
  
  if (finalLang !== CURRENT_LANG) {
    setCurrentLang(finalLang);
  }
}

// Main initialization function
async function init() {
  // Load config and translations
  await loadConfig();
  await loadTranslations();
  
  // Initialize language UI
  initNewLangUI();
  applyBrowserLanguage();
  
  // Setup header overlay
  setupHeaderOverlay();
  
  // Setup mobile menu
  setupMobileMenu();
  
  // Setup form
  setupForm();
  
  // Initialize UpdatesManager
  if (window.UpdatesManager) {
    updatesManager = new window.UpdatesManager();
    await updatesManager.init();
  } else {
    console.warn('🌐 Main.js: UpdatesManager not available');
  }
  
  // Mount basic content
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
  
  // Update static translations
  updateStaticTranslations();
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
        .map(line => `<p>${escapeHTML(line.trim())}</p>`)
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
    return getNestedValue(fallbackData, key, fallback);
  }
  
  return getNestedValue(currentLangData, key, fallback);
}

// Helper function to get nested object values by dot notation
function getNestedValue(obj, path, fallback = '') {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn('🌐 Main.js: Key not found in translations:', key, 'at path:', path);
      return fallback;
    }
  }
  
  return current || fallback;
}

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
  if (flagEl) flagEl.src = e.flag;
  
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
        .map(l => `<a class="btn" href="${l.u}" target="_blank" rel="noopener noreferrer">${l.t}</a>`)
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

// Update functions moved to updates.js module

// Utility function to convert multi-line text to HTML paragraphs
function textToParagraphs(text) {
  if (!text) {
    return [];
  }
  
  const paragraphs = text.split('\n').filter(p => p.trim());
  return paragraphs;
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
    mediaClone.style.maxHeight = '100%';
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

  // Event listeners
  prevBtn.addEventListener('click', () => {
    prevSlide();
    // Stop autoplay when user manually navigates
    if (isAutoplayActive) {
      stopAutoplay();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    nextSlide();
    // Stop autoplay when user manually navigates
    if (isAutoplayActive) {
      stopAutoplay();
    }
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

  slider.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  slider.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX;
  });

  slider.addEventListener('touchend', () => {
    const diff = startX - currentX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentSlide < totalSlides - 1) {
        nextSlide();
        // Stop autoplay when user manually navigates
        if (isAutoplayActive) {
          stopAutoplay();
        }
      } else if (diff < 0 && currentSlide > 0) {
        prevSlide();
        // Stop autoplay when user manually navigates
        if (isAutoplayActive) {
          stopAutoplay();
        }
      }
    }
  });

  // Initialize
  updateSlides();
  
  // Add click handlers for lightbox
  slides.forEach((slide, index) => {
    const media = slide.querySelector('img, video');
    if (media) {
      media.style.cursor = 'pointer';
      media.addEventListener('click', () => {
        openLightbox(index);
      });
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

function escapeHTML(text) {
  if (!text) {
    return '';
  }
  
  const result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  return result;
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}





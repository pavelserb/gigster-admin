// i18n with dropdown menu (animated), ?lang=xx deep link, persistence
let TRANSLATIONS = {};
const FALLBACK_LANG = 'en';
const LANG_LABELS = { en: 'English', cs: 'Čeština', uk: 'Українська' };
const LANG_CODES  = { en: 'EN',      cs: 'CS',      uk: 'UK'  }; // text on button

// --- helpers
const getLang = () => localStorage.getItem('site_language') || FALLBACK_LANG;
function updateLangButton(code){
  const btn = document.getElementById('langBtn');
  if (!btn) return;
  const codeText = (LANG_CODES[code] || code).toUpperCase();
  btn.textContent = codeText;
  btn.setAttribute('aria-label', `Language: ${codeText}`);
}
const setLang = (l) => {
  localStorage.setItem('site_language', l);
  document.documentElement.lang = l;
  updateLangButton(l);
};

function langFromUrl() {
  const u = new URL(location.href);
  const q = (u.searchParams.get('lang') || '').toLowerCase();
  if (q) return q;
  const m = location.hash.match(/lang=([a-z-]{2,8})/i);
  return m ? m[1].toLowerCase() : '';
}

function detectBrowserLang(supported) {
  const list = (navigator.languages || []).map(x => x.split('-')[0].toLowerCase());
  for (const l of list) if (supported.includes(l)) return l;
  const single = (navigator.language || '').split('-')[0].toLowerCase();
  if (supported.includes(single)) return single;
  return FALLBACK_LANG;
}

// Load translations from translations.json
async function loadTranslations() {
  try {
    const response = await fetch('translations.json');
    if (response.ok) {
      TRANSLATIONS = await response.json();
      
      // Export to window for main.js to access
      window.TRANSLATIONS = TRANSLATIONS;
      
      // Apply initial translations for current language
      const currentLang = getLang();
      if (currentLang) {
        applyTranslations(currentLang);
      }
    } else {
      console.error('🌐 i18n.js: Failed to load translations.json');
    }
  } catch (error) {
    console.error('🌐 i18n.js: Error loading translations:', error);
  }
}

function escapeHTML(s){
  return s.replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function getByPath(dict, path){
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null) ? acc[k] : undefined, dict);
}

// Apply translations for a specific language
function applyTranslations(lang) {
  if (!TRANSLATIONS || !TRANSLATIONS.sections || !TRANSLATIONS.sections[lang]) {
    console.warn('🌐 i18n.js: No translations available for language:', lang);
    return;
  }
  
  const dict = TRANSLATIONS.sections[lang];
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach((element, index) => {
    const path = element.getAttribute('data-i18n');
    if (!path) return;
    
    const val = getByPath(dict, path);
    if (val) {
      const mode = element.getAttribute('data-i18n-mode') || 'text';
      
      if (mode === 'html') {
        element.innerHTML = val;
      } else {
        element.textContent = val;
      }
    }
  });
}


function updateUrlLangParam(lang) {
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
}

// Build dropdown (without active lang)
function buildLangMenu(menu, supported, current) {
  menu.innerHTML = '';
  supported
    .filter(code => code !== current)
    .forEach(code => {
      const item  = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.dataset.lang = code;
      item.className = 'lang-item';
      item.textContent = LANG_LABELS[code] || code.toUpperCase();
      item.addEventListener('click', () => {
        setLang(code);
        applyTranslations(code);
        updateUrlLangParam(code);
        // rebuild menu to exclude new active
        buildLangMenu(menu, supported, code);
        closeMenu(menu);                   // animate close
        document.getElementById('langBtn')?.focus();
      });
      menu.appendChild(item);
    });
}

// Open/close helpers (use class .open, no display:none)
function openMenu(menu){
  menu.classList.add('open');
  document.getElementById('langBtn')?.setAttribute('aria-expanded', 'true');
}
function closeMenu(menu){
  menu.classList.remove('open');
  document.getElementById('langBtn')?.setAttribute('aria-expanded', 'false');
}

function initLangUI() {
  const supported = Object.keys(TRANSLATIONS);
  const current   = getLang();
  const btn  = document.getElementById('langBtn');
  const menu = document.getElementById('langMenu');
  if (!btn || !menu) return;

  // Remove legacy cycling listener if present
  btn.onclick = null;
  try { btn.removeEventListener('click', cycleLang); } catch {}

  // initial paint
  updateLangButton(current);
  buildLangMenu(menu, supported, current);

  // toggle only menu (no language change here)
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (menu.classList.contains('open')) {
      closeMenu(menu);
    } else {
      openMenu(menu);
      // focus first item for keyboard users
      requestAnimationFrame(() => menu.querySelector('button')?.focus({ preventScroll:true }));
    }
  });

  // keyboard navigation inside menu
  menu.addEventListener('keydown', (e) => {
    const items = Array.from(menu.querySelectorAll('button'));
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault(); items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault(); items[items.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault(); closeMenu(menu); btn.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      // "click" current item
      if (idx >= 0) items[idx].click();
    }
  });

  // close on outside click / Esc
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      closeMenu(menu);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu(menu); btn.focus();
    }
  });
}

// optional legacy
function cycleLang() {
  const arr = Object.keys(TRANSLATIONS);
  const current = getLang();
  const idx = Math.max(0, arr.indexOf(current));
  const next = arr[(idx + 1) % arr.length] || FALLBACK_LANG;
  setLang(next);
  applyTranslations(next);
  updateUrlLangParam(next);
}

// export
window.loadTranslations = loadTranslations;
window.applyTranslations = applyTranslations;
window.initLangUI = initLangUI;
window.getLang = getLang;
window.cycleLang = cycleLang;

// Listen for language changes from main.js
document.addEventListener('languageChanged', (e) => {
  const newLang = e.detail.language;
  if (newLang) {
    setLang(newLang);
    applyTranslations(newLang);
  }
});

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTranslations);
} else {
  loadTranslations();
}

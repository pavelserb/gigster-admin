// Система загрузки пикселей и тегов
class PixelLoader {
  constructor() {
    this.pixels = {};
    this.fbPixels = [];
    this.isLoaded = false;
    this.init();
  }
  
  async init() {
    await this.loadPixelSettings();
    this.loadPixels();
    this.isLoaded = true;
  }
  
  async loadPixelSettings() {
    try {
      // Пытаемся загрузить настройки с сервера
      const response = await fetch('pixels.json');
      if (response.ok) {
        const data = await response.json();
        this.pixels = this.normalizePixelData(data);
      } else {
        // Если сервер недоступен, используем localStorage
        this.pixels = this.loadFromLocalStorage();
      }
    } catch (error) {
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
      custom: [],
      settings: {
        respectConsent: true,
        debugMode: false
      }
    };
  }
  
  loadPixels() {
    // Проверяем согласие на cookies если требуется
    if (this.pixels.settings?.respectConsent && !this.hasCookieConsent()) {
      console.log('Waiting for cookie consent before loading pixels');
      return;
    }
    
    // Загружаем GTM
    if (this.pixels.gtm && Array.isArray(this.pixels.gtm)) {
      this.pixels.gtm.forEach(pixel => {
        if (pixel.enabled && pixel.id) {
          this.loadGTM(pixel.id, pixel.name);
        }
      });
    }
    
    // Загружаем GA4
    if (this.pixels.ga && Array.isArray(this.pixels.ga)) {
      this.pixels.ga.forEach(pixel => {
        if (pixel.enabled && pixel.id) {
          this.loadGA4(pixel.id, pixel.name);
        }
      });
    }
    
    // Загружаем Facebook Pixel (все пиксели одним блоком)
    if (this.pixels.fb && Array.isArray(this.pixels.fb)) {
      const enabledFbPixels = this.pixels.fb.filter(pixel => pixel.enabled && pixel.id);
      
      if (enabledFbPixels.length > 0) {
        // Сохраняем все пиксели для инициализации
        this.fbPixels = enabledFbPixels;
        
        // Загружаем первый пиксель (это запустит загрузку скрипта)
        const firstPixel = enabledFbPixels[0];
        this.loadFacebookPixel(firstPixel.id, firstPixel.name);
      }
    }
    
    // Загружаем TikTok Pixel
    if (this.pixels.tt && Array.isArray(this.pixels.tt)) {
      this.pixels.tt.forEach(pixel => {
        if (pixel.enabled && pixel.id) {
          this.loadTikTokPixel(pixel.id, pixel.name);
        }
      });
    }
    
    // Загружаем кастомные теги
    if (this.pixels.custom && this.pixels.custom.length > 0) {
      this.loadCustomTags();
    }
    
    // Логируем в консоль если включен debug режим
    if (this.pixels.settings?.debugMode) {
      console.log('Pixels loaded:', this.pixels);
    }
  }
  
  loadGTM(containerId, name = 'GTM Container') {
    // Создаем dataLayer если его нет
    window.dataLayer = window.dataLayer || [];
    
    // Загружаем GTM скрипт для каждого контейнера
    const script = document.createElement('script');
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${containerId}');
    `;
    
    document.head.appendChild(script);
    console.log(`GTM loaded: ${name} (${containerId})`);
  }
  
  loadGA4(measurementId, name = 'GA4 Property') {
    // Создаем dataLayer если его нет
    window.dataLayer = window.dataLayer || [];
    
    // Если gtag еще не загружен, загружаем основной скрипт
    if (!window.gtag) {
      // Загружаем gtag скрипт
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      
      // Инициализируем GA4
      script.onload = () => {
        window.gtag = function() {
          window.dataLayer.push(arguments);
        };
        
        window.gtag('js', new Date());
        window.gtag('config', measurementId);
        
        console.log(`GA4 loaded: ${name} (${measurementId})`);
      };
    } else {
      // Если gtag уже загружен, просто добавляем новое свойство
      window.gtag('config', measurementId);
      console.log(`GA4 property added: ${name} (${measurementId})`);
    }
  }
  
  loadFacebookPixel(pixelId, name = 'FB Pixel') {
    // Если Facebook Pixel еще не загружен, загружаем основной скрипт
    if (!window.fbq) {
      // Загружаем Facebook Pixel скрипт
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;
      
      document.head.appendChild(script);
      
      // Инициализируем пиксели сразу, без ожидания
      this.initAllFacebookPixels();
    } else {
      // Если скрипт уже загружен, инициализируем все пиксели
      this.initAllFacebookPixels();
    }
  }
  
  initAllFacebookPixels() {
    if (!this.fbPixels || this.fbPixels.length === 0) return;
    
    // Определяем язык до загрузки body
    const language = this.detectLanguage();
    
    // Инициализируем все пиксели
    this.fbPixels.forEach((pixel, index) => {
      try {
        window.fbq('init', pixel.id);
      } catch (error) {
        console.error(`Error initializing FB pixel ${pixel.name}:`, error);
      }
    });
    
    // Отправляем PageView событие с UTM параметрами
    try {
      const utmParams = this.getUTMParams();
      console.log('🔍 PixelLoader: UTM параметры:', utmParams);
      
      window.fbq('track', 'PageView', {
        content_category: 'Event Landing Page',
        custom_data: {
          language: language,
          page_type: 'landing',
          utm_source: utmParams.utm_source || 'direct',
          utm_medium: utmParams.utm_medium || 'none',
          utm_campaign: utmParams.utm_campaign || 'none',
          utm_content: utmParams.utm_content || 'none',
          utm_term: utmParams.utm_term || 'none'
        }
      });
      console.log('✅ PixelLoader: PageView с UTM отправлен');
    } catch (error) {
      console.error('Error sending PageView to FB pixels:', error);
    }
  }
  
  detectLanguage() {
    // Проверяем localStorage
    const storedLang = localStorage.getItem('site_language');
    if (storedLang) return storedLang;
    
    // Проверяем URL параметр
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) return urlLang;
    
    // Определяем язык браузера
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const langCode = browserLang.split('-')[0].toLowerCase();
      // Поддерживаемые языки
      if (['en', 'cs', 'uk'].includes(langCode)) {
        return langCode;
      }
    }
    
    // По умолчанию английский
    return 'en';
  }
  
  getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_content: urlParams.get('utm_content'),
      utm_term: urlParams.get('utm_term')
    };
  }
  
  // Глобальная функция для определения языка
  static getLanguage() {
    // Проверяем localStorage
    const storedLang = localStorage.getItem('site_language');
    if (storedLang) return storedLang;
    
    // Проверяем URL параметр
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) return urlLang;
    
    // Определяем язык браузера
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const langCode = browserLang.split('-')[0].toLowerCase();
      // Поддерживаемые языки
      if (['en', 'cs', 'uk'].includes(langCode)) {
        return langCode;
      }
    }
    
    // По умолчанию английский
    return 'en';
  }
  
  loadTikTokPixel(pixelId, name = 'TikTok Pixel') {
    // Если TikTok Pixel еще не загружен, загружаем основной скрипт
    if (!window.ttq) {
      // Загружаем TikTok Pixel скрипт
      const script = document.createElement('script');
      script.innerHTML = `
        !function (w, d, t) {
          w[t] = w[t] || [];
          w[t].push({
            'ttq.load':
            '${pixelId}'
          });
          var s = d.createElement(t);
          s.src = 'https://analytics.tiktok.com/i18n/pixel/sdk.js';
          s.async = true;
          var e = d.getElementsByTagName(t)[0];
          if (e && e.parentNode) {
            e.parentNode.insertBefore(s, e);
          } else {
            document.head.appendChild(s);
          }
        }(window, document, 'ttq');
      `;
      
      document.head.appendChild(script);
      console.log(`TikTok Pixel loaded: ${name} (${pixelId})`);
    } else {
      // Если скрипт уже загружен, просто добавляем новый пиксель
      window.ttq.push({
        'ttq.load': pixelId
      });
      console.log(`TikTok Pixel added: ${name} (${pixelId})`);
    }
  }
  
  loadCustomTags() {
    this.pixels.custom.forEach((tag, index) => {
      if (tag.enabled && tag.code) {
        try {
          const script = document.createElement('script');
          script.innerHTML = tag.code;
          document.head.appendChild(script);
          console.log(`Custom tag loaded: ${tag.name || `Tag ${index + 1}`}`);
        } catch (error) {
          console.error(`Failed to load custom tag: ${tag.name || `Tag ${index + 1}`}`, error);
        }
      }
    });
  }
  
  hasCookieConsent() {
    // Проверяем согласие на cookies
    // Можно настроить под вашу систему согласия
    return localStorage.getItem('cookie_consent') === 'accepted' || 
           !this.pixels.settings?.respectConsent;
  }
  
  // Метод для принудительной загрузки пикселей (например, после согласия на cookies)
  forceLoad() {
    if (!this.isLoaded) {
      this.loadPixels();
    }
  }
  
  // Метод для обновления настроек
  async refreshSettings() {
    await this.loadPixelSettings();
    // Перезагружаем страницу для применения новых настроек
    window.location.reload();
  }
}

// Инициализация сразу при загрузке скрипта
window.pixelLoader = new PixelLoader();

// Экспортируем для использования в других модулях
window.PixelLoader = PixelLoader;

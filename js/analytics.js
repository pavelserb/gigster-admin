// Универсальная система отслеживания событий
class EventTracker {
  constructor() {
    this.isInitialized = false;
    this.sessionStart = Date.now();
    this.init();
  }
  
  init() {
    console.log('EventTracker.init() вызван');
    
    // Проверяем, не инициализирован ли уже EventTracker
    if (this.isInitialized) {
      console.log('⚠️ EventTracker уже инициализирован, пропускаем повторную инициализацию');
      return;
    }
    
    this.setupEventListeners();
    
    // Настраиваем отслеживание событий СРАЗУ
    this.setupEventTracking();
    
    // Проверяем загрузку пикселей
    this.checkPixelsLoaded();
    
    // Ждем загрузки пикселей только для отправки событий
    this.waitForPixels();
  }
  
  waitForPixels() {
    // Инициализируем сразу, без ожидания пикселей
    console.log('Пиксели инициализированы:', {
      fbq: !!window.fbq,
      ttq: !!window.ttq,
      dataLayer: !!window.dataLayer
    });
    
    this.isInitialized = true;
    
    // PageView отправляется автоматически при инициализации пикселей
    // UTM параметры добавляются в PixelLoader
    console.log('EventTracker инициализирован, PageView отправлен через PixelLoader');
  }
  
  setupEventTracking() {
    console.log('Настраиваем отслеживание событий...');
    
    // Только простой обработчик для TicketButtonClick
    this.setupUniversalTicketLinks();
  }
  

  

  
    setupUniversalTicketLinks() {
    // Максимально простой обработчик
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-track') && e.target.getAttribute('data-track') === 'TicketButtonClick') {
        console.log('🎯 Клик по TicketButtonClick:', e.target.textContent.trim());
        
        if (window.fbq) {
          const clickId = Math.random().toString(36).substr(2, 9);
          const timestamp = Date.now();
          const eventData = {
            button_text: e.target.textContent.trim(),
            timestamp: timestamp,
            click_id: clickId
          };
          
          console.log('📤 Отправляем TicketButtonClick с ID:', clickId, 'timestamp:', timestamp);
          
          // Попробуем с небольшой задержкой
          setTimeout(() => {
            // Попробуем стандартное событие Lead вместо кастомного
            window.fbq('track', 'Lead', eventData);
            console.log('✅ Lead событие отправлено с ID:', clickId, 'timestamp:', timestamp);
          }, 50);
        }
      }
    });
    
    console.log('✅ Простой event listener добавлен');
  }
  

  

  

  

  
  // Отслеживание события
  track(eventName, parameters = {}) {
    console.log('EventTracker.track() вызван:', eventName, parameters);
    
    // Не отправляем события, пока пиксели не загружены
    if (!this.isInitialized) {
      console.log('EventTracker еще не инициализирован, событие отложено:', eventName);
      return;
    }
    
    const eventData = {
      event: eventName,
      timestamp: Date.now(),
      url: window.location.href,
      language: window.PixelLoader ? window.PixelLoader.getLanguage() : 'en',
      session_id: this.getSessionId(),
      ...parameters
    };
    
    // Google Analytics 4
    if (window.gtag) {
      this.trackGA4(eventName, parameters);
    }
    
    // Meta Pixel
    if (window.fbq) {
      this.trackMeta(eventName, parameters);
    }
    
    // TikTok Pixel
    if (window.ttq) {
      this.trackTikTok(eventName, parameters);
    }
    
    // GTM (для кастомных событий)
    if (window.dataLayer) {
      window.dataLayer.push(eventData);
    }
  }
  
  // GA4 события
  trackGA4(eventName, params) {
    // PageView отправляется через PixelLoader
    console.log('GA4: событие', eventName, params);
  }
  
  // Meta Pixel события
  trackMeta(eventName, params) {
    // PageView отправляется через PixelLoader
    console.log('Meta: событие', eventName, params);
  }
  

  
  // TikTok Pixel события
  trackTikTok(eventName, params) {
    // PageView отправляется через PixelLoader
    console.log('TikTok: событие', eventName, params);
  }
  
  // Вспомогательные методы
  getSessionId() {
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }
  
  getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  getUTMParams() {
    return {
      utm_source: this.getUrlParameter('utm_source'),
      utm_medium: this.getUrlParameter('utm_medium'),
      utm_campaign: this.getUrlParameter('utm_campaign'),
      utm_content: this.getUrlParameter('utm_content'),
      utm_term: this.getUrlParameter('utm_term')
    };
  }
  
  checkPixelsLoaded() {
    // Проверяем загрузку пикселей
    const pixels = {
      gtag: typeof window.gtag !== 'undefined',
      fbq: typeof window.fbq !== 'undefined',
      ttq: typeof window.ttq !== 'undefined',
      dataLayer: typeof window.dataLayer !== 'undefined'
    };
    
    console.log('Pixels loaded:', pixels);
  }
  
  setupEventListeners() {
    // Пока отключаем все кастомные события
    // this.trackSectionViews();
  }
  
  // Track ticket clicks
  setupTicketTracking() {
    // Primary tickets button (floating)
    const ticketsPrimary = document.getElementById('ticketsPrimary');
    if (ticketsPrimary) {
      ticketsPrimary.addEventListener('click', () => {
        this.track('ticket_click', {
          position: 'floating',
          vendor_name: 'primary'
        });
      });
    }
    
    // Tickets section button
    const ticketsSectionBtn = document.querySelector('#tickets .btn');
    if (ticketsSectionBtn) {
      ticketsSectionBtn.addEventListener('click', () => {
        this.track('ticket_click', {
          position: 'section',
          vendor_name: 'primary'
        });
      });
    }
  }
  

  
  trackSectionViews() {
    const sections = ['hero', 'about', 'artists', 'tickets', 'location', 'faqs', 'connect'];
    const observedSections = new Set();
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionName = entry.target.id;
          if (!observedSections.has(sectionName)) {
            observedSections.add(sectionName);
            this.track('section_view', {
              section_name: sectionName
            });
          }
        }
      });
    }, { threshold: 0.3 });
    
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        observer.observe(section);
      }
    });
  }
}

// Экспортируем EventTracker глобально
window.EventTracker = EventTracker;

// Глобальная переменная для доступа к трекеру
window.eventTracker = null;

// EventTracker will be initialized by main.js to ensure proper order
// This prevents conflicts and ensures analytics is ready when needed

// Логируем все события Facebook для отладки
if (window.fbq) {
  const originalFbq = window.fbq;
  window.fbq = function(...args) {
    console.log('Facebook Pixel вызван:', args);
    return originalFbq.apply(this, args);
  };
}

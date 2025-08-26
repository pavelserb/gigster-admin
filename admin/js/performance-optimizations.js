// Performance Optimizations for Admin Panel

// Intersection Observer for lazy loading
class LazyLoader {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadContent(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px',
        threshold: 0.1
      });
    }
  }

  observe(element) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  loadContent(element) {
    const dataSrc = element.dataset.src;
    if (dataSrc) {
      if (element.tagName === 'IMG') {
        element.src = dataSrc;
      } else if (element.tagName === 'IFRAME') {
        element.src = dataSrc;
      }
      element.removeAttribute('data-src');
    }
  }
}

// Virtual scrolling for large lists
class VirtualScroller {
  constructor(container, itemHeight, items) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.items = items;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    this.scrollTop = 0;
    this.startIndex = 0;
    this.endIndex = this.visibleItems;
    
    this.init();
  }

  init() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // Create spacer for total height
    this.spacer = document.createElement('div');
    this.spacer.style.height = `${this.items.length * this.itemHeight}px`;
    this.container.appendChild(this.spacer);
    
    // Create content container
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.right = '0';
    this.container.appendChild(this.content);
    
    this.render();
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  handleScroll() {
    const newScrollTop = this.container.scrollTop;
    const newStartIndex = Math.floor(newScrollTop / this.itemHeight);
    const newEndIndex = Math.min(newStartIndex + this.visibleItems, this.items.length);
    
    if (newStartIndex !== this.startIndex || newEndIndex !== this.endIndex) {
      this.startIndex = newStartIndex;
      this.endIndex = newEndIndex;
      this.render();
    }
  }

  render() {
    this.content.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
    this.content.innerHTML = '';
    
    for (let i = this.startIndex; i < this.endIndex; i++) {
      if (this.items[i]) {
        const item = this.createItem(this.items[i], i);
        this.content.appendChild(item);
      }
    }
  }

  createItem(data, index) {
    // Override this method in subclasses
    const div = document.createElement('div');
    div.style.height = `${this.itemHeight}px`;
    div.textContent = data;
    return div;
  }
}

// Memory management utilities
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  set(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up unused DOM elements
  cleanup() {
    // Remove event listeners from removed elements
    const removedElements = document.querySelectorAll('[data-removed]');
    removedElements.forEach(element => {
      element.remove();
    });
  }
}

// Image optimization
class ImageOptimizer {
  constructor() {
    this.lazyLoader = new LazyLoader();
  }

  optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      this.lazyLoader.observe(img);
    });
  }

  // Compress images before upload
  async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}

// Form optimization
class FormOptimizer {
  constructor() {
    this.debounceTimers = new Map();
  }

  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimers.get(func));
      this.debounceTimers.set(func, setTimeout(() => func.apply(this, args), wait));
    };
  }

  // Auto-save form data
  setupAutoSave(form, saveFunction, delay = 1000) {
    const debouncedSave = this.debounce(saveFunction, delay);
    
    form.addEventListener('input', debouncedSave);
    form.addEventListener('change', debouncedSave);
  }

  // Validate form fields in real-time
  setupRealTimeValidation(form) {
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', this.debounce(() => this.validateField(input), 300));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const isValid = this.isFieldValid(field, value);
    
    if (isValid) {
      field.classList.remove('invalid');
      field.classList.add('valid');
    } else {
      field.classList.remove('valid');
      field.classList.add('invalid');
    }
    
    return isValid;
  }

  isFieldValid(field, value) {
    const type = field.type;
    const required = field.hasAttribute('required');
    
    if (required && !value) return false;
    
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return /^https?:\/\/.+/.test(value);
      case 'number':
        return !isNaN(value) && value !== '';
      default:
        return true;
    }
  }
}

// Animation optimization
class AnimationOptimizer {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });
    }
  }

  observe(element) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  // Smooth scroll to element
  scrollToElement(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset + rect.top - offset;
    
    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  }
}

// Network optimization
class NetworkOptimizer {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // Cache API responses
  async cachedFetch(url, options = {}) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    const promise = fetch(url, options).then(response => {
      if (response.ok) {
        this.cache.set(cacheKey, response.clone());
      }
      return response;
    });
    
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const result = await promise;
      this.pendingRequests.delete(cacheKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      throw error;
    }
  }

  // Preload critical resources
  preloadResources(resources) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.url;
      link.as = resource.type;
      document.head.appendChild(link);
    });
  }
}

// Initialize all optimizations
class PerformanceOptimizer {
  constructor() {
    this.lazyLoader = new LazyLoader();
    this.memoryManager = new MemoryManager();
    this.imageOptimizer = new ImageOptimizer();
    this.formOptimizer = new FormOptimizer();
    this.animationOptimizer = new AnimationOptimizer();
    this.networkOptimizer = new NetworkOptimizer();
    
    this.init();
  }

  init() {
    // Optimize images
    this.imageOptimizer.optimizeImages();
    
    // Setup form optimizations
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      this.formOptimizer.setupRealTimeValidation(form);
    });
    
    // Observe elements for animations
    const animateElements = document.querySelectorAll('[data-animate]');
    animateElements.forEach(element => {
      this.animationOptimizer.observe(element);
    });
    
    // Preload critical resources
    this.networkOptimizer.preloadResources([
      { url: '/admin/css/admin.css', type: 'style' },
      { url: '/admin/js/admin.js', type: 'script' }
    ]);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.memoryManager.cleanup();
    });
  }
}

// Export for use in main admin.js
window.PerformanceOptimizer = PerformanceOptimizer;
window.LazyLoader = LazyLoader;
window.VirtualScroller = VirtualScroller;
window.MemoryManager = MemoryManager;
window.ImageOptimizer = ImageOptimizer;
window.FormOptimizer = FormOptimizer;
window.AnimationOptimizer = AnimationOptimizer;
window.NetworkOptimizer = NetworkOptimizer;

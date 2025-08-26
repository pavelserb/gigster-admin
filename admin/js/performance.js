// Performance optimizations for admin panel
class AdminPerformance {
  constructor() {
    this.observers = new Map();
    this.debounceTimers = new Map();
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupResizeObserver();
    this.setupTouchOptimizations();
    this.setupKeyboardShortcuts();
  }

  // Setup intersection observer for lazy loading
  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          element.classList.add('visible');
          
          // Load images if they have data-src
          const images = element.querySelectorAll('img[data-src]');
          images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          });
          
          // Unobserve after loading
          this.intersectionObserver.unobserve(element);
        }
      });
    }, options);

    // Observe elements with lazy-load class
    document.querySelectorAll('.lazy-load').forEach(el => {
      this.intersectionObserver.observe(el);
    });
  }

  // Setup resize observer for responsive optimizations
  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target;
        const width = entry.contentRect.width;
        
        // Adjust layout based on container width
        if (width < 768) {
          element.classList.add('mobile-layout');
          element.classList.remove('desktop-layout');
        } else {
          element.classList.add('desktop-layout');
          element.classList.remove('mobile-layout');
        }
      });
    });

    // Observe main container
    const mainContainer = document.querySelector('.admin-main');
    if (mainContainer) {
      this.resizeObserver.observe(mainContainer);
    }
  }

  // Setup touch optimizations for mobile
  setupTouchOptimizations() {
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Add touch feedback
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.btn, .nav-tab, .dynamic-item');
      if (target) {
        target.classList.add('touch-active');
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const target = e.target.closest('.btn, .nav-tab, .dynamic-item');
      if (target) {
        setTimeout(() => {
          target.classList.remove('touch-active');
        }, 150);
      }
    }, { passive: true });
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save all
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.getElementById('saveAllBtn');
        if (saveBtn) {
          saveBtn.click();
        }
      }
      
      // Ctrl/Cmd + P to preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
          previewBtn.click();
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          const closeBtn = modal.querySelector('.modal-close');
          if (closeBtn) {
            closeBtn.click();
          }
        }
      }
    });
  }

  // Debounce function for performance
  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimers.get(func));
      this.debounceTimers.set(func, setTimeout(() => func.apply(this, args), wait));
    };
  }

  // Throttle function for performance
  throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Optimize scroll performance
  optimizeScroll(element, callback) {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          callback();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    element.addEventListener('scroll', handleScroll, { passive: true });
  }

  // Preload critical images
  preloadImages(imageUrls) {
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }

  // Cleanup observers
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Initialize performance optimizations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adminPerformance = new AdminPerformance();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminPerformance) {
    window.adminPerformance.destroy();
  }
});

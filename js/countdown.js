// Countdown Timer for Event
class CountdownTimer {
  constructor() {
    this.countdownElement = null;
    this.interval = null;
    this.eventTime = null;
  }

  // Initialize countdown timer
  init() {
    console.log('⏰ Initializing countdown timer...');
    console.log('⏰ CONFIG:', CONFIG);
    console.log('⏰ CONFIG.event:', CONFIG?.event);
    
    // Check if CONFIG is loaded
    if (!CONFIG) {
      console.warn('⏰ CONFIG not loaded yet, countdown will be initialized later');
      return;
    }
    
    // Check if countdown should be shown
    if (!CONFIG?.event?.showCountdown) {
      console.log('⏰ Countdown disabled in config');
      return;
    }

    // Get event time from config
    const eventTimeStr = CONFIG.event.time;
    console.log('⏰ Event time string:', eventTimeStr);
    
    if (!eventTimeStr) {
      console.warn('⏰ No event time specified for countdown');
      return;
    }

    // Parse event date and time
    this.eventTime = this.parseEventDateTime(eventTimeStr);
    if (!this.eventTime) {
      console.warn('⏰ Could not parse event date/time:', eventTimeStr);
      return;
    }

    // Create countdown element
    this.createCountdownElement();
    
    // Start countdown
    this.startCountdown();
    
    console.log('⏰ Countdown initialized for:', this.eventTime);
  }

  // Parse event date and time from config
  parseEventDateTime(timeStr) {
    try {
      // Get event date from config (handle multilingual objects)
      let eventDate = CONFIG.event.date;
      if (!eventDate) {
        console.warn('⏰ No event date specified');
        return null;
      }

      // Handle multilingual date object
      if (typeof eventDate === 'object') {
        // Use English date as fallback, or first available language
        eventDate = eventDate.en || eventDate.cs || eventDate.uk || Object.values(eventDate)[0];
        console.log('⏰ Using date from multilingual object:', eventDate);
      }

      if (typeof eventDate !== 'string') {
        console.warn('⏰ Invalid date format (not a string):', eventDate);
        return null;
      }

      // Parse date (assuming format like "September 5, 2025")
      const dateParts = eventDate.split(' ');
      if (dateParts.length < 3) {
        console.warn('⏰ Invalid date format:', eventDate);
        return null;
      }

      const month = dateParts[0];
      const day = parseInt(dateParts[1].replace(',', ''));
      const year = parseInt(dateParts[2]);

      console.log('⏰ Parsed date parts:', { month, day, year });

      // Parse time (assuming format like "18:00" or "18:00 – 23:00")
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) {
        console.warn('⏰ Invalid time format:', timeStr);
        return null;
      }

      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);

      console.log('⏰ Parsed time parts:', { hours, minutes });

      // Create Date object
      const monthIndex = new Date(`${month} 1, 2000`).getMonth();
      const eventDateTime = new Date(year, monthIndex, day, hours, minutes, 0);

      console.log('⏰ Created event datetime:', eventDateTime);

      return eventDateTime;
    } catch (error) {
      console.error('⏰ Error parsing event date/time:', error);
      return null;
    }
  }

  // Create countdown HTML element
  createCountdownElement() {
    // Check if countdown already exists
    if (document.getElementById('countdown')) {
      return;
    }

    // Create countdown container
    const countdownHTML = `
      <div id="countdown" class="countdown-timer">
        <div class="countdown-label" data-i18n="countdown.title">Until the event</div>
        <div class="countdown-grid">
          <div class="countdown-item">
            <div class="countdown-value" id="countdown-days">00</div>
            <div class="countdown-label" data-i18n="countdown.days">days</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-value" id="countdown-hours">00</div>
            <div class="countdown-label" data-i18n="countdown.hours">hours</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-value" id="countdown-minutes">00</div>
            <div class="countdown-label" data-i18n="countdown.minutes">minutes</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-value" id="countdown-seconds">00</div>
            <div class="countdown-label" data-i18n="countdown.seconds">seconds</div>
          </div>
        </div>
      </div>
    `;

    // Insert into hero section
    const heroContent = document.querySelector('.hero-content .hero-layout');
    if (heroContent) {
      heroContent.insertAdjacentHTML('beforeend', countdownHTML);
      this.countdownElement = document.getElementById('countdown');
    }
  }

  // Start countdown timer
  startCountdown() {
    if (!this.countdownElement || !this.eventTime) {
      return;
    }

    // Update immediately
    this.updateCountdown();

    // Update every second
    this.interval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  // Update countdown display
  updateCountdown() {
    const now = new Date();
    const timeLeft = this.eventTime - now;

    if (timeLeft <= 0) {
      // Event has started
      this.showEventStarted();
      this.stopCountdown();
      return;
    }

    // Calculate time units
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // Update display
    this.updateElement('countdown-days', days.toString().padStart(2, '0'));
    this.updateElement('countdown-hours', hours.toString().padStart(2, '0'));
    this.updateElement('countdown-minutes', minutes.toString().padStart(2, '0'));
    this.updateElement('countdown-seconds', seconds.toString().padStart(2, '0'));
  }

  // Update individual countdown element
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  // Show event started message
  showEventStarted() {
    if (this.countdownElement) {
      this.countdownElement.innerHTML = `
        <div class="countdown-started">
          <div class="countdown-started-icon">🎉</div>
          <div class="countdown-started-text" data-i18n="countdown.started">Event has started!</div>
        </div>
      `;
      
      // Apply translations to the new content
      if (window.applyTranslations) {
        window.applyTranslations(CURRENT_LANG);
      }
    }
  }

  // Stop countdown timer
  stopCountdown() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // Update countdown translations
  updateTranslations() {
    if (this.countdownElement && window.applyTranslations) {
      // Apply translations directly without triggering the full update cycle
      window.applyTranslations(CURRENT_LANG);
    }
  }

  // Destroy countdown
  destroy() {
    this.stopCountdown();
    if (this.countdownElement) {
      this.countdownElement.remove();
      this.countdownElement = null;
    }
  }
}

// Export globally
window.CountdownTimer = CountdownTimer;

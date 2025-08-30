// Auto Reorder Manager for Admin Panel
class AutoReorderManager {
  constructor() {
    this.draggedElement = null;
    this.dropZones = new Map();
    this.originalOrders = new Map();
    this.isReordering = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready and admin to be initialized
    this.waitForAdmin();
  }

  waitForAdmin() {
    if (window.admin && window.admin.config) {
      this.setupAutoReorder();
    } else {
      setTimeout(() => this.waitForAdmin(), 100);
    }
  }

  setupAutoReorder() {
    console.log('🚀 Auto Reorder Manager initialized');
    
    // Setup mutation observer to watch for new dynamic items
    this.setupMutationObserver();
    
    // Setup existing containers
    this.setupExistingContainers();
    
    // Setup global drag and drop events
    this.setupGlobalEvents();
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new dynamic items were added
              if (node.classList && node.classList.contains('dynamic-item')) {
                this.setupDynamicItem(node);
              }
              // Check if new containers were added
              if (node.id && node.id.endsWith('Container') && node.classList.contains('dynamic-list')) {
                this.setupContainer(node);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupExistingContainers() {
    const containers = document.querySelectorAll('.dynamic-list[data-reorderable="true"]');
    containers.forEach(container => this.setupContainer(container));
  }

  setupContainer(container) {
    if (!container || !container.dataset.reorderable) return;
    
    console.log(`🔧 Setting up container: ${container.id}`);
    
    // Setup existing items
    const items = container.querySelectorAll('.dynamic-item');
    items.forEach((item, index) => this.setupDynamicItem(item, index));
    
    // Add drop zones
    this.addDropZones(container);
  }

  setupDynamicItem(item, index = null) {
    if (!item) return;
    
    // Remove existing setup if any
    this.cleanupDynamicItem(item);
    
    // Get index if not provided
    if (index === null) {
      const container = item.closest('.dynamic-list');
      if (container) {
        const items = container.querySelectorAll('.dynamic-item');
        index = Array.from(items).indexOf(item);
      }
    }
    
    if (index === null || index === -1) return;
    
    // Add order indicator
    this.addOrderIndicator(item, index + 1);
    
    // Add drag handle
    this.addDragHandle(item);
    
    // Add order controls
    this.addOrderControls(item, index);
    
    // Make item draggable
    this.makeItemDraggable(item, index);
    
    // Store original order
    const container = item.closest('.dynamic-list');
    if (container) {
      this.storeOriginalOrder(container);
    }
  }

  cleanupDynamicItem(item) {
    // Remove existing elements
    const existing = item.querySelectorAll('.item-order, .drag-handle, .order-controls');
    existing.forEach(el => el.remove());
    
    // Remove draggable
    item.draggable = false;
    item.classList.remove('dragging');
  }

  addOrderIndicator(item, order) {
    const indicator = document.createElement('div');
    indicator.className = 'item-order';
    indicator.textContent = order;
    item.appendChild(indicator);
  }

  addDragHandle(item) {
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    `;
    handle.draggable = true;
    handle.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
    item.appendChild(handle);
  }

  addOrderControls(item, index) {
    const controls = document.createElement('div');
    controls.className = 'order-controls';
    
    // Move up button
    const upBtn = document.createElement('button');
    upBtn.className = 'order-btn';
    upBtn.disabled = index === 0;
    upBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6z"/>
      </svg>
    `;
    upBtn.addEventListener('click', () => this.moveItemUp(item, index));
    controls.appendChild(upBtn);
    
    // Move down button
    const downBtn = document.createElement('button');
    downBtn.className = 'order-btn';
    downBtn.disabled = index === 0;
    downBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6z"/>
      </svg>
    `;
    downBtn.addEventListener('click', () => this.moveItemDown(item, index));
    controls.appendChild(downBtn);
    
    item.appendChild(controls);
  }

  makeItemDraggable(item, index) {
    item.draggable = true;
    item.dataset.originalIndex = index;
    
    item.addEventListener('dragstart', (e) => {
      this.draggedElement = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.outerHTML);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this.draggedElement = null;
    });
  }

  addDropZones(container) {
    // Remove existing drop zones
    const existingZones = container.querySelectorAll('.drop-zone');
    existingZones.forEach(zone => zone.remove());
    
    const items = container.querySelectorAll('.dynamic-item');
    
    items.forEach((item, index) => {
      // Add drop zone before item
      const dropZoneBefore = document.createElement('div');
      dropZoneBefore.className = 'drop-zone';
      dropZoneBefore.dataset.position = 'before';
      dropZoneBefore.dataset.targetIndex = index;
      
      this.setupDropZone(dropZoneBefore, item, 'before');
      container.insertBefore(dropZoneBefore, item);
      
      // Add drop zone after item
      const dropZoneAfter = document.createElement('div');
      dropZoneAfter.className = 'drop-zone';
      dropZoneAfter.dataset.position = 'after';
      dropZoneAfter.dataset.targetIndex = index;
      
      this.setupDropZone(dropZoneAfter, item, 'after');
      container.appendChild(dropZoneAfter);
    });
  }

  setupDropZone(dropZone, targetItem, position) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('active');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('active');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleItemDrop(e, targetItem, position);
      dropZone.classList.remove('active');
    });
  }

  setupGlobalEvents() {
    document.addEventListener('dragover', (e) => {
      if (this.draggedElement && e.target.classList.contains('drop-zone')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });
    
    document.addEventListener('drop', (e) => {
      if (this.draggedElement) {
        e.preventDefault();
        this.draggedElement.classList.remove('dragging');
        this.draggedElement = null;
      }
    });
    
    document.addEventListener('dragend', () => {
      if (this.draggedElement) {
        this.draggedElement.classList.remove('dragging');
        this.draggedElement = null;
      }
    });
  }

  handleDragStart(e, item) {
    e.stopPropagation();
  }

  handleItemDrop(e, targetItem, position) {
    if (!this.draggedElement) return;
    
    e.preventDefault();
    
    const draggedIndex = parseInt(this.draggedElement.dataset.originalIndex);
    const targetIndex = parseInt(targetItem.dataset.originalIndex);
    
    if (draggedIndex === targetIndex) return;
    
    // Calculate new position
    let newIndex = targetIndex;
    if (position === 'after') {
      newIndex = targetIndex + 1;
    }
    
    // Move item
    this.moveItemToPosition(draggedIndex, newIndex, targetItem.parentElement);
    
    // Update order indicators and controls
    this.updateContainerOrder(targetItem.parentElement);
    
    // Auto-save the new order
    this.autoSaveOrder(targetItem.parentElement);
  }

  moveItemUp(item, currentIndex) {
    if (currentIndex === 0) return;
    
    const container = item.parentElement;
    const prevItem = container.children[currentIndex - 1];
    
    if (prevItem && prevItem.classList.contains('dynamic-item')) {
      this.swapItems(item, prevItem);
      this.updateContainerOrder(container);
      this.autoSaveOrder(container);
    }
  }

  moveItemDown(item, currentIndex) {
    const container = item.parentElement;
    const items = container.querySelectorAll('.dynamic-item');
    const nextItem = container.children[currentIndex + 1];
    
    if (nextItem && nextItem.classList.contains('dynamic-item')) {
      this.swapItems(item, nextItem);
      this.updateContainerOrder(container);
      this.autoSaveOrder(container);
    }
  }

  swapItems(item1, item2) {
    const parent = item1.parentElement;
    const temp = document.createElement('div');
    
    parent.insertBefore(temp, item1);
    parent.insertBefore(item1, item2);
    parent.insertBefore(item2, temp);
    parent.removeChild(temp);
  }

  moveItemToPosition(fromIndex, toIndex, container) {
    const items = Array.from(container.querySelectorAll('.dynamic-item'));
    const item = items[fromIndex];
    
    if (!item) return;
    
    // Remove item from current position
    container.removeChild(item);
    
    // Insert at new position
    if (toIndex >= items.length) {
      container.appendChild(item);
    } else {
      const targetItem = items[toIndex];
      container.insertBefore(item, targetItem);
    }
  }

  updateContainerOrder(container) {
    const items = container.querySelectorAll('.dynamic-item');
    
    items.forEach((item, index) => {
      // Update order indicator
      const indicator = item.querySelector('.item-order');
      if (indicator) {
        indicator.textContent = index + 1;
      }
      
      // Update dataset
      item.dataset.originalIndex = index;
      
      // Update order controls
      const controls = item.querySelector('.order-controls');
      if (controls) {
        const upBtn = controls.querySelector('.order-btn:first-child');
        const downBtn = controls.querySelector('.order-btn:last-child');
        
        if (upBtn) upBtn.disabled = index === 0;
        if (downBtn) downBtn.disabled = index === items.length - 1;
      }
    });
    
    // Re-add drop zones
    this.addDropZones(container);
  }

  storeOriginalOrder(container) {
    const containerId = container.id;
    if (!this.originalOrders.has(containerId)) {
      const items = Array.from(container.querySelectorAll('.dynamic-item'));
      this.originalOrders.set(containerId, items.map(item => ({
        id: item.dataset.id || item.id,
        element: item.cloneNode(true)
      })));
    }
  }

  autoSaveOrder(container) {
    const containerId = container.id;
    const type = this.getTypeFromContainer(containerId);
    
    if (!type) return;
    
    // Get new order
    const items = Array.from(container.querySelectorAll('.dynamic-item'));
    const newOrder = items.map(item => {
      const id = item.dataset.id || item.id;
      return { id, element: item };
    });
    
    // Update config
    this.updateConfigOrder(type, newOrder);
    
    // Show success message
    this.showSuccess(`Порядок ${this.getTypeDisplayName(type)} автоматически сохранен`);
  }

  updateConfigOrder(type, newOrder) {
    if (window.admin && window.admin.config) {
      const configKey = this.getConfigKey(type);
      if (configKey && window.admin.config[configKey]) {
        // Reorder the array based on new order
        const reorderedArray = [];
        newOrder.forEach(item => {
          const originalItem = window.admin.config[configKey].find(configItem => 
            configItem.id === item.id || configItem.name === item.id
          );
          if (originalItem) {
            reorderedArray.push(originalItem);
          }
        });
        
        window.admin.config[configKey] = reorderedArray;
        
        // Auto-save to file
        if (window.admin.saveConfig) {
          window.admin.saveConfig();
        }
      }
    }
  }

  getTypeFromContainer(containerId) {
    return containerId.replace('Container', '').replace('s', '');
  }

  getConfigKey(type) {
    const configKeys = {
      'artist': 'artists',
      'seller': 'authorizedSellers',
      'tier': 'tiers',
      'faq': 'faqs',
      'contact': 'contacts'
    };
    return configKeys[type];
  }

  getTypeDisplayName(type) {
    const displayNames = {
      'artist': 'артистов',
      'seller': 'продавцов',
      'tier': 'категорий билетов',
      'faq': 'вопросов FAQ',
      'contact': 'контактов'
    };
    return displayNames[type] || type;
  }

  // Utility methods for notifications
  showSuccess(message) {
    if (window.admin && window.admin.showSuccess) {
      window.admin.showSuccess(message);
    } else {
      console.log('✅ Success:', message);
    }
  }

  showInfo(message) {
    if (window.admin && window.admin.showInfo) {
      window.admin.showInfo(message);
    } else {
      console.log('ℹ️ Info:', message);
    }
  }

  showError(message) {
    if (window.admin && window.admin.showError) {
      window.admin.showError(message);
    } else {
      console.log('❌ Error:', message);
    }
  }
}

// Initialize auto reorder manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.autoReorderManager = new AutoReorderManager();
});

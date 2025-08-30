// Reorder Manager for Admin Panel
class ReorderManager {
  constructor() {
    this.isReordering = false;
    this.originalOrder = {};
    this.currentOrder = {};
    this.draggedElement = null;
    this.dropZones = [];
    this.reorderableTypes = ['artist', 'seller', 'tier', 'faq', 'contact'];
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.createDropZones();
  }

  bindEvents() {
    // Bind toggle buttons for each type
    this.reorderableTypes.forEach(type => {
      const toggleBtn = document.getElementById(`toggleReorder${this.capitalizeFirst(type)}s`);
      const saveBtn = document.getElementById(`saveOrder${this.capitalizeFirst(type)}s`);
      const cancelBtn = document.getElementById(`cancelReorder${this.capitalizeFirst(type)}s`);
      
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleReorderMode(type));
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveOrder(type));
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelReorder(type));
      }
    });

    // Global drag and drop events
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('drop', this.handleGlobalDrop.bind(this));
    document.addEventListener('dragend', this.handleGlobalDragEnd.bind(this));
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toggleReorderMode(type) {
    const container = document.getElementById(`${type}sContainer`);
    const toggleBtn = document.getElementById(`toggleReorder${this.capitalizeFirst(type)}s`);
    const saveBtn = document.getElementById(`saveOrder${this.capitalizeFirst(type)}s`);
          const cancelBtn = document.getElementById(`cancelReorder${this.capitalizeFirst(type)}s`);
    
    if (!container) return;

    if (!this.isReordering) {
      // Enter reorder mode
      this.isReordering = true;
      this.originalOrder[type] = this.getCurrentOrder(container);
      this.currentOrder[type] = [...this.originalOrder[type]];
      
      this.enableReorderMode(container, type);
      
      // Show/hide buttons
      toggleBtn.style.display = 'none';
      saveBtn.style.display = 'inline-flex';
      cancelBtn.style.display = 'inline-flex';
      
      // Update button text
      toggleBtn.textContent = '📋 Режим изменения порядка активен';
    } else {
      // Exit reorder mode
      this.exitReorderMode(type);
    }
  }

  enableReorderMode(container, type) {
    const items = container.querySelectorAll('.dynamic-item');
    
    items.forEach((item, index) => {
      // Add order indicator
      this.addOrderIndicator(item, index + 1);
      
      // Add drag handle
      this.addDragHandle(item);
      
      // Add order controls
      this.addOrderControls(item, index, items.length);
      
      // Make item draggable
      this.makeItemDraggable(item, index);
      
      // Add drop zones
      this.addDropZones(item, container);
    });
  }

  addOrderIndicator(item, order) {
    // Remove existing indicator if any
    const existing = item.querySelector('.item-order');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'item-order';
    indicator.textContent = order;
    item.appendChild(indicator);
  }

  addDragHandle(item) {
    // Remove existing handle if any
    const existing = item.querySelector('.drag-handle');
    if (existing) existing.remove();
    
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    `;
    handle.draggable = true;
    handle.addEventListener('dragstart', this.handleDragStart.bind(this));
    item.appendChild(handle);
  }

  addOrderControls(item, index, total) {
    // Remove existing controls if any
    const existing = item.querySelector('.order-controls');
    if (existing) existing.remove();
    
    const controls = document.createElement('div');
    controls.className = 'order-controls';
    
    // Move up button
    const upBtn = document.createElement('button');
    upBtn.className = 'order-btn';
    upBtn.disabled = index === 0;
    upBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
      </svg>
    `;
    upBtn.addEventListener('click', () => this.moveItemUp(item, index));
    controls.appendChild(upBtn);
    
    // Move down button
    const downBtn = document.createElement('button');
    downBtn.className = 'order-btn';
    downBtn.disabled = index === total - 1;
    downBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
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

  addDropZones(item, container) {
    // Add drop zone before item
    const dropZoneBefore = document.createElement('div');
    dropZoneBefore.className = 'drop-zone';
    dropZoneBefore.dataset.position = 'before';
    dropZoneBefore.dataset.targetIndex = item.dataset.originalIndex;
    
    dropZoneBefore.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZoneBefore.classList.add('active');
    });
    
    dropZoneBefore.addEventListener('dragleave', () => {
      dropZoneBefore.classList.remove('active');
    });
    
    dropZoneBefore.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleItemDrop(e, item, 'before');
      dropZoneBefore.classList.remove('active');
    });
    
    container.insertBefore(dropZoneBefore, item);
    
    // Add drop zone after item
    const dropZoneAfter = document.createElement('div');
    dropZoneAfter.className = 'drop-zone';
    dropZoneAfter.dataset.position = 'after';
    dropZoneAfter.dataset.targetIndex = item.dataset.originalIndex;
    
    dropZoneAfter.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZoneAfter.classList.add('active');
    });
    
    dropZoneAfter.addEventListener('dragleave', () => {
      dropZoneAfter.classList.remove('active');
    });
    
    dropZoneAfter.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleItemDrop(e, item, 'after');
      dropZoneAfter.classList.remove('active');
    });
    
    container.appendChild(dropZoneAfter);
  }

  handleDragStart(e) {
    e.stopPropagation();
  }

  handleDragOver(e) {
    if (this.isReordering && e.target.classList.contains('drop-zone')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }

  handleGlobalDrop(e) {
    // Global drop handler for items dropped outside drop zones
    if (this.isReordering && this.draggedElement) {
      e.preventDefault();
      // Reset dragged element
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }
  }

  handleGlobalDragEnd(e) {
    // Global drag end handler
    if (this.isReordering && this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }
  }

  handleItemDrop(e, targetItem, position) {
    if (!this.draggedElement || !this.isReordering) return;
    
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
    
    // Update order indicators
    this.updateOrderIndicators(targetItem.parentElement);
    
    // Update order controls
    this.updateOrderControls(targetItem.parentElement);
  }

  moveItemUp(item, currentIndex) {
    if (currentIndex === 0) return;
    
    const container = item.parentElement;
    const prevItem = container.children[currentIndex - 1];
    
    if (prevItem && prevItem.classList.contains('dynamic-item')) {
      this.swapItems(item, prevItem);
      this.updateOrderIndicators(container);
      this.updateOrderControls(container);
    }
  }

  moveItemDown(item, currentIndex) {
    const container = item.parentElement;
    const nextItem = container.children[currentIndex + 1];
    
    if (nextItem && nextItem.classList.contains('dynamic-item')) {
      this.swapItems(item, nextItem);
      this.updateOrderIndicators(container);
      this.updateOrderControls(container);
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

  updateOrderIndicators(container) {
    const items = container.querySelectorAll('.dynamic-item');
    items.forEach((item, index) => {
      const indicator = item.querySelector('.item-order');
      if (indicator) {
        indicator.textContent = index + 1;
      }
      item.dataset.originalIndex = index;
    });
  }

  updateOrderControls(container) {
    const items = container.querySelectorAll('.dynamic-item');
    items.forEach((item, index) => {
      const controls = item.querySelector('.order-controls');
      if (controls) {
        const upBtn = controls.querySelector('.order-btn:first-child');
        const downBtn = controls.querySelector('.order-btn:last-child');
        
        if (upBtn) upBtn.disabled = index === 0;
        if (downBtn) downBtn.disabled = index === items.length - 1;
      }
    });
  }

  getCurrentOrder(container) {
    const items = Array.from(container.querySelectorAll('.dynamic-item'));
    return items.map(item => {
      const id = item.dataset.id || item.id;
      return { id, element: item };
    });
  }

  saveOrder(type) {
    const container = document.getElementById(`${type}sContainer`);
    if (!container) return;
    
    // Get new order
    const newOrder = this.getCurrentOrder(container);
    
    // Update config
    this.updateConfigOrder(type, newOrder);
    
    // Exit reorder mode
    this.exitReorderMode(type);
    
    // Show success message
    this.showSuccess(`Порядок ${this.getTypeDisplayName(type)} успешно сохранен`);
  }

  updateConfigOrder(type, newOrder) {
    // This will be implemented to work with the main admin config
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
      }
    }
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

  cancelReorder(type) {
    this.exitReorderMode(type);
    
    // Restore original order
    const container = document.getElementById(`${type}sContainer`);
    if (container && this.originalOrder[type]) {
      this.restoreOriginalOrder(container, this.originalOrder[type]);
    }
    
    this.showInfo(`Порядок ${this.getTypeDisplayName(type)} восстановлен`);
  }

  restoreOriginalOrder(container, originalOrder) {
    // Remove all items and drop zones
    const items = container.querySelectorAll('.dynamic-item, .drop-zone');
    items.forEach(item => item.remove());
    
    // Restore items in original order
    originalOrder.forEach(item => {
      container.appendChild(item.element);
    });
    
    // Re-enable reorder mode to add controls
    this.enableReorderMode(container, this.getTypeFromContainer(container));
  }

  getTypeFromContainer(container) {
    const id = container.id;
    return id.replace('Container', '').replace('s', '');
  }

  exitReorderMode(type) {
    this.isReordering = false;
    
    const container = document.getElementById(`${type}sContainer`);
    if (container) {
      this.disableReorderMode(container);
    }
    
    // Show/hide buttons
    const toggleBtn = document.getElementById(`toggleReorder${this.capitalizeFirst(type)}s`);
    const saveBtn = document.getElementById(`saveOrder${this.capitalizeFirst(type)}s`);
    const cancelBtn = document.getElementById(`cancelReorder${this.capitalizeFirst(type)}s`);
    
    if (toggleBtn) toggleBtn.style.display = 'inline-flex';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  disableReorderMode(container) {
    const items = container.querySelectorAll('.dynamic-item');
    
    items.forEach(item => {
      // Remove order indicator
      const indicator = item.querySelector('.item-order');
      if (indicator) indicator.remove();
      
      // Remove drag handle
      const handle = item.querySelector('.drag-handle');
      if (handle) handle.remove();
      
      // Remove order controls
      const controls = item.querySelector('.order-controls');
      if (controls) controls.remove();
      
      // Remove draggable
      item.draggable = false;
      item.removeEventListener('dragstart', this.handleDragStart);
      item.removeEventListener('dragend', this.handleDragEnd);
    });
    
    // Remove drop zones
    const dropZones = container.querySelectorAll('.drop-zone');
    dropZones.forEach(zone => zone.remove());
  }

  createDropZones() {
    // This will be called when entering reorder mode
  }

  // Utility methods for notifications
  showSuccess(message) {
    if (window.admin && window.admin.showSuccess) {
      window.admin.showSuccess(message);
    } else {
      console.log('Success:', message);
    }
  }

  showInfo(message) {
    if (window.admin && window.admin.showInfo) {
      window.admin.showInfo(message);
    } else {
      console.log('Info:', message);
    }
  }

  showError(message) {
    if (window.admin && window.admin.showError) {
      window.admin.showError(message);
    } else {
      console.log('Error:', message);
    }
  }
}

// Initialize reorder manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.reorderManager = new ReorderManager();
});

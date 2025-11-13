/**
 * Gallery Wall Builder JavaScript
 * Handles drag & drop functionality, step navigation, and cart integration
 */

class GalleryWallBuilder {
  constructor() {
    this.currentStep = 1;
    this.selectedLayout = null;
    this.selectedBackground = 'grey';
    this.selectedMaterial = null;
    this.selectedProducts = new Map();
    this.selectedFrames = new Map();
    this.galleryFrames = [];
    this.config = window.galleryBuilderConfig || {};
    this.translations = window.galleryBuilderTranslations || {};
    this.isMobile = this.detectMobile();
    this.nextFramePosition = { x: 50, y: 50 }; // Starting position for new frames
    this.frameSpacing = 20; // Spacing between frames
    
    this.init();
    this.disableBodyScroll();
    this.initMobileDetection();
  }

  init() {
    this.bindEvents();
    
    // Initialize Shopify Native Tracking
    this.initShopifyTracking();
    
    // Load gallery from URL if present
    this.loadGalleryFromUrl();
    
    // ✅ MOBILE: Close frame buttons when clicking outside (only on mobile)
    if (this.isMobile) {
      // ✅ Use touchend with longer delay to allow toggle handler to execute first
      document.addEventListener('touchend', (e) => {
        // ✅ IGNORE if clicking on frame or controls - let frame handlers manage this
        if (e.target.closest('.gallery-frame') || e.target.closest('.frame-controls')) {
          return;
        }
        
        // ✅ IGNORE if clicking on product items or buttons
        if (e.target.closest('.product-item') || e.target.closest('.btn-add-to-gallery')) {
          return;
        }
        
        // ✅ IGNORE if modal is open
        const modalOpen = document.querySelector('.frame-size-menu.active');
        if (modalOpen) {
          return;
        }
        
        // ✅ CRITICAL: Check if a frame was just selected (toggled) - don't deselect if so
        const justToggled = Array.from(document.querySelectorAll('.gallery-frame')).some(f => {
          return f.dataset.justToggled === 'true';
        });
        
        if (justToggled) {
          // Clear the flag and don't deselect - frame toggle was successful
          document.querySelectorAll('.gallery-frame').forEach(f => {
            delete f.dataset.justToggled;
          });
          return;
        }
        
        // ✅ Longer delay to allow toggle handler to complete first (500ms)
        setTimeout(() => {
          // Only deselect if clicking on canvas/wall area (outside frames)
          const wallArea = document.getElementById('gallery-wall-area');
          const clickedCanvas = wallArea && (e.target === wallArea || e.target.closest('.canvas-container') || e.target.closest('.room-background'));
          
          // ✅ DOUBLE CHECK: Only deselect if frame wasn't just toggled
          const stillJustToggled = Array.from(document.querySelectorAll('.gallery-frame')).some(f => {
            return f.dataset.justToggled === 'true';
          });
          
          if (clickedCanvas && !stillJustToggled) {
            document.querySelectorAll('.gallery-frame').forEach(f => {
              f.classList.remove('selected');
              delete f.dataset.justToggled;
            });
          }
        }, 500); // Longer delay to ensure toggle completes
      }, { passive: true, capture: false });
    }
    
    // Delay para garantir que o DOM esteja pronto
    setTimeout(() => {
    this.initializeLayouts();
    this.updateStepVisibility();
    this.updateNavigationButtons();
    this.initSaveFunctionality();
    this.initSavedGalleriesDropdown();
    
    // Initialize framing service selection when step 5 is shown
    this.initFramingServiceSelection();
    
    
    // Add test function to window for debugging
    window.testBackgroundSave = () => {
      console.log('=== TESTING BACKGROUND SAVE ===');
      console.log('Selected background:', this.selectedBackground);
      console.log('================================');
    };
    
    }, 500);
  }

  // Load gallery from URL parameters
  loadGalleryFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const galleryData = urlParams.get('gallery');
    
    if (galleryData) {
      try {
        // Decode the gallery data
        const decodedData = decodeURIComponent(galleryData);
        const gallery = JSON.parse(decodedData);
        
        // Load the gallery data
        this.loadGalleryData(gallery);
        
        this.showMessage('Gallery loaded from link!', 'success');
      } catch (error) {
        console.error('Error loading gallery from URL:', error);
        this.showMessage('Error loading gallery from link', 'error');
      }
    }
  }

  // Load gallery data into the builder
  loadGalleryData(galleryData) {
    console.log('Loading gallery data:', galleryData);
    
    // Load layout
    if (galleryData.selectedLayout) {
      this.selectedLayout = galleryData.selectedLayout;
      this.currentStep = 2; // Go to layout step
      this.updateStepVisibility();
      this.updateNavigationButtons();
    }
    
    // Load background
    if (galleryData.selectedBackground) {
      this.selectedBackground = galleryData.selectedBackground;
      this.applyBackground();
    }
    
    // Load frames
    if (galleryData.galleryFrames && Array.isArray(galleryData.galleryFrames)) {
      this.galleryFrames = galleryData.galleryFrames;
      this.currentStep = 4; // Go to frames step
      this.updateStepVisibility();
      this.updateNavigationButtons();
    }
    
    // Load products
    if (galleryData.selectedProducts) {
      this.selectedProducts = new Map(galleryData.selectedProducts);
      this.currentStep = 3; // Go to products step
      this.updateStepVisibility();
      this.updateNavigationButtons();
    }
    
    // Load framing service
    if (galleryData.selectedFramingService) {
      this.selectedFramingService = galleryData.selectedFramingService;
    }
    
    // ✅ Load selected frame if saved (Step 3 SELECT FRAMES)
    if (galleryData.selectedFrame) {
      this.selectedFrame = galleryData.selectedFrame;
      console.log('✅ Restored selectedFrame:', this.selectedFrame);
    }
    
    // Apply the loaded state
    setTimeout(() => {
      this.applyLoadedGalleryState(galleryData);
    }, 100);
  }

  // Apply the loaded gallery state to the UI
  applyLoadedGalleryState(galleryData) {
    console.log('=== APPLYING LOADED GALLERY STATE ===');
    console.log('Gallery data:', galleryData);
    
    // Apply layout first
    if (galleryData.selectedLayout) {
      console.log('Applying layout:', galleryData.selectedLayout);
      this.applyLayout(galleryData.selectedLayout);
    }
    
    // Wait for layout to be applied, then apply background
    setTimeout(() => {
      if (galleryData.selectedBackground) {
        console.log('Applying background:', galleryData.selectedBackground);
        this.applyBackground();
      }
      
      // Wait for background to be applied, then apply frames
      setTimeout(() => {
        if (galleryData.galleryFrames) {
          console.log('Gallery frames to load:', galleryData.galleryFrames);
          
          // First, set the selectedProducts from the loaded data
          if (galleryData.selectedProducts && galleryData.selectedProducts.length > 0) {
            this.selectedProducts = new Map(galleryData.selectedProducts);
            console.log('=== LOADED SELECTED PRODUCTS ===');
            console.log('Selected products:', this.selectedProducts);
            console.log('===============================');
          }
          
          // Render frames with products preserved
          console.log('Rendering frames with preserveProducts = true');
          this.renderGalleryFrames(galleryData.galleryFrames, true);
          
          // Apply framing service
          if (galleryData.selectedFramingService) {
            console.log('Applying framing service:', galleryData.selectedFramingService);
            this.selectFramingService(galleryData.selectedFramingService);
          }
          
          // Update UI
          this.updateStepVisibility();
          this.updateNavigationButtons();
          this.updateOrderSummary();
          
          // Show success message
          this.showMessage('Gallery loaded successfully!', 'success');
          console.log('=== GALLERY LOADED SUCCESSFULLY ===');
        } else {
          console.log('No gallery frames found in loaded data');
        }
      }, 200);
    }, 200);
  }

  // Apply layout to the gallery
  applyLayout(layoutId) {
    const layoutElement = document.querySelector(`[data-layout="${layoutId}"]`);
    if (layoutElement) {
      layoutElement.click();
    }
  }

  // Apply background to the gallery
  applyBackground() {
    if (this.selectedBackground) {
      // Handle predefined backgrounds
      const backgroundElement = document.querySelector(`[data-background="${this.selectedBackground}"]`);
      if (backgroundElement) {
        backgroundElement.click();
      }
    }
  }

  // Select framing service
  selectFramingService(framingService) {
    this.selectedFramingService = framingService;
    
    // Update UI
    document.querySelectorAll('.framing-service-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`[data-service-variant-id="${framingService.variantId}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  }

  // Initialize framing service selection
  initFramingServiceSelection() {
    // Add event listener for framing service selection
    document.addEventListener('click', (e) => {
      const framingServiceOption = e.target && e.target.closest && e.target.closest('.framing-service-option');
      
      if (framingServiceOption) {
        e.preventDefault();
        e.stopPropagation();
        
        
        // Remove previous selection
        document.querySelectorAll('.framing-service-option').forEach(option => {
          option.classList.remove('selected');
        });
        
        // Select current option
        framingServiceOption.classList.add('selected');
        
        // Get service data
        const serviceId = framingServiceOption.dataset.serviceId;
        const serviceVariantId = framingServiceOption.dataset.serviceVariantId;
        const servicePrice = framingServiceOption.dataset.servicePrice;
        
        
        // Set selected service
        this.selectedFramingService = {
          id: serviceId,
          variantId: serviceVariantId,
          price: servicePrice
        };
        
        
        // Update order summary
        this.updateOrderSummary();
      }
    });
  }

  // Check if there are any frames selected (with frame data, not just products)
  hasSelectedFrames() {
    // ✅ FIXED: Only return true if frames from Step 3 are selected (frameVariantId exists)
    // Framing service should only appear if user selected actual frames in Step 3
    return this.galleryFrames && this.galleryFrames.some(frame => 
      frame.element && frame.element.dataset.frameVariantId // Has frame from Step 3
    );
  }

  // Auto-select first framing service if none selected and frames are present
  autoSelectFramingService() {
    // Only auto-select if there are frames with products
    if (this.hasSelectedFrames() && !this.selectedFramingService) {
      const firstFramingService = document.querySelector('.framing-service-option');
      if (firstFramingService) {
        console.log('🔧 Auto-selecting first framing service');
        firstFramingService.click();
      }
    }
  }

  // Start gallery builder - hide start panel and show first step
  startGalleryBuilder() {
    const startPanel = document.querySelector('.startPanel');
    if (startPanel) {
      startPanel.style.display = 'none';
    }
    
    // Show the first step (background selection)
    const firstStep = document.querySelector('.builder-step[data-step="1"]');
    if (firstStep) {
      firstStep.classList.add('active');
    }
    
    // Update step indicator
    this.updateStepVisibility();
  }

  // Initialize saved galleries dropdown - ORIGINAL VERSION
  initSavedGalleriesDropdown() {
    const toggle = document.getElementById('saved-galleries-btn');
    const menu = document.getElementById('saved-galleries-menu');
    
    if (!toggle || !menu) {
      return;
    }
    
    // ULTRA SIMPLE - Just toggle visibility
    let isOpen = false;
    
    // Use addMobileTouchEvents for mobile compatibility
    this.addMobileTouchEvents(toggle, (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      isOpen = !isOpen;
      
      if (isOpen) {
        menu.style.display = 'block';
        menu.classList.add('active');
        
        // Load galleries when opening
        if (window.galleryBuilder) {
          window.galleryBuilder.loadSavedGalleries();
        }
      } else {
        menu.style.display = 'none';
        menu.classList.remove('active');
      }
      
      return false;
    });
    
    // Close on outside click - but prevent immediate close
    setTimeout(() => {
      document.addEventListener('click', function(e) {
        if (!toggle.contains(e.target) && !menu.contains(e.target) && isOpen) {
          isOpen = false;
          menu.style.display = 'none';
          menu.classList.remove('active');
        }
      });
    }, 100);
    
    // Load saved galleries
    this.loadSavedGalleries();
  }

  disableBodyScroll() {
    // Add class to body to disable scroll
    document.body.classList.add('gallery-builder-active');
    
    // Only prevent scroll events on desktop
    if (!this.isMobile) {
    document.addEventListener('wheel', this.preventScroll, { passive: false });
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    document.addEventListener('keydown', this.preventScroll);
    }
  }

  enableBodyScroll() {
    // Remove class from body to enable scroll
    document.body.classList.remove('gallery-builder-active');
    
    // Re-enable scroll events
    document.removeEventListener('wheel', this.preventScroll);
    document.removeEventListener('touchmove', this.preventScroll);
    document.removeEventListener('keydown', this.preventScroll);
  }

  preventScroll(e) {
    // Allow all scroll on mobile - never prevent
    if (this.isMobile) {
      return;
    }
    
    // Prevent scroll on body when gallery builder is active (desktop only)
    if (e.target.closest('.gallery-wall-builder')) {
      return;
    }
    e.preventDefault();
  }

  // Initialize Shopify Native Tracking
  initShopifyTracking() {
    if (window.shopifyNativeTracking) {
      this.tracking = window.shopifyNativeTracking;
      console.log('📊 Shopify Native Tracking initialized');
    } else {
      console.warn('📊 Shopify Native Tracking not available');
    }
    
    // Initialize advanced analytics
    if (window.advancedGalleryAnalytics) {
      this.advancedTracking = window.advancedGalleryAnalytics;
      console.log('📊 Advanced Gallery Analytics initialized');
    } else {
      console.warn('📊 Advanced Gallery Analytics not available');
    }
    
    // Initialize enhanced Shopify analytics
    if (window.enhancedShopifyAnalytics) {
      this.enhancedTracking = window.enhancedShopifyAnalytics;
      console.log('📊 Enhanced Shopify Analytics initialized');
    } else {
      console.warn('📊 Enhanced Shopify Analytics not available');
    }
  }

  bindEvents() {
    // Step navigation
    const nextBtn = document.getElementById('btn-next');
    const prevBtn = document.getElementById('btn-prev');
    
    if (nextBtn) {
      this.addMobileTouchEvents(nextBtn, () => this.nextStep());
    }
    
    if (prevBtn) {
      this.addMobileTouchEvents(prevBtn, () => this.prevStep());
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => this.enableBodyScroll());
    
    // Restore gallery wall position on load
    this.restoreGalleryWallPosition();

    // Mobile touch events for drag and drop
    if (this.isMobile) {
      this.bindMobileTouchEvents();
      // DISABLED - Don't touch frame positions!
      // this.startFrameVisibilityMonitor();
      // this.bindScrollProtection();
    }

    // Background selection
    document.querySelectorAll('.background-option').forEach(option => {
      this.addMobileTouchEvents(option, () => this.selectBackground(option));
    });

    // Product selection
    document.querySelectorAll('.product-item').forEach(item => {
      this.addMobileTouchEvents(item, () => this.selectProduct(item));
    });

    // ✅ "All Products" button - reset filters
    const allProductsBtn = document.querySelector('[data-filter="all"]');
    if (allProductsBtn) {
      allProductsBtn.addEventListener('click', () => {
        console.log('🔘 All Products button clicked');
        this.resetProductFilters();
      });
    }

    // Add to Gallery button
    document.querySelectorAll('.btn-add-to-gallery').forEach(button => {
      this.addMobileTouchEvents(button, (e) => this.handleAddToGalleryClick(e));
    });

    // Frame selection - Step 4
    document.querySelectorAll('.frame-option').forEach(option => {
      // Disable drag for frame options
      option.draggable = false;
      option.style.cursor = 'pointer';
      
      // Remove any existing drag event listeners
      option.removeEventListener('dragstart', () => {});
      option.removeEventListener('dragend', () => {});
      
      // Add mobile touch events
      this.addMobileTouchEvents(option, () => this.selectFrame(option));
      
      // Prevent drag propagation on mobile
      if (this.isMobile) {
        option.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        option.addEventListener('touchmove', (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
    });

    // Material selection is now in the modal, not in Step 2
    // this.loadMaterialsFromProducts();

    // Product filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
      this.addMobileTouchEvents(tab, () => this.filterProducts(tab));
    });

    // Add to cart - Step 5
    const addToCartBtn = document.getElementById('add-gallery-to-cart');
    if (addToCartBtn) {
      // Disable drag for add to cart button
      addToCartBtn.draggable = false;
      addToCartBtn.style.cursor = 'pointer';
      
      // Remove any existing drag event listeners
      addToCartBtn.removeEventListener('dragstart', () => {});
      addToCartBtn.removeEventListener('dragend', () => {});
      
      this.addMobileTouchEvents(addToCartBtn, () => this.addGalleryToCart());
      
      // Prevent drag propagation on mobile
      if (this.isMobile) {
        addToCartBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        addToCartBtn.addEventListener('touchmove', (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
    }
    
    // Review Order items - Step 5
    document.querySelectorAll('.summary-item').forEach(item => {
      // Disable drag for summary items
      item.draggable = false;
      item.style.cursor = 'pointer';
      
      // Remove any existing drag event listeners
      item.removeEventListener('dragstart', () => {});
      item.removeEventListener('dragend', () => {});
      
      // Prevent drag propagation on mobile
      if (this.isMobile) {
        item.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        item.addEventListener('touchmove', (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
    });

    // Filter sidebar
    const showFilterBtn = document.getElementById('show-filter-btn');
    
    if (showFilterBtn) {
      this.addMobileTouchEvents(showFilterBtn, () => {
        this.showFilterSidebar();
      });
    } else {
      console.error('Show Filter button not found!');
    }
    
    const closeFilterBtn = document.getElementById('close-filter-sidebar');
    const hideFilterBtn = document.getElementById('hide-filter-sidebar');
    
    if (closeFilterBtn) {
      this.addMobileTouchEvents(closeFilterBtn, () => this.hideFilterSidebar());
    }
    
    if (hideFilterBtn) {
      this.addMobileTouchEvents(hideFilterBtn, () => this.hideFilterSidebar());
    }

    // Canvas controls removed - no longer needed

    // Drag and drop for products
    this.initializeDragAndDrop();
    
    // Initialize filter sidebar with a small delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeFilterSidebar();
    }, 100);
    
  }

  // Mobile touch event helpers
  addMobileTouchEvents(element, callback) {
    if (!element) return;
    
    // Add click event for desktop
    element.addEventListener('click', (e) => {
      callback(e);
    });
    
    // Add touch events for mobile
    if (this.isMobile) {
      // ✅ SIMPLIFIED: For buttons, use direct touchend without scroll detection
      const isButton = element.classList.contains('btn-add-to-gallery') || 
                       element.classList.contains('frame-edit-btn') ||
                       element.classList.contains('frame-delete-btn') ||
                       element.closest('.btn-add-to-gallery') ||
                       element.closest('.frame-controls');
      
      if (isButton) {
        // ✅ BUTTONS: Simple touchend handler - no scroll detection needed
        element.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          callback(e);
        }, { passive: false, capture: true });
        return; // Don't add scroll detection for buttons
      }
      
      // ✅ PRODUCT ITEMS: Keep scroll detection
      let touchStartY = 0;
      let touchStartTime = 0;
      
      element.addEventListener('touchstart', (e) => {
        // STOP PROPAGATION for product-item to prevent frame dragging
        if (element.classList.contains('product-item')) {
          e.stopPropagation();
        }
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        // STOP PROPAGATION for product-item to prevent frame dragging
        if (element.classList.contains('product-item')) {
          e.stopPropagation();
        }
        
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        const touchDistance = Math.abs(touchEndY - touchStartY);
        
        // Only trigger callback if it's a tap, not a scroll
        if (touchDistance < 10 && touchDuration < 300) {
          e.preventDefault();
          e.stopPropagation();
          callback(e);
        }
      }, { passive: false });
    }
  }

  addMobileDoubleTapEvents(element, callback) {
    if (!element) return;
    
    let lastTap = 0;
    let tapCount = 0;
    
    // Add double tap for mobile
    if (this.isMobile) {
      element.addEventListener('touchend', (e) => {
        // DON'T prevent default - let normal touch behavior work
        // e.preventDefault();
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
          tapCount++;
          if (tapCount === 2) {
            // Only prevent default on double tap
            e.preventDefault();
            e.stopPropagation();
            callback(e);
            tapCount = 0;
          }
        } else {
          tapCount = 1;
        }
        
        lastTap = currentTime;
      }, { passive: true });
    }
  }

  startFrameVisibilityMonitor() {
    if (!this.isMobile) return;
    
    // Monitor frame visibility every 500ms (less frequent)
    setInterval(() => {
      this.forceFrameVisibility();
    }, 500);
  }

  forceFrameVisibility() {
    // This function is disabled to prevent position changes
        return;
      }
      
  emergencyFrameFix() {
    // This function is disabled to prevent position changes
      return;
    }
    
  bindScrollProtection() {
    // This function is disabled to prevent position changes
      return;
    }
    
  initializeLayouts() {
    // Parse layout data and create visual representations like the old code
    const layoutGrids = document.querySelectorAll('.layout-grid');
    layoutGrids.forEach((grid, index) => {
      const layoutData = grid.dataset.layout;
      if (layoutData) {
        try {
          // Clean the JSON string by removing any HTML entities
          const cleanData = layoutData.replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
          const frames = JSON.parse(cleanData);
          this.renderLayoutPreview(grid, frames);
        } catch (e) {
          console.error('Error parsing layout data:', e);
        }
      }
    });
  }

  renderLayoutPreview(container, frames) {
    container.innerHTML = '';
    
    if (!Array.isArray(frames)) {
      return;
    }
    
    frames.forEach((frame, index) => {
      const frameElement = document.createElement('div');
      frameElement.className = 'frame';
      frameElement.style.cssText = `
        position: absolute;
        left: ${(frame.x / 640) * 100}%;
        top: ${(frame.y / 400) * 100}%;
        width: ${(frame.width / 640) * 100}%;
        height: ${(frame.height / 400) * 100}%;
        background: #374000;
        border-radius: 2px;
        opacity: 0.7;
      `;
      frameElement.textContent = frame.size || 'Frame';
      container.appendChild(frameElement);
    });
  }
  

  // renderLayoutPreview function removed - no longer needed

  selectBackground(option) {
    // Hide start panel when background is selected
    const startPanel = document.querySelector('.startPanel');
    if (startPanel) {
      startPanel.style.display = 'none';
    }
    
    // Remove previous selection
    document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    option.classList.add('selected');
    
    // Get background type
    const backgroundType = option.dataset.background;
    
    // Update canvas background
    this.updateCanvasBackground(backgroundType);
    
    // Show message
    this.showMessage('Background selected! Click Next to continue.', 'success');
  }

  updateCanvasBackground(backgroundType) {
    const canvas = document.querySelector('.room-background');
    if (!canvas) return;
    
    // Get background images from data attributes or use defaults
    const backgroundImages = {
      'grey': canvas.dataset.backgroundGrey || '{{ "room-grey.jpg" | asset_url }}',
      'white': canvas.dataset.backgroundWhite || '{{ "room-white.jpg" | asset_url }}',
      'blue': canvas.dataset.backgroundBlue || '{{ "room-blue.jpg" | asset_url }}',
      'pink': canvas.dataset.backgroundPink || '{{ "room-pink.jpg" | asset_url }}'
    };
    
    const imageUrl = backgroundImages[backgroundType] || backgroundImages['grey'];
    
    // Update background image
    canvas.style.backgroundImage = `url('${imageUrl}')`;
    
    // Store selected background
    this.selectedBackground = backgroundType;
    
    console.log('Background updated to:', backgroundType);
  }

  selectLayout(option) {
    // Remove previous selection
    document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    option.classList.add('selected');
    
    // Get layout data
    const layoutData = option.dataset.layoutData;
    let parsedData;
    
    try {
      // Clean the JSON string by removing any HTML entities
      const cleanData = layoutData.replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
      parsedData = JSON.parse(cleanData);
    } catch (error) {
      console.error('Error parsing layout data:', error);
      console.error('Raw data:', layoutData);
      return;
    }
    
    this.selectedLayout = {
      id: option.dataset.layout,
      data: parsedData,
      frames: parsedData // Add frames property
    };

    // Render frames in canvas immediately
    this.renderGalleryFrames(parsedData);
    
    // Show message that layout was selected
    this.showMessage('Layout selected! Click Next to continue.', 'success');
  }

  // New method for dragging layouts onto gallery wall
  applyLayoutToGallery(layoutData) {
    // Clear existing frames
    this.clearGallery();
    
    // Create frames based on layout
    this.renderGalleryFrames(layoutData);
    
    // Update selected layout
    this.selectedLayout = {
      id: 'dragged',
      data: layoutData
    };
    
    this.showMessage('Layout applied to gallery wall', 'success');
  }

  getAvailableSizes() {
    // Get all available sizes from products
    const sizes = new Set();
    const products = document.querySelectorAll('.product-item[data-has-size="true"]');
    
    products.forEach(product => {
      const availableSizes = product.dataset.availableSizes;
      if (availableSizes) {
        availableSizes.split(',').forEach(size => {
          if (size.trim()) {
            sizes.add(size.trim());
          }
        });
      }
    });
    
    return Array.from(sizes);
  }

  getSizePrice(size) {
    // Get price for a specific size from products
    const products = document.querySelectorAll('.product-item[data-has-size="true"]');
    
    for (let product of products) {
      const priceData = product.dataset.variantPrices;
      if (priceData) {
        try {
          const prices = JSON.parse(priceData);
          if (prices[size]) {
            return prices[size];
          }
        } catch (e) {
          console.error('Error parsing price data:', e);
        }
      }
    }
    
    return null;
  }

  removeProductFromFrame(frameIndex) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame || !frame.product) return;

    // Get original frame size
    const originalSize = frame.data.size;
    
    // ✅ CRITICAL: Remove all classes related to selection and image
    frame.element.classList.remove('has-image', 'selected');
    
    // ✅ CRITICAL: Remove frame controls (edit/delete buttons)
    const controls = frame.element.querySelector('.frame-controls');
    if (controls) {
      controls.remove();
    }
    
    // Clear frame content and restore size display
    frame.element.innerHTML = `
      <div class="inner">
        <div class="frame-size">${originalSize}</div>
      </div>
    `;
    
    // Clear product data
    frame.product = null;
    frame.productElement = null;
    frame.availableSizes = null;
    this.selectedProducts.delete(frameIndex);
    
    // Update order summary
    this.updateOrderSummary();
    
    // Update all product buttons
    this.updateAllProductButtons();
    
    this.showMessage('Product removed from gallery', 'success');
  }

  removeProductFromAllFrames(productId) {
    let removed = false;
    
    // ✅ CRITICAL: Iterate backwards to avoid index issues when deleting
    // Find all frames with this product and delete them completely
    for (let i = this.galleryFrames.length - 1; i >= 0; i--) {
      const frame = this.galleryFrames[i];
      if (frame.product && frame.product.id === productId) {
        // Delete frame completely (same as delete button)
        this.deleteFrameFromCanvas(i);
        removed = true;
      }
    }
    
    return removed;
  }

  updateProductButton(productId) {
    const productElement = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productElement) return;

    const button = productElement.querySelector('.btn-add-to-gallery');
    if (!button) return;

    // Check if product is in any frame
    const isInGallery = Array.from(this.galleryFrames).some(frame => 
      frame.product && frame.product.id === productId
    );

    if (isInGallery) {
      button.textContent = 'Remove from Gallery';
      button.classList.add('remove-action');
      
      // ✅ MOBILE ONLY: Add delete button on product-item when in gallery
      if (this.isMobile) {
        // Remove existing delete button if any
        const existingDeleteBtn = productElement.querySelector('.product-item-delete-btn');
        if (existingDeleteBtn) {
          existingDeleteBtn.remove();
        }
        
        // Add delete button (similar to frame delete button) - use SVG inline
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'product-item-delete-btn';
        deleteBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        `;
        deleteBtn.setAttribute('aria-label', 'Remove from gallery');
        
        // Position in top-right corner - SMALLER SIZE
        deleteBtn.style.cssText = `
          position: absolute;
          top: 6px;
          right: 6px;
          width: 28px;
          height: 28px;
          background: rgba(0, 0, 0, 0.75);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 0;
        `;
        
        // Add click handler
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.removeProductFromAllFrames(productId);
        });
        
        // Add touch handler for mobile
        deleteBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.removeProductFromAllFrames(productId);
        }, { passive: false });
        
        // Make sure product-item has position relative
        if (getComputedStyle(productElement).position === 'static') {
          productElement.style.position = 'relative';
        }
        
        productElement.appendChild(deleteBtn);
      }
    } else {
      button.textContent = 'Add to Gallery';
      button.classList.remove('remove-action');
      
      // ✅ MOBILE ONLY: Remove delete button if product is not in gallery
      if (this.isMobile) {
        const existingDeleteBtn = productElement.querySelector('.product-item-delete-btn');
        if (existingDeleteBtn) {
          existingDeleteBtn.remove();
        }
      }
    }
  }

  updateAllProductButtons() {
    const products = document.querySelectorAll('.product-item');
    products.forEach(product => {
      const productId = product.dataset.productId;
      this.updateProductButton(productId);
    });
  }

  handleAddToGalleryClick(e) {
    // ✅ CRITICAL: Stop propagation immediately for mobile
    if (e) {
      e.stopPropagation();
      if (this.isMobile) {
        e.preventDefault();
      } else if (e.preventDefault) {
        e.preventDefault();
      }
    }
    
    const button = e ? e.currentTarget : null;
    if (!button) return;
    
    const productItem = button.closest('.product-item');
    if (!productItem) return;
    
    const productId = productItem.dataset.productId;
    
    // Check if product is in gallery
    const isInGallery = Array.from(this.galleryFrames).some(frame => 
      frame.product && frame.product.id === productId
    );
    
    if (isInGallery) {
      // Remove from all frames
      this.removeProductFromAllFrames(productId);
    } else {
      // Add to selected frame
      const selectedFrame = document.querySelector('.gallery-frame.selected');
      if (selectedFrame) {
        const frameIndex = parseInt(selectedFrame.dataset.frameIndex);
        const productData = {
          id: productId,
          variantId: productItem.dataset.variantId,
          title: productItem.dataset.productTitle,
          price: productItem.dataset.productPrice,
          priceRaw: productItem.dataset.productPriceRaw,
          image: productItem.dataset.productImage,
          handle: productItem.dataset.productHandle
        };
        this.addProductToFrame(frameIndex, productData, productItem);
      } else {
        this.showMessage('Please select a frame first!', 'info');
      }
    }
  }

  renderGalleryFrames(layoutData = null, preserveProducts = false) {
    const wallArea = document.getElementById('gallery-wall-area');
    const data = layoutData || (this.selectedLayout ? this.selectedLayout.data : null);
    if (!wallArea || !data) return;

    wallArea.innerHTML = '';
    wallArea.classList.add('has-frames');
    
    // Initialize position data attributes like Desenio
    if (!wallArea.hasAttribute('data-x')) {
      wallArea.setAttribute('data-x', '0');
    }
    if (!wallArea.hasAttribute('data-y')) {
      wallArea.setAttribute('data-y', '0');
    }
    
    // Store existing products if preserving
    const existingProducts = preserveProducts ? new Map(this.selectedProducts) : new Map();
    
    this.galleryFrames = [];
    
    // Get available sizes from products
    const availableSizes = this.getAvailableSizes();
    
    data.forEach((frameData, index) => {
      const frame = document.createElement('div');
      frame.className = 'gallery-frame';
      frame.dataset.frameIndex = index;
      
      // Use layout size directly - don't try to match with products
      let displaySize = frameData.size;
      let sizePrice = null;
      
      // Just use the layout size as is (e.g., "50x70", "40x50", etc.)
      console.log(`📐 Usando tamanho do layout: ${displaySize}`);
      
      frame.dataset.size = displaySize;
      
          // Use percentage positioning like Desenio - FIXED DIMENSIONS
          const leftPercent = (frameData.x / 640) * 100;
          const topPercent = (frameData.y / 400) * 100;
          
          frame.style.cssText = `
            top: ${topPercent}%;
            left: ${leftPercent}%;
          `;
          
          // DEBUG LOGS - Vamos ver o que está acontecendo
          console.log(`🔍 FRAME ${index} DEBUG:`);
          console.log(`   - data-size: ${displaySize}`);
          console.log(`   - Elemento criado:`, frame);
          console.log(`   - CSS aplicado:`, frame.style.cssText);
          console.log(`   - Classes:`, frame.className);
          
          // Store position data for dragging
          frame.dataset.x = leftPercent;
          frame.dataset.y = topPercent;
      
      // Check if this frame has an existing product
      const existingProduct = existingProducts.get(index);
      
      if (existingProduct) {
        console.log(`🎨 Frame ${index} has existing product:`, existingProduct);
        // Render frame with existing product
        frame.innerHTML = `
          <div class="inner">
            <img src="${existingProduct.image}" alt="${existingProduct.title}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        `;
        frame.classList.add('has-image');
        frame.dataset.hasImage = 'true';
        frame.dataset.productId = existingProduct.id;
        frame.dataset.productVariantId = existingProduct.variantId;
      } else {
        console.log(`📦 Frame ${index} has no existing product`);
      // Add placeholder content with real size (as per user request)
      frame.innerHTML = `
        <div class="inner">
          <div class="frame-size">${displaySize}</div>
        </div>
      `;
      }
      
          // Make frame droppable and draggable
          frame.addEventListener('dragover', (e) => this.handleDragOver(e));
          frame.addEventListener('drop', (e) => this.handleDrop(e, index));
          
          // Add mobile touch events for frame selection
          this.addMobileTouchEvents(frame, () => this.selectFrameForProduct(index));
          this.addMobileDoubleTapEvents(frame, () => this.deselectFrame(index));
          
          // Make frame draggable for repositioning using mouse events
          frame.draggable = false;
          this.makeFrameDraggable(frame, index);
      
      wallArea.appendChild(frame);
      this.galleryFrames.push({
        element: frame,
        data: {
          ...frameData,
          size: frameData.size // Keep original layout size "50x70"
        },
        product: existingProduct || null,
        hasImage: !!existingProduct,
        x: frameData.x,
        y: frameData.y,
        width: frameData.width,
        height: frameData.height
      });
    });
    
    // DEBUG: Verificar estilos computados após adicionar ao DOM
    setTimeout(() => {
      console.log('🔍 VERIFICANDO ESTILOS COMPUTADOS APÓS ADICIONAR AO DOM:');
      this.galleryFrames.forEach((frameData, index) => {
        // frameData é um objeto, precisamos acessar o elemento DOM real
        const frame = frameData.element || frameData;
        if (frame && frame.nodeType === 1) { // Verificar se é um elemento DOM válido
          const computedStyle = window.getComputedStyle(frame);
          console.log(`📏 FRAME ${index} (${frame.dataset.size}):`);
          console.log(`   - width: ${computedStyle.width}`);
          console.log(`   - height: ${computedStyle.height}`);
          console.log(`   - padding-bottom: ${computedStyle.paddingBottom}`);
          console.log(`   - min-width: ${computedStyle.minWidth}`);
          console.log(`   - min-height: ${computedStyle.minHeight}`);
          console.log(`   - max-width: ${computedStyle.maxWidth}`);
          console.log(`   - max-height: ${computedStyle.maxHeight}`);
          
          // Verificar se as regras CSS específicas estão sendo aplicadas
          const isMobile = window.innerWidth <= 768;
          const isTablet = window.innerWidth <= 1024;
          console.log(`   - É mobile: ${isMobile} (largura: ${window.innerWidth}px)`);
          console.log(`   - É tablet: ${isTablet} (largura: ${window.innerWidth}px)`);
          
          // Verificar se as regras específicas estão sendo aplicadas
          if (frame.dataset.size === '70x100') {
            console.log(`   - REGRA ESPECÍFICA 70x100 deve ser: ${isMobile ? '26% width, 37% padding-bottom' : '11.5% width, 16.5% padding-bottom'}`);
          } else if (frame.dataset.size === '50x70') {
            console.log(`   - REGRA ESPECÍFICA 50x70 deve ser: ${isMobile ? '9% width, 13% padding-bottom' : '8.5% width, 12% padding-bottom'}`);
          } else if (frame.dataset.size === '29.7x42') {
            console.log(`   - REGRA ESPECÍFICA 29.7x42 deve ser: ${isMobile ? '13% width, 17% padding-bottom' : '5.5% width, 7.5% padding-bottom'}`);
          }
        } else {
          console.log(`❌ FRAME ${index} não é um elemento DOM válido:`, frame);
        }
      });
      
      // DEBUG ADICIONAL: Verificar se as regras CSS estão sendo aplicadas
      console.log('🔍 VERIFICANDO REGRAS CSS APLICADAS:');
      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth <= 1024;
      console.log(`📱 É mobile: ${isMobile} (largura: ${window.innerWidth}px)`);
      console.log(`📱 É tablet: ${isTablet} (largura: ${window.innerWidth}px)`);
      
      // Para testar mobile, vamos forçar o teste com largura menor
      if (!isMobile) {
        console.log('⚠️ TESTANDO EM MODO MOBILE FORÇADO (largura: 400px)');
      }
      
      // Verificar se as regras CSS específicas existem no DOM
      const testElement = document.createElement('div');
      testElement.className = 'gallery-frame';
      testElement.setAttribute('data-size', '70x100');
      document.body.appendChild(testElement);
      
      const testStyle = window.getComputedStyle(testElement);
      console.log(`🧪 TESTE REGRA 70x100:`);
      console.log(`   - width: ${testStyle.width}`);
      console.log(`   - padding-bottom: ${testStyle.paddingBottom}`);
      
      // Testar também com 50x70
      const testElement2 = document.createElement('div');
      testElement2.className = 'gallery-frame';
      testElement2.setAttribute('data-size', '50x70');
      document.body.appendChild(testElement2);
      
      const testStyle2 = window.getComputedStyle(testElement2);
      console.log(`🧪 TESTE REGRA 50x70:`);
      console.log(`   - width: ${testStyle2.width}`);
      console.log(`   - padding-bottom: ${testStyle2.paddingBottom}`);
      
      // Testar também com 29.7x42
      const testElement3 = document.createElement('div');
      testElement3.className = 'gallery-frame';
      testElement3.setAttribute('data-size', '29.7x42');
      document.body.appendChild(testElement3);
      
      const testStyle3 = window.getComputedStyle(testElement3);
      console.log(`🧪 TESTE REGRA 29.7x42:`);
      console.log(`   - width: ${testStyle3.width}`);
      console.log(`   - padding-bottom: ${testStyle3.paddingBottom}`);
      
      document.body.removeChild(testElement);
      document.body.removeChild(testElement2);
      document.body.removeChild(testElement3);
    }, 100);
    
    // Update all product buttons after rendering frames
    this.updateAllProductButtons();
  }

  // New function to render frames with saved products
  renderGalleryFramesWithProducts(savedFramesData) {
    const wallArea = document.getElementById('gallery-wall-area');
    if (!wallArea) return;

    wallArea.innerHTML = '';
    wallArea.classList.add('has-frames');
    
    // Initialize position data attributes like Desenio
    if (!wallArea.hasAttribute('data-x')) {
      wallArea.setAttribute('data-x', '0');
    }
    if (!wallArea.hasAttribute('data-y')) {
      wallArea.setAttribute('data-y', '0');
    }
    
    this.galleryFrames = [];
    
    savedFramesData.forEach((frameData, index) => {
      const frame = document.createElement('div');
      frame.className = 'gallery-frame';
      frame.dataset.frameIndex = index;
      
      // ✅ CRITICAL: Use saved size - extract just the dimensions for CSS
      let displaySize = frameData.size || frameData.data?.size;
      // Extract dimensions like "70x100" from "L - 70 x 100.0cm" or use as-is if already "70x100"
      const sizeMatch = displaySize ? displaySize.match(/(\d+(?:\.\d+)?x\d+(?:\.\d+)?)/) : null;
      const cssSize = sizeMatch ? sizeMatch[1] : (displaySize || '50x70');
        
        frame.dataset.size = cssSize; // Use "70x100" for CSS
      frame.setAttribute('data-original-size', displaySize || cssSize); // Keep original for display
        
      // ✅ CRITICAL: Force the correct size class for CSS - ALWAYS use cssSize
        frame.className = `gallery-frame ${cssSize}`;
        
      // ✅ CRITICAL: Use saved width/height if available, otherwise calculate from saved size
      const savedWidth = frameData.width || frameData.data?.width || null;
      const savedHeight = frameData.height || frameData.data?.height || null;
      const savedX = frameData.x || frameData.data?.x || 0;
      const savedY = frameData.y || frameData.data?.y || 0;
      
      // Use percentage positioning like Desenio - NO WIDTH/HEIGHT IN CSS (CSS handles sizing via data-size)
      const leftPercent = (savedX / 640) * 100;
      const topPercent = (savedY / 400) * 100;
        
        frame.style.cssText = `
          top: ${topPercent}%;
          left: ${leftPercent}%;
        `;
        
      // ✅ CRITICAL: Store position data for dragging (width/height in pixels for reference)
      if (savedWidth && savedHeight) {
        frame.dataset.width = savedWidth;
        frame.dataset.height = savedHeight;
      }
      
      // Store position data for dragging
      frame.dataset.x = leftPercent;
      frame.dataset.y = topPercent;
      
      console.log(`🔄 Loading frame ${index}:`, {
        savedX,
        savedY,
        savedWidth,
        savedHeight,
        size: cssSize,
        leftPercent,
        topPercent
      });
      
      // ✅ CRITICAL: Restore frame data from Step 3 (SELECT FRAMES)
      if (frameData.frameId) {
        frame.dataset.frameId = frameData.frameId;
        frame.classList.add('has-frame');
      }
      if (frameData.frameName) {
        frame.dataset.frameName = frameData.frameName;
      }
      if (frameData.frameProductId) {
        frame.dataset.frameProductId = frameData.frameProductId;
      }
      if (frameData.frameVariantId) {
        frame.dataset.frameVariantId = frameData.frameVariantId;
      }
      if (frameData.framePrice) {
        frame.dataset.framePrice = frameData.framePrice;
      }
      if (frameData.frameSize) {
        frame.dataset.frameSize = frameData.frameSize;
      }
      
      // ✅ Apply frame image if saved
      if (frameData.frameImage) {
        setTimeout(() => {
          this.applyFrameImageToGalleryFrame(frame, frameData.frameImage);
        }, 100);
      } else if (frameData.frameId) {
        // Try to get frame image from selectedFrame if available
        setTimeout(() => {
          if (this.selectedFrame && this.selectedFrame.id === frameData.frameId) {
            this.applyFrameImageToGalleryFrame(frame);
          }
        }, 100);
      }
      
      // Check if this frame has a saved product
      if (frameData.product) {
        // Render frame with product image
        frame.innerHTML = `
          <div class="inner">
            <img src="${frameData.product.image}" alt="${frameData.product.title}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        `;
        frame.classList.add('has-image');
        
        // Ensure correct size class is maintained even with image
        frame.className = `gallery-frame ${cssSize} has-image`;
        
        // ✅ CRITICAL: Store product data with REAL dimensions AND frame data
        this.galleryFrames.push({
          element: frame,
          data: {
            ...frameData,
            size: cssSize, // Use extracted size "50x70"
            x: savedX,
            y: savedY,
            width: savedWidth || frameData.width || 100,
            height: savedHeight || frameData.height || 150
          },
          product: frameData.product || frameData.data?.product,
          x: savedX,
          y: savedY,
          width: savedWidth || frameData.width || 100,
          height: savedHeight || frameData.height || 150,
          hasImage: true
        });
        
        // Add to selected products
        this.selectedProducts.set(index, frameData.product);
      } else {
        // Render empty frame
        frame.innerHTML = `
          <div class="inner">
            <div class="frame-size">${displaySize}</div>
          </div>
        `;
        
        // ✅ CRITICAL: Store frame data with REAL dimensions AND frame data
        this.galleryFrames.push({
          element: frame,
          data: {
            ...frameData,
            size: cssSize, // Use extracted size "50x70"
            x: savedX,
            y: savedY,
            width: savedWidth || frameData.width || 100,
            height: savedHeight || frameData.height || 150
          },
          product: null,
          x: savedX,
          y: savedY,
          width: savedWidth || frameData.width || 100,
          height: savedHeight || frameData.height || 150,
          hasImage: false
        });
      }
      
      // Make frame droppable and draggable
      frame.addEventListener('dragover', (e) => this.handleDragOver(e));
      frame.addEventListener('drop', (e) => this.handleDrop(e, index));
      
      // Add mobile touch events for frame selection
      this.addMobileTouchEvents(frame, () => this.selectFrameForProduct(index));
      this.addMobileDoubleTapEvents(frame, () => this.deselectFrame(index));
      
      // Make frame draggable for repositioning using mouse events
      frame.draggable = false;
      this.makeFrameDraggable(frame, index);
      
      wallArea.appendChild(frame);
    });
    
    // Update all product buttons after rendering frames
    this.updateAllProductButtons();
  }

  selectProduct(item) {
    // Remove previous selection
    document.querySelectorAll('.product-item').forEach(product => product.classList.remove('selected'));
    
    // Add selection to clicked item
    item.classList.add('selected');
    
    const productId = item.dataset.productId;
    const variantId = item.dataset.variantId;
    const productData = {
      id: productId,
      variantId: variantId,
      title: item.dataset.productTitle,
      price: item.dataset.productPrice,
      priceRaw: item.dataset.productPriceRaw,
      image: item.dataset.productImage,
      handle: item.dataset.productHandle,
      size: item.dataset.productSize || 'Unknown'
    };

    // Track product selection
    if (this.tracking) {
      this.tracking.trackProductSelect(productData);
    }
    
    if (this.advancedTracking) {
      this.advancedTracking.trackProductSelect(productData);
    }
    
    if (this.enhancedTracking) {
      this.enhancedTracking.trackProductSelect(productData);
    }

    // NEW: Add product directly to canvas as a gallery-frame like The Poster Club
    this.addProductAsGalleryFrame(productData, item);
  }

  selectFrame(frameOption) {
    // Remove previous selection
    document.querySelectorAll('.frame-option').forEach(frame => frame.classList.remove('selected'));
    
    // Add selection to clicked frame
    frameOption.classList.add('selected');
    
    // Get frame data from real product
    const frameName = frameOption.querySelector('.frame-name').textContent;
    const frameImage = frameOption.querySelector('.frame-preview img');
    const variants = frameOption.querySelectorAll('.frame-variant');
    
    // Get frame image in full resolution
    // Priority: 1) data-frame-image attribute, 2) data-full-image on img, 3) src with conversion
    let frameImageSrc = null;
    
    // First try data-frame-image attribute (most reliable)
    if (frameOption.dataset.frameImage) {
      frameImageSrc = frameOption.dataset.frameImage;
      console.log('🖼️ Frame image from data-frame-image:', frameImageSrc);
    } else if (frameImage) {
      // Try data-full-image attribute
      if (frameImage.dataset.fullImage) {
        frameImageSrc = frameImage.dataset.fullImage;
        console.log('🖼️ Frame image from data-full-image:', frameImageSrc);
      } else {
        // Fallback: convert src to full resolution
        frameImageSrc = frameImage.src;
        // Remove size parameters to get full resolution
        frameImageSrc = frameImageSrc.replace(/\?.*$/, '').replace(/_\d+x\d+\./, '.');
        // Also remove Shopify size suffixes
        if (frameImageSrc.includes('cdn.shopify.com')) {
          frameImageSrc = frameImageSrc.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master)\./, '.');
        }
        console.log('🖼️ Frame image selected (full resolution from src):', frameImageSrc);
      }
    }
    
    // Store selected frame with variants
    this.selectedFrame = {
      id: frameOption.dataset.frame,
      productId: frameOption.dataset.productId,
      name: frameName,
      image: frameImageSrc,
      variants: []
    };
    
    // Store all variants with their prices
    variants.forEach(variant => {
      this.selectedFrame.variants.push({
        id: variant.dataset.variantId,
        size: variant.dataset.size,
        price: variant.querySelector('.variant-price').textContent,
        priceValue: parseFloat(variant.querySelector('.variant-price').textContent.replace(/[^\d.,]/g, '').replace(',', '.'))
      });
    });
    
    console.log('✅ Frame selected:', this.selectedFrame);
    
    // Apply frame to ALL gallery frames that have products
    this.applyFrameToSelectedGalleryFrame();
    
    // Force immediate visual update
    this.forceFrameUpdate();
    
    // Ensure frame image is applied after a short delay to guarantee DOM is ready
    setTimeout(() => {
      const selectedGalleryFrame = document.querySelector('.gallery-frame.selected');
      if (selectedGalleryFrame && this.selectedFrame) {
        this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
      }
    }, 150);
    
    this.showMessage(`Frame selected: ${frameName}`, 'success');
  }

  forceFrameUpdate() {
    console.log('Forcing frame update...');
    
    // Find the currently selected gallery frame
    const selectedGalleryFrame = document.querySelector('.gallery-frame.selected');
    if (!selectedGalleryFrame) {
      console.log('No gallery frame selected for individual frame change');
      return;
    }
    
    console.log('Applying frame to selected gallery frame only:', selectedGalleryFrame);
    
    // Remove existing frame classes and overlays from selected frame only
    selectedGalleryFrame.classList.remove('has-frame');
    const existingOverlay = selectedGalleryFrame.querySelector('.frame-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Apply frame to selected gallery frame only
    if (this.selectedFrame) {
      selectedGalleryFrame.classList.add('has-frame');
      selectedGalleryFrame.dataset.frameId = this.selectedFrame.id;
      selectedGalleryFrame.dataset.frameName = this.selectedFrame.name;
      
      // Try to get real frame image first
      const frameImage = this.getFrameImage(this.selectedFrame.id);
      console.log('Frame image URL:', frameImage);
      
      if (frameImage) {
        // Use real frame image as overlay - apply immediately and with delay
        this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
        setTimeout(() => {
          this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
        }, 100);
      } else {
        // Fallback to thin colored border
        const frameColor = this.getFrameColor(this.selectedFrame.id);
        selectedGalleryFrame.style.borderColor = frameColor;
        selectedGalleryFrame.style.borderWidth = '2px';
        selectedGalleryFrame.style.borderStyle = 'solid';
        selectedGalleryFrame.style.boxShadow = `0 0 0 1px ${frameColor}`;
        console.log('Using color fallback:', frameColor);
      }
    }
  }

  applyFrameToGallery() {
    if (!this.selectedFrame) return;
    
    // Find the currently selected gallery frame
    const selectedGalleryFrame = document.querySelector('.gallery-frame.selected');
    if (!selectedGalleryFrame) {
      console.log('No gallery frame selected for frame application');
      return;
    }
    
    console.log('Applying frame to selected gallery frame only:', selectedGalleryFrame);
    
    // Apply frame styling only to the selected frame
    selectedGalleryFrame.classList.add('has-frame');
    selectedGalleryFrame.dataset.frameId = this.selectedFrame.id;
    selectedGalleryFrame.dataset.frameName = this.selectedFrame.name;
    selectedGalleryFrame.dataset.frameProductId = this.selectedFrame.productId;
    
    // Get frame size from data attribute (this comes from the layout)
    const frameSize = selectedGalleryFrame.dataset.size || '50x70';
    
    // Map layout sizes to frame variant sizes
    let targetVariantSize = 'M - 50 x 70cm'; // Default
    if (frameSize === '50x70') {
      targetVariantSize = 'M - 50 x 70cm';
    } else if (frameSize === '70x100') {
      targetVariantSize = 'L - 70 x 100.0cm';
    } else if (frameSize === '29.7x42') {
      targetVariantSize = 'S - 29.7 x 42cm (A3)';
    }
    
    // Find matching variant based on mapped size
    let selectedVariant = this.selectedFrame.variants[0]; // Default to first variant
    for (const variant of this.selectedFrame.variants) {
      if (variant.size === targetVariantSize) {
        selectedVariant = variant;
        break;
      }
    }
    
    console.log(`Frame size mapping: ${frameSize} -> ${targetVariantSize}, found variant:`, selectedVariant);
    
    // Store frame variant data
    selectedGalleryFrame.dataset.frameVariantId = selectedVariant.id;
    selectedGalleryFrame.dataset.framePrice = selectedVariant.priceValue;
    selectedGalleryFrame.dataset.frameSize = selectedVariant.size;
    
    // Remove all fixed colors - frame image will be applied as background
    selectedGalleryFrame.style.borderColor = '';
    selectedGalleryFrame.style.borderWidth = '';
    selectedGalleryFrame.style.borderStyle = '';
    selectedGalleryFrame.style.boxShadow = '';
    
    // Apply real frame image immediately and also with a small delay to ensure it's applied
    this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
    // Also apply with a delay to ensure DOM is ready
    setTimeout(() => {
      this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
    }, 100);
  }

  applyFrameToSelectedGalleryFrame() {
    if (!this.selectedFrame) {
      console.log('No frame selected');
      return;
    }
    
    console.log('Applying frame to gallery frames:', this.selectedFrame.name);
    
    // Find the currently selected gallery frame
    const selectedGalleryFrame = document.querySelector('.gallery-frame.selected');
    if (!selectedGalleryFrame) {
      console.log('No gallery frame selected for individual frame application');
      return;
    }
    
    console.log('Applying frame to selected gallery frame only:', selectedGalleryFrame);
    
    // Apply frame styling to the selected gallery frame only
    selectedGalleryFrame.classList.add('has-frame');
    selectedGalleryFrame.dataset.frameId = this.selectedFrame.id;
    selectedGalleryFrame.dataset.frameName = this.selectedFrame.name;
    selectedGalleryFrame.dataset.frameProductId = this.selectedFrame.productId;
    
    // Get frame size from data attribute (this comes from the layout)
    const frameSize = selectedGalleryFrame.dataset.size || '50x70';
    
    // Map layout sizes to frame variant sizes
    let targetVariantSize = 'M - 50 x 70cm';
    if (frameSize === '50x70') {
      targetVariantSize = 'M - 50 x 70cm';
    } else if (frameSize === '70x100') {
      targetVariantSize = 'L - 70 x 100.0cm';
    } else if (frameSize === '29.7x42') {
      targetVariantSize = 'S - 29.7 x 42cm (A3)';
    }
    
    // Find matching variant based on mapped size
    let selectedVariant = this.selectedFrame.variants[0];
    for (const variant of this.selectedFrame.variants) {
      if (variant.size === targetVariantSize) {
        selectedVariant = variant;
        break;
      }
    }
    
    console.log(`Frame size mapping: ${frameSize} -> ${targetVariantSize}, found variant:`, selectedVariant);
    
    // Store frame variant data
    selectedGalleryFrame.dataset.frameVariantId = selectedVariant.id;
    selectedGalleryFrame.dataset.framePrice = selectedVariant.priceValue;
    selectedGalleryFrame.dataset.frameSize = selectedVariant.size;
    
    // Remove all fixed colors - frame image will be applied as background
    selectedGalleryFrame.style.borderColor = '';
    selectedGalleryFrame.style.borderWidth = '';
    selectedGalleryFrame.style.borderStyle = '';
    selectedGalleryFrame.style.boxShadow = '';
    
    // Apply real frame image immediately and also with a small delay to ensure it's applied
    this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
    // Also apply with a delay to ensure DOM is ready
    setTimeout(() => {
      this.applyFrameImageToGalleryFrame(selectedGalleryFrame);
    }, 100);
    
    // Update order summary
    this.updateOrderSummary();
  }

  // Load materials from products automatically
  loadMaterialsFromProducts() {
    const productItems = document.querySelectorAll('.product-item');
    const materials = new Set();
    const materialData = new Map();
    
    // Extract materials from products
    productItems.forEach(item => {
      const productId = item.dataset.productId;
      const productTitle = item.dataset.productTitle;
      const productPrice = item.dataset.productPriceRaw;
      const productImage = item.dataset.productImage;
      
      // Get material from product data attributes
      const availableMaterials = item.dataset.availableMaterials;
      const hasMaterial = item.dataset.hasMaterial === 'true';
      
      console.log('🔍 Loading materials from product:', productTitle);
      console.log('   Has Material:', hasMaterial);
      console.log('   Available Materials:', availableMaterials);
      console.log('   Material Prices:', item.dataset.materialPrices);
      console.log('   Product ID:', productId);
      console.log('   Product Price:', productPrice);
      
      if (hasMaterial && availableMaterials) {
        // Split available materials and process each
        const materialList = availableMaterials.split(',');
        materialList.forEach(material => {
          const cleanMaterial = material.trim();
          if (cleanMaterial) {
            materials.add(cleanMaterial);
            if (!materialData.has(cleanMaterial)) {
              materialData.set(cleanMaterial, {
                name: cleanMaterial,
                price: productPrice,
                image: productImage,
                products: []
              });
            }
            materialData.get(cleanMaterial).products.push({
              id: productId,
              title: productTitle,
              price: productPrice,
              image: productImage
            });
          }
        });
      } else {
        // Fallback: try to extract from product title
        const material = this.extractMaterialFromProduct(productTitle);
        if (material) {
          materials.add(material);
          if (!materialData.has(material)) {
            materialData.set(material, {
              name: material,
              price: productPrice,
              image: productImage,
              products: []
            });
          }
          materialData.get(material).products.push({
            id: productId,
            title: productTitle,
            price: productPrice,
            image: productImage
          });
        }
      }
    });
    
    console.log('Found materials:', Array.from(materials));
    console.log('Material data:', materialData);
    
    // If no materials found, show default materials
    if (materials.size === 0) {
      this.showDefaultMaterials();
    } else {
      // Render material options
      this.renderMaterialOptions(Array.from(materials), materialData);
    }
  }
  
  showDefaultMaterials() {
    console.log('No materials found in products, showing default materials');
    const defaultMaterials = ['Fine Art Paper', 'Cotton Canvas'];
    const defaultData = new Map();
    
    defaultMaterials.forEach(material => {
      defaultData.set(material, {
        name: material,
        price: '0',
        image: '',
        products: []
      });
    });
    
    this.renderMaterialOptions(defaultMaterials, defaultData);
  }
  
  extractMaterialFromProduct(productTitle) {
    // Extract material from product title or use common materials
    const title = productTitle.toLowerCase();
    
    if (title.includes('canvas') || title.includes('cotton')) {
      return 'Cotton Canvas';
    } else if (title.includes('paper') || title.includes('art paper')) {
      return 'Fine Art Paper';
    } else if (title.includes('metal')) {
      return 'Metal Print';
    } else if (title.includes('acrylic')) {
      return 'Acrylic';
    } else {
      // Default to Fine Art Paper if no specific material found
      return 'Fine Art Paper';
    }
  }
  
  renderMaterialOptions(materials, materialData) {
    const container = document.getElementById('material-options');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get base price from first product using all-variants
    const firstProduct = document.querySelector('.product-item');
    let basePrice = 0;
    if (firstProduct && firstProduct.dataset.allVariants) {
      try {
        const variants = firstProduct.dataset.allVariants.split(';');
        const firstMaterial = materials[0];
        
        // Find first variant with matching material
        for (const variantEntry of variants) {
          const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
          const [size, mat] = sizeAndMaterial.split('|');
          const [price, variantId] = priceAndId.split('|');
          
          const normalizedMat = this.normalizeMaterialName(mat.toLowerCase());
          const normalizedFirstMat = this.normalizeMaterialName(firstMaterial.toLowerCase());
          
          if (normalizedMat === normalizedFirstMat || normalizedMat.includes(normalizedFirstMat)) {
            basePrice = parseFloat(price);
            break;
          }
        }
      } catch (e) {
        console.log('Error parsing material prices:', e);
      }
    }
    
    materials.forEach((material, index) => {
      const data = materialData.get(material);
      const isFirst = index === 0;
      
      // Get actual price for this material from all-variants
      let materialPrice = 'Base Price';
      if (firstProduct && firstProduct.dataset.allVariants) {
        try {
          const variants = firstProduct.dataset.allVariants.split(';');
          
          // Find first variant with matching material
          for (const variantEntry of variants) {
            const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
            const [size, mat] = sizeAndMaterial.split('|');
            const [price, variantId] = priceAndId.split('|');
            
            const normalizedMat = this.normalizeMaterialName(mat.toLowerCase());
            const normalizedMaterial = this.normalizeMaterialName(material.toLowerCase());
            
            if (normalizedMat === normalizedMaterial || normalizedMat.includes(normalizedMaterial)) {
              const actualPrice = parseFloat(price);
              if (isFirst) {
                materialPrice = `€${actualPrice.toFixed(2).replace('.', ',')}`;
              } else {
                const priceDiff = actualPrice - basePrice;
                materialPrice = priceDiff > 0 ? `+ €${priceDiff.toFixed(2).replace('.', ',')}` : `€${actualPrice.toFixed(2).replace('.', ',')}`;
              }
              break;
            }
          }
        } catch (e) {
          console.log('Error parsing material price:', e);
        }
      }
      
      const materialOption = document.createElement('div');
      materialOption.className = `material-option ${isFirst ? 'selected' : ''}`;
      materialOption.dataset.material = material; // ✅ Store original material name
      materialOption.innerHTML = `
        <div class="material-preview">
          <div class="material-icon">${this.getMaterialIcon(material)}</div>
        </div>
        <span class="material-name">${material}</span>
        <span class="material-price">${materialPrice}</span>
      `;
      
      // Add click event
      this.addMobileTouchEvents(materialOption, () => this.selectMaterial(materialOption));
      
      container.appendChild(materialOption);
    });
    
    // Set first material as selected
    if (materials.length > 0) {
      this.selectedMaterial = materials[0];
    }
  }
  
  getMaterialIcon(material) {
    const icons = {
      'Fine Art Paper': '📄',
      'Cotton Canvas': '🎨',
      'Metal Print': '⚡',
      'Acrylic': '💎'
    };
    return icons[material] || '📄';
  }
  
  selectMaterial(option) {
    // Remove previous selection
    document.querySelectorAll('.material-option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    option.classList.add('selected');
    
    // Get material name
    const materialName = option.dataset.material;
    this.selectedMaterial = materialName;
    
    // Check if a frame is selected - if so, filter by BOTH frame size AND material
    const selectedFrame = document.querySelector('.gallery-frame.selected');
    if (selectedFrame) {
      const frameSize = selectedFrame.dataset.size;
      console.log(`🎯 Frame + Material selection: ${frameSize} + ${materialName}`);
      this.filterProductsByFrameSizeAndMaterial(frameSize, materialName);
    } else {
      // No frame selected, just filter by material
      this.filterProductsByMaterial(materialName);
    }
    
    // ✅ UPDATE PRODUCTS IN FRAMES when material changes
    this.updateProductsInFramesWithNewMaterial(materialName);
    
    // Show message
    this.showMessage(`Material selected: ${materialName}`, 'success');
  }
  
  updateProductsInFramesWithNewMaterial(material) {
    console.log(`🔄 Updating products in frames with new material: ${material}`);
    
    // ❌ REMOVED: This function was updating ALL products in frames when material changed
    // ✅ NEW BEHAVIOR: Products keep their original material when added to frames
    // Only update the global material selection for NEW products being added
    
    console.log(`   ✅ Products in frames will keep their original materials`);
    console.log(`   ✅ New material selection (${material}) will only apply to NEW products`);
  }
  
  filterProductsByFrameSizeAndMaterial(frameSize, material) {
    console.log(`🔍 Filtering products by frame size: ${frameSize} AND material: ${material}`);
    
    const productItems = document.querySelectorAll('.product-item');
    const productGrid = document.querySelector('.product-grid');
    let visibleCount = 0;
    
    // ✅ Add filtering-active class to product-grid
    if (productGrid) {
      productGrid.classList.add('filtering-active');
    }
    
    productItems.forEach((item, index) => {
      const productTitle = item.dataset.productTitle;
      const productSize = item.dataset.productSize;
      const availableSizes = item.dataset.availableSizes;
      const availableMaterials = item.dataset.availableMaterials;
      const hasMaterial = item.dataset.hasMaterial === 'true';
      
      console.log(`   Product ${index + 1}: ${productTitle}`);
      console.log(`     Size: ${productSize}, Available Sizes: ${availableSizes}`);
      console.log(`     Has Material: ${hasMaterial}, Available Materials: ${availableMaterials}`);
      
      // Check if product matches BOTH frame size AND material
      const matchesSize = this.productMatchesFrameSize(productSize, availableSizes, frameSize);
      const matchesMaterial = this.productMatchesMaterial(productTitle, material);
      
      console.log(`     Size Match: ${matchesSize}, Material Match: ${matchesMaterial}`);
      
      if (matchesSize && matchesMaterial) {
        item.style.display = 'block';
        item.classList.add('size-match', 'material-match');
        visibleCount++;
        console.log(`     ✅ SHOWING product (matches both size and material)`);
        
        // Update price for this product based on BOTH frame size AND material
        this.updateProductPriceForFrameSizeAndMaterial(item, frameSize, material);
      } else {
        item.style.display = 'none';
        item.classList.remove('size-match', 'material-match');
        console.log(`     ❌ HIDING product (doesn't match both criteria)`);
      }
    });
    
    console.log(`🎯 Final result: ${visibleCount} products available for ${frameSize} frames with ${material} material`);
    this.showMessage(`${visibleCount} products available for ${frameSize} frames with ${material} material`, 'info');
  }

  filterProductsByMaterial(material) {
    const productItems = document.querySelectorAll('.product-item');
    let visibleCount = 0;
    
    console.log(`🔍 Filtering products by material: ${material}`);
    console.log(`   Total products to check: ${productItems.length}`);
    
    productItems.forEach((item, index) => {
      const productTitle = item.dataset.productTitle;
      const availableMaterials = item.dataset.availableMaterials;
      const hasMaterial = item.dataset.hasMaterial === 'true';
      
      console.log(`   Product ${index + 1}: ${productTitle}`);
      console.log(`     Has Material: ${hasMaterial}`);
      console.log(`     Available Materials: ${availableMaterials}`);
      
      // Check if product has materials and matches
      let materialMatch = false;
      
      if (hasMaterial && availableMaterials) {
        const materialList = availableMaterials.split(',');
        materialMatch = materialList.some(mat => {
          const cleanMat = mat.trim().toLowerCase();
          const cleanMaterial = material.toLowerCase();
          
          // Try exact match first
          if (cleanMat === cleanMaterial) {
            console.log(`     ✅ Exact match: "${cleanMat}" === "${cleanMaterial}"`);
            return true;
          }
          
          // Try normalized match
          const normalizedMat = this.normalizeMaterialName(cleanMat);
          const normalizedMaterial = this.normalizeMaterialName(cleanMaterial);
          
          if (normalizedMat.includes(normalizedMaterial) || normalizedMaterial.includes(normalizedMat)) {
            console.log(`     ✅ Normalized match: "${normalizedMat}" contains "${normalizedMaterial}"`);
            return true;
          }
          
          return false;
        });
      }
      
      if (materialMatch) {
        item.style.display = 'block';
        item.classList.add('material-match');
        visibleCount++;
        console.log(`     ✅ SHOWING product`);
        
        // Update product price based on selected material
        this.updateProductPriceForMaterial(item, material);
      } else {
        item.style.display = 'none';
        item.classList.remove('material-match');
        console.log(`     ❌ HIDING product`);
      }
    });
    
    console.log(`🎯 Final result: ${visibleCount} products available for ${material}`);
    this.showMessage(`${visibleCount} products available for ${material}`, 'info');
  }
  
  updateProductPriceForMaterial(item, material) {
    console.log(`💰 Updating price for: ${item.dataset.productTitle}`);
    console.log(`   Selected material: ${material}`);
    
    // Use all-variants to get the correct variant for this material
    const allVariantsData = item.dataset.allVariants;
    if (!allVariantsData) {
      console.log(`   ❌ No variants data found`);
      return;
    }
    
    try {
      const variants = allVariantsData.split(';');
      console.log(`   Total variants: ${variants.length}`);
      
      const normalizedMaterial = this.normalizeMaterialName(material.toLowerCase());
      
      // Find the first variant with matching material (use first available size)
      for (const variantEntry of variants) {
        const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
        const [size, mat] = sizeAndMaterial.split('|');
        const [price, variantId] = priceAndId.split('|');
        
        const normalizedVariantMaterial = this.normalizeMaterialName(mat.toLowerCase());
        
        const materialMatch = normalizedVariantMaterial === normalizedMaterial || 
                             normalizedVariantMaterial.includes(normalizedMaterial) ||
                             normalizedMaterial.includes(normalizedVariantMaterial);
        
        if (materialMatch) {
          console.log(`   ✅ MATCH FOUND!`);
          console.log(`      Size: ${size}`);
          console.log(`      Material: ${mat} (${normalizedVariantMaterial})`);
          console.log(`      Price: €${price}`);
          console.log(`      Variant ID: ${variantId}`);
          
          // Update the price display
          const priceElement = item.querySelector('.product-price');
          if (priceElement) {
            const formattedPrice = `€${parseFloat(price).toFixed(2).replace('.', ',')}`;
            priceElement.textContent = formattedPrice;
          }
          
          // Update the variantId, priceRaw, and formatted price in dataset
          item.dataset.variantId = variantId;
          const priceInCents = Math.round(parseFloat(price) * 100);
          item.dataset.productPriceRaw = priceInCents;
          item.dataset.productPrice = `€${parseFloat(price).toFixed(2).replace('.', ',')}`;
          
          console.log(`   ✅ Updated successfully!`);
          return;
        }
      }
      
      console.log(`   ❌ No matching variant found for material: ${material}`);
      
    } catch (error) {
      console.log(`   ❌ Error:`, error);
    }
  }
  
  updateVariantIdForMaterial(item, material) {
    console.log(`🔄 Updating variantId for material: ${material}`);
    
    // Get material variant IDs from product data
    const materialVariantIds = item.dataset.materialVariantIds;
    if (!materialVariantIds) {
      console.log(`   ❌ No material variant IDs data found`);
      return;
    }
    
    try {
      const variantIds = JSON.parse(materialVariantIds);
      console.log(`   Available material variant IDs:`, variantIds);
      
      // Find matching material variant ID
      let matchingVariantId = null;
      let matchingMaterial = null;
      
      for (const [materialName, variantId] of Object.entries(variantIds)) {
        const cleanMaterialName = materialName.toLowerCase();
        const cleanSelectedMaterial = material.toLowerCase();
        
        // Try exact match first
        if (cleanMaterialName === cleanSelectedMaterial) {
          matchingVariantId = variantId;
          matchingMaterial = materialName;
          break;
        }
        
        // Try normalized match
        const normalizedMaterialName = this.normalizeMaterialName(cleanMaterialName);
        const normalizedSelectedMaterial = this.normalizeMaterialName(cleanSelectedMaterial);
        
        if (normalizedMaterialName.includes(normalizedSelectedMaterial) || 
            normalizedSelectedMaterial.includes(normalizedMaterialName)) {
          matchingVariantId = variantId;
          matchingMaterial = materialName;
          break;
        }
      }
      
      if (matchingVariantId && matchingMaterial) {
        console.log(`   ✅ Found matching variant ID: ${matchingMaterial} = ${matchingVariantId}`);
        
        // Update the variantId in the product item dataset
        item.dataset.variantId = matchingVariantId;
        console.log(`   ✅ Updated variantId to: ${matchingVariantId}`);
        
        // Also update the priceRaw to match the new variant
        const materialPrices = item.dataset.materialPrices;
        if (materialPrices) {
          try {
            const prices = JSON.parse(materialPrices);
            const price = prices[matchingMaterial];
            if (price) {
              const priceInCents = Math.round(price * 100);
              item.dataset.productPriceRaw = priceInCents;
              console.log(`   ✅ Updated priceRaw to: ${priceInCents} (€${price})`);
            }
          } catch (e) {
            console.log(`   ❌ Error updating priceRaw:`, e);
          }
        }
        
      } else {
        console.log(`   ❌ No matching variant ID found for material: ${material}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error parsing material variant IDs:`, error);
    }
  }
  
  updateProductPriceForFrameSizeAndMaterial(item, frameSize, material) {
    console.log(`💰 NEW LOGIC: ${item.dataset.productTitle}`);
    console.log(`   Looking for: Frame=${frameSize} + Material=${material}`);
    
    try {
      // Get the new all-variants data attribute
      const allVariantsData = item.dataset.allVariants;
      
      if (!allVariantsData) {
        console.log(`   ❌ No variants data found`);
        return;
      }
      
      // Parse format: "size|material:price|variantId;size|material:price|variantId"
      // Example: "S - 29.7 x 42cm (A3)|225g Fine Art Paper:29.99|12345;S - 29.7 x 42cm (A3)|400g Cotton Canvas:33.99|67890"
      const variants = allVariantsData.split(';');
      console.log(`   Total variants: ${variants.length}`);
      console.log(`   Raw data:`, allVariantsData);
      
      // Normalize size for comparison - handle decimal values like 100.0
      const normalizeSize = (size) => {
        if (!size) return null;
        // Match formats like: "70x100", "70 x 100", "L - 70 x 100.0cm", etc.
        const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
        if (match) {
          // parseFloat handles "100.0" -> 100, "29.7" -> 29.7
          const width = parseFloat(match[1]);
          const height = parseFloat(match[2]);
          // Round to handle 29.7 -> 30, but 70.0 -> 70
          const normalizedWidth = width % 1 === 0 ? Math.round(width) : width;
          const normalizedHeight = height % 1 === 0 ? Math.round(height) : height;
          return `${normalizedWidth}x${normalizedHeight}`;
        }
        return null;
      };
      
      const normalizedFrameSize = normalizeSize(frameSize);
      const normalizedMaterial = this.normalizeMaterialName(material.toLowerCase());
      
      console.log(`   Searching for: size="${normalizedFrameSize}", material="${normalizedMaterial}"`);
      
      // Find matching variant
      for (const variantEntry of variants) {
        const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
        const [size, mat] = sizeAndMaterial.split('|');
        const [price, variantId] = priceAndId.split('|');
        
        const normalizedVariantSize = normalizeSize(size);
        const normalizedVariantMaterial = this.normalizeMaterialName(mat.toLowerCase());
        
        const sizeMatch = normalizedVariantSize === normalizedFrameSize;
        const materialMatch = normalizedVariantMaterial === normalizedMaterial || 
                             normalizedVariantMaterial.includes(normalizedMaterial) ||
                             normalizedMaterial.includes(normalizedVariantMaterial);
        
        if (sizeMatch && materialMatch) {
          console.log(`   ✅ MATCH FOUND!`);
          console.log(`      Size: ${size} (${normalizedVariantSize})`);
          console.log(`      Material: ${mat} (${normalizedVariantMaterial})`);
          console.log(`      Price: €${price}`);
          console.log(`      Variant ID: ${variantId}`);
          
          // Update the price display
          const priceElement = item.querySelector('.product-price');
          if (priceElement) {
            const formattedPrice = `€${parseFloat(price).toFixed(2).replace('.', ',')}`;
            priceElement.textContent = formattedPrice;
          }
          
          // Update the variantId and priceRaw
          item.dataset.variantId = variantId;
          const priceInCents = Math.round(parseFloat(price) * 100);
          item.dataset.productPriceRaw = priceInCents;
          
          console.log(`   ✅ Updated successfully!`);
          return;
        }
      }
      
      console.log(`   ❌ No matching variant found for ${frameSize} + ${material}`);
      
    } catch (error) {
      console.log(`   ❌ Error:`, error);
    }
  }
  
  productMatchesMaterial(productTitle, material) {
    // Get all product items and check their material data
    const productItems = document.querySelectorAll('.product-item');
    
    for (let item of productItems) {
      if (item.dataset.productTitle === productTitle) {
        const availableMaterials = item.dataset.availableMaterials;
        const hasMaterial = item.dataset.hasMaterial === 'true';
        
        console.log(`🔍 Checking product: ${productTitle}`);
        console.log(`   Has Material: ${hasMaterial}`);
        console.log(`   Available Materials: ${availableMaterials}`);
        console.log(`   Looking for: ${material}`);
        
        if (hasMaterial && availableMaterials) {
          const materialList = availableMaterials.split(',');
          console.log(`   Material List: [${materialList.join(', ')}]`);
          
          // Check for exact match first
          const exactMatch = materialList.some(mat => {
            const cleanMat = mat.trim().toLowerCase();
            const cleanMaterial = material.toLowerCase();
            console.log(`   Comparing: "${cleanMat}" === "${cleanMaterial}"`);
            return cleanMat === cleanMaterial;
          });
          
          if (exactMatch) {
            console.log(`   ✅ Exact match found!`);
            return true;
          }
          
          // Check for partial match
          const partialMatch = materialList.some(mat => {
            const cleanMat = mat.trim().toLowerCase();
            const cleanMaterial = material.toLowerCase();
            
            // Convert material names to match format
            const normalizedMat = this.normalizeMaterialName(cleanMat);
            const normalizedMaterial = this.normalizeMaterialName(cleanMaterial);
            
            console.log(`   Partial check: "${normalizedMat}" contains "${normalizedMaterial}"`);
            return normalizedMat.includes(normalizedMaterial) || normalizedMaterial.includes(normalizedMat);
          });
          
          if (partialMatch) {
            console.log(`   ✅ Partial match found!`);
            return true;
          }
        }
      }
    }
    
    console.log(`   ❌ No match found for ${material}`);
    return false;
  }
  
  normalizeMaterialName(material) {
    // Normalize material names for better matching
    return material
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .replace(/\s+/g, ''); // Remove spaces
  }

  // Reset product filters - show all products
  resetProductFilters() {
    console.log('🔄 Resetting product filters - showing all products');
    
    const productItems = document.querySelectorAll('.product-item');
    const productGrid = document.querySelector('.product-grid');
    
    // ✅ Remove filtering-active class
    if (productGrid) {
      productGrid.classList.remove('filtering-active');
    }
    
    // Show all products and remove filter classes
    productItems.forEach(item => {
      item.style.display = 'block';
      item.classList.remove('size-match', 'material-match');
    });
    
    console.log(`✅ All ${productItems.length} products are now visible`);
  }

  filterProductsByFrameSize(frameSize) {
    
    // Get all product items
    const productItems = document.querySelectorAll('.product-item');
    const productGrid = document.querySelector('.product-grid');
    
    if (productItems.length === 0) {
      return;
    }
    
    let visibleCount = 0;
    
    // ✅ Add filtering-active class to product-grid
    if (productGrid) {
      productGrid.classList.add('filtering-active');
    }
    
    // Show/hide products based on frame size
    productItems.forEach((item, index) => {
      const productSize = item.dataset.productSize;
      const availableSizes = item.dataset.availableSizes;
      
      
      // Check if product matches frame size
      const matchesSize = this.productMatchesFrameSize(productSize, availableSizes, frameSize);
      
      if (matchesSize) {
        item.style.display = 'block';
        item.classList.add('size-match');
        visibleCount++;
        
        // Update price for this product based on selected frame size
        this.updateProductPriceForFrameSize(item, frameSize);
      } else {
        item.style.display = 'none';
        item.classList.remove('size-match');
      }
    });
    
    
    // Update filter button text
    this.updateFilterButtonText(frameSize);
    
    // Show message
    this.showMessage(`${visibleCount} products available for ${frameSize} frames`, 'info');
  }
  
  productMatchesFrameSize(productSize, availableSizes, frameSize) {
    console.log(`🔍 Comparing sizes - Frame: "${frameSize}", Product: "${productSize}", Available: "${availableSizes}"`);
    
    // Normalize sizes for comparison
    const normalizeSize = (size) => {
      if (!size) return null;
      
      // Try to extract size from format like "L - 70 x 100.0cm"
      const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const width = Math.round(parseFloat(match[1]));
        const height = Math.round(parseFloat(match[2]));
        return `${width}x${height}`;
      }
      
      // Try to extract size from format like "70x100" or "29.7x42"
      const simpleMatch = size.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i);
      if (simpleMatch) {
        const width = Math.round(parseFloat(simpleMatch[1]));
        const height = Math.round(parseFloat(simpleMatch[2]));
        return `${width}x${height}`;
      }
      
      return null;
    };
    
    const normalizedFrameSize = normalizeSize(frameSize);
    console.log(`📏 Normalized frame size: "${normalizedFrameSize}"`);
    
    // Check if the frame size matches the product's current size
    const normalizedProductSize = normalizeSize(productSize);
    console.log(`📦 Normalized product size: "${normalizedProductSize}"`);
    
    if (normalizedProductSize === normalizedFrameSize) {
      console.log(`✅ Direct match found!`);
      return true;
    }
    
    // Check if the frame size is in the available sizes
    if (availableSizes) {
      const sizes = availableSizes.split(',');
      console.log(`🔍 Checking available sizes:`, sizes);
      
      for (let size of sizes) {
        const normalizedSize = normalizeSize(size.trim());
        console.log(`  - "${size.trim()}" -> "${normalizedSize}"`);
        
        if (normalizedSize === normalizedFrameSize) {
          console.log(`✅ Match found in available sizes!`);
          return true;
        }
      }
    }
    
    console.log(`❌ No match found`);
    return false;
  }
  
  updateFilterButtonText(frameSize) {
    const filterButton = document.querySelector('.filter-button');
    if (filterButton) {
      filterButton.textContent = `Filter: ${frameSize}`;
      filterButton.classList.add('active');
    }
  }

  // Function to reset all product prices to default
  resetAllProductPrices() {
    console.log('🔄 Resetting all product prices to default');
    
    const productItems = document.querySelectorAll('.product-item');
    productItems.forEach(item => {
      // Reset to original price from data attribute
      const originalPrice = item.dataset.productPrice;
      const priceElement = item.querySelector('.product-price');
      
      if (priceElement && originalPrice) {
        priceElement.textContent = originalPrice;
        console.log('   Reset price for:', item.dataset.productTitle, 'to:', originalPrice);
      }
    });
  }

  // New function to update product price based on frame size
  updateProductPriceForFrameSize(productItem, frameSize) {
    try {
      // Get variant prices data from the product item
      const variantPricesData = productItem.dataset.variantPrices;
      const variantIdsData = productItem.dataset.variantIdsBySize;
      
      if (!variantPricesData || !variantIdsData) {
        return;
      }
      
      // Parse the JSON data
      const variantPrices = JSON.parse(variantPricesData);
      const variantIds = JSON.parse(variantIdsData);
      
      console.log('💰 Updating price for:', productItem.dataset.productTitle);
      console.log('   Frame size:', frameSize);
      console.log('   Available prices:', variantPrices);
      
      // Find the price for the selected frame size
      let priceForSize = null;
      let variantIdForSize = null;
      
      // Try to find exact match first
      if (variantPrices[frameSize]) {
        priceForSize = variantPrices[frameSize];
        variantIdForSize = variantIds[frameSize];
      } else {
        // Try to find by normalized size
        const normalizeSize = (size) => {
          if (!size) return null;
          const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
          if (match) {
            const width = Math.round(parseFloat(match[1]));
            const height = Math.round(parseFloat(match[2]));
            return `${width}x${height}`;
          }
          const simpleMatch = size.match(/(\d+)x(\d+)/i);
          if (simpleMatch) {
            return `${simpleMatch[1]}x${simpleMatch[2]}`;
          }
          return null;
        };
        
        const normalizedFrameSize = normalizeSize(frameSize);
        
        // Search through all available sizes
        for (let [sizeKey, price] of Object.entries(variantPrices)) {
          const normalizedSize = normalizeSize(sizeKey);
          if (normalizedSize === normalizedFrameSize) {
            priceForSize = price;
            variantIdForSize = variantIds[sizeKey];
            break;
          }
        }
      }
      
      if (priceForSize && variantIdForSize) {
        // Format the price (priceForSize is already in decimal format like 70.99)
        const formattedPrice = this.formatMoney(priceForSize);
        
        // Update the price display
        const priceElement = productItem.querySelector('.product-price');
        if (priceElement) {
          priceElement.textContent = formattedPrice;
        }
        
        // Update the data attributes
        productItem.dataset.productPrice = formattedPrice;
        productItem.dataset.productPriceRaw = priceForSize;
        productItem.dataset.variantId = variantIdForSize;
        
        // Update the product size to match the frame
        const sizeElement = productItem.querySelector('.product-size');
        if (sizeElement) {
          sizeElement.textContent = frameSize;
        }
        
      } else {
      }
      
    } catch (error) {
      console.error('❌ Error updating product price:', error);
    }
  }

  selectFrameForProduct(frameIndex) {
    // Remove previous selection
    document.querySelectorAll('.gallery-frame').forEach(frame => frame.classList.remove('selected'));
    
    // Select current frame
    const frame = this.galleryFrames[frameIndex];
    if (frame) {
      frame.element.classList.add('selected');
      
      // Get frame size and filter products
      const frameSize = frame.element.dataset.size;
      console.log('🎯 Frame selected:', frameSize);
      
      // Filter products by frame size in Step 3
      if (this.currentStep === 3) {
        // ✅ CHECK IF MATERIAL IS ALREADY SELECTED
        if (this.selectedMaterial) {
          console.log(`🎯 Frame selected with material already chosen: ${frameSize} + ${this.selectedMaterial}`);
          this.filterProductsByFrameSizeAndMaterial(frameSize, this.selectedMaterial);
        } else {
          this.filterProductsByFrameSize(frameSize);
        }
      }
      
      // Force frame visibility on mobile
      if (this.isMobile) {
        frame.element.style.position = 'absolute';
        frame.element.style.zIndex = '20';
        frame.element.style.display = 'block';
        frame.element.style.visibility = 'visible';
        frame.element.style.opacity = '1';
        frame.element.style.willChange = 'transform';
        frame.element.style.backfaceVisibility = 'hidden';
        frame.element.style.transform = 'translateZ(0)';
      }
      
      // Show selected product in Step 4 if it has a product
      this.updateSelectedProductDisplay(frame);
      
      // If frame already has an image, show message to click on a new product
      if (frame.product) {
        this.showMessage('Frame selected! Click on any product to replace the current image. You can change as many times as you want!', 'info');
      } else {
        this.showMessage('Frame selected! Now choose a product to add.', 'info');
      }
    }
  }

  updateSelectedProductDisplay(frame) {
    const selectedProductDisplay = document.getElementById('selected-product-display');
    const selectedProductImage = document.getElementById('selected-product-image');
    const selectedProductTitle = document.getElementById('selected-product-title');
    const selectedProductSize = document.getElementById('selected-product-size');
    
    if (frame.product && selectedProductDisplay) {
      // Show the display
      selectedProductDisplay.style.display = 'block';
      
      // Update product info
      if (selectedProductImage) {
        selectedProductImage.src = frame.product.image;
        selectedProductImage.alt = frame.product.title;
      }
      
      if (selectedProductTitle) {
        selectedProductTitle.textContent = frame.product.title;
      }
      
      if (selectedProductSize) {
        selectedProductSize.textContent = `Size: ${frame.data.size}`;
      }
    } else if (selectedProductDisplay) {
      // Hide the display if no product
      selectedProductDisplay.style.display = 'none';
    }
  }

  deselectFrame(frameIndex) {
    // Remove selection from all frames
    document.querySelectorAll('.gallery-frame').forEach(frame => {
      frame.classList.remove('selected');
    });
    
    // Show message that frame is deselected
    this.showMessage('Frame deselected. Click on a frame to select it for product changes.', 'info');
  }

  addProductToSelectedFrame(item) {
    const selectedFrame = document.querySelector('.gallery-frame.selected');
    if (!selectedFrame) {
      this.showMessage('Please select a frame first!', 'warning');
      return;
    }
    
    const frameIndex = parseInt(selectedFrame.dataset.frameIndex);
    const productData = {
      id: item.dataset.productId,
      variantId: item.dataset.variantId,
      title: item.dataset.productTitle,
      price: item.dataset.productPrice,
      priceRaw: item.dataset.productPriceRaw,
      image: item.dataset.productImage,
      handle: item.dataset.productHandle
    };
    
    // ULTRA PROTECTION - FORCE FRAME TO STAY VISIBLE BEFORE ADDING PRODUCT
    if (this.isMobile && selectedFrame) {
      selectedFrame.style.position = 'absolute';
      selectedFrame.style.zIndex = '1000';
      selectedFrame.style.display = 'block';
      selectedFrame.style.visibility = 'visible';
      selectedFrame.style.opacity = '1';
      selectedFrame.style.willChange = 'transform';
      selectedFrame.style.backfaceVisibility = 'hidden';
      selectedFrame.style.transform = 'translateZ(0)';
      selectedFrame.style.pointerEvents = 'auto';
      selectedFrame.style.overflow = 'visible';
    }
    
    this.addProductToFrame(frameIndex, productData, item);
    
    // ULTRA PROTECTION - FORCE FRAME TO STAY VISIBLE AFTER ADDING PRODUCT
    if (this.isMobile && selectedFrame) {
      selectedFrame.style.position = 'absolute';
      selectedFrame.style.zIndex = '1000';
      selectedFrame.style.display = 'block';
      selectedFrame.style.visibility = 'visible';
      selectedFrame.style.opacity = '1';
      selectedFrame.style.willChange = 'transform';
      selectedFrame.style.backfaceVisibility = 'hidden';
      selectedFrame.style.transform = 'translateZ(0)';
      selectedFrame.style.pointerEvents = 'auto';
      selectedFrame.style.overflow = 'visible';
    }
  }

  // Helper function to normalize sizes for CSS
  normalizeSizeForCSS(size) {
    if (!size) return null;
    
    // Try to extract size from format like "S - 29.7 x 42cm (A3)" or "70x100"
    const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      return `${width}x${height}`;
    }
    
    return size.trim();
  }

  // NEW: Add product as gallery frame directly to canvas (like The Poster Club)
  addProductAsGalleryFrame(productData, productElement) {
    const wallArea = document.getElementById('gallery-wall-area');
    if (!wallArea) return;

    // Hide start panel if visible
    const startPanel = wallArea.querySelector('.startPanel');
    if (startPanel) {
      startPanel.style.display = 'none';
    }
    
    wallArea.classList.add('has-frames');
    
    // Get available sizes from the product
    const availableSizes = productElement.dataset.availableSizes ? 
      productElement.dataset.availableSizes.split(',') : 
      ['50x70']; // Default size
    
    console.log('Available sizes:', availableSizes);
    
    // Use first available size as default and normalize it
    const rawDefaultSize = availableSizes[0].trim();
    const defaultSize = this.normalizeSizeForCSS(rawDefaultSize);
    console.log('Default size (raw):', rawDefaultSize);
    console.log('Default size (normalized):', defaultSize);
    
    // Create a new frame element
    const frameIndex = this.galleryFrames.length;
    const frame = document.createElement('div');
    frame.className = 'gallery-frame';
    frame.dataset.frameIndex = frameIndex;
    frame.dataset.size = defaultSize; // Use normalized size for CSS
    frame.dataset.rawSize = rawDefaultSize; // Store raw size for matching
    frame.draggable = false;
    
    // Calculate position (stagger frames)
    const leftPercent = (this.nextFramePosition.x / 640) * 100;
    const topPercent = (this.nextFramePosition.y / 400) * 100;
    
    // Set position only (sizes come from CSS data-size attribute)
    frame.style.top = `${topPercent}%`;
    frame.style.left = `${leftPercent}%`;
    frame.style.position = 'absolute';
    
    // Add default frame content
    const inner = document.createElement('div');
    inner.className = 'inner';
    
    const img = document.createElement('img');
    img.src = productData.image;
    img.alt = productData.title;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    
    inner.appendChild(img);
    frame.appendChild(inner);
    
    // Add control buttons (edit and delete) - like The Poster Club
    const controls = document.createElement('div');
    controls.className = 'frame-controls';
    controls.innerHTML = `
      <button class="frame-edit-btn" title="Edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="frame-delete-btn" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    `;
    frame.appendChild(controls);
    
    frame.classList.add('has-image', 'selected');
    
    // Store frame data BEFORE creating event listeners so they can access it
    const frameData = {
      element: frame,
      index: frameIndex,
      data: {
        x: this.nextFramePosition.x,
        y: this.nextFramePosition.y,
        size: defaultSize
      },
      product: productData,
      hasImage: true,
      isNew: true, // Flag to identify dynamically added frames
      productElement: productElement, // Store for size menu access
      availableSizes: availableSizes // Store for size menu access
    };
    
    // Push frame data to array
    this.galleryFrames.push(frameData);
    
    // Add click handler to open size selection menu (on edit button)
    const editBtn = controls.querySelector('.frame-edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Keep frame selected on mobile
      if (this.isMobile) {
        frame.classList.add('selected');
      }
      this.openFrameSizeMenu(frameIndex, availableSizes, productData, productElement);
    });
    
    // Add touch handler for mobile (edit button)
    if (this.isMobile) {
      editBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Keep frame selected
        frame.classList.add('selected');
        this.openFrameSizeMenu(frameIndex, availableSizes, productData, productElement);
      });
    }
    
    // Add delete handler
    const deleteBtn = controls.querySelector('.frame-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.deleteFrameFromCanvas(frameIndex);
    });
    
    // Add touch handler for mobile (delete button)
    if (this.isMobile) {
      deleteBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.deleteFrameFromCanvas(frameIndex);
      });
    }
    
    // Add click handler to select frame AND open size menu (DESKTOP ONLY)
    if (!this.isMobile) {
    frame.addEventListener('click', (e) => {
      // Don't do anything if clicking on controls
      if (e.target.closest('.frame-controls')) return;
      
      // Don't open menu if frame was just dragged
      if (frame.dataset.wasDragged === 'true') {
        return;
      }
      
      // Select this frame
      document.querySelectorAll('.gallery-frame').forEach(f => f.classList.remove('selected'));
      frame.classList.add('selected');
      
      // Get stored data from frameData
      const storedSizes = frameData.availableSizes;
      const storedProductData = frameData.product;
      const storedProductElement = frameData.productElement;
      
      // Open size menu when clicking on frame
      this.openFrameSizeMenu(frameIndex, storedSizes, storedProductData, storedProductElement);
    });
    }
    
    // ✅ MOBILE: Frame click opens Customize modal (same as desktop)
    if (this.isMobile) {
      let touchStartTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let touchMoved = false;
      
      const handleTouchStart = (e) => {
        // ✅ IGNORE if touching controls
        if (e.target.closest('.frame-controls')) return;
        
        // ✅ IGNORE if modal is open
        if (document.querySelector('.frame-size-menu.active')) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        touchStartTime = Date.now();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;
        
        // Store on element for drag handler to check
        frame.dataset.touchActive = 'true';
      };
      
      const handleTouchMove = (e) => {
        // ✅ IGNORE if touching controls
        if (e.target.closest('.frame-controls')) return;
        if (!touchStartTime) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        // ✅ If moved more than 10px, it's not a tap (let drag handler handle it)
        if (deltaX > 10 || deltaY > 10) {
          touchMoved = true;
          frame.dataset.touchMoved = 'true';
        }
      };
      
      const handleTouchEnd = (e) => {
        // ✅ IGNORE if touching controls - let controls handle their own events
        if (e.target.closest('.frame-controls')) {
          touchStartTime = 0;
          delete frame.dataset.touchActive;
          return;
        }
        
        // ✅ Check if modal is open
        if (document.querySelector('.frame-size-menu.active')) {
          touchStartTime = 0;
          delete frame.dataset.touchActive;
          return;
        }
        
        // ✅ Check if this was actually a drag - check BEFORE processing tap
        const wasDragged = frame.dataset.wasDragged === 'true' || touchMoved || frame.dataset.touchMoved === 'true';
        
        if (wasDragged) {
          touchStartTime = 0;
          touchMoved = false;
          delete frame.dataset.touchActive;
          delete frame.dataset.touchMoved;
          return;
        }
        
        if (!touchStartTime) return;
        
        const currentTime = Date.now();
        const touchDuration = currentTime - touchStartTime;
        
        // ✅ TAP: Less than 500ms and no movement - OPEN MODAL
        if (touchDuration > 0 && touchDuration < 500 && !touchMoved) {
          // ✅ CRITICAL: Stop all propagation IMMEDIATELY
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // ✅ CRITICAL: Don't open menu if frame was just dragged
          if (frame.dataset.wasDragged === 'true') {
            touchStartTime = 0;
            touchMoved = false;
            delete frame.dataset.touchActive;
            delete frame.dataset.touchMoved;
            return;
          }
          
          // Select this frame
          document.querySelectorAll('.gallery-frame').forEach(f => f.classList.remove('selected'));
          frame.classList.add('selected');
          
          // Get stored data from frameData
          const storedSizes = frameData.availableSizes;
          const storedProductData = frameData.product;
          const storedProductElement = frameData.productElement;
          
          // ✅ OPEN MODAL on mobile (same as desktop)
          this.openFrameSizeMenu(frameIndex, storedSizes, storedProductData, storedProductElement);
        }
        
        // Reset
        touchStartTime = 0;
        touchMoved = false;
        delete frame.dataset.touchActive;
        delete frame.dataset.touchMoved;
      };
      
      // ✅ Use capture phase to get events FIRST, before drag handler
      frame.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
      frame.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
      frame.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    }
    
    // Append to wall area
    wallArea.appendChild(frame);
    
    // Log after append so we can see computed styles
    this.selectedProducts.set(frameIndex, productData);
    
    // Apply frame if one is selected
    if (this.selectedFrame) {
      console.log('🎨 Applying selected frame to new gallery frame');
      this.applyFrameImageToGalleryFrame(frame);
    }
    
    // Make frame draggable (like old Step 2)
    this.makeFrameDraggable(frame, frameIndex);
    
    // Update next position (simple grid layout)
    this.nextFramePosition.x += 150;
    if (this.nextFramePosition.x > 500) {
      this.nextFramePosition.x = 50;
      this.nextFramePosition.y += 200;
    }
    
    // Update order summary
    this.updateOrderSummary();
    this.updateAllProductButtons();
  }

  // NEW: Open size selection menu for a frame - Lateral slide like The Poster Club
  openFrameSizeMenu(frameIndex, availableSizes, productData, productElement) {
    
    // Remove any existing size menu and overlay
    const existingMenu = document.querySelector('.frame-size-menu');
    const existingOverlay = document.querySelector('.frame-size-menu-overlay');
    if (existingMenu) {
      existingMenu.remove();
    }
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Get frame data
    const frameData = this.galleryFrames[frameIndex];
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'frame-size-menu-overlay';
    
    // Get available materials from product element
    const availableMaterials = productElement.dataset.availableMaterials ? 
      productElement.dataset.availableMaterials.split(',').map(m => m.trim()) : 
      [];
    
    const hasMaterial = productElement.dataset.hasMaterial === 'true';
    
    // ✅ CRITICAL FIX: Use the material from the FRAME, not global selectedMaterial
    // Each product in each frame has its own material saved in frame.product.material
    const frameSavedMaterial = frameData && frameData.product && frameData.product.material;
    
    // Use frame's saved material, or global, or first available
    let materialToShow = frameSavedMaterial || this.selectedMaterial;
    if (!materialToShow && hasMaterial && availableMaterials.length > 0) {
      materialToShow = availableMaterials[0];
    }
    
    // Create menu HTML with materials and sizes
    const menu = document.createElement('div');
    menu.className = 'frame-size-menu';
    menu.innerHTML = `
      <div class="size-menu-header">
        <h4>Customize</h4>
        <button class="close-size-menu">&times;</button>
      </div>
      ${hasMaterial && availableMaterials.length > 0 ? `
      <div class="menu-section">
        <h5 class="menu-section-title">Material</h5>
        <div class="material-options-inline">
          ${availableMaterials.map(material => {
            const trimmedMaterial = material;
            // ✅ FIXED: Compare with frame's material, not global
            const isSelected = materialToShow && this.normalizeMaterialName(materialToShow.toLowerCase()) === this.normalizeMaterialName(trimmedMaterial.toLowerCase());
            return `
              <button class="material-option-inline ${isSelected ? 'selected' : ''}" data-material="${trimmedMaterial}">
                <span class="material-name">${trimmedMaterial}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}
      <div class="menu-section">
        <h5 class="menu-section-title">Size</h5>
        <div class="size-options">
          ${availableSizes.map(size => {
            const trimmedSize = size.trim();
            const normalizedSize = this.normalizeSizeForCSS(trimmedSize);
            const isSelected = frameData && frameData.data && frameData.data.size === normalizedSize;
            const sizePrice = this.getSizePriceForProduct(trimmedSize, productElement, materialToShow);
            return `
              <button class="size-option ${isSelected ? 'selected' : ''}" data-size="${trimmedSize}" data-price="${sizePrice}">
                <span class="size-name">${trimmedSize}</span>
                <span class="size-price">${sizePrice}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    // Append overlay and menu to body
    document.body.appendChild(overlay);
    document.body.appendChild(menu);
    
    // ✅ CRITICAL: Prevent touch events in menu from affecting canvas frames
    menu.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    menu.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    menu.addEventListener('touchend', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    // Also prevent on overlay
    overlay.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    overlay.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    overlay.addEventListener('touchend', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    // Activate menu and overlay after a brief delay to trigger animation
    setTimeout(() => {
      menu.classList.add('active');
      overlay.classList.add('active');
    }, 10);
    
    // Close handler - remove both menu and overlay
    const closeMenu = () => {
      menu.classList.remove('active');
      overlay.classList.remove('active');
      setTimeout(() => {
        menu.remove();
        overlay.remove();
      }, 300); // Wait for animation to complete
    };
    
    const closeBtn = menu.querySelector('.close-size-menu');
    closeBtn.addEventListener('click', closeMenu);
    
    // Close on overlay click
    overlay.addEventListener('click', closeMenu);
    
    // Material option handlers
    menu.querySelectorAll('.material-option-inline').forEach(option => {
      option.addEventListener('click', () => {
        const newMaterial = option.dataset.material;
        // Update material selection
        this.selectedMaterial = newMaterial;
        
        // Update all material options in menu to reflect selection
        menu.querySelectorAll('.material-option-inline').forEach(m => {
          m.classList.remove('selected');
        });
        option.classList.add('selected');
        
        // Update product variant for new material
        const frame = this.galleryFrames[frameIndex];
        if (frame && frame.data && frame.data.size) {
          const correctVariant = this.findCorrectVariantWithMaterial(
            frame.product,
            frame.element.dataset.rawSize || frame.data.size,
            productElement,
            newMaterial
          );
          
        // Update frame data with safe property access
        if (correctVariant) {
          frame.product.variantId = correctVariant.id || correctVariant.variantId || frame.product.variantId;
          frame.product.price = correctVariant.formattedPrice || correctVariant.price || frame.product.price;
          frame.product.priceRaw = correctVariant.priceRaw || correctVariant.priceRaw || frame.product.priceRaw;
          frame.product.material = newMaterial;  // ✅ CRITICAL: Update the saved material
          
          // ✅ Also update in selectedProducts map
          if (this.selectedProducts.has(frameIndex)) {
            this.selectedProducts.set(frameIndex, frame.product);
          }
          
          console.log('✅ Material updated:', newMaterial, 'Price:', frame.product.price);
          
          // Update ALL size prices in the menu to reflect new material
          menu.querySelectorAll('.size-option').forEach(sizeOption => {
            const size = sizeOption.dataset.size;
            const newSizePrice = this.getSizePriceForProduct(size, productElement, newMaterial);
            const sizePriceSpan = sizeOption.querySelector('.size-price');
            if (sizePriceSpan && newSizePrice) {
              sizePriceSpan.textContent = newSizePrice;
              sizeOption.dataset.price = newSizePrice;
            }
          });
          
          // Update order summary
          this.updateOrderSummary();
        }
        }
      });
    });
    
    // Size option handlers
    menu.querySelectorAll('.size-option').forEach(option => {
      option.addEventListener('click', () => {
        const newSize = option.dataset.size;
        this.changeFrameSize(frameIndex, newSize, productData, productElement);
        closeMenu();
      });
    });
    
    // Close on outside click (click on canvas or other elements)
    setTimeout(() => {
      document.addEventListener('click', function closeOnOutside(e) {
        if (!menu.contains(e.target) && !overlay.contains(e.target)) {
          closeMenu();
          document.removeEventListener('click', closeOnOutside);
        }
      }, { once: true });
    }, 100);
  }
  
  // NEW: Get price for a specific size
  getSizePriceForProduct(size, productElement, material = null) {
    try {
      const allVariants = productElement.dataset.allVariants;
      if (!allVariants) {
        console.log('No allVariants data found');
        return '';
      }
      
      // Normalize the input size to match format in allVariants (which uses raw size_value)
      const normalizedInputSize = this.normalizeSizeForCSS(size);
      const normalizeMaterial = (m) => m ? m.toLowerCase().replace(/[^a-z0-9]/g, '') : null;
      const normalizedMaterial = normalizeMaterial(material);
      
      // Parse variants data: "29.7x42|Material:59.99|id;70x100|Material:84.99|id"
      const variants = allVariants.split(';');
      for (let variant of variants) {
        if (!variant) continue;
        
        const [sizeMat, pricePart] = variant.split(':');
        if (!sizeMat || !pricePart) continue;
        
        const [siz, mat] = sizeMat.split('|');
        
        // Normalize both sizes for comparison
        const normalizedVariantSize = this.normalizeSizeForCSS(siz);
        const normalizedVariantMaterial = normalizeMaterial(mat);
        
        // Match size and optionally material
        const sizeMatch = normalizedVariantSize === normalizedInputSize;
        const materialMatch = !normalizedMaterial || normalizedVariantMaterial === normalizedMaterial ||
                             normalizedVariantMaterial.includes(normalizedMaterial) ||
                             normalizedMaterial.includes(normalizedVariantMaterial);
        
        if (sizeMatch && materialMatch) {
          // pricePart format is "59.99|123456"
          const [priceStr, id] = pricePart.split('|');
          if (!priceStr) continue;
          
          // Price is already in decimal format (59.99), format directly without converting to cents
          console.log(`Found price for size ${size}${material ? ' + ' + material : ''} (normalized: ${normalizedInputSize}): ${priceStr} EUR`);
          return `€${priceStr.replace('.', ',')}`;
        }
      }
      console.log(`No price found for size: ${size}${material ? ' + ' + material : ''} (normalized: ${normalizedInputSize})`);
    } catch (e) {
      console.error('Error parsing price data:', e, 'allVariants:', productElement.dataset.allVariants);
    }
    return '';
  }
  
  // NEW: Delete frame from canvas
  deleteFrameFromCanvas(frameIndex) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame) return;
    
    // Remove from DOM
    if (frame.element && frame.element.parentNode) {
      frame.element.parentNode.removeChild(frame.element);
    }
    
    // Remove from arrays
    this.galleryFrames.splice(frameIndex, 1);
    this.selectedProducts.delete(frameIndex);
    
    // Reindex remaining frames
    this.galleryFrames.forEach((f, idx) => {
      f.index = idx;
      f.element.dataset.frameIndex = idx;
    });
    
    // Don't show startPanel when deleting frames
    // Just update the wall area state
    if (this.galleryFrames.length === 0) {
      const wallArea = document.getElementById('gallery-wall-area');
      wallArea?.classList.remove('has-frames');
      // ✅ DO NOT show startPanel - keep canvas empty
    }
    
    // Update order summary
    this.updateOrderSummary();
    this.updateAllProductButtons();
  }
  
  // NEW: Change frame size
  changeFrameSize(frameIndex, newSize, productData, productElement) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame) return;
    
    // Normalize the new size using helper function
    const normalizedSize = this.normalizeSizeForCSS(newSize);
    console.log('Changing frame size:', {
      raw: newSize,
      normalized: normalizedSize
    });
    
    // Update frame size
    frame.data.size = normalizedSize;
    frame.element.dataset.size = normalizedSize;
    
    console.log('Updated frame dataset:', frame.element.dataset);
    frame.element.dataset.rawSize = newSize; // Store raw size
    
    // Update product variant for new size
    const correctVariant = this.findCorrectVariantWithMaterial(
      productData, 
      newSize, 
      productElement, 
      this.selectedMaterial
    );
    
    // Update frame display properly
    const inner = frame.element.querySelector('.inner');
    if (inner) {
      const img = inner.querySelector('img');
      if (img) {
        img.src = correctVariant.image || productData.image;
      }
    }
    
    // Update stored product data
    frame.product = {
      ...productData,
      variantId: correctVariant.id,
      price: correctVariant.price,
      priceRaw: correctVariant.priceRaw,
      size: newSize,
      frameSize: newSize,
      material: this.selectedMaterial
    };
    
    this.selectedProducts.set(frameIndex, frame.product);
    this.updateOrderSummary();
    
    // Reapply frame image when size changes (frame needs to adapt to new size)
    if (this.selectedFrame) {
      console.log('🔄 Reapplying frame image after size change');
      // Use setTimeout to ensure DOM has updated with new size
      setTimeout(() => {
        this.applyFrameImageToGalleryFrame(frame.element);
      }, 50);
    }
    
    console.log(`✅ Frame size changed to: ${newSize}`, {
      elementSize: frame.element.dataset.size,
      computedWidth: window.getComputedStyle(frame.element).width,
      computedHeight: window.getComputedStyle(frame.element).paddingBottom
    });
  }

  addProductToFrame(frameIndex, productData, productElement) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame) {
      return;
    }

    // Get the REAL frame size from frame.data
    const frameSize = frame.data.size;
    console.log(`🎨 Adding product to frame ${frameIndex}:`, {
      frameSize: frameSize,
      frameData: frame.data,
      productTitle: productData.title
    });
    
    // ✅ CRITICAL FIX: If productElement is null (drag & drop), find it in the DOM
    if (!productElement) {
      console.log(`⚠️ productElement is null, searching in DOM for product ID: ${productData.id}`);
      productElement = document.querySelector(`.product-item[data-product-id="${productData.id}"]`);
      
      if (!productElement) {
        console.error(`❌ Could not find product element for ID: ${productData.id}`);
        console.error(`   This will cause fallback to incorrect variant data!`);
      } else {
        console.log(`✅ Found product element in DOM`);
      }
    }
    
    // ✅ Initialize selectedMaterial from product if not set
    if (!this.selectedMaterial && productElement) {
      const availableMaterials = productElement.dataset.availableMaterials;
      if (availableMaterials) {
        const materials = availableMaterials.split(',').map(m => m.trim());
        if (materials.length > 0) {
          this.selectedMaterial = materials[0];
          console.log(`🔧 Auto-initialized selectedMaterial to: ${this.selectedMaterial}`);
        }
      }
    }
    
    // ✅ USE THE MATERIAL THAT IS CURRENTLY SELECTED/ACTIVE
    const materialToUse = this.selectedMaterial;
    console.log(`🎨 Using material for this product: ${materialToUse}`);
    
    const correctVariant = this.findCorrectVariantWithMaterial(productData, frameSize, productElement, materialToUse);
    

    // ONLY ADD CONTENT - DON'T TOUCH POSITION AT ALL!
    const inner = document.createElement('div');
    inner.className = 'inner';
    
    const img = document.createElement('img');
    img.src = correctVariant.image || productData.image;
    img.alt = productData.title;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    
    inner.appendChild(img);
    frame.element.innerHTML = '';
    frame.element.appendChild(inner);
    
    // ✅ CRITICAL: Add control buttons (edit and delete) - same as addProductAsGalleryFrame
    // Check if controls already exist to avoid duplicates
    let controls = frame.element.querySelector('.frame-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'frame-controls';
      controls.innerHTML = `
        <button class="frame-edit-btn" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="frame-delete-btn" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      `;
      frame.element.appendChild(controls);
      // ✅ DEBUG: Log to verify buttons are created
      console.log('✅ MOBILE: Frame controls created', {
        frame: frame.element,
        controls: controls,
        hasControls: !!frame.element.querySelector('.frame-controls')
      });
    }
    
    // Get available sizes for edit menu
    const availableSizes = productElement && productElement.dataset.availableSizes ? 
      productElement.dataset.availableSizes.split(',').map(s => s.trim()) : 
      [frameSize];
    
    // Add click handler to open size selection menu (on edit button)
    const editBtn = controls.querySelector('.frame-edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (this.isMobile) {
        frame.element.classList.add('selected');
      }
      this.openFrameSizeMenu(frameIndex, availableSizes, frame.product, productElement);
    });
    
    // Add touch handler for mobile (edit button)
    if (this.isMobile) {
      editBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        frame.element.classList.add('selected');
        this.openFrameSizeMenu(frameIndex, availableSizes, frame.product, productElement);
      });
    }
    
    // Add delete handler
    const deleteBtn = controls.querySelector('.frame-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.deleteFrameFromCanvas(frameIndex);
    });
    
    // Add touch handler for mobile (delete button)
    if (this.isMobile) {
      deleteBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.deleteFrameFromCanvas(frameIndex);
      });
    }
    
    // ✅ MOBILE: Add toggle handler for showing/hiding buttons
    if (this.isMobile) {
      // ✅ CRITICAL: Always attach handlers (remove old ones first if they exist)
      if (frame.element._toggleHandlers) {
        // Remove old handlers
        frame.element.removeEventListener('touchstart', frame.element._toggleHandlers.start, { capture: true });
        frame.element.removeEventListener('touchmove', frame.element._toggleHandlers.move, { capture: true });
        frame.element.removeEventListener('touchend', frame.element._toggleHandlers.end, { capture: true });
      }
      
      let toggleStartTime = 0;
      let toggleStartX = 0;
      let toggleStartY = 0;
      let toggleMoved = false;
      
      const handleToggleTouchStart = (e) => {
        // ✅ IGNORE if touching controls
        if (e.target.closest('.frame-controls')) return;
        
        // ✅ IGNORE if modal is open
        if (document.querySelector('.frame-size-menu.active')) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        toggleStartTime = Date.now();
        toggleStartX = touch.clientX;
        toggleStartY = touch.clientY;
        toggleMoved = false;
        
        // Store on element for drag handler to check
        frame.element.dataset.toggleActive = 'true';
        frame.element.dataset.toggleStartTime = toggleStartTime.toString();
      };
      
      const handleToggleTouchMove = (e) => {
        // ✅ IGNORE if touching controls
        if (e.target.closest('.frame-controls')) return;
        if (!toggleStartTime) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const deltaX = Math.abs(touch.clientX - toggleStartX);
        const deltaY = Math.abs(touch.clientY - toggleStartY);
        
        // ✅ If moved more than 8px, it's not a tap
        if (deltaX > 8 || deltaY > 8) {
          toggleMoved = true;
          frame.element.dataset.toggleMoved = 'true';
        }
      };
      
      const handleToggleTouchEnd = (e) => {
        // ✅ IGNORE if touching controls - let controls handle their own events
        if (e.target.closest('.frame-controls')) {
          toggleStartTime = 0;
          delete frame.element.dataset.toggleActive;
          return;
        }
        
        // ✅ Check if modal is open
        if (document.querySelector('.frame-size-menu.active')) {
          toggleStartTime = 0;
          delete frame.element.dataset.toggleActive;
          return;
        }
        
        // ✅ Check if this was actually a drag - check BEFORE processing tap
        const wasDragged = frame.element.dataset.wasDragged === 'true' || toggleMoved || frame.element.dataset.toggleMoved === 'true';
        
        if (wasDragged) {
          toggleStartTime = 0;
          toggleMoved = false;
          delete frame.element.dataset.toggleActive;
          delete frame.element.dataset.toggleMoved;
          return;
        }
        
        if (!toggleStartTime) return;
        
        const currentTime = Date.now();
        const touchDuration = currentTime - toggleStartTime;
        
        // ✅ TAP: Less than 500ms and no movement - OPEN MODAL
        if (touchDuration > 0 && touchDuration < 500 && !toggleMoved) {
          // ✅ CRITICAL: Stop all propagation IMMEDIATELY
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // ✅ CRITICAL: Don't open menu if frame was just dragged
          if (frame.element.dataset.wasDragged === 'true') {
            toggleStartTime = 0;
            toggleMoved = false;
            delete frame.element.dataset.toggleActive;
            delete frame.element.dataset.toggleMoved;
            return;
          }
          
          // Select this frame
          document.querySelectorAll('.gallery-frame').forEach(f => f.classList.remove('selected'));
          frame.element.classList.add('selected');
          
          // Get stored data
          const frameData = this.galleryFrames[frameIndex];
          const storedSizes = frameData?.availableSizes || frameData?.data?.availableSizes || [];
          const storedProductData = frameData?.product;
          const storedProductElement = frameData?.productElement;
          
          // ✅ OPEN MODAL on mobile (same as desktop)
          this.openFrameSizeMenu(frameIndex, storedSizes, storedProductData, storedProductElement);
        }
        
        // Reset
        toggleStartTime = 0;
        toggleMoved = false;
        delete frame.element.dataset.toggleActive;
        delete frame.element.dataset.toggleMoved;
        delete frame.element.dataset.toggleStartTime;
      };
      
      // ✅ Use capture phase to get events FIRST, before drag handler
      frame.element.addEventListener('touchstart', handleToggleTouchStart, { passive: true, capture: true });
      frame.element.addEventListener('touchmove', handleToggleTouchMove, { passive: true, capture: true });
      frame.element.addEventListener('touchend', handleToggleTouchEnd, { passive: false, capture: true });
      
      frame.element._toggleHandlersAttached = true;
      frame.element._toggleHandlers = {
        start: handleToggleTouchStart,
        move: handleToggleTouchMove,
        end: handleToggleTouchEnd
      };
    }
    
    // Add has-image class to hide frame size
    frame.element.classList.add('has-image');
    
    // Check if this is a replacement or first product
    const isReplacement = frame.product !== null;
    
    // Store product data with correct variant AND SAVE FRAME SIZE AND MATERIAL
    frame.product = {
      ...productData,
      variantId: correctVariant.id,
      price: correctVariant.price,
      priceRaw: correctVariant.priceRaw,
      size: correctVariant.size,
      frameSize: frameSize,  // ✅ SAVE THE REAL FRAME SIZE HERE
      material: materialToUse  // ✅ SAVE THE MATERIAL USED FOR THIS PRODUCT
    };
    
    console.log(`✅ Product saved to frame with data:`, frame.product);
    
    // Set hasImage flag
    frame.hasImage = true;
    
    // DON'T update frame.data.size - keep original layout size
    // frame.data.size should remain as "50x70" from layout
    
    this.selectedProducts.set(frameIndex, frame.product);
    
    // Keep frame selected to allow multiple product changes
    frame.element.classList.add('selected');
    
    // Position remains exactly the same - no changes made!
    
    // FORCE VISIBILITY ON MOBILE - PROTECT FRAME FROM DISAPPEARING
    if (this.isMobile) {
      frame.element.style.position = 'absolute';
      frame.element.style.zIndex = '1000';
      frame.element.style.display = 'block';
      frame.element.style.visibility = 'visible';
      frame.element.style.opacity = '1';
      frame.element.style.willChange = 'transform';
      frame.element.style.backfaceVisibility = 'hidden';
      frame.element.style.transform = 'translateZ(0)';
      
      // Start monitoring this specific frame
      this.startFrameProtection(frameIndex);
    }
    
    // Apply frame if one is selected
    if (this.selectedFrame) {
      this.applyFrameImageToGalleryFrame(frame.element);
    }
    
    // Update order summary
    this.updateOrderSummary();
    
    // Update all product buttons
    this.updateAllProductButtons();
    
    // Show different message based on whether it's first product or replacement
    if (isReplacement) {
      this.showMessage('Product replaced! Click on another product to change again.', 'success');
    } else {
    this.showMessage('product_added', 'success');
    }
  }

  applyLayoutToFrame(frameIndex, layoutData) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame) return;

    // Apply layout styling to frame
    frame.element.style.borderStyle = 'dashed';
    frame.element.style.borderColor = '#fb6b00';
    frame.element.innerHTML = `
      <div class="layout-applied">
        <div class="layout-name">${layoutData.name}</div>
        <div class="frame-size">${frame.data.size}</div>
      </div>
    `;
    
    this.showMessage('Layout applied to frame', 'success');
  }

  selectFrame(option) {
    // Remove previous selection
    document.querySelectorAll('.frame-option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    option.classList.add('selected');
    
    // Get frame data from real product
    const frameName = option.querySelector('.frame-name').textContent;
    const frameImage = option.querySelector('.frame-preview img');
    const variants = option.querySelectorAll('.frame-variant');
    
    // Store selected frame with variants
    this.selectedFrame = {
      id: option.dataset.frame,
      productId: option.dataset.productId,
      name: frameName,
      image: frameImage ? frameImage.src : null,
      variants: []
    };
    
    // Store all variants with their prices
    variants.forEach(variant => {
      this.selectedFrame.variants.push({
        id: variant.dataset.variantId,
        size: variant.dataset.size,
        price: variant.querySelector('.variant-price').textContent,
        priceValue: parseFloat(variant.querySelector('.variant-price').textContent.replace(/[^\d.,]/g, '').replace(',', '.'))
      });
    });
    
    // Apply frame to all gallery frames
    this.applyFrameToGallery();
    
    this.updateOrderSummary();
    this.showMessage(`Frame selected: ${frameName}`, 'success');
  }

  getFrameColor(frameId) {
    const colors = {
      'black-frame': '#000000',
      'white-frame': '#ffffff',
      'brown-frame': '#E2E2E2',
      'oak-frame': '#D2B48C',
      'gold': '#FFD700',
      'brass': '#B87333',
      'oak': '#E2E2E2',
      'walnut': '#5D4037'
    };
    
    // Try exact match first
    if (colors[frameId]) {
      return colors[frameId];
    }
    
    // Try partial match
    const lowerFrameId = frameId.toLowerCase();
    for (const [key, value] of Object.entries(colors)) {
      if (lowerFrameId.includes(key.replace('-frame', ''))) {
        return value;
      }
    }
    
    return '#E2E2E2'; // Default brown
  }

  getFrameBackground(frameId) {
    const backgrounds = {
      'black': 'linear-gradient(45deg, #000 25%, #333 25%, #333 50%, #000 50%, #000 75%, #333 75%)',
      'white': 'linear-gradient(45deg, #fff 25%, #f0f0f0 25%, #f0f0f0 50%, #fff 50%, #fff 75%, #f0f0f0 75%)',
      'gold': 'linear-gradient(45deg, #FFD700 25%, #FFA500 25%, #FFA500 50%, #FFD700 50%, #FFD700 75%, #FFA500 75%)',
      'brass': 'linear-gradient(45deg, #B87333 25%, #CD7F32 25%, #CD7F32 50%, #B87333 50%, #B87333 75%, #CD7F32 75%)',
      'oak': 'linear-gradient(45deg, #E2E2E2 25%, #A0522D 25%, #A0522D 50%, #E2E2E2 50%, #E2E2E2 75%, #A0522D 75%)',
      'walnut': 'linear-gradient(45deg, #5D4037 25%, #8D6E63 25%, #8D6E63 50%, #5D4037 50%, #5D4037 75%, #8D6E63 75%)'
    };
    return backgrounds[frameId] || 'white';
  }

  parseLayoutData(layoutString) {
    try {
      const cleanData = layoutString.replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
      return JSON.parse(cleanData);
    } catch (error) {
      console.error('Error parsing layout data:', error);
      return null;
    }
  }

  clearGallery() {
    const wallArea = document.getElementById('gallery-wall-area');
    if (wallArea) {
      // Remove all frames
      wallArea.querySelectorAll('.gallery-frame').forEach(frame => frame.remove());
      
      // Clear gallery frames array
      this.galleryFrames = [];
      
      // Show start panel
      wallArea.innerHTML = `
        <div class="startPanel">
          <div class="topHeading">STEP-BY-STEP</div>
          <div class="heading">Create the perfect gallery wall</div>
          <div class="text">Use our new tool to find designs and frames that match each other.</div>
          <div class="startButton" onclick="startGalleryBuilder()">START HERE</div>
        </div>
      `;
      
      // Remove has-frames class
      wallArea.classList.remove('has-frames');
    }
  }

  initializeDragAndDrop() {
    // COMPLETELY DISABLE DRAG & DROP FOR PRODUCT ITEMS - NO DRAG EVER!
    document.querySelectorAll('.product-item').forEach(item => {
      item.draggable = false;
      item.style.cursor = 'pointer';
      
      // Remove any existing drag event listeners
      item.removeEventListener('dragstart', () => {});
      item.removeEventListener('dragend', () => {});
      
      // Add explicit prevention for mobile touch events - but allow scrolling
      if (this.isMobile) {
        item.addEventListener('touchstart', (e) => {
          // Only prevent if it's a drag gesture, not a scroll
          e.stopPropagation();
        }, { passive: true });
        
        item.addEventListener('touchmove', (e) => {
          // Allow scrolling but prevent drag propagation
          e.stopPropagation();
        }, { passive: true });
      }
    });
    
    // Make layout options draggable
    document.querySelectorAll('.layout-option').forEach(option => {
      option.draggable = true;
      
      option.addEventListener('dragstart', (e) => {
        const layoutData = {
          type: 'layout',
          id: option.dataset.layout,
          name: option.querySelector('.layout-name').textContent,
          data: this.parseLayoutData(option.dataset.layoutData)
        };
        
        console.log('Layout drag start:', layoutData);
        e.dataTransfer.setData('text/plain', JSON.stringify(layoutData));
        e.dataTransfer.effectAllowed = 'copy';
        
        option.classList.add('dragging');
      });
      
      option.addEventListener('dragend', (e) => {
        option.classList.remove('dragging');
      });
    });
    
    // Make frames droppable
    document.querySelectorAll('.gallery-frame').forEach((frame, index) => {
      frame.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        frame.classList.add('drag-over');
        
        // FORCE FRAME TO STAY VISIBLE DURING DRAG
        frame.style.position = 'absolute';
        frame.style.zIndex = '1000';
        frame.style.display = 'block';
        frame.style.visibility = 'visible';
        frame.style.opacity = '1';
        frame.style.willChange = 'transform';
        frame.style.backfaceVisibility = 'hidden';
        frame.style.transform = 'translateZ(0)';
        frame.style.pointerEvents = 'auto';
        frame.style.overflow = 'visible';
      });
      
      frame.addEventListener('dragleave', (e) => {
        frame.classList.remove('drag-over');
        
        // FORCE FRAME TO STAY VISIBLE AFTER DRAG LEAVE
        frame.style.position = 'absolute';
        frame.style.zIndex = '1000';
        frame.style.display = 'block';
        frame.style.visibility = 'visible';
        frame.style.opacity = '1';
        frame.style.willChange = 'transform';
        frame.style.backfaceVisibility = 'hidden';
        frame.style.transform = 'translateZ(0)';
        frame.style.pointerEvents = 'auto';
        frame.style.overflow = 'visible';
      });
      
      frame.addEventListener('drop', (e) => {
        e.preventDefault();
        frame.classList.remove('drag-over');
        
        // FORCE FRAME TO STAY VISIBLE DURING DROP
        frame.style.position = 'absolute';
        frame.style.zIndex = '1000';
        frame.style.display = 'block';
        frame.style.visibility = 'visible';
        frame.style.opacity = '1';
        frame.style.willChange = 'transform';
        frame.style.backfaceVisibility = 'hidden';
        frame.style.transform = 'translateZ(0)';
        frame.style.pointerEvents = 'auto';
        frame.style.overflow = 'visible';
        
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          
          if (data.type === 'layout') {
            // Handle layout drop
            this.applyLayoutToFrame(index, data);
          } else {
            // Handle product drop
            this.addProductToFrame(index, data, null);
          }
          
          // FORCE FRAME TO STAY VISIBLE AFTER DROP
          frame.style.position = 'absolute';
          frame.style.zIndex = '1000';
          frame.style.display = 'block';
          frame.style.visibility = 'visible';
          frame.style.opacity = '1';
          frame.style.willChange = 'transform';
          frame.style.backfaceVisibility = 'hidden';
          frame.style.transform = 'translateZ(0)';
          frame.style.pointerEvents = 'auto';
          frame.style.overflow = 'visible';
        } catch (error) {
          console.error('Error handling drop:', error);
        }
      });
    });
    
    // Make gallery wall area droppable for layouts and draggable
    const galleryWallArea = document.getElementById('gallery-wall-area');
    if (galleryWallArea) {
      // Gallery wall area is no longer draggable - only individual frames are
      galleryWallArea.draggable = false;
      galleryWallArea.style.cursor = 'default';
      
      galleryWallArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        galleryWallArea.classList.add('drag-over');
      });
      
      galleryWallArea.addEventListener('dragleave', (e) => {
        galleryWallArea.classList.remove('drag-over');
      });
      
      galleryWallArea.addEventListener('drop', (e) => {
        e.preventDefault();
        galleryWallArea.classList.remove('drag-over');
        
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          console.log('Drop on gallery wall:', data);
          
          if (data.type === 'layout') {
            // Apply layout to entire gallery
            this.applyLayoutToGallery(data.data);
          }
        } catch (error) {
          console.error('Error handling gallery wall drop:', error);
        }
      });
    }
    
    // Initialize individual frame dragging like Desenio
    this.initializeFrameDragging();
  }

  initializeFrameDragging() {
    // Frame dragging is now handled individually in renderGalleryFrames()
    // This function is kept for compatibility but functionality moved
  }

  initializeFilterSidebar() {
    console.log('Initializing filter sidebar...');
    
    // Ensure filter sidebar is properly hidden initially
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
      console.log('Filter sidebar initialized and hidden');
    } else {
      console.error('Filter sidebar not found during initialization!');
    }
    
    // Ensure show filter button is visible
    const showFilterBtn = document.getElementById('show-filter-btn');
    if (showFilterBtn) {
      console.log('Show filter button initialized and visible');
    } else {
      console.error('Show filter button not found during initialization!');
    }
  }

  swapFrames(fromIndex, toIndex) {
    console.log('Swapping frames:', fromIndex, 'to', toIndex);
    
    const frames = document.querySelectorAll('.gallery-frame');
    const fromFrame = frames[fromIndex];
    const toFrame = frames[toIndex];
    
    if (fromFrame && toFrame && fromIndex !== toIndex) {
      // Get positions
      const fromRect = fromFrame.getBoundingClientRect();
      const toRect = toFrame.getBoundingClientRect();
      
      // Swap data attributes
      const fromSize = fromFrame.dataset.size;
      const toSize = toFrame.dataset.size;
      
      fromFrame.dataset.size = toSize;
      toFrame.dataset.size = fromSize;
      
      // Update frame content
      this.updateFrameContent(fromFrame, toSize);
      this.updateFrameContent(toFrame, fromSize);
      
      console.log('Frames swapped successfully');
    }
  }

  updateFrameContent(frame, size) {
    const placeholder = frame.querySelector('.frame-placeholder');
    if (placeholder) {
      const sizeElement = placeholder.querySelector('.frame-size');
      if (sizeElement) {
        sizeElement.textContent = size;
      }
    }
  }

  showFilterSidebar() {
    console.log('showFilterSidebar called');
    const sidebar = document.getElementById('filter-sidebar');
    console.log('Filter sidebar element:', sidebar);
    
    if (sidebar) {
      // Force critical styles to ensure visibility
      sidebar.style.zIndex = '99999';
      sidebar.style.position = 'fixed';
      sidebar.style.top = '0';
      sidebar.style.right = '0';
      sidebar.style.width = '350px';
      sidebar.style.height = '100vh';
      sidebar.style.display = 'flex';
      sidebar.style.flexDirection = 'column';
      sidebar.style.visibility = 'visible';
      sidebar.style.opacity = '1';
      sidebar.style.pointerEvents = 'auto';
      
      // Add the active class
        sidebar.classList.add('active');
      console.log('Filter sidebar activated');
      
      this.bindFilterEvents();
    } else {
      console.error('Filter sidebar not found!');
    }
  }

  hideFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
      console.log('Filter sidebar hidden');
    }
  }



  bindFilterEvents() {
    // Category filter options
    document.querySelectorAll('.filter-option').forEach(option => {
      this.addMobileTouchEvents(option, (e) => {
        // Remove active from all options
        document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
        // Add active to clicked option
        option.classList.add('active');
        
        // Filter products by category
        this.filterProductsByCategory(option.dataset.category);
      });
    });
  }

  filterProductsByCategory(category) {
    console.log('Filtering by category:', category);
    
    // Get all product items
    const products = document.querySelectorAll('.product-item');
    
    products.forEach(product => {
      if (category === 'all') {
        product.style.display = 'block';
      } else {
        // Simple category filtering based on product title
        const title = product.dataset.productTitle.toLowerCase();
        const shouldShow = this.matchesCategory(title, category);
        product.style.display = shouldShow ? 'block' : 'none';
      }
    });
  }

  matchesCategory(title, category) {
    const categoryKeywords = {
      'art': ['art', 'painting', 'gallery', 'exhibition', 'museum'],
      'nature': ['nature', 'landscape', 'tree', 'flower', 'botanical', 'bird', 'animal'],
      'vintage': ['vintage', 'retro', 'old', 'classic', 'antique'],
      'abstract': ['abstract', 'modern', 'geometric', 'pattern'],
      'botanical': ['botanical', 'plant', 'leaf', 'herb', 'garden'],
      'typography': ['typography', 'text', 'letter', 'font', 'quote'],
      'illustration': ['illustration', 'drawing', 'sketch', 'design']
    };
    
    const keywords = categoryKeywords[category] || [];
    return keywords.some(keyword => title.includes(keyword));
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  handleDrop(e, frameIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    // FORCE FRAME TO STAY VISIBLE - NO DISAPPEARING ALLOWED!
    const frame = this.galleryFrames[frameIndex];
    if (frame && frame.element) {
      // ULTRA AGGRESSIVE FRAME PROTECTION
      frame.element.style.position = 'absolute';
      frame.element.style.zIndex = '1000';
      frame.element.style.display = 'block';
      frame.element.style.visibility = 'visible';
      frame.element.style.opacity = '1';
      frame.element.style.willChange = 'transform';
      frame.element.style.backfaceVisibility = 'hidden';
      frame.element.style.transform = 'translateZ(0)';
      frame.element.style.pointerEvents = 'auto';
      frame.element.style.overflow = 'visible';
    }
    
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      
      // Check if it's a URL instead of JSON
      if (rawData.startsWith('http')) {
        return;
      }
      
      const productData = JSON.parse(rawData);
      this.addProductToFrame(frameIndex, productData, null);
      
      // FORCE FRAME TO STAY VISIBLE AFTER ADDING PRODUCT
      if (frame && frame.element) {
        frame.element.style.position = 'absolute';
        frame.element.style.zIndex = '1000';
        frame.element.style.display = 'block';
        frame.element.style.visibility = 'visible';
        frame.element.style.opacity = '1';
        frame.element.style.willChange = 'transform';
        frame.element.style.backfaceVisibility = 'hidden';
        frame.element.style.transform = 'translateZ(0)';
        frame.element.style.pointerEvents = 'auto';
        frame.element.style.overflow = 'visible';
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }

  handleFrameDragStart(e, frameIndex) {
    // This method is now replaced by makeFrameDraggable
    // Keeping for compatibility but not used
  }

  makeFrameDraggable(frame, frameIndex) {
    let isDragging = false;
    let dragStarted = false; // Track if drag actually started (mouse moved)
    let startX, startY, initialX, initialY;
    let touchStartTime = 0; // Track touch duration
    
    // Mouse events
    frame.addEventListener('mousedown', (e) => {
      // ✅ CRITICAL: Don't start drag if clicking on controls
      if (e.target.closest('.frame-controls')) return;
      
      // ✅ CRITICAL: Only start drag if clicking DIRECTLY on the frame or its child elements
      // Don't start drag if clicking outside the frame (even if frame is selected)
      const clickTarget = e.target;
      const frameElement = frame;
      
      // Check if click is actually on this frame or its children
      if (clickTarget === frameElement || frameElement.contains(clickTarget)) {
        // Verify click is within frame bounds
        const frameRect = frameElement.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        // ✅ CRITICAL: Only proceed if click is inside frame bounds
        if (clickX >= frameRect.left && clickX <= frameRect.right && 
            clickY >= frameRect.top && clickY <= frameRect.bottom) {
        isDragging = true;
        dragStarted = false;
        frame.classList.add('dragging');
        
        // Get initial mouse position
        startX = e.clientX;
        startY = e.clientY;
        
        // Get initial frame position
        const rect = frame.getBoundingClientRect();
          const canvasRect = document.getElementById('gallery-canvas')?.getBoundingClientRect();
          if (!canvasRect) {
            isDragging = false;
            return;
          }
        
        initialX = rect.left - canvasRect.left;
        initialY = rect.top - canvasRect.top;
        
        // Prevent text selection during drag
        e.preventDefault();
          e.stopPropagation();
        
        // Add global mouse events
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        }
      }
    });
    
    // Touch events for mobile - BEST PRACTICES
    // ✅ Use NON-capture to run AFTER toggle handler (which uses capture)
    frame.addEventListener('touchstart', (e) => {
      // ✅ CRITICAL: Don't drag if modal is open
      if (document.querySelector('.frame-size-menu.active')) return;
      
      // ✅ CRITICAL: Don't handle touch if it's on controls
      if (e.target.closest('.frame-controls')) return;
      
      // ✅ CRITICAL: If toggle handler is active, wait before starting drag
      // The toggle handler uses capture:true, so it will run first
      // We'll only start drag if movement is detected
      
      // ✅ BEST PRACTICE: Just store initial position, don't start drag yet
      const touch = e.touches[0];
      if (!touch) return;
      
      startX = touch.clientX;
      startY = touch.clientY;
      touchStartTime = Date.now();
      
      // ✅ CRITICAL: Reset drag flags - don't start drag until movement > 15px
      isDragging = false;
      dragStarted = false;
      
      // Get initial frame position
      const rect = frame.getBoundingClientRect();
      const canvasRect = document.getElementById('gallery-canvas')?.getBoundingClientRect();
      if (!canvasRect) return;
      
      initialX = rect.left - canvasRect.left;
      initialY = rect.top - canvasRect.top;
      
      // Add global touch events to detect movement
      // ✅ Use NON-capture so toggle handler (capture:true) runs first
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: false });
    }, { passive: true, capture: false }); // ✅ NON-capture to run AFTER toggle handler
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // Mark that drag has actually started (mouse has moved)
      if (!dragStarted) {
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);
        
        // Only mark as drag if moved more than 3px (avoid accidental drags)
        if (deltaX > 3 || deltaY > 3) {
          dragStarted = true;
        }
      }
      
      if (dragStarted) {
        // Calculate new position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        // Update frame position in pixels (no constraints)
        frame.style.left = `${newX}px`;
        frame.style.top = `${newY}px`;
      }
    };
    
    const handleMouseUp = (e) => {
      // ✅ CRITICAL: Always remove listeners first
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // ✅ CRITICAL: Only process if drag actually started AND mouse moved significantly
      // If no drag happened (just a click), don't move the frame
      if (!dragStarted) {
        isDragging = false;
        frame.classList.remove('dragging');
        frame.dataset.wasDragged = 'false';
        setTimeout(() => {
          delete frame.dataset.wasDragged;
        }, 100);
        return;
      }
      
      if (!isDragging) {
        return;
      }
      
      // ✅ CRITICAL: Verify mouse was actually moved from start position
      const finalX = e.clientX;
      const finalY = e.clientY;
      const deltaX = Math.abs(finalX - startX);
      const deltaY = Math.abs(finalY - startY);
      
      // ✅ CRITICAL: If mouse moved less than 5px, consider it a click, not a drag
      // Also verify the mouse is still over the canvas (not somewhere else)
      if (deltaX < 5 && deltaY < 5) {
        isDragging = false;
        frame.classList.remove('dragging');
        dragStarted = false;
        frame.dataset.wasDragged = 'false';
        setTimeout(() => {
          delete frame.dataset.wasDragged;
        }, 100);
        return;
      }
      
      // ✅ CRITICAL: Only update if drag actually happened AND mouse moved enough
      if (dragStarted) {
        const canvasRect = document.getElementById('gallery-canvas')?.getBoundingClientRect();
        if (!canvasRect) {
          isDragging = false;
          frame.classList.remove('dragging');
          dragStarted = false;
          return;
        }
        
        // Get current frame position (may have changed during drag)
        const frameRect = frame.getBoundingClientRect();
        
        const relativeX = frameRect.left - canvasRect.left;
        const relativeY = frameRect.top - canvasRect.top;
        
        // Convert to the 640x400 coordinate system used for saving
        const savedX = (relativeX / canvasRect.width) * 640;
        const savedY = (relativeY / canvasRect.height) * 400;
        
        // Update frame data
        if (this.galleryFrames[frameIndex]) {
          this.galleryFrames[frameIndex].data.x = savedX;
          this.galleryFrames[frameIndex].data.y = savedY;
          // Also update the root level x and y for consistency
          this.galleryFrames[frameIndex].x = savedX;
          this.galleryFrames[frameIndex].y = savedY;
        }
        
        this.showMessage('Frame repositioned', 'success');
      }
      
      // Store flag on frame element for click handler to check
      frame.dataset.wasDragged = dragStarted ? 'true' : 'false';
      
      // Reset after a short delay to allow click handler to read it
      setTimeout(() => {
        delete frame.dataset.wasDragged;
      }, 100);
      
      // Reset drag flags
      isDragging = false;
      frame.classList.remove('dragging');
      dragStarted = false;
    };
    
    // Touch move handler - BEST PRACTICES
    const handleTouchMove = (e) => {
      // ✅ CRITICAL: Check if touching controls or modal - don't drag
      if (e.target.closest('.frame-controls') || document.querySelector('.frame-size-menu.active')) {
        return;
      }
      
      // Check if this touch belongs to our frame
      const touch = e.touches[0];
      if (!touch) return;
      
      // ✅ CHECK: If toggle handler marked this as moved, don't drag
      if (frame.dataset.toggleMoved === 'true' || frame.dataset.toggleActive === 'true') {
        // Toggle handler is managing this, don't interfere
        return;
      }
      
      // Calculate movement distance
      const deltaXAbs = Math.abs(touch.clientX - startX);
      const deltaYAbs = Math.abs(touch.clientY - startY);
      
      // ✅ BEST PRACTICE: Only start dragging if moved more than 15px (avoid accidental drags)
      // Increased threshold to prevent accidental drags when trying to tap
      if (!dragStarted && (deltaXAbs > 15 || deltaYAbs > 15)) {
        // Now start dragging
        isDragging = true;
        dragStarted = true;
        frame.classList.add('dragging');
        
        // Mark on frame that it was dragged (for toggle handler)
        frame.dataset.wasDragged = 'true';
        frame.dataset.toggleMoved = 'true'; // Also mark for toggle handler
        
        // Remove selected class if it was just added by toggle
        frame.classList.remove('selected');
        
        // Prevent default to avoid scrolling
        e.preventDefault();
        e.stopPropagation();
      }
      
      // If dragging started, move the frame
      if (dragStarted && isDragging) {
        // Prevent scrolling while dragging
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate new position
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        // Update frame position in pixels
        frame.style.left = `${newX}px`;
        frame.style.top = `${newY}px`;
      }
    };
    
    // Touch end handler - BEST PRACTICES
    const handleTouchEnd = (e) => {
      // Always remove global touch events FIRST
      document.removeEventListener('touchmove', handleTouchMove, { capture: false });
      document.removeEventListener('touchend', handleTouchEnd, { capture: false });
      
      // ✅ CRITICAL: Only process if drag actually happened AND moved significantly
      // Check if touch moved more than threshold
      const touch = e.changedTouches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);
        const movedEnough = deltaX > 15 || deltaY > 15; // Must move at least 15px
        
        if (!movedEnough || !dragStarted || !isDragging) {
          // ✅ NO DRAG: Just a tap - reset everything and DON'T move frame
          isDragging = false;
          dragStarted = false;
          frame.classList.remove('dragging');
          
          // Clear wasDragged flag
          delete frame.dataset.wasDragged;
          
          // ✅ CRITICAL: Don't do anything else - let toggle handler handle tap
          return;
        }
      } else if (!dragStarted || !isDragging) {
        // No touch data or no drag - reset and return
        isDragging = false;
        dragStarted = false;
        frame.classList.remove('dragging');
        delete frame.dataset.wasDragged;
        return;
      }
      
      // ✅ DRAG HAPPENED: Update frame position
      if (isDragging && dragStarted) {
        isDragging = false;
        frame.classList.remove('dragging');
        
        // Update frame data
        const canvas = document.getElementById('gallery-canvas');
        if (canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          
          const relativeX = frameRect.left - canvasRect.left;
          const relativeY = frameRect.top - canvasRect.top;
          
          // Convert to the 640x400 coordinate system used for saving
          const savedX = (relativeX / canvasRect.width) * 640;
          const savedY = (relativeY / canvasRect.height) * 400;
          
          // Update frame data
          if (this.galleryFrames[frameIndex]) {
            this.galleryFrames[frameIndex].data.x = savedX;
            this.galleryFrames[frameIndex].data.y = savedY;
            // Also update the root level x and y for consistency
            this.galleryFrames[frameIndex].x = savedX;
            this.galleryFrames[frameIndex].y = savedY;
          }
          
          this.showMessage('Frame repositioned', 'success');
        }
        
        // Reset drag flag after a short delay (for toggle handler to check)
        setTimeout(() => {
          frame.dataset.wasDragged = 'false';
          setTimeout(() => {
            delete frame.dataset.wasDragged;
          }, 50);
        }, 150);
      }
      
      // Reset flags
      dragStarted = false;
    };
  }

  handleFrameDragEnd(e, frameIndex) {
    // This method is now replaced by makeFrameDraggable
    // Keeping for compatibility but not used
  }

  // Handle dragging the entire gallery wall area
  handleGalleryWallDragStart(e) {
    const galleryWallArea = e.currentTarget;
    galleryWallArea.classList.add('dragging');
    
    // Store initial mouse position
    this.dragStartPosition = {
      x: e.clientX,
      y: e.clientY
    };
    
    // Get current transform values
    const currentTransform = galleryWallArea.style.transform || 'translate(0px, 0px)';
    const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    
    this.initialTransform = {
      x: match ? parseFloat(match[1]) : 0,
      y: match ? parseFloat(match[2]) : 0
    };
    
    // Store canvas boundaries - more precise calculation
    const canvas = document.querySelector('.room-background');
    const canvasRect = canvas.getBoundingClientRect();
    const galleryRect = galleryWallArea.getBoundingClientRect();
    
    // Calculate bounds relative to canvas
    const galleryWidth = galleryRect.width;
    const galleryHeight = galleryRect.height;
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;
    
    // Allow more movement space like Desenio
    const margin = 50;
    
    this.canvasBounds = {
      left: -galleryRect.left + canvasRect.left - margin,
      top: -galleryRect.top + canvasRect.top - margin,
      right: canvasWidth - galleryWidth + margin,
      bottom: canvasHeight - galleryHeight + margin
    };
    
    console.log('Gallery wall drag start', this.initialTransform);
  }

  handleGalleryWallDragEnd(e) {
    const galleryWallArea = e.currentTarget;
    galleryWallArea.classList.remove('dragging');
    
    // Calculate movement delta
    const deltaX = e.clientX - this.dragStartPosition.x;
    const deltaY = e.clientY - this.dragStartPosition.y;
    
    // Calculate new position
    let newX = this.initialTransform.x + deltaX;
    let newY = this.initialTransform.y + deltaY;
    
    // Apply constraints to keep within canvas bounds
    newX = Math.max(this.canvasBounds.left, Math.min(this.canvasBounds.right, newX));
    newY = Math.max(this.canvasBounds.top, Math.min(this.canvasBounds.bottom, newY));
    
    // Update position using transform like Desenio
    galleryWallArea.style.transform = `translate(${newX}px, ${newY}px)`;
    
    // Store position in data attributes like Desenio
    galleryWallArea.setAttribute('data-x', newX);
    galleryWallArea.setAttribute('data-y', newY);
    
    console.log('Gallery wall moved to:', newX, newY);
  }

  // Restore gallery wall position from data attributes
  restoreGalleryWallPosition() {
    const galleryWallArea = document.getElementById('gallery-wall-area');
    if (!galleryWallArea) return;
    
    const x = parseFloat(galleryWallArea.getAttribute('data-x')) || 0;
    const y = parseFloat(galleryWallArea.getAttribute('data-y')) || 0;
    
    galleryWallArea.style.transform = `translate(${x}px, ${y}px)`;
    console.log('Restored gallery wall position:', x, y);
  }

  repositionFrame(frameIndex, e) {
    const frame = this.galleryFrames[frameIndex];
    if (!frame) return;
    
    const wallArea = document.getElementById('gallery-wall-area');
    const wallRect = wallArea.getBoundingClientRect();
    const frameRect = frame.element.getBoundingClientRect();
    
    // Calculate new position relative to wall area
    const x = e.clientX - wallRect.left - (frameRect.width / 2);
    const y = e.clientY - wallRect.top - (frameRect.height / 2);
    
    // Constrain to wall area bounds
    const maxX = wallRect.width - frameRect.width;
    const maxY = wallRect.height - frameRect.height;
    
    const constrainedX = Math.max(0, Math.min(x, maxX));
    const constrainedY = Math.max(0, Math.min(y, maxY));
    
    // Update frame position
    frame.element.style.left = `${(constrainedX / wallRect.width) * 100}%`;
    frame.element.style.top = `${(constrainedY / wallRect.height) * 100}%`;
    
    // Update frame data - convert to 640x400 coordinate system
    const savedX = (constrainedX / wallRect.width) * 640;
    const savedY = (constrainedY / wallRect.height) * 400;
    
    frame.data.x = savedX;
    frame.data.y = savedY;
    // Also update the root level x and y for consistency
    frame.x = savedX;
    frame.y = savedY;
    
    this.showMessage('Frame repositioned', 'success');
  }


  filterProducts(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    const filter = tab.dataset.filter;
    const products = document.querySelectorAll('.product-item');
    
    products.forEach(product => {
      const collections = product.dataset.collections.split(',');
      const shouldShow = filter === 'all' || collections.includes(filter);
      
      product.style.display = shouldShow ? 'block' : 'none';
    });
    
    // If "All Products" is selected, reset prices to default
    if (filter === 'all') {
      this.resetAllProductPrices();
    }
  }

  updateOrderSummary() {
    const summaryContainer = document.getElementById('gallery-summary-items');
    if (!summaryContainer) return;
    
    // Show/hide framing service section based on whether frames are selected
    const framingServiceSection = document.getElementById('framing-service-section');
    const framingServiceTotalLine = document.getElementById('framing-service-total-line');
    
    if (this.hasSelectedFrames()) {
      if (framingServiceSection) framingServiceSection.style.display = 'block';
      if (framingServiceTotalLine) framingServiceTotalLine.style.display = 'block';
    } else {
      if (framingServiceSection) framingServiceSection.style.display = 'none';
      if (framingServiceTotalLine) framingServiceTotalLine.style.display = 'none';
      // Clear selection if no frames
      this.selectedFramingService = null;
      document.querySelectorAll('.framing-service-option').forEach(option => {
        option.classList.remove('selected');
      });
    }
    
    // Auto-select framing service if we're on step 4 (Review Order) and none is selected
    if (this.currentStep === 4) {
      this.autoSelectFramingService();
    }

    summaryContainer.innerHTML = '';
    
    let subtotal = 0;
    let framesTotal = 0;
    
    this.galleryFrames.forEach((frame, index) => {
      if (frame.product) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        // Get frame information
        const frameName = frame.element.dataset.frameName || 'No frame';
        const framePrice = frame.element.dataset.framePrice;
        const frameSize = frame.element.dataset.frameSize;
        
        item.innerHTML = `
          <img src="${frame.product.image}" alt="${frame.product.title}" class="summary-item-image">
          <div class="summary-item-details">
            <div class="summary-item-title">${frame.product.title}</div>
            <div class="summary-item-meta">
              Size: ${frame.data.size} | Poster for Gallery Position ${index + 1}
            </div>
          </div>
          <div class="summary-item-price">${frame.product.price}</div>
        `;
        summaryContainer.appendChild(item);
        
        // Add product price to subtotal using raw price (in cents)
        const priceRaw = frame.product.priceRaw ? parseInt(frame.product.priceRaw) : 0;
        if (priceRaw > 0) {
          // Convert from cents to euros
          subtotal += priceRaw / 100;
        } else {
          // Fallback to parsing formatted price - add safety check
          if (frame.product.price && typeof frame.product.price === 'string') {
            const price = parseFloat(frame.product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(price)) {
              subtotal += price;
            }
          } else {
            console.warn(`Warning: frame.product.price is not a valid string for ${frame.product.title}:`, frame.product.price);
          }
        }
        
        console.log(`Product ${frame.product.title}: priceRaw=${priceRaw}, subtotal after adding=${subtotal}`);
      }
      
      // Add frame as separate product if it has a frame
      const framePrice = parseFloat(frame.element.dataset.framePrice || 0);
      if (framePrice > 0) {
        const frameItem = document.createElement('div');
        frameItem.className = 'summary-item';
        // Get frame image from the selected frame
        const frameImage = this.getFrameImage(frame.element.dataset.frameId);
        
        frameItem.innerHTML = `
          <div class="summary-item-image">
            ${frameImage ? `<img src="${frameImage}" alt="${frame.element.dataset.frameName || 'Frame'}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">FRAME</div>'}
          </div>
          <div class="summary-item-details">
            <div class="summary-item-title">${frame.element.dataset.frameName || 'Frame'}</div>
            <div class="summary-item-meta">Size: ${frame.element.dataset.frameSize || 'Unknown'} | Frame for Gallery Position ${index + 1}</div>
          </div>
          <div class="summary-item-price">${this.formatMoney(framePrice)}</div>
        `;
        summaryContainer.appendChild(frameItem);
        
        framesTotal += framePrice;
      }
    });
    
        // Add Framing Service only if frames with products are present
        let framingServiceTotal = 0;
        
        if (this.hasSelectedFrames() && this.selectedFramingService) {
          framingServiceTotal = this.addSelectedFramingServiceToOrder(summaryContainer);
        }
    
    // Update totals with proper formatting
    const total = subtotal + framesTotal + framingServiceTotal;
    
    
    const subtotalEl = document.getElementById('gallery-subtotal');
    const framesTotalEl = document.getElementById('gallery-frames-total');
    const framingServiceEl = document.getElementById('gallery-framing-service');
    const totalEl = document.getElementById('gallery-total');
    
    if (subtotalEl) subtotalEl.textContent = '€' + subtotal.toFixed(2);
    if (framesTotalEl) framesTotalEl.textContent = '€' + framesTotal.toFixed(2);
    if (framingServiceEl) framingServiceEl.textContent = '€' + framingServiceTotal.toFixed(2);
    if (totalEl) totalEl.textContent = '€' + total.toFixed(2);
    
    // Store totals for saving
    this.orderSubtotal = subtotal;
    this.orderFrames = framesTotal;
    this.orderFramingService = framingServiceTotal;
    this.orderTotal = total;
    
    // Enable/disable add to cart button
    const addToCartBtn = document.getElementById('add-gallery-to-cart');
    if (addToCartBtn) {
      addToCartBtn.disabled = this.selectedProducts.size === 0;
    }
  }

  // Add selected framing service to order summary
  addSelectedFramingServiceToOrder(summaryContainer) {
    try {
      if (!this.selectedFramingService) {
        return 0;
      }
      
      
      // Find the selected framing service element to get its image
      const selectedServiceElement = document.querySelector(`.framing-service-option[data-service-id="${this.selectedFramingService.id}"]`);
      let serviceImage = '<div style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">SERVICE</div>';
      
      if (selectedServiceElement) {
        const imageElement = selectedServiceElement.querySelector('img');
        if (imageElement) {
          serviceImage = `<img src="${imageElement.src}" alt="Framing Service" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
      }
      
      const framingServiceItem = document.createElement('div');
      framingServiceItem.className = 'summary-item framing-service-item';
      framingServiceItem.innerHTML = `
        <div class="summary-item-image">
          ${serviceImage}
        </div>
        <div class="summary-item-details">
          <div class="summary-item-title">Framing Service</div>
          <div class="summary-item-meta">Professional framing service for all frames</div>
        </div>
        <div class="summary-item-price">${this.selectedFramingService.price}</div>
      `;
      summaryContainer.appendChild(framingServiceItem);
      
      const price = parseFloat(this.selectedFramingService.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(price)) {
        return price;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('❌ Error adding selected framing service:', error);
      return 0;
    }
  }

  // Add Framing Service to order summary
  addFramingServiceToOrder(summaryContainer) {
    try {
      // Get framing service collection from config
      const framingServiceCollection = window.galleryBuilderConfig?.framingServiceCollection || 'Services';
      
      
      if (!framingServiceCollection || framingServiceCollection === 'undefined' || framingServiceCollection === '') {
        return 0;
      }
      
      
      // Get framing service products from the collection
      const framingServiceProducts = window.galleryBuilderConfig?.collections?.[framingServiceCollection]?.products;
      
      if (!framingServiceProducts || framingServiceProducts.length === 0) {
        return 0;
      }
      
      // Find the "Framing Service" product specifically
      const framingService = framingServiceProducts.find(product => 
        product.title.toLowerCase().includes('framing service') || 
        product.title.toLowerCase().includes('framing')
      );
      
      if (!framingService) {
        return 0;
      }
      
      
      // Create framing service item
      const framingServiceItem = document.createElement('div');
      framingServiceItem.className = 'summary-item framing-service-item';
      
      framingServiceItem.innerHTML = `
        <div class="summary-item-image">
          ${framingService.image ? `<img src="${framingService.image}" alt="${framingService.title}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">SERVICE</div>'}
        </div>
        <div class="summary-item-details">
          <div class="summary-item-title">${framingService.title}</div>
          <div class="summary-item-meta">One-time framing service for all frames</div>
        </div>
        <div class="summary-item-price">${framingService.price}</div>
      `;
      
      summaryContainer.appendChild(framingServiceItem);
      
      // Parse price (assuming it's in format like "€29.99")
      const price = parseFloat(framingService.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      
      if (!isNaN(price)) {
        return price;
      } else {
        console.log('❌ Could not parse framing service price:', framingService.price);
        return 0;
      }
      
    } catch (error) {
      console.error('❌ Error adding framing service:', error);
      return 0;
    }
  }

  // Get framing service product from collection
  getFramingServiceProduct() {
    try {
      const framingServiceCollection = window.galleryBuilderConfig?.framingServiceCollection || 'Services';
      
      if (!framingServiceCollection || framingServiceCollection === 'undefined' || framingServiceCollection === '') {
        return null;
      }
      
      const framingServiceProducts = window.galleryBuilderConfig?.collections?.[framingServiceCollection]?.products;
      
      if (!framingServiceProducts || framingServiceProducts.length === 0) {
        console.log('❌ No framing service products found');
        return null;
      }
      
      // Find the "Framing Service" product specifically
      const framingService = framingServiceProducts.find(product => 
        product.title.toLowerCase().includes('framing service') || 
        product.title.toLowerCase().includes('framing')
      );
      
      if (!framingService) {
        return null;
      }
      
      // Return the framing service product
      return framingService;
      
    } catch (error) {
      console.error('❌ Error getting framing service product:', error);
      return null;
    }
  }

  // Save Gallery Wall functionality
  initSaveFunctionality() {
    // Save button
    const saveBtn = document.getElementById('save-gallery-btn');
    if (saveBtn) {
      this.addMobileTouchEvents(saveBtn, () => this.showSaveModal());
    }

    // Share button
    const shareBtn = document.getElementById('share-gallery-btn');
    if (shareBtn) {
      this.addMobileTouchEvents(shareBtn, () => this.shareGallery());
    }

    // Create New button
    const createNewBtn = document.getElementById('create-new-btn');
    if (createNewBtn) {
      this.addMobileTouchEvents(createNewBtn, () => this.createNewGallery());
    }

    // Modal event listeners
    this.initModalEvents();
  }

  initModalEvents() {
    // Save modal
    const saveModal = document.getElementById('save-gallery-modal');
    const closeSaveModal = document.getElementById('close-save-modal');
    const confirmSave = document.getElementById('confirm-save');
    const galleryNameInput = document.getElementById('gallery-name');

    if (closeSaveModal) {
      this.addMobileTouchEvents(closeSaveModal, () => this.hideSaveModal());
    }

    if (confirmSave) {
      this.addMobileTouchEvents(confirmSave, () => this.saveGallery());
    }

    // Close modal when clicking outside
    if (saveModal) {
      this.addMobileTouchEvents(saveModal, (e) => {
        if (e.target === saveModal) {
          this.hideSaveModal();
        }
      });
    }

    // Enter key to save
    if (galleryNameInput) {
      galleryNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveGallery();
        }
      });
    }

    // Saved galleries modal
    const savedModal = document.getElementById('saved-galleries-modal');
    const closeSavedModal = document.getElementById('close-saved-modal');

    if (closeSavedModal) {
      this.addMobileTouchEvents(closeSavedModal, () => this.hideSavedModal());
    }

    if (savedModal) {
      this.addMobileTouchEvents(savedModal, (e) => {
        if (e.target === savedModal) {
          this.hideSavedModal();
        }
      });
    }
  }

  showSaveModal() {
    const modal = document.getElementById('save-gallery-modal');
    const input = document.getElementById('gallery-name');
    
    if (modal) {
      modal.style.display = 'flex';
      
      // iOS fix: prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      if (input) {
        // Clear and enable input
        input.value = '';
        input.disabled = false;
        input.readOnly = false;
        
        // Remove any event listeners that might be blocking
        input.removeEventListener('input', () => {});
        input.removeEventListener('keydown', () => {});
        input.removeEventListener('keyup', () => {});
        input.removeEventListener('touchstart', () => {});
        input.removeEventListener('click', () => {});
        
        // Add new event listeners that don't block
        input.addEventListener('input', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        input.addEventListener('keyup', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        // iOS fix: add click handler to ensure input is clickable
        const handleClick = (e) => {
          e.stopPropagation();
          // Force focus on iOS
          setTimeout(() => {
            input.focus();
            // iOS fix: click again if focus didn't work
            if (document.activeElement !== input) {
              input.click();
              input.focus();
            }
          }, 50);
        };
        
        input.addEventListener('touchstart', handleClick, { passive: true });
        input.addEventListener('click', handleClick, { passive: true });
        
        // Focus after a small delay to ensure modal is visible
        setTimeout(() => {
          input.focus();
          // iOS fix: if focus doesn't work, try click
          if (document.activeElement !== input) {
            input.click();
            setTimeout(() => {
              input.focus();
            }, 100);
          }
        }, 200);
      }
    }
  }

  hideSaveModal() {
    // iOS fix: restore body scroll when modal is closed
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    const modal = document.getElementById('save-gallery-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Show save success modal with add to cart option
  showSaveSuccessModal(galleryName, galleryData) {
    const modal = document.getElementById('save-success-modal');
    const nameSpan = document.getElementById('saved-gallery-name');
    const summaryDiv = document.getElementById('gallery-summary');
    
    if (modal && nameSpan) {
      nameSpan.textContent = galleryName;
      
      // Populate gallery summary
      if (summaryDiv) {
        this.populateGallerySummary(summaryDiv, galleryData);
      }
      
      modal.style.display = 'flex';
      
      // Add event listeners
      this.initSaveSuccessModalEvents();
    }
  }

  // Hide save success modal
  hideSaveSuccessModal() {
    const modal = document.getElementById('save-success-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Initialize save success modal events
  initSaveSuccessModalEvents() {
    const modal = document.getElementById('save-success-modal');
    const closeBtn = document.getElementById('close-success-modal');
    const continueBtn = document.getElementById('continue-editing');
    const addToCartBtn = document.getElementById('add-gallery-to-cart');
    
    if (closeBtn) {
      this.addMobileTouchEvents(closeBtn, () => this.hideSaveSuccessModal());
    }
    
    if (continueBtn) {
      this.addMobileTouchEvents(continueBtn, () => this.hideSaveSuccessModal());
    }
    
    if (addToCartBtn) {
      this.addMobileTouchEvents(addToCartBtn, () => this.addGalleryToCart());
    }
    
    if (modal) {
      this.addMobileTouchEvents(modal, (e) => {
        if (e.target === modal) {
          this.hideSaveSuccessModal();
        }
      });
    }
  }

  // Populate gallery summary with items
  populateGallerySummary(container, galleryData) {
    let html = '';
    
    // Add products
    if (galleryData.selectedProducts && galleryData.selectedProducts.length > 0) {
      galleryData.selectedProducts.forEach(([key, product]) => {
        html += `
          <div class="gallery-item">
            <span class="gallery-item-name">${product.title}</span>
            <span class="gallery-item-price">${product.price}</span>
          </div>
        `;
      });
    }
    
    // Add frames
    if (galleryData.galleryFrames && galleryData.galleryFrames.length > 0) {
      galleryData.galleryFrames.forEach((frame, index) => {
        if (frame.hasImage) {
          html += `
            <div class="gallery-item">
              <span class="gallery-item-name">Frame ${index + 1} (${frame.size})</span>
              <span class="gallery-item-price">€29.99</span>
            </div>
          `;
        }
      });
    }
    
    if (html === '') {
      html = '<p style="text-align: center; color: #666; font-style: italic;">No items in gallery</p>';
    }
    
    container.innerHTML = html;
  }

  // Add gallery to cart
  async addGalleryToCart() {
    try {
      this.showMessage('Adding items to cart...', 'info');
      
      const items = [];
      
      console.log('🔥 === ADDING TO CART - REAL DATA FROM FRAMES === 🔥');
      console.log(`📊 Total frames in gallery: ${this.galleryFrames.length}`);
      console.log(`📊 Selected material: ${this.selectedMaterial}`);
      
      // ✅ GET PRODUCTS DIRECTLY FROM galleryFrames (NOT from selectedProducts)
      this.galleryFrames.forEach((frame, index) => {
        if (frame.product && frame.product.id) {
          console.log(`🛒 Frame ${index + 1} product:`, {
            frameIndex: index,
            frameSize: frame.data.size,
            title: frame.product.title,
            variantId: frame.product.variantId,
            price: frame.product.price,
            priceRaw: frame.product.priceRaw,
            savedFrameSize: frame.product.frameSize,
            productFullData: frame.product
          });
          
          // ✅ VALIDATE variantId before adding to cart
          const variantId = frame.product.variantId || frame.product.id;
          
          if (!variantId || variantId === 'undefined' || variantId === 'null') {
            console.error(`❌ Frame ${index + 1} has INVALID variantId:`, variantId);
            console.error(`   Frame data:`, frame.data);
            console.error(`   Product data:`, frame.product);
            return; // Skip this item
          }
          
          const cartItem = {
            id: variantId,
            quantity: 1,
            properties: {
              'Gallery Item': 'Yes',
              'Gallery Name': 'My Gallery',
              'Product Position': `Position ${index + 1}`,
              'Frame Size': frame.product.frameSize || frame.data.size,
              'Material': frame.product.material || 'Unknown'  // ✅ Use saved material for each product
            }
          };
          
          console.log('📦 Cart item to be added:', cartItem);
          items.push(cartItem);
        }
        
        // ✅ ADD FRAME TO CART (Step 4)
        if (frame.element && frame.element.dataset.frameVariantId) {
          const frameVariantId = frame.element.dataset.frameVariantId;
          const frameName = frame.element.dataset.frameName || 'Unknown Frame';
          const frameSize = frame.element.dataset.frameSize || 'Unknown Size';
          
          console.log(`🖼️ Adding frame ${index + 1} to cart:`, {
            frameIndex: index,
            frameVariantId: frameVariantId,
            frameName: frameName,
            frameSize: frameSize
          });
          
          const frameCartItem = {
            id: frameVariantId,
            quantity: 1,
            properties: {
              'Gallery Item': 'Yes',
              'Gallery Name': 'My Gallery',
              'Gallery Position': `Frame ${index + 1}`,
              'Frame Type': frameName,
              'Frame Size': frameSize,
              'Gallery Wall': 'Custom Gallery'
            }
          };
          
          console.log('🖼️ Frame cart item to be added:', frameCartItem);
          items.push(frameCartItem);
        }
      });
      
      console.log('🔥 Total items to add to cart:', items.length);
      
      // Add selected framing service to cart if frames are present
      if (this.hasSelectedFrames() && this.selectedFramingService) {
        items.push({
          id: this.selectedFramingService.variantId || this.selectedFramingService.id,
          quantity: 1,
          properties: {
            'Gallery Item': 'Yes',
            'Gallery Name': 'My Gallery',
            'Service Type': 'Framing Service'
          }
        });
      }
      
      if (items.length === 0) {
        this.showMessage('No items to add to cart', 'error');
        return;
      }
      
      
      // Use theme's approach - add items one by one using FormData
      const results = [];
      
      for (const item of items) {
        try {
          
          const result = await this.addSingleItemToCart(item);
          results.push(result);
        } catch (error) {
          console.error('❌ Failed to add item:', item, error);
          // Continue with other items even if one fails
        }
      }
      
      if (results.length === 0) {
        throw new Error('No items were added to cart');
      }
      
      this.showMessage(`Successfully added ${results.length} items to cart!`, 'success');
        this.hideSaveSuccessModal();
        
        // Track successful add to cart
        if (this.tracking) {
          this.tracking.trackAddToCart({
            total: 0, // Will be calculated by Shopify
            items: items,
            items_count: results.length
          });
        }
        
        // Track with advanced analytics
        if (this.advancedTracking) {
          this.advancedTracking.trackAddToCart({
            total: 0,
            items: items,
            items_count: results.length
          });
        }
        
        // Track with enhanced Shopify analytics
        if (this.enhancedTracking) {
          this.enhancedTracking.trackAddToCart({
            total: 0,
            items: items,
            items_count: results.length
          });
        }
        
        // Redirect to cart or show cart notification
        setTimeout(() => {
          window.location.href = '/cart';
        }, 1500);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showMessage('Error adding items to cart. Please try again.', 'error');
    }
  }

  showSavedModal() {
    const modal = document.getElementById('saved-galleries-modal');
    if (modal) {
      this.loadSavedGalleries();
      modal.style.display = 'flex';
    }
  }

  hideSavedModal() {
    const modal = document.getElementById('saved-galleries-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async saveGallery() {
    const nameInput = document.getElementById('gallery-name');
    const name = nameInput ? nameInput.value.trim() : '';
    
    
    if (!name) {
      this.showMessage('Please enter a name for your gallery', 'error');
      return;
    }

    // Check if gallery has any content
    const hasFrames = this.galleryFrames && this.galleryFrames.length > 0;
    const hasProducts = this.selectedProducts && this.selectedProducts.size > 0;
    
    if (!hasFrames && !hasProducts) {
      this.showMessage('Please add at least one item before saving', 'error');
      return;
    }

    // Get current gallery state
    const galleryData = this.getCurrentGalleryState();
    galleryData.name = name;
    
    // Show loading message
    this.showMessage('Saving gallery...', 'info');
    
    try {
      // Try to save to Shopify first
      const result = await this.saveGalleryToShopify(galleryData);
      
      if (result && result.success) {
        this.hideSaveModal();
        // Show success message
        this.showMessage('Gallery saved successfully!', 'success');
        // Refresh saved galleries display
        this.loadSavedGalleries();
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Error saving gallery:', error);
      this.showMessage('Error saving gallery. Please try again.', 'error');
    }
  }

  // Save gallery data to localStorage (following theme pattern)
  async saveGalleryToShopify(galleryData) {
    return this.saveGalleryToLocalStorage(galleryData);
  }

  // Load galleries from localStorage (following theme pattern)
  async loadGalleriesFromShopify() {
    return this.loadGalleriesFromLocalStorage();
  }

  // Save to localStorage (following theme pattern like wishlist)
  saveGalleryToLocalStorage(galleryData) {
    try {
      const savedGalleries = this.getSavedGalleries();
      const galleryId = 'gallery_' + Date.now();
      
      savedGalleries[galleryId] = {
        id: galleryId,
        name: galleryData.name,
        data: galleryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('kuriosis_saved_galleries', JSON.stringify(savedGalleries));
      return { success: true, id: galleryId };
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return { success: false, error: error.message };
    }
  }

  // Load from localStorage (following theme pattern like wishlist)
  loadGalleriesFromLocalStorage() {
    try {
      const savedGalleries = this.getSavedGalleries();
      return { success: true, galleries: savedGalleries };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return { success: false, galleries: {} };
    }
  }

  getCurrentGalleryState() {
    // Debug: Log all frames with their states
    console.log('=== GALLERY STATE DEBUG ===');
    console.log('Total frames:', this.galleryFrames.length);
    
    this.galleryFrames.forEach((frame, index) => {
      console.log(`Frame ${index}:`, {
        id: frame.id,
        size: frame.data?.size,
        hasImage: frame.hasImage,
        hasProduct: !!(frame.product),
        product: frame.product,
        element: frame.element,
        frameVariantId: frame.element ? frame.element.dataset.frameVariantId : null,
        classes: frame.element ? frame.element.className : 'no element'
      });
    });
    
    console.log('Selected products:', this.selectedProducts);
    console.log('Selected framing service:', this.selectedFramingService);
    console.log('===========================');

    console.log('=== SAVING GALLERY STATE ===');
    console.log('Selected background:', this.selectedBackground);
    console.log('============================');

    // ✅ CRITICAL: Calculate REAL frame dimensions in pixels (640x400 coordinate system)
    const canvas = document.getElementById('gallery-canvas');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;

    return {
      selectedLayout: this.selectedLayout,
      selectedBackground: this.selectedBackground,
      selectedFrame: this.selectedFrame,
      galleryFrames: this.galleryFrames.map((frame, index) => {
        // ✅ CRITICAL: Calculate REAL dimensions from actual DOM element
        let realWidth = frame.data?.width;
        let realHeight = frame.data?.height;
        
        if (frame.element && canvasRect) {
          const frameRect = frame.element.getBoundingClientRect();
          // Convert from screen pixels to 640x400 coordinate system
          const relativeX = frameRect.left - canvasRect.left;
          const relativeY = frameRect.top - canvasRect.top;
          const relativeWidth = frameRect.width;
          const relativeHeight = frameRect.height;
          
          // Convert to 640x400 coordinate system
          const scaleX = 640 / canvasRect.width;
          const scaleY = 400 / canvasRect.height;
          
          realWidth = relativeWidth * scaleX;
          realHeight = relativeHeight * scaleY;
          
          // Also update position in case it changed
          const realX = relativeX * scaleX;
          const realY = relativeY * scaleY;
          
          console.log(`📐 Frame ${index} REAL dimensions:`, {
            screenWidth: frameRect.width,
            screenHeight: frameRect.height,
            canvasWidth: canvasRect.width,
            canvasHeight: canvasRect.height,
            savedWidth: realWidth,
            savedHeight: realHeight,
            savedX: realX,
            savedY: realY,
            size: frame.data?.size
          });
        } else if (frame.data) {
          // Fallback: use saved data if element not available
          realWidth = frame.data.width || frame.width;
          realHeight = frame.data.height || frame.height;
        }
        
        // ✅ CRITICAL: Save ALL frame data (Step 3 SELECT FRAMES)
        const frameElement = frame.element;
        const savedFrameData = {
          id: frame.id,
          data: {
            ...frame.data,
            x: frame.data?.x || frame.x || 0,
            y: frame.data?.y || frame.y || 0,
            width: realWidth || frame.data?.width || frame.width || 100,
            height: realHeight || frame.data?.height || frame.height || 150,
            size: frame.data?.size || frame.size || '50x70'
          },
          x: frame.data?.x || frame.x || 0,
          y: frame.data?.y || frame.y || 0,
          width: realWidth || frame.data?.width || frame.width || 100,
          height: realHeight || frame.data?.height || frame.height || 150,
          size: frame.data?.size || frame.size || '50x70',
          product: frame.product,
          frame: frame.data?.frame,
          // ✅ Save ALL frame selection data from Step 3
          frameVariantId: frameElement ? frameElement.dataset.frameVariantId : null,
          frameId: frameElement ? frameElement.dataset.frameId : null,
          frameName: frameElement ? frameElement.dataset.frameName : null,
          frameProductId: frameElement ? frameElement.dataset.frameProductId : null,
          framePrice: frameElement ? frameElement.dataset.framePrice : null,
          frameSize: frameElement ? frameElement.dataset.frameSize : null,
          hasFrame: frameElement ? frameElement.classList.contains('has-frame') : false,
          hasImage: frame.hasImage || (frame.product !== null)
        };
        
        // If frame has image, also try to get frame image URL
        if (frameElement && frameElement.dataset.frameId && this.selectedFrame) {
          const frameImage = this.getFrameImage(frameElement.dataset.frameId);
          if (frameImage) {
            savedFrameData.frameImage = frameImage;
          }
        }
        
        return savedFrameData;
      }),
      selectedProducts: this.selectedProducts ? Array.from(this.selectedProducts.entries()) : [],
      selectedFramingService: this.selectedFramingService,
      orderSubtotal: this.orderSubtotal,
      currentStep: this.currentStep,
      orderFrames: this.orderFrames,
      orderTotal: this.orderTotal
    };
  }

  getSavedGalleries() {
    try {
      const saved = localStorage.getItem('kuriosis_saved_galleries');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error getting saved galleries:', error);
      return {};
    }
  }


  async loadSavedGalleries() {
    const container = document.getElementById('saved-galleries-list');
    
    if (!container) {
      console.error('❌ Container saved-galleries-list not found');
      return;
    }
    
    console.log('🔄 Loading saved galleries...');
    
    // Show loading state
    container.innerHTML = `
      <div class="empty-saved-galleries">
        <i class="fa fa-spinner fa-spin"></i>
        <p>Loading galleries...</p>
      </div>
    `;
    
    try {
      // Try to load from Shopify first
      const result = await this.loadGalleriesFromShopify();
      
      if (result && result.success && result.galleries) {
        const galleries = Object.values(result.galleries).sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        
        if (galleries.length === 0) {
          container.innerHTML = `
            <div class="empty-saved-galleries">
              <i class="fa fa-picture-o"></i>
              <p>No saved galleries yet</p>
            </div>
          `;
          return;
        }
        
        // DESENIO STYLE - Create horizontal grid items
            // Calculate mini-layout dimensions (proportional to actual canvas) - OUTSIDE map
        const isMobile = window.innerWidth <= 768;
        const miniCanvasWidth = isMobile ? 140 : 160; // Fixed width for centering
        const miniCanvasHeight = isMobile ? 100 : 119; // Desenio style height
        const actualCanvasWidth = 640; // Actual canvas width
        const actualCanvasHeight = 400; // Actual canvas height
        
        const html = galleries.map(gallery => {
          // Get background for mini-layout
          const backgroundType = gallery.data.selectedBackground || 'grey';
          
          // Get background image URL from canvas data attributes
          const canvas = document.getElementById('room-background');
          let backgroundImageUrl = '';
          
          if (canvas) {
          const backgroundImages = {
              'grey': canvas.dataset.backgroundGrey,
              'white': canvas.dataset.backgroundWhite,
              'blue': canvas.dataset.backgroundBlue,
              'pink': canvas.dataset.backgroundPink
            };
            backgroundImageUrl = backgroundImages[backgroundType] || backgroundImages['grey'] || '';
          }
          
          // Create mini frames based on actual gallery data
          let miniFramesHtml = '';
          if (gallery.data.galleryFrames && gallery.data.galleryFrames.length > 0) {
            
            gallery.data.galleryFrames.forEach((frame, index) => {
              // ✅ CRITICAL: Get size from frame.data or frame directly
              const size = frame.size || frame.data?.size || '50x70';
              
              // ✅ CRITICAL: Get REAL saved dimensions (in 640x400 coordinate system)
              const savedX = frame.x || frame.data?.x || 0;
              const savedY = frame.y || frame.data?.y || 0;
              const savedWidth = frame.width || frame.data?.width || 100;
              const savedHeight = frame.height || frame.data?.height || 150;
              
              // Calculate position and size relative to mini-layout
              const xPercent = (savedX / actualCanvasWidth) * 100;
              const yPercent = (savedY / actualCanvasHeight) * 100;
              const widthPercent = (savedWidth / actualCanvasWidth) * 100;
              const heightPercent = (savedHeight / actualCanvasHeight) * 100;
              
              // Convert to mini-layout pixels with margin to prevent cutting
              const margin = 8; // Smaller margin for Desenio style
              const effectiveWidth = miniCanvasWidth - (2 * margin);
              const effectiveHeight = miniCanvasHeight - (2 * margin);
              
              const miniX = (xPercent / 100) * effectiveWidth + margin;
              const miniY = (yPercent / 100) * effectiveHeight + margin;
              const miniWidth = Math.max(4, (widthPercent / 100) * effectiveWidth); // Minimum 4px
              const miniHeight = Math.max(4, (heightPercent / 100) * effectiveHeight); // Minimum 4px
              
              // Get product image if available
              const productImage = frame.product && frame.product.image ? 
                `background-image: url('${frame.product.image}');` : 
                'background: #f8f9fa;';

              miniFramesHtml += `
                <div class="mini-frame" style="
                  position: absolute;
                  left: ${miniX}px;
                  top: ${miniY}px;
                  width: ${miniWidth}px;
                  height: ${miniHeight}px;
                  ${productImage}
                  background-size: cover;
                  background-position: center;
                  background-repeat: no-repeat;
                ">
                </div>
              `;
            });
          } else {
            miniFramesHtml = '<div class="mini-frame" style="position: absolute; left: 10px; top: 10px; width: 30px; height: 40px; background: #f8f9fa;"></div>';
          }
          
          return `
            <div class="saved-gallery-item" data-gallery-id="${gallery.id}" style="width: 174px;">
              <div class="inner">
                <div class="image relative" style="
                  background-image: url('${backgroundImageUrl}');
                  background-size: cover;
                  background-position: center;
                  background-repeat: no-repeat;
                  position: relative;
                  width: 160px;
                  height: 119px;
                  border-radius: 6px;
                  overflow: hidden;
                  cursor: pointer;
                ">
                  ${miniFramesHtml}
                  
                  <!-- Gallery Name Overlay -->
                  <div class="name" style="
                    position: absolute;
                    bottom: 8px;
                    left: 8px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                    background: rgba(0,0,0,0.3);
                    padding: 2px 6px;
                    border-radius: 3px;
                  ">${gallery.name}</div>
                  
                  <!-- Delete Button Overlay -->
                  <div class="remove smooth" style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    border: 1px solid #ddd;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.2s ease;
                  " data-action="delete" data-gallery-id="${gallery.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
        
        container.innerHTML = html;
        
        // Add event listeners to gallery items - DESENIO STYLE
        container.querySelectorAll('.saved-gallery-item').forEach(item => {
          // Click on entire container to load (like Desenio)
          const imageContainer = item.querySelector('.image.relative');
          if (imageContainer) {
            this.addMobileTouchEvents(imageContainer, (e) => {
              // Don't load if clicking on delete button
              if (e.target.closest('.remove.smooth')) {
                return;
              }
              
              e.preventDefault();
              e.stopPropagation();
              const galleryId = item.dataset.galleryId;
              if (galleryId) {
              this.loadGallery(galleryId);
                // Close dropdown after loading
                const menu = document.getElementById('saved-galleries-menu');
                if (menu) {
                  menu.style.display = 'none';
                  menu.classList.remove('active');
                }
              }
            });
          }

          // Click on delete button
          const deleteBtn = item.querySelector('.remove.smooth');
          if (deleteBtn) {
            this.addMobileTouchEvents(deleteBtn, (e) => {
              e.preventDefault();
              e.stopPropagation();
              const galleryId = deleteBtn.dataset.galleryId;
              if (galleryId) {
                this.deleteGallery(galleryId);
              }
            });
          }
        });
      } else {
        container.innerHTML = `
          <div class="empty-saved-galleries">
            <i class="fa fa-picture-o"></i>
            <p>No saved galleries yet</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading galleries:', error);
      container.innerHTML = `
        <div class="empty-saved-galleries">
          <i class="fa fa-exclamation-triangle"></i>
          <p>Error loading galleries</p>
        </div>
      `;
    }
  }

  loadGallery(galleryId) {
    const savedGalleries = this.getSavedGalleries();
    const gallery = savedGalleries[galleryId];
    
    if (!gallery) {
      this.showMessage('Gallery not found', 'error');
      return;
    }
    
    // Load gallery data
    this.selectedLayout = gallery.data.selectedLayout;
    this.selectedBackground = gallery.data.selectedBackground;
    this.selectedFrame = gallery.data.selectedFrame;
    
    // Apply saved background
    if (this.selectedBackground) {
      this.updateCanvasBackground(this.selectedBackground);
    }
    
    // Clear current state
    this.galleryFrames = [];
    this.selectedProducts.clear();
    
    // Load frames with their products
    if (gallery.data.galleryFrames && gallery.data.galleryFrames.length > 0) {
      this.renderGalleryFramesWithProducts(gallery.data.galleryFrames);
    }
    
    // Update UI
    this.updateStepVisibility();
    this.updateOrderSummary();
    this.hideSavedModal();
    
    this.showMessage(`Gallery "${gallery.name}" loaded successfully!`, 'success');
  }

  deleteGallery(galleryId) {
    // Show custom confirmation modal instead of confirm()
    this.showDeleteConfirmation(galleryId);
  }

  showDeleteConfirmation(galleryId) {
    // Store galleryId for later use
    this.galleryToDelete = galleryId;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('delete-confirmation-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'delete-confirmation-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Delete Gallery</h3>
          <p>Are you sure you want to delete this gallery?</p>
          <div class="modal-buttons">
            <button class="btn-cancel" id="cancel-delete">Cancel</button>
            <button class="btn-confirm" id="confirm-delete">Yes, Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('cancel-delete').addEventListener('click', () => {
        this.hideDeleteConfirmation();
      });
      
      document.getElementById('confirm-delete').addEventListener('click', () => {
        this.confirmDeleteGallery();
      });
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideDeleteConfirmation();
        }
      });
    }
    
    modal.style.display = 'flex';
  }

  hideDeleteConfirmation() {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  confirmDeleteGallery() {
    if (!this.galleryToDelete) {
      console.error('No gallery ID to delete');
      return;
    }
    
    console.log('Deleting gallery:', this.galleryToDelete);
    
    const savedGalleries = this.getSavedGalleries();
    delete savedGalleries[this.galleryToDelete];
    
    localStorage.setItem('kuriosis_saved_galleries', JSON.stringify(savedGalleries));
    this.loadSavedGalleries();
    
    this.hideDeleteConfirmation();
    this.showMessage('Gallery deleted successfully', 'success');
    
    // Clear the stored gallery ID
    this.galleryToDelete = null;
  }

  shareGallery() {
    // Create a shareable link with current state
    const galleryData = this.getCurrentGalleryState();
    
    // Debug: Log the complete gallery data being shared
    console.log('=== SHARING GALLERY DATA ===');
    console.log('Gallery data:', galleryData);
    console.log('Gallery frames with products:', galleryData.galleryFrames.filter(f => f.product));
    console.log('Selected products:', galleryData.selectedProducts);
    console.log('============================');
    
    // Use encodeURIComponent instead of btoa to handle Unicode characters
    const jsonString = JSON.stringify(galleryData);
    const encodedData = encodeURIComponent(jsonString);
    const shareUrl = `${window.location.origin}${window.location.pathname}?gallery=${encodedData}`;
    
    // Show share modal
    this.showShareModal(shareUrl);
  }

  showShareModal(shareUrl) {
    const modal = document.getElementById('shareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    
    if (modal && shareLinkInput) {
      // Set the share URL
      shareLinkInput.value = shareUrl;
      
      // Generate preview image (screenshot of current gallery)
      this.generateGalleryPreview();
      
      // Show modal
      modal.style.display = 'block';
      
      // Add event listeners if not already added
      this.initShareModalEvents(shareUrl);
    }
  }

  hideShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  generateGalleryPreview() {
    const canvas = document.querySelector('.gallery-wall-area');
    const previewImg = document.getElementById('shareImagePreview');
    
    if (canvas && previewImg) {
      // Use html2canvas if available for better quality
      if (typeof html2canvas !== 'undefined') {
        this.createHtml2CanvasPreview(canvas, previewImg);
      } else {
        // Fallback to manual canvas drawing
        this.createCanvasPreview(canvas, previewImg);
      }
    }
  }

  createHtml2CanvasPreview(sourceCanvas, previewImg) {
    html2canvas(sourceCanvas, {
      backgroundColor: null,
      scale: 2.0, // Much higher scale for better quality
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: sourceCanvas.offsetWidth,
      height: sourceCanvas.offsetHeight,
      imageTimeout: 10000,
      removeContainer: false,
      foreignObjectRendering: true
    }).then(canvas => {
      // Resize to fit preview with better quality
      const previewCanvas = document.createElement('canvas');
      const ctx = previewCanvas.getContext('2d');
      
      // Much higher resolution for better quality
      previewCanvas.width = 1200;
      previewCanvas.height = 900;
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Calculate scale to fit
      const scale = Math.min(previewCanvas.width / canvas.width, previewCanvas.height / canvas.height);
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      
      // Center the image
      const offsetX = (previewCanvas.width - scaledWidth) / 2;
      const offsetY = (previewCanvas.height - scaledHeight) / 2;
      
      ctx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);
      previewImg.src = previewCanvas.toDataURL('image/jpeg', 0.95); // JPEG with 95% quality
    }).catch(error => {
      console.error('html2canvas failed:', error);
      // Fallback to manual drawing
      this.createCanvasPreview(sourceCanvas, previewImg);
    });
  }

  createCanvasPreview(sourceCanvas, previewImg) {
    // Create a canvas for the preview
    const previewCanvas = document.createElement('canvas');
    const ctx = previewCanvas.getContext('2d');
    
    // Much higher resolution for better quality
    previewCanvas.width = 1200;
    previewCanvas.height = 900;
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Get actual canvas dimensions
    const canvasRect = sourceCanvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width || 600;
    const canvasHeight = canvasRect.height || 400;
    
    // Scale factor to fit the preview
    const scaleX = previewCanvas.width / canvasWidth;
    const scaleY = previewCanvas.height / canvasHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Draw background first
    this.drawRoomBackground(ctx, previewCanvas.width, previewCanvas.height).then(() => {
      // Then draw frames and products
      this.drawFramesAndProducts(ctx, scale, previewCanvas.width, previewCanvas.height, canvasWidth, canvasHeight).then(() => {
        // Convert to data URL with high quality
        previewImg.src = previewCanvas.toDataURL('image/jpeg', 0.95);
      });
    });
  }

  drawRoomBackground(ctx, width, height) {
    return new Promise((resolve) => {
      // Get the room background from the actual canvas
      const roomBackground = document.querySelector('.room-background');
      if (roomBackground) {
        const bgImage = roomBackground.style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // Extract URL from background-image CSS
          const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              // Draw background image scaled to fit
              ctx.drawImage(img, 0, 0, width, height);
              resolve();
            };
            img.onerror = () => {
              // If image fails to load, use fallback
              this.drawFallbackBackground(ctx, width, height);
              resolve();
            };
            img.src = urlMatch[1];
            return; // Exit early if we found an image
          }
        }
      }
      
      // Fallback to solid color if no background image
      this.drawFallbackBackground(ctx, width, height);
      resolve();
    });
  }

  drawFallbackBackground(ctx, width, height) {
    // Draw a gradient background similar to the room
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8f8f8');
    gradient.addColorStop(1, '#e8e8e8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add some texture lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }

  drawFramesAndProducts(ctx, scale, width, height, canvasWidth, canvasHeight) {
    return new Promise((resolve) => {
      if (!this.galleryFrames || this.galleryFrames.length === 0) {
        resolve();
        return;
      }
      
      // Get the actual gallery container to match positioning
      const galleryContainer = document.querySelector('.gallery-wall-area');
      if (!galleryContainer) {
        resolve();
        return;
      }
      
      // Get the actual gallery container dimensions and position
      const containerRect = galleryContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calculate the scale based on the actual container size
      const actualScaleX = width / containerWidth;
      const actualScaleY = height / containerHeight;
      const actualScale = Math.min(actualScaleX, actualScaleY);
      
      // Center the gallery in the preview
      const offsetX = (width - containerWidth * actualScale) / 2;
      const offsetY = (height - containerHeight * actualScale) / 2;
      
      let loadedImages = 0;
      const totalImages = this.galleryFrames.filter(frame => frame.product && frame.product.image).length;
      
      if (totalImages === 0) {
        // No images to load, just draw frames
        this.drawAllFrames(ctx, actualScale, width, height, containerWidth, containerHeight, offsetX, offsetY);
        resolve();
        return;
      }
      
      this.galleryFrames.forEach((frame, index) => {
        if (!frame.data) return;
        
        // Get the actual DOM element position
        const frameElement = frame.element;
        if (!frameElement) return;
        
        const frameRect = frameElement.getBoundingClientRect();
        const containerRect = galleryContainer.getBoundingClientRect();
        
        // Calculate relative position within the container
        const relativeX = frameRect.left - containerRect.left;
        const relativeY = frameRect.top - containerRect.top;
        const frameWidth = frameRect.width;
        const frameHeight = frameRect.height;
        
        // Scale to preview dimensions
        const scaledX = offsetX + (relativeX * actualScale);
        const scaledY = offsetY + (relativeY * actualScale);
        const scaledWidth = frameWidth * actualScale;
        const scaledHeight = frameHeight * actualScale;
        
        // Draw frame background (white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        
        // Draw frame border - different styles based on state
        if (frame.product && frame.product.image) {
          // Selected frame with product - thicker border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(2, actualScale * 2);
          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
          
          // Draw product image
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw product image with some padding
            const padding = Math.max(3, actualScale * 3);
            ctx.drawImage(
              img, 
              scaledX + padding, 
              scaledY + padding, 
              scaledWidth - (padding * 2), 
              scaledHeight - (padding * 2)
            );
            
            loadedImages++;
            if (loadedImages === totalImages) {
              resolve();
            }
          };
          img.onerror = () => {
            // If image fails to load, draw placeholder
            this.drawFramePlaceholder(ctx, scaledX, scaledY, scaledWidth, scaledHeight, frame.data.size);
            loadedImages++;
            if (loadedImages === totalImages) {
              resolve();
            }
          };
          img.src = frame.product.image;
        } else {
          // Empty frame - thinner border
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = Math.max(1, actualScale);
          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
          
          // Draw placeholder text
          this.drawFramePlaceholder(ctx, scaledX, scaledY, scaledWidth, scaledHeight, frame.data.size);
        }
        
        // Draw frame size label at bottom
        ctx.fillStyle = '#666666';
        ctx.font = `${Math.max(6, scaledHeight * 0.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
          frame.data.size, 
          scaledX + scaledWidth / 2, 
          scaledY + scaledHeight - Math.max(2, actualScale * 2)
        );
      });
    });
  }

  drawFramePlaceholder(ctx, frameX, frameY, frameWidth, frameHeight, size) {
    // Draw placeholder text
    ctx.fillStyle = '#cccccc';
    ctx.font = `${Math.max(8, frameHeight * 0.12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      size, 
      frameX + frameWidth / 2, 
      frameY + frameHeight / 2
    );
  }

  drawAllFrames(ctx, scale, width, height, canvasWidth, canvasHeight, offsetX, offsetY) {
    const galleryContainer = document.querySelector('.gallery-wall-area');
    if (!galleryContainer) return;
    
    const containerRect = galleryContainer.getBoundingClientRect();
    
    this.galleryFrames.forEach((frame, index) => {
      if (!frame.data) return;
      
      // Get the actual DOM element position
      const frameElement = frame.element;
      if (!frameElement) return;
      
      const frameRect = frameElement.getBoundingClientRect();
      
      // Calculate relative position within the container
      const relativeX = frameRect.left - containerRect.left;
      const relativeY = frameRect.top - containerRect.top;
      const frameWidth = frameRect.width;
      const frameHeight = frameRect.height;
      
      // Scale to preview dimensions
      const scaledX = offsetX + (relativeX * scale);
      const scaledY = offsetY + (relativeY * scale);
      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;
      
      // Draw frame background (white)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Draw frame border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = Math.max(1, scale);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Draw placeholder text
      this.drawFramePlaceholder(ctx, scaledX, scaledY, scaledWidth, scaledHeight, frame.data.size);
      
      // Draw frame size label at bottom
      ctx.fillStyle = '#666666';
      ctx.font = `${Math.max(6, scaledHeight * 0.1)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        frame.data.size, 
        scaledX + scaledWidth / 2, 
        scaledY + scaledHeight - Math.max(2, scale * 2)
      );
    });
  }

  initShareModalEvents(shareUrl) {
    // Close modal events
    const closeBtn = document.getElementById('closeShareModal');
    const modalBG = document.getElementById('shareModalBG');
    
    if (closeBtn && !closeBtn.hasAttribute('data-listener-added')) {
      closeBtn.addEventListener('click', () => this.hideShareModal());
      closeBtn.setAttribute('data-listener-added', 'true');
    }
    
    if (modalBG && !modalBG.hasAttribute('data-listener-added')) {
      modalBG.addEventListener('click', () => this.hideShareModal());
      modalBG.setAttribute('data-listener-added', 'true');
    }

    // Copy link button
    const copyBtn = document.getElementById('copyShareLink');
    if (copyBtn && !copyBtn.hasAttribute('data-listener-added')) {
      copyBtn.addEventListener('click', () => {
        this.copyToClipboard(shareUrl);
      });
      copyBtn.setAttribute('data-listener-added', 'true');
    }

  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showMessage('Gallery link copied to clipboard!', 'success');
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showMessage('Gallery link copied to clipboard!', 'success');
    } catch (err) {
      this.showMessage('Could not copy link. Please copy manually: ' + text, 'error');
    }
    
    document.body.removeChild(textArea);
  }

  createNewGallery() {
    // Show custom confirmation modal instead of confirm()
    this.showCreateNewConfirmation();
  }

  showCreateNewConfirmation() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('create-new-confirmation-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'create-new-confirmation-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Create New Gallery</h3>
          <p>Are you sure you want to create a new gallery? This will clear your current work.</p>
          <div class="modal-buttons">
            <button class="btn-cancel" id="cancel-create-new">Cancel</button>
            <button class="btn-confirm" id="confirm-create-new">Yes, Create New</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('cancel-create-new').addEventListener('click', () => {
        this.hideCreateNewConfirmation();
      });
      
      document.getElementById('confirm-create-new').addEventListener('click', () => {
        this.confirmCreateNewGallery();
      });
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCreateNewConfirmation();
        }
      });
    }
    
    modal.style.display = 'flex';
  }

  hideCreateNewConfirmation() {
    const modal = document.getElementById('create-new-confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  confirmCreateNewGallery() {
      // Reset all state
      this.selectedLayout = null;
      this.selectedBackground = 'grey';
      this.selectedFrame = null;
      this.galleryFrames = [];
      this.selectedProducts.clear();
      this.orderSubtotal = 0;
      this.orderFrames = 0;
      this.orderTotal = 0;
    this.selectedFramingService = null;
    
    // Go to step 1
    this.currentStep = 1;
      
      // Reset UI
      this.updateStepVisibility();
      this.updateOrderSummary();
      
      // Clear canvas
      const canvas = document.querySelector('.gallery-wall-area');
      if (canvas) {
        canvas.innerHTML = '';
        canvas.classList.remove('has-frames');
      }
      
    this.hideCreateNewConfirmation();
      this.showMessage('New gallery created!', 'success');
  }

  // Frame protection system for mobile
  startFrameProtection(frameIndex) {
    if (!this.isMobile) return;
    
    const frame = this.galleryFrames[frameIndex];
    if (!frame) return;
    
    // Clear any existing protection for this frame
    if (frame.protectionInterval) {
      clearInterval(frame.protectionInterval);
    }
    
    // Start protection interval
    frame.protectionInterval = setInterval(() => {
      if (!frame.element || !document.contains(frame.element)) {
        clearInterval(frame.protectionInterval);
        return;
      }
      
      // Force frame visibility and position
      frame.element.style.position = 'absolute';
      frame.element.style.zIndex = '1000';
      frame.element.style.display = 'block';
      frame.element.style.visibility = 'visible';
      frame.element.style.opacity = '1';
      frame.element.style.willChange = 'transform';
      frame.element.style.backfaceVisibility = 'hidden';
      frame.element.style.transform = 'translateZ(0)';
      
      // Check if frame is off-screen and fix it
      const rect = frame.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || 
          rect.left < -100 || rect.left > window.innerWidth + 100 ||
          rect.top < -100 || rect.top > window.innerHeight + 100) {
        
        // Frame is off-screen, restore to center
        frame.element.style.top = '50%';
        frame.element.style.left = '50%';
        frame.element.style.transform = 'translate(-50%, -50%) translateZ(0)';
      }
    }, 100); // Check every 100ms
  }

  stopFrameProtection(frameIndex) {
    const frame = this.galleryFrames[frameIndex];
    if (frame && frame.protectionInterval) {
      clearInterval(frame.protectionInterval);
      frame.protectionInterval = null;
    }
  }

  findCorrectVariant(productData, frameSize, productElement) {
    return this.findCorrectVariantWithMaterial(productData, frameSize, productElement, this.selectedMaterial);
  }

  findCorrectVariantWithMaterial(productData, frameSize, productElement, material) {
    console.log(`🔍 findCorrectVariantWithMaterial: frameSize=${frameSize}, material=${material}`);
    
    // Check if productElement is valid
    if (!productElement || !productElement.dataset) {
      console.error('❌ ProductElement is undefined or has no dataset');
      return productData; // Fallback
    }
    
    try {
      // ✅ USE data-all-variants (same as updateProductPriceForFrameSizeAndMaterial)
      const allVariantsData = productElement.dataset.allVariants;
      
      if (!allVariantsData) {
        console.error('❌ No data-all-variants found');
        return productData;
      }
      
      const variants = allVariantsData.split(';');
      console.log(`   📦 Found ${variants.length} variants`);
      
      const normalizeMaterial = (material) => {
        return material.toLowerCase().replace(/[^a-z0-9]/g, '');
      };
      
      const normalizedFrameSize = this.normalizeSizeForCSS(frameSize);
      const normalizedMaterial = material ? normalizeMaterial(material) : null;
      
      console.log(`   🔍 Looking for: size="${normalizedFrameSize}", material="${normalizedMaterial}"`);
      
      // Find matching variant
      for (const variantEntry of variants) {
        const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
        const [size, mat] = sizeAndMaterial.split('|');
        const [price, variantId] = priceAndId.split('|');
        
        const normalizedVariantSize = this.normalizeSizeForCSS(size);
        const normalizedVariantMaterial = normalizeMaterial(mat);
        
        const sizeMatch = normalizedVariantSize === normalizedFrameSize;
        const materialMatch = !normalizedMaterial || 
                             normalizedVariantMaterial === normalizedMaterial ||
                             normalizedVariantMaterial.includes(normalizedMaterial) ||
                             normalizedMaterial.includes(normalizedVariantMaterial);
        
        if (sizeMatch && materialMatch) {
          console.log(`   ✅ MATCH FOUND!`);
          console.log(`      Size: ${size} (${normalizedVariantSize})`);
          console.log(`      Material: ${mat} (${normalizedVariantMaterial})`);
          console.log(`      Price: €${price}`);
          console.log(`      Variant ID: ${variantId}`);
          
          const priceInCents = Math.round(parseFloat(price) * 100);
          const formattedPrice = `€${parseFloat(price).toFixed(2).replace('.', ',')}`;
          return {
            id: variantId,
            price: formattedPrice,
            formattedPrice: formattedPrice,
            priceRaw: priceInCents,
            size: size,
            image: productData.image
          };
        }
      }
      
      console.error(`❌ No variant found for size=${frameSize} + material=${material}`);
      return productData; // Fallback
    } catch (error) {
      console.error('❌ Error finding correct variant:', error);
      return productData; // Fallback
    }
  }

  getFrameImage(frameId) {
    console.log('🔍 getFrameImage called with frameId:', frameId);
    
    // First check if we have the selected frame with image
    if (this.selectedFrame && this.selectedFrame.id === frameId && this.selectedFrame.image) {
      console.log('✅ Using selected frame image:', this.selectedFrame.image);
      return this.selectedFrame.image;
    }
    
    // Find the frame option element to get its image
    const frameOption = document.querySelector(`[data-frame="${frameId}"]`);
    console.log('🔍 Frame option element found:', frameOption);
    
    if (frameOption) {
      // First try to get from data-frame-image attribute (most reliable)
      const dataFrameImage = frameOption.dataset.frameImage;
      if (dataFrameImage) {
        console.log('✅ Found frame image from data-frame-image attribute:', dataFrameImage);
        return dataFrameImage;
      }
      
      // Try to get from img element's data-full-image attribute
      const frameImage = frameOption.querySelector('.frame-preview img');
      if (frameImage) {
        const fullImage = frameImage.dataset.fullImage;
        if (fullImage) {
          console.log('✅ Found frame image from data-full-image:', fullImage);
          return fullImage;
        }
        
        // Fallback: get from src and convert to full resolution
        let imageUrl = frameImage.src;
        console.log('🔍 Original image URL from src:', imageUrl);
        
        // Remove size parameters to get full resolution
        imageUrl = imageUrl.replace(/\?.*$/, '').replace(/_\d+x\d+\./, '.');
        
        // Also try to get the full resolution URL from Shopify
        if (imageUrl.includes('cdn.shopify.com')) {
          // Remove size suffix and get original
          imageUrl = imageUrl.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master)\./, '.');
        }
        
        console.log('✅ Final frame image URL (from src):', imageUrl);
        return imageUrl;
      } else {
        console.warn('⚠️ No img element found in frame-preview');
      }
    } else {
      console.warn('⚠️ Frame option not found for handle:', frameId);
      // Try to find with different variations of the handle
      const alternatives = [
        frameId.replace(/-/g, '_'),
        frameId.replace(/_/g, '-'),
        frameId.toLowerCase(),
        frameId
      ];
      
      for (const alt of alternatives) {
        const altOption = document.querySelector(`[data-frame="${alt}"]`);
        if (altOption) {
          console.log('✅ Found frame with alternative handle:', alt);
          
          // Try data-frame-image first
          const dataFrameImage = altOption.dataset.frameImage;
          if (dataFrameImage) {
            console.log('✅ Using alternative handle image from data-frame-image:', dataFrameImage);
            return dataFrameImage;
          }
          
          // Try img element
          const frameImage = altOption.querySelector('.frame-preview img');
          if (frameImage) {
            const fullImage = frameImage.dataset.fullImage || frameImage.src.replace(/\?.*$/, '').replace(/_\d+x\d+\./, '.');
            console.log('✅ Using alternative handle image:', fullImage);
            return fullImage;
          }
        }
      }
    }
    
    console.warn('❌ No frame image found for:', frameId);
    return null;
  }

  applyFrameImageToGalleryFrame(galleryFrame, frameImageUrl = null) {
    // If frameImageUrl is provided (when loading saved gallery), use it directly
    let frameImage = frameImageUrl;
    
    // Otherwise, try to get from selectedFrame
    if (!frameImage && this.selectedFrame) {
      frameImage = this.getFrameImage(this.selectedFrame.id);
    }
    
    // If still no frame image, try to get from galleryFrame dataset
    if (!frameImage && galleryFrame.dataset.frameId) {
      frameImage = this.getFrameImage(galleryFrame.dataset.frameId);
    }
    
    if (!frameImage) {
      console.log('No frame image found, using thin color fallback');
      // Fallback to thin color-based frame
      const frameId = galleryFrame.dataset.frameId || (this.selectedFrame ? this.selectedFrame.id : null);
      if (frameId) {
        const frameColor = this.getFrameColor(frameId);
        console.log('🎨 Frame color:', frameColor, 'for frame ID:', frameId);
        galleryFrame.style.borderColor = frameColor;
        galleryFrame.style.borderWidth = '2px';
        galleryFrame.style.borderStyle = 'solid';
        galleryFrame.style.boxShadow = `0 0 0 1px ${frameColor}`;
        // Remove background image if it exists
        galleryFrame.style.backgroundImage = '';
        return;
      } else {
        console.log('No selected frame to apply');
        return;
      }
    }
    
    console.log('🎨 Applying frame image to gallery frame:', frameImage);
    
    if (!frameImage) {
      console.log('⚠️ No frame image found, using thin color fallback');
      // Fallback to thin color-based frame
      const frameColor = this.getFrameColor(this.selectedFrame.id);
      console.log('🎨 Frame color:', frameColor, 'for frame ID:', this.selectedFrame.id);
      galleryFrame.style.borderColor = frameColor;
      galleryFrame.style.borderWidth = '2px';
      galleryFrame.style.borderStyle = 'solid';
      galleryFrame.style.boxShadow = `0 0 0 1px ${frameColor}`;
      // Remove background image if it exists
      galleryFrame.style.backgroundImage = '';
      return;
    }
    
    // Remove existing frame overlay
    const existingFrameOverlay = galleryFrame.querySelector('.frame-overlay');
    if (existingFrameOverlay) {
      existingFrameOverlay.remove();
    }
    
    // Remove border fallback if it exists
    galleryFrame.style.borderColor = '';
    galleryFrame.style.borderWidth = '';
    galleryFrame.style.borderStyle = '';
    galleryFrame.style.boxShadow = '';
    
    // Set frame image as background of the gallery frame
    // Use 'cover' to fill the entire frame, or 'contain' to fit inside
    // 'cover' ensures the frame fills the entire element and adapts to different sizes
    galleryFrame.style.backgroundImage = `url('${frameImage}')`;
    galleryFrame.style.backgroundSize = '100% 100%'; // Preenche todo o espaço do frame
    galleryFrame.style.backgroundPosition = 'center';
    galleryFrame.style.backgroundRepeat = 'no-repeat';
    
    console.log('✅ Frame background image set with 100% 100% to fill everything');
    
    // Get frame dimensions for proper product positioning
    const frameRect = galleryFrame.getBoundingClientRect();
    const frameWidth = frameRect.width;
    const frameHeight = frameRect.height;
    console.log('📐 Frame dimensions:', frameWidth, 'x', frameHeight);
    
    // Calculate product area (separate width and height for better fit)
    // This ensures the product fits inside the frame opening
    const productWidthPercent = 88; // Width percentage
    const productHeightPercent = 92; // Height percentage - increased to fill more vertically
    
    // Ensure the product image is visible in the center
    const innerContainer = galleryFrame.querySelector('.inner');
    const productImage = galleryFrame.querySelector('.inner img');
    
    if (innerContainer) {
      // Position the inner container (with product) in the center of the frame image
      // The frame image covers the entire element, product sits in the center
      // Use !important for mobile to override CSS rules
      const isMobileDevice = this.isMobile || window.innerWidth <= 768;
      innerContainer.style.cssText = `
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: ${productWidthPercent}% !important;
        height: ${productHeightPercent}% !important;
        z-index: 5 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        background: transparent !important;
      `;
      
      if (productImage) {
        productImage.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 5;
          position: relative;
          display: block;
        `;
        console.log('✅ Product image positioned in center of frame at', productWidthPercent + '% width x', productHeightPercent + '% height');
      }
    } else {
      // If no inner container exists, create one for the product
      const frameData = this.galleryFrames.find(f => f.element === galleryFrame);
      if (frameData && frameData.product && frameData.product.image) {
        // Use same width/height percentages as above
        const productWidthPercent = 88; // Width percentage
        const productHeightPercent = 92; // Height percentage - increased to fill more vertically
        
        const newInner = document.createElement('div');
        newInner.className = 'inner';
        // Use !important for mobile to override CSS rules
        newInner.style.cssText = `
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: ${productWidthPercent}% !important;
          height: ${productHeightPercent}% !important;
          z-index: 5 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          background: transparent !important;
        `;
        
        const img = document.createElement('img');
        img.src = frameData.product.image;
        img.alt = frameData.product.title;
        img.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 5;
          position: relative;
          display: block;
        `;
        
        newInner.appendChild(img);
        galleryFrame.appendChild(newInner);
        console.log('✅ Created inner container with product image');
      }
    }
    
    // Mark as having frame image
    galleryFrame.classList.add('has-frame-image');
    galleryFrame.dataset.frameImageUrl = frameImage;
    
    console.log('✅ Frame image applied as background with product in center (adapts to size)');
  }

  formatMoney(amount) {
    // Ensure amount is a number
    const numAmount = parseFloat(amount) || 0;
    
    
    if (this.config.moneyFormat) {
      // Handle both {{amount}} and {{amount_with_comma_separator}} formats
      let formatted = this.config.moneyFormat.replace('{{amount}}', numAmount.toFixed(2));
      formatted = formatted.replace('{{amount_with_comma_separator}}', numAmount.toFixed(2).replace('.', ','));
      return formatted;
    }
    const result = `€${numAmount.toFixed(2).replace('.', ',')}`;
    return result;
  }

  async getVariantId(productId) {
    try {
      const response = await fetch(`/products/${productId}.js`);
      
      if (response.ok) {
        const product = await response.json();
        
        if (product.variants && product.variants.length > 0) {
          const variantId = product.variants[0].id;
          return variantId;
        }
        
        // This should never happen in Shopify - all products have at least one variant
        console.error('No variants found for product:', productId, 'Product data:', product);
        throw new Error(`No variants found for product ${productId}`);
      }
      
      console.error('Failed to fetch product data for:', productId, 'Status:', response.status);
      throw new Error(`Failed to fetch product data for ${productId} - Status: ${response.status}`);
    } catch (error) {
      console.error('Error getting variant ID for product:', productId, error);
      throw error;
    }
  }

  async addToCart() {
    if (this.selectedProducts.size === 0) {
      this.showMessage('Please add products to your gallery first', 'error');
      return;
    }

    const addToCartBtn = document.getElementById('add-gallery-to-cart');
    if (addToCartBtn) {
      addToCartBtn.classList.add('loading');
      addToCartBtn.disabled = true;
    }

    try {
      // Prepare cart items in Shopify format
      const cartItems = [];
      
      for (let index = 0; index < this.galleryFrames.length; index++) {
        const frame = this.galleryFrames[index];
        if (frame.product) {
          // Ensure product ID is a number (Shopify requirement)
          const productId = parseInt(frame.product.id);
          
          if (isNaN(productId) || productId <= 0) {
            console.error('Invalid product ID:', frame.product.id);
            this.showMessage('Invalid product ID: ' + frame.product.id, 'error');
            continue;
          }
          
          // Validate product exists by checking if we have valid data
          if (!frame.product.title || !frame.product.price) {
            console.error('Invalid product data:', frame.product);
            this.showMessage('Invalid product data', 'error');
            continue;
          }
          
          // Use variant ID directly from product data (no API call needed)
          const variantId = frame.product.variantId;
          
          if (!variantId) {
            console.error('No variant ID available for product:', productId);
            this.showMessage('No variant available for product: ' + frame.product.title, 'error');
            continue;
          }
          
          
          // Get the correct product size from the frame data
          const productSize = frame.data.size || 'Unknown';
          
          cartItems.push({
            id: variantId,
            quantity: 1,
            properties: {
              'Gallery Position': `Frame ${index + 1}`,
              'Size': productSize,
              'Frame Size': productSize,
              'Frame Type': frame.frameName || 'No frame',
              'Gallery Wall': 'Custom Gallery'
            }
          });
          
          // Add frame if selected and frame has variant data
          const frameVariantId = frame.element.dataset.frameVariantId;
          if (frameVariantId) {
            // Add frame to cart using the stored variant ID
            cartItems.push({
              id: frameVariantId,
              quantity: 1,
              properties: {
                'Gallery Position': `Frame ${index + 1}`,
                'Frame Type': frame.element.dataset.frameName || 'Unknown Frame',
                'Frame Size': frame.element.dataset.frameSize || 'Unknown Size',
                'Gallery Wall': 'Custom Gallery'
              }
            });
          }
        }
      }

      if (cartItems.length === 0) {
        this.showMessage('No valid products to add to cart', 'error');
        return;
      }

      console.log('Prepared cart items:', cartItems);

      // Add to cart using Shopify's Cart API
      const result = await this.addItemsToCart(cartItems);
      
      // Show success message
      this.showMessage('Gallery added to cart successfully!', 'success');
      
      // Update cart count
      this.updateCartCount(result.item_count || cartItems.length);
      
      // Trigger cart update event for theme
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { cart: result }
      }));
      
      // Update cart drawer if it exists
      if (window.theme && window.theme.cartDrawer) {
        window.theme.cartDrawer.refresh();
      }
      
      // Redirect to cart or show success
      setTimeout(() => {
        window.location.href = '/cart';
      }, 1500);
    } catch (error) {
      console.error('Error in addToCart:', error);
      this.showMessage('Error adding to cart', 'error');
    } finally {
      if (addToCartBtn) {
        addToCartBtn.classList.remove('loading');
        addToCartBtn.disabled = false;
      }
    }
  }

  async addItemsToCart(items) {
    try {
      
      // Use theme's approach - add items one by one using FormData
      const results = [];
      
      for (const item of items) {
        try {
          const result = await this.addSingleItemToCart(item);
          results.push(result);
        } catch (error) {
          console.error('Failed to add item:', item, error);
          // Continue with other items even if one fails
        }
      }
      
      if (results.length === 0) {
        throw new Error('No items were successfully added to cart');
      }
      
      // Return success with combined results
      return {
        item_count: results.length,
        items: results
      };
    } catch (error) {
      console.error('Error adding items to cart:', error);
      throw error;
    }
  }

  async addSingleItemToCart(item) {
    // Use EXACTLY the same approach as the theme's quickAdd
    const config = {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/javascript",
      },
    };

    let formData = new FormData();
    formData.append("id", item.id);
    formData.append("quantity", item.quantity);
    
    // Add properties
    Object.keys(item.properties).forEach(key => {
      formData.append(`properties[${key}]`, item.properties[key]);
    });
    
    // Add sections exactly like the theme
    formData.append("sections", "cart-drawer");
    formData.append("sections_url", window.location.pathname);
    
    config.body = formData;
    
    
    const response = await fetch(`${this.config.cartAddUrl}`, config);

    
    if (response.ok) {
      const result = await response.json();
      
      // Check for Shopify errors exactly like the theme
      if (result.status) {
        console.error('Cart error:', result.description);
        throw new Error(result.description || 'Cart Error');
      }
      
      return result;
    } else {
      const errorText = await response.text();
      console.error('Cart API error response:', errorText);
      throw new Error(`Failed to add item: ${errorText}`);
    }
  }

  async addItemsToCartOriginal(items) {
    try {
      
      // Use Shopify's standard cart add URL for multiple items
      const cartAddUrl = '/cart/add.js';
      
      // Format items for Shopify Cart API (JSON format for multiple items)
      const cartItems = items.map(item => ({
        id: parseInt(item.id),
        quantity: parseInt(item.quantity) || 1,
        properties: item.properties || {}
      }));
      
      console.log('Formatted cart items:', cartItems);
      
      const response = await fetch(cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          items: cartItems
        })
      });

      console.log('Cart API response headers:', response.headers);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Cart API success:', result);
        
        this.showMessage('Gallery added to cart successfully!', 'success');
        
        // Update cart count
        this.updateCartCount(result.item_count || items.length);
        
        // Trigger cart update event for theme
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { cart: result }
        }));
        
        // Update cart drawer if it exists
        if (window.theme && window.theme.cartDrawer) {
          window.theme.cartDrawer.refresh();
        }
        
        // Redirect to cart or show success
        setTimeout(() => {
          window.location.href = '/cart';
        }, 1500);
      } else {
        const errorText = await response.text();
        console.error('Cart API error response:', errorText);
        console.error('Response status:', response.status);
        
        // Try to parse error as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        // Handle specific Shopify errors
        if (errorData.errors) {
          if (Array.isArray(errorData.errors)) {
            throw new Error('Cart Error: ' + errorData.errors.join(', '));
          } else if (typeof errorData.errors === 'string') {
            throw new Error('Cart Error: ' + errorData.errors);
          } else if (typeof errorData.errors === 'object') {
            // Handle object errors (like validation errors)
            const errorMessages = Object.keys(errorData.errors).map(key => 
              `${key}: ${errorData.errors[key]}`
            );
            throw new Error('Cart Error: ' + errorMessages.join(', '));
          }
        }
        
        // Handle specific status codes
        if (response.status === 422) {
          throw new Error('Invalid product data - please check product IDs and variants');
        } else if (response.status === 400) {
          throw new Error('Bad request - please check your cart data');
        } else if (response.status === 404) {
          throw new Error('Product not found - please refresh and try again');
        }
        
        throw new Error('Cart API Error (' + response.status + '): ' + (errorData.message || errorText));
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showMessage('error_adding_to_cart', 'error');
    } finally {
      const addToCartBtn = document.getElementById('add-gallery-to-cart');
      if (addToCartBtn) {
        addToCartBtn.classList.remove('loading');
        addToCartBtn.disabled = false;
      }
    }
  }

  updateCartCount(count) {
    // Update cart count in header if it exists
    const cartCount = document.querySelector('.cart-count, #cart-count');
    if (cartCount) {
      cartCount.textContent = count;
    }
  }

  nextStep() {
    console.log(`🔄 nextStep called: currentStep=${this.currentStep}`);
    if (this.currentStep < 4) {
      console.log(`   Moving from Step ${this.currentStep} to Step ${this.currentStep + 1}`);
      // Track step completion
      if (this.tracking) {
        try {
          const stepData = this.getStepData();
          this.tracking.trackStepComplete(this.currentStep, this.getStepName(this.currentStep), stepData);
        } catch (error) {
          console.warn('Analytics tracking failed:', error);
        }
      }
      
      this.currentStep++;
      console.log(`   ✅ Step updated to: ${this.currentStep}`);
      
      // Track new step start
        if (this.tracking) {
          try {
            this.tracking.trackStepStart(this.currentStep, this.getStepName(this.currentStep));
          } catch (error) {
            console.warn('Analytics tracking failed:', error);
          }
        }
        
        // Track with advanced analytics
        if (this.advancedTracking) {
          try {
            this.advancedTracking.trackStepStart(this.currentStep, this.getStepName(this.currentStep));
          } catch (error) {
            console.warn('Advanced analytics tracking failed:', error);
          }
        }
        
        // Track with enhanced Shopify analytics
        if (this.enhancedTracking) {
          try {
            this.enhancedTracking.trackStepStart(this.currentStep, this.getStepName(this.currentStep));
          } catch (error) {
            console.warn('Enhanced Shopify analytics tracking failed:', error);
          }
        }
      
      this.updateStepVisibility();
      this.updateNavigationButtons();
      this.updateScrollBehavior();
    } else {
      console.log(`   ⚠️ Already at max step (4)`);
    }
  }

  // Get Step Name for Tracking
  getStepName(step) {
    const stepNames = {
      1: 'Select Background',
      2: 'Select Products',
      3: 'Select Frames',
      4: 'Review Order'
    };
    return stepNames[step] || `Step ${step}`;
  }

  // Get Step Data for Tracking
  getStepData() {
    try {
      // Ensure all properties exist
      if (!this.selectedProducts) this.selectedProducts = new Map();
      if (!this.selectedFrames) this.selectedFrames = new Map();
      if (!this.galleryFrames) this.galleryFrames = [];
      
      return {
        current_step: this.currentStep || 1,
        selected_background: this.selectedBackground || 'grey',
        selected_layout: this.selectedLayout ? this.selectedLayout.id : null,
        products_count: this.selectedProducts ? this.selectedProducts.size : 0,
        frames_count: this.selectedFrames ? this.selectedFrames.size : 0,
        gallery_frames_count: this.galleryFrames ? this.galleryFrames.length : 0
      };
    } catch (error) {
      console.warn('Error in getStepData:', error);
      return {
        current_step: 1,
        selected_background: 'grey',
        selected_layout: null,
        products_count: 0,
        frames_count: 0,
        gallery_frames_count: 0
      };
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepVisibility();
      this.updateNavigationButtons();
      this.updateScrollBehavior();
    }
  }

  updateScrollBehavior() {
    // Remove existing scroll event listeners
    document.removeEventListener('wheel', this.preventScroll);
    document.removeEventListener('touchmove', this.preventScroll);
    document.removeEventListener('keydown', this.preventScroll);
    
    // Only apply scroll prevention on desktop
    if (!this.isMobile) {
      document.addEventListener('wheel', this.preventScroll, { passive: false });
      document.addEventListener('touchmove', this.preventScroll, { passive: false });
      document.addEventListener('keydown', this.preventScroll);
    }
  }

  updateStepVisibility() {
    // Update builder steps
    document.querySelectorAll('.builder-step').forEach((step, index) => {
      if (index + 1 === this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    
    // Update step indicator
    document.querySelectorAll('.step-indicator .step').forEach((step, index) => {
      if (index + 1 === this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    
    // Update order summary when reaching step 4 (Review Order)
    if (this.currentStep === 4) {
      this.updateOrderSummary();
    }
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    
    if (prevBtn) {
      prevBtn.disabled = this.currentStep === 1;
    }
    
    if (nextBtn) {
      if (this.currentStep === 4) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'block';
        nextBtn.disabled = false;
      }
    }
  }


  showMessage(message, type = 'info') {
    // Disabled - no popups will be shown
    // Just log to console for debugging if needed
    console.log(`Message (${type}):`, message);
    return;
  }
}

// --- Header Cart Total & Drawer Wiring ---
(function setupHeaderCartSync() {
  function formatMoney(cents, format) {
    // Prefer Shopify formatter if present
    try {
      if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
        return Shopify.formatMoney(cents, format || (window.Shopify && Shopify.money_format) || window.galleryBuilderConfig?.moneyFormat || "{{amount}}")
      }
    } catch(e) {}

    var value = (parseInt(cents, 10) || 0) / 100;
    var formatString = (format || (window.Shopify && Shopify.money_format) || window.galleryBuilderConfig?.moneyFormat || "{{amount}}");

    function withDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ",";
      decimal = decimal || ".";
      precision = typeof precision === 'number' ? precision : 2;
      var parts = Number(number).toFixed(precision).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(precision > 0 ? decimal : '');
    }

    var formatMap = {
      amount: withDelimiters(value, 2, ",", "."),
      amount_no_decimals: withDelimiters(value, 0, ",", "."),
      amount_with_comma_separator: withDelimiters(value, 2, ".", ","),
      amount_no_decimals_with_comma_separator: withDelimiters(value, 0, ".", ","),
      amount_with_space_separator: withDelimiters(value, 2, " ", ","),
      amount_no_decimals_with_space_separator: withDelimiters(value, 0, " ", ",")
    };

    // Replace the first {{ token }} found in formatString
    return formatString.replace(/\{\{\s*([_a-zA-Z0-9]+)\s*\}\}/, function(_, token) {
      return formatMap[token] != null ? formatMap[token] : formatMap.amount;
    });
  }

  function updateHeaderFromCart(cart) {
    var totalEl = document.getElementById('cart-total-amount')
    var countEls = document.querySelectorAll('.thb-item-count')
    if (totalEl && typeof cart.total_price === 'number') {
      totalEl.textContent = formatMoney(cart.total_price, (window.Shopify && Shopify.money_format) || window.galleryBuilderConfig?.moneyFormat)
    }
    if (countEls && countEls.length) {
      countEls.forEach(function(el){ el.textContent = cart.item_count })
    }
  }

  async function fetchCartAndUpdate() {
    try {
      const res = await fetch('/cart.js', { credentials: 'same-origin' })
      const cart = await res.json()
      updateHeaderFromCart(cart)
    } catch (e) { /* ignore */ }
  }

  // Wire bag click to existing cart drawer
  document.addEventListener('click', function(e) {
    var tgt = e.target && e.target.closest && e.target.closest('#cart-drawer-toggle')
    if (tgt) {
      e.preventDefault()
      e.stopPropagation()
      // Use exact theme logic from app.js line 748-760
      console.log('Opening cart drawer using theme logic...');
      document.body.classList.add("open-cc");
      document.body.classList.add("open-cart");
      
      var cartDrawer = document.getElementById("Cart-Drawer");
      if (cartDrawer) {
        cartDrawer.classList.add("active");
        cartDrawer.focus();
        
        setTimeout(() => {
          var recommendations = cartDrawer.querySelector(".product-recommendations--full");
          if (recommendations) {
            recommendations.classList.add("active");
          }
        });
        
        dispatchCustomEvent("cart-drawer:open");
        console.log('Cart drawer opened successfully');
        
        // Force scroll wheel to work on cart drawer
        setTimeout(() => {
          var scrollContainer = cartDrawer.querySelector('.side-panel-content');
          if (scrollContainer) {
            scrollContainer.addEventListener('wheel', function(e) {
              e.stopPropagation();
              this.scrollTop += e.deltaY;
            }, { passive: false });
            console.log('Scroll wheel event added to cart drawer');
          }
        }, 100);
        
        return;
      }
      
      console.log('Cart drawer not found');
      // Theme drawer variants
      try {
        if (window.theme && window.theme.CartDrawer && typeof window.theme.CartDrawer.open === 'function') { window.theme.CartDrawer.open(); return }
        if (window.theme && window.theme.cartDrawer && typeof window.theme.cartDrawer.open === 'function') { window.theme.cartDrawer.open(); return }
      } catch(_) {}
      // EventHub fallback
      try { if (window.eventHub) { window.eventHub.$emit('toggleCart'); return } } catch(_) {}
      // Theme events commonly used
      try { document.dispatchEvent(new CustomEvent('cart:open')); } catch(_) {}
      try { document.dispatchEvent(new CustomEvent('theme:cart:open')); } catch(_) {}
      try { document.dispatchEvent(new CustomEvent('cart-drawer:open')); } catch(_) {}
      try { window.dispatchEvent(new CustomEvent('cart:open')); } catch(_) {}
      // Try clicking any theme toggle hooks
      try {
        var toggleEl = document.querySelector('[data-cart-toggle], [data-drawer="cart"], .cart-toggle');
        if (toggleEl) { toggleEl.click(); return }
      } catch(_) {}
      // Hard DOM fallback: force open common cart drawer containers
      try {
        var drawer = document.querySelector('.cart-drawer, .CartDrawer, #CartDrawer, #Cart-Drawer, [data-drawer="cart"]');
        if (drawer) {
          // Replicar comportamento do tema
          document.body.classList.add('open-cc');
          document.body.classList.add('open-cart');
          drawer.classList.add('active');
          drawer.classList.add('is-open');
          drawer.classList.add('cart-drawer--open');
          document.documentElement.classList.add('cart-drawer-open');
          document.body.classList.add('cart-drawer-open');
          try { if (typeof dispatchCustomEvent === 'function') dispatchCustomEvent('cart-drawer:open') } catch(_) {}
          try { document.dispatchEvent(new CustomEvent('cart-drawer:open')) } catch(_) {}
          var firstFocusable = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (firstFocusable) { try { firstFocusable.focus({preventScroll:true}); } catch(_) {} }
          return
        }
      } catch(_) {}

      // Do not redirect to /cart or checkout if drawer not found
      return
    }
  })

  // Initial fetch on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchCartAndUpdate)
  } else {
    fetchCartAndUpdate()
  }

  // Update after our add-to-cart success
  document.addEventListener('cart:updated', fetchCartAndUpdate)
  document.addEventListener('gallery:cart:updated', fetchCartAndUpdate)

  // Patch fetch to detect cart mutations
  var originalFetch = window.fetch
  if (originalFetch) {
    window.fetch = function() {
      var args = arguments
      return originalFetch.apply(this, args).then(function(resp){
        try {
          var url = args && args[0]
          if (typeof url === 'string' && (url.includes('/cart/add') || url.includes('/cart/change') || url.includes('/cart/update'))) {
            setTimeout(fetchCartAndUpdate, 75)
          }
        } catch(_) {}
        return resp
      })
    }
  }
})()

// Global function for HTML onclick
function startGalleryBuilder() {
  if (window.galleryBuilder) {
    window.galleryBuilder.startGalleryBuilder();
  }
}

// Mobile Detection Methods
GalleryWallBuilder.prototype.detectMobile = function() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768);
};

GalleryWallBuilder.prototype.detectPortrait = function() {
  return window.innerHeight > window.innerWidth;
};

GalleryWallBuilder.prototype.initMobileDetection = function() {
  if (!this.isMobile) return;

  this.bindMobileEvents();
  this.bindOrientationChange();
};

GalleryWallBuilder.prototype.bindOrientationChange = function() {
  // Listen for orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      this.checkForLandscapeFullscreen();
    }, 100);
  });
  
  // Listen for resize events (backup for orientation change)
  window.addEventListener('resize', () => {
    setTimeout(() => {
      this.checkForLandscapeFullscreen();
    }, 100);
  });
};

GalleryWallBuilder.prototype.bindMobileEvents = function() {
  // Fullscreen click handler
  const fullscreenOverlay = document.getElementById('mobileFullscreenOverlay');
  if (fullscreenOverlay) {
    fullscreenOverlay.addEventListener('click', () => {
      this.requestFullscreen();
    });
  }
  
  // Auto-trigger fullscreen when landscape overlay appears
  this.checkForLandscapeFullscreen();
  
  // Add touch event to trigger fullscreen
  this.addTouchFullscreenTrigger();
};

GalleryWallBuilder.prototype.addTouchFullscreenTrigger = function() {
  // Add touch event to canvas to trigger fullscreen
  const canvas = document.querySelector('.gallery-builder-canvas');
  if (canvas && this.isMobile) {
    canvas.addEventListener('touchstart', () => {
      // Small delay to allow touch to register
      setTimeout(() => {
        this.forceMobileFullscreen();
      }, 100);
    }, { once: true });
  }
};

GalleryWallBuilder.prototype.checkForLandscapeFullscreen = function() {
  if (!this.isMobile) return;
  
  // Check if we're in landscape mode
  const isLandscape = window.innerWidth > window.innerHeight;
  
  if (isLandscape) {
    // Auto-trigger fullscreen after a short delay
    setTimeout(() => {
      this.forceMobileFullscreen();
    }, 500);
  }
};

GalleryWallBuilder.prototype.bindMobileTouchEvents = function() {
  let startX, startY, initialX, initialY;
  let draggedElement = null;
  let isDragging = false;
  let touchStartTime = 0;
  let isProductItemActive = false;
  
  // Helper function to check if element is in protected zone
  const isInProtectedZone = (element) => {
    if (!element) return false;
    
    // Check for all problematic classes and elements
    const protectedSelectors = [
      '.product-item', '.gallery-builder-sidebar', '.builder-navigation', 
      '.layout-option', '.background-option', 
      '.frame-option', '.btn-nav', '.btn-add-to-gallery', '.filter-tab', '.filter-option', '.btn-next', 
      '.btn-prev', '.gallery-builder-header', '.gallery-builder-footer'
    ];
    
    for (const selector of protectedSelectors) {
      if (element.matches && element.matches(selector)) {
        return true;
      }
      if (element.closest && element.closest(selector)) {
        return true;
      }
    }
    
    // Check if element contains success message text
    const text = element.textContent || element.innerText || '';
    if (text.includes('product_added') || text.includes('Product added') || 
        text.includes('success') || text.includes('Message')) {
      return true;
    }
    
    return false;
  };

  // Touch start
  document.addEventListener('touchstart', (e) => {
    const target = e.target;
    
    // PRIORITY 1: Check if target is inside a scrollable container or builder-step FIRST
    const isScrollableContainer = target.closest('.background-options, .layout-options, .order-summary, .frame-selection-grid, .summary-items, .product-grid, .background-selection, .builder-step');
    
    if (isScrollableContainer) {
      // Reset product item active flag to allow scrolling
      isProductItemActive = false;
      return; // Allow natural scroll behavior - NO FRAME DRAGGING
    }
    
    // PRIORITY 1.5: Check if there's a selected frame and we're touching sidebar area
    const isInSidebar = target.closest('.gallery-builder-sidebar');
    const hasSelectedFrame = document.querySelector('.gallery-frame.selected');
    
    if (isInSidebar && hasSelectedFrame) {
      // Don't allow frame dragging when touching sidebar with selected frame
      isProductItemActive = false;
      return; // Allow natural scroll behavior - NO FRAME DRAGGING
    }
    
    // PRIORITY 2: Check if it's a gallery-frame (only if NOT in scrollable container)
    const isGalleryFrame = target.classList.contains('gallery-frame') || target.closest('.gallery-frame');
    const isProtected = isInProtectedZone(target);
    
    if (isGalleryFrame && !isProtected) {
      const frame = target.closest('.gallery-frame') || target;
      draggedElement = frame;
      isDragging = true;
      touchStartTime = Date.now();
      
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      
      // Get current position from computed styles
      const computedStyle = window.getComputedStyle(frame);
      initialX = parseFloat(computedStyle.left) || 0;
      initialY = parseFloat(computedStyle.top) || 0;
      
      // Add dragging class
      frame.classList.add('dragging');
      
      // Prevent default to avoid scrolling
      e.preventDefault();
      return;
    }
    
    // PRIORITY 3: If touching ANY protected element, block frame dragging but allow scroll
    if (isInProtectedZone(target)) {
      isProductItemActive = true;
      return; // Allow natural scroll behavior
    }
    
    // PRIORITY 4: If product-item or sidebar was recently active, block frame dragging
    if (isProductItemActive) {
      return; // Allow natural scroll behavior
    }
    
    // For all other cases, allow natural behavior
    return;
  }, { passive: false });

  // Touch move
  document.addEventListener('touchmove', (e) => {
    const target = e.target;
    
    // PRIORITY 1: If we're dragging a gallery-frame, handle the drag
    if (isDragging && draggedElement && draggedElement.classList.contains('gallery-frame')) {
      // CRITICAL: Check if current touch target is protected BEFORE processing drag
      const isCurrentTargetProtected = isInProtectedZone(target);
      const isCurrentTargetInSidebar = target.closest('.gallery-builder-sidebar');
      const hasSelectedFrame = document.querySelector('.gallery-frame.selected');
      
      if (isCurrentTargetProtected || (isCurrentTargetInSidebar && hasSelectedFrame)) {
        e.preventDefault(); // Prevent page scroll
        return; // Do not move the frame
      }
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      // Calculate new position
      const newX = initialX + deltaX;
      const newY = initialY + deltaY;
      
      // Get canvas boundaries
      const canvas = document.getElementById('gallery-canvas');
      const canvasRect = canvas.getBoundingClientRect();
      const frameRect = draggedElement.getBoundingClientRect();
      
      // Calculate constraints to keep frame within canvas
      const minX = 0;
      const minY = 0;
      const maxX = canvasRect.width - frameRect.width;
      const maxY = canvasRect.height - frameRect.height;
      
      // Apply constraints
      const constrainedX = Math.max(minX, Math.min(newX, maxX));
      const constrainedY = Math.max(minY, Math.min(newY, maxY));
      
      
      // Apply position directly with constraints
      draggedElement.style.left = constrainedX + 'px';
      draggedElement.style.top = constrainedY + 'px';
      
      // Prevent default to avoid scrolling
      e.preventDefault();
    } else {
      // Check if target is inside a scrollable container or builder-step
      const isScrollableContainer = target.closest('.background-options, .layout-options, .order-summary, .frame-selection-grid, .summary-items, .product-grid, .background-selection, .builder-step');
      
      if (isScrollableContainer) {
        // Allow natural scroll behavior
        return;
      }
      
      // Check if there's a selected frame and we're touching sidebar area
      const isInSidebar = target.closest('.gallery-builder-sidebar');
      const hasSelectedFrame = document.querySelector('.gallery-frame.selected');
      
      if (isInSidebar && hasSelectedFrame) {
        // Don't allow frame dragging when touching sidebar with selected frame
        return; // Allow natural scroll behavior
      }
      
      // ONLY prevent movement for product-item, NOT for builder-step scrolling
      if (e.target.closest('.product-item')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // For all other cases, allow natural behavior
      return;
    }
  }, { passive: false });

  // Touch end
  document.addEventListener('touchend', (e) => {
    const target = e.target;
    
    // Reset product-item active flag after a delay
    setTimeout(() => {
      isProductItemActive = false;
    }, 100);
    
    // PRIORITY 1: If touching ANY protected element, cancel any ongoing drag
    if (isInProtectedZone(target)) {
      if (isDragging && draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
        isDragging = false;
      }
      return;
    }
    
    if (isDragging && draggedElement) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      // Calculate final position
      const finalX = initialX + deltaX;
      const finalY = initialY + deltaY;
      
      // Get canvas boundaries for final position
      const canvas = document.getElementById('gallery-canvas');
      const canvasRect = canvas.getBoundingClientRect();
      const frameRect = draggedElement.getBoundingClientRect();
      
      // Calculate constraints to keep frame within canvas
      const minX = 0;
      const minY = 0;
      const maxX = canvasRect.width - frameRect.width;
      const maxY = canvasRect.height - frameRect.height;
      
      // Apply constraints to final position
      const constrainedFinalX = Math.max(minX, Math.min(finalX, maxX));
      const constrainedFinalY = Math.max(minY, Math.min(finalY, maxY));
      
      
      // Set final position with constraints
      draggedElement.style.left = constrainedFinalX + 'px';
      draggedElement.style.top = constrainedFinalY + 'px';
      
      // Update frame data for saving (convert to 640x400 coordinate system)
      const frameIndex = parseInt(draggedElement.dataset.frameIndex);
      if (this.galleryFrames[frameIndex]) {
        const savedX = (constrainedFinalX / canvasRect.width) * 640;
        const savedY = (constrainedFinalY / canvasRect.height) * 400;
        
        this.galleryFrames[frameIndex].data.x = savedX;
        this.galleryFrames[frameIndex].data.y = savedY;
        // Also update the root level x and y for consistency
        this.galleryFrames[frameIndex].x = savedX;
        this.galleryFrames[frameIndex].y = savedY;
      }
      
      // Remove dragging class
      draggedElement.classList.remove('dragging');
      
      // Reset
      draggedElement = null;
      isDragging = false;
    }
  });

  // Touch cancel (when touch is interrupted)
  document.addEventListener('touchcancel', (e) => {
    if (isDragging && draggedElement) {
      // Remove dragging class
      draggedElement.classList.remove('dragging');
      
      // Reset
      draggedElement = null;
      isDragging = false;
    }
  });
};

GalleryWallBuilder.prototype.requestFullscreen = function() {
  const element = document.documentElement;
  
  // Try fullscreen API first
  if (element.requestFullscreen) {
    element.requestFullscreen().catch(() => {
      this.forceMobileFullscreen();
    });
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.webkitEnterFullscreen) {
    element.webkitEnterFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else {
    this.forceMobileFullscreen();
  }

  // Hide overlay after fullscreen request
  const fullscreenOverlay = document.getElementById('mobileFullscreenOverlay');
  if (fullscreenOverlay) {
    fullscreenOverlay.style.display = 'none';
  }
};

GalleryWallBuilder.prototype.forceMobileFullscreen = function() {
  if (!this.isMobile) return;
  
  // Force hide address bar with multiple techniques
  setTimeout(() => {
    // Technique 1: Scroll to hide address bar
    window.scrollTo(0, 1);
    
    // Technique 2: Set viewport for full screen
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Technique 3: Add mobile fullscreen class
    document.body.classList.add('mobile-fullscreen');
    
    // Technique 4: Force viewport height
    document.documentElement.style.height = '100vh';
    document.body.style.height = '100vh';
    
    // Technique 5: Additional scroll after delay
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 100);
    
    // Technique 6: Try to trigger fullscreen programmatically
    this.triggerFullscreenProgrammatically();
    
  }, 50);
};

GalleryWallBuilder.prototype.triggerFullscreenProgrammatically = function() {
  // Try to trigger fullscreen by simulating user interaction
  const canvas = document.querySelector('.gallery-builder-canvas');
  if (canvas) {
    // Create a temporary click event
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    // Dispatch the event
    canvas.dispatchEvent(clickEvent);
    
    // Try fullscreen after click
    setTimeout(() => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Fallback: just hide address bar
          window.scrollTo(0, 1);
        });
      }
    }, 100);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.gallery-wall-builder')) {
    window.galleryBuilder = new GalleryWallBuilder();
  }
});

// Also try on window load
window.addEventListener('load', () => {
  setTimeout(() => {
    if (document.querySelector('.gallery-wall-builder') && !window.galleryBuilder) {
      window.galleryBuilder = new GalleryWallBuilder();
    }
  }, 500);
});

// Export for potential external use
window.GalleryWallBuilder = GalleryWallBuilder;



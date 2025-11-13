/**
 * Enhanced Shopify Analytics Integration
 * Sends detailed events and metrics directly to Shopify Analytics native dashboard
 */

class EnhancedShopifyAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.metrics = {
      pageViews: 0,
      stepsCompleted: 0,
      productsSelected: 0,
      cartAdditions: 0,
      totalValue: 0,
      sessionDuration: 0,
      completionRate: 0
    };
    
    this.init();
  }
  
  init() {
    this.trackPageView();
    this.setupEventListeners();
    this.startHeartbeat();
  }
  
  // Track Enhanced Page View
  trackPageView() {
    this.metrics.pageViews++;
    
    // Send to Shopify Analytics with enhanced data
    this.sendToShopifyAnalytics('gallery_page_view', {
      page_title: 'Gallery Wall Builder',
      page_url: window.location.href,
      session_id: this.sessionId,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      language: navigator.language,
      referrer: document.referrer,
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Custom Page',
      content_group3: 'Interactive Tool',
      page_type: 'gallery_wall_builder',
      custom_parameter_1: this.sessionId,
      custom_parameter_2: this.metrics.pageViews,
      custom_parameter_3: 'gallery_builder_page',
      custom_parameter_4: Date.now(),
      custom_parameter_5: this.metrics.pageViews
    });
    
    console.log('📊 Enhanced Gallery Page View tracked');
  }
  
  // Track Step Start with Enhanced Data
  trackStepStart(stepNumber, stepName) {
    const stepData = {
      event_type: 'gallery_step_start',
      step_number: stepNumber,
      step_name: stepName,
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Step Navigation',
      content_group3: `Step ${stepNumber}`,
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: stepNumber,
      custom_parameter_3: stepName,
      custom_parameter_4: Date.now() - this.startTime,
      custom_parameter_5: this.metrics.stepsCompleted
    };
    
    this.sendToShopifyAnalytics('gallery_step_start', stepData);
    
    console.log(`📊 Enhanced Gallery Step ${stepNumber} started:`, stepData);
  }
  
  // Track Step Complete with Enhanced Data
  trackStepComplete(stepNumber, stepName, stepData = {}) {
    this.metrics.stepsCompleted++;
    this.metrics.completionRate = (this.metrics.stepsCompleted / 5) * 100;
    
    const completeData = {
      event_type: 'gallery_step_complete',
      step_number: stepNumber,
      step_name: stepName,
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      steps_completed: this.metrics.stepsCompleted,
      completion_rate: this.metrics.completionRate,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Step Completion',
      content_group3: `Step ${stepNumber}`,
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: stepNumber,
      custom_parameter_3: stepName,
      custom_parameter_4: this.metrics.stepsCompleted,
      custom_parameter_5: this.metrics.completionRate,
      ...stepData
    };
    
    this.sendToShopifyAnalytics('gallery_step_complete', completeData);
    
    console.log(`📊 Enhanced Gallery Step ${stepNumber} completed:`, completeData);
  }
  
  // Track Product Selection with Enhanced Data
  trackProductSelect(productData) {
    this.metrics.productsSelected++;
    
    const productSelectData = {
      event_type: 'gallery_product_select',
      product_id: productData.id,
      product_title: productData.title,
      product_price: productData.price,
      product_size: productData.size,
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      current_step: this.getCurrentStep(),
      total_products_selected: this.metrics.productsSelected,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Product Selection',
      content_group3: 'Product Interaction',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: productData.id,
      custom_parameter_3: productData.title,
      custom_parameter_4: productData.price,
      custom_parameter_5: this.metrics.productsSelected
    };
    
    this.sendToShopifyAnalytics('gallery_product_select', productSelectData);
    
    console.log('📊 Enhanced Gallery Product selected:', productSelectData);
  }
  
  // Track Add to Cart with Enhanced Data
  trackAddToCart(cartData) {
    this.metrics.cartAdditions++;
    this.metrics.totalValue = cartData.total;
    
    const addToCartData = {
      event_type: 'gallery_add_to_cart',
      session_id: this.sessionId,
      timestamp: Date.now(),
      cart_total: cartData.total,
      items_count: cartData.items.length,
      products_selected: this.metrics.productsSelected,
      cart_additions: this.metrics.cartAdditions,
      session_duration: Date.now() - this.startTime,
      completion_rate: this.metrics.completionRate,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Cart Addition',
      content_group3: 'Conversion',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: cartData.total,
      custom_parameter_3: cartData.items.length,
      custom_parameter_4: this.metrics.productsSelected,
      custom_parameter_5: this.metrics.cartAdditions
    };
    
    this.sendToShopifyAnalytics('gallery_add_to_cart', addToCartData);
    
    // Enhanced e-commerce tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'EUR',
        value: cartData.total,
        page_type: 'gallery_wall_builder',
        content_group1: 'Gallery Wall Builder',
        content_group2: 'Cart Addition',
        content_group3: 'Conversion',
        custom_parameter_1: this.sessionId,
        custom_parameter_2: this.metrics.stepsCompleted,
        custom_parameter_3: this.metrics.productsSelected,
        custom_parameter_4: cartData.total,
        custom_parameter_5: this.metrics.cartAdditions,
        items: cartData.items.map(item => ({
          item_id: item.id,
          item_name: item.title,
          item_category: 'Gallery Wall',
          item_variant: item.variant,
          price: item.price,
          quantity: item.quantity
        }))
      });
    }
    
    console.log('📊 Enhanced Gallery items added to cart:', addToCartData);
  }
  
  // Track Purchase with Enhanced Data
  trackPurchase(purchaseData) {
    const purchaseEventData = {
      event_type: 'gallery_purchase',
      session_id: this.sessionId,
      timestamp: Date.now(),
      transaction_id: purchaseData.transactionId,
      total_value: purchaseData.total,
      items_count: purchaseData.items.length,
      session_duration: Date.now() - this.startTime,
      steps_completed: this.metrics.stepsCompleted,
      completion_rate: this.metrics.completionRate,
      gallery_completed: true,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Purchase',
      content_group3: 'Conversion',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: purchaseData.total,
      custom_parameter_3: purchaseData.items.length,
      custom_parameter_4: this.metrics.stepsCompleted,
      custom_parameter_5: this.metrics.completionRate
    };
    
    this.sendToShopifyAnalytics('gallery_purchase', purchaseEventData);
    
    // Enhanced e-commerce tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: purchaseData.transactionId,
        currency: 'EUR',
        value: purchaseData.total,
        page_type: 'gallery_wall_builder',
        content_group1: 'Gallery Wall Builder',
        content_group2: 'Purchase',
        content_group3: 'Conversion',
        custom_parameter_1: this.sessionId,
        custom_parameter_2: this.metrics.stepsCompleted,
        custom_parameter_3: this.metrics.productsSelected,
        custom_parameter_4: purchaseData.total,
        custom_parameter_5: this.metrics.cartAdditions,
        items: purchaseData.items.map(item => ({
          item_id: item.id,
          item_name: item.title,
          item_category: 'Gallery Wall',
          item_variant: item.variant,
          price: item.price,
          quantity: item.quantity
        }))
      });
    }
    
    console.log('📊 Enhanced Gallery purchase completed:', purchaseEventData);
  }
  
  // Send to Shopify Analytics
  sendToShopifyAnalytics(eventType, eventData) {
    // Method 1: Use Shopify's native analytics
    if (typeof ShopifyAnalytics !== 'undefined' && ShopifyAnalytics.record) {
      try {
        ShopifyAnalytics.record({
          schemaId: 'gallery_wall_builder_enhanced',
          payload: eventData
        });
      } catch (error) {
        console.warn('Shopify Analytics recording failed:', error);
      }
    }
    
    // Method 2: Use gtag for Shopify Plus
    if (typeof gtag !== 'undefined') {
      try {
        gtag('event', eventType, {
          page_type: eventData.page_type,
          content_group1: eventData.content_group1,
          content_group2: eventData.content_group2,
          content_group3: eventData.content_group3,
          custom_parameter_1: eventData.custom_parameter_1,
          custom_parameter_2: eventData.custom_parameter_2,
          custom_parameter_3: eventData.custom_parameter_3,
          custom_parameter_4: eventData.custom_parameter_4,
          custom_parameter_5: eventData.custom_parameter_5
        });
      } catch (error) {
        console.warn('gtag tracking failed:', error);
      }
    }
    
    // Method 3: Use dataLayer for GTM
    if (typeof dataLayer !== 'undefined') {
      try {
        dataLayer.push({
          event: eventType,
          page_type: eventData.page_type,
          content_group1: eventData.content_group1,
          content_group2: eventData.content_group2,
          content_group3: eventData.content_group3,
          gallery_session_id: eventData.session_id,
          gallery_step: eventData.step_number || 0,
          gallery_product_id: eventData.product_id || '',
          gallery_cart_total: eventData.cart_total || 0,
          gallery_items_count: eventData.items_count || 0
        });
      } catch (error) {
        console.warn('dataLayer tracking failed:', error);
      }
    }
    
    // Store event for later processing
    this.events.push(eventData);
  }
  
  // Detect Device Type
  detectDeviceType() {
    const width = window.innerWidth;
    if (width <= 480) return 'mobile';
    if (width <= 768) return 'tablet';
    if (width <= 1024) return 'laptop';
    return 'desktop';
  }
  
  // Detect Browser Type
  detectBrowserType() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }
  
  // Get Current Step
  getCurrentStep() {
    // This would need to be integrated with the gallery builder
    return 1;
  }
  
  // Setup Event Listeners
  setupEventListeners() {
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });
    
    // Track visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackSessionPause();
      } else {
        this.trackSessionResume();
      }
    });
  }
  
  // Start Heartbeat
  startHeartbeat() {
    setInterval(() => {
      this.trackSessionHeartbeat();
    }, 60000); // Every minute
  }
  
  // Track Session End
  trackSessionEnd() {
    this.metrics.sessionDuration = Date.now() - this.startTime;
    
    this.sendToShopifyAnalytics('gallery_session_end', {
      event_type: 'gallery_session_end',
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: this.metrics.sessionDuration,
      steps_completed: this.metrics.stepsCompleted,
      products_selected: this.metrics.productsSelected,
      cart_additions: this.metrics.cartAdditions,
      completion_rate: this.metrics.completionRate,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Session End',
      content_group3: 'Session Management',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: this.metrics.sessionDuration,
      custom_parameter_3: this.metrics.stepsCompleted,
      custom_parameter_4: this.metrics.productsSelected,
      custom_parameter_5: this.metrics.completionRate
    });
  }
  
  // Track Session Pause
  trackSessionPause() {
    this.sendToShopifyAnalytics('gallery_session_pause', {
      event_type: 'gallery_session_pause',
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      current_step: this.getCurrentStep(),
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Session Pause',
      content_group3: 'Session Management',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: Date.now() - this.startTime,
      custom_parameter_3: this.getCurrentStep(),
      custom_parameter_4: this.metrics.stepsCompleted,
      custom_parameter_5: this.metrics.productsSelected
    });
  }
  
  // Track Session Resume
  trackSessionResume() {
    this.sendToShopifyAnalytics('gallery_session_resume', {
      event_type: 'gallery_session_resume',
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      current_step: this.getCurrentStep(),
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Session Resume',
      content_group3: 'Session Management',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: Date.now() - this.startTime,
      custom_parameter_3: this.getCurrentStep(),
      custom_parameter_4: this.metrics.stepsCompleted,
      custom_parameter_5: this.metrics.productsSelected
    });
  }
  
  // Track Session Heartbeat
  trackSessionHeartbeat() {
    this.sendToShopifyAnalytics('gallery_session_heartbeat', {
      event_type: 'gallery_session_heartbeat',
      session_id: this.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.startTime,
      current_step: this.getCurrentStep(),
      steps_completed: this.metrics.stepsCompleted,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Session Heartbeat',
      content_group3: 'Session Management',
      device_type: this.detectDeviceType(),
      browser_type: this.detectBrowserType(),
      custom_parameter_1: this.sessionId,
      custom_parameter_2: Date.now() - this.startTime,
      custom_parameter_3: this.getCurrentStep(),
      custom_parameter_4: this.metrics.stepsCompleted,
      custom_parameter_5: this.metrics.productsSelected
    });
  }
  
  // Generate Session ID
  generateSessionId() {
    return 'gallery_enhanced_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get Enhanced Metrics
  getEnhancedMetrics() {
    return {
      ...this.metrics,
      sessionDuration: Date.now() - this.startTime,
      events: this.events.length,
      sessionId: this.sessionId
    };
  }
}

// Initialize Enhanced Analytics
window.enhancedShopifyAnalytics = new EnhancedShopifyAnalytics();

// Export for use in gallery builder
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedShopifyAnalytics;
}

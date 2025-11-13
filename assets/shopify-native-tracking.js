/**
 * Shopify Native Analytics Integration
 * Integrates with Shopify's native analytics system
 */

class ShopifyNativeTracking {
  constructor() {
    this.config = {
      debug: true,
      trackPageViews: true,
      trackEvents: true,
      trackEcommerce: true
    };
    
    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      currentStep: 1,
      pageViews: 0,
      events: []
    };
    
    this.init();
  }
  
  init() {
    this.trackPageView();
    this.setupEventListeners();
    this.initializeShopifyTracking();
  }
  
  // Initialize Shopify native tracking
  initializeShopifyTracking() {
    // Use Shopify's native analytics if available
    if (typeof ShopifyAnalytics !== 'undefined') {
      console.log('📊 Shopify Analytics detected');
      this.shopifyAnalytics = ShopifyAnalytics;
    }
    
    // Use Shopify's native tracking
    if (typeof ShopifyAnalytics !== 'undefined' && ShopifyAnalytics.record) {
      console.log('📊 Shopify Analytics recording available');
    }
  }
  
  // Track Page View using Shopify's native system
  trackPageView() {
    this.sessionData.pageViews++;
    
    // Use Shopify's native page tracking
    if (this.shopifyAnalytics && this.shopifyAnalytics.record) {
      try {
        this.shopifyAnalytics.record({
          schemaId: 'gallery_wall_builder_page_view',
          payload: {
            page_title: 'Gallery Wall Builder',
            page_url: window.location.href,
            page_type: 'gallery_wall_builder',
            session_id: this.sessionData.sessionId,
            timestamp: Date.now(),
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            content_group1: 'Gallery Wall Builder',
            content_group2: 'Custom Page'
          }
        });
      } catch (error) {
        console.warn('Shopify Analytics recording failed:', error);
      }
    }
    
    // Also use gtag if available (Shopify Plus)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_title: 'Gallery Wall Builder',
        page_location: window.location.href,
        page_type: 'gallery_wall_builder',
        content_group1: 'Gallery Wall Builder',
        content_group2: 'Custom Page',
        custom_parameter_1: 'gallery_wall_builder',
        custom_parameter_2: this.sessionData.sessionId
      });
    }
    
    // Use dataLayer for GTM
    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: 'gallery_page_view',
        page_type: 'gallery_wall_builder',
        content_group1: 'Gallery Wall Builder',
        content_group2: 'Custom Page',
        gallery_session_id: this.sessionData.sessionId
      });
    }
    
    if (this.config.debug) {
      console.log('📊 Gallery Wall Builder page view tracked');
    }
  }
  
  // Track Step Start
  trackStepStart(stepNumber, stepName) {
    this.sessionData.currentStep = stepNumber;
    
    const eventData = {
      event_type: 'gallery_step_start',
      step_number: stepNumber,
      step_name: stepName,
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.sessionData.startTime,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Step Navigation'
    };
    
    this.sendToShopifyAnalytics(eventData);
    
    if (this.config.debug) {
      console.log(`📊 Gallery Step ${stepNumber} started - ${stepName}`);
    }
  }
  
  // Track Step Complete
  trackStepComplete(stepNumber, stepName, stepData = {}) {
    const eventData = {
      event_type: 'gallery_step_complete',
      step_number: stepNumber,
      step_name: stepName,
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      session_duration: Date.now() - this.sessionData.startTime,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Step Completion',
      ...stepData
    };
    
    this.sendToShopifyAnalytics(eventData);
    
    if (this.config.debug) {
      console.log(`📊 Gallery Step ${stepNumber} completed - ${stepName}`, stepData);
    }
  }
  
  // Track Product Selection
  trackProductSelect(productData) {
    const eventData = {
      event_type: 'gallery_product_select',
      product_id: productData.id,
      product_title: productData.title,
      product_price: productData.price,
      product_size: productData.size,
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Product Selection'
    };
    
    this.sendToShopifyAnalytics(eventData);
    
    if (this.config.debug) {
      console.log('📊 Gallery Product selected:', productData);
    }
  }
  
  // Track Add to Cart
  trackAddToCart(cartData) {
    const eventData = {
      event_type: 'gallery_add_to_cart',
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      cart_total: cartData.total,
      items_count: cartData.items.length,
      session_duration: Date.now() - this.sessionData.startTime,
      page_type: 'gallery_wall_builder',
      content_group1: 'Gallery Wall Builder',
      content_group2: 'Cart Addition'
    };
    
    this.sendToShopifyAnalytics(eventData);
    
    // Enhanced e-commerce tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'EUR',
        value: cartData.total,
        page_type: 'gallery_wall_builder',
        content_group1: 'Gallery Wall Builder',
        content_group2: 'Cart Addition',
        items: cartData.items.map(item => ({
          item_id: item.id,
          item_name: item.title,
          item_category: 'Gallery Wall',
          price: item.price,
          quantity: item.quantity
        }))
      });
    }
    
    if (this.config.debug) {
      console.log('📊 Gallery items added to cart:', cartData);
    }
  }
  
  // Track Purchase
  trackPurchase(purchaseData) {
    const eventData = {
      event_type: 'purchase',
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      transaction_id: purchaseData.transactionId,
      total_value: purchaseData.total,
      items_count: purchaseData.items.length,
      session_duration: Date.now() - this.sessionData.startTime
    };
    
    this.sendToShopifyAnalytics(eventData);
    
    // Enhanced e-commerce tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: purchaseData.transactionId,
        currency: 'EUR',
        value: purchaseData.total,
        items: purchaseData.items.map(item => ({
          item_id: item.id,
          item_name: item.title,
          item_category: 'Gallery Wall',
          price: item.price,
          quantity: item.quantity
        }))
      });
    }
    
    if (this.config.debug) {
      console.log('📊 Purchase completed:', purchaseData);
    }
  }
  
  // Send to Shopify Analytics
  sendToShopifyAnalytics(eventData) {
    // Method 1: Use Shopify's native analytics
    if (this.shopifyAnalytics && this.shopifyAnalytics.record) {
      try {
        this.shopifyAnalytics.record({
          schemaId: 'gallery_wall_builder',
          payload: eventData
        });
      } catch (error) {
        console.warn('Shopify Analytics recording failed:', error);
      }
    }
    
    // Method 2: Use gtag for Shopify Plus
    if (typeof gtag !== 'undefined') {
      try {
        gtag('event', eventData.event_type, {
          custom_parameter_1: eventData.session_id,
          custom_parameter_2: eventData.step_number || 0,
          custom_parameter_3: eventData.product_id || '',
          custom_parameter_4: eventData.cart_total || 0,
          custom_parameter_5: eventData.items_count || 0
        });
      } catch (error) {
        console.warn('gtag tracking failed:', error);
      }
    }
    
    // Method 3: Use dataLayer for GTM
    if (typeof dataLayer !== 'undefined') {
      try {
        dataLayer.push({
          event: eventData.event_type,
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
    this.sessionData.events.push(eventData);
  }
  
  // Setup Event Listeners
  setupEventListeners() {
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackCustomEvent('session_end', {
        session_duration: Date.now() - this.sessionData.startTime,
        total_events: this.sessionData.events.length
      });
    });
  }
  
  // Track Custom Events
  trackCustomEvent(eventName, eventData = {}) {
    const fullEventData = {
      event_type: eventName,
      session_id: this.sessionData.sessionId,
      timestamp: Date.now(),
      ...eventData
    };
    
    this.sendToShopifyAnalytics(fullEventData);
    
    if (this.config.debug) {
      console.log(`📊 Custom event - ${eventName}:`, eventData);
    }
  }
  
  // Generate Session ID
  generateSessionId() {
    return 'gallery_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get Session Data
  getSessionData() {
    return {
      ...this.sessionData,
      currentTime: Date.now(),
      sessionDuration: Date.now() - this.sessionData.startTime
    };
  }
}

// Initialize tracking
window.shopifyNativeTracking = new ShopifyNativeTracking();

// Export for use in gallery builder
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopifyNativeTracking;
}

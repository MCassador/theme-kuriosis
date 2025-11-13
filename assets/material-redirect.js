/**
 * Material Redirect Handler
 * Redirects to product page when material button is clicked, using metafields
 */
(function() {
  'use strict';

  function initMaterialRedirect() {
    console.log('🔍 Material Redirect: Initializing...');
    console.log('🔍 Current URL:', window.location.href);
    
    // Find all material option labels - try multiple selectors
    let allMaterialLabels = document.querySelectorAll('.material-option-box[data-material-name]');
    
    if (allMaterialLabels.length === 0) {
      allMaterialLabels = document.querySelectorAll('label.material-option-box');
    }
    
    if (allMaterialLabels.length === 0) {
      allMaterialLabels = document.querySelectorAll('label[data-material-name]');
    }
    
    console.log('🔍 Material Redirect: Found', allMaterialLabels.length, 'material labels');
    
    if (allMaterialLabels.length === 0) {
      console.warn('⚠️ Material Redirect: No material labels found!');
      console.warn('   Searching for any .material-option-box:', document.querySelectorAll('.material-option-box').length);
      return;
    }
    
    // Log all material labels for debugging
    allMaterialLabels.forEach(function(label, idx) {
      const materialName = label.getAttribute('data-material-name');
      const productUrl = label.getAttribute('data-material-product-url');
      const hasUrlAttr = label.hasAttribute('data-material-product-url');
      console.log(`  [${idx}] Material: "${materialName}" | URL: ${productUrl || 'NOT FOUND'} | Has attr: ${hasUrlAttr}`);
      // Debug: Show full HTML of label to see what's actually rendered
      if (!productUrl) {
        console.log(`  [${idx}] DEBUG - Label HTML:`, label.outerHTML.substring(0, 200));
      }
    });

    allMaterialLabels.forEach(function(label, index) {
      // Get the associated radio input
      const labelFor = label.getAttribute('for');
      const radioInput = labelFor ? document.getElementById(labelFor) : null;
      let productUrl = label.getAttribute('data-material-product-url');
      const materialName = label.getAttribute('data-material-name');
      
      console.log(`🔍 Material Redirect [${index}]:`, {
        materialName: materialName,
        productUrl: productUrl || 'MISSING - Will try to find via API',
        labelFor: labelFor,
        hasRadioInput: !!radioInput
      });
      
      if (!radioInput) {
        console.warn('⚠️ Material Redirect: No radio input found for label:', labelFor);
        return;
      }
      
      // If no URL in attribute, try to find product via Shopify API
      if (!productUrl || productUrl.trim() === '') {
        console.log('🔍 Material Redirect: No URL in attribute, attempting to find product via metafields...');
        // We'll handle this in the click handler
      }
      
      // Remove any existing listeners to avoid duplicates
      const newLabel = label.cloneNode(true);
      label.parentNode.replaceChild(newLabel, label);
      
      // Get fresh reference to radio input after clone
      const newRadioInput = labelFor ? document.getElementById(labelFor) : null;
      
      // Add click handler to label - ONLY if URL is configured
      // If no URL attribute, skip adding the redirect handler entirely
      const hasRedirectUrl = newLabel.hasAttribute('data-material-product-url') && 
                             newLabel.getAttribute('data-material-product-url') && 
                             newLabel.getAttribute('data-material-product-url').trim() !== '';
      
      if (!hasRedirectUrl) {
        console.log(`⏭️ Material Redirect: Skipping "${materialName}" - no metafield configured`);
        return; // Don't add click handler if no URL
      }
      
      newLabel.addEventListener('click', function(e) {
        let url = newLabel.getAttribute('data-material-product-url');
        const matName = newLabel.getAttribute('data-material-name');
        
        console.log('🖱️ Material Redirect: Click detected on material:', matName);
        console.log('  - Product URL from attribute:', url);
        
        // Double check URL exists (should always be true here, but safety check)
        if (!url || url.trim() === '') {
          console.warn('⚠️ Material Redirect: URL missing unexpectedly');
          return; // Let normal behavior happen
        }
        
        // Check if this material is already selected (check at click time)
        const isCurrentlySelected = newRadioInput ? newRadioInput.checked : false;
        
        // Get current page URL (without query parameters)
        const currentUrl = window.location.pathname;
        const targetUrl = url.startsWith('/') ? url : '/' + url;
        
        console.log('  - Currently selected:', isCurrentlySelected);
        console.log('  - Current URL:', currentUrl);
        console.log('  - Target URL:', targetUrl);
        
        // Only redirect if:
        // 1. The material is not already selected, AND
        // 2. The target URL is different from current URL
        if (!isCurrentlySelected && targetUrl !== currentUrl) {
          console.log('✅ Material Redirect: Redirecting to', url);
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Prevent the radio button from being checked
          if (newRadioInput) {
            newRadioInput.checked = false;
          }
          
          // Redirect to the product page
          window.location.href = url;
          return false;
        } else {
          if (isCurrentlySelected) {
            console.log('⏭️ Material Redirect: Skipping redirect (material already selected)');
          } else {
            console.log('⏭️ Material Redirect: Skipping redirect (same URL)');
          }
        }
      }, true); // Use capture phase to intercept before default behavior
    });
    
    console.log('✅ Material Redirect: Initialization complete');
  }

  // Initialize when DOM is ready - try multiple times to ensure it runs
  function tryInit() {
    try {
      initMaterialRedirect();
    } catch (error) {
      console.error('❌ Material Redirect Error:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    // DOM already loaded, try immediately and also after a delay
    tryInit();
    setTimeout(tryInit, 500); // Try again after 500ms
    setTimeout(tryInit, 1000); // Try again after 1s
  }

  // Also initialize after dynamic content loads (for AJAX navigation)
  document.addEventListener('shopify:section:load', tryInit);
  
  // Force initialization on window load as well
  window.addEventListener('load', function() {
    setTimeout(tryInit, 200);
  });
})();


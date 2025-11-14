/**
 * Material Redirect Handler
 * Redirects to product page when material button is clicked, using metafields
 */
(function() {
  'use strict';

  function initMaterialRedirect() {
    // Find all material option labels - try multiple selectors
    let allMaterialLabels = document.querySelectorAll('.material-option-box[data-material-name]');
    
    if (allMaterialLabels.length === 0) {
      allMaterialLabels = document.querySelectorAll('label.material-option-box');
    }
    
    if (allMaterialLabels.length === 0) {
      allMaterialLabels = document.querySelectorAll('label[data-material-name]');
    }
    
    if (allMaterialLabels.length === 0) {
      return;
    }

    allMaterialLabels.forEach(function(label, index) {
      // Get the associated radio input
      const labelFor = label.getAttribute('for');
      const radioInput = labelFor ? document.getElementById(labelFor) : null;
      let productUrl = label.getAttribute('data-material-product-url');
      const materialName = label.getAttribute('data-material-name');
      
      if (!radioInput) {
        return;
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
        return; // Don't add click handler if no URL
      }
      
      newLabel.addEventListener('click', function(e) {
        let url = newLabel.getAttribute('data-material-product-url');
        
        // Double check URL exists (should always be true here, but safety check)
        if (!url || url.trim() === '') {
          return; // Let normal behavior happen
        }
        
        // Check if this material is already selected (check at click time)
        const isCurrentlySelected = newRadioInput ? newRadioInput.checked : false;
        
        // Get current page URL (without query parameters)
        const currentUrl = window.location.pathname;
        const targetUrl = url.startsWith('/') ? url : '/' + url;
        
        // Only redirect if:
        // 1. The material is not already selected, AND
        // 2. The target URL is different from current URL
        if (!isCurrentlySelected && targetUrl !== currentUrl) {
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
        }
      }, true); // Use capture phase to intercept before default behavior
    });
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

  // ========== PRODUCT TYPE BUTTONS HANDLER (Stretched Canvas / Art Print) ==========
  function initProductTypeButtons() {
    // Find all product type buttons (Stretched Canvas and Art Print)
    const productTypeButtons = document.querySelectorAll('.product-type-button[data-product-type-url]');
    
    if (productTypeButtons.length === 0) {
      return;
    }
    
    const currentUrl = window.location.pathname;
    
    // Get current product handle from URL
    const currentHandleFromUrl = currentUrl.split('/products/').pop() || '';
    const currentHandle = currentHandleFromUrl.split('?')[0].toLowerCase();
    
    // Determine which button should be selected based on current product handle
    let selectedButton = null;
    
    productTypeButtons.forEach(function(button) {
      const productType = button.getAttribute('data-product-type') || '';
      
      // Simple logic: check if current handle matches the product type
      const isStretchedCanvas = currentHandle.includes('stretched') || currentHandle.includes('framed-canvas') || 
                                currentHandle.includes('canvas');
      const isArtPrint = currentHandle.includes('art-print') || currentHandle.includes('original') || 
                        (!isStretchedCanvas && (currentHandle.includes('art') || currentHandle.includes('print')));
      
      // Mark button if it matches current product type
      if (productType === 'stretched-canvas' && isStretchedCanvas) {
        selectedButton = button;
      } else if (productType === 'art-print' && isArtPrint) {
        selectedButton = button;
      }
    });
    
    // Second pass: apply selection (only one button should be selected)
    productTypeButtons.forEach(function(button) {
      const labelFor = button.getAttribute('for');
      const radioInput = labelFor ? document.getElementById(labelFor) : null;
      const isSelected = button === selectedButton;
      
      if (isSelected) {
        if (radioInput) {
          radioInput.checked = true;
        }
        button.classList.add('selected');
      } else {
        if (radioInput) {
          radioInput.checked = false;
        }
        button.classList.remove('selected');
      }
    });
    
    // Third pass: set up click handlers
    productTypeButtons.forEach(function(button) {
      const labelFor = button.getAttribute('for');
      
      // Remove any existing listeners to avoid duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Get fresh reference after clone
      const newRadioInput = labelFor ? document.getElementById(labelFor) : null;
      
      // Add click handler
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const url = newButton.getAttribute('data-product-type-url');
        const targetUrl = url.startsWith('/') ? url : '/' + url;
        const currentUrl = window.location.pathname;
        
        // Only redirect if target URL is different from current URL
        if (targetUrl !== currentUrl) {
          // Add parameter to indicate we came from product type button
          const separator = url.includes('?') ? '&' : '?';
          window.location.href = url + separator + 'from=product-type';
        }
      }, true);
    });
  }

  // Initialize Product Type buttons
  function tryInitProductType() {
    try {
      initProductTypeButtons();
    } catch (error) {
      console.error('❌ Product Type Button Error:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitProductType);
  } else {
    tryInitProductType();
    setTimeout(tryInitProductType, 500);
    setTimeout(tryInitProductType, 1000);
  }

  // Also initialize after dynamic content loads
  document.addEventListener('shopify:section:load', tryInitProductType);
  
  window.addEventListener('load', function() {
    setTimeout(tryInitProductType, 200);
  });
})();


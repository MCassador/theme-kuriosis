/**
 * Gallery Wall Combo Editable - JavaScript
 * Funcionalidade igual ao Desenio
 */

class GalleryWallComboEditable {
  constructor() {
    this.config = window.galleryWallComboConfig || {};
    this.selectedVariants = new Map(); // Map<productId, variantId>
    this.selectedFrames = new Map(); // Map<productId, {frameId, frameVariantId, framePrice, frameHandle}>
    this.init();
  }
  
  // Helper: Normaliza productId para número (garante consistência no Map)
  normalizeProductId(productId) {
    if (typeof productId === 'string') {
      const num = parseInt(productId);
      return isNaN(num) ? productId : num;
    }
    return productId;
  }
  
  // Helper: Busca frame com productId normalizado
  getSelectedFrame(productId) {
    const normalized = this.normalizeProductId(productId);
    return this.selectedFrames.get(normalized) || this.selectedFrames.get(productId);
  }
  
  // Helper: Armazena frame com productId normalizado
  setSelectedFrame(productId, frameData) {
    const normalized = this.normalizeProductId(productId);
    this.selectedFrames.set(normalized, frameData);
    // Também armazena com o ID original caso seja diferente
    if (normalized !== productId) {
      this.selectedFrames.set(productId, frameData);
    }
  }
  
  // Helper: Remove frame com productId normalizado
  deleteSelectedFrame(productId) {
    const normalized = this.normalizeProductId(productId);
    this.selectedFrames.delete(normalized);
    this.selectedFrames.delete(productId);
  }

  init() {
    // Limpa valores de preço iniciais que podem ter HTML
    this.cleanInitialPrices();
    
    // Garante que a imagem principal não está duplicada
    this.ensureSingleMainImage();
    
    this.setupTabs();
    this.setupProductOptions();
    this.updateIncludedCount();
    this.updateSubtotal();
    this.setupAddToCart();
    this.setupBuyAll();
    
    // Garante que os botões individuais sejam inicializados após um pequeno delay
    // para que as variantes já estejam selecionadas
    setTimeout(() => {
      this.setupIndividualAddToCartButtons();
    }, 200);
    
    // Atualiza aba BUY ALL inicialmente
    this.updateBuyAllTab();
  }
  
  // Garante que há apenas uma imagem principal (remove duplicatas)
  ensureSingleMainImage() {
    const mainImageContainer = document.querySelector('.combo-main-image');
    if (!mainImageContainer) return;
    
    // Busca todas as imagens dentro do container
    const allImages = mainImageContainer.querySelectorAll('img');
    
    if (allImages.length > 1) {
      console.log(`🗑️ Encontradas ${allImages.length} imagens principais, removendo duplicatas...`);
      
      // Mantém apenas a primeira imagem (a correta)
      const mainImage = mainImageContainer.querySelector('#combo-main-image') || allImages[0];
      
      // Remove todas as outras
      allImages.forEach(img => {
        if (img !== mainImage) {
          img.remove();
          console.log(`🗑️ Imagem principal duplicada removida: ${img.src}`);
        }
      });
    }
    
    // Garante que a imagem principal tem a classe correta
    const mainImg = mainImageContainer.querySelector('#combo-main-image');
    if (mainImg && !mainImg.classList.contains('combo-main-image-img')) {
      mainImg.classList.add('combo-main-image-img');
    }
    
    // Observa mudanças no DOM para detectar duplicações dinâmicas (editor do Shopify)
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        const currentImages = mainImageContainer.querySelectorAll('img');
        if (currentImages.length > 1) {
          console.log(`🗑️ Duplicação detectada dinamicamente, removendo...`);
          const mainImage = mainImageContainer.querySelector('#combo-main-image') || currentImages[0];
          currentImages.forEach(img => {
            if (img !== mainImage) {
              img.remove();
            }
          });
        }
      });
      
      observer.observe(mainImageContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  // Limpa valores de preço iniciais que podem ter HTML
  cleanInitialPrices() {
    // Limpa todos os elementos de preço
    const priceElements = document.querySelectorAll('.price-amount, .combo-product-button-price, .subtotal-amount, #buy-all-subtotal');
    priceElements.forEach(element => {
      if (element) {
        const text = element.textContent || element.innerText || '';
        const cleanText = this.stripHtml(text);
        // Só atualiza se o texto foi limpo (tinha HTML)
        if (cleanText !== text) {
          element.textContent = cleanText;
        }
      }
    });
  }

  // Setup Tabs
  setupTabs() {
    const tabs = document.querySelectorAll('.combo-tab');
    const tabContents = document.querySelectorAll('.combo-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Remove active de todos
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Adiciona active no selecionado
        tab.classList.add('active');
        const targetContent = document.getElementById(`tab-${targetTab}`);
        if (targetContent) {
          targetContent.classList.add('active');
          
          // Se for a aba BUY ALL, atualiza para mostrar frames selecionados
          if (targetTab === 'buy-all') {
            this.updateBuyAllTab();
          }
        }
      });
    });
  }

  // Setup opções de produto (Size, Material, Frame)
  setupProductOptions() {
    const selects = document.querySelectorAll('.combo-option-select');
    
    console.log(`🔧 Setup Product Options: ${selects.length} selects encontrados`);
    
    selects.forEach(select => {
      // Inicializa com primeira opção
      const productId = parseInt(select.dataset.productId);
      const optionPosition = parseInt(select.dataset.optionPosition);
      const optionType = select.dataset.optionType; // 'framing' ou undefined
      
      console.log(`   Select - Product: ${productId}, Option Position: ${optionPosition}, Option Type: ${optionType}, Value: ${select.value}`);
      
      // Se for framing, aplica a imagem do frame (só se não for vazio)
      if (optionType === 'framing') {
        const frameValue = select.value;
        // Se for vazio ou "No Frame", remove o frame
        if (!frameValue || frameValue === '' || frameValue.toLowerCase() === 'no frame') {
          console.log(`   ✅ FRAMING - removendo frame (valor vazio)`);
          this.removeFrameFromProduct(productId);
        } else {
          console.log(`   ✅ Detectado como FRAMING - aplicando frame: ${frameValue}`);
          // Busca frame handle se disponível
          const selectedOption = select.options[select.selectedIndex];
          const frameHandle = selectedOption?.dataset.frameHandle || null;
          const frameName = select.value;
          
          // Usa handle se disponível, senão usa o nome
          const frameIdentifier = frameHandle || frameName;
          console.log(`   Frame identifier: ${frameIdentifier} (handle: ${frameHandle}, name: ${frameName})`);
          
          this.applyFrameToProduct(productId, frameIdentifier);
        }
      } else {
        this.updateVariant(productId, optionPosition, select.value);
      }

      select.addEventListener('change', () => {
        console.log(`   🔄 Select mudou - Product: ${productId}, Option Type: ${optionType}, New Value: ${select.value}`);
        
        // Se for framing, aplica a imagem do frame (só se não for vazio)
        if (optionType === 'framing') {
          const frameValue = select.value;
          // Se for vazio ou "No Frame", remove o frame
          if (!frameValue || frameValue === '' || frameValue.toLowerCase() === 'no frame') {
            console.log(`   ✅ Mudança em FRAMING - removendo frame (valor vazio)`);
            this.removeFrameFromProduct(productId);
            // Atualiza aba BUY ALL após remover frame
            setTimeout(() => this.updateBuyAllTab(), 200);
          } else {
            console.log(`   ✅ Mudança em FRAMING - aplicando frame: ${frameValue}`);
            // Busca frame handle se disponível
            const selectedOption = select.options[select.selectedIndex];
            const frameHandle = selectedOption?.dataset.frameHandle || null;
            const frameId = selectedOption?.dataset.frameId || null;
            const frameName = select.value;
            
            // Usa handle se disponível, senão usa o nome
            const frameIdentifier = frameHandle || frameName;
            console.log(`   Frame identifier: ${frameIdentifier} (handle: ${frameHandle}, id: ${frameId}, name: ${frameName})`);
            
            this.applyFrameToProduct(productId, frameIdentifier, frameId, frameHandle);
            // Atualiza aba BUY ALL após aplicar frame
            setTimeout(() => this.updateBuyAllTab(), 200);
          }
        } else {
          this.updateVariant(productId, optionPosition, select.value);
          // updateVariant já atualiza o preço, só precisa atualizar subtotal
          this.updateSubtotal();
          // Atualiza preço no botão individual também
          this.updateIndividualButtonPrice(productId);
          
          // Se mudou Material, atualiza preços no select de Size
          const optionGroup = select.closest('.combo-option-group');
          if (optionGroup) {
            const label = optionGroup.querySelector('.combo-option-label');
            if (label && label.textContent.trim().toUpperCase() === 'MATERIAL') {
              this.updateSizeSelectPrices(productId);
            }
          }
          
          // Atualiza aba BUY ALL quando opções mudam
          this.updateBuyAllTab();
        }
      });
    });

    // Inicializa botões Add to Cart individuais
    this.setupIndividualAddToCartButtons();
  }

  // Atualiza preços no select de Size quando Material muda
  updateSizeSelectPrices(productId) {
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
    if (!productItem) return;
    
    const allVariantsData = productItem.dataset.allVariants;
    if (!allVariantsData) return;
    
    // Pega o material selecionado
    const materialSelect = productItem.querySelector('.combo-option-select[data-product-id="' + productId + '"]');
    let selectedMaterial = null;
    
    // Encontra o select de Material
    const allSelects = productItem.querySelectorAll('.combo-option-select[data-product-id="' + productId + '"]');
    allSelects.forEach(select => {
      const optionGroup = select.closest('.combo-option-group');
      if (optionGroup) {
        const label = optionGroup.querySelector('.combo-option-label');
        if (label && label.textContent.trim().toUpperCase() === 'MATERIAL') {
          selectedMaterial = select.value;
        }
      }
    });
    
    if (!selectedMaterial) return;
    
    // Pega o select de Size
    const sizeSelect = productItem.querySelector('.combo-option-select-size[data-product-id="' + productId + '"]');
    if (!sizeSelect) return;
    
    // Parse variants
    const variants = allVariantsData.split(';');
    const normalizedMaterial = this.normalizeMaterialName(selectedMaterial);
    
    // Atualiza cada opção do select de Size
    Array.from(sizeSelect.options).forEach(option => {
      const sizeValue = option.value;
      const normalizedSize = this.normalizeSize(sizeValue);
      
      // Encontra a variante correspondente para este tamanho e material
      for (const variantEntry of variants) {
        if (!variantEntry) continue;
        
        const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
        if (!sizeAndMaterial || !priceAndId) continue;
        
        const [size, mat] = sizeAndMaterial.split('|');
        const [price, variantId] = priceAndId.split('|');
        
        const normalizedVariantSize = this.normalizeSize(size);
        const normalizedVariantMaterial = this.normalizeMaterialName(mat);
        
        // Match: compara size e material
        const sizeMatch = normalizedVariantSize === normalizedSize;
        const materialMatch = normalizedVariantMaterial === normalizedMaterial || 
                           normalizedVariantMaterial.includes(normalizedMaterial) ||
                           normalizedMaterial.includes(normalizedVariantMaterial);
        
        if (sizeMatch && materialMatch) {
          // Atualiza o texto da opção com o preço
          const priceInCents = Math.round(parseFloat(price) * 100);
          const formattedPrice = this.formatMoney(priceInCents);
          option.textContent = `${sizeValue} - ${formattedPrice}`;
          option.dataset.sizePrice = formattedPrice;
          break;
        }
      }
    });
  }

  // Atualiza preço no botão individual
  updateIndividualButtonPrice(productId) {
    const productIdNum = this.normalizeProductId(productId);
    
    const buttonPriceElement = document.querySelector(`.combo-product-button-price[data-product-id="${productIdNum}"]`);
    
    if (!buttonPriceElement) {
      console.warn(`⚠️ Botão de preço não encontrado para produto ${productIdNum}`);
      return;
    }
    
    // Se tem frame selecionado, recalcula o total (produto + frame)
    const selectedFrame = this.getSelectedFrame(productId);
    
    console.log(`🔍 updateIndividualButtonPrice - ProductId: ${productIdNum} (tipo: ${typeof productIdNum})`);
    console.log(`   SelectedFrame do Map:`, selectedFrame);
    console.log(`   Todos os frames armazenados:`, Array.from(this.selectedFrames.entries()));
    
    if (selectedFrame && selectedFrame.framePrice) {
      console.log(`   ✅ Frame encontrado! FramePrice: ${selectedFrame.framePrice}`);
      
      // Tem frame - precisa calcular produto + frame
      // Tenta múltiplos métodos para encontrar o preço do produto
      let productPrice = 0;
      
      // Método 1: Busca da variante selecionada (PRIORIDADE MÁXIMA)
      const variantId = this.selectedVariants.get(productIdNum) || this.selectedVariants.get(productId);
      console.log(`   VariantId: ${variantId}`);
      
      if (variantId) {
        // Tenta buscar do config primeiro
        const product = this.config.products?.find(p => p.id === productIdNum || p.id === productId);
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          if (variant) {
            productPrice = variant.price;
            console.log(`   ✅ Preço do produto encontrado da variante no config: ${this.formatMoney(productPrice)}`);
          }
        }
        
        // Se não encontrou no config, tenta buscar do data-all-variants (MAIS CONFIÁVEL)
        if (productPrice === 0) {
          const productItem = document.querySelector(`.combo-product-item[data-product-id="${productIdNum}"]`);
          if (productItem && productItem.dataset.allVariants) {
            const allVariantsData = productItem.dataset.allVariants;
            const variants = allVariantsData.split(';');
            
            for (const variantEntry of variants) {
              if (!variantEntry) continue;
              const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
              if (!priceAndId) continue;
              const [price, vId] = priceAndId.split('|');
              
              if (vId === variantId.toString()) {
                const priceInCents = Math.round(parseFloat(price) * 100);
                productPrice = priceInCents;
                console.log(`   ✅ Preço do produto encontrado do data-all-variants: ${this.formatMoney(productPrice)}`);
                break;
              }
            }
          }
        }
        
        if (productPrice === 0) {
          console.warn(`   ⚠️ Variante ${variantId} não encontrada, tentando outros métodos...`);
        }
      } else {
        console.warn(`   ⚠️ VariantId não encontrado para produto ${productIdNum}, tentando outros métodos...`);
      }
      
      // Método 2: Se não encontrou da variante, tenta buscar do select de tamanho (tem o preço atualizado)
      if (productPrice === 0) {
        const productItem = document.querySelector(`.combo-product-item[data-product-id="${productIdNum}"]`);
        if (productItem) {
          const sizeSelect = productItem.querySelector('.combo-option-select-size');
          if (sizeSelect && sizeSelect.selectedIndex >= 0) {
            const optionText = sizeSelect.options[sizeSelect.selectedIndex]?.text || '';
            // Tenta extrair preço do texto (ex: "S - 29.7 x 42cm (A3) - €29,99")
            const priceMatch = optionText.match(/€[\d,]+/);
            if (priceMatch) {
              const priceStr = priceMatch[0].replace('€', '').replace(',', '.');
              productPrice = Math.round(parseFloat(priceStr) * 100);
              console.log(`   ✅ Preço do produto encontrado do select: ${this.formatMoney(productPrice)}`);
            }
          }
        }
      }
      
      // Método 3: Último recurso - busca do DOM (pode estar desatualizado)
      if (productPrice === 0) {
        const priceElement = document.querySelector(`.price-amount[data-product-id="${productIdNum}"]`);
        if (priceElement) {
          const priceText = priceElement.textContent || priceElement.innerText || '';
          const cleanPrice = this.stripHtml(priceText);
          // Extrai número do preço formatado (ex: "€29,99" -> 2999 centavos)
          const priceMatch = cleanPrice.match(/[\d,]+/);
          if (priceMatch) {
            const priceStr = priceMatch[0].replace(',', '.');
            productPrice = Math.round(parseFloat(priceStr) * 100);
            console.log(`   ⚠️ Preço do produto encontrado do elemento DOM (pode estar desatualizado): ${this.formatMoney(productPrice)}`);
          }
        }
      }
      
      // Se encontrou preço do produto, adiciona o frame
      if (productPrice > 0) {
        const totalPrice = productPrice + selectedFrame.framePrice;
        buttonPriceElement.textContent = this.formatMoney(totalPrice);
        console.log(`✅ updateIndividualButtonPrice: Produto ${productIdNum}, Total com frame: ${this.formatMoney(totalPrice)} (Produto: ${this.formatMoney(productPrice)} + Frame: ${this.formatMoney(selectedFrame.framePrice)})`);
        return;
      } else {
        console.warn(`   ⚠️ Não foi possível encontrar preço do produto, mas frame está selecionado. Usando apenas frame...`);
        // Último recurso: mostra apenas o preço do frame
        buttonPriceElement.textContent = this.formatMoney(selectedFrame.framePrice);
        console.log(`✅ updateIndividualButtonPrice: Produto ${productIdNum}, Apenas frame (produto não encontrado): ${this.formatMoney(selectedFrame.framePrice)}`);
        return;
      }
    } else {
      console.warn(`   ⚠️ Frame não encontrado ou framePrice não definido. SelectedFrame:`, selectedFrame);
    }
    
    // Sem frame - usa o preço do elemento price-amount ou da variante
    const priceElement = document.querySelector(`.price-amount[data-product-id="${productIdNum}"]`);
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText || '';
      const cleanPrice = this.stripHtml(priceText);
      buttonPriceElement.textContent = cleanPrice;
      console.log(`✅ updateIndividualButtonPrice: Produto ${productIdNum}, Sem frame (fallback): ${cleanPrice}`);
    } else {
      // Fallback: busca preço da variante
      const variantId = this.selectedVariants.get(productId);
      if (variantId) {
        const product = this.config.products?.find(p => p.id === productId);
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          if (variant) {
            buttonPriceElement.textContent = this.formatMoney(variant.price);
            console.log(`✅ updateIndividualButtonPrice: Produto ${productId}, Fallback variante: ${this.formatMoney(variant.price)}`);
          }
        }
      }
    }
  }

  // Setup botões Add to Cart individuais
  setupIndividualAddToCartButtons() {
    const buttons = document.querySelectorAll('.combo-product-add-to-cart');
    
    buttons.forEach(button => {
      // Remove listener antigo se existir para evitar duplicação
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Adiciona listener apenas uma vez
      newButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Previne propagação do evento
        
        // Previne múltiplos cliques enquanto está processando
        if (newButton.classList.contains('loading') || newButton.disabled) {
          return;
        }
        
        const productId = parseInt(newButton.dataset.productId);
        await this.addSingleProductToCart(productId, newButton);
      }, { once: false });
    });
  }

  // Adiciona produto individual ao carrinho
  async addSingleProductToCart(productId, buttonElement) {
    // Previne múltiplas execuções simultâneas
    if (buttonElement.dataset.addingToCart === 'true') {
      console.log(`⚠️ Produto ${productId} já está sendo adicionado ao carrinho, ignorando...`);
      return;
    }
    
    // Marca como em processo
    buttonElement.dataset.addingToCart = 'true';
    
    // Busca variantId do botão ou do selectedVariants
    let variantId = buttonElement.dataset.variantId ? parseInt(buttonElement.dataset.variantId) : null;
    
    if (!variantId) {
      variantId = this.selectedVariants.get(productId);
    }
    
    if (!variantId) {
      console.error(`❌ No variant selected for product ${productId}`);
      console.log('Selected variants:', Array.from(this.selectedVariants.entries()));
      console.log('Button dataset:', buttonElement.dataset);
      buttonElement.dataset.addingToCart = 'false'; // Libera
      const errorMsg = 'Please select product options before adding to cart.';
      if (window.theme && window.theme.showMessage) {
        window.theme.showMessage(errorMsg, 'error');
      } else {
        const notification = document.createElement('div');
        notification.textContent = errorMsg;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#f44336;color:white;padding:16px 24px;border-radius:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      }
      return;
    }

    console.log(`🛒 Adding product ${productId} with variant ${variantId} to cart`);

    // Mostra loading
    buttonElement.classList.add('loading');
    buttonElement.disabled = true;

    try {
      // Encontra a posição do produto no combo (para a equipe saber qual posição colocar)
      const productItems = document.querySelectorAll('.combo-product-item');
      let productPosition = 0;
      for (let i = 0; i < productItems.length; i++) {
        if (parseInt(productItems[i].dataset.productId) === productId) {
          productPosition = i + 1; // Posição começa em 1
          break;
        }
      }
      
      // Busca nome do frame selecionado para adicionar nas propriedades
      const selectedFrame = this.getSelectedFrame(productId);
      let frameName = 'No Frame';
      if (selectedFrame && selectedFrame.frameHandle) {
        // Converte handle para nome legível (ex: "black-frame" -> "Black Frame")
        frameName = selectedFrame.frameHandle
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      // Prepara propriedades do produto (sem _ para aparecer no carrinho)
      const productProperties = {
        'Position': `Produto ${productPosition}`,
        'Total Items': productItems.length.toString(),
        'Frame': frameName,
        // Mantém propriedades com _ para uso interno
        '_combo_position': productPosition.toString(),
        '_combo_total_items': productItems.length.toString(),
        '_selected_frame': frameName
      };
      
      console.log(`📍 Produto ${productId} - Posição: ${productPosition}/${productItems.length}, Frame: ${frameName}`);
      console.log(`   Propriedades do produto:`, productProperties);
      
      const items = [{
        id: variantId,
        quantity: 1,
        properties: productProperties
      }];
      
      // Adiciona frame se selecionado
      if (selectedFrame && selectedFrame.frameVariantId) {
        const frameProperties = {
          'Position': `Frame ${productPosition}`,
          'For Product': `Produto ${productPosition}`,
          'Frame Name': frameName,
          'Total Items': productItems.length.toString(),
          // Mantém propriedades com _ para uso interno
          '_frame_for': productId.toString(),
          '_frame_name': frameName,
          '_combo_position': productPosition.toString(),
          '_combo_total_items': productItems.length.toString()
        };
        
        console.log(`   Propriedades do frame:`, frameProperties);
        
        items.push({
          id: selectedFrame.frameVariantId,
          quantity: 1,
          properties: frameProperties
        });
        console.log(`🖼️ Adicionando frame ao carrinho: variant ${selectedFrame.frameVariantId}, Frame: ${frameName}, Posição: ${productPosition}/${productItems.length}`);
      }

      // Adiciona TODOS os itens de uma vez (produto + frame) para evitar duplicação
      const result = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: items })
      });
      
      if (!result.ok) {
        const error = await result.json();
        throw new Error(error.description || 'Error adding items to cart');
      }

      const cartData = await result.json();
      console.log('✅ Items added to cart:', cartData);
      console.log('📋 Propriedades adicionadas:');
      if (Array.isArray(cartData.items)) {
        cartData.items.forEach((item, index) => {
          console.log(`   Item ${index + 1}:`, {
            title: item.product_title,
            variant_id: item.variant_id,
            properties: item.properties || {}
          });
        });
      } else if (cartData.items) {
        // Se for um objeto único
        console.log('   Item:', {
          title: cartData.items.product_title,
          variant_id: cartData.items.variant_id,
          properties: cartData.items.properties || {}
        });
      }

      // Sucesso - atualiza carrinho sem redirecionar
      // Dispara eventos para atualizar carrinho
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cartData } }));
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      
      // Atualiza carrinho via métodos do tema
      if (window.theme && window.theme.cartDrawer) {
        window.theme.cartDrawer.updateCart();
      } else if (window.theme && window.theme.cart && window.theme.cart.updateCart) {
        window.theme.cart.updateCart();
      } else {
        // Fallback: atualiza via fetch
        fetch('/cart.js')
          .then(res => res.json())
          .then(cart => {
            // Atualiza contador do carrinho se existir
            const cartCount = document.querySelector('.cart-count, .cart-drawer-toggle .count, [data-cart-count]');
            if (cartCount) {
              cartCount.textContent = cart.item_count || 0;
            }
          });
      }

      // Libera o botão
      buttonElement.dataset.addingToCart = 'false';
      
      // Mostra mensagem de sucesso
      if (window.theme && window.theme.showMessage) {
        window.theme.showMessage('Product added to cart!', 'success');
      } else {
        // Fallback: mostra notificação simples
        const notification = document.createElement('div');
        notification.textContent = 'Product added to cart!';
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:16px 24px;border-radius:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }

    } catch (error) {
      console.error('❌ Error adding product to cart:', error);
      if (window.theme && window.theme.showMessage) {
        window.theme.showMessage('Error adding to cart. Please try again.', 'error');
      } else {
        const notification = document.createElement('div');
        notification.textContent = 'Error adding to cart. Please try again.';
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#f44336;color:white;padding:16px 24px;border-radius:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      }
    } finally {
      // Remove loading e libera o botão
      buttonElement.classList.remove('loading');
      buttonElement.disabled = false;
      buttonElement.dataset.addingToCart = 'false'; // Garante que o flag seja removido
    }
  }

  // Normaliza nome de material (igual ao gallery-wall-builder)
  normalizeMaterialName(material) {
    if (!material) return '';
    return material.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  // Normaliza tamanho (igual ao gallery-wall-builder)
  normalizeSize(size) {
    if (!size) return null;
    // Match formats like: "70x100", "70 x 100", "L - 70 x 100.0cm", "S - 29.7 x 42cm (A3)", etc.
    const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      // Round to handle 29.7 -> 30, but 70.0 -> 70
      const normalizedWidth = width % 1 === 0 ? Math.round(width) : width;
      const normalizedHeight = height % 1 === 0 ? Math.round(height) : height;
      return `${normalizedWidth}x${normalizedHeight}`;
    }
    return null;
  }

  // Atualiza variante e preço baseado em Size e Material (igual ao gallery-wall-builder)
  async updateVariant(productId, optionPosition, optionValue) {
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
    if (!productItem) return;

    // Busca todas as opções selecionadas - identifica pelo label
    const selects = document.querySelectorAll(`.combo-option-select[data-product-id="${productId}"]`);
    let selectedSize = null;
    let selectedMaterial = null;
    
    selects.forEach(select => {
      // Encontra o label associado ao select
      const optionGroup = select.closest('.combo-option-group');
      if (optionGroup) {
        const label = optionGroup.querySelector('.combo-option-label');
        if (label) {
          const labelText = label.textContent.trim().toUpperCase();
          if (labelText === 'SIZE') {
            selectedSize = select.value;
          } else if (labelText === 'MATERIAL') {
            selectedMaterial = select.value;
          }
        }
      }
    });

    // Usa data-all-variants para encontrar a variante correta
    const allVariantsData = productItem.dataset.allVariants;
    if (!allVariantsData) {
      console.warn(`⚠️ No all-variants data for product ${productId}`);
      return;
    }

    console.log(`🔍 Atualizando variante para produto ${productId}:`);
    console.log(`   Size selecionado: ${selectedSize}`);
    console.log(`   Material selecionado: ${selectedMaterial}`);
    console.log(`   All variants data: ${allVariantsData}`);

    // Parse format: "size|material:price|variantId;size|material:price|variantId"
    const variants = allVariantsData.split(';');
    const normalizedSize = this.normalizeSize(selectedSize);
    const normalizedMaterial = this.normalizeMaterialName(selectedMaterial);

    console.log(`   Size normalizado: ${normalizedSize}`);
    console.log(`   Material normalizado: ${normalizedMaterial}`);

    // Encontra variante correspondente
    for (const variantEntry of variants) {
      if (!variantEntry) continue;
      
      const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
      if (!sizeAndMaterial || !priceAndId) continue;
      
      const [size, mat] = sizeAndMaterial.split('|');
      const [price, variantId] = priceAndId.split('|');
      
      const normalizedVariantSize = this.normalizeSize(size);
      const normalizedVariantMaterial = this.normalizeMaterialName(mat);

      // Match: compara size e material
      // Verifica se o produto tem size option
      const hasSize = productItem.dataset.hasSize === 'true';
      const hasMaterial = productItem.dataset.hasMaterial === 'true';
      
      let sizeMatch = true;
      let materialMatch = true;
      
      // Se tem size option, precisa fazer match
      if (hasSize && selectedSize) {
        sizeMatch = normalizedVariantSize === normalizedSize;
      }
      
      // Se tem material option, precisa fazer match
      if (hasMaterial && selectedMaterial) {
        materialMatch = normalizedVariantMaterial === normalizedMaterial || 
                       normalizedVariantMaterial.includes(normalizedMaterial) ||
                       normalizedMaterial.includes(normalizedVariantMaterial);
      }

      if (sizeMatch && materialMatch) {
        // Atualiza variante selecionada
        this.selectedVariants.set(productId, variantId);
        
        // Atualiza preço do produto
        const priceInCents = Math.round(parseFloat(price) * 100);
        
        // Se tem frame selecionado, recalcula o preço do frame baseado no novo tamanho
        const selectedFrame = this.getSelectedFrame(productId);
        if (selectedFrame) {
          // Recalcula preço do frame com o novo tamanho
          // Isso vai atualizar o preço automaticamente via updateProductPriceWithFrame
          await this.recalculateFramePriceForNewSize(productId, selectedFrame.frameHandle || selectedFrame.frameId);
        } else {
          // Sem frame, atualiza preço normalmente
          const priceElement = document.querySelector(`.price-amount[data-product-id="${productId}"]`);
          if (priceElement) {
            priceElement.textContent = this.formatMoney(priceInCents);
          }
          
          // Atualiza preço no botão individual também
          this.updateIndividualButtonPrice(productId);
        }
        
        // Atualiza variant-id no botão
        const button = document.querySelector(`.combo-product-add-to-cart[data-product-id="${productId}"]`);
        if (button) {
          button.dataset.variantId = variantId;
        }
        
        // Se o frame está aplicado, mantém as porcentagens (88% x 92%)
        const productImageContainer = productItem.querySelector('.combo-product-image');
        if (productImageContainer && productImageContainer.classList.contains('has-frame')) {
          const productImg = productImageContainer.querySelector('.combo-product-main-image');
          if (productImg) {
            // Mantém porcentagens mesmo quando size muda
            productImg.style.width = '80%';
            productImg.style.height = '85%';
          }
        }
        
        console.log(`✅ Preço atualizado: Produto ${productId}, Variante ${variantId}, Preço: ${this.formatMoney(priceInCents)}`);
        return;
      }
    }
    
    console.warn(`⚠️ Nenhuma variante encontrada para Size=${selectedSize}, Material=${selectedMaterial}`);

    // Fallback: primeira variante disponível
    const firstVariant = variants[0];
    if (firstVariant) {
      const [sizeAndMaterial, priceAndId] = firstVariant.split(':');
      const [price, variantId] = priceAndId.split('|');
      this.selectedVariants.set(productId, variantId);
      
      const priceInCents = Math.round(parseFloat(price) * 100);
      const priceElement = document.querySelector(`.price-amount[data-product-id="${productId}"]`);
      if (priceElement) {
        priceElement.textContent = this.formatMoney(priceInCents);
      }
      
      // Atualiza preço no botão individual também
      this.updateIndividualButtonPrice(productId);
      
      // Atualiza variant-id no botão
      const button = document.querySelector(`.combo-product-add-to-cart[data-product-id="${productId}"]`);
      if (button) {
        button.dataset.variantId = variantId;
      }
      
      // Se o frame está aplicado, mantém as porcentagens (88% x 92%)
      const productImageContainer = productItem.querySelector('.combo-product-image');
      if (productImageContainer && productImageContainer.classList.contains('has-frame')) {
        const productImg = productImageContainer.querySelector('.combo-product-main-image');
        if (productImg) {
          // Mantém porcentagens mesmo quando size muda (igual gallery-wall-builder)
          productImg.style.width = '88%';
          productImg.style.height = '92%';
        }
      }
    }
  }

  // Atualiza preço do produto individual (mantido para compatibilidade)
  updateProductPrice(productId) {
    // A atualização já é feita no updateVariant
    // Este método é mantido para não quebrar código existente
  }

  // Atualiza contador de produtos incluídos
  updateIncludedCount() {
    const countElement = document.getElementById('combo-included-count');
    if (!countElement) return;

    const products = this.config.products || [];
    if (products.length === 0) {
      countElement.textContent = 'No products configured.';
      return;
    }

    // Conta por tipo
    const typeCount = {};
    products.forEach(product => {
      const type = product.productType || 'Product';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    // Formata texto
    let countText = '';
    const types = Object.keys(typeCount);
    types.forEach((type, index) => {
      if (index > 0) countText += ' ';
      countText += `${type}: ${typeCount[type]}`;
    });

    countElement.textContent = countText;
    
    // Atualiza subtotal do Buy All tab
    this.updateBuyAllSubtotal();
  }
  
  // Atualiza aba BUY ALL para mostrar frames selecionados
  updateBuyAllTab() {
    const buyAllItems = document.querySelectorAll('.buy-all-item');
    
    buyAllItems.forEach(item => {
      const productId = parseInt(item.dataset.productId);
      if (!productId) return;
      
      // Busca frame selecionado para este produto
      const selectedFrame = this.getSelectedFrame(productId);
      
      // Busca elementos dentro do item
      const sizeElement = item.querySelector('.buy-all-item-size');
      const materialElement = item.querySelector('.buy-all-item-material');
      const priceElement = item.querySelector('.buy-all-item-price .price-amount');
      
      // Busca tamanho e material selecionados
      const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
      if (productItem) {
        const sizeSelect = productItem.querySelector('.combo-option-select-size');
        const materialSelect = productItem.querySelector('.combo-option-select-material');
        
        if (sizeSelect && sizeElement) {
          const selectedSize = sizeSelect.options[sizeSelect.selectedIndex]?.text || sizeSelect.value;
          sizeElement.textContent = `Size: ${selectedSize}`;
        }
        
        if (materialSelect && materialElement) {
          const selectedMaterial = materialSelect.options[materialSelect.selectedIndex]?.text || materialSelect.value;
          materialElement.textContent = `Material: ${selectedMaterial}`;
        }
        
        // Atualiza preço usando o mesmo método que funciona na aba CUSTOMIZE
        const variantId = this.selectedVariants.get(productId);
        if (priceElement) {
          let productPrice = 0;
          
          // Método 1: Busca do selectedVariants e config.products (mais confiável)
          if (variantId) {
            const product = this.config.products?.find(p => p.id === productId);
            if (product) {
              const variant = product.variants?.find(v => v.id === variantId);
              if (variant) {
                productPrice = variant.price;
              }
            }
          }
          
          // Método 2: Fallback - busca do data-all-variants
          if (!productPrice && variantId) {
            const allVariantsData = productItem.dataset.allVariants;
            if (allVariantsData) {
              const variants = allVariantsData.split(';');
              for (const variantEntry of variants) {
                if (!variantEntry) continue;
                const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
                if (!priceAndId) continue;
                const [price, vId] = priceAndId.split('|');
                if (vId === variantId.toString()) {
                  productPrice = Math.round(parseFloat(price) * 100);
                  break;
                }
              }
            }
          }
          
          // Método 3: Fallback - busca do texto do select de size
          if (!productPrice && sizeSelect) {
            const selectedSizeText = sizeSelect.options[sizeSelect.selectedIndex]?.text || '';
            const priceMatch = selectedSizeText.match(/€([\d,]+)/);
            if (priceMatch) {
              const priceStr = priceMatch[1].replace(',', '.');
              productPrice = Math.round(parseFloat(priceStr) * 100);
            }
          }
          
          // Método 4: Fallback - busca do elemento .price-amount na aba CUSTOMIZE
          if (!productPrice) {
            const customizePriceElement = productItem.querySelector('.price-amount');
            if (customizePriceElement) {
              const priceText = customizePriceElement.textContent || '';
              const priceMatch = priceText.match(/€([\d,]+)/);
              if (priceMatch) {
                const priceStr = priceMatch[1].replace(',', '.');
                productPrice = Math.round(parseFloat(priceStr) * 100);
              }
            }
          }
          
          // Calcula preço total (produto + frame)
          let totalPrice = productPrice;
          if (selectedFrame && selectedFrame.framePrice) {
            totalPrice += selectedFrame.framePrice;
            console.log(`💰 BUY ALL - Produto ${productId}: Produto €${(productPrice/100).toFixed(2)} + Frame €${(selectedFrame.framePrice/100).toFixed(2)} = Total €${(totalPrice/100).toFixed(2)}`);
          } else {
            console.log(`💰 BUY ALL - Produto ${productId}: Produto €${(productPrice/100).toFixed(2)} (sem frame)`);
          }
          
          if (totalPrice > 0) {
            priceElement.textContent = this.formatMoney(totalPrice);
          }
        }
      }
      
      // Adiciona ou atualiza informação do frame
      let frameInfoElement = item.querySelector('.buy-all-item-frame');
      if (selectedFrame && selectedFrame.frameHandle) {
        // Converte handle para nome legível
        const frameName = selectedFrame.frameHandle
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (!frameInfoElement) {
          // Cria elemento se não existir
          frameInfoElement = document.createElement('div');
          frameInfoElement.className = 'buy-all-item-frame';
          frameInfoElement.style.cssText = 'font-size: 12px; color: #666; text-transform: uppercase; margin-top: 4px;';
          
          // Insere após o material
          if (materialElement) {
            materialElement.insertAdjacentElement('afterend', frameInfoElement);
          } else if (sizeElement) {
            sizeElement.insertAdjacentElement('afterend', frameInfoElement);
          } else {
            const details = item.querySelector('.buy-all-item-details');
            if (details) {
              const title = details.querySelector('.buy-all-item-title');
              if (title) {
                title.insertAdjacentElement('afterend', frameInfoElement);
              }
            }
          }
        }
        frameInfoElement.textContent = `Frame: ${frameName}`;
        frameInfoElement.style.display = 'block';
      } else {
        // Remove ou esconde se não tem frame
        if (frameInfoElement) {
          frameInfoElement.style.display = 'none';
          frameInfoElement.textContent = '';
        }
      }
    });
    
    // Atualiza subtotal também
    this.updateBuyAllSubtotal();
  }

  // Atualiza subtotal do Buy All tab
  updateBuyAllSubtotal() {
    const subtotalElement = document.getElementById('buy-all-subtotal');
    if (!subtotalElement) return;

    let total = 0;
    const productItems = document.querySelectorAll('.combo-product-item');

    productItems.forEach(item => {
      const productId = parseInt(item.dataset.productId);
      const variantId = this.selectedVariants.get(productId);
      
      let productPrice = 0;
      
      if (variantId) {
        // Busca preço do produto no data-all-variants
        const allVariantsData = item.dataset.allVariants;
        if (allVariantsData) {
          const variants = allVariantsData.split(';');
          for (const variantEntry of variants) {
            if (!variantEntry) continue;
            const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
            if (!priceAndId) continue;
            const [price, vId] = priceAndId.split('|');
            if (vId === variantId.toString()) {
              productPrice = Math.round(parseFloat(price) * 100);
              break;
            }
          }
        }
      } else {
        // Fallback: usa primeira variante disponível
        const product = this.config.products?.find(p => p.id === productId);
        if (product) {
          const firstVariant = product.variants.find(v => v.available) || product.variants[0];
          if (firstVariant) {
            productPrice = firstVariant.price;
          } else {
            productPrice = product.price;
          }
        }
      }
      
      // Adiciona preço do produto ao total
      total += productPrice;
      
      // Adiciona preço do frame se houver frame selecionado
      const selectedFrame = this.getSelectedFrame(productId);
      if (selectedFrame && selectedFrame.framePrice) {
        total += selectedFrame.framePrice;
      }
    });

    subtotalElement.textContent = this.formatMoney(total);
  }

  // Calcula e atualiza subtotal usando data-all-variants (igual ao gallery-wall-builder)
  updateSubtotal() {
    const subtotalElement = document.getElementById('combo-subtotal');
    if (!subtotalElement) {
      console.warn(`⚠️ Elemento combo-subtotal não encontrado!`);
      return;
    }

    console.log(`🔄 Calculando subtotal...`);
    let total = 0;
    const productItems = document.querySelectorAll('.combo-product-item');
    console.log(`   Total de produtos encontrados: ${productItems.length}`);

    productItems.forEach(item => {
      const productId = parseInt(item.dataset.productId);
      const variantId = this.selectedVariants.get(productId);
      
      let productPrice = 0;
      
      if (variantId) {
        // Busca preço do produto no data-all-variants
        const allVariantsData = item.dataset.allVariants;
        if (allVariantsData) {
          const variants = allVariantsData.split(';');
          for (const variantEntry of variants) {
            if (!variantEntry) continue;
            const [sizeAndMaterial, priceAndId] = variantEntry.split(':');
            if (!priceAndId) continue;
            const [price, vId] = priceAndId.split('|');
            if (vId === variantId.toString()) {
              const priceInCents = Math.round(parseFloat(price) * 100);
              productPrice = priceInCents;
              break;
            }
          }
        } else {
          // Fallback: usa preço do produto
          const product = this.config.products.find(p => p.id === productId);
          if (product) {
            productPrice = product.price;
          }
        }
      } else {
        // Se não tem variante selecionada, usa preço padrão
        const product = this.config.products.find(p => p.id === productId);
        if (product) {
          productPrice = product.price;
        }
      }
      
      // Adiciona preço do produto ao total
      total += productPrice;
      
      // Adiciona preço do frame se houver frame selecionado
      const selectedFrame = this.getSelectedFrame(productId);
      if (selectedFrame && selectedFrame.framePrice) {
        total += selectedFrame.framePrice;
        console.log(`💰 Subtotal: Produto ${productId} = ${this.formatMoney(productPrice)}, Frame = ${this.formatMoney(selectedFrame.framePrice)}, Subtotal parcial = ${this.formatMoney(total)}`);
      } else {
        console.log(`💰 Subtotal: Produto ${productId} = ${this.formatMoney(productPrice)}, Sem frame, Subtotal parcial = ${this.formatMoney(total)}`);
      }
    });

    console.log(`💰 Subtotal FINAL calculado: ${this.formatMoney(total)}`);
    subtotalElement.textContent = this.formatMoney(total);
    console.log(`✅ Subtotal atualizado no DOM: ${subtotalElement.textContent}`);
    
    // Habilita botão se houver produtos
    const addToCartBtn = document.getElementById('combo-add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.disabled = productItems.length === 0;
    }
  }

  // Setup botão Adicionar ao Carrinho
  setupAddToCart() {
    const btn = document.getElementById('combo-add-to-cart');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      await this.addToCart(false);
    });
  }

  // Setup botão Comprar Tudo
  setupBuyAll() {
    const btn = document.getElementById('combo-buy-all');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      await this.addToCart(true); // true = usar variantes padrão
    });
  }

  // Adiciona combo ao carrinho
  async addToCart(useDefaults = false) {
    const items = [];
    const products = this.config.products || [];

    products.forEach((product, index) => {
      let variantId;
      
      if (useDefaults) {
        // Usa primeira variante disponível
        variantId = product.variants.find(v => v.available)?.id || product.variants[0]?.id;
      } else {
        // Usa variante selecionada
        variantId = this.selectedVariants.get(product.id);
        if (!variantId) {
          variantId = product.variants.find(v => v.available)?.id || product.variants[0]?.id;
        }
      }

      if (variantId) {
        const productPosition = index + 1; // Posição começa em 1
        
        // Busca nome do frame selecionado
        const selectedFrame = this.getSelectedFrame(product.id);
        let frameName = 'No Frame';
        if (selectedFrame && selectedFrame.frameHandle) {
          frameName = selectedFrame.frameHandle
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        items.push({
          id: variantId,
          quantity: 1,
          properties: {
            'Position': `Produto ${productPosition}`,
            'Total Items': products.length.toString(),
            'Frame': frameName,
            // Mantém propriedades com _ para uso interno
            '_combo_product': product.title,
            '_product_type': product.productType || '',
            '_combo_position': productPosition.toString(),
            '_combo_total_items': products.length.toString(),
            '_selected_frame': frameName
          }
        });
        
        // Adiciona frame se selecionado
        if (selectedFrame && selectedFrame.frameVariantId) {
          items.push({
            id: selectedFrame.frameVariantId,
            quantity: 1,
            properties: {
              'Position': `Frame ${productPosition}`,
              'For Product': `Produto ${productPosition}`,
              'Frame Name': frameName,
              'Total Items': products.length.toString(),
              // Mantém propriedades com _ para uso interno
              '_combo_product': product.title,
              '_product_type': product.productType || '',
              '_frame_for': product.id.toString(),
              '_frame_name': frameName,
              '_combo_position': productPosition.toString(),
              '_combo_total_items': products.length.toString()
            }
          });
          console.log(`🖼️ Frame adicionado ao combo: produto ${product.id}, frame variant ${selectedFrame.frameVariantId}, Frame: ${frameName}, Posição: ${productPosition}/${products.length}`);
        }
      }
    });

    if (items.length === 0) {
      alert('Nenhum produto disponível para adicionar ao carrinho.');
      return;
    }

    // Desabilita botão durante requisição
    const btn = document.getElementById('combo-add-to-cart') || document.getElementById('combo-buy-all');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-text">ADDING...</span>';
    }

    try {
      // Adiciona itens um por um (mais confiável que múltiplos itens de uma vez)
      console.log(`🛒 Adding ${items.length} items to cart one by one...`);
      
      const results = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Adding item ${i + 1}/${items.length}:`, item);
        
        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
              id: parseInt(item.id),
              quantity: parseInt(item.quantity) || 1,
              properties: item.properties || {}
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to add item ${i + 1}:`, errorText);
            throw new Error(`Failed to add item ${i + 1}: ${errorText}`);
          }

          const result = await response.json();
          results.push(result);
          console.log(`✅ Item ${i + 1} added:`, result);
          
          // Pequeno delay entre itens para evitar rate limiting
          if (i < items.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (itemError) {
          console.error(`❌ Error adding item ${i + 1}:`, itemError);
          // Continua adicionando os outros itens mesmo se um falhar
        }
      }

      if (results.length === 0) {
        throw new Error('No items were added to cart');
      }

      console.log(`✅ Successfully added ${results.length}/${items.length} items to cart`);
      
      // Busca carrinho atualizado
      const cartResponse = await fetch('/cart.js');
      const cartData = await cartResponse.json();
      
      // Atualiza carrinho sem redirecionar
      // Dispara eventos para atualizar carrinho
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cartData } }));
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      
      // Atualiza carrinho via métodos do tema
      if (window.theme && window.theme.cartDrawer) {
        window.theme.cartDrawer.updateCart();
      } else if (window.theme && window.theme.cart && window.theme.cart.updateCart) {
        window.theme.cart.updateCart();
      } else {
        // Fallback: atualiza contador do carrinho
        const cartCount = document.querySelector('.cart-count, .cart-drawer-toggle .count, [data-cart-count]');
        if (cartCount) {
          cartCount.textContent = cartData.item_count || 0;
        }
      }
      
      // Mostra mensagem de sucesso
      const successMessage = `${results.length} product(s) added to cart!`;
      if (window.theme && window.theme.showMessage) {
        window.theme.showMessage(successMessage, 'success');
      } else {
        // Usa notificação customizada ao invés de alert
        const notification = document.createElement('div');
        notification.textContent = successMessage;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:16px 24px;border-radius:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
      
      // Restaura botão
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      const errorMessage = error.message || 'Error adding to cart. Please try again.';
      
      if (window.theme && window.theme.showMessage) {
        window.theme.showMessage(errorMessage, 'error');
      } else {
        // Usa notificação customizada ao invés de alert
        const notification = document.createElement('div');
        notification.textContent = errorMessage;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#f44336;color:white;padding:16px 24px;border-radius:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      }
      
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  // Busca imagem do frame baseado no nome ou handle (similar ao gallery-wall-builder)
  async getFrameImage(frameIdentifier) {
    if (!frameIdentifier) {
      console.warn('⚠️ getFrameImage chamado sem frameIdentifier');
      return null;
    }
    
    // Normaliza o identificador do frame para buscar
    const normalizedIdentifier = frameIdentifier.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    console.log(`🔍 Buscando imagem do frame: "${frameIdentifier}" (normalizado: "${normalizedIdentifier}")`);
    
    // 1. Tenta encontrar frame option na página (como no gallery-wall-builder)
    const frameOptions = document.querySelectorAll('[data-frame], [data-frame-name], .frame-option');
    console.log(`   Encontrados ${frameOptions.length} frame options na página`);
    
    for (const frameOption of frameOptions) {
      const frameId = frameOption.dataset.frame || frameOption.dataset.frameName || '';
      const frameTitle = frameOption.querySelector('.frame-name')?.textContent || '';
      
      // Normaliza para comparação
      const normalizedId = frameId.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const normalizedTitle = frameTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      console.log(`   Comparando: "${normalizedId}" ou "${normalizedTitle}" com "${normalizedIdentifier}"`);
      
      if (normalizedId === normalizedIdentifier || normalizedTitle === normalizedIdentifier) {
        // Tenta data-frame-image primeiro
        if (frameOption.dataset.frameImage) {
          console.log('✅ Frame image encontrado via data-frame-image:', frameOption.dataset.frameImage);
          return frameOption.dataset.frameImage;
        }
        
        // Tenta img com data-full-image
        const frameImage = frameOption.querySelector('.frame-preview img, img');
        if (frameImage) {
          if (frameImage.dataset.fullImage) {
            console.log('✅ Frame image encontrado via data-full-image:', frameImage.dataset.fullImage);
            return frameImage.dataset.fullImage;
          }
          
          // Fallback: converte src para resolução completa
          let imageUrl = frameImage.src;
          imageUrl = imageUrl.replace(/\?.*$/, '').replace(/_\d+x\d+\./, '.');
          if (imageUrl.includes('cdn.shopify.com')) {
            imageUrl = imageUrl.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master)\./, '.');
          }
          console.log('✅ Frame image encontrado via src:', imageUrl);
          return imageUrl;
        }
      }
    }
    
    // 2. Se não encontrou na página, tenta buscar via API da coleção de frames (se configurada)
    const frameCollection = this.config.frameCollection;
    if (frameCollection) {
      console.log(`   Tentando buscar frame na coleção: ${frameCollection}`);
      try {
        const frameImage = await this.fetchFrameImageFromCollection(frameCollection, frameIdentifier);
        if (frameImage) {
          console.log('✅ Frame image encontrado via coleção:', frameImage);
          return frameImage;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar frame na coleção:', error);
      }
    }
    
    console.warn(`⚠️ Imagem do frame não encontrada para: "${frameIdentifier}"`);
    console.warn(`   Dica: Certifique-se de que os frames estão na página ou configure uma coleção de frames`);
    return null;
  }

  // Busca frame na coleção via API
  async fetchFrameImageFromCollection(collectionHandle, frameIdentifier) {
    try {
      // Busca produtos da coleção
      const response = await fetch(`/collections/${collectionHandle}/products.json`);
      if (!response.ok) {
        console.warn(`⚠️ Coleção não encontrada: ${collectionHandle}`);
        return null;
      }
      
      const data = await response.json();
      const products = data.products || [];
      
      // Normaliza o identificador do frame para comparação
      const normalizedIdentifier = frameIdentifier.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Busca produto com handle ou título correspondente
      for (const product of products) {
        const productHandle = product.handle.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const productTitle = product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Compara handle primeiro (mais preciso), depois título
        if (productHandle === normalizedIdentifier || productHandle.includes(normalizedIdentifier) || 
            productTitle === normalizedIdentifier || productTitle.includes(normalizedIdentifier)) {
          // Retorna a imagem do produto
          if (product.images && product.images.length > 0) {
            // Pega a última imagem (como no gallery-wall-builder)
            const imageIndex = product.images.length > 2 ? product.images.length - 1 : 0;
            const imageUrl = product.images[imageIndex].src;
            // Converte para resolução completa
            return imageUrl.replace(/\?.*$/, '').replace(/_\d+x\d+\./, '.').replace(/_(pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master)\./, '.');
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar frame na coleção:', error);
      return null;
    }
  }

  // Aplica frame à imagem do produto (similar ao gallery-wall-builder)
  async applyFrameToProduct(productId, frameName, frameId = null, frameHandle = null) {
    console.log(`🎨 applyFrameToProduct chamado - Product: ${productId}, Frame: "${frameName}", FrameId: ${frameId}`);
    
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
    if (!productItem) {
      console.warn(`⚠️ Produto não encontrado: ${productId}`);
      return;
    }
    
    const productImageContainer = productItem.querySelector('.combo-product-image');
    if (!productImageContainer) {
      console.warn(`⚠️ Container de imagem não encontrado para produto: ${productId}`);
      return;
    }
    
    // Busca imagem do frame (agora é async)
    const frameImage = await this.getFrameImage(frameName);
    
    if (!frameImage) {
      console.warn(`⚠️ Imagem do frame não encontrada para "${frameName}", removendo frame aplicado`);
      // Remove frame se não encontrou imagem
      this.removeFrameFromProduct(productId);
      return;
    }
    
    // Busca preço do frame baseado no tamanho do produto
    const framePriceData = await this.getFramePrice(productId, frameId, frameHandle);
    
    // Armazena frame selecionado
    if (framePriceData) {
      // Armazena frame usando helper que normaliza o ID
      this.setSelectedFrame(productId, {
        frameId: framePriceData.frameId,
        frameVariantId: framePriceData.frameVariantId,
        framePrice: framePriceData.framePrice,
        frameHandle: frameHandle || frameName
      });
      
      const normalizedId = this.normalizeProductId(productId);
      console.log(`✅ Frame armazenado: ProductId=${normalizedId} (tipo: ${typeof normalizedId}), FramePrice=${framePriceData.framePrice}, FrameVariantId=${framePriceData.frameVariantId}`);
      console.log(`   Verificando armazenamento:`, this.getSelectedFrame(productId));
      
      // Atualiza preço do produto para incluir o frame (isso já atualiza o botão também)
      this.updateProductPriceWithFrame(productId, framePriceData.framePrice);
      
      // FORÇA atualização do botão após um pequeno delay para garantir que o frame está armazenado
      setTimeout(() => {
        console.log(`🔄 Forçando atualização do botão após aplicar frame...`);
        console.log(`   Verificando frame armazenado:`, this.getSelectedFrame(productId));
        this.updateIndividualButtonPrice(productId);
      }, 150);
      
      // FORÇA atualização do subtotal após um pequeno delay para garantir que tudo foi atualizado
      setTimeout(() => {
        console.log(`🔄 Forçando atualização do subtotal após aplicar frame...`);
        this.updateSubtotal();
      }, 100);
    } else {
      // Se não encontrou preço, remove o frame
      console.warn(`⚠️ Preço do frame não encontrado, removendo frame`);
      this.removeFrameFromProduct(productId);
      return;
    }
    
    console.log(`🎨 Aplicando frame "${frameName}" ao produto ${productId} com imagem: ${frameImage}`);
    
    // Pega a imagem original do produto (garante que pega a imagem correta, não duplicada)
    // Prioridade: 1) data-product-image atualizado, 2) primeira imagem com classe combo-product-main-image, 3) qualquer img
    let productImage = productImageContainer.dataset.productImage;
    if (!productImage) {
      const productImg = productImageContainer.querySelector('.combo-product-main-image');
      if (productImg && productImg.src) {
        productImage = productImg.src;
      } else {
        const anyImg = productImageContainer.querySelector('img');
        if (anyImg && anyImg.src) {
          productImage = anyImg.src;
        }
      }
    }
    
    if (!productImage) {
      console.warn(`⚠️ Imagem do produto não encontrada`);
      return;
    }
    
    // Garante que há apenas uma imagem do produto (remove duplicatas antes de aplicar frame)
    const allProductImages = productImageContainer.querySelectorAll('.combo-product-main-image, img');
    if (allProductImages.length > 1) {
      // Mantém apenas a primeira e remove as outras
      for (let i = 1; i < allProductImages.length; i++) {
        allProductImages[i].remove();
        console.log(`🗑️ Imagem duplicada removida antes de aplicar frame`);
      }
    }
    
    // Aplica frame EXATAMENTE igual ao gallery-wall-builder
    // Aguarda a imagem do frame carregar para calcular tamanho correto
    const frameImg = new Image();
    frameImg.onload = () => {
      // Pega dimensões do container atual
      const containerRect = productImageContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calcula proporção do frame
      const frameAspectRatio = frameImg.width / frameImg.height;
      
      // Ajusta o container para acomodar o frame corretamente
      // Mantém a largura do container, ajusta altura baseado na proporção do frame
      const newHeight = containerWidth / frameAspectRatio;
      
      // Aplica frame como background
      productImageContainer.style.backgroundImage = `url('${frameImage}')`;
      productImageContainer.style.backgroundSize = '100% 100%'; // Frame preenche TODO o espaço
      productImageContainer.style.backgroundPosition = 'center';
      productImageContainer.style.backgroundRepeat = 'no-repeat';
      productImageContainer.style.height = `${newHeight}px`; // Ajusta altura do container
      productImageContainer.classList.add('has-frame');
      productImageContainer.style.position = 'relative';
      
      // Ajusta a imagem do produto para ficar centralizada dentro do frame
      // Usa EXATAMENTE as mesmas porcentagens do gallery-wall-builder: 88% width, 92% height
      const productImg = productImageContainer.querySelector('.combo-product-main-image');
      if (productImg) {
        // Posiciona a imagem do produto no centro do frame (diminuída para ficar dentro do frame)
        productImg.style.cssText = `
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 80% !important;
          height: 85% !important;
          object-fit: cover !important;
          z-index: 5 !important;
          padding: 0 !important;
          display: block !important;
        `;
        
        console.log(`✅ Frame aplicado: Container ${containerWidth}px x ${newHeight}px, Product image: 80% width x 85% height`);
      }
    };
    
    frameImg.onerror = () => {
      console.warn('⚠️ Erro ao carregar frame image, usando fallback');
      // Fallback: aplica frame sem calcular proporção
      productImageContainer.style.backgroundImage = `url('${frameImage}')`;
      productImageContainer.style.backgroundSize = '100% 100%';
      productImageContainer.style.backgroundPosition = 'center';
      productImageContainer.style.backgroundRepeat = 'no-repeat';
      productImageContainer.classList.add('has-frame');
      productImageContainer.style.position = 'relative';
      
      const productImg = productImageContainer.querySelector('.combo-product-main-image');
      if (productImg) {
        productImg.style.cssText = `
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 80% !important;
          height: 85% !important;
          object-fit: cover !important;
          z-index: 5 !important;
          padding: 0 !important;
          display: block !important;
        `;
      }
    };
    
    frameImg.src = frameImage;
    
    console.log(`✅ Frame aplicado com sucesso ao produto ${productId}`);
  }

  // Busca preço do frame baseado no tamanho do produto
  async getFramePrice(productId, frameId, frameHandle) {
    if (!frameId && !frameHandle) {
      console.warn(`⚠️ Frame ID ou Handle não fornecido`);
      return null;
    }
    
    try {
      // Busca o tamanho selecionado do produto
      const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
      if (!productItem) {
        console.warn(`⚠️ Produto não encontrado: ${productId}`);
        return null;
      }
      
      // Busca tamanho selecionado - PRIORIDADE: busca da variante selecionada do produto
      let selectedSize = null;
      
      // Método 1: Busca da variante selecionada (mais confiável)
      const productIdNum = this.normalizeProductId(productId);
      let variantId = this.selectedVariants.get(productIdNum) || this.selectedVariants.get(productId);
      
      if (variantId) {
        // Busca produto no config para pegar o tamanho da variante
        let product = this.config.products?.find(p => p.id === productIdNum || p.id === productId);
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          if (variant && variant.option1) {
            selectedSize = variant.option1;
            console.log(`💰 Tamanho encontrado da variante selecionada: ${selectedSize}`);
          }
        }
      }
      
      // Método 2: Fallback - busca do select do DOM
      if (!selectedSize) {
        const sizeSelect = productItem.querySelector('.combo-option-select-size');
        selectedSize = sizeSelect ? sizeSelect.value : null;
        console.log(`💰 Tamanho encontrado do select DOM: ${selectedSize}`);
      }
      
      if (!selectedSize) {
        console.warn(`⚠️ Tamanho não encontrado para produto ${productIdNum}, usando primeira variante disponível`);
      }
      
      console.log(`💰 Buscando preço do frame - FrameId: ${frameId}, Handle: ${frameHandle}, Size: ${selectedSize}`);
      
      // Busca produto do frame via API
      // Se tem frameId numérico, precisa buscar via API Admin ou usar handle
      // Shopify não permite buscar produto por ID numérico diretamente, então usa handle
      const frameProductHandle = frameHandle || frameId;
      const response = await fetch(`/products/${frameProductHandle}.js`);
      
      if (!response.ok) {
        console.warn(`⚠️ Frame produto não encontrado: ${frameProductHandle}`);
        return null;
      }
      
      const frameProduct = await response.json();
      
      // Busca variante do frame baseado no tamanho do produto
      let frameVariant = null;
      
      if (selectedSize) {
        // Tenta encontrar variante com tamanho correspondente
        // Normaliza o tamanho para comparação (remove espaços extras, converte para lowercase)
        const normalizedSelectedSize = selectedSize.toLowerCase().trim();
        
        frameVariant = frameProduct.variants.find(v => {
          const variantSize = (v.option1 || '').toLowerCase().trim();
          // Compara tamanhos de forma mais flexível
          return variantSize === normalizedSelectedSize ||
                 variantSize.includes(normalizedSelectedSize) ||
                 normalizedSelectedSize.includes(variantSize) ||
                 // Tenta match por dimensões (ex: "50x70" em "M - 50 x 70cm")
                 (normalizedSelectedSize.match(/\d+x\d+/) && variantSize.match(/\d+x\d+/) && 
                  normalizedSelectedSize.match(/\d+x\d+/)[0] === variantSize.match(/\d+x\d+/)[0]);
        });
        
        if (!frameVariant) {
          console.warn(`⚠️ Variante do frame não encontrada para tamanho "${selectedSize}", tentando todas as variantes...`);
        }
      }
      
      // Se não encontrou, usa primeira variante disponível
      if (!frameVariant) {
        frameVariant = frameProduct.variants.find(v => v.available) || frameProduct.variants[0];
      }
      
      if (!frameVariant) {
        console.warn(`⚠️ Variante do frame não encontrada`);
        return null;
      }
      
      console.log(`✅ Frame price encontrado: ${frameVariant.price} (variant: ${frameVariant.id})`);
      
      return {
        frameId: frameProduct.id,
        frameVariantId: frameVariant.id,
        framePrice: frameVariant.price
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar preço do frame:`, error);
      return null;
    }
  }
  
  // Recalcula preço do frame quando o tamanho muda
  async recalculateFramePriceForNewSize(productId, frameHandle) {
    const selectedFrame = this.getSelectedFrame(productId);
    if (!selectedFrame) {
      console.warn(`⚠️ Frame não encontrado para recalcular preço - ProductId: ${productId}`);
      return;
    }
    
    console.log(`🔄 Recalculando preço do frame para novo tamanho - Product: ${productId}`);
    
    // Busca novo preço do frame baseado no tamanho atual
    const framePriceData = await this.getFramePrice(productId, selectedFrame.frameId, frameHandle);
    
    if (framePriceData) {
      // Atualiza frame selecionado com novo preço
      selectedFrame.frameVariantId = framePriceData.frameVariantId;
      selectedFrame.framePrice = framePriceData.framePrice;
      
      // Atualiza no Map também
      this.setSelectedFrame(productId, selectedFrame);
      
      console.log(`✅ Frame price recalculado: ${this.formatMoney(framePriceData.framePrice)}`);
      
      // Recalcula preço total (produto + frame) - isso já atualiza o botão também
      this.updateProductPriceWithFrame(productId, framePriceData.framePrice);
      
      // FORÇA atualização do botão após recalcular frame
      setTimeout(() => {
        console.log(`🔄 Forçando atualização do botão após recalcular frame...`);
        console.log(`   Verificando frame armazenado:`, this.getSelectedFrame(productId));
        this.updateIndividualButtonPrice(productId);
      }, 150);
      
      // FORÇA atualização do subtotal após recalcular frame
      setTimeout(() => {
        console.log(`🔄 Forçando atualização do subtotal após recalcular frame...`);
        this.updateSubtotal();
      }, 200);
    } else {
      console.warn(`⚠️ Não foi possível recalcular preço do frame`);
    }
  }
  
  // Atualiza preço do produto para incluir o frame
  updateProductPriceWithFrame(productId, framePrice) {
    // Normaliza productId
    const productIdNum = this.normalizeProductId(productId);
    
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productIdNum}"]`);
    if (!productItem) {
      console.warn(`⚠️ ProductItem não encontrado para produto ${productIdNum}`);
      return;
    }
    
    // Busca preço atual do produto DIRETO da variante selecionada (não do texto formatado)
    // Tenta tanto com número quanto com string
    let variantId = this.selectedVariants.get(productIdNum);
    if (!variantId) {
      variantId = this.selectedVariants.get(productId);
    }
    
    if (!variantId) {
      console.warn(`⚠️ VariantId não encontrado para produto ${productIdNum} em updateProductPriceWithFrame`);
      // Tenta buscar do DOM diretamente
      const sizeSelect = productItem.querySelector('.combo-option-select-size');
      const materialSelect = productItem.querySelector('.combo-option-select-material');
      if (sizeSelect && materialSelect) {
        // Usa updateIndividualButtonPrice que tem fallback melhor
        this.updateIndividualButtonPrice(productId);
        return;
      }
      return;
    }
    
    // Busca produto no config - tenta tanto com número quanto com string
    let product = this.config.products?.find(p => p.id === productIdNum);
    if (!product) {
      product = this.config.products?.find(p => p.id === productId);
    }
    
    if (!product) {
      console.warn(`⚠️ Produto ${productIdNum} não encontrado no config em updateProductPriceWithFrame`);
      return;
    }
    
    // Busca variante no produto
    const variant = product.variants?.find(v => v.id === variantId);
    if (!variant) {
      console.warn(`⚠️ Variante ${variantId} não encontrada no produto ${productIdNum} em updateProductPriceWithFrame`);
      // Usa updateIndividualButtonPrice que tem fallback melhor
      this.updateIndividualButtonPrice(productId);
      return;
    }
    
    // Usa preço direto da variante (já está em centavos)
    const currentPrice = variant.price;
    
    // Adiciona preço do frame
    const totalPrice = currentPrice + framePrice;
    
    console.log(`💰 updateProductPriceWithFrame: Produto ${productIdNum}, Variante: ${variantId}, Produto: ${this.formatMoney(currentPrice)}, Frame: ${this.formatMoney(framePrice)}, Total: ${this.formatMoney(totalPrice)}`);
    
    // Atualiza preço exibido
    const priceElement = productItem.querySelector(`.price-amount[data-product-id="${productIdNum}"]`);
    if (priceElement) {
      priceElement.textContent = this.formatMoney(totalPrice);
    }
    
    // Atualiza preço no botão também - busca em todo o documento, não só dentro do productItem
    const buttonPriceElement = document.querySelector(`.combo-product-button-price[data-product-id="${productIdNum}"]`);
    if (buttonPriceElement) {
      buttonPriceElement.textContent = this.formatMoney(totalPrice);
      console.log(`✅ Preço do botão atualizado DIRETAMENTE em updateProductPriceWithFrame: ${this.formatMoney(totalPrice)} (Produto: ${this.formatMoney(currentPrice)} + Frame: ${this.formatMoney(framePrice)})`);
    } else {
      console.warn(`⚠️ Botão de preço não encontrado para produto ${productIdNum}`);
      // Tenta usar a função updateIndividualButtonPrice como fallback
      this.updateIndividualButtonPrice(productId);
    }
    
    // Atualiza subtotal
    this.updateSubtotal();
    
    console.log(`💰 Preço atualizado: Produto ${productId}, Produto: ${this.formatMoney(currentPrice)}, Frame: ${this.formatMoney(framePrice)}, Total: ${this.formatMoney(totalPrice)}`);
  }
  
  // Remove frame do produto
  removeFrameFromProduct(productId) {
    console.log(`🗑️ Removendo frame do produto ${productId}`);
    
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
    if (!productItem) {
      console.warn(`⚠️ Produto não encontrado: ${productId}`);
      return;
    }
    
    const productImageContainer = productItem.querySelector('.combo-product-image');
    if (!productImageContainer) {
      console.warn(`⚠️ Container de imagem não encontrado para produto: ${productId}`);
      return;
    }
    
    // Remove frame visualmente
    productImageContainer.style.backgroundImage = '';
    productImageContainer.style.backgroundSize = '';
    productImageContainer.style.height = ''; // Remove altura customizada
    productImageContainer.classList.remove('has-frame');
    
    // Remove frame dos selecionados usando helper
    this.deleteSelectedFrame(productId);
    const normalizedId = this.normalizeProductId(productId);
    console.log(`🗑️ Frame removido do selectedFrames para produto ${normalizedId}`);
    
    // Restaura preço original do produto (sem frame)
    this.restoreProductPriceWithoutFrame(productId);
    
    // FORÇA atualização do subtotal após remover frame
    setTimeout(() => {
      console.log(`🔄 Forçando atualização do subtotal após remover frame...`);
      this.updateSubtotal();
      // Atualiza aba BUY ALL também
      this.updateBuyAllTab();
    }, 100);
    
    // Restaura imagem do produto ao estado original (100% com padding)
    const productImg = productImageContainer.querySelector('.combo-product-main-image');
    if (productImg) {
      productImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 8px;
        position: static;
        transform: none;
        z-index: auto;
      `;
    }
    
    console.log(`✅ Frame removido com sucesso do produto ${productId}`);
  }
  
  // Restaura preço do produto sem frame
  restoreProductPriceWithoutFrame(productId) {
    const productItem = document.querySelector(`.combo-product-item[data-product-id="${productId}"]`);
    if (!productItem) return;
    
    // Busca variante selecionada para pegar preço original
    const variantId = this.selectedVariants.get(productId);
    if (!variantId) return;
    
    // Busca produto no config
    const product = this.config.products?.find(p => p.id === productId);
    if (!product) return;
    
    // Busca variante no produto
    const variant = product.variants?.find(v => v.id === variantId);
    if (!variant) return;
    
    // Restaura preço original (sem frame)
    const originalPrice = variant.price;
    
    const priceElement = productItem.querySelector(`.price-amount[data-product-id="${productId}"]`);
    if (priceElement) {
      priceElement.textContent = this.formatMoney(originalPrice);
    }
    
    // Atualiza preço no botão também - busca em todo o documento
    const buttonPriceElement = document.querySelector(`.combo-product-button-price[data-product-id="${productId}"]`);
    if (buttonPriceElement) {
      buttonPriceElement.textContent = this.formatMoney(originalPrice);
      console.log(`✅ Preço do botão restaurado: ${this.formatMoney(originalPrice)}`);
    } else {
      console.warn(`⚠️ Botão de preço não encontrado para produto ${productId}`);
    }
    
    // Atualiza subtotal
    this.updateSubtotal();
    
    console.log(`💰 Preço restaurado: Produto ${productId}, Preço: ${this.formatMoney(originalPrice)}`);
  }

  // Extrai texto de HTML (remove tags)
  stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Formata preço
  formatMoney(cents) {
    let formatted = '';
    
    // Usa função formatMoney global se disponível
    if (typeof formatMoney === 'function') {
      const format = this.config.moneyFormat || 
                     window.moneyFormat || 
                     (window.theme && window.theme.settings && window.theme.settings.money_with_currency_format) ||
                     (window.Shopify && Shopify.money_format) ||
                     '€{{amount_with_comma_separator}}';
      formatted = formatMoney(cents, format);
      // Remove HTML se houver
      return this.stripHtml(formatted);
    }
    
    // Fallback: usa Shopify.formatMoney se disponível
    if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
      const format = this.config.moneyFormat || 
                     window.moneyFormat || 
                     (window.theme && window.theme.settings && window.theme.settings.money_with_currency_format) ||
                     Shopify.money_format ||
                     '€{{amount_with_comma_separator}}';
      formatted = Shopify.formatMoney(cents, format);
      // Remove HTML se houver
      return this.stripHtml(formatted);
    }
    
    // Fallback manual: formatação básica
    const value = (parseInt(cents, 10) || 0) / 100;
    const formatString = this.config.moneyFormat || '€{{amount_with_comma_separator}}';
    
    // Função para formatar com delimitadores
    const formatWithDelimiters = (number, precision = 2, thousands = '.', decimal = ',') => {
      if (isNaN(number) || number == null) return '0';
      const parts = number.toFixed(precision).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(decimal);
    };
    
    // Detecta qual formato usar baseado no placeholder
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const match = formatString.match(placeholderRegex);
    
    if (match) {
      const token = match[1];
      let formattedValue;
      
      switch (token) {
        case 'amount':
          formattedValue = formatWithDelimiters(value, 2, ',', '.');
          break;
        case 'amount_no_decimals':
          formattedValue = formatWithDelimiters(value, 0, ',', '.');
          break;
        case 'amount_with_comma_separator':
          formattedValue = formatWithDelimiters(value, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          formattedValue = formatWithDelimiters(value, 0, '.', ',');
          break;
        default:
          formattedValue = formatWithDelimiters(value, 2, '.', ',');
      }
      
      formatted = formatString.replace(placeholderRegex, formattedValue);
    } else {
      // Se não encontrou placeholder, retorna formato básico
      formatted = `€${formatWithDelimiters(value, 2, '.', ',')}`;
    }
    
    // Remove HTML se houver e retorna apenas texto
    return this.stripHtml(formatted);
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.gallery-wall-combo-editable')) {
    new GalleryWallComboEditable();
  }
});


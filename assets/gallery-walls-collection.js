/**
 * Gallery Walls Collection - Busca automática de imagens
 * Busca a imagem principal de cada página de gallery wall combo
 */

class GalleryWallsCollection {
  constructor() {
    this.init();
  }

  init() {
    // Aguarda o DOM carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.loadImages());
    } else {
      this.loadImages();
    }
  }

  async loadImages() {
    const cards = document.querySelectorAll('.gallery-wall-card');
    
    cards.forEach((card, index) => {
      // Adiciona um identificador único para evitar duplicação
      if (!card.hasAttribute('data-card-index')) {
        card.setAttribute('data-card-index', index);
      }
      
      // Agora pode ser URL de página ou coleção
      const url = card.getAttribute('href') || card.getAttribute('data-page-url') || card.getAttribute('data-collection-url');
      if (!url) return;
      
      // Verifica se precisa buscar imagem
      const img = card.querySelector('img');
      const svg = card.querySelector('svg, .gallery-wall-placeholder');
      
      // Se já tem uma imagem válida (não placeholder), NÃO interfere
      if (img && img.src && !img.src.includes('placeholder') && !img.src.includes('data:image/svg') && !img.src.includes('cdn.shopify.com/s/files/1/placeholder')) {
        // Verifica se a imagem tem o atributo data-collection-image (renderizada pelo Liquid)
        if (img.hasAttribute('data-collection-image')) {
          // Imagem já está renderizada corretamente pelo Liquid, não faz nada
          return;
        }
        // Se não tem o atributo mas tem uma URL válida do Shopify, também não interfere
        if (img.src.includes('cdn.shopify.com') || img.src.includes('myshopify.com')) {
          return;
        }
      }
      
      // Verifica se já foi processado anteriormente
      if (card.hasAttribute('data-image-processed')) {
        return; // Já foi processado, não processa novamente
      }
      
      // Se tem SVG placeholder ou não tem imagem, busca a imagem
      if (svg || !img) {
        // Se for coleção, verifica se já tem imagem renderizada pelo Liquid
        if (url.includes('/collections/')) {
          // É uma coleção - verifica se já tem imagem válida renderizada pelo Liquid
          const existingImg = card.querySelector('img[data-collection-image="true"]');
          if (existingImg && existingImg.src && !existingImg.src.includes('placeholder')) {
            // Já tem imagem válida renderizada pelo Liquid, não precisa buscar
            console.log(`ℹ️ Card de coleção já tem imagem renderizada pelo Liquid: ${existingImg.src}`);
            return;
          }
          
          // Se não tem imagem, pode tentar buscar da página da coleção
          // Mas normalmente o Liquid já deveria ter renderizado
          console.log(`⚠️ Coleção sem imagem, tentando buscar: ${url}`);
          this.fetchPageImage(url, card);
        } else {
          // É uma página, busca como antes
          this.fetchPageImage(url, card);
        }
      }
    });
  }

  async fetchPageImage(pageUrl, cardElement) {
    try {
      // Verifica se já está processando este card para evitar duplicação
      if (cardElement.hasAttribute('data-loading-image')) {
        return; // Já está carregando, não faz nada
      }
      
      // Pega identificadores únicos do card para garantir que a imagem é para este card específico
      const cardCollectionHandle = cardElement.getAttribute('data-collection-handle');
      const cardCollectionId = cardElement.getAttribute('data-collection-id');
      const cardUrl = cardElement.getAttribute('href') || cardElement.getAttribute('data-collection-url');
      
      console.log(`🔍 Buscando imagem para card: ${cardCollectionHandle || cardUrl}`);
      
      // Marca como carregando
      cardElement.setAttribute('data-loading-image', 'true');
      
      // Garante URL completa
      if (pageUrl.startsWith('/')) {
        pageUrl = window.location.origin + pageUrl;
      }
      
      // Faz requisição para a página
      const response = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Cria um parser temporário
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Busca a imagem principal do combo
      let imageUrl = null;
      
      // Método 1: Busca pelo atributo data-combo-main-image
      const dataImage = doc.querySelector('[data-combo-main-image]');
      if (dataImage && dataImage.getAttribute('data-combo-main-image')) {
        imageUrl = dataImage.getAttribute('data-combo-main-image');
        console.log(`✅ Imagem encontrada via data-combo-main-image: ${imageUrl}`);
      }
      
      // Método 2: Busca pelo atributo data-main-image-url
      if (!imageUrl) {
        const dataMainImage = doc.querySelector('[data-main-image-url]');
        if (dataMainImage && dataMainImage.getAttribute('data-main-image-url')) {
          imageUrl = dataMainImage.getAttribute('data-main-image-url');
          console.log(`✅ Imagem encontrada via data-main-image-url: ${imageUrl}`);
        }
      }
      
      // Método 3: Busca pelo ID combo-main-image (dentro do container)
      if (!imageUrl) {
        const comboImageContainer = doc.querySelector('#combo-main-image-container');
        if (comboImageContainer) {
          const comboImage = comboImageContainer.querySelector('#combo-main-image, .combo-main-image-img, img');
          if (comboImage && comboImage.src) {
            imageUrl = comboImage.src;
            console.log(`✅ Imagem encontrada via combo-main-image-container: ${imageUrl}`);
          }
        }
      }
      
      // Método 4: Busca pelo ID combo-main-image diretamente
      if (!imageUrl) {
        const comboImage = doc.getElementById('combo-main-image');
        if (comboImage && comboImage.src) {
          imageUrl = comboImage.src;
          console.log(`✅ Imagem encontrada via ID combo-main-image: ${imageUrl}`);
        }
      }
      
      // Método 5: Busca pela classe combo-main-image-img (nova estrutura)
      if (!imageUrl) {
        const comboImageClass = doc.querySelector('.combo-main-image-img');
        if (comboImageClass && comboImageClass.src) {
          imageUrl = comboImageClass.src;
          console.log(`✅ Imagem encontrada via classe combo-main-image-img: ${imageUrl}`);
        }
      }
      
      // Método 6: Busca dentro de combo-main-image-wrapper
      if (!imageUrl) {
        const wrapper = doc.querySelector('.combo-main-image-wrapper');
        if (wrapper) {
          const img = wrapper.querySelector('.combo-main-image-img, img');
          if (img && img.src) {
            imageUrl = img.src;
            console.log(`✅ Imagem encontrada via combo-main-image-wrapper: ${imageUrl}`);
          }
        }
      }
      
      // Se encontrou a imagem, atualiza o card
      if (imageUrl) {
        // Garante que a URL está completa
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        }
        
        // Remove parâmetros de tamanho e adiciona tamanho maior
        if (imageUrl.includes('?')) {
          imageUrl = imageUrl.split('?')[0];
        }
        if (!imageUrl.includes('_1200x') && !imageUrl.includes('_800x') && !imageUrl.includes('_600x')) {
          imageUrl += (imageUrl.includes('?') ? '&' : '?') + 'width=1200';
        }
        
        // Verifica novamente se já tem uma imagem válida E se é a mesma URL (evita substituir com a mesma imagem)
        const existingImg = cardElement.querySelector('img');
        if (existingImg && existingImg.src) {
          // Normaliza URLs para comparação
          const existingUrl = existingImg.src.split('?')[0].split('#')[0];
          const newUrl = imageUrl.split('?')[0].split('#')[0];
          
          if (existingUrl === newUrl) {
            // É a mesma imagem, não precisa substituir
            console.log(`ℹ️ Card já tem a imagem correta: ${imageUrl}`);
            cardElement.removeAttribute('data-loading-image');
            return;
          }
          
          // Se não é placeholder, verifica se deve substituir
          if (!existingImg.src.includes('placeholder') && !existingImg.src.includes('data:image/svg')) {
            // Só substitui se a nova imagem for diferente
            if (existingUrl !== newUrl) {
              console.log(`🔄 Substituindo imagem: ${existingUrl} -> ${newUrl}`);
            } else {
              cardElement.removeAttribute('data-loading-image');
              return;
            }
          }
        }
        
        // Remove placeholder SVG se existir
        const svg = cardElement.querySelector('svg');
        if (svg) {
          svg.remove();
        }
        
        // Remove todas as imagens existentes para evitar duplicação
        const allImgs = cardElement.querySelectorAll('img');
        allImgs.forEach(img => img.remove());
        
        // Cria a nova imagem com identificadores únicos
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = cardElement.getAttribute('title') || '';
        img.loading = 'lazy';
        img.width = 1200;
        img.height = 1200;
        
        // Adiciona identificadores únicos para garantir que é a imagem correta deste card
        if (cardCollectionHandle) {
          img.setAttribute('data-collection-handle', cardCollectionHandle);
        }
        if (cardCollectionId) {
          img.setAttribute('data-collection-id', cardCollectionId);
        }
        img.setAttribute('data-card-url', cardUrl || pageUrl);
        
        cardElement.appendChild(img);
        
        console.log(`✅ Imagem atualizada para card: ${cardCollectionHandle || cardUrl} -> ${imageUrl}`);
        
        // Marca como processado para evitar reprocessamento
        cardElement.setAttribute('data-image-processed', 'true');
      } else {
        console.warn(`⚠️ Imagem não encontrada para: ${pageUrl}`);
      }
      
      // Remove flag de carregamento
      cardElement.removeAttribute('data-loading-image');
    } catch (error) {
      // Remove flag de carregamento mesmo em caso de erro
      cardElement.removeAttribute('data-loading-image');
      // Silenciosamente ignora erros (pode ser CORS, rede, etc)
      // O placeholder permanece visível
      console.debug('Não foi possível buscar imagem automaticamente para:', pageUrl, error);
    }
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GalleryWallsCollection();
  });
} else {
  new GalleryWallsCollection();
}


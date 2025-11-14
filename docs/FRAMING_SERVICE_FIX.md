# Correção do Framing Service - Adicionar ao Carrinho

## 📋 Resumo

Este documento descreve as correções implementadas para o sistema de Framing Service, que estava apresentando erros ao adicionar produtos ao carrinho e não estava buscando o produto correto do Shopify.

## 🐛 Problemas Identificados

1. **Erro JavaScript**: `ReferenceError: Cannot access 'addItemsFallback' before initialization`
2. **Produto não encontrado**: O sistema buscava pelo handle `framing-service`, mas o handle correto é `product-options`
3. **Preço hardcoded**: O preço estava fixo como `€12,00` em vez de ser dinâmico do Shopify
4. **Erro 404**: Tentativas de buscar produto via fetch causavam erros 404
5. **Framing service não adicionava ao carrinho**: Mesmo com checkbox marcado, o produto não era adicionado

## ✅ Correções Implementadas

### 1. Correção do Handle do Produto

**Problema**: O código estava buscando pelo handle `framing-service`, mas o handle correto é `product-options`.

**Solução**: Prioridade de busca ajustada:
```liquid
{%- assign possible_handles = 'product-options,framing-service,framing-service-product,framing,services' | split: ',' -%}
```

**Múltiplas formas de busca implementadas**:
1. Via collection configurada em `section.settings.framing_service_collection`
2. Via collections conhecidas (`Services`, `services`, `framing-services`, `Framing Services`)
3. Via handle direto usando `all_products['product-options']` (prioridade)
4. Busca em todas as collections procurando produtos com "Framing" ou "Service" no título/handle

### 2. Correção da Ordem das Funções JavaScript

**Problema**: Funções estavam sendo chamadas antes de serem definidas, causando erro de inicialização.

**Solução**: Todas as funções são agora definidas ANTES de serem usadas:

```javascript
// ========== DEFINIR TODAS AS FUNÇÕES ANTES DE USAR ==========
const openCartDrawer = () => { ... };

const addItemsFallback = (items) => { ... };

function addItemsToCart(items) { ... }
// ========== FIM DAS DEFINIÇÕES DE FUNÇÕES ==========

// Só depois disso as funções são chamadas
if (addFramingServiceCheckbox && addFramingServiceCheckbox.checked) {
  // ... código que usa addItemsToCart()
}
```

### 3. Busca Dinâmica do Produto via Liquid

**Problema**: O código tentava buscar o produto via JavaScript fetch, causando erros 404.

**Solução**: Implementação de busca completa via Liquid que:
- Busca o produto usando múltiplas estratégias
- Extrai `handle`, `variant_id` e `price` diretamente do Shopify
- Passa esses dados via atributos `data-*` no HTML
- JavaScript usa esses dados diretamente, sem necessidade de fetch

```liquid
{%- if framing_service_product and framing_service_product.available -%}
  {%- assign framing_service_handle = framing_service_product.handle -%}
  {%- assign framing_service_variant_id = framing_service_product.selected_or_first_available_variant.id -%}
  {%- assign framing_service_price = framing_service_product.selected_or_first_available_variant.price -%}
{%- endif -%}

<div id="framing-service-add-wrapper"
     data-framing-service-handle="{{ framing_service_handle }}"
     data-framing-service-variant-id="{{ framing_service_variant_id }}"
     data-framing-service-price="{{ framing_service_price }}">
```

### 4. Preço Dinâmico e Suporte a Múltiplas Moedas

**Problema**: Preço estava hardcoded como `€12,00`.

**Solução**: 
- Preço é obtido diretamente do produto via Liquid
- Formatação usando funções nativas do Shopify (`formatMoney` ou `Shopify.formatMoney`)
- Suporte automático a múltiplas moedas baseado na configuração da loja

```javascript
if (priceFromData) {
  var price = parseInt(priceFromData, 10);
  
  if (typeof formatMoney === 'function' && window.theme && window.theme.settings) {
    priceDisplay.innerHTML = '<span class="money">' + formatMoney(price, window.theme.settings.money_with_currency_format) + '</span>';
  } else if (window.Shopify && Shopify.formatMoney) {
    priceDisplay.innerHTML = '<span class="money">' + Shopify.formatMoney(price, ...) + '</span>';
  }
}
```

### 5. Adicionar ao Carrinho

**Problema**: Framing service não era adicionado ao carrinho mesmo com checkbox marcado.

**Solução**: 
- Uso direto do `variant_id` passado via atributo `data-`
- Verificações de segurança antes de adicionar
- Logs para debug quando produto não é encontrado

```javascript
if (framingServiceVariantId) {
  console.log('Adding framing service to cart with variant ID:', framingServiceVariantId);
  itemsToAdd.push({ 
    id: parseInt(framingServiceVariantId, 10), 
    quantity: 1, 
    properties: { 
      "I_ID": Math.random().toString(36).substring(2, 10) 
    } 
  });
  addItemsToCart(itemsToAdd);
}
```

## 📁 Arquivos Modificados

### `snippets/related-product-variant-frame-picker.liquid`

**Mudanças principais**:
1. **Linhas 203-291**: Lógica de busca do produto do framing service via Liquid
2. **Linhas 408-489**: Definição de funções JavaScript antes do uso
3. **Linhas 492-533**: Lógica de adicionar framing service ao carrinho
4. **Linhas 974-1021**: Função de atualização do checkbox e exibição do preço

### `sections/main-product.liquid`

**Mudanças anteriores**:
- Adicionado setting `framing_service_collection` no schema (se ainda não existir)

## 🎯 Como Funciona Agora

1. **Ao carregar a página**:
   - Liquid busca o produto do framing service usando múltiplas estratégias
   - Se encontrar, extrai handle, variant_id e preço
   - Passa esses dados via atributos `data-*` no elemento HTML

2. **Ao selecionar um frame**:
   - Checkbox do framing service aparece
   - Preço é exibido dinamicamente (se produto foi encontrado)
   - Preço formatado automaticamente na moeda correta

3. **Ao marcar o checkbox e clicar em "Add to cart"**:
   - Sistema verifica se há variant_id disponível
   - Adiciona o framing service ao array de itens
   - Chama `addItemsToCart()` que usa a API do Shopify
   - Abre o drawer do carrinho ou redireciona para `/cart`

## 🔍 Debug e Logs

O código inclui logs detalhados para facilitar debugging:

- `console.log('Adding framing service to cart with variant ID:', variantId)` - Quando adiciona com sucesso
- `console.warn('Framing service variant ID not available...')` - Quando produto não é encontrado
- `console.warn('Available data attributes:', {...})` - Mostra dados disponíveis quando produto não é encontrado

## ✅ Testes Realizados

- ✅ Checkbox aparece quando frame é selecionado
- ✅ Preço é exibido dinamicamente (se produto encontrado)
- ✅ Preço formatado corretamente na moeda da loja
- ✅ Framing service adicionado ao carrinho com sucesso
- ✅ Sem erros 404 no console
- ✅ Sem erros de inicialização JavaScript
- ✅ Funciona com múltiplas moedas

## 📝 Notas Importantes

1. **Handle do Produto**: O handle correto é `product-options`, não `framing-service`
2. **Configuração**: É recomendado configurar a collection do framing service em `section.settings.framing_service_collection` para melhor performance
3. **Fallbacks**: O sistema tem múltiplos fallbacks, então funcionará mesmo se a collection não estiver configurada
4. **Preço**: O preço vem diretamente do Shopify, garantindo consistência e suporte a múltiplas moedas

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar testes automatizados
- [ ] Melhorar tratamento de erros quando produto não é encontrado
- [ ] Adicionar validação adicional antes de adicionar ao carrinho
- [ ] Documentar configuração da collection no admin do Shopify

## 👤 Autor

Correções implementadas em resposta a problemas relatados pelo usuário.

## 📅 Data

Novembro 2025

---

**Status**: ✅ FUNCIONANDO


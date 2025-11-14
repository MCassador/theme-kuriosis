# Documentação: Frame "New" - Implementação

## 📋 Resumo
Este documento descreve a implementação do frame "new" que aparece exclusivamente quando o material "400g Cotton Canvas" está selecionado.

---

## 🎯 Funcionalidade Implementada

### Objetivo
- Adicionar uma nova opção de frame chamada "New"
- Esta opção deve aparecer **APENAS** quando o material "400g Cotton Canvas" está selecionado
- O frame deve ser um produto real (não virtual), buscado das coleções de frames existentes
- Evitar duplicação do frame no HTML

---

## 📁 Arquivos Modificados

### 1. `snippets/related-product-variant-frame-picker.liquid`

#### Mudanças Principais:

##### A. Exclusão do frame "new" do loop principal (Linha 81)
```liquid
{% unless product.id == current_product_id or product.handle == 'new' or product.title contains 'New' or product.metafields.custom.frame_type == 'new' %}
```

**Motivo:** Evitar que o frame "new" seja renderizado duas vezes (uma vez no loop normal e outra na seção especial).

##### B. Salvamento do ID do produto atual (Linha 76)
```liquid
{% assign current_product_id = product.id %}
```

**Motivo:** Evitar que o produto atual apareça como opção de frame.

##### C. Busca específica do frame "new" (Linhas 204-216)
```liquid
<!-- New Frame option (only available for 400g Cotton Canvas) - from collection -->
{% comment %} Find the "new" frame product from the same collections {% endcomment %}
{% assign new_frame_product = null %}
{% if frame_products %}
  {% for frame_product in frame_products %}
    {% unless frame_product.id == current_product_id %}
      {% if frame_product.handle == 'new' or frame_product.title contains 'New' or frame_product.metafields.custom.frame_type == 'new' %}
        {% assign new_frame_product = frame_product %}
        {% break %}
      {% endif %}
    {% endunless %}
  {% endfor %}
{% endif %}
```

**Como funciona a busca:**
O código busca o frame "new" de **3 formas diferentes** (em ordem de prioridade):

1. **Por Metafield (PRIORIDADE):** `frame_product.metafields.custom.frame_type == 'new'`
   - ⚠️ **RECOMENDADO - MAIS FLEXÍVEL**
   - Busca usando um metafield customizado chamado `frame_type` com valor "new"
   - **Vantagem:** Você pode mudar o nome/handle do produto sem quebrar a funcionalidade
   - **Configuração:** Na Shopify Admin, produto frame → Metafields → Custom → `frame_type` = `new`

2. **Por Handle:** `frame_product.handle == 'new'`
   - Busca um produto com o handle exatamente igual a "new"
   - ⚠️ **Cuidado:** Se você mudar o handle do produto, precisa atualizar o código

3. **Por Título:** `frame_product.title contains 'New'`
   - Busca se o título do produto contém a palavra "New"
   - Exemplos que funcionam: "New Frame", "Frame New", "New", etc.
   - ⚠️ **Cuidado:** Pode pegar produtos não intencionados se outros frames tiverem "New" no título

**Recomendação:** Use **Metafield `frame_type = 'new'`** para máxima flexibilidade. Assim você pode:
- Mudar o nome do produto livremente
- Mudar o handle do produto
- Ter controle total sobre qual produto é o frame "new"

##### D. Renderização do frame "new" (Linhas 218-330)
O frame é processado da mesma forma que os outros frames:
- Detecta opções de tamanho
- Calcula preços por variante
- Verifica disponibilidade
- Renderiza com atributos `data-*` completos

**Importante:** O frame começa **escondido por padrão**:
```liquid
style="display: none;"
```

##### E. JavaScript - Detecção de Material (Linhas 542-640)
```javascript
findMaterialOption() {
  // Verifica dropdown customizado
  // Verifica radio buttons
  // Verifica select element
}

getCurrentMaterial() {
  // Retorna o material selecionado
  // Prioriza o texto do label (.material-title)
  // Fallback para o valor do input
}

syncFrameWithMaterial() {
  // Compara material atual com "400g Cotton Canvas"
  // Mostra/esconde o frame "new" dinamicamente
}
```

---

### 2. `config/settings_schema.json`

#### Adicionado (Linhas 945-950):
```json
{
  "type": "image_picker",
  "id": "new_frame_image",
  "label": "New Frame Image",
  "info": "Upload an image for the 'New' frame option (only available for 400g Cotton Canvas)."
}
```

**Motivo:** Permitir upload de imagem customizada para o frame "new" nas configurações do tema (fallback se o produto não tiver imagem).

---

## 🔍 Como Funciona a Busca do Frame "New"

### Coleta de Produtos
Os frames são buscados das coleções baseado em metafields do produto principal:
```liquid
{% if product.metafields.custom.square_frame == true %}
  {% assign frame_products = collections['square-frame'].products %}
{% elsif product.metafields.custom.portrait_frame == true %}
  {% assign frame_products = collections['portrait-frame'].products %}
{% elsif product.metafields.custom.landscape_frame == true %}
  {% assign frame_products = collections['landscape-frame-1'].products %}
{% endif %}
```

### Identificação do Frame "New"
O código busca o frame "new" com estas condições (em ordem de prioridade):

#### ⭐ Opção 1: Metafield customizado (RECOMENDADO - MAIS FLEXÍVEL)
```liquid
frame_product.metafields.custom.frame_type == 'new'
```

**Como configurar:**
1. Na Shopify Admin, vá no produto frame
2. Adicione um metafield customizado:
   - **Namespace:** `custom`
   - **Key:** `frame_type`
   - **Type:** `Single line text`
   - **Value:** `new`

**Vantagens:**
- ✅ Não depende de handle ou título
- ✅ Você pode mudar o nome do produto livremente
- ✅ Você pode mudar o handle do produto
- ✅ Permite múltiplas variações (ex: `new-variant-1`, `new-variant-2`)
- ✅ Mais flexível para diferentes idiomas
- ✅ Não quebra se você renomear o produto

**Exemplo prático:**
- Produto pode se chamar "Frame Especial 2025"
- Handle pode ser "frame-especial-2025"
- Mas o metafield `frame_type = 'new'` mantém a funcionalidade funcionando

#### Opção 2: Handle "new" (Backup)
```liquid
frame_product.handle == 'new'
```
**Exemplo:** Produto com handle `new-frame` ou `new` na loja Shopify

⚠️ **Limitação:** Se você mudar o handle do produto, precisa atualizar o código.

#### Opção 3: Título contendo "New" (Backup)
```liquid
frame_product.title contains 'New'
```
**Exemplos de títulos que funcionam:**
- "New Frame"
- "Frame New"
- "New"
- "New Wood Frame"
- "Modern New Frame"

⚠️ **Cuidado:** Esta opção pode pegar produtos não intencionados se outros frames tiverem "New" no título.

---

## 💡 Mudando o Nome/Handle do Frame "New"

**Você quer mudar o nome ou handle do produto frame?**

✅ **Sim, você pode!** Basta usar o **Metafield** ao invés de depender do nome/handle.

### Passo a passo:

1. **Configure o Metafield** (se ainda não configurou):
   - Shopify Admin → Produto frame → Metafields
   - Adicione: `custom.frame_type` = `new`

2. **Mude o nome/handle do produto:**
   - Você pode renomear para "Frame Premium 2025"
   - Você pode mudar o handle para "frame-premium-2025"
   - **Tudo continua funcionando** porque o código busca pelo metafield primeiro!

3. **Teste:**
   - O frame deve continuar aparecendo quando "400g Cotton Canvas" está selecionado
   - O nome exibido será o novo nome do produto

**Resumo:** Com metafield configurado, você tem total liberdade para mudar nomes e handles!

---

## 🚀 Como Adicionar Variações do Frame "New"

Para adicionar múltiplas variações do frame "new", você pode usar o **Metafield `frame_type`**:

### Exemplo: Criar "New Variant 1" e "New Variant 2"

1. **Criar produtos de frame na Shopify:**
   - Frame "New Variant 1" → Metafield `frame_type` = `new-variant-1`
   - Frame "New Variant 2" → Metafield `frame_type` = `new-variant-2`

2. **Modificar o código (Linha 209):**
```liquid
{% if frame_product.handle == 'new' 
   or frame_product.title contains 'New' 
   or frame_product.metafields.custom.frame_type == 'new'
   or frame_product.metafields.custom.frame_type == 'new-variant-1'
   or frame_product.metafields.custom.frame_type == 'new-variant-2' %}
```

3. **Ou criar uma lógica mais flexível:**
```liquid
{% assign frame_type = frame_product.metafields.custom.frame_type %}
{% if frame_product.handle == 'new' 
   or frame_product.title contains 'New' 
   or frame_type == 'new'
   or frame_type contains 'new-' %}
```

Isso pegaria qualquer metafield que comece com "new-".

---

## 📝 Checklist de Implementação para Outro Tema

### 1. Arquivo `snippets/related-product-variant-frame-picker.liquid`

- [ ] Adicionar salvamento do `current_product_id` antes do loop (linha 76)
- [ ] Excluir frame "new" do loop principal (linha 81)
- [ ] Adicionar busca específica do frame "new" (linhas 204-216)
- [ ] Adicionar processamento e renderização do frame "new" (linhas 218-330)
- [ ] Adicionar função `findMaterialOption()` no JavaScript (linhas 542-590)
- [ ] Adicionar função `getCurrentMaterial()` no JavaScript (linhas 638-648)
- [ ] Adicionar função `syncFrameWithMaterial()` no JavaScript (linhas 593-636)
- [ ] Adicionar chamada de `syncFrameWithMaterial()` no `initFrames()` (linha 702)
- [ ] Adicionar listeners de material no `setupEventListeners()` (linhas 721-727)
- [ ] Adicionar listeners de labels de material (linhas 729-737)

### 2. Arquivo `config/settings_schema.json`

- [ ] Adicionar configuração de imagem `new_frame_image` na seção "Framing Variants" (após linha 944)

### 3. Configuração na Shopify Admin

- [ ] Criar produto de frame "new" na coleção apropriada (`square-frame`, `portrait-frame`, ou `landscape-frame-1`)
- [ ] Configurar handle ou título contendo "New", OU adicionar metafield `custom.frame_type` = `new`
- [ ] Fazer upload da imagem do frame nas configurações do tema (Theme Settings > Framing Variants > New Frame Image)

---

## 🎨 Comportamento Final

### Quando "225g Fine Art Paper" está selecionado:
- ❌ Frame "new" está **ESCONDIDO**
- ✅ Outros frames aparecem normalmente

### Quando "400g Cotton Canvas" está selecionado:
- ✅ Frame "new" aparece automaticamente
- ✅ Outros frames também aparecem
- ✅ Frame "new" pode ser selecionado normalmente

### Mudança de Material:
- Ao mudar de "400g Cotton Canvas" para "225g Fine Art Paper": frame "new" desaparece
- Ao mudar de "225g Fine Art Paper" para "400g Cotton Canvas": frame "new" aparece
- Se o frame "new" estiver selecionado quando o material muda, ele é desmarcado automaticamente

---

## 🔧 Troubleshooting

### Frame "new" não aparece:
1. Verifique se o produto está na coleção correta
2. Verifique se o handle/título/metafield está correto
3. Abra o console do navegador e verifique os logs:
   - `Selected material:` deve mostrar "400g Cotton Canvas"
   - `Match: true` deve aparecer

### Frame "new" aparece duplicado:
1. Verifique se o frame não está no loop principal (linha 81 deve excluí-lo)
2. Verifique se há múltiplos produtos com handle/título "new"

### Frame "new" aparece quando não deveria:
1. Verifique se a detecção de material está funcionando
2. Console deve mostrar `Match: false` quando material errado estiver selecionado
3. Verifique se há espaços extras no nome do material na comparação

---

## 📌 Notas Importantes

1. **Material deve corresponder exatamente:** A comparação é case-sensitive e não permite espaços extras
   - ✅ "400g Cotton Canvas" → Funciona
   - ❌ "400g cotton canvas" → Não funciona (case-sensitive)
   - ❌ " 400g Cotton Canvas " → Não funciona (espaços extras)

2. **Frame começa escondido:** Isso evita "flash" do frame aparecendo antes do JavaScript carregar

3. **Produto real vs Virtual:** O frame "new" é um produto real no Shopify, não um frame virtual. Isso permite:
   - Gerenciar estoque
   - Ter múltiplas variantes (tamanhos)
   - Ter preços diferentes por tamanho
   - Funcionar com o sistema de carrinho normalmente

4. **Múltiplas formas de busca:** Se você quiser ser mais específico, use o metafield `frame_type` em vez de handle/título

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador (F12) para logs de debug
2. Verifique se o produto frame está nas coleções corretas
3. Verifique se os metafields estão configurados corretamente




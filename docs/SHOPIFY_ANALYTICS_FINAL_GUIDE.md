# 📊 Shopify Analytics Integration - Gallery Wall Builder

## ✅ Sistema Implementado

O sistema de analytics foi configurado para enviar dados **DIRETAMENTE para o Shopify Analytics oficial** (`/store/kuriosis-markets/analytics`).

**❌ IMPORTANTE: NÃO EXISTE MAIS UM DASHBOARD CUSTOMIZADO.**
Os dados são enviados para o Shopify Analytics nativo do Shopify.

---

## 🎯 O Que É Rastreado

### **Eventos Enviados para Shopify Analytics**
1. **Page Views** - Cada vez que alguém acessa a página
2. **Step Navigation** - Quando usuários avançam nos steps
3. **Product Selections** - Quando produtos são selecionados
4. **Add to Cart** - Quando itens são adicionados ao carrinho
5. **Purchases** - Compras finalizadas

### **Dados Enviados**
- Session ID único
- Número do step
- Dados do produto
- Valor total do carrinho
- Timestamp de cada evento

---

## 🚀 COMO VER OS DADOS NO SHOPIFY ANALYTICS

### **Passo 1: Acessar o Shopify Analytics**
1. Faça login no seu painel Shopify Admin
2. No menu lateral, clique em **"Analytics"** (ou acesse diretamente: `https://admin.shopify.com/store/kuriosis-markets/analytics`)
3. Você verá o dashboard padrão do Shopify Analytics

### **Passo 2: Ver Dados Gerais**
- O dashboard já mostra automaticamente vendas, pedidos e conversões da sua loja
- Todos os dados do gallery builder estão **incluídos automaticamente** nessas métricas

### **Passo 3: Filtrar Dados Específicos do Gallery Builder**

#### **Opção A: Usando Reports**
1. No menu Analytics, clique em **"Reports"** (ou `https://admin.shopify.com/store/kuriosis-markets/analytics/reports`)
2. Clique em **"Create custom report"** ou **"New exploration"**
3. Configure o relatório com:
   - **Métrica**: Sessions, Page views, Sales
   - **Dimensão**: Page (URL), Content group 1
   - **Filtro**: Content group 1 = "Gallery Wall Builder"

#### **Opção B: Usando o Dashboard Principal**
1. No dashboard principal, você pode adicionar widgets personalizados
2. Clique em **"Customize"** ou **"Add widget"**
3. Configure para mostrar dados de páginas específicas contendo "gallery"

### **Passo 4: Ver Dados em Tempo Real (Live Activity)**
1. No menu Analytics, clique em **"Live view"** (ou `https://admin.shopify.com/store/kuriosis-markets/analytics/live`)
2. Você verá atividade em tempo real de visitantes na sua loja
3. As interações do gallery builder aparecerão aqui

---

## 🔍 EVENTOS ESPECÍFICOS DO GALLERY BUILDER

Os seguintes eventos são enviados para o Shopify Analytics e podem ser filtrados:

| Evento | Descrição | Onde Ver |
|--------|-----------|----------|
| `gallery_page_view` | Visualização da página | Reports > Page views |
| `gallery_step_start` | Início de cada step | Reports > Custom events |
| `gallery_step_complete` | Conclusão de cada step | Reports > Custom events |
| `gallery_product_select` | Seleção de produto | Reports > Product performance |
| `gallery_add_to_cart` | Adição ao carrinho | Reports > Cart analysis |
| `gallery_purchase` | Compra finalizada | Reports > Sales |

---

## 📊 MÉTRICAS DISPONÍVEIS NO SHOPIFY ANALYTICS

### **No Dashboard Principal:**
- ✅ **Total Sales** - Inclui vendas do gallery builder
- ✅ **Orders** - Pedidos com produtos do gallery
- ✅ **Average Order Value** - Valor médio dos pedidos
- ✅ **Conversion Rate** - Taxa de conversão geral

### **Nos Reports Customizados:**
Você pode criar relatórios específicos mostrando:
- Quantas pessoas acessaram a página gallery-walls
- Quantas pessoas completaram cada step
- Quantas pessoas adicionaram produtos ao carrinho
- Quantas pessoas finalizaram a compra
- Produtos mais selecionados
- Taxa de abandono em cada step

---

## ✅ VERIFICAÇÃO DE FUNCIONAMENTO

### **1. Console do Navegador (Imediato)**
1. Acesse a página `gallery-walls` na sua loja
2. Pressione **F12** para abrir o console do navegador
3. Procure por mensagens como:
   - `📊 Enhanced Gallery Page View tracked`
   - `📊 Enhanced Gallery Step 1 started`
   - `📊 Enhanced Gallery Product selected`
   - `📊 Enhanced Gallery items added to cart`

### **2. Shopify Analytics (24-48 horas)**
Os dados aparecem no Shopify Analytics após 24-48 horas:
1. Vá para **Analytics > Reports**
2. Crie um relatório customizado
3. Adicione a dimensão **Content group 1** e filtre por **"Gallery Wall Builder"**
4. Os dados do gallery builder aparecerão

---

## ⚠️ IMPORTANTE

1. **Os dados levam 24-48 horas para aparecer** no Shopify Analytics
2. **Não existe dashboard customizado** - tudo vai para o Shopify Analytics oficial
3. **Todos os dados estão incluídos** nas métricas gerais da loja
4. Para ver dados específicos do gallery, **você precisa criar relatórios customizados** com os filtros apropriados

---

## 🔧 Arquivos Envolvidos

- `assets/shopify-native-tracking.js` - Rastreamento principal
- `assets/enhanced-shopify-analytics.js` - Envio de dados detalhados
- `assets/gallery-wall-builder.js` - Integração com o builder

---

## 📞 Suporte

Se precisar de ajuda para visualizar os dados:
1. Acesse `https://help.shopify.com/en/manual/analytics`
2. Ou consulte a documentação oficial do Shopify Analytics

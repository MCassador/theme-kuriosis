# 📊 Shopify Native Analytics Integration - Gallery Wall Builder

> **⚠️ IMPORTANTE: Leia primeiro o arquivo `SHOPIFY_ANALYTICS_FINAL_GUIDE.md` para instruções atualizadas.**

## Visão Geral

Sistema de analytics que integra diretamente com o **dashboard nativo do Shopify Analytics**, enviando dados para `/store/kuriosis-markets/analytics`.

**❌ NÃO EXISTE MAIS UM DASHBOARD CUSTOMIZADO.** Os dados são enviados para o Shopify Analytics oficial.

## ✅ O Que É Rastreado

### **📈 Eventos Automáticos**
- ✅ **Page Views**: Visualizações da página gallery-walls
- ✅ **Step Navigation**: Navegação entre steps (1-5)
- ✅ **Product Selections**: Produtos selecionados
- ✅ **Add to Cart**: Adições ao carrinho
- ✅ **Purchase Events**: Compras efetivadas

### **🎯 Dados Enviados para Shopify Analytics**
- ✅ **Session ID**: Identificador único da sessão
- ✅ **Step Data**: Dados de cada step completado
- ✅ **Product Data**: IDs, títulos, preços dos produtos
- ✅ **Cart Data**: Valor total, quantidade de itens
- ✅ **E-commerce Data**: Dados de conversão

## 🚀 Como Visualizar no Shopify Analytics

### **1. Acessar o Dashboard**
1. Faça login no Shopify Admin
2. Vá para **Analytics** no menu lateral
3. Acesse `/store/kuriosis-markets/analytics`

### **2. Relatórios Disponíveis**

#### **📊 Dashboard Principal**
- **Gross Sales**: Vendas brutas incluindo gallery walls
- **Orders**: Pedidos com produtos do gallery builder
- **Average Order Value**: Valor médio dos pedidos
- **Conversion Rate**: Taxa de conversão

#### **📈 Relatórios de Vendas**
- **Sales by Product**: Produtos mais vendidos via gallery
- **Sales by Channel**: Vendas por canal (gallery wall builder)
- **Sales Over Time**: Vendas ao longo do tempo

#### **👥 Relatórios de Comportamento**
- **Customer Behavior**: Comportamento dos clientes
- **Product Performance**: Performance dos produtos
- **Cart Analysis**: Análise do carrinho

### **3. Métricas Específicas do Gallery Builder**

#### **🎨 Custom Reports**
Para ver dados específicos do gallery builder:

1. **Vá para Analytics > Reports**
2. **Clique em "New exploration"**
3. **Adicione as seguintes métricas:**
   - **Sessions**: Sessões na página gallery
   - **Page Views**: Visualizações da página
   - **Unique Visitors**: Visitantes únicos
   - **Sales**: Vendas via gallery builder

4. **Adicione as seguintes dimensões:**
   - **Page**: Páginas visitadas
   - **Content Group 1**: "Gallery Wall Builder"
   - **Content Group 2**: Categorias específicas
   - **Date**: Data das visitas

#### **🔍 Filtros Específicos para Gallery Builder**
Para filtrar apenas dados do gallery builder:

1. **Filtro por Content Group 1** = "Gallery Wall Builder"
2. **Filtro por Page Type** = "gallery_wall_builder"
3. **Filtro por Event Type** contendo "gallery_"
4. **Filtro por URL** contendo "gallery-wall-builder"

#### **📊 Eventos Específicos da Gallery**
- **gallery_page_view**: Visualizações da página
- **gallery_step_start**: Início de cada step
- **gallery_step_complete**: Conclusão de cada step
- **gallery_product_select**: Seleção de produtos
- **gallery_add_to_cart**: Adição ao carrinho

### **4. Relatórios em Tempo Real**

#### **📱 Live View**
- **Acesse Analytics > Live View**
- **Veja atividade em tempo real**
- **Monitore conversões do gallery builder**

#### **📊 Dashboard Personalizado**
- **Crie cards personalizados**
- **Adicione métricas específicas**
- **Configure alertas automáticos**

## 🔍 **COMO VERIFICAR SE ESTÁ FUNCIONANDO**

### **1. Verificação Imediata (Console do Navegador)**
1. **Abra a página gallery-walls**
2. **Pressione F12** para abrir o console
3. **Procure por mensagens** como:
   - `📊 Gallery Wall Builder page view tracked`
   - `📊 Gallery Step 1 started - Select Background`
   - `📊 Gallery Product selected:`
   - `📊 Gallery items added to cart:`

### **2. Verificação no Shopify Analytics (24-48h)**
1. **Vá para Analytics > Reports**
2. **Clique em "New exploration"**
3. **Adicione métrica "Sessions"**
4. **Adicione dimensão "Content Group 1"**
5. **Filtre por "Gallery Wall Builder"**
6. **Veja dados específicos** da gallery

### **3. Filtros para Dados da Gallery**
- **Content Group 1** = "Gallery Wall Builder"
- **Page Type** = "gallery_wall_builder"
- **Event Type** contendo "gallery_"
- **URL** contendo "gallery-wall-builder"

## 🎯 Métricas Principais para Monitorar

### **1. Conversão**
- **Gallery Page Views**: Visualizações da página
- **Gallery Conversions**: Conversões para carrinho
- **Gallery Sales**: Vendas via gallery builder
- **Conversion Rate**: Taxa de conversão gallery vs site

### **2. Produtos**
- **Most Popular Products**: Produtos mais selecionados
- **Most Popular Sizes**: Tamanhos mais escolhidos
- **Product Performance**: Performance por produto

### **3. Comportamento**
- **Step Completion Rate**: Taxa de conclusão por step
- **Abandonment Points**: Onde os usuários param
- **Session Duration**: Tempo de permanência

### **4. Vendas**
- **Gallery Revenue**: Receita via gallery builder
- **Average Order Value**: Valor médio dos pedidos
- **Repeat Customers**: Clientes que retornam

## 🔧 Configuração Avançada

### **1. Custom Dimensions**
O sistema envia dados via custom parameters:
- **custom_parameter_1**: Session ID
- **custom_parameter_2**: Step Number
- **custom_parameter_3**: Product ID
- **custom_parameter_4**: Cart Total
- **custom_parameter_5**: Items Count

### **2. Enhanced E-commerce**
- **Product Views**: Visualizações de produtos
- **Add to Cart**: Adições ao carrinho
- **Purchase**: Compras efetivadas
- **Revenue**: Receita total

### **3. Event Tracking**
- **step_start**: Início de cada step
- **step_complete**: Conclusão de cada step
- **product_select**: Seleção de produto
- **add_to_cart**: Adição ao carrinho
- **purchase**: Compra efetivada

## 📊 Como Interpretar os Dados

### **1. Dashboard Principal**
- **Gross Sales**: Vendas totais incluindo gallery
- **Orders**: Pedidos com produtos do gallery
- **Conversion Rate**: Taxa de conversão geral
- **Average Order Value**: Valor médio dos pedidos

### **2. Relatórios de Produtos**
- **Top Products**: Produtos mais vendidos
- **Product Performance**: Performance por produto
- **Size Preferences**: Preferências de tamanho

### **3. Relatórios de Comportamento**
- **Page Views**: Visualizações da página gallery
- **Bounce Rate**: Taxa de rejeição
- **Session Duration**: Tempo de permanência
- **Conversion Funnel**: Funil de conversão

### **4. Relatórios de Vendas**
- **Sales by Product**: Vendas por produto
- **Sales by Channel**: Vendas por canal
- **Sales Over Time**: Vendas ao longo do tempo
- **Revenue Analysis**: Análise de receita

## 🎯 KPIs Recomendados

### **Conversão**
- **Gallery Page Views**: Target: >1000/mês
- **Gallery Conversions**: Target: >10%
- **Gallery Sales**: Target: >€5000/mês
- **Conversion Rate**: Target: >15%

### **Engagement**
- **Session Duration**: Target: >3 min
- **Step Completion**: Target: >60%
- **Product Views**: Target: >5 por sessão
- **Return Rate**: Target: >20%

### **Vendas**
- **Gallery Revenue**: Target: >30% do total
- **Average Order Value**: Target: >€150
- **Repeat Customers**: Target: >25%
- **Cart Abandonment**: Target: <50%

## 🚨 Troubleshooting

### **Problema**: Dados não aparecem no Analytics
**Solução**: 
1. Verificar se o JavaScript está carregando
2. Verificar console para erros
3. Aguardar 24-48h para processamento

### **Problema**: Métricas não são precisas
**Solução**:
1. Verificar filtros aplicados
2. Verificar período de tempo
3. Verificar configurações de tracking

### **Problema**: Relatórios não carregam
**Solução**:
1. Verificar permissões de acesso
2. Verificar plano do Shopify
3. Verificar configurações de privacidade

## 📞 Suporte

Para dúvidas sobre analytics:
1. Verificar console do navegador
2. Testar em modo debug
3. Verificar dados no Shopify Admin
4. Consultar documentação do Shopify

---

**✅ Sistema de Analytics Nativo do Shopify implementado!**

Agora você pode visualizar todos os dados do gallery wall builder diretamente no dashboard nativo do Shopify Analytics em `/store/kuriosis-markets/analytics`.

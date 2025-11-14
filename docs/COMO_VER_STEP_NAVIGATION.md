# 🔍 Como Ver Step Navigation no Shopify Analytics

## ⚠️ IMPORTANTE: Limitação do Shopify Analytics

O Shopify Analytics **NÃO EXPÕE** a dimensão "Content group" na interface padrão de relatórios. Por isso, você não consegue ver essa dimensão no painel.

## ✅ O que está sendo rastreado

O sistema está enviando os seguintes eventos para o Shopify Analytics:
- `gallery_page_view` - Visualizações da página gallery-walls
- `gallery_step_start` - Quando o usuário inicia um step
- `gallery_step_complete` - Quando o usuário completa um step

Esses eventos incluem dados que **podem ser visualizados através da URL e outras dimensões**.

---

## 🚀 Como Ver Step Navigation no Shopify Analytics

### **Passo 1: Acessar Reports**
1. Faça login no Shopify Admin: `https://admin.shopify.com/store/kuriosis-markets`
2. No menu lateral, clique em **"Analytics"**
3. Clique em **"Reports"**

### **Passo 2: Criar Novo Relatório**

#### **Opção A: Usar "New exploration"**
1. Clique no botão **"New exploration"** (canto superior direito)
2. Você verá a tela de criação de relatório

### **Passo 3: Configurar o Relatório**

#### **Metrics (Métricas) - PAINEL DIREITO**
No painel direito, em **"Metrics"**, adicione:
- ✅ **Sessions** - Mostra quantas sessões aconteceram
- ✅ **Pageviews** - Mostra quantas páginas foram visualizadas

#### **Dimensions (Dimensões) - PAINEL DIREITO**
No painel direito, em **"Dimensions"**, adicione:
1. **Clique em "Dimensions"** no painel direito
2. **Procure e selecione**:
   - ✅ **Page** - Para ver páginas específicas
   - ✅ **URL** - Para filtrar a URL da gallery-walls

#### **Filters (Filtros) - PAINEL DIREITO**
No painel direito, em **"Filters"**, adicione:
1. **Clique em "Filters"**
2. **Clique em "Add filter"**
3. **Configure o filtro**:
   
   **Filtro: URL**
   - Campo: **Landing page URL** ou **Page URL**
   - Operador: **Contains**
   - Valor: **gallery-walls** (o nome da sua página)

### **Passo 4: Refinar a Query (OPCIONAL)**

Se os dados ainda não aparecerem claramente:

1. **Clique no botão "Refine query"** (acima do gráfico)
2. Você verá um editor de query SQL-like
3. **Substitua a query atual por**:

```sql
FROM sessions
SHOW sessions, pageviews BY landing_page_path
WHERE landing_page_path CONTAINS 'gallery-walls'
ORDER BY sessions DESC
```

Isso mostrará todas as sessões na página gallery-walls.

### **Passo 5: Salvar o Relatório**

1. **Clique em "Save"** (canto superior direito)
2. **Dê um nome** para o relatório, por exemplo: **"Gallery Wall Builder - Step Navigation"**
3. **Clique em "Save"** novamente

---

## 📊 Como Interpretar os Dados

### **O que você verá:**

#### **1. Métricas da Página Gallery-Walls**
Você verá:
- **Sessions** - Quantas sessões aconteceram na página gallery-walls
- **Pageviews** - Quantas vezes a página foi visualizada
- **URL** - A URL específica da página

#### **2. Informações Disponíveis**
- **Total de sessões** na página gallery-walls
- **Páginas mais visualizadas** relacionadas à gallery
- **Tráfego geral** da página

### **⚠️ Limitação:**
Como o Shopify não expõe "Content group" como dimensão:
- Você **NÃO conseguirá** ver dados específicos de cada step (Step 1, Step 2, etc.)
- Você **NÃO conseguirá** ver taxas de conclusão por step
- Você **APENAS conseguirá** ver dados gerais da página gallery-walls

---

## 🎯 Alternativa: Ver Dados em Tempo Real

Como o Shopify Analytics não permite ver dados detalhados de steps em relatórios, você pode:

### **Opção 1: Live View**
1. No menu Analytics, clique em **"Live View"**
2. Você verá atividade em tempo real
3. As interações com a página gallery-walls aparecerão aqui

### **Opção 2: Console do Navegador (Imediato)**
Para ver dados em tempo real enquanto desenvolve:

1. Abra a página gallery-walls
2. Pressione **F12** para abrir o console
3. Procure por mensagens como:
   ```
   📊 Enhanced Gallery Step 1 started
   📊 Enhanced Gallery Step 1 completed
   📊 Enhanced Gallery Step 2 started
   ```

### **Opção 3: Dashboard Principal**
No dashboard principal do Analytics:
- Veja **"Total Sales"** - Inclui vendas feitas na gallery
- Veja **"Orders"** - Pedidos que incluem produtos da gallery
- Veja **"Conversion Rate"** - Taxa de conversão geral

**Nota:** Não será possível ver breakdown por step porque o Shopify não expõe essa dimensão.

---

## 🔍 Verificar se está funcionando

### **Console do Navegador:**
1. Acesse a página `gallery-walls`
2. Pressione **F12** para abrir o console
3. Procure por:
   ```
   📊 Enhanced Gallery Step 1 started
   📊 Enhanced Gallery Step 1 completed
   ```

### **Shopify Analytics:**
- Os dados aparecem após **24-48 horas**
- Use os filtros acima para ver os dados específicos

---

## 📝 Exemplo de Relatório

**Nome:** Gallery Wall Builder - Step Navigation

**Metrics:**
- Sessions
- Pageviews

**Dimensions:**
- Content group 2
- Content group 3

**Filters:**
- Content group 1 = "Gallery Wall Builder"
- Content group 2 CONTAINS "Step"

**Resultado esperado:**
```
Content Group 2          | Content Group 3 | Sessions
-------------------------|-----------------|----------
Step Navigation          | Step 1          | 150
Step Navigation          | Step 2          | 120
Step Completion          | Step 1          | 140
Step Completion          | Step 2          | 100
...
```

---

## 🚨 Problemas Comuns

### **Problema: "Content group 2" não aparece**
**Solução:** 
- Os dados podem demorar 24-48h para aparecer
- Verifique se os eventos estão sendo enviados no console

### **Problema: Filtros não funcionam**
**Solução:**
- Use "Refine query" com a query SQL acima
- Verifique se você está usando "Contains" em vez de "Equals"

### **Problema: Não vejo dados de steps**
**Solução:**
1. Verifique o console do navegador para confirmar que os eventos estão sendo enviados
2. Aguarde 24-48h para o processamento
3. Certifique-se de que está usando os filtros corretos

---

## ✅ Resumo Rápido

1. **Acesse:** Analytics > Reports > New exploration
2. **Adicione Metrics:** Sessions, Pageviews
3. **Adicione Dimensions:** Content group 1, Content group 2, Content group 3
4. **Adicione Filters:**
   - Content group 1 = "Gallery Wall Builder"
   - Content group 2 CONTAINS "Step"
5. **Salve:** Dê um nome e salve o relatório
6. **Visualize:** Veja quantos usuários iniciaram/completaram cada step

---

## 📞 Ainda com Dificuldades?

Se ainda não conseguir ver os dados:
1. Verifique o console do navegador para confirmar que os eventos estão sendo enviados
2. Aguarde 24-48h para o Shopify processar os dados
3. Use o "Refine query" com a query SQL fornecida acima
4. Verifique se você está no plano correto do Shopify (alguns planos têm limitações de analytics)

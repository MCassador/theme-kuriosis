# Atualizações – Navbar (Carrinho/Checkout) e Rotate Overlay

## O que foi feito

- Separação do ícone da sacola (cart) do botão de checkout na barra superior, seguindo o padrão do Desenio.
- Exibição do total do carrinho ao lado da sacola, atualizando em tempo real.
- Clique na sacola abre o drawer de carrinho já existente no tema (mantendo o id e a integração do tema).
- Ajustes no Rotate Overlay para ficar exatamente como o Desenio (quadrado branco com seta girando).

---

## Detalhes por arquivo

### 1) `sections/gallery-wall-builder.liquid`
- Substituição do bloco único de checkout por um agrupamento com sacola e checkout separados:
  - Adicionado `div.cart-actions`.
  - Criado `button#cart-drawer-toggle.btn-header.cart-btn` com ícone de sacola, contador e o total em `<span id="cart-total-amount">`.
  - Mantido um link separado `a.btn-header.checkout-btn` para ir ao carrinho/checkout.

Efeito: a UI mostra a sacola com o total e um botão de checkout separado, como no Desenio.

### 2) `assets/gallery-wall-builder.css`
- Novos estilos para a separação e organização visual:
  - `.cart-actions` (layout do grupo), `.cart-btn` (estilo do botão da sacola) e `.cart-total` (tipografia do total).
- Mantidos os estilos existentes do header e do checkout.
- Rotate overlay ajustado para o visual do Desenio (quadrado branco com a seta girando, sem efeitos extras).

### 3) `assets/gallery-wall-builder.js`
- Rotina de sincronização do cabeçalho com o carrinho:
  - Busca `/cart.js` ao carregar a página e após alterações de carrinho (add/change/update).
  - Atualiza `#cart-total-amount` (total) e `.thb-item-count` (quantidade) automaticamente.
  - Escuta eventos de atualização de carrinho e faz um pequeno patch no `fetch` para detectar mutações.
- Clique no `#cart-drawer-toggle` abre o drawer de carrinho do tema quando disponível (suporta `theme.CartDrawer.open`, `theme.cartDrawer.open` ou `eventHub`), com fallback para `/cart` caso o drawer não esteja acessível.

---

## Comportamento esperado

- Na navbar, a sacola mostra a quantidade e o total do carrinho; o botão de checkout fica separado.
- Ao clicar na sacola, o drawer do carrinho é aberto (usando os ganchos do tema). 
- O total e a contagem são atualizados automaticamente após qualquer ação de carrinho.
- O Rotate Overlay aparece no mobile retrato com o quadrado branco e seta girando, igual ao Desenio.

---

## Observações

- Caso deseje que o botão de checkout vá direto para o checkout hospedado, posso apontar o link para a rota de checkout específica.



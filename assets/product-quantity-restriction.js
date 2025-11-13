// Product quantity restriction for specific product ID
const RESTRICTED_PRODUCT_ID = "14967332733251";

// Function to handle quantity restrictions
function handleQuantityRestrictions() {
	// Find all quantity selectors in both cart drawer and main cart
	const quantitySelectors = document.querySelectorAll("quantity-selector");

	quantitySelectors.forEach((selector) => {
		const input = selector.querySelector(".qty");
		const minusButton = selector.querySelector(".minus");
		const plusButton = selector.querySelector(".plus");

		// Get the product ID from the closest cart item
		const cartItem = selector.closest(
			".product-cart-item, .cart-items tbody tr"
		);
		if (!cartItem) return;

		// Get the product ID from the data-id attribute
		const itemKey = selector.getAttribute("data-id");
		if (!itemKey) return;

		// Fetch cart data to get product information
		fetch(`${theme.routes.cart_url}.js`)
			.then((response) => response.json())
			.then((cart) => {
				// Find the item in the cart
				const cartItem = cart.items.find((item) => item.key === itemKey);
				if (!cartItem) return;

				// Check if this is our restricted product
				if (cartItem.product_id.toString() === RESTRICTED_PRODUCT_ID) {
					// Disable the quantity input and buttons
					input.disabled = true;
					minusButton.disabled = true;
					plusButton.disabled = true;

					// Force quantity to 1
					input.value = 1;

					// Add visual indication that quantity is fixed
					selector.classList.add("quantity-fixed");

					// Prevent quantity changes
					input.addEventListener("change", (e) => {
						e.preventDefault();
						input.value = 1;
					});

					minusButton.addEventListener("click", (e) => {
						e.preventDefault();
					});

					plusButton.addEventListener("click", (e) => {
						e.preventDefault();
					});

					// If quantity is not 1, update it
					if (cartItem.quantity !== 1) {
						fetch(`${theme.routes.cart_change_url}`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
							},
							body: JSON.stringify({
								id: itemKey,
								quantity: 1,
							}),
						})
							.then(() => {
								// Refresh the page to show updated cart
								window.location.reload();
							})
							.catch((error) => console.error("Error fetching cart:", error));
					}
				}
			})
			.catch((error) => console.error("Error fetching cart:", error));
	});
}

// Run on page load
document.addEventListener("DOMContentLoaded", handleQuantityRestrictions);

// Run when cart is updated
document.addEventListener("line-item:change:end", handleQuantityRestrictions);

// Run when cart drawer is opened
document.addEventListener("cart-drawer:open", handleQuantityRestrictions);

// Also run when cart is modified
document.addEventListener("cart:item-added", handleQuantityRestrictions);
document.addEventListener("cart:item-removed", handleQuantityRestrictions);

// Run when main cart form is submitted
const cartForm = document.querySelector("form[action*='/cart']");
if (cartForm) {
	cartForm.addEventListener("submit", (e) => {
		const quantityInputs = cartForm.querySelectorAll("input[name='updates[]']");
		let shouldPreventSubmit = false;

		quantityInputs.forEach((input) => {
			const itemKey = input
				.closest("quantity-selector")
				?.getAttribute("data-id");
			if (itemKey) {
				fetch(`${theme.routes.cart_url}.js`)
					.then((response) => response.json())
					.then((cart) => {
						const cartItem = cart.items.find((item) => item.key === itemKey);
						if (
							cartItem &&
							cartItem.product_id.toString() === RESTRICTED_PRODUCT_ID
						) {
							if (input.value !== "1") {
								shouldPreventSubmit = true;
								input.value = "1";
							}
						}
					});
			}
		});

		if (shouldPreventSubmit) {
			e.preventDefault();
			window.location.reload();
		}
	});
}

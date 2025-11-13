/**
 *  @class
 *  @function Cart
 */
class Cart {
	constructor() {
		this.container = document.getElementById("Cart");
		this.setupEventListeners();
	}
	onChange(event) {
		if (event.target.type == "number") {
			this.updateQuantity(event.target.dataset.index, event.target.value);
		} else if (event.target.getAttribute("id") == "CartSpecialInstructions") {
			this.saveNotes();
		}
	}
	saveNotes() {
		fetch(`${theme.routes.cart_update_url}.js`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: `application/json`,
			},
			body: JSON.stringify({
				note: document.getElementById("CartSpecialInstructions").value,
			}),
		});
	}
	setupEventListeners() {
		this.removeProductEvent();

		this.debouncedOnChange = debounce((event) => {
			this.onChange(event);
		}, 300);

		document.addEventListener("cart:refresh", (event) => {
			this.refresh();
		});

		this.container.addEventListener(
			"change",
			this.debouncedOnChange.bind(this)
		);
	}
	getSectionsToRender() {
		return [
			{
				id: "Cart",
				section: "main-cart",
				selector: ".thb-cart-form",
			},
			{
				id: "cart-drawer-toggle",
				section: "cart-bubble",
				selector: ".thb-item-count",
			},
		];
	}
	displayErrors(line, message) {
		const lineItemError =
			document.getElementById(`Line-item-error-${line}`) ||
			document.getElementById(`CartDrawer-LineItemError-${line}`);
		if (lineItemError) {
			lineItemError.removeAttribute("hidden");
			lineItemError.querySelector(".cart-item__error-text").innerHTML = message;
			this.container
				.querySelector(`#CartItem-${line}`)
				.classList.remove("loading");
		}
	}
	getSectionInnerHTML(html, selector) {
		return new DOMParser()
			.parseFromString(html, "text/html")
			.querySelector(selector).innerHTML;
	}
	updateQuantity(line, quantity) {
		this.container.classList.add("cart-disabled");
		if (line) {
			this.container
				.querySelector(`#CartItem-${line}`)
				.classList.add("loading");
		}

		const body = JSON.stringify({
			line,
			quantity,
			sections: this.getSectionsToRender().map((section) => section.section),
			sections_url: window.location.pathname,
		});
		dispatchCustomEvent("line-item:change:start", {
			quantity: quantity,
		});
		fetch(`${theme.routes.cart_change_url}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: `application/json`,
			},
			...{
				body,
			},
		})
			.then((response) => {
				return response.text();
			})
			.then((state) => {
				const parsedState = JSON.parse(state);

				if (parsedState.errors) {
					this.displayErrors(line, parsedState.errors);
					this.container.classList.remove("cart-disabled");
					return;
				}

				this.renderContents(parsedState, line, false);

				this.container.classList.remove("cart-disabled");

				dispatchCustomEvent("line-item:change:end", {
					quantity: quantity,
					cart: parsedState,
				});
			});
	}
	refresh() {
		this.container.classList.add("cart-disabled");

		let sections = "main-cart";

		fetch(`${window.location.pathname}/?sections=${sections}`)
			.then((response) => {
				return response.text();
			})
			.then((state) => {
				const parsedState = JSON.parse(state);

				if (parsedState.errors) {
					this.displayErrors(line, parsedState.errors);
					this.container.classList.remove("cart-disabled");
					return;
				}

				this.renderContents(parsedState, false, true);

				this.container.classList.remove("cart-disabled");
			});
	}
	removeProductEvent() {
		let removes = this.container.querySelectorAll(".remove");

		removes.forEach((remove) => {
			remove.addEventListener("click", async (event) => {
				event.preventDefault();

				// Find if the item has an I_ID property to group related items
				const cartItem = event.target.closest("[data-product-id]");
				if (cartItem) {
					// Check if there's an I_ID property in this item
					try {
						const itemIID = await this.findItemIID(cartItem.dataset.productId);
						if (itemIID) {
							// Remove all related items with the same I_ID
							this.removeRelatedItems(itemIID);
							return;
						}
					} catch (error) {
						console.error("Error checking for I_ID:", error);
					}
				}

				// Fallback to regular removal
				this.updateQuantity(event.target.dataset.index, "0");
			});
		});
	}

	findItemIID(itemKey) {
		// We need to fetch the cart to check for I_ID properties
		return new Promise((resolve, reject) => {
			fetch(`${theme.routes.cart_url}.js`)
				.then((response) => response.json())
				.then((cart) => {
					// Find the item with the matching key and check if it has an I_ID property
					const item = cart.items.find((item) => item.key === itemKey);
					if (item && item.properties && item.properties["I_ID"]) {
						resolve(item.properties["I_ID"]);
					} else {
						resolve(null);
					}
				})
				.catch((error) => reject(error));
		});
	}

	removeRelatedItems(iid) {
		// We need to fetch the cart first to get all items with this I_ID
		this.container.classList.add("cart-disabled");

		fetch(`${theme.routes.cart_url}.js`)
			.then((response) => response.json())
			.then((cart) => {
				const updates = {};
				let hasUpdates = false;

				// Find all items with the matching I_ID and set their quantity to 0
				cart.items.forEach((item, index) => {
					if (item.properties && item.properties["I_ID"] === iid) {
						updates[item.key] = 0;
						hasUpdates = true;
					}
				});

				if (hasUpdates) {
					// Update the cart with all quantities set to 0 for matching I_ID items
					fetch(`${theme.routes.cart_update_url}.js`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							updates: updates,
							sections: this.getSectionsToRender().map(
								(section) => section.section
							),
							sections_url: window.location.pathname,
						}),
					})
						.then((response) => response.json())
						.then((data) => {
							this.renderContents(data, false, false);
							this.container.classList.remove("cart-disabled");
							dispatchCustomEvent("line-item:change:end", {
								quantity: 0,
								cart: data,
							});
						})
						.catch((error) => {
							console.error("Error updating cart:", error);
							this.container.classList.remove("cart-disabled");
						});
				} else {
					this.container.classList.remove("cart-disabled");
				}
			})
			.catch((error) => {
				console.error("Error fetching cart:", error);
				this.container.classList.remove("cart-disabled");
			});
	}
	renderContents(parsedState, line, refresh) {
		this.getSectionsToRender().forEach((section) => {
			const elementToReplace =
				document.getElementById(section.id).querySelector(section.selector) ||
				document.getElementById(section.id);

			if (refresh) {
				if (parsedState[section.section]) {
					elementToReplace.innerHTML = this.getSectionInnerHTML(
						parsedState[section.section],
						section.selector
					);
				}
			} else {
				elementToReplace.innerHTML = this.getSectionInnerHTML(
					parsedState.sections[section.section],
					section.selector
				);
			}

			this.removeProductEvent();

			if (line && this.container.querySelector(`#CartItem-${line}`)) {
				this.container
					.querySelector(`#CartItem-${line}`)
					.classList.remove("loading");
			}
		});
	}
}
window.addEventListener("load", () => {
	if (typeof Cart !== "undefined") {
		new Cart();
	}
});

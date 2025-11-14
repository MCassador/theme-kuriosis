class WishlistDrawer {
	constructor() {
		this.container = document.getElementById("Wishlist-Drawer");
		this.button = document.getElementById("wishlist-drawer-toggle");
		this.clickCapture = document.querySelector("#wrapper .click-capture");

		this.setupEventListeners();
		this.connectedCallback();
	}

	setupEventListeners() {
		// Toggle drawer and click-capture on button click
		this.button.addEventListener("click", (event) => {
			event.preventDefault();
			document.body.classList.toggle("open-cc");
			this.container.classList.toggle("active");

			if (this.container.classList.contains("active")) {
				setTimeout(() => {
					this.container.focus({ preventScroll: true });
				}, 100);
			}

			return false;
		});

		// Close drawer when close button inside drawer is clicked
		document
			.querySelector(".side-panel-close")
			.addEventListener("click", this.close.bind(this));
	}

	close_panel(event, panel) {
		panel.classList.remove("active");
		document.body.classList.remove("open-cc");
	}

	connectedCallback() {
		// Setup click capture element and handle panel closing
		this.cc = document.querySelector(".click-capture");

		this.onClick = (e) => {
			let panel = document.querySelectorAll(".side-panel.active");
			if (panel.length) {
				this.close_panel(e, panel[0]);
			}
		};

		// Bind the close function to click capture and other events
		if (this.addEventListener) {
			this.addEventListener("click", this.onClick.bind(this));
		}
		document.addEventListener("panel:close", this.onClick.bind(this));

		if (!this.cc.hasAttribute("initialized")) {
			this.cc.addEventListener("click", this.onClick.bind(this));
			this.cc.setAttribute("initialized", "");
		}
	}

	close() {
		this.container.classList.remove("active");
		document.body.classList.remove("open-cc");
	}
}

// Initialize the WishlistDrawer on load
window.addEventListener("load", () => {
	if (typeof WishlistDrawer !== "undefined") {
		new WishlistDrawer();
	}
});
document
	.querySelector(".side-panel-close")
	.addEventListener("click", function () {
		document.getElementById("Wishlist-Drawer").classList.remove("active");
		document.body.classList.remove("open-wishlist");
	});

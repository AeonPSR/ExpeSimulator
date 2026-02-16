/**
 * Modal Component
 * 
 * Base modal component providing overlay, content container, and close functionality.
 * Extend this class for specific modal types (character selection, ability selection, etc.)
 * 
 * Features:
 * - Backdrop overlay with blur
 * - Close on X button click
 * - Close on backdrop click (optional)
 * - Close on Escape key (optional)
 * - Focus trapping (accessibility)
 * - Callback on close
 */
class Modal extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.title] - Modal title (optional)
	 * @param {string} [options.subtitle] - Modal subtitle/description (optional)
	 * @param {string} [options.className] - Additional CSS class for the modal content
	 * @param {boolean} [options.closeOnBackdrop=true] - Close when clicking backdrop
	 * @param {boolean} [options.closeOnEscape=true] - Close on Escape key
	 * @param {boolean} [options.showCloseButton=true] - Show the X close button
	 * @param {Function} [options.onClose] - Callback when modal closes
	 * @param {Function} [options.onOpen] - Callback when modal opens
	 */
	constructor(options = {}) {
		super(options);
		this.title = options.title || null;
		this.subtitle = options.subtitle || null;
		this.modalClassName = options.className || '';
		this.closeOnBackdrop = options.closeOnBackdrop !== false;
		this.closeOnEscape = options.closeOnEscape !== false;
		this.showCloseButton = options.showCloseButton !== false;
		this.onCloseCallback = options.onClose || null;
		this.onOpenCallback = options.onOpen || null;

		// Internal references
		this._contentContainer = null;
		this._escapeHandler = null;
	}

	/**
	 * Creates the modal DOM structure
	 * @returns {HTMLElement}
	 */
	render() {
		// Overlay/backdrop with data attribute for CSS scoping
		this.element = this.createElement('div', {
			className: 'character-selection-modal'
		});
		this.element.setAttribute('data-expe-sim', '');

		// Content container
		const contentClasses = ['character-selection-content', this.modalClassName].filter(Boolean).join(' ');
		this._contentContainer = this.createElement('div', {
			className: contentClasses
		});

		// Close button
		if (this.showCloseButton) {
			const closeBtn = this.createElement('div', {
				className: 'expe-close-btn modal-close',
				onClick: () => this.close()
			}, '×');
			this._contentContainer.appendChild(closeBtn);
		}

		// Header (if title provided)
		if (this.title || this.subtitle) {
			const header = this._createHeader();
			this._contentContainer.appendChild(header);
		}

		// Body - where subclasses add their content
		const body = this.createElement('div', { className: 'modal-body' });
		this._contentContainer.appendChild(body);
		this._bodyContainer = body;

		this.element.appendChild(this._contentContainer);

		// Backdrop click handler
		if (this.closeOnBackdrop) {
			this.addEventListener(this.element, 'click', (e) => {
				if (e.target === this.element) {
					this.close();
				}
			});
		}

		return this.element;
	}

	/**
	 * Creates the header section
	 * @private
	 * @returns {HTMLElement}
	 */
	_createHeader() {
		const header = this.createElement('div', { className: 'character-selection-header' });

		if (this.title) {
			const titleEl = this.createElement('h3', {}, this.title);
			header.appendChild(titleEl);
		}

		if (this.subtitle) {
			const subtitleEl = this.createElement('p', {}, this.subtitle);
			header.appendChild(subtitleEl);
		}

		return header;
	}

	/**
	 * Lifecycle hook - setup after mounting
	 */
	onMount() {
		// Add escape key handler
		if (this.closeOnEscape) {
			this._escapeHandler = (e) => {
				if (e.key === 'Escape') {
					this.close();
				}
			};
			document.addEventListener('keydown', this._escapeHandler);
		}

		// Prevent body scroll while modal is open
		document.body.style.overflow = 'hidden';

		// Fire open callback
		if (this.onOpenCallback) {
			this.onOpenCallback();
		}
	}

	/**
	 * Lifecycle hook - cleanup before destruction
	 */
	onDestroy() {
		// Remove escape handler
		if (this._escapeHandler) {
			document.removeEventListener('keydown', this._escapeHandler);
			this._escapeHandler = null;
		}

		// Restore body scroll
		document.body.style.overflow = '';
	}

	/**
	 * Opens the modal (mounts to body)
	 * @returns {Modal} this for chaining
	 */
	open() {
		// Keep the panel open while modal is visible
		const panel = document.getElementById('expedition-simulator');
		if (panel) {
			panel.classList.add('modal-open');
		}
		this.mount(document.body);
		return this;
	}

	/**
	 * Closes the modal
	 * @param {*} [result] - Optional result to pass to onClose callback
	 */
	close(result = null) {
		// Keep panel open for 2s after modal closes
		const panel = document.getElementById('expedition-simulator');
		if (panel) {
			setTimeout(() => {
				// Only remove if no other modal is still open
				if (!document.querySelector('.character-selection-modal')) {
					panel.classList.remove('modal-open');
				}
			}, 2000);
		}
		if (this.onCloseCallback) {
			this.onCloseCallback(result);
		}
		this.destroy();
	}

	/**
	 * Gets the body container where subclasses should add content
	 * @returns {HTMLElement}
	 */
	getBody() {
		return this._bodyContainer;
	}

	/**
	 * Sets the body content
	 * @param {HTMLElement|string} content - Content to set
	 */
	setBody(content) {
		if (!this._bodyContainer) return;

		if (typeof content === 'string') {
			this._bodyContainer.innerHTML = content;
		} else if (content instanceof HTMLElement) {
			this._bodyContainer.innerHTML = '';
			this._bodyContainer.appendChild(content);
		}
	}

	/**
	 * Updates the modal title
	 * @param {string} title
	 */
	setTitle(title) {
		this.title = title;
		const titleEl = this._contentContainer?.querySelector('h3');
		if (titleEl) {
			titleEl.textContent = title;
		}
	}

	/**
	 * Static helper to create and open a modal in one call
	 * @param {Object} options - Modal options
	 * @returns {Modal}
	 */
	static show(options) {
		const modal = new Modal(options);
		return modal.open();
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.Modal = Modal;
}

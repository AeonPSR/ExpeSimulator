/**
 * Modal Component
 * 
 * Base modal component providing overlay, content container, and close functionality.
 * Extend this class for specific modal types (character selection, ability selection, etc.)
 */
class Modal extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.title] - Modal title
	 * @param {string} [options.subtitle] - Modal subtitle
	 * @param {string} [options.className] - Additional content CSS class
	 * @param {boolean} [options.closeOnBackdrop=true] - Close when clicking backdrop
	 * @param {boolean} [options.closeOnEscape=true] - Close on Escape
	 * @param {boolean} [options.showCloseButton=true] - Show the close button
	 * @param {Function} [options.onClose] - Called when modal closes
	 * @param {Function} [options.onOpen] - Called when modal opens
	 * @param {HTMLElement} [options.panelElement] - Panel kept open while the modal is visible
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
		this.panelElement = options.panelElement || null;

		this._contentContainer = null;
		this._escapeHandler = null;
	}

	render() {
		this.element = this.createElement('div', {
			className: 'character-selection-modal'
		});
		this.element.setAttribute('data-expe-sim', '');

		const contentClasses = ['character-selection-content', this.modalClassName].filter(Boolean).join(' ');
		this._contentContainer = this.createElement('div', {
			className: contentClasses
		});

		if (this.showCloseButton) {
			const closeBtn = this.createElement('div', {
				className: 'expe-close-btn modal-close',
				onClick: () => this.close()
			});
			const icon = this.createElement('img', { src: getResourceURL('pictures/ui/bin.png'), alt: '' });
			closeBtn.appendChild(icon);
			this._contentContainer.appendChild(closeBtn);
		}

		if (this.title || this.subtitle) {
			const header = this._createHeader();
			this._contentContainer.appendChild(header);
		}

		const body = this.createElement('div', { className: 'modal-body' });
		this._contentContainer.appendChild(body);
		this._bodyContainer = body;

		this.element.appendChild(this._contentContainer);

		if (this.closeOnBackdrop) {
			this.addEventListener(this.element, 'click', (e) => {
				if (e.target === this.element) {
					this.close();
				}
			});
		}

		return this.element;
	}

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

	onMount() {
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
		// Keep the owning panel open while the modal is visible
		if (this.panelElement) {
			this.panelElement.classList.add('modal-open');
		}
		this.mount(document.body);
		return this;
	}

	/**
	 * @param {*} [result] - Optional result passed to onClose
	 */
	close(result = null) {
		// Keep the owning panel open for 2s after modal closes
		const panel = this.panelElement;
		if (panel) {
			setTimeout(() => {
				// Only remove if no other modal is still open on this panel
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
	 * @returns {HTMLElement}
	 */
	getBody() {
		return this._bodyContainer;
	}

	/**
	 * @param {HTMLElement|string} content
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
	 * @param {Object} options
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

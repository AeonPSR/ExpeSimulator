/**
 * Base Component Class
 * 
 * Provides a consistent pattern for UI components with:
 * - Element creation and management
 * - Lifecycle methods (render, mount, destroy)
 * - Event listener management with automatic cleanup
 * 
 * @abstract
 */
class Component {
	/**
	 * @param {Object} options - Component configuration
	 * @param {HTMLElement} [options.container] - Parent element to mount into
	 */
	constructor(options = {}) {
		this.container = options.container || null;
		this.element = null;
		this._eventListeners = []; // Track listeners for cleanup
		this._mounted = false;
	}

	/**
	 * @returns {HTMLElement}
	 */
	render() {
		throw new Error('Component.render() must be implemented by subclass');
	}

	/**
	 * @param {HTMLElement} [container] - Optional container override
	 * @returns {HTMLElement}
	 */
	mount(container = null) {
		if (container) {
			this.container = container;
		}

		if (!this.container) {
			throw new Error('Component requires a container to mount into');
		}

		if (!this.element) {
			this.element = this.render();
		}

		this.container.appendChild(this.element);
		this._mounted = true;

		this.onMount();

		return this.element;
	}

	onMount() {
		// Override in subclass
	}

	destroy() {
		this.onDestroy();

		this._removeAllEventListeners();

		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}

		this.element = null;
		this._mounted = false;
	}

	onDestroy() {
		// Override in subclass
	}

	/**
	 * @param {HTMLElement} element - Element to attach listener to
	 * @param {string} event - Event type
	 * @param {Function} handler - Event handler
	 * @param {Object} [options] - addEventListener options
	 */
	addEventListener(element, event, handler, options = {}) {
		element.addEventListener(event, handler, options);
		this._eventListeners.push({ element, event, handler, options });
	}

	_removeAllEventListeners() {
		this._eventListeners.forEach(({ element, event, handler, options }) => {
			element.removeEventListener(event, handler, options);
		});
		this._eventListeners = [];
	}

	/**
	 * @param {string} tag - HTML tag name
	 * @param {Object} [attrs] - Attributes to set
	 * @param {Array|string|HTMLElement} [children] - Child content
	 * @returns {HTMLElement}
	 */
	createElement(tag, attrs = {}, children = null) {
		const element = document.createElement(tag);

		Object.entries(attrs).forEach(([key, value]) => {
			if (key === 'className') {
				element.className = value;
			} else if (key === 'dataset') {
				Object.entries(value).forEach(([dataKey, dataValue]) => {
					element.dataset[dataKey] = dataValue;
				});
			} else if (key.startsWith('on') && typeof value === 'function') {
				// Handle event listeners like onClick, onMouseEnter, etc.
				const event = key.slice(2).toLowerCase();
				this.addEventListener(element, event, value);
			} else {
				element.setAttribute(key, value);
			}
		});

		if (children !== null) {
			if (Array.isArray(children)) {
				children.forEach(child => {
					if (typeof child === 'string') {
						element.appendChild(document.createTextNode(child));
					} else if (child instanceof HTMLElement) {
						element.appendChild(child);
					}
				});
			} else if (typeof children === 'string') {
				element.textContent = children;
			} else if (children instanceof HTMLElement) {
				element.appendChild(children);
			}
		}

		return element;
	}

	/**
	 * Queries an element within this component
	 * @param {string} selector - CSS selector
	 * @returns {HTMLElement|null}
	 */
	querySelector(selector) {
		return this.element?.querySelector(selector) || null;
	}

	/**
	 * Queries all matching elements within this component
	 * @param {string} selector - CSS selector
	 * @returns {NodeList}
	 */
	querySelectorAll(selector) {
		return this.element?.querySelectorAll(selector) || [];
	}

	/**
	 * Updates the component's content
	 * Default behavior: re-render and replace. Override for partial updates.
	 */
	update() {
		if (!this._mounted || !this.element) return;

		const parent = this.element.parentNode;
		const newElement = this.render();
		parent.replaceChild(newElement, this.element);
		this.element = newElement;
	}

	/**
	 * Check if component is currently mounted
	 * @returns {boolean}
	 */
	isMounted() {
		return this._mounted;
	}
}

// Export for use in other modules
// In a Chrome extension context, we attach to window
if (typeof window !== 'undefined') {
	window.Component = Component;
}

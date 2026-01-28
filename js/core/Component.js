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
	 * Creates the component's DOM element
	 * Override this in subclasses to define the component's HTML structure
	 * @abstract
	 * @returns {HTMLElement} The created element
	 */
	render() {
		throw new Error('Component.render() must be implemented by subclass');
	}

	/**
	 * Mounts the component to the DOM
	 * @param {HTMLElement} [container] - Optional container override
	 * @returns {HTMLElement} The mounted element
	 */
	mount(container = null) {
		if (container) {
			this.container = container;
		}

		if (!this.container) {
			throw new Error('Component requires a container to mount into');
		}

		// Render if not already rendered
		if (!this.element) {
			this.element = this.render();
		}

		// Append to container
		this.container.appendChild(this.element);
		this._mounted = true;

		// Call lifecycle hook
		this.onMount();

		return this.element;
	}

	/**
	 * Lifecycle hook called after mounting
	 * Override to add post-mount logic (e.g., focus, animations)
	 */
	onMount() {
		// Override in subclass
	}

	/**
	 * Removes the component from the DOM and cleans up
	 */
	destroy() {
		// Call lifecycle hook before removal
		this.onDestroy();

		// Remove all tracked event listeners
		this._removeAllEventListeners();

		// Remove from DOM
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}

		this.element = null;
		this._mounted = false;
	}

	/**
	 * Lifecycle hook called before destruction
	 * Override to add cleanup logic
	 */
	onDestroy() {
		// Override in subclass
	}

	/**
	 * Adds an event listener and tracks it for cleanup
	 * @param {HTMLElement} element - Element to attach listener to
	 * @param {string} event - Event type (e.g., 'click')
	 * @param {Function} handler - Event handler function
	 * @param {Object} [options] - addEventListener options
	 */
	addEventListener(element, event, handler, options = {}) {
		element.addEventListener(event, handler, options);
		this._eventListeners.push({ element, event, handler, options });
	}

	/**
	 * Removes all tracked event listeners
	 * @private
	 */
	_removeAllEventListeners() {
		this._eventListeners.forEach(({ element, event, handler, options }) => {
			element.removeEventListener(event, handler, options);
		});
		this._eventListeners = [];
	}

	/**
	 * Creates an HTML element with attributes and children
	 * @param {string} tag - HTML tag name
	 * @param {Object} [attrs] - Attributes to set (class, id, data-*, etc.)
	 * @param {Array|string|HTMLElement} [children] - Child content
	 * @returns {HTMLElement}
	 */
	createElement(tag, attrs = {}, children = null) {
		const element = document.createElement(tag);

		// Set attributes
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

		// Add children
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

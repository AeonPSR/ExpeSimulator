/**
 * InfoPanel Component
 *
 * A general-purpose styled text-display block with an optional top-level title
 * and one or more content sections, each with their own optional sub-title.
 *
 * Usage:
 *   const panel = new InfoPanel({
 *     title: "Aeon's Lab",
 *     sections: [
 *       { content: '<p>Some text.</p>' },
 *       { title: 'Credits', content: '<p>By aeon_psr.</p>' }
 *     ]
 *   });
 *   panel.mount(someContainer);
 *
 * Legacy single-section shorthand (still supported):
 *   new InfoPanel({ title: 'Title', content: '<p>...</p>' })
 */
class InfoPanel extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.title]     - Optional top-level heading
	 * @param {string} [options.subtitle]  - Optional subtitle shown below the title, above the separator
	 * @param {Array}  [options.sections]  - Array of { title?, content } objects
	 * @param {string} [options.content]   - Shorthand for a single section with no sub-title
	 * @param {string} [options.className] - Extra CSS class(es) added to the root element
	 */
	constructor(options = {}) {
		super(options);
		this._title      = options.title    || null;
		this._subtitle   = options.subtitle || null;
		this._extraClass = options.className || '';
		// Normalise: accept either sections array or legacy single content string
		if (options.sections) {
			this._sections = options.sections;
		} else {
			this._sections = [{ content: options.content || '' }];
		}
	}

	render() {
		const cls = ('info-panel ' + this._extraClass).trim();
		this.element = this.createElement('div', { className: cls });

		if (this._title) {
			const header = this.createElement('div', { className: 'info-panel-header' });
			header.appendChild(
				this.createElement('span', { className: 'info-panel-title' }, this._title)
			);
			if (this._subtitle) {
				header.appendChild(
					this.createElement('span', { className: 'info-panel-subtitle' }, this._subtitle)
				);
			}
			this.element.appendChild(header);
		}

		this._sections.forEach((section, i) => {
			const isFirst = i === 0;
			const wrap = this.createElement('div', {
				className: isFirst ? 'info-panel-section info-panel-section--first' : 'info-panel-section'
			});

			if (section.title) {
				wrap.appendChild(
					this.createElement('span', { className: 'info-panel-section-title' }, section.title)
				);
			}

			const body = this.createElement('div', { className: 'info-panel-body' });
			body.innerHTML = section.content || '';
			wrap.appendChild(body);

			this.element.appendChild(wrap);
		});

		return this.element;
	}
}

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.InfoPanel = InfoPanel;

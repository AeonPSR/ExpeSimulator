/**
 * ConfirmationModal Component
 *
 * Small yes/no modal for destructive or broad actions.
 */
class ConfirmationModal extends Modal {
	constructor(options = {}) {
		super({
			...options,
			showCloseButton: options.showCloseButton !== false,
			className: ['confirmation-modal', options.className || ''].filter(Boolean).join(' ')
		});
		this.message = options.message || '';
		this.confirmLabel = options.confirmLabel || 'Yes';
		this.cancelLabel = options.cancelLabel || 'No';
		this.onConfirm = options.onConfirm || null;
	}

	render() {
		super.render();

		if (this.message) {
			const message = this.createElement('p', { className: 'confirmation-message' }, this.message);
			this._bodyContainer.appendChild(message);
		}

		const actions = this.createElement('div', { className: 'confirmation-actions' });
		const cancelBtn = this.createElement('button', { className: 'confirmation-btn confirmation-btn--cancel' }, this.cancelLabel);
		const confirmBtn = this.createElement('button', { className: 'confirmation-btn confirmation-btn--confirm' }, this.confirmLabel);

		this.addEventListener(cancelBtn, 'click', () => this.close(false));
		this.addEventListener(confirmBtn, 'click', () => {
			this.close(true);
			this.onConfirm?.();
		});

		actions.appendChild(confirmBtn);
		actions.appendChild(cancelBtn);
		this._bodyContainer.appendChild(actions);

		return this.element;
	}
}

if (typeof window !== 'undefined') {
	window.ConfirmationModal = ConfirmationModal;
}
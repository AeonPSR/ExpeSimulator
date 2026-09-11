/**
 * Observes game chat once and distributes each message to registered handlers.
 */
class ChatMessageScanner {
	constructor() {
		this._handlers = [];
		this._observer = null;
		this._clickListener = null;
		this._commsPanel = null;
	}

	register(handler) {
		this._handlers.push(handler);
	}

	start() {
		this._scanExistingMessages();
		const commsPanel = document.querySelector('.comms-panel') || document.body;

		this._observer = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.type === 'characterData') {
					this._checkNode(mutation.target.parentElement);
					continue;
				}
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this._checkNode(node);
					} else if (node.nodeType === Node.TEXT_NODE) {
						this._checkNode(node.parentElement);
					}
				}
			}
		});
		this._observer.observe(commsPanel, { childList: true, characterData: true, subtree: true });

		this._clickListener = event => {
			if (!event.target.closest('.tab, .toggle-children')) return;
			setTimeout(() => this._scanExistingMessages(), 150);
		};
		document.addEventListener('click', this._clickListener);
		this._commsPanel = commsPanel;
	}

	stop() {
		this._observer?.disconnect();
		this._observer = null;
		if (this._clickListener) {
			document.removeEventListener('click', this._clickListener);
		}
		this._clickListener = null;
		this._commsPanel = null;
	}

	_scanExistingMessages() {
		document.querySelectorAll('.message').forEach(message => this._processMessage(message));
	}

	_checkNode(node) {
		if (!node) return;
		const parentMessage = node.closest?.('.message');
		if (parentMessage) {
			this._processMessage(parentMessage);
		}
		node.querySelectorAll?.('.message').forEach(message => this._processMessage(message));
	}

	_processMessage(message) {
		this._handlers.forEach(handler => handler.processMessage(message));
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ChatMessageScanner = ChatMessageScanner;
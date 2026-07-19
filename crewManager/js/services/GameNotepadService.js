/**
 * GameNotepadService
 *
 * Owns integration with the game's personal notes UI.
 */
class GameNotepadService {
	constructor(options = {}) {
		this.document = options.document || document;
		this._availabilityObserver = null;
		this._availabilityCallbacks = new Set();
	}

	isAvailable() {
		return Boolean(this._getNotesButton());
	}

	observeAvailability(callback) {
		this._availabilityCallbacks.add(callback);
		callback(this.isAvailable());
		this._ensureAvailabilityObserver();
		return () => this._availabilityCallbacks.delete(callback);
	}

	disconnect() {
		this._availabilityObserver?.disconnect();
		this._availabilityObserver = null;
		this._availabilityCallbacks.clear();
	}

	async openCharacterNotes(filename) {
		const notesButton = this._getNotesButton();
		if (!notesButton) return false;

		let notesWindow = this._getNotesWindow();
		if (!notesWindow) {
			notesButton.click();
			notesWindow = await this._waitForElement('.personal-notes-window-wrapper .personal-notes-window');
		}
		if (!notesWindow) return false;

		const characterStem = this._getCharacterStem(filename);
		const existingTabIcon = Array.from(notesWindow.querySelectorAll('.tabs .tab[draggable="true"] img'))
			.find(img => this._imageMatchesCharacter(img, characterStem));
		if (existingTabIcon) {
			existingTabIcon.closest('.tab')?.click();
			return true;
		}

		const newTab = Array.from(notesWindow.querySelectorAll('.tabs .tab'))
			.find(tab => !tab.hasAttribute('draggable'));
		if (!newTab) return false;

		newTab.click();
		const emotePicker = await this._waitForElement('.emote-picker.popup');
		if (!emotePicker) return false;

		const characterIcon = Array.from(emotePicker.querySelectorAll('.emote-grid .emote-item img'))
			.find(img => this._imageMatchesCharacter(img, characterStem));
		characterIcon?.closest('.emote-item')?.click();
		return Boolean(characterIcon);
	}

	_getNotesButton() {
		return this.document.querySelector('.personal-notes-button');
	}

	_getNotesWindow() {
		return this.document.querySelector('.personal-notes-window-wrapper .personal-notes-window');
	}

	_getCharacterStem(filename) {
		return filename.split('/').pop().replace(/\.(png|jpg|gif)$/i, '').toLowerCase();
	}

	_imageMatchesCharacter(img, characterStem) {
		const src = (img?.getAttribute('src') || '').toLowerCase();
		return src.includes(`${characterStem}-`) || src.includes(`/${characterStem}.`) || src.includes(`/${characterStem}-`);
	}

	_waitForElement(selector, timeout = 1000) {
		const existing = this.document.querySelector(selector);
		if (existing) {
			return Promise.resolve(existing);
		}

		return new Promise(resolve => {
			const observer = new MutationObserver(() => {
				const element = this.document.querySelector(selector);
				if (!element) return;
				observer.disconnect();
				clearTimeout(timer);
				resolve(element);
			});
			const timer = setTimeout(() => {
				observer.disconnect();
				resolve(null);
			}, timeout);
			observer.observe(this.document.body, { childList: true, subtree: true });
		});
	}

	_ensureAvailabilityObserver() {
		if (this._availabilityObserver || !this.document.body) return;
		this._availabilityObserver = new MutationObserver(() => this._emitAvailability());
		this._availabilityObserver.observe(this.document.body, { childList: true, subtree: true });
	}

	_emitAvailability() {
		const isAvailable = this.isAvailable();
		this._availabilityCallbacks.forEach(callback => callback(isAvailable));
	}
}

if (typeof window !== 'undefined') {
	window.GameNotepadService = GameNotepadService;
}
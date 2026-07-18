/**
 * CrewDetailCardOrganizer
 *
 * Places Crew detail cards into active, dead, and hidden subsections.
 */
class CrewDetailCardOrganizer {
	constructor(options = {}) {
		this._cardByFilename = options.cardByFilename;
		this._playerByFilename = options.playerByFilename;
		this._activeCardsContainer = options.activeCardsContainer;
		this._deadCardsContainer = options.deadCardsContainer;
		this._hiddenCardsContainer = options.hiddenCardsContainer;
		this._getCharacterName = options.getCharacterName;
	}

	appendSorted(container, filename, card) {
		const cardName = this._getCharacterName(filename);
		const nextCard = Array.from(container.children).find(child => {
			return this._getCharacterName(child.dataset.filename).localeCompare(cardName) > 0;
		});
		container.insertBefore(card, nextCard || null);
	}

	moveCardToCurrentSubsection(filename) {
		const card = this._cardByFilename[filename];
		if (!card) return;
		const previousRects = this.getCardRects();

		const container = this.getCardSubsection(filename);
		this.appendSorted(container, filename, card);
		this.updateSubsectionVisibility();
		this.animateCardMoves(previousRects);
	}

	getCardSubsection(filename) {
		const player = this._playerByFilename[filename];
		if (!player?.visible) {
			return this._hiddenCardsContainer;
		}
		if (CrewCharacterState.isDead(player)) {
			return this._deadCardsContainer;
		}
		return this._activeCardsContainer;
	}

	updateSubsectionVisibility() {
		this._deadCardsContainer.hidden = this._deadCardsContainer.children.length === 0;
		this._hiddenCardsContainer.hidden = this._hiddenCardsContainer.children.length === 0;
	}

	getCardRects() {
		return new Map(Object.values(this._cardByFilename).map(card => [card, card.getBoundingClientRect()]));
	}

	animateCardMoves(previousRects) {
		Object.values(this._cardByFilename).forEach(card => {
			const previousRect = previousRects.get(card);
			if (!previousRect) return;

			const nextRect = card.getBoundingClientRect();
			const deltaX = previousRect.left - nextRect.left;
			const deltaY = previousRect.top - nextRect.top;
			if (deltaX === 0 && deltaY === 0) return;

			card.classList.remove('crew-card-moving');
			card.style.transition = 'none';
			card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
		});

		requestAnimationFrame(() => {
			Object.values(this._cardByFilename).forEach(card => {
				if (!card.style.transform) return;

				card.classList.add('crew-card-moving');
				card.style.transition = '';
				card.style.transform = '';
				card.addEventListener('transitionend', () => {
					card.classList.remove('crew-card-moving');
				}, { once: true });
			});
		});
	}

	scrollAndHighlight(filename) {
		const card = this._cardByFilename[filename];
		if (!card) return;

		card.scrollIntoView({ behavior: 'smooth', block: 'center' });
		card.classList.remove('crew-highlight');
		void card.offsetWidth;
		card.classList.add('crew-highlight');
		card.addEventListener('animationend', () => {
			card.classList.remove('crew-highlight');
		}, { once: true });
	}
}

if (typeof window !== 'undefined') {
	window.CrewDetailCardOrganizer = CrewDetailCardOrganizer;
}
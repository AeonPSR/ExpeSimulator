// Expedition Simulator - Entry Point
// Loads all necessary modules and initializes the application

// Add global error handler for extension context invalidation
window.addEventListener('error', (event) => {
    if (event.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, preventing further errors');
        // Prevent the error from propagating
        event.preventDefault();
        return false;
    }
});

// Initialize the simulator when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ExpeditionSimulator());
} else {
    new ExpeditionSimulator();
}

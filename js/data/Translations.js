/**
 * Translations — Full string dictionary for all three supported locales.
 *
 * Keys use dot-notation namespaced by component / concept.
 * Variable placeholders use {varName} syntax, matched by I18n.t(key, vars).
 */
const Translations = {

	// ─────────────────────────────────────────────────────────────────────────
	// English (source / fallback)
	// ─────────────────────────────────────────────────────────────────────────
	en: {
		// Panel
		'panel.title':              'Expedition Simulator',
		'panel.pin':                'Pin panel open',
		'panel.unpin':              'Unpin panel',
		'panel.lang.label':         'Language',

		// Tabs
		'tab.planetary_review':     'Planetary Review',
		'tab.expedition_sim':       'Expedition Simulation',

		// Sector selection
		'sectors.header':           'Selected Expedition ({regular}/{max})',
		'sectors.special_suffix':   '+ {count} special',
		'sectors.clear_all':        'Clear All',
		'sectors.remove_hint':      '{name} — Click to remove',

		// Example worlds
		'worlds.header':            'Example Worlds',

		// Players section
		'players.header':           'Players',

		// Probability display
		'prob.header':              'Event Probabilities',
		'prob.placeholder':         'Select sectors to see probabilities',
		'prob.loading':             'Calculating...',
		'prob.error':               'Calculation error',

		// Resources table
		'prob.resources.header':    'Resources',
		'prob.resources.col':       'Resource',
		'prob.col.pessimist':       'Pessimist',
		'prob.col.average':         'Average',
		'prob.col.optimist':        'Optimist',
		'prob.none':                'none',

		// Resource names
		'resource.fruits':          'Fruits',
		'resource.steaks':          'Steaks',
		'resource.fuel':            'Fuel',
		'resource.oxygen':          'Oxygen',
		'resource.artefacts':       'Artefacts',
		'resource.map_fragments':   'Map Fragments',

		// Combat / event damage sections
		'prob.combat.header':       'Combat Damage',
		'prob.combat.none':         'No combat damage expected',
		'prob.event.header':        'Event Damage',
		'prob.event.none':          'No event damage expected',

		// Damage scenario labels
		'scenario.optimist':                 'Optimist Scenario',
		'scenario.average':                  'Average Scenario',
		'scenario.pessimist':                'Pessimist Scenario',
		'scenario.worst':                    'Worst Case Scenario',
		'scenario.optimist_average':         'Optimist and Average Scenario',
		'scenario.average_pessimist':        'Average and Pessimist Scenario',
		'scenario.optimist_average_pessimist': 'Optimist, Average and Pessimist Scenario',
		'scenario.average_pessimist_worst':  'Average, Pessimist and Worst Case Scenario',
		'scenario.pessimist_worst':          'Pessimist and Worst Case Scenario',
		'scenario.all':                      'All Scenarios',

		// Negative events table
		'prob.negative.header':     'Negative Events',
		'prob.negative.col':        'Event Type',
		'event.player_lost':        'Player Lost',
		'event.unexplored':         'Sector Unexplored',
		'event.disease':            'Disease',
		'event.item_lost':          'Item Loss',
		'event.kill_all':           'Kill All',
		'event.kill_one':           'Kill One',
		'event.mush_trap':          'Mush Trap',

		// Results display
		'results.header':           'Expedition Results',
		'results.placeholder':      'Add players to see expedition results',

		// Planetary review
		'planet.unknown':           'Unknown planet',
		'planet.direction_title':   'Change direction',
		'planet.fuel_up':           'Increase fuel cost',
		'planet.fuel_down':         'Decrease fuel cost',
		'planet.export_title':      'Copy planet summary to clipboard',
		'planet.export_btn':        '📋 Export',
		'planet.export_success':    '✓ Copied!',
		'planet.export_error':      '✗ Failed',
		'planet.nav':               '{direction} — {fuel} fuel',

		// Star rating
		'stars.overall':            'Overall',
		'stars.axis.fruits':        'Fruits',
		'stars.axis.steaks':        'Steaks',
		'stars.axis.fuel':          'Fuel',
		'stars.axis.artifacts':     'Artifacts',
		'stars.axis.lethality':     'Lethality',
		'stars.axis.hazards':       'Hazards',
	},

	// ─────────────────────────────────────────────────────────────────────────
	// French
	// ─────────────────────────────────────────────────────────────────────────
	fr: {
		// Panel
		'panel.title':              'Simulateur d\'Expédition',
		'panel.pin':                'Épingler le panneau',
		'panel.unpin':              'Désépingler le panneau',
		'panel.lang.label':         'Langue',

		// Tabs
		'tab.planetary_review':     'Revue Planétaire',
		'tab.expedition_sim':       'Simulation d\'Expédition',

		// Sector selection
		'sectors.header':           'Expédition sélectionnée ({regular}/{max})',
		'sectors.special_suffix':   '+ {count} spécial',
		'sectors.clear_all':        'Tout effacer',
		'sectors.remove_hint':      '{name} — Cliquer pour retirer',

		// Example worlds
		'worlds.header':            'Mondes exemples',

		// Players section
		'players.header':           'Joueurs',

		// Probability display
		'prob.header':              'Probabilités d\'événements',
		'prob.placeholder':         'Sélectionnez des secteurs pour voir les probabilités',
		'prob.loading':             'Calcul en cours...',
		'prob.error':               'Erreur de calcul',

		// Resources table
		'prob.resources.header':    'Ressources',
		'prob.resources.col':       'Ressource',
		'prob.col.pessimist':       'Pessimiste',
		'prob.col.average':         'Moyen',
		'prob.col.optimist':        'Optimiste',
		'prob.none':                'aucun',

		// Resource names
		'resource.fruits':          'Fruits',
		'resource.steaks':          'Steaks',
		'resource.fuel':            'Carburant',
		'resource.oxygen':          'Oxygène',
		'resource.artefacts':       'Artefacts',
		'resource.map_fragments':   'Fragments de carte',

		// Combat / event damage sections
		'prob.combat.header':       'Dégâts de combat',
		'prob.combat.none':         'Aucun dégât de combat prévu',
		'prob.event.header':        'Dégâts d\'événement',
		'prob.event.none':          'Aucun dégât d\'événement prévu',

		// Damage scenario labels
		'scenario.optimist':                 'Scénario optimiste',
		'scenario.average':                  'Scénario moyen',
		'scenario.pessimist':                'Scénario pessimiste',
		'scenario.worst':                    'Pire scénario',
		'scenario.optimist_average':         'Scénarios optimiste et moyen',
		'scenario.average_pessimist':        'Scénarios moyen et pessimiste',
		'scenario.optimist_average_pessimist': 'Scénarios optimiste, moyen et pessimiste',
		'scenario.average_pessimist_worst':  'Scénarios moyen, pessimiste et pire',
		'scenario.pessimist_worst':          'Scénarios pessimiste et pire',
		'scenario.all':                      'Tous les scénarios',

		// Negative events table
		'prob.negative.header':     'Événements négatifs',
		'prob.negative.col':        'Type d\'événement',
		'event.player_lost':        'Joueur perdu',
		'event.unexplored':         'Secteur non exploré',
		'event.disease':            'Maladie',
		'event.item_lost':          'Perte d\'objet',
		'event.kill_all':           'Mort de tous',
		'event.kill_one':           'Mort d\'un joueur',
		'event.mush_trap':          'Piège Mush',

		// Results display
		'results.header':           'Résultats de l\'expédition',
		'results.placeholder':      'Ajoutez des joueurs pour voir les résultats',

		// Planetary review
		'planet.unknown':           'Planète inconnue',
		'planet.direction_title':   'Changer de direction',
		'planet.fuel_up':           'Augmenter le coût en carburant',
		'planet.fuel_down':         'Diminuer le coût en carburant',
		'planet.export_title':      'Copier le résumé de la planète',
		'planet.export_btn':        '📋 Exporter',
		'planet.export_success':    '✓ Copié !',
		'planet.export_error':      '✗ Échec',
		'planet.nav':               '{direction} — {fuel} de carburant',

		// Star rating
		'stars.overall':            'Général',
		'stars.axis.fruits':        'Fruits',
		'stars.axis.steaks':        'Steaks',
		'stars.axis.fuel':          'Carburant',
		'stars.axis.artifacts':     'Artefacts',
		'stars.axis.lethality':     'Léthalité',
		'stars.axis.hazards':       'Dangers',
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Spanish
	// ─────────────────────────────────────────────────────────────────────────
	es: {
		// Panel
		'panel.title':              'Simulador de Expedición',
		'panel.pin':                'Fijar panel',
		'panel.unpin':              'Desfijar panel',
		'panel.lang.label':         'Idioma',

		// Tabs
		'tab.planetary_review':     'Revisión Planetaria',
		'tab.expedition_sim':       'Simulación de Expedición',

		// Sector selection
		'sectors.header':           'Expedición seleccionada ({regular}/{max})',
		'sectors.special_suffix':   '+ {count} especial',
		'sectors.clear_all':        'Borrar todo',
		'sectors.remove_hint':      '{name} — Clic para eliminar',

		// Example worlds
		'worlds.header':            'Mundos de ejemplo',

		// Players section
		'players.header':           'Jugadores',

		// Probability display
		'prob.header':              'Probabilidades de eventos',
		'prob.placeholder':         'Selecciona sectores para ver las probabilidades',
		'prob.loading':             'Calculando...',
		'prob.error':               'Error de cálculo',

		// Resources table
		'prob.resources.header':    'Recursos',
		'prob.resources.col':       'Recurso',
		'prob.col.pessimist':       'Pesimista',
		'prob.col.average':         'Promedio',
		'prob.col.optimist':        'Optimista',
		'prob.none':                'ninguno',

		// Resource names
		'resource.fruits':          'Frutas',
		'resource.steaks':          'Bistecs',
		'resource.fuel':            'Combustible',
		'resource.oxygen':          'Oxígeno',
		'resource.artefacts':       'Artefactos',
		'resource.map_fragments':   'Fragmentos de mapa',

		// Combat / event damage sections
		'prob.combat.header':       'Daño de combate',
		'prob.combat.none':         'No se esperan daños de combate',
		'prob.event.header':        'Daño por eventos',
		'prob.event.none':          'No se esperan daños por eventos',

		// Damage scenario labels
		'scenario.optimist':                 'Escenario optimista',
		'scenario.average':                  'Escenario promedio',
		'scenario.pessimist':                'Escenario pesimista',
		'scenario.worst':                    'Peor escenario',
		'scenario.optimist_average':         'Escenarios optimista y promedio',
		'scenario.average_pessimist':        'Escenarios promedio y pesimista',
		'scenario.optimist_average_pessimist': 'Escenarios optimista, promedio y pesimista',
		'scenario.average_pessimist_worst':  'Escenarios promedio, pesimista y peor',
		'scenario.pessimist_worst':          'Escenarios pesimista y peor',
		'scenario.all':                      'Todos los escenarios',

		// Negative events table
		'prob.negative.header':     'Eventos negativos',
		'prob.negative.col':        'Tipo de evento',
		'event.player_lost':        'Jugador perdido',
		'event.unexplored':         'Sector sin explorar',
		'event.disease':            'Enfermedad',
		'event.item_lost':          'Pérdida de objeto',
		'event.kill_all':           'Matar a todos',
		'event.kill_one':           'Matar a uno',
		'event.mush_trap':          'Trampa Mush',

		// Results display
		'results.header':           'Resultados de la expedición',
		'results.placeholder':      'Agrega jugadores para ver los resultados',

		// Planetary review
		'planet.unknown':           'Planeta desconocido',
		'planet.direction_title':   'Cambiar dirección',
		'planet.fuel_up':           'Aumentar coste de combustible',
		'planet.fuel_down':         'Reducir coste de combustible',
		'planet.export_title':      'Copiar resumen del planeta',
		'planet.export_btn':        '📋 Exportar',
		'planet.export_success':    '✓ ¡Copiado!',
		'planet.export_error':      '✗ Error',
		'planet.nav':               '{direction} — {fuel} de combustible',

		// Star rating
		'stars.overall':            'General',
		'stars.axis.fruits':        'Frutas',
		'stars.axis.steaks':        'Bistecs',
		'stars.axis.fuel':          'Combustible',
		'stars.axis.artifacts':     'Artefactos',
		'stars.axis.lethality':     'Letalidad',
		'stars.axis.hazards':       'Riesgos',
	},
};

if (typeof window !== 'undefined') {
	window.Translations = Translations;
}

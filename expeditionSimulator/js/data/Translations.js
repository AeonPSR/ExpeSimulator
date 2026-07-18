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
		'panel.title':              'Planetary Analyzer',
		'panel.lang.label':         'Language',

		// Tabs
		'tab.planetary_review':     'Planetary Review',
		'tab.expedition_sim':       'Expedition Simulation',

		// Sector selection
		'sectors.header':           'Sectors Present ({regular}/{max})',
		'sectors.special_suffix':   '+ {count}',
		'sectors.clear_all':        'Clear All',

		// Sector grid
		'sectors.available':        'Available Sectors',

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
		'planet.export_btn':        '📋 Export',
		'planet.export_success':    '✓ Copied!',
		'planet.export_error':      '✗ Failed',
		'planet.nav':               '{direction} — {fuel}',

		// Star rating
		// Results legend
		'legend.scenarios':         'Scenarios',
		'legend.optimist':          'Optimist',
		'legend.median':            'Average',
		'legend.pessimist':         'Pessimist',
		'legend.worst':             'Worst',

		'stars.overall':            'Overall',
		'stars.axis.fruits':        'Fruits',
		'stars.axis.steaks':        'Steaks',
		'stars.axis.fuel':          'Fuel',
		'stars.axis.artifacts':     'Artifacts',
		'stars.axis.lethality':     'Lethality',
		'stars.axis.hazards':       'Hazards',

		// Directions
		'planet.dir.north':         'North',
		'planet.dir.east':          'East',
		'planet.dir.south':         'South',
		'planet.dir.west':          'West',

		// Planet tags — labels
		'tag.oxygen.label':                  'Oxygen',
		'tag.cristal_field.label':           'Crystal Field',
		'tag.mankarog.label':                'Mankarog',
		'tag.fruits_high.label':             'Cornucopia',
		'tag.steaks_high.label':             'Hunting Grounds',
		'tag.fuel_high.label':               'Black Pearl',
		'tag.artifacts_high.label':          'Treasure Planet',
		'tag.lethality_high.label':          'Death World',
		'tag.hazards_high.label':            "Murphy's Law",
		'tag.mineral_rich.label':            'Rock and Stone !',
		'tag.jungle.label':                  'Greenpath',
		'tag.varied_landscape.label':        'Pretty Landscapes',
		'tag.fauna_rich.label':              'Overcrowded',
		'tag.climate_change.label':          'Climate Change',
		'tag.terra_incognita.label':         'Terra Incognita',
		'tag.no_astro.label':                'Maybe scan it some more',
		'tag.tiny.label':                    'Pocket World',
		'tag.huge.label':                    'Behemoth',
		'tag.score_terrible.label':          'Poor',
		'tag.score_good.label':              'Promising',
		'tag.score_exceptional.label':       'Exceptional',
		'tag.quad_forest.label':             'Brocéliande',
		'tag.quad_mountain.label':           'Mountain Ranges',
		'tag.quad_swamp.label':              'Bayou',
		'tag.quad_desert.label':             "Arrakis' Wastes",
		'tag.quad_ocean.label':              'Waterworld',
		'tag.quad_cave.label':               'Hollow World',
		'tag.quad_ruins.label':              'Type 1 Extinction',
		'tag.quad_wreck.label':              'The Big Thrash Heap',
		'tag.quad_fruit_trees.label':        'Hanging Gardens',
		'tag.quad_ruminant.label':           'Augean Stables',
		'tag.quad_predator.label':           'Apex Hunters',
		'tag.quad_intelligent.label':        'Homeworld',
		'tag.quad_insect.label':             'The Great Swarm',
		'tag.quad_cold.label':               'Giant Snowball',
		'tag.quad_hot.label':                '4th Degree Burn',
		'tag.quad_strong_wind.label':        'Jovian Winds',
		'tag.quad_seismic_activity.label':   'Faultline',
		'tag.quad_volcanic_activity.label':  'A Nice Chill Expedition',

		// Planet tags — descriptions
		'tag.oxygen.desc':                   'Contains an Oxygen sector.',
		'tag.cristal_field.desc':            'Contains a Cristal Field sector.',
		'tag.mankarog.desc':                 'Contains a Mankarog sector.',
		'tag.fruits_high.desc':              'Exceptional fruit yield.',
		'tag.steaks_high.desc':              'Exceptional quantity of food.',
		'tag.fuel_high.desc':                'Exceptional quantity of fuel.',
		'tag.artifacts_high.desc':           'Exceptional quantity of relics.',
		'tag.lethality_high.desc':           'Extremely dangerous combat environment.',
		'tag.hazards_high.desc':             'High risk of disease, traps, crew or item loss.',
		'tag.mineral_rich.desc':             'Dominated by mineral sectors.',
		'tag.jungle.desc':                   'Dominated by lush vegetation.',
		'tag.varied_landscape.desc':         'Highly diverse terrain.',
		'tag.fauna_rich.desc':               'Teeming with wildlife.',
		'tag.climate_change.desc':           'Dominated by hostile climate sectors.',
		'tag.terra_incognita.desc':          'Several unknown sectors.',
		'tag.no_astro.desc':                 'Mostly unscanned.',
		'tag.tiny.desc':                     'Fewer than 6 sectors.',
		'tag.huge.desc':                     'More than 16 sectors.',
		'tag.score_terrible.desc':           'Overall score below 2.',
		'tag.score_good.desc':               'Overall score between 3.5 and 5.',
		'tag.score_exceptional.desc':        'Overall score above 5.',
		'tag.quad_forest.desc':              '4 Forest sectors.',
		'tag.quad_mountain.desc':            '4 Mountain sectors.',
		'tag.quad_swamp.desc':               '4 Swamp sectors.',
		'tag.quad_desert.desc':              '4 Desert sectors.',
		'tag.quad_ocean.desc':               '4 Ocean sectors.',
		'tag.quad_cave.desc':                '4 Cave sectors.',
		'tag.quad_ruins.desc':               '4 Ruins sectors.',
		'tag.quad_wreck.desc':               '4 Wreck sectors.',
		'tag.quad_fruit_trees.desc':         '4 Fruit Tree sectors.',
		'tag.quad_ruminant.desc':            '4 Ruminant sectors.',
		'tag.quad_predator.desc':            '4 Predator sectors.',
		'tag.quad_intelligent.desc':         '4 Intelligent sectors.',
		'tag.quad_insect.desc':              '4 Insect sectors.',
		'tag.quad_cold.desc':                '4 Cold sectors.',
		'tag.quad_hot.desc':                 '4 Hot sectors.',
		'tag.quad_strong_wind.desc':         '4 Strong Wind sectors.',
		'tag.quad_seismic_activity.desc':    '4 Seismic Activity sectors.',
		'tag.quad_volcanic_activity.desc':   '4 Volcanic Activity sectors.',

		// Crew Manager panel
		'crewmanager.title':                 'Crew Manager',
		'crewmanager.section.crew':          'Crew',
		'crewmanager.section.title':         'Title',
		'crewmanager.section.details':       'Details',
		'crewmanager.reset':                 'Reset this panel',

		// Settings panel
		'settings.title':                    'Settings',
		'settings.section.language':         'Language',
		'settings.section.theme':            'Theme',
		'settings.section.devtools':         'Developer tools',
		'settings.section.visibility':       'Visibility',
		'settings.theme.default':            'Beta',
		'settings.theme.retro':              'Aeon\'s Lab',
		'settings.theme.unavailable_firefox': 'Unavailable on Firefox',

		// Credits
		'credits.warning':                   'ATTENTION: The tools in this script require a basic understanding of their associated mechanics. You can find all this information on the',
		'credits.wiki.url':                  'https://en.emushpedia.com/wiki/Home',
		'credits.wiki.label':                'community wiki.',
		'credits.author.title':              'A script created by aeon_psr',
		'credits.contact':                   'Questions? Suggestions? Bugs? Send me a message on Discord!',

		// Settings tabs
		'settings.tab.informations':         'Informations',
		'settings.tab.patch_notes':          'Patch Notes',

		// Credits subtitle
		'credits.subtitle':                  'Up to date with eMush V0.31',

		// Patch notes
		'patch_notes.v1_1.line1':            'Added this section.',
		'patch_notes.v1_1.line2':            'Fixed various formatting issues.',
		'patch_notes.v1_1.line3':            'Added a button on mobile to close the extension.',
		'patch_notes.v1_0.content':          'Initial release.',
	},

	// ─────────────────────────────────────────────────────────────────────────
	// French
	// ─────────────────────────────────────────────────────────────────────────
	fr: {
		// Panel
		'panel.title':              'Analyseur Planétaire',
		'panel.lang.label':         'Langue',

		// Tabs
		'tab.planetary_review':     'Revue Planétaire',
		'tab.expedition_sim':       'Simulation d\'Expédition',

		// Sector selection
		'sectors.header':           'Secteurs présents ({regular}/{max})',
		'sectors.special_suffix':   '+ {count}',
		'sectors.clear_all':        'Tout effacer',

		// Sector grid
		'sectors.available':        'Secteurs disponibles',

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
		'prob.event.header':        'Dégâts d\'événements',
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
		'event.kill_all':           'Mort du groupe',
		'event.kill_one':           'Mort d\'un joueur',
		'event.mush_trap':          'Piège Mush',

		// Results display
		'results.header':           'Résultats de l\'expédition',
		'results.placeholder':      'Ajoutez des joueurs pour voir les résultats',

		// Planetary review
		'planet.unknown':           'Planète inconnue',
		'planet.export_btn':        '📋 Exporter',
		'planet.export_success':    '✓ Copié !',
		'planet.export_error':      '✗ Échec',
		'planet.nav':               '{direction} — {fuel}',

		// Star rating
		// Results legend
		'legend.scenarios':         'Scénarios',
		'legend.optimist':          'Optimiste',
		'legend.median':            'Moyen',
		'legend.pessimist':         'Pessimiste',
		'legend.worst':             'Pire',

		'stars.overall':            'Général',
		'stars.axis.fruits':        'Fruits',
		'stars.axis.steaks':        'Steaks',
		'stars.axis.fuel':          'Carburant',
		'stars.axis.artifacts':     'Artefacts',
		'stars.axis.lethality':     'Létalité',
		'stars.axis.hazards':       'Dangers',

		// Directions
		'planet.dir.north':         'Nord',
		'planet.dir.east':          'Est',
		'planet.dir.south':         'Sud',
		'planet.dir.west':          'Ouest',

		// Planet tags — labels
		'tag.oxygen.label':                  'Oxygène',
		'tag.cristal_field.label':           'Champ de Cristalite',
		'tag.mankarog.label':                'Mankarog',
		'tag.fruits_high.label':             "Corne d'abondance",
		'tag.steaks_high.label':             'Terres de chasse',
		'tag.fuel_high.label':               'Perle noire',
		'tag.artifacts_high.label':          'Planète au trésor',
		'tag.lethality_high.label':          'Le Monde de la mort',
		'tag.hazards_high.label':            'Loi de Murphy',
		'tag.mineral_rich.label':            'Rock and Stone !',
		'tag.jungle.label':                  'Vertchemin',
		'tag.varied_landscape.label':        'Jolis paysages',
		'tag.fauna_rich.label':              'Surpeuplé',
		'tag.climate_change.label':          'Changement climatique',
		'tag.terra_incognita.label':         'Terra Incognita',
		'tag.no_astro.label':                'Il faudrait peut-être scanner un peu plus',
		'tag.tiny.label':                    'Monde de poche',
		'tag.huge.label':                    'Béhémoth',
		'tag.score_terrible.label':          'Médiocre',
		'tag.score_good.label':              'Prometteuse',
		'tag.score_exceptional.label':       'Exceptionnelle',
		'tag.quad_forest.label':             'Brocéliande',
		'tag.quad_mountain.label':           'Pyrénéen',
		'tag.quad_swamp.label':              'Bayou',
		'tag.quad_desert.label':             "Les déserts d'Arrakis",
		'tag.quad_ocean.label':              'Waterworld',
		'tag.quad_cave.label':               'Monde creux',
		'tag.quad_ruins.label':              'Extinction de type 1',
		'tag.quad_wreck.label':              'Le grand tas de ferraille',
		'tag.quad_fruit_trees.label':        'Jardins suspendus',
		'tag.quad_ruminant.label':           "Écuries d'Augias",
		'tag.quad_predator.label':           'Superprédateur',
		'tag.quad_intelligent.label':        'Berceau d\'une civilisation',
		'tag.quad_insect.label':             'Le Grand Essaim',
		'tag.quad_cold.label':               'Boule de neige géante',
		'tag.quad_hot.label':                'Brûlure au 4e degré',
		'tag.quad_strong_wind.label':        'Vents joviens',
		'tag.quad_seismic_activity.label':   'Déchirée',
		'tag.quad_volcanic_activity.label':  'Une petite expédition sympa et reposante',

		// Planet tags — descriptions
		'tag.oxygen.desc':                   'Contient un secteur Oxygène.',
		'tag.cristal_field.desc':            'Contient un secteur Cristalite.',
		'tag.mankarog.desc':                 'Contient un secteur Mankarog.',
		'tag.fruits_high.desc':              'Récolte de fruits exceptionnelle.',
		'tag.steaks_high.desc':              'Quantité de nourriture exceptionnelle.',
		'tag.fuel_high.desc':                'Quantité de carburant exceptionnelle.',
		'tag.artifacts_high.desc':           'Quantité de reliques exceptionnelle.',
		'tag.lethality_high.desc':           'Environnement de combat extrêmement dangereux.',
		'tag.hazards_high.desc':             "Risque élevé de maladies, pièges, perte d'équipage ou d'objet.",
		'tag.mineral_rich.desc':             'Dominé par des secteurs minéraux.',
		'tag.jungle.desc':                   'Dominé par une végétation luxuriante.',
		'tag.varied_landscape.desc':         'Beaucoup de différents paysages.',
		'tag.fauna_rich.desc':               'Fourmillant de faune.',
		'tag.climate_change.desc':           'Dominé par des secteurs climatiques hostiles.',
		'tag.terra_incognita.desc':          'Plusieurs secteurs inconnus.',
		'tag.no_astro.desc':                 'Principalement non-scannée.',
		'tag.tiny.desc':                     'Moins de 6 secteurs.',
		'tag.huge.desc':                     'Plus de 16 secteurs.',
		'tag.score_terrible.desc':           'Score global inférieur à 2.',
		'tag.score_good.desc':               'Score global entre 3,5 et 5.',
		'tag.score_exceptional.desc':        'Score global supérieur à 5.',
		'tag.quad_forest.desc':              '4 secteurs Forêt.',
		'tag.quad_mountain.desc':            '4 secteurs Montagne.',
		'tag.quad_swamp.desc':               '4 secteurs Marais.',
		'tag.quad_desert.desc':              '4 secteurs Désert.',
		'tag.quad_ocean.desc':               '4 secteurs Océan.',
		'tag.quad_cave.desc':                '4 secteurs Grottes.',
		'tag.quad_ruins.desc':               '4 secteurs Ruines.',
		'tag.quad_wreck.desc':               '4 secteurs Épaves.',
		'tag.quad_fruit_trees.desc':         '4 secteurs Arbres fruitiers.',
		'tag.quad_ruminant.desc':            '4 secteurs Ruminants.',
		'tag.quad_predator.desc':            '4 secteurs Prédateurs.',
		'tag.quad_intelligent.desc':         '4 secteurs Intelligence.',
		'tag.quad_insect.desc':              '4 secteurs Insectes.',
		'tag.quad_cold.desc':                '4 secteurs Froid.',
		'tag.quad_hot.desc':                 '4 secteurs Chaud.',
		'tag.quad_strong_wind.desc':         '4 secteurs Vents forts.',
		'tag.quad_seismic_activity.desc':    '4 secteurs Activité sismique.',
		'tag.quad_volcanic_activity.desc':   '4 secteurs Activité volcanique.',

		// Crew Manager panel
		'crewmanager.title':                 'Gestion d\'Équipage',
		'crewmanager.section.crew':          'Équipage',
		'crewmanager.section.title':         'Titre',
		'crewmanager.section.details':       'Détails',
		'crewmanager.reset':                 'Réinitialiser ce panneau',

		// Settings panel
		'settings.title':                    'Réglages',
		'settings.section.language':         'Langue',
		'settings.section.theme':            'Thème',
		'settings.section.devtools':         'Outils développeur',
		'settings.section.visibility':       'Visibilité',
		'settings.theme.default':            'Beta',
		'settings.theme.retro':              'Aeon\'s Lab',
		'settings.theme.unavailable_firefox': 'Indisponible sur Firefox',

		// Credits
		'credits.warning':                   'ATTENTION: Les outils de cette application demandent une maitrise des bases de leurs mécaniques associés. Vous pouvez trouvez toutes ces infos sur le',
		'credits.wiki.url':                  'https://fr.emushpedia.com/wiki/Accueil',
		'credits.wiki.label':                'wiki de la communauté.',
		'credits.author.title':              'Un script créé par aeon_psr',
		'credits.contact':                   'Questions ? Suggestions ? Bugs ? Envoyez moi un message sur Discord !',

		// Settings tabs
		'settings.tab.informations':         'Informations',
		'settings.tab.patch_notes':          'Notes de mise à jour',

		// Credits subtitle
		'credits.subtitle':                  'À jour avec eMush V0.31',

		// Patch notes
		'patch_notes.v1_1.line1':            'Ajout de cette section.',
		'patch_notes.v1_1.line2':            'Corrections de divers problèmes de mise en forme.',
		'patch_notes.v1_1.line3':            "Ajout d'un bouton sur mobile pour pouvoir fermer l'extension.",
		'patch_notes.v1_0.content':          'Version initiale.',
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Spanish
	// ─────────────────────────────────────────────────────────────────────────
	es: {
		// Panel
		'panel.title':              'Analizador Planetario',
		'panel.lang.label':         'Idioma',

		// Tabs
		'tab.planetary_review':     'Revisión Planetaria',
		'tab.expedition_sim':       'Simulación de Expedición',

		// Sector selection
		'sectors.header':           'Sectores presentes ({regular}/{max})',
		'sectors.special_suffix':   '+ {count}',
		'sectors.clear_all':        'Borrar todo',

		// Sector grid
		'sectors.available':        'Sectores disponibles',

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
		'planet.export_btn':        '📋 Exportar',
		'planet.export_success':    '✓ ¡Copiado!',
		'planet.export_error':      '✗ Error',
		'planet.nav':               '{direction} — {fuel}',

		// Star rating
		// Results legend
		'legend.scenarios':         'Escenarios',
		'legend.optimist':          'Optimista',
		'legend.median':            'Promedio',
		'legend.pessimist':         'Pesimista',
		'legend.worst':             'Peor',

		'stars.overall':            'General',
		'stars.axis.fruits':        'Frutas',
		'stars.axis.steaks':        'Bistecs',
		'stars.axis.fuel':          'Combustible',
		'stars.axis.artifacts':     'Artefactos',
		'stars.axis.lethality':     'Letalidad',
		'stars.axis.hazards':       'Riesgos',

		// Directions
		'planet.dir.north':         'Norte',
		'planet.dir.east':          'Este',
		'planet.dir.south':         'Sur',
		'planet.dir.west':          'Oeste',

		// Planet tags — labels
		'tag.oxygen.label':                  'Oxígeno',
		'tag.cristal_field.label':           'Campo de Cristal',
		'tag.mankarog.label':                'Mankarog',
		'tag.fruits_high.label':             'Cuerno de la Abundancia',
		'tag.steaks_high.label':             'Tierra de Parrilladas',
		'tag.fuel_high.label':               'Perla Negra',
		'tag.artifacts_high.label':          'Brujeria Alienigena',
		'tag.lethality_high.label':          'Mundo Mortal',
		'tag.hazards_high.label':            'Ley de Murphy',
		'tag.mineral_rich.label':            '¡Piedra y Roca!',
		'tag.jungle.label':                  'Paisaje Amazonico',
		'tag.varied_landscape.label':        'Paisajes Hermosos',
		'tag.fauna_rich.label':              'Superpoblado',
		'tag.climate_change.label':          'Cambio Climático',
		'tag.terra_incognita.label':         'Terra Incógnita',
		'tag.no_astro.label':                'Escanea un poco más',
		'tag.tiny.label':                    'Mundo de Bolsillo',
		'tag.huge.label':                    'Behemoth',
		'tag.score_terrible.label':          'Pobre',
		'tag.score_good.label':              'Prometedor',
		'tag.score_exceptional.label':       'Excepcional',
		'tag.quad_forest.label':             'Brocéliande',
		'tag.quad_mountain.label':           'Cordilleras',
		'tag.quad_swamp.label':              'Bayou',
		'tag.quad_desert.label':             'Los Desiertos de Arrakis',
		'tag.quad_ocean.label':              'Mundo Acuático',
		'tag.quad_cave.label':               'Mundo Hueco',
		'tag.quad_ruins.label':              'Extinción Tipo 1',
		'tag.quad_wreck.label':              'Cementerio de Naves',
		'tag.quad_fruit_trees.label':        'Jardines Colgantes',
		'tag.quad_ruminant.label':           'Establos de Augías',
		'tag.quad_predator.label':           'Cazadores Ápice',
		'tag.quad_intelligent.label':        'Mundo Natal',
		'tag.quad_insect.label':             'El Gran Enjambre',
		'tag.quad_cold.label':               'Bola de Nieve Gigante',
		'tag.quad_hot.label':                'Quemadura de 4° Grado',
		'tag.quad_strong_wind.label':        'Vientos Jovianos',
		'tag.quad_seismic_activity.label':   'Línea de Falla',
		'tag.quad_volcanic_activity.label':  'Una expedición tranquila',

		// Planet tags — descriptions
		'tag.oxygen.desc':                   'Contiene un sector de Oxígeno.',
		'tag.cristal_field.desc':            'Contiene un sector de Campo de Cristal.',
		'tag.mankarog.desc':                 'Contiene un sector Mankarog.',
		'tag.fruits_high.desc':              'Cosecha de frutas excepcional.',
		'tag.steaks_high.desc':              'Cantidad excepcional de comida.',
		'tag.fuel_high.desc':                'Cantidad excepcional de combustible.',
		'tag.artifacts_high.desc':           'Cantidad excepcional de reliquias.',
		'tag.lethality_high.desc':           'Entorno de combate extremadamente peligroso.',
		'tag.hazards_high.desc':             'Alto riesgo de enfermedades, trampas, pérdida de tripulación u objetos.',
		'tag.mineral_rich.desc':             'Dominado por sectores minerales.',
		'tag.jungle.desc':                   'Dominado por exuberante vegetación.',
		'tag.varied_landscape.desc':         'Terreno muy diverso.',
		'tag.fauna_rich.desc':               'Repleto de vida salvaje.',
		'tag.climate_change.desc':           'Dominado por sectores climáticos hostiles.',
		'tag.terra_incognita.desc':          'Varios sectores desconocidos.',
		'tag.no_astro.desc':                 'Mayormente sin escanear.',
		'tag.tiny.desc':                     'Menos de 6 sectores.',
		'tag.huge.desc':                     'Más de 16 sectores.',
		'tag.score_terrible.desc':           'Puntuación global inferior a 2.',
		'tag.score_good.desc':               'Puntuación global entre 3,5 y 5.',
		'tag.score_exceptional.desc':        'Puntuación global superior a 5.',
		'tag.quad_forest.desc':              '4 sectores de Bosque.',
		'tag.quad_mountain.desc':            '4 sectores de Montaña.',
		'tag.quad_swamp.desc':               '4 sectores de Pantano.',
		'tag.quad_desert.desc':              '4 sectores de Desierto.',
		'tag.quad_ocean.desc':               '4 sectores de Océano.',
		'tag.quad_cave.desc':                '4 sectores de Cueva.',
		'tag.quad_ruins.desc':               '4 sectores de Ruinas.',
		'tag.quad_wreck.desc':               '4 sectores de Nave naufragada.',
		'tag.quad_fruit_trees.desc':         '4 sectores de Árboles Frutales.',
		'tag.quad_ruminant.desc':            '4 sectores de Rumiantes.',
		'tag.quad_predator.desc':            '4 sectores de Depredadores.',
		'tag.quad_intelligent.desc':         '4 sectores de Inteligentes.',
		'tag.quad_insect.desc':              '4 sectores de Insectos.',
		'tag.quad_cold.desc':                '4 sectores de Frío.',
		'tag.quad_hot.desc':                 '4 sectores de Calor.',
		'tag.quad_strong_wind.desc':         '4 sectores de Vientos Fuertes.',
		'tag.quad_seismic_activity.desc':    '4 sectores de Actividad Sísmica.',
		'tag.quad_volcanic_activity.desc':   '4 sectores de Actividad Volcánica.',

		// Crew Manager panel
		'crewmanager.title':                 'Gestión de Tripulación',
		'crewmanager.section.crew':          'Tripulación',
		'crewmanager.section.title':         'Título',
		'crewmanager.section.details':       'Detalles',
		'crewmanager.reset':                 'Restablecer este panel',

		// Settings panel
		'settings.title':                    'Ajustes',
		'settings.section.language':         'Idioma',
		'settings.section.theme':            'Tema',
		'settings.section.devtools':         'Herramientas de desarrollador',
		'settings.section.visibility':       'Visibilidad',
		'settings.theme.default':            'Beta',
		'settings.theme.retro':              'Aeon\'s Lab',
		'settings.theme.unavailable_firefox': 'No disponible en Firefox',

		// Credits
		'credits.warning':                   'ATENCIÓN: Las herramientas de este script requieren conocimientos básicos de sus mecánicas asociadas. Puedes encontrar toda esta información en la',
		'credits.wiki.url':                  'https://es.emushpedia.com/wiki/Inicio',
		'credits.wiki.label':                'wiki de la comunidad.',
		'credits.author.title':              'Un script creado por aeon_psr',
		'credits.contact':                   '¿Preguntas? ¿Sugerencias? ¿Bugs? ¡Envíame un mensaje en Discord!',

		// Settings tabs
		'settings.tab.informations':         'Informaciones',
		'settings.tab.patch_notes':          'Notas de actualización',

		// Credits subtitle
		'credits.subtitle':                  'Actualizado con eMush V0.31',

		// Patch notes
		'patch_notes.v1_1.line1':            'Añadida esta sección.',
		'patch_notes.v1_1.line2':            'Correcciones de varios problemas de formato.',
		'patch_notes.v1_1.line3':            'Añadido un botón en móvil para cerrar la extensión.',
		'patch_notes.v1_0.content':          'Lanzamiento inicial.',
	},
};

if (typeof window !== 'undefined') {
	window.Translations = Translations;
}

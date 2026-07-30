/**
 * Project Manager Page
 *
 * Main content area for the Project Manager panel.
 */
class ProjectManagerPage extends Component {
	render() {
		this.element = this.createElement('div', { className: 'project-manager-page' });
		return this.element;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectManagerPage = ProjectManagerPage;

'use strict';

const {html} = require('htm/preact');
const path = require('node:path');
const plugin = require('fastify-plugin');
const {render} = require('preact-render-to-string');

module.exports = plugin((fastify, options, done) => {
	options = options || {};

	// Define default render properties
	const defaultProps = Object.assign({}, {
		contentType: 'text/html',
		doctype: '<!DOCTYPE html>'
	}, options.defaultProps);

	// Default the views folder
	if (options.viewsFolder && typeof options.viewsFolder !== 'string') {
		throw new TypeError('Views folder must be a string');
	}
	const viewsFolder = path.resolve(options.viewsFolder || `${process.cwd()}/views`);

	// Default pretty output
	const prettyOutput = (options.prettyOutput === undefined ? true : options.prettyOutput);

	// Provide a fastify.view method, which can be used to render a Preact view
	fastify.decorate('view', (view, props) => {

		// Check that the view argument is a string, otherwise we get a more
		// cryptic error from path.join
		if (typeof view !== 'string') {
			throw new TypeError('View name must be a string');
		}

		try {

			// Apply default props from the application and the reply
			props = Object.assign({}, defaultProps, props);
			props.html = html;

			// Load and render the view
			const viewFn = require(path.join(viewsFolder, view));
			const node = viewFn(props, {});

			// Render and return the view
			const output = render(node, null, {pretty: prettyOutput});
			return `${props.doctype ? `${props.doctype}\n` : ''}${output}`;

		} catch (error) {

			// If the module is not found, throw a more descriptive error
			if (error.code === 'MODULE_NOT_FOUND') {
				throw new Error(`View '${view}' does not exist in ${viewsFolder}`);
			}

			throw error;
		}
	});

	// Provide a reply.view method, which renders and sends the HTML
	fastify.decorateReply('view', function(view, props) {

		// Default props here so we can incorporate `reply.props`
		// and check for a content type
		props = Object.assign({}, defaultProps, this.props, props);

		// Set the content type
		if (props.contentType) {
			this.type(props.contentType);
		}

		// Render and send the view
		return this.send(fastify.view(view, props));
	});

	done();
}, {
	fastify: '3.x || 4.x',
	name: '@rowanmanning/fastify-htm-preact-views'
});

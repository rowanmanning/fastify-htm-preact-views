'use strict';

const fastifyHtmPreactViews = require('../../..');
const path = require('node:path');

module.exports = async function createTestFastifyApp(fastifyModule) {
	const fastify = require(fastifyModule);

	// Create a Fastify app
	const app = fastify();

	app.register(fastifyHtmPreactViews, {
		viewsFolder: path.join(__dirname, 'views')
	});

	app.get('/view', (request, reply) => {
		reply.view('test', {
			thing: 'World'
		});
	});

	app.get('/not-a-view', (request, reply) => {
		reply.view('not-a-view');
	});

	// Start the server and get the application address
	await app.listen();
	const address = `http://localhost:${app.server.address().port}`;

	/**
	 * Stop the application.
	 */
	function stop() {
		app.close();
	}

	/**
	 * Method to make a GET request to the test application.
	 *
	 * @param {string} requestPath
	 *     The path to make a request to.
	 * @returns {Response}
	 *     Returns an HTTP response object.
	 */
	function get(requestPath) {
		const url = new URL(requestPath, address);
		return fetch(url);
	}

	// Return the methods that we need
	return {
		get,
		stop
	};
};

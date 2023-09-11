'use strict';

const assert = require('node:assert');
const createTestApp = require('./fixture/create-test-fastify-app');

describe('Fastify 3', () => {
	let app;

	before(async () => {
		app = await createTestApp('fastify3');
	});

	after(() => {
		app.stop();
	});

	describe('GET /view', () => {
		let response;
		let body;

		beforeEach(async () => {
			response = await app.get('/view');
			body = await response.text();
		});

		it('responds with a 200 status', () => {
			assert.strictEqual(response.status, 200);
		});

		it('responds with rendered HTML', () => {
			assert.strictEqual(response.headers.get('content-type'), 'text/html');
			assert.strictEqual(body, '<!DOCTYPE html>\n<h1>Hello World!</h1>');
		});

	});

	describe('GET /not-a-view', () => {
		let response;
		let body;

		beforeEach(async () => {
			response = await app.get('/not-a-view');
			body = await response.json();
		});

		it('responds with a 500 status', () => {
			assert.strictEqual(response.status, 500);
		});

		it('responds with a JSON error', () => {
			assert.strictEqual(typeof body, 'object');
			assert.ok(/view 'not-a-view' does not exist/i.test(body.message));
		});

	});

});

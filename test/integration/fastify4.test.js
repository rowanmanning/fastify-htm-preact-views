'use strict';

const assert = require('node:assert');
const createTestApp = require('./fixture/create-test-fastify-app');

describe('Fastify 4', () => {
	let app;

	before(async () => {
		app = await createTestApp('fastify4');
	});

	after(() => {
		app.stop();
	});

	describe('GET /view', () => {
		let response;

		beforeEach(async () => {
			response = await app.get('/view');
		});

		it('responds with a 200 status', () => {
			assert.strictEqual(response.status, 200);
		});

		it('responds with rendered HTML', () => {
			assert.strictEqual(response.headers['content-type'], 'text/html');
			assert.strictEqual(response.data, '<!DOCTYPE html>\n<h1>Hello World!</h1>');
		});

	});

	describe('GET /not-a-view', () => {
		let response;

		beforeEach(async () => {
			response = await app.get('/not-a-view');
		});

		it('responds with a 500 status', () => {
			assert.strictEqual(response.status, 500);
		});

		it('responds with rendered HTML', () => {
			assert.strictEqual(typeof response.data, 'object');
			assert.ok(/view 'not-a-view' does not exist/i.test(response.data.message));
		});

	});

});

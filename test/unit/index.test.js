'use strict';

const {assert} = require('chai');
const mockery = require('mockery');

describe('index', () => {
	let fastifyHtmPreactViews;
	let index;

	beforeEach(() => {
		fastifyHtmPreactViews = {mockModule: true};
		mockery.registerMock('./lib/fastify-htm-preact-views', fastifyHtmPreactViews);

		index = require('../../index');
	});

	it('aliases `lib/fastify-htm-preact-views`', () => {
		assert.strictEqual(index, fastifyHtmPreactViews);
	});

});

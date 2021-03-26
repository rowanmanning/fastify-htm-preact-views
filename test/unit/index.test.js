'use strict';

const {assert} = require('chai');
const index = require('../../index');
const fastifyHtmPreactViews = require('../../lib/fastify-htm-preact-views');

describe('index', () => {

	it('aliases `lib/fastify-htm-preact-views`', () => {
		assert.strictEqual(index, fastifyHtmPreactViews);
	});

});

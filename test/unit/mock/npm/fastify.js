'use strict';

const sinon = require('sinon');

const fastify = module.exports = sinon.stub();

fastify.mockServer = {
	decorate: sinon.stub(),
	decorateReply: sinon.stub()
};

fastify.mockReply = {
	type: sinon.stub(),
	send: sinon.stub()
};

fastify.returns(fastify.mockServer);

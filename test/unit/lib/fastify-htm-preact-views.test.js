'use strict';

const {assert} = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/fastify-htm-preact-views', () => {
	let fastify;
	let fastifyHtmPreactViews;
	let htmPreact;
	let mockView;
	let path;
	let plugin;
	let preactRenderToString;

	beforeEach(() => {

		fastify = require('../mock/npm/fastify');
		mockery.registerMock('fastify', fastify);

		htmPreact = require('../mock/npm/htm/preact');
		mockery.registerMock('htm/preact', htmPreact);

		mockView = sinon.stub();
		mockery.registerMock('mock-resolved-path/mock-view-name', mockView);

		path = require('path');

		plugin = require('../mock/npm/fastify-plugin');
		mockery.registerMock('fastify-plugin', plugin);

		preactRenderToString = require('../mock/npm/preact-render-to-string');
		mockery.registerMock('preact-render-to-string', preactRenderToString);

		plugin.onFirstCall().returns({
			isMockPlugin: true
		});

		fastifyHtmPreactViews = require('../../../lib/fastify-htm-preact-views');
	});

	it('creates a Fastify plugin', () => {
		assert.calledOnce(plugin);
		assert.lengthOf(plugin.firstCall.args, 2);
		assert.isFunction(plugin.firstCall.args[0]);
		assert.isObject(plugin.firstCall.args[1]);
	});

	describe('pluginFn(fastify, options, done)', () => {
		let pluginFn;
		let userOptions;

		beforeEach(done => {
			pluginFn = plugin.firstCall.args[0];

			sinon.spy(path, 'join');
			sinon.stub(path, 'resolve').returns('mock-resolved-path');
			sinon.spy(Object, 'assign');

			userOptions = {
				defaultProps: {
					contentType: 'mock-content-type',
					doctype: 'mock-doctype',
					isMockDefaultProps: true
				},
				prettyOutput: 'mock-pretty-output',
				viewsFolder: 'mock-views-folder'
			};

			pluginFn(fastify.mockServer, userOptions, done);
		});

		afterEach(() => {
			path.join.restore();
			path.resolve.restore();
			Object.assign.restore();
		});

		it('combines `options.defaultProps` with some internal default values', () => {
			assert.calledOnce(Object.assign);
			assert.lengthOf(Object.assign.firstCall.args, 3);
			assert.isObject(Object.assign.firstCall.args[0]);
			assert.deepEqual(Object.assign.firstCall.args[1], {
				contentType: 'text/html',
				doctype: '<!DOCTYPE html>'
			});
			assert.strictEqual(Object.assign.firstCall.args[2], userOptions.defaultProps);
		});

		it('resolves `options.viewsFolder`', () => {
			assert.calledOnce(path.resolve);
			assert.calledWithExactly(path.resolve, 'mock-views-folder');
		});

		it('decorates the Fastify app with a view method', () => {
			assert.calledOnce(fastify.mockServer.decorate);
			assert.lengthOf(fastify.mockServer.decorate.firstCall.args, 2);
			assert.strictEqual(fastify.mockServer.decorate.firstCall.args[0], 'view');
			assert.isFunction(fastify.mockServer.decorate.firstCall.args[1]);
		});

		describe('fastify.view(name, props)', () => {
			let defaultProps;
			let fastifyViewFn;
			let returnValue;
			let userProps;

			beforeEach(() => {
				fastifyViewFn = fastify.mockServer.decorate.firstCall.args[1];

				defaultProps = Object.assign.firstCall.returnValue;
				Object.assign.resetHistory();

				mockView.returns('mock-view-dom');

				preactRenderToString.render.returns('mock-rendered-view');

				userProps = {
					isUserProps: true
				};

				returnValue = fastifyViewFn.call(fastify.mockServer, 'mock-view-name', userProps);
			});

			it('combines the props with the defaults', () => {
				assert.calledOnce(Object.assign);
				assert.lengthOf(Object.assign.firstCall.args, 3);
				assert.isObject(Object.assign.firstCall.args[0]);
				assert.strictEqual(Object.assign.firstCall.args[1], defaultProps);
				assert.strictEqual(Object.assign.firstCall.args[2], userProps);
			});

			it('sets `props.html` to the htm/preact bound function', () => {
				assert.strictEqual(Object.assign.firstCall.returnValue.html, htmPreact.html);
			});

			it('joins `options.viewsFolder` with the `name` and requires it', () => {
				assert.calledOnce(path.join);
				assert.calledWithExactly(path.join, 'mock-resolved-path', 'mock-view-name');
			});

			it('calls the required view function with `props` and an empty state object', () => {
				assert.calledOnce(mockView);
				assert.lengthOf(mockView.firstCall.args, 2);
				assert.strictEqual(mockView.firstCall.args[0], Object.assign.firstCall.returnValue);
				assert.deepEqual(mockView.firstCall.args[1], {});
			});

			it('renders the returned DOM as a string', () => {
				assert.calledOnce(preactRenderToString.render);
				assert.lengthOf(preactRenderToString.render.firstCall.args, 3);
				assert.strictEqual(preactRenderToString.render.firstCall.args[0], 'mock-view-dom');
				assert.isNull(preactRenderToString.render.firstCall.args[1]);
				assert.deepEqual(preactRenderToString.render.firstCall.args[2], {
					pretty: 'mock-pretty-output'
				});
			});

			it('returns the rendered view as a string, including a DOCTYPE', () => {
				assert.strictEqual(returnValue, 'mock-doctype\nmock-rendered-view');
			});

			describe('when `props.doctype` is falsy', () => {

				beforeEach(() => {
					userProps.doctype = null;
					returnValue = fastifyViewFn.call(fastify.mockServer, 'mock-view-name', userProps);
				});

				it('returns the rendered view as a string without a DOCTYPE', () => {
					assert.strictEqual(returnValue, 'mock-rendered-view');
				});

			});

			describe('when `name` is not a string', () => {
				let caughtError;

				beforeEach(() => {
					try {
						returnValue = fastifyViewFn.call(fastify.mockServer, null, userProps);
					} catch (error) {
						caughtError = error;
					}
				});

				it('throws an error', () => {
					assert.instanceOf(caughtError, TypeError);
					assert.strictEqual(caughtError.message, 'View name must be a string');
				});

			});

			describe('when thew view cannot be found', () => {
				let caughtError;

				beforeEach(() => {
					try {
						returnValue = fastifyViewFn.call(fastify.mockServer, 'not-a-view', userProps);
					} catch (error) {
						caughtError = error;
					}
				});

				it('throws an error', () => {
					assert.instanceOf(caughtError, Error);
					assert.strictEqual(caughtError.message, 'View \'not-a-view\' does not exist in mock-resolved-path');
				});

			});

			describe('when the view errors', () => {
				let caughtError;
				let viewError;

				beforeEach(() => {
					viewError = new Error('mock-view-error');
					mockView.throws(viewError);
					try {
						returnValue = fastifyViewFn.call(fastify.mockServer, 'mock-view-name', userProps);
					} catch (error) {
						caughtError = error;
					}
				});

				it('throws the rendering error as-is', () => {
					assert.strictEqual(caughtError, viewError);
				});

			});

		});

		it('decorates the Fastify reply with a view method', () => {
			assert.calledOnce(fastify.mockServer.decorateReply);
			assert.lengthOf(fastify.mockServer.decorateReply.firstCall.args, 2);
			assert.strictEqual(fastify.mockServer.decorateReply.firstCall.args[0], 'view');
			assert.isFunction(fastify.mockServer.decorateReply.firstCall.args[1]);
		});

		describe('reply.view(name, props)', () => {
			let defaultProps;
			let replyViewFn;
			let userProps;

			beforeEach(() => {
				replyViewFn = fastify.mockServer.decorateReply.firstCall.args[1];

				defaultProps = Object.assign.firstCall.returnValue;
				Object.assign.resetHistory();

				fastify.mockServer.view = sinon.stub().returns('mock-rendered-view');

				fastify.mockReply.props = {
					isMockReplyProps: true
				};
				userProps = {
					isUserProps: true
				};

				replyViewFn.call(fastify.mockReply, 'mock-view-name', userProps);
			});

			it('combines the props with the defaults', () => {
				assert.calledOnce(Object.assign);
				assert.lengthOf(Object.assign.firstCall.args, 4);
				assert.isObject(Object.assign.firstCall.args[0]);
				assert.strictEqual(Object.assign.firstCall.args[1], defaultProps);
				assert.strictEqual(Object.assign.firstCall.args[2], fastify.mockReply.props);
				assert.strictEqual(Object.assign.firstCall.args[3], userProps);
			});

			it('sets a content type based on the `props.contentType`', () => {
				assert.calledOnce(fastify.mockReply.type);
				assert.calledWithExactly(fastify.mockReply.type, 'mock-content-type');
			});

			it('calls `fastify.view` with the name and defaulted props', () => {
				assert.calledOnce(fastify.mockServer.view);
				assert.calledWithExactly(fastify.mockServer.view, 'mock-view-name', Object.assign.firstCall.returnValue);
			});

			it('sends the rendered view in the response', () => {
				assert.calledOnce(fastify.mockReply.send);
				assert.calledWithExactly(fastify.mockReply.send, 'mock-rendered-view');
			});

			describe('when `props.contentType` is falsy', () => {

				beforeEach(() => {
					fastify.mockReply.type.resetHistory();
					userProps.contentType = null;
					replyViewFn.call(fastify.mockReply, 'mock-view-name', userProps);
				});

				it('does not set a content type', () => {
					assert.notCalled(fastify.mockReply.type);
				});

			});

		});

		describe('when `options.viewsFolder` is defined but not a string', () => {
			let caughtError;

			beforeEach(done => {
				path.resolve.resetHistory();

				userOptions.viewsFolder = [];

				try {
					pluginFn(fastify.mockServer, userOptions, done);
				} catch (error) {
					caughtError = error;
					done();
				}
			});

			it('does not resolve `options.viewsFolder`', () => {
				assert.notCalled(path.resolve);
			});

			it('throws an error', () => {
				assert.instanceOf(caughtError, TypeError);
				assert.strictEqual(caughtError.message, 'Views folder must be a string');
			});

		});

		describe('when `options.viewsFolder` is falsy', () => {

			beforeEach(done => {
				path.resolve.resetHistory();
				sinon.stub(process, 'cwd').returns('mock-cwd');

				userOptions.viewsFolder = null;

				pluginFn(fastify.mockServer, userOptions, done);
			});

			afterEach(() => {
				process.cwd.restore();
			});

			it('defaults to the "views" folder in current working directory ', () => {
				assert.calledOnce(path.resolve);
				assert.calledWithExactly(path.resolve, 'mock-cwd/views');
			});

		});

		describe('when `options.prettyOutput` is undefined', () => {

			beforeEach(done => {
				fastify.mockServer.decorate.resetHistory();
				delete userOptions.prettyOutput;
				pluginFn(fastify.mockServer, userOptions, done);
			});

			describe('fastify.view(name, props)', () => {
				let fastifyViewFn;

				beforeEach(() => {
					preactRenderToString.render.resetHistory();
					fastifyViewFn = fastify.mockServer.decorate.firstCall.args[1];
					mockView.returns('mock-view-dom');
					preactRenderToString.render.returns('mock-rendered-view');
					fastifyViewFn.call(fastify.mockServer, 'mock-view-name', {});
				});

				it('renders the returned DOM as a string, with pretty output on', () => {
					assert.calledOnce(preactRenderToString.render);
					assert.lengthOf(preactRenderToString.render.firstCall.args, 3);
					assert.strictEqual(preactRenderToString.render.firstCall.args[0], 'mock-view-dom');
					assert.isNull(preactRenderToString.render.firstCall.args[1]);
					assert.deepEqual(preactRenderToString.render.firstCall.args[2], {
						pretty: true
					});
				});

			});

		});

		describe('when `options` is not falsy', () => {
			let caughtError;

			beforeEach(done => {
				try {
					pluginFn(fastify.mockServer, null, done);
				} catch (error) {
					caughtError = error;
					done();
				}
			});

			it('does not error', () => {
				assert.isUndefined(caughtError);
			});

		});

	});

	describe('Fastify plugin metadata', () => {
		let pluginMetadata;

		beforeEach(() => {
			pluginMetadata = plugin.firstCall.args[1];
		});

		it('has a name which matches the module name', () => {
			assert.strictEqual(pluginMetadata.name, require('../../../package.json').name);
		});

		it('has a defined compatible Fastify version', () => {
			assert.strictEqual(pluginMetadata.fastify, '3.x');
		});

	});

	it('exports the created plugin', () => {
		assert.strictEqual(fastifyHtmPreactViews, plugin.firstCall.returnValue);
		assert.isTrue(fastifyHtmPreactViews.isMockPlugin);
	});

});

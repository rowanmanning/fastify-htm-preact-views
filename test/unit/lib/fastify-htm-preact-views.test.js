'use strict';

const {assert} = require('chai');
const td = require('testdouble');

describe('lib/fastify-htm-preact-views', () => {
	let fastifyHtmPreactViews;
	let htmPreact;
	let mockView;
	let path;
	let plugin;
	let preactRenderToString;

	beforeEach(() => {
		htmPreact = td.replace('htm/preact', {html: td.func()});
		mockView = td.replace('mock-resolved-path/mock-view-name', td.func());
		td.replace('mock-resolved-path/not-a-view', () => {
			const error = new Error('mock error');
			error.code = 'MODULE_NOT_FOUND';
			throw error;
		});
		path = require('path');
		plugin = td.replace('fastify-plugin', td.func());
		preactRenderToString = td.replace('preact-render-to-string', {render: td.func()});

		td.when(plugin(), {ignoreExtraArgs: true}).thenReturn({
			isMockPlugin: true
		});

		fastifyHtmPreactViews = require('../../../lib/fastify-htm-preact-views');
	});

	it('creates a Fastify plugin', () => {
		td.verify(plugin(td.matchers.isA(Function), {
			fastify: '3.x || ~4.0.0-alpha',
			name: '@rowanmanning/fastify-htm-preact-views'
		}), {times: 1});
	});

	describe('pluginFn(fastify, options, done)', () => {
		let mockServer;
		let pluginFn;
		let userOptions;

		beforeEach(done => {
			pluginFn = td.explain(plugin).calls[0].args[0];

			td.replace(path, 'resolve');
			td.when(path.resolve('mock-views-folder')).thenReturn('mock-resolved-path');

			mockServer = {
				decorate: td.func(),
				decorateReply: td.func()
			};

			userOptions = {
				defaultProps: {
					contentType: 'mock-content-type',
					doctype: 'mock-doctype',
					isMockDefaultProps: true
				},
				prettyOutput: 'mock-pretty-output',
				viewsFolder: 'mock-views-folder'
			};

			td.replace(Object, 'assign');
			td.when(Object.assign({}, td.matchers.isA(Object), userOptions.defaultProps)).thenReturn({
				contentType: 'mock-content-type',
				doctype: 'mock-doctype',
				isMockDefaultProps: true
			});

			pluginFn(mockServer, userOptions, done);
		});

		it('combines `options.defaultProps` with some internal default values', () => {
			td.verify(Object.assign({}, {
				contentType: 'text/html',
				doctype: '<!DOCTYPE html>'
			}, userOptions.defaultProps), {times: 1});
		});

		it('resolves `options.viewsFolder`', () => {
			td.verify(path.resolve('mock-views-folder'), {times: 1});
		});

		it('decorates the Fastify app with a view method', () => {
			td.verify(mockServer.decorate('view', td.matchers.isA(Function)), {times: 1});
		});

		describe('fastify.view(name, props)', () => {
			let defaultProps;
			let defaultedProps;
			let fastifyViewFn;
			let returnValue;
			let userProps;

			beforeEach(() => {
				fastifyViewFn = td.explain(mockServer.decorate).calls[0].args[1];

				td.replace(path, 'join');
				td.when(path.join('mock-resolved-path', 'mock-view-name')).thenReturn('mock-resolved-path/mock-view-name');
				td.when(path.join('mock-resolved-path', 'not-a-view')).thenReturn('mock-resolved-path/not-a-view');

				td.when(mockView(), {ignoreExtraArgs: true}).thenReturn('mock-view-dom');

				td.when(preactRenderToString.render(), {ignoreExtraArgs: true}).thenReturn('mock-rendered-view');

				defaultProps = {
					contentType: 'mock-content-type',
					doctype: 'mock-doctype',
					isMockDefaultProps: true
				};
				userProps = {
					isUserProps: true
				};
				defaultedProps = {
					doctype: 'mock-doctype',
					isDefaultedProps: true
				};

				td.when(Object.assign({}, defaultProps, userProps)).thenReturn(defaultedProps);

				returnValue = fastifyViewFn.call(mockServer, 'mock-view-name', userProps);
			});

			it('combines the props with the defaults', () => {
				td.verify(Object.assign({}, defaultProps, userProps), {
					times: 1
				});
			});

			it('sets `props.html` to the htm/preact bound function', () => {
				assert.strictEqual(defaultedProps.html, htmPreact.html);
			});

			it('joins `options.viewsFolder` with the `name` and requires it', () => {
				td.verify(path.join('mock-resolved-path', 'mock-view-name'), {times: 1});
			});

			it('calls the required view function with `props` and an empty state object', () => {
				td.verify(mockView(defaultedProps, {}), {times: 1});
			});

			it('renders the returned DOM as a string', () => {
				td.verify(preactRenderToString.render('mock-view-dom', null, {
					pretty: 'mock-pretty-output'
				}), {times: 1});
			});

			it('returns the rendered view as a string, including a DOCTYPE', () => {
				assert.strictEqual(returnValue, 'mock-doctype\nmock-rendered-view');
			});

			describe('when `props.doctype` is falsy', () => {

				beforeEach(() => {
					td.when(Object.assign({}, defaultProps, userProps)).thenReturn({
						doctype: undefined
					});
					returnValue = fastifyViewFn.call(mockServer, 'mock-view-name', userProps);
				});

				it('returns the rendered view as a string without a DOCTYPE', () => {
					assert.strictEqual(returnValue, 'mock-rendered-view');
				});

			});

			describe('when `name` is not a string', () => {
				let caughtError;

				beforeEach(() => {
					try {
						returnValue = fastifyViewFn.call(mockServer, null, userProps);
					} catch (error) {
						caughtError = error;
					}
				});

				it('throws an error', () => {
					assert.instanceOf(caughtError, TypeError);
					assert.strictEqual(caughtError.message, 'View name must be a string');
				});

			});

			describe('when the view cannot be found', () => {
				let caughtError;

				beforeEach(() => {
					try {
						returnValue = fastifyViewFn.call(mockServer, 'not-a-view', userProps);
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
					td.when(mockView(), {ignoreExtraArgs: true}).thenThrow(viewError);
					try {
						returnValue = fastifyViewFn.call(mockServer, 'mock-view-name', userProps);
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
			td.verify(mockServer.decorateReply('view', td.matchers.isA(Function)), {times: 1});
		});

		describe('reply.view(name, props)', () => {
			let defaultProps;
			let mockReply;
			let replyViewFn;
			let userProps;

			beforeEach(() => {
				replyViewFn = td.explain(mockServer.decorateReply).calls[0].args[1];

				mockServer.view = td.func();
				td.when(mockServer.view(), {ignoreExtraArgs: true}).thenReturn('mock-rendered-view');

				mockReply = {
					type: td.func(),
					send: td.func(),
					props: {
						isMockReplyProps: true
					}
				};

				defaultProps = {
					contentType: 'mock-content-type',
					doctype: 'mock-doctype',
					isMockDefaultProps: true
				};
				userProps = {
					isUserProps: true
				};

				td.when(Object.assign({}, defaultProps, mockReply.props, userProps)).thenReturn({
					contentType: 'mock-content-type',
					isMockReplyProps: true
				});

				replyViewFn.call(mockReply, 'mock-view-name', userProps);
			});

			it('combines the props with the defaults', () => {
				td.verify(Object.assign({}, defaultProps, mockReply.props, userProps), {times: 1});
			});

			it('sets a content type based on the `props.contentType`', () => {
				td.verify(mockReply.type('mock-content-type'), {times: 1});
			});

			it('calls `fastify.view` with the name and defaulted props', () => {
				td.verify(mockServer.view('mock-view-name', {
					contentType: 'mock-content-type',
					isMockReplyProps: true
				}), {times: 1});
			});

			it('sends the rendered view in the response', () => {
				td.verify(mockReply.send('mock-rendered-view'), {times: 1});
			});

			describe('when `props.contentType` is falsy', () => {

				beforeEach(() => {
					mockReply.type = td.func();
					td.when(Object.assign(), {ignoreExtraArgs: true}).thenReturn({
						isMockReplyProps: true
					});
					replyViewFn.call(mockReply, 'mock-view-name', userProps);
				});

				it('does not set a content type', () => {
					td.verify(mockReply.type(), {
						ignoreExtraArgs: true,
						times: 0
					});
				});

			});

		});

		describe('when `options.viewsFolder` is defined but not a string', () => {
			let caughtError;

			beforeEach(done => {
				path.resolve = td.func();

				userOptions.viewsFolder = [];

				try {
					pluginFn(mockServer, userOptions, done);
				} catch (error) {
					caughtError = error;
					done();
				}
			});

			it('does not resolve `options.viewsFolder`', () => {
				td.verify(path.resolve(), {
					ignoreExtraArgs: true,
					times: 0
				});
			});

			it('throws an error', () => {
				assert.instanceOf(caughtError, TypeError);
				assert.strictEqual(caughtError.message, 'Views folder must be a string');
			});

		});

		describe('when `options.viewsFolder` is falsy', () => {

			beforeEach(done => {
				td.replace(process, 'cwd');
				td.when(process.cwd()).thenReturn('mock-cwd');

				userOptions.viewsFolder = null;

				pluginFn(mockServer, userOptions, done);
			});

			it('defaults to the "views" folder in current working directory ', () => {
				td.verify(path.resolve('mock-cwd/views'), {times: 1});
			});

		});

		describe('when `options.prettyOutput` is undefined', () => {

			beforeEach(done => {
				mockServer.decorate = td.func();
				delete userOptions.prettyOutput;
				pluginFn(mockServer, userOptions, done);
			});

			describe('fastify.view(name, props)', () => {
				let fastifyViewFn;

				beforeEach(() => {
					fastifyViewFn = td.explain(mockServer.decorate).calls[0].args[1];
					td.when(mockView(), {ignoreExtraArgs: true}).thenReturn('mock-view-dom');
					td.when(Object.assign(), {ignoreExtraArgs: true}).thenReturn({});
					fastifyViewFn.call(mockServer, 'mock-view-name', {});
				});

				it('renders the returned DOM as a string, with pretty output on', () => {
					td.verify(preactRenderToString.render('mock-view-dom', null, {
						pretty: true
					}), {times: 1});
				});

			});

		});

		describe('when `options` is falsy', () => {
			let caughtError;

			beforeEach(done => {
				try {
					pluginFn(mockServer, null, done);
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
			pluginMetadata = td.explain(plugin).calls[0].args[1];
		});

		it('has a name which matches the module name', () => {
			assert.strictEqual(pluginMetadata.name, require('../../../package.json').name);
		});

		it('has a defined compatible Fastify version', () => {
			assert.strictEqual(pluginMetadata.fastify, '3.x || ~4.0.0-alpha');
		});

	});

	it('exports the created plugin', () => {
		assert.isObject(fastifyHtmPreactViews);
		assert.isTrue(fastifyHtmPreactViews.isMockPlugin);
	});

});

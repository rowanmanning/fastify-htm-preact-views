
# Fastify HTM Preact Views

Render [Preact](https://preactjs.com/) views via [HTM](https://github.com/developit/htm) in [Fastify](https://www.fastify.io/) applications.

This offers a compilation-free views with Preact as a Fastify plugin. See ["alternatives to JSX"](https://preactjs.com/guide/v10/getting-started#alternatives-to-jsx) in the Preact docs to learn more about why you might do this.


## Table of contents

  * [Requirements](#requirements)
  * [Usage](#usage)
  * [Config options](#config-options)
  * [Contributing](#contributing)
  * [License](#license)


## Requirements

This library requires the following to run:

  * [Node.js](https://nodejs.org/) v12+
  * [Fastify](https://www.fastify.io/) v3.x


## Usage

Install with [npm](https://www.npmjs.com/) (you'll also need to install Preact alongside this module):

```sh
npm install preact @rowanmanning/fastify-htm-preact-views
```

Register the plugin before your routes in your Fastify application, using a `require` call:

```js
const fastify = require('fastify')();

fastify.register(require('@rowanmanning/fastify-htm-preact-views'));

fastify.get('/', (request, reply) => {
    reply.view('example', {
        thing: 'World'
    });
});

fastify.listen(8080);
```

In the above example, you'll need to provide a view in `<CWD>/views/example.js`:

```js
module.exports = ({html, thing}) => {
    return html`
        <h1>Hello ${thing}!</h1>
    `;
};
```

In all views, the `html` prop is an [`htm`](https://github.com/developit/htm) tagged template function, pre-bound to Preact.

### App-wide properties

You can specify a default set of global properties as an option when you register the plugin:

```js
fastify.register(require('@rowanmanning/fastify-htm-preact-views'), {
    defaultProps: {
        thing: 'World'
    }
});
```

Now when you render a view, you can override this default property or don't supply props and it will fall back to the default. Using the `example` view defined above:

```js

// Renders "Hello World" because it falls back to the default
fastify.get('/1', (request, reply) => {
    reply.view('example');
});

// Renders "Hello Friend"
fastify.get('/2', (request, reply) => {
    reply.view('example', {
        thing: 'Friend'
    });
});
```

### Reply properties

You can specify additional properties on a reply object, which will be available to later routes:

```js
fastify.addHook('preHandler', (request, reply, done) => {
    reply.props = {
        thing: 'Friend'
    };
    done();
});

// Renders "Hello Friend"
fastify.get('/', (request, reply) => {
    reply.view('example');
});
```

### Layouts and partials

You can wrap views in a layout by defining a Preact component in a new file and requiring it in. Partials can be required in the same way and used like you would any shared component.

In `views/layouts/default.js`, define the layout:

```js
module.exports = ({children, html, title}) => {
    return html`
        <html>
            <head>
                <title>${title}</title>
            </head>
            <body>
                ${children}
            </body>
        </html>
    `;
};
```

In `views/example.js`, load it in and wrap content in it. You'll need to pass props through:

```js
const Layout = require('./layouts/default');

module.exports = props => {
    const {html, thing} = props;
    return html`
        <${Layout} ...${props}>
            <h1>Hello ${thing}!</h1>
        </>
    `;
};
```

## Changing the doctype and content-type

By default, an HTML5 doctype is send with the rendered output, and the `Content-Type` header is set to `text/html`. These are both configurable as props passed into `reply.view`.

```js
fastify.get('/', (request, reply) => {
    reply.view('example', {
        doctype: '<?xml version="1.0" encoding="UTF-8"?>',
        contentType: 'text/xml'
    });
});
```

Both of these properties can be set to a falsy value, which means they will not be sent with the response.


## Config options

This plugin can configured using options passed into the Fastify `register` function:

```js
fastify.register(require('@rowanmanning/fastify-htm-preact-views'), {
    // Options go here
});
```

The available options are:

  - **`defaultProps`:** `Object`. An object containing default application-wide properties.

  - **`viewsFolder`:** `String`. The folder to look for view files in. Defaults to `<CWD>/views`.

  - **`prettyOutput`:** `Boolean`. Whether to output pretty HTML. Defaults to `true`.


## Contributing

[The contributing guide is available here](docs/contributing.md). All contributors must follow [this library's code of conduct](docs/code_of_conduct.md).


## License

Licensed under the [MIT](LICENSE) license.<br/>
Copyright &copy; 2021, Rowan Manning.

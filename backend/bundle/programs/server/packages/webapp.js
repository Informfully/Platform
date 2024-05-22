(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/webapp_server.js                                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!function (module1) {
  let _objectSpread;

  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }

  }, 0);
  module1.export({
    WebApp: () => WebApp,
    WebAppInternals: () => WebAppInternals
  });
  let assert;
  module1.link("assert", {
    default(v) {
      assert = v;
    }

  }, 0);
  let readFileSync;
  module1.link("fs", {
    readFileSync(v) {
      readFileSync = v;
    }

  }, 1);
  let createServer;
  module1.link("http", {
    createServer(v) {
      createServer = v;
    }

  }, 2);
  let pathJoin, pathDirname;
  module1.link("path", {
    join(v) {
      pathJoin = v;
    },

    dirname(v) {
      pathDirname = v;
    }

  }, 3);
  let parseUrl;
  module1.link("url", {
    parse(v) {
      parseUrl = v;
    }

  }, 4);
  let createHash;
  module1.link("crypto", {
    createHash(v) {
      createHash = v;
    }

  }, 5);
  let connect;
  module1.link("./connect.js", {
    connect(v) {
      connect = v;
    }

  }, 6);
  let compress;
  module1.link("compression", {
    default(v) {
      compress = v;
    }

  }, 7);
  let cookieParser;
  module1.link("cookie-parser", {
    default(v) {
      cookieParser = v;
    }

  }, 8);
  let qs;
  module1.link("qs", {
    default(v) {
      qs = v;
    }

  }, 9);
  let parseRequest;
  module1.link("parseurl", {
    default(v) {
      parseRequest = v;
    }

  }, 10);
  let basicAuth;
  module1.link("basic-auth-connect", {
    default(v) {
      basicAuth = v;
    }

  }, 11);
  let lookupUserAgent;
  module1.link("useragent", {
    lookup(v) {
      lookupUserAgent = v;
    }

  }, 12);
  let isModern;
  module1.link("meteor/modern-browsers", {
    isModern(v) {
      isModern = v;
    }

  }, 13);
  let send;
  module1.link("send", {
    default(v) {
      send = v;
    }

  }, 14);
  let removeExistingSocketFile, registerSocketFileCleanup;
  module1.link("./socket_file.js", {
    removeExistingSocketFile(v) {
      removeExistingSocketFile = v;
    },

    registerSocketFileCleanup(v) {
      registerSocketFileCleanup = v;
    }

  }, 15);
  let onMessage;
  module1.link("meteor/inter-process-messaging", {
    onMessage(v) {
      onMessage = v;
    }

  }, 16);
  var SHORT_SOCKET_TIMEOUT = 5 * 1000;
  var LONG_SOCKET_TIMEOUT = 120 * 1000;
  const WebApp = {};
  const WebAppInternals = {};
  const hasOwn = Object.prototype.hasOwnProperty; // backwards compat to 2.0 of connect

  connect.basicAuth = basicAuth;
  WebAppInternals.NpmModules = {
    connect: {
      version: Npm.require('connect/package.json').version,
      module: connect
    }
  }; // Though we might prefer to use web.browser (modern) as the default
  // architecture, safety requires a more compatible defaultArch.

  WebApp.defaultArch = 'web.browser.legacy'; // XXX maps archs to manifests

  WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem

  var archPath = {};

  var bundledJsCssUrlRewriteHook = function (url) {
    var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
    return bundledPrefix + url;
  };

  var sha1 = function (contents) {
    var hash = createHash('sha1');
    hash.update(contents);
    return hash.digest('hex');
  };

  function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
      // don't compress responses with this request header
      return false;
    } // fallback to standard filter function


    return compress.filter(req, res);
  }

  ; // #BrowserIdentification
  //
  // We have multiple places that want to identify the browser: the
  // unsupported browser page, the appcache package, and, eventually
  // delivering browser polyfills only as needed.
  //
  // To avoid detecting the browser in multiple places ad-hoc, we create a
  // Meteor "browser" object. It uses but does not expose the npm
  // useragent module (we could choose a different mechanism to identify
  // the browser in the future if we wanted to).  The browser object
  // contains
  //
  // * `name`: the name of the browser in camel case
  // * `major`, `minor`, `patch`: integers describing the browser version
  //
  // Also here is an early version of a Meteor `request` object, intended
  // to be a high-level description of the request without exposing
  // details of connect's low-level `req`.  Currently it contains:
  //
  // * `browser`: browser identification object described above
  // * `url`: parsed url, including parsed query params
  //
  // As a temporary hack there is a `categorizeRequest` function on WebApp which
  // converts a connect `req` to a Meteor `request`. This can go away once smart
  // packages such as appcache are being passed a `request` object directly when
  // they serve content.
  //
  // This allows `request` to be used uniformly: it is passed to the html
  // attributes hook, and the appcache package can use it when deciding
  // whether to generate a 404 for the manifest.
  //
  // Real routing / server side rendering will probably refactor this
  // heavily.
  // e.g. "Mobile Safari" => "mobileSafari"

  var camelCase = function (name) {
    var parts = name.split(' ');
    parts[0] = parts[0].toLowerCase();

    for (var i = 1; i < parts.length; ++i) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);
    }

    return parts.join('');
  };

  var identifyBrowser = function (userAgentString) {
    var userAgent = lookupUserAgent(userAgentString);
    return {
      name: camelCase(userAgent.family),
      major: +userAgent.major,
      minor: +userAgent.minor,
      patch: +userAgent.patch
    };
  }; // XXX Refactor as part of implementing real routing.


  WebAppInternals.identifyBrowser = identifyBrowser;

  WebApp.categorizeRequest = function (req) {
    if (req.browser && req.arch && typeof req.modern === "boolean") {
      // Already categorized.
      return req;
    }

    const browser = identifyBrowser(req.headers["user-agent"]);
    const modern = isModern(browser);
    const path = typeof req.pathname === "string" ? req.pathname : parseRequest(req).pathname;
    const categorized = {
      browser,
      modern,
      path,
      arch: WebApp.defaultArch,
      url: parseUrl(req.url, true),
      dynamicHead: req.dynamicHead,
      dynamicBody: req.dynamicBody,
      headers: req.headers,
      cookies: req.cookies
    };
    const pathParts = path.split("/");
    const archKey = pathParts[1];

    if (archKey.startsWith("__")) {
      const archCleaned = "web." + archKey.slice(2);

      if (hasOwn.call(WebApp.clientPrograms, archCleaned)) {
        pathParts.splice(1, 1); // Remove the archKey part.

        return Object.assign(categorized, {
          arch: archCleaned,
          path: pathParts.join("/")
        });
      }
    } // TODO Perhaps one day we could infer Cordova clients here, so that we
    // wouldn't have to use prefixed "/__cordova/..." URLs.


    const preferredArchOrder = isModern(browser) ? ["web.browser", "web.browser.legacy"] : ["web.browser.legacy", "web.browser"];

    for (const arch of preferredArchOrder) {
      // If our preferred arch is not available, it's better to use another
      // client arch that is available than to guarantee the site won't work
      // by returning an unknown arch. For example, if web.browser.legacy is
      // excluded using the --exclude-archs command-line option, legacy
      // clients are better off receiving web.browser (which might actually
      // work) than receiving an HTTP 404 response. If none of the archs in
      // preferredArchOrder are defined, only then should we send a 404.
      if (hasOwn.call(WebApp.clientPrograms, arch)) {
        return Object.assign(categorized, {
          arch
        });
      }
    }

    return categorized;
  }; // HTML attribute hooks: functions to be called to determine any attributes to
  // be added to the '<html>' tag. Each function is passed a 'request' object (see
  // #BrowserIdentification) and should return null or object.


  var htmlAttributeHooks = [];

  var getHtmlAttributes = function (request) {
    var combinedAttributes = {};

    _.each(htmlAttributeHooks || [], function (hook) {
      var attributes = hook(request);
      if (attributes === null) return;
      if (typeof attributes !== 'object') throw Error("HTML attribute hook must return null or object");

      _.extend(combinedAttributes, attributes);
    });

    return combinedAttributes;
  };

  WebApp.addHtmlAttributeHook = function (hook) {
    htmlAttributeHooks.push(hook);
  }; // Serve app HTML for this URL?


  var appUrl = function (url) {
    if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
    // robots.txt. It is a file name we have chosen to use for HTML5
    // appcache URLs. It is included here to prevent using an appcache
    // then removing it from poisoning an app permanently. Eventually,
    // once we have server side routing, this won't be needed as
    // unknown URLs with return a 404 automatically.

    if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.

    if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default

    return true;
  }; // We need to calculate the client hash after all packages have loaded
  // to give them a chance to populate __meteor_runtime_config__.
  //
  // Calculating the hash during startup means that packages can only
  // populate __meteor_runtime_config__ during load, not during startup.
  //
  // Calculating instead it at the beginning of main after all startup
  // hooks had run would allow packages to also populate
  // __meteor_runtime_config__ during startup, but that's too late for
  // autoupdate because it needs to have the client hash at startup to
  // insert the auto update version itself into
  // __meteor_runtime_config__ to get it to the client.
  //
  // An alternative would be to give autoupdate a "post-start,
  // pre-listen" hook to allow it to insert the auto update version at
  // the right moment.


  Meteor.startup(function () {
    function getter(key) {
      return function (arch) {
        arch = arch || WebApp.defaultArch;
        const program = WebApp.clientPrograms[arch];
        const value = program && program[key]; // If this is the first time we have calculated this hash,
        // program[key] will be a thunk (lazy function with no parameters)
        // that we should call to do the actual computation.

        return typeof value === "function" ? program[key] = value() : value;
      };
    }

    WebApp.calculateClientHash = WebApp.clientHash = getter("version");
    WebApp.calculateClientHashRefreshable = getter("versionRefreshable");
    WebApp.calculateClientHashNonRefreshable = getter("versionNonRefreshable");
    WebApp.calculateClientHashReplaceable = getter("versionReplaceable");
    WebApp.getRefreshableAssets = getter("refreshableAssets");
  }); // When we have a request pending, we want the socket timeout to be long, to
  // give ourselves a while to serve it, and to allow sockjs long polls to
  // complete.  On the other hand, we want to close idle sockets relatively
  // quickly, so that we can shut down relatively promptly but cleanly, without
  // cutting off anyone's response.

  WebApp._timeoutAdjustmentRequestCallback = function (req, res) {
    // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
    req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
    // the response from the socket.

    var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.
    // https://github.com/joyent/node/commit/7c9b6070
    // But it has switched back to 'finish' in Node v4:
    // https://github.com/nodejs/node/pull/1411

    res.removeAllListeners('finish');
    res.on('finish', function () {
      res.setTimeout(SHORT_SOCKET_TIMEOUT);
    });

    _.each(finishListeners, function (l) {
      res.on('finish', l);
    });
  }; // Will be updated by main before we listen.
  // Map from client arch to boilerplate object.
  // Boilerplate object has:
  //   - func: XXX
  //   - baseData: XXX


  var boilerplateByArch = {}; // Register a callback function that can selectively modify boilerplate
  // data given arguments (request, data, arch). The key should be a unique
  // identifier, to prevent accumulating duplicate callbacks from the same
  // call site over time. Callbacks will be called in the order they were
  // registered. A callback should return false if it did not make any
  // changes affecting the boilerplate. Passing null deletes the callback.
  // Any previous callback registered for this key will be returned.

  const boilerplateDataCallbacks = Object.create(null);

  WebAppInternals.registerBoilerplateDataCallback = function (key, callback) {
    const previousCallback = boilerplateDataCallbacks[key];

    if (typeof callback === "function") {
      boilerplateDataCallbacks[key] = callback;
    } else {
      assert.strictEqual(callback, null);
      delete boilerplateDataCallbacks[key];
    } // Return the previous callback in case the new callback needs to call
    // it; for example, when the new callback is a wrapper for the old.


    return previousCallback || null;
  }; // Given a request (as returned from `categorizeRequest`), return the
  // boilerplate HTML to serve for that request.
  //
  // If a previous connect middleware has rendered content for the head or body,
  // returns the boilerplate with that content patched in otherwise
  // memoizes on HTML attributes (used by, eg, appcache) and whether inline
  // scripts are currently allowed.
  // XXX so far this function is always called with arch === 'web.browser'


  function getBoilerplate(request, arch) {
    return getBoilerplateAsync(request, arch).await();
  }

  function getBoilerplateAsync(request, arch) {
    const boilerplate = boilerplateByArch[arch];
    const data = Object.assign({}, boilerplate.baseData, {
      htmlAttributes: getHtmlAttributes(request)
    }, _.pick(request, "dynamicHead", "dynamicBody"));
    let madeChanges = false;
    let promise = Promise.resolve();
    Object.keys(boilerplateDataCallbacks).forEach(key => {
      promise = promise.then(() => {
        const callback = boilerplateDataCallbacks[key];
        return callback(request, data, arch);
      }).then(result => {
        // Callbacks should return false if they did not make any changes.
        if (result !== false) {
          madeChanges = true;
        }
      });
    });
    return promise.then(() => ({
      stream: boilerplate.toHTMLStream(data),
      statusCode: data.statusCode,
      headers: data.headers
    }));
  }

  WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {
    additionalOptions = additionalOptions || {};
    const meteorRuntimeConfig = JSON.stringify(encodeURIComponent(JSON.stringify(_objectSpread(_objectSpread({}, __meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {}))));
    return new Boilerplate(arch, manifest, _.extend({
      pathMapper(itemPath) {
        return pathJoin(archPath[arch], itemPath);
      },

      baseDataExtension: {
        additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {
          return {
            pathname: pathname,
            contents: contents
          };
        }),
        // Convert to a JSON string, then get rid of most weird characters, then
        // wrap in double quotes. (The outermost JSON.stringify really ought to
        // just be "wrap in double quotes" but we use it to be safe.) This might
        // end up inside a <script> tag so we need to be careful to not include
        // "</script>", but normal {{spacebars}} escaping escapes too much! See
        // https://github.com/meteor/meteor/issues/3730
        meteorRuntimeConfig,
        meteorRuntimeHash: sha1(meteorRuntimeConfig),
        rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
        bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
        sriMode: sriMode,
        inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
        inline: additionalOptions.inline
      }
    }, additionalOptions));
  }; // A mapping from url path to architecture (e.g. "web.browser") to static
  // file information with the following fields:
  // - type: the type of file to be served
  // - cacheable: optionally, whether the file should be cached or not
  // - sourceMapUrl: optionally, the url of the source map
  //
  // Info also contains one of the following:
  // - content: the stringified content that should be served at this path
  // - absolutePath: the absolute path on disk to the file
  // Serve static files from the manifest or added with
  // `addStaticJs`. Exported for tests.


  WebAppInternals.staticFilesMiddleware = function (staticFilesByArch, req, res, next) {
    return Promise.asyncApply(() => {
      if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {
        next();
        return;
      }

      var pathname = parseRequest(req).pathname;

      try {
        pathname = decodeURIComponent(pathname);
      } catch (e) {
        next();
        return;
      }

      var serveStaticJs = function (s) {
        res.writeHead(200, {
          'Content-type': 'application/javascript; charset=UTF-8'
        });
        res.write(s);
        res.end();
      };

      if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
        serveStaticJs(additionalStaticJs[pathname]);
        return;
      }

      const {
        arch,
        path
      } = WebApp.categorizeRequest(req);

      if (!hasOwn.call(WebApp.clientPrograms, arch)) {
        // We could come here in case we run with some architectures excluded
        next();
        return;
      } // If pauseClient(arch) has been called, program.paused will be a
      // Promise that will be resolved when the program is unpaused.


      const program = WebApp.clientPrograms[arch];
      Promise.await(program.paused);

      if (path === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
        serveStaticJs("__meteor_runtime_config__ = ".concat(program.meteorRuntimeConfig, ";"));
        return;
      }

      const info = getStaticFileInfo(staticFilesByArch, pathname, path, arch);

      if (!info) {
        next();
        return;
      } // We don't need to call pause because, unlike 'static', once we call into
      // 'send' and yield to the event loop, we never call another handler with
      // 'next'.
      // Cacheable files are files that should never change. Typically
      // named by their hash (eg meteor bundled js and css files).
      // We cache them ~forever (1yr).


      const maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;

      if (info.cacheable) {
        // Since we use req.headers["user-agent"] to determine whether the
        // client should receive modern or legacy resources, tell the client
        // to invalidate cached resources when/if its user agent string
        // changes in the future.
        res.setHeader("Vary", "User-Agent");
      } // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
      // understand.  (The SourceMap header is slightly more spec-correct but FF
      // doesn't understand it.)
      //
      // You may also need to enable source maps in Chrome: open dev tools, click
      // the gear in the bottom right corner, and select "enable source maps".


      if (info.sourceMapUrl) {
        res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
      }

      if (info.type === "js" || info.type === "dynamic js") {
        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
      } else if (info.type === "css") {
        res.setHeader("Content-Type", "text/css; charset=UTF-8");
      } else if (info.type === "json") {
        res.setHeader("Content-Type", "application/json; charset=UTF-8");
      }

      if (info.hash) {
        res.setHeader('ETag', '"' + info.hash + '"');
      }

      if (info.content) {
        res.write(info.content);
        res.end();
      } else {
        send(req, info.absolutePath, {
          maxage: maxAge,
          dotfiles: 'allow',
          // if we specified a dotfile in the manifest, serve it
          lastModified: false // don't set last-modified based on the file date

        }).on('error', function (err) {
          Log.error("Error serving static file " + err);
          res.writeHead(500);
          res.end();
        }).on('directory', function () {
          Log.error("Unexpected directory " + info.absolutePath);
          res.writeHead(500);
          res.end();
        }).pipe(res);
      }
    });
  };

  function getStaticFileInfo(staticFilesByArch, originalPath, path, arch) {
    if (!hasOwn.call(WebApp.clientPrograms, arch)) {
      return null;
    } // Get a list of all available static file architectures, with arch
    // first in the list if it exists.


    const staticArchList = Object.keys(staticFilesByArch);
    const archIndex = staticArchList.indexOf(arch);

    if (archIndex > 0) {
      staticArchList.unshift(staticArchList.splice(archIndex, 1)[0]);
    }

    let info = null;
    staticArchList.some(arch => {
      const staticFiles = staticFilesByArch[arch];

      function finalize(path) {
        info = staticFiles[path]; // Sometimes we register a lazy function instead of actual data in
        // the staticFiles manifest.

        if (typeof info === "function") {
          info = staticFiles[path] = info();
        }

        return info;
      } // If staticFiles contains originalPath with the arch inferred above,
      // use that information.


      if (hasOwn.call(staticFiles, originalPath)) {
        return finalize(originalPath);
      } // If categorizeRequest returned an alternate path, try that instead.


      if (path !== originalPath && hasOwn.call(staticFiles, path)) {
        return finalize(path);
      }
    });
    return info;
  } // Parse the passed in port value. Return the port as-is if it's a String
  // (e.g. a Windows Server style named pipe), otherwise return the port as an
  // integer.
  //
  // DEPRECATED: Direct use of this function is not recommended; it is no
  // longer used internally, and will be removed in a future release.


  WebAppInternals.parsePort = port => {
    let parsedPort = parseInt(port);

    if (Number.isNaN(parsedPort)) {
      parsedPort = port;
    }

    return parsedPort;
  };

  onMessage("webapp-pause-client", (_ref) => Promise.asyncApply(() => {
    let {
      arch
    } = _ref;
    WebAppInternals.pauseClient(arch);
  }));
  onMessage("webapp-reload-client", (_ref2) => Promise.asyncApply(() => {
    let {
      arch
    } = _ref2;
    WebAppInternals.generateClientProgram(arch);
  }));

  function runWebAppServer() {
    var shuttingDown = false;
    var syncQueue = new Meteor._SynchronousQueue();

    var getItemPathname = function (itemUrl) {
      return decodeURIComponent(parseUrl(itemUrl).pathname);
    };

    WebAppInternals.reloadClientPrograms = function () {
      syncQueue.runTask(function () {
        const staticFilesByArch = Object.create(null);
        const {
          configJson
        } = __meteor_bootstrap__;
        const clientArchs = configJson.clientArchs || Object.keys(configJson.clientPaths);

        try {
          clientArchs.forEach(arch => {
            generateClientProgram(arch, staticFilesByArch);
          });
          WebAppInternals.staticFilesByArch = staticFilesByArch;
        } catch (e) {
          Log.error("Error reloading the client program: " + e.stack);
          process.exit(1);
        }
      });
    }; // Pause any incoming requests and make them wait for the program to be
    // unpaused the next time generateClientProgram(arch) is called.


    WebAppInternals.pauseClient = function (arch) {
      syncQueue.runTask(() => {
        const program = WebApp.clientPrograms[arch];
        const {
          unpause
        } = program;
        program.paused = new Promise(resolve => {
          if (typeof unpause === "function") {
            // If there happens to be an existing program.unpause function,
            // compose it with the resolve function.
            program.unpause = function () {
              unpause();
              resolve();
            };
          } else {
            program.unpause = resolve;
          }
        });
      });
    };

    WebAppInternals.generateClientProgram = function (arch) {
      syncQueue.runTask(() => generateClientProgram(arch));
    };

    function generateClientProgram(arch) {
      let staticFilesByArch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : WebAppInternals.staticFilesByArch;
      const clientDir = pathJoin(pathDirname(__meteor_bootstrap__.serverDir), arch); // read the control for the client we'll be serving up

      const programJsonPath = pathJoin(clientDir, "program.json");
      let programJson;

      try {
        programJson = JSON.parse(readFileSync(programJsonPath));
      } catch (e) {
        if (e.code === "ENOENT") return;
        throw e;
      }

      if (programJson.format !== "web-program-pre1") {
        throw new Error("Unsupported format for client assets: " + JSON.stringify(programJson.format));
      }

      if (!programJsonPath || !clientDir || !programJson) {
        throw new Error("Client config file not parsed.");
      }

      archPath[arch] = clientDir;
      const staticFiles = staticFilesByArch[arch] = Object.create(null);
      const {
        manifest
      } = programJson;
      manifest.forEach(item => {
        if (item.url && item.where === "client") {
          staticFiles[getItemPathname(item.url)] = {
            absolutePath: pathJoin(clientDir, item.path),
            cacheable: item.cacheable,
            hash: item.hash,
            // Link from source to its map
            sourceMapUrl: item.sourceMapUrl,
            type: item.type
          };

          if (item.sourceMap) {
            // Serve the source map too, under the specified URL. We assume
            // all source maps are cacheable.
            staticFiles[getItemPathname(item.sourceMapUrl)] = {
              absolutePath: pathJoin(clientDir, item.sourceMap),
              cacheable: true
            };
          }
        }
      });
      const {
        PUBLIC_SETTINGS
      } = __meteor_runtime_config__;
      const configOverrides = {
        PUBLIC_SETTINGS
      };
      const oldProgram = WebApp.clientPrograms[arch];
      const newProgram = WebApp.clientPrograms[arch] = {
        format: "web-program-pre1",
        manifest: manifest,
        // Use arrow functions so that these versions can be lazily
        // calculated later, and so that they will not be included in the
        // staticFiles[manifestUrl].content string below.
        //
        // Note: these version calculations must be kept in agreement with
        // CordovaBuilder#appendVersion in tools/cordova/builder.js, or hot
        // code push will reload Cordova apps unnecessarily.
        version: () => WebAppHashing.calculateClientHash(manifest, null, configOverrides),
        versionRefreshable: () => WebAppHashing.calculateClientHash(manifest, type => type === "css", configOverrides),
        versionNonRefreshable: () => WebAppHashing.calculateClientHash(manifest, (type, replaceable) => type !== "css" && !replaceable, configOverrides),
        versionReplaceable: () => WebAppHashing.calculateClientHash(manifest, (_type, replaceable) => {
          if (Meteor.isProduction && replaceable) {
            throw new Error('Unexpected replaceable file in production');
          }

          return replaceable;
        }, configOverrides),
        cordovaCompatibilityVersions: programJson.cordovaCompatibilityVersions,
        PUBLIC_SETTINGS
      }; // Expose program details as a string reachable via the following URL.

      const manifestUrlPrefix = "/__" + arch.replace(/^web\./, "");
      const manifestUrl = manifestUrlPrefix + getItemPathname("/manifest.json");

      staticFiles[manifestUrl] = () => {
        if (Package.autoupdate) {
          const {
            AUTOUPDATE_VERSION = Package.autoupdate.Autoupdate.autoupdateVersion
          } = process.env;

          if (AUTOUPDATE_VERSION) {
            newProgram.version = AUTOUPDATE_VERSION;
          }
        }

        if (typeof newProgram.version === "function") {
          newProgram.version = newProgram.version();
        }

        return {
          content: JSON.stringify(newProgram),
          cacheable: false,
          hash: newProgram.version,
          type: "json"
        };
      };

      generateBoilerplateForArch(arch); // If there are any requests waiting on oldProgram.paused, let them
      // continue now (using the new program).

      if (oldProgram && oldProgram.paused) {
        oldProgram.unpause();
      }
    }

    ;
    const defaultOptionsForArch = {
      'web.cordova': {
        runtimeConfigOverrides: {
          // XXX We use absoluteUrl() here so that we serve https://
          // URLs to cordova clients if force-ssl is in use. If we were
          // to use __meteor_runtime_config__.ROOT_URL instead of
          // absoluteUrl(), then Cordova clients would immediately get a
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to
          // http://example.meteor.com. This breaks the app, because
          // force-ssl doesn't serve CORS headers on 302
          // redirects. (Plus it's undesirable to have clients
          // connecting to http://example.meteor.com when force-ssl is
          // in use.)
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
        }
      },
      "web.browser": {
        runtimeConfigOverrides: {
          isModern: true
        }
      },
      "web.browser.legacy": {
        runtimeConfigOverrides: {
          isModern: false
        }
      }
    };

    WebAppInternals.generateBoilerplate = function () {
      // This boilerplate will be served to the mobile devices when used with
      // Meteor/Cordova for the Hot-Code Push and since the file will be served by
      // the device's server, it is important to set the DDP url to the actual
      // Meteor server accepting DDP connections and not the device's file server.
      syncQueue.runTask(function () {
        Object.keys(WebApp.clientPrograms).forEach(generateBoilerplateForArch);
      });
    };

    function generateBoilerplateForArch(arch) {
      const program = WebApp.clientPrograms[arch];
      const additionalOptions = defaultOptionsForArch[arch] || {};
      const {
        baseData
      } = boilerplateByArch[arch] = WebAppInternals.generateBoilerplateInstance(arch, program.manifest, additionalOptions); // We need the runtime config with overrides for meteor_runtime_config.js:

      program.meteorRuntimeConfig = JSON.stringify(_objectSpread(_objectSpread({}, __meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || null));
      program.refreshableAssets = baseData.css.map(file => ({
        url: bundledJsCssUrlRewriteHook(file.url)
      }));
    }

    WebAppInternals.reloadClientPrograms(); // webserver

    var app = connect(); // Packages and apps can add handlers that run before any other Meteor
    // handlers via WebApp.rawConnectHandlers.

    var rawConnectHandlers = connect();
    app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

    app.use(compress({
      filter: shouldCompress
    })); // parse cookies into an object

    app.use(cookieParser()); // We're not a proxy; reject (without crashing) attempts to treat us like
    // one. (See #1212.)

    app.use(function (req, res, next) {
      if (RoutePolicy.isValidUrl(req.url)) {
        next();
        return;
      }

      res.writeHead(400);
      res.write("Not a proxy");
      res.end();
    }); // Parse the query string into res.query. Used by oauth_server, but it's
    // generally pretty handy..
    //
    // Do this before the next middleware destroys req.url if a path prefix
    // is set to close #10111.

    app.use(function (request, response, next) {
      request.query = qs.parse(parseUrl(request.url).query);
      next();
    });

    function getPathParts(path) {
      const parts = path.split("/");

      while (parts[0] === "") parts.shift();

      return parts;
    }

    function isPrefixOf(prefix, array) {
      return prefix.length <= array.length && prefix.every((part, i) => part === array[i]);
    } // Strip off the path prefix, if it exists.


    app.use(function (request, response, next) {
      const pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
      const {
        pathname,
        search
      } = parseUrl(request.url); // check if the path in the url starts with the path prefix

      if (pathPrefix) {
        const prefixParts = getPathParts(pathPrefix);
        const pathParts = getPathParts(pathname);

        if (isPrefixOf(prefixParts, pathParts)) {
          request.url = "/" + pathParts.slice(prefixParts.length).join("/");

          if (search) {
            request.url += search;
          }

          return next();
        }
      }

      if (pathname === "/favicon.ico" || pathname === "/robots.txt") {
        return next();
      }

      if (pathPrefix) {
        response.writeHead(404);
        response.write("Unknown path");
        response.end();
        return;
      }

      next();
    }); // Serve static files from the manifest.
    // This is inspired by the 'static' middleware.

    app.use(function (req, res, next) {
      WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFilesByArch, req, res, next);
    }); // Core Meteor packages like dynamic-import can add handlers before
    // other handlers added by package and application code.

    app.use(WebAppInternals.meteorInternalHandlers = connect()); // Packages and apps can add handlers to this via WebApp.connectHandlers.
    // They are inserted before our default handler.

    var packageAndAppHandlers = connect();
    app.use(packageAndAppHandlers);
    var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of
    // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
    // inside packageAndAppHandlers.)

    app.use(function (err, req, res, next) {
      if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {
        next(err);
        return;
      }

      res.writeHead(err.status, {
        'Content-Type': 'text/plain'
      });
      res.end("An error message");
    });
    app.use(function (req, res, next) {
      return Promise.asyncApply(() => {
        if (!appUrl(req.url)) {
          return next();
        } else {
          var headers = {
            'Content-Type': 'text/html; charset=utf-8'
          };

          if (shuttingDown) {
            headers['Connection'] = 'Close';
          }

          var request = WebApp.categorizeRequest(req);

          if (request.url.query && request.url.query['meteor_css_resource']) {
            // In this case, we're requesting a CSS resource in the meteor-specific
            // way, but we don't have it.  Serve a static css file that indicates that
            // we didn't have it, so we can detect that and refresh.  Make sure
            // that any proxies or CDNs don't cache this error!  (Normally proxies
            // or CDNs are smart enough not to cache error pages, but in order to
            // make this hack work, we need to return the CSS file as a 200, which
            // would otherwise be cached.)
            headers['Content-Type'] = 'text/css; charset=utf-8';
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(200, headers);
            res.write(".meteor-css-not-found-error { width: 0px;}");
            res.end();
            return;
          }

          if (request.url.query && request.url.query['meteor_js_resource']) {
            // Similarly, we're requesting a JS resource that we don't have.
            // Serve an uncached 404. (We can't use the same hack we use for CSS,
            // because actually acting on that hack requires us to have the JS
            // already!)
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);
            res.end("404 Not Found");
            return;
          }

          if (request.url.query && request.url.query['meteor_dont_serve_index']) {
            // When downloading files during a Cordova hot code push, we need
            // to detect if a file is not available instead of inadvertently
            // downloading the default index page.
            // So similar to the situation above, we serve an uncached 404.
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);
            res.end("404 Not Found");
            return;
          }

          const {
            arch
          } = request;
          assert.strictEqual(typeof arch, "string", {
            arch
          });

          if (!hasOwn.call(WebApp.clientPrograms, arch)) {
            // We could come here in case we run with some architectures excluded
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);

            if (Meteor.isDevelopment) {
              res.end("No client program found for the ".concat(arch, " architecture."));
            } else {
              // Safety net, but this branch should not be possible.
              res.end("404 Not Found");
            }

            return;
          } // If pauseClient(arch) has been called, program.paused will be a
          // Promise that will be resolved when the program is unpaused.


          Promise.await(WebApp.clientPrograms[arch].paused);
          return getBoilerplateAsync(request, arch).then((_ref3) => {
            let {
              stream,
              statusCode,
              headers: newHeaders
            } = _ref3;

            if (!statusCode) {
              statusCode = res.statusCode ? res.statusCode : 200;
            }

            if (newHeaders) {
              Object.assign(headers, newHeaders);
            }

            res.writeHead(statusCode, headers);
            stream.pipe(res, {
              // End the response when the stream ends.
              end: true
            });
          }).catch(error => {
            Log.error("Error running template: " + error.stack);
            res.writeHead(500, headers);
            res.end();
          });
        }
      });
    }); // Return 404 by default, if no other handlers serve this URL.

    app.use(function (req, res) {
      res.writeHead(404);
      res.end();
    });
    var httpServer = createServer(app);
    var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
    // there's an outstanding request, give it a higher timeout instead (to avoid
    // killing long-polling requests)

    httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because
    // stream_server.js kills all the current request handlers when installing its
    // own.

    httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
    // socket. This lets load balancers in front of us differentiate between "a
    // server is randomly closing sockets for no reason" and "client sent a bad
    // request".
    //
    // This will only work on Node 6; Node 4 destroys the socket before calling
    // this event. See https://github.com/nodejs/node/pull/4557/ for details.

    httpServer.on('clientError', (err, socket) => {
      // Pre-Node-6, do nothing.
      if (socket.destroyed) {
        return;
      }

      if (err.message === 'Parse Error') {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      } else {
        // For other errors, use the default behavior as if we had no clientError
        // handler.
        socket.destroy(err);
      }
    }); // start up app

    _.extend(WebApp, {
      connectHandlers: packageAndAppHandlers,
      rawConnectHandlers: rawConnectHandlers,
      httpServer: httpServer,
      connectApp: app,
      // For testing.
      suppressConnectErrors: function () {
        suppressConnectErrors = true;
      },
      onListening: function (f) {
        if (onListeningCallbacks) onListeningCallbacks.push(f);else f();
      },
      // This can be overridden by users who want to modify how listening works
      // (eg, to run a proxy like Apollo Engine Proxy in front of the server).
      startListening: function (httpServer, listenOptions, cb) {
        httpServer.listen(listenOptions, cb);
      }
    }); // Let the rest of the packages (and Meteor.startup hooks) insert connect
    // middlewares and update __meteor_runtime_config__, then keep going to set up
    // actually serving HTML.


    exports.main = argv => {
      WebAppInternals.generateBoilerplate();

      const startHttpServer = listenOptions => {
        WebApp.startListening(httpServer, listenOptions, Meteor.bindEnvironment(() => {
          if (process.env.METEOR_PRINT_ON_LISTEN) {
            console.log("LISTENING");
          }

          const callbacks = onListeningCallbacks;
          onListeningCallbacks = null;
          callbacks.forEach(callback => {
            callback();
          });
        }, e => {
          console.error("Error listening:", e);
          console.error(e && e.stack);
        }));
      };

      let localPort = process.env.PORT || 0;
      const unixSocketPath = process.env.UNIX_SOCKET_PATH;

      if (unixSocketPath) {
        // Start the HTTP server using a socket file.
        removeExistingSocketFile(unixSocketPath);
        startHttpServer({
          path: unixSocketPath
        });
        registerSocketFileCleanup(unixSocketPath);
      } else {
        localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);

        if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
          // Start the HTTP server using Windows Server style named pipe.
          startHttpServer({
            path: localPort
          });
        } else if (typeof localPort === "number") {
          // Start the HTTP server using TCP.
          startHttpServer({
            port: localPort,
            host: process.env.BIND_IP || "0.0.0.0"
          });
        } else {
          throw new Error("Invalid PORT specified");
        }
      }

      return "DAEMON";
    };
  }

  var inlineScriptsAllowed = true;

  WebAppInternals.inlineScriptsAllowed = function () {
    return inlineScriptsAllowed;
  };

  WebAppInternals.setInlineScriptsAllowed = function (value) {
    inlineScriptsAllowed = value;
    WebAppInternals.generateBoilerplate();
  };

  var sriMode;

  WebAppInternals.enableSubresourceIntegrity = function () {
    let use_credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    sriMode = use_credentials ? 'use-credentials' : 'anonymous';
    WebAppInternals.generateBoilerplate();
  };

  WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {
    bundledJsCssUrlRewriteHook = hookFn;
    WebAppInternals.generateBoilerplate();
  };

  WebAppInternals.setBundledJsCssPrefix = function (prefix) {
    var self = this;
    self.setBundledJsCssUrlRewriteHook(function (url) {
      return prefix + url;
    });
  }; // Packages can call `WebAppInternals.addStaticJs` to specify static
  // JavaScript to be included in the app. This static JS will be inlined,
  // unless inline scripts have been disabled, in which case it will be
  // served under `/<sha1 of contents>`.


  var additionalStaticJs = {};

  WebAppInternals.addStaticJs = function (contents) {
    additionalStaticJs["/" + sha1(contents) + ".js"] = contents;
  }; // Exported for tests


  WebAppInternals.getBoilerplate = getBoilerplate;
  WebAppInternals.additionalStaticJs = additionalStaticJs; // Start the server!

  runWebAppServer();
}.call(this, module);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connect.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/connect.js                                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  connect: () => connect
});
let npmConnect;
module.link("connect", {
  default(v) {
    npmConnect = v;
  }

}, 0);

function connect() {
  for (var _len = arguments.length, connectArgs = new Array(_len), _key = 0; _key < _len; _key++) {
    connectArgs[_key] = arguments[_key];
  }

  const handlers = npmConnect.apply(this, connectArgs);
  const originalUse = handlers.use; // Wrap the handlers.use method so that any provided handler functions
  // alway run in a Fiber.

  handlers.use = function use() {
    for (var _len2 = arguments.length, useArgs = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      useArgs[_key2] = arguments[_key2];
    }

    const {
      stack
    } = this;
    const originalLength = stack.length;
    const result = originalUse.apply(this, useArgs); // If we just added anything to the stack, wrap each new entry.handle
    // with a function that calls Promise.asyncApply to ensure the
    // original handler runs in a Fiber.

    for (let i = originalLength; i < stack.length; ++i) {
      const entry = stack[i];
      const originalHandle = entry.handle;

      if (originalHandle.length >= 4) {
        // If the original handle had four (or more) parameters, the
        // wrapper must also have four parameters, since connect uses
        // handle.length to dermine whether to pass the error as the first
        // argument to the handle function.
        entry.handle = function handle(err, req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      } else {
        entry.handle = function handle(req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      }
    }

    return result;
  };

  return handlers;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/socket_file.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.link("fs", {
  statSync(v) {
    statSync = v;
  },

  unlinkSync(v) {
    unlinkSync = v;
  },

  existsSync(v) {
    existsSync = v;
  }

}, 0);

const removeExistingSocketFile = socketPath => {
  try {
    if (statSync(socketPath).isSocket()) {
      // Since a new socket file will be created, remove the existing
      // file.
      unlinkSync(socketPath);
    } else {
      throw new Error("An existing file was found at \"".concat(socketPath, "\" and it is not ") + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
    }
  } catch (error) {
    // If there is no existing socket file to cleanup, great, we'll
    // continue normally. If the caught exception represents any other
    // issue, re-throw.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const registerSocketFileCleanup = function (socketPath) {
  let eventEmitter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process;
  ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => {
    eventEmitter.on(signal, Meteor.bindEnvironment(() => {
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    }));
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/package.json                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "connect",
  "version": "3.6.5"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "compression",
  "version": "1.7.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "cookie-parser",
  "version": "1.4.3"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs/package.json                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "qs",
  "version": "6.4.0",
  "main": "lib/index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs/lib/index.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "parseurl",
  "version": "1.3.2"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"basic-auth-connect":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/package.json                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "basic-auth-connect",
  "version": "1.0.0"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/index.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/package.json                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "useragent",
  "version": "2.3.0",
  "main": "./index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/package.json                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "send",
  "version": "0.16.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/index.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/webapp/webapp_server.js");

/* Exports */
Package._define("webapp", exports, {
  WebApp: WebApp,
  WebAppInternals: WebAppInternals,
  main: main
});

})();

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9jb25uZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy93ZWJhcHAvc29ja2V0X2ZpbGUuanMiXSwibmFtZXMiOlsiX29iamVjdFNwcmVhZCIsIm1vZHVsZTEiLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJleHBvcnQiLCJXZWJBcHAiLCJXZWJBcHBJbnRlcm5hbHMiLCJhc3NlcnQiLCJyZWFkRmlsZVN5bmMiLCJjcmVhdGVTZXJ2ZXIiLCJwYXRoSm9pbiIsInBhdGhEaXJuYW1lIiwiam9pbiIsImRpcm5hbWUiLCJwYXJzZVVybCIsInBhcnNlIiwiY3JlYXRlSGFzaCIsImNvbm5lY3QiLCJjb21wcmVzcyIsImNvb2tpZVBhcnNlciIsInFzIiwicGFyc2VSZXF1ZXN0IiwiYmFzaWNBdXRoIiwibG9va3VwVXNlckFnZW50IiwibG9va3VwIiwiaXNNb2Rlcm4iLCJzZW5kIiwicmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlIiwicmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCIsIm9uTWVzc2FnZSIsIlNIT1JUX1NPQ0tFVF9USU1FT1VUIiwiTE9OR19TT0NLRVRfVElNRU9VVCIsImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiTnBtTW9kdWxlcyIsInZlcnNpb24iLCJOcG0iLCJyZXF1aXJlIiwibW9kdWxlIiwiZGVmYXVsdEFyY2giLCJjbGllbnRQcm9ncmFtcyIsImFyY2hQYXRoIiwiYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2siLCJ1cmwiLCJidW5kbGVkUHJlZml4IiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMX1BBVEhfUFJFRklYIiwic2hhMSIsImNvbnRlbnRzIiwiaGFzaCIsInVwZGF0ZSIsImRpZ2VzdCIsInNob3VsZENvbXByZXNzIiwicmVxIiwicmVzIiwiaGVhZGVycyIsImZpbHRlciIsImNhbWVsQ2FzZSIsIm5hbWUiLCJwYXJ0cyIsInNwbGl0IiwidG9Mb3dlckNhc2UiLCJpIiwibGVuZ3RoIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzdWJzdHIiLCJpZGVudGlmeUJyb3dzZXIiLCJ1c2VyQWdlbnRTdHJpbmciLCJ1c2VyQWdlbnQiLCJmYW1pbHkiLCJtYWpvciIsIm1pbm9yIiwicGF0Y2giLCJjYXRlZ29yaXplUmVxdWVzdCIsImJyb3dzZXIiLCJhcmNoIiwibW9kZXJuIiwicGF0aCIsInBhdGhuYW1lIiwiY2F0ZWdvcml6ZWQiLCJkeW5hbWljSGVhZCIsImR5bmFtaWNCb2R5IiwiY29va2llcyIsInBhdGhQYXJ0cyIsImFyY2hLZXkiLCJzdGFydHNXaXRoIiwiYXJjaENsZWFuZWQiLCJzbGljZSIsImNhbGwiLCJzcGxpY2UiLCJhc3NpZ24iLCJwcmVmZXJyZWRBcmNoT3JkZXIiLCJodG1sQXR0cmlidXRlSG9va3MiLCJnZXRIdG1sQXR0cmlidXRlcyIsInJlcXVlc3QiLCJjb21iaW5lZEF0dHJpYnV0ZXMiLCJfIiwiZWFjaCIsImhvb2siLCJhdHRyaWJ1dGVzIiwiRXJyb3IiLCJleHRlbmQiLCJhZGRIdG1sQXR0cmlidXRlSG9vayIsInB1c2giLCJhcHBVcmwiLCJSb3V0ZVBvbGljeSIsImNsYXNzaWZ5IiwiTWV0ZW9yIiwic3RhcnR1cCIsImdldHRlciIsImtleSIsInByb2dyYW0iLCJ2YWx1ZSIsImNhbGN1bGF0ZUNsaWVudEhhc2giLCJjbGllbnRIYXNoIiwiY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaFJlcGxhY2VhYmxlIiwiZ2V0UmVmcmVzaGFibGVBc3NldHMiLCJfdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2siLCJzZXRUaW1lb3V0IiwiZmluaXNoTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwib24iLCJsIiwiYm9pbGVycGxhdGVCeUFyY2giLCJib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MiLCJjcmVhdGUiLCJyZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrIiwiY2FsbGJhY2siLCJwcmV2aW91c0NhbGxiYWNrIiwic3RyaWN0RXF1YWwiLCJnZXRCb2lsZXJwbGF0ZSIsImdldEJvaWxlcnBsYXRlQXN5bmMiLCJhd2FpdCIsImJvaWxlcnBsYXRlIiwiZGF0YSIsImJhc2VEYXRhIiwiaHRtbEF0dHJpYnV0ZXMiLCJwaWNrIiwibWFkZUNoYW5nZXMiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJrZXlzIiwiZm9yRWFjaCIsInRoZW4iLCJyZXN1bHQiLCJzdHJlYW0iLCJ0b0hUTUxTdHJlYW0iLCJzdGF0dXNDb2RlIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlIiwibWFuaWZlc3QiLCJhZGRpdGlvbmFsT3B0aW9ucyIsIm1ldGVvclJ1bnRpbWVDb25maWciLCJKU09OIiwic3RyaW5naWZ5IiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicnVudGltZUNvbmZpZ092ZXJyaWRlcyIsIkJvaWxlcnBsYXRlIiwicGF0aE1hcHBlciIsIml0ZW1QYXRoIiwiYmFzZURhdGFFeHRlbnNpb24iLCJhZGRpdGlvbmFsU3RhdGljSnMiLCJtYXAiLCJtZXRlb3JSdW50aW1lSGFzaCIsInJvb3RVcmxQYXRoUHJlZml4Iiwic3JpTW9kZSIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiaW5saW5lIiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwic3RhdGljRmlsZXNCeUFyY2giLCJuZXh0IiwibWV0aG9kIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZSIsInNlcnZlU3RhdGljSnMiLCJzIiwid3JpdGVIZWFkIiwid3JpdGUiLCJlbmQiLCJoYXMiLCJwYXVzZWQiLCJpbmZvIiwiZ2V0U3RhdGljRmlsZUluZm8iLCJtYXhBZ2UiLCJjYWNoZWFibGUiLCJzZXRIZWFkZXIiLCJzb3VyY2VNYXBVcmwiLCJ0eXBlIiwiY29udGVudCIsImFic29sdXRlUGF0aCIsIm1heGFnZSIsImRvdGZpbGVzIiwibGFzdE1vZGlmaWVkIiwiZXJyIiwiTG9nIiwiZXJyb3IiLCJwaXBlIiwib3JpZ2luYWxQYXRoIiwic3RhdGljQXJjaExpc3QiLCJhcmNoSW5kZXgiLCJpbmRleE9mIiwidW5zaGlmdCIsInNvbWUiLCJzdGF0aWNGaWxlcyIsImZpbmFsaXplIiwicGFyc2VQb3J0IiwicG9ydCIsInBhcnNlZFBvcnQiLCJwYXJzZUludCIsIk51bWJlciIsImlzTmFOIiwicGF1c2VDbGllbnQiLCJnZW5lcmF0ZUNsaWVudFByb2dyYW0iLCJydW5XZWJBcHBTZXJ2ZXIiLCJzaHV0dGluZ0Rvd24iLCJzeW5jUXVldWUiLCJfU3luY2hyb25vdXNRdWV1ZSIsImdldEl0ZW1QYXRobmFtZSIsIml0ZW1VcmwiLCJyZWxvYWRDbGllbnRQcm9ncmFtcyIsInJ1blRhc2siLCJjb25maWdKc29uIiwiX19tZXRlb3JfYm9vdHN0cmFwX18iLCJjbGllbnRBcmNocyIsImNsaWVudFBhdGhzIiwic3RhY2siLCJwcm9jZXNzIiwiZXhpdCIsInVucGF1c2UiLCJjbGllbnREaXIiLCJzZXJ2ZXJEaXIiLCJwcm9ncmFtSnNvblBhdGgiLCJwcm9ncmFtSnNvbiIsImNvZGUiLCJmb3JtYXQiLCJpdGVtIiwid2hlcmUiLCJzb3VyY2VNYXAiLCJQVUJMSUNfU0VUVElOR1MiLCJjb25maWdPdmVycmlkZXMiLCJvbGRQcm9ncmFtIiwibmV3UHJvZ3JhbSIsIldlYkFwcEhhc2hpbmciLCJ2ZXJzaW9uUmVmcmVzaGFibGUiLCJ2ZXJzaW9uTm9uUmVmcmVzaGFibGUiLCJyZXBsYWNlYWJsZSIsInZlcnNpb25SZXBsYWNlYWJsZSIsIl90eXBlIiwiaXNQcm9kdWN0aW9uIiwiY29yZG92YUNvbXBhdGliaWxpdHlWZXJzaW9ucyIsIm1hbmlmZXN0VXJsUHJlZml4IiwicmVwbGFjZSIsIm1hbmlmZXN0VXJsIiwiUGFja2FnZSIsImF1dG91cGRhdGUiLCJBVVRPVVBEQVRFX1ZFUlNJT04iLCJBdXRvdXBkYXRlIiwiYXV0b3VwZGF0ZVZlcnNpb24iLCJlbnYiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaCIsImRlZmF1bHRPcHRpb25zRm9yQXJjaCIsIkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMIiwiTU9CSUxFX0REUF9VUkwiLCJhYnNvbHV0ZVVybCIsIlJPT1RfVVJMIiwiTU9CSUxFX1JPT1RfVVJMIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZSIsInJlZnJlc2hhYmxlQXNzZXRzIiwiY3NzIiwiZmlsZSIsImFwcCIsInJhd0Nvbm5lY3RIYW5kbGVycyIsInVzZSIsImlzVmFsaWRVcmwiLCJyZXNwb25zZSIsInF1ZXJ5IiwiZ2V0UGF0aFBhcnRzIiwic2hpZnQiLCJpc1ByZWZpeE9mIiwicHJlZml4IiwiYXJyYXkiLCJldmVyeSIsInBhcnQiLCJwYXRoUHJlZml4Iiwic2VhcmNoIiwicHJlZml4UGFydHMiLCJtZXRlb3JJbnRlcm5hbEhhbmRsZXJzIiwicGFja2FnZUFuZEFwcEhhbmRsZXJzIiwic3VwcHJlc3NDb25uZWN0RXJyb3JzIiwic3RhdHVzIiwiaXNEZXZlbG9wbWVudCIsIm5ld0hlYWRlcnMiLCJjYXRjaCIsImh0dHBTZXJ2ZXIiLCJvbkxpc3RlbmluZ0NhbGxiYWNrcyIsInNvY2tldCIsImRlc3Ryb3llZCIsIm1lc3NhZ2UiLCJkZXN0cm95IiwiY29ubmVjdEhhbmRsZXJzIiwiY29ubmVjdEFwcCIsIm9uTGlzdGVuaW5nIiwiZiIsInN0YXJ0TGlzdGVuaW5nIiwibGlzdGVuT3B0aW9ucyIsImNiIiwibGlzdGVuIiwiZXhwb3J0cyIsIm1haW4iLCJhcmd2Iiwic3RhcnRIdHRwU2VydmVyIiwiYmluZEVudmlyb25tZW50IiwiTUVURU9SX1BSSU5UX09OX0xJU1RFTiIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFja3MiLCJsb2NhbFBvcnQiLCJQT1JUIiwidW5peFNvY2tldFBhdGgiLCJVTklYX1NPQ0tFVF9QQVRIIiwidGVzdCIsImhvc3QiLCJCSU5EX0lQIiwic2V0SW5saW5lU2NyaXB0c0FsbG93ZWQiLCJlbmFibGVTdWJyZXNvdXJjZUludGVncml0eSIsInVzZV9jcmVkZW50aWFscyIsInNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiaG9va0ZuIiwic2V0QnVuZGxlZEpzQ3NzUHJlZml4Iiwic2VsZiIsImFkZFN0YXRpY0pzIiwibnBtQ29ubmVjdCIsImNvbm5lY3RBcmdzIiwiaGFuZGxlcnMiLCJhcHBseSIsIm9yaWdpbmFsVXNlIiwidXNlQXJncyIsIm9yaWdpbmFsTGVuZ3RoIiwiZW50cnkiLCJvcmlnaW5hbEhhbmRsZSIsImhhbmRsZSIsImFzeW5jQXBwbHkiLCJhcmd1bWVudHMiLCJzdGF0U3luYyIsInVubGlua1N5bmMiLCJleGlzdHNTeW5jIiwic29ja2V0UGF0aCIsImlzU29ja2V0IiwiZXZlbnRFbWl0dGVyIiwic2lnbmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFJQSxhQUFKOztBQUFrQkMsU0FBTyxDQUFDQyxJQUFSLENBQWEsc0NBQWIsRUFBb0Q7QUFBQ0MsV0FBTyxDQUFDQyxDQUFELEVBQUc7QUFBQ0osbUJBQWEsR0FBQ0ksQ0FBZDtBQUFnQjs7QUFBNUIsR0FBcEQsRUFBa0YsQ0FBbEY7QUFBbEJILFNBQU8sQ0FBQ0ksTUFBUixDQUFlO0FBQUNDLFVBQU0sRUFBQyxNQUFJQSxNQUFaO0FBQW1CQyxtQkFBZSxFQUFDLE1BQUlBO0FBQXZDLEdBQWY7QUFBd0UsTUFBSUMsTUFBSjtBQUFXUCxTQUFPLENBQUNDLElBQVIsQ0FBYSxRQUFiLEVBQXNCO0FBQUNDLFdBQU8sQ0FBQ0MsQ0FBRCxFQUFHO0FBQUNJLFlBQU0sR0FBQ0osQ0FBUDtBQUFTOztBQUFyQixHQUF0QixFQUE2QyxDQUE3QztBQUFnRCxNQUFJSyxZQUFKO0FBQWlCUixTQUFPLENBQUNDLElBQVIsQ0FBYSxJQUFiLEVBQWtCO0FBQUNPLGdCQUFZLENBQUNMLENBQUQsRUFBRztBQUFD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Q0E7QUFDQTtBQUNBLFFBQUlBLEtBQUssQ0FBQ3NDLElBQU4sS0FBZSxRQUFuQixFQUE2QjtBQUMzQixZQUFNdEMsS0FBTjtBQUNEO0FBQ0Y7QUFDRixDQXJCTTs7QUEwQkEsTUFBTTdLLHlCQUF5QixHQUNwQyxVQUFDb1UsVUFBRCxFQUF3QztBQUFBLE1BQTNCRSxZQUEyQix1RUFBWjFILE9BQVk7QUFDdEMsR0FBQyxNQUFELEVBQVMsUUFBVCxFQUFtQixRQUFuQixFQUE2QixTQUE3QixFQUF3Q25GLE9BQXhDLENBQWdEOE0sTUFBTSxJQUFJO0FBQ3hERCxnQkFBWSxDQUFDbk8sRUFBYixDQUFnQm9PLE1BQWhCLEVBQXdCclAsTUFBTSxDQUFDK00sZUFBUCxDQUF1QixNQUFNO0FBQ25ELFVBQUlrQyxVQUFVLENBQUNDLFVBQUQsQ0FBZCxFQUE0QjtBQUMxQkYsa0JBQVUsQ0FBQ0UsVUFBRCxDQUFWO0FBQ0Q7QUFDRixLQUp1QixDQUF4QjtBQUtELEdBTkQ7QUFPRCxDQVRJLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3dlYmFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXIgfSBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHtcbiAgam9pbiBhcyBwYXRoSm9pbixcbiAgZGlybmFtZSBhcyBwYXRoRGlybmFtZSxcbn0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlVXJsIH0gZnJvbSBcInVybFwiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGNvbm5lY3QgfSBmcm9tIFwiLi9jb25uZWN0LmpzXCI7XG5pbXBvcnQgY29tcHJlc3MgZnJvbSBcImNvbXByZXNzaW9uXCI7XG5pbXBvcnQgY29va2llUGFyc2VyIGZyb20gXCJjb29raWUtcGFyc2VyXCI7XG5pbXBvcnQgcXMgZnJvbSBcInFzXCI7XG5pbXBvcnQgcGFyc2VSZXF1ZXN0IGZyb20gXCJwYXJzZXVybFwiO1xuaW1wb3J0IGJhc2ljQXV0aCBmcm9tIFwiYmFzaWMtYXV0aC1jb25uZWN0XCI7XG5pbXBvcnQgeyBsb29rdXAgYXMgbG9va3VwVXNlckFnZW50IH0gZnJvbSBcInVzZXJhZ2VudFwiO1xuaW1wb3J0IHsgaXNNb2Rlcm4gfSBmcm9tIFwibWV0ZW9yL21vZGVybi1icm93c2Vyc1wiO1xuaW1wb3J0IHNlbmQgZnJvbSBcInNlbmRcIjtcbmltcG9ydCB7XG4gIHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSxcbiAgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCxcbn0gZnJvbSAnLi9zb2NrZXRfZmlsZS5qcyc7XG5cbnZhciBTSE9SVF9TT0NLRVRfVElNRU9VVCA9IDUqMTAwMDtcbnZhciBMT05HX1NPQ0tFVF9USU1FT1VUID0gMTIwKjEwMDA7XG5cbmV4cG9ydCBjb25zdCBXZWJBcHAgPSB7fTtcbmV4cG9ydCBjb25zdCBXZWJBcHBJbnRlcm5hbHMgPSB7fTtcblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gYmFja3dhcmRzIGNvbXBhdCB0byAyLjAgb2YgY29ubmVjdFxuY29ubmVjdC5iYXNpY0F1dGggPSBiYXNpY0F1dGg7XG5cbldlYkFwcEludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBjb25uZWN0OiB7XG4gICAgdmVyc2lvbjogTnBtLnJlcXVpcmUoJ2Nvbm5lY3QvcGFja2FnZS5qc29uJykudmVyc2lvbixcbiAgICBtb2R1bGU6IGNvbm5lY3QsXG4gIH1cbn07XG5cbi8vIFRob3VnaCB3ZSBtaWdodCBwcmVmZXIgdG8gdXNlIHdlYi5icm93c2VyIChtb2Rlcm4pIGFzIHRoZSBkZWZhdWx0XG4vLyBhcmNoaXRlY3R1cmUsIHNhZmV0eSByZXF1aXJlcyBhIG1vcmUgY29tcGF0aWJsZSBkZWZhdWx0QXJjaC5cbldlYkFwcC5kZWZhdWx0QXJjaCA9ICd3ZWIuYnJvd3Nlci5sZWdhY3knO1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBtYW5pZmVzdHNcbldlYkFwcC5jbGllbnRQcm9ncmFtcyA9IHt9O1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBwcm9ncmFtIHBhdGggb24gZmlsZXN5c3RlbVxudmFyIGFyY2hQYXRoID0ge307XG5cbnZhciBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgdmFyIGJ1bmRsZWRQcmVmaXggPVxuICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnO1xuICByZXR1cm4gYnVuZGxlZFByZWZpeCArIHVybDtcbn07XG5cbnZhciBzaGExID0gZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gIHZhciBoYXNoID0gY3JlYXRlSGFzaCgnc2hhMScpO1xuICBoYXNoLnVwZGF0ZShjb250ZW50cyk7XG4gIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuXG4gZnVuY3Rpb24gc2hvdWxkQ29tcHJlc3MocmVxLCByZXMpIHtcbiAgaWYgKHJlcS5oZWFkZXJzWyd4LW5vLWNvbXByZXNzaW9uJ10pIHtcbiAgICAvLyBkb24ndCBjb21wcmVzcyByZXNwb25zZXMgd2l0aCB0aGlzIHJlcXVlc3QgaGVhZGVyXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gZmFsbGJhY2sgdG8gc3RhbmRhcmQgZmlsdGVyIGZ1bmN0aW9uXG4gIHJldHVybiBjb21wcmVzcy5maWx0ZXIocmVxLCByZXMpO1xufTtcblxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvblxuLy9cbi8vIFdlIGhhdmUgbXVsdGlwbGUgcGxhY2VzIHRoYXQgd2FudCB0byBpZGVudGlmeSB0aGUgYnJvd3NlcjogdGhlXG4vLyB1bnN1cHBvcnRlZCBicm93c2VyIHBhZ2UsIHRoZSBhcHBjYWNoZSBwYWNrYWdlLCBhbmQsIGV2ZW50dWFsbHlcbi8vIGRlbGl2ZXJpbmcgYnJvd3NlciBwb2x5ZmlsbHMgb25seSBhcyBuZWVkZWQuXG4vL1xuLy8gVG8gYXZvaWQgZGV0ZWN0aW5nIHRoZSBicm93c2VyIGluIG11bHRpcGxlIHBsYWNlcyBhZC1ob2MsIHdlIGNyZWF0ZSBhXG4vLyBNZXRlb3IgXCJicm93c2VyXCIgb2JqZWN0LiBJdCB1c2VzIGJ1dCBkb2VzIG5vdCBleHBvc2UgdGhlIG5wbVxuLy8gdXNlcmFnZW50IG1vZHVsZSAod2UgY291bGQgY2hvb3NlIGEgZGlmZmVyZW50IG1lY2hhbmlzbSB0byBpZGVudGlmeVxuLy8gdGhlIGJyb3dzZXIgaW4gdGhlIGZ1dHVyZSBpZiB3ZSB3YW50ZWQgdG8pLiAgVGhlIGJyb3dzZXIgb2JqZWN0XG4vLyBjb250YWluc1xuLy9cbi8vICogYG5hbWVgOiB0aGUgbmFtZSBvZiB0aGUgYnJvd3NlciBpbiBjYW1lbCBjYXNlXG4vLyAqIGBtYWpvcmAsIGBtaW5vcmAsIGBwYXRjaGA6IGludGVnZXJzIGRlc2NyaWJpbmcgdGhlIGJyb3dzZXIgdmVyc2lvblxuLy9cbi8vIEFsc28gaGVyZSBpcyBhbiBlYXJseSB2ZXJzaW9uIG9mIGEgTWV0ZW9yIGByZXF1ZXN0YCBvYmplY3QsIGludGVuZGVkXG4vLyB0byBiZSBhIGhpZ2gtbGV2ZWwgZGVzY3JpcHRpb24gb2YgdGhlIHJlcXVlc3Qgd2l0aG91dCBleHBvc2luZ1xuLy8gZGV0YWlscyBvZiBjb25uZWN0J3MgbG93LWxldmVsIGByZXFgLiAgQ3VycmVudGx5IGl0IGNvbnRhaW5zOlxuLy9cbi8vICogYGJyb3dzZXJgOiBicm93c2VyIGlkZW50aWZpY2F0aW9uIG9iamVjdCBkZXNjcmliZWQgYWJvdmVcbi8vICogYHVybGA6IHBhcnNlZCB1cmwsIGluY2x1ZGluZyBwYXJzZWQgcXVlcnkgcGFyYW1zXG4vL1xuLy8gQXMgYSB0ZW1wb3JhcnkgaGFjayB0aGVyZSBpcyBhIGBjYXRlZ29yaXplUmVxdWVzdGAgZnVuY3Rpb24gb24gV2ViQXBwIHdoaWNoXG4vLyBjb252ZXJ0cyBhIGNvbm5lY3QgYHJlcWAgdG8gYSBNZXRlb3IgYHJlcXVlc3RgLiBUaGlzIGNhbiBnbyBhd2F5IG9uY2Ugc21hcnRcbi8vIHBhY2thZ2VzIHN1Y2ggYXMgYXBwY2FjaGUgYXJlIGJlaW5nIHBhc3NlZCBhIGByZXF1ZXN0YCBvYmplY3QgZGlyZWN0bHkgd2hlblxuLy8gdGhleSBzZXJ2ZSBjb250ZW50LlxuLy9cbi8vIFRoaXMgYWxsb3dzIGByZXF1ZXN0YCB0byBiZSB1c2VkIHVuaWZvcm1seTogaXQgaXMgcGFzc2VkIHRvIHRoZSBodG1sXG4vLyBhdHRyaWJ1dGVzIGhvb2ssIGFuZCB0aGUgYXBwY2FjaGUgcGFja2FnZSBjYW4gdXNlIGl0IHdoZW4gZGVjaWRpbmdcbi8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgYSA0MDQgZm9yIHRoZSBtYW5pZmVzdC5cbi8vXG4vLyBSZWFsIHJvdXRpbmcgLyBzZXJ2ZXIgc2lkZSByZW5kZXJpbmcgd2lsbCBwcm9iYWJseSByZWZhY3RvciB0aGlzXG4vLyBoZWF2aWx5LlxuXG5cbi8vIGUuZy4gXCJNb2JpbGUgU2FmYXJpXCIgPT4gXCJtb2JpbGVTYWZhcmlcIlxudmFyIGNhbWVsQ2FzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJyAnKTtcbiAgcGFydHNbMF0gPSBwYXJ0c1swXS50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKHZhciBpID0gMTsgIGkgPCBwYXJ0cy5sZW5ndGg7ICArK2kpIHtcbiAgICBwYXJ0c1tpXSA9IHBhcnRzW2ldLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcGFydHNbaV0uc3Vic3RyKDEpO1xuICB9XG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKTtcbn07XG5cbnZhciBpZGVudGlmeUJyb3dzZXIgPSBmdW5jdGlvbiAodXNlckFnZW50U3RyaW5nKSB7XG4gIHZhciB1c2VyQWdlbnQgPSBsb29rdXBVc2VyQWdlbnQodXNlckFnZW50U3RyaW5nKTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBjYW1lbENhc2UodXNlckFnZW50LmZhbWlseSksXG4gICAgbWFqb3I6ICt1c2VyQWdlbnQubWFqb3IsXG4gICAgbWlub3I6ICt1c2VyQWdlbnQubWlub3IsXG4gICAgcGF0Y2g6ICt1c2VyQWdlbnQucGF0Y2hcbiAgfTtcbn07XG5cbi8vIFhYWCBSZWZhY3RvciBhcyBwYXJ0IG9mIGltcGxlbWVudGluZyByZWFsIHJvdXRpbmcuXG5XZWJBcHBJbnRlcm5hbHMuaWRlbnRpZnlCcm93c2VyID0gaWRlbnRpZnlCcm93c2VyO1xuXG5XZWJBcHAuY2F0ZWdvcml6ZVJlcXVlc3QgPSBmdW5jdGlvbiAocmVxKSB7XG4gIGlmIChyZXEuYnJvd3NlciAmJiByZXEuYXJjaCAmJiB0eXBlb2YgcmVxLm1vZGVybiA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAvLyBBbHJlYWR5IGNhdGVnb3JpemVkLlxuICAgIHJldHVybiByZXE7XG4gIH1cblxuICBjb25zdCBicm93c2VyID0gaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzW1widXNlci1hZ2VudFwiXSk7XG4gIGNvbnN0IG1vZGVybiA9IGlzTW9kZXJuKGJyb3dzZXIpO1xuICBjb25zdCBwYXRoID0gdHlwZW9mIHJlcS5wYXRobmFtZSA9PT0gXCJzdHJpbmdcIlxuICAgPyByZXEucGF0aG5hbWVcbiAgIDogcGFyc2VSZXF1ZXN0KHJlcSkucGF0aG5hbWU7XG5cbiAgY29uc3QgY2F0ZWdvcml6ZWQgPSB7XG4gICAgYnJvd3NlcixcbiAgICBtb2Rlcm4sXG4gICAgcGF0aCxcbiAgICBhcmNoOiBXZWJBcHAuZGVmYXVsdEFyY2gsXG4gICAgdXJsOiBwYXJzZVVybChyZXEudXJsLCB0cnVlKSxcbiAgICBkeW5hbWljSGVhZDogcmVxLmR5bmFtaWNIZWFkLFxuICAgIGR5bmFtaWNCb2R5OiByZXEuZHluYW1pY0JvZHksXG4gICAgaGVhZGVyczogcmVxLmhlYWRlcnMsXG4gICAgY29va2llczogcmVxLmNvb2tpZXMsXG4gIH07XG5cbiAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gIGNvbnN0IGFyY2hLZXkgPSBwYXRoUGFydHNbMV07XG5cbiAgaWYgKGFyY2hLZXkuc3RhcnRzV2l0aChcIl9fXCIpKSB7XG4gICAgY29uc3QgYXJjaENsZWFuZWQgPSBcIndlYi5cIiArIGFyY2hLZXkuc2xpY2UoMik7XG4gICAgaWYgKGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaENsZWFuZWQpKSB7XG4gICAgICBwYXRoUGFydHMuc3BsaWNlKDEsIDEpOyAvLyBSZW1vdmUgdGhlIGFyY2hLZXkgcGFydC5cbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGNhdGVnb3JpemVkLCB7XG4gICAgICAgIGFyY2g6IGFyY2hDbGVhbmVkLFxuICAgICAgICBwYXRoOiBwYXRoUGFydHMuam9pbihcIi9cIiksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBUT0RPIFBlcmhhcHMgb25lIGRheSB3ZSBjb3VsZCBpbmZlciBDb3Jkb3ZhIGNsaWVudHMgaGVyZSwgc28gdGhhdCB3ZVxuICAvLyB3b3VsZG4ndCBoYXZlIHRvIHVzZSBwcmVmaXhlZCBcIi9fX2NvcmRvdmEvLi4uXCIgVVJMcy5cbiAgY29uc3QgcHJlZmVycmVkQXJjaE9yZGVyID0gaXNNb2Rlcm4oYnJvd3NlcilcbiAgICA/IFtcIndlYi5icm93c2VyXCIsIFwid2ViLmJyb3dzZXIubGVnYWN5XCJdXG4gICAgOiBbXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIiwgXCJ3ZWIuYnJvd3NlclwiXTtcblxuICBmb3IgKGNvbnN0IGFyY2ggb2YgcHJlZmVycmVkQXJjaE9yZGVyKSB7XG4gICAgLy8gSWYgb3VyIHByZWZlcnJlZCBhcmNoIGlzIG5vdCBhdmFpbGFibGUsIGl0J3MgYmV0dGVyIHRvIHVzZSBhbm90aGVyXG4gICAgLy8gY2xpZW50IGFyY2ggdGhhdCBpcyBhdmFpbGFibGUgdGhhbiB0byBndWFyYW50ZWUgdGhlIHNpdGUgd29uJ3Qgd29ya1xuICAgIC8vIGJ5IHJldHVybmluZyBhbiB1bmtub3duIGFyY2guIEZvciBleGFtcGxlLCBpZiB3ZWIuYnJvd3Nlci5sZWdhY3kgaXNcbiAgICAvLyBleGNsdWRlZCB1c2luZyB0aGUgLS1leGNsdWRlLWFyY2hzIGNvbW1hbmQtbGluZSBvcHRpb24sIGxlZ2FjeVxuICAgIC8vIGNsaWVudHMgYXJlIGJldHRlciBvZmYgcmVjZWl2aW5nIHdlYi5icm93c2VyICh3aGljaCBtaWdodCBhY3R1YWxseVxuICAgIC8vIHdvcmspIHRoYW4gcmVjZWl2aW5nIGFuIEhUVFAgNDA0IHJlc3BvbnNlLiBJZiBub25lIG9mIHRoZSBhcmNocyBpblxuICAgIC8vIHByZWZlcnJlZEFyY2hPcmRlciBhcmUgZGVmaW5lZCwgb25seSB0aGVuIHNob3VsZCB3ZSBzZW5kIGEgNDA0LlxuICAgIGlmIChoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2gpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihjYXRlZ29yaXplZCwgeyBhcmNoIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjYXRlZ29yaXplZDtcbn07XG5cbi8vIEhUTUwgYXR0cmlidXRlIGhvb2tzOiBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkIHRvIGRldGVybWluZSBhbnkgYXR0cmlidXRlcyB0b1xuLy8gYmUgYWRkZWQgdG8gdGhlICc8aHRtbD4nIHRhZy4gRWFjaCBmdW5jdGlvbiBpcyBwYXNzZWQgYSAncmVxdWVzdCcgb2JqZWN0IChzZWVcbi8vICNCcm93c2VySWRlbnRpZmljYXRpb24pIGFuZCBzaG91bGQgcmV0dXJuIG51bGwgb3Igb2JqZWN0LlxudmFyIGh0bWxBdHRyaWJ1dGVIb29rcyA9IFtdO1xudmFyIGdldEh0bWxBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgdmFyIGNvbWJpbmVkQXR0cmlidXRlcyAgPSB7fTtcbiAgXy5lYWNoKGh0bWxBdHRyaWJ1dGVIb29rcyB8fCBbXSwgZnVuY3Rpb24gKGhvb2spIHtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGhvb2socmVxdWVzdCk7XG4gICAgaWYgKGF0dHJpYnV0ZXMgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBhdHRyaWJ1dGVzICE9PSAnb2JqZWN0JylcbiAgICAgIHRocm93IEVycm9yKFwiSFRNTCBhdHRyaWJ1dGUgaG9vayBtdXN0IHJldHVybiBudWxsIG9yIG9iamVjdFwiKTtcbiAgICBfLmV4dGVuZChjb21iaW5lZEF0dHJpYnV0ZXMsIGF0dHJpYnV0ZXMpO1xuICB9KTtcbiAgcmV0dXJuIGNvbWJpbmVkQXR0cmlidXRlcztcbn07XG5XZWJBcHAuYWRkSHRtbEF0dHJpYnV0ZUhvb2sgPSBmdW5jdGlvbiAoaG9vaykge1xuICBodG1sQXR0cmlidXRlSG9va3MucHVzaChob29rKTtcbn07XG5cbi8vIFNlcnZlIGFwcCBIVE1MIGZvciB0aGlzIFVSTD9cbnZhciBhcHBVcmwgPSBmdW5jdGlvbiAodXJsKSB7XG4gIGlmICh1cmwgPT09ICcvZmF2aWNvbi5pY28nIHx8IHVybCA9PT0gJy9yb2JvdHMudHh0JylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gTk9URTogYXBwLm1hbmlmZXN0IGlzIG5vdCBhIHdlYiBzdGFuZGFyZCBsaWtlIGZhdmljb24uaWNvIGFuZFxuICAvLyByb2JvdHMudHh0LiBJdCBpcyBhIGZpbGUgbmFtZSB3ZSBoYXZlIGNob3NlbiB0byB1c2UgZm9yIEhUTUw1XG4gIC8vIGFwcGNhY2hlIFVSTHMuIEl0IGlzIGluY2x1ZGVkIGhlcmUgdG8gcHJldmVudCB1c2luZyBhbiBhcHBjYWNoZVxuICAvLyB0aGVuIHJlbW92aW5nIGl0IGZyb20gcG9pc29uaW5nIGFuIGFwcCBwZXJtYW5lbnRseS4gRXZlbnR1YWxseSxcbiAgLy8gb25jZSB3ZSBoYXZlIHNlcnZlciBzaWRlIHJvdXRpbmcsIHRoaXMgd29uJ3QgYmUgbmVlZGVkIGFzXG4gIC8vIHVua25vd24gVVJMcyB3aXRoIHJldHVybiBhIDQwNCBhdXRvbWF0aWNhbGx5LlxuICBpZiAodXJsID09PSAnL2FwcC5tYW5pZmVzdCcpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIEF2b2lkIHNlcnZpbmcgYXBwIEhUTUwgZm9yIGRlY2xhcmVkIHJvdXRlcyBzdWNoIGFzIC9zb2NranMvLlxuICBpZiAoUm91dGVQb2xpY3kuY2xhc3NpZnkodXJsKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gd2UgY3VycmVudGx5IHJldHVybiBhcHAgSFRNTCBvbiBhbGwgVVJMcyBieSBkZWZhdWx0XG4gIHJldHVybiB0cnVlO1xufTtcblxuXG4vLyBXZSBuZWVkIHRvIGNhbGN1bGF0ZSB0aGUgY2xpZW50IGhhc2ggYWZ0ZXIgYWxsIHBhY2thZ2VzIGhhdmUgbG9hZGVkXG4vLyB0byBnaXZlIHRoZW0gYSBjaGFuY2UgdG8gcG9wdWxhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5cbi8vXG4vLyBDYWxjdWxhdGluZyB0aGUgaGFzaCBkdXJpbmcgc3RhcnR1cCBtZWFucyB0aGF0IHBhY2thZ2VzIGNhbiBvbmx5XG4vLyBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBsb2FkLCBub3QgZHVyaW5nIHN0YXJ0dXAuXG4vL1xuLy8gQ2FsY3VsYXRpbmcgaW5zdGVhZCBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIG1haW4gYWZ0ZXIgYWxsIHN0YXJ0dXBcbi8vIGhvb2tzIGhhZCBydW4gd291bGQgYWxsb3cgcGFja2FnZXMgdG8gYWxzbyBwb3B1bGF0ZVxuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyBkdXJpbmcgc3RhcnR1cCwgYnV0IHRoYXQncyB0b28gbGF0ZSBmb3Jcbi8vIGF1dG91cGRhdGUgYmVjYXVzZSBpdCBuZWVkcyB0byBoYXZlIHRoZSBjbGllbnQgaGFzaCBhdCBzdGFydHVwIHRvXG4vLyBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gaXRzZWxmIGludG9cbi8vIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gdG8gZ2V0IGl0IHRvIHRoZSBjbGllbnQuXG4vL1xuLy8gQW4gYWx0ZXJuYXRpdmUgd291bGQgYmUgdG8gZ2l2ZSBhdXRvdXBkYXRlIGEgXCJwb3N0LXN0YXJ0LFxuLy8gcHJlLWxpc3RlblwiIGhvb2sgdG8gYWxsb3cgaXQgdG8gaW5zZXJ0IHRoZSBhdXRvIHVwZGF0ZSB2ZXJzaW9uIGF0XG4vLyB0aGUgcmlnaHQgbW9tZW50LlxuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIGdldHRlcihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICAgIGFyY2ggPSBhcmNoIHx8IFdlYkFwcC5kZWZhdWx0QXJjaDtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgICBjb25zdCB2YWx1ZSA9IHByb2dyYW0gJiYgcHJvZ3JhbVtrZXldO1xuICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSBoYXZlIGNhbGN1bGF0ZWQgdGhpcyBoYXNoLFxuICAgICAgLy8gcHJvZ3JhbVtrZXldIHdpbGwgYmUgYSB0aHVuayAobGF6eSBmdW5jdGlvbiB3aXRoIG5vIHBhcmFtZXRlcnMpXG4gICAgICAvLyB0aGF0IHdlIHNob3VsZCBjYWxsIHRvIGRvIHRoZSBhY3R1YWwgY29tcHV0YXRpb24uXG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBwcm9ncmFtW2tleV0gPSB2YWx1ZSgpXG4gICAgICAgIDogdmFsdWU7XG4gICAgfTtcbiAgfVxuXG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoID0gV2ViQXBwLmNsaWVudEhhc2ggPSBnZXR0ZXIoXCJ2ZXJzaW9uXCIpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlID0gZ2V0dGVyKFwidmVyc2lvblJlZnJlc2hhYmxlXCIpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlID0gZ2V0dGVyKFwidmVyc2lvbk5vblJlZnJlc2hhYmxlXCIpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaFJlcGxhY2VhYmxlID0gZ2V0dGVyKFwidmVyc2lvblJlcGxhY2VhYmxlXCIpO1xuICBXZWJBcHAuZ2V0UmVmcmVzaGFibGVBc3NldHMgPSBnZXR0ZXIoXCJyZWZyZXNoYWJsZUFzc2V0c1wiKTtcbn0pO1xuXG5cblxuLy8gV2hlbiB3ZSBoYXZlIGEgcmVxdWVzdCBwZW5kaW5nLCB3ZSB3YW50IHRoZSBzb2NrZXQgdGltZW91dCB0byBiZSBsb25nLCB0b1xuLy8gZ2l2ZSBvdXJzZWx2ZXMgYSB3aGlsZSB0byBzZXJ2ZSBpdCwgYW5kIHRvIGFsbG93IHNvY2tqcyBsb25nIHBvbGxzIHRvXG4vLyBjb21wbGV0ZS4gIE9uIHRoZSBvdGhlciBoYW5kLCB3ZSB3YW50IHRvIGNsb3NlIGlkbGUgc29ja2V0cyByZWxhdGl2ZWx5XG4vLyBxdWlja2x5LCBzbyB0aGF0IHdlIGNhbiBzaHV0IGRvd24gcmVsYXRpdmVseSBwcm9tcHRseSBidXQgY2xlYW5seSwgd2l0aG91dFxuLy8gY3V0dGluZyBvZmYgYW55b25lJ3MgcmVzcG9uc2UuXG5XZWJBcHAuX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrID0gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gIC8vIHRoaXMgaXMgcmVhbGx5IGp1c3QgcmVxLnNvY2tldC5zZXRUaW1lb3V0KExPTkdfU09DS0VUX1RJTUVPVVQpO1xuICByZXEuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgLy8gSW5zZXJ0IG91ciBuZXcgZmluaXNoIGxpc3RlbmVyIHRvIHJ1biBCRUZPUkUgdGhlIGV4aXN0aW5nIG9uZSB3aGljaCByZW1vdmVzXG4gIC8vIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzb2NrZXQuXG4gIHZhciBmaW5pc2hMaXN0ZW5lcnMgPSByZXMubGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgLy8gWFhYIEFwcGFyZW50bHkgaW4gTm9kZSAwLjEyIHRoaXMgZXZlbnQgd2FzIGNhbGxlZCAncHJlZmluaXNoJy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2NvbW1pdC83YzliNjA3MFxuICAvLyBCdXQgaXQgaGFzIHN3aXRjaGVkIGJhY2sgdG8gJ2ZpbmlzaCcgaW4gTm9kZSB2NDpcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvMTQxMVxuICByZXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgcmVzLm9uKCdmaW5pc2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmVzLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuICB9KTtcbiAgXy5lYWNoKGZpbmlzaExpc3RlbmVycywgZnVuY3Rpb24gKGwpIHsgcmVzLm9uKCdmaW5pc2gnLCBsKTsgfSk7XG59O1xuXG5cbi8vIFdpbGwgYmUgdXBkYXRlZCBieSBtYWluIGJlZm9yZSB3ZSBsaXN0ZW4uXG4vLyBNYXAgZnJvbSBjbGllbnQgYXJjaCB0byBib2lsZXJwbGF0ZSBvYmplY3QuXG4vLyBCb2lsZXJwbGF0ZSBvYmplY3QgaGFzOlxuLy8gICAtIGZ1bmM6IFhYWFxuLy8gICAtIGJhc2VEYXRhOiBYWFhcbnZhciBib2lsZXJwbGF0ZUJ5QXJjaCA9IHt9O1xuXG4vLyBSZWdpc3RlciBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgY2FuIHNlbGVjdGl2ZWx5IG1vZGlmeSBib2lsZXJwbGF0ZVxuLy8gZGF0YSBnaXZlbiBhcmd1bWVudHMgKHJlcXVlc3QsIGRhdGEsIGFyY2gpLiBUaGUga2V5IHNob3VsZCBiZSBhIHVuaXF1ZVxuLy8gaWRlbnRpZmllciwgdG8gcHJldmVudCBhY2N1bXVsYXRpbmcgZHVwbGljYXRlIGNhbGxiYWNrcyBmcm9tIHRoZSBzYW1lXG4vLyBjYWxsIHNpdGUgb3ZlciB0aW1lLiBDYWxsYmFja3Mgd2lsbCBiZSBjYWxsZWQgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZVxuLy8gcmVnaXN0ZXJlZC4gQSBjYWxsYmFjayBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIGl0IGRpZCBub3QgbWFrZSBhbnlcbi8vIGNoYW5nZXMgYWZmZWN0aW5nIHRoZSBib2lsZXJwbGF0ZS4gUGFzc2luZyBudWxsIGRlbGV0ZXMgdGhlIGNhbGxiYWNrLlxuLy8gQW55IHByZXZpb3VzIGNhbGxiYWNrIHJlZ2lzdGVyZWQgZm9yIHRoaXMga2V5IHdpbGwgYmUgcmV0dXJuZWQuXG5jb25zdCBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuV2ViQXBwSW50ZXJuYWxzLnJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2sgPSBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuICBjb25zdCBwcmV2aW91c0NhbGxiYWNrID0gYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG5cbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV0gPSBjYWxsYmFjaztcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwoY2FsbGJhY2ssIG51bGwpO1xuICAgIGRlbGV0ZSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcHJldmlvdXMgY2FsbGJhY2sgaW4gY2FzZSB0aGUgbmV3IGNhbGxiYWNrIG5lZWRzIHRvIGNhbGxcbiAgLy8gaXQ7IGZvciBleGFtcGxlLCB3aGVuIHRoZSBuZXcgY2FsbGJhY2sgaXMgYSB3cmFwcGVyIGZvciB0aGUgb2xkLlxuICByZXR1cm4gcHJldmlvdXNDYWxsYmFjayB8fCBudWxsO1xufTtcblxuLy8gR2l2ZW4gYSByZXF1ZXN0IChhcyByZXR1cm5lZCBmcm9tIGBjYXRlZ29yaXplUmVxdWVzdGApLCByZXR1cm4gdGhlXG4vLyBib2lsZXJwbGF0ZSBIVE1MIHRvIHNlcnZlIGZvciB0aGF0IHJlcXVlc3QuXG4vL1xuLy8gSWYgYSBwcmV2aW91cyBjb25uZWN0IG1pZGRsZXdhcmUgaGFzIHJlbmRlcmVkIGNvbnRlbnQgZm9yIHRoZSBoZWFkIG9yIGJvZHksXG4vLyByZXR1cm5zIHRoZSBib2lsZXJwbGF0ZSB3aXRoIHRoYXQgY29udGVudCBwYXRjaGVkIGluIG90aGVyd2lzZVxuLy8gbWVtb2l6ZXMgb24gSFRNTCBhdHRyaWJ1dGVzICh1c2VkIGJ5LCBlZywgYXBwY2FjaGUpIGFuZCB3aGV0aGVyIGlubGluZVxuLy8gc2NyaXB0cyBhcmUgY3VycmVudGx5IGFsbG93ZWQuXG4vLyBYWFggc28gZmFyIHRoaXMgZnVuY3Rpb24gaXMgYWx3YXlzIGNhbGxlZCB3aXRoIGFyY2ggPT09ICd3ZWIuYnJvd3NlcidcbmZ1bmN0aW9uIGdldEJvaWxlcnBsYXRlKHJlcXVlc3QsIGFyY2gpIHtcbiAgcmV0dXJuIGdldEJvaWxlcnBsYXRlQXN5bmMocmVxdWVzdCwgYXJjaCkuYXdhaXQoKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKSB7XG4gIGNvbnN0IGJvaWxlcnBsYXRlID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaF07XG4gIGNvbnN0IGRhdGEgPSBPYmplY3QuYXNzaWduKHt9LCBib2lsZXJwbGF0ZS5iYXNlRGF0YSwge1xuICAgIGh0bWxBdHRyaWJ1dGVzOiBnZXRIdG1sQXR0cmlidXRlcyhyZXF1ZXN0KSxcbiAgfSwgXy5waWNrKHJlcXVlc3QsIFwiZHluYW1pY0hlYWRcIiwgXCJkeW5hbWljQm9keVwiKSk7XG5cbiAgbGV0IG1hZGVDaGFuZ2VzID0gZmFsc2U7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgT2JqZWN0LmtleXMoYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBjYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHJlcXVlc3QsIGRhdGEsIGFyY2gpO1xuICAgIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIC8vIENhbGxiYWNrcyBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIHRoZXkgZGlkIG5vdCBtYWtlIGFueSBjaGFuZ2VzLlxuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+ICh7XG4gICAgc3RyZWFtOiBib2lsZXJwbGF0ZS50b0hUTUxTdHJlYW0oZGF0YSksXG4gICAgc3RhdHVzQ29kZTogZGF0YS5zdGF0dXNDb2RlLFxuICAgIGhlYWRlcnM6IGRhdGEuaGVhZGVycyxcbiAgfSkpO1xufVxuXG5XZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlID0gZnVuY3Rpb24gKGFyY2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsT3B0aW9ucykge1xuICBhZGRpdGlvbmFsT3B0aW9ucyA9IGFkZGl0aW9uYWxPcHRpb25zIHx8IHt9O1xuXG4gIGNvbnN0IG1ldGVvclJ1bnRpbWVDb25maWcgPSBKU09OLnN0cmluZ2lmeShcbiAgICBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgLi4uX19tZXRlb3JfcnVudGltZV9jb25maWdfXyxcbiAgICAgIC4uLihhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IHt9KVxuICAgIH0pKVxuICApO1xuXG4gIHJldHVybiBuZXcgQm9pbGVycGxhdGUoYXJjaCwgbWFuaWZlc3QsIF8uZXh0ZW5kKHtcbiAgICBwYXRoTWFwcGVyKGl0ZW1QYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aEpvaW4oYXJjaFBhdGhbYXJjaF0sIGl0ZW1QYXRoKTtcbiAgICB9LFxuICAgIGJhc2VEYXRhRXh0ZW5zaW9uOiB7XG4gICAgICBhZGRpdGlvbmFsU3RhdGljSnM6IF8ubWFwKFxuICAgICAgICBhZGRpdGlvbmFsU3RhdGljSnMgfHwgW10sXG4gICAgICAgIGZ1bmN0aW9uIChjb250ZW50cywgcGF0aG5hbWUpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGF0aG5hbWU6IHBhdGhuYW1lLFxuICAgICAgICAgICAgY29udGVudHM6IGNvbnRlbnRzXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIC8vIENvbnZlcnQgdG8gYSBKU09OIHN0cmluZywgdGhlbiBnZXQgcmlkIG9mIG1vc3Qgd2VpcmQgY2hhcmFjdGVycywgdGhlblxuICAgICAgLy8gd3JhcCBpbiBkb3VibGUgcXVvdGVzLiAoVGhlIG91dGVybW9zdCBKU09OLnN0cmluZ2lmeSByZWFsbHkgb3VnaHQgdG9cbiAgICAgIC8vIGp1c3QgYmUgXCJ3cmFwIGluIGRvdWJsZSBxdW90ZXNcIiBidXQgd2UgdXNlIGl0IHRvIGJlIHNhZmUuKSBUaGlzIG1pZ2h0XG4gICAgICAvLyBlbmQgdXAgaW5zaWRlIGEgPHNjcmlwdD4gdGFnIHNvIHdlIG5lZWQgdG8gYmUgY2FyZWZ1bCB0byBub3QgaW5jbHVkZVxuICAgICAgLy8gXCI8L3NjcmlwdD5cIiwgYnV0IG5vcm1hbCB7e3NwYWNlYmFyc319IGVzY2FwaW5nIGVzY2FwZXMgdG9vIG11Y2ghIFNlZVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzM3MzBcbiAgICAgIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgICBtZXRlb3JSdW50aW1lSGFzaDogc2hhMShtZXRlb3JSdW50aW1lQ29uZmlnKSxcbiAgICAgIHJvb3RVcmxQYXRoUHJlZml4OiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnLFxuICAgICAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2s6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICAgICAgc3JpTW9kZTogc3JpTW9kZSxcbiAgICAgIGlubGluZVNjcmlwdHNBbGxvd2VkOiBXZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQoKSxcbiAgICAgIGlubGluZTogYWRkaXRpb25hbE9wdGlvbnMuaW5saW5lXG4gICAgfVxuICB9LCBhZGRpdGlvbmFsT3B0aW9ucykpO1xufTtcblxuLy8gQSBtYXBwaW5nIGZyb20gdXJsIHBhdGggdG8gYXJjaGl0ZWN0dXJlIChlLmcuIFwid2ViLmJyb3dzZXJcIikgdG8gc3RhdGljXG4vLyBmaWxlIGluZm9ybWF0aW9uIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6XG4vLyAtIHR5cGU6IHRoZSB0eXBlIG9mIGZpbGUgdG8gYmUgc2VydmVkXG4vLyAtIGNhY2hlYWJsZTogb3B0aW9uYWxseSwgd2hldGhlciB0aGUgZmlsZSBzaG91bGQgYmUgY2FjaGVkIG9yIG5vdFxuLy8gLSBzb3VyY2VNYXBVcmw6IG9wdGlvbmFsbHksIHRoZSB1cmwgb2YgdGhlIHNvdXJjZSBtYXBcbi8vXG4vLyBJbmZvIGFsc28gY29udGFpbnMgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4vLyAtIGNvbnRlbnQ6IHRoZSBzdHJpbmdpZmllZCBjb250ZW50IHRoYXQgc2hvdWxkIGJlIHNlcnZlZCBhdCB0aGlzIHBhdGhcbi8vIC0gYWJzb2x1dGVQYXRoOiB0aGUgYWJzb2x1dGUgcGF0aCBvbiBkaXNrIHRvIHRoZSBmaWxlXG5cbi8vIFNlcnZlIHN0YXRpYyBmaWxlcyBmcm9tIHRoZSBtYW5pZmVzdCBvciBhZGRlZCB3aXRoXG4vLyBgYWRkU3RhdGljSnNgLiBFeHBvcnRlZCBmb3IgdGVzdHMuXG5XZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlID0gYXN5bmMgZnVuY3Rpb24gKFxuICBzdGF0aWNGaWxlc0J5QXJjaCxcbiAgcmVxLFxuICByZXMsXG4gIG5leHQsXG4pIHtcbiAgaWYgKCdHRVQnICE9IHJlcS5tZXRob2QgJiYgJ0hFQUQnICE9IHJlcS5tZXRob2QgJiYgJ09QVElPTlMnICE9IHJlcS5tZXRob2QpIHtcbiAgICBuZXh0KCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBwYXRobmFtZSA9IHBhcnNlUmVxdWVzdChyZXEpLnBhdGhuYW1lO1xuICB0cnkge1xuICAgIHBhdGhuYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhdGhuYW1lKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgc2VydmVTdGF0aWNKcyA9IGZ1bmN0aW9uIChzKSB7XG4gICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcbiAgICAgICdDb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOCdcbiAgICB9KTtcbiAgICByZXMud3JpdGUocyk7XG4gICAgcmVzLmVuZCgpO1xuICB9O1xuXG4gIGlmIChfLmhhcyhhZGRpdGlvbmFsU3RhdGljSnMsIHBhdGhuYW1lKSAmJlxuICAgICAgICAgICAgICAhIFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpKSB7XG4gICAgc2VydmVTdGF0aWNKcyhhZGRpdGlvbmFsU3RhdGljSnNbcGF0aG5hbWVdKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7IGFyY2gsIHBhdGggfSA9IFdlYkFwcC5jYXRlZ29yaXplUmVxdWVzdChyZXEpO1xuXG4gIGlmICghIGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICAvLyBXZSBjb3VsZCBjb21lIGhlcmUgaW4gY2FzZSB3ZSBydW4gd2l0aCBzb21lIGFyY2hpdGVjdHVyZXMgZXhjbHVkZWRcbiAgICBuZXh0KCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSWYgcGF1c2VDbGllbnQoYXJjaCkgaGFzIGJlZW4gY2FsbGVkLCBwcm9ncmFtLnBhdXNlZCB3aWxsIGJlIGFcbiAgLy8gUHJvbWlzZSB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2hlbiB0aGUgcHJvZ3JhbSBpcyB1bnBhdXNlZC5cbiAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgYXdhaXQgcHJvZ3JhbS5wYXVzZWQ7XG5cbiAgaWYgKHBhdGggPT09IFwiL21ldGVvcl9ydW50aW1lX2NvbmZpZy5qc1wiICYmXG4gICAgICAhIFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpKSB7XG4gICAgc2VydmVTdGF0aWNKcyhgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9ICR7cHJvZ3JhbS5tZXRlb3JSdW50aW1lQ29uZmlnfTtgKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gZ2V0U3RhdGljRmlsZUluZm8oc3RhdGljRmlsZXNCeUFyY2gsIHBhdGhuYW1lLCBwYXRoLCBhcmNoKTtcbiAgaWYgKCEgaW5mbykge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBXZSBkb24ndCBuZWVkIHRvIGNhbGwgcGF1c2UgYmVjYXVzZSwgdW5saWtlICdzdGF0aWMnLCBvbmNlIHdlIGNhbGwgaW50b1xuICAvLyAnc2VuZCcgYW5kIHlpZWxkIHRvIHRoZSBldmVudCBsb29wLCB3ZSBuZXZlciBjYWxsIGFub3RoZXIgaGFuZGxlciB3aXRoXG4gIC8vICduZXh0Jy5cblxuICAvLyBDYWNoZWFibGUgZmlsZXMgYXJlIGZpbGVzIHRoYXQgc2hvdWxkIG5ldmVyIGNoYW5nZS4gVHlwaWNhbGx5XG4gIC8vIG5hbWVkIGJ5IHRoZWlyIGhhc2ggKGVnIG1ldGVvciBidW5kbGVkIGpzIGFuZCBjc3MgZmlsZXMpLlxuICAvLyBXZSBjYWNoZSB0aGVtIH5mb3JldmVyICgxeXIpLlxuICBjb25zdCBtYXhBZ2UgPSBpbmZvLmNhY2hlYWJsZVxuICAgID8gMTAwMCAqIDYwICogNjAgKiAyNCAqIDM2NVxuICAgIDogMDtcblxuICBpZiAoaW5mby5jYWNoZWFibGUpIHtcbiAgICAvLyBTaW5jZSB3ZSB1c2UgcmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZVxuICAgIC8vIGNsaWVudCBzaG91bGQgcmVjZWl2ZSBtb2Rlcm4gb3IgbGVnYWN5IHJlc291cmNlcywgdGVsbCB0aGUgY2xpZW50XG4gICAgLy8gdG8gaW52YWxpZGF0ZSBjYWNoZWQgcmVzb3VyY2VzIHdoZW4vaWYgaXRzIHVzZXIgYWdlbnQgc3RyaW5nXG4gICAgLy8gY2hhbmdlcyBpbiB0aGUgZnV0dXJlLlxuICAgIHJlcy5zZXRIZWFkZXIoXCJWYXJ5XCIsIFwiVXNlci1BZ2VudFwiKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgWC1Tb3VyY2VNYXAgaGVhZGVyLCB3aGljaCBjdXJyZW50IENocm9tZSwgRmlyZUZveCwgYW5kIFNhZmFyaVxuICAvLyB1bmRlcnN0YW5kLiAgKFRoZSBTb3VyY2VNYXAgaGVhZGVyIGlzIHNsaWdodGx5IG1vcmUgc3BlYy1jb3JyZWN0IGJ1dCBGRlxuICAvLyBkb2Vzbid0IHVuZGVyc3RhbmQgaXQuKVxuICAvL1xuICAvLyBZb3UgbWF5IGFsc28gbmVlZCB0byBlbmFibGUgc291cmNlIG1hcHMgaW4gQ2hyb21lOiBvcGVuIGRldiB0b29scywgY2xpY2tcbiAgLy8gdGhlIGdlYXIgaW4gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIsIGFuZCBzZWxlY3QgXCJlbmFibGUgc291cmNlIG1hcHNcIi5cbiAgaWYgKGluZm8uc291cmNlTWFwVXJsKSB7XG4gICAgcmVzLnNldEhlYWRlcignWC1Tb3VyY2VNYXAnLFxuICAgICAgICAgICAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCArXG4gICAgICAgICAgICAgICAgICBpbmZvLnNvdXJjZU1hcFVybCk7XG4gIH1cblxuICBpZiAoaW5mby50eXBlID09PSBcImpzXCIgfHxcbiAgICAgIGluZm8udHlwZSA9PT0gXCJkeW5hbWljIGpzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwiY3NzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwidGV4dC9jc3M7IGNoYXJzZXQ9VVRGLThcIik7XG4gIH0gZWxzZSBpZiAoaW5mby50eXBlID09PSBcImpzb25cIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCIpO1xuICB9XG5cbiAgaWYgKGluZm8uaGFzaCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0VUYWcnLCAnXCInICsgaW5mby5oYXNoICsgJ1wiJyk7XG4gIH1cblxuICBpZiAoaW5mby5jb250ZW50KSB7XG4gICAgcmVzLndyaXRlKGluZm8uY29udGVudCk7XG4gICAgcmVzLmVuZCgpO1xuICB9IGVsc2Uge1xuICAgIHNlbmQocmVxLCBpbmZvLmFic29sdXRlUGF0aCwge1xuICAgICAgbWF4YWdlOiBtYXhBZ2UsXG4gICAgICBkb3RmaWxlczogJ2FsbG93JywgLy8gaWYgd2Ugc3BlY2lmaWVkIGEgZG90ZmlsZSBpbiB0aGUgbWFuaWZlc3QsIHNlcnZlIGl0XG4gICAgICBsYXN0TW9kaWZpZWQ6IGZhbHNlIC8vIGRvbid0IHNldCBsYXN0LW1vZGlmaWVkIGJhc2VkIG9uIHRoZSBmaWxlIGRhdGVcbiAgICB9KS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBMb2cuZXJyb3IoXCJFcnJvciBzZXJ2aW5nIHN0YXRpYyBmaWxlIFwiICsgZXJyKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICB9KS5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgICAgTG9nLmVycm9yKFwiVW5leHBlY3RlZCBkaXJlY3RvcnkgXCIgKyBpbmZvLmFic29sdXRlUGF0aCk7XG4gICAgICByZXMud3JpdGVIZWFkKDUwMCk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfSkucGlwZShyZXMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRTdGF0aWNGaWxlSW5mbyhzdGF0aWNGaWxlc0J5QXJjaCwgb3JpZ2luYWxQYXRoLCBwYXRoLCBhcmNoKSB7XG4gIGlmICghIGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEdldCBhIGxpc3Qgb2YgYWxsIGF2YWlsYWJsZSBzdGF0aWMgZmlsZSBhcmNoaXRlY3R1cmVzLCB3aXRoIGFyY2hcbiAgLy8gZmlyc3QgaW4gdGhlIGxpc3QgaWYgaXQgZXhpc3RzLlxuICBjb25zdCBzdGF0aWNBcmNoTGlzdCA9IE9iamVjdC5rZXlzKHN0YXRpY0ZpbGVzQnlBcmNoKTtcbiAgY29uc3QgYXJjaEluZGV4ID0gc3RhdGljQXJjaExpc3QuaW5kZXhPZihhcmNoKTtcbiAgaWYgKGFyY2hJbmRleCA+IDApIHtcbiAgICBzdGF0aWNBcmNoTGlzdC51bnNoaWZ0KHN0YXRpY0FyY2hMaXN0LnNwbGljZShhcmNoSW5kZXgsIDEpWzBdKTtcbiAgfVxuXG4gIGxldCBpbmZvID0gbnVsbDtcblxuICBzdGF0aWNBcmNoTGlzdC5zb21lKGFyY2ggPT4ge1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF07XG5cbiAgICBmdW5jdGlvbiBmaW5hbGl6ZShwYXRoKSB7XG4gICAgICBpbmZvID0gc3RhdGljRmlsZXNbcGF0aF07XG4gICAgICAvLyBTb21ldGltZXMgd2UgcmVnaXN0ZXIgYSBsYXp5IGZ1bmN0aW9uIGluc3RlYWQgb2YgYWN0dWFsIGRhdGEgaW5cbiAgICAgIC8vIHRoZSBzdGF0aWNGaWxlcyBtYW5pZmVzdC5cbiAgICAgIGlmICh0eXBlb2YgaW5mbyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGluZm8gPSBzdGF0aWNGaWxlc1twYXRoXSA9IGluZm8oKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIElmIHN0YXRpY0ZpbGVzIGNvbnRhaW5zIG9yaWdpbmFsUGF0aCB3aXRoIHRoZSBhcmNoIGluZmVycmVkIGFib3ZlLFxuICAgIC8vIHVzZSB0aGF0IGluZm9ybWF0aW9uLlxuICAgIGlmIChoYXNPd24uY2FsbChzdGF0aWNGaWxlcywgb3JpZ2luYWxQYXRoKSkge1xuICAgICAgcmV0dXJuIGZpbmFsaXplKG9yaWdpbmFsUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gSWYgY2F0ZWdvcml6ZVJlcXVlc3QgcmV0dXJuZWQgYW4gYWx0ZXJuYXRlIHBhdGgsIHRyeSB0aGF0IGluc3RlYWQuXG4gICAgaWYgKHBhdGggIT09IG9yaWdpbmFsUGF0aCAmJlxuICAgICAgICBoYXNPd24uY2FsbChzdGF0aWNGaWxlcywgcGF0aCkpIHtcbiAgICAgIHJldHVybiBmaW5hbGl6ZShwYXRoKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpbmZvO1xufVxuXG4vLyBQYXJzZSB0aGUgcGFzc2VkIGluIHBvcnQgdmFsdWUuIFJldHVybiB0aGUgcG9ydCBhcy1pcyBpZiBpdCdzIGEgU3RyaW5nXG4vLyAoZS5nLiBhIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUpLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBwb3J0IGFzIGFuXG4vLyBpbnRlZ2VyLlxuLy9cbi8vIERFUFJFQ0FURUQ6IERpcmVjdCB1c2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyBub3QgcmVjb21tZW5kZWQ7IGl0IGlzIG5vXG4vLyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5LCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHJlbGVhc2UuXG5XZWJBcHBJbnRlcm5hbHMucGFyc2VQb3J0ID0gcG9ydCA9PiB7XG4gIGxldCBwYXJzZWRQb3J0ID0gcGFyc2VJbnQocG9ydCk7XG4gIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VkUG9ydCkpIHtcbiAgICBwYXJzZWRQb3J0ID0gcG9ydDtcbiAgfVxuICByZXR1cm4gcGFyc2VkUG9ydDtcbn1cblxuaW1wb3J0IHsgb25NZXNzYWdlIH0gZnJvbSBcIm1ldGVvci9pbnRlci1wcm9jZXNzLW1lc3NhZ2luZ1wiO1xuXG5vbk1lc3NhZ2UoXCJ3ZWJhcHAtcGF1c2UtY2xpZW50XCIsIGFzeW5jICh7IGFyY2ggfSkgPT4ge1xuICBXZWJBcHBJbnRlcm5hbHMucGF1c2VDbGllbnQoYXJjaCk7XG59KTtcblxub25NZXNzYWdlKFwid2ViYXBwLXJlbG9hZC1jbGllbnRcIiwgYXN5bmMgKHsgYXJjaCB9KSA9PiB7XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCk7XG59KTtcblxuZnVuY3Rpb24gcnVuV2ViQXBwU2VydmVyKCkge1xuICB2YXIgc2h1dHRpbmdEb3duID0gZmFsc2U7XG4gIHZhciBzeW5jUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGdldEl0ZW1QYXRobmFtZSA9IGZ1bmN0aW9uIChpdGVtVXJsKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYXJzZVVybChpdGVtVXJsKS5wYXRobmFtZSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3Qgc3RhdGljRmlsZXNCeUFyY2ggPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICBjb25zdCB7IGNvbmZpZ0pzb24gfSA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fO1xuICAgICAgY29uc3QgY2xpZW50QXJjaHMgPSBjb25maWdKc29uLmNsaWVudEFyY2hzIHx8XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbmZpZ0pzb24uY2xpZW50UGF0aHMpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjbGllbnRBcmNocy5mb3JFYWNoKGFyY2ggPT4ge1xuICAgICAgICAgIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShhcmNoLCBzdGF0aWNGaWxlc0J5QXJjaCk7XG4gICAgICAgIH0pO1xuICAgICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNCeUFyY2ggPSBzdGF0aWNGaWxlc0J5QXJjaDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nLmVycm9yKFwiRXJyb3IgcmVsb2FkaW5nIHRoZSBjbGllbnQgcHJvZ3JhbTogXCIgKyBlLnN0YWNrKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIFBhdXNlIGFueSBpbmNvbWluZyByZXF1ZXN0cyBhbmQgbWFrZSB0aGVtIHdhaXQgZm9yIHRoZSBwcm9ncmFtIHRvIGJlXG4gIC8vIHVucGF1c2VkIHRoZSBuZXh0IHRpbWUgZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gpIGlzIGNhbGxlZC5cbiAgV2ViQXBwSW50ZXJuYWxzLnBhdXNlQ2xpZW50ID0gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICBzeW5jUXVldWUucnVuVGFzaygoKSA9PiB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgICAgY29uc3QgeyB1bnBhdXNlIH0gPSBwcm9ncmFtO1xuICAgICAgcHJvZ3JhbS5wYXVzZWQgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB1bnBhdXNlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBoYXBwZW5zIHRvIGJlIGFuIGV4aXN0aW5nIHByb2dyYW0udW5wYXVzZSBmdW5jdGlvbixcbiAgICAgICAgICAvLyBjb21wb3NlIGl0IHdpdGggdGhlIHJlc29sdmUgZnVuY3Rpb24uXG4gICAgICAgICAgcHJvZ3JhbS51bnBhdXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdW5wYXVzZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJvZ3JhbS51bnBhdXNlID0gcmVzb2x2ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQ2xpZW50UHJvZ3JhbSA9IGZ1bmN0aW9uIChhcmNoKSB7XG4gICAgc3luY1F1ZXVlLnJ1blRhc2soKCkgPT4gZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gpKTtcbiAgfTtcblxuICBmdW5jdGlvbiBnZW5lcmF0ZUNsaWVudFByb2dyYW0oXG4gICAgYXJjaCxcbiAgICBzdGF0aWNGaWxlc0J5QXJjaCA9IFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc0J5QXJjaCxcbiAgKSB7XG4gICAgY29uc3QgY2xpZW50RGlyID0gcGF0aEpvaW4oXG4gICAgICBwYXRoRGlybmFtZShfX21ldGVvcl9ib290c3RyYXBfXy5zZXJ2ZXJEaXIpLFxuICAgICAgYXJjaCxcbiAgICApO1xuXG4gICAgLy8gcmVhZCB0aGUgY29udHJvbCBmb3IgdGhlIGNsaWVudCB3ZSdsbCBiZSBzZXJ2aW5nIHVwXG4gICAgY29uc3QgcHJvZ3JhbUpzb25QYXRoID0gcGF0aEpvaW4oY2xpZW50RGlyLCBcInByb2dyYW0uanNvblwiKTtcblxuICAgIGxldCBwcm9ncmFtSnNvbjtcbiAgICB0cnkge1xuICAgICAgcHJvZ3JhbUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwcm9ncmFtSnNvblBhdGgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSBcIkVOT0VOVFwiKSByZXR1cm47XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChwcm9ncmFtSnNvbi5mb3JtYXQgIT09IFwid2ViLXByb2dyYW0tcHJlMVwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBmb3JtYXQgZm9yIGNsaWVudCBhc3NldHM6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShwcm9ncmFtSnNvbi5mb3JtYXQpKTtcbiAgICB9XG5cbiAgICBpZiAoISBwcm9ncmFtSnNvblBhdGggfHwgISBjbGllbnREaXIgfHwgISBwcm9ncmFtSnNvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2xpZW50IGNvbmZpZyBmaWxlIG5vdCBwYXJzZWQuXCIpO1xuICAgIH1cblxuICAgIGFyY2hQYXRoW2FyY2hdID0gY2xpZW50RGlyO1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgY29uc3QgeyBtYW5pZmVzdCB9ID0gcHJvZ3JhbUpzb247XG4gICAgbWFuaWZlc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgIGlmIChpdGVtLnVybCAmJiBpdGVtLndoZXJlID09PSBcImNsaWVudFwiKSB7XG4gICAgICAgIHN0YXRpY0ZpbGVzW2dldEl0ZW1QYXRobmFtZShpdGVtLnVybCldID0ge1xuICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnBhdGgpLFxuICAgICAgICAgIGNhY2hlYWJsZTogaXRlbS5jYWNoZWFibGUsXG4gICAgICAgICAgaGFzaDogaXRlbS5oYXNoLFxuICAgICAgICAgIC8vIExpbmsgZnJvbSBzb3VyY2UgdG8gaXRzIG1hcFxuICAgICAgICAgIHNvdXJjZU1hcFVybDogaXRlbS5zb3VyY2VNYXBVcmwsXG4gICAgICAgICAgdHlwZTogaXRlbS50eXBlXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGl0ZW0uc291cmNlTWFwKSB7XG4gICAgICAgICAgLy8gU2VydmUgdGhlIHNvdXJjZSBtYXAgdG9vLCB1bmRlciB0aGUgc3BlY2lmaWVkIFVSTC4gV2UgYXNzdW1lXG4gICAgICAgICAgLy8gYWxsIHNvdXJjZSBtYXBzIGFyZSBjYWNoZWFibGUuXG4gICAgICAgICAgc3RhdGljRmlsZXNbZ2V0SXRlbVBhdGhuYW1lKGl0ZW0uc291cmNlTWFwVXJsKV0gPSB7XG4gICAgICAgICAgICBhYnNvbHV0ZVBhdGg6IHBhdGhKb2luKGNsaWVudERpciwgaXRlbS5zb3VyY2VNYXApLFxuICAgICAgICAgICAgY2FjaGVhYmxlOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBQVUJMSUNfU0VUVElOR1MgfSA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX187XG4gICAgY29uc3QgY29uZmlnT3ZlcnJpZGVzID0ge1xuICAgICAgUFVCTElDX1NFVFRJTkdTLFxuICAgIH07XG5cbiAgICBjb25zdCBvbGRQcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgIGNvbnN0IG5ld1Byb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF0gPSB7XG4gICAgICBmb3JtYXQ6IFwid2ViLXByb2dyYW0tcHJlMVwiLFxuICAgICAgbWFuaWZlc3Q6IG1hbmlmZXN0LFxuICAgICAgLy8gVXNlIGFycm93IGZ1bmN0aW9ucyBzbyB0aGF0IHRoZXNlIHZlcnNpb25zIGNhbiBiZSBsYXppbHlcbiAgICAgIC8vIGNhbGN1bGF0ZWQgbGF0ZXIsIGFuZCBzbyB0aGF0IHRoZXkgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlXG4gICAgICAvLyBzdGF0aWNGaWxlc1ttYW5pZmVzdFVybF0uY29udGVudCBzdHJpbmcgYmVsb3cuXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogdGhlc2UgdmVyc2lvbiBjYWxjdWxhdGlvbnMgbXVzdCBiZSBrZXB0IGluIGFncmVlbWVudCB3aXRoXG4gICAgICAvLyBDb3Jkb3ZhQnVpbGRlciNhcHBlbmRWZXJzaW9uIGluIHRvb2xzL2NvcmRvdmEvYnVpbGRlci5qcywgb3IgaG90XG4gICAgICAvLyBjb2RlIHB1c2ggd2lsbCByZWxvYWQgQ29yZG92YSBhcHBzIHVubmVjZXNzYXJpbHkuXG4gICAgICB2ZXJzaW9uOiAoKSA9PiBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgIG1hbmlmZXN0LCBudWxsLCBjb25maWdPdmVycmlkZXMpLFxuICAgICAgdmVyc2lvblJlZnJlc2hhYmxlOiAoKSA9PiBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgIG1hbmlmZXN0LCB0eXBlID0+IHR5cGUgPT09IFwiY3NzXCIsIGNvbmZpZ092ZXJyaWRlcyksXG4gICAgICB2ZXJzaW9uTm9uUmVmcmVzaGFibGU6ICgpID0+IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgbWFuaWZlc3QsICh0eXBlLCByZXBsYWNlYWJsZSkgPT4gdHlwZSAhPT0gXCJjc3NcIiAmJiAhcmVwbGFjZWFibGUsIGNvbmZpZ092ZXJyaWRlcyksXG4gICAgICB2ZXJzaW9uUmVwbGFjZWFibGU6ICgpID0+IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgbWFuaWZlc3QsIChfdHlwZSwgcmVwbGFjZWFibGUpID0+IHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLmlzUHJvZHVjdGlvbiAmJiByZXBsYWNlYWJsZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHJlcGxhY2VhYmxlIGZpbGUgaW4gcHJvZHVjdGlvbicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByZXBsYWNlYWJsZVxuICAgICAgICB9LFxuICAgICAgICBjb25maWdPdmVycmlkZXNcbiAgICAgICksXG4gICAgICBjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zOiBwcm9ncmFtSnNvbi5jb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zLFxuICAgICAgUFVCTElDX1NFVFRJTkdTLFxuICAgIH07XG5cbiAgICAvLyBFeHBvc2UgcHJvZ3JhbSBkZXRhaWxzIGFzIGEgc3RyaW5nIHJlYWNoYWJsZSB2aWEgdGhlIGZvbGxvd2luZyBVUkwuXG4gICAgY29uc3QgbWFuaWZlc3RVcmxQcmVmaXggPSBcIi9fX1wiICsgYXJjaC5yZXBsYWNlKC9ed2ViXFwuLywgXCJcIik7XG4gICAgY29uc3QgbWFuaWZlc3RVcmwgPSBtYW5pZmVzdFVybFByZWZpeCArIGdldEl0ZW1QYXRobmFtZShcIi9tYW5pZmVzdC5qc29uXCIpO1xuXG4gICAgc3RhdGljRmlsZXNbbWFuaWZlc3RVcmxdID0gKCkgPT4ge1xuICAgICAgaWYgKFBhY2thZ2UuYXV0b3VwZGF0ZSkge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgQVVUT1VQREFURV9WRVJTSU9OID1cbiAgICAgICAgICAgIFBhY2thZ2UuYXV0b3VwZGF0ZS5BdXRvdXBkYXRlLmF1dG91cGRhdGVWZXJzaW9uXG4gICAgICAgIH0gPSBwcm9jZXNzLmVudjtcblxuICAgICAgICBpZiAoQVVUT1VQREFURV9WRVJTSU9OKSB7XG4gICAgICAgICAgbmV3UHJvZ3JhbS52ZXJzaW9uID0gQVVUT1VQREFURV9WRVJTSU9OO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgbmV3UHJvZ3JhbS52ZXJzaW9uID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgbmV3UHJvZ3JhbS52ZXJzaW9uID0gbmV3UHJvZ3JhbS52ZXJzaW9uKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KG5ld1Byb2dyYW0pLFxuICAgICAgICBjYWNoZWFibGU6IGZhbHNlLFxuICAgICAgICBoYXNoOiBuZXdQcm9ncmFtLnZlcnNpb24sXG4gICAgICAgIHR5cGU6IFwianNvblwiXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaChhcmNoKTtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgcmVxdWVzdHMgd2FpdGluZyBvbiBvbGRQcm9ncmFtLnBhdXNlZCwgbGV0IHRoZW1cbiAgICAvLyBjb250aW51ZSBub3cgKHVzaW5nIHRoZSBuZXcgcHJvZ3JhbSkuXG4gICAgaWYgKG9sZFByb2dyYW0gJiZcbiAgICAgICAgb2xkUHJvZ3JhbS5wYXVzZWQpIHtcbiAgICAgIG9sZFByb2dyYW0udW5wYXVzZSgpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBkZWZhdWx0T3B0aW9uc0ZvckFyY2ggPSB7XG4gICAgJ3dlYi5jb3Jkb3ZhJzoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICAvLyBYWFggV2UgdXNlIGFic29sdXRlVXJsKCkgaGVyZSBzbyB0aGF0IHdlIHNlcnZlIGh0dHBzOi8vXG4gICAgICAgIC8vIFVSTHMgdG8gY29yZG92YSBjbGllbnRzIGlmIGZvcmNlLXNzbCBpcyBpbiB1c2UuIElmIHdlIHdlcmVcbiAgICAgICAgLy8gdG8gdXNlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgaW5zdGVhZCBvZlxuICAgICAgICAvLyBhYnNvbHV0ZVVybCgpLCB0aGVuIENvcmRvdmEgY2xpZW50cyB3b3VsZCBpbW1lZGlhdGVseSBnZXQgYVxuICAgICAgICAvLyBIQ1Agc2V0dGluZyB0aGVpciBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCB0b1xuICAgICAgICAvLyBodHRwOi8vZXhhbXBsZS5tZXRlb3IuY29tLiBUaGlzIGJyZWFrcyB0aGUgYXBwLCBiZWNhdXNlXG4gICAgICAgIC8vIGZvcmNlLXNzbCBkb2Vzbid0IHNlcnZlIENPUlMgaGVhZGVycyBvbiAzMDJcbiAgICAgICAgLy8gcmVkaXJlY3RzLiAoUGx1cyBpdCdzIHVuZGVzaXJhYmxlIHRvIGhhdmUgY2xpZW50c1xuICAgICAgICAvLyBjb25uZWN0aW5nIHRvIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20gd2hlbiBmb3JjZS1zc2wgaXNcbiAgICAgICAgLy8gaW4gdXNlLilcbiAgICAgICAgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ERFBfVVJMIHx8XG4gICAgICAgICAgTWV0ZW9yLmFic29sdXRlVXJsKCksXG4gICAgICAgIFJPT1RfVVJMOiBwcm9jZXNzLmVudi5NT0JJTEVfUk9PVF9VUkwgfHxcbiAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBcIndlYi5icm93c2VyXCI6IHtcbiAgICAgIHJ1bnRpbWVDb25maWdPdmVycmlkZXM6IHtcbiAgICAgICAgaXNNb2Rlcm46IHRydWUsXG4gICAgICB9XG4gICAgfSxcblxuICAgIFwid2ViLmJyb3dzZXIubGVnYWN5XCI6IHtcbiAgICAgIHJ1bnRpbWVDb25maWdPdmVycmlkZXM6IHtcbiAgICAgICAgaXNNb2Rlcm46IGZhbHNlLFxuICAgICAgfVxuICAgIH0sXG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVGhpcyBib2lsZXJwbGF0ZSB3aWxsIGJlIHNlcnZlZCB0byB0aGUgbW9iaWxlIGRldmljZXMgd2hlbiB1c2VkIHdpdGhcbiAgICAvLyBNZXRlb3IvQ29yZG92YSBmb3IgdGhlIEhvdC1Db2RlIFB1c2ggYW5kIHNpbmNlIHRoZSBmaWxlIHdpbGwgYmUgc2VydmVkIGJ5XG4gICAgLy8gdGhlIGRldmljZSdzIHNlcnZlciwgaXQgaXMgaW1wb3J0YW50IHRvIHNldCB0aGUgRERQIHVybCB0byB0aGUgYWN0dWFsXG4gICAgLy8gTWV0ZW9yIHNlcnZlciBhY2NlcHRpbmcgRERQIGNvbm5lY3Rpb25zIGFuZCBub3QgdGhlIGRldmljZSdzIGZpbGUgc2VydmVyLlxuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgT2JqZWN0LmtleXMoV2ViQXBwLmNsaWVudFByb2dyYW1zKVxuICAgICAgICAuZm9yRWFjaChnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaCk7XG4gICAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVCb2lsZXJwbGF0ZUZvckFyY2goYXJjaCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgY29uc3QgYWRkaXRpb25hbE9wdGlvbnMgPSBkZWZhdWx0T3B0aW9uc0ZvckFyY2hbYXJjaF0gfHwge307XG4gICAgY29uc3QgeyBiYXNlRGF0YSB9ID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaF0gPVxuICAgICAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZShcbiAgICAgICAgYXJjaCxcbiAgICAgICAgcHJvZ3JhbS5tYW5pZmVzdCxcbiAgICAgICAgYWRkaXRpb25hbE9wdGlvbnMsXG4gICAgICApO1xuICAgIC8vIFdlIG5lZWQgdGhlIHJ1bnRpbWUgY29uZmlnIHdpdGggb3ZlcnJpZGVzIGZvciBtZXRlb3JfcnVudGltZV9jb25maWcuanM6XG4gICAgcHJvZ3JhbS5tZXRlb3JSdW50aW1lQ29uZmlnID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgLi4uX19tZXRlb3JfcnVudGltZV9jb25maWdfXyxcbiAgICAgIC4uLihhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IG51bGwpLFxuICAgIH0pO1xuICAgIHByb2dyYW0ucmVmcmVzaGFibGVBc3NldHMgPSBiYXNlRGF0YS5jc3MubWFwKGZpbGUgPT4gKHtcbiAgICAgIHVybDogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soZmlsZS51cmwpLFxuICAgIH0pKTtcbiAgfVxuXG4gIFdlYkFwcEludGVybmFscy5yZWxvYWRDbGllbnRQcm9ncmFtcygpO1xuXG4gIC8vIHdlYnNlcnZlclxuICB2YXIgYXBwID0gY29ubmVjdCgpO1xuXG4gIC8vIFBhY2thZ2VzIGFuZCBhcHBzIGNhbiBhZGQgaGFuZGxlcnMgdGhhdCBydW4gYmVmb3JlIGFueSBvdGhlciBNZXRlb3JcbiAgLy8gaGFuZGxlcnMgdmlhIFdlYkFwcC5yYXdDb25uZWN0SGFuZGxlcnMuXG4gIHZhciByYXdDb25uZWN0SGFuZGxlcnMgPSBjb25uZWN0KCk7XG4gIGFwcC51c2UocmF3Q29ubmVjdEhhbmRsZXJzKTtcblxuICAvLyBBdXRvLWNvbXByZXNzIGFueSBqc29uLCBqYXZhc2NyaXB0LCBvciB0ZXh0LlxuICBhcHAudXNlKGNvbXByZXNzKHtmaWx0ZXI6IHNob3VsZENvbXByZXNzfSkpO1xuXG4gIC8vIHBhcnNlIGNvb2tpZXMgaW50byBhbiBvYmplY3RcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG5cbiAgLy8gV2UncmUgbm90IGEgcHJveHk7IHJlamVjdCAod2l0aG91dCBjcmFzaGluZykgYXR0ZW1wdHMgdG8gdHJlYXQgdXMgbGlrZVxuICAvLyBvbmUuIChTZWUgIzEyMTIuKVxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKFJvdXRlUG9saWN5LmlzVmFsaWRVcmwocmVxLnVybCkpIHtcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgIHJlcy53cml0ZShcIk5vdCBhIHByb3h5XCIpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cbiAgLy8gUGFyc2UgdGhlIHF1ZXJ5IHN0cmluZyBpbnRvIHJlcy5xdWVyeS4gVXNlZCBieSBvYXV0aF9zZXJ2ZXIsIGJ1dCBpdCdzXG4gIC8vIGdlbmVyYWxseSBwcmV0dHkgaGFuZHkuLlxuICAvL1xuICAvLyBEbyB0aGlzIGJlZm9yZSB0aGUgbmV4dCBtaWRkbGV3YXJlIGRlc3Ryb3lzIHJlcS51cmwgaWYgYSBwYXRoIHByZWZpeFxuICAvLyBpcyBzZXQgdG8gY2xvc2UgIzEwMTExLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIHJlcXVlc3QucXVlcnkgPSBxcy5wYXJzZShwYXJzZVVybChyZXF1ZXN0LnVybCkucXVlcnkpO1xuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZ2V0UGF0aFBhcnRzKHBhdGgpIHtcbiAgICBjb25zdCBwYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICAgIHdoaWxlIChwYXJ0c1swXSA9PT0gXCJcIikgcGFydHMuc2hpZnQoKTtcbiAgICByZXR1cm4gcGFydHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc1ByZWZpeE9mKHByZWZpeCwgYXJyYXkpIHtcbiAgICByZXR1cm4gcHJlZml4Lmxlbmd0aCA8PSBhcnJheS5sZW5ndGggJiZcbiAgICAgIHByZWZpeC5ldmVyeSgocGFydCwgaSkgPT4gcGFydCA9PT0gYXJyYXlbaV0pO1xuICB9XG5cbiAgLy8gU3RyaXAgb2ZmIHRoZSBwYXRoIHByZWZpeCwgaWYgaXQgZXhpc3RzLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIGNvbnN0IHBhdGhQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuICAgIGNvbnN0IHsgcGF0aG5hbWUsIHNlYXJjaCB9ID0gcGFyc2VVcmwocmVxdWVzdC51cmwpO1xuXG4gICAgLy8gY2hlY2sgaWYgdGhlIHBhdGggaW4gdGhlIHVybCBzdGFydHMgd2l0aCB0aGUgcGF0aCBwcmVmaXhcbiAgICBpZiAocGF0aFByZWZpeCkge1xuICAgICAgY29uc3QgcHJlZml4UGFydHMgPSBnZXRQYXRoUGFydHMocGF0aFByZWZpeCk7XG4gICAgICBjb25zdCBwYXRoUGFydHMgPSBnZXRQYXRoUGFydHMocGF0aG5hbWUpO1xuICAgICAgaWYgKGlzUHJlZml4T2YocHJlZml4UGFydHMsIHBhdGhQYXJ0cykpIHtcbiAgICAgICAgcmVxdWVzdC51cmwgPSBcIi9cIiArIHBhdGhQYXJ0cy5zbGljZShwcmVmaXhQYXJ0cy5sZW5ndGgpLmpvaW4oXCIvXCIpO1xuICAgICAgICBpZiAoc2VhcmNoKSB7XG4gICAgICAgICAgcmVxdWVzdC51cmwgKz0gc2VhcmNoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBhdGhuYW1lID09PSBcIi9mYXZpY29uLmljb1wiIHx8XG4gICAgICAgIHBhdGhuYW1lID09PSBcIi9yb2JvdHMudHh0XCIpIHtcbiAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgfVxuXG4gICAgaWYgKHBhdGhQcmVmaXgpIHtcbiAgICAgIHJlc3BvbnNlLndyaXRlSGVhZCg0MDQpO1xuICAgICAgcmVzcG9uc2Uud3JpdGUoXCJVbmtub3duIHBhdGhcIik7XG4gICAgICByZXNwb25zZS5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBuZXh0KCk7XG4gIH0pO1xuXG4gIC8vIFNlcnZlIHN0YXRpYyBmaWxlcyBmcm9tIHRoZSBtYW5pZmVzdC5cbiAgLy8gVGhpcyBpcyBpbnNwaXJlZCBieSB0aGUgJ3N0YXRpYycgbWlkZGxld2FyZS5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlKFxuICAgICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzQnlBcmNoLFxuICAgICAgcmVxLCByZXMsIG5leHRcbiAgICApO1xuICB9KTtcblxuICAvLyBDb3JlIE1ldGVvciBwYWNrYWdlcyBsaWtlIGR5bmFtaWMtaW1wb3J0IGNhbiBhZGQgaGFuZGxlcnMgYmVmb3JlXG4gIC8vIG90aGVyIGhhbmRsZXJzIGFkZGVkIGJ5IHBhY2thZ2UgYW5kIGFwcGxpY2F0aW9uIGNvZGUuXG4gIGFwcC51c2UoV2ViQXBwSW50ZXJuYWxzLm1ldGVvckludGVybmFsSGFuZGxlcnMgPSBjb25uZWN0KCkpO1xuXG4gIC8vIFBhY2thZ2VzIGFuZCBhcHBzIGNhbiBhZGQgaGFuZGxlcnMgdG8gdGhpcyB2aWEgV2ViQXBwLmNvbm5lY3RIYW5kbGVycy5cbiAgLy8gVGhleSBhcmUgaW5zZXJ0ZWQgYmVmb3JlIG91ciBkZWZhdWx0IGhhbmRsZXIuXG4gIHZhciBwYWNrYWdlQW5kQXBwSGFuZGxlcnMgPSBjb25uZWN0KCk7XG4gIGFwcC51c2UocGFja2FnZUFuZEFwcEhhbmRsZXJzKTtcblxuICB2YXIgc3VwcHJlc3NDb25uZWN0RXJyb3JzID0gZmFsc2U7XG4gIC8vIGNvbm5lY3Qga25vd3MgaXQgaXMgYW4gZXJyb3IgaGFuZGxlciBiZWNhdXNlIGl0IGhhcyA0IGFyZ3VtZW50cyBpbnN0ZWFkIG9mXG4gIC8vIDMuIGdvIGZpZ3VyZS4gIChJdCBpcyBub3Qgc21hcnQgZW5vdWdoIHRvIGZpbmQgc3VjaCBhIHRoaW5nIGlmIGl0J3MgaGlkZGVuXG4gIC8vIGluc2lkZSBwYWNrYWdlQW5kQXBwSGFuZGxlcnMuKVxuICBhcHAudXNlKGZ1bmN0aW9uIChlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKCFlcnIgfHwgIXN1cHByZXNzQ29ubmVjdEVycm9ycyB8fCAhcmVxLmhlYWRlcnNbJ3gtc3VwcHJlc3MtZXJyb3InXSkge1xuICAgICAgbmV4dChlcnIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMud3JpdGVIZWFkKGVyci5zdGF0dXMsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICByZXMuZW5kKFwiQW4gZXJyb3IgbWVzc2FnZVwiKTtcbiAgfSk7XG5cbiAgYXBwLnVzZShhc3luYyBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoISBhcHBVcmwocmVxLnVybCkpIHtcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGhlYWRlcnMgPSB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04J1xuICAgICAgfTtcblxuICAgICAgaWYgKHNodXR0aW5nRG93bikge1xuICAgICAgICBoZWFkZXJzWydDb25uZWN0aW9uJ10gPSAnQ2xvc2UnO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVxdWVzdCA9IFdlYkFwcC5jYXRlZ29yaXplUmVxdWVzdChyZXEpO1xuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9jc3NfcmVzb3VyY2UnXSkge1xuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIHdlJ3JlIHJlcXVlc3RpbmcgYSBDU1MgcmVzb3VyY2UgaW4gdGhlIG1ldGVvci1zcGVjaWZpY1xuICAgICAgICAvLyB3YXksIGJ1dCB3ZSBkb24ndCBoYXZlIGl0LiAgU2VydmUgYSBzdGF0aWMgY3NzIGZpbGUgdGhhdCBpbmRpY2F0ZXMgdGhhdFxuICAgICAgICAvLyB3ZSBkaWRuJ3QgaGF2ZSBpdCwgc28gd2UgY2FuIGRldGVjdCB0aGF0IGFuZCByZWZyZXNoLiAgTWFrZSBzdXJlXG4gICAgICAgIC8vIHRoYXQgYW55IHByb3hpZXMgb3IgQ0ROcyBkb24ndCBjYWNoZSB0aGlzIGVycm9yISAgKE5vcm1hbGx5IHByb3hpZXNcbiAgICAgICAgLy8gb3IgQ0ROcyBhcmUgc21hcnQgZW5vdWdoIG5vdCB0byBjYWNoZSBlcnJvciBwYWdlcywgYnV0IGluIG9yZGVyIHRvXG4gICAgICAgIC8vIG1ha2UgdGhpcyBoYWNrIHdvcmssIHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBDU1MgZmlsZSBhcyBhIDIwMCwgd2hpY2hcbiAgICAgICAgLy8gd291bGQgb3RoZXJ3aXNlIGJlIGNhY2hlZC4pXG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ3RleHQvY3NzOyBjaGFyc2V0PXV0Zi04JztcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIGhlYWRlcnMpO1xuICAgICAgICByZXMud3JpdGUoXCIubWV0ZW9yLWNzcy1ub3QtZm91bmQtZXJyb3IgeyB3aWR0aDogMHB4O31cIik7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9qc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSwgd2UncmUgcmVxdWVzdGluZyBhIEpTIHJlc291cmNlIHRoYXQgd2UgZG9uJ3QgaGF2ZS5cbiAgICAgICAgLy8gU2VydmUgYW4gdW5jYWNoZWQgNDA0LiAoV2UgY2FuJ3QgdXNlIHRoZSBzYW1lIGhhY2sgd2UgdXNlIGZvciBDU1MsXG4gICAgICAgIC8vIGJlY2F1c2UgYWN0dWFsbHkgYWN0aW5nIG9uIHRoYXQgaGFjayByZXF1aXJlcyB1cyB0byBoYXZlIHRoZSBKU1xuICAgICAgICAvLyBhbHJlYWR5ISlcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9kb250X3NlcnZlX2luZGV4J10pIHtcbiAgICAgICAgLy8gV2hlbiBkb3dubG9hZGluZyBmaWxlcyBkdXJpbmcgYSBDb3Jkb3ZhIGhvdCBjb2RlIHB1c2gsIHdlIG5lZWRcbiAgICAgICAgLy8gdG8gZGV0ZWN0IGlmIGEgZmlsZSBpcyBub3QgYXZhaWxhYmxlIGluc3RlYWQgb2YgaW5hZHZlcnRlbnRseVxuICAgICAgICAvLyBkb3dubG9hZGluZyB0aGUgZGVmYXVsdCBpbmRleCBwYWdlLlxuICAgICAgICAvLyBTbyBzaW1pbGFyIHRvIHRoZSBzaXR1YXRpb24gYWJvdmUsIHdlIHNlcnZlIGFuIHVuY2FjaGVkIDQwNC5cbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IGFyY2ggfSA9IHJlcXVlc3Q7XG4gICAgICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIGFyY2gsIFwic3RyaW5nXCIsIHsgYXJjaCB9KTtcblxuICAgICAgaWYgKCEgaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgICAgICAvLyBXZSBjb3VsZCBjb21lIGhlcmUgaW4gY2FzZSB3ZSBydW4gd2l0aCBzb21lIGFyY2hpdGVjdHVyZXMgZXhjbHVkZWRcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICBpZiAoTWV0ZW9yLmlzRGV2ZWxvcG1lbnQpIHtcbiAgICAgICAgICByZXMuZW5kKGBObyBjbGllbnQgcHJvZ3JhbSBmb3VuZCBmb3IgdGhlICR7YXJjaH0gYXJjaGl0ZWN0dXJlLmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFNhZmV0eSBuZXQsIGJ1dCB0aGlzIGJyYW5jaCBzaG91bGQgbm90IGJlIHBvc3NpYmxlLlxuICAgICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgcGF1c2VDbGllbnQoYXJjaCkgaGFzIGJlZW4gY2FsbGVkLCBwcm9ncmFtLnBhdXNlZCB3aWxsIGJlIGFcbiAgICAgIC8vIFByb21pc2UgdGhhdCB3aWxsIGJlIHJlc29sdmVkIHdoZW4gdGhlIHByb2dyYW0gaXMgdW5wYXVzZWQuXG4gICAgICBhd2FpdCBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF0ucGF1c2VkO1xuXG4gICAgICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKS50aGVuKCh7XG4gICAgICAgIHN0cmVhbSxcbiAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgaGVhZGVyczogbmV3SGVhZGVycyxcbiAgICAgIH0pID0+IHtcbiAgICAgICAgaWYgKCFzdGF0dXNDb2RlKSB7XG4gICAgICAgICAgc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXNDb2RlID8gcmVzLnN0YXR1c0NvZGUgOiAyMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3SGVhZGVycykge1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oaGVhZGVycywgbmV3SGVhZGVycyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXMud3JpdGVIZWFkKHN0YXR1c0NvZGUsIGhlYWRlcnMpO1xuXG4gICAgICAgIHN0cmVhbS5waXBlKHJlcywge1xuICAgICAgICAgIC8vIEVuZCB0aGUgcmVzcG9uc2Ugd2hlbiB0aGUgc3RyZWFtIGVuZHMuXG4gICAgICAgICAgZW5kOiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICBMb2cuZXJyb3IoXCJFcnJvciBydW5uaW5nIHRlbXBsYXRlOiBcIiArIGVycm9yLnN0YWNrKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFJldHVybiA0MDQgYnkgZGVmYXVsdCwgaWYgbm8gb3RoZXIgaGFuZGxlcnMgc2VydmUgdGhpcyBVUkwuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cblxuICB2YXIgaHR0cFNlcnZlciA9IGNyZWF0ZVNlcnZlcihhcHApO1xuICB2YXIgb25MaXN0ZW5pbmdDYWxsYmFja3MgPSBbXTtcblxuICAvLyBBZnRlciA1IHNlY29uZHMgdy9vIGRhdGEgb24gYSBzb2NrZXQsIGtpbGwgaXQuICBPbiB0aGUgb3RoZXIgaGFuZCwgaWZcbiAgLy8gdGhlcmUncyBhbiBvdXRzdGFuZGluZyByZXF1ZXN0LCBnaXZlIGl0IGEgaGlnaGVyIHRpbWVvdXQgaW5zdGVhZCAodG8gYXZvaWRcbiAgLy8ga2lsbGluZyBsb25nLXBvbGxpbmcgcmVxdWVzdHMpXG4gIGh0dHBTZXJ2ZXIuc2V0VGltZW91dChTSE9SVF9TT0NLRVRfVElNRU9VVCk7XG5cbiAgLy8gRG8gdGhpcyBoZXJlLCBhbmQgdGhlbiBhbHNvIGluIGxpdmVkYXRhL3N0cmVhbV9zZXJ2ZXIuanMsIGJlY2F1c2VcbiAgLy8gc3RyZWFtX3NlcnZlci5qcyBraWxscyBhbGwgdGhlIGN1cnJlbnQgcmVxdWVzdCBoYW5kbGVycyB3aGVuIGluc3RhbGxpbmcgaXRzXG4gIC8vIG93bi5cbiAgaHR0cFNlcnZlci5vbigncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuXG4gIC8vIElmIHRoZSBjbGllbnQgZ2F2ZSB1cyBhIGJhZCByZXF1ZXN0LCB0ZWxsIGl0IGluc3RlYWQgb2YganVzdCBjbG9zaW5nIHRoZVxuICAvLyBzb2NrZXQuIFRoaXMgbGV0cyBsb2FkIGJhbGFuY2VycyBpbiBmcm9udCBvZiB1cyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gXCJhXG4gIC8vIHNlcnZlciBpcyByYW5kb21seSBjbG9zaW5nIHNvY2tldHMgZm9yIG5vIHJlYXNvblwiIGFuZCBcImNsaWVudCBzZW50IGEgYmFkXG4gIC8vIHJlcXVlc3RcIi5cbiAgLy9cbiAgLy8gVGhpcyB3aWxsIG9ubHkgd29yayBvbiBOb2RlIDY7IE5vZGUgNCBkZXN0cm95cyB0aGUgc29ja2V0IGJlZm9yZSBjYWxsaW5nXG4gIC8vIHRoaXMgZXZlbnQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvcHVsbC80NTU3LyBmb3IgZGV0YWlscy5cbiAgaHR0cFNlcnZlci5vbignY2xpZW50RXJyb3InLCAoZXJyLCBzb2NrZXQpID0+IHtcbiAgICAvLyBQcmUtTm9kZS02LCBkbyBub3RoaW5nLlxuICAgIGlmIChzb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGVyci5tZXNzYWdlID09PSAnUGFyc2UgRXJyb3InKSB7XG4gICAgICBzb2NrZXQuZW5kKCdIVFRQLzEuMSA0MDAgQmFkIFJlcXVlc3RcXHJcXG5cXHJcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIG90aGVyIGVycm9ycywgdXNlIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGFzIGlmIHdlIGhhZCBubyBjbGllbnRFcnJvclxuICAgICAgLy8gaGFuZGxlci5cbiAgICAgIHNvY2tldC5kZXN0cm95KGVycik7XG4gICAgfVxuICB9KTtcblxuICAvLyBzdGFydCB1cCBhcHBcbiAgXy5leHRlbmQoV2ViQXBwLCB7XG4gICAgY29ubmVjdEhhbmRsZXJzOiBwYWNrYWdlQW5kQXBwSGFuZGxlcnMsXG4gICAgcmF3Q29ubmVjdEhhbmRsZXJzOiByYXdDb25uZWN0SGFuZGxlcnMsXG4gICAgaHR0cFNlcnZlcjogaHR0cFNlcnZlcixcbiAgICBjb25uZWN0QXBwOiBhcHAsXG4gICAgLy8gRm9yIHRlc3RpbmcuXG4gICAgc3VwcHJlc3NDb25uZWN0RXJyb3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgPSB0cnVlO1xuICAgIH0sXG4gICAgb25MaXN0ZW5pbmc6IGZ1bmN0aW9uIChmKSB7XG4gICAgICBpZiAob25MaXN0ZW5pbmdDYWxsYmFja3MpXG4gICAgICAgIG9uTGlzdGVuaW5nQ2FsbGJhY2tzLnB1c2goZik7XG4gICAgICBlbHNlXG4gICAgICAgIGYoKTtcbiAgICB9LFxuICAgIC8vIFRoaXMgY2FuIGJlIG92ZXJyaWRkZW4gYnkgdXNlcnMgd2hvIHdhbnQgdG8gbW9kaWZ5IGhvdyBsaXN0ZW5pbmcgd29ya3NcbiAgICAvLyAoZWcsIHRvIHJ1biBhIHByb3h5IGxpa2UgQXBvbGxvIEVuZ2luZSBQcm94eSBpbiBmcm9udCBvZiB0aGUgc2VydmVyKS5cbiAgICBzdGFydExpc3RlbmluZzogZnVuY3Rpb24gKGh0dHBTZXJ2ZXIsIGxpc3Rlbk9wdGlvbnMsIGNiKSB7XG4gICAgICBodHRwU2VydmVyLmxpc3RlbihsaXN0ZW5PcHRpb25zLCBjYik7XG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gTGV0IHRoZSByZXN0IG9mIHRoZSBwYWNrYWdlcyAoYW5kIE1ldGVvci5zdGFydHVwIGhvb2tzKSBpbnNlcnQgY29ubmVjdFxuICAvLyBtaWRkbGV3YXJlcyBhbmQgdXBkYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sIHRoZW4ga2VlcCBnb2luZyB0byBzZXQgdXBcbiAgLy8gYWN0dWFsbHkgc2VydmluZyBIVE1MLlxuICBleHBvcnRzLm1haW4gPSBhcmd2ID0+IHtcbiAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xuXG4gICAgY29uc3Qgc3RhcnRIdHRwU2VydmVyID0gbGlzdGVuT3B0aW9ucyA9PiB7XG4gICAgICBXZWJBcHAuc3RhcnRMaXN0ZW5pbmcoaHR0cFNlcnZlciwgbGlzdGVuT3B0aW9ucywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG4gICAgICAgIGlmIChwcm9jZXNzLmVudi5NRVRFT1JfUFJJTlRfT05fTElTVEVOKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJMSVNURU5JTkdcIik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gb25MaXN0ZW5pbmdDYWxsYmFja3M7XG4gICAgICAgIG9uTGlzdGVuaW5nQ2FsbGJhY2tzID0gbnVsbDtcbiAgICAgICAgY2FsbGJhY2tzLmZvckVhY2goY2FsbGJhY2sgPT4geyBjYWxsYmFjaygpOyB9KTtcbiAgICAgIH0sIGUgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgbGlzdGVuaW5nOlwiLCBlKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlICYmIGUuc3RhY2spO1xuICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBsZXQgbG9jYWxQb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAwO1xuICAgIGNvbnN0IHVuaXhTb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnYuVU5JWF9TT0NLRVRfUEFUSDtcblxuICAgIGlmICh1bml4U29ja2V0UGF0aCkge1xuICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIGEgc29ja2V0IGZpbGUuXG4gICAgICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUodW5peFNvY2tldFBhdGgpO1xuICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogdW5peFNvY2tldFBhdGggfSk7XG4gICAgICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwKHVuaXhTb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxQb3J0ID0gaXNOYU4oTnVtYmVyKGxvY2FsUG9ydCkpID8gbG9jYWxQb3J0IDogTnVtYmVyKGxvY2FsUG9ydCk7XG4gICAgICBpZiAoL1xcXFxcXFxcPy4rXFxcXHBpcGVcXFxcPy4rLy50ZXN0KGxvY2FsUG9ydCkpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7IHBhdGg6IGxvY2FsUG9ydCB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxvY2FsUG9ydCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgVENQLlxuICAgICAgICBzdGFydEh0dHBTZXJ2ZXIoe1xuICAgICAgICAgIHBvcnQ6IGxvY2FsUG9ydCxcbiAgICAgICAgICBob3N0OiBwcm9jZXNzLmVudi5CSU5EX0lQIHx8IFwiMC4wLjAuMFwiXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBQT1JUIHNwZWNpZmllZFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gXCJEQUVNT05cIjtcbiAgfTtcbn1cblxudmFyIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdHJ1ZTtcblxuV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaW5saW5lU2NyaXB0c0FsbG93ZWQ7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0SW5saW5lU2NyaXB0c0FsbG93ZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQgPSB2YWx1ZTtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbnZhciBzcmlNb2RlO1xuXG5XZWJBcHBJbnRlcm5hbHMuZW5hYmxlU3VicmVzb3VyY2VJbnRlZ3JpdHkgPSBmdW5jdGlvbih1c2VfY3JlZGVudGlhbHMgPSBmYWxzZSkge1xuICBzcmlNb2RlID0gdXNlX2NyZWRlbnRpYWxzID8gJ3VzZS1jcmVkZW50aWFscycgOiAnYW5vbnltb3VzJztcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uIChob29rRm4pIHtcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBob29rRm47XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuc2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soXG4gICAgZnVuY3Rpb24gKHVybCkge1xuICAgICAgcmV0dXJuIHByZWZpeCArIHVybDtcbiAgfSk7XG59O1xuXG4vLyBQYWNrYWdlcyBjYW4gY2FsbCBgV2ViQXBwSW50ZXJuYWxzLmFkZFN0YXRpY0pzYCB0byBzcGVjaWZ5IHN0YXRpY1xuLy8gSmF2YVNjcmlwdCB0byBiZSBpbmNsdWRlZCBpbiB0aGUgYXBwLiBUaGlzIHN0YXRpYyBKUyB3aWxsIGJlIGlubGluZWQsXG4vLyB1bmxlc3MgaW5saW5lIHNjcmlwdHMgaGF2ZSBiZWVuIGRpc2FibGVkLCBpbiB3aGljaCBjYXNlIGl0IHdpbGwgYmVcbi8vIHNlcnZlZCB1bmRlciBgLzxzaGExIG9mIGNvbnRlbnRzPmAuXG52YXIgYWRkaXRpb25hbFN0YXRpY0pzID0ge307XG5XZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnMgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgYWRkaXRpb25hbFN0YXRpY0pzW1wiL1wiICsgc2hhMShjb250ZW50cykgKyBcIi5qc1wiXSA9IGNvbnRlbnRzO1xufTtcblxuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzXG5XZWJBcHBJbnRlcm5hbHMuZ2V0Qm9pbGVycGxhdGUgPSBnZXRCb2lsZXJwbGF0ZTtcbldlYkFwcEludGVybmFscy5hZGRpdGlvbmFsU3RhdGljSnMgPSBhZGRpdGlvbmFsU3RhdGljSnM7XG5cbi8vIFN0YXJ0IHRoZSBzZXJ2ZXIhXG5ydW5XZWJBcHBTZXJ2ZXIoKTtcbiIsImltcG9ydCBucG1Db25uZWN0IGZyb20gXCJjb25uZWN0XCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KC4uLmNvbm5lY3RBcmdzKSB7XG4gIGNvbnN0IGhhbmRsZXJzID0gbnBtQ29ubmVjdC5hcHBseSh0aGlzLCBjb25uZWN0QXJncyk7XG4gIGNvbnN0IG9yaWdpbmFsVXNlID0gaGFuZGxlcnMudXNlO1xuXG4gIC8vIFdyYXAgdGhlIGhhbmRsZXJzLnVzZSBtZXRob2Qgc28gdGhhdCBhbnkgcHJvdmlkZWQgaGFuZGxlciBmdW5jdGlvbnNcbiAgLy8gYWx3YXkgcnVuIGluIGEgRmliZXIuXG4gIGhhbmRsZXJzLnVzZSA9IGZ1bmN0aW9uIHVzZSguLi51c2VBcmdzKSB7XG4gICAgY29uc3QgeyBzdGFjayB9ID0gdGhpcztcbiAgICBjb25zdCBvcmlnaW5hbExlbmd0aCA9IHN0YWNrLmxlbmd0aDtcbiAgICBjb25zdCByZXN1bHQgPSBvcmlnaW5hbFVzZS5hcHBseSh0aGlzLCB1c2VBcmdzKTtcblxuICAgIC8vIElmIHdlIGp1c3QgYWRkZWQgYW55dGhpbmcgdG8gdGhlIHN0YWNrLCB3cmFwIGVhY2ggbmV3IGVudHJ5LmhhbmRsZVxuICAgIC8vIHdpdGggYSBmdW5jdGlvbiB0aGF0IGNhbGxzIFByb21pc2UuYXN5bmNBcHBseSB0byBlbnN1cmUgdGhlXG4gICAgLy8gb3JpZ2luYWwgaGFuZGxlciBydW5zIGluIGEgRmliZXIuXG4gICAgZm9yIChsZXQgaSA9IG9yaWdpbmFsTGVuZ3RoOyBpIDwgc3RhY2subGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGVudHJ5ID0gc3RhY2tbaV07XG4gICAgICBjb25zdCBvcmlnaW5hbEhhbmRsZSA9IGVudHJ5LmhhbmRsZTtcblxuICAgICAgaWYgKG9yaWdpbmFsSGFuZGxlLmxlbmd0aCA+PSA0KSB7XG4gICAgICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYW5kbGUgaGFkIGZvdXIgKG9yIG1vcmUpIHBhcmFtZXRlcnMsIHRoZVxuICAgICAgICAvLyB3cmFwcGVyIG11c3QgYWxzbyBoYXZlIGZvdXIgcGFyYW1ldGVycywgc2luY2UgY29ubmVjdCB1c2VzXG4gICAgICAgIC8vIGhhbmRsZS5sZW5ndGggdG8gZGVybWluZSB3aGV0aGVyIHRvIHBhc3MgdGhlIGVycm9yIGFzIHRoZSBmaXJzdFxuICAgICAgICAvLyBhcmd1bWVudCB0byB0aGUgaGFuZGxlIGZ1bmN0aW9uLlxuICAgICAgICBlbnRyeS5oYW5kbGUgPSBmdW5jdGlvbiBoYW5kbGUoZXJyLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLmFzeW5jQXBwbHkob3JpZ2luYWxIYW5kbGUsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnRyeS5oYW5kbGUgPSBmdW5jdGlvbiBoYW5kbGUocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hc3luY0FwcGx5KG9yaWdpbmFsSGFuZGxlLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgcmV0dXJuIGhhbmRsZXJzO1xufVxuIiwiaW1wb3J0IHsgc3RhdFN5bmMsIHVubGlua1N5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5cbi8vIFNpbmNlIGEgbmV3IHNvY2tldCBmaWxlIHdpbGwgYmUgY3JlYXRlZCB3aGVuIHRoZSBIVFRQIHNlcnZlclxuLy8gc3RhcnRzIHVwLCBpZiBmb3VuZCByZW1vdmUgdGhlIGV4aXN0aW5nIGZpbGUuXG4vL1xuLy8gV0FSTklORzpcbi8vIFRoaXMgd2lsbCByZW1vdmUgdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgd2l0aG91dCB3YXJuaW5nLiBJZlxuLy8gdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgaXMgYWxyZWFkeSBpbiB1c2UgYnkgYW5vdGhlciBhcHBsaWNhdGlvbixcbi8vIGl0IHdpbGwgc3RpbGwgYmUgcmVtb3ZlZC4gTm9kZSBkb2VzIG5vdCBwcm92aWRlIGEgcmVsaWFibGUgd2F5IHRvXG4vLyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gYSBzb2NrZXQgZmlsZSB0aGF0IGlzIGFscmVhZHkgaW4gdXNlIGJ5XG4vLyBhbm90aGVyIGFwcGxpY2F0aW9uIG9yIGEgc3RhbGUgc29ja2V0IGZpbGUgdGhhdCBoYXMgYmVlblxuLy8gbGVmdCBvdmVyIGFmdGVyIGEgU0lHS0lMTC4gU2luY2Ugd2UgaGF2ZSBubyByZWxpYWJsZSB3YXkgdG9cbi8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGVzZSB0d28gc2NlbmFyaW9zLCB0aGUgYmVzdCBjb3Vyc2Ugb2Zcbi8vIGFjdGlvbiBkdXJpbmcgc3RhcnR1cCBpcyB0byByZW1vdmUgYW55IGV4aXN0aW5nIHNvY2tldCBmaWxlLiBUaGlzXG4vLyBpcyBub3QgdGhlIHNhZmVzdCBjb3Vyc2Ugb2YgYWN0aW9uIGFzIHJlbW92aW5nIHRoZSBleGlzdGluZyBzb2NrZXRcbi8vIGZpbGUgY291bGQgaW1wYWN0IGFuIGFwcGxpY2F0aW9uIHVzaW5nIGl0LCBidXQgdGhpcyBhcHByb2FjaCBoZWxwc1xuLy8gZW5zdXJlIHRoZSBIVFRQIHNlcnZlciBjYW4gc3RhcnR1cCB3aXRob3V0IG1hbnVhbFxuLy8gaW50ZXJ2ZW50aW9uIChlLmcuIGFza2luZyBmb3IgdGhlIHZlcmlmaWNhdGlvbiBhbmQgY2xlYW51cCBvZiBzb2NrZXRcbi8vIGZpbGVzIGJlZm9yZSBhbGxvd2luZyB0aGUgSFRUUCBzZXJ2ZXIgdG8gYmUgc3RhcnRlZCkuXG4vL1xuLy8gVGhlIGFib3ZlIGJlaW5nIHNhaWQsIGFzIGxvbmcgYXMgdGhlIHNvY2tldCBmaWxlIHBhdGggaXNcbi8vIGNvbmZpZ3VyZWQgY2FyZWZ1bGx5IHdoZW4gdGhlIGFwcGxpY2F0aW9uIGlzIGRlcGxveWVkIChhbmQgZXh0cmFcbi8vIGNhcmUgaXMgdGFrZW4gdG8gbWFrZSBzdXJlIHRoZSBjb25maWd1cmVkIHBhdGggaXMgdW5pcXVlIGFuZCBkb2Vzbid0XG4vLyBjb25mbGljdCB3aXRoIGFub3RoZXIgc29ja2V0IGZpbGUgcGF0aCksIHRoZW4gdGhlcmUgc2hvdWxkIG5vdCBiZVxuLy8gYW55IGlzc3VlcyB3aXRoIHRoaXMgYXBwcm9hY2guXG5leHBvcnQgY29uc3QgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlID0gKHNvY2tldFBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdFN5bmMoc29ja2V0UGF0aCkuaXNTb2NrZXQoKSkge1xuICAgICAgLy8gU2luY2UgYSBuZXcgc29ja2V0IGZpbGUgd2lsbCBiZSBjcmVhdGVkLCByZW1vdmUgdGhlIGV4aXN0aW5nXG4gICAgICAvLyBmaWxlLlxuICAgICAgdW5saW5rU3luYyhzb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQW4gZXhpc3RpbmcgZmlsZSB3YXMgZm91bmQgYXQgXCIke3NvY2tldFBhdGh9XCIgYW5kIGl0IGlzIG5vdCBgICtcbiAgICAgICAgJ2Egc29ja2V0IGZpbGUuIFBsZWFzZSBjb25maXJtIFBPUlQgaXMgcG9pbnRpbmcgdG8gdmFsaWQgYW5kICcgK1xuICAgICAgICAndW4tdXNlZCBzb2NrZXQgZmlsZSBwYXRoLidcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIElmIHRoZXJlIGlzIG5vIGV4aXN0aW5nIHNvY2tldCBmaWxlIHRvIGNsZWFudXAsIGdyZWF0LCB3ZSdsbFxuICAgIC8vIGNvbnRpbnVlIG5vcm1hbGx5LiBJZiB0aGUgY2F1Z2h0IGV4Y2VwdGlvbiByZXByZXNlbnRzIGFueSBvdGhlclxuICAgIC8vIGlzc3VlLCByZS10aHJvdy5cbiAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufTtcblxuLy8gUmVtb3ZlIHRoZSBzb2NrZXQgZmlsZSB3aGVuIGRvbmUgdG8gYXZvaWQgbGVhdmluZyBiZWhpbmQgYSBzdGFsZSBvbmUuXG4vLyBOb3RlIC0gYSBzdGFsZSBzb2NrZXQgZmlsZSBpcyBzdGlsbCBsZWZ0IGJlaGluZCBpZiB0aGUgcnVubmluZyBub2RlXG4vLyBwcm9jZXNzIGlzIGtpbGxlZCB2aWEgc2lnbmFsIDkgLSBTSUdLSUxMLlxuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAgPVxuICAoc29ja2V0UGF0aCwgZXZlbnRFbWl0dGVyID0gcHJvY2VzcykgPT4ge1xuICAgIFsnZXhpdCcsICdTSUdJTlQnLCAnU0lHSFVQJywgJ1NJR1RFUk0nXS5mb3JFYWNoKHNpZ25hbCA9PiB7XG4gICAgICBldmVudEVtaXR0ZXIub24oc2lnbmFsLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMoc29ja2V0UGF0aCkpIHtcbiAgICAgICAgICB1bmxpbmtTeW5jKHNvY2tldFBhdGgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH07XG4iXX0=

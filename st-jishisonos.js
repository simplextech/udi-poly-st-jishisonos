'use strict';
trapUncaughExceptions();

// const cp = require('child_process');
// const jishi = cp.fork('./lib/JishiServer.js');

// let jishi = cp.fork('./lib/JishiServer.js');

// let jishi = cp.fork('./node-sonos-http-api/server.js');

// const jishi = require('./node-sonos-http-api/server.js');
// const jishi = require('./lib/JishiServer');

// // Jishi
// const http = require('http');
// const https = require('https');
// // const fs = require('fs');
// const auth = require('basic-auth');
// const SonosSystem = require('sonos-discovery');
// // const logger = require('sonos-discovery/lib/helpers/logger');
// const SonosHttpAPI = require('./node-sonos-http-api/lib/sonos-http-api.js');
// const nodeStatic = require('node-static');
// const settings = require('./node-sonos-http-api/settings');

// const fileServer = new nodeStatic.Server(settings.webroot);
// const discovery = new SonosSystem(settings);
// const api = new SonosHttpAPI(discovery, settings);

// End Jishi

const fs = require('fs');
const markdown = require('markdown').markdown; // For Polyglot-V2 only
const AsyncLock = require('async-lock');

// Loads the appropriate Polyglot interface module.
const Polyglot = require('polyinterface'); // Polyglot V2 module (On-Premise)

// Use logger.<debug|info|warn|error>()
// Logs to <home>/.polyglot/nodeservers/<your node server>/logs/<date>.log
// To watch logs: tail -f ~/.polyglot/nodeservers/<NodeServer>/logs/<date>.log
// All log entries prefixed with NS: Comes from your NodeServer.
// All log entries prefixed with POLY: Comes from the Polyglot interface
const logger = Polyglot.logger;
const lock = new AsyncLock({ timeout: 500 });

// Those are the node definitions that our nodeserver uses.
// You will need to edit those files.
const ControllerNode = require('./Nodes/ControllerNode.js')(Polyglot);
const SonosPlayer = require('./Nodes/SonosPlayer.js')(Polyglot);

// Names of our customParams
// const emailParam = 'User';
// const pwParam = 'Password';
// const hostParam = 'Host';
// const portParam = 'Port';
const say0 = 'Phrase 0';
const say1 = 'Phrase 1';
const say2 = 'Phrase 2';
const say3 = 'Phrase 3';
const say4 = 'Phrase 4';
const say5 = 'Phrase 5';
const say6 = 'Phrase 6';
const say7 = 'Phrase 7';
const say8 = 'Phrase 8';
const say9 = 'Phrase 9';

// UI customParams default values. Param must have at least 1 character
const defaultParams = {
  [say0]: ' ',
  [say1]: ' ',
  [say2]: ' ',
  [say3]: ' ',
  [say4]: ' ',
  [say5]: ' ',
  [say6]: ' ',
  [say7]: ' ',
  [say8]: ' ',
  [say9]: ' ',
  // [emailParam]: ' ',
  // [pwParam]: ' ',
  // [hostParam]: ' ',
  // [portParam]: ' ',
};

// UI Parameters: typedParams - Feature available in Polyglot-V2 only:
// Custom parameters definitions in front end UI configuration screen
// You can use this instead of customParams to handle typed nodeserver params
// Accepts list of objects with the following properties:
// name - used as a key when data is sent from UI
// title - displayed in UI
// defaultValue - optional
// type - optional, can be 'NUMBER', 'STRING' or 'BOOLEAN'. Defaults to 'STRING'
// desc - optional, shown in tooltip in UI
// isRequired - optional, true/false
// isList - optional, true/false, if set this will be treated as list of values
//    or objects by UI
// params - optional, can contain a list of objects.
// 	 If present, then this (parent) is treated as object /
// 	 list of objects by UI, otherwise, it's treated as a
// 	 single / list of single values

// const typedParams = [
//   { name: 'host', title: 'Host', isRequired: true},
//   { name: 'port', title: 'Port', isRequired: true, type: 'NUMBER'},
//   { name: 'user', title: 'User', isRequired: true},
//   { name: 'password', title: 'Password', isRequired: true},
//   { name: 'list', title: 'List of values', isList: true },
// ];

logger.info('Starting Node Server');

// Create an instance of the Polyglot interface. We need pass all the node
// classes that we will be using.
const poly = new Polyglot.Interface([ControllerNode, SonosPlayer]);

// Connected to MQTT, but config has not yet arrived.
poly.on('mqttConnected', function() {
  logger.info('MQTT Connection started');
});

// Config has been received
poly.on('config', function(config) {
  const nodesCount = Object.keys(config.nodes).length;
  logger.info('Config received has %d nodes', nodesCount);

  // If we want to see the config content (Without the long nodes array):
  // logger.info('Received config: %o',
  //    Object.assign({}, config, { nodes: '<nodes>' }));

  // Important config options:
  // config.nodes: Our nodes, with the node class applied
  // config.customParams: Configuration parameters from the UI
  // config.newParamsDetected: Flag which tells us that customParams changed
  // config.typedCustomData: Configuration parameters from the UI (if typed)

  // If this is the first config after a node server restart
  if (config.isInitialConfig) {
    // Removes all existing notices on startup.
    poly.removeNoticesAll();

    // Use options specific to PGC vs Polyglot-V2
    if (poly.isCloud) {
      logger.info('Running nodeserver in the cloud');

      // Will send the profile if the version is server.json is changed, or
      // if the profile has never been sent. Exists only for PGC.
      poly.updateProfileIfNew();
    } else {
      logger.info('Running nodeserver on-premises');
      // Profile files are sent automatically the first time.

      // Sets the configuration fields in the UI / Available in Polyglot V2 only
      // poly.saveTypedParams(typedParams);

      // Sets the configuration doc shown in the UI
      // Available in Polyglot V2 only
      const md = fs.readFileSync('./configdoc.md');
      poly.setCustomParamsDoc(markdown.toHTML(md.toString()));
    }

    // Sets the configuration fields in the UI
    initializeCustomParams(config.customParams);

    // If we have no nodes yet, we add the first node: a controller node which
    // holds the node server status and control buttons The first device to
    // create should always be the nodeserver controller.
    if (!nodesCount) {
      try {
        logger.info('Auto-creating controller');
        callAsync(autoCreateController());
      } catch (err) {
        logger.error('Error while auto-creating controller node:', err);
      }
    } else {
      // Test code to remove the first node found

      // try {
      //   logger.info('Auto-deleting controller');
      //  callAsync(autoDeleteNode(config.nodes[Object.keys(config.nodes)[0]]));
      // } catch (err) {
      //   logger.error('Error while auto-deleting controller node');
      // }
    }

    if (config.newParamsDetected) {
      logger.info('New parameters detected');
    }
  }
});

// User just went through oAuth authorization. Available with PGC only.
poly.on('oauth', function(oAuth) {
  logger.info('Received OAuth code');
  // oAuth object should contain:
  // {
  //   code: "<the authorization code to use to get tokens>"
  //   state: "<the state worker you appended to the url>"
  // }
  // Use it to get access and refresh tokens
});

// This is triggered every x seconds. Frequency is configured in the UI.
poly.on('poll', function(longPoll) {
  callAsync(doPoll(longPoll));
});

poly.on('oauth', function(oaMessage) {
  // oaMessage.code: Authorization code received after authorization
  // oaMessage.state: This must be the worker ID.

  logger.info('Received oAuth message %o', oaMessage);
  // From here, we need to process the authorization token
});

// Received a 'stop' message from Polyglot. This NodeServer is shutting down
poly.on('stop', async function() {
  logger.info('Graceful stop');

  // Make a last short poll and long poll
  await doPoll(false);
  await doPoll(true);

  // Tell Interface we are stopping (Our polling is now finished)
  try { 
    poly.stop();
    // process.exit();
  } catch (error) {
    logger.error('poly.stop() Failed: %s', error);
  }
});

// Received a 'delete' message from Polyglot. This NodeServer is being removed
poly.on('delete', function() {
  logger.info('Nodeserver is being deleted');

  // We can do some cleanup, then stop.
  poly.stop();
});

// MQTT connection ended
poly.on('mqttEnd', function() {
  logger.info('MQTT connection ended.'); // May be graceful or not.
});

// Triggered for every message received from polyglot.
poly.on('messageReceived', function(message) {
  // Only display messages other than config
  if (!message['config']) {
    logger.debug('Message Received: %o', message);
  }
});

// Triggered for every message sent to polyglot.
poly.on('messageSent', function(message) {
  logger.debug('Message Sent: %o', message);
});

// This is being triggered based on the short and long poll parameters in the UI
async function doPoll(longPoll) {
  // Prevents polling logic reentry if an existing poll is underway
  try {
    await lock.acquire('poll', function() {
      logger.info('%s', longPoll ? 'Long poll' : 'Short poll');
    });
  } catch (err) {
    logger.error('Error while polling: %s', err.message);
  }
}

// Creates the controller node
async function autoCreateController() {
  try {
    await poly.addNode(
      new ControllerNode(poly, 'controller', 'controller', 'ST-JishiSonos')
    );
  } catch (err) {
    logger.error('Error creating controller node', err);
  }

  // Add a notice in the UI for 5 seconds
  poly.addNoticeTemp('newController', 'Controller node initialized', 10);
}

// Sets the custom params as we want them. Keeps existing params values.
function initializeCustomParams(currentParams) {
  const defaultParamKeys = Object.keys(defaultParams);
  const currentParamKeys = Object.keys(currentParams);

  // Get orphan keys from either currentParams or defaultParams
  const differentKeys = defaultParamKeys.concat(currentParamKeys)
  .filter(function(key) {
    return !(key in defaultParams) || !(key in currentParams);
  });

  if (differentKeys.length) {
    let customParams = {};

    // Only keeps params that exists in defaultParams
    // Sets the params to the existing value, or default value.
    defaultParamKeys.forEach(function(key) {
      customParams[key] = currentParams[key] ?
        currentParams[key] : defaultParams[key];
    });

    poly.saveCustomParams(customParams);
  }
}

// Call Async function from a non-asynch function without waiting for result,
// and log the error if it fails
function callAsync(promise) {
  (async function() {
    try {
      await promise;
    } catch (err) {
      logger.error('Error with async function: %s %s', err.message, err.stack);
    }
  })();
}

function trapUncaughExceptions() {
  // If we get an uncaugthException...
  process.on('uncaughtException', function(err) {
    logger.error(`uncaughtException REPORT THIS!: ${err.stack}`);
  });
}


// // Jishi Start
// var requestHandler = function (req, res) {
//   req.addListener('end', function () {
//     fileServer.serve(req, res, function (err) {

//       // If error, route it.
//       // This bypasses authentication on static files!
//       if (!err) {
//         return;
//       }

//       if (settings.auth) {
//         var credentials = auth(req);

//         if (!credentials || credentials.name !== settings.auth.username || credentials.pass !== settings.auth.password) {
//           res.statusCode = 401;
//           res.setHeader('WWW-Authenticate', 'Basic realm="Access Denied"');
//           res.end('Access denied');
//           return;
//         }
//       }

//       // Enable CORS requests
//       res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
//       res.setHeader('Access-Control-Allow-Origin', '*');
//       if (req.headers['access-control-request-headers']) {
//         res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
//       }

//       if (req.method === 'OPTIONS') {
//         res.end();
//         return;
//       }

//       if (req.method === 'GET') {
//         api.requestHandler(req, res);
//       }
//     });
//   }).resume();
// };

// let server;

// if (settings.https) {
//   var options = {};
//   if (settings.https.pfx) {
//     options.pfx = fs.readFileSync(settings.https.pfx);
//     options.passphrase = settings.https.passphrase;
//   } else if (settings.https.key && settings.https.cert) {
//     options.key = fs.readFileSync(settings.https.key);
//     options.cert = fs.readFileSync(settings.https.cert);
//   } else {
//     logger.error("Insufficient configuration for https");
//     return;
//   }

//   const secureServer = https.createServer(options, requestHandler);
//   secureServer.listen(settings.securePort, function () {
//     logger.info('https server listening on port', settings.securePort);
//   });
// }

// server = http.createServer(requestHandler);

// process.on('unhandledRejection', (err) => {
//   logger.error(err);
// });

// let host = settings.ip;
// server.listen(settings.port, host, function () {
//   logger.info('http server listening on', host, 'port', settings.port);
// });

// server.on('error', (err) => {
//   if (err.code && err.code === 'EADDRINUSE') {
//     logger.error(`Port ${settings.port} seems to be in use already. Make sure the sonos-http-api isn't 
//     already running, or that no other server uses that port. You can specify an alternative http port 
//     with property "port" in settings.json`);
//   } else {
//     logger.error(err);
//   }

//   process.exit(1);
// });

// // End Jishi

// Fork Jishi
// const jishi = require('./lib/JishiServer');
// let jishi = cp.fork('./lib/JishiServer.js');

// // Starts the NodeServer!
poly.start();

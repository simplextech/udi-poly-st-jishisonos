'use strict';
trapUncaughExceptions();

const fs = require('fs');
const markdown = require('markdown').markdown;
const AsyncLock = require('async-lock');
const Polyglot = require('polyinterface');

const cp = require('child_process');
const logger = Polyglot.logger;
const lock = new AsyncLock({ timeout: 500 });

cp.spawn('node', ['node-sonos-http-api/server.js'], {
  detached: true,
  stdio: 'ignore',
});

const ControllerNode = require('./Nodes/ControllerNode.js')(Polyglot);
const SonosPlayer = require('./Nodes/SonosPlayer.js')(Polyglot);

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
};

logger.info('Starting Node Server');

const poly = new Polyglot.Interface([ControllerNode, SonosPlayer]);

poly.on('mqttConnected', function() {
  logger.info('MQTT Connection started');
});

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

poly.on('oauth', function(oAuth) {
  logger.info('Received OAuth code');
  // oAuth object should contain:
  // {
  //   code: "<the authorization code to use to get tokens>"
  //   state: "<the state worker you appended to the url>"
  // }
  // Use it to get access and refresh tokens
});

poly.on('poll', function(longPoll) {
  callAsync(doPoll(longPoll));
});

poly.on('oauth', function(oaMessage) {
  // oaMessage.code: Authorization code received after authorization
  // oaMessage.state: This must be the worker ID.

  logger.info('Received oAuth message %o', oaMessage);
  // From here, we need to process the authorization token
});

poly.on('stop', async function() {
  logger.info('Graceful stop');

  await doPoll(false);
  await doPoll(true);

  try { 
    poly.stop();
    cp.exec('pkill -f node-sonos-http-api', (err, stdout, stderr) => {
      if (err) {
        logger.info(`exec error: ${err}`);
        return;
      }
    });
  } catch (error) {
    logger.error('poly.stop() Failed: %s', error);
  }
});

poly.on('delete', function() {
  logger.info('Nodeserver is being deleted');

  // We can do some cleanup, then stop.
  poly.stop();
});

poly.on('mqttEnd', function() {
  logger.info('MQTT connection ended.'); // May be graceful or not.
});

poly.on('messageReceived', function(message) {
  // Only display messages other than config
  if (!message['config']) {
    logger.debug('Message Received: %o', message);
  }
});

poly.on('messageSent', function(message) {
  logger.debug('Message Sent: %o', message);
});

async function doPoll(longPoll) {
  try {
    await lock.acquire('poll', function() {
      logger.info('%s', longPoll ? 'Long poll' : 'Short poll');
    });
  } catch (err) {
    logger.error('Error while polling: %s', err.message);
  }
}

async function autoCreateController() {
  try {
    await poly.addNode(
      new ControllerNode(poly, 'controller', 'controller', 'ST-JishiSonos')
    );
  } catch (err) {
    logger.error('Error creating controller node', err);
  }

  poly.addNoticeTemp('newController', 'Controller node initialized', 10);
}

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

poly.start();

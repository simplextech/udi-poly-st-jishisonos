'use strict';

const fs = require('fs');
// const util = require('util');
// const {parse, stringify} = require('flatted');

// The controller node is a regular ISY node. It must be the first node created
// by the node server. It has an ST status showing the nodeserver status, and
// optionally node statuses. It usually has a few commands on the node to
// facilitate interaction with the nodeserver from the admin console or
// ISY programs.

// nodeDefId must match the nodedef id in your nodedef
const nodeDefId = 'CONTROLLER';

module.exports = function(Polyglot) {
  // Utility function provided to facilitate logging.
  const logger = Polyglot.logger;

  const SonosSystem = require('sonos-discovery');
  const settings = require('../node-sonos-http-api/settings');
  const discovery = new SonosSystem(settings);

  // In this example, we also need to have our custom node because we create
  // nodes from this controller. See onCreateNew
  const SonosPlayer = require('./SonosPlayer.js')(Polyglot);


  class Controller extends Polyglot.Node {
    // polyInterface: handle to the interface
    // address: Your node address, withouth the leading 'n999_'
    // primary: Same as address, if the node is a primary node
    // name: Your node name
    constructor(polyInterface, primary, address, name) {
      super(nodeDefId, polyInterface, primary, address, name);

      this.JishiAPI = require('../lib/JishiAPI.js')(Polyglot, polyInterface);

      // Commands that this controller node can handle.
      // Should match the 'accepts' section of the nodedef.
      this.commands = {
        UPDATE_FAVORITES: this.updateFavorites,
        UPDATE_PLAYLISTS: this.updatePlaylists,
        DISCOVER: this.onDiscover,
        UPDATE_PROFILE: this.onUpdateProfile,
        REMOVE_NOTICES: this.onRemoveNotices,
        QUERY: this.query,
      };

      this.drivers = {
        ST: { value: '1', uom: 2 },
      };

      this.isController = true;
      this.discovery = discovery;
      
      discovery.on('transport-state', player => {
        this.sonosUpdate('transport-state', player);
      });

      discovery.on('topology-change', topology => {
        this.sonosUpdate('topology-change', topology);
      });

      discovery.on('volume-change', volumeChange => {
        this.sonosUpdate('volume-change', volumeChange);
      });

    }

    async sonosUpdate(type, data) {
      logger.info('Update Received: ' + type);

      if (type == 'volume-change') {
        // logger.info('Volume Change: %j', data);
        logger.info('UUID: %s - Room: %s - New Volume: %s', data.uuid, data.roomName, data.newVolume);

        let _address = data.uuid.substring(12, 19);
        let address = _address.toLowerCase();
        let node = this.polyInterface.getNode(address);
        node.setDriver('GV0', data.newVolume, true, true)
      }

      if (type == 'transport-state') {
        // logger.info('Transport State: %j', data);
        logger.info('UUID: %s - Room: %s - %s', data.uuid, data.roomName, data.state.playbackState);
      
        let playbackState = 0;
        switch(data.state.playbackState) {
          case 'PLAYING':
            playbackState = 1;
            break;
          case 'TRANSITIONING':
            playbackState = 2;
            break;
          case 'PAUSED_PLAYBACK':
            playbackState = 3;
            break;
          case 'STOPPED':
            playbackState = 4;
            break;
          default:
            logger.info('No PlayBack State');
            playbackState = 0;
        }

        let setMute = 0;
        if (data.state.mute === true) {
          setMute = 1
        }

        let setGroupMute = 0;
        if (data.groupState.mute == true) {
          setGroupMute = 1;
        }

        let setRepeat = 0;
        if (data.state.playMode.repeat === true) {
          setRepeat = 1;
        }

        let setShuffle = 0;
        if (data.state.playMode.shuffle === true) {
          setShuffle = 1;
        }

        let setCrossfade = 0;
        if (data.state.playMode.crossfade === true) {
          setCrossfade = 1;
        }

        logger.info('Group Volume: ' + data.groupState.volume);
        let groupVolume = data.groupState.volume;

        let _address = data.uuid.substring(12, 19);
        let address = _address.toLowerCase();
        let node = this.polyInterface.getNode(address);

        node.setDriver('ST', playbackState, true, true);
        node.setDriver('GV1', groupVolume, true, true);
        node.setDriver('GV2', setMute, true, true);
        node.setDriver('GV3', setGroupMute, true, true);
        node.setDriver('GV4', setRepeat, true, true)
        node.setDriver('GV5', setShuffle, true, true)
        node.setDriver('GV6', setCrossfade, true, true)
        node.setDriver('GV7', data.state.equalizer.bass, true, true)
        node.setDriver('GV8', data.state.equalizer.treble, true, true)
      
      }

      if (type == 'topology-change') {
        // logger.info('Topology Change: %j', data);
        let zones = await this.JishiAPI.zones();
        let nodes = this.polyInterface.getNodes();

        for (let z = 0; z < zones.length; z++) {
          // logger.info('Zone Coordinator: %s - Room %s', zones[z].coordinator.uuid, zones[z].coordinator.roomName);
          let address = zones[z].coordinator.uuid.toString().substring(12, 19).toLowerCase();
          let members = zones[z].members.length;
          let node = this.polyInterface.getNode(address);

          node.setDriver('GV9', members, true, true);
          if (members > 1) {
            node.setDriver('GV10', 1, true, true);
          } else {
            node.setDriver('GV10', 0, true, true);
          }
        }
      }
    }

    async onCreateNew() {
      const prefix = 'node';
      const nodes = this.polyInterface.getNodes();
           
    }

    // Here you could discover devices from a 3rd party API
    async onDiscover() {

      logger.info('Discovering');
      let zones = await this.JishiAPI.zones();
      
      for (var z = 0; z < zones.length; z++) {
        logger.info('Zone Coordinator: %s - Room %s', zones[z].coordinator.uuid, zones[z].coordinator.roomName);

        for (var m = 0; m < zones[z].members.length; m++) {
          logger.info('Members UUID: %s, - Room: %s', zones[z].members[m].uuid, zones[z].members[m].roomName);
          let address = zones[z].members[m].uuid.toString().substring(12, 19).toLowerCase();
          let name = zones[z].members[m].roomName;

          try {
            const result = await this.polyInterface.addNode(
            new SonosPlayer(this.polyInterface, this.address, address, name)
            );
            // logger.info('Add node worked: %s', result);
          } catch (err) {
            logger.errorStack(err, 'Add node failed:');
          }

          // logger.info('---------------' + process.cwd());
          const nlsFile = 'profile/nls/en_US.txt';
          let data = fs.readFileSync(nlsFile, 'utf-8');
          let remove = 'ZONE-' + m + '.*';
          let replace = 'ZONE-' + m + ' = ' + name;
          let newData = data.replace(new RegExp(remove), replace);
          fs.writeFileSync(nlsFile, newData, 'utf-8');
        }
      }
    }

    removeLine(file, input) {
      const workFile = file;
      const search = input.toString();

      let data = fs.readFileSync(workFile, 'utf-8');
      let newData = data.replace(new RegExp(/${search}.*/gm), '');
      fs.writeFileSync(workFile, 'utf-8');
    }

    async updatePlaylists() {
      let playlists = await this.JishiAPI.playlists();
      const nlsFile = 'profile/nls/en_US.txt';
      let cleanData = [];

      try {
        const data = fs.readFileSync(nlsFile, 'utf-8');
        const lines = data.split(/\r?\n/);
        let re = /PLAYLIST-.*/;

        lines.forEach((line => {
          if (!re.test(line)) {
            cleanData.push(line);
          }
        }));

      } catch (error) {
        logger.error(error);
      }

      for (let f = 0; f < playlists.length; f++) {
        logger.info('PLAYLIST-' + f + ' = ' + playlists[f]);
        let playList = 'PLAYLIST-' + f + ' = ' + playlists[f];
        cleanData.push(playList);
      }

      try {
        fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
      } catch (error) {
        logger.error(error);
      }
    }

    async updateFavorites() {
      let favorites = await this.JishiAPI.favorites();
      const nlsFile = 'profile/nls/en_US.txt';
      let cleanData = [];

      try {
        const data = fs.readFileSync(nlsFile, 'utf-8');
        const lines = data.split(/\r?\n/);
        let re = /FAVORITE-.*/;

        lines.forEach((line => {
          if (!re.test(line)) {
            cleanData.push(line);
          }
        }));

      } catch (error) {
        logger.error(error);
      }

      for (let f = 0; f < favorites.length; f++) {
        logger.info('FAVORITE-' + f + ' = ' + favorites[f]);
        let fav = 'FAVORITE-' + f + ' = ' + favorites[f];
        cleanData.push(fav);
      }

      try {
        fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
      } catch (error) {
        logger.error(error);
      }
    }

    async updateClips() {
      const nlsFile = 'profile/nls/en_US.txt';

      let data = fs.readFileSync(nlsFile, 'utf-8');
      let clipData = data.replace(new RegExp(/FAVORITE-.*/gm), '');
      fs.writeFileSync(nlsFile +'-new', clipData, 'utf-8');
    }

    async updateSay() {
      const nlsFile = 'profile/nls/en_US.txt';

      let data = fs.readFileSync(nlsFile, 'utf-8');
      let sayData = data.replace(new RegExp(/FAVORITE-.*/gm), '');
      fs.writeFileSync(nlsFile +'-new', sayData, 'utf-8');
    }

    // Sends the profile files to ISY
    onUpdateProfile() {
      this.polyInterface.updateProfile();
    }

    // Removes notices from the Polyglot UI
    onRemoveNotices() {
      this.polyInterface.removeNoticesAll();
    }
  };

  // Required so that the interface can find this Node class using the nodeDefId
  Controller.nodeDefId = nodeDefId;

  return Controller;
};


// Those are the standard properties of every nodes:
// this.id              - Nodedef ID
// this.polyInterface   - Polyglot interface
// this.primary         - Primary address
// this.address         - Node address
// this.name            - Node name
// this.timeAdded       - Time added (Date() object)
// this.enabled         - Node is enabled?
// this.added           - Node is added to ISY?
// this.commands        - List of allowed commands
//                        (You need to define them in your custom node)
// this.drivers         - List of drivers
//                        (You need to define them in your custom node)

// Those are the standard methods of every nodes:
// Get the driver object:
// this.getDriver(driver)

// Set a driver to a value (example set ST to 100)
// this.setDriver(driver, value, report=true, forceReport=false, uom=null)

// Send existing driver value to ISY
// this.reportDriver(driver, forceReport)

// Send existing driver values to ISY
// this.reportDrivers()

// When we get a query request for this node.
// Can be overridden to actually fetch values from an external API
// this.query()

// When we get a status request for this node.
// this.status()

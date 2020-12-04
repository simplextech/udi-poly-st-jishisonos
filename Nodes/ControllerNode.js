'use strict';

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

  const fs = require('fs');
  const SonosSystem = require('sonos-discovery');
  const settings = require('../node-sonos-http-api/settings');
  const discovery = new SonosSystem(settings);
  const cp = require('child_process');

  const SonosPlayer = require('./SonosPlayer.js')(Polyglot);


  class Controller extends Polyglot.Node {
    // polyInterface: handle to the interface
    // address: Your node address, withouth the leading 'n999_'
    // primary: Same as address, if the node is a primary node
    // name: Your node name
    constructor(polyInterface, primary, address, name) {
      super(nodeDefId, polyInterface, primary, address, name);

      this.JishiAPI = require('../lib/JishiAPI.js')(Polyglot, polyInterface);
      this.jishi = cp.fork('./lib/JishiServer.js');

      // Commands that this controller node can handle.
      // Should match the 'accepts' section of the nodedef.
      this.commands = {
        UPDATE_FAVORITES: this.updateFavorites,
        UPDATE_PLAYLISTS: this.updatePlaylists,
        DISCOVER: this.onDiscover,
        UPDATE_PROFILE: this.onUpdateProfile,
        UPDATE_CLIPS: this.updateClips,
        UPDATE_SAY: this.updateSay,
        SAYALL: this.playerSayAll,
        CLIPALL: this.playerClipAll,
        PAUSEALL: this.pauseAll,
        RESUMEALL: this.resumeAll,
        QUERY: this.query,
      };

      this.drivers = {
        ST: { value: '1', uom: 2 },
      };

      this.isController = true;
      this.discovery = discovery;

      // const nodes = this.polyInterface.getNodes();
      // let nodeCount = Object.keys(nodes).length

      discovery.on('transport-state', player => {
        this.sonosUpdate('transport-state', player);
      });

      discovery.on('topology-change', topology => {
        this.sonosUpdate('topology-change', topology);
      });

      discovery.on('volume-change', volumeChange => {
        this.sonosUpdate('volume-change', volumeChange);
      });


      this.Init();

     }


    sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      })
    }

    async Init() {
      await this.sleep(5000);
      this.updateFavorites();
      await this.sleep(2000);
      this.updatePlaylists();
      await this.sleep(2000);
      this.updateSay();
      await this.sleep(2000);
      this.updateClips();
      await this.sleep(2000);
      this.updateZones();

    }

    async sonosUpdate(type, data) {
      logger.info('Update Received: ' + type);

      if (type == 'volume-change') {
        // logger.info('Volume Change: %j', data);
        logger.info('UUID: %s - Room: %s - New Volume: %s', data.uuid, data.roomName, data.newVolume);

        let _address = data.uuid.substring(12, 19);
        let address = _address.toLowerCase();
        let node;

        try {
          node = this.polyInterface.getNode(address);
        } catch (error) {
          logger.info(error);
        }

        if (node) {
          node.setDriver('GV0', data.newVolume, true, true)
        }
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
        let node;

        try {
          node = this.polyInterface.getNode(address);
        } catch (error) {
          logger.error(error);
        }

        if (node) {
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
      }

      if (type == 'topology-change') {
        // logger.info('Topology Change: %j', data);
        let zones = await this.JishiAPI.zones();
        // let nodes = this.polyInterface.getNodes();

        for (let z = 0; z < zones.length; z++) {
          // logger.info('Zone Coordinator: %s - Room %s', zones[z].coordinator.uuid, zones[z].coordinator.roomName);
          let address = zones[z].coordinator.uuid.toString().substring(12, 19).toLowerCase();
          let members = zones[z].members.length;
          let node;

          try {
            node = this.polyInterface.getNode(address);
          } catch (error) {
            logger.info(error);
          }

          if (node) {
            node.setDriver('GV9', members, true, true);
            if (members > 1) {
              node.setDriver('GV10', 1, true, true);
            } else {
              node.setDriver('GV10', 0, true, true);
            }  
          }
        }
        this.updateZones();
      }
    }

    async onCreateNew() {
      const prefix = 'node';
      const nodes = this.polyInterface.getNodes();

    }

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
            this.JishiAPI.sleep(1000);
            // logger.info('Add node worked: %s', result);
          } catch (err) {
            logger.errorStack(err, 'Add node failed:');
          }
        }
      }
      // this.updateZones();
      this.polyInterface.restart();
    }

    async updateZones() {
      let zones = await this.JishiAPI.zones();
      const nlsFile = 'profile/nls/en_US.txt';
      let cleanData = [];

      if (zones.length != 0) {
        try {
          const data = fs.readFileSync(nlsFile, 'utf-8');
          const lines = data.split(/\r?\n/);
          let re = /ZONE-.*/;
  
          lines.forEach((line => {
            if (!re.test(line)) {
              cleanData.push(line);
            }
          }));
  
        } catch (error) {
          logger.error(error);
        }
  
        for (let z = 0; z < zones.length; z++) {
          logger.info('ZONE-' + z + ' = ' + zones[z].coordinator.roomName);
          let zone = 'ZONE-' + z + ' = ' + zones[z].coordinator.roomName;
          cleanData.push(zone);
        }
  
        try {
          fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
        } catch (error) {
          logger.error(error);
        }
  
        this.onUpdateProfile();
      }
    }

    async updatePlaylists() {
      let playlists = await this.JishiAPI.playlists();
      const nlsFile = 'profile/nls/en_US.txt';
      let cleanData = [];

      if (playlists.length != 0) {
        try {
          const data = fs.readFileSync(nlsFile, 'utf-8');
          const lines = data.split(/\r?\n/);
          let re = /PLAY_LIST-.*/;
  
          lines.forEach((line => {
            if (!re.test(line)) {
              cleanData.push(line);
            }
          }));
  
        } catch (error) {
          logger.error(error);
        }
  
        for (let f = 0; f < playlists.length; f++) {
          logger.info('PLAY_LIST-' + f + ' = ' + playlists[f]);
          let playList = 'PLAY_LIST-' + f + ' = ' + playlists[f];
          cleanData.push(playList);
        }
  
        try {
          fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
        } catch (error) {
          logger.error(error);
        }
  
        this.onUpdateProfile();
      }
    }

    async updateFavorites() {
      let favorites = await this.JishiAPI.favorites();
      const nlsFile = 'profile/nls/en_US.txt';
      let cleanData = [];

      if (favorites.length != 0) {
        try {
          const data = fs.readFileSync(nlsFile, 'utf-8');
          const lines = data.split(/\r?\n/);
          let re = /FAV_LIST-.*/;
  
          lines.forEach((line => {
            if (!re.test(line)) {
              cleanData.push(line);
            }
          }));
  
        } catch (error) {
          logger.error(error);
        }
  
        for (let f = 0; f < favorites.length; f++) {
          logger.info('FAV_LIST-' + f + ' = ' + favorites[f]);
          let fav = 'FAV_LIST-' + f + ' = ' + favorites[f];
          cleanData.push(fav);
        }
  
        try {
          fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
        } catch (error) {
          logger.error(error);
        }
  
        this.onUpdateProfile();
      }
    }

    async updateClips() {
      const nlsFile = 'profile/nls/en_US.txt';
      const clipsDir = 'node-sonos-http-api/static/clips';
      let clips = [];
      let cleanData = [];

      if (clips.length != 0) {
        try {
          fs.readdirSync(clipsDir).forEach(file => {
            logger.info(file);
            clips.push(file);
          });
        } catch (error) {
          logger.error(error);
        }
        
        try {
          const data = fs.readFileSync(nlsFile, 'utf-8');
          const lines = data.split(/\r?\n/);
          let re = /CLIP_LIST-.*/;
  
          lines.forEach((line => {
            if (!re.test(line)) {
              cleanData.push(line);
            }
          }));
  
        } catch (error) {
          logger.error(error);
        }
  
        for (let f = 0; f < clips.length; f++) {
          logger.info('CLIP_LIST-' + f + ' = ' + clips[f]);
          let clip = 'CLIP_LIST-' + f + ' = ' + clips[f];
          cleanData.push(clip);
        }
  
        try {
          fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
        } catch (error) {
          logger.error(error);
        }
  
        this.onUpdateProfile();
      }
    }

    async updateSay() {
      const nlsFile = 'profile/nls/en_US.txt';
      let sayParams = this.polyInterface.getCustomParams();
      let cleanData = [];

      try {
        const data = fs.readFileSync(nlsFile, 'utf-8');
        const lines = data.split(/\r?\n/);
        let re = /SAY_LIST-.*/;

        lines.forEach((line => {
          if (!re.test(line)) {
            cleanData.push(line);
          }
        }));

      } catch (error) {
        logger.error(error);
      }

      for (let s in sayParams) {
        let pos = s.split(' ')[1];
        logger.info('SAY_LIST-' + pos + ' = ' + sayParams[s]);
        let say = 'SAY_LIST-' + pos + ' = ' + sayParams[s];
        cleanData.push(say);
      }

      try {
        fs.writeFileSync(nlsFile, cleanData.join('\n'), 'utf-8');
      } catch (error) {
        logger.error(error);
      }

      this.onUpdateProfile();
     
    }

    // Sends the profile files to ISY
    onUpdateProfile() {
      this.polyInterface.updateProfile();
    }

    // Removes notices from the Polyglot UI
    onRemoveNotices() {
      this.polyInterface.removeNoticesAll();
    }

    async playerSayAll(message) {
      let sayParams = this.polyInterface.getCustomParams();
      for (let s in sayParams) {
        let pos = s.split(' ')[1];
        if (pos == message.value) {
          logger.info('Player Say: ' + sayParams[s]);
          let call = await this.JishiAPI.playerSayAll(sayParams[s]);
          logger.info('SayAll return: %s', call);
        }
      }
    }

    async playerClipAll(message) {
      const clipsDir = 'node-sonos-http-api/static/clips';
      let clips = [];

      try {
        fs.readdirSync(clipsDir).forEach(file => {
          logger.info('Clip All file: %s', file);
          clips.push(file);
        });
      } catch (error) {
        logger.error(error);
      }

      let playClip = clips[message.value];
      let call = await this.JishiAPI.playerClipAll(playClip);
      logger.info('Clip All API Return: %s', call);
    }

    pauseAll(message) {
      if (message.value) {
        this.JishiAPI.pauseAll(message.value);
      } else {
        this.JishiAPI.pauseAll();
      }
    }

    resumeAll(message) {
      if (message.value) {
        this.JishiAPI.resumeAll(message.value);
      } else {
        this.JishiAPI.resumeAll();
      } 
    }
    
  };

  // Required so that the interface can find this Node class using the nodeDefId
  Controller.nodeDefId = nodeDefId;

  return Controller;
};


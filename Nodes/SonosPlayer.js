'use strict';

const { Console } = require('console');
const fs = require('fs');

// This is an example NodeServer Node definition.
// You need one per nodedefs.

// nodeDefId must match the nodedef id in your nodedef
const nodeDefId = 'SONOS_PLAYER';

module.exports = function(Polyglot) {
// Utility function provided to facilitate logging.
  const logger = Polyglot.logger;

  // This is your custom Node class
  class SonosPlayer extends Polyglot.Node {

    // polyInterface: handle to the interface
    // address: Your node address, withouth the leading 'n999_'
    // primary: Same as address, if the node is a primary node
    // name: Your node name
    constructor(polyInterface, primary, address, name) {
      super(nodeDefId, polyInterface, primary, address, name);

      this.JishiAPI = require('../lib/JishiAPI.js')(Polyglot, polyInterface);

      // PGC supports setting the node hint when creating a node
      // REF: https://github.com/UniversalDevicesInc/hints
      // Must be a string in this format
      // If you don't care about the hint, just comment the line.
      // this.hint = '0x01020900'; // Example for a Dimmer switch

      // Commands that this node can handle.
      // Should match the 'accepts' section of the nodedef.
      this.commands = {
        // DON: this.onDON,
        // DOF: this.onDOF,
        SVOL: this.playerVolume,
        GSVOL: this.groupVolume,
        PMUTE: this.playerMute,
        GMUTE: this.groupMute,
        BASS: this.playerBass,
        TREBLE: this.playerTreble,
        REPEAT: this.playerRepeat,
        SHUFFLE: this.playerShuffle,
        CROSSFADE: this.playerCrossfade,
        PLAYLIST: this.playerPlaylist,
        FAVORITE: this.playerFavorite,
        SAY: this.playerSay,
        // SAYALL: this.playerSayAll,
        CLIP: this.playerClip,
        // CLIPALL: this.playerClipAll,
        JOIN: this.playerJoin,
        LEAVE: this.playerLeave,
        PLAY: this.playerPlay,
        PAUSE: this.playerPause,
        NEXT: this.playerNext,
        PREVIOUS: this.playerPrevious,
        // You can use the query function from the base class directly
        QUERY: this.query,
      };

      // Status that this node has.
      // Should match the 'sts' section of the nodedef.
      this.drivers = {
        ST: {value: '0', uom: 25},
        GV0: {value: '0', uom: 51}, // Player Volume
        GV1: {value: '0', uom: 51}, // Group Volume
        GV2: {value: '0', uom: 2}, // Player Mute
        GV3: {value: '0', uom: 2}, // Group Mute
        GV4: {value: '0', uom: 2}, // Repeat
        GV5: {value: '0', uom: 2}, // Shuffle
        GV6: {value: '0', uom: 2}, // Crossfade
        GV7: {value: '0', uom: 56}, // Bass
        GV8: {value: '0', uom: 56}, // Treble
        GV9: {value: '0', uom: 56}, // Members
        GV10: {value: '0', uom: 2}, // Coordinator
      };

    }

    playerVolume(message) {
      this.JishiAPI.volume(this.name, message.value);
    }
    
    groupVolume(message) {
      this.JishiAPI.groupVolume(this.name, message.value);
      this.setDriver('GV1', message.value, true, true)
    }

    playerMute(message) {
      if (message.value == 1) {
        this.JishiAPI.playerMute(this.name);
        this.setDriver('GV2', 1, true, true);
      } else {
        this.JishiAPI.playerUnmute(this.name);
        this.setDriver('GV2', 0, true, true);
      }
    }

    groupMute(message) {
      if (message.value == 1) {
        this.JishiAPI.groupMute(this.name);
        this.setDriver('GV3', 1, true, true);
      } else {
        this.JishiAPI.groupUnmute(this.name);
        this.setDriver('GV3', 0, true, true);
      }
    }

    playerPlay() {
      this.JishiAPI.play(this.name);
    }

    playerPause() {
      this.JishiAPI.pause(this.name);
    }

    playerNext() {
      this.JishiAPI.next(this.name);
    }

    playerPrevious() {
      this.JishiAPI.previous(this.name);
    }

    playerBass(message) {
      this.JishiAPI.playerBass(this.name, message.value);
      this.setDriver('GV7', message.value, true, true);
    }

    playerTreble(message) {
      this.JishiAPI.playerTreble(this.name, message.value);
      this.setDriver('GV8', message.value, true, true);
    }

    playerRepeat(message) {
      if (message.value == 1) {
        this.JishiAPI.playerRepeat(this.name, 1);
      } else {
        this.JishiAPI.playerRepeat(this.name, 0);
      }
    }

    playerShuffle(message) {
      if (message.value == 1) {
        this.JishiAPI.playerShuffle(this.name, 1);
      } else {
        this.JishiAPI.playerShuffle(this.name, 0);
      }
    }

    playerCrossfade(message) {
      if (message.value == 1) {
        this.JishiAPI.playerCrossfade(this.name, 1);
      } else {
        this.JishiAPI.playerCrossfade(this.name, 0);
      }
    }

    async playerFavorite(message) {
      let favorites = await this.JishiAPI.favorites();
      let favorite = favorites[message.value];
      this.JishiAPI.playerFavorite(this.name, favorite);
    }

    async playerPlaylist(message) {
      let playlists = await this.JishiAPI.playlists();
      let playlist = playlists[message.value];
      this.JishiAPI.playerPlaylist(this.name, playlist);
    }

    async playerSay(message) {
      let sayParams = this.polyInterface.getCustomParams();
      for (let s in sayParams) {
        let pos = s.split(' ')[1];
        if (pos == message.value) {
          logger.info('Player Say: ' + sayParams[s]);
          this.JishiAPI.playerSay(this.name, sayParams[s]);
        }
      }
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

    async playerClip(message) {
      const clipsDir = 'node-sonos-http-api/static/clips';
      let clips = [];

      try {
        fs.readdirSync(clipsDir).forEach(file => {
          logger.info('Clip file: %s', file);
          clips.push(file);
        });
      } catch (error) {
        logger.error(error);
      }

      let playClip = clips[message.value];
      this.JishiAPI.playerClip(this.name, playClip);
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

    async playerJoin(message) {
      // let zones = await this.JishiAPI.zones();
      // let zoneData = [];

      // for (let z = 0; z < zones.length; z++) {
      //   // logger.info('ZONE-' + z + ' = ' + zones[z].coordinator.roomName);
      //   let zone = zones[z].coordinator.roomName;
      //   zoneData.push(zone);
      // }

      // logger.info('Join Zone: ' + message.value);
      // logger.info('Zone Text: ' + zoneData[message.value]);

      // let data = await this.JishiAPI.playerJoin(this.name, zoneData[message.value]);

      const nlsFile = 'profile/nls/en_US.txt';
      let zoneData = [];

      try {
        const data = fs.readFileSync(nlsFile, 'utf-8');
        const lines = data.split(/\r?\n/);
        let re = /ZONE-.*/;

        lines.forEach((line => {
          if (re.test(line)) {
            zoneData.push(line.split('=')[1].trim());
          }
        }));

      } catch (error) {
        logger.error(error);
      }

      logger.info('Zone Data: ' + zoneData);
      for (const z in zoneData) {
        logger.info(zoneData[z]);
      };

      // logger.info('Join Zone: ' + message.value);
      logger.info('Join Zone Text: ' + zoneData[message.value]);
      await this.JishiAPI.playerJoin(this.name, zoneData[message.value]);

    }

    async playerLeave() {
      await this.JishiAPI.playerLeave(this.name);
    }


  };

  // Required so that the interface can find this Node class using the nodeDefId
  SonosPlayer.nodeDefId = nodeDefId;

  return SonosPlayer;
};

'use strict';

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
        PLAYLST: this.playlist,
        FAV: this.playerFavorite,
        SAY: this.say,
        CLIP: this.clip,
        PLAY: this.play,
        PAUSE: this.pause,
        NEXT: this.next,
        PREVIOUS: this.previous,
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

    play() {
      this.JishiAPI.play(this.name);
    }

    pause() {
      this.JishiAPI.pause(this.name);
    }

    next() {
      this.JishiAPI.next(this.name);
    }

    previous() {
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

  };

  // Required so that the interface can find this Node class using the nodeDefId
  SonosPlayer.nodeDefId = nodeDefId;

  return SonosPlayer;
};

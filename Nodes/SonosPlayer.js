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

      // PGC supports setting the node hint when creating a node
      // REF: https://github.com/UniversalDevicesInc/hints
      // Must be a string in this format
      // If you don't care about the hint, just comment the line.
      // this.hint = '0x01020900'; // Example for a Dimmer switch

      // Commands that this node can handle.
      // Should match the 'accepts' section of the nodedef.
      this.commands = {
        DON: this.onDON,
        DOF: this.onDOF,
        SVOL: this.playerVolume,
        GSVOL: this.groupVolume,
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

    }
    
    groupVolume(message) {

    }

    play(message) {

    }

    onDON(message) {
      logger.info('DON (%s): %s',
        this.address,
        message.value ? message.value : 'No value');

      // setDrivers accepts string or number (message.value is a string)
      this.setDriver('ST', message.value ? message.value : '100');
    }

    onDOF() {
      logger.info('DOF (%s)', this.address);
      this.setDriver('ST', '0');
    }
  };

  // Required so that the interface can find this Node class using the nodeDefId
  SonosPlayer.nodeDefId = nodeDefId;

  return SonosPlayer;
};

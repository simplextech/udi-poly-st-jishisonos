'use strict';

const fs = require('fs');

const nodeDefId = 'SONOS_PLAYER';

module.exports = function(Polyglot) {
  const logger = Polyglot.logger;

  class SonosPlayer extends Polyglot.Node {
    constructor(polyInterface, primary, address, name) {
      super(nodeDefId, polyInterface, primary, address, name);

      this.JishiAPI = require('../lib/JishiAPI.js')(Polyglot, polyInterface);
      this.nlsFile = 'profile/nls/en_US.txt';

      this.commands = {
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
        CLIP: this.playerClip,
        JOIN: this.playerJoin,
        LEAVE: this.playerLeave,
        PLAY: this.playerPlay,
        PAUSE: this.playerPause,
        NEXT: this.playerNext,
        PREVIOUS: this.playerPrevious,
        PARTY: this.partyMode,
        // You can use the query function from the base class directly
        QUERY: this.query,
      };

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

    sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    playerVolume(message) {
      this.JishiAPI.volume(this.name, message.value)
      .then(() => this.setDriver('GV0', message.value, true, true));
    }

    groupVolume(message) {
      this.JishiAPI.groupVolume(this.name, message.value)
      .then(() => this.setDriver('GV1', message.value, true, true));
    }

    playerMute(message) {
      // eslint-disable-next-line eqeqeq
      if (message.value == 1) {
        this.JishiAPI.playerMute(this.name)
        .then(() => this.setDriver('GV2', 1, true, true));
      } else {
        this.JishiAPI.playerUnmute(this.name)
        .then(() => this.setDriver('GV2', 0, true, true));
      }
    }

    groupMute(message) {
      // eslint-disable-next-line eqeqeq
      if (message.value == 1) {
        this.JishiAPI.groupMute(this.name)
        .then(() => this.setDriver('GV3', 1, true, true));
      } else {
        this.JishiAPI.groupUnmute(this.name)
        .then(() => this.setDriver('GV3', 0, true, true));
      }
    }

    playerPlay() {
      this.JishiAPI.play(this.name)
      .then(() => this.setDriver('ST', 1, true, true));
    }

    playerPause() {
      this.JishiAPI.pause(this.name)
      .then(() => this.setDriver('ST', 3, true, true));
    }

    playerNext() {
      this.JishiAPI.next(this.name).then(() => logger.info('Next'));
    }

    playerPrevious() {
      this.JishiAPI.previous(this.name).then(() => logger.info('Previous'));
    }

    playerBass(message) {
      this.JishiAPI.playerBass(this.name, message.value)
      .then(() => this.setDriver('GV7', message.value, true, true));
    }

    playerTreble(message) {
      this.JishiAPI.playerTreble(this.name, message.value)
      .then(() => this.setDriver('GV8', message.value, true, true));
    }

    playerRepeat(message) {
      // eslint-disable-next-line eqeqeq
      if (message.value == 1) {
        this.JishiAPI.playerRepeat(this.name, 1)
        .then(() => this.setDriver('GV4', 1, true, true));
      } else {
        this.JishiAPI.playerRepeat(this.name, 0)
        .then(() => this.setDriver('GV4', 0, true, true));
      }
    }

    playerShuffle(message) {
      // eslint-disable-next-line eqeqeq
      if (message.value == 1) {
        this.JishiAPI.playerShuffle(this.name, 1)
        .then(() => this.setDriver('GV5', 1, true, true));
      } else {
        this.JishiAPI.playerShuffle(this.name, 0)
        .then(() => this.setDriver('GV5', 0, true, true));
      }
    }

    playerCrossfade(message) {
      // eslint-disable-next-line eqeqeq
      if (message.value == 1) {
        this.JishiAPI.playerCrossfade(this.name, 1)
        .then(() => this.setDriver('GV6', 1, true, true));
      } else {
        this.JishiAPI.playerCrossfade(this.name, 0)
        .then(() => this.setDriver('GV6', 0, true, true));
      }
    }

    async playerFavorite(message) {
      let favorites = await this.JishiAPI.favorites();
      let favorite = favorites[message.value];
      await this.JishiAPI.playerFavorite(this.name, favorite);
    }

    async playerPlaylist(message) {
      let playlists = await this.JishiAPI.playlists();
      let playlist = playlists[message.value];
      await this.JishiAPI.playerPlaylist(this.name, playlist);
    }

    async playerSay(message) {
      let sayParams = this.polyInterface.getCustomParams();
      for (let s in sayParams) {
        if (sayParams.hasOwnProperty(s)) {
          let pos = s.split(' ')[1];
          if (pos === message.value) {
            // logger.info('Player Say: ' + sayParams[s]);
            await this.JishiAPI.playerSay(this.name, sayParams[s]);
          }
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
      await this.JishiAPI.playerClip(this.name, playClip);
    }

    async getZoneData() {
      let zoneData = [];

      try {
        const data = fs.readFileSync(this.nlsFile, 'utf-8');
        const lines = data.split(/\r?\n/);
        let re = /ZONE-.*/;

        lines.forEach(line => {
          if (re.test(line)) {
            zoneData.push(line.split('=')[1].trim());
          }
        });

      } catch (error) {
        logger.error(error);
      }
      return zoneData;
    }

    async playerJoin(message) {
      let zoneData = await this.getZoneData();
      // logger.info('Zone Data: ' + zoneData);
      // logger.info('Join Zone Text: ' + zoneData[message.value]);
      await this.JishiAPI.playerJoin(this.name, zoneData[message.value]);
    }

    async playerLeave() {
      await this.JishiAPI.playerLeave(this.name);
    }

    async partyMode() {
      let zoneData = await this.getZoneData();
      logger.info('Zone Data: ' + zoneData);

      for (const z in zoneData) {
        if (zoneData.hasOwnProperty(z)) {
          if (zoneData[z] !== this.name) {
            logger.info(zoneData[z]);
            await this.JishiAPI.playerJoin(zoneData[z], this.name);
            await this.sleep(1000);
          }
        }
      }
    }
  }

  SonosPlayer.nodeDefId = nodeDefId;

  return SonosPlayer;
};

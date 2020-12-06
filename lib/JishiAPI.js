'use strict';

const axios = require('axios').default;

const baseUrl = 'http://localhost:5005/';

module.exports = function(Polyglot, polyInterface) {
  const logger = Polyglot.logger;

  class JishiInterface {
    constructor(polyInterface) {
      this.polyInterface = polyInterface;
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async axiosGet(path) {
      try {
        const URL = baseUrl + path;
        const response = await axios.get(URL);
        return response.data;
      } catch (error) {
        logger.error(error);
      }
    }

    async zones() {
      return await this.axiosGet('zones');
    }

    async favorites() {
      return await this.axiosGet('favorites');
    }

    async playlists() {
      return await this.axiosGet('playlists');
    }

    async play(group) {
      return await this.axiosGet(group + '/play');
    }

    async pause(group) {
      return this.axiosGet(group + '/pause');
    }

    async pauseAll(timeout) {
      let data;
      if (timeout) {
        data = this.axiosGet('pauseall' + '/' + timeout);
      } else {
        data = this.axiosGet('pauseall');
      }
      return data;
    }

    async resumeAll(timeout) {
      let data;
      if (timeout) {
        data = this.axiosGet('resumeall' + '/' + timeout);
      } else {
        data = this.axiosGet('resumeall');
      }
      return data;
    }

    async next(group) {
      await this.axiosGet(group + '/next');
    }

    async previous(group) {
      await this.axiosGet(group + '/previous');
    }

    async volume(group, value) {
      return this.axiosGet(group + '/volume/' + value);
    }

    async groupVolume(group, value) {
      return this.axiosGet(group + '/groupVolume/' + value);
    }

    async playerMute(group) {
      return this.axiosGet(group + '/mute');
    }

    async playerUnmute(group) {
      return this.axiosGet(group + '/unmute');
    }

    async groupMute(group) {
      return this.axiosGet(group + '/groupMute');
    }

    async groupUnmute(group) {
      return this.axiosGet(group + '/groupUnmute');
    }

    async playerBass(group, value) {
      return this.axiosGet(group + '/bass/' + value);
    }

    async playerTreble(group, value) {
      return this.axiosGet(group + '/treble/' + value);
    }

    async playerRepeat(group, value) {
      let data;
      if (value === 1) {
        data = this.axiosGet(group + '/repeat/on');
      } else {
        data = this.axiosGet(group + '/repeat/off');
      }
      return data;
    }

    async playerShuffle(group, value) {
      let data;
      if (value === 1) {
        data = this.axiosGet(group + '/shuffle/on');
      } else {
        data = this.axiosGet(group + '/shuffle/off');
      }
      return data;
    }

    async playerCrossfade(group, value) {
      let data;
      if (value === 1) {
        data = this.axiosGet(group + '/crossfade/on');
      } else {
        data = this.axiosGet(group + '/crossfade/off');
      }
      return data;
    }

    async playerFavorite(group, favorite) {
      return this.axiosGet(group + '/favorite/' + favorite);
    }

    async playerPlaylist(group, playlist) {
      return this.axiosGet(group + '/playlist/' + playlist);
    }

    async playerSay(group, say) {
      return this.axiosGet(group + '/say/' + say);
    }

    async playerSayAll(say) {
      return await this.axiosGet('sayall/' + say);
    }

    async playerClip(group, clip) {
      return this.axiosGet(group + '/clip/' + clip);
    }

    async playerClipAll(clip) {
      logger.info('Clip All Clip from API: %s', clip);
      return await this.axiosGet('clipall/' + clip);
    }

    async playerJoin(player, group) {
      return this.axiosGet(player + '/join/' + group);
    }

    async playerLeave(player) {
      return this.axiosGet(player + '/leave');
    }

  }

  return new JishiInterface(polyInterface);
};

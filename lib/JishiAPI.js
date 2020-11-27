'use strict';

const axios = require('axios').default;

const baseUrl = 'http://localhost:5005/';

module.exports = function(Polyglot, polyInterface) {
  const logger = Polyglot.logger;

  class JishiInterface {
    constructor(polyInterface) {
      this.polyInterface = polyInterface;
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
      let data = this.axiosGet('zones');
      return data;
    }

    async play(group) {
      let data = this.axiosGet(group + '/play');
      return data;
    }

    async pause(group) {
      let data = this.axiosGet(group + '/pause');
      return data;
    }

    async next(group) {
      let data = this.axiosGet(group + '/next');
      return data;
    }

    async previous(group) {
      let data = this.axiosGet(group + '/previous');
      return data;
    }

    async volume(group, value) {
      let data = this.axiosGet(group + '/volume/' + value);
      return data;
    }

    async groupVolume(group, value) {
      let data = this.axiosGet(group + '/groupVolume/' + value);
      return data;
    }

    async playerMute(group) {
      let data = this.axiosGet(group + '/mute');
      return data;
    }

    async playerUnmute(group) {
      let data = this.axiosGet(group + '/unmute');
      return data;
    }

    async groupMute(group) {
      let data = this.axiosGet(group + '/groupMute');
      return data;
    }

    async groupUnmute(group) {
      let data = this.axiosGet(group + '/groupUnmute');
      return data;
    }

    async playerBass(group, value) {
      let data = this.axiosGet(group + '/bass/' + value);
      return data;
    }

    async playerTreble(group, value) {
      let data = this.axiosGet(group + '/treble/' + value);
      return data;
    }

    async playerRepeat(group, value) {
      let data;
      if (value == 1) {
        data = this.axiosGet(group + '/repeat/on');
      } else {
        data = this.axiosGet(group + '/repeat/off');
      }
      return data;
    }

    async playerShuffle(group, value) {
      let data;
      if (value == 1) {
        data = this.axiosGet(group + '/shuffle/on');
      } else {
        data = this.axiosGet(group + '/shuffle/off');
      }
      return data;
    }

    async playerCrossfade(group, value) {
      let data;
      if (value == 1) {
        data = this.axiosGet(group + '/crossfade/on');
      } else {
        data = this.axiosGet(group + '/crossfade/off');
      }
      return data;
    }

    async favorites() {
      let data = this.axiosGet('favorites');
      return data;
    }

    async playlists() {
      let data = this.axiosGet('playlists');
      return data;
    }

    async playerFavorite(group, favorite) {
      let data = this.axiosGet(group + '/favorite/' + favorite);
      return data;
    }
    
  }

 
  return new JishiInterface(polyInterface);
};

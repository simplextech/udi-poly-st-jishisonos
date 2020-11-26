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

    async volume(group, value) {
      let data = this.axiosGet(group + '/volume/' + value);
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

  }

 
  return new JishiInterface(polyInterface);
};

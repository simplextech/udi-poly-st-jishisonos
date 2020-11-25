'use strict';

const axios = require('axios').default;

const baseUrl = 'http://localhost:5005';

module.exports = function(Polyglot, polyInterface) {
  const logger = Polyglot.logger;

  class JishiInterface {
    constructor(polyInterface) {
      this.polyInterface = polyInterface;
    }

    async OldgetReq(path, serialNumber) {
      let sessionId = await storage.getItem('sessionId');
      let data = null;

      const config = {
        method: 'get',
        url: baseUrl + path,
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          sessionid: sessionId,
          serialnumber: serialNumber
        }
      }
      // logger.info('Axios Config: ' + JSON.stringify(config));

      try {
        const res = await axios.request(config);
        data = res.data;
      }
      catch(err) {
        logger.error(err);
        data = null;
      }
      
      return data;
    }

    async OldpostReq(path, serialNumber, setPoint) {
      let sessionId = await storage.getItem('sessionId');
      let data = null;

      const config = {
        method: 'post',
        url: baseUrl + path,
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          sessionid: sessionId,
          serialnumber: serialNumber
        },
        data: {
          ScheduleMode: 3,
          SetPointTemp: setPoint
        }
      }
      // logger.info('Axios Config: ' + JSON.stringify(config));

      try {
        const res = await axios.request(config);
        data = res.data;
      }
      catch(err) {
        logger.error(err);
        data = null
      }
      // logger.info('getReq data: ' + JSON.stringify(data));
      
      return data;
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
      let data = this.axiosGet('/zones');
      return data;
    //   return data;
        // axios.get(baseUrl + '/zones')
        //     .then((response) => {
        //         logger.info(response.data);
        //     })
    }

    async favorites() {
      let data = this.getReq('/favorites');
      return data;
    }

    async playlists() {
      let data = this.getReq('/playlists');
      return data;
    }
  }

 
  return new JishiInterface(polyInterface);
};

const {request} = require('graphql-request');

module.exports = class GfxRepoClient {
  constructor(api_endpoint) {
    this.api_endpoint = api_endpoint;
  }
  get_texture(key, level) {
    var all = [];
  	if (typeof key == 'undefined') {

      const query = `{
          textures {name src width height}
        }`
      return request(this.api_endpoint, query).then(data => {
          data.textures.forEach(value => {
            all.push(value);
          });
        });
      return(all);

  	} else {
  		if (typeof level == 'undefined') {
  			level = 0;
  		}

      const query = `{
          texture(name:"${key}", level:${level}) {name src width height}
        }`
      return request(this.api_endpoint, query).then(data => {
          return(data.texture);
      });
  	}
  }
}

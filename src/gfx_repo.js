module.exports = class GfxRepo {
  constructor(gfx_data) {
    this.gfx_data = gfx_data;
  }

  get_texture(key, level) {
    var gfx_data = this.gfx_data
    return new Promise(function(resolve, reject) {
      var all = [];
    	if (typeof key == 'undefined') {

        for (const [key, value] of Object.entries(gfx_data)) {
          for (const [child_key, child_value] of Object.entries(value)) {
            all.push(child_value);
          }
        }
    		resolve(all);
    	} else {
    		if (typeof level == 'undefined') {
    			level = 0;
    		}
  	    resolve(gfx_data[key][level]);
    	}
    });
  }
}
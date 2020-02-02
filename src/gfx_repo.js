module.exports = class GfxRepo {
  constructor(gfx_data) {
    this.gfx_data = gfx_data;
  }
  get_texture(key, level) {
    var all = [];
  	if (typeof key == 'undefined') {

      for (const [key, value] of Object.entries(this.gfx_data)) {
        for (const [child_key, child_value] of Object.entries(value)) {
          all.push(child_value);
        }
      }

  		return all;
  	} else {
  		if (typeof level == 'undefined') {
  			level = 0;
  		}
	    return this.gfx_data[key][level];
  	}
  }
}

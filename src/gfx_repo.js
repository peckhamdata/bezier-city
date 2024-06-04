import Jimp from 'jimp';

export class GfxRepo {
  constructor(gfx_data, root) {
    this.gfx_data = gfx_data;
    this.root = root;
  }

  get_texture(key, level) {
    var gfx_data = this.gfx_data;
    var root = this.root;
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
        Jimp.read(root + gfx_data[key][level].src)
          .then(image => {
            resolve({name: gfx_data[key][level].name, width: image.bitmap.width, height: image.bitmap.height});
        })
    	}
    });
  }
}
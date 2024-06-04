import {lcg_sequence} from "./lcg.js";

export class StreetMaker {

	make(building_names, seed, length) {
		var seq = lcg_sequence(seed, 0, building_names.length, length);
		var result = [];
		seq.forEach(function(num){
			result.push({type: building_names[Math.floor(num)]});
		});
		return result;
	}
}
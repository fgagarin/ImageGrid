/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}
console.log('>>> images')

//var DEBUG = DEBUG != null ? DEBUG : true



/*********************************************************************/

// Calculate relative rotation angle...
//
// Calculate rotation angle relative to from:
// 	calcRelativeRotation(from, 'cw')
// 	calcRelativeRotation(from, 'ccw')
// 		-> 0 | 90 | 180 | 270
//
// Validate an angle:
// 	calcRelativeRotation(angle)
// 	calcRelativeRotation(from, angle)
// 		-> 0 | 90 | 180 | 270
// 		-> null
//
//
module.calcRelativeRotation = function(from, to){
	if(to == null){
		to = from
		from = 0
	}
	to = to == 'cw' ? 1 
		: to == 'ccw' ? -1
		: [0, 90, 180, 270].indexOf(to*1) >= 0 ? to*1
		: [-90, -180, -270].indexOf(to*1) >= 0 ? 360+(to*1)
		: null

	// relative rotation...
	if(to == 1 || to == -1){
		var res = from
		res = res == null ? 0 : res*1
		res += 90*to
		res = res < 0 ? 270 
			: res > 270 ? 0
			: res

	// explicit direction...
	} else {
		var res = to
	}

	return res
}


// cmp functions...
// XXX is this the right way to seporate these???

module.makeImageDateCmp = function(data, get){
	return function(a, b){
		if(get != null){
			a = get(a)
			b = get(b)
		}
		b = data[b].ctime
		a = data[a].ctime

		if(a == b){
			return 0
		} else if(a < b){
			return -1
		} else {
			return +1
		}
	}
}

// NOTE: this expects gids...
module.makeImageNameCmp = function(data, get){
	return function(a, b){
		if(get != null){
			a = get(a)
			b = get(b)
		}
		a = data.getImageFileName(a)
		b = data.getImageFileName(b)
		if(a == b){
			return 0
		} else if(a < b){
			return -1
		} else {
			return +1
		}
	}
}

module.makeImageSeqOrNameCmp = function(data, get, seq){
	seq = seq == null ? data.getImageNameSeq : seq

	return function(a, b){
		// XXX this is ugly and non-generic...
		if(get != null){
			a = get(a)
			b = get(b)
		}
		// XXX this is ugly and non-generic...
		var aa = seq.call(data, a)
		var bb = seq.call(data, b)

		// special case: seq, name
		if(typeof(aa) == typeof(123) && typeof(bb) == typeof('str')){ return -1 }
		// special case: name, seq
		if(typeof(aa) == typeof('str') && typeof(bb) == typeof(123)){ return +1 }

		// get the names if there are no sequence numbers...
		// NOTE: at this point both a and b are either numbers or NaN's...
		a = isNaN(aa) ? data.getImageFileName(a) : aa
		b = isNaN(bb) ? data.getImageFileName(b) : bb

		// do the actual comparison
		if(a == b){
			return 0
		} else if(a < b){
			return -1
		} else {
			return +1
		}
	}
}



/*********************************************************************/

var ImagesClassPrototype =
module.ImagesClassPrototype = {
	fromJSON: function(data){
		return new this().loadJSON(data)
	},
}


var ImagesPrototype =
module.ImagesPrototype = {

	// Generic iterators...
	//
	// function format:
	// 		function(key, value, index, object)
	//
	// this will be set to the value...
	//
	//
	// XXX are these slower than doing it manualy via Object.keys(..)
	forEach: function(func){
		var i = 0
		for(var key in this){
			func.call(this[key], key, this[key], i++, this)
		}
		return this
	},
	map: function(func){
		var res = this.constructor()
		var i = 0
		for(var key in this){
			res[k] = func.call(this[key], key, this[key], i++, this)
		}
		return res
	},
	filter: function(func){
		var res = this.constructor()
		var i = 0
		for(var key in this){
			if(func.call(this[key], key, this[key], i++, this)){
				res[key] = this[key]
			}
		}
		return res
	},

	keys: function(){
		return Object.keys(this)
	},

	// Build an image index relative to an attribute...
	//
	// Format:
	// 	{
	// 		<attr-value> : [
	// 			<gid>,
	// 			...
	// 		],
	// 		...
	// 	}
	//
	// XXX test out the attr list functionality...
	makeIndex: function(attr){
		var res = {}
		attr = attr.constructor.name != 'Array' ? [attr] : attr

		// buld the index...
		var that = this
		this.forEach(function(key){
			var n = attr.map(function(n){ return that[n] })
			n = JSON.stringify(n.length == 1 ? n[0] : n)
				// XXX is this the right way to go?
				.replace(/^"(.*)"$/g, '$1')
			res[n] = n in res ? res[n].concat(key) : [key]
		})

		return res
	},


	// Image data helpers...

	// XXX see: ribbons.js for details...
	getBestPreview: function(){
		// XXX
	},

	// Get image filename...
	getImageFileName: function(gid, do_unescape){
		do_unescape = do_unescape == null ? true : do_unescape
		if(do_unescape){
			return unescape(this[gid].path.split('/').pop())
		} else {
			return this[gid].path.split('/').pop()
		}
	},
	// Get the first sequence of numbers in the file name...
	getImageNameSeq: function(gid){
		var n = this.getImageFileName(gid)
		var r = /([0-9]+)/m.exec(n)
		return r == null ? n : parseInt(r[1])
	},
	// Get the sequence of numbers in the file name but only if it is 
	// at the filename start...
	getImageNameLeadingSeq: function(gid){
		var n = this.getImageFileName(gid)
		var r = /^([0-9]+)/g.exec(n)
		return r == null ? n : parseInt(r[1])
	},


	// Gid sorters...
	// XXX might be a good idea to add caching...
	// XXX chainCmp(..) is loaded from lib/jli.js
	sortImages: function(gids, cmp, reverse){
		gids = gids == null ? Object.keys(this) : gids

		cmp = cmp == null ? module.makeImageDateCmp(this) : cmp
		cmp = cmp.constructor.name == 'Array' ? chainCmp(cmp) : cmp

		gids = gids.sort(cmp)
		gids = reverse ? gids.reverse() : gids

		return gids
	},
	// Shorthands...
	// XXX these seem a bit messy...
	sortByDate: function(gids, reverse){ return this.sortImages(gids, null, reverse) },
	sortByName: function(gids, reverse){
		return this.sortImages(gids, module.makeImageNameCmp(this), reverse) },
	sortBySeqOrName: function(gids, reverse){ 
		return this.sortImages(gids, module.makeImageSeqOrNameCmp(this), reverse) },
	sortByNameXPStyle: function(gids, reverse){ 
		return this.sortImages(gids, 
				module.makeImageSeqOrNameCmp(this, null, this.getImageNameLeadingSeq), 
				reverse) },
	sortByDateOrSeqOrName: function(gids, reverse){
		return this.sortImages(gids, [
					module.makeImageDateCmp(this),
					module.makeImageSeqOrNameCmp(this)
				], reverse)
	},
	// XXX 
	sortedImagesByFileNameSeqWithOverflow: function(gids, reverse){
		// XXX see ../ui/sort.js
	},

	// Actions...

	// Rotate image...
	//
	// Rotate image clockwise:
	//	.rotateImage(target, 'cw')
	//		-> images
	//
	// Rotate image counterclockwise:
	//	.rotateImage(target, 'ccw')
	//		-> images
	//
	// Set explicit image rotation angle:
	//	.rotateImage(target, 0|90|180|270)
	//	.rotateImage(target, -90|-180|-270)
	//		-> images
	//
	// NOTE: target can be a gid or a list of gids...
	rotateImage: function(gids, direction){
		gids = gids.constructor.name != 'Array' ? [gids] : gids
		// validate direction...
		if(module.calcRelativeRotation(direction) == null){
			return this
		}

		var that = this
		gids.forEach(function(key){
			var img = that[key]
			var o = direction == 'cw' || direction == 'ccw' 
				? module.calcRelativeRotation(img.orientation, direction) 
				: direction*1
			if(o == 0){
				delete img.orientation
			} else {
				img.orientation = o
			}
			// account for proportions...
			//that.correctImageProportionsForRotation(img)
			// XXX this is a bit of an overkill but it will update the 
			// 		preview if needed...
			//that.updateImage(img)
		})
		return this
	},

	// Flip image...
	//
	//	.flipImage(target, 'horizontal')
	//	.flipImage(target, 'vertical')
	//		-> images
	//
	flipImage: function(gids, direction){
		gids = gids.constructor.name != 'Array' ? [gids] : gids
		var that = this
		gids.forEach(function(key){
			var img = that[key]
			var state = img.flipped
			state = state == null ? [] : state
			// toggle the specific state...
			var i = state.indexOf(direction)
			if(i >= 0){
				state.splice(i, 1)
			} else {
				state.push(direction)
			}
			if(state.length == 0){
				delete img.flipped
			} else {
				img.flipped = state
			}
		})
		return this
	},


	// serialization...
	loadJSON: function(data){
		data = typeof(data) == typeof('str') 
			? JSON.parse(data) 
			: JSON.parse(JSON.stringify(data))
		for(var k in data){
			this[k] = data[k]
		}
		return this
	},
	dumpJSON: function(data){
		return JSON.parse(JSON.stringify(this))
	},

	_reset: function(){
	},
}



/*********************************************************************/

// Main Images object...
//
var Images = 
module.Images =
function Images(json){
	// in case this is called as a function (without new)...
	if(this.constructor.name != 'Images'){
		return new Images(json)
	}

	// load initial state...
	if(json != null){
		this.loadJSON(json)
	} else {
		this._reset()
	}

	return this
}
Images.__proto__ = ImagesClassPrototype
Images.prototype = ImagesPrototype
Images.prototype.constructor = Images



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

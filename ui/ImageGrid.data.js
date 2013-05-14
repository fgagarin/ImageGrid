/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

var LOAD_SCREENS = 4
var LOAD_THRESHOLD = 1
var DEFAULT_SCREEN_IMAGES = 5
var MAX_SCREEN_IMAGES = 12

// XXX STUB
// Data format...
var DATA = {
	current: 0,
	// the ribbon cache...
	// in the simplest form this is a list of lists of GIDs
	ribbons: [
		$(new Array(100)).map(function(i){return i}).toArray()
	],
	// flat ordered list of images in current context...
	// in the simplest form this is a list of GIDs.
	order: $(new Array(100)).map(function(i){return i}).toArray(),
	// the images object, this is indexed by image GID and contains all 
	// the needed data...
	images: {
		// sub image, for testing load mechanics...
		SIZE: {
			id: 'SIZE',
			ctime: 0,
			path: './images/sizes/900px/SIZE.jpg',
			preview: {
				'150px': './images/sizes/150px/SIZE.jpg',
				'350px': './images/sizes/350px/SIZE.jpg',
				'900px': './images/sizes/900px/SIZE.jpg',
			},
			classes: '',
		},
	}
}



/**********************************************************************
* Helpers
*/

// A predicate returning:
// 	- 0 if a is equal at position i in lst or is between i and i+1
// 	- -1 if a is "below" position i
// 	- +1 if a is "above" position i
//
// NOTE: this is here mostly to make debuging easy...
function isBetween(a, i, lst){
	console.log('>>>', a, i, lst)
	var b = lst[i]
	var c = lst[i+1]
	// hit...
	if(a == b || (a > b && a < c)){
		return 0
	// before...
	} else if(a < b){
		return -1
	// later...
	} else {
		return 1
	}
}


// Basic liner search...
function linSearch(target, lst, check, return_position, disable_direct_indexing){
	// XXX is this the correct default?
	check = check == null ? isBetween : check
	// special case: target in the list directly...
	if(disable_direct_indexing 
			&& check(target, lst.indexOf(target), lst) == 0){
		return target
	}
	// special case: tail...
	if(check(target, lst.length-1, lst) >= 0){
		return lst[lst.length-1]
	}

	for(var i=0; i < lst.length; i++){
		if(check(target, i, lst) == 0){
			return return_position ? i : lst[i]
		}
	}

	// no hit...
	return return_position ? -1 : null
}


// Basic binary search implementation...
//
// NOTE: this will return the object by default, to return position set
// 		return_position to true.
// NOTE: by default this will use isBetween as a predicate.
// NOTE: this still depends on .indexOf(...), to disable set
// 		disable_direct_indexing to true
// XXX BUGGY
// XXX this is a mess, needs revision...
function binSearch(target, lst, check, return_position, disable_direct_indexing){
	// XXX is this the correct default?
	check = check == null ? isBetween : check
	// special case: target in the list directly...
	if(disable_direct_indexing 
			&& check(target, lst.indexOf(target), lst) == 0){
		return target
	}
	// special case: tail...
	if(check(target, lst.length-1, lst) >= 0){
		return lst[lst.length-1]
	}
	// special case: head...
	var res = check(target, 0, lst)
	if(res == 0){
		return lst[0]
	} else if(res < 0){
		// no hit...
		return return_position ? -1 : null
	}

	var l = Math.ceil(lst.length/2)
	var i = l

	while(l > 0){
		// XXX this is a hack -- should we reach 0 using floor(..) instead?
		l = l <= 1 ? 0 : Math.ceil(l/2)
		res = check(target, i, lst)
		// right branch...
		if(res > 0){
			i += l
		// left branch...
		} else if(res < 0){
			i -= l
		// hit...
		} else {
			return return_position ? i : lst[i]
		}
	}
	// no hit...
	return return_position ? -1 : null
}


// Same as getImageBefore, but uses gids and searches in DATA...
function getGIDBefore(gid, ribbon, search){
	search = search == null ? linSearch : search
	ribbon = DATA.ribbons[ribbon]
	var order = DATA.order

	var target = order.indexOf(gid)

	return search(target, ribbon, function (a, i, lst){
		var b = order.indexOf(lst[i])
		var c = order.indexOf(lst[i+1])
		// hit...
		if(a == b || (a > b && a < c)){
			return 0
		// before...
		} else if(a < b){
			return -1
		// later...
		} else {
			return 1
		}
	})
}


// NOTE: count can be either negative or positive, this will indicate 
// 		load direction...
// NOTE: this will not include the 'from' GID in the resulting list...
// NOTE: this can calculate the ribbon number if an image can be only 
// 		in one ribbon...
// NOTE: if an image can be in more than one ribbon, one MUST suply the
// 		correct ribbon number...
// XXX do we need more checking???
// XXX inclusive can not be false, only null or true...
function getImageGIDs(from, count, ribbon, inclusive){
	if(count == 0){
		return []
	}
	// ribbon default value...
	if(ribbon == null){
		$(DATA.ribbons).each(function(i, e){ 
			if(e.indexOf(from) >= 0){ 
				ribbon = i
				return false 
			} 
		})
	}
	// XXX check if this is empty...
	ribbon = DATA.ribbons[ribbon]


	if(count > 0){
		var c = inclusive == null ? 1 : 0
		var start = ribbon.indexOf(from) + c
		return ribbon.slice(start, start + count)
	} else {
		// XXX
		var c = inclusive == null ? 0 : 1
		var end = ribbon.indexOf(from)
		return ribbon.slice((Math.abs(count) >= end ? 0 : end + count + c), end + c)
	}
}



/**********************************************************************
* Loaders
*/

function updateImage(image, gid, size){
	image = $(image)
	if(gid == null){
		gid = JSON.parse(image.attr('gid'))
	} else {
		image.attr('gid', JSON.stringify(gid))
	}
	size = size == null ? getVisibleImageSize() : size

	// update classes and other indicators...
	image
		.attr({
			//order: JSON.stringify(DATA.order.indexOf(gid)),
			order: JSON.stringify(gid) 
			// XXX update other attrs... 
		})

	// XXX STUB
	image.text(gid)

	// XXX STUB, use real image GID...
	gid = 'SIZE'

	var img_data = DATA.images[gid]

	// select best preview by size...
	var url, s
	for(var k in img_data.preview){
		s = parseInt(k)
		if(s > size){
			url = 'url('+ img_data.preview[k] +')'
			break
		}
	}
	// if no preview found use the original...
	if(url == null){
		url = 'url('+DATA.images[gid].path+')'
	}
	image.css({
		'background-image': url,
	})

	
	// XXX STUB
	//image.text(image.text() + ' ('+ s +'px)')

}


// shorthand...
function updateImages(size){
	size = size == null ? getVisibleImageSize() : size
	return $('.image').each(function(){
		updateImage($(this), null, size)
	})
}


// Load count images around a given image/gid into the given ribbon.
//
// NOTE: this will reload the current image elements...
// NOTE: this is similar to extendRibbon(...) but different in interface...
// XXX correctly align the result...
function loadImages(ref_gid, count, ribbon){
	ribbon = $(ribbon)
	var images = ribbon.find('.image')
	var ribbon_i = getRibbonIndex(ribbon)
	var gid = getGIDBefore(ref_gid, ribbon_i)
	gid = gid == null ? DATA.ribbons[ribbon_i][0] : gid

	// start/end points...
	var l = DATA.ribbons[ribbon_i].length
	if(l <= count){
		var from_i = 0
	} else {
		var from_i = DATA.ribbons[ribbon_i].indexOf(gid) - Math.floor(count/2)
	}
	// special case: head...
	from_i = from_i < 0 ? 0 : from_i
	// special case: tail...
	from_i = l - from_i < count ? l - count : from_i
	var from_gid = DATA.ribbons[ribbon_i][from_i]

	// XXX load only what is needed instead of reloading everything...
	// XXX

	var size = getVisibleImageSize()
	var gids = getImageGIDs(from_gid, count, ribbon_i, true)

	//console.log('>>>', ribbon_i, gids)

	// do nothing...
	// XXX this is still wrong, need to check what's loaded...
	if(count > gids.length){
		return images

	} else if(count != images.length){
		var l = images.length
		var ext = count - l
		var ext_l = Math.floor(ext/2)
		var ext_r = ext - ext_l
		// NOTE: this avoids reattaching images that are already there...
		extendRibbon(ext_l, ext_r, ribbon)
		images = ribbon.find('.image')
	}

	return images.each(function(i, e){
		updateImage(e, gids[i], size)
	})
}


// XXX here for testing...
function loadImagesAround(ref_gid, count, ribbon){
	var ribbon_i = getRibbonIndex(ribbon)
	var gid = getGIDBefore(ref_gid, ribbon_i)
	return loadImages(ref_gid, count, ribbon).filter('[gid='+JSON.stringify(gid)+']').click()
}


// NOTE: this is signature-compatible with rollRibbon...
// NOTE: this will load data ONLY if it is available, otherwise this 
// 		will have no effect...
// NOTE: this can roll past the currently loaded images (n > images.length)
function rollImages(n, ribbon, extend, no_compensate_shift){
	if(n == 0){
		return $([])
	}
	ribbon = ribbon == null ? getRibbon() : $(ribbon)
	var images = ribbon.find('.image')

	var from = n > 0 ? JSON.parse(ribbon.find('.image').last().attr('gid'))
					: JSON.parse(ribbon.find('.image').first().attr('gid'))
	var gids = getImageGIDs(from, n)
	if(gids.length == 0){
		return $([])
	}
	// truncate the results to the length of images...
	if(n > images.length){
		gids.reverse().splice(images.length)
		gids.reverse()
	} else if(Math.abs(n) > images.length){
		gids.splice(images.length)
	}

	if(n < images.length){
		images = rollRibbon(gids.length * (n > 0 ? 1 : -1), ribbon, extend, no_compensate_shift)
	}

	var size = getVisibleImageSize()
	images.each(function(i, e){
		updateImage($(e), gids[i], size)
	})

	return images
}


function loadData(data, images_per_screen){
	var ribbons_set = $('.ribbon-set')
	var current = data.current
	// if no width is given, use the current or default...
	var w = images_per_screen == null ? getScreenWidthInImages() : images_per_screen
	w = w > MAX_SCREEN_IMAGES ? DEFAULT_SCREEN_IMAGES : w

	// clear data...
	$('.ribbon').remove()

	// create ribbons...
	$.each(data.ribbons, function(i, e){
		createRibbon().appendTo(ribbons_set)
	})

	// create images...
	$('.ribbon').each(function(i, e){
		loadImages(current, Math.min(w * LOAD_SCREENS, data.ribbons[i].length), $(this))
	})

	focusImage($('.image').filter('[gid='+JSON.stringify(current)+']'))

	fitNImages(w)
	centerRibbons('css')
}



/**********************************************************************
* Setup
*/

// Setup event handlers for data bindings...
//
// This does two jobs:
// 	- maintain DATA state
// 		- editor actions
// 		- focus
// 		- marking
// 	- maintain view consistency
// 		- centering/moving (roll)
// 		- shifting (expand/contract)
// 		- zooming (expand/contract)
//
//
// XXX this is causing lots of errors, rethink...
function setupDataBindings(viewer){
	viewer = viewer == null ? $('.viewer') : viewer
	viewer
		// XXX need to maintain the correct number of images per ribbon
		// 		per zoom setting -- things get really odd when a ribbon 
		// 		is smaller than it should be...
		.on('preCenteringRibbon', function(evt, ribbon, image){
			// NOTE: we do not need to worry about centering the ribbon 
			//		here, just ball-park-load the correct batch...

			var gid = getImageGID(image)
			var r = getRibbonIndex(ribbon)
			var gr = DATA.ribbons[r]
			var img_before = getImageBefore(image, ribbon)
			var gid_before = getGIDBefore(gid, r)
			var screen_size = getScreenWidthInImages()
			var l = ribbon.find('.image').length

			// load images if we do a long jump -- start, end or some mark 
			// outside of currently loaded section...
			if(gid_before == null 
					|| gid_before != getImageGID(img_before) 
					// also load if we run out of images in the current ribbon,
					// likely due to shifting...
					|| ( gr.length > l 
						&& l < screen_size * LOAD_SCREENS)){
				loadImages(gid, Math.round(screen_size * LOAD_SCREENS), ribbon)
				// XXX compensate for the changing number of images...
			} 

			// roll the ribbon while we are advancing...
			var head = img_before.prevAll('.image')
			var tail = img_before.nextAll('.image')

			// NOTE: if this is greater than the number of images currently 
			//		loaded, it might lead to odd effects...
			//		XXX need to load additional images and keep track of the 
			//			loaded chunk size...
			var frame_size = (screen_size * LOAD_SCREENS) / 2
			var threshold = screen_size * LOAD_THRESHOLD

			// do the loading...
			// XXX need to expand/contract the ribbon depending on zoom and speed...
			// XXX use extendRibbon, to both roll and expand/contract...
			if(tail.length < threshold){
				var rolled = rollImages(frame_size, ribbon)
			}
			if(head.length < threshold){
				var rolled = rollImages(-frame_size, ribbon)
			}
		})


		.on('shiftedImage', function(evt, image, from, to){
			from = getRibbonIndex(from)
			var ribbon = to
			to = getRibbonIndex(to)

			var gid = getImageGID(image)
			var after = getGIDBefore(gid, to)

			// remove the elem from the from ribbon...
			var index = DATA.ribbons[from].indexOf(gid)
			var img = DATA.ribbons[from].splice(index, 1)

			// put the elem in the to ribbon...
			index = after == null ? 0 : DATA.ribbons[to].indexOf(after) + 1
			DATA.ribbons[to].splice(index, 0, gid)

			// indicators...
			flashIndicator(from < to ? 'next' : 'prev')
		})


		.on('createdRibbon', function(evt, index){
			index = getRibbonIndex(index)
			DATA.ribbons.splice(index, 0, [])
		})
		.on('removedRibbon', function(evt, index){
			DATA.ribbons.splice(index, 1)
		})


		.on('requestedFirstImage', function(evt, ribbon){
			var r = getRibbonIndex(ribbon)
			var gr = DATA.ribbons[r]
			rollImages(-gr.length, ribbon)
		})
		.on('requestedLastImage', function(evt, ribbon){
			var r = getRibbonIndex(ribbon)
			var gr = DATA.ribbons[r]
			rollImages(gr.length, ribbon)
		})


		.on('fittingImages', function(evt, n){
			/*
			// load correct amount of images in each ribbon!!!
			// XXX this changes focus...
			// XXX n == 1 breaks this -- going past first image...
			var screen_size = getScreenWidthInImages()
			var gid = getImageGID()
			$('.ribbon').each(function(){
				var r = $(this)
				loadImages(gid, Math.round(screen_size * LOAD_SCREENS), r)
			})
			centerView(null, 'css')
			*/
			// update previews...
			// XXX make this update only what needs updating...
			updateImages()
		})


		.on('focusingImage', function(evt, image){
			DATA.current = getImageGID($(image))
		})
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

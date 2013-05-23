/**********************************************************************
* 
*
* TODO move DATA to a more logical context avoiding the global vars...
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

var LOAD_SCREENS = 6
var LOAD_THRESHOLD = 2
var DEFAULT_SCREEN_IMAGES = 4
var MAX_SCREEN_IMAGES = 12

// A stub image, also here for documentation...
var STUB_IMAGE_DATA = {
	id: 'SIZE',
	// entity type, can be 'image', 'group'
	type: 'image',
	// entity state, can be 'single', 'grouped', 'hidden', ...
	state: 'single',
	ctime: 0,
	path: './images/sizes/900px/SIZE.jpg',
	preview: {
		'150px': './images/sizes/150px/SIZE.jpg',
		'350px': './images/sizes/350px/SIZE.jpg',
		'900px': './images/sizes/900px/SIZE.jpg',
	},
	classes: '',
	orientation: 0,
}

// Data format...
var DATA = {
	version: '2.0',
	current: 0,
	// the ribbon cache...
	// in the simplest form this is a list of lists of GIDs
	ribbons: [
		$(new Array(100)).map(function(i){return i}).toArray()
	],
	// flat ordered list of images in current context...
	// in the simplest form this is a list of GIDs.
	order: $(new Array(100)).map(function(i){return i}).toArray(),

	// this can be used to store the filename/path of the file containing 
	// image data...
	image_file: null
}

// the images object, this is indexed by image GID and contains all 
// the needed data...
// XXX should we split this out?
var IMAGES = {}
// True if images is modified and needs saving...
var IMAGES_DIRTY = false

var DATA_ATTR = 'DATA'

var MARKED = []

var IMAGE_CACHE = []

var SETTINGS = {
	'theme': null,
	'screen-images-ribbon-mode': null,
	'screen-images-single-image-mode': null,
	'single-image-mode-proportions': null,
}



/**********************************************************************
* Helpers
*/

// NOTE: this expects gids...
function imageDateCmp(a, b, data){
	data = data == null ? IMAGES : data
	return data[b].ctime - data[a].ctime
}


// NOTE: this expects gids...
function imageNameCmp(a, b, data){
	data = data == null ? IMAGES : data
	a = data[b].path.split('/')[-1]
	b = data[a].path.split('/')[-1]
	if(a == b){
		return 0
	} else if(a < b){
		return -1
	} else {
		return +1
	}
}


// Check if a is at position i in lst
//
// This will return:
// 	- 0 if a is equal to position i
// 	- -1 if a is less than position i
// 	- +1 if a is greater than position i
//
// NOTE: the signature is different from the traditional cmp(a, b) so as 
// 		to enable more complex comparisons involving adjacent elements
// 		(see isBetween(...) for an example)
function cmp(a, i, lst){
	var b = lst[i]
	if(a == b){
		return 0
	} else if(a < b){
		return -1
	} else {
		return 1
	}
}


// Check if a is at position i in lst or between positions i and i+1
//
// This will return:
// 	- 0 if a is equal at position i in lst or is between i and i+1
// 	- -1 if a is "below" position i
// 	- +1 if a is "above" position i
//
// NOTE: this is here mostly to make debuging easy...
function isBetween(a, i, lst){
	var b = lst[i]

	// special case: tail...
	if(i == lst.length-1 && a >= b){
		return 0
	}

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
//
// NOTE: this is here for testing reasons only...
function linSearch(target, lst, check, return_position){
	check = check == null ? cmp : check

	for(var i=0; i < lst.length; i++){
		if(check(target, i, lst) == 0){
			return return_position ? i : lst[i]
		}
	}

	// no hit...
	return return_position ? -1 : null
}
Array.prototype.linSearch = function(target, cmp){
	return linSearch(target, this, cmp, true)
}


// Basic binary search implementation...
//
// NOTE: this will return the object by default, to return position set
// 		return_position to true.
// NOTE: by default this will use cmp as a predicate.
function binSearch(target, lst, check, return_position){
	check = check == null ? cmp : check
	var h = 0
	var t = lst.length - 1
	var m, res

	while(h <= t){
		m = Math.floor((h + t)/2)
		res = check(target, m, lst)
		
		// match...
		if(res == 0){
			return return_position ? m : lst[m]

		// below...
		} else if(res < 0){
			t = m - 1

		// above...
		} else {
			h = m + 1
		}
	}

	// no result...
	return return_position ? -1 : null
}
Array.prototype.binSearch = function(target, cmp){
	return binSearch(target, this, cmp, true)
}


// Same as getImageBefore, but uses gids and searches in DATA...
//
// NOTE: this uses it's own predicate...
function getGIDBefore(gid, ribbon, search){
	search = search == null ? binSearch : search
	//search = search == null ? match2(linSearch, binSearch) : search
	ribbon = DATA.ribbons[ribbon]
	var order = DATA.order

	var target = order.indexOf(gid)

	return search(target, ribbon, function(a, i, lst){
		var b = order.indexOf(lst[i])

		// special case: tail...
		if(i == lst.length-1 && a >= b){
			return 0
		}

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
		var c = inclusive == null ? 0 : 1
		var end = ribbon.indexOf(from)
		return ribbon.slice((Math.abs(count) >= end ? 0 : end + count + c), end + c)
	}
}


// Select best preview by size...
//
// NOTE: this will use the original if everything else is smaller...
function getBestPreview(gid, size){
	size = size == null ? getVisibleImageSize('max') : size
	var s
	var img_data = IMAGES[gid]
	var url = img_data.path
	var preview_size = 'Original'
	var p = Infinity

	for(var k in img_data.preview){
		s = parseInt(k)
		if(s < p && s > size){
			preview_size = k
			p = s
			url = img_data.preview[k]
		}
	}
	return {
		url: url,
		size: preview_size
	}
}



/**********************************************************************
* Loaders
*/

function updateImage(image, gid, size){
	image = $(image)
	var html = ''
	if(gid == null){
		gid = getImageGID(image)
	} else {
		image.attr('gid', JSON.stringify(gid))
	}
	size = size == null ? getVisibleImageSize('max') : size

	// update image order...
	image.attr({
		order: DATA.order.indexOf(gid),
	})

	// setup marks...
	if(MARKED.indexOf(gid) != -1){
		image.addClass('marked')
	} else {
		image.removeClass('marked')
	}

	var img_data = IMAGES[gid]
	if(img_data == null){
		img_data = STUB_IMAGE_DATA
	}

	// get the url...
	var preview = getBestPreview(gid, size)
	image
		.css({
			'background-image': 'url('+ preview.url +')',
		})
		.attr({
			orientation: img_data.orientation == null ? 0 : img_data.orientation,
		})

	html = window.DEBUG ? 
			DATA.order.indexOf(gid) +'<br>'+ gid +'<br>'+ preview.size 
			: html
	image.html(html)

	return image
}


// shorthand...
function updateImages(size){
	size = size == null ? getVisibleImageSize('max') : size
	return $('.image').each(function(){
		updateImage($(this), null, size)
	})
}


// Load count images around a given image/gid into the given ribbon.
//
// NOTE: this will reload the current image elements...
// NOTE: this is similar to extendRibbon(...) but different in interface...
// NOTE: load only what is needed instead of reloading everything...
// NOTE: this will not change alignment if the current image is within 
// 		the target range...
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
		// special case: head...
		from_i = from_i < 0 ? 0 : from_i
		// special case: tail...
		from_i = l - from_i < count ? l - count : from_i
	}
	var from_gid = DATA.ribbons[ribbon_i][from_i]

	var old_gids = getImageGIDs(getImageGID(images.first()), images.length, ribbon_i, true)
	var gids = getImageGIDs(from_gid, count, ribbon_i, true)

	// check if heads have a common gid and get the diff length...
	var i = gids.indexOf(old_gids[0])
	var j = old_gids.indexOf(gids[0])
	var head = i != -1 ? i 
		// check if we need to truncate...
		: j != -1 ? -j
		: 0
	// check if tails have a common gid and get the diff length...
	i = gids.indexOf(old_gids[old_gids.length-1])
	j = old_gids.indexOf(gids[gids.length-1])
	var tail = i > 0 ? gids.length - i - 1
		// check if we need to truncate...
		: j > 0 ? -(old_gids.length - j - 1)
		: 0

	var size = getVisibleImageSize('max')

	// XXX the next section might need some simplification -- feels bulky...
	// check if we have a common section at all / full reload...
	if(head == 0 && tail == 0){
		if(gids.indexOf(old_gids[0]) == -1){
			window.DEBUG && console.log('>>> (ribbon:', ribbon_i, ') FULL RELOAD --', gids.length)
			extendRibbon(0, gids.length - old_gids.length, ribbon)
			var images = ribbon
				.find('.image')
					.each(function(i, e){
						updateImage(e, gids[i], size)
					})
			$('.viewer').trigger('reloadedRibbon', [ribbon])
			return images


		// do nothing...
		// ...the requested section is the same as the one already loaded...
		} else {
			window.DEBUG && console.log('>>> (ribbon:', ribbon_i, ') NOTHING TO DO.')
			return images
		}

	// do a partial reload...
	} else {
		window.DEBUG && console.log('>>> (ribbon:', ribbon_i, ')', head, '+-('+ (old_gids.length) +')-+', tail)
		// NOTE: we do not need to do anything about alignment as 
		// 		extendRibbon will get the correct head and tail so as to
		// 		align everything by itself...
		var res = extendRibbon(head, tail, ribbon)
		
		// NOTE: if there was no extension (i.e. head/tail <= 0) then 
		// 		these will do nothing...
		res.left.each(function(i, e){
			updateImage(e, gids[i], size)
		})
		res.right.each(function(i, e){
			updateImage(e, gids[i + gids.length - tail], size)
		})
		$('.viewer').trigger('updatedRibbon', [ribbon])
		return ribbon.find('.image')
	}
}


// NOTE: this is here for testing...
function loadImagesAround(ref_gid, count, ribbon){
	var ribbon_i = getRibbonIndex(ribbon)
	var gid = getGIDBefore(ref_gid, ribbon_i)
	return loadImages(ref_gid, count, ribbon).filter('[gid="'+JSON.stringify(gid)+'"]').click()
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

	var from = n > 0 ? getImageGID(ribbon.find('.image').last())
					: getImageGID(ribbon.find('.image').first())
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

	var size = getVisibleImageSize('max')
	images.each(function(i, e){
		updateImage($(e), gids[i], size)
	})

	$('.viewer').trigger('updatedRibbon', [ribbon])

	return images
}


function loadData(images_per_screen){
	var ribbons_set = $('.ribbon-set')
	var current = DATA.current
	// if no width is given, use the current or default...
	var w = images_per_screen == null ? getScreenWidthInImages() : images_per_screen
	w = w > MAX_SCREEN_IMAGES ? DEFAULT_SCREEN_IMAGES : w

	// clear data...
	$('.ribbon').remove()

	// create ribbons...
	$.each(DATA.ribbons, function(i, e){
		createRibbon().appendTo(ribbons_set)
	})

	// create images...
	$('.ribbon').each(function(i, e){
		loadImages(current, Math.min(w * LOAD_SCREENS, DATA.ribbons[i].length), $(this))
	})

	focusImage($('.image').filter('[gid="'+JSON.stringify(current)+'"]'))

	fitNImages(w)
	centerRibbons('css')
}


function convertDataGen1(data, cmp){
	var res = {
		data: {
			version: '2.0',
			current: null,
			ribbons: [],
			order: [], 
		},
		images: {}
	}
	cmp = cmp == null ?
			function(a, b){ 
				return imageDateCmp(a, b, res.images) 
			}
			: cmp
	var ribbons = res.data.ribbons
	var order = res.data.order
	var images = res.images

	// position...
	res.data.current = data.position
	
	// ribbons and images...
	$.each(data.ribbons, function(i, input_images){
		var ribbon = []
		ribbons.push(ribbon)
		for(var id in input_images){
			var image = input_images[id]
			ribbon.push(id)
			order.push(id)
			images[id] = image
		}
		ribbon.sort(cmp)
	})

	order.sort(cmp)

	// XXX STUB
	res.data.current = order[0]

	return res
}


function loadSettings(){
	toggleTheme(SETTINGS['theme'])

	if(toggleSingleImageMode('?') == 'on'){
		var w = SETTINGS['screen-images-single-image-mode']
		var p = SETTINGS['single-image-mode-proportions']
		toggleImageProportions(p)
	} else {
		var w = SETTINGS['screen-images-ribbon-mode']
	}
	fitNImages(w)
}



/**********************************************************************
* localStorage
*
* XXX should we use jStorage here?
*/

function loadLocalStorageData(attr){
	attr = attr == null ? DATA_ATTR : attr
	var data = localStorage[attr]
	if(data == null){
		data = '{}'
	}
	return JSON.parse(data)
}


function saveLocalStorageData(attr){
	attr = attr == null ? DATA_ATTR : attr
	localStorage[attr] = JSON.stringify(DATA)
}


function loadLocalStorageImages(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_IMAGES'
	var images = localStorage[attr]
	if(images == null){
		images = '{}'
	}
	return JSON.parse(images)
}


function saveLocalStorageImages(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_IMAGES'
	localStorage[attr] = JSON.stringify(IMAGES)
}


// generic save/load...
function loadLocalStorage(attr){
	attr = attr == null ? DATA_ATTR : attr
	DATA = loadLocalStorageData(attr)
	IMAGES = loadLocalStorageImages(attr)
	return loadData()
}


function saveLocalStorage(attr){
	attr = attr == null ? DATA_ATTR : attr
	saveLocalStorageData(attr)
	saveLocalStorageImages(attr)
}


function loadLocalStorageMarks(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_MARKED'
	var marked = localStorage[attr]
	if(marked == null){
		marked = '[]'
	}
	MARKED = JSON.parse(marked)
	return loadData()
}


function saveLocalStorageMarks(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_MARKED'
	localStorage[attr] = JSON.stringify(MARKED)
}


function loadLocalStorageSettings(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_SETTINGS'
	SETTINGS = JSON.parse(localStorage[attr])

	loadSettings()
}


function saveLocalStorageSettings(attr){
	attr = attr == null ? DATA_ATTR : attr
	attr += '_SETTINGS'
	localStorage[attr] = JSON.stringify(SETTINGS)
}



/**********************************************************************
* Extension API (CEF/PhoneGap/...)
*/

function loadFileImages(path, callback){
	return $.getJSON(path)
		.done(function(json){
			IMAGES = json
			localStorage[DATA_ATTR + '_IMAGES_FILE'] = path
			console.log('Loaded IMAGES...')

			callback != null && callback()
		})
		.fail(function(){
			console.error('ERROR LOADING:', path)
		})
}


function loadFile(data_path, image_path, callback){
	// CEF
	return $.getJSON(data_path)
		.done(function(json){
			// legacy format...
			if(json.version == null){
				json = convertDataGen1(json)
				DATA = json.data
				IMAGES = json.images
				loadData()

			// version 2.0
			// XXX needs a more flexible protocol...
			} else if(json.version == '2.0') {
				DATA = json
				if(image_path != null){
					loadFileImages(image_path)
						.done(function(){
							loadData()

							callback != null && callback()
						})
				} else if(DATA.image_file != null) {
					loadFileImages(DATA.image_file)
						.done(function(){
							loadData()

							callback != null && callback()
						})
				}

			// unknown format...
			} else {
				console.error('unknown format.')
				return
			}
		})
		.fail(function(){
			console.error('ERROR LOADING:', data_path)
		})
}


function saveFile(name){
	// CEF
	if(window.CEF_dumpJSON != null){
		if(DATA.image_file == null){
			DATA.image_file = name + '-images.json'
		}
		//CEF_dumpJSON(DATA.image_file, IMAGES)
		// XXX this will overwrite the images...
		//CEF_dumpJSON(name + '-images.json', IMAGES)
		//DATA.image_file = name + '-images.json'
		CEF_dumpJSON(name + '-data.json', DATA)
		CEF_dumpJSON(name + '-marked.json', MARKED)

	// PhoneGap
	} else if(false) {
		// XXX
	}
}


function openImage(){
	// CEF
	if(window.CEF_runSystem != null){
		// XXX if path is not present try and open the biggest preview...
		return CEF_runSystem(IMAGES[getImageGID()].path)

	// PhoneGap
	} else if(false) {
		// XXX
	}
}


// XXX need revision...
function loadDir(path){
	return loadFile(path +'/data.json')
		.fail(function(){
			loadFile(path +'/.ImageGrindCache/data.json')
				.fail(function(){
					// XXX load separate images...
					// XXX
				})
		})
}



/**********************************************************************
* Image caching...
*/

// NOTE: this will always overwrite the previous cache set for a ribbon...
function preCacheRibbonImages(ribbon){
	var i = getRibbonIndex(ribbon)
	var size = getVisibleImageSize('max')
	var screen_size = getScreenWidthInImages(getVisibleImageSize())
	var cache_frame_size = (screen_size * LOAD_SCREENS) / 2
	var images = ribbon.find('.image')
	var first = getImageGID(images.first())
	var last = getImageGID(images.last())

	var gids = getImageGIDs(first, -cache_frame_size)
				.concat(getImageGIDs(last, cache_frame_size))

	var cache = []
	IMAGE_CACHE[i] = cache
	$.each(gids, function(i, e){
		var img = new Image()
		img.src = getBestPreview(e, size).url
		cache.push(img)
	})

	return cache
}


function preCacheAllRibbons(){
	$('.ribbon').each(function(){
		preCacheRibbonImages($(this))
	})
	return IMAGE_CACHE
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
function setupDataBindings(viewer){
	viewer = viewer == null ? $('.viewer') : viewer
	viewer
		// XXX need to maintain the correct number of images per ribbon
		// 		per zoom setting -- things get really odd when a ribbon 
		// 		is smaller than it should be...
		// XXX this does not get called on marking...
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
			} 

			// roll the ribbon while we are advancing...
			var head = img_before.prevAll('.image')
			var tail = img_before.nextAll('.image')

			// NOTE: if this is greater than the number of images currently 
			//		loaded, it might lead to odd effects...
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
			// load correct amount of images in each ribbon!!!
			var screen_size = getScreenWidthInImages()
			var gid = getImageGID()
			$('.ribbon').each(function(){
				var r = $(this)
				loadImages(gid, Math.round(screen_size * LOAD_SCREENS), r)
			})
			centerView(null, 'css')

			if(toggleSingleImageMode('?') == 'on'){
				SETTINGS['screen-images-single-image-mode'] = n
			} else {
				SETTINGS['screen-images-ribbon-mode'] = n
			}

			// update previews...
			// XXX make this update only what needs updating...
			updateImages()
		})


		.on('focusingImage', function(evt, image){
			DATA.current = getImageGID($(image))
		})


		// basic image manipulation...
		// XXX after this we need to save the images...
		.on('rotatingLeft rotatingRight', function(evt, image){
			$(image).each(function(i, e){
				var img = $(this)
				var gid = getImageGID(img) 
				var orientation = img.attr('orientation')

				IMAGES[gid].orientation = orientation
				IMAGES_DIRTY = true
			})
		})


		// marks...
		// XXX toggle marking a block is not yet supported...
		.on('togglingMark', function(evt, img, action){
			var gid = getImageGID(img) 

			// add marked image to list...
			if(action == 'on'){
				MARKED.push(gid)

			// remove marked image from list...
			} else {
				MARKED.splice(MARKED.indexOf(gid), 1)
			}
		})
		.on('removeingRibbonMarks', function(evt, ribbon){
			$.each(DATA.ribbons[getRibbonIndex(ribbon)], function(_, e){
				var i = MARKED.indexOf(e)
				if(i != -1){
					MARKED.splice(i, 1)
				}
			})
		})
		.on('removeingAllMarks', function(evt){
			MARKED.splice(0, MARKED.length)
		})
		.on('markingRibbon', function(evt, ribbon){
			$.each(DATA.ribbons[getRibbonIndex(ribbon)], function(_, e){
				var i = MARKED.indexOf(e)
				if(i == -1){
					MARKED.push(e)
				}
			})
		})
		.on('markingAll', function(evt){
			MARKED.splice(0, MARKED.length)
			MARKED.concat(DATA.order)
		})
		.on('invertingMarks', function(evt, ribbon){
			$.each(DATA.ribbons[getRibbonIndex(ribbon)], function(_, e){
				var i = MARKED.indexOf(e)
				if(i == -1){
					MARKED.push(e)
				} else {
					MARKED.splice(i, 1)
				}
			})
		})


		// caching...
		.on('reloadedRibbon updatedRibbon', function(evt, ribbon){

			window.DEBUG && console.log('>>> (ribbon:', getRibbonIndex(ribbon), ') Updating cache...')

			preCacheRibbonImages(ribbon)
		})
}




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

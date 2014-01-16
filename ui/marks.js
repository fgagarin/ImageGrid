/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

// NOTE: this must be sorted in the same order as DATA.order
var MARKED = []

var MARKED_FILE_DEFAULT = 'marked.json'
var MARKED_FILE_PATTERN = /^[0-9]*-marked.json$/


// NOTE: if this is set to null, caching will be disabled...
var _UNMARKED_CACHE = {}



/**********************************************************************
* helpers...
*/

function _addMark(cls, gid, image){
	gid = gid == null ? getImageGID() : gid
	image = image == null ? getImage() : $(image)

	// no image is loaded...
	if(image.length == 0){
		return
	}

	var mark = $('.mark.'+cls+'.'+gid)

	if(mark.length == 0){
		mark = $('<div class="mark"/>')
			.addClass(gid)
			.addClass(cls)
			//.insertAfter(image)
	} 

	// make sure the mark is explicitly after the image...
	// XXX think of an eficient way to test if we need to re-insert...
	mark
		.insertAfter(image)

	return mark
}
function _removeMark(cls, gid, image){
	gid = gid == null ? getImageGID() : gid
	image = image == null ? getImage() : $(image)

	// no image is loaded...
	if(image.length == 0){
		return
	}

	var mark = $('.mark.'+cls+'.'+gid)

	if(mark.length != 0){
		mark.detach()
	}
	return mark
}


// Invalidate unmarked image cache...
//
function invalidateMarksCache(){
	if(_UNMARKED_CACHE != null){
		_UNMARKED_CACHE = {}
	}
}


function makeMarkedLister(get_marked){
	return function(mode){
		var marked = get_marked()
		mode = mode == null ? 'all' : mode
		return mode == 'all' ? getLoadedGIDs(marked) 
			: mode.constructor.name == 'Array' ? getLoadedGIDs(mode)
			: typeof(mode) == typeof(123) ? getRibbonGIDs(marked, mode)
			: getRibbonGIDs(marked)
	}
}


// Make lister of unmarked images...
//
// mode can be:
// 	- 'ribbon'
// 	- 'all'
// 	- number			- ribbon index
// 	- list				- list of gids used as source
// 	- null				- same as all
//
// XXX with sparce lists this is trivial: get all the null indexes...
function makeUnmarkedLister(get_marked, get_cache){
	return function(mode){
		mode = mode == null ? 'all' : mode

		var marked = get_marked()
		var cache = get_cache != null ? get_cache() : null

		var gids = mode == 'all' ? getLoadedGIDs() 
			: mode.constructor.name == 'Array' ? getLoadedGIDs(mode)
			: typeof(mode) == typeof(123) ? getRibbonGIDs(marked, mode)
			: getRibbonGIDs(marked)

		// calculate the set...
		var res = gids.filter(function(e){
			// keep only unmarked...
			return marked.indexOf(e) < 0
		})

		return res
	}
}
// NOTE: this is about an order of magnitude faster than the non-sparse
// 		version...
function makeUnmarkedSparseLister(get_marked, get_cache){
	// mode can be:
	// 	- null			- default, same as 'all'
	// 	- 'all'			- process all loases gids
	// 	- 'ribbon'		- process curent ribbon
	// 	- number		- ribbon index
	// 	- Array			- list of gids
	return function(mode){
		mode = mode == null ? 'all' : mode

		var marked = get_marked()
		//var cache = get_cache != null ? get_cache() : null

		var res = mode == 'all' ? 
				DATA.order.slice()
			: mode == 'ribbon' ? 
				populateSparceGIDList(getRibbonGIDs())
			: typeof(mode) == typeof(123) ? 
				populateSparceGIDList(getRibbonGIDs(mode))
			: mode

		// for ribbon modes, remove non-ribbon marks...
		if(mode == 'ribbon'){
			marked = getRibbonGIDs(marked)
		} else if(typeof(mode) == typeof(123)){
			marked = getRibbonGIDs(marked, mode)
			mode = 'ribbon'
		}

		// negate the list...
		marked.forEach(function(e, i){
			delete res[i]
		})

		return getLoadedGIDs(compactSparceList(res))
	}
}


var getMarked = makeMarkedLister(function(){ return MARKED })
var getUnmarked = makeUnmarkedSparseLister(
		function(){ return MARKED }, 
		function(){ return _UNMARKED_CACHE })


// XXX make this undefined tolerant -- sparse list compatibility...
var getMarkedGIDBefore = makeGIDBeforeGetterFromList(
		function(){ 
			return compactSparceList(MARKED)
		})


// NOTE: this is not too fast as it will filter the marked images...
// NOTE: this is restricted to current ribbon...
var getUnmarkedGIDBefore = makeGIDBeforeGetterFromList(
		function(ribbon){ 
			return getUnmarked(ribbon)
		}, true)


// Make a mark toggler
//
// The toggler will:
// 	- toggle img_class on the target image
// 	- add/remove a mark element after the image
// 	- toggle mark_class on the mark element
// 	- call the callback, if defined, passing it:
// 		- gid
// 		- action ('on' or 'off')
// 	- trigger the evt_name on the viewer passing it:
// 		- gid
// 		- action ('on' or 'off')
//
// The actual toggler is built with createCSSClassToggler(..), see its
// docs for protocol descrittion.
//
// The resulting toggler, by default, marks the current image 
// (.current.image), but can be passed a different image as first 
// argument.
//
// NOTE: when passing an alternative image as an argument, the second 
// 		argument MUST also be passed. it can be one of:
// 			- 'on'		: force create mark
// 			- 'off'		: force remove mark
// 			- 'next'	: toggle next state (default)
// NOTE: when passing this a gid, the 'next' action is not supported
function makeMarkToggler(img_class, mark_class, evt_name, callback){
	return createCSSClassToggler(
		'.current.image', 
		img_class,
		function(action, elem){
			toggleMarksView('on')

			// we got a gid...
			if(elem.length == 0 && elem.selector in IMAGES){
				var gid = elem.selector
				elem = getImage(gid)
				elem = elem.length == 0 ? null : elem

			// we are given an image...
			} else {
				var gid = getImageGID(elem)
			}

			// do this only of the image is loaded...
			if(elem != null){
				if(action == 'on'){
					_addMark(mark_class, gid, elem)
				} else {
					_removeMark(mark_class, gid, elem)
				}
			}

			if(callback != null){
				callback(gid, action)
			}

			$('.viewer').trigger(evt_name, [gid, action])
		})
}


// Generate an image updater function...
//
// the resulting function will update image mark state by adding or 
// removing the mark the specific mark object.
function makeMarkUpdater(img_class, mark_class, test){
	var _updater = function(gid, image){
		// marks...
		if(test(gid)){
			image.addClass(img_class)
			_addMark(mark_class, gid, image)
		} else {
			image.removeClass(img_class)
			_removeMark(mark_class, gid, image)
		}
		return image
	}
	IMAGE_UPDATERS.push(_updater)
	return _updater
}


// NOTE: this supports only shifts by one position...
// XXX this is similar to insertGIDToPosition(..) do we need both?
// 		...this one is a special case and insertGIDToPosition(..) is 
// 		general, the later uses search to find the position, here we 
// 		know the aproximate location, the question is if this speedup
// 		is worth the effort of maintaining a special case function...
function shiftGIDToOrderInList(gid, direction, list){
	var gid_o = DATA.order.indexOf(gid)
	var gid_m = list.indexOf(gid)

	var a_m = gid_m + (direction == 'next' ? 1 : -1)
	if(a_m < 0 || a_m >= list.length){
		return false
	}
	var a_gid = list[a_m]
	var a_o = DATA.order.indexOf(a_gid)

	// if relative positions of cur and adjacent gids in list 
	// are different to that in DATA.order, then replace the gids
	// in list...
	if(sign(a_m - gid_m) != sign(a_o - gid_o)){
		list[a_m] = gid
		list[gid_m] = a_gid
		return true
	}
	return false
}



/**********************************************************************
* 
*/

var updateSelectedImageMark = makeMarkUpdater(
		'marked',
		'selected', 
		function(gid){ 
			return MARKED.indexOf(gid) > -1 
		})


// NOTE: to disable MARKED cleanout set no_cleanout_marks to true.
// NOTE: MARKED may contain both gids that are not loaded and that do 
// 		not exist, as there is no way to distinguish between the two 
// 		situations the cleanup is optional...
function cropMarkedImages(keep_ribbons, keep_unloaded_gids){
	var marked = MARKED.slice()

	cropDataTo(marked, keep_ribbons, keep_unloaded_gids)

	return DATA
}



/**********************************************************************
* Modes
*/

// XXX is this a mode???
var toggleMarkedOnlyView = makeCropModeToggler(
		'marked-only-view',
		cropMarkedImages)


var toggleMarkedOnlyWithRibbonsView = makeCropModeToggler(
		'marked-only-view',
		function(){
			cropMarkedImages(true)
		})


// XXX shifting images and unmarking in this mode do not work correctly...
var toggleMarksView = createCSSClassToggler(
	'.viewer', 
	'marks-visible',
	function(){
		var cur = getImage()
		// current is marked...
		if(cur.hasClass('marked')){
			centerView(null, 'css')
			return
		} 
		// there is a marked image in this ribbon...
		var target = getImageBefore(cur, null)
		if(target.length > 0){
			centerView(focusImage(target), 'css')
			return
		}
		// get marked image from other ribbons...
		prevRibbon()
		if(getImage().hasClass('marked')){
			return
		}
		nextRibbon()
	})



/**********************************************************************
* Actions
*/

var toggleMark = makeMarkToggler(
		'marked', 
		'selected', 
		'togglingMark',
		function(gid, action){
			// add marked image to list...
			if(action == 'on'){
				if(MARKED.indexOf(gid) == -1){
					MARKED[DATA.order.indexOf(gid)] = gid
				} 

			// remove marked image from list...
			} else {
				delete MARKED[MARKED.indexOf(gid)]
			}

			marksUpdated()
		})



function setAllMarks(action, mode){
	action = action == null ? toggleMark('?') : action
	mode = mode == null ? 'ribbon' : mode

	var updated = []

	if(action == 'on'){
		var _update = function(e){
			if(MARKED.indexOf(e) < 0){
				MARKED[DATA.order.indexOf(e)] = e
				updated.push(e)
			}
		}
	} else {
		var _update = function(e){
			var i = MARKED.indexOf(e)
			if(i >= 0){
				delete MARKED[i]
				updated.push(e)
			}
		}
	}

	// marks from current ribbon (default)...
	if(mode == 'ribbon'){
		var res = getRibbonGIDs()

	// all marks...
	} else if(mode == 'all'){
		var res = getLoadedGIDs()
	} 

	res.forEach(_update)

	updateImages(updated)

	$('.viewer').trigger('togglingMarks', [updated, action])

	marksUpdated()

	return res
}

// mode can be:
//	- 'ribbon'
//	- 'all'
function removeImageMarks(mode){
	mode = mode == null ? 'ribbon' : mode
	var res = setAllMarks('off', mode)
	$('.viewer').trigger('removingMarks', [res, mode])
	return res
}


function markAll(mode){
	mode = mode == null ? 'ribbon' : mode
	var res = setAllMarks('on', mode)
	$('.viewer').trigger('addingMarks', [res, mode])
	return res
}


// NOTE: this only does it's work in the current ribbon...
function invertImageMarks(){
	var ribbon = getRibbonGIDs()
	var on = []
	var off = []

	$.each(ribbon, function(_, e){
		var i = MARKED.indexOf(e)
		if(i == -1){
			on.push(e)
			MARKED[DATA.order.indexOf(e)] = e
		} else {
			off.push(e)
			delete MARKED[i]
		}
	})
	updateImages(ribbon)

	$('.viewer')
		.trigger('invertingMarks', [ribbon])
		.trigger('togglingMarks', [on, 'on'])
		.trigger('togglingMarks', [off, 'off'])

	marksUpdated()

	return on.concat(off)
}


// Toggle marks in the current continuous section of marked or unmarked
// images...
function toggleMarkBlock(image){
	image = image == null ? getImage() : image
	var gid = typeof(image) == typeof('str') ? image : getImageGID(image)
	image = typeof(image) == typeof('str') ? getImage(gid) : image

	var state = toggleMark(image, 'next') == 'off' ? false : true

	var ribbon = DATA.ribbons[getRibbonIndex(image)]
	var i = ribbon.indexOf(gid)

	var updated = [gid]

	var _convert = function(_, e){
		// break if state differs from current...
		if((MARKED.indexOf(e) >= 0) == state){
			return false
		}
		// do the toggle...
		if(state){
			MARKED[DATA.order.indexOf(e)] = e
		} else {
			delete MARKED[MARKED.indexOf(e)]
		}
		updated.push(e)
	}

	// go left...
	var left = ribbon.slice(0, i)
	left.reverse()
	$.each(left, _convert)

	// go right...
	var right = ribbon.slice(i+1)
	$.each(right, _convert)

	updateImages(updated)

	$('.viewer')
		.trigger('togglingImageBlockMarks', [image, updated, state])
		.trigger('togglingMarks', [updated, state ? 'on' : 'off'])

	marksUpdated()

	return state
}


// XXX need to account for empty ribbons...
function shiftMarkedImages(direction, mode, new_ribbon){
	mode = mode == null ? 'ribbon' : mode
	var cur = getRibbonIndex()
	var orig_ribbon = cur

	// ribbon only...
	if(mode == 'ribbon'){
		var ribbon = DATA.ribbons[cur]
		// remove all the marked images form the current ribbon...
		// NOTE: this builds a list of marked images ONLY in current 
		// 		ribbon...
		var marked = $.map(MARKED, function(e){
			var i = ribbon.indexOf(e)
			if(i >= 0){
				ribbon.splice(i, 1)
				return e
			}
			return null
		})

	// shift all marked images...
	} else {
		var marked = MARKED.slice()
		// remove all the marked images form all other ribbons...
		$.each(DATA.ribbons, function(ribbon){
			$.each(marked, function(e){
				var i = ribbon.indexOf(e)
				i >= 0 ? ribbon.splice(i, 1) : null
			})
		})
	}

	// if we are at the top or bottom ribbons we need to create a new 
	// ribbon regardless...
	if((cur == 0 && direction == 'prev') 
			|| (cur == DATA.ribbons.length-1 && direction == 'next')){
		new_ribbon = true
	}

	// add marked to new ribbon...
	if(new_ribbon){
		cur += direction == 'next' ? 1 : 0
		DATA.ribbons.splice(cur, 0, marked)
	
	// add marked to existing ribbon...
	} else {
		cur += direction == 'next' ? 1 : -1
		DATA.ribbons[cur] = fastSortGIDsByOrder(DATA.ribbons[cur].concat(marked))
	}
	
	// remove empty ribbons and reload...
	dropEmptyRibbons()
	reloadViewer()

	$('.viewer').trigger('shiftedImages', [marked, orig_ribbon, cur])
}
function shiftMarkedImagesUp(mode, new_ribbon){
	return shiftMarkedImages('prev', mode, new_ribbon)
}
function shiftMarkedImagesDown(mode, new_ribbon){
	return shiftMarkedImages('next', mode, new_ribbon)
}


// XXX these are ribbon wise only (???)
// XXX this on first step this must pack all marked images
function horizontalShiftMarkedImages(direction){
	// XXX
}
function shiftMarkedImagesLeft(){
	return horizontalShiftMarkedImages('prev')
}
function shiftMarkedImagesRight(){
	return horizontalShiftMarkedImages('next')
}


// Focus next/prev mark...
//
// NOTE: these will not jump to marks on other ribbons... to prevent this
// 		add true as the final argument (see restrict_to_ribbon argument 
// 		of makeNextFromListAction(..) for more info)
var nextMark = makeNextFromListAction(
		getMarkedGIDBefore, 
		function(){ return compactSparceList(MARKED) })
var prevMark = makePrevFromListAction(
		getMarkedGIDBefore, 
		function(){ return compactSparceList(MARKED) })


var nextUnmarked = makeNextFromListAction(
		getUnmarkedGIDBefore, 
		function(ribbon){ 
			return getUnmarked(ribbon == null ? 'ribbon' : ribbon) 
		})
var prevUnmarked = makePrevFromListAction(
		getUnmarkedGIDBefore, 
		function(ribbon){ 
			return getUnmarked(ribbon == null ? 'ribbon' : ribbon) 
		})



/**********************************************************************
* Dialogs... 
*/

function markImagesDialog(){

	updateStatus('Mark...').show()

	var alg = 'Mark images:'

	var cur = toggleMark('?') == 'on' ? 'Unmark' : 'Mark'

	cfg = {}
	cfg[alg] = [
		cur + ' current image',
		cur + ' current block | '+
			'A block is a set of similarly marked images\n'+
			'to the left and right of the current image,\n'+
			'up until the closest images marked differently',
		'Invert marks in current ribbon',
		'Mark all in current ribbon',
		'Unmark all in current ribbon',
		'Mark all images',
		'Unmark all images'
	]

	formDialog(null, '', 
			cfg,
			'OK', 
			'markImagesDialog')
		.done(function(res){
			res = res[alg]

			// NOTE: these must be in order of least-specific last...
			if(/current image/.test(res)){
				toggleMark()
				var msg = (cur + ' image').toLowerCase()

			} else if(/current block/.test(res)){
				toggleMarkBlock()
				var msg = 'toggled block marks'

			} else if(/Invert/.test(res)){
				invertImageMarks()
				var msg = 'inverted ribbon marks'

			} else if(/Mark all.*current ribbon/.test(res)){
				markAll()
				var msg = 'marked ribbon'

			} else if(/Mark all/.test(res)){
				markAll()
				var msg = 'marked ribbon'

			} else if(/Unmark all in/.test(res)){
				removeImageMarks('ribbon')
				var msg = 'unmarked ribbon'

			} else if(/Unmark all images/.test(res)){
				removeImageMarks('all')
				var msg = 'unmarked all'
			}

			showStatusQ('Mark: '+msg+'...')
		})
		.fail(function(){
			showStatusQ('Marking: canceled.')
		})
}



/**********************************************************************
* Files...
*/

// Load image marks form file
//
// NOTE: if no marks are found then set them to []
var loadFileMarks = makeFileLoader(
		'Marks', 
		MARKED_FILE_DEFAULT, 
		MARKED_FILE_PATTERN, 
		[],
		function(data){ 
			MARKED = populateSparceGIDList(data)
		},
		'marksLoaded')


// Save image marks to file
var saveFileMarks = makeFileSaver(
		'Marks',
		MARKED_FILE_DEFAULT, 
		function(){ 
			return compactSparceList(MARKED)
		})


function marksUpdated(){
	fileUpdated('Marks')
	invalidateMarksCache()
	$('.viewer').trigger('marksUpdated')
}



/**********************************************************************
* Setup...
*/


function setupMarks(viewer){
	console.log('Marks: setup...')

	// XXX make this viewer specific...
	makeContextIndicatorUpdater('marked')

	// XXX make these viewer specific...
	showGlobalIndicator(
			'marks-visible', 
			'Marks visible (F2)')
		.click(function(){ toggleMarksView() })
	showGlobalIndicator(
			'marked-only-visible', 
			'Marked only images visible (shift-F2)')
		.click(function(){ toggleMarkedOnlyView() })
	showContextIndicator(
			'current-image-marked', 
			'Marked (Ins)')
		.click(function(){ toggleMark() })

	return viewer
		// XXX do we actually need this???
		.on('togglingMarks', function(evt, lst, action){
			lst.forEach(function(gid){
				viewer.trigger('togglingMark', [gid, action])
			})
		})
		.on('sortedImages', function(){
			MARKED = populateSparceGIDList(MARKED)
			marksUpdated()
		})
		.on('horizontalShiftedImage', function(evt, gid, direction){
			var n = DATA.order.indexOf(gid)
			var o = MARKED.indexOf(gid)

			// move the marked gid...
			MARKED.splice(o, 1)
			MARKED.splice(n, 0, gid)

			// test if there are any marked images between n and o...
			var shift = compactSparceList(MARKED.slice(Math.min(n, o)+1, Math.max(n, o)))
			if(shift.length > 0){
				marksUpdated()
			}
		})
		.on('baseURLChanged', function(){
			invalidateMarksCache()
		})
}
SETUP_BINDINGS.push(setupMarks)



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

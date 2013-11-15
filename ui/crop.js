/**********************************************************************
* 
* Ribbon Crop API
*
*
**********************************************************************/

var CROP_STACK = []

var CROP_MODES = []


/******************************************************* Crop Data ***/

function isViewCropped(){
	return CROP_STACK.length != 0
}


function getAllData(){
	if(!isViewCropped()){
		return DATA
	} else {
		return CROP_STACK[0]
	}
}


// NOTE: this will not update .current state...
// NOTE: when keep_ribbons is set, this may generate empty ribbons...
// NOTE: this requieres all data to be present, if currently viewing 
// 		server-side data, then cropping is a server-side operation...
// 		XXX another way to go here is to save the crop method and take 
// 			it into account when loading new sections of data...
//
// XXX should this set the .current to anything but null or the first elem???
function makeCroppedData(gids, keep_ribbons, keep_unloaded_gids){
	var res = {
		varsion: '2.0',
		current: null,
		ribbons: [],
		order: DATA.order.slice(),
	}

	// remove any gid that is not in IMAGES or is not loaded...
	if(!keep_unloaded_gids){
		var loaded = []
		$.each(DATA.ribbons, function(i, e){ loaded = loaded.concat(e) })

		// NOTE: if IMAGES contains only part of the data loadable this will 
		// 		be wrong...
		gids = gids.filter(function(e){ 
			return e in IMAGES && loaded.indexOf(e) >= 0 
		})
	}

	// flat single ribbon crop...
	if(!keep_ribbons){
		res.ribbons[0] = gids

	// keep the ribbon structure...
	} else {
		$.each(DATA.ribbons, function(_, e){
			e = e.filter(function(ee){ return gids.indexOf(ee) >= 0 })
			// skip empty ribbons...
			if(e.length != 0){
				res.ribbons.push(e)
			}
		})
	}

	return res
}


// NOTE: if keep_ribbons is not set this will ALWAYS build a single ribbon
// 		data-set...
function cropDataTo(gids, keep_ribbons, keep_unloaded_gids){
	var prev_state = DATA
	var cur = DATA.current
	var r = getRibbonIndex()

	var new_data = makeCroppedData(gids, keep_ribbons, keep_unloaded_gids)

	// do nothing if there is no change...
	// XXX is there a better way to compare states???
	if(JSON.stringify(DATA.ribbons) == JSON.stringify(new_data.ribbons)){
		return DATA
	}

	CROP_STACK.push(prev_state)
	DATA = new_data

	cur = getGIDBefore(cur, keep_ribbons ? r : 0)
	cur = cur == null ? gids[0] : cur
	DATA.current = cur 

	reloadViewer()
	updateImages()

	return prev_state
}


function uncropData(){
	if(!isViewCropped()){
		return DATA
	}
	var prev_state = DATA
	var cur = DATA.current

	DATA = CROP_STACK.pop()

	// check if cur exists in data being loaded...
	if($.map(DATA.ribbons, 
			function(e, i){ return e.indexOf(cur) >= 0 }).indexOf(true) >= 0){
		// keep the current position...
		DATA.current = cur
	}

	reloadViewer()
	updateImages()

	return prev_state
}


function showAllData(){
	var prev_state = DATA
	var cur = DATA.current

	if(CROP_STACK.length != 0){
		DATA = getAllData()
		CROP_STACK = []

		// XXX do we need to check if this exists???
		// 		...in theory, as long as there are no global destructive 
		// 		operations, no.
		// keep the current position...
		DATA.current = cur

		reloadViewer()
		updateImages()
	}

	return prev_state
}


// Helpers for making crop modes and using crop...

// Make a generic crop mode toggler
//
// NOTE: This will add the toggler to CROP_MODES, for use by 
// 		uncropLastState(...)
// NOTE: crop modes are exclusive -- it is not possible to enter one crop
// 		mode from a different crop mode
//
// XXX add "exclusive" crop option -- prevent other crop modes to enter...
function makeCropModeToggler(cls, crop){
	var res = createCSSClassToggler(
			'.viewer',
			//cls + ' cropped-mode',
			cls,
			/* XXX make this an option...
			function(action){
				// prevent mixing marked-only and single-ribbon modes...
				if(action == 'on' 
						&& isViewCropped()
						&& res('?') != 'on'){
					return false
				}
			},
			*/
			function(action){
				if(action == 'on'){
					showStatusQ('Cropping current ribbon...')
					crop()
				} else {
					showStatusQ('Uncropping to all data...')
					showAllData()
				}
			})
	CROP_MODES.push(res)
	return res
}


// Uncrop to last state and there is no states to uncrop then exit 
// cropped mode.
//
// NOTE: this will exit all crop modes when uncropping the last step.
function uncropLastState(){
	// do nothing if we aren't in a crop mode...
	if(!isViewCropped()){
		return
	}

	// exit cropped all modes...
	if(CROP_STACK.length == 1){
		$.each(CROP_MODES, function(_, e){ e('off') })

	// ucrop one state...
	} else {
		showStatusQ('Uncropping...')
		uncropData()
	}
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

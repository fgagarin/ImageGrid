/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true


/*********************************************************************/

/**********************************************************************
* Modes
*/

function loadMarkedOnlyData(cmp){
	cmp = cmp == null ? imageDateCmp : cmp
	var cur = DATA.current
	var marked = MARKED.slice().sort(cmp)
	ALL_DATA = DATA
	DATA = {
		varsion: '2.0',
		current: null,
		ribbons: [
			marked
		],
		//order: marked.slice(),
		order: DATA.order,
		images: DATA.images,
	}
	DATA.current = getGIDBefore(cur, 0)
	loadData(DATA)
	toggleMarkesView('off')
	return DATA
}


// XXX name this in a better way...
function loadAllImages(){
	DATA = ALL_DATA
	loadData(DATA)
	return DATA
}


var toggleMarkedOnlyView = createCSSClassToggler('.viewer', 'marked-only-view',
		function(action){
			if(action == 'on'){
				loadMarkedOnlyData()
			} else {
				loadAllImages()
			}
		})





// XXX shifting images and unmarking in this mode do not work correctly...
var toggleMarkesView = createCSSClassToggler('.viewer', 'marks-visible',
	function(){
		var cur = $('.current.image')
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
		if($('.current.image').hasClass('marked')){
			return
		}
		nextRibbon()
	})


/**********************************************************************
* Actions
*/

// XXX if this unmarks an image in marked-only mode no visible image is 
// 		going to be current...
var toggleImageMark = createCSSClassToggler('.current.image', 'marked',
	function(action){
		toggleMarkesView('on')
		$('.viewer').trigger('togglingMark', [$('.current.image'), action])
	})


// mode can be:
//	- 'ribbon'
//	- 'all'
function removeImageMarks(mode){
	// remove marks from current ribbon (default)...
	if(mode == 'ribbon' || mode == null){
		var ribbon = getRibbon()
		$('.viewer').trigger('removeingRibbonMarks', [ribbon])
		return ribbon
			.find('.marked')
				.removeClass('marked')

	// remove all marks...
	} else if(mode == 'all'){
		$('.viewer').trigger('removeingAllMarks')
		return $('.marked')
			.removeClass('marked')
	} 
}


function markAll(mode){
	// remove marks from current ribbon (default)...
	if(mode == 'ribbon' || mode == null){
		var ribbon = getRibbon()
		$('.viewer').trigger('markingRibbon', [ribbon])
		return ribbon
			.find('.image:not(.marked)')
				.addClass('marked')

	} else if(mode == 'all'){
		$('.viewer').trigger('markingAll')
		return $('.image:not(.marked)').addClass('marked')
	}
}


// NOTE: this only does it's work in the current ribbon...
function invertImageMarks(){
	var ribbon = getRibbon()
	$('.viewer').trigger('invertingMarks', [ribbon])
	return ribbon
		.find('.image')
			.toggleClass('marked')
}


// Toggle marks in the current continuous section of marked or unmarked
// images...
// XXX need to make this dynamic data compatible...
function toggleImageMarkBlock(image){
	if(image == null){
		image = $('.current.image')
	}
	//$('.viewer').trigger('togglingImageBlockMarks', [image])
	// we need to invert this...
	var state = toggleImageMark()
	var _convert = function(){
		if(toggleImageMark(this, '?') == state){
			return false
		}
		toggleImageMark(this, state)
	}
	image.nextAll('.image').each(_convert)
	image.prevAll('.image').each(_convert)
	return state
}




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

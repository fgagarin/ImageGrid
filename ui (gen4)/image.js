/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}
console.log('>>> image')

var images = require('images')


/*********************************************************************/

// List of function that update image state...
//
// these are called by updateImage(..) after the image is created.
//
// each function must be of the form:
// 	updateImage(gid, image) -> image
//
var IMAGE_UPDATERS =
module.IMAGE_UPDATERS = []



/*********************************************************************/

// XXX Constructors...


/*********************************************************************/

// XXX use Ribbon.getElemGID(..) in place of this...
var getImageGID =
module.getImageGID =
function(img){
	return JSON.parse('"'+$(img).attr('gid')+'"')
}

// XXX getImage(...)	->	ribbons
// XXX getVisibleImageSize(...)		-> ribbons
// XXX getBestPreview(...) 		-> ribbons/images
// XXX setImageFlipState(...)	-> ribbons
// XXX makeGIDDistanceCmp(...)	-> data



/*********************************************************************/

// Run all the image update functions registered in IMAGE_UPDATERS, on 
// an image...
//
var updateImageIndicators =
module.updateImageIndicators =
function updateImageIndicators(gid, image){
	gid = gid == null ? getImageGID() : gid
	image = image == null ? getImage() : $(image)

	IMAGE_UPDATERS.forEach(function(update){
		update(gid, image)
	})

	return image
}


// helper...
var _loadImagePreviewURL =
module._loadImagePreviewURL =
function _loadImagePreviewURL(image, url){
	// pre-cache and load image...
	// NOTE: this will make images load without a blackout...
	var img = new Image()
	img.onload = function(){
		image.css({
				'background-image': 'url("'+ url +'")',
			})
	}
	img.src = url
	return img
}


// Update an image element
//
// NOTE: care must be taken to reset ALL attributes an image can have,
// 		a common bug if this is not done correctly, is that some settings
// 		may leak to newly loaded images...
//
// XXX this calls .correctImageProportionsForRotation(..)
var updateImage =
module.updateImage =
function updateImage(image, gid, size, sync){
	image = image == null ? getImage() : $(image)
	sync = sync == null ? CONFIG.load_img_sync : sync
	var old_gid = getImageGID(image)

	// same image -- update...
	if(old_gid == gid || gid == null){
		gid = old_gid

	// reuse for different image -- reconstruct...
	} else {
		// remove old marks...
		if(typeof(old_gid) == typeof('str')){
			getImageMarks(old_gid).remove()
		}
		// reset gid...
		image
			.attr('gid', JSON.stringify(gid))
			.css({
				// clear the old preview...
				'background-image': '',
			})
	}
	size = size == null ? getVisibleImageSize('max') : size

	// get the image data...
	var img_data = IMAGES[gid]
	if(img_data == null){
		img_data = STUB_IMAGE_DATA
	}

	/* XXX does not seem to be needing this...
	// set the current class...
	if(gid == DATA.current){
		image.addClass('current')
	} else {
		image.removeClass('current')
	}
	*/

	// preview...
	var p_url = getBestPreview(gid, size).url

	// update the preview if it's a new image or...
	if(old_gid != gid 
			// the new preview (purl) is different to current...
			|| image.css('background-image').indexOf(encodeURI(p_url)) < 0){
		// sync load...
		if(sync){
			_loadImagePreviewURL(image, p_url)

		// async load...
		} else {
			// NOTE: storing the url in .data() makes the image load the 
			// 		last requested preview and in a case when we manage to 
			// 		call updateImage(...) on the same element multiple times 
			// 		before the previews get loaded...
			// 		...setting the data().loading is sync while loading an 
			// 		image is not, and if several loads are done in sequence
			// 		there is no guarantee that they will happen in the same
			// 		order as requested...
			image.data().loading = p_url
			setTimeout(function(){ 
				_loadImagePreviewURL(image, image.data().loading)
			}, 0)
		}
	}

	// main attrs...
	image
		.attr({
			order: DATA.order.indexOf(gid),
			orientation: img_data.orientation == null ? 0 : img_data.orientation,
		})

	// flip...
	setImageFlipState(image, img_data.flipped == null ? [] : img_data.flipped)

	// NOTE: this only has effect on non-square image blocks...
	correctImageProportionsForRotation(image)

	// marks and other indicators...
	updateImageIndicators(gid, image)

	return image
}


// Same as updateImage(...) but will update all loaded images.
//
// If list is passed this will update only the images in the list. The
// list can contain either gids or image elements.
//
// If CONFIG.update_sort_enabled is set, this will prioritize images by
// distance from current image, loading the closest images first...
//
// If CONFIG.update_sync is set, this will run asynchronously.
var updateImages =
module.updateImages =
function updateImages(list, size, cmp){
	var deferred = $.Deferred()

	function _worker(){
		list = list == null ? $('.image') : $(list)
		size = size == null ? getVisibleImageSize('max') : size

		function _update(_, e){
			var img = typeof(e) == typeof('str') ? getImage(e) : $(e)
			if(img.length > 0){
				updateImage(img, null, size)
			}
		}

		// sorted run...
		if(CONFIG.update_sort_enabled && cmp != false){
			cmp = cmp == null ? 
					makeGIDDistanceCmp(getImageGID(), function(e){ 
						return typeof(e) == typeof('str') ? e : getImageGID(e) 
					}) 
					// XXX this is more correct but is slow...
					//makeGIDRibbonDistanceCmp(getImageGID(), getImageGID) 
				: cmp
			deferred.resolve(list
				// sort images by distance from current, so as to update what 
				// the user is looking at first...
				.sort(cmp)
				.map(_update))

		// do a fast run w.o. sorting images...
		} else {
			deferred.resolve(list.map(_update))
		}
	}

	if(CONFIG.update_sync){
		_worker()
	} else {
		setTimeout(_worker, 0)
	}

	return deferred
}


var correctImageProportionsForRotation =
module.correctImageProportionsForRotation =
function correctImageProportionsForRotation(images, container){
	container = container == null ? $('.viewer') : container

	// XXX
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

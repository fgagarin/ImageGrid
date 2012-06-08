$(document).ready(function() {
	// current state...
	if($('.current-ribbon').length == 0){
		$('.ribbon').first().addClass('current-ribbon')
	}
	if($('.current-image').length == 0){
		$('.current-ribbon').children('.image').first().addClass('current-image')
	}

	// setup event handlers...
	$(document)
		.keydown(handleKeys)
	$('.viewer')
		// XXX does not work on android... (might need to add tap event handling)
		.gestures({eventHandler: handleGestures})
		// XXX this is flaky and breaks some of my code...
		/*.wipetouch({
			wipeLeft: nextImage,
			wipeRight: prevImage,
			wipeUp: demoteImage,
			wipeDown: promoteImage,

			tapToClick: true
		})*/
		/* XXX jquery.mobile handlers... (with this I'm getting way too much bling)
		.bind('swipeleft', function(e){
			nextImage()
			e.preventDefault()
			return false
		})
		.bind('swiperight', function(e){
			prevImage()
			e.preventDefault()
			return false
		})
		*/
	$(".image").click(handleClick)

	// control elements...
	$('.next-image').click(nextImage)
	$('.prev-image').click(prevImage)
	$('.demote').click(demoteImage)
	$('.promote').click(promoteImage)
	$('.toggle-wide').click(toggleWideView)
	$('.toggle-single').click(toggleRibbonView)

	// load images...
	// XXX not allowed...
	//$.getJSON('images.js', loadImages})
	// XXX STUB
	loadImages(image_list)

	// set the default position and init...
	$('.current-image').click()

});

function loadImages(json){
	var images = json.images
	var ribbon = $('.ribbon').last()

	$('.image').remove()

	for(var i = 0; i < images.length; i++){
		$('<div class="image"></div>')
			.css({ 'background-image': 'url('+images[i]+')' })
			.click(handleClick)
			.appendTo(ribbon)
	}
	ribbon.children().first().click()
}

// XXX jquery.gestures handler...
function handleGestures(e){
	switch (e){
		case 'N':
			demoteImage()
			break
		case 'S':
			promoteImage()
			break
		case 'E':
			prevImage()
			break
		case 'W':
			nextImage()
			break
	}
}


function handleClick(e) {

	var cur = $(this)

	// switch classes...
	cur.parents().siblings().children(".image").removeClass("current-image")
	cur.siblings(".image").removeClass("current-image")

	cur.siblings().children(".image").removeClass("current-image")
	cur.parents().siblings(".ribbon").removeClass("current-ribbon")

	cur.addClass("current-image")
	cur.parents(".ribbon").addClass("current-ribbon")


	var container = cur.parents('.container')
	var field = cur.parents(".field")

	var image_offset = cur.offset()
	var field_offset = field.offset()

	// center the current image...
	field.css({
		left: field_offset.left - image_offset.left + (container.innerWidth() - cur.innerWidth())/2, 
		top: field_offset.top - image_offset.top + (container.innerHeight() - cur.innerHeight())/2 
	})


	// XXX do I need this???
	e.preventDefault();
}

var keys = {
	toggleHelpKeys: [72],
	toggleRibbonView: [70],
	closeKeys: [27, 88, 67],

	firstKeys: [36],
	lastKeys: [35],
	previousKeys: [37, 80, 188, 8],
	nextKeys: [39, 78, 190, 32],
	// these work with ctrl and shift modifiers...
	downKeys: [40],
	upKeys: [38],
	// these work with ctrl modifier...
	promoteKeys: [45],
	demoteKeys: [46],

	ignoreKeys: [16, 17, 18],

	helpShowOnUnknownKey: true
}

function handleKeys(event){
	var code = event.keyCode, fn = $.inArray;
	var _ = (fn(code, keys.closeKeys) >= 0) ? function(){}()
		: (fn(code, keys.firstKeys) >= 0) ? firstImage()
		: (fn(code, keys.nextKeys) >= 0) ? nextImage()
		: (fn(code, keys.previousKeys) >= 0) ? prevImage()
		: (fn(code, keys.lastKeys) >= 0) ? lastImage()
		: (fn(code, keys.promoteKeys) >= 0) ? function(){
			if(event.ctrlKey){
				createRibbonBelow()
			}
			promoteImage()
		}()
		: (fn(code, keys.demoteKeys) >= 0) ? function(){
			if(event.ctrlKey){
				createRibbonAbove()
			}
			demoteImage()
		}()
		: (fn(code, keys.downKeys) >= 0) ? function(){
			if(event.shiftKey){
				if(event.ctrlKey){
					createRibbonBelow()
				}
				promoteImage()
			} else {
				focusBelowRibbon()
			}
		}()
		: (fn(code, keys.upKeys) >= 0) ? function(){
			if(event.shiftKey){
				if(event.ctrlKey){
					createRibbonAbove()
				}
				demoteImage()
			} else {
				focusAboveRibbon()
			}
		}()
		: (fn(code, keys.toggleRibbonView) >= 0) ? toggleRibbonView()
		: (fn(code, keys.ignoreKeys) >= 0) ? false
		// XXX
		: (keys.helpShowOnUnknownKey) ? function(){alert(code)}()
		: false;
	return false;
}


// modes...
function showRibbon(){
	$('.single-image-mode')
		.removeClass('single-image-mode')
			.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
				$('.current-image').click()
				return true
			});
}
function showSingle(){
	$('.viewer').not('.single-image-mode')
		.addClass('single-image-mode')
			.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
				$('.current-image').click()
				return true
			});
}
function toggleRibbonView(){
	if($('.single-image-mode').length > 0){
		showRibbon()
	} else {
		showSingle()
	}
}

// XXX need to reposition the whole thing correctly...
function toggleWideView(){
	if($('.wide-view-mode').length > 0){
		$('.wide-view-mode')
			.removeClass('wide-view-mode')
			.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
				$('.current-image').click()
				return true
			});
		
	} else {
		showRibbon()
		//$('.container')
		$('.viewer')
			.not('.wide-view-mode')
				.addClass('wide-view-mode')
				.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
					$('.current-image').click()
					return true
				});
	}
}

// basic navigation...
function firstImage(){
	$('.current-ribbon').children('.image').first().click()
}

function prevImage(){
	$('.current-image').prev('.image').click()
}

function nextImage(){
	$('.current-image').next('.image').click()
}

function lastImage(){
	$('.current-ribbon').children('.image').last().click()
}

// XXX select appropriate image...
function focusAboveRibbon(){
	$('.current-ribbon').prev('.ribbon').children('.image').first().click()
}

// XXX select appropriate image...
function focusBelowRibbon(){
	$('.current-ribbon').next('.ribbon').children('.image').first().click()
}


// create ribbon above/below helpers...
// XXX NOTE: this will shift the content downwards...
function createRibbonAbove(){
	var res = $('<div class="new-ribbon"></div>')
		.insertBefore('.current-ribbon')
		// HACK: without this, the class change below will not animate...
		.show()
		.addClass('ribbon')
		.removeClass('new-ribbon')
	// XXX find a better way to do this...
	$('.field').css({
		top: $('.field').position().top - $('.current-ribbon').outerHeight()
	})
	return res
}

function createRibbonBelow(){
	return $('<div class="new-ribbon"></div>')
		.insertAfter('.current-ribbon')
		// HACK: without this, the class change below will not animate...
		.show()
		.addClass('ribbon')
		.removeClass('new-ribbon')
}

// Modifiers...

// XXX sort elements correctly...
function mergeRibbonsUp(){
	$('.current-ribbon')
		.prev('.ribbon')
			.children()
				.detach()
				.insertAfter('.current-image')
	$('.current-ribbon')
		.prev('.ribbon')
			.slideUp(function(){
				$(this).remove()
				$('.current-image').click()
			})
}

// XXX sort elements correctly...
function mergeRibbonsDown(){
	$('.current-ribbon')
		.next('.ribbon')
			.children()
				.detach()
				.insertAfter('.current-image')
	$('.current-ribbon')
		.next('.ribbon')
			.slideUp(function(){
				$(this).remove()
				$('.current-image').click()
			})
}

// XXX sort elements correctly...
// XXX do animations...
function promoteImage(){
	if($('.current-ribbon').next('.ribbon').length == 0){
		createRibbonBelow()
	}
	// XXX sort elements correctly...
	if($('.current-ribbon').children('.image').length == 1){
		// XXX this adds image to the head while the below portion adds it to the tail...
		mergeRibbonsDown()
	} else {
		img = $('.current-image')
		if(img.next('.image').length == 0){
			prevImage()
		} else {
			nextImage()
		}
		img
			.detach()
			.appendTo($('.current-ribbon').next('.ribbon'))
	}
	$('.current-image').click()
}

// XXX sort elements correctly...
// XXX do animations...
// XXX BUG: when demoting first image (new ribbon created) it gets focused...
//		REASON: .click() gets called in several places BEFORE the animation is done...
//		NOTE: this bog does not affect promoteImage -- adding a lower element does not affect current positioning...
function demoteImage(){
	if($('.current-ribbon').prev('.ribbon').length == 0){
		var new_ribbon = createRibbonAbove()
	}
	// XXX sort elements correctly...
	if($('.current-ribbon').children('.image').length == 1){
		// XXX this adds image to the head while the below portion adds it to the tail...
		mergeRibbonsUp()
	} else {
		img = $('.current-image')
		if(img.next('.image').length == 0){
			// XXX in case when we've just created an empty ribbon, the click in this fires BEFORE it is fully expanded...
			prevImage()
		} else {
			// XXX in case when we've just created an empty ribbon, the click in this fires BEFORE it is fully expanded...
			nextImage()
		}
		img
			.detach()
			.appendTo($('.current-ribbon').prev('.ribbon'))
	}
	// XXX in case when we've just created an empty ribbon, the click in this fires BEFORE it is fully expanded...
	$('.current-image').click()
}


// vim:set ts=4 sw=4 nowrap :

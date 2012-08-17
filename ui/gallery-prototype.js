/******************************************* Actions (EXPERIMENTAL) **/
// XXX this set of features is experimental...
//
// this gives us:
// 	- namespace cleanup
// 	- auto-generated help
//
// the main questions are:
// 	- is this overcomplicating things?
// 	- are the benefits worth the code bloat?
//

var ImageGrid = {
	// this can be serialized...
	// NOTE: to load a serialized set of options use ImageGrid.set(options)...
	option: {},
	option_props: {},

	// define an action...
	// the two values that are obligatory are:
	// 		title	- name of the action
	// 		call	- callable
	// XXX revise...
	ACTION: function(obj){
		// add all the attrs to the function...
		if(this._type_handler[obj.type] != null){
			this._type_handler[obj.type](obj)
		}
		var call = obj.call
		for(i in obj){
			if(i == 'doc' && call.doc != null){
				call.func_doc = call.doc 
			}
			call[i] = obj[i]
		}
		this[obj.id] = call
		return call
	},
	// define an option...
	OPTION: function(obj){
		this.option[obj.name] = obj.value
		this.option_props[obj.name] = obj
		if(this.option_groups.indexOf(obj.group) < 0 && obj.group != null){
			this.option_groups.push(obj.group)
			this.option_groups.sort()
		}
	},
	option_groups: [],
	TYPE: function(name, handler){
		this._type_handler[name] = handler
	},
	_type_handler: {
	},
}


ImageGrid.ACTION({
	id: 'set',
	doc: 'Set option(s) value(s), calling apropriate callbacks.',
	group: 'API',
	call: function (obj){
		for(var n in obj){
			this.option[n] = obj[n]
		}
		// NOTE: this is separate so as to exclude the posibility of race 
		// 		 conditions...
		// 		 ...thogh there is still a posibility of conflicting 
		// 		 modes, especially if one mode sets more modes...
		for(var n in obj){
			// call the callback if it exists...
			if(this.option_props[n].callback != null){
				this.option_props[n].callback()
			}
		}
	}
})
ImageGrid.ACTION({
	id: 'doc',
	doc: 'Get documentation for name.',
	group: 'API',
	call: function(name){
		return {
			action: this[name] != null ? this[name].doc : null,
			action_func: this[name] != null ? this[name].func_doc : null,
			option: this.option_props[name] != null ? this.option_props[name].doc : null,
		}
	}
})
ImageGrid.TYPE('toggle', function(obj){
	var call = obj.call
	// wrap the call to set the option...
	// XXX this is context mirroring...
	obj.call = function(action){
		var res = call(action)
		ImageGrid.option[obj.id] = call('?')
		return res
	}
	// add an option to store the state...
	ImageGrid.OPTION({
		name: obj.id,
		title: obj.title,
		group: obj.group,
		display: obj.display,
		doc: obj.doc == null ? 'Stores the state of '+obj.id+' action.' : obj.doc,
		value: obj.call('?'),
		callback: function(){
			obj.call()
		},
		click_handler: function(){
			obj.call()
		}
	})
})


function showInOverlay(obj){
	// clean things up...
	$('.overlay').children().remove()
	
	
	// put it in the overlay...
	$('.overlay').append(obj)
	
	// prepare the overlay...
	$('.overlay')
		.one('click', function(){
			$('.overlay')
				.fadeOut()
				.children()
					.remove()
		})
		.fadeIn()
	return obj
}


// XXX use order and priority of options...
// XXX make history work for this...
function showSetup(){
	var opts = ImageGrid.option
	var opt_ps = ImageGrid.option_props
	var groups = {}

	var opts_container = $('<div class="options"/>')
	// build options...
	for(var n in opt_ps){
		var disabled = false
		var opt = opt_ps[n]
		var group = opt.group
		// handle disabled opts...
		if(opt.display == false){
			if(!DEBUG){
				continue
			}
			disabled = true
		}
		// build an option...
		var option = $('<div class="option"/>').append($([
			$('<div class="title"/>').text(opt.title != null ? opt.title : n)[0],
			$('<div class="doc"/>').html(opt['doc'].replace(/\n/g, '<br>'))[0],
			$('<div class="value"/>').text(opts[n])[0]
		]))
		// group things correctly...
		if(group == null){
			group = 'Other'
		}
		if(groups[group] == null){
			groups[group] = $('<div class="group"/>')
				.append($('<div class="title"/>').text(group))
				.append(option)
		} else {
			groups[group].append(option)
		}
		// event handlers...
		var handler = opt_ps[n].click_handler
		if(disabled){
			option.addClass('disabled')
		} else if(handler != null){
			option.click(handler)
		}

	}
	// build groups...
	for(var i = 0; i < ImageGrid.option_groups.length; i++){
		var group_name = ImageGrid.option_groups[i]
		opts_container.append(groups[group_name])
	}
	opts_container.append(groups['Other'])

	opts_container.click(function(e){
		// update the view...
		// XXX do we need to redraw the whole thing on each click???
		showSetup()
		e.preventDefault()
		return false
	})

	showInOverlay(opts_container)
}




/******************************************* Setup Data and Globals **/

var DEBUG = true
//var DEBUG = false

ImageGrid.OPTION({
	name: 'BACKGROUND_MODES',
	doc: 'list of available background styles.\n'+
		'NOTE: there is also a null mode that is what is set in the '+
		'main CSS.',
	display: false,
	value: [
		'dark',
		'black',
		// this can be removed but when given it must be last.
		null
	]
})

ImageGrid.OPTION({
	name: 'NORMAL_MODE_BG',
	display: false,
	value: null,
	doc: 'Background style in normal (ribbon) mode.\n'+
		'NOTE: This will get updated on background change in tuntime.\n'+
		'NOTE: null represents the default style.',
	callback: function(){
		if(ImageGrid.toggleSingleImageMode('?') == 'off'){
			setBackgroundMode(ImageGrid.option.NORMAL_MODE_BG)
		}
	}
}) 

ImageGrid.OPTION({
	name: 'SINGLE_IMAGE_MODE_BG',
	display: false,
	value: 'black',
	doc: 'Background style in single image mode.\n'+
		'NOTE: This will get updated on background change in tuntime.\n'+
		'NOTE: null represents the default style.',
	callback: function(){
		if(ImageGrid.toggleSingleImageMode('?') == 'on'){
			setBackgroundMode(ImageGrid.option.SINGLE_IMAGE_MODE_BG)
		}
	}
}) 

ImageGrid.OPTION({
	name: 'ORIGINAL_FIELD_SCALE',
	display: false,
	value: 1.0,
	doc: 'Scale of view in image mode.\n'+
		'NOTE: this will change if changed at runtime.',
	callback: function(){
		if(ImageGrid.toggleSingleImageMode('?') == 'off'){
			setContainerScale(ImageGrid.option.ORIGINAL_FIELD_SCALE)
		}
	}
})

ImageGrid.OPTION({
	name: 'ZOOM_FACTOR',
	title: 'Zooming factor',
	group: 'Mode: All',
	value: 2,
	doc: 'Sets the zoom factor used for a manual zooming step.'
})

ImageGrid.OPTION({
	name: 'MOVE_DELTA',
	title: 'Move step',
	group: 'Mode: All',
	value: 50,
	doc: 'Sets the move delta in pixels for keyboard view moving.'
})




/************************************************ jQuery extensions **/


jQuery.fn.reverseChildren = function(){
	return $(this).each(function(_, e){
		return $(e).append($(e).children().detach().get().reverse())
	})
}



jQuery.fn.sortChildren = function(func){
	return $(this).each(function(_, e){
		return $(e).append($(e).children().detach().get().sort(func))
	})
}




/********************************************************** Helpers **/

function getImageOrder(img){
	// XXX HACK need to parseInt this because '13' is less than '2'... 
	// 	   ...figure a way out of this!!!
	return parseInt($(img).attr('id'))
}


function setImageOrder(img, order){
	return $(img).attr({'id': order})
}


function cmpImageOrder(a, b){
	return getImageOrder(a) - getImageOrder(b)
}



// this will create a function that will add/remove a css_class to elem 
// calling the optional callbacks before and/or after.
//
// elem is a jquery compatible object; default use-case: a css selector.
//
// the resulting function understands the folowing arguments:
// 	- 'on'			: switch mode on
// 	- 'off'			: switch mode off
// 	- '?'			: return current state ('on'|'off')
// 	- no arguments	: toggle the state
//
// NOTE: of only one callback is given then it will be called after the 
// 		 class change...
// 		 a way around this is to pass an empty function as callback_b
//
function createCSSClassToggler(elem, css_class, callback_a, callback_b){
	// prepare the pre/post callbacks...
	if(callback_b == null){
		var callback_pre = null
		var callback_post = callback_a
	} else {
		var callback_pre = callback_a
		var callback_post = callback_b
	}
	// build the acual toggler function...
	var func = function(action){
		if(action == null || action == '?'){
			var getter = action == '?' ? true : false
			action = 'on'
			// get current state...
			if( $(elem).hasClass(css_class) ){
				action = 'off'
			}
			if(getter){
				// as the above actions indicate intent and not state, 
				// we'll need to swap the values...
				return action == 'on' ? 'off' : 'on'
			}
		}
		if(callback_pre != null){
			callback_pre(action)
		}
		// play with the class...
		if(action == 'on'){
			$(elem).addClass(css_class)
		} else {
			$(elem).removeClass(css_class)
		}
		if(callback_post != null){
			callback_post(action)
		}
	}
	func.doc = 'With no arguments this will toggle between "on" and '+
		'"off".\n'+
		'If either "on" or "off" are given then this will switch '+
		'to that mode.\n'+
		'If "?" is given, this will return either "on" or "off" '+
		'depending on the current state.'
	return func
}


// disable transitions on obj, call func then enable transitions back...
function doWithoutTransitions(obj, func){
	obj
		.addClass('unanimated')
		.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
			func()
			$('.viewer')
				.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
					obj.removeClass('unanimated')
				})
		})
}


// find an image object after which to position image ID...
// used for two main tasks:
// 	- positioning promoted/demoted images
// 	- centering ribbons
// returns:
// 	- null		- empty ribbon or no element greater id should be first
// 	- element
// XXX do we need to make ids numbers for this to work?
function getImageBefore_lin(id, ribbon, get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	// walk the ribbon till we find two images one with an ID less and 
	// another greater that id...
	var images = ribbon.children('.image')
	var prev = null
	for(var i=0; i < images.length; i++){
		// XXX replace the id attr with a universal getter
		if(get_order(images[i]) > id){
			return prev
		}
		prev = $(images[i])
	}
	return prev
}


// generic binery search for element just before the id...
// NOTE: if id is in lst, this will return the element just before it.
// NOTE: lst must be sorted.
function binarySearch(id, lst, get_order){
	if(get_order == null){
		get_order = function(o){return o}
	}
	
	// empty list...
	if(lst.length == 0){
		return null
	}
	
	// current section length
	var l = Math.round((lst.length-1)/2)
	// current position...
	var i = l

	while(true){
		var i_id = get_order(lst[i])
		// beginning of the array...
		if(i == 0){
			if(id > i_id){
				return i
			}
			return null
		}
		// we got a hit...
		if(i_id == id){
			return i-1
		}
		// we are at the end...
		if(i == lst.length-1 && id > i_id){
			return i
		}
		var ii_id = get_order(lst[i+1])
		// test if id is between i and i+1...
		if( i_id < id && id < ii_id ){
			return i
		}
		// prepare for next iteration...
		// NOTE: we saturate the values so we will never get out of bounds.
		l = Math.round(l/2)
		if(id < i_id){
			// lower half...
			i = Math.max(0, i-l)
		} else {
			// upper half...
			i = Math.min(i+l, lst.length-1)
		}
	}
}

// wrapper around binarySearch.
// this is here to make binarySearch simpler to test and debug...
function getImageBefore_bin(id, ribbon, get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	var images = ribbon.children('.image') 
	var i = binarySearch(id, images, get_order)
	if(i == null){
		return null
	}
	return $(images[i])
}

// set the default search...
var getImageBefore = getImageBefore_bin




/************************************************** Setup Functions **/
// XXX is this a correct place for these?

function setDefaultInitialState(){
	if($('.current.ribbon').length == 0){
		$('.ribbon').first().addClass('current')
	}
	if($('.current.image').length == 0){
		$('.current.ribbon').children('.image').first().addClass('current')
	}
}


function setupEvents(){
	// resize...
	$(window).resize(function() {
		// XXX HACK
		$('.current.image').click()
	})
	// keyboard...
	if(DEBUG){
		$(document)
			.keydown(makeKeyboardHandler(keybindings, function(k){alert(k)}))
	} else {
		$(document)
			.keydown(makeKeyboardHandler(keybindings))
	}
	// swipe...
	$('.viewer')
		.swipe({
			swipeLeft: nextImage,
			swipeRight: prevImage,
			swipeUp: shiftImageUp,
			swipeDown: shiftImageDown
		})
	// dragging...
	// XXX make this work seamlessly with touchSwipe...
	// XXX cancel clicks while dragging...
	// XXX this does not work on android...
	$('.field').draggable()
}



function setupControlElements(){
	// images...
	$(".image").click(handleImageClick)

	// buttons...
	$('.screen-button.next-image').click(nextImage)
	$('.screen-button.prev-image').click(prevImage)
	// XXX rename classes to "shift-image-up" and "shift-image-down"...
	$('.screen-button.demote').click(shiftImageUp)
	$('.screen-button.promote').click(shiftImageDown)
	$('.screen-button.zoom-in').click(function(){scaleContainerBy(ImageGrid.option.ZOOM_FACTOR)})
	$('.screen-button.zoom-out').click(function(){scaleContainerBy(1/ImageGrid.option.ZOOM_FACTOR)})
	// XXX
	$('.screen-button.toggle-wide').click(function(){scaleContainerBy(0.2)})
	$('.screen-button.toggle-single').click(ImageGrid.toggleSingleImageMode)
	$('.screen-button.fit-three').click(fitThreeImages)
	$('.screen-button.show-controls').click(function(){ImageGrid.toggleControls('on')})
	$('.screen-button.settings').click(showSetup)
}



/**************************************************** Serialization **/


function loadImages(json){
	var images = json.images
	var ribbon = $('.ribbon').last()

	$('.image').remove()

	for(var i = 0; i < images.length; i++){
		setImageOrder($('<div class="image"></div>')
			.css({ 'background-image': 'url('+images[i]+')' }), i)
				.click(handleImageClick)
				.appendTo(ribbon)
	}
	ribbon.children().first().click()
}



/* bulid a JSON object from current state...
 *
 * format:
 * 	{
 * 		ribbons: [
 * 			<image-id>: {
 * 				url: <image-URL>,
 * 			},				
 * 			...
 * 		]
 * 	}
 */
// XXX add incremental or partial updates...
function buildJSON(get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	var ribbons = $('.ribbon')
	res = {
		ribbons: []
	}
	for(var i=0; i < ribbons.length; i++){
		var images = $(ribbons[i]).children('.image')
		var ribbon = {}
		res.ribbons[res.ribbons.length] = ribbon
		for(var j=0; j < images.length; j++){
			var image = $(images[j])
			var id = get_order(image)
			ribbon[id] = {
				// unwrap the url...
				// XXX would be nice to make this a relative path... (???)
				url: /url\((.*)\)/.exec(image.css('background-image'))[1],
			}
		}
	}
	return res
}



// XXX use this instead of loadImages(...)
// XXX might be good to add images in packs here, not one by one...
function loadJSON(data, set_order){
	if(set_order == null){
		set_order = setImageOrder
	}
	var ribbons = data.ribbons
	var field = $('.field')

	// drop all old content...
	field.children().remove()

	for(var i=0; i < ribbons.length; i++){
		var images = ribbons[i]
		// create ribbon...
		var ribbon = $('<div class="ribbon"></div>')
			.appendTo(field)
		for(var j in images){
			var image = $(images[j])
			// create image...
			set_order($('<div class="image"></div>')
				.css({ 'background-image': 'url('+image.attr('url')+')' }), j)
					.click(handleImageClick)
					.appendTo(ribbon)
		}
	}
	$('.image').first().click()
}



/*
 * The folowing two functions will get the vertical and horizontal 
 * distance components between the points a and A, centers of the small
 * and large squares respectively.
 * One of the squares is .field and the other is .container, 
 * which is small or big is not important.
 *
 *      +---------------+-------+
 *      |               |       |
 *      |               |       |
 *      |       + a . . | . . . | . +
 *      |       .       |       |   +- getCurrentVerticalOffset(...)
 *      |       .   + A | . . . | . +
 *      +---------------+       |
 *      |       .   .           |
 *      |       .   .           |
 *      |       .   .           |
 *      +-----------------------+
 *              .   .
 *              +-+-+
 *                +------------------- getCurrentHorizontalOffset(...)
 *
 *
 * Adding this distance to margins of one of the sqares will effectively 
 * allign the two points.
 *
 * NOTE: neither function accunts for field margins.
 *
 */

// get the vertical offset of the center of square from center of container
// NOTE: this does not account for field margins
function getCurrentVerticalOffset(image){
	if(image == null){
		image = $('.image.current')
	}

	var scale = getElementScale($('.field'))

	var ribbons = $('.ribbon')
	var ribbon = image.parents('.ribbon')
	var images = ribbon.children('.image')

	// vertical...
	var H = $('.container').height()
	var h = ribbons.outerHeight(true)
	// margin...
	var mh = h - ribbons.outerHeight()
	// current ribbon position (1-based)
	var rn = ribbons.index(ribbon) + 1
	// relative position to field... 
	// XXX is there a better way to get this?
	var t = rn * (h - mh/2)
	
	return -t + H/2 + h/2
}

// get the horizontal offset of the center of square from center of container
// NOTE: this does not account for field margins
function getCurrentHorizontalOffset(image){
	if(image == null){
		image = $('.image.current')
	}

	var ribbon = image.parents('.ribbon')
	var images = ribbon.children('.image')

	var W = $('.container').width()
	var w = images.outerWidth(true)
	// margin...
	var mw = w - images.outerWidth()
	// current square position (1-based)
	var sn = images.index(image) + 1
	var l = sn * (w - mw/2)

	return -l + W/2 + w/2
}



function centerSquare(){
	$('.field').css({
		'margin-top': getCurrentVerticalOffset()
	})
	// horizontal...
	alignRibbon()
	centerCurrentImage()
}



function alignRibbon(image, position){
	// default values...
	if(image == null){
		image = $('.image.current')
	}
	if(position == null){
		position = 'center'
	}

	var ribbon = image.parents('.ribbon')

	// account for margined field...
	// NOTE: this enables us to cheat and shift all the ribbons just
	//       by changing field margin-left...
	var cml = parseFloat($('.field').css('margin-left'))
	if(!cml){
		cml = 0
	}
	var h_offset = getCurrentHorizontalOffset(image) - cml
	var w = $('.image').outerWidth(true)

	switch(position){
		case 'before':
			ribbon.css({'margin-left': h_offset - w/2})
			return true
		case 'center':
			ribbon.css({'margin-left': h_offset})
			return true
		case 'after':
			ribbon.css({'margin-left': h_offset + w/2})
			return true
	}
	return false
}




/*************************************************** Event Handlers **/

// handle click for images...
function handleImageClick(){
	// set classes...
	$('.current').removeClass('current')
	$(this)
		.addClass('current')
		.parents('.ribbon')
			.addClass('current')
	// position the field and ribbons...
	centerSquare()
	alignRibbons()
}



function clickAfterTransitionsDone(img){
	if(img == null){
		img = $('.current.image')
	}
	$('.viewer')
		.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", function(){
			img.click()
			return true
		})
}



// center other ribbons relative to current image...
// NOTE: only two ribbons are positioned at this point...
function alignRibbons(get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	// XXX might be good to move this to a more generic location...
	var id = get_order($('.current.image'))
	var directions = ['prev', 'next']
	for(var i in directions){
		var ribbon = $('.current.ribbon')[directions[i]]('.ribbon')
		if(ribbon.length == 1){
			var img = getImageBefore(id, ribbon)
			if(img != null){
				alignRibbon(img, 'before')
			} else {
				// there are no images before...
				alignRibbon(ribbon.children('.image').first(), 'after')
			}
		}
	}
}



/*
 * Basic key format:
 * 		<key-code> : <callback>,
 * 		<key-code> : {
 * 			'default': <callback>,
 *			// a modifier can be any single modifier, like shift or a 
 *			// combination of modifers like 'ctrl+shift', given in order 
 *			// of priority.
 *			// supported modifiers are (in order of priority):
 *			//	- ctrl
 *			//	- alt
 *			//	- shift
 * 			<modifer>: [...]
 * 		},
 *		// alias...
 * 		<key-code-a> : <key-code-b>,
 *
 * XXX might need to add meta information to generate sensible help...
 */
function makeKeyboardHandler(keybindings, unhandled){
	if(unhandled == null){
		unhandled = function(){return false}
	}
	return function(evt){
		var key = evt.keyCode
		// XXX ugly...
		var modifers = evt.ctrlKey ? 'ctrl' : ''
		modifers += evt.altKey ? (modifers != '' ? '+alt' : 'alt') : ''
		modifers += evt.shiftKey ? (modifers != '' ? '+shift' : 'shift') : ''

		var handler = keybindings[key]

		// alias...
		while (typeof(handler) == typeof(123)) {
			handler = keybindings[handler]
		}
		// no handler...
		if(handler == null){
			return unhandled(key)
		}
		// complex handler...
		if(typeof(handler) == typeof({})){
			var callback = handler[modifers]
			if(callback == null){
				callback = handler['default']
			}
			if(callback != null){
				callback()
				return false
			}
		} else {
			// simple callback...
			handler() 
			return false
		}
		return unhandled(key)
	}
}




/************************************************************ Modes **/

// XXX is this worth it??
ImageGrid.ACTION({
	id: 'toggleSingleImageMode',
	title: 'Single image mode',
	doc: 'Toggle single image mode.',
	group: 'Mode: Single Image',
	type: 'toggle',
	display: false,
	call: createCSSClassToggler('.viewer', 'single-image-mode', 
		// pre...
		function(action){
			if(action == 'on'){
				ImageGrid.option.NORMAL_MODE_BG = getBackgroundMode()
				ImageGrid.option.ORIGINAL_FIELD_SCALE = getElementScale($('.field'))
			// do this only when coming out of single image mode...
			} else if(ImageGrid.toggleSingleImageMode('?') == 'on'){
				ImageGrid.option.SINGLE_IMAGE_MODE_BG = getBackgroundMode()
			}
		},
		// post...
		function(action){
			if(action == 'on'){
				fitImage()
				setBackgroundMode(ImageGrid.option.SINGLE_IMAGE_MODE_BG)
			} else {
				setContainerScale(ImageGrid.option.ORIGINAL_FIELD_SCALE)
				setBackgroundMode(ImageGrid.option.NORMAL_MODE_BG)
			}
			clickAfterTransitionsDone()
		})
})


// XXX is this worth it??
ImageGrid.ACTION({
	id: 'toggleSingleRibbonMode',
	title: 'Single ribbon mode',
	doc: 'Show/hide other ribbons.',
	group: 'Mode: Ribbon',
	type: 'toggle',
	call: createCSSClassToggler('.viewer', 'single-ribbon-mode')
})


// XXX this can be done in two ways:
// 		- keep all images when promoting, just add a class to them that 
// 		  will hide them until we enable their display...
// 		  	+ very fast to show/hide
// 		  	- will complicate reversing ribbons allot
// 		- add/remove these images on demand
// 			+ a tad complicated...
// XXX is this worth it??
ImageGrid.ACTION({
	id: 'toggleDisplayShiftedUpImages',
	title: 'Display shifted up images',
	doc: 'Toggle display of shifted images.',
	group: 'Mode: Ribbon',
	display: false,
	type: 'toggle',
	call: createCSSClassToggler('.viewer', 'show-shifted-up-images')
})



function getBackgroundMode(){
	var mode = null
	var BACKGROUND_MODES = ImageGrid.option.BACKGROUND_MODES
	// find a mode to set...
	for(var i = 0; i < BACKGROUND_MODES.length; i++){
		// we found our mode...
		if( $('.' + BACKGROUND_MODES[i]).length > 0 ){
			return BACKGROUND_MODES[i]
		}
	}
	return mode
}



// set the background mode
// NOTE: passing null will set the default.
function setBackgroundMode(mode){
	var BACKGROUND_MODES = ImageGrid.option.BACKGROUND_MODES
	var cur = BACKGROUND_MODES.indexOf(mode)

	// invalid mode...
	if( cur == -1 && mode != null ){
		return null
	}
	// set the mode...
	if(mode != null){
		$('.viewer').addClass(mode)
	}
	// remove all others...
	for(var i = 0; i < BACKGROUND_MODES.length; i++){
		if( i == cur ){
			continue
		}
		mode = BACKGROUND_MODES[i]
		$('.' + mode).removeClass(mode)
	}
}



// this will toggle through background theems: none -> dark -> black
function toggleBackgroundModes(){
	var BACKGROUND_MODES = ImageGrid.option.BACKGROUND_MODES
	var mode = getBackgroundMode()
	// default -> first
	if(mode == null){
		setBackgroundMode(BACKGROUND_MODES[0])
	// last -> default...
	} else if(mode == BACKGROUND_MODES[BACKGROUND_MODES.length-1]){
		setBackgroundMode()
	// next...
	} else {
		setBackgroundMode(BACKGROUND_MODES[BACKGROUND_MODES.indexOf(mode)+1])
	}
}



//var toggleSingleImageModeTransitions = createCSSClassToggler('.viewer', 'no-single-image-transitions')
ImageGrid.ACTION({
	id: 'toggleSingleImageModeTransitions',
	title: 'Single image mode transitions',
	doc: 'Toggle transitions in single image mode.',
	group: 'Mode: Single Image',
	type: 'toggle',
	call: createCSSClassToggler('.viewer', 'no-single-image-transitions')
})


//var toggleControls = createCSSClassToggler('.viewer', 'hidden-controls')
ImageGrid.ACTION({
	id: 'toggleControls',
	title: 'Keyboard interface mode',
	doc: 'Toggle Touch/Keyboard UI controls.',
	group: 'Mode: All',
	type: 'toggle',
	call: createCSSClassToggler('.viewer', 'hidden-controls')
})


//var toggleTransitions = createCSSClassToggler('.viewer', 'transitions-enabled')
ImageGrid.ACTION({
	id: 'toggleTransitions',
	title: 'Global transitions',
	doc: 'Toggle global transitions.',
	group: 'Mode: All',
	type: 'toggle',
	call: createCSSClassToggler('.viewer', 'transitions-enabled')
})



/********************************************************* Movement **/

/* Set the transform-origin to the center of the current view...
 */
function centerOrigin(){
	var mt = parseFloat($('.field').css('margin-top'))
	var ml = parseFloat($('.field').css('margin-left'))
	var cml = parseFloat($('.current.ribbon').css('margin-left'))

	var t = parseFloat($('.field').css('top'))
	var l = parseFloat($('.field').css('left'))
	var w = $('.field').width()
	var h = $('.field').height()
	var W = $('.container').width()
	var H = $('.container').height()

	var ot = -getCurrentVerticalOffset() + H/2 - t
	var ol = -ml + W/2 - l

	$('.field').css({
		'transform-origin': ol + 'px ' + ot + 'px',
		'-o-transform-origin': ol + 'px ' + ot + 'px',
		'-moz-transform-origin': ol + 'px ' + ot + 'px',
		'-webkit-transform-origin': ol + 'px ' + ot + 'px',
		'-ms-transform-origin': ol + 'px ' + ot + 'px'
	})

	// XXX for debugging...
	$('.origin-marker').css({
		'top': ot,
		'left': ol
	})
}



// XXX these work oddly when page is scaled in maxthon... 
// XXX virtually identical, see of can be merged...
function moveViewUp(){
	var t = parseInt($('.field').css('top'))
	$('.field').css({'top': t-(ImageGrid.option.MOVE_DELTA)})
}
function moveViewDown(){
	var t = parseInt($('.field').css('top'))
	$('.field').css({'top': t+(ImageGrid.option.MOVE_DELTA)})
}
function moveViewLeft(){
	var l = parseInt($('.field').css('left'))
	$('.field').css({'left': l-(ImageGrid.option.MOVE_DELTA)})
}
function moveViewRight(){
	var l = parseInt($('.field').css('left'))
	$('.field').css({'left': l+(ImageGrid.option.MOVE_DELTA)})
}



function centerCurrentImage(){
	$('.field')
		.css({
			'top': 0,
			'left': 0
		})
		// do this after animations are done...
		.one("webkitTransitionEnd oTransitionEnd msTransitionEnd transitionend", centerOrigin)
	// this is repeated intentionally...
	// ...needed for small shifts, while the after-animation event 
	// is for large moves.
	centerOrigin()
}





/******************************************************* Navigation **/

// basic navigation...
function firstImage(){
	return $('.current.ribbon').children('.image').first().click()
}
function prevImage(){
	return $('.current.image').prev('.image').click()
}
function nextImage(){
	return $('.current.image').next('.image').click()
}
function lastImage(){
	return $('.current.ribbon').children('.image').last().click()
}



// add skip screen images in direction...
function skipScreenImages(direction){
	// calculate screen width in images...
	var W = $('.viewer').width()
	var w = $('.current.image').width()
	var scale = getElementScale($('.field'))
	var n = Math.max(Math.floor(W/(w*scale))-1, 0)

	var img = $('.current.image')[direction + 'All']('.image').eq(n)
	if(img.length > 0){
		return img.click()
	} else if(direction == 'next'){
		return lastImage()
	} else if(direction == 'prev'){
		return firstImage()
	}
}
var nextScreenImages = function(){ return skipScreenImages('next') }
var prevScreenImages = function(){ return skipScreenImages('prev') }



function focusRibbon(direction, get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	var id = get_order($('.current.image'))
	var prev = getImageBefore(id, $('.current.ribbon')[direction]('.ribbon'))
	if(prev){
		var next = prev.next()
		// NOTE: direction is accounted for to make the up/down shifts 
		// 		 symmetrical in the general case...
		if(next.length == 0 || direction == 'next'){
			return prev.click()
		} else {
			return next.click()
		}
	} else {
		return $('.current.ribbon')[direction]('.ribbon').children('.image').first().click()
	}
}
var focusAboveRibbon = function(){ return focusRibbon('prev') }
var focusBelowRibbon = function(){ return focusRibbon('next') }




/********************************************************** Zooming **/

// NOTE: this will only return a single scale value...
function getElementScale(elem){
	//var transform = elem.css('transform')
	var vendors = ['o', 'moz', 'ms', 'webkit']
	var transform = elem.css('transform')
	var res

	// go through vendor prefixes... (hate this!)
	if(!transform || transform == 'none'){
		for(var i in vendors){
			transform = elem.css('-' + vendors[i] + '-transform')
			if(transform && transform != 'none'){
				break
			}
		}
	}
	// no transform is set...
	if(!transform || transform == 'none'){
		return 1
	}
	// get the scale value -- first argument of scale/matrix...
	return parseFloat((/(scale|matrix)\(([^,]*),.*\)/).exec(transform)[2])
}



function setElementScale(elem, scale){
	return elem.css({
		'transform': 'scale('+scale+', '+scale+')',
		'-moz-transform': 'scale('+scale+', '+scale+')',
		'-o-transform': 'scale('+scale+', '+scale+')',
		'-ms-transform': 'scale('+scale+', '+scale+')',
		'-webkit-transform': 'scale('+scale+', '+scale+')',
	})
}



function scaleContainerBy(factor){
	return setContainerScale(getElementScale($('.field'))*factor)
}



function setContainerScale(scale){
	return setElementScale($('.field'), scale)
}



function fitImage(){
	var H = $('.container').height()
	var W = $('.container').width()

	var h = $('.image.current').height()
	var w = $('.image.current').width()

	var f = Math.min(H/h, W/w)

	setContainerScale(f)
}



function fitThreeImages(){
	var H = $('.container').height()
	var W = $('.container').width()

	var h = $('.image.current').height()
	// NOTE: this is cheating, need to get actual three widths...
	var w = $('.image.current').width()*3

	var f = Math.min(H/h, W/w)

	setContainerScale(f)
}




/********************************************************** Actions **/
// basic actions...
// NOTE: below 'direction' argument is meant in the html sence, 
//       i.e. next/prev...

// create ribbon above/below helpers...
// XXX adding a ribbon above the current is still jumpy, need to devise 
// 		a cleaner way to do this...
function createRibbon(direction){
	if(direction == 'next'){
		var insert = 'insertAfter'
	} else if(direction == 'prev') {
		var insert = 'insertBefore'
	} else {
		return false
	}

	// adding a new ribbon above the current effectively pushes the 
	// whole view down, so we need to compensate for this.
	// NOTE: the problem is partly caused by clicks fiering BEFORE the 
	// 		 animation is done...
	$('.field').addClass('unanimated')	
	
	if(direction == 'prev'){
		$('.field').css({
			'margin-top': parseInt($('.field').css('margin-top')) - $('.ribbon').outerHeight()
		})
	}
	// the actual insert...
	var res = $('<div class="ribbon"></div>')[insert]('.current.ribbon')
	
	// restore the animated state...
	$('.field').removeClass('unanimated')	

	return res
}



// merge current and direction ribbon...
// NOTE: this will take all the elements from direction ribbon and add
//       them to current
// XXX this uses jquery animation...
// XXX one way to optimise this is to add the lesser ribbon to the 
//     greater disregarding their actual order...
// XXX think about using $(...).sortChildren(...) / sortImages()
function mergeRibbons(direction, get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	var current_ribbon = $('.current.ribbon')
	var images = $('.current.ribbon')[direction]('.ribbon').children()
	for(var i=0; i < images.length; i++){
		var image = $(images[i])
		// get previous element after which we need to put the current...
		var prev_elem = getImageBefore(get_order(image), current_ribbon)
		// check if we need to be before the first element...
		if(prev_elem == null){
			image
				.detach()
				.insertBefore(current_ribbon.children('.image').first())
		} else {
			image
				.detach()
				.insertAfter(prev_elem)
		}
	}
	// animate...
	$('.current.ribbon')[direction]('.ribbon')
			.slideUp(function(){
				$(this).remove()
				$('.current.image').click()
			})
}




/*************************************************** Editor Actions **/

// now the actual modifiers...
function shiftImage(direction, get_order){
	if(get_order == null){
		get_order = getImageOrder
	}
	if($('.current.ribbon')[direction]('.ribbon').length == 0){
		createRibbon(direction)
	}

	// get previous element after which we need to put the current...
	var prev_elem = getImageBefore(
					get_order($('.current.image')), 
					$('.current.ribbon')[direction]('.ribbon'))

	// last image in ribbon, merge...
	if($('.current.ribbon').children('.image').length == 1){
		mergeRibbons(direction)
	} else {
		img = $('.current.image')
		if(img.next('.image').length == 0){
			prevImage()
		} else {
			nextImage()
		}
		// do the actual move...
		if(prev_elem){
			// insert element after current...
			img
				.detach()
				.insertAfter(prev_elem)
		} else {
			// empty ribbon or fisrt element...
			img
				.detach()
				.prependTo($('.current.ribbon')[direction]('.ribbon'))
		}
	}
	$('.current.image').click()
}
var shiftImageDown = function(){ return shiftImage('next') }
var shiftImageUp = function(){ return shiftImage('prev') }



// reverse the ribbon order...
// NOTE: this is like flipping the field vertically...
function reverseRibbons(){
	// reverse...
	$('.field').reverseChildren()
	// compensate for offset cange...
	$('.current.image').click()
}



// sort all images in all ribbons...
// NOTE: this will only align three ribbons...
function sortImages(){
	$('.ribbon').sortChildren(cmpImageOrder)
	// compensate for offset cange...
	$('.current.image').click()
}


// use the cmp function to update image id's and resort...
function resortImagesVia(cmp){
	// reverse ID order...
	$($('.image').get().sort(cmp))
		.each(function(i, e){$(e).attr({'id': i})})
	// resort the images...
	sortImages()
}


// reverse the order of images in all ribbons by reversing their id attr
// and resorting...
// NOTE: this is like flipping the field horizontally...
function reverseImageOrder(){
	resortImagesVia(function(a, b){return cmpImageOrder(b, a)})
}


// sort images py their full path...
// XXX this should use a normalized path...
function sortImagesByPath(){
	resortImagesVia(function(a, b){ 
		a = $(a).css('background-image')
		b = $(b).css('background-image') 
		return a > b ? 1 : a < b ? -1 : 0
	})
}


// XXX group images in ribbon and merge down/up
//
// 		grouping will make the images in a ribbon adjacent to each 
// 		other...
//
// 		the group's position will be the same as current images i.e. 
// 		between the below/above two images...

// XXX shift group/image right/left...




/*********************************************************************/
// vim:set ts=4 sw=4 nowrap :

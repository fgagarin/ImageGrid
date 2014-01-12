/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

var CURSOR_SHOW_THRESHOLD = 20
var CURSOR_HIDE_TIMEOUT = 1000

var STATUS_QUEUE = []
var STATUS_QUEUE_TIME = 200

var CONTEXT_INDICATOR_UPDATERS = []




/*********************************************************************/

// XXX revise...
// NOTE: to catch the click event correctly while the cursor is hidden
//		this must be the first to get the event...
// NOTE: this uses element.data to store the timer and cursor position...
function autoHideCursor(elem){
	elem = $(elem)
	var data = elem.data()
	elem
		.on('mousemove', function(evt){
			var cursor = elem.css('cursor')

			data._cursor_pos = data._cursor_pos == null || cursor != 'none' ?
						[evt.clientX, evt.clientY] 
					: data._cursor_pos

			// cursor visible -- extend visibility...
			if(cursor != 'none'){

				if(data._cursor_timeout != null){
					clearTimeout(data._cursor_timeout)
				}
				data._cursor_timeout = setTimeout(function(){
						if(Math.abs(evt.clientX - data._cursor_pos[0]) < CURSOR_SHOW_THRESHOLD 
								|| Math.abs(evt.clientY - data._cursor_pos[1]) < CURSOR_SHOW_THRESHOLD){

							elem.css('cursor', 'none')
						}
					}, CURSOR_HIDE_TIMEOUT)


			// cursor hidden -- if outside the threshold, show...
			} else if(Math.abs(evt.clientX - data._cursor_pos[0]) > CURSOR_SHOW_THRESHOLD 
				|| Math.abs(evt.clientY - data._cursor_pos[1]) > CURSOR_SHOW_THRESHOLD){

				elem.css('cursor', '')
			}
		})
		.click(function(evt){
			if(elem.css('cursor') == 'none'){
				//event.stopImmediatePropagation()
				//event.preventDefault()

				if(data._cursor_timeout != null){
					clearTimeout(data._cursor_timeout)
					data._cursor_timeout = null
				}

				elem.css('cursor', '')
				//return false
			}
		})
	return elem
}


/*
// XXX does not work...
// 		...does not show the cursor without moving it...
function showCursor(elem){
	elem = $(elem)
	var data = elem.data()
	if(data._cursor_timeout != null){
		clearTimeout(data._cursor_timeout)
	}
	elem.css('cursor', '')
}
*/


function setupIndicators(){
	showGlobalIndicator(
			'single-ribbon-mode', 
			'Single ribbon mode (F3)')
		.css('cursor', 'hand')
		.click(function(){ toggleSingleRibbonMode() })
}


function makeContextIndicatorUpdater(image_class){
	var _updater = function(image){
		var indicator = $('.context-mode-indicators .current-image-'+image_class)
		if(image.hasClass(image_class)){
			indicator.addClass('shown')
		} else {
			indicator.removeClass('shown')
		}
	}
	CONTEXT_INDICATOR_UPDATERS.push(_updater)
	return _updater
}


function updateContextIndicators(image){
	image = image == null ? getImage() : $(image)

	CONTEXT_INDICATOR_UPDATERS.map(function(update){
		update(image)
	})	
}


function showCurrentMarker(){
	return $('<div/>')
		.addClass('current-marker')
		.css({
			opacity: '0',
			top: '0px',
			left: '0px',
		})
		.appendTo($('.ribbon-set'))
		.animate({
			'opacity': 1
		}, 500)
		.mouseover(function(){
			$('.current.image')
		})
}

function updateCurrentMarker(){
	var scale = getElementScale($('.ribbon-set'))
	var marker = $('.current-marker')
	var cur = $('.current.image')
	var w = cur.outerWidth(true)
	var h = cur.outerHeight(true)
	marker = marker.length == 0 ? showCurrentMarker() : marker 
	var d = getRelativeVisualPosition(marker, cur)
	return marker.css({
		top: parseFloat(marker.css('top')) + d.top/scale,
		left: parseFloat(marker.css('left')) + d.left/scale,
		// keep size same as the image...
		width: w,
		height: h,
	})
}


function flashIndicator(direction){
	var cls = {
		// shift up/down...
		prev: '.up-indicator',
		next: '.down-indicator',
		// hit start/end/top/bottom of view...
		start: '.start-indicator',
		end: '.end-indicator',
		top: '.top-indicator',
		bottom: '.bottom-indicator',
	}[direction]

	var indicator = $(cls)

	if(indicator.length == 0){
		indicator = $('<div>')
			.addClass(cls.replace('.', ''))
			.appendTo($('.viewer'))
	}

	return indicator
		// NOTE: this needs to be visible in all cases and key press 
		// 		rhythms... 
		.show()
		.delay(100)
		.fadeOut(300)
}


function showRibbonIndicator(){
	var cls = '.ribbon-indicator'
	var indicator = $(cls)

	if(indicator.length == 0){
		indicator = $('<div>')
			.addClass(cls.replace('.', ''))
			.appendTo($('.viewer'))
	}

	var r = getRibbonIndex()

	// get the base ribbon...
	var base = getBaseRibbonIndex()

	var r =  r == base ? r+'*' : r
	return indicator.text(r)
}


function flashRibbonIndicator(){
	var indicator = showRibbonIndicator()
	var cls = '.flashing-ribbon-indicator'

	var flashing_indicator = $(cls)

	if(flashing_indicator.length == 0){
		flashing_indicator = indicator
			.clone()
			.addClass(cls.replace('.', ''))
			.appendTo($('.viewer'))
	}

	return flashing_indicator
//		.stop()
//		.show()
//		.delay(200)
//		.fadeOut(500)
		.show()
		.delay(100)
		.fadeOut(300)
}


// Update an info element
//
// align can be:
// 	- top
// 	- bottom
//
// If target is an existing info container (class: overlay-info) then 
// just fill that.
function updateInfo(elem, data, target){
	var viewer = $('.viewer')
	target = target == null ? viewer : $(target)
	elem = elem == null ? $('.overlay-info') : $(elem)

	if(elem.length == 0){
		elem = $('<div/>')
	}

	elem
		.addClass('overlay-info')
		.html('')
		.off()

	if(typeof(data) == typeof('abc')){
		elem.html(data)
	} else {
		elem.append(data)
	}

	return elem 
		.appendTo(target)
}


function showInfo(elem, data, target){
	elem = elem == null ? $('.overlay-info') : elem
	elem = data == null ? elem : updateInfo(elem, data, traget)
	return elem.fadeIn()
}


function hideInfo(elem){
	elem = elem == null ? $('.overlay-info') : elem
	return elem.fadeOut()
}


// Update status message
//
// NOTE: this will update message content and return it as-is, things 
// 		like showing the message are to be done manually...
// 		see: showStatus(...) and showErrorStatus(...) for a higher level
// 		API...
// NOTE: in addition to showing user status, this will also log the 
// 		satus to browser console...
// NOTE: the message will be logged to console via either console.log(...)
// 		or console.error(...), if the message starts with "Error".
// NOTE: if message is null, then just return the status element...
//
// XXX add abbility to append and clear status...
function updateStatus(message){

	var elem = $('.global-status')
	if(elem.length == 0){
		elem = $('<div class="global-status"/>')
	}
	if(message == null){
		return elem
	}

	if(typeof(message) == typeof('s') && /^error.*/i.test(message)){
		console.error.apply(console, arguments)
	} else {
		console.log.apply(console, arguments)
	}

	if(arguments.length > 1){
		message = Array.apply(Array, arguments).join(' ')
	}

	return updateInfo(elem, message)
}


// Same as updateInfo(...) but will aslo show and animate-close the message
//
// XXX the next call will not reset the animation of the previous, rather 
// 		it will pause it and rezume...
// 		...not sure if this is correct.
function showStatus(message){
	return updateStatus.apply(null, arguments)
		//.stop()
		.stop(true, false)
		//.finish()
		.show()
		.delay(500)
		.fadeOut(800)
}


// Same as showStatus(...) but queue the message so as to display it for
// a meaningful amount of time...
//
//	- This will print the first message right away.
//	- Each consecutive message if STATUS_QUEUE_TIME has not passed yet 
//		will get queued.
//	- Once the STATUS_QUEUE_TIME has passed the next message is reported 
// 		and so on until the queue is empty.
//
// NOTE: for very a fast and large sequence of messages the reporting 
// 		may (will) take longer (significantly) than the actual "job"...
// NOTE: this will delay the logging also...
function showStatusQ(message){
	if(STATUS_QUEUE.length == 0){

		// end marker...
		STATUS_QUEUE.push(0)

		showStatus.apply(null, arguments)

		function _printer(){
			// if queue is empty we have nothing to do...
			if(STATUS_QUEUE.length == 1){
				STATUS_QUEUE.pop()
				return
			}
			// if not empty show a status and repeat...
			showStatus.apply(null, STATUS_QUEUE.pop())
			setTimeout(_printer, STATUS_QUEUE_TIME)
		}

		setTimeout(_printer, STATUS_QUEUE_TIME)

	// queue not empty...
	} else {
		STATUS_QUEUE.splice(1, 0, Array.apply(Array, arguments))
	}
}


// Same as showStatus(...) but will always add 'Error: ' to the start 
// of the message
//
// NOTE: this will show the message but will not hide it.
function showErrorStatus(message){
	message = Array.apply(Array, arguments)
	message.splice(0, 0, 'Error:')
	return updateStatus.apply(null, message)
		.one('click', function(){ $(this).fadeOut() })
		//.stop()
		.stop(true, false)
		//.finish()
		.show()
}


// shorthand methods...
function hideStatus(){
	// yes, this indeed looks funny -- to hide a status you need to show
	// it without any arguments... ;)
	return showStatus()
}
function getStatus(){
	return updateStatus()
}


function makeIndicator(text){
	return $('<span class="indicator expanding-text">'+
				'<span class="hidden">'+ text +'</span>'+
				'<span class="shown">'+ text[0] +'</span>'+
			'</span>')
}

function showGlobalIndicator(cls, text){
	var c = $('.global-mode-indicators')
	if(c.length == 0){
		c = $('<div>')
			.addClass('global-mode-indicators')
			.append('<span class="mode-tip">Global status</span>')
			.appendTo($('.viewer'))
	}
	return makeIndicator(text)
			.addClass(cls)
			.appendTo(c)
}
function showContextIndicator(cls, text){
	var c = $('.context-mode-indicators')
	if(c.length == 0){
		c = $('<div>')
			.addClass('context-mode-indicators')
			.append('<span class="mode-tip">Context status</span>')
			.appendTo($('.viewer'))
	}
	return makeIndicator(text)
			.addClass(cls)
			.appendTo(c)
}



/**********************************************************************
* Modal dialogs...
*/

/********************************************************* Helpers ***/

// Set element text and tooltip
//
// NOTE: when text is a list, we will only use the first and the last 
// 		elements...
// NOTE: if tip_elem is not given then both the text and tip will be set
// 		on text_elem
//
// XXX add support for quoted '|'...
function setTextWithTooltip(text, text_elem, tip_elem){
	text_elem = $(text_elem)
	tip_elem = tip_elem == null ? text_elem : tip_elem

	if(typeof(text) != typeof('str')){
		tip = text
	} else {
		var tip = text.split(/\s*\|\s*/)
	}

	// set elemnt text...
	text_elem
		.html(tip[0])

	// do the tooltip...
	tip = tip.slice(1)
	tip = tip[tip.length-1]
	if(tip != null && tip.trim().length > 0){
		$('<span class="tooltip-icon tooltip-right"> *</span>')
			.attr('tooltip', tip)
			.appendTo(tip_elem)
	}

	return text_elem
}


function getOverlay(root){
	root = $(root)
	var overlay = root.find('.overlay-block')
	if(overlay.length == 0){
		return $('<div class="overlay-block">'+
					'<div class="background"/>'+
					'<div class="content"/>'+
				'</div>').appendTo(root)
	}
	return overlay
}


function showInOverlay(root, data){
	root = $(root)

	var overlay = getOverlay(root)
	

	if(data != null){
		var container = $('<table width="100%" height="100%"><tr><td align="center" valign="center">'+
								'<div class="dialog"/>'+
							'</td></tr></table>')
		var dialog = container.find('.dialog')

		//overlay.find('.background')
		//	.click(function(){ hideOverlay(root) })

		dialog
			.append(data)
			.on('click', function(evt){ 
				evt.stopPropagation() 
			})
		overlay.find('.content')
			.on('click', function(){ 
				overlay.trigger('close')
				hideOverlay(root) 
			})
			.on('close accept', function(){
				//hideOverlay(root) 
			})
			.append(container)
	}

	root.addClass('overlay')

	return overlay
}


function hideOverlay(root){
	root.removeClass('overlay')
	root.find('.overlay-block')
		.trigger('close')
		.remove()
}

function isOverlayVisible(root){
	return getOverlay(root).css('display') != 'none'
}


var FIELD_TYPES = {
	// a simple hr...
	//
	// format:
	// 		'---'
	// 		Three or more '-'s
	hr: {
		type: 'hr',
		text: null,
		default: false,
		html: '<hr>',
		test: function(val){
			return /\-\-\-+/.test(val)
		},
	},
	// a simple br...
	//
	// format:
	// 		'   '
	// 		Three or more spaces
	br: {
		type: 'br',
		text: null,
		default: false,
		html: '<br>',
		test: function(val){
			return /\s\s\s+/.test(val)
		},
	},
	// format:
	// 	{
	// 		html: <html-block>
	// 	}
	html: {
		type: 'html',
		text: null,
		default: false,
		html: '<div class="html-block"/>',
		test: function(val){
			return val.html != null
		},
		set: function(field, value){
			if(typeof(value.html) == typeof('str')){
				field.html(value.html)
			} else {
				field.append(value.html)
			}
		},
	},

	// format: 
	// 		string
	// XXX add datalist option...
	// XXX make this textarea compatible...
	text: {
		type: 'text',
		text: null,
		default: '',
		html: '<div class="field string">'+
				'<span class="text"></span>'+
				'<input type="text" class="value">'+
			'</div>',
		test: function(val){
			return typeof(val) == typeof('abc')
		},
		set: function(field, value){
			$(field).find('.value').attr('value', value) 
		},
		get: function(field){ 
			return $(field).find('.value').attr('value') 
		},
	},	

	// format: 
	// 		true | false
	bool: {
		type: 'bool',
		text: null,
		default: false,
		html: '<div class="field checkbox">'+
				'<label><input type="checkbox" class="value">'+
				'<span class="text"></span></label>'+
			'</div>',
		test: function(val){
			return val === true || val === false
		},
		set: function(field, value){
			if(value){
				$(field).find('.value').attr('checked', '') 
			} else {
				$(field).find('.value').removeAttr('checked') 
			}
		},
		get: function(field){ 
			return $(field).find('.value').attr('checked') == 'checked'
		},
	},

	// NOTE: this will not work without node-webkit...
	// format: 
	// 		{ dir: <default-path> }
	dir: {
		type: 'dir',
		text: null,
		default: false,
		html: '<div class="field checkbox">'+
				'<span class="text"></span>'+
				'<input type="file" class="value" nwdirectory />'+
			'</div>',
		test: function(val){
			return typeof(val) == typeof({}) && 'dir' in val
		},
		set: function(field, value){
			field.find('.value').attr('nwworkingdir', value.dir)
		},
		get: function(field){ 
			var f = $(field).find('.value')[0].files
			if(f.length == 0){
				return ''
			}
			return f[0].path
		},
	},

	// NOTE: this will not work without node-webkit...
	// format: 
	// 		{ dir: <default-path> }
	// XXX add datalist option...
	ndir: {
		type: 'ndir',
		text: null,
		default: false,
		html: '<div class="field dir">'+
				'<span class="text"></span>'+
				'<input type="text" class="path"/>'+
				'<button class="browse">Browse</button>'+
			'</div>',
		test: function(val){
			return typeof(val) == typeof({}) && 'ndir' in val
		},
		set: function(field, value){
			var that = this

			// NOTE: we are attaching the file browser to body to avoid 
			// 		click events on it closing the dialog...
			// 		...for some reason stopPropagation(...) does not do 
			// 		the job...
			var file = $('<input type="file" class="value" nwdirectory/>')
				.attr('nwworkingdir', value.ndir)
				.change(function(){
					var p = file[0].files
					if(p.length != 0){
						field.find('.path').val(p[0].path)
					}
					file.detach()
					// focus+select the path field...
					// NOTE: this is here to enable fast select-open 
					// 		keyboard cycle (tab, enter, <select path>, 
					// 		enter, enter)...
					field.find('.path')
						.focus()
						.select()
				})
				.hide()
			field.find('.path').val(value.ndir)

			field.find('.browse').click(function(){
				file
					// load user input path...
					.attr('nwworkingdir', field.find('.path').val())
					.appendTo($('body'))
					.click()
			})

		},
		get: function(field){ 
			return field.find('.path').val()
		},
	},

	// format: 
	// 		['a', 'b', 'c', ...]
	//
	// an item can be of the folowing format:
	// 		<text> ['|' 'default' | 'disabled' ] [ '|' <tool-tip> ]
	//
	// NOTE: only one 'default' item should be present.
	// NOTE: if no defaults are set, then the first item is checked.
	choice: {
		type: 'choice',
		text: null,
		default: false,
		html: '<div class="field choice">'+
				'<span class="text"></span>'+
				'<div class="item"><label>'+
					'<input type="radio" class="value"/>'+
					'<span class="item-text"></span>'+
				'</label></div>'+
			'</div>',
		test: function(val){
			return typeof(val) == typeof([]) && val.constructor.name == 'Array'
		},
		set: function(field, value){
			var t = field.find('.text').html()
			t = t == '' ? Math.random()+'' : t
			var item = field.find('.item').last()
			for(var i=0; i < value.length; i++){
				// get options...
				var opts = value[i]
					.split(/\|/g)
					.map(function(e){ return e.trim() })

				var val = item.find('.value')
				val.val(opts[0])

				// set checked state...
				if(opts.slice(1).indexOf('default') >= 0){
					val.prop('checked', true)
					opts.splice(opts.indexOf('default'), 1)
				} else {
					val.prop('checked', false)
				}

				// set disabled state...
				if(opts.slice(1).indexOf('disabled') >= 0){
					val.prop('disabled', true)
					opts.splice(opts.indexOf('disabled'), 1)
					item.addClass('disabled')
				} else {
					val.prop('disabled', false)
					item.removeClass('disabled')
				}

				setTextWithTooltip(opts, item.find('.item-text'))

				item.appendTo(field)

				item = item.clone()
			}
			var values = field.find('.value')
				.attr('name', t)
			// set the default...
			if(values.filter(':checked:not([disabled])').length == 0){
				values.filter(':not([disabled])').first()
					.prop('checked', true)
			}
		},
		get: function(field){ 
			return $(field).find('.value:checked').val()
		},
	},

	// format: 
	// 	{ 
	// 		select: ['a', 'b', 'c', ...] 
	// 		// default option (optional)...
	// 		default: <number> | <text>
	// 	}
	select: {
		type: 'select',
		text: null,
		default: false,
		html: '<div class="field choice">'+
				'<span class="text"></span>'+
				'<select>'+
					'<option class="option"></option>'+
				'</select>'+
			'</div>',
		test: function(val){
			return 'select' in val
		},
		set: function(field, value){
			var t = field.find('.text').text()
			var item = field.find('.option').last()
			var select = field.find('select')
			for(var i=0; i < value.select.length; i++){
				item
					.text(value.select[i])
					.val(value.select[i])
				item.appendTo(select)

				item = item.clone()
			}
			if(value.default != null){
				if(typeof(value.default) == typeof(123)){
					field.find('.option')
						.eq(value.default)
							.attr('selected', '')
				} else {
					field.find('.option[value="'+ value.default +'"]')
						.attr('selected', '')
				}
			}
		},
		get: function(field){ 
			return $(field).find('.option:selected').val()
		},
	},

	// NOTE: a button can have state...
	// format: 
	// 	{ 
	// 		// click event handler...
	// 		button: <function>, 
	// 		// optional, button text (default 'OK')...
	// 		text: <button-label>,
	// 		// optional, initial state setup...
	// 		default: <function>,
	// 	}
	button: {
		type: 'button',
		text: null,
		default: false,
		html: '<div class="field button">'+
				'<span class="text"></span>'+
				'<button class="button"></button>'+
			'</div>',
		test: function(val){
			return 'button' in val
		},
		set: function(field, value){
			var btn = $(field).find('button')
				.click(value.button)
				.html(value.text == null ? 'OK' : value.text)
			if('default' in value){
				value.default(btn)
			}
		},
		get: function(field){ 
			return $(field).attr('state')
		},
	},

}

// Show a complex form dialog
//
// This will build a form and collect it's data on "accept" specified by
// the config object...
//
// config format:
//	{
//		// simple field...
//		<field-description>: <default-value>,
//
//		...
//	}	
//
// <field-description> and split in two with a "|" the section before will
// show as the field text and the text after as the tooltip.
// Example:
// 		"field text | field tooltip..."
//
// field's default value determines it's type:
// 	bool		- checkbox
// 	string		- textarea
//
// see FIELD_TYPES for supported field types.
//
// NOTE: if btn is set to false explicitly then no button will be 
// 		rendered in the form dialog.
// NOTE: to include a literal "|" in <field-description> just escape it
// 		like this: "\|"
//
// XXX add form testing...
// XXX add undefined field handling/reporting...
function formDialog(root, message, config, btn, cls){
	cls = cls == null ? '' : cls
	btn = btn == null ? 'OK' : btn
	root = root == null ? $('.viewer') : root

	var form = $('<div class="form"/>')
	var data = {}
	var res = $.Deferred()

	// handle message and btn...
	if(message.trim().length > 0){
		setTextWithTooltip(message, $('<div class="text"/>'))
			.appendTo(form)
	}

	// build the form...
	for(var t in config){
		var did_handling = false
		for(var f in FIELD_TYPES){
			if(FIELD_TYPES[f].test(config[t])){
				var field = FIELD_TYPES[f]
				var html = $(field.html)

				// setup text and data...
				setTextWithTooltip(t, html.find('.text'), html)

				if(field.set != null){
					field.set(html, config[t])
				}

				if(field.get != null){
					// NOTE: this is here to isolate t and field.get values...
					// 		...is there a better way???
					var _ = (function(title, getter){
						html.on('resolve', function(evt, e){
							data[title] = getter(e)
						})
					})(t, field.get)
				}

				form.append(html)

				did_handling = true
				break
			}
		}

		// handle unresolved fields...
		if(!did_handling){
			console.warn('formDialog: not all fields understood.')
			// XXX skipping field...
			// XXX
		}
	}

	// add button...
	if(btn !== false){
		var button = $('<button class="accept">'+btn+'</button>')
		form.append(button)
	} else {
		var button = null
	}

	var overlay = showInOverlay(root, form)
		.addClass('dialog ' + cls)
		.on('accept', function(){
			form.find('.field').each(function(_, e){
				$(e).trigger('resolve', [$(e)])
			})

			// XXX test if all required stuff is filled...
			res.resolve(data, form)

			hideOverlay(root)
		})
		.on('close', function(){
			res.reject()

		})

	if(button != null){
		button.click(function(){
			overlay.trigger('accept')
		})
	}

	// focus an element...
	// NOTE: if first element is a radio button set, focus the checked
	//		element, else focus the first input...
	form.ready(function(){ 
		// NOTE: we are using a timeout to avoid the user input that opened
		// 		the dialog to end up in the first field...
		setTimeout(function(){
			var elem = form.find('.field input').first()
			if(elem.attr('type') == 'radio'){
				form.find('.field input:checked')
					.focus()
					.select()
			} else {
				elem
					.focus()
					.select()
			}
		}, 100)
	})

	return res
}



/************************************************ Standard dialogs ***/
// NOTE: these return a deferred that will reflect the state of the 
// 		dialog, and the progress of the operations that it riggers...
//
// XXX might be a good idea to be able to block the ui (overlay + progress
// 		bar?) until some long/critical operations finish, to prevent the
// 		user from breaking things while the ui is inconsistent...

var _alert = alert
function alert(){
	var message = Array.apply(null, arguments).join(' ')
	return formDialog(null, String(message), {}, false, 'alert')
}


var _prompt = prompt
function prompt(message, dfl, btn){
	btn = btn == null ? 'OK' : btn
	var res = $.Deferred()
	formDialog(null, message, {'': ''+(dfl == null ? '' : dfl)}, btn, 'prompt')
		.done(function(data){ res.resolve(data['']) })
		.fail(function(){ res.reject() })
	return res
}


/*
function confirm(){
}
*/


function detailedAlert(text, description, button){
	return formDialog(null, '', {'': {
		html: $('<details/>')
			.append($('<summary/>')
				.html(text))
			.append($('<span/>')
				.html(description))
	}}, button == null ? false : button, 'detailed-alert')
}


// NOTE: this will not work without node-webkit...
function getDir(message, dfl, btn){
	btn = btn == null ? 'OK' : btn
	dfl = dfl == null ? '' : dfl
	var res = $.Deferred()

	formDialog(null, message, {'': {ndir: dfl}}, btn, 'getDir')
		.done(function(data){ res.resolve(data['']) })
		.fail(function(){ res.reject() })

	return res
}



/***************************************** Domain-specific dialogs ***/

// XXX do reporting...
// XXX would be nice to save settings...
// 		...might be good to use datalist...
function exportPreviewsDialog(state, dfl){
	dfl = dfl == null ? BASE_URL : dfl

	// XXX make this more generic...
	// tell the user what state are we exporting...
	if(state == null){
		var imgs = 0
		// NOTE: we are not using order or image count as these sets may
		// 		be larger that the current crop...
		DATA.ribbons.map(function(e){
			imgs += e.length
		})
		state = toggleSingleImageMode('?') == 'on' ? 'current image' : state
		state = state == null && isViewCropped() ? 
			'cropped view: '+
				imgs+' images in '+
				DATA.ribbons.length+' ribbons' 
			: state
		state = state == null ?
			'all: '+
				imgs+' images in '+
				DATA.ribbons.length+' ribbons' 
			: state
	}

	var res = $.Deferred()

	updateStatus('Export...').show()

	// NOTE: we are not defining the object in-place here because some 
	// 		keys become unreadable with JS syntax preventing us from 
	// 		splitting the key into several lines...
	var cfg = {}
	// multiple images...
	if(state != 'current image'){
		cfg['Image name pattern | '+
				'%f - full filename\n'+
				'%n - filename\n'+
				'%e - extension (with leading dot)\n'+
				'%(abc)m - if marked insert "abc"\n'+
				'%gid - log gid\n'+
				'%g - short gid\n'+
				'%I - global order\n'+
				'%i - current selection order'] = '%f'
		cfg['Level directory name'] = 'fav'
	// single image...
	} else {
		cfg['Image name pattern | '+
				'%f - full filename\n'+
				'%n - filename\n'+
				'%e - extension (with leading dot)\n'+
				'%(abc)m - if marked insert "abc"\n'+
				'%gid - log gid\n'+
				'%g - short gid\n'+
				'\n'+
				'NOTE: %i and %I are not supported for single\n'+
				'image exporting.'] = '%f'
	}
	cfg['Size | '+
			'The selected size is aproximate, the actual\n'+
			'preview will be copied from cache.\n'+
			'\n'+
			'NOTE: if not all previews are yet generated,\n'+
			'this will save the available previews, not all\n'+
			'of which may be of the right size, if this\n'+
			'happens wait till all the previews are done\n'+
			'and export again.'] = {
		select: ['Original image'].concat(PREVIEW_SIZES.slice().sort()),
		default: 1
	}
	cfg['Destination | '+
			'Relative paths are supported.\n\n'+
			'NOTE: All paths are relative to the curent\n'+
			'directory.'] = {ndir: dfl}

	var keys = Object.keys(cfg)

	formDialog(null, 'Export: <b>'+ state +'</b>.', cfg, 'OK', 'exportPreviewsDialog')
		.done(function(data){
			// get the form data...
			var name = data[keys[0]]
			if(state != 'current image'){
				var size = data[keys[2]]
				var path = normalizePath(data[keys[3]]) 
				var dir = data[keys[1]]

			} else {
				var size = data[keys[1]]
				var path = normalizePath(data[keys[2]])
			}
			size = size == 'Original image' ? Math.max.apply(null, PREVIEW_SIZES)*2 : parseInt(size)-5

			// do the actual exporting...
			// full state...
			if(state != 'current image'){
				exportImagesTo(path, name, dir, size)

			// single image...
			} else {
				exportImageTo(getImageGID(), path, name, size)
			}

			// XXX do real reporting...
			showStatusQ('Copying data...')
			res.resolve(data[''])
		})
		.fail(function(){ 
			showStatusQ('Export: canceled.')
			res.reject() 
		})

	return res
}


function loadDirectoryDialog(dfl){
	dfl = dfl == null ? BASE_URL : dfl

	updateStatus('Open...').show()

	formDialog(null, 'Path to open | To see list of previously loaded urls press ctrl-H.', {
		'': {ndir: dfl},
		'Precess previews': true,
	}, 'OK', 'loadDirectoryDialog')
		.done(function(data){
			var path = normalizePath(data[''].trim())
			var process_previews = data['Precess previews']

			// reset the modes...
			toggleSingleImageMode('off')
			toggleSingleRibbonMode('off')
			toggleMarkedOnlyView('off')

			// do the loading...
			statusNotify(loadDir(path, !process_previews))
				/*
				.done(function(){
					if(process_previews){ 
						showStatusQ('Previews: processing started...')
						// generate/attach previews...
						makeImagesPreviewsQ(DATA.order) 
							.done(function(){ 
								showStatusQ('Previews: processing done.')
							})
					}
				})
				*/
				.done(function(){
					// XXX is this the right place for this???
					pushURLHistory(BASE_URL)
				})
		})
		.fail(function(){
			showStatusQ('Open: canceled.')
		})
}


// XXX get EXIF, IPTC...
function showImageInfo(){
	var gid = getImageGID(getImage())
	var r = getRibbonIndex(getRibbon())
	var data = IMAGES[gid]
	var orientation = data.orientation
	orientation = orientation == null ? 0 : orientation
	var flipped = data.flipped
	flipped = flipped == null ? '' : ', flipped '+flipped+'ly'
	var order = DATA.order.indexOf(gid)
	var name = getImageFileName(gid)
	var date = new Date(data.ctime * 1000)
	var comment = data.comment
	comment = comment == null ? '' : comment
	comment = comment.replace(/\n/g, '<br>')
	var tags = data.tags
	tags = tags == null ? '' : tags.join(', ')

	return formDialog(null,
			('<div>'+
				'<h2>"'+ name +'"</h2>'+

				'<table>'+
					// basic info...
					'<tr><td colspan="2"><hr></td></tr>'+
					'<tr><td>GID: </td><td>'+ gid +'</td></tr>'+
					'<tr><td>Date: </td><td>'+ date +'</td></tr>'+
					'<tr><td>Path: </td><td>"'+ unescape(data.path) +'"</td></tr>'+
					'<tr><td>Orientation: </td><td>'+ orientation +'&deg;'+flipped+'</td></tr>'+
					'<tr><td>Order: </td><td>'+ order +'</td></tr>'+
					'<tr><td>Position (ribbon): </td><td>'+ (DATA.ribbons[r].indexOf(gid)+1) +
						'/'+ DATA.ribbons[r].length +'</td></tr>'+
					'<tr><td>Position (global): </td><td>'+ (order+1) +'/'+ DATA.order.length +'</td></tr>'+

					// editable fields...
					'<tr><td colspan="2"><hr></td></tr>'+
					// XXX this expanding to a too big size will mess up the screen...
					// 		add per editable and global dialog max-height and overflow
					'<tr><td>Comment: </td><td class="comment" contenteditable>'+ comment +'</td></tr>'+
					'<tr><td>Tags: </td><td class="tags" contenteditable>'+ tags +'</td></tr>'+
				'</table>'+
				'<br>'+
			'</div>'),
			// NOTE: without a save button, there will be no way to accept the 
			// 		form on a touch-only device...
			{}, 'OK', 'showImageInfoDialog')

		// save the form data...
		.done(function(_, form){
			// comment...
			var ncomment = form.find('.comment').html()
			if(ncomment != comment){
				ncomment = ncomment.replace(/<br>/ig, '\n')
				if(ncomment.trim() == ''){
					delete data.comment
				} else {
					data.comment = ncomment
				}
				imageUpdated(gid)
			}

			// tags...
			var ntags = form.find('.tags').text().trim()
			if(ntags != tags){
				ntags = ntags.split(/\s*,\s*/)

				updateTags(ntags, gid)
			}
		})
}



/*********************************************************************/

// XXX need a propper:
// 		- update mechanics...
// 		- save mechanics
function makeCommentPanel(panel){
	return makeSubPanel(
			'Info: Comment', 
			$('Comment: <div class="comment" contenteditable/>'),
			panel, 
			true, 
			true)
}



/*********************************************************************/

function setupUI(viewer){
	console.log('UI: setup...')

	setupIndicators()

	return viewer
		.click(function(){
			if($('.ribbon').length == 0){
				loadDirectoryDialog()
			}
		})
		.on([
				'focusingImage',
				'fittingImages',
				//'updatingImageProportions',
				'horizontalShiftedImage',
			].join(' '), 
			function(){
				updateCurrentMarker()
			})

}
SETUP_BINDINGS.push(setupUI)



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :										 */

/**********************************************************************
* 
* 
**********************************************************************/

var DEFAULT_FILTER_ORDER = [
//	'gamma',
	'brightness',
	'contrast',
	'saturate',
	'hue-rotate',
	'grayscale',
	'invert',
	'sepia'
]

var SLIDER_SCALE = 43.47




/*********************************************************************/

function r2v(r){
	return Math.pow(Math.E, r/SLIDER_SCALE)
}

function v2r(v){
	return Math.log(v)*SLIDER_SCALE
}



/*********************************************************************/

// Update filter in target image...
//
function updateFilter(e, f, v, order){
	e = $(e)
	var state = e
		.css('-webkit-filter')
	state = state == 'none' ? '' : state + ' '
	// update existing filter...
	if(RegExp(f).test(state)){
		state = state.replace(RegExp(f+'\\s*\\([^\\)]*\\)'), f+'('+v+')')
	// add new filter...
	} else {
		state += f+'('+v+')'
		state = sortFilterStr(state, order)
	}
	e.css({
		'-webkit-filter': state,
	})
	return v
}
function resetFilter(e, f){
	e = $(e)
	var state = e
		.css('-webkit-filter')
	state = state == 'none' ? '' : state + ' '
	state = state.replace(RegExp(f+'\\s*\\([^\\)]*\\)'), '').trim()
	e.css({
		'-webkit-filter': state,
	})
	return e
}


function getSliderOrder(){
	return $('.filter-list').sortable('toArray')
}
// NOTE: this will return only the set filters...
function getFilterOrder(target){
	return $(target)
		.css('-webkit-filter')
		.split(/\s*\([^\)]*\)\s*/g)
		.slice(0, -1)
}


function sortFilterStr(state, order){
	order = order == null ? getSliderOrder() : order
	state = state.split(/\s+/)
	state.sort(function(a, b){
		a = order.indexOf(a.replace(/\(.*/, ''))
		b = order.indexOf(b.replace(/\(.*/, ''))
		return a - b
	})
	return state.join(' ')
}
function sortFilterSliders(order){
	return $('.filter-list').sortChildren(function(a, b){
		a = order.indexOf(a.id)
		b = order.indexOf(b.id)
		return a - b
	})
}


// Load state of sliders from target...
//
function loadSliderState(target){
	// break the feedback loop that if present will write the state 
	// back...
	var filters = $('.filter-list input[type=range]')
		.prop('disabled', true)

	var res = $(target)
		.css('-webkit-filter')
	var state = res
		.split(/\s*\(\s*|\s*\)\s*/g)
		.reverse()
		.slice(1)
	// reset sliders to defaults...
	$('input[type=range]').each(function(i, e){
		e = $(e)
		e.val(e.attr('default')).change()
	})
	// set the saved values...
	while(state.length > 0){
		var e = $('[filter='+state.pop()+']')
		if(e.prop('normalize')){
			e.val(v2r(parseFloat(state.pop()))).change()
		} else {
			e.val(parseFloat(state.pop())).change()
		}
	}

	filters
		.prop('disabled', false)
	return res
}


function saveSnapshot(target){
	var l = $('.state').last().text()
	l = l == '' ? 0 : parseInt(l)+1
	var state = $(target).css('-webkit-filter')
	$('<div/>')
		.text(l)
		.addClass('state')
		.attr({
			state: state,
			sliders: getSliderOrder().join(' ')
		})
		// load state...
		.click(function(){
			loadSliderState($(target).css('-webkit-filter', state))
			sortFilterSliders($(this).attr('sliders').split(' '))
		})
		.appendTo($('.states'))
		.draggable({ 
			revert: 'invalid',
			revertDuration: 200,
		})
}
function clearSnapshots(){
	$('.state').remove()
}


// Re-read filters form target image and reset the controls...
//
function reloadControls(target){
	clearSnapshots()
	var state = loadSliderState(target)

	// nothing set -- default sort...
	if(state == 'none'){
		sortFilterSliders(DEFAULT_FILTER_ORDER)

	// load existing sort state...
	} else {
		sortFilterSliders(getFilterOrder(target).concat(DEFAULT_FILTER_ORDER))
	}
	// make a snapshot...
	saveSnapshot(target)
}



/**********************************************************************
* Element constructors...
*/

function makeAbsRange(text, filter, target, min, max, dfl, step, translate, normalize){
	min = min == null ? 0 : min
	max = max == null ? 1 : max
	dfl = dfl == null ? min : dfl
	step = step == null ? 0.01 : step
	translate = translate == null ? function(v){return v} : translate
	normalize = normalize == null ? false : true

	var elem = $('<div class="control range"></div>')
		.attr({
			id: filter,
		})
	$('<span class="title"/>')
		.html(text)
		.appendTo(elem)
	// NOTE: the range element is the main "writer"...
	var range = $('<input class="slider" type="range">')
		.attr({
			filter: filter,
			min: min,
			max: max,
			step: step,
			default: dfl,
		})
		.prop('normalize', normalize)
		.val(dfl)
		.change(function(){
			var val = this.valueAsNumber
			value.val(val)
			if(!elem.prop('disabled') && !$(this).prop('disabled')){
				updateFilter(target, filter, translate(val))
			}
			if(parseFloat(val) == dfl){
				elem.addClass('at-default')
			} else {
				elem.removeClass('at-default')
			}
		})
		.appendTo(elem)
	var value = $('<input type="number" class="value"/>')
		.attr({
			min: min,
			max: max,
			step: step,
		})
		.val(dfl)
		.change(function(){
			range.val($(this).val()).change()
		})
		.appendTo(elem)
	$('<button class="reset">&times;</button>')
		.click(function(){
			range.val(dfl).change()
			resetFilter(target, filter)
		})
		.appendTo(elem)
	return elem
}
function makeLogRange(text, filter, target){
	return makeAbsRange(text, filter, target, -100, 100, 0, 0.1, r2v, true)
}


function makePanel(title, open, editable_title){
	title = title == null ? '&nbsp;' : title

	// tool panel...
	var panel = $('<details/>')
		.prop('open', open == null ? true : open)
		.addClass('panel noScroll')
		.css({
			position: 'absolute',
			top: '100px',
			left: '100px',
		})
		.append($('<summary>'+title+'</summary>')
			.attr({
				contenteditable: editable_title == null ? 'false' : 'true',
			})
			.append($('<span/>')
				.addClass('close-button')
				.click(function(){
					panel
						.trigger('panelClosing')
						.hide()
					return false
				})
				.html('&times;')))
		.draggable({
			containment: 'parent',
			scroll: false,
		})

	// wrapper for sub-panels...
	var content = $('<span class="panel-content">')
		.sortable({
			forcePlaceholderSize: true,
			start: function(e, ui){
				 ui.placeholder.height(ui.helper.outerHeight());
				 ui.placeholder.width(ui.helper.outerWidth());
			},
			opacity: 0.7,
			connectWith: '.panel-content',
		})
		.appendTo(panel)
	return panel
}


function makeSubPanel(title, open, parent){
	title = title == null ? '&nbsp;' : title

	var sub_panel = $('<details/>')
		.addClass('sub-panel noScroll')
		.prop('open', open == null ? true : open)
		.append($('<summary>'+title+'</summary>'))
		.append($('<div class="sub-panel-content"/>'))

	if(parent != null){
		if(parent.hasClass('panel-content')){
			sub_panel.appendTo(parent)
		} else {
			sub_panel.appendTo(parent.find('.panel-content'))
		}
	}

	return sub_panel
}


function makeFilterPanel(parent, target){
	return makeSubPanel('Filters', true, parent)
		.find('.sub-panel-content')
			.append($('<div class="filter-list"/>')
				//.append(makeLogRange('Gamma:', 'gamma', target))
				.append(makeLogRange('Brightness:', 'brightness', target))
				.append(makeLogRange('Contrast:', 'contrast', target))
				.append(makeLogRange('Saturation:', 'saturate', target))
				.append(makeAbsRange('Hue:', 'hue-rotate', target, 
						-180, 180, 0, 0.5, function(v){ return v+'deg' }))
				.append(makeAbsRange('Grayscale:', 'grayscale', target))
				.append(makeAbsRange('Invert:', 'invert', target))
				.append(makeAbsRange('Sepia:', 'sepia', target))
				.sortable({
					axis: 'y',
				})
				.on('sortstop', function(){
					// update image filter order...
					var img = $(target)
					img.css('-webkit-filter', sortFilterStr(img.css('-webkit-filter')))
				}))
			.append($('<hr>'))
			.append('Reset: ')
			.append($('<button>Values</button>')
				.click(function(){
					$('.reset').click()
				}))
			.append($('<button>Order</button>')
				.click(function(){
					sortFilterSliders(DEFAULT_FILTER_ORDER)
				}))
			.append($('<button>All</button>')
				.click(function(){
					$('.reset').click()
					sortFilterSliders(DEFAULT_FILTER_ORDER)
				}))
}

function makeSnapshotsPanel(parent, target){
	return makeSubPanel('Snapshots', true, parent)
		.find('.sub-panel-content')
			.append($('<div class="states"/>'))
			.append($('<hr>'))
			.append($('<button/>')
				.click(function(){ saveSnapshot(target) })
				.text('Save'))
			.append($('<button/>')
				.addClass('remove-state-drop-target')
				.click(function(){ clearSnapshots() })
				.text('Clear')
				.droppable({
					accept: '.state',
					activate: function(e, ui){
						$(this).text('Delete')
					},
					deactivate: function(e, ui){
						$(this).text('Clear')
					},
					drop: function(e, ui){
						ui.helper.remove()
					}
					
				}))
}


// XXX add panel update events to help save settings...
function makeEditorControls(target){

	var panel = makePanel()

	// filters...
	makeFilterPanel(panel, target)

	// snapshots...
	makeSnapshotsPanel(panel, target)

	return panel
}



/**********************************************************************
* vim:set sw=4 ts=4 :												 */

/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}

//var DEBUG = DEBUG != null ? DEBUG : true

var toggler = require('lib/toggler')
var actions = require('lib/actions')
var features = require('lib/features')

var data = require('data')
var images = require('images')
var ribbons = require('ribbons')

var core = require('features/core')
var base = require('features/base')



/*********************************************************************/

// XXX add setup / teardown...
// XXX might be a good idea to merge this with single image mode...
var makeStateIndicator = function(type){
	return $('<div>')
		.addClass('state-indicator-container ' + type || '')
}

// XXX do we need this???
var makeStateIndicatorItem = function(container, type, text){
	var item = $('<div>')
			.addClass('item '+ type || '')
			.attr('text', text)
	this.ribbons.viewer.find('.state-indicator-container.'+container)
		.append(item)
	return item
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// XXX Add status messages and log...
var ImageStateIndicatorActions = actions.Actions({
	config: {
		// XXX might be a good idea to add custom components API...
		'global-state-indicator-elements': [
			// XXX should index be here or to the right???
			'index',
			//'path',
			'gid',
			'info',

			// separates left/right aligned elements...
			'---',

			'mark',
			'bookmark',
		],

		'global-state-indicator-elements-full-only': [
			'gid',
		],

		'global-state-indicator-modes': [
			'none',
			'minimal',
			'full',
		],
		'global-state-indicator-mode': null,
	},

	// Status indicator handlers...
	//
	// Format:
	// 	{
	// 		<key>: <handler>,
	// 		<alias>: <key> | <handler>,
	// 		...
	// 	}
	//
	// Supported actions:
	// 	- make
	// 	- update
	// 	- remove
	//
	// NOTE: built-in handlers can be overloaded by user.
	// NOTE: alias loops are ignored.
	//
	// XXX make this visible to the user???
	// XXX is this too complex???
	__state_indicator_elements__: {
		// XXX make position editable...
		// 		- edit position on click
		// 		- goto position on enter/blur (blur with value)
		// 		- cancel on esc/blur (blur with no value)
		// 		- treat index depending on mode (global/ribbon)
		// XXX might be a good idea to auto-reset global index to ribbon...
		index: function(action, container, elem, gid){
			var that = this
			// construct...
			if(action == 'make'){
				return $('<span>').addClass(elem)
					// XXX might be a good idea to make this an input...
					.append($('<span>')
						.addClass('position')
						.click(function(){
							// XXX enter edit mode -> select contents...
							// XXX might be a good idea to live select 
							// 		the indexed image... (???)
							//$(this)
							//	.prop('contenteditable', true)
							// XXX
						})
						// XXX STUB...
						.on('mouseover', function(){
							that.showInfo('Image position (click to edit image position)')
						})
						// XXX STUB...
						.on('mouseout', function(){
							that.hideInfo()
						}))
					.append($('<span>')
						.addClass('length')
						// toggle index state...
						.click(function(){
							$(this).parent()
								.toggleClass('global')
							that.updateStateIndicators()
						})
						// XXX STUB...
						.on('mouseover', function(){
							that.showInfo('Image position (click to toggle ribbon/global)')
						})
						// XXX STUB...
						.on('mouseout', function(){
							that.hideInfo()
						}))

			// update...
			} else if(action == 'update'){
				gid = gid || this.current

				var c = container.find('.'+elem)

				// global index...
				if(c.hasClass('global')){
					c.find('.position')
						.text(this.data.getImageOrder(gid)+1)
					c.find('.length')
						.text('/'+ this.data.length)

				// ribbon index...
				} else {
					c.find('.position')
						.text(this.data.getImageOrder('ribbon', gid)+1)
					c.find('.length')
						.text('/'+ this.data.getImages(gid).len)
				}

			// remove...
			} else if(action == 'remove'){
				container.find('.'+elem).remove()
			}
		},

		// XXX handle path correctly...
		gid: function(action, container, elem, gid){
			// construct...
			if(action == 'make'){
				return $('<span>')
					.addClass(elem + ' expanding-text ')
					.append($('<span class="shown">'))
					.append($('<span class="hidden">'))

			// update...
			} else if(action == 'update'){
				// gid..
				if(elem == 'gid'){
					var txt = gid.slice(-6)
					var text = gid 

				// path...
				// XXX
				} else if(elem == 'path'){
					var img = this.images && gid in this.images && this.images[gid]

					var text = img && img.path || '---'
					var txt = text
				}

				container.find('.'+elem+' .shown').text(txt)
				container.find('.'+elem+' .hidden').text(text)

			// remove...
			} else if(action == 'remove'){
				container.find('.'+elem).remove()
			}
		},
		path: 'gid',

		mark: function(action, container, elem, gid){
			// construct...
			if(action == 'make'){
				var that = this
				return $('<span>').addClass(elem+'ed')
					.click(function(){
						that['toggle'+elem.capitalize()]()
					})
					// XXX STUB...
					.on('mouseover', function(){
						that.showInfo('Image '
							+(elem == 'mark' ? 'selection' : 'bookmark')
							+' status (click to toggle)')
					})
					// XXX STUB...
					.on('mouseout', function(){
						that.hideInfo()
					})

			// update...
			} else if(action == 'update'){
				// NOTE: we are not using .toggleMark('?') and friends 
				// 		here to avoid recursion as we might be handling 
				// 		them here...
				// 		...this also simpler than handling '?' and other
				// 		special toggler args in the handler...
				var tags = this.data.getTags(gid)
				var tag = elem == 'mark' ? 'selected' : 'bookmark'
				container.find('.'+elem+'ed')[
					tags.indexOf(tag) < 0 ?
						'removeClass' 
						: 'addClass']('on')

			// remove...
			} else if(action == 'remove'){
				container.find('.'+elem+'ed').remove()
			}
		},
		bookmark: 'mark', 

		// XXX STUB
		// XXX need to style this in an appropriate way...
		// 		...might not be a good spot for this...
		// XXX might be a good idea to make the info global, e.g. show 
		// 		info for anything that either has or is nested in an 
		// 		element that has an info attr...
		info: function(action, container, elem, gid){
			// construct...
			if(action == 'make'){
				return $('<span>')
					.addClass('info')
					.hide()

			// remove...
			} else if(action == 'remove'){
				container.find('.info').remove()
			}
		},
	},

	// XXX should this be a toggler???
	updateStateIndicators: ['- Interface/',
		function(gid){
			gid = gid || this.current

			var that = this

			var _getHandlers = function(){
				return Object.keys(that.__state_indicator_elements__ || {})
					.concat(Object.keys(ImageStateIndicatorActions.__state_indicator_elements__ || {}))
					.unique()
			}
			var _getHandler = function(key){
				var handler = (that.__state_indicator_elements__ || {})[key]
					|| (ImageStateIndicatorActions.__state_indicator_elements__ || {})[key]

				if(handler == null){
					return
				}

				// handle aliases...
				var seen = []
				while(typeof(handler) == typeof('str')){
					seen.push(handler)
					var handler = (that.__state_indicator_elements__ || {})[handler]
						|| (ImageStateIndicatorActions.__state_indicator_elements__ || {})[handler]
					// check for loops...
					if(seen.indexOf(handler) >= 0){
						console.error('state indicator alias loop detected at:', key)
						handler = null
					}
				}

				return handler
			}

			var global = this.ribbons.viewer.find('.state-indicator-container.global-info')
			if(global.length == 0){
				//global = makeStateIndicator('global-info') 
				global = makeStateIndicator('global-info overlay-info') 

				var align = ''
				var order = this.config['global-state-indicator-elements'].slice()

				var i = order.indexOf('---')
				// rearrange the tail section...
				// NOTE: this is here as we need to push the floated
				// 		right items in reverse order...
				if(i >= 0){
					order = order.concat(order.splice(i+1, order.length).reverse())
				}

				order.forEach(function(elem){
					var full_only = that.config['global-state-indicator-elements-full-only'].indexOf(elem) >= 0
					var res = $()

					// spacer...
					if(elem == '---'){
						align = 'float-right'

					// handlers...
					} else {
						var handler = _getHandler(elem)
						// do the call...
						if(handler != null){
							res = handler.call(that, 'make', global, elem, gid)
						}
					}

					// append the actual element...
					res.length > 0 && res
						.addClass(align +' '+ (full_only && 'full-only'))
						.appendTo(global)
				})

				// add and init in the correct state...
				global.appendTo(this.ribbons.viewer)
				if(this.config['global-state-indicator-mode']){
					this.toggleStateIndicator(this.config['global-state-indicator-mode'])
				}
			}

			if(!gid){
				return
			}

			// populate the info...
			_getHandlers().forEach(function(key){
				_getHandler(key).call(that, 'update', global, key, gid)
			})
		}],
	toggleStateIndicator: ['Interface/Toggle state indicator modes',
		toggler.CSSClassToggler(
			function(){ 
				return this.ribbons.viewer.find('.state-indicator-container.global-info') }, 
			function(){ return this.config['global-state-indicator-modes'] },
			function(state){ this.config['global-state-indicator-mode'] = state }) ],


	// XXX Should these be a separate class???
	showInfo: ['- Interface/',
		function(text){
			this.ribbons.viewer.find('.state-indicator-container.global-info .info')
				.text(text)
				.stop()
				.css('opacity', 1)
				.show()
		}],
	hideInfo: ['- Interface/',
		function(){
			this.ribbons.viewer.find('.state-indicator-container.global-info .info')
				.fadeOut()
		}]
})

// XXX an alternative approach:
// 		- global status area
// 		- status bar for local status
// 			- as in gen3
// 			- add image status
//
// 		General item format:
// 			- minimal state		- only short version / icon is shown
// 								- when not active a disabled state/icon is shown
//
// 			- expanded state	- status bar sows expanded state (only?)
// 								- title/help shown above 
// 									- floating text, transparent bg
// 									- same align as item
//
// XXX Q: can title bar be used instead of global state indication???
// 		...especially if we are indicating only crop...
// XXX add styling:
// 		- element spacing
// 		- tip text
// 		- avoid multi-line
// XXX rename to status bar???
var ImageStateIndicator = 
module.ImageStateIndicator = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-image-state-indicator',
	depends: [
		'ui',
		'ui-single-image-view',
	],

	actions: ImageStateIndicatorActions,

	handlers: [
		['start',
			function(){
				if(this.config['global-state-indicator-mode']){
					this.toggleStateIndicator(this.config['global-state-indicator-mode'])
				}
			}],
		['focusImage',
			function(){
				this.updateStateIndicators()
			}],
		[[
			'tag',
			'untag',
		],
			function(res, tags, gids){
				// trigger only when current image is affected...
				if(gids.constructor === Array 
						&& (gids.indexOf('current') >= 0 
							|| gids.indexOf(this.current) >= 0)
						|| this.data.getImage(gids) == this.current){
					this.updateStateIndicators()
				}
			}],
	],
})



//---------------------------------------------------------------------

// XXX
var GlobalStateIndicator = 
module.GlobalStateIndicator = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-global-state-indicator',
	depends: [
		'ui'
		//'ui-single-image-view',
	],
})



//---------------------------------------------------------------------
// XXX
// XXX might also be a good idea to use the similar mechanism for tips...

var StatusLogActions = actions.Actions({
	config: {
		// NOTE: if this is 0 then do not trim the log...
		'ui-status-log-size': 100,

		'ui-status-fade': 1000,
	},

	// XXX should this be here or in a separate feature???
	statusLog: ['Interface/Show status log',
		function(){
			// XXX use list
		}],
	clearStatusLog: ['Interface/Clear status log',
		function(){
			delete this.__status_log
		}],
	statusMessage: ['- Interface/',
		function(){
			var msg = args2array(arguments)
			if(msg.len == 0){
				return
			}
			var log = this.__status_log = this.__status_log || []
			
			// XXX should we convert here and how???
			log.push(msg.join(' '))

			// truncate the log...
			var s = this.config['ui-status-log-size']
			if(s != 0 && log.length > (s || 100)){
				log.splice(0, log.length - (s || 100))
			}

			// XXX show the message above the status bar (same style)...
			// XXX
		}],
})

var StatusLog = 
module.StatusLog = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-status-log',
	depends: [
		'ui'
	],

	actions: StatusLogActions,
})




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

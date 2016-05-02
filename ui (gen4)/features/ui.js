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


var reloadAfter =
module.reloadAfter =
function(force, callback){
	return function(){
		return function(){
			// NOTE: this may seem like cheating, but .reload() should
			// 		be very efficient, reusing all of the items loaded...
			this.reload(force)

			callback && callback.apply(this, arguments)
		}
	}
}


// XXX make this compatible with multiple images...
// XXX for muptiple targets this will just do a .reload()...
var updateImagePosition =
module.updateImagePosition =
function updateImagePosition(actions, target){
	if(actions.ribbons.getRibbonSet().length == 0){
		return
	}

	target = target || actions.current
	target = target instanceof jQuery 
		? actions.ribbons.getElemGID(target) 
		: target

	var source_ribbon = actions.ribbons.getElemGID(actions.ribbons.getRibbon(target))
	var source_order = actions.data.getImageOrder(target)

	return function(){
		actions.ribbons.preventTransitions()

		// XXX hack...
		if(target.constructor === Array){
			actions.reload()
			return
		}

		var target_ribbon = actions.data.getRibbon(target)

		// nothing changed...
		if(source_ribbon == target_ribbon 
				&& actions.data.getImageOrder(target) == source_order){
			return
		}

		// place image at position...
		var to = actions.data.getImage(target, 'next')
		if(to != null){
			actions.ribbons.placeImage(target, to, 'before')

		} else {
			// place image after position...
			to = actions.data.getImage(target, 'prev')
			if(to != null){
				actions.ribbons.placeImage(target, to, 'after')

			// new ribbon...
			} else {
				to = actions.data.getRibbon(target)

				if(actions.ribbons.getRibbon(to).length == 0){
					actions.ribbons.placeRibbon(to, actions.data.getRibbonOrder(target))
				}

				actions.ribbons.placeImage(target, to)
			}
		}

		if(actions.data.getImages(source_ribbon).length == 0){
			actions.ribbons.getRibbon(source_ribbon).remove()
		}

		actions.focusImage()

		actions.ribbons.restoreTransitions(true)
	}
}



/*********************************************************************/

// Viewer (widget/interface)...
//
// Workspaces:
// 	ui-chrome-hidden		- all features handling chrome elements 
// 								should hide all the chrome when this 
// 								workspace loads.
// 								NOTE: other workspace functionality 
// 									should be handled without change.
//
// NOTE: this uses the base feature API but does not need it imported...
//
// XXX split this into read and write actions...
// XXX need a way to neutrally scale images and store that scale...
// 		- fit N images/ribbons is neutral but might mean different things 
// 			depending on image and viewer proportions
// 		- .scale is a bad way to go...
var ViewerActions = 
module.ViewerActions = actions.Actions({
	config: {
		// The maximum screen width allowed when zooming...
		'max-screen-images': 30,

		// If true do not zoom past one image filling the screen...
		'max-zoom-to-screen': true,

		// A step (multiplier) used by .zoomIn()/.zoomOut() actions.
		// NOTE: this is rounded to the nearest whole screen width in images
		// 		and current fit-overflow added.
		'zoom-step': 1.2,

		// added to odd number of images to fit to indicate scroll ability...
		// ...this effectively sets the closest distance an image can be from
		// the viewer edge...
		'fit-overflow': 0.2,

		
		// Theme to set on startup...
		'theme': null,

		// Supported themes...
		'themes': [
			'gray', 
			'dark', 
			'light',
		],

		'ribbon-theme': 'black',
		'ribbon-themes': [
			'black-ribbon',
			'gray-ribbon',
			'light-gray-ribbon',
			'transparent-ribbon',
		],

		// XXX BUG: for some reason this get's shadowed by base.config...
		'ribbon-focus-modes': [
			'visual',	// select image closest visually 

			'order',	// select image closest to current in order
			'first',	// select first image
			'last',		// select last image
		],
		'ribbon-focus-mode': 'visual',
	},

	// Ribbons...
	//
	// NOTE: this expects that ribbons will maintain .parent.images...
	// NOTE: when getting rid of ribbons need to also remove the .parent
	// 		reference...
	get ribbons(){
		return this.__ribbons },
	set ribbons(ribbons){
		this.__ribbons = ribbons
		ribbons.parent = this
	},

	// Current image data...
	//
	// XXX experimental...
	get image(){
		return this.images && this.images[this.current] },
	set image(val){
		if(this.images){
			this.images[this.current] = val
		}
	},

	// Scaling...
	//
	// Normal scale...
	get scale(){
		return this.ribbons != null ? this.ribbons.scale() : null },
	set scale(s){
		this.setScale(s) },
	
	// Screen width in image blocks...
	//
	// NOTE: this will change depending on image block sizing...
	// NOTE: this not usable for image blocks of different sizes...
	get screenwidth(){
		return this.ribbons != null ? this.ribbons.getScreenWidthImages() : null },
	set screenwidth(n){
		this.fitImage(n, false) },

	// Screen height in image blocks...
	get screenheight(){
		return this.ribbons != null ? this.ribbons.getScreenHeightRibbons() : null },
	set screenheight(n){
		this.fitRibbon(n, false) },

	// Screen size in image radii on the narrow side of the screen...
	//
	// E.g.
	//
	// 						min(screenwidth, screenheight)	
	// 		screenfit = --------------------------------------
	// 						min(image.width, image.height)
	//
	get screenfit(){
		if(!this.ribbons || !this.ribbons.viewer){
			return null
		}
		var viewer = this.ribbons.viewer
		var W = viewer.width()
		var H = viewer.height()

		return W < H ?
			this.screenwidth
			: this.screenheight
	},
	set screenfit(n){
		var viewer = this.ribbons.viewer
		var W = viewer.width()
		var H = viewer.height()

		if(W < H){
			this.screenwidth = n

		} else {
			this.screenheight = n
		}
	},

	load: [
		function(data){
			return function(){
				// recycle the viewer if one is not given specifically...
				var viewer = data.viewer
				viewer = viewer == null && this.ribbons != null 
					? this.ribbons.viewer 
					: viewer

				if(this.ribbons == null){
					this.ribbons = ribbons.Ribbons(viewer, this.images)
					// XXX is this correct???
					this.ribbons.__image_updaters = [this.updateImage.bind(this)]

				} else {
					this.ribbons.clear()
					this.ribbons.images = this.images
				}

				this.reload()
			}
		}],
	// NOTE: this will pass the .ribbons.updateData(..) a custom ribbon 
	// 		updater if one is defined here as .updateRibbon(target) action
	//
	// XXX HACK: two sins:
	// 		- actions.updateRibbon(..) and ribbons.updateRibbon(..)
	// 		  are NOT signature compatible...
	// 		- we depend on the internals of a custom add-on feature
	reload: ['Interface/Reload viewer',
		function(force){
			this.ribbons.preventTransitions()

			// NOTE: this essentially sets the update threshold to 0...
			// XXX this should be a custom arg...
			force = force ? 0 : null

			return function(){
				// see if we've got a custom ribbon updater...
				var that = this
				var settings = this.updateRibbon != null 
					// XXX this should be: { updateRibbon: this.updateRibbon.bind(this) }
					? { updateRibbon: function(_, ribbon){ 
							return that.updateRibbon(ribbon, null, null, force) 
						} }
					: null

				this.ribbons.updateData(this.data, settings)

				this
					// XXX should this be here???
					.refresh()
					.focusImage()

				// XXX HACK to make browser redraw images...
				this.scale = this.scale

				this.ribbons.restoreTransitions()
			}
		}],
	// NOTE: this will trigger .updateImage hooks...
	refresh: ['Interface/Refresh images without reloading',
		function(gids){
			gids = gids || '*'
			this.ribbons.updateImage(gids)
		}],
	clear: [
		function(){ this.ribbons && this.ribbons.clear() }],
	clone: [function(full){
		return function(res){
			if(this.ribbons){
				// NOTE: this is a bit wasteful as .ribbons will clone 
				// 		their ref to .images that we will throw away...
				res.ribbons = this.ribbons.clone()
				res.ribbons.images = res.images
			} 
		}
	}],


	replaceGid: [
		function(from, to){
			return function(res){
				res && this.ribbons.replaceGid(from, to)
			}
		}],

	// This is called by .ribbons, the goal is to use it to hook into 
	// image updating from features and extensions...
	//
	// NOTE: not intended for calling manually, use .refresh(..) instead...
	//
	// XXX experimental...
	// 		...need this to get triggered by .ribbons
	// 		at this point manually triggering this will not do anything...
	// XXX problem: need to either redesign this or distinguish from 
	// 		other actions as I keep calling it expecting results...
	// XXX hide from user action list... (???)
	updateImage: ['- Interface/Update image (do not use directly)',
		'This is called by .refresh(..) and intended for use as an '
			+'trigger for handlers, and not as a user-callable acation.',
		core.notUserCallable(function(gid, image){
			// This is the image update protocol root function
			//
			// Not for direct use.
		})],


	// General UI stuff...
	// NOTE: this is applicable to all uses...
	toggleTheme: ['Interface/Theme/Toggle viewer theme', 
		toggler.CSSClassToggler(
			function(){ return this.ribbons.viewer }, 
			function(){ return this.config.themes },
			function(state){ this.config.theme = state }) ],
	toggleRibbonTheme: ['Interface/Theme/Toggle ribbon theme', 
		toggler.CSSClassToggler(
			function(){ return this.ribbons.viewer }, 
			function(){ return this.config['ribbon-themes'] },
			function(state){ this.config['ribbon-theme'] = state }) ],

	/*
	setEmptyMsg: ['- Interface/Set message to be displayed when nothing is loaded.',
		function(msg, help){ this.ribbons 
			&& this.ribbons.setEmptyMsg(msg, help) }],
	*/


	// align modes...
	// XXX these should also affect up/down navigation...
	// 		...navigate by proximity (closest to center) rather than by
	// 		order...
	// XXX skip off-screen ribbons (???)
	// XXX should the timeout be configurable???
	alignByOrder: ['Interface/Align ribbons by image order',
		function(target, scale, now){
			if(target == 'now'){
				now = true
				target = null
			}

			var ribbons = this.ribbons
			var data = this.data

			// XXX handle raw dom elements...
			var gid = target instanceof jQuery 
				? ribbons.getElemGID(target)
				: data.getImage(target)

			// align current ribbon...
			// NOTE: the ordering of calls here makes it simpler to load
			// 		data into ribbons based on target gid... i.e. first
			// 		we know the section we need then align it vertically...
			this
				.centerImage(gid, null, null, scale)
				.centerRibbon(gid, null, null, scale)

			var that = this
			var _align = function(){
				this._align_timeout = null
				// align other ribbons...
				var ribbon = data.getRibbon(gid)
				for(var r in data.ribbons){
					// skip the current ribbon...
					if(r == ribbon){
						continue
					}

					// XXX skip off-screen ribbons... (???)

					// center...
					// XXX is there a 'last' special case here???
					var t = data.getImage(gid, r)
					if(t == null){
						var f = data.getImage('first', r)
						// nothing found -- empty ribbon?
						if(f == null){
							continue
						}
						that.centerImage(f, 'before', null, scale)
					} else {
						that.centerImage(t, 'after', null, scale)
					}
				}
			}

			if(now){
				_align()

			} else {
				// if we are going fast we might skip an update... 
				if(this._align_timeout != null){
					clearTimeout(this._align_timeout)
					this._align_timeout = null
				}
				this._align_timeout = setTimeout(_align, 50)
			}
		}],
	alignByFirst: ['Interface/Align ribbons except current to first image',
		function(target){
			target = target == 'now' ? null : target

			var ribbons = this.ribbons
			var data = this.data

			// XXX handle raw dom elements...
			var gid = target instanceof jQuery 
				? ribbons.getElemGID(target)
				: data.getImage(target)

			// align current ribbon...
			this
				.centerRibbon(gid)
				.centerImage(gid)

			var that = this
			//setTimeout(function(){
				// align other ribbons...
				var ribbon = data.getRibbon(gid)
				for(var r in data.ribbons){
					// skip the current ribbon...
					if(r == ribbon){
						continue
					}

					// XXX skip off-screen ribbons...

					// XXX see if we need to do some loading...

					// center...
					var f = data.getImage('first', r)
					// nothing found -- empty ribbon?
					if(f == null){
						continue
					}
					that.centerImage(f, 'before')
				}
			//}, 0)
		}],

	// NOTE: this will align only a single image...
	// XXX do we need these low level primitives here???
	centerImage: ['- Interface/Center an image in ribbon horizontally',
		function(target, align, offset, scale){
			target = target instanceof jQuery 
				? this.ribbons.getElemGID(target)
				: target

			// align current ribbon...
			this.ribbons.centerImage(target, align, offset, scale)
		}],
	centerRibbon: ['- Interface/Center a ribbon vertically',
		function(target){
			target = target instanceof jQuery 
				? this.ribbons.getElemGID(target)
				: target

			// align current ribbon...
			this.ribbons.centerRibbon(target)
		}],
	centerViewer: ['- Interface/Center the viewer',
		function(target){
			this
				.centerImage(target)
				.centerRibbon(target)
				.ribbons
					.origin(target)
		}],

	focusImage: [
		function(target, list){
			var ribbons = this.ribbons
			var data = this.data

			// NOTE: we do not need to do anything in the alternative 
			// 		case as it's done in data/Client, so we'll just 
			// 		peek there later...
			if(data == null){
				target = ribbons.focusImage(target)
				var gid = ribbons.getElemGID(target)
			}

			return function(){
				if(data != null){
					// use the data for all the heavy lifting...
					// NOTE: this will prevent sync errors...
					var gid = data.getImage()

					target = ribbons.focusImage(gid)
				}
			}
		}],
	focusRibbon: [
		function(target, mode){
			mode = mode || this.config['ribbon-focus-mode']

			var c = this.data.getRibbonOrder()
			var i = this.data.getRibbonOrder(target)
			// NOTE: we are not changing the direction here based on 
			// 		this.direction as swap will confuse the user...
			var direction = c < i ? 'before' : 'after'

			if(mode == 'visual'){
				var ribbons = this.ribbons
				var r = this.data.getRibbon(target)
				var t = ribbons.getImageByPosition('current', r)

				if(t.length > 1){
					t = t.eq(direction == 'before' ? 0 : 1)
				}

				t = ribbons.getElemGID(t)

				this.focusImage(t, r)
			}
		}],
	setBaseRibbon: [
		function(target){
			var r = this.data.getRibbon(target)
			r =  r == null ? this.ribbons.getRibbon(target) : r
			this.ribbons.setBaseRibbon(r)
		}],

	// NOTE: these prioritize whole images, i.e. each image will at least
	// 		once be fully shown.
	prevScreen: ['Navigate/Screen width back',
		function(){
			// NOTE: the 0.2 is added to compensate for alignment/scaling
			// 		errors -- 2.99 images wide counts as 3 while 2.5 as 2.
			var w = Math.floor(this.ribbons.getScreenWidthImages() + 0.2)
			w += (w % 2) - 1
			this.prevImage(w)
		}],
	nextScreen: ['Navigate/Screen width forward',
		function(){
			var w = Math.floor(this.ribbons.getScreenWidthImages() + 0.2)
			w += (w % 2) - 1
			this.nextImage(w)
		}],


	// Zooming/scaling root action...
	//
	// Protocol:
	// 	- a compliant action must be wrapped in the .resizing action
	// 	- a compliant action must pass the sizing unit, value and 
	// 		overflow to the wrapping action.
	//
	// Supported units:
	// 	- scale
	// 	- screenwidth
	// 	- screenheight
	//
	// Example:
	//	actionName: ['...',
	//		function(value){
	//			this.resizing.chainCall(this, function(){
	//
	//				// action code...
	//
	//			}, 
	//			// action unit...
	//			'scale', 
	//			// action value...
	//			scale)
	//		}],
	//
	//
	// This will enable clients to attach to a single in/out point.
	//
	// NOTE: not intended for direct use...
	//
	// XXX hide from user action list... (???)
	resizing: ['- Zoom/Zoom/scale root protocol action (not for direct use)', 
		'This is called by zoom/scale protocol compliant actions and '
			+'intended for use as an trigger for handlers, and not as '
			+'a user-callable acation.',
		core.notUserCallable(function(unit, size, overflow){
			// This is a resizing protocol root function.
			//
			// This will never be used directly, but will wrap protocol user
			// functions.
			//
			// As an example see: .setScale(..)
		})],

	// Zoom/scale protocol actions...
	//
	// XXX need to account for animations...
	setScale: ['- Zoom/',
		function(scale){
			this.resizing.chainCall(this, function(){
				this.ribbons && scale && this.ribbons.scale(scale)
				this.refresh()
			}, 'scale', scale)
		}],
	fitOrig: ['Zoom/Fit to original scale',
		function(){ 
			this.resizing.chainCall(this, function(){
				this.ribbons.scale(1) 
				this.refresh()
			}, 'scale', 1)
		}],
	// NOTE: if this gets a count argument it will fit count images, 
	// 		default is one.
	// NOTE: this will add .config['fit-overflow'] to odd counts if no 
	// 		overflow if passed.
	// 		...this is done to add ability to control scroll indication.
	fitImage: ['Zoom/Fit image',
		function(count, overflow){
			this.resizing.chainCall(this, function(){
				if(count != null){
					overflow = overflow == false ? 0 : overflow
					var o = overflow != null ? overflow 
						: count % 2 != 1 ? 0
						: (this.config['fit-overflow'] || 0)
					count += o
				}
				this.ribbons.fitImage(count)
				this.refresh()
			}, 'screenwidth', count, overflow)
		}],
	// NOTE: this does not accout for ribbon spacing...
	fitRibbon: ['Zoom/Fit ribbon vertically',
		function(count, whole){
			this.resizing.chainCall(this, function(){
				this.ribbons.fitRibbon(count, whole)
				this.refresh()
			}, 'screenheight', count, whole)
		}],


	// Zooming...
	//
	// Zooming is done by multiplying the current scale by config['zoom-step']
	// and rounding to nearest discrete number of images to fit on screen.
	zoomIn: ['Zoom/Zoom in',
		function(){ 
			this.ribbons.origin()

			var d = (this.config['zoom-step'] || 1.2)

			// limit scaling to screen dimensions...
			if(this.config['max-zoom-to-screen'] 
					&& (Math.min(this.screenwidth, this.screenheight) / d) < 1){
				this.scale /= 1 / Math.min(this.screenwidth, this.screenheight)

			} else {
				this.scale *= d
			}
		}],
	zoomOut: ['Zoom/Zoom out',
		function(){ 
			this.ribbons.origin()

			var max = this.config['max-screen-images']

			if(max && max < (this.screenwidth * (this.config['zoom-step'] || 1.2))){
				this.scale /= max / Math.min(this.screenwidth, this.screenheight)

			} else {
				this.scale /= (this.config['zoom-step'] || 1.2)
			}
		}],

	// Scale presets...
	//
	fitMax: ['Zoom/Fit the maximum number of images',
		function(){ this.fitImage(this.config['max-screen-images']) }],
	fitSmall: ['Zoom/Show small image',
		function(){ this.screenfit = 4 }],
	fitNormal: ['Zoom/Show normal image',
		function(){ this.screenfit = 1.2 }],
	fitScreen: ['Zoom/Fit image to screen',
		function(){ this.screenfit = 1 }],


	// NOTE: these work by getting the target position from .data...
	shiftImageTo: [ 
		function(target){ return updateImagePosition(this, target) }],
	shiftImageUp: [ 
		function(target){ return updateImagePosition(this, target) }],
	shiftImageDown: [
		function(target){ return updateImagePosition(this, target) }],
	shiftImageLeft: [
		function(target){ this.ribbons.placeImage(target, -1) }],
	shiftImageRight: [
		function(target){ this.ribbons.placeImage(target, 1) }],

	/*
	// XXX how should these animate???
	travelImageUp: [
		function(){
		}],
	travelImageDown: [
		function(){
		}],
	*/

	shiftRibbonUp: [
		function(target){
			target = this.ribbons.getRibbon(target)
			var i = this.ribbons.getRibbonOrder(target)
			if(i > 0){
				this.ribbons.placeRibbon(target, i-1)
			}
		}],
	shiftRibbonDown: [
		function(target){
			target = this.ribbons.getRibbon(target)
			var i = this.ribbons.getRibbonOrder(target)
			if(i < this.data.ribbon_order.length-1){
				this.ribbons.placeRibbon(target, i+1)
			}
		}],

	reverseImages: [ reloadAfter() ],
	reverseRibbons: [ reloadAfter() ],
	sortImages: [ reloadAfter(true) ],

	// basic image editing...
	//
	// XXX should we have .rotate(..) and .flip(..) generic actions???
	rotateCW: [ 
		function(target){ this.ribbons.rotateCW(target) }],
	rotateCCW: [ 
		function(target){ this.ribbons.rotateCCW(target) }],
	flipVertical: [ 
		function(target){ this.ribbons.flipVertical(target, 'view') }],
	flipHorizontal: [
		function(target){ this.ribbons.flipHorizontal(target, 'view') }],


	// tags...
	tag: [ 
		function(tags, gids){ 
			gids = gids != null && gids.constructor !== Array ? [gids] : gids
			return function(){
				//this.ribbons.updateImage(gids) 
				this.refresh(gids)
			}
		}],
	untag: [
		function(tags, gids){ 
			gids = gids != null && gids.constructor !== Array ? [gids] : gids
			return function(){
				//this.ribbons.updateImage(gids) 
				this.refresh(gids)
			}
		}],


	// group stuff...
	group: [ reloadAfter(true) ],
	ungroup: [ reloadAfter(true) ],
	groupTo: [ reloadAfter(true) ],
	groupMarked: [ reloadAfter(true) ],
	expandGroup: [ reloadAfter(true) ],
	collapseGroup: [ reloadAfter(true) ],


	// XXX BUG? reloadAfter() here does not remove some images...
	crop: [ reloadAfter(true) ],
	// XXX BUG? reloadAfter() produces an align error...
	uncrop: [ reloadAfter(true) ],
	// XXX might be a good idea to do this in a new viewer in an overlay...
	cropGroup: [ reloadAfter() ],


	// XXX experimental: not sure if this is the right way to go...
	// XXX make this play nice with crops...
	toggleRibbonList: ['Interface/Toggle ribbons as images view',
		function(){
			if(this._full_data == null){
				// XXX do a better name here...
				this._full_data = this.data

				// generate the view...
				this.data = this.data.cropRibbons()

			} else {
				var data = this._full_data
				delete this._full_data

				// restore...
				this.data = data.mergeRibbonCrop(this.data)
			}

			this.reload()
		}],
})

var Viewer =
module.Viewer = core.ImageGridFeatures.Feature({
	title: 'Graphical User Interface',

	tag: 'ui',

	depends: [
		'lifecycle',
		'base',
		'workspace',
		'introspection',
	],

	actions: ViewerActions,

	// check if we are running in a UI context...
	// NOTE: this will prevent loading of any features dependant on the 
	// 		UI in a non UI context...
	isApplicable: function(){ return typeof(window) == typeof({}) },

	handlers: [
		['start',
			function(){
				var that = this

				// load themes from config...
				this.config.theme 
					&& this.toggleTheme(this.config.theme)
				this.config['ribbon-theme'] 
					&& this.toggleRibbonTheme(this.config['ribbon-theme'])

				// center viewer on resize events...
				if(!this.__viewer_resize){
					this.__viewer_resize = function(){
						if(that.__centering_on_resize){
							return
						}
						// this will prevent centering calls from overlapping...
						that.__centering_on_resize = true

						that.centerViewer()

						delete that.__centering_on_resize
					}

					$(window).resize(this.__viewer_resize)
				}

				// setup basic workspaces...
				if(this.workspaces['ui-chrome-hidden'] == null){
					this.workspaces['ui-chrome-hidden'] = {}
				}
			}],
		['stop', 
			function(){
				if(this.__viewer_resize){
					$(window).off('resize', this.__viewer_resize) 
					delete this.__viewer_resize
				}
			}],
		// manage the .crop-mode css class...
		['crop uncrop',
			function(){
				this.ribbons.viewer[this.cropped ? 
						'addClass' 
					: 'removeClass']('crop-mode')
			}],
	],
})



/*********************************************************************/
// User interfaces for different base features...

// XXX tag dialogs...
// XXX



/*********************************************************************/
// Utilities and Services...

var ConfigLocalStorageActions = actions.Actions({
	config: {
		'config-local-storage-key': 'config',
		
		// NOTE: this is in seconds...
		// NOTE: if this is null or 0 the timer will not start...
		'config-auto-save-local-storage-interval': 3*60,

		// XXX not sure what should be the default...
		'config-local-storage-save-diff': true,
	},

	// XXX should we store this in something like .default_config and
	// 		clone it???
	// 		...do not think so, as the __base_config xhould always be set
	// 		to the values set in code... (check this!)
	__base_config: null,
	__config_loaded: null,
	__auto_save_config_timer: null,

	// Disable localStorage in child, preventing two viewers from messing
	// things up in one store...
	clone: [function(){
		return function(res){
			res.config['config-local-storage-key'] = null
		}
	}],

	storeConfig: ['File/Store configuration',
		function(key){
			var key = key || this.config['config-local-storage-key']

			if(key != null){
				// build a diff...
				if(this.config['config-local-storage-save-diff']){
					var base = this.__base_config || {}
					var cur = this.config
					var config = {}
					Object.keys(cur)
						.forEach(function(e){
							if(cur.hasOwnProperty(e) 
									&& base[e] != cur[e] 
									// NOTE: this may go wrong for objects
									// 		if key order is different...
									// 		...this is no big deal as false
									// 		positives are not lost data...
									|| JSON.stringify(base[e]) != JSON.stringify(cur[e])){
								config[e] = cur[e]
							}
						})

				// full save...
				} else {
					var config = this.config
				}

				// store...
				localStorage[key] = JSON.stringify(config) 
			}
		}],
	loadStoredConfig: ['File/Load stored configuration',
		function(key){
			key = key || this.config['config-local-storage-key']

			if(key && localStorage[key]){
				// get the original (default) config and keep it for 
				// reference...
				// NOTE: this is here so as to avoid creating 'endless'
				// 		config inheritance chains...
				base = this.__base_config = this.__base_config || this.config

				var loaded = JSON.parse(localStorage[key])
				loaded.__proto__ = base

				this.config = loaded 
			}
		}],
	// XXX need to load the reset config, and not just set it...
	resetConfig: ['File/Reset configuration to default state',
		function(){
			this.config = this.__base_config || this.config
		}],

	toggleAutoStoreConfig: ['File/Store configuration',
		toggler.Toggler(null, function(_, state){ 
				if(state == null){
					return this.__auto_save_config_timer || 'none'

				} else {
					var that = this
					var interval = this.config['config-auto-save-local-storage-interval']

					// no timer interval set...
					if(!interval){
						return false
					}

					// this cleans up before 'on' and fully handles 'off' action...
					if(this.__auto_save_config_timer != null){
						clearTimeout(this.__auto_save_config_timer)
						delete this.__auto_save_config_timer
					}

					if(state == 'running' 
							&& interval 
							&& this.__auto_save_config_timer == null){

						var runner = function(){
							clearTimeout(that.__auto_save_config_timer)

							//that.logger && that.logger.emit('config', 'saving to local storage...')
							that.storeConfig()

							var interval = that.config['config-auto-save-local-storage-interval']
							if(!interval){
								delete that.__auto_save_config_timer
								return
							}
							interval *= 1000

							that.__auto_save_config_timer = setTimeout(runner, interval)
						}

						runner()
					}
				}
			},
			'running')],
})

var ConfigLocalStorage = 
module.ConfigLocalStorage = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'config-local-storage',
	depends: [
		'ui',
	],
	priority: 80,

	isApplicable: function(){ 
		return typeof(localStorage) != 'undefined' 
			&& localStorage != null },

	actions: ConfigLocalStorageActions,

	handlers: [
		// NOTE: considering that allot depends on this it must be 
		// 		first to run...
		['start.pre',
			function(){ 
				this.logger && this.logger.emit('loaded', 'config')
				this
					.loadStoredConfig() 
					.toggleAutoStoreConfig('on')
			}],
		['stop.pre',
			function(){ 
				this.logger && this.logger.emit('stored', 'config')
				this
					.storeConfig() 
					.toggleAutoStoreConfig('off')
			}],
	],
})



//---------------------------------------------------------------------

// XXX make this work for external links in a stable manner...
// 		...a bit unpredictable when working in combination with history
// 		feature -- need to stop them from competing...
// 		...appears to be a bug in location....
var URLHash = 
module.URLHash = core.ImageGridFeatures.Feature({
	title: 'Handle URL hash',
	doc: '',

	tag: 'ui-url-hash',
	depends: ['ui'],

	//isApplicable: function(){ 
	//	return typeof(location) != 'undefined' && location.hash != null },
	isApplicable: function(){ return this.runtime == 'browser' },

	handlers: [
		// hanlde window.onhashchange event...
		['start',
			function(){
				var that = this
				var handler = this.__hashchange_handler = function(){
					var h = location.hash
					h = h.replace(/^#/, '')
					that.current = h
				}
				$(window).on('hashchange', handler)
			}],
		['stop',
			function(){
				this.__hashchange_handler 
					&& $(window).on('hashchange', this.__hashchange_handler)
			}],
		// store/restore hash when we focus images...
		['focusImage',
			function(res, a){
				if(this.current && this.current != ''){
					location.hash = this.current
				}
			}],
		['load.pre',
			function(){
				var h = location.hash
				h = h.replace(/^#/, '')

				return function(){
					if(h != '' && this.data.getImageOrder(h) >= 0){
						this.current = h
					}
				}
			}],
	],
})




/*********************************************************************/
// Ribbons...

// XXX manual align needs more work...
var AutoAlignRibbons = 
module.AutoAlignRibbons = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-ribbon-auto-align',
	depends: ['ui'],
	exclusive: ['ui-ribbon-align'],

	config: {
		// control ribbon alignment...
		//
		// NOTE: when this is null then 'ribbon-focus-mode' will be used...
		// NOTE: this supports the same modes as 'ribbon-focus-mode'...
		'ribbon-align-modes': [
			'none',		// use .config['ribbon-focus-mode']'s value
			'visual',
			'order',
			'first',
			//'last',
			'manual',
		],
		'ribbon-align-mode': null,
	},

	actions: actions.Actions({
		alignRibbons: ['Interface/Align ribbons',
			function(target, scale, now){
				if(target == 'now'){
					now = true
					target = null
				}
				var mode = this.config['ribbon-align-mode'] 
					|| this.config['ribbon-focus-mode']

				if(mode == 'visual' || mode == 'order'){
					this.alignByOrder(target, scale, now) 

				} else if(mode == 'first'){
					this.alignByFirst(target, scale, now)

				// manual...
				// XXX is this correct???
				} else {
					this
						.centerRibbon(target, null, null, scale)
						.centerImage(target, null, null, scale)
				}
			}],
		toggleRibbonAlignMode : ['Interface/Toggle ribbon align mode',
			core.makeConfigToggler('ribbon-align-mode', 
				function(){ return this.config['ribbon-align-modes'] })],
	}),

	handlers: [
		['focusImage.post', 
			function(){ this.alignRibbons() }],
	],
})


// XXX should .alignByOrder(..) be a feature-specific action or global 
// 		as it is now???
var AlignRibbonsToImageOrder = 
module.AlignRibbonsToImageOrder = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-ribbon-align-to-order',
	depends: ['ui'],
	exclusive: ['ui-ribbon-align'],

	config: {
		//'ribbon-focus-mode': 'order',
		'ribbon-focus-mode': 'visual',
	},

	handlers: [
		['focusImage.post', function(){ this.alignByOrder() }]
	],
})


var AlignRibbonsToFirstImage = 
module.AlignRibbonsToFirstImage = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-ribbon-align-to-first',
	depends: ['ui'],
	exclusive: ['ui-ribbon-align'],

	config: {
		'ribbon-focus-mode': 'first',
	},

	handlers: [
		['focusImage.post', function(){ this.alignByFirst() }],
	],
})

// XXX needs more work...
// XXX need to save position in some way, ad on each load the same 
// 		initial state will get loaded...
// 		...also would need an initial state...
var ManualAlignRibbons = 
module.ManualAlignRibbons = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-ribbon-manual-align',
	depends: ['ui'],
	exclusive: ['ui-ribbon-align'],

	config: {
		'ribbon-focus-mode': 'visual',
	},

	handlers: [
		['focusImage.post', function(){ 
			this
				.centerRibbon()
				.centerImage()
		}],
	],
})



//---------------------------------------------------------------------

// Adds user management of different back-ends for low level ribbon 
// alignment and placement...
var RibbonsPlacement = 
module.RibbonsPlacement = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-ribbons-placement',
	depends: [ 'ui' ],

	config: {
		// NOTE: the adapter names bust be registered in the ribbons module
		// 		...not sure if this is good, but it's how it works now...
		'ui-ribbons-placement-modes': {
			'legacy': 'legacyDOMAdapter',
			'new': 'DOMAdapter',
		},
		'ui-ribbons-placement-mode': 'new',
	},

	actions: actions.Actions({
		toggleRibbonsPlacementMode: ['- Interface/',
			toggler.Toggler(null, function(_, state){ 
					if(state == null){
						return this.config['ui-ribbons-placement-mode']
					}

					this.config['ui-ribbons-placement-mode'] = state
					var modes = this.config['ui-ribbons-placement-modes']

					this.ribbons.dom = ribbons[modes[state]]

					// NOTE: this will lose any state/configuration that
					// 		was stored in ribbon dom...
					this.ribbons.clear('full')
					this.reload(true)
				},
				function(){ 
					return Object.keys(this.config['ui-ribbons-placement-modes']) } )],
	}),

	handlers: [
		['setup', 
			function(){
				this.toggleRibbonsPlacementMode(this.config['ui-ribbons-placement-mode'])
			}],
	]
})




/*********************************************************************/
// Animation...

// XXX at this point this does not support target lists...
// XXX shift up/down to new ribbon is not too correct...
var ShiftAnimation =
module.ShiftAnimation = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-animation',
	depends: ['ui'],

	handlers: [
		//['shiftImageUp.pre shiftImageDown.pre '
		//		+'travelImageUp.pre travelImageDown.pre', 
		['shiftImageUp.pre shiftImageDown.pre',
			function(target){
				// XXX do not do target lists...
				if(target != null && target.constructor === Array 
						// do not animate in single image mode...
						&& this.toggleSingleImage('?') == 'on'){
					return
				}
				var s = this.ribbons.makeShadow(target, true)
				return function(){ s() }
			}],
		// NOTE: this will keep the shadow in place -- the shadow will not
		// 		go to the mountain, the mountain will come to the shadow ;)
		['shiftImageLeft.pre shiftImageRight.pre', 
			function(target){
				// XXX do not do target lists...
				if(target != null && target.constructor === Array
						// do not animate in single image mode...
						&& this.toggleSingleImage('?') == 'on'){
					return
				}
				var s = this.ribbons.makeShadow(target)
				return function(){ s() }
			}],
	],
})




/*********************************************************************/
// Mouse...

// XXX add setup/taredown...
var Clickable = 
module.Clickable = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-clickable',
	depends: ['ui'],

	handlers: [
		// setup click targets...
		// XXX click only if we did not drag...
		['updateImage', 
			function(res, gid){
				var that = this
				var img = this.ribbons.getImage(gid)

				// set the clicker only once...
				if(!img.prop('clickable')){
					var x, y
					img
						.prop('clickable', true)
						.on('mousedown touchstart', function(){ 
							x = event.clientX
							y = event.clientY
							t = Date.now()
						})
						.on('mouseup touchend', function(){ 
							if(x != null 
								&& Math.max(
									Math.abs(x - event.clientX), 
									Math.abs(y - event.clientY)) < 5){
								// this will prevent double clicks...
								x = null
								y = null
								that.focusImage(that.ribbons.getElemGID($(this)))
							}
						})
				}
			}],
	],
})



//---------------------------------------------------------------------
// Auto-hide cursor...

// NOTE: removing the prop 'cursor-autohide' will stop hiding the cursor
// 		and show it on next timeout/mousemove.
// 		This will not stop watching the cursor, this setting the prop back
// 		on will re-enable autohide.
// 		XXX needs testing...
// NOTE: chrome 49 + devtools open appears to prevent the cursor from 
// 		being hidden...
var AutoHideCursor = 
module.AutoHideCursor = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-autohide-cursor',
	depends: [
		'ui'
	],

	config: {
		'cursor-autohide-timeout': 1000,
		'cursor-autohide-threshold': 10,
	},

	actions: actions.Actions({
		toggleAutoHideCursor: ['Interface/Toggle cursor auto hiding',
			toggler.CSSClassToggler(
				function(){ return this.ribbons.viewer }, 
				'cursor-hidden',
				function(state){
					var that = this
					var viewer = this.ribbons.viewer

					// setup...
					if(state == 'on'){
						var x, y
						var timer
						var timeout = this.config['cursor-autohide-timeout'] || 1000

						var handler 
							= this.__cursor_autohide_handler 
							= (this.__cursor_autohide_handler 
								|| function(){
									timer && clearTimeout(timer)

									var threshold = that.config['cursor-autohide-threshold'] || 0
									x = x || event.clientX
									y = y || event.clientY

									// show only if cursor moved outside of threshold...
									if(threshold > 0){ 
										if(Math.max(Math.abs(x - event.clientX), 
												Math.abs(y - event.clientY)) > threshold){
											x = y = null
											that.ribbons.viewer
												.removeClass('cursor-hidden')
										}

									// show right away -- no threshold...
									} else {
										that.ribbons.viewer
											.removeClass('cursor-hidden')
									}

									var timeout = that.config['cursor-autohide-timeout'] || 1000
									if(timeout && timeout > 0){
										timer = setTimeout(function(){
											var viewer = that.ribbons.viewer

											if(!viewer.prop('cursor-autohide')){
												viewer.removeClass('cursor-hidden')
												return
											}

											timer && viewer.addClass('cursor-hidden')
										}, timeout)
									}
								})

						// do the base setup...
						!viewer.prop('cursor-autohide')
							&& viewer
								.prop('cursor-autohide', true)
								.addClass('cursor-hidden')
								// prevent multiple handlers...
								.off('mousemove', this.__cursor_autohide_handler)
								.mousemove(handler)

					// teardown...
					} else {
						viewer
							.off('mousemove', this.__cursor_autohide_handler)
							.prop('cursor-autohide', false)
							.removeClass('cursor-hidden')
						delete this.__cursor_autohide_handler
					}
				})],
	}),
})




/*********************************************************************/
// Touch/Control...

// Direct control mode...
// XXX add vertical scroll...
// XXX add pinch-zoom...
// XXX disable drag in single image mode unless image is larger than the screen...

// XXX BUG: current image indicator gets shown in random places...
// XXX BUG: this does it's work via css left which is both slow and 
// 		messes up positioning...
var DirectControljQ = 
module.DirectControljQ = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-direct-control-jquery',
	exclusive: ['ui-direct-control'],
	depends: [
		'ui',
		// this is only used to trigger reoad...
		//'ui-partial-ribbons',
	],

	// XXX add setup/taredown...
	handlers: [
		// setup ribbon dragging...
		// XXX this is really sloooooow...
		// XXX hide current image indicator as soon as the image is not visible...
		// XXX inertia...
		// XXX limit scroll to at least one image being on screen (center?)...
		['updateRibbon', 
			function(_, target){
				var that = this
				var r = this.ribbons.getRibbon(target)

				var scale = 1

				// setup dragging...
				r.length > 0 
					&& !r.hasClass('ui-draggable')
					&& r.draggable({
						axis: 'x',

						start: function(evt, ui){
							scale = that.ribbons.scale()	
						},
						// compensate for ribbon scale...
						drag: function(evt, ui) {
							// compensate for scale...
							ui.position = {
								left: ui.originalPosition.left 
									+ (ui.position.left 
										- ui.originalPosition.left) / scale,
								top: ui.originalPosition.top 
									+ (ui.position.top 
										- ui.originalPosition.top) / scale,
							}
						},

						stop: function(){
							var c = that.ribbons.getImageByPosition('center', r)
							that
								.updateRibbon(c)
								// XXX is this correct???
								//.updateCurrentImageIndicator()
						}
					})
			}],
	],
})


// XXX BUG: this does not account for scale when setting the initial drag
// 		position, resulting in a jump...
// XXX do not use this for production -- GSAp has a bad license...
var DirectControlGSAP = 
module.DirectControlGSAP = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-direct-control-gsap',
	exclusive: ['ui-direct-control'],
	depends: [
		'ui',
		// this is only used to trigger reoad...
		//'ui-partial-ribbons',
	],

	// XXX add setup/taredown...
	handlers: [
		// setup ribbon dragging...
		['updateRibbon', 
			function(_, target){
				var that = this
				var r = this.ribbons.getRibbon(target)

				// setup dragging...
				if(r.length > 0 && !r.hasClass('draggable')){
					r.addClass('draggable')

					Draggable.create(r, {
						type: 'x',
						cursor: 'auto',
						onDragEnd: function(){
							var c = that.ribbons.getImageByPosition('center', r)
							that
								.updateRibbon(c)
						}})
				}
			}],
	],
})


// XXX try direct control with hammer.js
// XXX load state from config...
// XXX sometimes this makes the indicator hang for longer than needed...
// XXX BUG: this conflicts a bit whith ui-clickable...
// 		...use this with hammer.js taps instead...
// XXX might be a good idea to make a universal and extensible control 
// 		mode toggler...
// 		...obvious chice would seem to be a meta toggler:
// 			config['control-mode'] = {
// 				<mode-name>: <mode-toggler>
// 			}
// 			and the action will toggle the given mode on and the previous
// 			off...
// 			XXX this seems a bit too complicated...
var IndirectControl = 
module.IndirectControl = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-indirect-control',
	// XXX is this correct???
	exclusive: ['ui-direct-control'],
	depends: ['ui'],

	config: {
	},

	actions: actions.Actions({
		toggleSwipeHandling:['Interface/Toggle indirect control swipe handling',
			toggler.Toggler(null,
				function(_, state){

					if(state == null){
						return (this.ribbons 
								&& this.ribbons.viewer 
								&& this.ribbons.viewer.data('hammer')) 
							|| 'none'

					// on...
					} else if(state == 'handling-swipes'){
						var that = this
						var viewer = this.ribbons.viewer

						// prevent multiple handlers...
						if(viewer.data('hammer') != null){
							return
						}

						viewer.hammer()

						var h = viewer.data('hammer')
						h.get('swipe').set({direction: Hammer.DIRECTION_ALL})

						viewer
							.on('swipeleft', function(){ that.nextImage() })
							.on('swiperight', function(){ that.prevImage() })
							.on('swipeup', function(){ that.shiftImageUp() })
							.on('swipedown', function(){ that.shiftImageDown() })

					// off...
					} else {
						this.ribbons.viewer
							.off('swipeleft')
							.off('swiperight')
							.off('swipeup')
							.off('swipedown')
							.removeData('hammer')
					}

				},
				'handling-swipes')],
	}),

	handlers: [
		['load', 
			function(){ a.toggleSwipeHandling('on') }],
		['stop', 
			function(){ a.toggleSwipeHandling('off') }],
	],
})




/*********************************************************************/
// XXX experimental...

// 		...not sure if this is the right way to go...
// XXX need to get the minimal size and not the width as results will 
// 		depend on viewer format...
var AutoSingleImage = 
module.AutoSingleImage = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'auto-single-image',

	// NOTE: this feature has no actions defined but needs the config...
	config: {
		'auto-single-image-in': 2,
		'auto-single-image-out': 7,
	},

	handlers: [
		['resizing.pre',
			function(count){
				count = count || 1

				if(this.toggleSingleImage('?') == 'off' 
						&& count < this.config['auto-single-image-in']
						&& count < this.screenwidth){
					this.toggleSingleImage()

				} else if(this.toggleSingleImage('?') == 'on' 
						&& count >= this.config['auto-single-image-out']
						&& count > this.screenwidth){
					this.toggleSingleImage()
				}
			}],
	],
})

var AutoRibbon = 
module.AutoRibbon = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'auto-ribbon',

	handlers: [
		['nextRibbon prevRibbon',
			function(){
				this.toggleSingleImage('?') == 'on' 
					&& this.toggleSingleImage('off') }],
	],
})




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

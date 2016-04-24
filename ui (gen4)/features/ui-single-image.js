/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}

//var DEBUG = DEBUG != null ? DEBUG : true

var actions = require('lib/actions')
var features = require('lib/features')
var toggler = require('lib/toggler')

var core = require('features/core')



/*********************************************************************/
// helper...

// XXX an ideal case would be:
//
// A)
//       viewer
//      +---------------+
//      |     image     |   - small image
//      |     +---+     |   - square image block
//      |     |   |     |   - smaller than this the block is always square
//      |     +---+     |   - we just change scale
//      |               |
//      +---------------+
//
//
// B)
//       viewer
//      +---------------+
//      | +-----------+ |   - bigger image
//      | | image     | |   - block close to viewer proportion
//      | |    <-->   | |   - image block growing parallel to viewer
//      | |           | |     longer side
//      | +-----------+ |   - this stage is not affected specific by image
//      +---------------+     proportions and can be done in bulk
//
//
// C)
//       viewer
//      +---------------+
//      | image         |   - image block same size as viewer
//      |               |   - need to account for chrome
//      |               |
//      |               |
//      |               |
//      +---------------+
//
//
// D) 
//     image
//    + - - - - - - - - - +
//    .                   .
//    . +---------------+ .
//    . | viewer        | . - image bigger than viewer 
//    . |               | . - image block same proportion as image
//    . |               | . - we just change scale
//    . |               | . - drag enabled
//    . |               | .
//    . +---------------+ .
//    .                   .
//    + - - - - - - - - - +
//
//
// XXX should this be an action???
// XXX alignment issues in some orientations...
function updateImageProportions(){
	var that = this
	var threshold = this.config['single-image-proportions-threshold'] || 2
	var viewer = this.ribbons.viewer

	var img = this.ribbons.getImage()

	var w = img.outerWidth()
	var h = img.outerHeight()

	// inner diameter
	var di = Math.min(h, w)
	// outer diameter -- (m)ax
	var dm = Math.max(h, w)
	
	var c = Math.min(this.screenwidth, this.screenheight)

	// change proportions...
	if(c < threshold){
		var images = viewer.find('.ribbon .image')
		var W = viewer.width()
		var H = viewer.height()

		// inner diameter
		var Di = Math.min(W, H)
		// outer diameter -- (m)ax
		var Dm = Math.max(W, H)


		// get dimensional scale....
		var s = Di / di 
		// image dimension delta...
		var d = 
			// the maximum difference between image and screen proportions...
			(Dm / s - di) 
				// coefficient: 0 : c == threshold  ->  1 : c == 1
				* (threshold/c - 1)
		// total size...
		var n = di + d


		if(n == dm){
			return
		}

		getAnimationFrame(function(){
			that.ribbons.preventTransitions()

			// horizontal viewer...
			if(Di == H){
				images
					.each(function(_, img){
						img.style.width = n + 'px'
						img.style.height = ''
					})

			// vertical viewer...
			} else {
				images
					.each(function(_, img){
						img.style.width = ''
						img.style.height = n + 'px'
					})
			}
		
			that.ribbons.centerImage()

			that.ribbons.restoreTransitions(true)
		})

	// reset proportions to square...
	} else if(w != h) {
		var images = viewer.find('.ribbon .image')

		getAnimationFrame(function(){
			that.ribbons.preventTransitions()

			images
				.each(function(_, img){
					img.style.width = ''
					img.style.height = ''
				})

			that.ribbons.centerImage()

			that.ribbons.restoreTransitions(true)
		})
	}
}


//---------------------------------------------------------------------

var SingleImageActions = actions.Actions({
	config: {
		// NOTE: these will get overwritten if/when the user changes the scale...
		'single-image-scale': null,
		'ribbon-scale': null,

		'single-image-proportions-threshold': 2,
	},

	toggleSingleImage: ['Interface/Toggle single image view', 
		toggler.CSSClassToggler(
			function(){ return this.ribbons.viewer }, 
			'single-image-mode') ],
})


var SingleImageView =
module.SingleImageView = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-single-image-view',
	depends: [
		'ui'
	],

	actions: SingleImageActions,

	handlers:[
		['fitImage.post setScale.post',
			function(){ 

				// singe image mode -- set image proportions...
				if(this.toggleSingleImage('?') == 'on'){
					updateImageProportions.call(this)

					this.config['single-image-scale'] = this.screenwidth

				} else {
					this.config['ribbon-scale'] = this.screenwidth
				}
			}],
		// NOTE: this is not part of the actual action above because we 
		// 		need to see if the state has changed and doing this with 
		// 		two separate pre/post callbacks (toggler callbacks) is 
		// 		harder than with two nested callbacks (action callbacks)
		// XXX this uses .screenwidth for scale, is this the right way to go?
		['toggleSingleImage.pre', 
			function(){ 
				var pre_state = this.toggleSingleImage('?')

				return function(){
					var state = this.toggleSingleImage('?')

					// singe image mode -- set image proportions...
					if(state == 'on'){
						updateImageProportions.call(this)

						// update scale...
						if(state != pre_state){
							var w = this.screenwidth
							this.config['ribbon-scale'] = w
							this.screenwidth = this.config['single-image-scale'] || w
						}

					// ribbon mode -- restore original image size...
					} else {
						this.ribbons.viewer.find('.image:not(.clone)').css({
							width: '',
							height: ''
						})

						// update scale...
						if(state != pre_state){
							var w = this.screenwidth
							this.config['single-image-scale'] = w
							this.screenwidth = this.config['ribbon-scale'] || w
						}
					}
				}
			}],
	],
})


var SingleImageViewLocalStorage =
module.SingleImageViewLocalStorage = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-single-image-view-local-storage',
	depends: [
		'ui-single-image-view',
		'config-local-storage',
	],

	handlers:[
		// set scale...
		['load',
			function(){
				// prevent this from doing anything while no viewer...
				if(!this.ribbons || !this.ribbons.viewer || this.ribbons.viewer.length == 0){
					return
				}

				if(this.toggleSingleImage('?') == 'on'){
					this.screenwidth = this.config['single-image-scale'] || this.screenwidth

				} else {
					this.screenwidth = this.config['ribbon-scale'] || this.screenwidth
				}
			}],
	],
})



//---------------------------------------------------------------------

// This will store/restore autohide state for single-image and ribbon 
// views...
//
// NOTE: chrome 49 + devtools open appears to prevent the cursor from being hidden...
//
// XXX hiding cursor on navigation for some reason does not work...
var SingleImageAutoHideCursor = 
module.SingleImageAutoHideCursor = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-single-image-view-autohide-cursor',
	depends: [
		'ui-autohide-cursor',
		'ui-single-image-view',
	],

	config: {
		'cursor-autohide-single-image-view': 'on',
		'cursor-autohide-ribbon-view': 'off',

		//'cursor-autohide-on-navigate': true, 
	},

	handlers: [
		// setup...
		['load',
			function(){
				var mode = this.toggleSingleImage('?') == 'on' ? 
					'cursor-autohide-single-image-view'
					: 'cursor-autohide-ribbon-view'

				this.toggleAutoHideCursor(this.config[mode] || 'off')
			}],
		// store state for each mode...
		['toggleAutoHideCursor',
			function(){
				var mode = this.toggleSingleImage('?') == 'on' ? 
					'cursor-autohide-single-image-view'
					: 'cursor-autohide-ribbon-view'

				this.config[mode] = this.toggleAutoHideCursor('?')
			}],
		// restore state per mode...
		['toggleSingleImage', 
			function(){
				if(this.toggleSingleImage('?') == 'on'){
					this.toggleAutoHideCursor(this.config['cursor-autohide-single-image-view'])

				} else {
					this.toggleAutoHideCursor(this.config['cursor-autohide-ribbon-view'])
				}
			}],
		/* XXX for some reason this does not work...
		// autohide on navigation...
		['focusImage', 
			function(){
				//if(this.config['cursor-autohide-on-navigate'] 
				//		&& this.toggleAutoHideCursor('?') == 'on'){
				//	this.toggleAutoHideCursor('on')
				//}
				if(this.config['cursor-autohide-on-navigate'] 
						&& this.toggleAutoHideCursor('?') == 'on'
						&& this.ribbons.viewer.prop('cursor-autohide')){
					this.ribbons.viewer
						.addClass('cursor-hidden')
				}
			}],
		*/
	]
})



//---------------------------------------------------------------------

core.ImageGridFeatures.Feature('ui-single-image', [
	'ui-single-image-view',
	'ui-single-image-view-local-storage',

	'ui-single-image-view-autohide-cursor',
])




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var toggler = require('lib/toggler')
var actions = require('lib/actions')
var features = require('lib/features')

var core = require('features/core')
var base = require('features/base')

var widgets = require('features/ui-widgets')

var browse = require('lib/widget/browse')
var overlay = require('lib/widget/overlay')



/*********************************************************************/

// NOTE: this uses ui-chrome-hidden workspace to set the initial state
// 		of the slideshow workspace.
//
// XXX would be a good idea to add provision for a timer to indicate 
// 		slideshow progress/status... 
// 			- make this a separate feature with a toggler
var SlideshowActions = actions.Actions({
	config: {
		'slideshow-looping': 'on',
		'slideshow-direction': 'forward',
		'slideshow-interval': '3s',
		'slideshow-interval-max-count': 7,

		'slideshow-intervals': [
			'0.2s',
			'1s',
			'3s',
			'5s',
			'7s',
		],
	},

	resetSlideshowWorkspace: ['Slideshow/Reset workspace',
		function(){ delete this.workspaces['slideshow'] }],

	slideshowIntervalDialog: ['Slideshow/Slideshow interval...',
		widgets.makeUIDialog(function(parent){
			var that = this
			var dialog = widgets.makeConfigListEditor(
				that, 
				'slideshow-intervals',
				'slideshow-interval', 
				{
					length_limit: that.config['slideshow-interval-max-count'],
					check: Date.str2ms,
					unique: Date.str2ms,
					sort: function(a, b){
						return Date.str2ms(a) - Date.str2ms(b) },
				})
				.on('start', function(){
					// suspend the timer if it's not suspended outside...
					this.__slideshouw_timer == 'suspended'
						|| this.suspendSlideshowTimer()
				})
				.on('close', function(){
					// reset the timer if it was not suspended outside...
					this.__slideshouw_timer == 'suspended'
						|| that.resetSlideshowTimer()

					if(parent){
						var txt = parent.select('!').find('.text').first().text()

						parent.update()
							.then(function(){ 
								txt != ''
									&& parent.select(txt)
							})
					}
				})
			return dialog
		})],
	slideshowDialog: ['Slideshow/Slideshow...',
		widgets.makeUIDialog(function(){
			var that = this

			// suspend the timer if it's not suspended outside...
			var suspended_timer = this.__slideshouw_timer == 'suspended'
			suspended_timer || this.suspendSlideshowTimer()

			// XXX might be a good idea to make this generic...
			var _makeToggleHandler = function(toggler){
				return function(){
					var txt = $(this).find('.text').first().text()
					that[toggler]()
					o.update()
						.then(function(){ o.select(txt) })
					that.toggleSlideshow('?') == 'on' 
						&& o.close()
				}
			}

			var o = browse.makeLister(null, function(path, make){
					make(['$Interval: ', 
							function(){ return that.config['slideshow-interval'] }])
						.on('open', function(){
							that.slideshowIntervalDialog(make.dialog) })

					make(['$Direction: ', 
							function(){ return that.config['slideshow-direction'] }])
						.on('open', _makeToggleHandler('toggleSlideshowDirection'))
					make(['$Looping: ', 
							function(){ return that.config['slideshow-looping'] }])
						.on('open', _makeToggleHandler('toggleSlideshowLooping'))

					// Start/stop...
					make([function(){ 
							return that.toggleSlideshow('?') == 'on' ? '$Stop' : '$Start' }])
						.on('open', function(){
							that.toggleSlideshow()
							o.close()
						})
				},
				{
					path: that.toggleSlideshow('?') == 'on' ? 'Stop' : 'Start',
					cls: 'table-view tail-action',
				})
				.on('close', function(){
					// reset the timer if it was not suspended outside...
					suspended_timer 
						|| that.resetSlideshowTimer()
				})

			return o
		})],
	
	toggleSlideshowDirection: ['- Slideshow/Slideshow direction',
		core.makeConfigToggler('slideshow-direction', ['forward', 'reverse'])],
	toggleSlideshowLooping: ['- Slideshow/Slideshow looping',
		core.makeConfigToggler('slideshow-looping', ['on', 'off'])],

	toggleSlideshow: ['Slideshow/Slideshow quick toggle',
		toggler.CSSClassToggler(
			function(){ return this.ribbons.viewer }, 
			'slideshow-running',
			function(state){
				// start...
				if(state == 'on'){
					var that = this

					// reset the timer...
					// NOTE: this means we were in a slideshow mode so we do not
					// 		need to prepare...
					if(this.__slideshouw_timer){
						this.__slideshouw_timer != 'suspended'
							&& clearInterval(this.__slideshouw_timer)
						delete this.__slideshouw_timer

					// prepare for the slideshow...
					} else {
						// single image mode...
						this.toggleSingleImage('on')

						// save current workspace...
						this.pushWorkspace()

						// construct the slideshow workspace if it does
						// not exist...
						//
						// NOTE: this is partially redundant with the 
						// 		loadWorkspace.pre handler in the feature...
						if(this.workspaces['slideshow'] == null){
							this.loadWorkspace('ui-chrome-hidden') 
							this.saveWorkspace('slideshow') 
						}

						// load the slideshow workspace...
						this.loadWorkspace('slideshow')
					}

					// disable getting in/out of single image mode via clicks... 
					if(this.config['single-image-toggle-on-click']){
						this.config['single-image-toggle-on-click'] = false
					}

					// start the timer... 
					this.__slideshouw_timer = setInterval(function(){
						var cur = that.current

						// next step...
						that.config['slideshow-direction'] == 'forward' ?
							that.nextImage()
							: that.prevImage()

						// we have reached the end...
						if(that.current == cur){
							// loop...
							if(that.config['slideshow-looping'] == 'on'){
								that.config['slideshow-direction'] == 'forward' ?
									that.firstImage()
									: that.lastImage()

							// stop...
							} else {
								that.toggleSlideshow('off')
							}
						}
					}, Date.str2ms(this.config['slideshow-interval'] || '3s'))

				// stop...
				} else {
					// stop timer...
					this.__slideshouw_timer
						&& clearInterval(this.__slideshouw_timer)
					delete this.__slideshouw_timer

					// restore the original workspace...
					this.popWorkspace()
				}
			})],

	// NOTE: these can be used as pause and resume...
	resetSlideshowTimer: ['- Slideshow/Reset slideshow timer',
		function(){
			this.__slideshouw_timer && this.toggleSlideshow('on')
		}],
	suspendSlideshowTimer: ['- Slideshow/Suspend slideshow timer',
		function(){
			if(this.__slideshouw_timer){
				clearInterval(this.__slideshouw_timer)
				this.__slideshouw_timer = 'suspended'
			}
		}],
})


var Slideshow = 
module.Slideshow = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-slideshow',
	depends: [
		'ui',
		'ui-single-image',
	],

	actions: SlideshowActions,

	handlers: [
		// add a placeholder for slideshow workspace, this is to make the
		// workspace toggler show it as one of the options...
		//
		// NOTE: the slideshow workspace will get populated either on 
		// 		loading it for the first time or on first running a 
		// 		slideshow...
		['start',
			function(){ 
				if(this.workspaces['slideshow'] == null){
					this.workspaces['slideshow'] = null
				} 
			}],

		// - build the slideshow workspace for the first time if it's not
		// 		present yet (is null)...
		// - restore .config['single-image-toggle-on-click']
		['loadWorkspace.pre',
			function(workspace){
				// going out of slideshow -> restore settings...
				var data = this.workspaces[workspace] || {} 
				if(this.workspace == 'slideshow'){
					if(!('single-image-toggle-on-click' in data)){
						delete this.config['single-image-toggle-on-click']

					} else {
						this.config['single-image-toggle-on-click'] = 
							data['single-image-toggle-on-click']
					}
				}

				// going into slideshow for first time -> setup...
				if(workspace == 'slideshow' && this.workspaces['slideshow'] == null){
					return function(){
						this.loadWorkspace('ui-chrome-hidden') 
						this.saveWorkspace('slideshow') 
					}
				}
			}],

		// do not leave the viewer in slideshow mode...
		['stop',
			function(){ this.toggleSlideshow('off') }]
	],
})



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

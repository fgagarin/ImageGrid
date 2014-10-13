/**********************************************************************
* 
*
*
**********************************************************************/

window.nodejs = (typeof(process) === 'object' && process.features.uv) 
	? {
		require: window.require,
	} 
	: null


define(function(require){ var module = {}
console.log('>>> ui')

//var DEBUG = DEBUG != null ? DEBUG : true

var keyboard = require('lib/keyboard')
var doc = keyboard.doc

// compatibility...
var browser = require('browser')
var nw = require('nw')

// XXX load only the actualy used here modules...
var actions = require('actions')
var data = require('data')
var ribbons = require('ribbons')


// XXX 
var testing = require('testing')


var client = require('client')

var viewer = require('viewer')



/*********************************************************************/

// XXX add this to the global doc...
module.GLOBAL_KEYBOARD = {
	'Global bindings': {
		doc: 'NOTE: binding priority is the same as the order of sections '+
			'on this page.',
		pattern: '*',

		F4: {
			alt: doc('Close viewer', 
				function(){ 
					window.close() 
					return false
				}),
		},
		F5: doc('Full reload viewer', 
			function(){ 
				/*
				killAllWorkers()
					.done(function(){
						reload() 
					})
				*/
				location.reload()
				return false
			}),
		F12: doc('Show devTools', 
			function(){ 
				if(window.showDevTools != null){
					showDevTools() 
					return false

				// if no showDevTools defined pass the button further...
				} else {
					return true
				}
			}),
		// NOTE: these are for systems where F** keys are not available 
		// 		or do other stuff...
		R: {
			/*
			'ctrl+alt': doc('Reload viewer', 
				function(){ 
					reloadViewer() 
					return false
				}),
			*/
			'ctrl+shift': 'F5',

			// XXX testing...
			ctrl: function(){ 
				event.preventDefault()
				a.reverseImages() 
			},
		},
		P: {
			'ctrl+shift': 'F12',
		},

		// NOTE: this is handled by the wrapper at this point, so we do 
		// 		not have to do anything here...
		F11: doc('Toggle full screen view', function(){ 
				toggleFullscreenMode() 
				return false
			}),
		F: {
			ctrl: 'F11',
		},

		// XXX testing...
		Home: function(){ a.firstImage() },
		End: function(){ a.lastImage() },
		Left: {
			default: function(){ a.prevImage() },
			alt: function(){ 
				event.preventDefault()
				a.shiftImageLeft() 
			},
		},
		Right: {
			default: function(){ a.nextImage() },
			alt: function(){ 
				event.preventDefault()
				a.shiftImageRight() 
			},
		},
		Up: {
			default: function(){ a.prevRibbon() },
			shift: function(){ a.shiftImageUp() },
			'ctrl+shift': function(){ a.shiftImageUpNewRibbon() },
		},
		Down: {
			default: function(){ a.nextRibbon() },
			shift: function(){ a.shiftImageDown() },
			'ctrl+shift': function(){ a.shiftImageDownNewRibbon() },
		},
		'#0': function(){ a.fitImage(20) },
		'#1': function(){ a.fitOrig() },
		'#2': function(){ a.fitTwo() },
		'#3': function(){ a.fitThree() },
		'#4': function(){ a.fitFour() },
		'#5': function(){ a.fitFive() },
		

	},
}	



/*********************************************************************/

$(function(){
	// setup base keyboard for devel, in case something breaks...
	$(document)
		.keydown(
			keyboard.makeKeyboardHandler(
				module.GLOBAL_KEYBOARD,
				function(k){
					window.DEBUG && console.log(k)
				}))

	window.a = testing.setupActions()

	viewer.Animation.setup(a)
})



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

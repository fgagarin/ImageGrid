/**********************************************************************
* 
*
*
**********************************************************************/
// Pre-setup...

// Add node_modules path outside of the packed nwjs code...
//
// This keeps the large node module set outside the zip thus speeding
// up the loading process significantly...
if((typeof(process) != 'undefined' ? process : {}).__nwjs){
	var path = require('path')
	require('app-module-path')
		.addPath(path.dirname(process.execPath) + '/node_modules/')
}


// Setup requirejs if we are in node/nw...
//
// NOTE: no need to do this in browser...
//
// XXX this will create a second requirejs instance with node 
// 		compatibility...
// 		...would be nice if we could avoid this...
// XXX setting nodeRequire on existing requirejs will change how 
// 		everything is loaded...
if(typeof(process) != 'undefined'){
	var requirejs = 
	global.requirejs = 
	window.requirejs = 
		require('requirejs')

	var nodeRequire =
	global.nodeRequire = 
	window.nodeRequire =
		require
}


/*********************************************************************/

define(function(require){ var module = {}
//requirejs(['viewer'], function(viewer){

//var DEBUG = DEBUG != null ? DEBUG : true

var viewer = require('viewer')



/*********************************************************************/

$(function(){

	// list all loaded modules...
	var m = requirejs.s.contexts._.defined
	m = Object.keys(m).filter(function(e){ return m[e] != null })
	console.log('Modules (%d):', m.length, m)


	// setup actions...
	window.ig = 
	window.ImageGrid = 
		viewer.ImageGridFeatures
			.setup([
				'viewer-testing',

				'demo',

				// XXX this is not for production...
				'experiments',

				// XXX BUG: disabling features on this level does not 
				// 		work, yet works deeper down...
				// 			Example:
				// 				'-ui' // will throw an error:
				// 					  //	Feature "-ui" not loaded...
			])


	// used to switch experimental actions on (set to true) or off (unset or false)...
	//ig.experimental = true


	// report stuff...
	// XXX we also have .conflicts and .missing
	ig.features.excluded.length > 0 
		&& console.warn('Features excluded (%d):',
			ig.features.excluded.length, 
			ig.features.excluded)
	ig.features.disabled.length > 0 
		&& console.log('Features disabled (%d):',
			ig.features.disabled.length, 
			ig.features.disabled)
	console.log('Features not applicable (%d):', 
		ig.features.unapplicable.length, 
		ig.features.unapplicable)
	console.log('Features loaded (%d):',
		ig.features.features.length, 
		ig.features.features)

	ig.logger = ig.logger || {emit: function(e, v){ console.log('    ', e, v) }}


	// setup the viewer...
	ig
		.load({ viewer: $('.viewer') })
		.start()


	// load some testing data if nothing else loaded...
	if(!ig.url_history || Object.keys(ig.url_history).length == 0){
		// NOTE: we can (and do) load this in parts...
		ig.loadDemoIndex()

			// this is needed when loading legacy sources that do not have tags
			// synced...
			// do not do for actual data...
			//.syncTags()
	}
})



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })
//})

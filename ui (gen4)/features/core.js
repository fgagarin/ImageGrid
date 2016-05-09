/**********************************************************************
* 
* Core features that setup the life-cycle and the base interfaces for 
* features to use...
*
*
**********************************************************************/

define(function(require){ var module = {}

//var DEBUG = DEBUG != null ? DEBUG : true

var actions = require('lib/actions')
var features = require('lib/features')
var toggler = require('lib/toggler')



/*********************************************************************/

var protocolAction =
module.protocol = function(protocol, func){
	return function(){
		this[protocol].chainCall(this, func, arguments)
	}
}


// NOTE: if not state is set this assumes that the first state is the 
// 		default...
var makeConfigToggler = 
module.makeConfigToggler = 
function(attr, states, a, b){

	var pre = a
	var post = b || function(action){ action != null && this.focusImage() }

	return toggler.Toggler(null,
		function(_, action){
			var lst = states.constructor === Array ? states : states.call(this)

			//console.log('action', action)

			if(action == null){
				return this.config[attr] || lst[lst.indexOf('none')] || lst[0]

			} else {
				this.config[attr] = action
				//this.focusImage()
			}
		},
		states, pre, post)
}



/*********************************************************************/

// Root ImageGrid.viewer object...
//
var ImageGridFeatures =
module.ImageGridFeatures = Object.create(features.FeatureSet)


//---------------------------------------------------------------------
// Setup runtime info...

// nw or node...
if(typeof(process) != 'undefined'){

	// nw.js 0.13+
	if(typeof(nw) != 'undefined'){
		ImageGridFeatures.runtime = 'nw'

		// NOTE: jli is patching the Date object and with two separate 
		// 		instances we'll need to sync things up...
		// XXX HACK: if node and chrome Date implementations ever 
		// 		significantly diverge this will break things + this is 
		// 		a potential data leak between contexts...
		//global.Date = window.Date

		// XXX this is less of a hack but it is still an implicit
		patchDate(global.Date)
		patchDate(window.Date)

	// node...
	} else {
		ImageGridFeatures.runtime = 'node'

		// XXX patch Date...
		// XXX this will not work directly as we will need to explicitly
		// 		require jli...
		//patchDate(global.Date)
	}

// browser...
// NOTE: we're avoiding detecting browser specifics for as long as possible,
// 		this will minimize the headaches of supporting several non-standard
// 		versions of code...
} else if(typeof(window) != 'undefined'){
	ImageGridFeatures.runtime = 'browser'

// unknown...
// XXX do we need to detect chrome app???
} else {
	ImageGridFeatures.runtime = 'unknown'
}



/*********************************************************************/
// System life-cycle...

// XXX should this be a generic library thing???
// XXX should his have state???
// 		...if so, should this be a toggler???
var LifeCycleActions = actions.Actions({
	start: ['- System/', 
		function(){
			var that = this
			this.logger && this.logger.emit('start')

			// NOTE: jQuery currently provides no way to check if an event
			// 		is bound so we'll need to keep track manually...
			if(this.__stop_handler == null){
				var stop = this.__stop_handler = function(){ that.stop() }

			} else {
				return
			}

			// set the runtime...
			var runtime = this.runtime = ImageGridFeatures.runtime

			// nw.js...
			if(runtime == 'nw'){
				// this handles both reload and close...
				$(window).on('beforeunload', stop)

				// NOTE: we are using both events as some of them do not
				// 		get triggered in specific conditions and some do,
				// 		for example, this gets triggered when the window's
				// 		'X' is clicked while does not on reload...
				this.__nw_stop_handler = function(){
					var w = this
					try{
						that
							// wait till ALL the handlers finish before 
							// exiting...
							.on('stop.post', function(){
								// XXX might be broken in nw13 -- test!!!
								//w.close(true)
								nw.App.quit()
							})
							.stop()

					// in case something breaks exit...
					// XXX not sure if this is correct...
					} catch(e){
						this.close(true)
					}
				}
				nw.Window.get().on('close', this.__nw_stop_handler)

			// node.js...
			} else if(runtime == 'node'){
				process.on('exit', stop)

			// browser...
			} else if(runtime == 'browser'){
				$(window).on('beforeunload', stop)

			// other...
			} else {
				// XXX
			}
		}],
	// unbind events...
	stop: ['- System/', 
		function(){
			// browser & nw...
			if(this.__stop_handler 
					&& (this.runtime == 'browser' || this.runtime == 'nw')){
				$(window).off('beforeunload', this.__stop_handler)
			}

			// nw...
			if(this.__nw_stop_handler && this.runtime == 'nw'){
				//nw.Window.get().off('close', this.__nw_stop_handler)
				delete this.__nw_stop_handler
			}

			// node...
			/* XXX there's no process.off(...)
			if(this.__stop_handler && this.runtime == 'node'){
				process.off('exit', this.__stop_handler)
			}
			*/

			delete this.__stop_handler

			this.logger && this.logger.emit('stop')
		}],

	/*
	// XXX need a clear protocol for this...
	// 		something like:
	// 			- clear state
	// 			- load state
	reset: ['System/',
		function(){
		}],
	*/
})

var LifeCycle = 
module.LifeCycle = ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'lifecycle',
	priority: 'high',

	actions: LifeCycleActions,
})



//---------------------------------------------------------------------
// Introspection...

// Indicate that an action is not intended for direct use...
//
// NOTE: this will not do anything but mark the action.
var notUserCallable =
module.notUserCallable = function(func){
	func.__not_user_callable__ = true
	return func
}


var IntrospectionActions = actions.Actions({
	// user-callable actions...
	get useractions(){
		return this.actions.filter(this.isUserCallable.bind(this)) },

	// check if action is callable by user...
	isUserCallable: ['- System/',
		actions.doWithRootAction(function(action){
			return action.__not_user_callable__ != true })],
})


var Introspection = 
module.Introspection = ImageGridFeatures.Feature({
	title: '',

	tag: 'introspection',

	actions: IntrospectionActions,
})



//---------------------------------------------------------------------
// Workspace...
//
// Basic protocol:
// 	A participating feature should:
// 	- react to .saveWorkspace(..) by saving it's relevant state data to the 
// 		object returned by the .saveWorkspace() action.
// 		NOTE: it is recommended that a feature save its relevant .config
// 			data as-is.
// 		NOTE: no other action or state change should be triggered by this.
// 	- react to .loadWorkspace(..) by loading it's state from the returned
// 		object...
// 		NOTE: this can be active, i.e. a feature may call actions when 
// 			handling this.
// 	- react to .toggleChrome(..) and switch on and off the chrome 
// 		visibility... (XXX)
//
//


// Helpers...
var makeWorkspaceConfigWriter =
module.makeWorkspaceConfigWriter = function(keys, callback){
	return function(workspace){
		var that = this

		keys = typeof(keys) == typeof(function(){}) ? keys() : keys

		// store statusbar data...
		keys.forEach(function(key){
			workspace[key] = JSON.parse(JSON.stringify(that.config[key]))
		})

		callback && callback.call(this, workspace)
	}
}

// XXX should this delete a prop if it's not in the loading workspace???
var makeWorkspaceConfigLoader =
module.makeWorkspaceConfigLoader = function(keys, callback){
	return function(workspace){
		var that = this

		keys = typeof(keys) == typeof(function(){}) ? keys() : keys

		// load statusbar data...
		keys.forEach(function(key){
			// the key exists...
			if(key in workspace){
				that.config[key] = JSON.parse(JSON.stringify(workspace[key]))

			// no key set...
			// XXX is this the right way to go???
			} else {
				delete that.config[key]
			}
		})

		callback && callback.call(this, workspace)
	}
}



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var WorkspaceActions = actions.Actions({
	config: {
		'load-workspace': 'default',

		'workspace': 'default',
		'workspaces': {},
	},

	get workspace(){
		return this.config.workspace
	},
	set workspace(value){
		this.loadWorkspace(value)
	},

	get workspaces(){
		return this.config.workspaces
	},


	getWorkspace: ['- Workspace/',
		function(){ return this.saveWorkspace(null) }],

	// NOTE: these are mainly triggers for other features to save/load
	// 		their specific states...
	// NOTE: handlers should only set data on the workspace object passively,
	// 		no activity is recommended.
	// NOTE: if null is passed this will only get the data, but will 
	// 		save nothing. this us useful for introspection and temporary
	// 		context storage.
	//
	// XXX for some reason this does not get saved with .config...
	saveWorkspace: ['Workspace/Save Workspace',
		function(name){
			if(!this.config.hasOwnProperty('workspaces')){
				this.config['workspaces'] = JSON.parse(JSON.stringify(this.config['workspaces']))
			}

			var res = {}

			if(name !== null){
				this.config['workspaces'][name || this.config.workspace] = res
			}

			return res
		}],
	// NOTE: merging the state data is the responsibility of the feature
	// 		...this is done so as not to restrict the feature to one 
	// 		specific way to do stuff...
	loadWorkspace: ['Workspace/Load Workspace',
		function(name){
			name = name || this.config.workspace

			// get a workspace by name and load it...
			if(typeof(name) == typeof('str')){
				this.config.workspace = name

				return this.workspaces[name] || {}

			// we got the workspace object...
			} else {
				return name
			}
		}],

	// NOTE: this will not save the current workspace...
	toggleWorkspace: ['Workspace/Toggle Workspace',
		makeConfigToggler('workspace',
			function(){ return Object.keys(this.config['workspaces']) },
			function(state){ this.loadWorkspace(state) })],

	// XXX should we keep the stack unique???
	pushWorkspace: ['- Workspace/',
		function(name){
			name = name || this.workspace
			var stack = this.__workspace_stack = this.__workspace_stack || []

			this.saveWorkspace()

			if(stack.slice(-1)[0] == name){
				return
			}

			this.workspace != name && this.loadWorkspace(name)
			stack.push(name)
		}],
	popWorkspace: ['- Workspace/',
		function(){
			var stack = this.__workspace_stack

			if(!stack || stack.length == 0){
				return
			}

			this.saveWorkspace()
			this.loadWorkspace(stack.pop())
		}],
})


var Workspace = 
module.Workspace = ImageGridFeatures.Feature({
	title: '',

	tag: 'workspace',

	depends: [
		'lifecycle',
	],

	actions: WorkspaceActions,

	handlers: [
		['start', 
			function(){ 
				this.loadWorkspace(this.config['load-workspace'] || 'default') }],
		['stop', 
			function(){ 
				this.saveWorkspace() }],
	],
})



//---------------------------------------------------------------------
// Tasks...
// XXX should this be a separate module???

var tasks = require('lib/tasks')

// XXX see if a protocol can be practical here to:
// 		- serialize/restore jobs
// 		- ...
var TaskActions = actions.Actions({
	config: {
	},

	get jobs(){
		return this.__jobs
	},

	getJob: ['- Jobs/',
		function(name){
			name = name || this.data.newGid()

			// get/init task dict...
			var t = this.__jobs = this.__jobs || {}
			// get/init task...
			var job = t[name] = t[name] || tasks.Queue()
			job.name = name

			return job
		}],

	// XXX stop
})


var Tasks = 
module.Tasks = ImageGridFeatures.Feature({
	title: '',

	tag: 'tasks',

	depends: [ ],

	actions: TaskActions,

	handlers: [
		['start', 
			function(){ 
				// XXX prepare for recovery and recover...
			}],
		['stop', 
			function(){ 
				// XXX stop tasks and prepare for recovery...
			}],
	],
})



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

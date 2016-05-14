/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}

//var DEBUG = DEBUG != null ? DEBUG : true

var keyboard = require('lib/keyboard')
var actions = require('lib/actions')
var features = require('lib/features')

var data = require('data')
var images = require('images')
var ribbons = require('ribbons')

var core = require('features/core')
var base = require('features/base')

var widget = require('lib/widget/widget')
var browse = require('lib/widget/browse')
var overlay = require('lib/widget/overlay')
var drawer = require('lib/widget/drawer')

var browseWalk = require('lib/widget/browse-walk')



/*********************************************************************/

// XXX make the selector more accurate...
// 		...at this point this will select the first elem with text which
// 		can be a different elem...
var makeEditableItem =
module.makeEditableItem =
function(list, item, elem, callback, options){
	return elem
		.makeEditable({
			clear_on_edit: false,
		})
		.on('edit-done', callback || function(){})
		.on('edit-aborted edit-done', function(_, text){
			list.update()
				// XXX make the selector more accurate...
				// 		...at this point this will select the first elem
				// 		with text which can be a different elem...
				.then(function(){ list.select(item.text()) })
		})
}


//
// Options format:
// 	{
// 		new_button: <text>|<bool>,
//
// 		length_limit: <number>,
//
// 		// check input value...
// 		check: function(value){ ... },
//
// 		// if true only unique values will be stored...
// 		// if a function this will be used to normalize the values before
// 		// uniqueness check is performed...
// 		unique: <bool>|function(value){ ... },
//
// 		// if true sort values...
// 		// if function will be used as cmp for sorting...
// 		sort: <bool> || function(a, b){ ... },
//
// 		// this is called when a new value is added via new_button but 
// 		// list length limit is reached...
// 		callback: function(selected){ ... },
//
// 		// see: itemButtons doc in browse.js for more info...
// 		itemButtons: [..]
// 	}
//
// XXX add sort buttons: up/down/top/bottom...
// XXX make this more generic...
// XXX currently using this also requires the use of makeUIDialog(..),
// 		can this be simpler???
var makeConfigListEditor = 
module.makeConfigListEditor =
function(actions, list_key, options){
	options = options || {}

	var new_button = options.new_button
	new_button = new_button === true ? 'New...' : new_button

	var _makeEditable = function(elem){
		return $(elem).find('.text')
			.makeEditable()
			.on('edit-aborted', function(){
				list.update()
			})
			.on('edit-done', function(evt, text){
				var txt = $(this).text()

				// invalid format...
				if(options.check && !options.check(txt)){
					list.update()
					return
				}

				// list length limit
				if(options.length_limit 
					&& (lst.length >= options.length_limit)){

					options.callback && options.callback.call(list, txt)

					return
				}

				// prevent editing non-arrays...
				if(!(actions.config[list_key] instanceof Array)){
					return
				}

				// save the new version...
				actions.config[list_key] = actions.config[list_key].slice()
				// add new value and sort list...
				actions.config[list_key]
					.push(txt)

				// unique...
				if(options.unique == null || options.unique === true){
					actions.config[list_key] = actions.config[list_key]
						.unique()

				// unique normalized...
				} else if( typeof(options.unique) == typeof(function(){})){
					actions.config[list_key] = actions.config[list_key]
						.unique(options.unique) 
				}

				// sort...
				if(options.sort){
					actions.config[list_key] = actions.config[list_key]
						.sort(typeof(options.sort) == typeof(function(){}) ? 
							options.sort 
							: undefined)
				}

				// update the list data...
				list.options.data 
					= actions.config[list_key]
						.concat(new_button ? [ new_button ] : [])

				// update list and select new value...
				list.update()
					.done(function(){
						list.select('"'+txt+'"')
					})
			})
	}

	var to_remove = []

	var lst = actions.config[list_key]
	lst = lst instanceof Array ? lst : Object.keys(lst)

	var list = browse.makeList(null, 
			lst.concat(new_button ? [ new_button ] : []), 
			{
				path: options.path,
				itemButtons: options.itemButtons || [
					// mark for removal...
					['&times;', 
						function(p){
							var e = this.filter('"'+p+'"', false)
								.toggleClass('strike-out')

							if(e.hasClass('strike-out')){
								to_remove.indexOf(p) < 0 
									&& to_remove.push(p)

							} else {
								var i = to_remove.indexOf(p)
								if(i >= 0){
									to_remove.splice(i, 1)
								}
							}
						}],
					// XXX add shift up/down/top/bottom and other buttons (optional)...
				]
			})
		// select the new_button item...
		.on('select', function(evt, elem){
			if(new_button && $(elem).find('.text').text() == new_button){
				_makeEditable(elem)
			}
		})
		// restore striked-out items...
		.on('update', function(){
			to_remove.forEach(function(e){
				list.filter('"'+ e +'"')
					.toggleClass('strike-out')
			})
		})
		.open(function(evt, path){
			// we clicked the 'New' button -- select it...
			if(new_button && (path == new_button || path == '')){
				list.select(new_button)

			} else {
				options.callback && options.callback.call(list, path)
			}
		})
		.on('close', function(){
			// prevent editing non-arrays...
			if(!(actions.config[list_key] instanceof Array)){
				return
			}

			// remove striked items...
			to_remove.forEach(function(e){
				var lst = actions.config[list_key].slice()
				lst.splice(lst.indexOf(e), 1)

				actions.config[list_key] = lst
			})

			// sort...
			if(options.sort){
				actions.config[list_key] = actions.config[list_key]
					.sort(options.sort !== true ? options.sort : undefined)
			}
		})
	
	new_button && list.dom.addClass('tail-action')

	return list
}


// XXX should this be more generic...
// XXX currently using this also requires the use of makeUIDialog(..),
// 		can this be simpler???
var makeNestedConfigListEditor = 
module.makeNestedConfigListEditor =
function(actions, list, list_key, value_key, options){
	options = options || {}

	return function(){
		var txt = $(this).find('.text').first().text()

		var dfl_options = {
			new_button: 'New...',
			length_limit: 10,
			// NOTE: this is called when adding a new value and 
			// 		list maximum length is reached...
			callback: function(value){
				if(typeof(value_key) == typeof(function(){})){
					value_key(value)
				} else {
					actions.config[value_key] = value
				}

				o.parent.close()
			},
		}
		options.__proto__ = dfl_options

		var o = makeConfigListEditor(actions, list_key, options)

		// update slideshow menu...
		o.open(function(){
			list.update()
			list.select(txt)
		})

		actions.Overlay(o)

		setTimeout(function(){
			if(typeof(value_key) == typeof(function(){})){
				o.select(value_key())

			} else {
				o.select(actions.config[value_key])
			}
		}, 0)
	}
}



/*********************************************************************/
// Dialogs and containers...

// Mark an action as a container...
//
// NOTE: the marked action must comply with the container protocol
// 		(see: makeUIContainer(..) for more info)
var uiContainer =
module.uiContainer = function(func){
	func.__container__ = true
	return func
}

// Make a container constructor wrapper...
//
// This will:
// 	- mark the action as a container
//
// The container will:
// 	- trigger the client's close event on close
//
// XXX not sure how the click is handled here...
// XXX pass options???
var makeUIContainer =
module.makeUIContainer = function(make){
	return uiContainer(function(){
		var that = this
		var o = make.apply(this, arguments)

		o
			// notify the client that we are closing...
			.close(function(){ o.client.trigger('close') })
			.client
				// NOTE: strictly this is the responsibility of the client
				// 		but it is less error prone to just in case also do
				// 		this here...
				.on('close', function(evt){ evt.stopPropagation() })
				// Compensate for click focusing the parent dialog when
				// a child is created...
				// XXX is this the right way to go???
				.on('click', function(evt){ that.modal.focus() })

		return o
	})
}


// Mark action as a dialog...
//
var uiDialog =
module.uiDialog = function(func){
	func.__dialog__ = true
	return func
}

// Make a dialog constructor wrapper...
//
// 	Make a dialog action...
// 	 makeUIDialog(constructor)
// 	 makeUIDialog(constructor, ...)
// 		-> dialog
//
//	Make a dialog action with a specific default container...
// 	 makeUIDialog(container, constructor)
// 	 makeUIDialog(container, constructor, ...)
// 		-> dialog
//
//
// This dialog will:
// 	- consume the first action argument if it's a container name to 
// 		override the default container...
// 	- if no container defined explicitly the default container is used
//
//
// NOTE: arguments after the constructor will be passed to the container.
//
// XXX do we need a means to reuse containers, e.g. ??? 
var makeUIDialog =
module.makeUIDialog = function(a, b){
	var args = [].slice.call(arguments)

	// container name (optional)...
	var dfl = typeof(args[0]) == typeof('str') ?
			args.shift()
			: null
	// constructor...
	var make = args.shift()
	// rest of the args to be passed to the container...
	var cargs = args

	return uiDialog(function(){
		var args = [].slice.call(arguments)

		// see if the first arg is a container spec...
		var container = this.uiContainers.indexOf(args[0]) >= 0 ?
			args.shift()
			: (dfl || this.config['ui-default-container'] || 'Overlay')

		return this[container].apply(this, 
				[make.apply(this, args)].concat(cargs))
			.client
	})
}


var makeDrawer = function(direction){
	return makeUIContainer(function(dialog, options){
		var that = this
		var parent = (options || {}).parentElement 
		parent = parent ? $(parent) : this.ribbons.viewer 

		options.direction = direction || 'bottom'

		var d = drawer.Drawer(parent, dialog, options)
			// focus top modal on exit...
			.on('close', function(){
				var o = that.modal
				o && o.focus()	
			})

		// we need to clear other ui elements, like the status bar...
		// XXX is this the right way to go???
		d.dom.css({
			'z-index': 5000,
		})

		return d
	})
}



//---------------------------------------------------------------------

var DialogsActions = actions.Actions({
	config: {
		'ui-default-container': 'Overlay',
	},

	// a bit of introspection...
	get uiContainers(){ 
		return this.actions.filter(this.isUIContainer.bind(this)) },
	get uiDialogs(){
		return this.actions.filter(this.isUIDialog.bind(this)) },
	get uiElements(){ 
		return this.actions.filter(this.isUIElement.bind(this)) },

	// Get modal container...
	//
	// Protocol:
	// 	- get the last modal widgets (CSS selector: .modal-widget)
	// 	- return one of the following:
	// 		.data('widget-controller')
	// 		element
	// 		null
	get modal(){
		var modal = this.ribbons.viewer
			.find('.modal-widget')
				.last()
		return modal.data('widget-controller') 
			|| (modal.length > 0 && modal) 
			|| null
	},

	// testers...
	isUIContainer: ['- Interface/',
		actions.doWithRootAction(function(action){
			return action.__container__ == true })],
	isUIDialog: ['- Interface/',
		actions.doWithRootAction(function(action){
			return action.__dialog__ == true })],
	isUIElement: ['- Interface/',
		actions.doWithRootAction(function(action){
			return action.__dialog__ == true || action.__container__ == true })],


	// container constructors...
	Overlay: ['- Interface/',
		makeUIContainer(function(dialog, options){
			var that = this
			return overlay.Overlay(this.ribbons.viewer, dialog, options)
				// focus top modal on exit...
				.on('close', function(){
					var o = that.modal
					o && o.focus()	
				})
		})],

	Drawer: ['- Interface/',
		makeDrawer('bottom')],
	BottomDrawer: ['- Interface/',
		makeDrawer('bottom')],
	TopDrawer: ['- Interface/',
		makeDrawer('top')],


	// like panel but drop down from mouse location or specified position
	DropDown: ['- Interface/',
		makeUIContainer(function(dialog, options){
			// XXX
			console.error('Not yet implemented.')
		})],

	// XXX STUB -- need a real panel with real docking and closing 
	// 		ability... 
	// XXX need to:
	// 		- dock panels
	// 		- save panel state (position, collapse, dock, ...)
	// 		- restore panel state
	Panel: ['- Interface/',
		makeUIContainer(function(dialog, options){
			// XXX
			//console.error('Not yet implemented.')

			// minimal container...
			var panel = {
				client: dialog,
				dom: $('<div>')
					.append(dialog.dom || dialog)
					.appendTo(this.ribbons.viewer)
					.draggable(),
				close: function(func){
					if(func){
						this.dom.on('close', func)
					} else {
						this.dom.trigger('close')
						this.dom.remove()
					}
					return this
				},
			}

			dialog.on('blur', function(){
				panel.close()
			})

			return panel
		})],

	
	listDialogs: ['Interface/Dialog list...',
		makeUIDialog(function(){
			var actions = this

			return browse.makeLister(null, function(path, make){
				var that = this

				actions.uiDialogs.forEach(function(dialog){
					var doc = actions.getDoc(dialog)[dialog][0]
					var txt = ((doc
							.split(/[\\\/]/g)
							.pop() || ('.'+ dialog +'(..)'))
								// mark item as disabled...
								+ (/^- .*$/.test(doc) ? ' (disabled)' : ''))
						.replace(/^-?[0-9]+\s*:\s*/, '')
						.trim()
					make(txt)
						.on('open', function(){
							actions[dialog]()
						})
				})

				make.done()
			})
		})],
})

var Dialogs = 
module.Dialogs = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-dialogs',
	depends: [
		'ui',
	],

	actions: DialogsActions,

	handlers: [
		['__call__', 
			function(res, action){
				if(res instanceof jQuery || (res instanceof widget.Widget)){
					var elem = (res.dom || res)

					!elem.attr('title') && elem.attr('title',
						(this.getDoc(action)[action].shift() || action).split(/[\\\/]/g).pop())
				}
			}],
	],
})



/*********************************************************************/

// NOTE: yes, this is a funny name ;)
var BrowseActionsActions = actions.Actions({
	config: {
		'action-category-order': [
			'99:File',
				// NOTE: we can order any sub-tree we want in the same 
				// 		manner as the root...
				// XXX for some reason only one of the following works...
				'File/-80:Clear viewer',
				'File/-90:Close viewer',
			'80:Edit',
			'70:Navigate',
			'60:Image',

			'-50:Interface',
			'-60:Workspace',
			'-70:System',
			'-80:Development',
			'-90:Test',
		],

		'browse-actions-settings': {
			showDisabled: false,
			showEmpty: false,
		},
	},

	// Browse actions dialog...
	//
	// This uses action definition to build and present an action tree.
	//
	// This supports the following element syntax:
	// 	- leading '- ' in path to indicate disabled element.
	// 		Example: 
	// 			'- Path/To/Element'			(disabled)
	// 			'Path/To/Other element'		(enabled)
	//
	// 	- leading path element number followed by colon to indicate 
	// 	  element priority on level.
	// 		Example:
	// 			'Path/99: To/50:Element'
	// 	  NOTE: multiple path elements may have multiple priorities.
	// 	  NOTE: an item with positive priority will be above and item 
	// 	  		with less or no priority.
	// 	  NOTE: an item with negative priority will be below any item 
	// 	  		with greater or no priority.
	//
	//
	// NOTE: if the action returns an instance of overlay.Overlay this
	// 		will not close right away but rather bind to:
	// 			overlay.close			-> self.focus()
	// 			overlay.client.open		-> self.close()
	// NOTE: we are not using the browse.PathList(..) here as we need 
	// 		custom controls and special path handling...
	// NOTE: this will keep the first instance title it encounters, this
	// 		if a later instance includes a priority, it will be ignored.
	// 		This may happen if several actions are in the same path and
	// 		each one set a different priority in that path...
	// 		...to avoid this use .config['action-category-order'] to set
	// 		base order/priorities...
	//
	// XXX can we do a deep search on '/' -- find any nested action???
	browseActions: ['Interface/Actions...',
		makeUIDialog(function(path){
			var actions = this
			var priority = /^(-?[0-9]+)\s*:\s*/
			var dialog

			// Get item from tree level taking into account additional 
			// syntax like prioority...
			// returns:
			// 	[<existing-text>, <new-level>]
			var getItem = function(level, text){
				// direct match...
				if(text in level){
					return [text, level[text]]

				// check if it's a priority path... 
				} else {
					for(var e in level){
						if(e.replace(priority, '').trim() == text){
							return [e, level[e]]
						}
					}
				}
				return []
			}

			// Wait for dialog...
			var waitFor = (function(child){
				// we got a widget, wait for it to close...
				if(child instanceof widget.Widget){
					child
						.on('open', function(){ dialog.parent.close() })
						// XXX is this a hack???
						// 		...for some reason when clicking child 
						// 		loses focus while when opening via keyboard
						// 		everything is OK...
						.one('update', function(){ child.focus() })
						.parent
							.on('close', function(){ dialog.parent.focus() })

				// if it's not a dialog, don't wait...
				} else {
					dialog.parent.close()
				}

				return child
			}).bind(this)

			// Tree builder...
			var buildTree = function(path, leaf, action, disabled, tree){
				path = path.slice()
				// build leaf...
				if(path.length == 0){
					leaf.split(/\|/g)
						.forEach(function(leaf){
							var l = getItem(tree, leaf)[0]
							tree[l || leaf] = action != null ? [action, disabled] : action
						})
					return
				}
				// build alternative paths...
				var p = path.shift() || ''
				p.split(/\|/g)
					.forEach(function(e){
						// build branch element...
						var branch = getItem(tree, e)
						branch = tree[branch[0] || e] = branch[1] || {}

						// build sub-branch...
						buildTree(path, leaf, action, disabled, branch)
					})
			}

			// Action tree...
			//
			// Format:
			// 	{
			// 		<name>: <tree>,
			//
			// 		<name>: [
			// 			<action-name>,
			// 			<disabled>,
			// 		],
			//
			// 		...
			// 	}
			//
			// NOTE: this is created once per call, so to refresh the 
			// 		actions tree we'll need to re-open the dialog...
			var tree = {}

			// pre-order the main categories...
			// NOTE: pre_order can be a list of long paths...
			var pre_order = this.config['action-category-order'] || []
			pre_order.forEach(function(key){
				var path = key.split(/[\\\/]/g)
				var leaf = path.pop()

				buildTree(path, leaf, null, null, tree)
			})

			// buld the tree...
			var paths = this.getPath()
			Object.keys(paths).forEach(function(key){
				// handle disabled flag...
				var disabled = key.split(/^- /)
				var path = disabled.pop()
				disabled = disabled.length > 0

				path = path.split(/[\\\/]/g)
				var leaf = path.pop()

				buildTree(path, leaf, paths[key][0], disabled, tree)
			})

			//console.log('!!!!', tree)

			// now for the dialog...
			dialog = browse.makeLister(null, function(path, make){
				var that = this
				var cur = tree

				// get level...
				// NOTE: we need to get the level till first '*'...
				// NOTE: this needs to account for leading priority of 
				// 		an element...
				var rest = path.slice()
				while(rest.length > 0 && !('*' in cur)){
					cur = getItem(cur, rest.shift()).pop() || {}
				}

				// render current level...
				// NOTE: we can be at one of several level types, each 
				// 		is rendered in a different way...

				// Level: toggler states -- get states and list them...
				if(cur instanceof Array 
						&& actions.isToggler && actions.isToggler(cur[0])){
					var action = cur[0]
					var disabled = cur[1]
					
					var cur_state = actions[action]('?')
					var states = actions[action]('??')

					// handle on/off togglers...
					// XXX should the toggler directly return 'on'/'off'???
					if(states.length == 2 
							&& states.indexOf('none') >= 0 
							&& (cur_state == 'on' || cur_state == 'off')){
						states = ['on', 'off']
					}

					// build states...
					states.forEach(function(state){
						make(state, { disabled: disabled })
							.addClass(state == cur_state ? 'selected highlighted' : '')
							.on('open', function(){
								actions[action](state)
								that.pop()
							})
					})

				// Level: lister -- hand control to lister...
				// NOTE: path might be a partial path, the rest of it is
				// 		handled by the lister...
				} else if('*' in cur){
					actions[cur['*'][0]](path, make)

				// Level: normal -- list actions...
				} else {
					var level = Object.keys(cur)
					level
						.slice()
						// sort according to item priority: 'NN: <text>'
						//	NN > 0		- is sorted above the non-prioritized
						//					elements, the greater the number 
						//					the higher the element
						//	NN < 0		- is sorted below the non-prioritized
						//					elements, the lower the number 
						//					the lower the element
						.sort(function(a, b){
							var ai = priority.exec(a)
							ai = ai ? ai.pop()*1 : null
							ai = ai > 0 ? -ai
								: ai < 0 ? -ai + level.length
								: level.indexOf(a)

							var bi = priority.exec(b)
							bi = bi ? bi.pop()*1 : null
							bi = bi > 0 ? -bi
								: bi < 0 ? -bi + level.length
								: level.indexOf(b)

							return ai - bi
						})
						.forEach(function(key){
							// remove the order...
							var text = key.replace(priority, '').trim()

							// Item: action...
							if(cur[key] instanceof Array){
								var action = cur[key][0]
								var disabled = cur[key][1]

								// Action: toggler -> add toggle button...
								if(actions.isToggler && actions.isToggler(action)){
									make(text + '/', { 
										disabled: disabled, 
										buttons: [
											[actions[action]('?'), 
												function(){
													actions[action]()
													that.update()
													that.select('"'+ text +'"')
												}]
										]})
										.on('open', function(){
											// XXX can this open a dialog???
											actions[action]()

											that.update()
											that.select('"'+ text +'"')
										})

								// Action: normal...
								} else {
									make(text, { disabled: disabled })
										.on('open', function(){
											waitFor(actions[action]())
										})
								}

							// Item: dir...
							} else if(actions.config['browse-actions-settings'].showEmpty 
									|| (cur[key] != null
										&& Object.keys(cur[key]).length > 0)){
								make(text + '/')
							}
						})
				}
			}, {
				path: path,

				flat: false,
				traversable: true,
				pathPrefix: '/',
				fullPathEdit: true,

				showDisabled: actions.config['browse-actions-settings'].showDisabled,
			})
			// save show disabled state to .config...
			.on('close', function(){
				var config = actions.config['browse-actions-settings'] 

				config.showDisabled = dialog.options.showDisabled
			})

			return dialog
		})],
})

var BrowseActions = 
module.BrowseActions = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-browse-actions',
	depends: [
		'ui',
		'ui-dialogs',
	],

	actions: BrowseActionsActions,
})



//---------------------------------------------------------------------

var ContextActionMenu = 
module.ContextActionMenu = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-context-action-menu',
	depends: [
		'ui-browse-actions',
	],

	handlers: [
		['updateImage',
			function(){
				var that = this
				var img = this.ribbons.getImage(gid)

				!img.data('context-menu') 
					&& img
						.data('context-menu', true)
						.on('contextmenu', function(){
							event.preventDefault()
							event.stopPropagation()

							that.browseActions('/Image/')
						})
			}],
		['load',
			function(){
				var that = this
				var viewer = this.ribbons.viewer

				!viewer.data('context-menu') 
					&& viewer
						.data('context-menu', true)
						.on('contextmenu', function(){
							event.preventDefault()
							event.stopPropagation()

							that.browseActions()
						})
			}],
	],
})



//---------------------------------------------------------------------
// XXX make this not applicable to production...

var WidgetTestActions = actions.Actions({

	// Usage Examples:
	// 	.testDrawer()						- show html in base drawer...
	// 	.testDrawer('Header', 'paragraph')	- show html with custom text...
	// 	.testDrawer('Overlay')				- show html in overlay...
	// 	.testDrawer('Overlay', 'Header', 'paragraph')
	// 										- show html in overlay with 
	// 										  custom text...
	testDrawer: ['Test/99: Drawer widget test...',
		makeUIDialog('Drawer', 
			function(h, txt){
				return $('<div>')
					.css({
						position: 'relative',
						background: 'white',
						height: '300px',
						padding: '20px',
					})
					.append($('<h1>')
						.text(h || 'Drawer test...'))
					.append($('<p>')
						.text(txt || 'With some text.'))
			},
			// pass custom configuration to container...
			{
				background: 'white',
				focusable: true,
			})],
	testBrowse: ['Test/-99: Demo new style dialog...',
		makeUIDialog(function(){
			var actions = this

			console.log('>>> args:', [].slice.call(arguments))

			return browse.makeLister(null, function(path, make){
				var that = this

				make('select last')
					.on('open', function(){
						that.select(-1)
					})
					
				make('do nothing')
					.addClass('selected')

				make('nested dialog...')
					.on('open', function(){
						actions.testBrowse()
					})

				make('---')

				make('close parent')
					.on('open', function(){
						that.parent.close()
					})

				// NOTE: the dialog's .parent is not yet set at this point...

				// This will finalize the dialog...
				//
				// NOTE: this is not needed here as the dialog is drawn
				// 		on sync, but for async dialogs this will align
				// 		the selected field correctly.
				make.done()
			})
			// NOTE: this is not a dialog event, it is defined by the 
			// 		container to notify us that we are closing...
			.on('close', function(){
				console.log('Dialog closing...')
			})
		})],


	// XXX make this a toggler....
	partitionByMonth: ['Test/',
		function(){
			var that = this

			this.toggleImageSort('?') != 'Date' && this.sortImages('Date')

			this.on('updateImage', function(_, gid){ this.placeMonthPartition(gid) })
		}],
	// XXX this should be .updateImage(..) in a real feature...
	placeMonthPartition: ['Test/',
		function(image){
			var month = [
				'January', 'February', 'March', 'April',
				'May', 'June', 'July', 'August',
				'September', 'October', 'November', 'December'
			]

			var gid = this.data.getImage(image)
			var next = this.data.getImage(gid, 'next')

			cur = this.images[gid]	
			next = this.images[next]

			if(cur && next && cur.birthtime.getMonth() != next.birthtime.getMonth()){
				this.ribbons.getImageMarks(gid).filter('.partition').remove()
				this.ribbons.getImage(gid)
					.after(this.ribbons.setElemGID($('<div class="mark partition">'), gid)
						.attr('text', month[next.birthtime.getMonth()]))
			}
		}],


	// XXX this is just a test...
	embededListerTest: ['Test/50: Lister test (embeded)/*',
		function(path, make){
			make('a/')
			make('b/')
			make('c/')
		}],
	floatingListerTest: ['Test/50:Lister test (floating)...',
		function(path){
			// we got an argument and can exit...
			if(path){
				console.log('PATH:', path)
				return
			}

			// load the UI...
			var that = this
			var list = function(path, make){
				
				make('a/')
				make('b/')
				make('c/')
			}

			var o = overlay.Overlay(this.ribbons.viewer, 
				browse.makePathList(null, {
					'a/*': list,
					'b/*': list,
					'c/*': list,
				})
					.open(function(evt, path){ 
						o.close() 

						that.floatingListerTest(path)
					}))

			return o
		}],


	// XXX migrate to the dialog framework...
	// XXX use this.ribbons.viewer as base...
	// XXX BUG: when using this.ribbons.viewer as base some actions leak
	// 		between the two viewers...
	showTaggedInDrawer: ['- Test/Show tagged in drawer',
		function(tag){
			tag = tag || 'bookmark'
			var that = this
			var H = '200px'

			var viewer = $('<div class="viewer">')
				.css({
					height: H,
					background: 'black',
				})
			// XXX use this.ribbons.viewer as base...
			// XXX when using viewer zoom and other stuff get leaked...
			var widget = drawer.Drawer($('body'), 
				$('<div>')
					.css({
						position: 'relative',
						height: H,
					})
					.append(viewer),
				{
					focusable: true,
				})

			var data = this.data.crop(a.data.getTaggedByAll(tag), true)

			var b = actions.Actions()

			// used switch experimental actions on (set to true) or off (unset or false)...
			//a.experimental = true

			// setup actions...
			core.ImageGridFeatures.setup(b, [
				'viewer-testing',
			])

			// setup the viewer...
			// XXX for some reason if we load this with data and images
			// 		the images will not show up...
			b.load({
					viewer: viewer,
				})

			// load some testing data...
			// NOTE: we can (and do) load this in parts...
			b
				.load({
					data: data,
					images: this.images, 
				})
				// this is needed when loading legacy sources that do not have tags
				// synced...
				// do not do for actual data...
				//.syncTags()
				.setEmptyMsg('No images bookmarked...')
				.fitImage(1)

				// link navigation...
				.on('focusImage', function(){
					that.focusImage(this.current)
				})

			// XXX setup keyboard...
			var keyboard = require('lib/keyboard')

			// XXX move this to the .config...
			var kb = {
				'Basic Control': {
					pattern: '*',

					Home: {
						default: 'firstImage!',
					},
					End: {
						default: 'lastImage!',
					},
					Left: {
						default: 'prevImage!',
						ctrl: 'prevScreen!',
						// XXX need to prevent default on mac + browser...
						meta: 'prevScreen!',
					},
					PgUp: 'prevScreen!',
					PgDown: 'nextScreen!',
					Right: {
						default: 'nextImage!',
						ctrl: 'nextScreen!',
						// XXX need to prevent default on mac + browser...
						meta: 'nextScreen!',
					},
				}
			}

			widget.dom
				// XXX
				.keydown(
					keyboard.dropRepeatingkeys(
						keyboard.makeKeyboardHandler(
							kb,
							function(k){
								window.DEBUG && console.log(k)
							},
							b), 
						function(){ 
							return that.config['max-key-repeat-rate']
						}))

			// XXX STUB
			window.b = b

			return b
		}],
	showBookmarkedInDrawer: ['Test/Show bookmarked in drawer',
		function(){ this.showTaggedInDrawer('bookmark') }],
	showSelectedInDrawer: ['Test/Show selected in drawer',
		function(){ this.showTaggedInDrawer('selected') }],
})

var WidgetTest = 
module.WidgetTest = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'ui-widget-test',
	depends: [
		'ui-browse-actions',
	],

	actions: WidgetTestActions,
})




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

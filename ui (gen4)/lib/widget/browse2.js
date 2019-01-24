/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var toggler = require('../toggler')
var keyboard = require('../keyboard')
var object = require('../object')
var widget = require('./widget')



/*********************************************************************/
// XXX general design:
// 		- each of these can take either a value or a function (constructor)
//		- the function has access to Items.* and context
//		- the constructor can be called from two contexts:
//			- external
//				called from the module or as a function...
//				calls the passed constructor (passing context)
//				builds the container
//			- nested
//				called from constructor function...
//				calls constructor (if applicable)
//				builds item(s)
// XXX need a way to pass container constructors (a-la ui-widgets dialog containers)
// 		- passing through the context (this) makes this more flexible...
// 		- passing via args fixes the signature which is a good thing...
//		
//

// XXX
var Items = module.items = function(){}

// Focus last created item...
// XXX also would be nice to set the last created items to .last or 
// 		similar in the context...
Items.focus = function(){
}

// Embed a list...
//
Items.embed = function(){
}

Items.dialog = null


// singular items...
// 
// 	.Item(value[, make][, options])
// 		-> ???
// 	
Items.Item = function(value, make, options){
	// XXX check if we are in a container -> create if needed and update context...
	// XXX ???

	// create item...
	return make(value, make, options)
}

Items.Action = function(value, make, options){
	options = Object.create(options || {})
	options.cls = (options.cls || '') + ' action'
	return this.Item(value, make, options)
}
Items.Heading = function(value, make, options){
	options = Object.create(options || {})
	options.cls = (options.cls || '') + ' heading'
	var attrs = options.doc ? {doc: options.doc} : {}
	attrs.__proto__ = options.attrs || {}
	options.attrs = attrs
	return this.Item(value, make, options)
}
Items.Empty = function(value){}
Items.Separator = function(value){}
Items.Spinner = function(value){}
Items.Selected = function(value){}
Items.Editable = function(value){}
Items.ConfirmAction = function(value){}

// groups...
Items.Group = function(items){}

// lists...
// 
// 	.List(values[, make][, options])
// 		-> ???
// 		
// XXX how do we indicate the selected item???
// 		- options.path / options.selected?
// 		- path argument?
Items.List = function(values){
	// XXX STUB...
	return this.embed(List(values))
}
Items.EditableList = function(values){}
Items.EditablePinnedList = function(values){}


// Special list components...
//
// XXX these should be normal items...
Items.ListPath = function(){}
Items.ListTitle = function(){}



//---------------------------------------------------------------------

var BrowserClassPrototype = {
}

// XXX  move the DOM to a subclass and rename this to BaseBrowser
var BrowserPrototype = {
	options: {
		// XXX
	},

	dom: null,

	// XXX format doc...
	items: null,

	//
	// 	.list(make)
	//
	// XXX is this the right name???
	// XXX do we care about the return value???
	list: null,

	// Make .items...
	//
	// 	.make()
	// 		-> this
	//
	make: function(options){
		var items = this.items = []

		var make = function(item, opts){
			items.push(Object.assign(
				{}, 
				options || {},
				opts || {}, 
				{item: item}))
			return make
		}.bind(this)
		make.__proto__ = Items
		make.dialog = this

		this.list(make)

		return this
	},


	// Render main list...
	renderList: function(items, options){
		return items },
	// Render nested list...
	renderSubList: function(items, options){
		return items },
	// Render list item...
	renderItem: function(item, options){
		return item },
	// Render state...
	//
	//	.render()
	//	.render(context)
	//		-> state
	//
	render: function(context, options){
		var that = this
		context = context || this

		// render the items...
		var items = this.items
				.map(function(item){
					return item.render ?
							that.renderSubList(item.render(context, options), options)
						: item.item.render ?
							that.renderSubList(item.item.render(context, options), options)
						: that.renderItem(item) }) 

		// determine the render mode...
		return context === this ?
			// root context -> render list and return this...
			this.renderList(items, options)
			// non-root context -> return items as-is...
			: items
	},

	// Update state (make then render)...
	//
	// 	.update()
	// 		-> state
	//
	//
	// XXX options here are a relatively blunt means of overriding options
	// 		in the tree...
	// 		...do we need this???
	update: function(options){
		return this
			.make(options)
			.render(this, options) },


	filter: function(){},

	get: function(){},
	focus: function(){},

	// Navigation...
	//
	up: function(){},
	down: function(){},
	left: function(){},
	right: function(){},

	next: function(){},
	prev: function(){},

	// XXX scroll...


	__init__: function(func, options){
		this.list = func
		this.options = Object.assign(
			{}, 
			this.options, 
			options || {})

		this.update()
	},
}


var Browser = 
module.Browser = 
object.makeConstructor('Browser', 
		BrowserClassPrototype, 
		BrowserPrototype)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

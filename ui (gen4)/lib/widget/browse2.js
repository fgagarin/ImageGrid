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
// Helpers...

// Collect a list of literal values and "make(..) calls" into an array...
//
//	collectItems(context, items)
//		-> values
//
//
// items format:
// 	[
// 		// explicit value...
// 		value,
//
// 		// literal make call...
// 		make(..),
//
// 		...
// 	]
//
// NOTE: this will remove the made via make(..) items from .items thus the
// 		caller is responsible for adding them back...
// NOTE: this uses the make(..) return value to implicitly infer the items
// 		to collect, thus the items must already be constructed and in 
// 		the same order as they are present in .items
// 		...also, considering that this implicitly identifies the items 
// 		passing the make function without calling it can trick the system
// 		and lead to unexpected results.
//
// XXX would be nice to have a better check/test...
// 		...this could be done by chaining instances of make instead of 
// 		returning an actual function, i.e. each make call would return 
// 		a "new" function that would reference the actual item (.item())
// 		and the previous item created (.prevItem()), ... etc.
// 		...this would enable us to uniquely identify the actual items 
// 		and prevent allot of specific errors...
var collectItems = function(context, items){
	var made = items
		.filter(function(e){
			return e === context })
	// constructed item list...
	// ...remove each instance from .items
	made = context.items.splice(
		context.items.length - made.length, 
		made.length)
	// get the actual item values...
	return items
		.map(function(e){
			return e === context ?
				made.shift()
				: e }) }



//---------------------------------------------------------------------
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


// placeholders...
Items.dialog = null
Items.items = null


// Last item created...
// XXX not sure about this...
// XXX should this be a prop???
Items.last = function(){
	return (this.items || [])[this.items.length - 1] }


// Focus last created item...
Items.focus = function(){
	this.last.current = true }




// Group a set of items...
//
//	.group(make(..), ..)
//	.group([make(..), ..])
//		-> make
//
//
// Example:
// 	make.group(
// 		make('made item'),
// 		'literal item',
// 		...)
//
//
// NOTE: see notes to collectItems(..) for more info...
//
// XXX do we need to pass options to groups???
Items.group = function(...items){
	var that = this
	items = items.length == 1 && items[0] instanceof Array ?
		items[0]
		: items
	// replace the items with the group...
	this.items.splice(this.items.length, 0, ...collectItems(this, items))
	return this
}


// Place list in a sub-list of item...
//
Items.nest = function(item, list, options){
	options = options || {}
	options.sublist = list instanceof Array ?
		collectItems(this, list)
		: list
	return this(item, options)
}



//---------------------------------------------------------------------
// wrappers...

Items.Item = function(value, options){}
Items.Action = function(value, options){}
Items.Heading = function(value, options){}
Items.Empty = function(value){}
Items.Separator = function(value){}
Items.Spinner = function(value){}
Items.Selected = function(value){}
Items.Editable = function(value){}
Items.ConfirmAction = function(value){}

// groups...
Items.Group = function(items){}

// lists...
Items.List = function(values){}
Items.EditableList = function(values){}
Items.EditablePinnedList = function(values){}

// Special list components...
Items.ListPath = function(){}
Items.ListTitle = function(){}



//---------------------------------------------------------------------

var BaseBrowserClassPrototype = {
}

// XXX need a way to identify items...
var BaseBrowserPrototype = {
	// XXX should we mix item/list options or separate them into sub-objects???
	options: null,

	// Format:
	// 	[
	// 		<item> | <browser>,
	// 		...
	// 	]
	//
	// <item> format:
	// 	{
	// 		value: ...,
	//
	// 		...
	// 	}
	//
	// XXX should this be a list or a Map/Object????
	// 		...we do not need ultra fast traversal but we do need a way 
	// 		to identify and select items in a unique way...
	__items: null,
	get items(){
		this.__items
			|| this.make()
		return this.__items },
	set items(value){
		this.__items = value },


	//
	// 	.__list__(make, options)
	// 		-> undefined
	// 		-> list
	//
	//
	// 	make(value, options)
	// 		-> make
	//
	//
	// There are two modes of operation:
	// 	1) call make(..) to create items
	// 	2) return a list of items
	//
	// The if make is called at least once the return value is ignored.
	//
	//
	// Example:
	// 	XXX
	//
	//
	// NOTE: this is not designed to be called directly...
	//
	// XXX not sure how to handle options in here -- see .make(..) and its notes...
	__list__: function(make, options){
		throw new Error('.__list__(..): Not implemented.') },


	// Make .items...
	//
	// 	.make()
	// 		-> this
	//
	// XXX revise options handling for .__list__(..)
	make: function(options){
		var items = this.items = []

		// item constructor...
		//
		// 	make(..)
		// 		-> make
		//
		var make_called = false
		var make = function(value, opts){
			make_called = true
			items.push(Object.assign(
				{}, 
				options || {},
				opts || {}, 
				{value: value}))
			return make
		}.bind(this)
		make.__proto__ = Items
		make.dialog = this
		make.items = items

		//var res = this.__list__(make)
		// XXX not sure about this -- options handling...
		var res = this.__list__(make, 
			options ? 
				Object.assign(
					Object.create(this.options || {}), 
					options || {}) 
				: null)

		// if make was not called use the .__list__(..) return value...
		this.items = make_called ? 
			this.items 
			: res

		return this
	},


	// Renderers...
	//
	// 	.renderList(items, options)
	// 	.renderNested(header, sublist, item, options)
	// 	.renderItem(item, i, options)
	// 	.renderGroup(items, options)
	//
	//
	renderList: function(items, options){
		return items },
	// NOTE: to skip rendering an item/list return null...
	// XXX should this take an empty sublist???
	// 		...this would make it simpler to expand/collapse without 
	// 		re-rendering the whole list...
	// XXX revise how the context is passed...
	renderNested: function(header, sublist, context, item, options){
		return header ? 
			this.renderGroup([
				header, 
				sublist,
			])
   			: sublist },
	// NOTE: to skip rendering an item/list return null...
	renderItem: function(item, i, options){
		return item },
	renderGroup: function(items, options){
		return items },

	// Render state...
	//
	//	.render()
	//	.render(options)
	//	.render(context)
	//		-> state
	//
	//
	// context format:
	// 	{
	// 		root: <root-browser>,
	// 		options: <options>,
	// 	}
	//
	//
	// NOTE: currently options and context are distinguished only via 
	// 		the .options attribute... (XXX)
	render: function(options){
		var that = this
		// XXX revise -- should options and context be distinguished only
		// 		via the .options attr???
		var context = (options == null || options.options == null) ?
				{
					root: this,
					// NOTE: we are not combining this with .options as nested 
					// 		lists can have their own unique sets of options 
					// 		independently of the root list...
					options: options || {},
				}
			: options
		options = context.options

		// render the items...
		var _render
		// XXX should we control render parameters (range, start, end, ...)
		// 		from outside render and pass this info down to nested lists???
		// 		...if yes how??
		// 			- options
		// 			- arg threading
		// 			- render context
		var items = this.items
			.map(_render = function(item, i){
				return (
					// group...
					item instanceof Array ?
						that.renderGroup(
							item.map(_render), options)
					// renderable item...
					: item.render instanceof Function ?
						item.render(context) 
					// renderable value -- embedded list...
					: (item.value || {}).render instanceof Function ?
						item.value.render(context) 
					// .sublist -- nested list...
					: item.sublist ?
						// XXX revise how the context is passed...
						that.renderNested(
							that.renderItem(item, i, options),
							// collapsed...
							(item.collapsed ?
									null
							// renderable...
							:item.sublist.render instanceof Function ?
								item.sublist.render(context)
							// list of items...
							: item.sublist.map(_render)),
							context,
							item, 
							options)
					// basic item...
					: that.renderItem(item, i, options)) }) 
			.filter(function(e){
				return e != null })

		// determine the render mode...
		return context.root === this ?
			// root context -> render list and return this...
			this.renderList(items, options)
			// non-root context -> return items as-is...
			// XXX should this be a list of the return value of a 
			// 		renderer like .renderNested(..) ???
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
			.render(options) },


	// XXX item API...
	get: function(){},
	set: function(){},
	remove: function(){},
	sort: function(){},
	splice: function(){},

	// XXX should there return an array or a .constructor(..) instance??
	forEach: function(){},
	map: function(){},
	filter: function(){},
	reduce: function(){},


	// XXX should we update on on init....
	__init__: function(func, options){
		this.__list__ = func
		this.options = Object.assign(
			{}, 
			this.options || {}, 
			options || {})

		// XXX should this be here or should this be optional???
		//this.update()
	},
}


var BaseBrowser = 
module.BaseBrowser = 
object.makeConstructor('BaseBrowser', 
		BaseBrowserClassPrototype, 
		BaseBrowserPrototype)



//---------------------------------------------------------------------

var BrowserClassPrototype = {
	__proto__: BaseBrowser,
}

// XXX TODO:
// 		- event handler signature -- pass the item + optionally render...
// 		- keyboard handling...
// XXX render of nested lists does not affect the parent list(s)...
// XXX maintain expand/collapse state of nested lists in a natural way...
// XXX should this use vanilla DOM or jQuery???
var BrowserPrototype = {
	__proto__: BaseBrowser.prototype,

	options: {
		hideListHeader: false,

		renderHidden: false,

		localEvents: [
			'click',
		],
	},

	// parent element (optional)...
	get parent(){
		return this.__parent 
			|| (this.__dom ? 
				this.__dom.parentElement 
				: undefined) },
	set parent(value){
		var dom = this.dom
		this.__parent = value
		// transfer the dom to the new parent...
		dom && (this.dom = dom)
	},

	// browser dom...
	get dom(){
		return this.__dom },
	set dom(value){
		this.parent 
			&& (this.__dom ?
				this.parent.replaceChild(value, this.__dom) 
				: this.parent.appendChild(value))
		this.__dom = value },


	// XXX instrument interactions...
	renderList: function(items, options){
		var that = this
		options = options || this.options

		// dialog (container)...
		var dialog = document.createElement('div')
		dialog.classList.add('browse-widget')
		dialog.setAttribute('tabindex', '0')

		// header...
		options.hideListHeader
			|| dialog.appendChild(this.renderListHeader(options))

		// list...
		var list = document.createElement('div')
		list.classList.add('list', 'v-block')
		items
			.forEach(function(item){
				list.appendChild(item instanceof Array ? 
					that.renderGroup(item) 
					: item) })
		dialog.appendChild(list)

		return dialog 
	},
	// XXX populate this...
	// XXX make this an item???
	renderListHeader: function(options){
		var header = document.createElement('div')
		header.classList.add('path', 'v-block')
		header.setAttribute('tabindex', '0')

		// XXX path/search...
		var dir = document.createElement('div')
		dir.classList.add('dir', 'cur')
		dir.setAttribute('tabindex', '0')
		header.appendChild(dir)

		return header
	},
	// XXX revise how the context is passed...
	renderNested: function(header, sublist, context, item, options){
		var that = this

		// container...
		var e = document.createElement('div')
		e.classList.add('list')

		// localize events...
		;(options.localEvents || this.options.localEvents || [])
			.forEach(function(evt){
				e.addEventListener(evt, function(evt){ evt.stopPropagation() }) })

		// header...
		if(header){
			header.classList.add('sub-list-header')
			item.collapsed
				&& header.classList.add('collapsed')
			e.appendChild(header)

			// XXX STUB...
			// XXX BUG: nested list .render() when triggered without a 
			// 		context will render the header...
			e.addEventListener('click', function(evt){
				item.collapsed = !item.collapsed
				// XXX need to pass the root context here...
				that.render(context)
			})
		}

		// items...
		sublist instanceof Node ?
			e.appendChild(sublist)
		: sublist instanceof Array ?
			sublist
				.forEach(function(item){
					e.appendChild(item) })
		: null

		item.dom = e

		return e
	},
	// XXX this does not seem to get called by .render(..)...
	renderGroup: function(items, options){
		var e = document.createElement('div')
		e.classList.add('group')
		items
			// XXX is this wrong???
			.flat(Infinity)
			.forEach(function(item){
				e.appendChild(item) })
		return e },
	// XXX add custom events:
	// 		- open
	// 		- select
	// XXX add buttons...
	renderItem: function(item, i, options){
		if(options.hidden && !options.renderHidden){
			return null
		}
		//* XXX jQuery version -- not sure if we need this...
		var elem = item.dom = $('<div/>')
			// class...
			.addClass(['item']
				// user classes...
				.concat(item.cls || [])
				// special classes...
				.concat([
						//'focused',
						'selected',
						'disabled',
						'hidden',
					].filter(function(cls){ 
						return !!item[cls] }))
				.join(' '))
			// attrs...
			.attr(Object.assign({},
				item.attrs || {},
				{
					tabindex: '0',
					value: JSON.stringify(item.value || item),
				}))
			// value...
			// XXX handle $key shorthands...
			.append(...(item.value instanceof Array ? item.value : [item.value])
				.map(function(v){
					return $('<span class="text"/>')
						.html(v || item || '') }))
			// XXX buttons...
			// XXX placeholder buttons...
			// XXX things to work out:
			// 		- order -- should be ltr and not rtl (???)
			.append($('<span class="button"/>')
				.attr('tabindex', '0')
				.html('&square;'))
			.append($('<span class="button"/>')
				.attr('tabindex', '0')
				.html('&#9675;'))
			// events...
			.run(function(){
				var e = this
				Object.entries(item.events || {})
					// shorthand events...
					.concat([
							'click',
						].map(function(evt){ 
							return [evt, item[evt]] }))
					// setup the handlers...
					.forEach(function([evt, handler]){
						handler
							&& e.on(evt, handler) }) })
		// XXX stub...
		return elem[0]
		/*/
		var elem = document.createElement('div')

		// classes...
		elem.classList.add(...['item']
			// user classes...
			.concat(item.cls || [])
			// special classes...
			.concat([
				//'focused',
				'selected',
				'disabled',
				'hidden',
			].filter(function(cls){ 
				return !!item[cls] })))

		// attrs...
		Object.entries(item.attrs || {})
			.forEach(function([key, value]){
				elem.setAttribute(key, value) })
		elem.setAttribute('tabindex', '0')

		// values...
		;(item.value instanceof Array ? item.value : [item.value])
			// XXX handle $keys and other stuff...
			.map(function(v){
				var value = document.createElement('span')
				value.classList.add('text')
				value.innerHTML = v || item || ''
				elem.appendChild(value)
			})
		// XXX not sure about this yet...
		elem.setAttribute('value', JSON.stringify(item.value))

		// events...
		Object.entries(item.events || {})
			// shorthand events...
			.concat([
					'click',
				].map(function(evt){ 
					return [evt, item[evt]] }))
			// setup the handlers...
			.forEach(function([evt, handler]){
				handler
					&& elem.addEventListener(evt, handler) })

		// XXX buttons...
		// XXX
		
		item.dom = elem

		return elem 
		//*/
	},

	// save the rendered state to .dom
	render: function(options){
		//this.dom = object.parent(BrowserPrototype.render, this).call(this, ...arguments)
		//return this.dom
		
		var d = object.parent(BrowserPrototype.render, this).call(this, ...arguments)

		// wrap the list (nested list) of nodes in a div...
		if(d instanceof Array){
			var c = document.createElement('div')
			d.forEach(function(e){
				c.appendChild(e) })
			d = c
		}
		this.dom = d
		return this.dom
	},


	filter: function(){},

	select: function(){},
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


}


// XXX should this be a Widget too???
var Browser = 
module.Browser = 
object.makeConstructor('Browser', 
		BrowserClassPrototype, 
		BrowserPrototype)



//---------------------------------------------------------------------
// Text tree renderer...
//
// This is mainly designed for testing.
//
// XXX Q: how should the header item and it's sub-list be linked???

var TextBrowserClassPrototype = {
	__proto__: BaseBrowser,
}

var TextBrowserPrototype = {
	__proto__: BaseBrowser.prototype,

	options: {
		renderIndent: '\t',
	},
	
	// NOTE: we do not need .renderGroup(..) here as a group is not 
	// 		visible in text...
	renderList: function(items, options){
		var that = this
		return this.renderNested(null, items, null, null, options)
			.join('\n') },
	renderItem: function(item, i, options){
		var value = item.value || item
		return item.current ?
			`[ ${value} ]`
   			: value },
	renderNested: function(header, sublist, context, item, options){
		var that = this
		var nested = sublist 
			&& sublist
				.flat()
				.map(function(e){
					return e instanceof Array ?
						e.map(function(e){ 
							return (that.options.renderIndent || '  ') + e })
						: e })
				.flat() 
		return (
			// expanded...
			header && nested ?
				[
					header + ' v',
					nested,
				]
			// collapsed...
			: header ?
				[ header + ' >' ]
			// headerless...
			: nested )},
}

var TextBrowser = 
module.TextBrowser = 
object.makeConstructor('TextBrowser', 
		TextBrowserClassPrototype, 
		TextBrowserPrototype)



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

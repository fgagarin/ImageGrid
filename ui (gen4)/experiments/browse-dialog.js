/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true


/*********************************************************************/

// XXX NOTE: the widget itself does not need a title, that's the job for
//		a container widget (dialog, field, ...)
//		...it can be implemented trivially via an attribute and a :before
//		CSS class...
var BrowserClassPrototype = {
	// construct the dom...
	make: function(options){
		var browser = $('<div>')
			.addClass('browse')
			// make thie widget focusable...
			// NOTE: tabindex 0 means automatic tab indexing and -1 means 
			//		focusable bot not tabable...
			//.attr('tabindex', -1)
			.attr('tabindex', 0)
			// focus the widget if something inside is clicked...
			.click(function(){
				$(this).focus()
			})


		if(options.path == null || options.show_path){
			browser
				.append($('<div>')
					   .addClass('v-block path'))
		}

		browser
			.append($('<div>')
				   .addClass('v-block list'))

		return browser
	},
}

// XXX Q: should we make a base list dialog and build this on that or
//		simplify this to implement a list (removing the path and disbling
//		traversal)??
// XXX need a search/filter field...
// XXX need base events:
//		- open
//		- update
//		- select (???)
// XXX add "current selection" to the path...
var BrowserPrototype = {
	dom: null,

	options: {
		//path: null,
		//show_path: null,
	},

	// XXX this should prevent event handler deligation...
	keyboard: {
		'.browse':{
			Up: 'prev',
			Backspace: 'Up',
			Down: 'next',
			Left: 'pop',
			Right: 'push',

			Enter: 'action',
			Esc: 'close',
		},
	},

	// base api...
	// NOTE: to avoid duplicating and syncing data, the actual path is 
	//		stored in DOM...
	// XXX does the path includes the currently selected element?
	get path(){
		var skip = false
		return this.dom.find('.path .dir:not(.cur)')
			.map(function(i, e){ return $(e).text() })
			.toArray()
	},
	set path(value){
		// XXX normalize path...
		return this.update(value)
	},

	// update path...
	// 	- build the path
	// 	- build the element list
	//
	// XXX trigger an "update" event...
	// XXX current path click shoud make it editable and start a live 
	// 		search/filter...
	update: function(path){
		path = path || this.path
		var browser = this.dom
		var that = this

		var p = browser.find('.path').empty()
		var l = browser.find('.list').empty()

		var c = []
		// fill the path field...
		path.forEach(function(e){
			c.push(e)
			var cur = c.slice()
			p.append($('<div>')
				.addClass('dir')
				.click(function(){
					that
						.update(cur.slice(0, -1)) 
						.select('"'+cur.pop()+'"')
				})
				.text(e))
		})

		// add current selction indicator...
		p.append($('<div>')
			.addClass('dir cur')
			// XXX start search/filter...
			// 		- on click / letter set content editable
			// 		- triger filterig on modified
			// 		- disable nav in favor of editing
			// 		- enter/blur to exit edit mode
			// 		- esc to cancel and reset
			// XXX add a filter mode...
			.click(function(){
				//that.update(path.concat($(this).text())) 
				$(this)
					.text('')
					.attr('contenteditable', true)
					.keyup(function(){
						that.filter($(this).text())
					})
			}))

		// fill the children list...
		this.list(path)
			.forEach(function(e){
				l.append($('<div>')
					.click(function(){
						that.update(that.path.concat([$(this).text()])) 
					})
					.text(e))
			})

		return this
	},

	// XXX should have two non_matched modes:
	// 		- hide			- hide non-matching content
	// 		- shadow		- shadow non-matching content
	// XXX pattern modes:
	// 		- lazy match
	// 			abc		-> *abc*		-> ^.*abc.*$
	// 			ab cd	-> *ab*cd*		-> ^.*ab.*cd.*$
	// 		- glob
	// 		- regex
	// XXX sort:
	// 		- as-is
	// 		- best match
	filter: function(pattern, mode, non_matched, sort){
		var that = this
		var browser = this.dom

		// show all...
		if(pattern == null || pattern.trim() == '*'){
			this.update()

		// basic filter...
		} else {
			var l = browser.find('.list>div')

			l.each(function(i, e){
				e = $(e)
				var t = e.text()
				var i = t.search(pattern)
				if(i < 0){
					e.remove()

				} else {
					e.html(t.replace(pattern, pattern.bold()))
				}
			})
		}

		return this
	},

	// internal actions...

	// Select a list element...
	//
	//	Get selected element if it exists, otherwise select and return 
	//	the first...
	//	.select()
	//		-> elem
	//
	//	Get selected element if it exists, null otherwise...
	//	.select('!')
	//		-> elem
	//		-> $()
	//
	//	Select first/last child
	//	.select('first')
	//	.select('last')
	//		-> elem
	//
	//	Select previous/next child
	//	.select('prev')
	//	.select('next')
	//		-> elem
	//
	//	Deselect
	//	.select('none')
	//		-> elem
	//
	//	Select element by sequence number
	//	.select(<number>)
	//		-> elem
	//
	//	Select element by its text...
	//	.select('"<text>"')
	//		-> elem
	//
	//	.select(<elem>)
	//		-> elem
	//
	// This will return a jQuery object.
	//
	//
	// XXX revise return values...
	// XXX Q: should this trigger a "select" event???
	select: function(elem){
		var browser = this.dom
		var elems = browser.find('.list div')

		if(elems.length == 0){
			return $()
		}

		elem = elem || this.select('!')
		// if none selected get the first...
		elem = elem.length == 0 ? 'first' : elem

		// first/last...
		if(elem == 'first' || elem == 'last'){
			return this.select(elems[elem]())
		
		// prev/next...
		} else if(elem == 'prev' || elem == 'next'){
			var to = this.select('!', browser)[elem]('.list div')
			if(to.length == 0){
				return this.select(elem == 'prev' ? 'last' : 'first', browser)
			}
			this.select('none')
			return this.select(to)

		// deselect...
		} else if(elem == 'none'){
			browser.find('.path .dir.cur').empty()
			return elems
				.filter('.selected')
				.removeClass('selected')

		// strict...
		} else if(elem == '!'){
			return elems.filter('.selected')

		// number...
		} else if(typeof(elem) == typeof(123)){
			return this.select($(elems[elem]))

		// string...
		} else if(typeof(elem) == typeof('str') 
				&& /^'.*'$|^".*"$/.test(elem.trim())){
			elem = elem.trim().slice(1, -1)
			return this.select(browser.find('.list div')
					.filter(function(i, e){
						return $(e).text() == elem
					}))

		// element...
		} else {
			this.select('none')
			browser.find('.path .dir.cur').text(elem.text())
			return elem.addClass('selected')
		}
	},

	// Select next element...
	next: function(elem){
		if(elem != null){
			this.select(elem)
		}
		this.select('next')
		return this
	},
	// Select previous element...
	prev: function(elem){
		if(elem != null){
			this.select(elem)
		}
		this.select('prev')
		return this
	},

	// Push an element to path / go down one level...
	push: function(elem){
		var browser = this.dom 
		var elem = this.select(elem || '!')

		// nothing selected, select first and exit...
		if(elem.length == 0){
			this.select()
			return this
		}

		var path = this.path
		path.push(elem.text())

		// if not traversable call the action...
		if(this.isTraversable != null 
				&& (this.isTraversable !== false
					|| ! this.isTraversable(path))){
			return this.action(path)
		}

		this.path = path

		this.select()

		return this
	},
	// Pop an element off the path / go up one level...
	pop: function(){
		var browser = this.dom
		var path = this.path
		var dir = path.pop()

		this.update(path)

		this.select('"'+dir+'"')

		return this
	},

	focus: function(){
		this.dom.focus()
		return this
	},

	// XXX think about the API...
	// XXX trigger an "open" event...
	action: function(){
		var elem = this.select('!')

		// nothing selected, select first and exit...
		if(elem.length == 0){
			this.select()
			return this
		}

		var path = this.path.push(elem.text())

		var res = this.open(path)

		return res
	},

	// extension methods...
	open: function(path){ 
		var m = this.options.list
		return m ? m.call(this, path) : path
	},
	list: function(path){
		var m = this.options.list
		return m ? m.call(this, path) : []
	},
	isTraversable: null,

	// XXX need to get a container....
	// XXX prepare/merge options...
	// XXX setup instance events...
	__init__: function(parent, options){
		// XXX merge options...
		// XXX
		this.options = options

		// build the dom...
		var dom = this.dom = this.constructor.make(options)

		// add keyboard handler...
		dom.keydown(
			keyboard.makeKeyboardHandler(
				this.keyboard,
				// XXX
				function(k){ window.DEBUG && console.log(k) },
				this))

		// attach to parent...
		if(parent != null){
			parent.append(dom)
		}

		// load the initial state...
		this.update(this.path)
	},
}


/*
var Browser = 
//module.Browser = 
object.makeConstructor('Browser', 
		BrowserClassPrototype, 
		BrowserPrototype)
*/






/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

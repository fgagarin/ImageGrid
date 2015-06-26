/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

if(typeof(module) !== 'undefined' && module.exports){
	var NW = true
	var gui = require('nw.gui')

} else {
	var NW = false
}


define(function(require){ var module = {}


var object = require('../object')


/*********************************************************************/
// helpers...

function proxyToDom(name){
	return function(){ 
		this.dom[name].apply(this.dom, arguments)
		return this 
	}
}


/*********************************************************************/

// NOTE: the widget itself does not need a title, that's the job for
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

		if(options.flat){
			browser.addClass('flat')
		}

		// path...
		var path = $('<div>')
			.addClass('v-block path')
			/*
			.click(function(){
				// XXX set contenteditable...
				// XXX set value to path...
				// XXX select all...
			})
			.on('blur', function(){
				// XXX unset contenteditable...
			})
			.keyup(function(){
				// XXX update path...
				// 		- set /../..../ to path
				// 		- use the part after the last '/' ad filter...
			})
		  	*/

		if(options.show_path == false){
			path.hide()
		}

		browser
			.append(path)
			// list...
			.append($('<div>')
				   .addClass('v-block list'))

		return browser
	},
}

// XXX Q: should we make a base list dialog and build this on that or
//		simplify this to implement a list (removing the path and disabling
//		traversal)??
var BrowserPrototype = {
	dom: null,

	// option defaults and doc...
	options: {
		// Initial path...
		//path: null,

		//show_path: true,

		// Enable/disable user selection filtering...
		// NOTE: this only affects .startFilter(..)
		filter: true,

		// Enable/disable full path editing...
		// NOTE: as with .filter above, this only affects .startFullPathEdit(..)
		fullpathedit: true,

		// If false will disable traversal...
		// NOTE: if false this will also disable traversal up.
		// NOTE: this will not disable manual updates or explicit path 
		// 		setting.
		// NOTE: another way to disable traversal is to set 
		// 		.not-traversable on the .browse element
		traversable: true,

		// Handle keys that are not bound...
		// NOTE: to disable, set ot undefined.
		logKeys: function(k){ window.DEBUG && console.log(k) },

		// If set disables leading and trailing '/' on list and path 
		// elements.
		// This is mainly used for flat list selectors.
		flat: false,
	},

	// XXX TEST: this should prevent event handler delegation...
	keyboard: {
		FullPathEdit: {
			pattern: '.browse .path[contenteditable]',

			// keep text editing action from affecting the selection...
			ignore: [
					'Backspace',
					'Up',
					'Down',
					'Left',
					'Right',
					'Home',
					'End',
					'Enter',
					'Esc',
					'/',
					'A',

				],

			Enter: 'stopFullPathEdit!',
			Esc: 'abortFullPathEdit!',
		},

		Filter: {
			pattern: '.browse .path div.cur[contenteditable]',

			// keep text editing action from affecting the selection...
			ignore: [
					'Backspace',
					'Left',
					'Right',
					'Home',
					'End',
					'Enter',
					'Esc',
					'/',
					'A',
				],

			Enter: 'action!',
			Esc: 'stopFilter!',
		},

		General: {
			pattern: '.browse',

			Up: 'prev!',
			Down: 'next!',
			Left: {
				default: 'pop!',
				ctrl: 'update!: "/"',
			},
			Backspace: 'Left',
			Right: 'push',

			Home: 'select!: "first"',
			End: 'select!: "last"',

			// XXX add page up and page down...
			// XXX

			Enter: 'action',
			Esc: 'close',

			'/': 'startFilter!',

			A: {
				ctrl: 'startFullPathEdit!',
			},
		},
	},


	// Normalize path...
	//
	// This converts the path into a universal absolute array 
	// representation, taking care of relative path constructs including
	// '.' (current path) and '..' (up one level)
	//
	// XXX is this the correct name???
	path2lst: function(path){
		var splitter = /[\\\/]/

		if(typeof(path) == typeof('str')){
			path = path
				.split(splitter)
				.filter(function(e){ return e != '' })
		}

		// we've got a relative path...
		if(path[0] == '.' || path[0] == '..'){
			path = this.path.concat(path)
		}

		path = path
			// clear the '..'...
			// NOTE: we reverse to avoid setting elements with negative
			// 		indexes if we have a leading '..'
			.reverse()
			.map(function(e, i){
				if(e == '..'){
					e = '.'
					path[i] = '.'
					path[i+1] = '.'
				}
				return e
			})
			.reverse()
			// filter out '.'...
			.filter(function(e){ return e != '.' })

		return path
	},

	// Trigger jQuery events on Browser...
	//
	// This will pass the Browser instance to .source attribute of the
	// event object triggered.
	trigger: function(){
		var args = args2array(arguments)
		var evt = args.shift()
		
		if(typeof(evt) == typeof('str')){
			evt = {
				type: evt,
				source: this,
			}
		} else {
			evt.source = this
		}

		args.splice(0, 0, evt)

		this.dom.trigger.apply(this.dom, args)
		return this 
	},

	// proxy event api...
	on: proxyToDom('on'),
	one: proxyToDom('one'),
	off: proxyToDom('off'),
	bind: proxyToDom('bind'),
	unbind: proxyToDom('unbind'),
	deligate: proxyToDom('deligate'),
	undeligate: proxyToDom('undeligate'),

	// specific events...
	focus: proxyToDom('focus'),
	blur: proxyToDom('blur'),


	// base api...

	// XXX should these set both the options and dom???
	get flat(){
		return !this.dom.hasClass('flat') || this.options.flat
	},
	set flat(value){
		if(value){
			this.dom.addClass('flat')
		} else {
			this.dom.removeClass('flat')
		}
		this.options.flat = value
	},

	// XXX should these set both the options and dom???
	get traversable(){
		return !this.dom.hasClass('not-traversable') && this.options.traversable
	},
	set traversable(value){
		if(value){
			this.dom.removeClass('not-traversable')
		} else {
			this.dom.addClass('not-traversable')
		}
		this.options.traversable = value
	},

	// Indicate if UI in list filtering mode...
	get filtering(){
		return this.dom.find('.path .dir.cur[contenteditable]').length > 0 
	},

	// Get/set the path...
	//
	// On more info on setting the path see .update(..)
	//
	//
	// NOTE: .path = <some-path> is equivalent to .update(<some-path>)
	// 		both exist at the same time to enable chaining...
	// NOTE: to avoid duplicating and syncing data, the actual path is 
	//		stored in DOM...
	// NOTE: path does not include the currently selected list element,
	// 		just the path to the current list...
	get path(){
		var skip = false
		return this.dom.find('.path .dir:not(.cur)')
			.map(function(i, e){ return $(e).text() })
			.toArray()
	},
	set path(value){
		return this.update(value)
	},
	// String path...
	get strPath(){
		return '/' + this.path.join('/')
	},
	// NOTE: this is just a shorthand to .path for uniformity...
	set strPath(value){
		this.path = value
	},

	// Copy/Paste...
	//
	// XXX use 'Test' for IE...
	copy: function(){
		var path = this.strPath

		if(NW){
			gui.Clipboard.get()
				.set(path, 'text')

		// browser...
		// XXX use 'Test' for IE...
		} else if(event != undefined){
			event.clipboardData.setData('text/plain', path)
		}

		return path
	},
	paste: function(str){
		// generic...
		if(str != null){
			this.path = str

		// nw.js
		} else if(NW){
			this.path = gui.Clipboard.get()
				.get('text')

		// browser...
		// XXX use 'Test' for IE...
		} else if(event != undefined){
			this.path = event.clipboardData.getData('text/plain')
		}

		return this
	},

	// update path...
	// 	- build the path
	// 	- build the element list
	// 	- bind to control events
	//
	// For uniformity and ease of access from DOM, this will also set the
	// 'path' html attribute on the .browse element.
	//
	// NOTE: setting the DOM attr 'path' works one way, navigating to a
	// 		different path will overwrite the attr but setting a new 
	// 		value to the html attr will not affect the actual path.
	// NOTE: .path = <some-path> is equivalent to .update(<some-path>)
	// 		both exist at the same time to enable chaining...
	// NOTE: this will scroll the path to show the last element for paths
	// 		that do not fit in view...
	//
	// XXX need a way to handle path errors in the extension API...
	// 		...for example, if .list(..) can't list or lists a different
	// 		path due to an error, we need to be able to render the new
	// 		path both in the path and list sections...
	// 		NOTE: current behaviour is not wrong, it just not too flexible...
	update: function(path){
		path = path || this.path
		var browser = this.dom
		var that = this
		var focus = browser.find(':focus').length > 0

		// normalize path...
		path = this.path2lst(path)

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
					if(that.traversable){
						that
							.update(cur.slice(0, -1)) 
							.select('"'+cur.pop()+'"')
					}
				})
				.text(e))
		})

		// add current selection indicator...
		var txt
		p.append($('<div>')
			.addClass('dir cur')
			.click(function(){
				that.startFilter()
				//that.update(path.concat($(this).text())) 

				// XXX HACK: prevents the field from blurring when clicked...
				// 			...need to find a better way...
				that._hold_blur = true
				setTimeout(function(){ delete that._hold_blur }, 20)
			})
			// XXX for some reason this gets triggered when clicking ano 
			// 		is not triggered when entering via '/'
			.on('blur', function(){
				// XXX HACK: prevents the field from bluring when clicked...
				// 			...need to find a better way...
				if(!that._hold_blur){
					that.stopFilter()
				}
			})
			/* XXX does the right thing (replaces the later .focus(..) 
			 * 		and .keyup(..)) but does not work in IE...
			.on('input', function(){
				that.filterList($(this).text())
			})
			*/
			// only update if text changed...
			.focus(function(){
				txt = $(this).text()
			})
			.keyup(function(){
				var cur  = $(this).text()
				if(txt != cur){
					txt = cur
					that.filterList(cur)
				}
			}))


		// handle path scroll..
		var e = p.children().last()
		// scroll to the end when wider than view...
		if(e.length > 0 && p.width() < p[0].scrollWidth){
			// scroll all the way to the right...
			p.scrollLeft(p[0].scrollWidth)

		// keep left aligned...
		} else {
			p.scrollLeft(0)
		}

		// fill the children list...
		var interactive = false

		var make = function(p){
			interactive = true
			return $('<div>')
				// handle clicks ONLY when not disabled...
				.click(function(){
					if(!$(this).hasClass('disabled')){
						that.push($(this).text()) 
					}
				})
				.text(p)
				.appendTo(l)
		}

		var res = this.list(path, make)

		if(!interactive){
			res.forEach(make)
		}

		this.dom.attr('path', this.strPath)
		this.trigger('update')

		// maintain focus within the widget...
		if(focus && browser.find(':focus').length == 0){
			this.focus()
		}

		return this
	},

	// Filter the item list...
	//
	// 	General signature...
	// 	.filter(<pattern>[, <rejected-handler>][, <ignore-disabled>])
	// 		-> elements
	// 	
	//
	// 	Get all elements...
	// 	.filter()
	// 	.filter('*')
	// 		-> all elements
	//
	// 	Get all elements containing a string...
	// 	.filter(<string>)
	// 		-> elements
	//
	// 	Get all elements matching a regexp...
	// 	.filter(<regexp>)
	// 		-> elements
	//
	// 	Filter the elements via a function...
	// 	.filter(<function>)
	// 		-> elements
	// 		NOTE: the elements passed to the <function> on each iteration
	// 			are unwrapped for compatibility with jQuery API.
	//
	// 	Get specific element...
	// 	.filter(<index>)
	// 	.filter(<jQuery-obj>)
	// 		-> element
	//		-> $()
	// 		NOTE: when passing a jQuery-obj it will be returned iff it's
	// 			an element.
	// 		NOTE: unlike .select(..) index overflow will produce empty 
	// 			lists rather than to/bottom elements.
	//
	//
	// If <rejected-handler> function is passed it will get called with 
	// every element that was rejected by the predicate / not matching 
	// the pattern.
	//
	// By default, <ignore-disabled> is false, thus this will ignore 
	// disabled elements. If <ignore_disabled> is false then disabled 
	// elements will be searched too.
	//
	//
	//
	// Extended string patterns:
	//
	// The pattern string is split by whitespace and each resulting 
	// substring is searched independently.
	// Order is not considered.
	//
	// 	Examples:
	// 		'aaa'			- matches any element containing 'aaa'
	// 							(Same as: /aaa/)
	// 		'aa bb'			- matches any element containing both 'aa'
	// 							AND 'bb' in any order.
	// 							(Same as: /aa.*bb|bb.*aa/)
	//
	// NOTE: currently there is no way to search for whitespace explicitly,
	// 		at this point this is "by-design" as an experiment on how
	// 		vital this feature is.
	//
	// TODO need to support glob / nested patterns...
	// 		..things like /**/a*/*moo/ should list all matching items in
	// 		a single list.
	filter: function(pattern, a, b){
		pattern = pattern == null ? '*' : pattern
		var ignore_disabled = typeof(a) == typeof(true) ? a : b
		ignore_disabled = ignore_disabled == null ? true : ignore_disabled
		var rejected = typeof(a) == typeof(true) ? null : a

		var that = this
		var browser = this.dom

		var elems = browser.find('.list>div' + (ignore_disabled ? ':not(.disabled)' : ''))

		if(pattern == '*'){
			return elems 
		}

		// function...
		if(typeof(pattern) == typeof(function(){})){
			var filter = function(i, e){
				e = e[0]
				if(!pattern.call(e, i, e)){
					if(rejected){
						rejected.call(e, i, e)
					}
					return false
				}
				return true
			}

		// regexp...
		} else if(pattern.constructor == RegExp){
			var filter = function(i, e){
				if(!pattern.test($(e).text())){
					if(rejected){
						rejected.call(e, i, e)
					}
					return false
				}
				return true
			}

		// string...
		// NOTE: this supports several space-separated patterns.
		// XXX support glob...
		} else if(typeof(pattern) == typeof('str')){
			var pl = pattern.trim().split(/\s+/)
			var filter = function(i, e){
				e = $(e)
				var t = e.text()
				for(var p=0; p < pl.length; p++){
					var i = t.search(pl[p])
					if(!(i >= 0)){
						if(rejected){
							rejected.call(e, i, e)
						}
						return false
					}
				}
				return true
			}

		// number...
		} else if(typeof(pattern) == typeof(123)){
			return elems.eq(pattern)

		// jQuery object...
		} else if(elems.index(pattern) >= 0){
			return pattern

		// unknown pattern...
		} else {
			return $()
		}

		return elems.filter(filter)
	},

	// Filter list elements...
	//
	// This will set the .filtered-out class on all non-matching elements.
	//
	// Use .filterList('*') to clear filter and show all elements.
	//
	// NOTE: see .filter(..) for docs on actual filtering.
	// NOTE: this does not affect any UI modes, for list filtering mode
	// 		see: .startFilter(..) and friends...
	filterList: function(pattern){
		var that = this
		var browser = this.dom

		// show all...
		if(pattern == null || pattern.trim() == '*'){
			browser.find('.filtered-out')
				.removeClass('filtered-out')
			// clear the highlighting...
			browser.find('.list b')
				.replaceWith(function() { return this.innerHTML })

		// basic filter...
		} else {
			var p = RegExp('(' + pattern.trim().split(/\s+/).join('|') + ')', 'g')
			this.filter(pattern,
					// rejected...
					function(i, e){
						e
							.addClass('filtered-out')
							.removeClass('selected')
					},
					// NOTE: setting this to true will not remove disabled
					// 		elements from view as they will neither get 
					// 		included in the filter not in the filtered out
					// 		thus it will require manual setting of the
					// 		.filtered-out class
					false)
				// passed...
				.removeClass('filtered-out')
				// NOTE: this will mess up (clear) any highlighting that was 
				// 		present before...
				.each(function(_, e){
					e = $(e)
					var t = e.text()
					e.html(t.replace(p, '<b>$1</b>'))
				})
		}

		return this
	},


	// internal actions...
	
	// full path editing...
	//
	// 	start ---->	edit --(enter)--> stop (accept)
	// 				  |
	// 			 	 +-------(esc)--> abort (reset)
	//
	//
	// NOTE: the event handlers for this are set in .__init__()...
	//
	// XXX should these be a toggle???
	startFullPathEdit: function(){
		if(this.options.fullpathedit){
			var browser = this.dom
			var path = this.strPath
			var orig = this.select('!').text()
			browser
				.attr('orig-path', path)
				.attr('orig-selection', orig)

			var range = document.createRange()
			var selection = window.getSelection()

			var e = browser.find('.path')
				.text(path)
				.attr('contenteditable', true)
				.focus()

			range.selectNodeContents(e[0])
			selection.removeAllRanges()
			selection.addRange(range)
		}
		return this
	},
	abortFullPathEdit: function(){
		var browser = this.dom
		var e = browser.find('.path')

		var path = '/' + browser.attr('orig-path')
		var selection = browser.attr('orig-selection')

		this.stopFullPathEdit(path)

		if(selection != ''){
			this.select(selection)	
		}

		return this
	},
	stopFullPathEdit: function(path){
		var browser = this.dom
			.removeAttr('orig-path')
			.removeAttr('orig-selection')

		var e = browser.find('.path')
			.removeAttr('contenteditable')

		this.path = path || e.text()

		return this
			.focus()
	},
	
	// list filtering...
	//
	// 	start ---->	edit / select --(enter)--> action (use selection)
	// 					 |
	// 					 +-------(blur/esc)--> exit (clear)
	//
	//
	// NOTE: the action as a side effect exits the filter (causes blur 
	// 		on filter field)...
	// NOTE: this uses .filter(..) for actual filtering...
	//
	// XXX should this be a toggler???
	startFilter: function(){
		if(this.options.filter){
			var range = document.createRange()
			var selection = window.getSelection()

			var that = this
			var e = this.dom.find('.path .dir.cur')
				//.text('')
				.attr('contenteditable', true)
				.focus()

			// place the cursor...
			//range.setStart(e[0], 0)
			//range.collapse(true)
			range.selectNodeContents(e[0])
			selection.removeAllRanges()
			selection.addRange(range)
		}
		return this
	},
	stopFilter: function(){
		this.filterList('*')
		this.dom.find('.path .dir.cur')
			.text('')
			.removeAttr('contenteditable')

		// NOTE: we might select an item outside of the current visible
		// 		area, thus re-selecting it after we remove the filter 
		// 		will place it correctly.
		this.select(this.select('!'))

		return this
			.focus()
	},

	// Toggle filter view mode...
	toggleFilterViewMode: function(){
		this.dom.toggleClass('show-filtered-out')
		return this
	},

	// XXX should this be a toggler???
	disableElements: function(pattern){
		this.filter(pattern, false)
			.addClass('disabled')
			.removeClass('selected')
		return this
	},
	enableElements: function(pattern){
		this.filter(pattern, false)
			.removeClass('disabled')
		return this
	},

	// Select an element from current list...
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
	//		-> $()
	//
	//	Select element by sequence number
	//	NOTE: negative numbers count from the tail.
	//	NOTE: overflowing selects the first/last element.
	//	.select(<number>)
	//		-> elem
	//
	//	Select element by its text...
	//	NOTE: if text matches one of the reserved commands above use 
	//		quotes to escape it...
	//	.select('<text>')
	//	.select("'<text>'")
	//	.select('"<text>"')
	//		-> elem
	//
	//	Select element via a regular expression...
	//	.select(<regexp>)
	//		-> elem
	//		-> $()
	//
	//	Select jQuery object...
	//	.select(<elem>)
	//		-> elem
	//		-> $()
	//
	// This will return a jQuery object.
	//
	// For uniformity and ease of access from DOM, this will also set 
	// the value attr on the .browse element.
	// NOTE: this is one way and setting the html attribute "value" will
	// 		not affect the selection, but changing the selection will 
	// 		overwrite the attribute.
	//
	// NOTE: if multiple matches occur this will select the first.
	// NOTE: 'none' will always return an empty jQuery object, to get 
	// 		the selection state before deselecting use .select('!')
	// NOTE: this uses .filter(..) for string and regexp matching...
	//
	// XXX should we unconditionally clear string quotes or can an item 
	// 		contain '"' or "'"?
	// 		...currently the outer quotes are cleared.
	select: function(elem, filtering){
		var pattern = '.list div:not(.disabled):not(.filtered-out)'
		var browser = this.dom
		var elems = browser.find(pattern)

		filtering = filtering == null ? this.filtering : filtering

		if(elems.length == 0){
			return $()
		}

		// empty list/string selects none...
		elem = elem != null && elem.length == 0 ? 'none' : elem
		// 0 or no args (null) selects first...
		elem = elem == 0 ? 'first' : elem
		// no args -> either we start with the selected or the first...
		if(elem == null){
			var cur = this.select('!')
			elem = cur.length == 0 ? 'first' : cur
		}

		// first/last...
		if(elem == 'first' || elem == 'last'){
			return this.select(elems[elem](), filtering)
		
		// prev/next...
		} else if(elem == 'prev' || elem == 'next'){
			var to = this.select('!', filtering)[elem + 'All'](pattern).first()
			if(to.length == 0){
				return this.select(elem == 'prev' ? 'last' : 'first', filtering)
			}
			this.select('none', filtering)
			return this.select(to, filtering)

		// deselect...
		} else if(elem == 'none'){
			if(!filtering){
				browser.find('.path .dir.cur').empty()
			}
			elems = elems
				.filter('.selected')
				.removeClass('selected')
			this.trigger('deselect', elems)
			return $()

		// strict...
		} else if(elem == '!'){
			return elems.filter('.selected')

		// number...
		// NOTE: on overflow this will get the first/last element...
		} else if(typeof(elem) == typeof(123)){
			return this.select($(elems.slice(elem)[0] || elems.slice(-1)[0] ), filtering)

		// string...
		} else if(typeof(elem) == typeof('str')){
			// clear quotes...
			// XXX can an item contain '"' or "'"???
			if(/^'.*'$|^".*"$/.test(elem.trim())){
				elem = elem.trim().slice(1, -1)
			}
			return this.select(this.filter(elem).first(), filtering)

		// regexp...
		} else if(elem.constructor === RegExp){
			return this.select(this.filter(elem).first(), filtering)

		// element...
		} else {
			elem = $(elem).first()

			if(elem.length == 0){
				this.select(null, filtering)

			} else {
				this.select('none', filtering)
				if(!filtering){
					browser.find('.path .dir.cur').text(elem.text())
				}


				// handle scroll position...
				var p = elem.scrollParent()
				var S = p.scrollTop()
				var H = p.height()

				var h = elem.height()
				var t = elem.offset().top - p.offset().top

				var D = 3 * h 

				// too low...
				if(t+h+D > H){
					p.scrollTop(S + (t+h+D) - H)

				// too high...
				} else if(t < D){
					p.scrollTop(S + t - D)
				}

				elem.addClass('selected')
				browser.attr('value', elem.text())

				this.trigger('select', elem)

				return elem
			}
		}
	},

	// Select next/prev element...
	next: function(elem){
		if(elem != null){
			this.select(elem)
		}
		this.select('next')
		return this
	},
	prev: function(elem){
		if(elem != null){
			this.select(elem)
		}
		this.select('prev')
		return this
	},

	// Push an element to path / go down one level...
	//
	// XXX trigger a "push" event... (???)
	// XXX might be a good idea to add a live traversable check...
	push: function(elem){
		var browser = this.dom 
		var elem = this.select(elem || '!')

		// nothing selected, select first and exit...
		if(elem.length == 0){
			this.select()
			return this
		}

		// if not traversable call the action...
		if(!this.traversable || elem.hasClass('not-traversable')){
			return this.action()
		}

		var path = this.path
		path.push(elem.text())

		// do the actual traverse...
		this.path = path

		this.select()

		return this
	},

	// Pop an element off the path / go up one level...
	//
	// XXX trigger a "pop" event... (???)
	pop: function(){
		var browser = this.dom

		if(!this.traversable){
			return this
		}

		var path = this.path
		var dir = path.pop()

		this.update(path)

		this.select('"'+dir+'"')

		return this
	},

	// Pre-open action...
	//
	// This opens (.open(..)) the selected item and if none are selected
	// selects the default (.select()) and exits.
	// 
	// XXX need to check if openable i.e. when to use open and when push...
	action: function(){
		var elem = this.select('!')

		// nothing selected, select first and exit...
		if(elem.length == 0){
			this.select()
			return this
		}

		var path = this.path

		path.push(elem.text())

		var res = this.open(path)

		return res
	},


	// extension methods...

	// Open action...
	//
	// This is called when an element is selected and opened.
	//
	// By default this happens in the following situations:
	// 	- an element is selected and Enter is pressed.
	// 	- an element is not traversable and push (Left, click) is called.
	//
	// By default this only triggers the 'open' event on both the browser
	// and the selected element if one exists.
	//
	//
	// NOTE: if nothing is selected this will do nothing...
	// NOTE: internally this is never called directly, instead a pre-open
	// 		stage is used to execute default behavior not directly 
	// 		related to opening an item (see: .action()).
	// NOTE: unlike .list(..) this can be used directly if an item is 
	// 		selected and an actual open action is defined, either in an
	// 		instance or in .options
	open: function(path){ 
		var elem = this.select('!')

		// get path + selection...
		if(!path){
			// nothing selected, select first and exit...
			if(elem.length == 0){
				//this.select()
				return this
			}

			// load the current path + selection...
			path = this.path
			path.push(elem.text())

		// normalize and load path...
		} else {
			path = this.path2lst(path)
			var elem = path.slice(-1)[0]
			this.path = path.slice(0, -1)
			elem = this.select(elem)
		}

		// get the options method and call it if it exists...
		var m = this.options.open
		var args = args2array(arguments)
		args[0] = path
		var res = m ? m.apply(this, args) : path

		// trigger the 'open' events...
		if(elem.length > 0){
			elem.trigger('open', path)
		}
		this.trigger('open', path)

		return res
	},

	// List current path level...
	//
	// This will get passed a path and an item constructor and should 
	// return a list.
	//
	// NOTE: This is not intended for direct client use, rather it is 
	// 		designed to either be overloaded by the user in an instance 
	// 		or in the .options
	//		To re-list/re-load the view use .update()
	//
	//
	// There are two mods of operation:
	//
	// 1) interactive:
	// 		.list(path, make)
	// 			- for each item make is called with it's text
	//			- make will return a jQuery object of the item
	//
	// 		NOTE: selection is currently done based on .text() thus the 
	// 			modification should not affect it's output...
	//
	// 2) non-interactive:
	// 		.list(path) -> list
	// 			- .list(..) should return an array
	// 			- make should never get called
	// 			- the returned list will be rendered
	//
	//
	// This can set the following classes on elements:
	//
	// 	.disabled
	// 		an element is disabled.
	//
	// 	.non-traversable
	// 		an element is not traversable/listable and will trigger the
	// 		.open(..) on push...
	//
	// XXX need a way to constructively communicate errors up...
	list: function(path, make){
		path = path || this.path
		var m = this.options.list
		return m ? m.apply(this, arguments) : []
	},

	// XXX need to get a container -- UI widget API....
	// XXX paste does not work on IE yet...
	// XXX handle copy...
	// XXX trigger started event...
	__init__: function(parent, options){
		var that = this
		options = options || {}

		// merge options...
		var opts = Object.create(this.options)
		Object.keys(options).forEach(function(n){ opts[n] = options[n] })
		options = this.options = opts

		// build the dom...
		var dom = this.dom = this.constructor.make(options)

		// basic permanent interactions...
		dom.find('.path')
			// NOTE: these are used for full-path editing and are defined
			// 		here in contrast to other feature handlers as the
			// 		'.path' element is long-lived and not rewritten 
			// 		on .update(..)
			.dblclick(function(){
				that.startFullPathEdit()
			})
			.keyup(function(){
				var e = $(this)
				if(e.attr('contenteditable') && e.text() != dom.attr('orig-path')){
					dom.find('.list').empty()
				}
			})
			// handle paste...
			// XXX does not work on IE yet...
			// XXX do we handle other types???
			// 		...try an get the path of anything...
			// XXX seems not to work until we cycle any of the editable
			// 		controls (filter/path), and then it still is on and 
			// 		off...
			.on('paste', function(){
				event.preventDefault()
				that.paste()
			})
			// XXX handle copy...
			/* XXX
			.on('cut copy', function(){
				event.preventDefault()
				that.copy()
			})
			*/

		// add keyboard handler...
		dom.keydown(
			keyboard.makeKeyboardHandler(
				this.keyboard,
				options.logKeys,
				this))

		// attach to parent...
		if(parent != null){
			parent.append(dom)
		}

		// load the initial state...
		// XXX check if this default is correct...
		this.update(options.path || this.path)
	},
}


var Browser = 
module.Browser = 
object.makeConstructor('Browser', 
		BrowserClassPrototype, 
		BrowserPrototype)



/*********************************************************************/

// Flat list...
//
// This expects a data option set with the following format:
// 	{
// 		<option-text>: <callback>,
// 		...
// 	}
//
// or:
// 	[
// 		<option-text>,
// 		...
// 	]
// 	
// NOTE: this essentially a different default configuration of Browser...
var ListPrototype = Object.create(BrowserPrototype)
ListPrototype.options = {

	fullpathedit: false,
	traversable: false,
	flat: true,

	list: function(path, make){
		var that = this
		var data = this.options.data
		var keys = data.constructor == Array ? data : Object.keys(data)
		return keys
			.map(function(k){
				var e = make(k)

				if(data !== keys){
					e.on('open', function(){ 
						return that.options.data[k].apply(this, arguments)
					})
				}

				return k
			})
	},
}
ListPrototype.options.__proto__ = BrowserPrototype.options

var List = 
module.List = 
object.makeConstructor('List', 
		BrowserClassPrototype, 
		ListPrototype)


// This is a shorthand for: new List(<elem>, { data: <list> })
var makeList = 
module.makeList = function(elem, list){
	return List(elem, { data: list })
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

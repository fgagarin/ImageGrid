/**********************************************************************
* 
* Goals:
* 	- minimum tagging
* 	- maximum expressiveness
* 	- fully serializable
* 	- customizable
*
* Features:
* 	- tag paths
* 		a/b/c
* 	- tag sets/relations
* 		a:b
* 	- serializable tag queries
* 	- serializable tag data
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('lib/object')
var util = require('lib/util')



/*********************************************************************/

// XXX a Set-like back-end...
// 		API:
// 			.has(..)
// 				-> bool
//
// 			Unite two sets...
// 			.unite(..)
// 				-> new
//
// 			Intersection of two sets...
// 			.intersect(..)
// 				-> new
//
// 			Difference of two sets...
// 			.subtract(..)
// 				-> new

// extend Set to support the needed basics...



/*********************************************************************/

var TagsClassPrototype = {
	// Utils...
	//
	// 	.normalize(tag)
	// 		-> ntag
	//
	// 	.normalize(tag, ...)
	// 	.normalize([tag, ...])
	// 		-> [ntag, ...]
	//
	// NOTE: tag set order is not significant.
	// NOTE: for mixed tags sets are sorted in-place within paths, 
	// 		e.g.
	// 			c:b/a -> b:c/a
	//
	// XXX not sure if we should do:
	// 			c:b/a -> b:c/a 		- sort sets within pats (current)
	// 		or
	// 			c:b/a -> b/a:c		- sort paths within sets
	// XXX should this be .normalizeTags(..) ???
	// XXX should we support priority braces, i.e. c:(b/a)
	normalize: function(...tags){
		var that = this
		var tagRemovedChars = (this.config || {})['tagRemovedChars']
		tagRemovedChars = tagRemovedChars instanceof RegExp ? 
				tagRemovedChars
			: typeof(tagRemovedChars) == typeof('str') ?
				new RegExp(tagRemovedChars, 'g')
			: /[\s-_]/g
		var res = (tags.length == 1 && tags[0] instanceof Array) ? 
			tags.pop() 
			: tags
		res = res
			.map(function(tag){
				return tag
					.trim()
					.toLowerCase()
					.replace(tagRemovedChars, '')
					// sort sets within paths...
					.split(/[\\\/]/g)
						.map(function(e){
							return e
								.split(/:/g)
								.sort()
								.join(':') })
						.join('/') })
					// sort sets containing paths...
					//.split(/:/g)
					//	.sort()
					//	.join(':') })
			.unique()
		return (tags.length == 1 && !(tags[0] instanceof Array)) ? 
			// NOTE: if we got a single tag return it as a single tag...
			res.pop() 
			: res
	},

	// Query parser...
	//
	// NOTE: this is loosely based on Slang's parser...
	// 		...see for details: https://github.com/flynx/Slang
	__query_lexer: RegExp([
			/* XXX there are two ways to deal with comments:
			//			1) lexer-based -- this section commented, next uncommented...
			//			2) macro-based -- this section uncommented, next commented...
			//		#2 is a bit buggy...
			// terms to keep in the stream...
			'\\s*('+[
				'\\n',
				'--',
			].join('|')+')',
			//*/

			// lexer comments...
			'\\s*\\(\\*[^\\)]*\\*\\)\\s*',
			'\\s*--.*[\\n$]',
			//*/

			// quoted strings...
			// NOTE: we do not support escaped quotes...
			'\\s*"([^"]*)"\\s*',
			"\\s*'([^']*)'\\s*",

			// quote...
			'\\s*(\\\\)',

			// braces...
			'\([\\[\\]()]\)',

			// whitespace...
			'\\s+',
		].join('|'),
		'm'),
	parseQuery: function(query){
		// lex the input... 
		query = query instanceof Array ? 
			query 
			: query
				// split by strings whitespace and block comments...
				.split(this.__query_lexer || this.constructor.__query_lexer)
				// parse numbers...
				// XXX do we need number parsing???
				.map(function(e){ 
					// numbers...
					if(/^[-+]?[0-9]+\.[0-9]+$/.test(e)){
						e = parseFloat(e)
					} else if(/^[-+]?[0-9]+$/.test(e)){
						e = parseInt(e)
					}
					return e
				})
				// remove undefined groups...
				.filter(function(e){ 
					// NOTE: in JS 0 == '' is true ;)
					return e !== undefined && e !== '' })

		var brace = function(code, b){
			var res = []

			while(code.length > 0){
				c = code.shift()
				if(c == '[' || c == '('){
					res.push( brace(code, c == '[' ? ']' : ')') )

				} else if(c == b){
					return res

				} else if(c == ']' || c == ')'){
					throw new SyntaxError(`Tag Query: Unexpected "${c}".`)

				} else {
					res.push(c) 
				}
			}

			if(b != null){
				throw new SyntaxError(`Tag Query: Expecting "${b}" got end of query.`)
			}

			return res
		}

		return brace(query)
	},
}


// XXX this should have the following sections:
// 		- tag-tag relations -- persistent
// 			- tags
// 			- paths
// 			- sets/relations
// 		- content (tag-object) -- volatile
// 			- tags
// 			- paths
// 			- sets/relations
// 			- tag-object references
// XXX should we store normalized and non-normalized tags for reference???
// 		...there are two ways to think of this:
// 			1) both (a-la flickr) -- keep both, use normalized internally
// 			2) only normalized -- simpler but may surprise the user and not be as pretty...
var TagsPrototype = {
	config: {
		tagRemovedChars: '[\\s-_]',
	},

	// data...
	//
	// Format:
	// 	[ <tag>, ... ]
	//
	// XXX Q: should these be normalized???
	__persistent_tags: null,

	// Format:
	// 	{
	// 		<alias>: <normalized-tag>,
	// 	}
	//
	// XXX need introspection for this...
	// 		...should this be .aliases ???
	__aliases: null,

	// Format:
	// 	{
	// 		<tag>: [ <item>, ... ],
	// 		...
	// 	}
	__index: null,


	// Utils...
	//
	// proxy to Tags.normalize(..)
	// XXX Q: should this be .normalizeTags(..) ???
	normalize: function(...tags){
		return this.constructor.normalize.call(this, ...tags) },

	// Match tags...
	//
	// 	Check if tags match...
	// 	.match(tag, tag)
	// 		-> bool
	//
	// 	Get all matching tags...
	// 	.match(tag)
	// 		-> tags
	//
	// 	Filter out non-matching from tags...
	// 	.match(tag, tags)
	// 		-> tags
	//
	//
	// Query syntax:
	// 	a		- tag
	// 	a/b		- path, defines a directional relation between a and b
	// 	a:b		- set, defines a non-directional relation between a and b
	// 	*		- tag placeholder, matches one and only one tag name
	//
	// NOTE: a tag is also a singular path and a singular set.
	// NOTE: paths have priority over sets: a/b:c -> a / b:c
	//
	//
	// Two paths match iff:
	// 	- all of the components of the first are contained in the second and
	// 	- component order is maintained.
	//
	// Example:
	// 		path		match		no match
	// 		--------------------------------
	// 		a			a			z
	// 					a/b			b/c
	// 					x/a/y		...
	// 					x/a
	// 					...
	// 		--------------------------------
	// 		a/b			a/b			b/a
	// 					x/a/y/b/z	b/x
	// 					...			...
	//
	//
	// Two sets match iff:
	// 	- all of the components of the first are contained in the second.
	//
	// Example:
	// 		set			match		no match
	// 		--------------------------------
	// 		a			a			z
	// 					a:b			b:c
	// 					x:a			...
	// 					x:a:z
	// 					...
	// 		--------------------------------
	// 		a:b			a:b			a:x
	// 					b:c			z:b:m
	// 					a:x:b		...
	// 					...
	//
	//
	// NOTE: this is not symmetric e.g. a will match a:b but not vice-versa.
	match: function(a, b){
		var that = this

		// get matching tags...
		if(b == null || b instanceof Array){
			return (b || this.tags())
				.filter(function(tag){ 
					return that.match(a, tag)})

		// match two tags...
		} else {
			// normalized match...
			a = this.normalize(a)
			b = this.normalize(b)
			if(a == b){
				return true
			}

			// set matching...
			// 	a matches b iff each element of a exists in b.
			var matchSet = function(a, b){
				a = a.split(/:/g) 
				b = b.split(/:/g)
				return a.length <= b.length
					&& a.filter(function(e){ 
						return e != '*' 
							&& b.indexOf(e) < 0 }).length == 0 }

			// path matching...
			// 	a matches b iff each element in a exists in b and in the same 
			// 	order as in a.
			a = a.split(/[\/\\]/g) 
			b = b.split(/[\/\\]/g)

			return b
				.reduce(function(a, e){
					return (a[0] 
							&& (a[0] == '*' 
								|| matchSet(a[0], e))) ? 
						a.slice(1) 
						: a
				}, a).length == 0
		}
	},


	// Introspection...
	//
	get length(){
		return this.values().length },

	// XXX need a way to add/remove these...
	persistent: function(){
		// XXX
	},
	// Tags present in the system...
	//
	//	Get all tags...
	//	.tags()
	//		-> tags
	//
	//	Get value tags...
	//	.tags(value)
	//		-> tags
	//
	// NOTE: this includes all the .persistent tags as well as all the 
	// 		tags actually used.
	tags: function(value){
		var that = this
		// get tags of specific value...
		if(value){
			return Object.entries(this.__index || {})
				.filter(function(e){ return e[1].has(value) })
				.map(function(e){ return e[0] })
				.flat()
				.unique()

		// get all tags...
		} else {
			return Object.keys(this.__index || {})
				.concat((this.__persistent_tags || [])
					.map(function(t){ 
						return that.normalize(t) }))
				.unique()
		}
	},
	//
	// 	Get all values...
	// 	.values()
	// 		-> values
	//
	// 	Get specific tag values...
	// 	.values(tag)
	// 		-> values
	//
	// NOTE: this does not support any query syntax...
	values: function(tag){
		var that = this
		tag = this.normalize(tag || '*')
		return [...new Set(
			Object.entries(this.__index || {})
				.filter(function(e){ 
					return tag == '*' 
						|| that.match(tag, e[0]) })
				.map(function(s){ return [...s[1]] })
				.flat())] },

	// Testing...
	// XXX can these be faster???
	// XXX should these take multiple values???
	hasTag: function(tag){
		for(var t of this.tags()){
			if(this.match(tag, t)){
				return true
			}
		}
		return false
	},
	has: function(value){
		for(var v of Object.values(this.__index)){
			if(v.has(value)){
				return true
			}
		}
		return false
	},


	// Add/Remove/Modify tags API...
	// 
	// 	Resolve alias (recursive)...
	// 	.alias(tag)
	// 		-> value
	// 		-> undefined
	//
	// 	Set alias...
	// 	.alias(tag, value)
	// 		-> this
	//
	// 	Remove alias...
	// 	.alias(tag, null)
	// 		-> this
	//
	alias: function(tag, value){
		var aliases = this.__aliases = this.__aliases || {}
		// XXX this seems a bit ugly...
		var resolve = function(tag, seen){
			seen = seen || []
			// check for loops...
			if(seen.indexOf(tag) >= 0){
				throw new Error(`Recursive alias chain: "${ 
					seen
						.concat([seen[0]])
						.join('" -> "') }"`) }
			var next = aliases[tag] 
				|| aliases[this.normalize(tag)]
			seen.push(tag)
			return next != null ?
					resolve(next, seen)
				: seen.length > 1 ? 
					tag
				: undefined
		}.bind(this)

		// resolve...
		if(arguments.length == 1){
			return resolve(tag.trim())

		// remove...
		} else if(value == null){
			delete aliases[tag.trim()]
			delete aliases[this.normalize(tag)]

		// set...
		} else {
			tag = tag.trim()
			value = this.normalize(value)

			// check for recursion...
			var chain = []
			var target = resolve(value, chain)
			if(target == tag || target == this.normalize(tag)){
				throw new Error(`Creating a recursive alias chain: "${ 
					chain
						.concat([chain[0]])
						.join('" -> "') }"`) }

			aliases[tag] = value
		}
		return this
	},


	// Add/Remove/Modify content API...
	//
	// XXX save un-normalized tags as aliases...
	// XXX when value is not given, add tags to persistent tags...
	tag: function(tags, value){
		var that = this
		this.__index = this.__index || {}
		this.normalize(tags instanceof Array ? tags : [tags])
			.forEach(function(tag){
				(that.__index[tag] = that.__index[tag] || new Set()).add(value) })
		return this
	},
	untag: function(tags, value){
		var that = this
		this.normalize(tags instanceof Array ? tags : [tags])
			.forEach(function(tag){
				var s = that.__index[tag] || new Set()
				s.delete(value) 
				// remove empty sets...
				if(s.size == 0){
					delete that.__index[tag]
				}
			})
		return this
	},
	

	// Query API...
	//
	// The language (JS):
	// 	<query> ::= <tag> 
	// 		| <call> 
	// 		| <list>
	//
	// 	<tag> ::= string
	//
	// 	<call> ::= [ <function-name> ]
	// 		| [ <function-name>, <query>, .. ]
	//
	// 	<list> ::= []
	// 		| [ <query>, .. ]
	//
	//
	// Values resolution:
	// 	tag		-> resolves to list of matching values as returned by .values(tag)
	// 	list	-> resolved to list of resolved items
	// 	call	-> resolves to list of values returned by the called function
	//
	//
	// Functions:
	// 	(and ..)
	// 		resolves to the list of values present in each of the arguments
	// 	(or ..)
	// 		resolves to the list of all the values of all the arguments
	// 	(not a ..)
	// 		resolves to list of values in a not present in any of the 
	// 		other arguments
	// 
	//
	// Special forms:
	// 	(values ..)
	// 		resolves to the list of values as-is.
	// 		this makes it possible to pass in a set of values as-is 
	// 		without resolving them as tags.
	//
	//
	// Testing queries:
	// 	(values ..) adds the ability to test queries independently of 
	// 	the actual content of the Tags object by passing in explicit 
	// 	values...
	//
	// 	Example:
	// 		.query(`
	// 			(and 
	// 				(values a b c), 
	// 				(values b c d))`)
	// 			-> ['b', 'c']
	//
	//
	// XXX not sure about the .flat(1) calls...
	__query_ns: {
		and: function(...args){
			// NOTE: we are sorting the lists here to start with the 
			// 		largest and smallest lists (head/tail) to drop the 
			// 		majority of the values the earliest and speed things 
			// 		up...
			args = args
				.sort(function(a, b){ return a.length - b.length })
			return [...args
				.reduce(function(res, l){
						return res.intersect(l.flat(1)) }, 
					new Set(args.pop()))] },
		or: function(...args){
			return [...new Set(args.flat(1))] },
		not: function(...args){
			return new Set(args.shift() || [])
				.subtract(args.flat()) },
	},
	__query_ns_special: {
		values: function(...args){ return args },
		flat: function(...args){ return args.flat() },
	},
	// NOTE: the query parser is generic and thus is implemented in the
	// 		constructor...
	parseQuery: function(query){
		return this.constructor.parseQuery.call(this, query) },
	//
	//	Execute query...
	//	.query(query)
	//		-> values
	//
	//	Execute the query and return raw/structured results...
	//	.query(query, true)
	//		-> values
	//
	query: function(query, raw){
		var that = this
		var ns = this.__query_ns
		var sns = this.__query_ns_special

		// Query Language Executor...
		var QL = function(args){
			return (
				// function -> query args and call...
				args[0] in ns ?
					ns[args[0]].call(that, ...QL(args.slice(1)))
				// special form -> pass args as-is...
				: args[0] in sns ?
					sns[args[0]].call(that, ...args.slice(1))
				// list of tags -> query each arg...
				: args
					.map(function(arg){
						return arg instanceof Array ?
								QL(arg)
							: that.values(arg) }) ) }

		return QL(query instanceof Array ? 
				query 
				: this.parseQuery(query) )
			.run(function(){
				return raw ?
					this
					: (this
						// XXX should these be here???
						.flat()
						.unique()) })
	},


	// Object utility API...
	//
	// 	.clone()
	// 	.clone('full')
	// 		-> tags
	//
	// 	.clone('tags')
	// 		-> tags
	//
	clone: function(mode){
		return new this.constructor(this.json(mode)) },

	// serialization...
	//
	// 	.json()
	// 	.json('full')
	// 		-> json
	//
	// 	.json('tags')
	// 		-> json
	//
	//
	// Format:
	// 	{
	// 	}
	//
	json: function(mode){
		// XXX
	},
	load: function(json){
		// XXX
		return this
	},

	// constructor...
	__init__: function(json){
		json 
			&& this.load(json) },
}


var Tags = 
module.Tags = 
object.makeConstructor('Tags', 
		TagsClassPrototype, 
		TagsPrototype)



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

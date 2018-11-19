/**********************************************************************
* 
* Features:
* 	- tag paths
* 		a/b/c
* 	- tag sets/relations
* 		a:b
* 	- serializable tag queries
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('lib/object')
var util = require('lib/util')



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
	// XXX should this sort sets???
	// XXX should this be .normalizeTags(..) ???
	normalize: function(...tags){
		var tagRemovedCahrs = (this.config || {})['tagRemovedCahrs']
		tagRemovedCahrs = tagRemovedCahrs instanceof RegExp ? 
				tagRemovedCahrs
			: typeof(tagRemovedCahrs) == typeof('str') ?
				new RegExp(tagRemovedCahrs, 'g')
			: /[\s-_]/g
		var res = (tags.length == 1 && tags[0] instanceof Array) ? 
			tags.pop() 
			: tags
		res = res
			.map(function(tag){
				return tag
					.trim()
					.toLowerCase()
					.replace(tagRemovedCahrs, '')
					// XXX do we need to sort here???
					.split(/:/)
						.sort()
						.join(':') })
			.unique()
		return (tags.length == 1 && !(tags[0] instanceof Array)) ? 
			// NOTE: if we got a single tag return it as a single tag...
			res.pop() 
			: res
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
var TagsPrototype = {
	config: {
		tagRemovedCahrs: '\\s-_',
	},

	// Utils...
	//
	// proxy to Tags.normalize(..)
	// XXX should this be .normalizeTags(..) ???
	normalize: function(...tags){
		return this.constructor.normalize.call(this, ...tags) },

	// XXX expand aliases...
	// XXX


	// Add/Remove/Modify tags API...
	// XXX
	path: function(){
		// XXX
		return this
	},
	alias: function(){
		// XXX
		return this
	},


	// Add/Remove/Modify content API...
	// XXX
	tag: function(){
		// XXX
		return this
	},
	untag: function(){
		// XXX
		return this
	},
	

	// Query API...
	//
	// XXX not sure about the format...
	// 		...we can use diff:
	// 			tags.query(
	// 				AND('x', 
	// 					OR('a', 'b'),
	// 					NOT('z')))
	// 		the algorithm would be something like:
	// 			- get individual tags from query
	// 			- match tags
	// 			- build item list
	// 		another syntax variants might be:
	// 			tags.query(
	// 				{and: [
	// 					'x',
	//					{or: ['a', 'b']},
	//					{not: 'z'} ]})
	// 			// lisp-like...
	// 			tags.query(
	// 				['and',
	// 					'x',
	//					['or', 'a', 'b'],
	//					['not', 'z']])
	query: function(){
		// XXX
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

/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var actions = require('lib/actions')
var features = require('lib/features')

var core = require('features/core')
var widgets = require('features/ui-widgets')

var browse = require('lib/widget/browse')



/*********************************************************************/
// Persistent tags (tree) 
//
// XXX add save/load tree to fs...

var PersistentTagsActions = actions.Actions({
})


var PersistentTags = 
module.PersistentTags = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	tag: 'persistent-tags',
	depends: [
		'base',
	],
	actions: PersistentTagsActions, 

	handlers: [],
})



//---------------------------------------------------------------------
// Persistent tags UI...
//
// Provide the following interfaces:
// 	- cloud
// 	- tree
//
// Use-cases:
// 	- edit tag tree
// 	- edit image tags
//

var TagUIActions = actions.Actions({
	config: {
		// XXX should this be a list or a tree (list of paths)????
		// XXX support tag chains...
		// 		...a chain is a means to combine tags like:
		// 			vehicle/car + color/red can be represented as car:red
		// 			this would mean that an image both has a 'car' and 'red'
		// 			but also specifically states that it contains a 'red car'
		// 		...need to think of a good way to implement this...
		// 			...the obvious way is when tagging with 'car:red' to
		// 			tag the image with: 'car', 'red' and 'car:red'
		// 			Q: is 'car:red' the same as 'red:car'??
		// 			...feels that it should be...
		// XXX support tag paths as tags???
		// 		...a tag can be part of several paths, we should be able 
		// 		to use a specific one...
		// 		...an example would be something like:
		// 			species/man
		// 			people/man
		// 		Q: do we need this???
		// 		Q: can this be implemented via chains???
		// XXX should we have associative aliases???
		// 		like: 
		// 			'men' is 'many:man'
		// 			'women' is 'many:woman'
		// 			...
		// XXX need a tree api to query the tag tree...
		// 		.tagParents(tag)
		// 		.tagChildren(tag)
		// 		.tagOrpahns()
		// 		 ...
		// XXX should this be here or in .data???
		// XXX add "auto-tags" -- tags that are automatically added 
		// 		depending on specific rules, like:
		// 			orientation:landscape / orientation:portrait / orientation:square (???)
		// 		...these should not be settable by user...
		// XXX do a whitepaper (RFC?) on this system when done...
		'base-tags': [
			'count',
			'count/one',
			'count/two',
			'count/some',
			'count/many',

			'people',
			'people/crowd',
			'people/group',
			'people/couple',
			'people/man',
			'people/woman',
			'people/lady',
			'people/girl',
			'people/boy',
			'people/child',
			// ...

			'name',

			'role',
			'role/photographer',
			'role/artist',
			'role/painter',
			// ...

			'color',
			'color/red',
			'color/green',
			'color/blue',
			'color/white',
			'color/black',
			'color/orange',
			'color/yellow',
			'color/gray',
			// ...

			// XXX should this be 'type' or something else???
			'genre',
			'genre/documentary',
			'genre/landscape',
			'genre/portrait',
			'genre/wildlife',
			'genre/macro',
			'genre/abstract',
			'genre/sport',
			// ...

			'activity',
			'activity/sport',
			'activity/sport/football',
			'activity/sport/american-football',
			'activity/sport/baseball',
			'activity/sport/tennis',
			// ...
		],
	},

	// Tag cloud/list...
	//
	// XXX move this to the base tags feature...
	get tags(){
		return []
			// XXX load this from a file...
			.concat((this.config['base-tags'] || [])
				// split tag paths...
				.map(function(e){ return e.split(/[\\\/]/g) })
				.flat()) 
			.concat(Object.keys((this.data || {}).tags || {}))
   			.unique() },

	// XXX add support for tag sets and paths...
	showTagCloud: ['Tag|Edit|Image/$Tags...',
		core.doc`Show tags in cloud format...

			Show tags for current image...
			.showTagCloud([options])
			.showTagCloud('current'[, options])
				-> dialog

			Show tags for specific images...
			.showTagCloud(gid, ...[, options])
			.showTagCloud([gid, ...][, options])
				-> dialog


			Show tags for current image with custom constructor...
			.showTagCloud(func[, gid, ...][, options])
			.showTagCloud(func[, [gid, ...]][, options])
				-> dialog

			Show tags for gids image with custom constructor...
			.showTagCloud(func, gid, ... [, options])
			.showTagCloud(func, [gid, ...] [, options])
				-> dialog
				NOTE: for an example see: .cropTaggedFromCloud(..)


		The constructor func is called in the action context and has the
		following format:
			func(path, make, gids, opts)

		This uses the same option format as browse.makeLister(..) with 
		the following additions:
			{
				//
				// this can be:
				// 	'count' (default)
				// 	'name'
				sortTagsBy: 'count',

				// callback to be called when a tag state is flipped...
				//
				// NOTE: this if set will disable auto dialog update on 
				// 		item change, this should be done by itemOpen(..).
				itemOpen: <function(tag, state)>,

				// disable dialog update on item open...
				//
				// NOTE: this is ignored if itemOpen is set.
				lazyDialogUpdate: false,

				// 
				hideTagCount: false,

				// if false do not show the 'New...' button...
				noNewButton: false,
			}


		NOTE: if 'marked' is passed as one of the gids it will get 
			replaced with the list of marked gids...
		`,
		{dialogTitle: function(_, gids){ 
			return (gids.length == 1 && gids[0] == 'marked') ?
					'Marked image tags'
				: gids.length > 1 ?
					'Tags of: '+ gids.join(', ')
				: 'Current image tags' }},
		widgets.makeUIDialog(function(...gids){
			var that = this

			var func = gids[0] instanceof Function ? gids.shift() : null
			var opts = gids[gids.length-1] instanceof Object ? gids.pop() : {}

			gids = gids.length == 0 ? ['current'] : gids
			// handle 'marked' keyword...
			gids = gids
				.map(function(gid){
					return gid == 'marked' ? that.marked : gid })
				.flat()
				.unique()

			// XXX
			var removeTag = function(tag){
				console.log('REMOVE TAG:', tag)
				// XXX
			}

			return browse.makeLister(null, function(path, make){
				var tags = that.data.getTags(gids)

				// tags...
				// XXX make this a group...
				// XXX indicate if some of the gids are tagged...
				// 		...need three states per tag:
				// 			- on		- all are tagged
				// 			- partial	- some are tagged
				// 			- off		- none are tagged
				// XXX add key binding to delete a tag...
				that.tags
					.sort()
					// prep for sort...
					.map(function(t, i){ return [t, i, (that.data.tags[t] || {}).len] })
					// XXX add ability to sort by popularity, both local
					//		(selected tags) and global...
					.run(function(){
						return opts.sortTagsBy == 'name' ?
								this
							// count...
							: this.sort(function(a, b){
								var ac = a[2]
								var bc = b[2]

								return ac != null && bc != null ? 
										bc - ac
									// keep used tags before unused...
									: ac == null ?
										1
									: bc == null ?
										-1
									// sort by position...
									: a[0] - b[0] 
							}) })
					.map(function(tag){
						// normalize...
						var count = tag[2]
						tag = tag[0]

						return make(tag, {
							cls: tags.indexOf(tag) >= 0 ? 'tagged' : '',
							style: {
								opacity: tags.indexOf(tag) >= 0 ? '' : '0.3'
							},
							attrs: {
								count: opts.hideTagCount || count,
							},
							open: function(){
								var e = $(this)
								var on = e.css('opacity')
								on = on == '' || on == '1'

								e.css('opacity', on ? 0.3 : '')

								// NOTE: we are reversing the state here 
								// 		because 'on' contains the state 
								// 		prior to modification...
								opts.itemOpen ?
									(on ?
										opts.itemOpen.call(that, tag, false)
										: opts.itemOpen.call(that, tag, true))
									:(on ?
										that.untag(tag, gids)
										: that.tag(tag, gids))

								opts.itemOpen 
									|| opts.lazyDialogUpdate
									|| make.dialog.update()
							},
							buttons: [
								// remove tag button...
								//['&times;', removeTag.bind(that, tag) ],
							],
						})
					})

				if(!opts.noNewButton){
					make.Separator()

					make.Editable('$New...', {
						clear_on_edit: true,
						editdone: function(evt, tag){
							tag = tag.trim()
							// no empty tags...
							if(tag == ''){
								return
							}

							that.tag(tag, gids)

							// update tag list...
							make.dialog
								.update()
								// select the new tag...
								.then(function(){
									make.dialog.select(tag) })
						},
					})
				}

				func
					&& func.call(that, path, make, gids, opts)
			}, 
			Object.assign({ 
				cloudView: true, 
				close: function(){ that.refresh() },
			}, opts))
		})],
	showMarkedTagCoud: ['Tag|Mark/$Tag $marked images...',
		{dialogTitle: 'Tag marked images'},
		'showTagCloud: "marked"'],
	// XXX should this show all the tags or just the used???
	// XXX should we add image count to tags???
	cropTaggedFromCloud: ['Tag|Crop/$Crop $ta$gged...',
		widgets.uiDialog(function(){
			var that = this
			var tags = new Set()

			return this.showTagCloud(
				function(path, make, gids, opts){
					make.Separator()
					make.Action('$Crop', {
						open: function(){
							that.cropTagged([...tags])

							make.dialog.close()
						}
					})
				}, 
				[], 
				{
					itemOpen: function(tag, state){
						state ? 
							tags.add(tag) 
							: tags.delete(tag) },
					'noNewButton': true,
				}) })],


	// Tag tree...
	//
	get tagTree(){
		// XXX
	},

})


var TagUI = 
module.TagUI = core.ImageGridFeatures.Feature({
	title: '',
	doc: '',

	// XXX
	tag: 'ui-tags',
	depends: [
		// XXX
	],

	actions: TagUIActions, 

	handlers: [],
})




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

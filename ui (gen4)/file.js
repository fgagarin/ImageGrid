/**********************************************************************
* 
*
*
**********************************************************************/

var pathlib = require('path')
var events = require('events')

var fse = require('fs.extra')
var glob = require('glob')
var Promise = require('promise')

var guaranteeEvents = require('guarantee-events')


define(function(require){ var module = {}
console.log('>>> file')

//var DEBUG = DEBUG != null ? DEBUG : true

var data = require('data')
var images = require('images')

var tasks = require('lib/tasks')



/*********************************************************************/

var INDEX_DIR = '.ImageGrid'



/*********************************************************************/
// Queue
//
// Task
//



/*********************************************************************/
// helpers...

// Guarantee that the 'end' and 'match' handlers will always get called 
// with all results at least once...
//
// This does two things:
// 	- every 'end' event handler will get the full result set, regardless
// 		of when it was set...
// 	- every 'match' handler will be called for every match found, again
// 		regardless of whether it was set before or after the time of 
// 		match.
//
// This prevents handlers from missing the event they are waiting for, 
// essentially making it similar to how Promise/Deferred handle their
// callbacks.
//
var guaranteeGlobEvents =
module.guaranteeGlobEvents =
function(glob){ return guaranteeEvents('match end', glob) }



/*********************************************************************/
// Reader...


// XXX return a promise rather than an event emitter (???)
// XXX glob has a problem: if a match happens fast enough and we are slow
// 		enough to register a 'match' handler, then that match(s) will get
// 		missed...
var listIndexes =
module.listIndexes = 
function(base){
	return guaranteeGlobEvents(glob(base +'/**/'+ INDEX_DIR))
}


var listPreviews =
module.listPreviews = 
function(base){
	return guaranteeGlobEvents(glob(base +'/*px/*jpg'))
}


// XXX return a promise rather than an event emitter (???)
function listJSON(path, pattern){
	pattern = pattern || '*'
	return guaranteeGlobEvents(glob(path +'/'+ pattern +'.json'))
}


var loadFile = Promise.denodeify(fse.readFile)


// XXX handle errors...
function loadJSON(path){
	return loadFile(path).then(JSON.parse)
}


// Load index(s)...
//
//	loadIndex(path)
//		-> data
//
//	loadIndex(path, logger)
//		-> data
//
//
// Procedure:
// 	- locate indexes in path given
// 	- per each index
// 		- get all .json files
// 		- get and load latest base file per keyword
// 		- merge all later than loaded base diff files per keyword
//
// Merging is done by copying the key-value pairs from diff to the
// resulting object.
//
//
// Index format (input):
// 	.ImageGrid/
// 		+- [<timestamp>-]<keyword>[-diff].json
// 		+- ...
//
//
// Output format:
// 	{
// 		// one per index found...
// 		<path>/<sub-path>: {
// 			<keyword>: <kw-data>,
// 			...
// 		},
// 		...
// 	}
//
//
// Events emitted on logger if passed:
// 	- queued <path>			- json file path queued for loading
// 	- loaded <path>			- done loading json file path
// 	- index <path> <data>	- done loading index at path
// 	- error <err>			- an error occurred...
//
//
// NOTE: this is fairly generic and does not care about the type of data
// 		or it's format as long as it's JSON and the file names comply
// 		with the scheme above...
// NOTE: this only loads the JSON data and does not import or process 
// 		anything...
//
// XXX test with:
// 		requirejs(['file'], 
// 			function(m){ 
// 				f = m.loadIndex("L:/mnt/hdd15 (photo)/NTFS1/media/img/others") })
// 			.done(function(d){ console.log(d) })
// XXX need to do better error handling -- stop when an error is not recoverable...
// XXX a bit overcomplicated (???), see if this can be split into more generic 
// 		sections...
// XXX problem with diff merging...
var loadIndex =
module.loadIndex = 
function(path, logger){
	var p = path.split(INDEX_DIR)
	var last = p.slice(-1)[0].trim()

	return new Promise(function(resolve, reject){
		// we've got an index...
		if(p.length > 1 && /^\/*$/.test(last)){
			listJSON(path)
				// XXX handle errors...
				.on('error', function(err){
					logger && logger.emit('error', err)
				})
				.on('end', function(files){
					var res = {}
					var index = {}
					var root = {}

					// group by keyword...
					//
					// this will build a structure in the following format:
					// 	{
					// 		<keyword>: [
					// 			// diff files...
					// 			// NOTE: the first argument indicates 
					// 			//	if this is a diff or not, used to 
					// 			//	skip past the last base...
					// 			[true, <filename>],
					// 			...
					//
					// 			// base file (non-diff)
					// 			[false, <filename>]
					// 		],
					// 		...
					// 	}
					//
					// This is used to sequence, load and correctly merge 
					// the found JSON files.
					//
					// NOTE: all files past the first non-diff are skipped.
					files
						.sort()
						.reverse()
						.forEach(function(n){
							var b = pathlib.basename(n)
							var s = b.split(/[-.]/g).slice(0, -1)

							// <keyword>.json / non-diff
							// NOTE: this is a special case, we add this to
							// 		a separate index and then concat it to 
							// 		the final list if needed...
							if(s.length == 1){
								var k = s[0]
								root[k] = n 
								return

							// <timestamp>-<keyword>[-diff].json / diff / non-diff
							} else {
								var k = s[1]
								var d = s[2] == 'diff'
							}

							// new keyword...
							if(index[k] == null){
								index[k] = [[d, n]]
								logger && logger.emit('queued', n)

							// do not add anything past the latest non-diff 
							// for each keyword...
							} else if(index[k].slice(-1)[0][0] == true){
								index[k].push([d, n])
								logger && logger.emit('queued', n)
							}
						})

					// add base files back where needed...
					Object.keys(root)
						.forEach(function(k){
							var n = root[k]

							// no diffs...
							if(index[k] == null){
								index[k] = [[false, n]]
								logger && logger.emit('queued', n)

							// add root file if no base is found...
							} else if(index[k].slice(-1)[0][0] == true){
								index[k].push([false, n])
								logger && logger.emit('queued', n)
							}
						})

	
					// load...
					Promise
						.all(Object.keys(index).map(function(keyword){
							// get relevant paths...
							var diffs = index[keyword]
							var latest = diffs.splice(-1)[0][1]

							// NOTE: so far I really do not like how nested and
							// 		unreadable the Promise/Deferred code becomes
							// 		even with a small rise in complexity...
							// 		...for example, the following code is quite
							// 		simple, but does not look the part.
							//
							// 		Maybe it's a style thing...

							// load latest...
							return loadJSON(latest)
								.then(function(data){
									logger && logger.emit('loaded', latest)

									var loading = {}

									// handle diffs...
									return Promise
										// load diffs...
										.all(diffs.map(function(p){
											p = p[1]
											return loadJSON(p)
												// XXX handle errors...
												// XXX we should abort loading this index...
												.catch(function(err){
													logger && logger.emit('error', err)
												})
												.then(function(json){
													// NOTE: we can't merge here
													// 		as the files can be
													// 		read in arbitrary order...
													loading[p] = json
												})
										}))
										// merge diffs...
										.then(function(){
											diffs
												.reverse()
												.forEach(function(p){
													p = p[1]

													var json = loading[p]

													for(var n in json){
														data[n] = json[n]
													}

													logger && logger.emit('loaded', p)
												})

											res[keyword] = data
										})
								})
						}))
						.then(function(){
							logger && logger.emit('index', path, res)

							var d = {}
							d[path] = res

							resolve(d)
						})
				})

		// no explicit index given -- find all in sub tree...
		} else {
			var res = {}
			var loaders = []

			// XXX handle 'error' event...
			listIndexes(path)
				// XXX handle errors...
				.on('error', function(err){
					logger && logger.emit('error', err)
				})
				// collect the found indexes...
				.on('match', function(path){
					loaders.push(loadIndex(path, logger) 
						.then(function(obj){ 
							// NOTE: considering that all the paths within
							// 		the index are relative to the preview 
							// 		dir (the parent dir to the index root)
							// 		we do not need to include the index 
							// 		itself in the base path...
							var p = path.split(INDEX_DIR)[0]
							res[p] = obj[path] 
						}))
				})
				// done...
				.on('end', function(paths){
					// wait for all the loaders to complete...
					Promise.all(loaders).then(function(){ resolve(res) })
				})
		}
	})
}
 

// get/populate the previews...
//
// format:
// 	{
// 		<index-base>: {
// 			<gid>: {
// 				<resolution>: <local-path>,
// 				...
// 			},
// 			...
// 		},
// 		...
// 	}
//
// XXX should this be compatible with loadIndex(..) data???
// XXX handle errors....
var loadPreviews =
module.loadPreviews =
function(base, previews, absolute_path){
	previews = previews || {}

	return new Promise(function(resolve, reject){
		listIndexes(base)
			// XXX handle errors....
			//.on('error', function(err){
			//})
			.on('match', function(base){
				if(!(base in previews)){
					previews[base] = {}
				}

				var images = previews[base]

				listPreviews(base)
					// XXX handle errors....
					//.on('error', function(err){
					//})
					// preview name syntax:
					// 	<res>px/<gid> - <orig-filename>.jpg
					.on('match', function(path){
						// get the data we need...
						var gid = pathlib.basename(path).split(' - ')[0]
						var res = pathlib.basename(pathlib.dirname(path))

						// build the structure if it does not exist...
						if(!(gid in images)){
							images[gid] = {}
						}
						if(images[gid].preview == null){
							images[gid].preview = {}
						}

						// add a preview...
						// NOTE: this will overwrite a previews if they are found in
						// 		several locations...
						images[gid].preview[res] = INDEX_DIR +'/'+ path.split(INDEX_DIR)[1]
					})
			})
			.on('end', function(){
				resolve(previews)
			})
	})
}



// XXX move this to a better spot...
// XXX make this merge if we locate more than one index...
var buildIndex = 
module.buildIndex = function(index, base){
	var d = data.Data.fromJSON(index.data)

	// buildup the data object...
	// NOTE: this is mostly to attach stuff that is stored in separate files...
	
	// .tags + bookmarks + selection...
	d.tags = index.tags || {} 
	d.tags.bookmark = index.bookmarked ? index.bookmarked[0] : []
	d.tags.selected = index.marked || []
	d.sortTags()

	// .current...
	d.current = index.current || d.current


	// images...
	// XXX there seems to be a problem with updated images...
	// 		- in the test set not all rotated manually images are loaded rotated...
	var img = images.Images(index.images)

	if(base){
		d.base_path = base
		// XXX STUB remove ASAP... 
		// 		...need a real way to handle base dir, possible
		// 		approaches:
		// 			1) .base attr in image, set on load and 
		// 				do not save (or ignore on load)...
		// 				if exists prepend to all paths...
		// 				- more to do in view-time
		// 				+ more flexible
		// 			2) add/remove on load/save (approach below)
		// 				+ less to do in real time
		// 				- more processing on load/save
		img.forEach(function(_, img){ img.base = base })
	}

	return {
		data: d, 
		images: img,
	}
}



/*********************************************************************/
// Writer...




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

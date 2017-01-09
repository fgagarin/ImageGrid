/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('lib/object')



/*********************************************************************/

var MODIFIERS =
module.MODIFIERS = [ 'ctrl', 'alt', 'meta', 'shift' ]


var KEY_SEPARATORS =
module.KEY_SEPARATORS = ['+', '-', '_']


// Neither SPECIAL_KEYS nor KEY_CODES are meant for direct access, use
// toKeyName(<code>) and toKeyCode(<name>) for a more uniform access.
//
// NOTE: these are un-shifted ASCII key names rather than actual key 
// 		code translations.
// NOTE: ASCII letters (capital) are not present because they actually 
// 		match their key codes and are accessible via:
// 			String.fromCharCode(<code>) or <letter>.charCodeAt(0)
// NOTE: the lower case letters are accessible by adding 32 to the 
// 		capital key code.
// NOTE: don't understand why am I the one who has to write this...
var SPECIAL_KEYS =
module.SPECIAL_KEYS = {
	// Special Keys...
	9:		'Tab',		33:		'PgUp',		45:		'Ins',		
	13:		'Enter',	34:		'PgDown',	46:		'Del',		
	16:		'Shift',	35:		'End',		 8:		'Backspace',
	17:		'Ctrl',		36:		'Home',		91:		'Win',		
	18:		'Alt',		37:		'Left',		93:		'Menu',		
	20:		'Caps Lock',38:		'Up',	 
	27:		'Esc',		39:		'Right',  
	32:		'Space',	40:		'Down',  

	// Function Keys...
	112:	'F1',		116:	'F5',		120:	'F9', 
	113:	'F2',		117:	'F6',		121:	'F10',
	114:	'F3',		118:	'F7',		122:	'F11',
	115:	'F4',		119:	'F8',		123:	'F12',

	// Number row..
	// NOTE: to avoid conflicts with keys that have a code the same as
	// 		the value of a number key...
	// 			Ex:
	// 				'Backspace' (8) vs. '8' (56)
	// 				'Tab' (9) vs. '9' (57)
	// 		...all of the numbers start with a '#'
	// 		this is a problem due to JS coercing the types to string
	// 		on object attr access.
	// 			Ex:
	// 				o = {1: 2}
	// 				o[1] == o['1'] == true
	49: '#1',	50: '#2',	51: '#3',	52: '#4',	53: '#5',
	54: '#6', 	55: '#7',	56: '#8',	57: '#9',	48: '#0',

	// Punctuation...
	// top row...
	192: '`',		/* Numbers */		189: '-',	187: '=',
	// right side of keyboard...
				219: '[',	221: ']',	220: '\\',
				186: ';',	222: '\'',
	188: ',',	190: '.',	191: '/',
}


var SHIFT_KEYS =
module.SHIFT_KEYS = {
	'`': '~',	'-': '_',	'=':'+',

	'#1': '!',	'#2': '@',	'#3': '#',	'#4': '$',	'#5': '%',
	'#6':'^',	'#7':'&',	'#8': '*',	'#9': '(',	'#0': ')',	

	'[': '{',		']': '}',		'\\': '|',
	';': ':',		'\'': '"',
	',': '<',		'.': '>',		'/': '?'
}


var UNSHIFT_KEYS = 
module.UNSHIFT_KEYS = {}
for(var k in SHIFT_KEYS){
	UNSHIFT_KEYS[SHIFT_KEYS[k]] = k
}


// build a reverse map of SPECIAL_KEYS
var KEY_CODES =
module.KEY_CODES = {}
for(var k in SPECIAL_KEYS){
	KEY_CODES[SPECIAL_KEYS[k]] = k
}



/*********************************************************************/

// documentation wrapper...
var doc =
module.doc =
function doc(text, func){
	func = !func ? function(){return true}: func
	func.doc = text
	return func
}


// supported action format:
// 	<actio-name>[!][: <args>][-- <doc>]
//
// <args> can contain space seporated:
// 	- numbers
// 	- strings
// 	- non-nested arrays or objects
//
// XXX should this be here???
// XXX add support for suffix to return false...
var parseActionCall =
module.parseActionCall =
function parseActionCall(txt){
	// split off the doc...
	var c = txt.split('--')
	var doc = (c[1] || '').trim()
	// the actual code...
	c = c[0].split(':')

	// action and no default flag...
	var action = c[0].trim()
	var no_default = action.slice(-1) == '!'
	action = no_default ? action.slice(0, -1) : action

	// parse arguments...
	var args = JSON.parse('['+(
		((c[1] || '')
			.match(/"[^"]*"|'[^']*'|\{[^\}]*\}|\[[^\]]*\]|\d+|\d+\.\d*|null/gm) 
		|| [])
		.join(','))+']')

	return {
		action: action,
		arguments: args,
		doc: doc,
		'no-default': no_default,
	}
}



//---------------------------------------------------------------------
// Helpers...

var event2key =
module.event2key =
function event2key(evt){
	evt = evt || event

	var key = []
	evt.ctrlKey && key.push('ctrl')
	evt.altKey && key.push('alt')
	evt.metaKey && key.push('meta')
	evt.shiftKey && key.push('shift')
	key.push(code2key(evt.keyCode))

	return key
}


var key2code =
module.key2code =
function key2code(key){
	return key in KEY_CODES ? KEY_CODES[key]
		: key.length > 1 ? null
		: key.charCodeAt(0) }


var code2key =
module.code2key =
function code2key(code){
	var name = String.fromCharCode(code)
	return code in SPECIAL_KEYS ? SPECIAL_KEYS[code]
		: name != '' ? name 
		: null }


var isKey =
module.isKey = 
function isKey(key){
	var modifiers = MODIFIERS 

	var mod = normalizeKey(splitKey(key))
	var k = mod.pop()

	// key is either a key code or a valid key name...
	return (!!parseInt(k) || key2code(k) != null)
		// mod must be a subset of modifiers...
		&& mod.filter(function(m){ return modifiers.indexOf(m) < 0 }).length == 0
}


var splitKey =
module.splitKey = 
function splitKey(key){
	var sep = KEY_SEPARATORS 
	return key instanceof Array ? key
		: typeof(key) == typeof(123) ? [key]
		: key
			.split(RegExp('['
				+sep.join('\\')
				+']'))
			.concat(sep.indexOf(key.slice(-1)) >= 0 ? key.slice(-1) : [])
			.filter(function(c){ return c != '' }) }


// NOTE: this will not check if a key is a key...
var normalizeKey =
module.normalizeKey = 
function normalizeKey(key){
	var output = key instanceof Array ? 'array' : 'string'
	var modifiers = MODIFIERS 

	// special case: got a number...
	if(typeof(key) == typeof(123)){
		return code2key(key)
	}

	// sort modifiers via .modifiers and keep the key last...
	key = splitKey(key)
		.slice()
		.sort(function(a, b){
			a = modifiers.indexOf(a)
			b = modifiers.indexOf(b)
			return a >= 0 && b >= 0 ? a - b
				: a < 0 ? 1
				: -1 })

	var k = key.pop()
	k = parseInt(k) ? code2key(parseInt(k)) : k.capitalize()
	key = key.unique()
	key.push(k)

	return output == 'array' ? 
		key 
		: key.join(KEY_SEPARATORS[0] || '+')
}


var shifted =
module.shifted = 
function shifted(key){
	var output = key instanceof Array ? 'array' : 'string'
	key = normalizeKey(splitKey(key)).slice()
	var k = key.pop()

	var s = (key.indexOf('shift') >= 0 ? 
			SHIFT_KEYS[k]
			: UNSHIFT_KEYS[k])
		|| null

	var res = s == null ? key
		: (key.indexOf('shift') >= 0 ?
				key.filter(function(k){ return k != 'shift' })
				: key.concat(['shift']))
	res.push(s)

	return s == null ? null 
		: output == 'string' ? 
			res.join(KEY_SEPARATORS[0] || '+') 
		: res
}



//---------------------------------------------------------------------

var checkGlobalMode =
module.checkGlobalMode =
function checkGlobalMode(mode, keyboard, context){
	var pattern = keyboard[mode].pattern
	return !pattern 
		|| pattern == '*' 
		|| $(keyboard[mode].pattern).length > 0
}	



//---------------------------------------------------------------------

var KeyboardHandlerClassPrototype = {
	service_fields: ['doc', 'drop'],

	event2key: event2key,
	key2code: key2code,
	code2key: code2key,
	isKey: isKey,
	splitKey: splitKey,
	normalizeKey: normalizeKey,
	shifted: shifted
}

var KeyboardHandlerPrototype = {
	//service_fields: ['doc', 'drop'],

	// Format:
	// 	{
	// 		<mode>: {
	// 			doc: <doc>,
	// 			drop: [ <key>, ... ] | '*',
	//
	//			<alias>: <handler>,
	//
	//			<key>: <handler>,
	//			<key>: <alias>,
	// 		},
	// 		...
	// 	}
	__keyboard: null,
	get keyboard(){
		return this.__keyboard instanceof Function ? 
			this.__keyboard() 
			: this.__keyboard },
	set keyboard(value){
		this.__keyboard = value },

	// XXX is this needed???
	context: null,

	// utils...
	event2key: KeyboardHandlerClassPrototype.event2key,
	key2code: KeyboardHandlerClassPrototype.key2code,
	code2key: KeyboardHandlerClassPrototype.code2key,
	shifted: KeyboardHandlerClassPrototype.shifted,
	splitKey: KeyboardHandlerClassPrototype.splitKey,
	normalizeKey: KeyboardHandlerClassPrototype.normalizeKey,
	isKey: KeyboardHandlerClassPrototype.isKey,

	/*/ XXX not sure if this is needed...
	normalizeBindings: function(keyboard){
		keyboard = keyboard || this.keyboard 
		var that = this
		var service_fields = this.service_fields
		Object.keys(keyboard).forEach(function(mode){
			mode = keyboard[mode]
			
			Object.keys(mode).forEach(function(key){
				// skip service fields...
				if(service_fields.indexOf(key) >= 0){
					return
				}

				var n = that.normalizeKey(key)

				if(n != key){
					// duplicate key...
					if(n in mode){
						console.warn('duplicate keys: "'+ n +'" and "'+ k +'"')
					}

					mode[n] = mode[key]
					delete mode[key]
				}
			})
		})
		return keyboard
	},
	//*/

	//isModeApplicable: function(mode, keyboard, context){ return true },
	//isModeApplicable: checkGlobalMode,

	// get keys for handler...
	//
	// NOTE: this will also return non-key aliases...
	// NOTE: to match several compatible handlers, pass a list of handlers,
	// 		the result for each will be merged into one common list.
	//
	// XXX passing a list of handlers will yield a single list of kyes...
	// 		...should this list be split into handlers???
	keys: function(handler){
		var that = this
		var res = {}
		var keyboard = this.keyboard
		var key_separators = KEY_SEPARATORS 
		handler = arguments.length > 1 ? [].slice.call(arguments)
			: handler instanceof Array ? handler 
			: [handler]

		var walkAliases = function(res, rev, bindings, key, mod){
			mod = mod || []
			if(key in rev){
				rev[key].forEach(function(k){
					k = that.normalizeKey(mod
						.concat(that.splitKey(k))
						.unique()
						.join(key_separators[0]))
					res.indexOf(k) < 0 
						&& res.push(k)
						&& walkAliases(res, rev, bindings, k, mod)
				})
			}
		}

		Object.keys(keyboard).forEach(function(mode){
			var bindings = keyboard[mode]

			// build a reverse index...
			var rev = {}
			// XXX this will not work for handlers that are not strings...
			Object.keys(bindings).forEach(function(key){
				rev[bindings[key]] = (rev[bindings[key]] || []).concat([key]) 
			})

			var keys = []
			handler.forEach(function(h){
				keys = keys.concat((rev[h] || []).map(that.normalizeKey.bind(that)))
			})

			// find all reachable keys from the ones we just found in reverse...
			keys.slice().forEach(function(key){
				walkAliases(keys, rev, bindings, key)

				var mod = that.splitKey(key)
				var k = mod.pop()

				k != key 
					&& walkAliases(keys, rev, bindings, k, mod)
			})

			if(keys.length > 0){
				res[mode] = keys
			}
		})

		return res
	},

	// get/set handler for key...
	//
	// Search order:
	// 	- search for full key
	// 	- search for shifted key if applicable
	// 	- search for key without modifiers
	// 		- if an alias is found it is first checked with and then 
	// 			without modifiers
	// 	- search for key code without modifiers
	// 		- if an alias is found it is first checked with and then 
	// 			without modifiers
	//
	handler: function(mode, key, handler){
		var that = this
		var keyboard = this.keyboard
		var key_separators = KEY_SEPARATORS  

		var genKeys = function(key, shift_key){
			// match candidates...
			return key_separators
				// full key...
				.map(function(s){ return key.join(s) })
				// full shift key...
				.concat(shift_key ? 
					key_separators
						.map(function(s){ return shift_key.join(s) }) 
					: [])
	   			.unique() }
		var walkAliases = function(bindings, handler, modifiers){
			var seen = []
			var modifiers = modifiers || []

			while(handler in bindings){
				handler = bindings[handler]

				handler = modifiers
						.filter(function(m){
							return handler.indexOf(m) < 0
								&& seen.indexOf(m+handler) < 0
								&& m+handler in bindings })
						.map(function(m){ return m+handler })[0]
					|| handler

				// check for loops...
				if(seen.indexOf(handler) >= 0){
					handler = null
					break
				}
				seen.push(handler)
			}

			return handler
		}

		key = this.normalizeKey(this.splitKey(key))
		var shift_key = this.shifted(key)

		// match candidates...
		var keys = genKeys(key, shift_key) 

		// get modes...
		var modes = mode == '*' ? Object.keys(keyboard)
			: mode == 'applicable' || mode == '?' ? this.modes()
			: mode instanceof Array ? mode
			: [mode]

		// get...
		if(handler === undefined){
			var res = {}
			var k = key.slice(-1)[0]
			var c = this.key2code(k) 

			var mod = genKeys(key.slice(0, -1).concat(''))

			// also test single key and code if everything else fails...
			// XXX make this an option...
			keys = keys
			//	.concat([k, c])
				.unique()

			var drop = mode == 'applicable' || mode == '?'
			for(var i=0; i < modes.length; i++){
				var m = modes[i]

				var bindings = keyboard[m]

				// stage 1: check key aliases with modifiers...
				handler = walkAliases(
					bindings, 
					keys.filter(function(k){ return bindings[k] })[0])

				// stage 2: check raw key aliases with and without modifiers...
				if(!handler){
					handler = walkAliases(
						bindings, 
						[k, c].filter(function(k){ return bindings[k] })[0],
						mod)
				}

				// handle explicit IGNORE...
				if(drop && handler == 'IGNORE'){
					break
				}

				// we got a match...
				if(handler){
					res[m] = handler
				}

				// if key in .drop then ignore the rest...
				if(drop 
						&& (bindings.drop == '*'
							// XXX should this be more flexible by adding a
							// 		specific key combo?
							// 		... if yes, we'll need to differentiate 
							// 		between X meaning drop only X and drop
							// 		all combos with X...
							|| (bindings.drop || []).indexOf(k) >= 0)){
					break
				}
			}

			return (typeof(mode) == typeof('str') 
					&& ['*', 'applicable', '?'].indexOf(mode) < 0) ? 
				res[mode]
				: res

		// set / remove...
		} else {
			modes.forEach(function(m){
				var bindings = keyboard[m]

				// remove all matching keys...
				keys
					.unique()
					.forEach(function(k){
						delete bindings[k]
					})

				// set handler if given...
				if(handler && handler != ''){
					keyboard[mode][key] = handler
				}
			})
		}

		return this
	},

	// get applicable modes...
	//
	modes: function(context){
		var that = this
		return that.isModeApplicable ?
			Object.keys(this.keyboard)
				.filter(function(mode){ 
					return that.isModeApplicable(
							mode, 
							that.keyboard, 
							context || that.context) })
			: Object.keys(this.keyboard) },

	__init__: function(keyboard, is_mode_applicable){
		this.keyboard = keyboard

		if(is_mode_applicable instanceof Function){
			this.isModeApplicable = is_mode_applicable
		}
	},
}

var Keyboard = 
module.Keyboard = 
object.makeConstructor('Keyboard', 
		KeyboardHandlerClassPrototype, 
		KeyboardHandlerPrototype)



/*********************************************************************/

var makeKeyboardHandler =
module.makeKeyboardHandler =
function makeKeyboardHandler(keyboard, unhandled, actions){

	var kb = keyboard instanceof Keyboard ? 
		keyboard 
		: Keyboard(keyboard, checkGlobalMode)

	return function(evt){
		var res = undefined
		var did_handling = false

		var key = kb.event2key(evt)
		var handlers = kb.handler('applicable', key)

		Object.keys(handlers).forEach(function(mode){
			if(res === false){
				return
			}

			var h = parseActionCall(handlers[mode])

			if(h && h.action in actions){
				did_handling = true

				h.no_default 
					&& evt.preventDefault()

				// call the handler...
				res = actions[h.action].apply(actions, h.args)
			} 
		})

		unhandled 
			&& !did_handling 
			&& unhandled.call(actions, evt)

		return res
	}
}



//---------------------------------------------------------------------

// Event handler wrapper to stop handling keys if check callback does 
// not pass (returns false)...
var stoppableKeyboardRepeat = 
module.stoppableKeyboardRepeat = 
function(handler, check){
	return function(evt){
		return check() && handler(evt)
	}
}


// Event handler wrapper that will drop identical keys repeating at rate
// greater than max_rate
//
// NOTE: this will only limit repeating key combinations thus no lag is 
// 		introduced...
var dropRepeatingkeys =
module.dropRepeatingkeys =
function dropRepeatingkeys(handler, max_rate){
	var _timeout = null

	var key = null

	var ctrl = null
	var meta = null
	var alt = null
	var shift = null

	return function(evt){
		if(_timeout != null
				&& key == evt.keyCode
				&& ctrl == evt.ctrlKey
				&& meta == evt.metaKey
				&& alt == evt.altKey
				&& shift == evt.shiftKey){
			return
		}

		key = evt.keyCode
		ctrl = evt.ctrlKey
		meta = evt.metaKey
		alt = evt.altKey
		shift = evt.shiftKey

		_timeout = setTimeout(function(){
				_timeout = null
			}, 
			// XXX is this the right way to go???
			typeof(max_rate) == typeof(123) ? max_rate : max_rate())

		return handler(evt)
	}
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })

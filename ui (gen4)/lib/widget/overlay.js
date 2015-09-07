/**********************************************************************
* 
*
*
**********************************************************************/

define(function(require){ var module = {}
console.log('>>> overlay')

//var DEBUG = DEBUG != null ? DEBUG : true

var object = require('../../object')
var widget = require('./widget')


/*********************************************************************/

var OverlayClassPrototype = {
	make: function(client, options){
		var that = this
		var overlay = $('<div>')
			.addClass('overlay-widget')
			.click(function(){
				event.stopPropagation()
			})
			.append($('<div>')
				.addClass('content')
				.click(function(){
					event.stopPropagation()
				})
				.append(client))

		return overlay
	},
}


var OverlayPrototype = {
	dom: null,

	// XXX triggering events from here and from jQuery/dom has a 
	// 		different effect...
	trigger: widget.triggerEventWithSource,

	// proxy event api...
	on: widget.proxyToDom('on'),
	one: widget.proxyToDom('one'),
	off: widget.proxyToDom('off'),
	bind: widget.proxyToDom('bind'),
	unbind: widget.proxyToDom('unbind'),
	deligate: widget.proxyToDom('deligate'),
	undeligate: widget.proxyToDom('undeligate'),

	// custom events...
	close: function(handler){
		// trigger the event...
		if(handler == null){
			this.dom.detach()
			if(this.parent.children('.overlay-widget').length == 0){
				this.parent.removeClass('blur')
			}
			this.trigger('close')

		// register a handler...
		} else {
			this.on('close', handler)
		}
	},

	__init__: function(parent, client, options){
		var that = this
		parent = this.parent = $(parent || 'body')

		var dom = this.dom = this.constructor.make(client, options)
			.click(function(){
				that.close()
			})

		parent
			.addClass('blur')
			.append(dom)

		return this
	},
}


var Overlay = 
module.Overlay = 
object.makeConstructor('Overlay', 
		OverlayClassPrototype, 
		OverlayPrototype)



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
return module })

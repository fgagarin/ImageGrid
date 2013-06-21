/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true


/*********************************************************************/

// load the target-specific handlers...
// CEF
if(window.CEF_dumpJSON != null){

	console.log('CEF mode: loading...')

	var dumpJSON = CEF_dumpJSON
	var listDir = CEF_listDir
	var removeFile = CEF_removeFile
	var runSystem = CEF_runSystem

// node-webkit
} else if(window.require != null){

	console.log('node-webkit mode: loading...')

	var fs = require('fs')
	var fse = require('fs.extra')
	var proc = require('child_process')
	var gui = require('nw.gui')

	var fp = /file:\/\/\//

	// Things ImageGrid needs...
	// XXX do we need assync versions??
	window.listDir = function(path){
		if(fp.test(path)){
			// XXX will this work on Mac???
			path = path.replace(fp, '')
		}
		return fs.readdirSync(path)
	}
	// XXX make this work across fs...
	// XXX this will not overwrite...
	window.copyFile = function(src, dst){
		if(fp.test(src)){
			// XXX will this work on Mac???
			src = src.replace(fp, '')
		}
		if(fp.test(dst)){
			// XXX will this work on Mac???
			dst = dst.replace(fp, '')
		}

		var path = dst.split('/')
		path.pop()
		path = path.join('/')


		// XXX make dirs...
		if(!fs.existsSync(path)){
			console.log('making:', path)
			fse.mkdirRecursiveSync(path)
		}

		if(!fs.existsSync(dst)){
			// NOTE: this is not sync...
			return fse.copy(src, dst)
		}
	}
	window.dumpJSON = function(path, data){
		if(fp.test(path)){
			// XXX will this work on Mac???
			path = path.replace(fp, '')
		}
		var dirs = path.split(/[\\\/]/)
		dirs.pop()
		dirs = dirs.join('/')
		// build path...
		if(!fs.existsSync(dirs)){
			console.log('making:', path)
			fse.mkdirRecursiveSync(path)
		}
		return fs.writeFileSync(path, JSON.stringify(data), encoding='utf8')
	}
	window.removeFile = function(path){
		if(fp.test(path)){
			// XXX will this work on Mac???
			path = path.replace(fp, '')
		}
		return fs.unlinkSync(path)
	}
	window.runSystem = function(path){
		if(fp.test(path)){
			// XXX will this work on Mac???
			path = path.replace(fp, '')
		}
		return proc.exec('"'+path+'"', function(error, stdout, stderr){
			if(error != null){
				console.error(stderr)
			}
		})
	}

	window.toggleFullscreenMode = createCSSClassToggler(
			document.body, 
			'.full-screen-mode',
			function(action){
				gui.Window.get().toggleFullscreen()
			})

	window.closeWindow = function(){
		gui.Window.get().close()
	}
	window.showDevTools = function(){
		gui.Window.get().showDevTools()
	}
	window.reload = function(){
		gui.Window.get().reload()
	}
	window.setWindowTitle = function(text){
		var title = text +' - '+ APP_NAME
		gui.Window.get().title = title
		$('.title-bar .title').text(title)
	}

	// load UI stuff...
	$(function(){
		$('<div class="title-bar"/>')
			.append($('<div class="title"></div>')
				.text($('title').text()))
			.append($('<div class="button close" onclick="closeWindow()">&times;</div>'))
			.appendTo($('body'))
	})




// PhoneGap
} else if(false){

	console.log('PhoneGap mode: loading...')
	// XXX

	// stubs...
	window.toggleFullscreenMode = function(){}
	window.closeWindow = function(){}
	window.showDevTools = function(){}
	window.reload = function(){}

// Bare Chrome...
} else {
	console.log('Chrome mode: loading...')

	// stubs...
	window.toggleFullscreenMode = function(){}
	window.closeWindow = function(){}
	window.showDevTools = function(){}
	window.reload = function(){}
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */

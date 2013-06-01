/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true

var CURSOR_SHOW_THRESHOLD = 10
var CURSOR_HIDE_TIMEOUT = 2000



/*********************************************************************/

// XXX revise...
// NOTE: to catch the click event correctly while the cursor is hidden
//		this must be the first to get the event...
function autoHideCursor(elem){
	elem = $(elem)
	elem
		.on('mousemove', function(evt){
			_cursor_pos = window._cursor_pos == null || elem.css('cursor') == 'auto' ?
						[evt.clientX, evt.clientY] 
					: _cursor_pos

			if(Math.abs(evt.clientX - _cursor_pos[0]) > CURSOR_SHOW_THRESHOLD 
					|| Math.abs(evt.clientY - _cursor_pos[1]) > CURSOR_SHOW_THRESHOLD){

				if(window._cursor_timeout != null){
					clearTimeout(_cursor_timeout)
					_cursor_timeout = null
				}

				elem.css('cursor', '')

			} else {
				_cursor_timeout = setTimeout(function(){
					if(Math.abs(evt.clientX - _cursor_pos[0]) < CURSOR_SHOW_THRESHOLD 
							|| Math.abs(evt.clientY - _cursor_pos[1]) < CURSOR_SHOW_THRESHOLD){
						elem.css('cursor', 'none')
					}
				}, CURSOR_HIDE_TIMEOUT)
			}
		})
		.click(function(evt){
			if(elem.css('cursor') == 'none'){
				//event.stopImmediatePropagation()
				//event.preventDefault()

				if(window._cursor_timeout != null){
					clearTimeout(_cursor_timeout)
					_cursor_timeout = null
				}

				elem.css('cursor', '')
				//return false
			}
		})
	return elem
}



/*********************************************************************/
// vim:set ts=4 sw=4 nowrap :

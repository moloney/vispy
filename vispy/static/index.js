define(["@jupyter-widgets/base"], function(__WEBPACK_EXTERNAL_MODULE_2__) { return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

// Entry point for the notebook bundle containing custom model definitions.
//
// Setup notebook base URL
//
// Some static assets may be required by the custom widget javascript. The base
// url for the notebook is not known at build time and is therefore computed
// dynamically.
__webpack_require__.p = document.querySelector('body').getAttribute('data-base-url') + 'nbextensions/vispy/';

// Export widget models and views, and the npm package version number.
// module.exports.vispy = require('./vispy.min.js');
module.exports.VispyView = __webpack_require__(1).VispyView;
module.exports['version'] = __webpack_require__(4).version;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var widgets = __webpack_require__(2);
var vispy = __webpack_require__(3);

function _inline_glir_commands(commands, buffers) {
    // Put back the buffers within the GLIR commands before passing them
    // to the GLIR JavaScript interpretor.
    for (var i = 0; i < commands.length; i++) {
        var command = commands[i];
        if (command[0] == 'DATA') {
            var buffer_index = command[3]['buffer_index'];
            command[3] = buffers[buffer_index];
        }
    }
    return commands;
}

// var vispy = require("/nbextensions/vispy/vispy.min.js");
// var widget, control;
// try {
//     widget = require("@jupyter-widgets/base");
//     control = require("@jupyter-widgets/controls");
// } catch (e) {
//     console.warn("Importing old ipywidgets <7.0");
//     widget = require("jupyter-js-widgets");
// }

var VispyView = widgets.DOMWidgetView.extend({

        initialize: function (parameters) {
            VispyView.__super__.initialize.apply(this, [parameters]);

            this.model.on('msg:custom', this.on_msg, this);

            // Track canvas size changes.
            this.model.on('change:width', this.size_changed, this);
            this.model.on('change:height', this.size_changed, this);
        },

        render: function() {
            var that = this;

            var canvas = $('<canvas></canvas>');
            // canvas.css('border', '1px solid rgb(171, 171, 171)');
            canvas.css('background-color', '#000');
            canvas.attr('tabindex', '1');
            this.$el.append(canvas);
            this.$canvas = canvas;

            // Initialize the VispyCanvas.
            this.c = vispy.init(canvas);

            this.c.on_resize(function (e) {
                that.model.set('width', e.size[0]);
                that.model.set('height', e.size[1]);
                that.touch();
            });

            // Start the event loop.
            this.c.on_event_tick(function() {
                // This callback function will be called at each JS tick,
                // before the GLIR commands are flushed.

                // Retrieve and flush the event queue.
                var events = that.c.event_queue.get();

                that.c.event_queue.clear();
                // Send the events if the queue is not empty.
                if (events.length > 0) {
                    // Create the message.
                    var msg = {
                        msg_type: 'events',
                        contents: events
                    };
                    // console.debug(events);
                    // Send the message with the events to Python.
                    that.send(msg);
                }
            });

            vispy.start_event_loop();
            var msg = { msg_type: 'init' };
            this.send(msg);
            // Make sure the size is correctly set up upon first display.
            this.size_changed();
            this.c.resize();
            this.c.resizable();
        },

        on_msg: function(msg, buffers) {
            if (msg == undefined) return;
            // Receive and execute the GLIR commands.
            if (msg.msg_type == 'glir_commands') {
                var commands = msg.commands;
                // Get the buffers messages.
                if (msg.array_serialization == 'base64') {
                    var buffers_msg = msg.buffers;
                } else if (msg.array_serialization == 'binary') {
                    // Need to put the raw binary buffers in JavaScript
                    // objects for the inline commands.
                    var buffers_msg = [];
                    for (var i = 0; i < buffers.length; i++) {
                        buffers_msg[i] = {
                            'storage_type': 'binary',
                            'buffer': buffers[i]
                        };
                    }
                }

                // Make the GLIR commands ready for the JavaScript parser
                // by inlining the buffers.
                var commands_inlined = _inline_glir_commands(
                    commands, buffers_msg);
                for (var i = 0; i < commands_inlined.length; i++) {
                    var command = commands[i];
                    this.c.command(command);
                }
            }
        },

        // When the model's size changes.
        size_changed: function() {
            var size = [this.model.get('width'), this.model.get('height')];
            this.$canvas.css('width', size[0] + 'px');
            this.$canvas.css('height', size[1] + 'px');
        },

        remove: function() {
            vispy.unregister(this.c);
            // Inform Python that the widget has been removed.
            this.send({
                msg_type: 'status',
                contents: 'removed'
            });
        }
    });


module.exports = {
    VispyView: VispyView,
};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

var require;var require;!function(e){if(true)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;"undefined"!=typeof window?t=window:"undefined"!=typeof global?t=global:"undefined"!=typeof self&&(t=self),t.vispy=e()}}(function(){var e;return function t(e,n,r){function i(u,a){if(!n[u]){if(!e[u]){var l="function"==typeof require&&require;if(!a&&l)return require(u,!0);if(o)return o(u,!0);var s=new Error("Cannot find module '"+u+"'");throw s.code="MODULE_NOT_FOUND",s}var f=n[u]={exports:{}};e[u][0].call(f.exports,function(t){var n=e[u][1][t];return i(n?n:t)},f,f.exports,t,e,n,r)}return n[u].exports}for(var o="function"==typeof require&&require,u=0;u<r.length;u++)i(r[u]);return i}({1:[function(e,t,n){var r=(e("./lib/screenfull.min.js"),e("./vispycanvas.js")),i=e("./gloo.js"),o=e("./events.js");e("./util.js"),e("./data.js");e("./lib/jquery.mousewheel.min.js")($);var u=function(){this.events=o,this.gloo=i,this._is_loop_running=!1,this._canvases=[]};u.prototype.init=function(e){var t;t=$(e);var n=new r(t);return n.deactivate_context_menu(),this.events.init(n),this.gloo.init(n),this.register(n),n},u.prototype.register=function(e){this._canvases.push(e)},u.prototype.unregister=function(e){var t=this._canvases.indexOf(e);t>-1&&this._canvases.splice(t,1)},u.prototype.start_event_loop=function(){if(!this._is_loop_running){window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||function(e){window.setTimeout(e,1e3/60)}}();var e=this;!function t(){e._request_id=requestAnimFrame(t);try{for(var n=0;n<e._canvases.length;n++)e._canvases[n].event_tick()}catch(r){throw e.stop_event_loop(),r}}(),this._is_loop_running=!0,console.debug("Event loop started.")}},u.prototype.stop_event_loop=function(){window.cancelAnimationFrame(this._request_id),this._is_loop_running=!1,console.debug("Event loop stopped.")},t.exports=new u},{"./data.js":2,"./events.js":3,"./gloo.js":5,"./lib/jquery.mousewheel.min.js":6,"./lib/screenfull.min.js":7,"./util.js":8,"./vispycanvas.js":9}],2:[function(e,t,n){function r(e){for(var t=window.atob(e),n=t.length,r=new Uint8Array(n),i=0;i<n;i++){var o=t.charCodeAt(i);r[i]=o}return r.buffer}function i(e){var t=e.storage_type;if(void 0==t)return e;var n=e.data_type,i=e.buffer;if("javascript_array"==t)return o[n](i);if("javascript_typed_array"==t||"array_buffer"==t)return i;if("binary"==t)return i.buffer;if("base64"==t){var u=r(i);return u}}var o={float32:Float32Array,int8:Int8Array,int16:Int16Array,int32:Int32Array,uint8:Uint8Array,uint16:Uint16Array,uint32:Uint32Array};t.exports={to_array_buffer:i}},{}],3:[function(e,t,n){function r(e,t){var n=e.getBoundingClientRect();return[t.clientX-n.left,t.clientY-n.top]}function i(e){var t=[];return e.altKey&&t.push("alt"),e.ctrlKey&&t.push("ctrl"),e.metaKey&&t.push("meta"),e.shiftKey&&t.push("shift"),t}function o(e){return String.fromCharCode(e).toUpperCase().trim()}function u(e){return window.event?e.keyCode:e.which?e.which:void 0}function a(e){var t=u(e),n=m[t];return void 0==n&&(n=o(t)),n}function l(e,t,n){if(e._eventinfo.is_button_pressed)var o=v[t.button];else o=null;var u=r(e.$el.get(0),t),a=i(t),l=e._eventinfo.press_event,s=(e._eventinfo.last_event,{type:n,pos:u,button:o,is_dragging:null!=l,modifiers:a,delta:null,press_event:l,last_event:null});return s}function s(e,t){var n={type:"resize",size:t};return n}function f(e){var t={type:"paint"};return t}function c(e){var t={type:"initialize"};return t}function p(e,t,n){var r=i(t),o=(e._eventinfo.last_event,{type:n,modifiers:r,key_code:a(t),last_event:null});return o}function g(e,t){var n=e.type;return n==t.type&&"mouse_move"==n&&e.button==t.button&e.is_dragging==t.is_dragging&e.modifiers.equals(t.modifiers)?["pos"]:[]}function _(e){void 0==e&&(e=100),this._queue=[],this.maxlen=e}function d(e){e.$el.resize(function(t){e.resize([t.width(),t.height()])}),e.event_queue=new _,e._eventinfo={type:null,pos:null,button:null,is_dragging:null,key:null,modifiers:[],press_event:null,last_event:null,delta:null},e._eventinfo.is_button_pressed=0,e.$el.mousemove(function(t){var n=l(e,t,"mouse_move");e._mouse_move(n),e.event_queue.append(n)}),e.$el.mousedown(function(t){++e._eventinfo.is_button_pressed;var n=l(e,t,"mouse_press");e._mouse_press(n),e._eventinfo.press_event=n,e.event_queue.append(n)}),e.$el.mouseup(function(t){--e._eventinfo.is_button_pressed;var n=l(e,t,"mouse_release");e._mouse_release(n),e._eventinfo.press_event=null,e.event_queue.append(n)}),e.$el.click(function(t){e._eventinfo.press_event=null}),e.$el.dblclick(function(t){e._eventinfo.press_event=null}),void 0!=e.$el.mousewheel&&e.$el.mousewheel(function(t){var n=l(e,t,"mouse_wheel");n.delta=[t.deltaX*t.deltaFactor*.01,t.deltaY*t.deltaFactor*.01],e._mouse_wheel(n),e.event_queue.append(n),t.preventDefault(),t.stopPropagation()}),e.$el.keydown(function(t){var n=p(e,t,"key_press");e._key_press(n),e.event_queue.append(n)}),e.$el.keyup(function(t){var n=p(e,t,"key_release");e._key_release(n),e.event_queue.append(n)}),e.$el.mouseout(function(e){})}var h=e("./vispycanvas.js"),m={8:"BACKSPACE",9:"TAB",13:"ENTER",16:"SHIFT",17:"CONTROL",18:"ALT",27:"ESCAPE",32:"SPACE",33:"PAGEUP",34:"PAGEDOWN",35:"END",36:"HOME",37:"LEFT",38:"UP",39:"RIGHT",40:"DOWN",45:"INSERT",46:"DELETE",91:"META",92:"META",96:"0",97:"1",98:"2",99:"3",100:"4",101:"5",102:"6",103:"7",104:"8",105:"9",106:"*",107:"+",109:"-",110:".",111:"/",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"},v={0:1,2:2,1:3};h.prototype._mouse_press=function(e){},h.prototype._mouse_release=function(e){},h.prototype._mouse_move=function(e){},h.prototype._mouse_wheel=function(e){},h.prototype._mouse_click=function(e){},h.prototype._mouse_dblclick=function(e){},h.prototype._key_press=function(e){},h.prototype._key_release=function(e){},h.prototype._initialize=function(e){},h.prototype._resize=function(e){},h.prototype._paint=function(e){},h.prototype._event_tick=function(e){},h.prototype.on_mouse_press=function(e){this._mouse_press=e},h.prototype.on_mouse_release=function(e){this._mouse_release=e},h.prototype.on_mouse_move=function(e){this._mouse_move=e},h.prototype.on_mouse_wheel=function(e){this._mouse_wheel=e},h.prototype.on_mouse_dblclick=function(e){this._mouse_dblclick=e},h.prototype.on_key_press=function(e){this._key_press=e},h.prototype.on_key_release=function(e){this._key_release=e},h.prototype.on_initialize=function(e){this._initialize=e},h.prototype.on_resize=function(e){this._resize=e},h.prototype.on_paint=function(e){this._paint=e},h.prototype.on_event_tick=function(e){this._event_tick=e},h.prototype.initialize=function(){var e=c(this);this._set_size(),this._initialize(e)},h.prototype._set_size=function(e){return void 0==e&&(e=[this.$el.width(),this.$el.height()]),this.size=e,this.width=e[0],this.height=e[1],e},h.prototype.paint=function(){var e=f(this);this.event_queue.append(e)},h.prototype.update=h.prototype.paint,h.prototype.resize=function(e){e=this._set_size(e);var t=s(this,e);this.gl.canvas.width=e[0],this.gl.canvas.height=e[1],this.event_queue.append(t),this._resize(t)},h.prototype.event_tick=function(){this._event_tick();var e=this.execute_pending_commands();if(e>0){var t=f(this);this._paint(t)}},h.prototype.is_fullscreen=function(){return screenfull.enabled&screenfull.isFullscreen},h.prototype.toggle_fullscreen=function(){screenfull.enabled&&(screenfull.isFullscreen?(screenfull.exit(),this.resize(this._size)):(this.$el.width("100%").height("100%"),this._size=[this.$el.width(),this.$el.height()],screenfull.request(this.$el[0]),this.resize([screen.width,screen.height])))},h.prototype.deactivate_context_menu=function(){document.oncontextmenu=function(){return!1}},h.prototype.resizable=function(){var e=this;this.$el.resizable({resize:function(t,n){e.resize([n.size.width,n.size.height])}})},_.prototype.clear=function(){this._queue=[]},_.prototype.append=function(e,t){var n=!0;if(void 0==t&&(t=!0),t){var r=this._queue[this._queue.length-1];if(void 0!=r){var i=g(e,r);if(i.length>0){for(var o=0;o<i.length;o++){var u=i[o];this._queue[this._queue.length-1][u]=e[u]}n=!1}}}n&&this._queue.push(e),this._queue.length>this.maxlen&&(this._queue.shift(),this._queue[0].last_event=null)},_.prototype.get=function(){return this._queue},Object.defineProperty(_.prototype,"length",{get:function(){return this._queue.length}});var E=function(){};E.prototype.init=function(e){d(e)},t.exports=new E},{"./vispycanvas.js":9}],4:[function(e,t,n){function r(e,t,n){n=n.replace(/\\n/g,"\n");var r=e.gl.createShader(e.gl[t]);return e.gl.shaderSource(r,n),e.gl.compileShader(r),e.gl.getShaderParameter(r,e.gl.COMPILE_STATUS)?r:(console.error(e.gl.getShaderInfoLog(r)),null)}function i(e,t,n,r){e.gl.attachShader(t,n),e.gl.attachShader(t,r),e.gl.linkProgram(t),e.gl.getProgramParameter(t,e.gl.LINK_STATUS)||console.warn("Could not initialise shaders on program '{0}'.".format(t))}function o(e,t,n){var r=e.gl.getAttribLocation(t,n);return r}function u(e,t,n,r,i,o){var u=g(r),a=u[0],l=u[1];_vbo_info=e._ns[n];var s=_vbo_info.handle;e.gl.enableVertexAttribArray(t),e.gl.bindBuffer(e.gl.ARRAY_BUFFER,s),e.gl.vertexAttribPointer(t,l,e.gl[a],!1,i,o)}function a(e,t){e.gl.disableVertexAttribArray(t)}function l(e,t,n,r){t!==U&&(e.gl.activeTexture(e.gl.TEXTURE0+r),e.gl.bindTexture(e.gl.TEXTURE_2D,t))}function s(e,t,n,r){e.gl.activeTexture(e.gl.TEXTURE0+r),e.gl.bindTexture(e.gl.TEXTURE_2D,null)}function f(e,t,n,r,i,o,u){if(e.gl.bindTexture(n,t),e.gl.pixelStorei(e.gl.UNPACK_ALIGNMENT,1),null===u)e.gl.texImage2D(n,0,r,i,o,0,r,e.gl.UNSIGNED_BYTE,u);else if(u.getContext)e.gl.texImage2D(n,0,e.gl.RGBA,e.gl.RGBA,e.gl.UNSIGNED_BYTE,u);else if(u.canvas)e.gl.texImage2D(n,0,e.gl.RGBA,e.gl.RGBA,e.gl.UNSIGNED_BYTE,u.canvas);else{var a;a=new Uint8Array(u),e.gl.texImage2D(n,0,r,i,o,0,r,e.gl.UNSIGNED_BYTE,a)}}function c(e,t,n,r,i,o){e.gl.bindBuffer(n,t),o?e.gl.bufferSubData(n,r,i):e.gl.bufferData(n,i,e.gl.STATIC_DRAW)}function p(e,t,n,r){array=S(r),n.indexOf("Matrix")>0?e.gl[n](t,!1,array):e.gl[n](t,array)}function g(e){return D[e]}function _(e){return B[e]}function d(e){return q[e]}function h(e){return M[e][0]}function m(e){return M[e][1]}function v(e,t){for(var n=t.split("|"),r=0,i=0;i<n.length;i++){var o=n[i].toUpperCase().trim();r|=e.gl[o]}return r}function E(e){var t=e.gl.checkFramebufferStatus(e.gl.FRAMEBUFFER);if(t!=e.gl.FRAMEBUFFER_COMPLETE)throw t==e.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT?"FrameBuffer attachments are incomplete.":t==e.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT?"No valid attachments in the FrameBuffer.":t==e.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS?"attachments do not have the same width and height.":t==e.gl.FRAMEBUFFER_UNSUPPORTED?"Combination of internal formats used by attachments is not supported.":"Unknown framebuffer error"+t}function y(e,t){var n=e._ns[t],r=e.env.fb_stack;return 0==r.length&&r.push(null),r[r.length-1]===n.handle?void A("Frame buffer already active {0}".format(t)):(A("Binding frame buffer {0}.".format(t)),e.gl.bindFramebuffer(e.gl.FRAMEBUFFER,n.handle),void r.push(n.handle))}function b(e,t){var n=e._ns[t],r=e.env.fb_stack;for(0==r.length&&r.push(null);r[r.length-1]===n.handle;)r.pop();A("Binding previous frame buffer"),e.gl.bindFramebuffer(e.gl.FRAMEBUFFER,r[r.length-1])}function x(e){e.env={fb_stack:[]}}function w(){this._queue=[]}var F=e("./vispycanvas.js"),T=e("./util.js"),R=e("./data.js"),A=T.debug,S=R.to_array_buffer,U="JUST_DELETED",D={"float":["FLOAT",1],vec2:["FLOAT",2],vec3:["FLOAT",3],vec4:["FLOAT",4],"int":["INT",1],ivec2:["INT",2],ivec3:["INT",3],ivec4:["INT",4]},B={"float":"uniform1fv",vec2:"uniform2fv",vec3:"uniform3fv",vec4:"uniform4fv","int":"uniform1iv",ivec2:"uniform2iv",ivec3:"uniform3iv",ivec4:"uniform4iv",mat2:"uniformMatrix2fv",mat3:"uniformMatrix3fv",mat4:"uniformMatrix4fv"},q={VertexBuffer:"ARRAY_BUFFER",IndexBuffer:"ELEMENT_ARRAY_BUFFER",Texture2D:"TEXTURE_2D"},M={color:["COLOR_ATTACHMENT0","RGBA4"],depth:["DEPTH_ATTACHMENT","DEPTH_COMPONENT16"],stencil:["STENCIL_ATTACHMENT","STENCIL_INDEX8"]};w.prototype.clear=function(){this._queue=[]},w.prototype.append=function(e){this._queue.push(e)},w.prototype.append_multi=function(e){for(var t=0;t<e.length;t++)this._queue.push(e[t])},w.prototype.get=function(){return this._queue},Object.defineProperty(w.prototype,"length",{get:function(){return this._queue.length}}),F.prototype.set_deferred=function(e){this._deferred=e},F.prototype.execute_pending_commands=function(){var e=this.glir_queue.get(),t=-1;if(0==e.length)return 0;for(var n=0;n<e.length;n++)if("SWAP"===e[n][0]){t=n;break}for(n=0;n<=t;n++)this.command(e[n],!1);return t>=0&&(A("Processed {0} events.".format(t+1)),this.glir_queue._queue=this.glir_queue._queue.slice(t+1)),t+1},F.prototype.command=function(e,t){void 0===t&&(t=this._deferred);var n=e[0].toLowerCase();t?this.glir_queue.append(e):this.glir[n](this,e.slice(1))};var C=function(){};C.prototype.init=function(e){e._ns={},e._deferred=!0,x(e),e.glir_queue=new w,e.glir=this},C.prototype.current=function(e,t){x(e),e.gl.bindFramebuffer(e.gl.FRAMEBUFFER,null)},C.prototype.swap=function(e,t){},C.prototype.create=function(e,t){var n=t[0],r=t[1];"VertexBuffer"==r?(A("Creating vertex buffer '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createBuffer(),size:0}):"IndexBuffer"==r?(A("Creating index buffer '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createBuffer(),size:0}):"FrameBuffer"==r?(A("Creating frame buffer '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createFramebuffer(),size:0,validated:!1}):"RenderBuffer"==r?(A("Creating render buffer '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createRenderbuffer(),size:0}):"Texture2D"==r?(A("Creating texture '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createTexture(),size:0,shape:[]}):"Program"==r&&(A("Creating program '{0}'.".format(n)),e._ns[n]={object_type:r,handle:e.gl.createProgram(),attributes:{},uniforms:{},textures:{},texture_uniforms:{}})},C.prototype["delete"]=function(e,t){var n=t[0],r=e._ns[n].object_type,i=e._ns[n].handle;e._ns[n].handle=U,"VertexBuffer"==r?(A("Deleting vertex buffer '{0}'.".format(n)),e.gl.deleteBuffer(i)):"IndexBuffer"==r?(A("Deleting index buffer '{0}'.".format(n)),e.gl.deleteBuffer(i)):"FrameBuffer"==r?(A("Deleting frame buffer '{0}'.".format(n)),e.gl.deleteFramebuffer(i)):"RenderBuffer"==r?(A("Deleting render buffer '{0}'.".format(n)),e.gl.deleteRenderbuffer(i)):"Texture2D"==r?(A("Deleting texture '{0}'.".format(n)),e.gl.deleteTexture(i)):"Program"==r&&(A("Deleting program '{0}'.".format(n)),e.gl.deleteProgram(i))},C.prototype.shaders=function(e,t){var n=t[0],o=t[1],u=t[2],a=e._ns[n].handle;A("Compiling shaders for program '{0}'.".format(n));var l=r(e,"VERTEX_SHADER",o),s=r(e,"FRAGMENT_SHADER",u);A("Attaching shaders for program '{0}'".format(n)),i(e,a,l,s)},C.prototype.size=function(e,t){var n=t[0],r=t[1],i=t[2],o=e._ns[n],u=o.handle,a=o.object_type,l=e.gl[d(a)];a.indexOf("Texture")>=0?(o.format=i.toUpperCase(),A("Setting texture size to {1} for '{0}'.".format(n,r))):"RenderBuffer"==a?(e.gl.bindRenderbuffer(e.gl.RENDERBUFFER,u),o.format=e.gl[m(i)],e.gl.renderbufferStorage(e.gl.RENDERBUFFER,o.format,r[1],r[0]),e.gl.bindRenderbuffer(e.gl.RENDERBUFFER,null)):(A("Setting buffer size to {1} for '{0}'.".format(n,r)),c(e,u,l,0,r,!1)),o.size=r},C.prototype.data=function(e,t){var n=t[0],r=t[1],i=t[2],o=e._ns[n],u=o.object_type,a=o.handle,l=e.gl[d(u)],s=S(i);if(u.indexOf("Texture")>=0){var p=o.size,g=p[0],_=p[1],h=e.gl[o.format];A("Setting texture data for '{0}'.".format(n)),f(e,a,l,h,_,g,s),o.shape=p}else A("Setting buffer data for '{0}'.".format(n)),c(e,a,l,r,s,o.size>0),o.size=s.byteLength},C.prototype.attribute=function(e,t){var n=t[0],r=t[1],i=t[2],u=t[3][0],a=t[3][1],l=t[3][2],s=e._ns[n].handle;A("Creating attribute '{0}' for program '{1}'.".format(r,n));var f=o(e,s,r);e._ns[n].attributes[r]={handle:f,type:i,vbo_id:u,stride:a,offset:l}},C.prototype.uniform=function(e,t){var n=t[0],r=t[1],i=t[2],o=t[3],u=e._ns[n].handle;if(e.gl.useProgram(u),void 0==e._ns[n].uniforms[r]){A("Creating uniform '{0}' for program '{1}'.".format(r,n));var a=e.gl.getUniformLocation(u,r),l=_(i);e._ns[n].uniforms[r]=[a,l]}A("Setting uniform '{0}' to '{1}' with {2} elements.".format(r,o,o.length));var s=e._ns[n].uniforms[r],a=s[0],l=s[1];p(e,a,l,o)},C.prototype.texture=function(e,t){var n=t[0],r=t[1],i=t[2],o=e._ns[n],u=o.handle,a=e._ns[i].handle;if(a===U)return A("Removing texture '{0}' from program '{1}'".format(i,n)),void delete o.textures[i];A("Initializing texture '{0}' for program '{1}'.".format(i,n)),o.texture_uniforms.hasOwnProperty(r)&&(A("Removing previously assigned texture for '{0}'".format(r)),delete o.textures[o.texture_uniforms[r]]);var l=e.gl.getUniformLocation(u,r);o.texture_uniforms[r]=i,e._ns[n].textures[i]={sampler_name:r,sampler_handle:l,number:-1,handle:a}},C.prototype.interpolation=function(e,t){var n=t[0],r=t[1].toUpperCase(),i=t[2].toUpperCase(),o=e._ns[n].handle,u=e.gl.TEXTURE_2D;e.gl.bindTexture(u,o),e.gl.texParameteri(u,e.gl.TEXTURE_MIN_FILTER,e.gl[r]),e.gl.texParameteri(u,e.gl.TEXTURE_MAG_FILTER,e.gl[i]),e.gl.bindTexture(u,null)},C.prototype.wrapping=function(e,t){var n=t[0],r=t[1],i=e._ns[n].handle,o=e.gl.TEXTURE_2D;e.gl.bindTexture(o,i),e.gl.texParameteri(o,e.gl.TEXTURE_WRAP_S,e.gl[r[0].toUpperCase()]),e.gl.texParameteri(o,e.gl.TEXTURE_WRAP_T,e.gl[r[1].toUpperCase()]),e.gl.bindTexture(o,null)},C.prototype.draw=function(e,t){var n=t[0],r=t[1].toUpperCase(),i=t[2],o=e._ns[n].handle,f=e._ns[n].attributes,c=e._ns[n].textures,p=0;e.gl.useProgram(o);for(attribute_name in f){var g=f[attribute_name];A("Activating attribute '{0}' for program '{1}'.".format(attribute_name,n)),u(e,g.handle,g.vbo_id,g.type,g.stride,g.offset)}for(texture_id in c){var _=c[texture_id];e._ns[texture_id].handle!==U?(_.number=p,p+=1,A("Activating texture '{0}' for program '{1}' as number '{2}'.".format(texture_id,n,_.number)),l(e,_.handle,_.sampler_handle,_.number),e.gl.uniform1i(_.sampler_handle,_.number)):(A("Ignoring texture '{0}' from program '{1}'".format(texture_id,n)),_.handle=U)}if(2==i.length){var d=i[0],h=i[1];A("Rendering program '{0}' with {1}.".format(n,r)),e.gl.drawArrays(e.gl[r],d,h)}else if(3==i.length){var m=i[0],v=i[1],h=i[2],E=e._ns[m].handle;A("Rendering program '{0}' with {1} and index buffer '{2}' of type '{3}'.".format(n,r,m,v)),e.gl.bindBuffer(e.gl.ELEMENT_ARRAY_BUFFER,E),e.gl.drawElements(e.gl[r],h,e.gl[v],0)}for(attribute_name in f)A("Deactivating attribute '{0}' for program '{1}'.".format(attribute_name,n)),a(e,f[attribute_name].handle);var y={};for(texture_id in c){var _=c[texture_id];A("Deactivating texture '{0}' for program '{1}'.".format(texture_id,n)),s(e,_.handle,_.sampler_handle,_.number),e._ns[texture_id].handle!=U&&(y[texture_id]=_)}e._ns[n].textures=y},C.prototype.attach=function(e,t){var n,r=t[0],i=e.gl[h(t[1])],o=t[2];y(e,r),0==o?(A("Attaching RenderBuffer object {0} to framebuffer {1}".format(o,r)),e.gl.framebufferRenderbuffer(e.gl.FRAMEBUFFER,i,e.gl.RENDERBUFFER,null)):(n=e._ns[o],A("Attaching {0} object {1} to framebuffer {2} for {3}".format(n.object_type,o,r,t[1])),"RenderBuffer"==n.object_type?(e.gl.bindRenderbuffer(e.gl.RENDERBUFFER,n.handle),e.gl.framebufferRenderbuffer(e.gl.FRAMEBUFFER,i,e.gl.RENDERBUFFER,n.handle),e.gl.bindRenderbuffer(e.gl.RENDERBUFFER,null)):"Texture2D"==n.object_type&&(0==n.shape.length&&(A("Setting empty texture data to unset texture before attaching to framebuffer"),f(e,n.handle,e.gl.TEXTURE_2D,e.gl[n.format],n.size[1],n.size[0],null)),e.gl.bindTexture(e.gl.TEXTURE_2D,n.handle),e.gl.framebufferTexture2D(e.gl.FRAMEBUFFER,i,e.gl.TEXTURE_2D,n.handle,0),e.gl.bindTexture(e.gl.TEXTURE_2D,null))),e._ns[r].validated=!1,b(e,r)},C.prototype.framebuffer=function(e,t){var n=t[0],r=t[1],i=e._ns[n];r?(A("Binding framebuffer {0}".format(n)),y(e,n),i.validated||(i.validated=!0,E(e))):(A("Unbinding framebuffer {0}".format(n)),b(e,n))},C.prototype.func=function(e,t){var n=t[0];A("Calling {0}({1}).".format(n,t.slice(1)));for(var r=1;r<t.length;r++)"string"==typeof t[r]&&(t[r]=v(e,t[r]));var i=e.gl[n],o=t.slice(1);i.apply(e.gl,o)},t.exports=new C},{"./data.js":2,"./util.js":8,"./vispycanvas.js":9}],5:[function(e,t,n){function r(e){var t=e.$el.get(0);e.gl=t.getContext("webgl")||t.getContext("experimental-webgl");var n=e.gl.getExtension("OES_standard_derivatives")||e.gl.getExtension("MOZ_OES_standard_derivatives")||e.gl.getExtension("WEBKIT_OES_standard_derivatives");null===n&&console.warn("Extension 'OES_standard_derivatives' is not supported in this browser. Some features may not work as expected");var n=e.gl.getExtension("OES_element_index_uint")||e.gl.getExtension("MOZ_OES_element_index_uint")||e.gl.getExtension("WEBKIT_OES_element_index_uint");null===n&&console.warn("Extension 'OES_element_index_uint' is not supported in this browser. Some features may not work as expected")}var i=e("./gloo.glir.js"),o=function(){this.glir=i};o.prototype.init=function(e){r(e),this.glir.init(e)},t.exports=new o},{"./gloo.glir.js":4}],6:[function(t,n,r){!function(t){"function"==typeof e&&e.amd?e(["jquery"],t):"object"==typeof r?n.exports=t:t(jQuery)}(function(e){function t(t){var u=t||window.event,a=l.call(arguments,1),s=0,c=0,p=0,g=0,_=0,d=0;if(t=e.event.fix(u),t.type="mousewheel","detail"in u&&(p=-1*u.detail),"wheelDelta"in u&&(p=u.wheelDelta),"wheelDeltaY"in u&&(p=u.wheelDeltaY),"wheelDeltaX"in u&&(c=-1*u.wheelDeltaX),"axis"in u&&u.axis===u.HORIZONTAL_AXIS&&(c=-1*p,p=0),s=0===p?c:p,"deltaY"in u&&(p=-1*u.deltaY,s=p),"deltaX"in u&&(c=u.deltaX,0===p&&(s=-1*c)),0!==p||0!==c){if(1===u.deltaMode){var h=e.data(this,"mousewheel-line-height");s*=h,p*=h,c*=h}else if(2===u.deltaMode){var m=e.data(this,"mousewheel-page-height");s*=m,p*=m,c*=m}if(g=Math.max(Math.abs(p),Math.abs(c)),(!o||o>g)&&(o=g,r(u,g)&&(o/=40)),r(u,g)&&(s/=40,c/=40,p/=40),s=Math[s>=1?"floor":"ceil"](s/o),c=Math[c>=1?"floor":"ceil"](c/o),p=Math[p>=1?"floor":"ceil"](p/o),f.settings.normalizeOffset&&this.getBoundingClientRect){var v=this.getBoundingClientRect();_=t.clientX-v.left,d=t.clientY-v.top}return t.deltaX=c,t.deltaY=p,t.deltaFactor=o,t.offsetX=_,t.offsetY=d,t.deltaMode=0,a.unshift(t,s,c,p),i&&clearTimeout(i),i=setTimeout(n,200),(e.event.dispatch||e.event.handle).apply(this,a)}}function n(){o=null}function r(e,t){return f.settings.adjustOldDeltas&&"mousewheel"===e.type&&t%120===0}var i,o,u=["wheel","mousewheel","DOMMouseScroll","MozMousePixelScroll"],a="onwheel"in document||document.documentMode>=9?["wheel"]:["mousewheel","DomMouseScroll","MozMousePixelScroll"],l=Array.prototype.slice;if(e.event.fixHooks)for(var s=u.length;s;)e.event.fixHooks[u[--s]]=e.event.mouseHooks;var f=e.event.special.mousewheel={version:"3.1.12",setup:function(){if(this.addEventListener)for(var n=a.length;n;)this.addEventListener(a[--n],t,!1);else this.onmousewheel=t;e.data(this,"mousewheel-line-height",f.getLineHeight(this)),e.data(this,"mousewheel-page-height",f.getPageHeight(this))},teardown:function(){if(this.removeEventListener)for(var n=a.length;n;)this.removeEventListener(a[--n],t,!1);else this.onmousewheel=null;e.removeData(this,"mousewheel-line-height"),e.removeData(this,"mousewheel-page-height")},getLineHeight:function(t){var n=e(t),r=n["offsetParent"in e.fn?"offsetParent":"parent"]();return r.length||(r=e("body")),parseInt(r.css("fontSize"),10)||parseInt(n.css("fontSize"),10)||16},getPageHeight:function(t){return e(t).height()},settings:{adjustOldDeltas:!0,normalizeOffset:!0}};e.fn.extend({mousewheel:function(e){return e?this.bind("mousewheel",e):this.trigger("mousewheel")},unmousewheel:function(e){return this.unbind("mousewheel",e)}})})},{}],7:[function(e,t,n){!function(){"use strict";var e="undefined"!=typeof t&&t.exports,n="undefined"!=typeof Element&&"ALLOW_KEYBOARD_INPUT"in Element,r=function(){for(var e,t,n=[["requestFullscreen","exitFullscreen","fullscreenElement","fullscreenEnabled","fullscreenchange","fullscreenerror"],["webkitRequestFullscreen","webkitExitFullscreen","webkitFullscreenElement","webkitFullscreenEnabled","webkitfullscreenchange","webkitfullscreenerror"],["webkitRequestFullScreen","webkitCancelFullScreen","webkitCurrentFullScreenElement","webkitCancelFullScreen","webkitfullscreenchange","webkitfullscreenerror"],["mozRequestFullScreen","mozCancelFullScreen","mozFullScreenElement","mozFullScreenEnabled","mozfullscreenchange","mozfullscreenerror"],["msRequestFullscreen","msExitFullscreen","msFullscreenElement","msFullscreenEnabled","MSFullscreenChange","MSFullscreenError"]],r=0,i=n.length,o={};i>r;r++)if(e=n[r],e&&e[1]in document){for(r=0,t=e.length;t>r;r++)o[n[0][r]]=e[r];return o}return!1}(),i={request:function(e){var t=r.requestFullscreen;e=e||document.documentElement,/5\.1[\.\d]* Safari/.test(navigator.userAgent)?e[t]():e[t](n&&Element.ALLOW_KEYBOARD_INPUT)},exit:function(){document[r.exitFullscreen]()},toggle:function(e){this.isFullscreen?this.exit():this.request(e)},onchange:function(){},onerror:function(){},raw:r};return r?(Object.defineProperties(i,{isFullscreen:{get:function(){return!!document[r.fullscreenElement]}},element:{enumerable:!0,get:function(){return document[r.fullscreenElement]}},enabled:{enumerable:!0,get:function(){return!!document[r.fullscreenEnabled]}}}),document.addEventListener(r.fullscreenchange,function(e){i.onchange.call(i,e)}),document.addEventListener(r.fullscreenerror,function(e){i.onerror.call(i,e)}),void(e?t.exports=i:window.screenfull=i)):void(e?t.exports=!1:window.screenfull=!1)}()},{}],8:[function(e,t,n){function r(e){window.VISPY_DEBUG&&console.debug(e)}String.prototype.format||(String.prototype.format=function(){var e=arguments;return this.replace(/{(\d+)}/g,function(t,n){return"undefined"!=typeof e[n]?e[n]:t})}),"undefined"==typeof String.prototype.trim&&(String.prototype.trim=function(){return String(this).replace(/^\s+|\s+$/g,"")}),Array.prototype.equals=function(e){if(!e)return!1;if(this.length!=e.length)return!1;for(var t=0,n=this.length;t<n;t++)if(this[t]instanceof Array&&e[t]instanceof Array){if(!this[t].equals(e[t]))return!1}else if(this[t]!=e[t])return!1;return!0},"function"!=typeof String.prototype.startsWith&&(String.prototype.startsWith=function(e){return this.slice(0,e.length)==e}),window.VISPY_DEBUG=!1,t.exports={debug:r}},{}],9:[function(e,t,n){var r=function(e){this.$el=e};t.exports=r},{}]},{},[1])(1)});
//# sourceMappingURL=vispy.min.js.map


/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = {"name":"vispy","version":"0.1.0","description":"A Custom Jupyter Widget Library for the VisPy Python Library","author":"Vispy Development Team","license":"BSD-3-Clause","main":"lib/index.js","repository":{"type":"git","url":"https://github.com/VisPy/vispy.git"},"keywords":["jupyter","widgets","ipython","ipywidgets"],"files":["lib/**/*.js","dist/*.js"],"scripts":{"clean":"rimraf dist/","prepublish":"webpack","test":"echo \"Error: no test specified\" && exit 1"},"devDependencies":{"webpack":"^3.5.5","rimraf":"^2.6.1"},"dependencies":{"@jupyter-widgets/base":"^1.0.0","lodash":"^4.17.4"}}

/***/ })
/******/ ])});;
//# sourceMappingURL=index.js.map
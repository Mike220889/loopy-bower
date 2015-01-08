(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],2:[function(require,module,exports){
var extend = require('extend');

module.exports = function(loopy){
	/*
	 * Exponential decay or growth
	 * Options:
	 *   initial: initial value to grow or decay
	 *   halflife: time taken to halve, or double the value (miliseconds)
	 *   growth: if true, value increases exponentially instead of decreasing.
	 */
	loopy.exponential = function(callback, options){
		options = extend({
			initial : 100,
			halflife : 1000, //miliseconds
			growth: false, //true for growth instead of decay
		}, options);

		var decay = (options.growth ? 1 : -1) * Math.log(2) / (options.halflife);
		return loopy(function(deltaTime, timeElapsed){
			var value = options.initial * Math.exp(timeElapsed * decay);
			callback.call(this, value, deltaTime, timeElapsed);
		});
	};

	/*
	 * Sinusoidal oscillation
	 * Options:
	 *   amplitude: maximum value returned
	 *   phase: angle in radians to adjust the phase
	 *   period: time for one full sinusoidal cycle
	 */
	loopy.sinusoidal = function(callback, options){
		options = extend({
			amplitude: 100,
			phase: 0, //radians
			period: 1000, //miliseconds
		}, options);

		var frequency = 2 * Math.PI / options.period;
		return loopy(function(deltaTime, timeElapsed){
			var angle = options.phase + timeElapsed * frequency;
			var value = options.amplitude * Math.sin(angle);

			callback.call(this, value, deltaTime, timeElapsed);
		});
	};

	loopy.scroll = function(callback, options){
		var getWindowPosition = function(){
			return {
				x : window.pageXOffset,
				y : window.pageYOffset
			};
		};
		var previousWindowPosition = getWindowPosition();
		return loopy(function(deltaTime, timeElapsed){
			var windowPosition = getWindowPosition();
			if(windowPosition.y !== previousWindowPosition.y || windowPosition.x !== previousWindowPosition.x){
				callback.call(this, deltaTime, timeElapsed);
				previousWindowPosition = windowPosition;
			}
		});
	};
};

},{"extend":1}],3:[function(require,module,exports){
(function (global){
module.exports = (function(){
	var window = window || global;
	/* RequestAnimationFrame
	 * From Erik Moller's polyfill
	 * Adapted to return an animationFrame object
	 * http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
	*/

	//don't pollute the window scope
	var requestAnimationFrame = window.requestAnimationFrame;
	var cancelAnimationFrame  = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;

	var getTime = (function(){
		if(typeof window.performance === 'undefined' || !window.performance.now){
			return function(){ return window.Date.now(); };
		}else{
			return function(){ return window.performance.now(); };
		}
	})();

	(function(){
		var lastTime = 0;
		var vendors = ['webkit', 'moz', 'ms'];
		for(var x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
			requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			cancelAnimationFrame =
			  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}

		if(!requestAnimationFrame){
			requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function(){
					callback(currTime + timeToCall);
				}, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}

		if(!cancelAnimationFrame){
			cancelAnimationFrame = function(id){
				clearTimeout(id);
			};
		}
	})();

	var loopy = function(callback){
		/* Often a rAF loop is needed,
		 * Here we pass both the time since last frame (deltaTime) and time since start of loop (timeElapsed)
		 * into the animationframe callback.
		 * To stop the loop, the cancel method must be called on the callback context or the return value.
		 *
		 * Usage:
		 * var anim = loopy.loop(function(deltaTime, timeElapsed){
		 *   if(timeElapsed > 1000){ //1 second
		 *     this.cancel();
		 *   }
		 *   //do some animation using the time values deltaTime and timeElapsed
		 * });
		 *
		 * anim.cancel(); //this will also cancel the animation
		 */
		var startTime, previousTime;
		startTime = previousTime = getTime();
		var cancel = false;
		var context = {
			'requestId' : null,
			'cancel' : function(){
				cancelAnimationFrame.call(window, this.requestId);
				cancel = true;
			},
			'frame'  : 0,
		};

		var tick = function(){
			//this = window
			var currentTime = getTime();
			var deltaTime = currentTime - previousTime;
			var timeElapsed = currentTime - startTime;

			callback.call(context, deltaTime, timeElapsed);

			context.frame++;
			previousTime = currentTime;

			if(!cancel){
				context.requestId = requestAnimationFrame.call(window, tick);
			}
		};

		context.requestId = requestAnimationFrame.call(window, tick);

		return context;
	};

	loopy.request = function(callback){
		/* Create a wrapper which gives change in time (deltaTime) to the callback, rather
		 * than the current time which is what normal window.requestAnimationFrame does
		 */
		var startTime = getTime();
		return requestAnimationFrame.call(window, function(){
			var currentTime = getTime();
			var deltaTime = currentTime - startTime; //time since request was made
			callback(deltaTime);
		});
	};

	loopy.cancel = function(id){
		cancelAnimationFrame.call(window, id);
	};

	return loopy;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
var loopy = require('./core.js');
require('./animation-helpers.js')(loopy);

//expose to browsers
if(typeof window != "undefined"){
	window.loopy = loopy;

	//support AMD
	if(typeof window.define === "function" && window.define.amd){
		window.define("loopy", [], function(){
			return window.loopy;
		});
	}
}

module.exports = loopy;

},{"./animation-helpers.js":2,"./core.js":3}]},{},[4]);

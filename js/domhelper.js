/**
 * @fileoverview Document Model Helper class
 * 
 * The DomHelper object 
 * PENDING: 
 * - "all-loaded" event trigger
 * - scanning to get data attributes as array of objects
 */


/**
 * DomHelper
 * @constructor
 *
 * The DomHelper abstracts the DOM manipulation including element scanning and
 * element attribute setting (e.g. resizing).
 * 
 */
var DomHelper = function(options) {
}


/**
 * List of (i)frames as obtained by the querySelectorAll(). 
 * @type {Object[]}
 */
DomHelper.prototype.framesList = null;

/**
 * Array of cached (i)frames. Contains {node: <pointer to iframe>, subscribeHandler:<function to pubsub handler>}
 * @type {Object[]}
 */
DomHelper.prototype.frameCustomParams = new Array();

/**
 * MessageBroker.dispose
 *
 * Releases used references (the list of iframes)
 */
DomHelper.prototype.dispose = function () {
		this.frameCustomParams = null;
	};

/**
 * DomHelper.cacheFrames
 *
 * Caches the (i)frames for faster access. The MessageBroker uses this to hold
 * information such as subscriberHandler.
 *
 * @param {String} classAttr		The class for selecting the object element 
 * 									to be converted. (i.e. 'bric')
 * 
 */
DomHelper.prototype.cacheFrames = function(classAttr) {

		this.framesList = document.querySelectorAll("iframe." + classAttr); // 
		//this.bricIframes = $("iframe.bric");  // Alternatively can use jQuery 

		var _self = this;
		// Converting list into map. THe map entry contains node and subscribeHandler
		//[].forEach.call(this.framesList, function(selectedFrame) {
		for (var i = 0; i < this.framesList.length; i++){
			_self.setFrameCustomParams(i,  {node: this.framesList[i]});
		};
	};

DomHelper.prototype.setFrameCustomParams = function(index, value) {
		this.frameCustomParams[index] = value;
	}

DomHelper.prototype.getFrameCustomParams = function(windowObj) {
		var index = -1;
		for (var i = 0; i < this.framesList.length; i++){
			if (windowObj === this.framesList[i].contentWindow) {
				index = i;
				break;
			}
		}
		if (index > -1)
			return this.frameCustomParams[index];
	}

DomHelper.prototype.getFrameCustomParamsByIndex = function(index) {
		return this.frameCustomParams[index];
	}

/**
 * DomHelper.resize
 *
 * Resizes the iframe to a specific dimension.
 * @todo: Check that all user agents (browsers) that we intent to support
 *        behaves correctly.
 *
 * @param {Window} window		The window (iframe) object to be resized.
 * @param {Object} dimension	The object that contains width and height attributes.
 * 
 */
DomHelper.prototype.resize = function (window, dimension) {
		
		var frameEntry =  this.getFrameCustomParams(window);

		if (frameEntry) {
			var frameObject = frameEntry.node;
			frameObject.style.width = dimension.width + 'px';
			frameObject.style.height = dimension.height + 'px';
		}
	};


/**
 * buildQueryStringFromParams
 *
 * Returns a queryString from <param> tags inside and <object>. 
 *
 * @param {Node} objectNode		The object node that will be changed to iframe, and contains the params.
 *
 */
function buildQueryStringFromParams(objectNode){
		var params = objectNode.querySelectorAll('param');
		var queryString = [].reduce.call(params, function(acc, paramNode){
			var name = paramNode.getAttribute('name');
			var value = paramNode.getAttribute('value');

			if (acc) acc += '&';
			return acc + encodeURIComponent(name) + '=' + encodeURIComponent(value);
		}, '');
		return queryString;
	};

/**
 * DomHelper.convertObjectToIframeElement
 *
 * Converts the object element to iframe element. (As the function name implies) 
 *
 * @param {String} classAttr		The class for selecting the object element to be converted. (i.e. 'bric')
 *
 */
DomHelper.prototype.convertObjectToIframeElement = function (classAttr) {
		// Turn the <object> tags into <iframe> tags to work around webkit bug https://bugs.webkit.org/show_bug.cgi?id=75395.
		// Also append parameters to iframe url so they're accessible to the iframe implementation.
		// To prevent the flicker when loading, you might want to do this transformation work before rendering the HTML in your player.
		var objectNodes = document.querySelectorAll('object.' + classAttr);
		[].forEach.call(objectNodes, function(objectNode){
			var iframeNode = document.createElement('iframe');
			iframeNode.setAttribute('sandbox', 'allow-scripts');

			// Copy over white-listed attributes from the <object> to the <iframe>.
			['height','width','class','style'].forEach(function(attrName){
				var attrValue = objectNode.getAttribute(attrName);
				if (attrValue !== null) iframeNode.setAttribute(attrName, attrValue);
			});

			var queryString = buildQueryStringFromParams(objectNode);
			if (queryString.length > 0)
				queryString = '?' + queryString;
			var url = objectNode.getAttribute('data') + queryString;
			iframeNode.setAttribute('src', url);
			// Swap the <object> for the <iframe> node.
			objectNode.parentNode.replaceChild(iframeNode, objectNode);
		});
	};

/* **************************************************************************
 * $Workfile:: widget-image.js                                              $
 * *********************************************************************/ /**
 *
 * @fileoverview Implementation of the Image widget.
 *
 * The Image widget draws a scaled image in an SVGContainer.
 * The CaptionedImage widget draws a caption next to an Image.
 *
 * Created on		May 04, 2013
 * @author			Leslie Bondaryk
 * @author			Michael Jay Lippert
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

goog.provide('pearson.brix.Image');
goog.provide('pearson.brix.CaptionedImage');

// Sample configuration objects for classes defined here
(function()
{
	// config for Image class
	var imageConfig =
		{
			id: "img1",
			URI: 'img/ch4_1.jpg',
			caption: "The Whitewater-Baldy Complex wildfire.",
			preserveAspectRatio: "xMinYMin meet",
			actualSize: {height: 960, width: 1280},
			key: "fire"
		};
	
	// config for CaptionedImage class
	var cimgConfig =
		{
			id: "cimg1",
			image: new Image(imageConfig),
			captionPosition: "below"
		};

});

/* **************************************************************************
 * Image                                                               */ /**
 *
 * The Image widget draws an image in an SVGContainer.
 *
 * The Image is frequently used by other widgets, or drawn under other
 * widgets such as LabelGroups.
 *
 * @constructor
 * @implements {IWidget}
 *
 * @param {Object}		config			-The settings to configure this Image
 * @param {string|undefined}
 * 						config.id		-String to uniquely identify this Image.
 * 										 if undefined a unique id will be assigned.
 * @param {string}		config.URI		-The URI of the image resource to be displayed.
 * @param {string}		config.caption	-The caption for the image.
 * @param {string}		config.preserveAspectRatio
 *										-Specify how to treat the relationship between
 *										 the actual aspect ratio of the image and the
 *										 area it is to be drawn in.
 * @param {Size}		config.actualSize
 *										-The actual height and width in pixels of the image.
 * @param {string}		config.key		-Association key used to determine if this
 *										 image should be highlighted.
 * @param {pearson.utils.IEventManager=}
 * 						eventManager	-The event manager to use for publishing events
 * 										 and subscribing to them.
 *
 ****************************************************************************/
pearson.brix.Image = function (config, eventManager)
{
	/**
	 * A unique id for this instance of the image widget
	 * @type {string}
	 */
	this.id = pearson.brix.utils.getIdFromConfigOrAuto(config, pearson.brix.Image);

	/**
	 * The URI where the image resource is located.
	 * @type {string}
	 */
	this.URI = config.URI;
	
	
	/**
	 * The caption for the image.
	 * @type {string}
	 */
	this.caption = config.caption;

	/**
	 * String that determines if the aspect ratio of the image should be preserved, and if
	 * so how it should be laid out in the viewport. The values that are allowed are defined by svg.
	 * @see {@link https://developer.mozilla.org/en-US/docs/SVG/Attribute/preserveAspectRatio|SVG Doc on preserveAspectRatio}
	 *      
	 * @type {string}
	 * @default "xMinYMin meet"
	 */
	this.preserveAspectRatio = config.preserveAspectRatio || "xMinYMin meet";

	/**
	 * The actual size in pixels of the image resource.
	 * @todo determine if there is a simple way to figure out the actual size
	 *       at runtime instead of forcing the user to specify it.
	 * @type {Size|undefined}
	 */
	this.actualSize = config.actualSize;
	
	/**
	 * Association key used to determine if this image should be highlighted.
	 * @type {string}
	 */
	this.key = config.key;

	/**
	 * List of child widgets which are to be drawn in this Image's container area.
	 * Child widgets are added using Image.append.
	 * @type {Array.<IWidget>}
	 */
	this.childWidgets = [];
	
	/**
	 * The event manager to use to publish (and subscribe to) events for this widget
	 * @type {pearson.utils.IEventManager}
	 */
	this.eventManager = eventManager;

	/**
	 * The scale functions set explicitly for this Image using setScale.
	 * Image doesn't use scale functions, but they may get used in a widget chain.
	 * Otherwise a data extent of [0,1] will be mapped to the given
	 * container area.
	 * @type Object
	 * @property {function(number): number}
	 *						xScale	-function to convert a horizontal data offset
	 *								 to the pixel offset into the data area.
	 * @property {function(number): number}
	 *						yScale	-function to convert a vertical data offset
	 *								 to the pixel offset into the data area.
	 * @private
	 */
	this.explicitScales_ = {xScale: null, yScale: null};
	
	/**
	 * Information about the last drawn instance of this image (from the draw method)
	 * @type {Object}
	 */
	this.lastdrawn =
		{
			container: null,
			size: {height: 0, width: 0},
			widgetGroup: null,
		};
}; // end of Image constructor

/**
 * Prefix to use when generating ids for instances of Image.
 * @const
 * @type {string}
 */
pearson.brix.Image.autoIdPrefix = "img_auto_";

/* **************************************************************************
 * Image.draw                                                          */ /**
 *
 * Draw this Image in the given container.
 *
 * @param {!d3.selection}
 *					container	-The container svg element to append the labels element tree to.
 * @param {Object}	size		-The size in pixels for the label
 * @param {number}	size.height	-The height in pixels of the area the labels are drawn within.
 * @param {number}	size.width	-The width in pixels of the area the labels are drawn within.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.draw = function(container, size)
{
	this.lastdrawn.container = container;
	this.lastdrawn.size = size;
	this.lastdrawn.URI = this.URI;
	this.lastdrawn.caption = this.caption;

	this.setLastdrawnScaleFns2ExplicitOrDefault_(size);
	
	// make a group to hold the image
	var imageGroup = container.append("g")
		.attr("class", "widgetImage")
		.attr("id", this.id);

	// Rect for the background of the viewbox in case the image doesn't fill it
	imageGroup
		.append("rect")
			.attr("class", "background")
			.attr("width", size.width)
			.attr("height", size.height)
			.attr("fill", "#efefef");	// TODO: move this to css selector: 'g.widgetImage>rect' -mjl
	
	// Draw the image itself
	imageGroup
		.append("image")
			.attr("xlink:href", this.URI)
			.attr("preserveAspectRatio", this.preserveAspectRatio)
			.attr("width", size.width)
			.attr("height", size.height)
			.append("desc")
				.text(this.caption);

	// Rect to highlight this image when needed	
	var hilightWidth = 6;
	imageGroup
		.append("rect")
			.attr("class", "highlight")
			.attr("width", size.width - hilightWidth)
			.attr("height", size.height - hilightWidth)
			.attr("stroke-width", hilightWidth)
			.attr("x", hilightWidth / 2)
			.attr("y", hilightWidth / 2);

	this.lastdrawn.widgetGroup = imageGroup;

	// Draw any child widgets that got appended before draw was called
	this.childWidgets.forEach(this.drawWidget_, this);
	
}; // end of Image.draw()

/* **************************************************************************
 * Image.redraw                                                        */ /**
 *
 * Redraw the image as it may have been changed (new URI or caption). It will be
 * redrawn into the same container area as it was last drawn.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.redraw = function ()
{
	// TODO: Do we want to allow calling redraw before draw (ie handle it gracefully
	//       by doing nothing? -mjl
	var image = this.lastdrawn.widgetGroup.select("image");
	image.attr("xlink:href", this.URI);
	
	var desc = image.select("desc");
	desc.text(this.caption);
	
	this.childWidgets.forEach(this.redrawWidget_, this);
};

/* **************************************************************************
 * Image.drawWidget_                                                   */ /**
 *
 * Draw the given child widget in this image's area.
 * This image must have been drawn BEFORE this method is called or
 * bad things will happen.
 *
 * @private
 *
 * @todo implement some form of error handling! -mjl
 *
 ****************************************************************************/
pearson.brix.Image.prototype.drawWidget_ = function (widget)
{
	widget.setScale(this.lastdrawn.xScale, this.lastdrawn.yScale);
	widget.draw(this.lastdrawn.widgetGroup, this.lastdrawn.size);
};

/* **************************************************************************
 * Image.redrawWidget_                                                 */ /**
 *
 * Redraw the given child widget.
 * This line graph and this child widget must have been drawn BEFORE this
 * method is called or bad things will happen.
 *
 * @private
 *
 * @todo implement some form of error handling! -mjl
 *
 ****************************************************************************/
pearson.brix.Image.prototype.redrawWidget_ = function (widget)
{
	widget.redraw();
};

/* **************************************************************************
 * Image.changeImage                                                   */ /**
 *
 * Change the URI of this Image and/or the caption. After changing the
 * image it should be redrawn.
 *
 * @param	{?string}	URI			-The new URI for the image. If null, the URI
 *									 will not be changed.
 * @param	{string=}	opt_caption	-The new caption for the image.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.changeImage = function (URI, opt_caption)
{
	if (URI)
	{
		this.URI = URI;
	}
	
	if (opt_caption !== undefined)
	{
		this.caption = opt_caption;
	}
};

/* **************************************************************************
 * Image.setScale                                                      */ /**
 *
 * Called to preempt the normal scale definition which is done when the
 * widget is drawn. This is usually called in order to force one widget
 * to use the scaling/data area calculated by another widget.
 *
 * @param {function(number): number}
 *						xScale	-function to convert a horizontal data offset
 *								 to the pixel offset into the data area.
 * @param {function(number): number}
 *						yScale	-function to convert a vertical data offset
 *								 to the pixel offset into the data area.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.setScale = function (xScale, yScale)
{
	this.explicitScales_.xScale = xScale;
	this.explicitScales_.yScale = yScale;
};

/* **************************************************************************
 * Image.append                                                        */ /**
 *
 * Append the widget or widgets to this image and draw it/them on top
 * of the image and any widgets appended earlier. If append
 * is called before draw has been called, then the appended widget(s) will be
 * drawn when draw is called.
 *
 * @param {!IWidget|Array.<IWidget>}
 * 						svgWidgets	-The widget or array of widgets to be drawn in
 *									 this image's area.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.append = function(svgWidgets)
{
	if (!Array.isArray(svgWidgets))
	{
		this.append_one_(svgWidgets);
	}
	else
	{
		svgWidgets.forEach(this.append_one_, this);
	}
		
}; // end of Image.append()

/* **************************************************************************
 * Image.append_one_                                                   */ /**
 *
 * Helper for append that does the work needed to append a single widget.
 *
 * @param {!IWidget}	widget	-The widget which is to be drawn in this image's
 *								 area.
 *
 * @private
 *
 ****************************************************************************/
pearson.brix.Image.prototype.append_one_ = function(widget)
{
	this.childWidgets.push(widget);
	
	if (this.lastdrawn.container !== null)
		this.drawWidget_(widget);
		
}; // end of Image.append_one_()

/* **************************************************************************
 * Image.lite                                                          */ /**
 *
 * Highlight the image if it is identified by the given liteKey.
 *
 * @param {string}	liteKey	-The key associated with this image if it is to be highlighted.
 *
 ****************************************************************************/
pearson.brix.Image.prototype.lite = function (liteKey)
{
	var shouldHilight = liteKey === this.key;
	this.lastdrawn.widgetGroup.classed('lit', shouldHilight);
};

/* **************************************************************************
 * Image.setLastdrawnScaleFns2ExplicitOrDefault_                       */ /**
 *
 * Set this.lastdrawn.xScale and yScale to those stored in explicitScales
 * or to the default scale functions w/ a data domain of [0,1].
 *
 * @param {Size}	cntrSize	-The pixel size of the container given to draw().
 * @private
 *
 ****************************************************************************/
pearson.brix.Image.prototype.setLastdrawnScaleFns2ExplicitOrDefault_ = function (cntrSize)
{
	if (this.explicitScales_.xScale !== null)
	{
		this.lastdrawn.xScale = this.explicitScales_.xScale;
	}
	else
	{
		// map the default x data domain [0,1] to the whole width of the container
		this.lastdrawn.xScale = d3.scale.linear().rangeRound([0, cntrSize.width]);
	}
	
	if (this.explicitScales_.yScale !== null)
	{
		this.lastdrawn.yScale = this.explicitScales_.yScale;
	}
	else
	{
		// map the default y data domain [0,1] to the whole height of the container
		// but from bottom to top
		this.lastdrawn.yScale = d3.scale.linear().rangeRound([cntrSize.height, 0]);
	}
}; // end of Image.setLastdrawnScaleFns2ExplicitOrDefault_()

/* **************************************************************************
 * CaptionedImage                                                      */ /**
 *
 * The CaptionedImage widget draws an image in an SVGContainer with a caption.
 *
 * @constructor
 * @extends {pearson.brix.Image}
 * @implements {pearson.brix.IWidget}
 *
 * @param {Object}		config			-The settings to configure this CaptionedImage
 * @param {string|undefined}
 * 						config.id		-String to uniquely identify this CaptionedImage.
 * 										 if undefined a unique id will be assigned.
 * @param {string}		config.URI		-The URI of the image resource to be displayed.
 * @param {string}		config.caption	-The caption for the image.
 * @param {string}		config.preserveAspectRatio
 *										-Specify how to treat the relationship between
 *										 the actual aspect ratio of the image and the
 *										 area it is to be drawn in.
 * @param {Size}		config.actualSize
 *										-The actual height and width in pixels of the image.
 * @param {string}		config.key		-Association key used to determine if this
 *										 image should be highlighted.
 * @param {string}		config.captionPosition
 *										-Where the caption should be placed in
 *										 relation to the image.
 * @param {pearson.utils.IEventManager=}
 * 						eventManager	-The event manager to use for publishing events
 * 										 and subscribing to them.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage = function (config, eventManager)
{
	/**
	 * A unique id for this instance of the captioned image widget
	 * @type {string}
	 */
	this.id = pearson.brix.utils.getIdFromConfigOrAuto(config, pearson.brix.CaptionedImage);

	// call the base class constructor
	config.id = config.id + '_base';
	goog.base(this, config, eventManager);

	/**
	 * Where the caption should be placed in relation to the image.
	 *
	 * - "above" : The caption should be below the image.
	 * - "below" : The caption should be above the image.
	 *
	 * @type {string}
	 */
	this.captionPosition = config.captionPosition;
	
	/**
	 * Information about the last drawn instance of this image (from the draw method)
	 * @type {Object}
	 */
	this.captioned_lastdrawn =
		{
			container: null,
			size: {height: 0, width: 0},
			widgetGroup: null,
			URI: null,
			caption: null,
		};
}; // end of CaptionedImage constructor
goog.inherits(pearson.brix.CaptionedImage, pearson.ecourses.brix.Image);

/**
 * Prefix to use when generating ids for instances of CaptionedImage.
 * @const
 * @type {string}
 */
pearson.brix.CaptionedImage.autoIdPrefix = "cimg_auto_";

/* **************************************************************************
 * CaptionedImage.draw                                                 */ /**
 *
 * Draw this CaptionedImage in the given container.
 *
 * @param {!d3.selection}
 *					container	-The container svg element to append the captioned image element tree to.
 * @param {Object}	size		-The size in pixels for the captioned image
 * @param {number}	size.height	-The height in pixels of the area the captioned image are drawn within.
 * @param {number}	size.width	-The width in pixels of the area the captioned image are drawn within.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage.prototype.draw = function(container, size)
{
	this.captioned_lastdrawn.container = container;
	this.captioned_lastdrawn.size = size;
	this.captioned_lastdrawn.URI = this.URI;
	this.captioned_lastdrawn.caption = this.caption;

	// aliases of utility functions for readability
	var attrFnVal = pearson.brix.utils.attrFnVal;

	// make a group to hold the image
	var widgetGroup = container.append("g")
		.attr("class", "widgetCaptionedImage")
		.attr("id", this.id);

	var captionSize = {height: 40, width: size.width};
	var imageSize = {height: size.height - captionSize.height, width: size.width};
	
	// Draw the image
	var imageGroup = widgetGroup.append("g");
	goog.base(this, 'draw', imageGroup, imageSize);	
	
	// Draw the caption
	var captionGroup = widgetGroup.append("g");

	captionGroup
		.append("foreignObject")
			.attr("width", captionSize.width)
			.attr("height", captionSize.height)
			.append("xhtml:body")
				.style("margin", "0px")		// this interior body shouldn't inherit margins from page body
				.append("div")
					.attr("class", "widgetImageCaption")
					.html(this.caption);

	// position the caption
	if (this.captionPosition === "above")
	{
		imageGroup.attr("transform", attrFnVal("translate", 0, captionSize.height));
	}
	else // assume below
	{
		captionGroup.attr("transform", attrFnVal("translate", 0, imageSize.height));
	}
	
	this.captioned_lastdrawn.widgetGroup = widgetGroup;
	
} // end of CaptionedImage.draw()

/* **************************************************************************
 * CaptionedImage.redraw                                               */ /**
 *
 * Redraw the image as it may have been changed (new URI or caption). It will be
 * redrawn into the same container area as it was last drawn.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage.prototype.redraw = function ()
{
	// TODO: Do we want to allow calling redraw before draw (ie handle it gracefully
	//       by doing nothing? -mjl
	goog.base(this, 'redraw');

	// NOTE: for some reason foreignObject in a d3 selector doesn't work
	//       but body does.
	// TODO: updating the html isn't causing it to be re-rendered (at least in Chrome)
	var captionDiv = this.captioned_lastdrawn.widgetGroup.select("g body div")
		.html(this.caption);
};

/* **************************************************************************
 * CaptionedImage.changeImage                                          */ /**
 *
 * Change the URI of this Image and/or the caption. After changing the
 * image it should be redrawn.
 *
 * @param	{?string}	URI			-The new URI for the image. If null, the URI
 *									 will not be changed.
 * @param	{string=}	opt_caption	-The new caption for the image.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage.prototype.changeImage = function (URI, opt_caption)
{
	goog.base(this, 'changeImage', URI, opt_caption);
};

/* **************************************************************************
 * CaptionedImage.setScale                                             */ /**
 *
 * Called to preempt the normal scale definition which is done when the
 * widget is drawn. This is usually called in order to force one widget
 * to use the scaling/data area calculated by another widget.
 * This will actually set the scale of the encapsulated Image, not of
 * the CaptionedImage itself, as appended widgets will also be appended
 * to the encapsulated Image.
 *
 * @param {function(number): number}
 *						xScale	-function to convert a horizontal data offset
 *								 to the pixel offset into the data area.
 * @param {function(number): number}
 *						yScale	-function to convert a vertical data offset
 *								 to the pixel offset into the data area.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage.prototype.setScale = function (xScale, yScale)
{
	goog.base(this, 'setScale', xScale, yScale);
};

/* **************************************************************************
 * CaptionedImage.append                                               */ /**
 *
 * Append the widget or widgets to the encapsulated image.
 *
 * @param {!IWidget|Array.<IWidget>}
 * 						svgWidgets	-The widget or array of widgets to be drawn in
 *									 this encapsulated image's area.
 *
 ****************************************************************************/
pearson.brix.CaptionedImage.prototype.append = function(svgWidgets)
{
	goog.base(this, 'append', svgWidgets);
		
}; // end of CaptionedImage.append()



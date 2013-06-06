/**
 *	CAROUSEL WIDGET
 *
 *	@description
 *		- Takes an ol/ul of content and assembles it into a horizontal carousel with optional pagination and next/prev buttons.
 *		- Infinite looping, autoplay optional
 *		- Accepts an optional callback functions for beforeSlideChange and afterSlideChange
 *	@example
 *		var yourCarousel = new Carousel($('#myList'), {options});
 *
 *	@author CM
 *	@version 1.1.0
 *	@requires
 *		- jQuery 1.7 min
 *		- jQuery Easing
 */

var Carousel = function(container, options){

	this.containerList = container;
	this.options = $.extend({
		visibleItems: 1,					// how many slides you want visible at a time
		slideWidth: 400,					// how wide each slide should be
		slideHeight: 250,					// how tall each slide should be
		slideSpacing: 10,					// spacing between slides
		wrapperClass: 'carouselWrapper',	// css class for div that will wrap the slide list
		navWrapperClass: 'carouselNavWrapper', // css class for div that wraps all navigation
		pagination: true,					// jQuery object for pagination buttons, or if true will dynamically generate - NOT recommended if using an infinite carousel with more than one item visible at once (weird user experience)
		paginationClass: 'carouselPagination',	// css class for carousel pagination (ol or ul), if generated dynamically
		groupSlides: true,					// false: 1 pagination link for each slide. true: 1 pagination link for each set of visible slides.
		transitionSpeed: 400,				// time taken to animate between slides
		slideEasing: 'easeOutExpo',			// easing function to use on slide transitions - choose from jquery easing plugin list
		beforeSlideChange: null,				// optional callback function to call after a click event happened, but before slide changes - passes arg for pending slide index, previous slide index, and callback for next step
		afterSlideChange: null,				// optional callback function to call after slide change is complete - passes arg slide index, and previous slide index
		prevNextButtons: true,				// if true, dynamically generates prev/next buttons
		prevButtonClass: 'carouselBtnPrev',	// css class for previous button
		nextButtonClass: 'carouselBtnNext', // css class for next button
		infinite: false,					// should the carousel loop back to the beginning when it reaches the end
		forcePrevNextButtons: false,		// force show prev/next buttons even when number of slides is <= visibleItems
		auto: false,						// should the carousel auto-rotate. Requires infinite:true. (auto rotation stops on prev/next or pagination click)
		autoDelay: 7000						// timing for auto rotation in ms
	}, options || {});

	this.init();
};


Carousel.prototype = $.extend(Carousel.prototype, {

	/** PUBLIC API **/

	init: function(){

		// el refs
		this.slides = this.containerList.children('li');
		// the following els are (optionally) defined in setup
		this.containerWrapper = null;
		this.navWrapper = null;
		this.paginationContainer = null;
		this.pageButtons = null;
		this.prevButton = null;
		this.nextButton = null;

		// shared props
		this.totalSlides = this.slides.length;
		this.currentSlide = 0;
		this.slideAdjustment = 0;
		this.isAnimating = false;
		this.autoInterval = null;

		// setup
		if(this.options.visibleItems <= 1){ this.options.groupSlides = false; } // make sure group slides is turned off if there is only one slide visible at a time

		this._setupSlides();

		if(this.options.pagination && this.totalSlides > this.options.visibleItems){ this._setupPagination(); }
		if(this.options.prevNextButtons === true && ( this.totalSlides > this.options.visibleItems || this.options.forcePrevNextButtons) ){ this._addNextPrevArrows(); }// add back/next arrows if true in settings, and if number slides is greater than amount visible
		if(this.options.auto && this.options.infinite){ // if auto rotation (only possible in an infinite scenario)
			this._setupAutoRotation();
			this.startAutoRotation();
		}
	},

	/**
	 * Start interval for auto-rotation
	 */
	startAutoRotation: function(){
		var self = this;

		if(!this.autoInterval){ // FF will allow duplicate intervals, so check first
			this.autoInterval = setInterval(function(){
				self.changeToSlide(self.currentSlide + self.options.visibleItems);
			}, self.options.autoDelay);
		}
	},

	/**
	 * stop interval for auto-rotation
	 */
	stopAutoRotation: function(){
		clearInterval(this.autoInterval);
		this.autoInterval = null;
	},

	/**
	 * delegate actions to change slide (or not), including calling any 'beforeSlideChange' function that was specified
	 * @param  {int} slideIndex [index of slide to change to]
	 */
	changeToSlide: function(slideIndex){
		var delegateChange;

		if(this.totalSlides > this.options.visibleItems || this.options.forcePrevNextButtons){ // don't do slide change actions if total slides is <= to amount visible

			if(!this.options.infinite){
				if(slideIndex > this.totalSlides - this.options.visibleItems && !this.options.groupSlides){ // if back/next click causes slide index to be greater than total slides, set slideIndex to last slide
					slideIndex = this.totalSlides - this.options.visibleItems;
				}else if(slideIndex < 0){ // if back/next click causes slide index to be less than zero, set slideIndex to zero
					slideIndex = 0;
				}
			}

			if(!this.options.groupSlides && slideIndex != this.currentSlide || this.options.groupSlides && slideIndex < this.totalSlides || this.options.infinite){ // dont run if the item clicked is the current, or if slide grouping is turned on and slide index is past the total slide count. Always run if infinite.
				this._beforeSlideChange(slideIndex);
			}

		}
	},

	/**
	 * get 'virtual' (user-visible) index for a slide index in the carousel, to adjust for cloned slides in infinite carousel
	 * @param  {Int} slideIndex [active slide index of carousel/slide index to adjust for]
	 * @return {Int}            [adjusted index to remove duplicate slides from the count]
	 */
	getVirtualSlideIndex: function(slideIndex){
		var virtualIndex;

		// check if carousel index is at beginning or end in duplicate slides, adjust for duplicate counts
		if( slideIndex >= this.totalSlides + this.options.visibleItems ){
			virtualIndex = slideIndex - this.totalSlides;
		}else if( slideIndex < this.options.visibleItems ){
			virtualIndex = slideIndex + this.totalSlides;
		}else{
			virtualIndex = slideIndex;
		}

		// adjust index by number of slides visible (the amount of duplicate slides at the beginning)
		virtualIndex -= this.options.visibleItems;

		return virtualIndex;
	},


	/** PRIVATE **/

	/**
	 * set up slides in carousel format
	 */
	_setupSlides: function(){
		var wrapperCss = {
				'width': this.totalSlides <= this.options.visibleItems ? (this.totalSlides * this.options.slideWidth) + ((this.totalSlides - 1) * this.options.slideSpacing) + 'px' : (this.options.visibleItems * this.options.slideWidth) + ((this.options.visibleItems - 1) * this.options.slideSpacing) +  'px',
				'height': this.options.slideHeight + 'px',
				'position': 'relative',
				'overflow': 'hidden'
			},
			containerListCss = {
				'width': (this.totalSlides * this.options.slideWidth) + (this.totalSlides * this.options.slideSpacing) + 'px',
				'height': this.options.slideHeight + 'px',
				'overflow': 'hidden',
				'position': 'absolute',
				'left': (-this.options.slideSpacing/2) + 'px'
			},
			slideCss = {
				// 'display':'block',
				'float':'left',
				'width': this.options.slideWidth + 'px',
				'height': this.options.slideHeight + 'px',
				'overflow': 'hidden',
				'margin': '0px ' + Math.ceil(this.options.slideSpacing/2) + 'px 0px ' + Math.floor(this.options.slideSpacing/2) + 'px' // if spacing is an odd number, rounds self.options.slideSpacing/2 up on one side and down on the other
			};

		this.containerList.wrap($('<div class="' + this.options.wrapperClass + '" />'));
		this.containerWrapper = this.containerList.parent();

		this.navWrapper = $('<div class="' + this.options.navWrapperClass + '" />');
		this.containerWrapper.after(this.navWrapper);

		this.containerWrapper.css(wrapperCss);
		this.containerList.css(containerListCss);
		this.slides.css(slideCss);

		if(this.options.infinite && (this.totalSlides > this.options.visibleItems || this.options.forcePrevNextButtons) ){ // if inifite carousel, run addition setup items to support infinite.
			this._setupInfinite();
		}
	},

	/**
	 * additional setup steps for inifinite carousel
	 * duplicates options.visibleItems number slides at the end and beginning of the carousel to prep for clicks past the first and last slides
	 */
	_setupInfinite: function(){

		for(var i = 0, len = this.options.visibleItems; i <= len; i++){ // grab first number of slides and append to end of carousel
			this.containerList.append(this.slides.eq(i).clone());
		}

		for(var j = this.totalSlides - 1; j >= this.totalSlides - this.options.visibleItems; j--){ // grab last number of slides and prepend to carousel
			this.containerList.prepend(this.slides.eq(j).clone());
		}

		this.containerList.css({
			'left': ((this.options.slideWidth + this.options.slideSpacing) * this.options.visibleItems * -1) - (this.options.slideSpacing / 2) + 'px',
			'width': ((this.totalSlides + (this.options.visibleItems * 2)) * this.options.slideWidth) + ((this.totalSlides + (this.options.visibleItems * 2)) * this.options.slideSpacing) + 'px'
		});

		this.slides = this.containerList.children('li'); // redefine reference to slides with added slides
		this.currentSlide = this.currentSlide + this.options.visibleItems;
	},

	/**
	 * set up numerical pagination for slides. If you dont want numbers to show, can hide the inner <span> with css.
	 */
	_setupPagination: function(){
		var self = this;

		if (this.options.infinite){ this.slideAdjustment = this.options.visibleItems; }

		if(typeof this.options.pagination == 'object'){ // if user passed in self-created pagination jquery object, use that and set references
			this.paginationContainer = this.options.pagination;
			this.pageButtons = this.paginationContainer.children('li');
			this._updatePagination(this.currentSlide);

		}else{ // otherwise build pagination elements
			this.paginationContainer = $('<ol class="' + this.options.paginationClass + '"></ol>');

			if(this.options.groupSlides){
				for(var i = 1, len = Math.ceil(this.totalSlides / this.options.visibleItems); i <= len; i++){
					this.paginationContainer.append('<li><a href="#"><span>' + i + '</span></a></li>');
				}
			}else{
				for(var j = 1, len2 = this.totalSlides; j <= len2; j++){
					this.paginationContainer.append('<li><a href="#"><span>' + j + '</span></a></li>');
				}
			}

			this.navWrapper.append(this.paginationContainer);
			this.paginationContainer.wrap('<div class="' + this.options.paginationClass + 'Wrap" />'); // add a wrapping div for additional styling options
			this.pageButtons = this.paginationContainer.children('li');
		}

		this._updatePagination(this.currentSlide);

		// event handlers
		if(this.options.groupSlides){
			this.paginationContainer.on('click', 'li', $.proxy(this._onPaginationGroupClick, this));

		}else{
			this.paginationContainer.on('click', 'li', $.proxy(this._onPaginationItemClick, this));
		}
	},

	/**
	 * add back/next arrows and their click events, if true in settings
	 * Groups slides automatically just for this action
	 */
	_addNextPrevArrows: function(){
		var self = this;

		this.prevButton = $('<div class="' + this.options.prevButtonClass + '"><a href="#"><span>Prev</span></a></div>');
		this.nextButton = $('<div class="' + this.options.nextButtonClass + '"><a href="#"><span>Next</span></a></div>');

		this.navWrapper.prepend(this.prevButton);
		this.navWrapper.append(this.nextButton);

		this.prevButton.on('click', $.proxy(this._onPrevBtnClick, this));
		this.nextButton.on('click', $.proxy(this._onNextBtnClick, this));

		this._updatePrevNext(this.currentSlide);
	},

	/**
	 * setup event handling for auto-rotation
	 */
	_setupAutoRotation: function(){
		this.navWrapper.on('click', 'a', $.proxy(this.stopAutoRotation, this));

		// prevent queue from building when window/browser tab is not focused
		$(window).blur($.proxy(this.stopAutoRotation, this));
		$(window).focus($.proxy(this.startAutoRotation, this));
	},

	/**
	 * actions to take before the slide change takes place, called by changeToSlide
	 * redefines itself on first run based on user settings
	 * @param  {int} slideIndex [index of slide being changed]
	 */
	_beforeSlideChange: function(slideIndex){
		var self = this;

		// memoize which action to take, if a beforeSlideChange function was provided or not
		if(typeof this.options.beforeSlideChange == 'function'){
			this._beforeSlideChange = function(index){
				self.isAnimating = true;

				self.options.beforeSlideChange(index, self.currentSlide, function(){ // call optional beforeSlideChange function if one was passed in, define the callback for that function
					self._animateSlide(index);
					if(self.options.pagination){
						self._updatePagination(index);
					}

					if(self.options.prevNextButtons === true && !self.options.infinite && self.totalSlides > self.options.visibleItems){
						self._updatePrevNext(index);
					}
				});
			};

		}else{
			this._beforeSlideChange = function(index){
				self.isAnimating = true;

				self._animateSlide(index);
				if(self.options.pagination){
					self._updatePagination(index);
				}

				if(self.options.prevNextButtons === true && !self.options.infinite && self.totalSlides > self.options.visibleItems){ // if infinite carousel, prev/next buttons never change state
					self._updatePrevNext(index);
				}
			};
		}

		this._beforeSlideChange(slideIndex);
	},

	/**
	 * update pagination to reflect current visible/active slides, called by beforeSlideChange
	 * @param  {int} slideIndex [index of slide being changed to]
	 */
	_updatePagination: function(slideIndex){
		var self = this;

		this.pageButtons.removeClass('active');

		if(this.options.infinite){ // if infinite = true & auto rotate is on, make sure pagination highlights correctly as slides loop back to the beginning
			if(slideIndex >= this.totalSlides){
				slideIndex = slideIndex - this.totalSlides;
			}else if(slideIndex < 0){
				slideIndex = this.totalSlides - slideIndex;
			}else{
				slideIndex = slideIndex - this.options.visibleItems;
			}
		}

		if(this.options.groupSlides){
			slideIndex = Math.floor(slideIndex / this.options.visibleItems);
			this.pageButtons.eq(slideIndex).addClass('active');

		}else{
			for(var i = 0, len = this.options.visibleItems; i < len; i++){
				this.pageButtons.eq(i + slideIndex).addClass('active');
			}
		}

	},

	/**
	 * update next/prev buttons to reflect current position in the carousel, called by beforeSlideChange
	 * @param  {int} slideIndex [index of slide being changed to]
	 */
	_updatePrevNext: function(slideIndex){

		this.prevButton.removeClass('disabled');
		this.nextButton.removeClass('disabled');

		if(slideIndex <= 0){
			this.prevButton.addClass('disabled');
		}else if(slideIndex >= this.totalSlides - this.options.visibleItems){
			this.nextButton.addClass('disabled');
		}
	},

	/**
	 * animation to move to new slide, called by beforeSlideChange
	 * @param  {int} slideIndex [index of slide being changed]
	 */
	_animateSlide: function(slideIndex){
		var self = this,
			newXCoord = ((this.options.slideWidth + this.options.slideSpacing) * slideIndex * -1) - (this.options.slideSpacing / 2) + 'px';

		this.containerList.animate({
			left: newXCoord
		}, this.options.transitionSpeed, this.options.slideEasing, function(){
			self._afterSlideChange(slideIndex);
		});
	},

	/**
	 * actions to take after slide has changed, called by animateSlide
	 * @param  {int} slideIndex [index of slide that was changed]
	 */
	_afterSlideChange: function(slideIndex){

		if(this.options.infinite){
			if(slideIndex < this.options.visibleItems){ // if user clicked 'prev' past the first slide, secretly jump to the same slides at the end and set slideIndex
				this.containerList.css({
					'left': parseInt(this.containerList.css('left'), 10) - ((this.options.slideWidth + this.options.slideSpacing) * this.totalSlides)
				});
				slideIndex = slideIndex + this.totalSlides;
			}else if(slideIndex > this.totalSlides){
				this.containerList.css({ // if user clicked 'next' past the last slide, secretly jump to the same slides at the beginning and set slideIndex
					'left': parseInt(this.containerList.css('left'), 10) + ((this.options.slideWidth + this.options.slideSpacing) * this.totalSlides)
				});
				slideIndex = slideIndex - this.totalSlides;
			}
		}

		if(typeof this.options.afterSlideChange == 'function'){
			this.options.afterSlideChange(slideIndex, this.currentSlide);
		}

		this.currentSlide = slideIndex;
		this.isAnimating = false;
	},


	/** EVENT HANDLERS **/

	/**
	 * fired on user click on pagination item when pagination items control a whole group of slides
	 * @param  {Object} e [dom event]
	 */
	_onPaginationGroupClick: function(e){
		e.preventDefault();
		if(!this.isAnimating){
			this.changeToSlide(($(e.currentTarget).index() * this.options.visibleItems) + this.slideAdjustment);
		}
	},

	/**
	 * fired on user click on a pagination item when item corresponds to one slide
	 * @param  {Object} e [dom event]
	 */
	_onPaginationItemClick: function(e){
		var newIndex = $(e.currentTarget).index() + this.slideAdjustment;

		e.preventDefault();
		if(newIndex !== this.currentSlide && !this.isAnimating){ this.changeToSlide(newIndex); }
	},

	_onPrevBtnClick: function(e){
		e.preventDefault();

		if(!this.isAnimating){
			if(this.options.groupSlides){
				this.changeToSlide(this.currentSlide - this.options.visibleItems);
			}else{
				this.changeToSlide(this.currentSlide - 1);
			}
		}
	},

	_onNextBtnClick: function(e){
		e.preventDefault();

		if(!this.isAnimating){
			if(this.options.groupSlides){
				this.changeToSlide(this.currentSlide + this.options.visibleItems);
			}else{
				this.changeToSlide(this.currentSlide + 1);
			}
		}
	}
});
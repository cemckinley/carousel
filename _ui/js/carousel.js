/**
 * 	CAROUSEL WIDGET
 *
 * 	@description
 * 		- Takes an ol/ul of content and assembles it into a horizontal carousel with optional pagination and next/prev buttons.
 * 		- Infinite looping, autoplay optional
 *   	- Accepts an optional callback functions for beforeSlideChange and afterSlideChange
 * 	@example
 *  	var yourCarousel = new POP.Carousel($('#myList'), {options});
 *  	
 * 	@author CM
 * 	@version 1.0.0
 * 	@requires
 * 		- jQuery 1.7
 * 		- jQuery Easing
 */

var DK = DK || {};


DK.Carousel = function(container, options){
	var self = this;
	
	self.containerList = container;
	self.options = $.extend({
		visibleItems: 1,					// how many slides you want visible at a time
		slideWidth: 400,					// how wide each slide should be
		slideHeight: 250,					// how tall each slide should be
		slideSpacing: 10,					// spacing between slides
		wrapperClass: 'carouselWrapper',	// css class for div that will wrap the slide list
		pagination: true,					// jQuery object for pagination buttons, or if true will dynamically generate - NOT recommended if using an infinite carousel with more than one item visible at once (weird user experience)
		paginationClass: 'carouselPagination',	// css class for carousel pagination, if generated dynamically
		groupSlides: true,					// false: 1 pagination link for each slide. true: 1 pagination link for each set of visible slides.
		transitionSpeed: 400,				// time taken to animate between slides
		slideEasing: 'easeOutExpo',			// easing function to use on slide transitions - choose from jquery easing plugin list
		beforeSlideChange: '',				// optional callback function to call after a click event happened, but before slide changes - passes arg for pending slide index, previous slide index, and callback for next step
		afterSlideChange: '',				// optional callback function to call after slide change is complete - passes arg slide index, and previous slide index
		prevNextButtons: true,				// if true, dynamically generates prev/next buttons
		prevButtonClass: 'carouselBtnPrev',	// css class for previous button
		nextButtonClass: 'carouselBtnNext', // css class for next button
		infinite: false,					// should the carousel loop back to the beginning when it reaches the end
		auto: false,						// should the carousel auto-rotate. Requires infinite:true. (auto rotation stops on prev/next or pagination click)
		autoDelay: 7000						// timing for auto rotation in ms
	}, options || {});
	
	self.init();
};


DK.Carousel.prototype = {
	
	init: function(){
		
		this.slides = this.containerList.children('li');
		this.totalSlides = this.slides.length;
		this.currentSlide = 0;
		
		if(this.options.visibleItems <= 1){ this.options.groupSlides = false; } // make sure group slides is turned off if there is only one slide visible at a time
		
		this.setupSlides();
		
		if(this.options.pagination && this.totalSlides > this.options.visibleItems){ this.setupPagination(); }		
		if(this.options.prevNextButtons === true && this.totalSlides > this.options.visibleItems){ this.addNextPrevArrows(); }// add back/next arrows if true in settings, and if number slides is greater than amount visible
		if(this.options.auto && this.options.infinite){ this.startAutoRotation(); }// if auto rotation (only possible in an infinite scenario)

		delete this.init;
	},
	
	/**
	 * set up slides in carousel format
	 */
	setupSlides: function(){
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

		this.containerWrapper.css(wrapperCss);
		this.containerList.css(containerListCss);
		this.slides.css(slideCss);
		
		if(this.options.infinite && this.totalSlides > this.options.visibleItems){ // if inifite carousel, run addition setup items to support infinite.
			this.setupInfinite();
		}

		delete this.setupSlides;
	},
	
	/**
	 * additional setup steps for inifinite carousel
	 * duplicates options.visibleItems number slides at the end and beginning of the carousel to prep for clicks past the first and last slides
	 */
	setupInfinite: function(){
		
		for(var i = 0, len = this.options.visibleItems; i <= len; i++){ // grab first number of slides and append to end of carousel
			this.containerList.append(this.slides.eq(i).clone());
		}
		
		for(var i = this.totalSlides - 1; i >= this.totalSlides - this.options.visibleItems; i--){ // grab last number of slides and prepend to carousel
			this.containerList.prepend(this.slides.eq(i).clone());
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
	setupPagination: function(){
		var self = this,
			slideAdjustment = 0;
		
		this.options.infinite ? slideAdjustment = this.options.visibleItems : 0;
		
		if(typeof this.options.pagination == 'object'){ // if user passed in self-created pagination jquery object, use that
			this.pageButtons = this.options.pagination;
			this.updatePagination(this.currentSlide);
		
		}else{ // otherwise build pagination elements
			this.paginationContainer = $('<ol class="' + this.options.paginationClass + '"></ol>');
			
			if(this.options.groupSlides){
				for(var i = 1, len = Math.ceil(this.totalSlides / this.options.visibleItems); i <= len; i++){
					this.paginationContainer.append('<li><a href="#"><span>' + i + '</span></a></li>');
				}
			}else{
				for(var i = 1, len = this.totalSlides; i <= len; i++){
					this.paginationContainer.append('<li><a href="#"><span>' + i + '</span></a></li>');
				}
			}
			
			this.containerWrapper.after(this.paginationContainer);
			this.paginationContainer.wrap('<div class="' + this.options.paginationClass + 'Wrap" />'); // add a wrapping div for additional styling options
			this.pageButtons = this.paginationContainer.children('li');
		}
		
		this.updatePagination(this.currentSlide);
		
		if(this.options.groupSlides){
			this.pageButtons.click(function(e){
				e.preventDefault();
				self.changeToSlide(($(this).index() * self.options.visibleItems) + slideAdjustment);
			});
		
		}else{
			this.pageButtons.click(function(e){
				e.preventDefault();
				self.changeToSlide($(this).index() + slideAdjustment);
			});
		}
		
		delete this.setupPagination;
	},

	/**
	 * add back/next arrows and their click events, if true in settings
	 * Groups slides automatically just for this action
	 */
	addNextPrevArrows: function(){
		var self = this;
		
		this.prevButton = $('<div class="' + this.options.prevButtonClass + '"><a href="#"><span>Prev</span></a></div>');
		this.nextButton = $('<div class="' + this.options.nextButtonClass + '"><a href="#"><span>Next</span></a></div>');
		
		this.containerWrapper.after(this.prevButton, this.nextButton);
		
		this.prevButton.click(function(e){
			e.preventDefault();
			if(self.options.groupSlides){
				self.changeToSlide(self.currentSlide - self.options.visibleItems);
			}else{
				self.changeToSlide(self.currentSlide - 1);
			}
		});
		this.nextButton.click(function(e){
			e.preventDefault();
			if(self.options.groupSlides){
				self.changeToSlide(self.currentSlide + self.options.visibleItems);
			}else{
				self.changeToSlide(self.currentSlide + 1);
			}
		});
		
		this.updatePrevNext(this.currentSlide);
		
		delete this.addNextPrevArrows;
	},

	/**
	 * auto rotate slides until a click event happens. Only enabled in an infinite carousel scenario.
	 */
	startAutoRotation: function(){
		var self = this;
		
		function startInterval(){
			self.autoInterval = setInterval(function(){
				self.changeToSlide(self.currentSlide + self.options.visibleItems);
			}, self.options.autoDelay);
		}
		
		function stopInterval(){
			clearInterval(self.autoInterval);
		}
		
		startInterval();
		
		if(this.prevButton){
			this.prevButton.click(stopInterval);
		}
		if(this.nextButton){
			this.nextButton.click(stopInterval);
		}
		if(this.pageButtons){
			this.pageButtons.click(stopInterval);
		}
		
		// prevent queue from building when window/browser tab is not focused
		$(window).blur(stopInterval);
		$(window).focus(startInterval);
		
		delete this.startAutoRotation;
	},
	
	/**
	 * delegate actions to change slide (or not), including calling any 'beforeSlideChange' function that was specified
	 * @param  {int} slideIndex [index of slide to change to]
	 */
	changeToSlide: function(slideIndex){
		var delegateChange;
		
		if(this.totalSlides > this.options.visibleItems){ // don't do slide change actions if total slides is <= to amount visible
			
			if(!this.options.infinite){
				if(slideIndex > this.totalSlides - this.options.visibleItems && !this.options.groupSlides){ // if back/next click causes slide index to be greater than total slides, set slideIndex to last slide
					slideIndex = this.totalSlides - this.options.visibleItems;
				}else if(slideIndex < 0){ // if back/next click causes slide index to be less than zero, set slideIndex to zero
					slideIndex = 0;
				}
			}
			
			if(!this.options.groupSlides && slideIndex != this.currentSlide || this.options.groupSlides && slideIndex < this.totalSlides || this.options.infinite){ // dont run if the item clicked is the current, or if slide grouping is turned on and slide index is past the total slide count. Always run if infinite.
				this.beforeSlideChange(slideIndex);
			}
			
		}
	},

	/**
	 * actions to take before the slide change takes place, called by changeToSlide
	 * redefines itself on first run based on user settings
	 * @param  {int} slideIndex [index of slide being changed]
	 */
	beforeSlideChange: function(slideIndex){
		var self = this;

		// memoize which action to take, if a beforeSlideChange function was provided or not
		if(typeof this.options.beforeSlideChange == 'function'){
			this.beforeSlideChange = function(index){
				self.options.beforeSlideChange(index, self.currentSlide, function(){ // call optional beforeSlideChange function if one was passed in, define the callback for that function
					self.animateSlide(index);
					if(self.options.pagination){
						self.updatePagination(index);
					}

					if(self.options.prevNextButtons === true && !self.options.infinite && self.totalSlides > self.options.visibleItems){
						self.updatePrevNext(index);
					}
				});
			}
	
		}else{
			this.beforeSlideChange = function(index){
				self.animateSlide(index);
				if(self.options.pagination){
					self.updatePagination(index);
				}

				if(self.options.prevNextButtons === true && !self.options.infinite && self.totalSlides > self.options.visibleItems){ // if infinite carousel, prev/next buttons never change state
					self.updatePrevNext(index);
				}
			}
		}

		this.beforeSlideChange(slideIndex);
	},

	/**
	 * update pagination to reflect current visible/active slides, called by beforeSlideChange
	 * @param  {int} slideIndex [index of slide being changed to]
	 */
	updatePagination: function(slideIndex){
		var self = this;

		this.pageButtons.removeClass('active');
		
		if(this.options.infinite){ // if infinite = true & auto rotate is on, make sure pagination highlights correctly as slides loop back to the beginning
			if(slideIndex >= this.totalSlides){
				slideIndex = slideIndex - this.totalSlides;
			}else if(slideIndex < 0){
				slideIndex = this.totalSlides - slideIndex;
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
	updatePrevNext: function(slideIndex){
		
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
	animateSlide: function(slideIndex){
		var self = this;
		
		var newXCoord = ((this.options.slideWidth + this.options.slideSpacing) * slideIndex * -1) - (this.options.slideSpacing / 2) + 'px';
		this.containerList.animate({
			left: newXCoord
		}, this.options.transitionSpeed, this.options.slideEasing, function(){
			self.afterSlideChange(slideIndex);
		});		
	},
	
	/**
	 * actions to take after slide has changed, called by animateSlide
	 * @param  {int} slideIndex [index of slide that was changed]
	 */
	afterSlideChange: function(slideIndex){
		
		if(this.options.infinite){
			if(slideIndex < this.options.visibleItems){ // if user clicked 'prev' past the first slide, secretly jump to the same slides at the end and set slideIndex
				this.containerList.css({
					'left': parseInt(this.containerList.css('left')) - ((this.options.slideWidth + this.options.slideSpacing) * this.totalSlides)
				});
				slideIndex = slideIndex + this.totalSlides;
			}else if(slideIndex > this.totalSlides){
				this.containerList.css({ // if user clicked 'next' past the last slide, secretly jump to the same slides at the beginning and set slideIndex
					'left': parseInt(this.containerList.css('left')) + ((this.options.slideWidth + this.options.slideSpacing) * this.totalSlides)
				});
				slideIndex = slideIndex - this.totalSlides;
			}
		}
		
		if(typeof this.options.afterSlideChange == 'function'){
			this.options.afterSlideChange(slideIndex, this.currentSlide);
		}
		
		this.currentSlide = slideIndex;
	}
};
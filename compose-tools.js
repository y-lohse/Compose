(function($){

	var h1 = new Compose.Tool();
	h1.match = function($xpath){
		return ($xpath.filter('h1').length) ? true : false;
	};
	h1.on('init', function(event){
		this.element = $('<button>')
		.html('h1')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h1>');
			else this.compose.unwrapSelection('h1');
		}, this));
	});
	
	var h2 = new Compose.Tool();
	h2.match = function($xpath){
		return ($xpath.filter('h2').length) ? true : false;
	};
	h2.on('init', function(event){
		this.element = $('<button>')
		.html('h2')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h2>');
			else this.compose.unwrapSelection('h2');
		}, this));
	});
	
	var quote = new Compose.Tool();
	quote.match = function($xpath){
		return ($xpath.filter('blockquote').length) ? true : false;
	};
	quote.on('init', function(event){
		this.element = $('<button>')
		.html('"')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<blockquote>');
			else this.compose.unwrapSelection('blockquote');
		}, this));
	});
	
	var em = new Compose.Tool();
	em.match = function($xpath){
		return ($xpath.filter('em').length) ? true : false;
	};
	em.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('i')
		.css('font-style', 'italic')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<em>');
			else this.compose.unwrapSelection('em');
		}, this));
	});
	
	var bold = new Compose.Tool();
	bold.match = function($xpath){
		return ($xpath.filter('strong').length) ? true : false;
	};
	bold.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('b')
		.css('font-weight', 'bold')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<strong>');
			else this.compose.unwrapSelection('strong');
		}, this));
	});
	
	var a = new Compose.Tool();
	a.on('init', function(event){
		this.element = $('<button>')
		.html('a')
		.css('text-decoration', 'underline')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())){
				var $link = $('<a>').attr('href', '#');
				this.compose.wrapSelection($link);
				
				this.input.css({
					'left': this.compose.$toolbar.offset().left,
					'top': this.compose.$toolbar.offset().top,
				})
				.show()
				.focus();
				
				this.compose.hideTools();
			}
			else this.compose.unwrapSelection('a');
		}, this));
		
		this.input = $('<input />')
		.appendTo($('body'))
		.css('position', 'absolute')
		.hide();
	});

	var paster = new Compose.Tool();
	paster.on('init', function(event){
		this.compose.on('paste', $.proxy(function(event){
			event.preventDefault();
			var pasted = event.originalEvent.clipboardData.getData('text/plain');
			if (this.compose.markdown) pasted = this.compose.markdown.parse(pasted);
			
			var $pasted = $('<div>').html(pasted).children().not(':empty');
			
			document.execCommand('insertHTML', false, $pasted.wrapAll('<div>').parent().html());
		}, this));
	});
	
})(window.jQuery);
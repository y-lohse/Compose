(function($){

	var h1 = new Compose.Tool('h1');
	h1.match = function($xpath){
		return ($xpath.filter('h1').length) ? true : false;
	};
	h1.on('init', function(event){
		this.element = $('<button>')
		.html('h1')
		.addClass('compose-h1')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h1>');
			else this.compose.unwrapSelection('h1');
		}, this));
	});
	
	var h2 = new Compose.Tool('h2');
	h2.match = function($xpath){
		return ($xpath.filter('h2').length) ? true : false;
	};
	h2.on('init', function(event){
		this.element = $('<button>')
		.html('h2')
		.addClass('compose-h2')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h2>');
			else this.compose.unwrapSelection('h2');
		}, this));
	});
	
	var quote = new Compose.Tool('quote');
	quote.match = function($xpath){
		return ($xpath.filter('blockquote').length) ? true : false;
	};
	quote.on('init', function(event){
		this.element = $('<button>')
		.html('"')
		.addClass('compose-quote')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())){
				var $p = $('<p>');
				this.compose.wrapSelection($p);
				$p.wrap('<blockquote>');
				
				//unwrap quotes parent paragraph
				if ($p.parent().parent().is('p')){
					var $quote = $p.parent(),
						n,
						prev = [],
						next = [];
					
					n = $quote[0].previousSibling;
					while (n){
						prev.push(n);
						n = n.previousSibling;
					};
					n = $quote[0].nextSibling;
					while (n){
						next.push(n);
						n = n.nextSibling;
					};
					
					$quote.unwrap();
					$(prev).wrapAll('p');
					$(next).wrapAll('p');
				}
			}
			else this.compose.unwrapSelection('blockquote');
		}, this));
	});
	
	var em = new Compose.Tool('emphasis');
	em.match = function($xpath){
		return ($xpath.filter('em').length) ? true : false;
	};
	em.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('i')
		.addClass('compose-emphasis')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<em>');
			else this.compose.unwrapSelection('em');
		}, this));
	});
	
	var bold = new Compose.Tool('strong');
	bold.match = function($xpath){
		return ($xpath.filter('strong').length) ? true : false;
	};
	bold.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('b')
		.addClass('compose-strong')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<strong>');
			else this.compose.unwrapSelection('strong');
		}, this));
	});
	
	var a = new Compose.Tool('link');
	a.hideInput = function(){
		this.input.val('').blur().hide();
	};
	a.match = function($xpath){
		return ($xpath.filter('a').length) ? true : false;
	};
	a.on('init', function(event){
		this.reflink = null;
		
		this.element = $('<button>')
		.html('link')
		.addClass('compose-link')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())){
				var $link = this.reflink = $('<a>').attr('href', '#');
				this.compose.wrapSelection($link);
				
				this.input.css({
					'left': $link.offset().left,
					'top': $link.offset().top+$link.height(),
				})
				.show()
				.focus();
				
				this.compose.hideTools();
			}
			else this.compose.unwrapSelection('a');
		}, this));
		
		this.input = $('<input />')
		.appendTo($('body'))
		.addClass('compose-link-box')
		.css('position', 'absolute')
		.hide()
		.on('keyup', $.proxy(function(event){
			if (event.which === 13){
				this.reflink.attr('href', this.input.val());
				this.hideInput();
			}
			else if (event.which === 27){
				this.hideInput();
			}
		}, this))
		.on('blur', $.proxy(function(){
			this.input.hide();
		}, this));
	});

	var pasteSanitize = new Compose.Tool('PasteSanitize');
	pasteSanitize.on('init', function(event){
		this.compose.on('paste', $.proxy(function(event){
			event.preventDefault();
			var pasted = event.originalEvent.clipboardData.getData('text/plain');
			if (this.compose.markdown) pasted = this.compose.markdown.parse(pasted);
			
			var $pasted = $('<div>').html(pasted).children().not(':empty');
			
			document.execCommand('insertHTML', false, $pasted.wrapAll('<div>').parent().html());
		}, this));
	});
	
})(window.jQuery);
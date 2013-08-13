(function($){

	var ComposeTools = [];
	
	var h1 = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('h1')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!h1.match(compose.getSelectionXPath())) compose.wrapSelection('<h1>');
				else compose.unwrapSelection('h1');
			});
		},
		match: function($xpath){
			return ($xpath.filter('h1').length) ? true : false;
		}
	};
	ComposeTools.push(h1);
	
	var h2 = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('h2')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!h2.match(compose.getSelectionXPath())) compose.wrapSelection('<h2>');
				else compose.unwrapSelection('h2');
			});
		},
		match: function($xpath){
			return ($xpath.filter('h2').length) ? true : false;
		}
	};
	ComposeTools.push(h2);
	
	var quote = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('"')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!quote.match(compose.getSelectionXPath())) compose.wrapSelection('<blockquote>');
				else compose.unwrapSelection('blockquote');
			});
		},
		match: function($xpath){
			return ($xpath.filter('blockquote').length) ? true : false;
		}
	};
	ComposeTools.push(quote);
	
	var em = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('i')
			.css('font-style', 'italic')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!em.match(compose.getSelectionXPath())) compose.wrapSelection('<em>');
				else compose.unwrapSelection('em');
			});
		},
		match: function($xpath){
			return ($xpath.filter('em').length) ? true : false;
		}
	};
	ComposeTools.push(em);
	
	var bold = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('b')
			.css('font-weight', 'bold')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!bold.match(compose.getSelectionXPath())) compose.wrapSelection('<strong>');
				else compose.unwrapSelection('strong');
			});
		},
		match: function($xpath){
			return ($xpath.filter('strong').length) ? true : false;
		}
	};
	ComposeTools.push(bold);
	
	var a = {
		element: null,
		button: null,
		input: null,
		init: function(compose){
			this.button = $('<button>')
			.html('a')
			.css('text-decoration', 'underline')
			.addClass('compose-tool')
			.on('click', function(event){
				if (!bold.match(compose.getSelectionXPath())){
					var $link = $('<a>').attr('href', 'http://google.com');
					compose.wrapSelection($link);
				}
				else compose.unwrapSelection('a');
			});
			
			this.input = $('<input />');
			
			this.element = $('<span>')
			.append(this.button)
			.append(this.input);
		},
		match: function($xpath){
			return ($xpath.filter('a').length) ? true : false;
		}
	};
	ComposeTools.push(a);
	
	var paster = {
		element: null,
		init: function(compose){
			compose.on('paste', function(event){
				event.preventDefault();
				var pasted = event.originalEvent.clipboardData.getData('text/plain');
				if (compose.markdown) pasted = compose.markdown.parse(pasted);
				
				var $pasted = $('<div>').html(pasted).children().not(':empty');
				
				document.execCommand('insertHTML', false, $pasted.wrapAll('<div>').parent().html());
			});
		}
	};
	ComposeTools.push(paster);
	
	window['ComposeTools'] = ComposeTools;
	
})(window.jQuery);
(function($){

	var ComposeTools = [];
	
	var h1 = {
		element: null,
		init: function(compose){
			this.element = $('<button>')
			.html('h1')
			.addClass('compose-tool')
			.on('click', function(event){
				compose.wrapSelection('<h1>');
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
				compose.wrapSelection('<h2>');
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
				compose.wrapSelection('<blockquote>');
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
				compose.wrapSelection('<em>');
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
				compose.wrapSelection('<strong>');
			});
		},
		match: function($xpath){
			return ($xpath.filter('strong').length) ? true : false;
		}
	};
	ComposeTools.push(bold);
	
	window['ComposeTools'] = ComposeTools;
	
})(window.jQuery);
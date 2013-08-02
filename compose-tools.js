(function($){

	var ComposeTools = [];
	
	var bold = $('<button>')
				.html('b')
				.addClass('compose-tool')
				.on('compose-init', function(event, compose){
					$(this).on('click', function(){
						compose.wrapRange('<strong>');
					});
				});
	ComposeTools.push(bold);
	
	var italic = $('<button>')
				.html('i')
				.addClass('compose-tool')
				.on('compose-init', function(event, compose){
					$(this).on('click', function(){
						compose.wrapRange('<em>');
					});
				});
	ComposeTools.push(italic);
	
	var h1 = $('<button>')
				.html('h1')
				.addClass('compose-tool')
				.on('compose-init', function(event, compose){
					$(this).on('click', function(){
						compose.wrapRange('<h1>');
					});
				});
	ComposeTools.push(h1);
	
	var h2 = $('<button>')
				.html('h1')
				.addClass('compose-tool')
				.on('compose-init', function(event, compose){
					$(this).on('click', function(){
						compose.wrapRange('<h2>');
					});
				});
	ComposeTools.push(h2);
	
	var quote = $('<button>')
				.html('"')
				.addClass('compose-tool')
				.on('compose-init', function(event, compose){
					$(this).on('click', function(){
						compose.wrapRange('<blockquote>');
					});
				});
	ComposeTools.push(quote);
	
	window['ComposeTools'] = ComposeTools;
	
})(window.jQuery);
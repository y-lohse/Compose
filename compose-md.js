(function($){
	'use strict';
	
	var ComposeMarkdown = function(composeInstance){
		this.composer = composeInstance;
		
		this.composer.on('keyup', $.proxy(this.keyup, this.composer));
		
		var source = this.composer.$element.html();
		this.composer.$element.html(ComposeMarkdown.parse(source.replace(/	/g, '')));
	};
	
	ComposeMarkdown.markedOptions = {
		gfm: true,
		smartypants: true,
		smartLists: true,
	};
	
	ComposeMarkdown.parse = function(str){
		return marked(str, ComposeMarkdown.markedOptions);
	};
	
	ComposeMarkdown.prototype.keyup = function(event){
		var selection = rangy.getSelection();
		var node = selection.anchorNode;
		var $parent = $((selection.anchorNode.nodeType === 1) ? selection.anchorNode : selection.anchorNode.parentNode);
		
		//get the content we'll test, but rremove any special chars that will fuck up the regex
		var subject = $parent.html().replace(/^&gt;/, '>')			//needed for blockquotes
									.replace(/&nbsp;$/, ' ')		//neded for... pretty much everything
									.replace(/`<br( \/)?>/, '`\n')	//fenced code
									.replace(/<br( \/)?>`/, '\n`');	//fenced code
							
		var triggers = [
			/^#+\s./g,					//titles
			/^>\s./g,					//quotes
			/^`{3}\n.+\n`{3}/g,			//code blocks
			/^(\*|\-|\+){1} [^*-]+/g,	//ul
			/^1\. .+/g,					//ol
			/^((\*|\-|_){1} ?){3,}/g,	//hr
			/(\*{1}.+\*{1})|(_{1}.+\_{1})/g, //em
			/(\*{2}.+\*{2})|(_{2}.+_{2})/g, //strong
			/`[^`\n]+`/g,				//inline code
			/\[.+\]\(.+( ".+")?\)/g,	//markdown link
//			/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])\s/g,	//regular url, disabled because the trigger fials with trailing spaces
			/\.{3}./g,					//ellipsis
			/--./g,						//em dash
			/(^|[-\u2014/(\[{"\s])'/,	//opening singles
			/(^|[-\u2014/(\[{\u2018\s])"/,	//opening doubles
			/'/g,						//closing single
			/"/g,						//closing doubles
		];
		var emTriggerIndex = 6;
			
		var convert = false;
		for (var i = 0, l = triggers.length; i < l; i++){
			if (subject.replace(/<br( \/)?>$/g, '').match(triggers[i])){
				//em may collide with strong triggers, this is a workaround. negative lookbehind woul be required to do without this.
				if (i === emTriggerIndex && !subject.split('').reverse().join('').match(/\*[^\*]+\*(?!\*)/g)){
					continue;
				}
				
				//remove trailing brs before conversion
				//we also need to reinject the trailing nbsp
				subject = subject.replace(/<br( \/)?>$/g, '').replace(/ $/, '&nbsp;');
				convert = true;
				break;
			}
		}

		if (convert){
			var initialPosition = selection.focusOffset;
			
			var $html = $(ComposeMarkdown.parse(subject));
			
			$parent.empty().append($html);
			if ($html.is('blockquote, h1, h2, h3, h4, h5, h6, hr, ol, ul, p, pre') && $parent.is('p')) $html.unwrap();
			
			//reposition carret
			if ($html.is('hr')){
				this.positionCarret($html.next()[0]);
			}
			else{
				//get the last block node recursively
				var $node = $html;
				
				while ($node.children('li, p, code').length > 0){
					$node = $node.children().last();
				}
				var node = $node[0].childNodes[$node[0].childNodes.length-1];
				
				this.positionCarret(node);
			}
		}
	};
	
	if (window['Compose']) window['Compose'].ComposeMarkdown = ComposeMarkdown;
	
})(window.jQuery);
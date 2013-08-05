(function($){
	'use strict';
	
	var Compose = function(element){
		this.selection = null;
		
		this.selecting = false;
		this.$element = $(element).attr('contentEditable', true)
								  .on('mousedown', $.proxy(this.selectionStart, this))
								  .on('keydown', $.proxy(this.keydown, this))
								  .on('keyup', $.proxy(this.keyup, this));
		this.$toolbar = $('<menu>')
						.attr('type', 'toolbar')
						.addClass('compose-toolbar')
						.css({
							'position': 'absolute',
							'top': 0,
							'left': 0,
							'display': 'none',
						});
		$('body').append(this.$toolbar);
		
		$(document).on('mouseup', $.proxy(function(event){
			if (!this.selecting && 
				!$.contains(this.$element[0], event.target) && 
				!$.contains(this.$toolbar[0], event.target)){
				this.$toolbar.hide();
			}
			else{
				this.selectionEnd(event);
			}
			this.selecting = false;
		}, this));
		
		this.mdOptions = {
			gfm: true,
			smartypants: true,
			smartLists: true,
		};
		
		var text = this.$element.html();
		this.$element.html(marked(text.replace(/	/g, ''), this.mdOptions));
	};
	
	Compose.prototype.selectionStart = function(event){
		this.selecting = true;
	};
	
	Compose.prototype.selectionEnd = function(event){
		var selection = rangy.getSelection();
		if (selection.isCollapsed){
			this.$toolbar.hide();
			return;
		}
		
		setTimeout($.proxy(function(){
			if (rangy.getSelection().isCollapsed){
				this.$toolbar.hide();
			}
		}, this), 0);
		
		var $positionElem = $('<span>'),
			range = selection.getRangeAt(0),
			clone = range.cloneRange();
		(range.nativeRange.insertNode) ? range.nativeRange.insertNode($positionElem[0]) : range.insertNode($positionElem[0]);
		var position = $positionElem.offset();
		//@TODO : check for colision with browser boundaries
		this.$toolbar.css({
			top: position.top-this.$toolbar.height(),
			left: position.left,
		});
		$positionElem.remove();
		selection.removeAllRanges();
		selection.addRange(clone);
		this.$toolbar.show();
	};
	
	Compose.prototype.keydown = function(event){
		var selection = rangy.getSelection(),
			subject = selection.anchorNode.wholeText || '';
			
		//prevent double spaces
		if (event.which === 32 && subject[subject.length-1].match(/\s/)) event.preventDefault();
	};
	
	Compose.prototype.keyup = function(event){
		//markdown convertion
		var selection = rangy.getSelection();
		var $parent = $((selection.anchorNode.nodeType === 1) ? selection.anchorNode : selection.anchorNode.parentNode);
		
		var subject = $parent.html().replace(/&gt;/, '>')
									.replace(/`<br( \/)?>/, '`\n')
									.replace(/<br( \/)?>`/, '\n`');
			
		var triggers = [
			/^#+\s.+/g,					//titles
			/^>\s.+/g,					//quotes
			/^`{3}\n.+\n`{3}/g,			//code blocks
			/^(\*|\-|\+){1} [^*-]+/g,	//ul
			/^1\. .+/g,					//ol
			/^((\*|\-|_){1} ?){3,}/g,	//hr
			/(\*(?!(\*| ))[^\*]+\*[^\*]{1})|(_(?!(_| ))[^_]+_[^_]{1})/g, //em
			/(\*{2}.+\*{2}.)|(_{2}.+_{2}.)/g, //strong
			/\[.+\]\(.+( ".+")?\)/g,	//markdown link
			/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])\s/g,	//regular url
			/\.{3}./g,					//ellipsis
			/--./g,						//em dash
			/(^|[-\u2014/(\[{"\s])'/,	//opening singles
			/(^|[-\u2014/(\[{\u2018\s])"/,	//opening doubles
			/'/g,						//closing single
			/"/g,						//closing doubles
		];
		//the em one is a bit crazy, here's what it does :
		//match a * not followed by (a * or a space) but followed by at least one thing which is not a * (but can be a space) followed by another *, itself followed by anything except a *. oh, and the same with _ instead of *.
			
		var convert = false;
		for (var i = 0, l = triggers.length; i < l; i++){
			if (subject.match(triggers[i])){
				convert = true;
				break;
			}
		}

		if (convert){
			var initialPosition = selection.focusOffset;
						
			var $html = $(marked(subject.replace(/<br( \/)?>$/g, ''), this.mdOptions));
			
			$parent.html($html);
			if ($html.is('blockquote, h1, h2, h3, h4, h5, h6, hr, ol, ul, p, pre') && $parent.is('p')) $html.unwrap();
			
			selection.refresh(true);
			
			//some tags you can't break out of, so we need to create something
			if ($html.is('blockquote, hr, pre')) $html.after($('<p>'));
			
			var carret = rangy.createRange(),
				node;
			
			if ($html.is('hr')){
				node = $html.next()[0];
			}
			else {
				//get the last node recursively
				var $node = $html;
				console.log($html);
				while ($node.children().length > 0){
					$node = $node.children().last();
				}
				node = $node[0];
				
				node = node.childNodes[node.childNodes.length-1];
			}
			
			carret.setStart(node, node.textContent.length);
			carret.setEnd(node, node.textContent.length);
			
			selection.removeAllRanges();
			selection.addRange(carret);
		}
		
		//cross browser consistent breaking out of block tags
		var $current = $(selection.anchorNode);
		if (event.which === 13){
			if ($current.is('div')){
				var $p = $('<p>').appendTo($current).unwrap();
				if ($p.prev().is('br')) $p.prev().remove();
				
				var carret = rangy.createRange();
				carret.setStart($p[0]);
				carret.setEnd($p[0]);
				
				selection.refresh(true);
				selection.removeAllRanges();
				selection.addRange(carret);
			}
		}
	};
	
	Compose.prototype.addTools = function(tools){
		tools = ($.isArray(tools)) ? tools : [tools];
		
		for (var i = 0, l = tools.length; i < l; i++){
			this.$toolbar.append(tools[i]);
			tools[i].trigger('compose-init', this);
		}
		
		return this;
	};
	
	Compose.prototype.wrapRange = function(elem, range){
		if (range){
			var sel = rangy.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
		else{
			range = rangy.getSelection().getRangeAt(0);
		}
		elem = $(elem).text(range.toString());
		
		document.execCommand('insertHTML', false, elem.wrap('<div>').parent().html());
		
		return this;
	};
	
	window['Compose'] = Compose;
})(window.jQuery);
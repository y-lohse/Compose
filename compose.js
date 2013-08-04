(function($){
	'use strict';
	
	var Compose = function(element){
		this.selection = null;
		
		this.selecting = false;
		this.$element = $(element).attr('contentEditable', true)
								  .on('mousedown', $.proxy(this.selectionStart, this))
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
		
		var text = this.$element.text();
		this.$element.html(marked(text.replace(/	/g, '')));
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
	
	Compose.prototype.keyup = function(event){
		var selection = rangy.getSelection(),
			subject = selection.anchorNode.wholeText || '';
			
		var triggers = [
			/^#+ .+/g,					//titles
			/^> .+/g,					//quotes
			/^(\*|\-|\+){1} [^*-]+/g,	//ul
			/^1\. .+/g,					//ol
			/^((\*|\-|_){1} ?){3,}/g,	//hr
			/(\*(?!(\*| ))[^\*]+\*[^\*]{1})|(_(?!(_| ))[^_]+_[^_]{1})/g, //em
			/(\*{2}.+\*{2}.)|(_{2}.+_{2}.)/g, //strong
			/\[.+\]\(.+( ".+")?\)./g,	//link
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
			var $parent = $(selection.anchorNode.parentNode);
			
			var range = rangy.createRange();
			range.setStart(selection.anchorNode);
			range.setEnd(selection.anchorNode, subject.length);
			
			var $html = $(marked(subject));
			
			$parent.html($html);
			if ($html.is('h1, h2, h3, h4, h5, h6, blockquote, ul, ol, hr') && $parent.is('p')) $html.unwrap();
			
			var carret = rangy.createRange();
			if (subject.length === initialPosition){
				//carret was at the end, reposition it there
				var $node = $html;
				
				while ($node.children().length > 0){
					$node = $node.children().last();
				}
				var node = $node[0];
				
				node = node.childNodes[node.childNodes.length-1];
				
				carret.setStart(node, node.textContent.length);
				carret.setEnd(node, node.textContent.length);
				
				selection.removeAllRanges();
				selection.addRange(carret);
			}
			
//			selection.removeAllRanges();
//			selection.addRange(range);
//			
//			document.execCommand('insertHTML', false, html);
//			
//			selection.refresh(true);
//			
//			var carret = rangy.createRange();
//			
//			if (subject.length === initialPosition){
//				//carret was at the end, reposition it there
//				var nextNode = selection.anchorNode;
//				
//				carret.setStart(nextNode, nextNode.textContent.length);
//				carret.setEnd(nextNode, nextNode.textContent.length);
//			}
//			else{
//				var nextNode = selection.anchorNode;
//				//carret was somewhere else, try to reposition it hwere it was
//				carret.setStart(nextNode);
//				carret.setEnd(nextNode);
//			}
//			
//			selection.removeAllRanges();
//			selection.addRange(carret);
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
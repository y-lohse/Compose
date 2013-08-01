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
	};
	
	Compose.MarkDown = {
		//simple block level tags
		'title': {
			expression: /^#+ .+/g,
			insert: function(match, range, selection){
				var titleLevel = Math.min(match.substring(0, match.indexOf(' ')).split('').length, 6);
				this.wrapRange($('<h'+titleLevel+'>'), range);
			},
			cleanup: function($insertedElement){
				//remove #'s
				$insertedElement.html($insertedElement.text().replace(/^#+ /, ''));
				//titles usually spring out of p tags, but the p isn't removed even if it's empty
				if ($insertedElement.prev().text() === '') $insertedElement.prev().remove();
			},
			carret: 'end'
		},
		'quote': {
			expression: /^> .+/g,
			insert: function(match, range, selection){
				this.wrapRange($('<blockquote>'), range);
			},
			cleanup: function($insertedElement){
				//essentially same as title
				$insertedElement.html($insertedElement.text().replace(/^> /, ''));
				if ($insertedElement.prev().text() === '') $insertedElement.prev().remove();
			},
			carret: 'end'
		},
		//complex block level tags
		'ul': {
			expression: /^(\*|\-|\+){1} [^*-]+/g,
			insert: function(match, range, selection){
				document.execCommand('insertUnorderedList');
			},
			cleanup: function($insertedElement){
				//emove the symbol that was used to create the list
				$insertedElement.html($insertedElement.html().replace(/^(\*|\-|\+) /, ''));
				
				//lists tend to be wrapped in p tags, so here we remove the list wrapper if there's nothing else in it
				var $list = $insertedElement.closest('ul');
				if ($list.parent().children().length === 1) $list.unwrap();
			},
			carret: 'end'
		},
		'ol': {
			expression: /^1\. .+/g,
			insert: function(match, range, selection){
				document.execCommand('insertOrderedList');
			},
			cleanup: function($insertedElement){
				//emove the symbol that was used to create the list
				$insertedElement.html($insertedElement.html().replace(/^1\. /, ''));
				
				//lists tend to be wrapped in p tags, so here we remove the list wrapper if there's nothing else in it
				var $list = $insertedElement.closest('ol');
				if ($list.parent().children().length === 1) $list.unwrap();
			},
			carret: 'end'
		},
//		'hr': /((\*|\-|_){1} ?){3,}/,
//		'em': /\*{1}.+\*{1}./,
	};
	
	Compose.prototype.addTool = function(tool){
		this.$toolbar.append(tool);
		return this;
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
		
		var $positionElem = $('<span>'),
			range = selection.getRangeAt(0),
			clone = range.cloneRange();
		(range.nativeRange.insertNode) ? range.nativeRange.insertNode($positionElem[0]) : range.insertNode($positionElem[0]);
		var position = $positionElem.offset();
		//@TODO : check for colision with browser boundaries
		//@TODO: remove fixed value
		this.$toolbar.css({
			top: position.top-20,
			left: position.left,
		});
		$positionElem.remove();
		selection.removeAllRanges();
		selection.addRange(clone);
		this.$toolbar.show();
	};
	
	Compose.prototype.wrapRange = function(elem, range){
		range = range || rangy.getSelection().getRangeAt(0);
		elem = $(elem).text(range.toString());
		
		document.execCommand('insertHTML', false, elem.wrap('<div>').parent().html());
	};
	
	Compose.prototype.keyup = function(event){
		var selection = rangy.getSelection(),
			subject = selection.anchorNode.wholeText || '';
			
		for (var formatKey in Compose.MarkDown){
			var format = Compose.MarkDown[formatKey];
			
			var matches = subject.match(format.expression) || [];
			if (matches.length){
				for (var i = 0, l = matches.length; i < l; i++){
					var range = rangy.createRange();
					range.setStart(selection.anchorNode, subject.indexOf(matches[i]));
					range.setEnd(selection.anchorNode, subject.indexOf(matches[i])+matches[i].length);
					
					var selection = rangy.getSelection();
					
					format.insert.apply(this, [matches[i], range, selection]);
					range.deleteContents();
					
					selection.refresh(true);
					var $insertedElement = $(selection.anchorNode.parentNode);
					format.cleanup.apply(this, [$insertedElement]);
					
					selection.refresh(true);
					if ($.isFunction(format.carret)) format.carret.apply(this, [selection, rangy.createRange(), $insertedElement]);
					else{
						var range = rangy.createRange();
						switch(format.carret){
							case 'end':
								range.setStartAfter($insertedElement[0]);
								range.setEndAfter($insertedElement[0]);
								selection.removeAllRanges();
								selection.addRange(range);
								break;
						}
					}
				}
			}
		}
		
//		
//		var hr = subject.match(Compose.REGEX.hr) || [];
//		if (hr[0]){
//			var range = rangy.createRange();
//			range.setStartAfter(selection.anchorNode.parentNode);
//			range.setEndAfter(selection.anchorNode.parentNode);
//			document.execCommand('insertHTML', false, '<hr />');
//			document.execCommand('insertHTML', false, '<p></p>');
//			
//			$previous = $(selection.anchorNode.parentNode);
//			range.setStartBefore(selection.anchorNode);
//			range.setEndAfter(selection.anchorNode);
//			range.deleteContents();
//			if ($previous.text() === '') $previous.remove();
//		}
//		
//		var emphasis = subject.match(Compose.REGEX.emphasis) || [];
//		if (emphasis.length){
//			for (var i = 0, l = emphasis.length; i < l; i++){
//				var index = subject.indexOf(emphasis[i]);
//				
//				var range = rangy.createRange();
//				range.setStart(selection.anchorNode, index);
//				range.setEnd(selection.anchorNode, index+emphasis[i].length-1);
//				selection.removeAllRanges();
//				selection.addRange(range);
//				this.wrapRange($('<em>'), range);
//				
//				selection.refresh(true);
//				range.setStart(selection.anchorNode, 0);
//				range.setEnd(selection.anchorNode, 1);
//				var range2 = rangy.createRange();
//				range2.setStart(selection.anchorNode, emphasis[i].length-2);
//				range2.setEnd(selection.anchorNode, emphasis[i].length-1);
//				range2.deleteContents();
//				range.deleteContents();
//				
//				selection.refresh(true);
//				range = rangy.createRange();
//				var childNodes = selection.anchorNode.parentNode.parentNode.childNodes;
//				
//				for (var i = 0, l = childNodes.length; i < l; i++){
//					if (childNodes[i] === selection.anchorNode.parentNode) break;
//				}
//				
//				range.setStart(childNodes.item(i+1), 1);
//				range.setEnd(childNodes.item(i+1), 1);
//				selection.removeAllRanges();
//				selection.addRange(range);
//			} 
//		}
	};
	
	$(function(){
		var compose = new Compose('#composearea');
		var bold = $('<button>')
					.html('b');
		bold.click(function(event){
			compose.wrapRange('<strong>');
		});
		compose.addTool(bold);
	});
})(window.jQuery);
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
				
				selection.refresh(true);
				return $(selection.anchorNode.parentNode);
			},
			cleanup: function($insertedElement){
				$insertedElement.text($insertedElement.text().replace(/^#+ /, ''));
			},
			carret: 'end'
		},
		'quote': {
			expression: /^> .+/g,
			insert: function(match, range, selection){
				this.wrapRange($('<blockquote>'), range);
				
				selection.refresh(true);
				return $(selection.anchorNode.parentNode);
			},
			cleanup: function($insertedElement){
				$insertedElement.text($insertedElement.text().replace(/^> /, ''));
			},
			carret: 'end'
		},
		//complex block level tags
		'ul': {
			expression: /^(\*|\-|\+){1} [^*-]+/g,
			insert: function(match, range, selection){
				document.execCommand('insertUnorderedList');
				
				selection.refresh(true);
				return $(selection.anchorNode.parentNode);
			},
			cleanup: function($insertedElement){
				$insertedElement.text($insertedElement.text().replace(/^(\*|\-|\+) /, ''));
				
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
				
				selection.refresh(true);
				return $(selection.anchorNode.parentNode);
			},
			cleanup: function($insertedElement){
				//emove the symbol that was used to create the list
				$insertedElement.text($insertedElement.html().text(/^1\. /, ''));
				
				//lists tend to be wrapped in p tags, so here we remove the list wrapper if there's nothing else in it
				var $list = $insertedElement.closest('ol');
				if ($list.parent().children().length === 1) $list.unwrap();
			},
			carret: 'end'
		},
		//strange block level tags
		'hr': {
			expression: /^((\*|\-|_){1} ?){3,}/g,
			insert: function(match, range, selection){
				//insert hr tag and create the next paragraph
				document.execCommand('insertHTML', false, '<hr />');
				document.execCommand('insertHTML', false, '<p></p>');
				
				selection.refresh(true);
				range.deleteContents();
				return $(selection.anchorNode).prev();
			},
			cleanup: function($insertedElement){
				//hr are created from within p tags, and if there was nothing else in it it remains there when it shouldn't
				if ($insertedElement.prev().text() === '') $insertedElement.prev().remove();
			},
			carret: function(){}//doesn't need anything
		},
		//inline tags
		'em': {
			expression: /\*{1}.+\*{1}./g,
			insert: function(match, range, selection){
				var rangeBackup = range.cloneRange();;
				
				range.setEnd(selection.anchorNode, range.endOffset-1);
				this.wrapRange($('<em>'), range);
				
				selection.refresh(true);
				var $element = $(selection.anchorNode.parentNode);
				
				return $element;
			},
			cleanup: function($insertElement){
				$insertElement.text($insertElement.text().substring(1, $insertElement.text().length-1));
			},
			carret: function(selection, range, $insertedElement){
				var childNodes = $insertedElement[0].parentNode.childNodes;
				
				for (var i = 0, l = childNodes.length; i < l; i++){
					if (childNodes[i] === $insertedElement[0]) break;
				}
				
				range.setStart(childNodes.item(i+1), 1);
				range.setEnd(childNodes.item(i+1), 1);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
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
					
					var $insertedElement = format.insert.apply(this, [matches[i], range, selection]);
					
					selection.refresh(true);
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
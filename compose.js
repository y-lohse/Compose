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
	
	Compose.REGEX = {
		'title': /^#+ .*/
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
		
		var title = subject.match(Compose.REGEX.title) || [];
		if (title[0]){
			var range = rangy.createRange(),
				titleLevel = Math.min(subject.substring(0, subject.indexOf(' ')).split('').length, 6),
				$node = $('<h'+titleLevel+'>');
				
			range.setStart(selection.anchorNode, subject.lastIndexOf('# ')+2);
			range.setEnd(selection.anchorNode, subject.length);
			this.wrapRange($node, range);
			var $previous = $(range.startContainer.parentNode);
			range.setStart(selection.anchorNode, 0);
			range.deleteContents();
			if ($previous.text() === '') $previous.remove();
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
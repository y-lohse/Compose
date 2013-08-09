(function($, document, window){
	'use strict';
	
	var Compose = function(element, options){
		options = options || Compose.defaults;
		
		this.markdown = options.markdown;
		
		this.$element = $(element).attr('contentEditable', true);					  
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
		
		this.on = $.proxy(this.$element.on, this.$element);//now we can register event listeners directy through the Compose object
		
		//init markdown parser if there is one
		if (this.markdown) this.markdown = new this.markdown(this);
		
		this.$element.on('keydown', $.proxy(this.keydown, this))
					  .on('keyup', $.proxy(this.keyup, this));
		 $(document).on('mouseup', $.proxy(this.mouseup, this));
	};
	
	Compose.defaults = {
		markdown: false,
	};
	
	Compose.Range = {
		window: window,
		document: document,
		getSelection: function(){
			return this.window.getSelection();
		},
		createRange: function(){
			return this.document.createRange();
		}
	};
	
	Compose.prototype.isSelectionInElement = function(){
		//@TODO : maybe checking with the common ancestor stuff would be better
		var selection = Compose.Range.getSelection();
		return $.contains(this.$element[0], selection.anchorNode) && $.contains(this.$element[0], selection.focusNode) && !selection.isCollapsed;
	}
	
	Compose.prototype.showTools = function(){
		var selection = Compose.Range.getSelection();
		var $positionElem = $('<span>'),
			range = selection.getRangeAt(0),
			clone = range.cloneRange();
			
		//check if range is backwards
		range.collapse(true);
		var backwards = (range.comparePoint(selection.focusNode, selection.focusOffset)) != 1;
			
		//compute tools positions
		range.insertNode($positionElem[0]);
		var position = $positionElem.offset();
		//@TODO : check for colision with browser boundaries
		this.$toolbar.css({
			top: position.top-this.$toolbar.height(),
			left: position.left,
		});
		$positionElem.remove();
		
		//recreate selection
		if (backwards){
			clone.collapse(false);
			selection.removeAllRanges();
			selection.addRange(clone);
			selection.extend(range.startContainer, range.startOffset);
		}
		else {
			selection.removeAllRanges();
			selection.addRange(clone);
		}
		
		//actually show tools
		this.$toolbar.show();
	};
	
	Compose.prototype.mouseup = function(event){
		if (this.isSelectionInElement()) this.showTools();
		else this.$toolbar.hide();
	};
	
	Compose.prototype.keydown = function(event){
		var subject = Compose.Range.getSelection().anchorNode.wholeText || '';
		
		//prevent double spaces
		if (event.which === 32 && subject[subject.length-1].match(/\s/)) event.preventDefault();
	};
	
	Compose.prototype.keyup = function(event){
		if (this.isSelectionInElement()) this.showTools();
		else this.$toolbar.hide();
		
		//cross browser consistent breaking out of block tags
		var $current = $(Compose.Range.getSelection().anchorNode);
		
		if (event.which === 13){
			var $p = $('<p>').html('&nbsp;'),
				brokeOut = false;
			
			//in chrome when breaking out of lists, the new element is a div instead of a p.
			if ($current.is('div')){
				brokeOut = true;
				$p.appendTo($current).unwrap();
				if ($p.prev().is('br')) $p.prev().remove();
			}
			
			//pressing enter inside a block quote creates new paragraphs, which is a good thing the first time, but a bad thing if that paragraph is left empty
			if ($current.is('p') && 
				$current.text() === '' && 
				$current.parent().is('blockquote') && 
				$current.prev().is('p') && 
				$current.prev().text() === ''){
				brokeOut = true;
				$current.parent().after($p);
				$current.add($current.prev()).remove();
			}
			
			//pressing enter within pre+code blocks shoudnt create new pre+code blocks
			if ($current.is('code') &&
				$current.parent().text() === ''){
				brokeOut = true;
				$current.parent().after($p);
				$current.parent().add().remove();
			}
			
			//carret repositionning
			if (brokeOut){
				this.positionCarret($p[0]);
			}
		}
		else if (event.which === 32){
			//breaking out of inline tags
			//this next bit of shitty code is because of a long standing webkit bug that won't let you put the caret inside an empty node
			//so when the caret is inside an inline tag and the users presses space, we create a new text node with an nbsp in it, and place the caret in there.
			//@TODO : check for other inline tags
			if ($current.parent().is('em, strong, a, code')){
				var $wrap = $(document.createTextNode('a')).text('&nbsp;'),
					$inline = $current.parent();
				
				$inline.html($inline.html().replace(/<br( \/)?>$/g, '').replace(/&nbsp;$/, '').replace(/\s$/, ''));
				$inline.after(document.createTextNode('\u00a0'));
				
				var node = $inline[0].nextSibling;
				this.positionCarret(node);
				
				this.$element.one('keyup', $.proxy(function(){
					node.textContent = node.textContent.replace('\u00a0', ' ');
					this.positionCarret(node);
				}, this));
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
	
	Compose.prototype.positionCarret = function(node, offset){
		var selection = Compose.Range.getSelection(),
			range = Compose.Range.createRange(),
			offset = offset || ((node.nodeType === 3) ? node.textContent.length : 1);
			
		range.setStart(node, offset);
		range.setEnd(node, offset);
		
		selection.removeAllRanges();
		selection.addRange(range);
	};
	
	Compose.prototype.wrapRange = function(elem, range){
		if (range){
			var sel = Compose.Range.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
		else{
			range = Compose.Range.getSelection().getRangeAt(0);
		}
		elem = $(elem).text(range.toString());
		
		document.execCommand('insertHTML', false, elem.wrap('<div>').parent().html());
		
		return this;
	};
	
	window['Compose'] = Compose;
})(window.jQuery, document, window);
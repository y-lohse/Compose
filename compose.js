(function($, document, window){
	'use strict';
	
	var Compose = function(element, options){
		options = options || Compose.defaults;
		
		this.tools = [];
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
		},
		getClosestAncestorIn:function(node, ancestor){
			var p, n = node;
			while (n) {
				p = n.parentNode;
				if (p === ancestor) {
					return n;
				}
				n = p;
			}
			return null;
		},
		getNodeIndex: function(){
			var i = 0;
			while((node = node.previousSibling)){
				i++;
			}
			return i;
		},
		comparePoints: function(nodeA, offsetA, nodeB, offsetB){
			// See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
			var nodeC, root, childA, childB, n;
			if (nodeA == nodeB) {
	
				// Case 1: nodes are the same
				return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
			} else if ( (nodeC = this.getClosestAncestorIn(nodeB, nodeA, true)) ) {
	
				// Case 2: node C (container B or an ancestor) is a child node of A
				return offsetA <= this.getNodeIndex(nodeC) ? -1 : 1;
			} else if ( (nodeC = this.getClosestAncestorIn(nodeA, nodeB, true)) ) {
	
				// Case 3: node C (container A or an ancestor) is a child node of B
				return this.getNodeIndex(nodeC) < offsetB  ? -1 : 1;
			} else {
	
				// Case 4: containers are siblings or descendants of siblings
				root = $(nodeA).parents().has(nodeB).first()[0];
				childA = (nodeA === root) ? root : this.getClosestAncestorIn(nodeA, root, true);
				childB = (nodeB === root) ? root : this.getClosestAncestorIn(nodeB, root, true);
	
				if (childA === childB) {
					// This shouldn't be possible
	
					throw new Error("comparePoints got to case 4 and childA and childB are the same!");
				} else {
					n = root.firstChild;
					while (n) {
						if (n === childA) {
							return -1;
						} else if (n === childB) {
							return 1;
						}
						n = n.nextSibling;
					}
					throw new Error("Should not be here!");
				}
        }
		}
	};
	
	Compose.prototype.isSelectionInElement = function(){
		//@TODO : maybe checking with the common ancestor stuff would be better
		var selection = Compose.Range.getSelection();
		return $.contains(this.$element[0], selection.anchorNode) && $.contains(this.$element[0], selection.focusNode) && !selection.isCollapsed;
	}
	
	Compose.prototype.getSelectionXPath = function(){
		var selection = Compose.Range.getSelection();
		return $(selection.getRangeAt(0).commonAncestorContainer).parentsUntil(this.$element).add(selection.getRangeAt(0).commonAncestorContainer);
	}
	
	Compose.prototype.hideTools = function(){
		this.$toolbar.hide();
	};
	
	Compose.prototype.showTools = function(){
		var selection = Compose.Range.getSelection();
		var $positionElem = $('<span>'),
			range = selection.getRangeAt(0),
			clone = range.cloneRange();
			
		//check if the tool match the current selection
		var $xpath = this.getSelectionXPath();
			
		for (var i = 0, l = this.tools.length; i < l; i++){
			if (!$.isFunction(this.tools[i].match) || !this.tools[i].element) continue;
			
			$(this.tools[i].element).trigger('compose-show');
			if (this.tools[i].match($xpath, this)) $(this.tools[i].element).addClass('active');
			else $(this.tools[i].element).removeClass('active');
		}
			
		//check if range is backwards, needs to be done here
		var backwards = (Compose.Range.comparePoints(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset) == 1);
			
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
		else this.hideTools();
		
		setTimeout($.proxy(function(){
			if (!this.isSelectionInElement()) this.hideTools();
		}, this), 0);
	};
	
	Compose.prototype.keydown = function(event){
		var subject = Compose.Range.getSelection().anchorNode.wholeText || '';
		
		//prevent double spaces
		if (event.which === 32 && subject[subject.length-1].match(/\s/)) event.preventDefault();
	};
	
	Compose.prototype.keyup = function(event){
		if (this.isSelectionInElement()) this.showTools();
		else this.hideTools();
		
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
			if (!$.isFunction(tools[i].init)) continue;
			
			$.proxy(tools[i].init, tools[i], this)();
			this.tools.push(tools[i]);
			this.$toolbar.append(tools[i].element);
		}
		
		return this;
	};
	
	Compose.prototype.positionCarret = function(node, offset){
		var selection = Compose.Range.getSelection(),
			range = Compose.Range.createRange(),
			offset = ($.isNumeric(offset)) ? offset : ((node.nodeType === 3) ? node.textContent.length : 1);
			
		range.setStart(node, offset);
		range.setEnd(node, offset);
		
		selection.removeAllRanges();
		selection.addRange(range);
	};
	
	Compose.prototype.wrapSelection = function(elem, range){
		var selection = Compose.Range.getSelection();
		if (range){
			selection.removeAllRanges();
			selection.addRange(range);
		}
		else{
			range = selection.getRangeAt(0);
		}
		elem = $(elem).text(range.toString());
		
		document.execCommand('insertHTML', false, elem.wrap('<div>').parent().html());
		
		//reselect text
		selection = Compose.Range.getSelection();
		range = Compose.Range.createRange();
		range.setStart(selection.anchorNode, 0);
		range.setEnd(selection.anchorNode, selection.anchorNode.wholeText.length);
		selection.removeAllRanges();
		selection.addRange(range);
		this.showTools();
		
		return this;
	};
	
	Compose.prototype.unwrapSelection = function(filter){
		var $element = this.getSelectionXPath().filter(filter),
			rootNode = $element.parent().is(this.$element);
			
		var $orphans = $($element[0].childNodes).unwrap();
		if (rootNode) $orphans.wrapAll('<p>');
		
		//reselect text
		var selection = Compose.Range.getSelection();
		var range = Compose.Range.createRange();
		range.setStart($orphans.first()[0], 0);
		range.setEnd($orphans.last()[0], ($orphans.last()[0].nodeType === 3) ? $orphans.last()[0].nodeValue.length : 1);
		selection.removeAllRanges();
		selection.addRange(range);
		this.showTools();
		
		return this;
	};
	
	window['Compose'] = Compose;
})(window.jQuery, document, window);
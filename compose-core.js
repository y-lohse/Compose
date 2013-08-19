(function($, document, window){
	'use strict';
	
	var Compose = function(element, options){
		options = options || {};
		this.settings = $.extend({}, Compose.defaults, options);
		
		this.markdown = this.settings.markdown;
		
		this.$element = $(element).attr('contentEditable', true);					  
		this.$toolbar = $('<menu>')
						.attr('type', 'toolbar')
						.addClass(this.settings.toolbarClass)
						.css({
							'position': 'absolute',
							'top': 0,
							'left': 0,
							'display': 'none',
						});
		$('body').append(this.$toolbar);
		
		this.on = $.proxy(this.$element.on, this.$element);//now we can register event listeners directly through the Compose object
		
		//init markdown parser if there is one
		if (this.markdown) this.markdown = new this.markdown(this);
		
		this.$element.on('keydown', $.proxy(this.keydown, this))
					  .on('keyup', $.proxy(this.keyup, this));
		$(document).on('mouseup', $.proxy(this.mouseup, this));
		
		//init tools
		this.tools = {};
		for (var tool in this.settings.tools){
			this.addTool(this.settings.tools[tool]);
		}
	};
	
	Compose.defaults = {
		markdown: false,
		tools: {},
		toolbarClass: 'compose-toolbar',
		toolClass: 'compose-tool',
		toolClassActive: 'active',
	};
	
	/**
	 * @author mrdoob / http://mrdoob.com/
	 */
	Compose.EventDispatcher = function(){};
	
	Compose.EventDispatcher.prototype = {
	
		constructor: Compose.EventDispatcher,
	
		addEventListener: function ( type, listener ) {
	
			if ( this._listeners === undefined ) this._listeners = {};
	
			var listeners = this._listeners;
	
			if ( listeners[ type ] === undefined ) {
	
				listeners[ type ] = [];
	
			}
	
			if ( listeners[ type ].indexOf( listener ) === - 1 ) {
	
				listeners[ type ].push( listener );
	
			}
	
		},
	
		hasEventListener: function ( type, listener ) {
	
			if ( this._listeners === undefined ) return false;
	
			var listeners = this._listeners;
	
			if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 ) {
	
				return true;
	
			}
	
			return false;
	
		},
	
		removeEventListener: function ( type, listener ) {
	
			if ( this._listeners === undefined ) return;
	
			var listeners = this._listeners;
			var index = listeners[ type ].indexOf( listener );
	
			if ( index !== - 1 ) {
	
				listeners[ type ].splice( index, 1 );
	
			}
	
		},
	
		dispatchEvent: function ( event ) {
	
			if ( this._listeners === undefined ) return;
	
			var listeners = this._listeners;
			var listenerArray = listeners[ event.type ];
	
			if ( listenerArray !== undefined ) {
	
				event.target = this;
	
				for ( var i = 0, l = listenerArray.length; i < l; i ++ ) {
	
					listenerArray[ i ].call( this, event );
	
				}
	
			}
	
		}
	
	};
	
	//range & selection manipulation utility
	Compose.Range = {
		window: window,
		document: document,
		getSelection: function(){
			return this.window.getSelection();
		},
		createRange: function(){
			return this.document.createRange();
		},
		//the three following functions are from rangy : http://code.google.com/p/rangy/
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
	
	//tools populate the toolbar
	Compose.Tool = function(name){
		name = name || '';
		this.name = name;
		this.element = null;
		this.compose = null;
		
		Compose.defaults.tools[name] = this;
	};
	
	Compose.Tool.prototype = Object.create(Compose.EventDispatcher.prototype);
	
	Compose.Tool.prototype.on = function(event, fn){
		this.addEventListener(event, fn);
		return this;
	};
	
	Compose.Tool.prototype.match = function(){
		return false;
	};
	
	
	//instance prototype
	Compose.prototype.isSelectionInElement = function(){
		//@TODO : maybe checking with the common ancestor stuff would be better
		var selection = Compose.Range.getSelection();
		return $.contains(this.$element[0], selection.anchorNode) && $.contains(this.$element[0], selection.focusNode) && !selection.isCollapsed;
	}
	
	Compose.prototype.getSelectionXPath = function(){
		var selection = Compose.Range.getSelection();
		return $(selection.getRangeAt(0).commonAncestorContainer).parentsUntil(this.$element).add(selection.getRangeAt(0).commonAncestorContainer);
	}
	
	Compose.prototype.addTool = function(tool){
		if (!this.settings.tools[tool]){
			this.tools[tool.name] = tool;
			this.tools[tool.name].compose = this;
			this.tools[tool.name].dispatchEvent({'type': 'init'});
			if (this.tools[tool.name].element){
				this.tools[tool.name].element.addClass(this.settings.toolClass);
				this.$toolbar.append(this.tools[tool.name].element);
			}
		}
	}
	
	Compose.prototype.removeTool = function(toolName){
		if (this.settings.tools[toolName]){
			if (this.tools[toolName].element){
				this.$toolbar.find(this.tools[toolName].element).remove();
			}
			
			this.tools[toolName].dispatchEvent({'type': 'exit'});
			delete this.tools[toolName];
		}
	}
	
	Compose.prototype.hideTools = function(){
		this.$toolbar.hide();
		
		for (var tool in this.tools){
			if (!$.isFunction(this.tools[tool].match) || !this.tools[tool].element) continue;
			$(this.tools[tool].element).trigger('compose-hide');
		}
	};
	
	Compose.prototype.showTools = function(){
		var selection = Compose.Range.getSelection();
		var $positionElem = $('<span>'),
			range = selection.getRangeAt(0),
			clone = range.cloneRange();
			
		//check if the tool match the current selection
		var $xpath = this.getSelectionXPath();
			
		for (var tool in this.tools){
			if (!$.isFunction(this.tools[tool].match) || !this.tools[tool].element) continue;
			
			$(this.tools[tool].element).trigger('compose-show');
			if (this.tools[tool].match($xpath, this)) $(this.tools[tool].element).addClass(this.settings.toolClassActive);
			else $(this.tools[tool].element).removeClass(this.settings.toolClassActive);
		}
			
		//check if range is backwards, needs to be done here
		var backwards = (Compose.Range.comparePoints(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset) == 1);
			
		//compute toolbar positions
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
		else if (!this.$toolbar.has(event.target).length){
			this.hideTools();
			
			window.setTimeout($.proxy(function(){
				if (!this.isSelectionInElement()) this.hideTools();
			}, this), 0);
		}
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
				var $wrap = $(document.createTextNode('')).text('&nbsp;'),
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
			
		if (range.startOffset !== 0){
			var chunk1 = document.createTextNode(range.startContainer.data.substring(0, range.startOffset));
//				chunk2 = document.createTextNode(range.startContainer.data.substring(range.startOffset));
			//not sure this should work, but it does cross browser.
			$(range.startContainer).before(chunk1, elem);
			$(range.startContainer).remove();
		}
		else{
			elem.insertAfter(range.startContainer.previousSibling);
		}
		
		range.deleteContents();
		
		//reselect text
		selection = Compose.Range.getSelection();
		range = Compose.Range.createRange();
		range.setStart(elem[0], 0);
		range.setEnd(elem[0], 1);
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
	
	//expose compose
	window['Compose'] = Compose;
	
	//jquery plugin
	$.fn.Compose =function(options){
		return this.each(function(){
			$(this).data('compose', new Compose(this, options));
		});
	};
	
	$.fn.Compose.constructor = Compose;
	
})(window.jQuery, document, window);
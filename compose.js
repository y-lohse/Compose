(function($, document, window){
	'use strict';
	
	var Compose = function(element, options){
		options = $.extend({}, Compose.defaults, options);
		
		this.tools = options.tools;
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
		
		//init tools
		for (var i = 0, l = this.tools.length; i < l; i++){
			this.tools[i].compose = this;
			this.tools[i].dispatchEvent({'type': 'init'});
			if (this.tools[i].element){
				this.tools[i].element.addClass('compose-tool');
				this.$toolbar.append(this.tools[i].element);
			}
		}
	};
	
	Compose.defaults = {
		markdown: false,
		tools: [],
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
	
	//toolspopulate the toolbar
	Compose.Tool = function(){
		this.element = null;
		this.compose = null;
		
		Compose.defaults.tools.push(this);
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
		else if (!this.$toolbar.has(event.target).length){
			this.hideTools();
			
			setTimeout($.proxy(function(){
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
	
	window['Compose'] = Compose;
	
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
	
	//recursively finds childnode until the given ofset is found. Returns both the end node and the remaining osset
	ComposeMarkdown.matchOffset = function($baseNode, target, offset){
		for (var i = 0, l = $baseNode[0].childNodes.length; i < l; i++){
			var $node = $($baseNode[0].childNodes[i]);
			
			if ($node.text().length+offset >= target){
				if ($node[0].childNodes && $node[0].childNodes.length > 0) return ComposeMarkdown.matchOffset($node, target, offset);
				else{
					return {
						node: $node[0],
						offset: target-offset
					};
				}
				break;
			}
			else offset += $node.text().length;
		}
	};
	
	ComposeMarkdown.prototype.parse = ComposeMarkdown.parse;
	
	ComposeMarkdown.prototype.keyup = function(event){
		var selection = Compose.Range.getSelection();
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
			/\.{3}/g,					//ellipsis
			/--[^-]/g,						//em dash
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
			var plainSubject = $('<div>').html(subject).text();
			var actualOffset = plainSubject.indexOf(selection.anchorNode.data)+selection.focusOffset;
			var parsedChunk = $(ComposeMarkdown.parse(plainSubject.substring(0, actualOffset)));
			var destination = actualOffset-(actualOffset-parsedChunk.text().length);
					
			var $html = $(ComposeMarkdown.parse(subject));
			
			$parent.empty().append($html);
			if ($html.is('blockquote, h1, h2, h3, h4, h5, h6, hr, ol, ul, p, pre') && $parent.is('p')) $html.unwrap();
			
			//reposition carret
			if ($html.is('hr')){
				if ($html.next().length) this.positionCarret($html.next()[0], 0);
				else{
					//last element, append a new p
					var $p = $('<p>');
					$html.after($p);
					this.positionCarret($p[0], 0);
				}
			}
			else if (selection.focusOffset < $(selection.anchorNode).text().length){
				//caret wesn't at th end, try to reposition it where it used to be
				var newOffset = ComposeMarkdown.matchOffset($html, destination, 0);
				this.positionCarret(newOffset.node, newOffset.offset);
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
	
		var h1 = new Compose.Tool();
	h1.match = function($xpath){
		return ($xpath.filter('h1').length) ? true : false;
	};
	h1.on('init', function(event){
		this.element = $('<button>')
		.html('h1')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h1>');
			else this.compose.unwrapSelection('h1');
		}, this));
	});
	
	var h2 = new Compose.Tool();
	h2.match = function($xpath){
		return ($xpath.filter('h2').length) ? true : false;
	};
	h2.on('init', function(event){
		this.element = $('<button>')
		.html('h2')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<h2>');
			else this.compose.unwrapSelection('h2');
		}, this));
	});
	
	var quote = new Compose.Tool();
	quote.match = function($xpath){
		return ($xpath.filter('blockquote').length) ? true : false;
	};
	quote.on('init', function(event){
		this.element = $('<button>')
		.html('"')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<blockquote>');
			else this.compose.unwrapSelection('blockquote');
		}, this));
	});
	
	var em = new Compose.Tool();
	em.match = function($xpath){
		return ($xpath.filter('em').length) ? true : false;
	};
	em.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('i')
		.css('font-style', 'italic')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<em>');
			else this.compose.unwrapSelection('em');
		}, this));
	});
	
	var bold = new Compose.Tool();
	bold.match = function($xpath){
		return ($xpath.filter('strong').length) ? true : false;
	};
	bold.on('init', function(event){
		var compose = event.compose;
		
		this.element = $('<button>')
		.html('b')
		.css('font-weight', 'bold')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())) this.compose.wrapSelection('<strong>');
			else this.compose.unwrapSelection('strong');
		}, this));
	});
	
	var a = new Compose.Tool();
	a.hideInput = function(){
		this.input.val('').blur().hide();
	};
	a.match = function($xpath){
		return ($xpath.filter('a').length) ? true : false;
	};
	a.on('init', function(event){
		this.reflink = null;
		
		this.element = $('<button>')
		.html('a')
		.css('text-decoration', 'underline')
		.on('click', $.proxy(function(event){
			if (!this.match(this.compose.getSelectionXPath())){
				var $link = this.reflink = $('<a>').attr('href', '#');
				this.compose.wrapSelection($link);
				
				this.input.css({
					'left': $link.offset().left,
					'top': $link.offset().top+$link.height(),
				})
				.show()
				.focus();
				
				this.compose.hideTools();
			}
			else this.compose.unwrapSelection('a');
		}, this));
		
		this.input = $('<input />')
		.appendTo($('body'))
		.css('position', 'absolute')
		.hide()
		.on('keyup', $.proxy(function(event){
			console.log(event.which);
			if (event.which === 13){
				this.reflink.attr('href', this.input.val());
				this.hideInput();
			}
			else if (event.which === 27){
				this.hideInput();
			}
		}, this))
		.on('blur', $.proxy(function(){
			this.input.hide();
		}, this));
	});

	var paster = new Compose.Tool();
	paster.on('init', function(event){
		this.compose.on('paste', $.proxy(function(event){
			event.preventDefault();
			var pasted = event.originalEvent.clipboardData.getData('text/plain');
			if (this.compose.markdown) pasted = this.compose.markdown.parse(pasted);
			
			var $pasted = $('<div>').html(pasted).children().not(':empty');
			
			document.execCommand('insertHTML', false, $pasted.wrapAll('<div>').parent().html());
		}, this));
	});
})(window.jQuery, document, window);

/**
 * marked - a markdown parser
 * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){3,} *\n*/,
  blockquote: /^( *>[^\n]+(\n[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', /\n+(?=(?: *[-*_]){3,} *(?:\n+|$))/)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!' + block.gfm.fences.source.replace('\\1', '\\2') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i+1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item[item.length-1] === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script',
        text: cap[0]
      });
      continue;
    }

    // def
    if (top && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1][cap[1].length-1] === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([^\s]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1][6] === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // url (gfm)
    if (cap = this.rules.url.exec(src)) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0][0];
        src = cap[0].substring(1) + src;
        continue;
      }
      out += this.outputLink(cap, link);
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<strong>'
        + this.output(cap[2] || cap[1])
        + '</strong>';
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<em>'
        + this.output(cap[2] || cap[1])
        + '</em>';
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<code>'
        + escape(cap[2], true)
        + '</code>';
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<br>';
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<del>'
        + this.output(cap[1])
        + '</del>';
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  if (cap[0][0] !== '!') {
    return '<a href="'
      + escape(link.href)
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>'
      + this.output(cap[1])
      + '</a>';
  } else {
    return '<img src="'
      + escape(link.href)
      + '" alt="'
      + escape(cap[1])
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>';
  }
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    .replace(/--/g, '\u2014')
    .replace(/'([^']*)'/g, '\u2018$1\u2019')
    .replace(/"([^"]*)"/g, '\u201C$1\u201D')
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options) {
  var parser = new Parser(options);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length-1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return '<hr>\n';
    }
    case 'heading': {
      return '<h'
        + this.token.depth
        + '>'
        + this.inline.output(this.token.text)
        + '</h'
        + this.token.depth
        + '>\n';
    }
    case 'code': {
      if (this.options.highlight) {
        var code = this.options.highlight(this.token.text, this.token.lang);
        if (code != null && code !== this.token.text) {
          this.token.escaped = true;
          this.token.text = code;
        }
      }

      if (!this.token.escaped) {
        this.token.text = escape(this.token.text, true);
      }

      return '<pre><code'
        + (this.token.lang
        ? ' class="'
        + this.options.langPrefix
        + this.token.lang
        + '"'
        : '')
        + '>'
        + this.token.text
        + '</code></pre>\n';
    }
    case 'table': {
      var body = ''
        , heading
        , i
        , row
        , cell
        , j;

      // header
      body += '<thead>\n<tr>\n';
      for (i = 0; i < this.token.header.length; i++) {
        heading = this.inline.output(this.token.header[i]);
        body += this.token.align[i]
          ? '<th align="' + this.token.align[i] + '">' + heading + '</th>\n'
          : '<th>' + heading + '</th>\n';
      }
      body += '</tr>\n</thead>\n';

      // body
      body += '<tbody>\n'
      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];
        body += '<tr>\n';
        for (j = 0; j < row.length; j++) {
          cell = this.inline.output(row[j]);
          body += this.token.align[j]
            ? '<td align="' + this.token.align[j] + '">' + cell + '</td>\n'
            : '<td>' + cell + '</td>\n';
        }
        body += '</tr>\n';
      }
      body += '</tbody>\n';

      return '<table>\n'
        + body
        + '</table>\n';
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return '<blockquote>\n'
        + body
        + '</blockquote>\n';
    }
    case 'list_start': {
      var type = this.token.ordered ? 'ol' : 'ul'
        , body = '';

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return '<'
        + type
        + '>\n'
        + body
        + '</'
        + type
        + '>\n';
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'html': {
      return !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
    }
    case 'paragraph': {
      return '<p>'
        + this.inline.output(this.token.text)
        + '</p>\n';
    }
    case 'text': {
      return '<p>'
        + this.parseText()
        + '</p>\n';
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    if (opt) opt = merge({}, marked.defaults, opt);

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(hi) {
      var out, err;

      if (hi !== true) {
        delete opt.highlight;
      }

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done(true);
    }

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

(function($){
	'use strict';
	
	var Compose = function(element){
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
				this.selection(event);
			}
			this.selecting= false;
		}, this));
	};
	
	Compose.prototype.addTool = function(tool){
		this.$toolbar.append(tool);
		return this;
	};
	
	Compose.prototype.selectionStart = function(event){
		this.selecting = true;
	};
	
	Compose.prototype.selection = function(event){
		var selection = rangy.getSelection();
		if (selection.isCollapsed){
			this.$toolbar.hide();
			return;
		}
		
		var $positionElem = $('<span>');
		selection.getAllRanges()[0].insertNode($positionElem[0]);
		var position = $positionElem.offset();
		//@TODO : check for colision with browser boundaries
		this.$toolbar.css({
			top: position.top-20,
			left: position.left,
		});
		$positionElem.remove();
		
		this.$toolbar.show();
	};
	
	Compose.prototype.keyup = function(event){
	};
	
	$(function(){
		var compose = new Compose('#composearea');
		var bold = $('<button>')
					.html('b');
		compose.addTool(bold);
	});
})(window.jQuery);
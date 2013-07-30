(function($){
	'use strict';
	
	var Compose = function(element){
		this.$element = $(element).attr('contentEditable', true)
								  .on('mouseup', $.proxy(this.selection, this))
								  .on('keyup', $.proxy(this.keyup, this));
		this.$toolbar = $('<div>')
						.html('toolbar')
						.css({
							'position': 'absolute',
							'top': 0,
							'left': 0,
							'display': 'none',
						});
		$('body').append(this.$toolbar);
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
		new Compose('#composearea');
	});
})(window.jQuery);
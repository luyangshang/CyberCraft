/**
@classdesc The class that manages the construction of scroll arrows, as well as the scrolling.
It updates the current page number, and call the real page update function from the caller.
@param {int} maxX - the maximum x value of the sprite group where the scroll arrows are in.
@param {int} minY - the minimum Y value of the sprite group where the scroll arrows are in.
@param {int} maxY - the maximum Y value of the sprite group where the scroll arrows are in.
@param {function} updateFunction - the update function to call when the scroll up or scroll down arrow is clicked
@param {Object} context - the context of updateFunction
@param {int} NPage - the number of page
@param {Phaser.Group} group - the group this button is to join. Useful for hiding or deleting with a whole group, and useful for aligning it to the right layer.
@constructor
*/
function ScrollButtons(maxX, minY, maxY, updateFunction, context, NPages, fatherGroup)
{
	this.updateFunction = updateFunction;
	this.context = context;
	this.NPages = NPages;
	this.fatherGroup = fatherGroup;
	//constants
	this.style = { font: "20px Segoe UI black", fontWeight: "bold", fill: "#FF3300", align: "right"};
	
	this.currentPage = 0;
	this.scrollGroup = game.add.group();
	//add to the parent group, which is passed as parameter
	fatherGroup.add(this.scrollGroup);
	this.upArrow = game.add.button(maxX, minY+20, "arrowUp", this.scrollUp, this, 0, 0, 0, 0, this.scrollGroup);
	this.upArrow.anchor.setTo(1, 1);
	this.upTween = game.add.tween(this.upArrow.scale).to({y:1.5}, 500,
            Phaser.Easing.Linear.None, false, 0, -1, true).start();
	this.upTween.pause();
	this.upArrow.events.onInputOver.add(this.startTween, this, 0, true);
	this.upArrow.events.onInputOut.add(this.stopTween, this, 0, true);
	
	this.downArrow = game.add.button(maxX, maxY-20, "arrowDown", this.scrollDown, this, 0, 0, 0, 0, this.scrollGroup);
	this.downArrow.anchor.setTo(1, 0);
	//this.downTween = game.add.tween(this.downArrow.scale).to({y: 2}, 500,Phaser.Easing.Bounce.In, true, 0, -1, false).start();
	this.downTween = game.add.tween(this.downArrow.scale).to({y:1.5}, 500, Phaser.Easing.Linear.None, false, 0, -1, true).start();
	this.downTween.pause();
	this.downArrow.events.onInputOver.add(this.startTween, this, 0, false);
	this.downArrow.events.onInputOut.add(this.stopTween, this, 0, false);
	
	//text to indicate the current and maximum page
	this.pageIndicator = game.add.text(maxX, (minY+maxY)/2, parseInt(this.currentPage+1) + "/" + this.NPages, this.style, this.scrollGroup);
	this.pageIndicator.anchor.setTo(1, 0.5);
}
/**
(Used by the description of personal notes or by acts when new acts are added by the script)
Set a new value for the number of pages at runtime
*/
ScrollButtons.prototype.setNPages = function(NPages)
{
	this.NPages = NPages;
	this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
};

/**
Set the current page to num (then pageIndicator will be num+1)
N.B. the content of the page should have already be updated. This function update the indicator only
@param {int} num - the number to set currentPage to
*/
ScrollButtons.prototype.setCurrentPage = function(num)
{
	this.currentPage = num;
	this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
};

/**
Resume the animation when the mouse hover over the arrow
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {boolean} up - true: up arrow, false: down arrow
*/
ScrollButtons.prototype.startTween = function(sprite, pointer, up)
{
	if(up)
		this.upTween.resume();
	else this.downTween.resume();
};
/**
Stop the animation when the mouse hover out of the arrow
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {boolean} up - true: up arrow, false: down arrow
*/
ScrollButtons.prototype.stopTween = function(sprite, pointer, up)
{
	if(up)
		this.upTween.pause();
	else this.downTween.pause();
};

/**
Scroll to the previous page if the current page is more than 0
*/
ScrollButtons.prototype.scrollUp = function()
{
	if(this.currentPage > 0)	//has previous page
	{
		this.currentPage--;
		this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
		this.updateFunction.call(this.context, this.currentPage);
	}
};

/**
Scroll to the next page if there is a next one
*/
ScrollButtons.prototype.scrollDown = function()
{
	if(this.currentPage < this.NPages -1)	//has next page
	{
		this.currentPage++;
		this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
		this.updateFunction.call(this.context, this.currentPage);
	}
};

/**
Destroy everything related to the scroll buttons
*/
ScrollButtons.prototype.destroy = function()
{
	this.scrollGroup.destroy();
};
module.exports = ScrollButtons;
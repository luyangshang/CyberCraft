/**
@classdesc A class manageing the pop up prompt. An instance is created for every states where hint boxes are needed.
@param {string} boxKey - the string indicating the image of the hint box
@constructor
*/
function HintBox(boxKey)
{
	this.hintBoxGroup = game.add.group();
	this.hintBox = this.hintBoxGroup.create(0, 0, boxKey);	//create a sprite and add to the group
	this.hintBox.anchor.setTo(0.5);
	this.hintBox.alpha = 0.7;
	this.hintText = game.add.text(0, 0, "",{font: "17px Courier New, monospace", fontWeight: "bold", fill: "#33FF11", align: "center", wordWrap: true, wordWrapWidth: this.hintBox.width - 15}, this.hintBoxGroup);
	this.hintText.anchor.setTo(0.5);	//text and box should use the same anchor, so that there are as much aligned as possible, even faced with large lines of texts
	this.hintBoxGroup.visible = false;
}

/**
provide the button with hint box
@param {Phaser.Sprite} theButton - the button to add hint box on
@param {string} texts - the text to be added to the hint box
*/
HintBox.prototype.setHintBox = function(theButton, texts)
{
	theButton.events.onInputOver.add(this.show, this, 0, texts);
	theButton.events.onInputOut.add(this.hide, this, 0);
}

/**
private function to display the hint
@param {Phaser.Sprite} theButton - the button on which the event occured
@param {Phaser.Pointer} pointer - a pointer
@param {string} hint - the text to be shown in the hint box
*/
HintBox.prototype.show = function(theButton, pointer, hint)
{
	this.hintBoxGroup.setAll("x", theButton.x+10);
	this.hintBoxGroup.setAll("y", theButton.y);
	this.hintText.setText(hint);
	game.world.bringToTop(this.hintBoxGroup);
	this.hintBoxGroup.visible = true;
}

/**
private function to hide the hint
*/
HintBox.prototype.hide = function()
{
	this.hintBoxGroup.visible = false;
}
module.exports = HintBox;
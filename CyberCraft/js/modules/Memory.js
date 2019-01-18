var ScrollButtons = require("../modules/ScrollButtons");
var MultimediaText = require("../modules/MultimediaText");
/**
@classdesc A class storing and replaying the dialogues received in the scenario
@constructor
*/
function Memory()
{
	//constants
	this.dialoguesPerPage = 4;
	//the maximum length of the text to be displayed as dialogue summary
	this.summaryLength = 70;
	this.styleCaption = { font: "26px Courier New, monospace", fontWeight: "bold", fill: "#FFEE11", align: "left"};
	this.styleName = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00AA11", align: "left", }; 
	this.styleDialogue = { font: "20px Courier New, monospace", fill: "#FFF022", align: "left", wordWrap: true, wordWrapWidth: game.width - 480};
	
	this.dialogues = [];
	this.group = null;
}

/**
Add a dialogue text into the tail of the array, if not yet added
@param {Object} dialogueObj - an object containing the speacker portrait, speacker name and the dialogue itself
*/
Memory.prototype.addDialogue = function(dialogueObj)
{
	//check existence
	for(d in this.dialogues)
		//checking the existence only on the first piece of dialogue message
		if(this.dialogues[d].texts[0] == dialogueObj.texts[0])
			return;
	//add
	this.dialogues.push(dialogueObj);
};

/**
Set the Phaser.Group and create the memory interface
Called by hall and cyberspace scene
@param {Phaser.Group} group - the group in which to display the memory interface
@param {Phaser.Group} group - the group in which to display the replayed dialogue
*/
Memory.prototype.createInterface = function(group, dialogueGroup, hintBox)
{
	this.group = group;
	this.hintBox = hintBox;
//create the interface
	var memoryFrame = this.group.create(game.world.centerX, game.world.centerY, "PNFrame", 0, this.group);
	//intercept clicking events
	memoryFrame.inputEnabled = true;
	memoryFrame.anchor.setTo(0.5);
	//caption
	memoryCaption = game.add.text(200, 70, "Memory", this.styleCaption, this.group);
	this.group.add(memoryCaption);
	//exit button
	var exitButton = game.add.button(850, 100, "cross", function(){this.group.visible = false;/*this.memoryScroll.destroy();*/this.hintBox.hide();}, this, 0, 0, 1, 0, this.group);
	this.hintBox.setHintBox(exitButton, "Close (ESC)");
	exitButton.anchor.setTo(0.5);
	//scroll button
	this.memoryScroll = new ScrollButtons(870, 200, 450, this.toPage, this, 0, this.group);
	//the group for the list specifically
	this.memoryListGroup = game.add.group();
	this.group.add(this.memoryListGroup);
	
	this.group.setAll("anchor.setTo", "anchor", 0.5);
	this.group.visible = false;
	
	this.multimedia = new MultimediaText(450, 420, 1, dialogueGroup, this.dismissDialogue, this);
	
	//shortcut key for scroll up and scroll down
	var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
	scrollUpKey.onDown.add(this.scrollFun, this);
	var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
	scrollDownKey.onDown.add(this.scrollFun, this);
};

/**
Display the memory interface
*/
Memory.prototype.showInterface = function(group)
{
	this.hintBox.hide();
	this.group.visible = true;
	var NPages = Math.ceil(this.dialogues.length / this.dialoguesPerPage);
	this.memoryScroll.setNPages(NPages);
	//the creation of the list is delegated to toPage
	this.toPage(NPages - 1);
	this.memoryScroll.setCurrentPage(NPages - 1);
};

/**
Callback function called at opening memory or the scroll buttons clicked.
Create the list of memories
@param {int} targetPage - the page to scroll to
*/
Memory.prototype.toPage = function(targetPage)
{
	this.memoryListGroup.removeAll(true);
	if(this.dialogues.length == 0)
		return;
	
	var frameSprite, portraitSprite, nameSprite, summarySprite, summaryText;
	var nextItem = targetPage * this.dialoguesPerPage;
	var outerItem = Math.min(nextItem + this.dialoguesPerPage, this.dialogues.length);
	var y = 150;
	for(; nextItem < outerItem; nextItem++)
	{
		//frame
		frameSprite = game.add.button(245, y, "dialoguePop", this.replayDialogue, this, 0, 0, 0, 0, this.memoryListGroup);
		frameSprite.anchor.setTo(0, 0.5);
		frameSprite.id = nextItem;
		this.hintBox.setHintBox(frameSprite, "Replay the dialogue");
		//portrait
		portraitSprite = game.add.button(200, y, this.dialogues[nextItem].portrait, this.replayDialogue, this, 0, 0, 0, 0, this.memoryListGroup);
		portraitSprite.scale.setTo(0.65);
		portraitSprite.anchor.setTo(0.5);
		portraitSprite.id = nextItem;
		this.hintBox.setHintBox(portraitSprite, "Replay the dialogue");
		//name
		nameSprite = game.add.text(280, y - 25, this.dialogues[nextItem].name, this.styleName, this.memoryListGroup);
		nameSprite.anchor.setTo(0, 0.5);
		//dialogue summary
		summaryText = this.dialogues[nextItem].texts[0].slice(0, this.summaryLength);
		summaryText = summaryText.split(/\r\n|\r|\n/).join(" ");
		if(this.dialogues[nextItem].texts[0].length > this.summaryLength || this.dialogues[nextItem].texts.length > 1)
			summaryText = summaryText.concat("...");
		summarySprite = game.add.text(280, y - 15, summaryText, this.styleDialogue, this.memoryListGroup);
		summarySprite.anchor.setTo(0, 0);
		
		y += 100;
	}
};

/**
Replay one particular dialogue
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
Memory.prototype.replayDialogue = function(button, pointer)
{
	this.hintBox.hide();
	var i = button.id;
	this.name = this.dialogues[i].name;
	this.portrait = this.dialogues[i].portrait;
	this.texts = this.dialogues[i].texts;
	this.currentPage = 0;
	
	this.multimedia.dynamicTextWithPortrait(this.texts[0], this.portrait, this.name);
};
Memory.prototype.dismissDialogue = function()
{
	this.currentPage++;
	if(this.currentPage < this.texts.length)	//more pages
		this.multimedia.dynamicTextWithPortrait(this.texts[this.currentPage], this.portrait, this.name);
	else this.multimedia.hideDialogue();
};

/**
@param {boolean} scrollup - true: page-up key; false: page-down key
*/
Memory.prototype.scrollFun = function(key)
{
	if(this.dialogues.length)
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.memoryScroll.scrollUp();
		else this.memoryScroll.scrollDown();	
};

/**
Clear the memory of dialogues. Called when starting/restarting a new scenario
*/
Memory.prototype.clearMemory = function()
{
	this.dialogues = [];
	this.group = null;
};

module.exports = Memory;
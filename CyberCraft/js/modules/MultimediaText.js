var dynamic_text = require("../modules/dynamic_text");

/**
@classdesc The class parses (not json parsing) the data for intro/outro, hall and personal notes. It also deal with the effects like potrait, typing-like animation and the display of image-text-mixed page. The lifecycle of these sprites or groups are also managed here.
The state of intro, outro, credits and tutorial will use the dynamic text and the image-text-mixed page (pattern == 0)
The state of hall (dialogue) needs the typing-like dynamic text and dialogue related things like the speaker potrait (pattern == 1)
The interface of personal notes will use the pure text and the image-text-mixed page (pattern == 2)
Each of the above interface will create one instance of this class
@param {int} x -  the minimum x coordinate to create the sprite/sprites
@param {int} y -  the minimum y coordinate to create the sprite/sprites
@param {int} pattern - which multimedia pattern is requested. 0: intro/outro/credits/tutorial, 1: hall, 2: personal notes
@param {function} callback - (optional) the callback function when the player click on the dialogue. (for dialogue only)
@param {Object} callbackContext - (optional) the context of the callback function (for dialogue only)
@param {Phaser.Group} fatherDialogueGroup - put the dialogueGroup in this group, and the content will be placed in the right layer
@constructor
*/
function MultimediaText(x, y, pattern)
{
	this.x = x;
	this.y = y;
	this.pattern = pattern;
	
	//the two default sytles for texts together with image group
	this.styles = { font: "20px Courier New, monospace", fill: "#00AA11", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 310};
	this.styleDialogue = { font: "20px Courier New, monospace", fill: "#0077FF", align: "left", wordWrap: true, wordWrapWidth: game.width - 520};
	this.styleNotes = { font: "20px Segoe Print", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 320};
	this.styleName = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00AA11", align: "left", }; 
	
	//index of the last Image-text-mixed page. It's useful when hiding last image-text-mixed page
	this.lastImagePage = -1;		
	this.pageGroups = [];		//buffer the image pages already created
	
	if(pattern == 0)		//intro, outro, credits and tutorial
	{
	//initialize dynamic text
		this.textSprite = game.add.text(x, y, "", this.styles);
		this.finishSignal = new Phaser.Signal();	//signals when typing finishes
		this.finishSignal.add(this.writeFinishedFunc, this);		
	//initialize image
		
		return this;
	}
	if(pattern == 1)		//hall (dialogue)
	{
		this.dialogueGroup = game.add.group();
	//initialize dynamic text
		this.textSprite = game.add.text(x, y, "", this.styleDialogue, this.dialogueGroup);
		this.finishSignal = new Phaser.Signal();	//signals when typing finishes
		this.finishSignal.add(this.writeFinishedFunc, this);
	
		/*//when the player tap on the screen, immediately finish the typing animation
		game.input.onTap.add(finishWriting, this);*/
		
	//dialogue frame, potrait and name of the speaker
		//two arguments expected exclusively for dialogue
		if(arguments.length < 5)
		{
			window.alert("Error! more arguments as callback function when clicking on dialogue are expected!");
			exit(4);
		}
		this.callbackFun = arguments[3];
		this.callbackContext = arguments[4];

		this.dialogueFrame = this.dialogueGroup.create(x-150, y-60, "dialogueBox");
		this.nameSprite = game.add.text(x-130, y-30, "", this.styleName, this.dialogueGroup);		//the speaker name awaits
		//this.nameSprite.anchor.setTo(0.5, 0.5);
		//game.world.bringToTop(this.nameSprite);
		//immediately finish typing animation or dismiss the dialogue page
		//this.dialogueGroup.inputEnabled = true;
		this.dialogueFrame.inputEnabled = true;
		//this.dialogueGroup.input.enableDrag(false, true);
		this.dialogueFrame.events.onInputDown.add(this.tapOnDialogue, this);
		this.dialogueGroup.visible = false;
		//fatherDialogueGroup. To let dialogueGroup be presented in the right layer
		if(arguments[5])
			arguments[5].add(this.dialogueGroup);
		this.textSprite.bringToTop();
		return this;
	}
	if(pattern == 2)		//personal notes
	{
	//initialize pure text
		this.textSprite = game.add.text(this.x, this.y, "", this.styleNotes);
	//initialize image
	
		return this;
	}	
}

/**
Set the single-page dynamic text that has typing animation. no more parsing (not json parsing) is needed
@param {string} pureText - the pure text to display with typing animation. no more parsing (not json parsing) is needed
*/
MultimediaText.prototype.dynamicText = function(pureText)
{
	//stop previous dialogue animation when new dialogue already coming
	this.finishWriting();
	
	this.textSprite.setText("");
	this.pureText = pureText;
	//hide the last image page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	
	this.writeTimer = dynamic_text.write_one(this.textSprite, 20, pureText, this.finishSignal);
	this.writeFinished = false;
	game.globals.audioManager.typingOn();
}

/**
Create dynamic text that involve typing animation.
@parm {string} pureText - a string to be dynamically displayed
@param {Phaser.Key} portrait - the key of the portrait
@param {string} name - the name of the speaker
*/
MultimediaText.prototype.dynamicTextWithPortrait = function(pureText, portrait, name)
{	
	if(this.dialogueGroup.visible == false || this.nameSprite.text != name)
	{//create new dialogue if old one closed, or if speaker name changed
		this.dialogueGroup.visible = true;
		/*because of potential portrait change. the portrait sprite
		always has to be created*/
		if(this.portraitSprite)
			this.portraitSprite.destroy();
		this.portraitSprite = this.dialogueGroup.create(this.x-130, this.y+20, portrait);
		//this.portraitSprite.anchor.setTo(0.5, 0.5);
		
		this.nameSprite.setText(name);
		game.world.bringToTop(this.nameSprite);
		game.world.bringToTop(this.textSprite);
		this.dynamicText(pureText);
	}
	else	//continue with old dialogue page (when changing page)
	{
		this.dynamicText(pureText);
	}
}

/**
Set the single-page text.
@param {string} pureText - the pure text to display. no more parsing (not json parsing) is needed
*/
MultimediaText.prototype.normalText = function(pureText)
{
	//hide the last image-text-mixed page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	
	this.textSprite.setText(pureText);
	game.world.bringToTop(this.textSprite);
	
	//this.writeFinished = true;
}

/**
Create a single image-text-mixed page.
Previously visited pages with image are hidden and buffered by this class (instead of been destroyed). This function try to use buffered image page before creation.
For the case of personal notes, changing note will clear the this buffer (because the whole page buffer is changed).
@param {string} textToParse - a string describing a single page with indicators for images and texts. The following parsing process (not json parsing) will create the page by linking the assets and place images and texts in specified location
@param {int} currentPage - the index of the page among all the pages. It helps the function to know where to buffer the page (for future reuse)
@returns {Array} - the image-text-mixed page just created
*/
MultimediaText.prototype.imageText = function(textToParse, currentPage)
{
	this.finishWriting();
	this.textSprite.setText("");
	//hide the last image-text-mixed page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	this.lastImagePage = currentPage;

	//If the page has already been opened before, the group is just displayed, instead of recreating all the objects
	if (this.pageGroups[currentPage]) {
		this.pageGroups[currentPage].visible = true;
	}
	else {
		//Creates the current page group
		this.pageGroups[currentPage] = window.game.add.group();

		//Puts all the commands on one line removing the line breaks
		var commands = textToParse.split(/\r\n|\r|\n/).join("");

		//Splits the commands into an array based on the # character
		var commandsArray = commands.split("#");
		var args;

		for(index in commandsArray)
		{
			//Each command is split against the $ character to obtain each argument
			args = commandsArray[index].split("$");

			//Skips the first empty substring (before the first $)
			if (index !== 0) {
				//Identifies if a current command is the creation of an image
				if (args[0] === "image") {
					//Creates an images passing its X and Y coordinates and the sprite key,
					//respectively contained in args[1], args[2], and args[3]
					var image = this.pageGroups[currentPage].create(parseInt(args[1]), parseInt(args[2]), args[3]);
					image.anchor.setTo(0.5, 0.5);
					if(args[4] && args[5])
					{	//optionally two more parameters as the width and height of the displayed size.
						image.width = parseInt(args[4]);
						image.height = parseInt(args[5]);
					}
					else if(args[4] && !args[5])
					{	//one parameter only. It will be used for both width and height.
						image.width = parseInt(args[4]);
						image.height = parseInt(args[4]);
					}
				}
				//Identifies if a current command is the creation of a text box
				else if (args[0] === "text") {
					var text;
					//If the word wrap width has been specified the text style is overwritten
					if (args[4]) {
						if(this.pattern == 2)
							var style = this.styleNotes;
						else var style = Object.assign({}, this.styles);
						style.wordWrapWidth = window.game.width - args[4];

						//The text objects is added (X, Y, text, new style object)
						text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], style);
					}
					else {
						//The text object is added (X, Y, text, style object)
						if(this.pattern == 2)
							text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], this.styleNotes);
						else text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], this.styles);
					}
					text.anchor.setTo(0, 0.5);
					this.pageGroups[currentPage].add(text);
				}
			}
		}
	}
	this.writeFinished = true;
	if(this.pattern == 0)
		this.finishSignal.dispatch();
}

/**
(dialogue only) Invoked when the player clicked on the dialogue.
If typing animation going on, finish animation immediately; if animation finished, call the dismissDialogue function trying to close the current dialogue page
*/
MultimediaText.prototype.tapOnDialogue = function()
{
	if(this.writeFinished == false)
		this.finishWriting();
	else this.callbackFun.call(this.callbackContext);
}

/**
 * Immediately stops the current dynamic writing and prints the whole text. 
 */
MultimediaText.prototype.finishWriting = function(){
	if(this.writeFinished == true)
		return;
	if (this.pureText)
	{
		this.writeTimer.stop();
		game.globals.audioManager.typingOff();
		this.textSprite.setText(this.pureText);
		this.finishSignal.dispatch();
	}
}

/**
 * The text has been completely written.
 private function
 */
MultimediaText.prototype.writeFinishedFunc = function(){
	this.writeFinished = true;
	game.globals.audioManager.typingOff();
}

/**
(dialogue only) Hide the dialogue box (when a NPC finished his/her multi-page dialogue), waiting for potential future reuse
*/
MultimediaText.prototype.hideDialogue = function()
{
	this.dialogueGroup.visible = false;
	this.textSprite.setText("");
}

/**
(personal notes only) Reinitialize the buffer for next piece of personal note
*/
MultimediaText.prototype.reinitialize = function()
{
	if(this.pageGroups.length)
		for(i in this.pageGroups)
			this.pageGroups[i].destroy();
	this.pageGroups = [];
	this.lastImagePage = -1;
}
/**
Recycle resources when a group of pages are closed
When a set of dialogues finishes - destroy the text, the timer and the potrait group (the potrait and the name)
When the intro, outro screen finishes - destroy the text, timer and image-text-mixed pages
When the personal notes is closed - destory the text and image-text page corresponding to the note
*/
MultimediaText.prototype.clean = function()
{
	//maybe unnecessary, destroyed with the class destruction?
	this.textSprite.setText("");
	if(this.writeTimer)
		this.writeTimer.destroy();
	if(this.dialogueGroup)
		this.dialogueGroup.destroy();
	if(this.pageGroups.length)
		for(i in this.pageGroups)
			this.pageGroups[i].destroy();
	game.globals.audioManager.typingOff();
}
module.exports = MultimediaText;
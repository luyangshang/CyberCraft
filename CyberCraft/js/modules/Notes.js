var PersonalNotes = require("../modules/PersonalNotes");
var ScrollButtons = require("../modules/ScrollButtons");
var MultimediaText = require("../modules/multimediaText");
var HintBox = require("../modules/HintBox");

/**
The class that manages the interface of personal notes. A new instance is created every time the personal notes is refered to.
@param {Phaser.Group} fatherGroup - the group to created notes in
@constructor
*/
function Notes(fatherGroup)
{	
	//constants
	this.namesPerPage = 10;	//maximum number of names that can be shown without scrolling
	this.styleLabel = { font: "12px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleAlsoSee = { font: "15px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleTitle = { font: "17px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleLink = { font: "15px Segoe Print", fontWeight: "bold", fill: "#3300FF", align: "center"};
	//this.style = { font: "16px Courier New, monospace", fontWeight: "bold", fill: "#00FF11", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 95};
	//this.style = { font: '24px Arial', fill: '#fff'};
	this.fatherGroup = arguments[0];
	this.fatherGroup.visible = false;
	
	this.hintBox = new HintBox("box");
	this.noteNames =[];		//array of strings
	this.descTexts = [];	//array of strings. Assigned at each time a name is clicked
	this.nameSprites = [];	//sprites
	this.descGroup;		//sprite

	this.personalNotes = game.globals.personalNotes;
	this.noteNames = this.personalNotes.getNames();	//retrieve the names
	//the number of pages of the names
	this.nameNPage = Math.ceil(this.noteNames.length/this.namesPerPage);
	
	//underlining shadow to lowlight what is below
	this.shadow = game.add.image(0, 0, "black", 0, this.fatherGroup);
	this.shadow.alpha = 0.7;
	//general frame
	this.PNFrame = game.add.sprite(1000, 0, "notes", 0, this.fatherGroup);
	this.PNFrame.anchor.setTo(1,0);
	/*intercept all clicking events before they reach those buttons covered by this image*/
	this.PNFrame.inputEnabled = true;
	//name panel
	this.nameGroup = game.add.group();
	this.fatherGroup.add(this.nameGroup);
		//scroll buttons for the name list
	this.nameScroll = new ScrollButtons(200, 50, 570, this.updateNamePage, this, this.nameNPage, this.nameGroup);
		
	//description panel
	this.descGroup = game.add.group();
	this.fatherGroup.add(this.descGroup);
	//scroll buttons for the description
		//number of pages of the description is initialized as 0. It will be updated by readNote function
	this.descScroll = new ScrollButtons(955, 100, 500, this.updateDescPage, this, 0, this.descGroup);	
	this.descriptionTitle = game.add.text(550, 30, "", this.styleTitle, this.descGroup);
	this.descriptionTitle.anchor.setTo(0.5);
	this.multimedia = new MultimediaText(230, 50, 2, this.descGroup);	//to manage the the image-text-mixed page
	this.theDesc;		//a pointer to the current pure text description or the image-text-mixed description

	this.internalGroup = game.add.group();
	this.fatherGroup.add(this.internalGroup);
	
	//shortcut key for personal notes
	var escKey = game.input.keyboard.addKey(Phaser.Keyboard.ESC);
	escKey.onDown.add(this.escFun, this);
	var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
	scrollUpKey.onDown.add(this.scrollFun, this);
	var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
	scrollDownKey.onDown.add(this.scrollFun, this);
}
/**
Formally create the personal notes, after the player have clicked on "personal notes"
*/
Notes.prototype.createNotes = function()
{
	if(this.fatherGroup.visible == true)
		return;	//avoid diplaying two personal notes
	this.fatherGroup.visible = true;
	game.globals.audioManager.lowVolume(true);
	
	//exit button
	this.exitButton = game.add.button(game.world.width-30, 30, "cross", this.exitNotes, this, 0, 0, 1, 0, this.fatherGroup);
	this.hintBox.setHintBox(this.exitButton, "Close (ESC)       ");
	this.exitButton.anchor.setTo(0.5);
	
	this.updateNamePage(0);	//name starts at the first page
	/*description starts at the introduction of personal notes
	arguments[2] is the customized one, the id of the entry*/
	this.readNote(0);
};

/**
converts entry name(string) to entry id(int)
@param {string} name - entry name
ret: -1 for not found
*/
Notes.prototype.name2id = function(name)
{
	for(id in this.noteNames)
		if(this.noteNames[id] == name)
			return id;
	return -1;
};

/**
update the page of note names. without clicking on a note name, the description does not change
@param {int} targetPage - the index of the target page among the pages of note names
*/
Notes.prototype.updateNamePage = function(targetPage)
{
	var i;
	//clean old names
	for(i in this.nameSprites)
		this.nameSprites[i].destroy();
	this.nameSprites = [];
	var nextItem = targetPage * this.namesPerPage;
	var outerItem = Math.min(nextItem + this.namesPerPage, this.noteNames.length);
	for(i=0; nextItem < outerItem; nextItem++, i++)
	{
		this.nameSprites[i] = game.add.text(103, 100+47*i, this.noteNames[nextItem], this.styleLabel, this.nameGroup);
		this.nameSprites[i].anchor.setTo(0.5);
		this.nameSprites[i].inputEnabled = true;
		this.nameSprites[i].buttonMode = true;
		//this.nameSprites[i].events.onInputDown.add(this.readNote, this, 0, nextItem);
		this.nameSprites[i].events.onInputDown.add(this.clickOnNote, this, 0, nextItem);
		this.hintBox.setHintBox(this.nameSprites[i], "Click to read");
	}
	/*//if left items are more than one page, set to secenarios per page; it left items less than one page, set to the number of items left
	var itemsThisPage = Math.Min(this.noteNames.length - targetPage*this.namesPerPage, this.namesPerPage);
	for(i=0; i<itemsThisPage; i++)
	{
		this.nameSprites[i] = game.add.text(50, 50+50*i, this.noteNames[this.namesPerPage*targetPage + i], style, nameGroup);
		this.nameSprites[i].anchor.setTo(0, 0);
	}*/
};
/**
Invoked on clicking event on note name. Deligate the work to readNote.
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} id - the id (index) indicating an entry in the note. 
*/
Notes.prototype.clickOnNote = function(sprite, pointer, id)
{
	this.readNote(id);
};

/**
Read the note, displaying the first page of the description
@param {int} id - the id (index) indicating an entry in the note. usually the act name or the buff name
*/
Notes.prototype.readNote = function(id)
{
	/*the first two arguments of the button's callback are occupied
	customized arguments can be passed starting from arguments[2]*/
	///var id = arguments[2];
	this.descriptionTitle.setText(this.noteNames[id]);
	var texts = this.personalNotes.getDesc(id);
	//update the description, which is divided into pages by "^" character
	this.descTexts = texts.split("^");
	//description need to reset of multimediaText's page buffer, as well as updating the scroll button's number of pages
	this.multimedia.reinitialize();
	this.descScroll.setNPages(this.descTexts.length);
	//show the first page of the description
	this.updateDescPage(0);
	this.descScroll.setCurrentPage(0);
	
	//link to other entries within the personal notes
		//clean group
	this.internalGroup.removeAll(true);
		//new internal links
	var internalLinks = this.personalNotes.getInternalLinks(id);
	if(internalLinks && internalLinks.length)
	{
		var length = internalLinks.length;
		game.add.text(230, 550, "Also see:", this.styleAlsoSee, this.internalGroup);
		for(var i = 0; i < length; i++)
		{
			var internalText = game.add.text(300, 590-(length -i)*25, internalLinks[i], this.styleLink, this.internalGroup);
			internalText.inputEnabled = true;
			var targetId = this.name2id(internalLinks[i]);
			internalText.events.onInputDown.add(this.internal, this, 0, targetId);
			this.hintBox.setHintBox(internalText, "Click to jump to");
		}
	}
		
	//link to external source of knowledge
		//clean button
	if(this.externalButton1)
		this.externalButton1.destroy();
	if(this.externalButton2)
		this.externalButton2.destroy();
		//new button
	var urls = this.personalNotes.getUrls(id);
	if(urls)
	{
		if(urls[0])
		{
			this.externalButton1 = game.add.button(770, 550, "link", this.external, this, 0, 0, 1, 0, this.fatherGroup);
			this.externalButton1.anchor.setTo(0.5);
			this.externalButton1.url = urls[0];
			this.hintBox.setHintBox(this.externalButton1, "View external link");
		}
		if(urls[1])
		{
			this.externalButton2 = game.add.button(620, 550, "link", this.external, this, 0, 0, 1, 0, this.fatherGroup);
			this.externalButton2.anchor.setTo(0.5);
			this.externalButton2.url = urls[1];
			this.hintBox.setHintBox(this.externalButton2, "View external link");
		}
	}
};
/**
Invoked when a internal link is clicked. Will change to the designated entry in the personal notes
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} id - the id of the target entry
*/
Notes.prototype.internal = function(sprite, pointer, id)
{
	if(id == -1)
	{
		game.globals.messager.createMessage("Sorry. This entry is not found in personal notes!");
		return;
	}
	this.hintBox.hide();
	this.readNote(id);
};

/**
Invoked when the external button is clicked. Will open a link to external page, where more comphrehensive knowledge of the topic is put
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
Notes.prototype.external = function(button, pointer)
{
	this.hintBox.hide();
	var url = button.url;
	window.open(url);
};

/**
update the page of note description part (e.g. to page 3). Does not read other notes ("name" not changed)
@param {int} targetPage - the index of the target page among the pages of descriptions (from one note)
*/
Notes.prototype.updateDescPage = function(targetPage)
{
	var currentText = this.descTexts[targetPage];
	if(currentText[0] != "#")
		this.theDesc = this.multimedia.normalText(currentText);
	else this.theDesc = this.multimedia.imageText(currentText, targetPage);
};

/**
When the player presses on "ESC" key
The function may also be invoked when personal notes not opened!
Therefore, a check is necessary
*/
Notes.prototype.escFun = function()
{
	if(this.fatherGroup.visible == true)
	//if(this.exitButton && this.notes.exitButton.alive == true/*this.nameGroup && this.nameGroup.length*/)
		this.exitNotes();
};
/**
When the player presses on pageUp or pageDown key
*/
Notes.prototype.scrollFun = function(key)
{
	//ignore shortcut key if personal notes not opened
	if(!this.descScroll)
		return;
	if(key.keyCode == Phaser.Keyboard.PAGE_UP)
		this.descScroll.scrollUp();
	else this.descScroll.scrollDown();
};

/**
Close the personal note, and return to where it was
The lower layer sprites are revealed
*/
Notes.prototype.exitNotes = function()
{
	this.hintBox.hide();
	this.fatherGroup.visible = false;
	this.exitButton.destroy();
	/*this.fatherGroup.removeAll(true);
	this.nameGroup.destroy();
	//this.description.destroy();
	
	this.PNFrame.destroy();
	this.nameScroll.destroy();
	delete this.nameScroll;
	this.descriptionTitle.destroy();
	this.descScroll.destroy();
	delete this.descScroll;
	this.multimedia.clean();
	this.internalGroup.destroy(true);
	if(this.externalButton1)
		this.externalButton1.destroy();
	if(this.externalButton2)
		this.externalButton2.destroy();*/
	//restore the music volume
	game.globals.audioManager.lowVolume(false);
};
module.exports = Notes;
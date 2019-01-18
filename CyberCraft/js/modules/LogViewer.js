var ScrollButtons = require("../modules/ScrollButtons");
var LogEntry = require("./LogEntry");
var HintBox = require("./HintBox");
/**
@classdesc A class managing the display of action logs. Both for cyberspace state and for the review state
N.B. the management of a single log is managed by LogEntry
@param {Array} logs - the array of the action log
@param {int} role - the role of the player. To be displayed as a reminder. 0: intruder, 1: defender
@param {boolean} doublePlayer - true: double player mode, false: single player mode
@param {Notes} notes - the reference to personal notes. Used to open personal notes from logViewer
@param {Messager} messager - the reference to a Messager instance, which is called at warning messages
@param {Phaser.Group} fatherGroup - the group where the whole logViewer is put in. useful for layering
@constructor
*/
function LogViewer(logs, role, doublePlayer, notes, messager, fatherGroup)
{
	//constants
	this.styleHeadline = { font: "25px Courier New, monospace", fontWeight: "bold", fill: "#FFEE11", align: "center"};
	this.style = { font: "20px Courier New, monospace", fill: "#00AA11", align: "center"};
	this.styleIntruder = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#8800EE", align: "center"};
	this.styleDefender = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#2222FF", align: "center"};
	
	this.styleFailed = { font: "20px Courier New, monospace", fill: "#FF8811", fontWeight: "bold", align: "center"};
	this.logsPerPage = 6;
	
	this.logs = logs;
	this.role = role;
	this.doublePlayer = doublePlayer;
	this.notes = notes;
	this.messager = messager;
	this.fatherGroup = fatherGroup;
	
	//layer 1: log entries
	this.logGroup = game.add.group();
		//each contains a log entry: frame+round+act+result
	this.entryGroups = [];
	//layer 2: popup details of one log entry
	this.reasonGroup = game.add.group();
	//layer 3: hintbox
	this.hintBox = new HintBox("box");
	
	fatherGroup.add(this.logGroup);
	fatherGroup.add(this.reasonGroup);
	
	//shortcut key for scroll up and scroll down
	var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
	scrollUpKey.onDown.add(this.scrollFun, this);
	var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
	scrollDownKey.onDown.add(this.scrollFun, this);
}

/**
Create the table of logs
@param {boolean} lastPage - true: display the last page, false: display the first page
@returns {Phaser.Group} group - the group containing newly created sprites
*/
LogViewer.prototype.display = function(lastPage)
{
	var roleText;
	//Frame
	var logFrame = game.add.image(game.world.centerX, game.world.centerY, "PNFrame", 0, this.logGroup);
	logFrame.anchor.setTo(0.5);
	//cyberspace need it to intercept clicking events
	logFrame.inputEnabled = true;
	
	//headline
	var headline = game.add.text(game.world.centerX - 100, 100, "Action Logs", this.styleHeadline, this.logGroup);
	headline.anchor.setTo(0.5);
	//role
	if(!this.doublePlayer)
	{
		if(this.role == 1)
		{
			roleText = "Your role: defender";
			var roleSprite = game.add.text(game.world.centerX + 120, 110, roleText, this.styleDefender, this.logGroup);
		}
		else
		{			
			roleText = "your role: intruder";
			var roleSprite = game.add.text(game.world.centerX + 120, 110, roleText, this.styleIntruder, this.logGroup);
		}
		roleSprite.anchor.setTo(0.5);
	}
	
	//create the battle log
		//caption line
	var roundText = game.add.text(200, 150, "Round", this.style, this.logGroup);
	roundText.anchor.setTo(0.5);
	var actText = game.add.text(450, 150, "Act pattern", this.style, this.logGroup);
	actText.anchor.setTo(0.5);
	var resultText = game.add.text(700, 150, "Result", this.style, this.logGroup);
	resultText.anchor.setTo(0.5);
	//calculate the number of pages
	var NPages = Math.ceil(this.logs.length / this.logsPerPage);
	this.scrollButtons = new ScrollButtons(880, 200, 450, this.updateLogs, this, NPages, this.logGroup);
	
	//exit button
	this.exitButton = game.add.button(810, 80, "cross", function(){this.closeLog();}, this, 0, 0, 1, 0, this.logGroup);
	this.hintBox.setHintBox(this.exitButton, "Close (ESC)");
	if(lastPage)				//at cyberspace, should start with the last page
	{
		this.updateLogs(NPages-1);
		this.scrollButtons.setCurrentPage(NPages-1);
	}
	else this.updateLogs(0);	//at review, should start with the first page
};
/**
Review state only. delete the exit button, which was created with logGroup
*/
LogViewer.prototype.noExit = function()
{
	this.exitButton.destroy();
};

/**
Callback function to update the page in action log.
@param {int} targetPage - the page to scroll to
*/
LogViewer.prototype.updateLogs = function(targetPage)
{
	var i;
	//empty the old log entries
	for(i in this.entryGroups)
		this.entryGroups[i].destroy();
	this.entryGroups = [];
	
	if(this.logs.length == 0)
		return;
	//going to display items of index [nextItem, outerItem)
	var nextItem = targetPage * this.logsPerPage;
	var outerItem = Math.min(nextItem + this.logsPerPage, this.logs.length);
	
	//create new logs
	var frameSprite, roundSprite, actSprite, resultSprite;
	var y = 200;
	for(i=0; nextItem < outerItem; nextItem++, i++, y+=50)
	{
		this.entryGroups[i] = game.add.group();
		var round = this.logs[nextItem].round;
		//entry frame
		frameSprite = game.add.button(game.world.centerX - 20, y, "itemFrames", this.showReason, this, 0, 0, 0, 0, this.entryGroups[i]);
		if(round % 2 == 0)	//different style for the intruder
			frameSprite.setFrames(1, 1, 1, 1);
		//parameters passed through button
		frameSprite.index = nextItem;
		frameSprite.anchor.setTo(0.5);
		//add tweening animation for the frame
		frameSprite.events.onInputOver.add(this.enlarge, this, 0);
		frameSprite.events.onInputOut.add(this.normal, this, 0);
		
		//round
		game.add.text(200, y, round, this.style, this.entryGroups[i]);
		//act
		var actSprite = game.add.text(450, y, this.logs[nextItem].act, this.style, this.entryGroups[i]);
			//hint box
		this.hintBox.setHintBox(actSprite, "Find in personal notes");
			//link to open the corresponding entry in personal notes
		actSprite.inputEnabled = true;
		actSprite.events.onInputDown.add(this.seeNotesFun, this);
		//result
		if(this.logs[nextItem].success)
			resultSprite = game.add.text(700, y, "successful", this.style, this.entryGroups[i]);
		else resultSprite = game.add.text(700, y, "failed", this.styleFailed, this.entryGroups[i]);
		
		this.entryGroups[i].callAll("anchor.setTo", "anchor", 0.5);
		this.logGroup.add(this.entryGroups[i]);
	}
};

/**
Enlarge the scenario button when the mouse hover over it
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} i - the index of the scenario button in the current page
*/
LogViewer.prototype.enlarge = function(sprite, pointer)
{
	game.add.tween(sprite.scale).to({x: 1.05, y: 1.2}, 400, Phaser.Easing.Linear.None, true);
};
LogViewer.prototype.normal = function(sprite, pointer)
{
	game.add.tween(sprite.scale).to({x: 1, y: 1}, 400, Phaser.Easing.Linear.None, true);
};

/**
Open the corresponding entry in personal notes
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
LogViewer.prototype.seeNotesFun = function(sprite, pointer)
{
	this.hintBox.hide();
	this.notes.createNotes();
	var id = this.notes.name2id(sprite.text);
	if(id == -1)
		this.messager.createMessage("Sorry. This entry is not found in personal notes!");
	else this.notes.readNote(id);
};

/**
Show the detailed information, especially, whether the attack failed and why, when the log entry has been clicked
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
LogViewer.prototype.showReason = function(button, pointer)
{
	//this.buttonClickSound.play("", 0, window.game.globals.soundEffectsOn);
	
	var entry = this.logs[button.index];
	//create group

	//frame
	var detailFrame = this.reasonGroup.create(game.world.centerX, game.world.centerY, "dialogueBox");
	detailFrame.anchor.setTo(0.5);
	detailFrame.inputEnabled = true;
	detailFrame.events.onInputDown.add(this.deleteReason, this, 0);
	if(entry.success)
	{	//the act succeeds, no more resaon recorded
		//caption
		this.caption = game.add.text(game.world.centerX, 200, "\"" + entry.act + "\" succeeded", this.styleHeadline, this.reasonGroup);
		game.add.text(game.world.centerX, game.world.centerY, "No definitive hurdle encountered", this.style, this.reasonGroup);
		/*//click to close
		this.reasonGroup.callAll('events.onInputDown.add', 'events.onInputDown', this.deleteReason, this);*/
		this.reasonGroup.callAll("anchor.setTo", "anchor", 0.5);
		return;
	}
	//the act failed. Display the reasons
	this.caption = game.add.text(game.world.centerX, 200, "\"" + entry.act + "\" failed", this.styleHeadline, this.reasonGroup);
	var y = 250;
	//need rival buff
	if(entry.noBuffHurdle.length)
	{
		game.add.text(game.world.centerX, y, "Rival should have these:", this.style, this.reasonGroup);
		y += 40;
		for(var n in entry.noBuffHurdle)
		{
			///also the buff picture?
			game.add.text(game.world.centerX, y, entry.noBuffHurdle[n], this.styleFailed, this.reasonGroup);
			y += 40;
		}
	}
	//need no rival buff
	if(entry.buffHurdle.length)
	{
		game.add.text(game.world.centerX, y, "Hampered by these on the rival:", this.style, this.reasonGroup);
		y += 40;
		for(n in entry.buffHurdle)
		{
			
			///also the buff picture?
			game.add.text(game.world.centerX, y, entry.buffHurdle[n], this.styleFailed, this.reasonGroup);
			y += 40;
		}
	}
	//need luck
	if(entry.unlucky)
		game.add.text(game.world.centerX, game.world.centerY, "Need more luck", this.styleFailed, this.reasonGroup);
	/*//click to close
	this.reasonGroup.callAll('events.onInputDown.add', 'events.onInputDown', this.deleteReason, this);*/
	this.reasonGroup.callAll("anchor.setTo", "anchor", 0.5);
};

/**
@param {boolean} scrollup - true: page-up key; false: page-down key
*/
LogViewer.prototype.scrollFun = function(key)
{
	if(this.logGroup.length)
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.scrollButtons.scrollUp();
		else this.scrollButtons.scrollDown();	
};

/**
Delete the detailed information of why the action failed
*/
LogViewer.prototype.deleteReason = function()
{
	this.reasonGroup.removeAll(true);
};
/**
Delete everything of the logGroup
*/
LogViewer.prototype.closeLog = function()
{
	this.hintBox.hide();
	this.logGroup.removeAll(true);
	this.reasonGroup.removeAll(true);
	this.scrollButtons.destroy();
};
module.exports = LogViewer;
var HintBox = require("../modules/HintBox");
var LogViewer = require("../modules/LogViewer");
var Notes = require("../modules/Notes");
var Messager = require("../modules/Messager");
var loadSave = require("../modules/loadSave");
var CORSSender = require("../modules/learning_data_send");

/**
The review state after the cyber battle. It shows the offensive and defensive behaviors as well as their consequences during that battle.

*/
var review = {
	/**
	@param {int} index - the index of the scenario/tutorial
	@param {boolean} win - if the player wins
	@param {RecordEntry} record - an object containing logs, role, endingRound and assetsCompromised
	@param {int} doublePlayer - true: double player mode, false: single player mode
	*/
	init: function(index, win, record, doublePlayer)
	{
		this.index = index;
		this.win = win;
		this.record = record;
		this.doublePlayer = doublePlayer;
		
		if(index >= 0 && !game.globals.scenarioCybers[index+1])
			this.lastLevel = true;
		
		this.bgGroup = game.add.group();
		this.logGroup = game.add.group();
		this.notesGroup = game.add.group();
		this.notes = new Notes(this.notesGroup);
		this.messageGroup = game.add.group();
		
		this.hintBox = new HintBox("box");
		this.messager = new Messager(this.messageGroup, this.hintBox);
		game.globals.messager = this.messager;
		this.logViewer = new LogViewer(this.record.logs, this.record.role, this.doublePlayer, this.notes, this.messager, this.logGroup);
	},	
	
	create: function(){		
		var background = game.add.image(0, 0, "tron", 0, this.bgGroup);
		background.width = game.world.width;
		background.height = game.world.height;
		background.alpha = 0.6;
		
		this.logViewer.display(false);
		this.logViewer.noExit();
    
		/*this.buttonGroup = game.add.group();*/
		
		//menu button
		this.menuButton = game.add.button(game.world.centerX - 150 , 550, "menuButton", function(){game.state.start("startMenu");}, this, 0, 0, 1, 0, this.logGroup);
		this.menuButton.anchor.setTo(0.5);
		//personal notes button
		this.notesButton = game.add.button(game.world.centerX + 50, 550, "book", this.openNotes, this, 0, 0, 1, 0, this.logGroup);
		this.hintBox.setHintBox(this.notesButton, "Open personal notes (N)");
		this.notesButton.anchor.setTo(0.5);
		//shortcut key for personal notes
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.openNotes, this);
		
		if(!this.doublePlayer)
		{
			//restart button if not win
			if(!this.win)
			{
				this.restartButton = game.add.button(game.world.centerX +250, 550, "restartButton", function(){this.state.start("intro", true, false, 0, this.index);}, this, 0, 0, 1, 0, this.logGroup);
				this.restartButton.anchor.setTo(0.5);
			}
			else if(this.index >= 0)	//win: try to save data
			{
				loadSave.saveSaveData(this.index, this.record);
				this.messager.createMessage("Progress saved!");
				if(!game.globals.scenarioCybers[this.index+1] || !game.globals.scenarioCybers[this.index+2])	//when finishing one of the last two scenarios
				{	//create and send the learning data
					var learningData = {};
					//add playerName as username
					learningData.username = game.globals.playerName;
					learningData.records = [];
					
					//copy, but also abbreviate ER and AC, converting NobuffHurdle and buffHurdle into strings, and add index
					for(r in game.globals.records)
					{
						var record = game.globals.records[r];
						
						if(record == null)
							/*unfinished scenario found. e.g. one of the last two scenarios is not yet finished*/
							return;
						//convert noBuffHurdle and buffHurdle in logs into strings
						var newLogs = [];
						for(var l in record.logs)
						{
							newLogs[l] = {	round: record.logs[l].round,
										act: record.logs[l].act,
										noBuffHurdle: String(record.logs[l].noBuffHurdle),
										buffHurdle: String(record.logs[l].buffHurdle),
										unlucky: record.logs[l].unlucky,
										success: record.logs[l].success
							};
						}
						learningData.records[r] = {	logs: newLogs,
													role: record.role,
													ER: record.endingRound,
													AC: record.assetsCompromised,
													score: record.score,
													index: r
						}
					}
					localStorage.setItem("learningData", JSON.stringify(learningData));
					game.globals.messager = this.messager;
					CORSSender.makeCorsRequest(JSON.stringify(learningData));
				}
			}
		}
	},
	/**
	Open personal notes while also hide the hintBox
	*/
	openNotes: function()
	{
		this.hintBox.hide();
		this.notes.createNotes();
	},
	/**
	A function called at the ending phase of this state, when the game switch to another state. One can recycle or nullify some elements of this state, so that there will be no problem when returning to the state.
	*/
	shutdown: function()
	{
		delete this.notes;
		delete this.hintBox;
		delete this.messager;
		delete this.logViewer;
		this.bgGroup.destroy();
		this.logGroup.destroy();
		this.notesGroup.destroy();
		this.messageGroup.destroy();
	}	
};
module.exports = review;
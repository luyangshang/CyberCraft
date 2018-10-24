var HintBox = require("../modules/HintBox");
var LogViewer = require("../modules/LogViewer");
var Notes = require("../modules/Notes");
var loadSave = require("../modules/loadSave");
var CORSSender = require("../modules/learning_data_send");
var HintBox = require("../modules/HintBox");

/**
The review state after the cyber battle. It shows the offensive and defensive behaviors as well as their consequences during that battle.

*/
var review = {
	/**
	@param {boolean} win - if the player wins
	@param {int} score - score for the player
	@param {Array} logs - the attack/defend log
	@param {int} role - the role of the player: 0: intruder, 1: defender
	@param {int} index - the index of the scenario/tutorial
	*/
	init: function(win, score, logs, role, index)
	{
		//this.scenarioIndex = scenarioIndex;
		this.win = win;
		this.score = score;
		this.logs = logs;
		this.role = role;
		this.index = index;
		
		if(index >= 0 && !game.globals.scenarioCybers[index+1])
			this.lastLevel = true;
	},	
	
	create: function(){
		//this.hintbox = new HintBox(boxKey);
		
		var background = game.add.image(0, 0, "tron");
		background.width = game.world.width;
		background.height = game.world.height;
		background.alpha = 0.4;
		
		this.hintBox = new HintBox("box");
		this.notes = new Notes(this);
		this.logViewer = new LogViewer(this.logs, this.role, this.notes);
		this.logGroup = this.logViewer.display(false);
		this.logViewer.noExit();
		/*hintBox.setHintBox(logButton, this, "see detail log");*/
    
		this.buttonGroup = game.add.group();
		//menu button
		this.menuButton = game.add.button(game.world.centerX - 150 , 550, "menuButton", function(){game.state.start("startMenu");}, this, 0, 0, 1, 0, this.buttonGroup);
		this.menuButton.anchor.setTo(0.5);
		//personal notes button
		this.notesButton = game.add.button(game.world.centerX + 50, 550, "book", this.notes.createNotes, this.notes, 0, 0, 1, 0, this.buttonGroup);
		this.hintBox.setHintBox(this.notesButton, "Open personal notes (N)");
		this.notesButton.anchor.setTo(0.5);
		//shortcut key for personal notes
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.notes.createNotes, this.notes);
		
		//restart button if not win
		if(!this.win)
		{
			this.restartButton = game.add.button(game.world.centerX +250, 550, "restartButton", function(){this.state.start("intro", true, false, 0, this.index);}, this, 0, 0, 1, 0, this.buttonGroup);
			this.restartButton.anchor.setTo(0.5);
		}
		else if(this.index >= 0)	//win: try to save data
		{
			loadSave.saveSaveData(this.index, this.score, this.logs);
			alertify.alert("Progress saved!");
			if(!game.globals.scenarioCybers[this.index+1])	//send the learning data
			{
				var learningData = {username: game.globals.playerName, 				levelsData: game.globals.savedata};
				localStorage.setItem("learningData", JSON.stringify(learningData));
				CORSSender.makeCorsRequest(JSON.stringify(learningData));
			}
		}
	},
	
	shutdown: function()
	{
		delete hintBox;
		delete logViewer;
	}	
};
module.exports = review;
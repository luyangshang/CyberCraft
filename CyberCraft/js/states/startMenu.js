var loadSave =  require("../modules/loadSave");
var Notes = require("../modules/Notes");
var HintBox = require("../modules/HintBox");
var Messager = require("../modules/Messager");
var lds = require("../modules/learning_data_send");
/**
The state of start menu
*/
var startMenu = {
	
	create: function(){
		this.mainGroup = game.add.group();
		this.notesGroup = game.add.group();
		this.messageGroup = game.add.group();
		
		this.notes = new Notes(this.notesGroup);		
		this.hintBox = new HintBox("box");
		this.messager = new Messager(this.messageGroup, this.hintBox);
		game.globals.messager = this.messager;
		
		var face = game.add.image(game.world.centerX+200, game.world.centerY+70, "combinedFace", 0, this.mainGroup);
		face.anchor.setTo(0.5);
		face.width = 420;
		face.height = 420;
		var logo = game.add.image(game.world.centerX, 100, "logo", 0, this.mainGroup);
		logo.anchor.setTo(0.5);
		//major buttons
		this.tutorialButton = game.add.button(game.world.centerX-330 , game.world.centerY-140, "tutorialButton", this.selection, this, 0, 0, 1, 0, this.mainGroup);
		this.tutorialButton.type = 0;
		this.scenarioButton = game.add.button(game.world.centerX-330 , game.world.centerY-55, "playButton", this.selection, this, 0, 0, 1, 0, this.mainGroup);
		this.scenarioButton.type = 1;
		this.doubleplayerButton = game.add.button(game.world.centerX-330 , game.world.centerY+30, "doubleplayerButton", this.selection, this, 0, 0, 1, 0, this.mainGroup);
		this.doubleplayerButton.type = 2;
		this.creditsButton = game.add.button(game.world.centerX-330 , game.world.centerY+115, "creditsButton", this.credits, this, 0, 0, 1, 0, this.mainGroup);
		
		//Delete save data button
        this.saveButton = game.add.button(200, 540, 'saveButton', this.delSaveData, this, 0, 0, 0, 0, this.mainGroup);
		this.saveButton.anchor.setTo(0.5);
		this.hintBox.setHintBox(this.saveButton, "Delete ALL the game data");
		//notes button
		this.notesButton = game.add.button(300, 540, "book", this.notesFun, this, 0, 0, 1, 0, this.mainGroup);
		this.notesButton.anchor.setTo(0.5);
		this.hintBox.setHintBox(this.notesButton, "Open personal notes (N)");
		//Checks if learningData have or should have been sent so to add the sendLearningData button
        //to allow the resending of the data in case an error has occurred
        if (localStorage.getItem("learningData"))
		{
            //Resend learning data button
            this.resendDataButton = game.add.button(400, 540, 'sendButton', this.resendData, this, 0, 0, 0, 0, this.mainGroup);
			this.resendDataButton.anchor.setTo(0.5);
            this.hintBox.setHintBox(this.resendDataButton, "Send learning data");
        }		
		
		game.globals.audioManager.mainMusic();
		//shortcut key for personal notes
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.notes.createNotes, this.notes);
	},
	/*
	tutorial: function()
	{
		game.state.start("intro", true, false, 3);
	},*/
	
	/**
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	selection: function(button, pointer)
	{
		//0 for tutorial, 1 for single player, 2 for double player
		game.state.start("selection", true, false, button.type);
		/*if(!button.scenario)
			game.state.start("selection", true, false, false);
		else game.state.start("selection", true, false, true);*/
	},
	
	credits: function(){
		game.state.start("intro", true, false, 2);
	},
	
	/**
	When notesButton is clicked
	*/
	notesFun: function()
	{
		this.hintBox.hide();
		this.notes.createNotes();
	},
	
	/**
    * Called when the 'deleteSaveData' button is pressed to remove all saved data.
    */
    delSaveData: function ()
	{
		this.hintBox.hide();
        if (loadSave.removeSaveData())
		{
			this.messager.createMessage("Saved data successfully deleted!");
			game.state.start("load");
		}
    },
	
	/**
	* Allows the player to resend learning data in case the initial uploading has failed
	*/
    resendData: function () {
		this.hintBox.hide();
        lds.makeCorsRequest(localStorage.getItem("learningData"));
    },
	
	/**
	shutdown function is called when exiting this state.
	*/
	shutdown: function()
	{
		this.mainGroup.destroy();
		this.notesGroup.destroy();
	}
};
module.exports = startMenu;
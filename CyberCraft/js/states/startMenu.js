var loadSave =  require("../modules/loadSave");
var Notes = require("../modules/Notes");
var HintBox = require("../modules/HintBox");
var lds = require("../modules/learning_data_send");
/**
The state of start menu
*/
var startMenu = {
	
	create: function(){
		this.notes = new Notes(this);		
		this.hintBox = new HintBox("box");
		
		var face = game.add.image(game.world.centerX+200, game.world.centerY+70, "combinedFace");
		face.anchor.setTo(0.5);
		face.width = 420;
		face.height = 420;
		var logo = game.add.image(game.world.centerX, 100, "logo");
		logo.anchor.setTo(0.5);
		//major buttons
		this.tutorialButton = game.add.button(game.world.centerX-320 , game.world.centerY-140, "tutorialButton", this.selection, this, 0, 0, 1, 0);
		this.tutorialButton.scenario = false;
		this.scenarioButton = game.add.button(game.world.centerX-320 , game.world.centerY-50, "playButton", this.selection, this, 0, 0, 1, 0);
		this.scenarioButton.scenario = true;
		this.notesButton = game.add.button(game.world.centerX-320 , game.world.centerY+40, "notesButton", this.notes.createNotes, this.notes, 0, 0, 1, 0);
		this.creditsButton = game.add.button(game.world.centerX-320 , game.world.centerY+130, "creditsButton", this.credits, this, 0, 0, 1, 0);
		
		//Delete save data button
        this.saveButton = game.add.button(250, 540, 'saveButton', this.delSaveData, this);
		this.saveButton.anchor.setTo(0.5);
		this.hintBox.setHintBox(this.saveButton, "Delete game data");
		
		//Checks if learningData have or should have been sent so to add the sendLearningData button
        //to allow the resending of the data in case an error has occurred
        if (localStorage.getItem("learningData"))
		{
            //Resend learning data button
            this.resendDataButton = game.add.button(360, 540, 'sendButton', this.resendData, this);
			this.resendDataButton.anchor.setTo(0.5);
            this.hintBox.setHintBox(this.resendDataButton, "Send learning data");
        }		
		game.globals.audioManager.mainMusic();
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
		if(!button.scenario)
			game.state.start("selection", true, false, false);
		else game.state.start("selection", true, false, true);
	},
	
	credits: function(){
		game.state.start("intro", true, false, 2);
	},
	
	/**
    * Called when the 'deleteSaveData' button is pressed to remove all saved data.
    */
    delSaveData: function ()
	{
		this.hintBox.hide();
        if (loadSave.removeSaveData())
		{
			alertify.alert("Saved data successfully deleted!");
			game.state.start("load");
		}
    },
	
	/**
	* Allows the player to resend learning data in case the initial uploading has failed
	*/
    resendData: function () {
		this.hintBox.hide();
        lds.makeCorsRequest(localStorage.getItem("learningData"));
    }
};
module.exports = startMenu;
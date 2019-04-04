var MultimediaText = require("../modules/MultimediaText");
/** 
@classdesc A class managing the in-game scripts used to dynamically show dialogues, unlock acts, or lock on end turn button before player has done an action, as well as focusing animation.
The AI however, is managed by AIManager.
p.s. ScriptManager is also written Object-oriented, just like the game. However, it's better to write game scripts event-driven, just like the original javascript. This following object-oriented code are usually triggered at the start of a round. However, if it's event-driven, by create functions such as "OnApplyingAct", "OnEndingTurn", one can manage user interaction in a finer grandularity.
@param {int} index - the scenario number
@param {cyberspace} cyberspace - the reference to cyberspace state
@param {ActManager} actManager - the reference to actManager
@param {AiManager} aiManager - the reference to aiManager. Used only to invoke the attempt to unlock act pattern for the AiManager
@param {Phaser.Group} dialogueGroup - the group to create the dialogues in
@constructor
*/
function ScriptManager(index, cyberspace, actManager, aiManager, effectManager, dialogueGroup)
{
	this.index = index;
	this.cyberspace = cyberspace;
	this.actManager = actManager;
	this.aiManager = aiManager;
	this.effectManager = effectManager;
	
	if(index < 0)	//tutorials
		this.cyber = game.globals.tutorialCybers[0-parseInt(index)];
	else this.cyber = game.globals.scenarioCybers[index];
	
	//read the script
	this.scripts = [];
	var scr;
	if(this.cyber.scripts)
	{
		for(s in this.cyber.scripts)
		{
			scr = this.cyber.scripts[s];
			//wrong round number
			if(scr.round == NaN || scr.round <= 0)
			{
				if(index<0)
					var errorMessage = "Error! Inside tutorial"+(0-parseInt(index))+"_cyber.json, under the element of \"script\", property \"round\" takes a non-positive value: \""+scr.round+"\".";
				else var errorMessage = "Error! Inside scenario"+index+"_cyber.json, under the element of \"script\", property \"round\" takes a non-positive value: \""+scr.round+"\".";
				game.state.start('error', true, false, errorMessage);
			}
			var object = new Object();
			if(scr.dialogues)
				object.dialogues = scr.dialogues;
			if(scr.newActs)
				object.newActs = scr.newActs;
			if(scr.shouldApply)
				object.shouldApply = scr.shouldApply;
			this.scripts[scr.round] = object;
		}
		this.multimedia = new MultimediaText(450, 420, 1, dialogueGroup, this.dismissDialogue, this);
	}
}

/**
Call back function when a new round starts.
Will show dialogues or unlock acts if there is a script for the round
*/
ScriptManager.prototype.checkScript = function(round)
{
	var id;
	var act;
	if(!this.scripts)	//no scripts
		return;
	//round specific script specified
	if(this.scripts[round])
	{
		if(this.scripts[round].dialogues)
		{
			game.globals.audioManager.notice();
			//which dialogue of the round is been displayed
			this.dialogueIndex = 0;
			//the dialogues of the current round
			this.roundDialogues = this.scripts[round].dialogues;
			this.showDialogue(this.roundDialogues[this.dialogueIndex]);		
		}
		if(this.scripts[round].newActs)
		{
			//create acts for both characters
			for(var role in [0, 1])
				for(var a in this.scripts[round].newActs[role])
				{
					id = this.actManager.name2id(role, this.scripts[round].newActs[role][a]);
					if(id == -1)
					{
						if(this.index < 0)
							var errorMessage = "Error! The act \"" + this.scripts[round].newActs[role][a] + "\" to be unlocked in tutorial (tutorial " + 0-parseInt(this.index) + ") is not defined. Check the tutorial file!";
						else var errorMessage = "Error! The act \"" + this.scripts[round].newActs[role][a] + "\" to be unlocked in scenario (scenario " + this.index + ") is not defined. Check the scenario file!";
						game.state.start('error', true, false, errorMessage);
					}
					this.actManager.unlockAct(role, id);
				}
			//update display
			this.cyberspace.updateActs(0);
			if(this.aiManager)
				//try to activate some action patterns for the AI
				this.aiManager.activatePatterns();
		}
	}
};
/**
Show a single dialogue (one speaker)(name and portrait don't change)
@param {Object} dialogueObj - a single person dialogue
*/
ScriptManager.prototype.showDialogue = function(dialogueObj)
{
	this.name = dialogueObj.name;
	this.portrait = dialogueObj.portrait;
	this.texts = dialogueObj.dialogue.split("^");
	this.focusing = dialogueObj.focusing;	//optional
	this.currentPage = 0;
	
	this.multimedia.dynamicTextWithPortrait(this.texts[0], this.portrait, this.name);
	//try to record the dialogue in Memory
	var obj = {name: this.name,
				portrait: this.portrait,
				texts: this.texts};
	game.globals.memory.addDialogue(obj);
	//try to start focusing animation
	if(this.focusing)
		this.effectManager.focusOn(this.focusing[0],this.focusing[1],this.focusing[2],this.focusing[3]);
};
/**
When player click on the dialogue.
The dialogue may go to the next page, the dialogue box may be dismissed
*/
ScriptManager.prototype.dismissDialogue = function()
{
	this.currentPage++;
	if(this.currentPage < this.texts.length)	//more pages
		this.multimedia.dynamicTextWithPortrait(this.texts[this.currentPage], this.portrait, this.name);
	else 	//page exhausted
	{
		//stop focusing animation
		this.effectManager.focusOff();
		
		this.dialogueIndex++;
		//continue with the next dialogue (e.g. from the next speaker)
		if(this.dialogueIndex < this.roundDialogues.length)
			this.showDialogue(this.roundDialogues[this.dialogueIndex]);
		else this.multimedia.hideDialogue();
	}
};

/**
return the property shouldApply of scripts for the current round
@param {int} round - the round that the player is trying to end
@returns {Array} - the property shouldApply for the current round. It's and array of act names for those acts that the player should apply in this round.
*/
ScriptManager.prototype.shouldApply = function(round)
{
	if(!this.scripts[round] || !this.scripts[round].shouldApply)
		return null;
	return this.scripts[round].shouldApply;
};

module.exports = ScriptManager;

var MultimediaText = require("../modules/MultimediaText");

function ScriptManager(index, cyberspace, actManager, aiManager, dialogueGroup)
{
	this.index = index;
	this.cyberspace = cyberspace;
	this.actManager = actManager;
	this.aiManager = aiManager;
	
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
				window.alert("Warning! The script for round \""+scr.round+"\" is not understandable.");
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
		this.multimedia = new MultimediaText(450, 420, 1, this.dismissDialogue, this, dialogueGroup);
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
					/*id = this.actManager.createAct.call(this.actManager, this.scripts[round].newActs[role][a], role);
					act = this.actManager.acts[role][id];
					//conver the new acts' prerequist act names to act ids
					for(var p in act.prerequists)
					{
						id = this.actManager.name2id(role, act.prerequists[p]);
						if(id == -1)
						{				
							var errorMessage = "Error! The prerequist \"" + act.prerequists[p] + "\" of act \"" + act.name + "\" activated for this scenario (scenario " + index + ") is wrong!";
							game.state.start('error', true, false, errorMessage);
						}
						act.prerequists[p] = id;
					}
					//convert new act's buff names to buff ids
					this.actManager.convertBuff(act.needSelfBuffs);
					this.actManager.convertBuff(act.needRivalBuffs);
					this.actManager.convertBuff(act.noSelfBuffs);
					this.actManager.convertBuff(act.noRivalBuffs);
					this.actManager.convertBuff(act.selfBuffs);
					this.actManager.convertBuff(act.rivalBuffs);
					this.actManager.convertBuff(act.cleanSelfBuffs);
					this.actManager.convertBuff(act.cleanRivalBuffs);*/
				}
			//update display
			this.cyberspace.updateActs(0);
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
	this.NPages = this.texts.length;
	this.currentPage = 0;
	
	this.multimedia.dynamicTextWithPortrait(this.texts[0], this.portrait, this.name);
};
ScriptManager.prototype.dismissDialogue = function()
{
	this.currentPage++;
	if(this.currentPage < this.texts.length)	//more pages
		this.multimedia.dynamicTextWithPortrait(this.texts[this.currentPage], this.portrait, this.name);
	else 	//page exhausted
	{
		this.dialogueIndex++;
		//continue with the next dialogue (e.g. from the next speacker)
		if(this.dialogueIndex < this.roundDialogues.length)
			this.showDialogue(this.roundDialogues[this.dialogueIndex]);
		else this.multimedia.hideDialogue();
	}
};

/**
If the script for this round prevents the user to end the turn without certain buffs, return the array of buffs. GameManager will work on it.
@param {int} round - the round that the player tries to end
@returns {Array} - the array of two arrays storing buffs that the intruder and the defender should have before ending the turn. null if there is no restriction. 
*/
/*ScriptManager.prototype.lockingBuffs = function(round)
{
	if(!this.scripts[round] || !this.scripts[round].lockingBuffs || this.scripts[round].lockingBuffs.length != 2)
		return null;
	return this.scripts[round].lockingBuffs;
};*/

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

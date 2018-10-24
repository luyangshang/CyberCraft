/**
@classdesc A class manages the NPCs in the hall state
One instance constructed for each hall
@param {int} index - the scenario index
@Constructor

NPCs[id].name						//NPC name
		.sprite						//sprite on the map
		.portrait					//big portrait used for dialogue
		.x							//x coordinate on the map
		.y							//y coordinate on the map
		.speechs[s].speech			//the speech at state s
				.prerequists[p].npc			//the requirement on other npcs (denoted by id) before entering the state s
								.state		//the requirement on other npc's state before this npc enters steate s
		.currentState			//the current state of this npc (the state of his/her speech)
*/
function NPCManager(index)
{
	//create NPCs and their sprites
	
	this.NPCs = [];
	var npcSource;		//to speed up
	var npc;
	var n;
	var speech;
	var pre;
	var string;
	var id, targetId;
	
	if(index < 0)
		var global = game.globals.tutorialNPCs;
	else var global = game.globals.scenarioNPCs[index];
	//copy the field except for speeches, create a new property of currentState
	//currentState is updated immediately before the NPC is talked to
	for(n in global.NPCs)
	{
		npcSource = global.NPCs[n];
		npc = {"name": npcSource.name, 
			"sprite": npcSource.sprite, 
			"portrait": npcSource.portrait, 
			"x": npcSource.x, 
			"y": npcSource.y, 
			"speeches": [], 
			"currentState": -1};
		for(s in npcSource.speeches)
		{
			speech = {"speech": npcSource.speeches[s].speech, 
					"prerequists": []};
			npc.speeches.push(speech);
		}
		this.NPCs.push(npc);
	}
	//second round, fill prerequists, changing the "npc" field from npc names into npc ids
	for(n in this.NPCs)
	{
		npcSource = global.NPCs[n];
		for(s in npcSource.speeches)
			for(p in npcSource.speeches[s].prerequists)
			{
				//the name of the npc which will be converted into npc id
				string = npcSource.speeches[s].prerequists[p].npc;
				targetId = this.name2id(string);
				if(targetId == -1)
				{
					window.alert("Error! in the scenario file scenario" + index + "_NPCs.json, in the prerequists of the speeches, a reference to a npc name is not found!");
					exit(3);
				}
				else
				{
					pre = { "npc": targetId, 
								"state": npcSource.speeches[s].prerequists[p].state };
					this.NPCs[n].speeches[s].prerequists.push(pre);
				}
				/*pre = null;
				for(id in NPCs)
					if(this.NPCs[id].name == string)
					{
						pre = { npc: id, 
								state: npcSource.speeches[s].prerequists.state };
						break;
					}
				if(pre)
				{
					window.alert("Error! in the scenario file scenario" + scenarioIndex + "NPCs.json, in the prerequists of the speeches, a reference to a npc name is not found!");
					exit(3);
				}
				else this.NPCs[n].speeches[s].prerequists.push(pre);*/
			}
	}
}

/**
Convert the NPC name to NPC id
@returns {int} - the id of the NPC found, -1 for not found
*/
NPCManager.prototype.name2id = function(name)
{
	for(var i in this.NPCs)
		if(this.NPCs[i].name == name)
			return i;
	return -1;
};

/**
get the name of the NPC
@param {int} id - the id of the NPC
@returns {string} - the name of the NPC
*/
NPCManager.prototype.getName = function(id)
{
	return this.NPCs[id].name;
};
/**
get the portrait of the NPC
@param {int} id - the id of the NPC
@returns {string} - the key of the portrait of the NPC
*/
NPCManager.prototype.getPortrait = function(id)
{
	return this.NPCs[id].portrait;
};

/**
Called when talking to a NPC
@param {int} id -  the id/index of the NPC that is talked to
@Returns - the speech when the NPC is at this state
*/
NPCManager.prototype.retrieveSpeech = function(id)
{
	var state = this.updateSpeech(id);
	return this.NPCs[id].speeches[state].speech;
};

/**
Private function
Check if the speech prerequists have fullfiled. If so, the NPC's speech state will advance to the next one
Also return the current speech state 
@param {int} id - the id (also the index) of the NPC the player is  talking to
*/
NPCManager.prototype.updateSpeech = function(id)
{
	var state = this.NPCs[id].currentState + 1;		//the potential future state
	var pre = [];		//buffers the prerequists of the concerned speech state
	var targetId;		//the id of the NPC whose state is checked
	var fullfiled;		//a boolean flage to check if all the update prerequists are fullfiled
	if(state < this.NPCs[id].speeches.length)		//if this is not the last speech
	{
		fulfilled = true;
		//prerequists is always defined, even if not specified in file
		pre = this.NPCs[id].speeches[state].prerequists;
		for(p in pre)	//check each prerequists
		{
			targetId = pre[p].npc;
			//console.log("NPC["+id+"] want NPC ["+targetId+"] have state "+ pre[p].state+" but is"+this.NPCs[targetId].currentState);				///
			if(this.NPCs[targetId].currentState < pre[p].state)
			{	fulfilled = false;
			}
		}
		if(fulfilled == true)
		{
			this.NPCs[id].currentState = state;
			return state;
		}
	}
	/*other situations (prerequist not fulfilled or
	already the last piece of speech, just not increament*/
	return state - 1;
};
module.exports = NPCManager;
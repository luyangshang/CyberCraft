/** 
@classdesc A class managing adding or removing buffs as well as the remaining length of the buffs.
The real functionalities of the buffs are managed by acts manager.
@param {int} scenarioIndex - the scenario number
@constructor - it also sets the initial buffs
*/
function BuffManager(scenarioIndex, messager)
{
	this.scenarioIndex = scenarioIndex;
	this.messager = messager;
	if(scenarioIndex < 0)	//tutorials
		this.cyber = game.globals.tutorialCybers[0-scenarioIndex];
	else //scenarios
		this.cyber = game.globals.scenarioCybers[scenarioIndex];
	
	//an array of buff names
	this.buffNames = [];		//the index is the buff id
	//an array of buff descriptions 
	this.buffDesc = [];	//the index is the buff id
	//an array of extra server capacity provided by each buffs.
	this.buffCapacity = [];
	//an array of buff upkeeps (resource cost per round. Negative value for obtaining resource per round)
	this.buffUpkeep = [];
	//the ratio of reduction to DoS attack effectiveness
	this.dosResistance = [];
	//an array storing the buff remaining lengths. 0 for the intruder, 1 for the defender
	this.buffLengths = [[],[]];
	//the spam request related to each buff. This array doesn't have intruder part
	this.buffSpam = [];
	
	
	//set buffNames, buffDesc and buffUpkeep
	this.createStatic();
	var buffSize = this.buffNames.length;
	//set buffLengths
	for(i=0; i< buffSize; i++)	//start with no buff (0 length)
	{	
		this.buffLengths[0][i] = 0;
		this.buffLengths[1][i] = 0;
	}
		//buffs initially enforced
	if(this.cyber.initialBuffs != undefined)
	{
		this.createInitialBuffs(this.cyber.initialBuffs[0], 0);
		this.createInitialBuffs(this.cyber.initialBuffs[1], 1);
	}
	
	//set buffSpam
	for(i=0; i< buffSize; i++)	//start with no spam
		this.buffSpam[i] = 0;
}
/**
Create and initializes the arrays for the information of the buffs: buffNames, buffDesc, buffCapacity, buffUpkeep, dosResistance, buffLength. However, buffSpam will be filled by the act dynamically at run time.
*/
BuffManager.prototype.createStatic = function()
{
	
	var found;
	var id, cyb, com;
	var name;
	var num;
	//buffs defined in the common acts file
	for(cyb in this.cyber.commonBuffs)
	{
		/*buff will be added even if the definition is absent. It will give a warning though*/
		name = this.cyber.commonBuffs[cyb];
		id = this.buffNames.push(name);
		id--;	//id of the buff just added
		found = false;
		//check buff definition in common act file
		for(com in game.globals.commonActs.buffs)
		{
			if(name == game.globals.commonActs.buffs[com].name)
			{
				//buff description
				this.buffDesc[id] = game.globals.commonActs.buffs[com].desc;
				//buff capacity
				if(num = game.globals.commonActs.buffs[com].capacity)
					this.buffCapacity[id] = num;
				else this.buffCapacity[id] = 0;
				//buff upkeep
				if(num = game.globals.commonActs.buffs[com].upkeep)
					this.buffUpkeep[id] = num;
				else this.buffUpkeep[id] = 0;
				//DoS resistance
				if(num = game.globals.commonActs.buffs[com].dosResistance)
					this.dosResistance[id] = num;
				else this.dosResistance[id] = 0;
				
				found = true;
				break;
			}
		}
		if(!found)
		{	
			var errorMessage = "Error! The buff \""+name+"\" selected for this scenario (scenario " + this.scenarioIndex + ") is not defined!";
			game.state.start('error', true, false, errorMessage);
			/*//warn for description, but not for other properties
			window.alert("Warning! The buff \""+name+"\" activated for this scenario (scenario " + this.scenarioIndex + ") misses description"
			);
			this.buffDesc[id] = "";*/
		}
	}
	//buffs defined in the cyber file
	for(cyb in this.cyber.buffs)
	{
		name = this.cyber.buffs[cyb].name;
		id = this.buffNames.push(name);
		id--;	//id of the buff just added
		//buff description
		if(this.cyber.buffs[cyb].desc != undefined)
			this.buffDesc[id] = this.cyber.buffs[cyb].desc;
		else
		{	//warn for description, but not for other properties
			this.messager.createMessage("Warning! The buff \""+name+"\" activated for this scenario (scenario" + this.scenarioIndex + ") misses description"
			);
			this.buffDesc[id] = "";
		}
		//buff capacity
		if(num = game.globals.commonActs.buffs[com].capacity)
			this.buffCapacity[id] = num;
		else this.buffCapacity[id] = 0;
		//buff upkeep
		if(num = this.cyber.buffs[cyb].upkeep)
			this.buffUpkeep[id] = num;
		else this.buffUpkeep[id] = 0;
		//DoS resistance
		if(num = this.cyber.buffs[cyb].dosResistance)
			this.dosResistance[id] = num;
		else this.dosResistance[id] = 0;
	}
};

/**
private function
To create initial buffs for either the intruder or the defender
@param {Object} initialBuffs - the buffs that the target character is to have at the start of the game
@param {int} role - 0 for the intruder, 1 for the defender
*/
BuffManager.prototype.createInitialBuffs = function(initialBuffs, role)
{
	var buffId;
	//set initial buffs
	for(ib in initialBuffs)
	{
		buffId = this.name2id(initialBuffs[ib].name);
		if(buffId == -1)
		{
			this.messager.createMessage("Warning! An initial buff activate for this scenario is not defined in scenario" + this.scenarioIndex + "_cyber.json or common_acts.json! This buff is not initially enforced!\n Recheck scenario"+ this.scenarioIndex + "_cyber.json");
			continue;
		}
		if(initialBuffs[ib].length == 0 || initialBuffs[ib].length < -1)
		{
			this.messager.createMessage("Warning! The initial buff "+ this.initialBuff.name + " has wrong length! \n this buff is not intially enforced!\n Recheck scenario" + this.scenarioIndex + "_cyber.json, choosing -1 for inifite length, and a positive integer for finite length");
			continue;
		}
		//give the initial buff
		this.addBuff(buffId, initialBuffs[ib].length, role);
	}
};
/* ----------------- buff creation finishes here --------------- */

/**
Add new buff if not yet exisit (0 length); overwrite buff length if the new buff lasts longer
@param {int} buffId - the id of the buff
@param {int} length - the length of the buff to be added
@param {int} role - the character on who the buff is to be added. 0 for the intruder, 1 for the defender
*/
BuffManager.prototype.addBuff = function(buffId, length, role)
{
	//do nothing if the old buff have an infinite length
	if(this.buffLengths[role][buffId] == -1)
			return;
	//do nothing if the old buff have an higher remaining length
	if(this.buffLengths[role][buffId] < length || length == -1)
		this.buffLengths[role][buffId] = length;
};

/**
remove the specific buff
@param {int} buffId - buffId of the buff (already checked)
@param {int} role - 0 for intruder, 1 fot defender
*/
BuffManager.prototype.removeBuff = function(buffId, role)
{
	this.buffLengths[role][buffId] = 0;
};

/**
return true if the character has a specified buff
@param {int} buffId - the id of the buff to be checked
@param {int} role - 0 for the intruder, 1 for the defender
@returns - whether the character have the buff. If the buffId points to a buff not defined, also return false
*/
BuffManager.prototype.hasBuff = function(buffId, role)
{
	if(buffId > this.buffLengths[0].length)
		return false;
	return this.buffLengths[role][buffId] != 0;
};

/**
Check if the character is offline (has buff "Offline")
@param {int} role - 0: intruder, 1: defender
@returns - true: offline, false: connected
*/
BuffManager.prototype.offline = function(role)
{
	var id = this.name2id("Offline");
	if(id == -1)
		return false;
	return this.hasBuff(id, role);
};

/**
return a character's complete buff array
@param {int} role - 0 for the intruder, 1 for the defender
@returns {Array} - the array of all buff remaining lengths of that character
*/
BuffManager.prototype.getLengths = function(role)
{
	return this.buffLengths[role];
};

/**
Return array of the id of a character's existing buffs
@param {int} role - 0 for the intruder, 1 for the defender
@returns {Array} - the array of buff ids of that character (non zero buffs only)
*/
BuffManager.prototype.getExistingBuffs = function(role)
{
	var existing = [];
	for(var i in this.buffLengths[role])
		if(this.buffLengths[role][i])
			existing.push(i);
	return existing;
};

/**
Reduce the buff lengths at the end of a round
Expired buff will get 0 length
*/
BuffManager.prototype.decayBuff = function()
{
	var length = this.buffLengths[1].length;
	var i;
	for(i =0; i< length; i++)
	{
		if(this.buffLengths[0][i] > 0)
			this.buffLengths[0][i]--;
		if(this.buffLengths[1][i] > 0)
		{
			this.buffLengths[1][i]--;
			//reset the spam requests when the buff expires
			if(!this.buffLengths[1][i] && this.buffSpam[i])
				this.buffSpam[i] = 0;
		}
	}
};

/**
Return the extra server capacity granted from the buff
@param {int} id - the buff id
@returns - the extra capacity brought by this buff, independent of whether this buff exist
*/
BuffManager.prototype.getCapacity = function(id)
{
	return this.buffCapacity[id];
};

/**
Return the total extra server capacity bestowed by buffs
@returns - the total extra capacity
*/
BuffManager.prototype.totalCapacity = function()
{
	var capacity = 0;
	for(g in this.buffLengths[1])
		if(this.buffLengths[1][g] != 0 && this.buffCapacity[g] !=  0)
			capacity += parseInt(this.buffCapacity[g]);
	return capacity;	
};

/**
Return the upkeep for a certain buff
@param {int} id - the buff id
@returns {int} - the upkeep of the buff
*/
BuffManager.prototype.getUpkeep = function(id)
{
	return this.buffUpkeep[id];
};
/**
Get the total upkeep (lose to resource) from buffs for the character
@returns - the upkeep
*/
BuffManager.prototype.totalUpkeep = function()
{
	var upkeep = 0;
	for(g in this.buffLengths[1])
		if(this.buffLengths[1][g] != 0 && this.buffUpkeep[g] !=  0)
			upkeep += parseInt(this.buffUpkeep[g]);
	return upkeep;		
};

/**
Set the number for spam requests generated by a certain buff
The amount comes from act, rather than buff
@param {int} id - the id of the buff generating spam requests
@param {int} amount - the amount for spam requests
*/
BuffManager.prototype.setSpam = function(id, amount)
{
	this.buffSpam[id] = amount;
};
/**
Get the number for spam requests generated by a certain buff
@param {int} id - the id of the buff generating spam requests
@returns {int} - the amount for spam requests generated from this buff
*/
BuffManager.prototype.getSpam = function(id)
{
	return this.buffSpam[id];
};
/**
Get the total number for spam requests generated by the buffs
@returns {int} - total number of spam requests generated
*/
BuffManager.prototype.totalSpam = function()
{
	var spamRequests = 0;
	for(l in this.buffLengths[1])
		if(this.buffLengths[1][l] && this.buffSpam[l])
			spamRequests += this.buffSpam[l];
	return spamRequests;	
};

/**
Get resistance to DoS attack provided by a certain buff
@param {int} id - the id of the buff generating spam requests
@returns {int} - resistance to DoS attack provided by this buff
*/
BuffManager.prototype.getResistance = function(id)
{
	return this.dosResistance[id];
};
/**
Calculate the overall factor for DoS attack from the DoS resistance provided by the buffs. Multiple buffs results in each factor multiplied.
@returns {int} - total susceptance to DoS attack
*/
BuffManager.prototype.totalDosSusceptance = function()
{
	var susceptance = 1;
	for(l in this.buffLengths[1])
		if(this.buffLengths[1][l] && this.dosResistance[l])
			susceptance *= (1-this.dosResistance[l]);
	return susceptance;	
};

/**
converts buff name(string) to buff id(int)
@param {string} name - buff name
ret: -1 for not found
*/
BuffManager.prototype.name2id = function(name)
{
	for(var id=0; id<this.buffNames.length; id++)
		if(this.buffNames[id] == name)
			return id;
	return -1;
};

/**
search the buff id(int) for buff name(string)
@param {int} id - buff id
*/
BuffManager.prototype.id2name = function(id)
{
	return this.buffNames[id];
};

/**
get the buff description
@param {int} id - the buff id
*/
BuffManager.prototype.id2desc = function(id)
{
	return this.buffDesc[id];
};
module.exports = BuffManager;
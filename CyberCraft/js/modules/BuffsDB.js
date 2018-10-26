/**
@classdesc A class storing the static information of the buffs (description) activated in a certain scenariol. It stores buff description, and it does the mapping between buff names and buff ids.
@param {int} scenarioIndex - the scenariol number currently concerned
@constructor
*/
function BuffsDB(scenarioIndex)
{
	//constructs the array buffNames, as well as the array buffDescriptions 
	this.buffNames = [];		//the index is the buff id
	this.buffDesc = [];	//the index is the buff id
	var found;
	var id, cyb, com;
	var name;
	//buffs defined in the common acts file
	for(cyb in game.globals.scenarioCybers[scenarioIndex].commonBuffs)
	{
		/*buff will be added even if the definition is absent. It will give a warning though*/
		name = game.globals.scenarioCybers[scenarioIndex].commonBuffs[cyb];
		id = this.buffNames.push(name);
		id--;	//id of the buff just added
		found = false;
		//check buff definition in common act file
		for(com in game.globals.commonActs.buffs)
		{
			if(name == game.globals.commonActs.buffs[com].name)
			{
				this.buffDesc[id] = game.globals.commonActs.buffs[com].desc;
				found = true;
				break;
			}
		}
		if(!found)
		{
		window.alert("Warning! The buff \""+name+"\" activated for this scenariol (scenario" + scenarioIndex + ") misses description"
			);
			this.buffDesc[id] = "";
		}
	}
	//buffs defined in the cyber file
	for(cyb in game.globals.scenarioCybers[scenarioIndex].buffs)
	{
		name = game.globals.scenarioCybers[scenarioIndex].buffs[cyb].name;
		id = this.buffNames.push(name);
		id--;	//id of the buff just added
		if(game.globals.scenarioCybers[scenarioIndex].buffs[cyb].desc != undefined)
			this.buffDesc[id] = game.globals.scenarioCybers[scenarioIndex].buffs[cyb].desc;
		else this.buffDesc[id] = "";
	}
}

/**
get the number of buffs enabled in this scenariol
*/
BuffsDB.prototype.getSize = function()
{
	return this.buffNames.length;
}

/**
converts buff name(string) to buff id(int)
@param {string} name - buff name
ret: -1 for not found
*/
BuffsDB.prototype.name2id = function(name)
{
	for(id=0; id<this.buffNames.length; id++)
		if(this.buffNames[id]==name)
			return id;
	return -1;
}

/**
search the buff id(int) for buff name(string)
@param {int} id - buff id
*/
BuffsDB.prototype.id2name = function(id)
{
	return this.buffNames[id];
}

/**
get the buff description
@param {int} id - the buff id
*/
BuffsDB.prototype.id2desc = function(id)
{
	return this.buffDesc[id];
}
module.exports = BuffsDB;
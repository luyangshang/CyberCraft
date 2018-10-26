var Act = require("./Act.js");
/**
@classdesc A class storing acts enabled in a certain scenario for one character. It stores many acts information, and it does the mapping between act names and act ids.
@param {int} scenarioIndex - the scenario number currently concerned
@param (Boolean) offensive - true if it builds for the intruder; false if it builds for the defneder
@constructor
*/
function ActsDB(scenarioIndex)
{
	this.acts = [[],[]];			//the second-level index is the act id
	
	this.createActs(scenarioIndex, 0);	//0 for offensive acts
	this.createActs(scenarioIndex, 1);	//1 for defensive acts
}
/**
private function
Create the acts for either the intruder or the defender
@param {int} scenarioIndex - the scenario number
@param {int} def - 0 for intruder, 1 for defender
*/
ActsDB.prototype.createActs(scenarioIndex, def)
{
	var found;
	var name;
	var cyb;
	var com
	
	//acts defined in commonActs.json
	for(cyb in game.globals.scenarioCyber[scenarioIndex].commonActs[def])
	{
		found = false;
		name = game.globals.scenarioSettings[scenarioIndex].commonActs[def][cyb];	//just to speed up the indexing

		//check act definition in commonActs.json
		for(com in game.globals.commonActs.acts[def])
			if(name == game.globals.genericActs.acts[def][com].name)
			{
				this.createAct(game.globals.genericActs.acts[def][com], def);
				found = true;
				break;
			}
		if(!found)
		{
			window.alert("Error! The act " + name + " activated for this scenario (scenario " + scenarioIndex + ") is not defined in common_acts.json!");
			exit(2);
		}
	}
	//acts defined in cyber file
	for(cyb in game.globals.scenarioCyber[scenarioIndex].acts[def])
		this.createAct(game.globals.scenarioCyber[scenarioIndex].acts[def][cyb], def);
}

/** private function
Create a single act
@param {Acts} actSource
@param {int} def - 0 for offensive acts, 1 for defensive acts
*/
ActsDB.prototype.createAct(actSource, def)
{
	var name, prerequists =[];
	var	learningCost = 0;
	var desc, requireSelfBuffs = [], requireRivalBuffs=[];
	var cost, successRate = 1.0, selfBuffs=[], rivalBuffs=[];
	var buffLength, bonus = 0, modifier = "";
	//set the act properties
	if(actSource.name == undefined)
	{
		window.alert("Error! An act name is missing\n recheck scenarioX_cyber.json");
		return 1;
	}
	name = actSource.name;
	if(actSource.prerequists != undefined)
		prerequists = actSource.prerequists;
	if(actSource.learningCost != undefined)
		learningCost = actSource.learningCost;
	if(actSource.desc != undefined)
		desc = actSource.desc;
	if(actSource.requireSelfBuffs != undefined)
		requireSelfBuffs = actSource.requireSelfBuffs;
	if(actSource.requireRivalBuffs != undefined)
		requireRivalBuffs = actSource.requireRivalBuffs;
	if(actSource.cost == undefined)
	{
		window.alert("Error! The act "+name+" is missing cost\n recheck scenarioX_cyber.json or common_acts.json");
		return 1;
	}
	cost = actSource.cost;
	if(actSource.successRate != undefined)
		successRate = actSource.successRate;
	if(actSource.selfBuffs != undefined)
		selfBuffs = actSource.selfBuffs;
	if(actSource.rivalBuffs != undefined)
		rivalBuffs = actSource.rivalBuffs;
	if(actSource.buffLength != undefined)
		buffLength = actSource.buffLength;
	else if(selfBuffs!= undefined || rivalBuffs!= undefined)
	{
		window.alert("Error! The act "+name+" is missing buff length\n recheck scenarioX_cyber.json or common_acts.json");
		return 1;
	}
	if(actSource.bonus != undefined)
		bonus = actSource.bonus;
	if(actSource.modifier != undefined)
		modifier = actSource.modifier;
	//finally create the act
	this.acts[def].push(new Act(name,prerequists,learningCost,desc,requireSelfBuffs,requireRivalBuffs,cost,successRate,selfBuffs,rivalBuffs,buffLength,bonus,modifier));
}

/**
get the total number of acts enabled in this scenario
*/
ActsDB.getSize()
{
	return this.acts[0].length + this.acts[1].length;
}

/**
retrieve the act instance with the act type and act id(int)
@param {int} def - 0 for offensive act, 1 for defensive act
@param {int} id - act id
*/
ActsDB.prototype.getAct(def, id)
{
	return acts[def][id];
}

/**
converts act name(string) to act id(int)
@param {int} def - 0 for offensive act, 1 for defensive act
@param {string} name - act name
@returns: -1 for not found
*/
ActsDB.prototype.name2id(def, name)
{
	for(id=0; id<acts[def].length; id++)
		if(this.acts[def][id].name == name)
			return id;
	return -1;
}

module.exports = ActsDB;
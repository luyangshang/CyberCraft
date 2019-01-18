var Act = require("./Act");
var LogEntry = require("./LogEntry");
/**
@classdesc A class storing the acts activated in the scenario. It also managing the learning and the applying of the acts.
N.B. All the relationship with other acts/buffs will use id, rather than the original name string.
@param {int} index - the scenario number
@param {boolean} doublePlayer - true: double player mode; false: single player mode
@param {GameManager} gameManager - the reference to the character manager
@param {BuffManager} buffManager - the reference to the buff manager
@param {Object} logs - the reference to the attack/defense log. Actions will be applied by this manager, and logged into logs
@param {int} playerRole - the role of the player. 0: intruder, 1: defender. This is used to see if the act is performed by the player or the AI, to avoid displaying warning message for the AI.
@constructor
*/
function ActManager(index, doublePlayer, buffManager, effectManager, messager, logs, playerRole)
{
	this.index = index;
	this.doublePlayer = doublePlayer;
	this.buffManager = buffManager;
	this.effectManager = effectManager;
	this.messager = messager;
	this.logs = logs;
	this.playerRole = playerRole;
		
	this.acts = [[],[]];			//the second-level index is the act id
	
	if(index < 0)	//tutorials
		this.cyber = game.globals.tutorialCybers[0-parseInt(index)];
	else this.cyber = game.globals.scenarioCybers[index];
	
	this.createActs(index, 0);	//0 for offensive acts
	this.createActs(index, 1);	//1 for defensive acts
}
ActManager.prototype.setGameManager = function(gameManager)
{
	this.gameManager = gameManager;
};
/**
private function
Create the acts for either the intruder or the defender
@param {int} index - the scenario number
@param {int} role - 0 for intruder, 1 for defender
*/
ActManager.prototype.createActs = function(index, role)
{
	var found;
	var name;
	var cyb,com;
	var a,p;
	var act;
	var id;
	
	//acts defined in commonActs.json
	for(cyb in this.cyber.commonActs[role])
	{
		found = false;
		name = this.cyber.commonActs[role][cyb];	//just to speed up the indexing

		//check act definition in commonActs.json
		for(com in game.globals.commonActs.acts[role])
			if(name == game.globals.commonActs.acts[role][com].name)
			{
				this.createAct(game.globals.commonActs.acts[role][com], role);
				found = true;
				break;
			}
		if(!found)
		{
			var errorMessage = "Error! The act \"" + name + "\" activated for this scenario (scenario " + index + ") is not defined in common_acts.json!";
			game.state.start('error', true, false, errorMessage);
		}
	}
	//acts defined in cyber file
	for(cyb in this.cyber.acts[role])
		this.createAct(this.cyber.acts[role][cyb], role);
	
	//the second round. change the prerequisites, needSelfBuffs, needRivalBuffs, noRivalBuffs, selBuffs, rivalBuffs from name strings into ids.
	for(a in this.acts[role])
	{
		act = this.acts[role][a];	//just to speed up
		//prerequisites
		var array = [];
		for(p in act.prerequisites)
		{
			id = this.name2id(role, act.prerequisites[p]);
			if(id == -1)
			{				
				var errorMessage = "Error! The prerequist \"" + act.prerequisites[p] + "\" of act \"" + act.name + "\" activated for this scenario (scenario " + index + ") is wrong!";
				game.state.start('error', true, false, errorMessage);
			}
			array.push(id);
		}
		act.prerequisites = array;	//name array overwritten by id array
		
		this.convertBuff(act.needSelfBuffs);
		this.convertBuff(act.needRivalBuffs);
		this.convertBuff(act.noSelfBuffs);
		this.convertBuff(act.noRivalBuffs);
		this.convertBuff(act.selfBuffs);
		this.convertBuff(act.rivalBuffs);
		this.convertBuff(act.cleanSelfBuffs);
		this.convertBuff(act.cleanRivalBuffs);
	}
};
/** private function
Create a single act. This function provides some checkings and default values
@param {Act} actSource - the original act information from the json files
@param {int} role - 0 for offensive acts, 1 for defensive acts
@returns {int} - the id of the newly created act
*/
ActManager.prototype.createAct = function(actSource, role)
{
	var name, prerequisites =[];
	var	learningCost = 0;
	var desc, needSelfBuffs = [], needRivalBuffs=[], noSelfBuffs = [], noRivalBuffs = [];
	var cost, successRate = 1.0;
	var	selfBuffs=[], cleanSelfBuffs=[], rivalBuffs=[], cleanRivalBuffs=[];
	var buffLength = -1, bonus = 0;
	var superfluousRequests;
	var modifier = "";
	var learnt=false, unlocked=true;
	//set the act properties
	if(actSource.name == undefined)
	{
		var errorMessage = "Error! An act name is missing\n Recheck scenarioX_cyber.json";
		game.state.start('error', true, false, errorMessage);
	}
	name = actSource.name;
	if(actSource.prerequisites != undefined)
		prerequisites = actSource.prerequisites;
	if(actSource.learningCost != undefined)
		learningCost = actSource.learningCost;
	if(actSource.desc != undefined)
		desc = actSource.desc;
	if(actSource.needSelfBuffs != undefined)
		needSelfBuffs = actSource.needSelfBuffs;
	if(actSource.needRivalBuffs != undefined)
		needRivalBuffs = actSource.needRivalBuffs;
	if(actSource.noSelfBuffs != undefined)
		noSelfBuffs = actSource.noSelfBuffs;
	if(actSource.noRivalBuffs != undefined)
		noRivalBuffs = actSource.noRivalBuffs;
	if(actSource.cost == undefined)
	{
		var errorMessage = "Error! The act \""+name+"\" misses cost\n Recheck scenarioX_cyber.json or common_acts.json";
		game.state.start('error', true, false, errorMessage);
	}
	cost = actSource.cost;
	if(actSource.successRate != undefined)
		successRate = actSource.successRate;
	if(actSource.selfBuffs != undefined)
		selfBuffs = actSource.selfBuffs;
	if(actSource.rivalBuffs != undefined)
		rivalBuffs = actSource.rivalBuffs;
	if(actSource.cleanSelfBuffs != undefined)
		cleanSelfBuffs = actSource.cleanSelfBuffs;
	if(actSource.cleanRivalBuffs != undefined)
		cleanRivalBuffs = actSource.cleanRivalBuffs;
	if(actSource.buffLength != undefined && actSource.buffLength > 0)
		buffLength = actSource.buffLength;
	if(actSource.bonus != undefined && actSource.bonus > 0)
		bonus = actSource.bonus;
	if(actSource.superfluousRequests != undefined)
		superfluousRequests = actSource.superfluousRequests;
	if(actSource.modifier != undefined)
		modifier = actSource.modifier;
	if(actSource.learnt != undefined)
		learnt = actSource.learnt;
	if(actSource.unlocked != undefined)
		unlocked = actSource.unlocked;
	//finally create the act
	var id = this.acts[role].push(new Act(name,prerequisites,learningCost,desc,needSelfBuffs,needRivalBuffs,noSelfBuffs,noRivalBuffs,cost,successRate,selfBuffs,rivalBuffs,cleanSelfBuffs,cleanRivalBuffs,buffLength,bonus,superfluousRequests,modifier,learnt,unlocked));
	return --id;
};
/**
Convert in the act definition, from buff names to buff ids
*/
ActManager.prototype.convertBuff = function(array)
{
	var id;
	for(b in array)
	{
		id = this.buffManager.name2id(array[b]);
		if(id == -1)
		{
			if(this.index < 0)
			{
				var errorMessage = "Error! The buff \"" + array[b] + "\" related to an act in tutorial "+(0-parseInt(this.index))+" is not found!";
				game.state.start('error', true, false, errorMessage);
			}
			else
			{			
				var errorMessage = "Error! The buff \"" + array[b] + "\" related to an act in scenario "+this.index+" is not found!";
				game.state.start('error', true, false, errorMessage);
			}
		}
		array[b] = id;
	}
};
/* ------------------- act construction finishes here ----------------- */

/**
Converts act id(int) to act name(string)
@param {int} role - 0 for offensive act, 1 for defensive act
@param {int} id - the id of the act for this role
*/
ActManager.prototype.id2name = function(role, id)
{
	return this.acts[role][id].name;
};

/**
Converts act name(string) to act id(int) (also the index of the act)
@param {int} role - 0 for offensive act, 1 for defensive act
@param {string} name - act name
@returns: -1 for not found
*/
ActManager.prototype.name2id = function(role, name)
{
	for(id=0; id<this.acts[role].length; id++)
		if(this.acts[role][id].name == name)
			return id;
	return -1;
};

/**
Retrieve the act instance with the act type and act id(int)
@param {int} role - 0 for offensive act, 1 for defensive act
@param {int} id - act id
*/
ActManager.prototype.getAct = function(role, id)
{
	return this.acts[role][id];
};

/**
Check if the act specified by the act type and act id(int) is unlocked.
@param {int} role - 0 for offensive act, 1 for defensive act
@param {int} id - act id
@returns {boolean} - true: unlocked, false: locked
*/
ActManager.prototype.actUnlocked = function(role, id)
{
	return this.acts[role][id].unlocked;
};

/**
Unlock the act specified by the act type and act id(int).
This is expected to be invoked by the game script.
@param {int} role - 0 for offensive act, 1 for defensive act
@param {int} id - act id
*/
ActManager.prototype.unlockAct = function(role, id)
{
	return this.acts[role][id].unlocked = true;
};

/**
Return array of the id of a character's unlocked acts
@param {int} role - 0 for the intruder, 1 for the defender
@returns {Array} - the array of act ids of that character
*/
ActManager.prototype.getUnlockedActs = function(role)
{
	var unlocked = [];
	for(var i in this.acts[role])
		if(this.actUnlocked(role, i))
			unlocked.push(i);
	return unlocked;
};

/**
Check if the act is already learnt
*/
ActManager.prototype.actLearnt = function(role, id)
{
	return this.acts[role][id].learnt;
};

/**
When a character tries to learn an act
Checking managed here
@param {int} role - 0 for intruder, 1 for defender
@param {int} id - the id of the act
@returns {boolean} - false if the learning fails, true if the learning succeeds
*/
ActManager.prototype.learnAct = function(role, id)
{
	//catch all attempts to learn an act when the game has already ended
	if(this.gameManager.disableControl)
		return;
	
	var requiredId;
	var act = this.getAct(role, id);
	var prerequisites = act.prerequisites;
	//check resource
	if(act.learningCost > this.gameManager.getResource(role))
	{
		if(role == this.playerRole)
		{
			game.globals.audioManager.accessDenied();
			this.messager.createMessage("Not enough resource!");
		}
		return false;
	}
	//check prerequisites
	for(p in prerequisites)
	{
		//check if the required act is learnt
		if(!this.getAct(role, act.prerequisites[p]).learnt)
		{
			game.globals.audioManager.accessDenied();
			this.messager.createMessage("Prerequistes not met:\n" + this.id2name(role, act.prerequisites[p]));
			return false;
		}	
	}
	//all checks passed
	this.gameManager.consumeResource(role, act.learningCost);
	act.learnt = true;
	return true;
};

/**
When a character tries to apply an act
Checking managed here
@param {int} role - 0 for intruder, 1 for defender
@param {int} id - the id of the act
@param {int} round - the round number. To be used in attack log
@param returns {int} - 0 for unable to apply, 1 for failed, 2 for success
*/
ActManager.prototype.applyAct = function(role, id, round)
{
	//catch all attempts to apply an act when the game has already ended
	if(this.gameManager.disableControl)
		return;
	
	var act = this.getAct(role, id);
	var id;
	var b;
	//check learnt
	if(!act.learnt)
	{
		this.messager.createMessage("You should learn it first!");
		return 0;
	}
	if(act.cost == 0)
	{
		this.messager.createMessage("It's not supposed to be used");
		return 0;
	}
	//check resource
	if(act.cost > this.gameManager.getResource(role))
	{
		game.globals.audioManager.accessDenied();
		this.messager.createMessage("Not enough resource!");
		return 0;
	}
	//check self buff
	for(b in act.needSelfBuffs)
		if(!this.buffManager.hasBuff(act.needSelfBuffs[b], role))
		{
			if(this.doublePlayer || role == this.playerRole)
			{
				this.messager.createMessage("Cannot act. Self buff required: \n" + this.buffManager.id2name(act.needSelfBuffs[b]));
				game.globals.audioManager.accessDenied();
			}
			return 0;
		}
	for(b in act.noSelfBuffs)
		if(this.buffManager.hasBuff(act.noSelfBuffs[b], role))
		{
			if(this.doublePlayer || role == this.playerRole)
			{
				game.globals.audioManager.accessDenied();
				this.messager.createMessage("Cannot act. Hampered by self buff: \n" + this.buffManager.id2name(act.noSelfBuffs[b]));
			}
			return 0;
		}
	//animation
	this.effectManager.createWord(act.name, role, 2500);
			
//self condition fullfiled, the act will be applied
	this.gameManager.consumeResource(role, act.cost);
	//action log
	var statIndex = this.logs.push(new LogEntry(round, act.name));
	statIndex--;
	//check rival buffs
	var buffsReady = true;
	for(b in act.needRivalBuffs)	//check presence of rival buff
		if(!this.buffManager.hasBuff(act.needRivalBuffs[b], 1-role))
		{
			buffsReady = false;
			this.logs[statIndex].addNoBuffHurdle(this.buffManager.id2name(act.needRivalBuffs[b]));
		}
	for(b in act.noRivalBuffs)		//check absence of rival buff
		if(this.buffManager.hasBuff(act.noRivalBuffs[b], 1-role))
		{
			buffsReady = false;
			this.logs[statIndex].addBuffHurdle(this.buffManager.id2name(act.noRivalBuffs[b]));
		}
	if(!buffsReady)
	{
		//defended animation
		this.effectManager.createActEffect(2);
		return 1;
	}
	//successRate
	if(act.successRate != 1.0)
	{
		if(Math.random() >= act.successRate)
		{
			this.logs[statIndex].addNoLuck();
			//unlucky animation
			this.effectManager.createActEffect(3);
			return 1;
		}
	}
	if(role == 1)	//defender animation
		this.effectManager.createActEffect(0);
	else 			//intruder animation
	{
		if(!act.rivalBuffs.length && !act.cleanRivalBuffs.length)
			this.effectManager.createActEffect(1);	//intruder successful strengthen animation
		else if(act.bonus)
				this.effectManager.createActEffect(6, act.bonus);	//intruder compromise assets animation
			/*else if(act.rivalBuffs && act.rivalBuffs[0] == this.buffManager.name2id("Denial of service attacked"))
					this.effectManager.createActEffect(6, 0);	//dos category use compromise assets animation*/
				else if(act.cleanRivalBuffs.length)
						this.effectManager.createActEffect(4);	//intruder break defence animation
					else this.effectManager.createActEffect(5);	//intruder enforce buff animation
	}
			
//act successful
	//enforce buffs
	for(b in act.selfBuffs)
	{
		this.buffManager.addBuff(act.selfBuffs[b], act.buffLength, role);
	}
	for(b in act.cleanSelfBuffs)
	{
		this.buffManager.removeBuff(act.cleanSelfBuffs[b], role);
	}
	for(b in act.rivalBuffs)
	{
		this.buffManager.addBuff(act.rivalBuffs[b], act.buffLength, 1-role);
		//DoS attack expects single rivalBuff!
		if(act.superfluousRequests)
			this.buffManager.setSuperfluous(act.rivalBuffs[b], act.superfluousRequests);
	}
	for(b in act.cleanRivalBuffs)
	{
		this.buffManager.removeBuff(act.cleanRivalBuffs[b], 1-role);
	}
	//receive bonus and inflict damage
	if(act.bonus != 0)
	{
		this.gameManager.obtainResource(role, act.bonus);
		//if an defender did something to impairing the assets, the cyber file is wrong
		if(!role)
		{
			this.gameManager.loseAssets(act.bonus);
		}
	}
	//modifier
	if(act.modifier)
	{
		var modifierArray = act.modifier.split(";");
		for(m in modifierArray)
		{
			//format: <role>:<act name>:<property>:<operant>:<amount>
			if(/^[01]:[^:]*:[^:]*:["+""-""*""/""="]:[0-9]+\.?[0-9]*$/.test(modifierArray[m]) == false)
			{
				this.messager.createMessage("modifier format wrong!");
				break;
			}
			var args = modifierArray[m].split(":");
			var role2 = args[0];
			id = this.name2id(role2, args[1]);
			if(id == -1)		//act name
			{
				this.messager.createMessage("modifier specifies wrong act name!");
				break;
			}
			var property = args[2];
			if(this.acts[role2][id][property] == undefined)	//property
			{
				this.messager.createMessage("modifier specifies wrong property!");
				break;
			}
			switch(args[3])
			{
				case '+': this.acts[role2][id][property] += parseInt(args[4]);
					break;
				case '-': this.acts[role2][id][property] -= parseInt(args[4]);
					break;
				case '*': this.acts[role2][id][property] *= parseFloat(args[4]);
					break;
				case '/': this.acts[role2][id][property] /= parseFloat(args[4]);
					break;
				case '=': this.acts[role2][id][property] = args[4];
					break;
			}
		}
	}
	return 2;
};
module.exports = ActManager;
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var scaling = require("./states/scaling.js");
var load = require("./states/load.js");
var startMenu = require("./states/startMenu.js");
var intro = require("./states/intro.js");
var selection = require("./states/selection.js");
var hall = require("./states/hall.js");
var cyberspace = require("./states/cyberspace.js");
var review = require("./states/review.js");
var error = require("./states/error.js");
//var tryMenu = require("./states/tryMenu.js");	///

game = new Phaser.Game(1000, 600, Phaser.AUTO, 'game');
//Phaser.CANVAS was said to be better for mobile

game.globals ={		//global data loaded from json and txt files
	assetsTable: null,
	commonActs: null,
	scenarioActs: [],
	scenarioCybers: [],
	scenarioNPCs: [],
	scenarioIntros: [],
	scenarioOutros: [],
	tutorialNPCs: null,
	tutorialIntros: [],
	tutorialOutros: [],
	tutorialCybers: [],
	credits: null,
	personalNotes: null,
	audioManager: null,
	records: [],
	playerName: null
};

game.state.add("scaling", scaling);
game.state.add("load", load);
game.state.add("startMenu", startMenu);
game.state.add("intro", intro);
game.state.add("selection", selection);
game.state.add("hall", hall);
game.state.add("cyberspace", cyberspace);
game.state.add("review", review);
game.state.add("error", error);

game.state.start("scaling");
},{"./states/cyberspace.js":25,"./states/error.js":26,"./states/hall.js":27,"./states/intro.js":28,"./states/load.js":29,"./states/review.js":30,"./states/scaling.js":31,"./states/selection.js":32,"./states/startMenu.js":33}],2:[function(require,module,exports){
/**
Control the action of the rival based on the AI set in the cyber file
@param {int} index - the index number for the scenario. negative number for the tutorial.
@param {ActManager} actManager - the reference to the actManager
@param {int} role - the role the AI is going to play. 0 for intruder, 1 for defender
*/
function AIManager(index, actManager, buffManager, role)
{
	//constants
	this.operationDelay = 2000;	//interval between AI operations
	
	this.index = index;
	this.actManager = actManager;
	this.buffManager = buffManager;
	this.role = role;
	//need to note down. A action pattern, after chosen, might not be able to be performed in that round
	this.currentPlan = -1;
	
	this.ai = [];
	
	if(index < 0)	//tutorials
		this.cyber = game.globals.tutorialCybers[0-parseInt(index)];
	else this.cyber = game.globals.scenarioCybers[index];

	var name;
	var object;
	//construct this.ai, adding also a property called "unlocked"
	if(this.cyber.AI)
	{
		for(i in this.cyber.AI)
		{
			//remember to use slice(0) to copy array. Otherwise, modificatiions will be visible to the globals
			object = {"pattern": this.cyber.AI[i].pattern.slice(0),
					"chance": this.cyber.AI[i].chance,
					"unlocked": true};
			//lock the ai patterns if has at least one related acts locked
			for(p in object.pattern)
			{
				id = this.actManager.name2id(this.role, object.pattern[p]);
				if(id == -1)
				{
					var errorMessage = "Error! The act \"" + object.pattern[p] + "\" specified in the AI pattern for this scenario (scenario " + index + ") is not defined!";
					game.state.start('error', true, false, errorMessage);
				}
				//if found, convert from name string to id
				object.pattern[p] = id;
				if(!this.actManager.actUnlocked(this.role, id))
				{
					object.unlocked = false;
				}
				/*
				
				else //stop conversion at the first not found
				{
					object.unlocked = false;
					break;
				}*/
			}
			this.ai.push(object);
		}
	}
}
/**
Try to activate more AI patterns when new acts are unlocked by the script
*/
AIManager.prototype.activatePatterns = function()
{
	var found;	//if find any related act locked act
	var i,a;
	for(i in this.ai)
		if(!this.ai[i].unlocked)
		{
			found = false;
			for(a in this.ai[i].pattern)
			{
				if(!this.actManager.actUnlocked(this.role, this.ai[i].pattern[a]))
				{
					found = true;
					break;
				}
			}
			if(found == false)
			{
				this.ai[i].unlocked = true;
			}
		}
};

/**
Let the AI take control of the character. The AI script is assumed to be written for the right role.
*/
AIManager.prototype.control = function(gameManager, round)
{
	this.gameManager = gameManager;
	//if no plan yet, get a plan
	if(this.currentPlan == -1)
		this.currentPlan = this.randomPlan();
	//if still no plan, end ai control
	if(this.currentPlan == -1)
	{
		//calling setTimeout will lose all context. code like this will guarantee context
		setTimeout(function(fun, context){if(context)fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
		//non-delayed equivalence: if(gameManager)this.gameManager.roundFinal();
		return;
	}
	
	//got a plan (old plan or new plan), will follow the pattern
	//guarantee learnt
	for(var a in this.ai[this.currentPlan].pattern)
		if(this.learnAct(this.ai[this.currentPlan].pattern[a]) == false)
		{	//cannot learn them all
			//calling setTimeout will lose all context. code like this will guarantee context
			setTimeout(function(fun, context){if(context)fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
			return;
		}
	
	//all acts in the action pattern learnt
	var allResource = 0;
	var id;
	//calculate resource comsumption of this combo of acts
	for(a in this.ai[this.currentPlan].pattern)
	{
		id = this.ai[this.currentPlan].pattern[a];
		allResource += this.actManager.getAct(this.role, id).cost;
	}
	//if resource not enough for all acts in one shot, wait for the next round
	if(gameManager && gameManager.getResource(this.role) < allResource)
	{
		//calling setTimeout will lose all context. code like this will guarantee context
		setTimeout(function(fun, context){fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
		//this.gameManager.roundFinal();
		return;
	}
	//resource also enough. ready to apply acts after each time interval
	this.actTimer = setTimeout(this.singleAct, this.operationDelay, this, this.ai[this.currentPlan].pattern, 0, round);
};
/**
Function invoked for each single act in the selected action pattern.
It will recursively call itself after each operatioDelay
@param {Array} pattern - the array of acts to performed. N.B. pattern is passed by reference. One should not modify it.
@param {int} i - the index in the pattern: which act to apply
*/
AIManager.prototype.singleAct = function(context, pattern, i, round)
{
	//return when game already ended (restarted or gameover)
	if(!context.gameManager || context.gameManager.disableControl)
		return;
	if(i >= pattern.length)//all acts in the plan executed.
	{ 	
		//reset for another plan
		context.currentPlan = -1;
		//AI ends the turn
		context.gameManager.roundFinal();
		return;
	}
	
	context.actManager.applyAct(context.role, pattern[i], round);
	context.actTimer = setTimeout(context.singleAct, context.operationDelay, context, pattern, i+1, round);
};
/**
Callback function to stop AI's attempt to perform further acts or end turn, when game restarted or gameover
*/
AIManager.prototype.stopAct = function()
{
	clearTimeout(this.actTimer);
}

/**
Recursive function to lean an act. Recursively invoke the learning of the prerequisites.
@returns {boolean} - true for it was learnt or it's successfully learnt, false for leaning failure (insufficient resource)
*/
AIManager.prototype.learnAct = function(id)
{
	//return when game already ended (restarted or gameover)
	if(!this.gameManager || this.gameManager.disableControl)
		return;
	
	if(this.actManager.actLearnt(this.role, id))
		return true;
	//not learnt
	var result;
	//whether prerequisites meet
	for(var p in this.actManager.getAct(this.role, id).prerequisites)
	{	
		result = this.learnAct(this.actManager.getAct(this.role, id).prerequisites[p]);
		if(!result)	//prerequisites can't be learnt
			return;
	}
	//prerequisites meet
	result = this.actManager.learnAct(this.role, id);
	return result;
};
/**
Randomly choose an action pattern among those patterns unlocked.
The sum of all chances can be more than 1:
some patterns may not be unlocked for the moment;
some patterns may be considered useless (don't enforce any new buffs)
@returns - the chosen pattern. -1 for no pattern chosen
*/
AIManager.prototype.randomPlan = function()
{
	//[0,1.0)
	var number = Math.random();
	for(var i in this.ai)
		if(this.ai[i].unlocked && this.alterBuffs(this.ai[i].pattern))
		{/*unlocked means the pattern can be applyed now;
		alterBuffs means the pattern is useful to apply*/	
			if(number < this.ai[i].chance)	//catch
				return i;
			else	//miss. pass to latter action patterns
			{	/*for conditional probability, the chance(s) should be devided.
			alternatively we can multiply the random number*/
				number -= this.ai[i].chance;
			}
		}
	//no possible action pattern caught the chance
	return -1;
};

/**
Check if the action pattern (actually the last one of the acts) will enforce more buffs or clean any existing buffs on success. Note that, last straws also enforce buff like "Credential compromised"
@param {Array} - an array of acts that is to be performed
@returns {boolean} - true if the action pattern 
*/
AIManager.prototype.alterBuffs = function(pattern)
{
	var lastAct = this.actManager.getAct(this.role, pattern[pattern.length - 1]);
	for(var b in lastAct.selfBuffs)
		if(this.buffManager.hasBuff(lastAct.selfBuffs[b], this.role) == false)
			return true;
	for(b in lastAct.rivalBuffs)
		if(this.buffManager.hasBuff(lastAct.rivalBuffs[b], 1-this.role) == false)
			return true;
	for(b in lastAct.cleanSelfBuffs)
		if(this.buffManager.hasBuff(lastAct.cleanSelfBuffs[b], this.role) == true)
			return true;
	for(b in lastAct.cleanRivalBuffs)
		if(this.buffManager.hasBuff(lastAct.cleanRivalBuffs[b], 1-this.role) == true)
			return true;
	return false;
};
module.exports = AIManager;
},{}],3:[function(require,module,exports){
/**
@classdesc A class representing a single act.
As a creation function, remember to create new arrays, rather than just pointing to the old arrays
@param {string} actName - the name of the act
@param {Array} prerequisites - the array of prerequisites before the player can learn this act
@param {int} learningCost - the cost when the player learns this act 
@param {string} desc - the description of the act
@param {Array} needSelfBuffs - the buffs that the player has to have before the player performs the act
@param {Array} needRivalBuffs - the buffs that the rival has to have for the player to perform the act sucessfully
@param {Array} noRivalBuffs - the buffs that the rival has to no have for the player to perform the act successfully
@param {int} cost - the cost of the act
@param {float} successRate - the acts's initial success rate
@param {Array} selfBuffs -  the buffs enforced to the player when the acts succeds
@param {Array} cleanSelfBuffs -  the buffs cleaned on the player when the acts succeds
@param {Array} rivalBuffs - the buffs enforced to the rival when the act suceeds
@param {Array} cleanRivalBuffs - the buffs cleaned on the rival when the act suceeds
@param {int} buffLength - the length of the enforced buff
@param {int} bonus - the bounty for the intruder and the damange to the defender's assets, when the acts succeds
@param {int} superfluousRequests - the amount of superfluous requests to generate
@param {string} modifier - a string that is used to modifies other properties
@param {int} learnt - if the act is already learnt at the beginning
@param {int} enabled - if the act is enabled at the beginning (otherwise, it should be later on enabled by script)
@constructor
*/
function Act(name, prerequisites, learningCost, desc, needSelfBuffs, needRivalBuffs, noSelfBuffs, noRivalBuffs, cost, successRate, selfBuffs, rivalBuffs, cleanSelfBuffs, cleanRivalBuffs, buffLength, bonus, superfluousRequests, modifier, learnt, unlocked)
{
	this.name = name;
	this.prerequisites = prerequisites.slice(0);
	this.learningCost = learningCost;
	this.desc = desc;
	this.needSelfBuffs = needSelfBuffs.slice(0);
	this.needRivalBuffs = needRivalBuffs.slice(0);
	this.noSelfBuffs = noSelfBuffs.slice(0);
	this.noRivalBuffs = noRivalBuffs.slice(0);
	this.cost = cost;
	this.successRate = successRate;
	this.selfBuffs = selfBuffs.slice(0);
	this.rivalBuffs = rivalBuffs.slice(0);
	this.cleanSelfBuffs = cleanSelfBuffs.slice(0);
	this.cleanRivalBuffs = cleanRivalBuffs.slice(0);
	this.buffLength = buffLength;
	this.bonus = bonus;
	this.superfluousRequests = superfluousRequests;
	this.modifier = modifier;
	//dynamic properties not specified in the json files
	this.learnt = learnt;
	this.unlocked = unlocked;
}
module.exports = Act;

},{}],4:[function(require,module,exports){
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
	this.effectManager.createWord(act.name, role, 4000);
			
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
},{"./Act":3,"./LogEntry":11}],5:[function(require,module,exports){
module.exports = function() {
    /**
     * @classdesc An asynchronous reader that can make ajax request to a remote url returning the downloaded file.
     * @constructor
     */
    function AjaxFileReader() {
        this.rawFile = new XMLHttpRequest();
    }

    /**
     * Reads the file at the specified url and executes the success callback when the operation has been completed or
     * launches the error callback if an error occurs.
     * @param {string} filePath - URL of the file to be read
     * @param {function} callbackSuccess - Function to execute after the file has been completely received
     * @param {function} callbackError - Function to execute if an error occurs
     */
    AjaxFileReader.prototype.readTextFile = function(filePath, callbackSuccess, callbackError) {
        this.rawFile.open("GET", filePath, true);
        this.rawFile.onload = callbackSuccess;
        if (callbackError) {
            this.rawFile.onerror = callbackError;
        }

        //Actually executes the AJAX request
        this.rawFile.send();
    };

    return AjaxFileReader;
};
},{}],6:[function(require,module,exports){
/**
@classdesc A class managing all the sounds
*/
function AudioManager()
{
	//constants
	this.volumeH = 0.3;
	this.volumeL = 0.1;
	this.NCyberBGMs = 4;
	
	this.typing = game.add.audio("typing");
	this.accessGrantedSound = game.add.audio("accessGranted");
	this.accessDeniedSound = game.add.audio("accessDenied");
	this.noticeSound = game.add.audio("notice");
	this.shootSound = game.add.audio("blaster");
	this.explodeSound = game.add.audio("explosion");
	this.defendSound = game.add.audio("sword");
	this.shieldBreakSound = game.add.audio("shieldBreak");
	this.stickySound = game.add.audio("sticky");
	this.victorySound = game.add.audio("acceptSound");
	this.defeatSound = game.add.audio("errorSound");

	this.mainBGM = game.add.audio("mainBGM");
	this.intruderBGM = game.add.audio("intruderBGM");
	this.defenderBGM = game.add.audio("defenderBGM");
	this.cyberBGM = [];
	for(var i=0; i<this.NCyberBGMs; i++)
	{
		this.cyberBGM[i] = game.add.audio("cyberBGM"+i);
		this.cyberBGM[i].onStop.add(this.cyberMusic, this);
	}
	this.outroBGM = game.add.audio("outroBGM");
	//the pointer to the BGM currently been played
	this.BGM = "";
}
/* -------------------- sound effects start -----------------------*/
/**
Start the typing sound
*/
AudioManager.prototype.typingOn = function()
{
	this.typing.play("", 0, this.volumH, true);
};
/**
Stop the typing sound
*/
AudioManager.prototype.typingOff = function()
{
	this.typing.stop();
};

/**
Crate the "Access Granted" sound effect
*/
AudioManager.prototype.accessGranted = function()
{
	this.accessGrantedSound.play();
};
/**
Crate the "Access Denied" sound effect
*/
AudioManager.prototype.accessDenied = function()
{
	this.accessDeniedSound.play();
};
/**
Crate the sound at the start of the cyber battle, based on the cyber file
@param {string} soundKey - the key for the sound specified in the cyber file
*/
AudioManager.prototype.startingSound = function(soundKey)
{
	var sound = game.add.audio(soundKey);
	if(sound)
		sound.play();
};
/**
Crate the a sound effect for a kind of something new
*/
AudioManager.prototype.notice = function()
{
	this.noticeSound.play();
};
/**
Crate the shooting sound effect
*/
AudioManager.prototype.shoot = function()
{
	this.shootSound.play();
};
/**
Crate the explosion sound effect
*/
AudioManager.prototype.explode = function()
{
	this.explodeSound.play();
};
/**
Crate the defence sound effect
*/
AudioManager.prototype.defend = function()
{
	this.defendSound.play();
	
};
/**
Crate the defence break sound effect
*/
AudioManager.prototype.defenceBreak = function()
{
	this.shieldBreakSound.play();
	
};
/**
Crate the sticky sound effect
*/
AudioManager.prototype.sticky = function()
{
	this.stickySound.play();
	
};
/**
Crate the victory sound effect
*/
AudioManager.prototype.victory = function()
{
	this.victorySound.play();
	
};
/**
Crate the defeat sound effect
*/
AudioManager.prototype.defeat = function()
{
	this.defeatSound.play();
	
};
/* -------------------- sound effects end -----------------------*/

/* ------------------------ BGMs start ---------------------------*/
/**
Play the main menu BGM
*/
AudioManager.prototype.mainMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.mainBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the intruder's hall BGM
*/
AudioManager.prototype.intruderHallMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.intruderBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the defender's hall BGM
*/
AudioManager.prototype.defenderHallMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.defenderBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the the BGMs randomly for cyberspace
*/
AudioManager.prototype.cyberMusic = function()
{
	if(this.BGM)	//the BGM of hall may not have been stoped yet
		this.BGM.pause();
	//play a random one among the BGMs for cyberspace
	//[0, NCyberBGMs)
	var integer = Math.floor(Math.random()*this.NCyberBGMs);
	this.BGM = this.cyberBGM[integer];
	this.BGM.play("", 0, this.volumeH);
};
/**
Play the the review's BGM
*/
AudioManager.prototype.outroMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.outroBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/* ------------------------ BGMs ends ---------------------------*/

/**
Set the volume to low or high
@param {boolean} low - true: to low volume, false: to high volume
*/
AudioManager.prototype.lowVolume = function(low)
{
	if(low)
		this.BGM.volume = this.volumeL;
	else this.BGM.volume = this.volumeH;
};
module.exports = AudioManager;
},{}],7:[function(require,module,exports){
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
	//the superfluous request related to each buff. This array doesn't have intruder part
	this.buffSuperfluous = [];
	
	
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
	
	//set buffSuperfluous
	for(i=0; i< buffSize; i++)	//start with no superfluous requests
		this.buffSuperfluous[i] = 0;
}
/**
Create and initializes the arrays for the information of the buffs: buffNames, buffDesc, buffCapacity, buffUpkeep, dosResistance, buffLength. However, buffSuperfluous will be filled by the act dynamically at run time.
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
			//reset the superfluous requests when the buff expires
			if(!this.buffLengths[1][i] && this.buffSuperfluous[i])
				this.buffSuperfluous[i] = 0;
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
Set the number for superfluous requests generated by a certain buff
The amount comes from act, rather than buff
@param {int} id - the id of the buff generating superfluous requests
@param {int} amount - the amount for superfluous requests
*/
BuffManager.prototype.setSuperfluous = function(id, amount)
{
	this.buffSuperfluous[id] = amount;
};
/**
Get the number for superfluous requests generated by a certain buff
@param {int} id - the id of the buff generating superfluous requests
@returns {int} - the amount for superfluous requests generated from this buff
*/
BuffManager.prototype.getSuperfluous = function(id)
{
	return this.buffSuperfluous[id];
};
/**
Get the total number for superfluous requests generated by the buffs
@returns {int} - total number of superfluous requests generated
*/
BuffManager.prototype.totalSuperfluous = function()
{
	var superfluousRequests = 0;
	for(l in this.buffLengths[1])
		if(this.buffLengths[1][l] && this.buffSuperfluous[l])
			superfluousRequests += this.buffSuperfluous[l];
	return superfluousRequests;	
};

/**
Get resistance to DoS attack provided by a certain buff
@param {int} id - the id of the buff generating superfluous requests
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
},{}],8:[function(require,module,exports){
/**
@classdesc A class managing the animations
@param {Phaser.Group} fatherGroup - the group (layer) to create effect in
@param {int} playerX - the x coordinates of the sprite of the player
@param {int} playerY - the y coordinates of the sprite of the player
@param {int} rivalX - the x coordinates of the sprite of the rival
@param {int} rivalY - the y coordinates of the sprite of the rival
@param {int} logX - the x coordinates of the the action log button
@param {int} logY - the y coordinates of the the action log button
*/
function EffectManager(fatherGroup, X, Y, logX, logY, roundX, roundY)
{
	//constants
	this.styleSpout = { font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FF5011"};
	this.styleSpark = { font: "31px Courier New, monospace", fontWeight: "bold", fill: "#11DD11", align:"center"};
	this.styleDamage = { font: "33px Courier New, monospace", fontWeight: "bold", fill: "#FF0000"};
	
	this.fatherGroup = fatherGroup;
	this.X = X;
	this.Y = Y;
	this.logX = logX;
	this.logY = logY;
	this.roundX = roundX;
	this.roundY = roundY;
	
	/*to display adjacent words with offset: toggle it on and off*/
	this.offset = false;
	
	//to manage the happy faces
	this.happyGroup = game.add.group();
	this.fatherGroup.add(this.happyGroup);
	//to manage the unhappy faces
	this.unhappyGroup = game.add.group();
	this.fatherGroup.add(this.unhappyGroup);
}

/**
Create the happy or unhappy animation on the defender's server. One happy face for each served client and one unhappy face for unserved one.
@param {boolean} happy - true: create happy faces, false, create unhappy faces
@param {int} num - the number of happy or unhappy faces to display
*/
EffectManager.prototype.faces = function(happy, num)
{
	if(num == 0)
		return;
	if(happy)
	{
		var faceGroup = this.happyGroup;
		var spriteKey = "happy";
		var X = this.X[1];
		var Y = this.Y[1];
	}
	else
	{	
		var faceGroup = this.unhappyGroup;
		var spriteKey = "unhappy";
		var X = this.X[1];
		var Y = this.Y[1]+40;
	}
	//adjust to the center so that it will not be out of window
	if(X<500)
	{
		X += 65;
		Y -= 30;
	}
	else
	{		
		X -= 65;
		Y += 30;
	}
	faceGroup.removeAll(true);
	for(var i=0; i < num; i++)
		game.add.image(X+i*40, Y, spriteKey, 0, faceGroup);
	faceGroup.setAll("anchor.setTo", "anchor", 0.5);
	var faceTween = game.add.tween(faceGroup).to({x: "-20", y: "-40"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	faceTween.onComplete.add(function(){faceGroup.removeAll(true); faceGroup.x+=20; faceGroup.y+=40;}, this, 0);
};

/**
Create a text on the player or the rival, and tween it towards the action log
@param {string} texts - the word to create
@param {boolean} role - create the text at the whose position? 0: intruder, 1: defender
@param {int} time - the tweening time
*/
EffectManager.prototype.createWord = function(texts, role, time)
{
	//a text spout of when an act is applyed
	var spoutSprite = game.add.text(0, 0, texts, this.styleSpout, this.fatherGroup);
	spoutSprite.anchor.setTo(0.5);
	spoutSprite.x = this.X[role];
	spoutSprite.y = this.Y[role];
	this.offset = !this.offset;
	//create adjacent sprites with different y, avoiding word overlaping
	if(this.offset)	spoutSprite.y += 30;
	var spoutTween = game.add.tween(spoutSprite).to({x: this.logX, y: this.logY}, time, Phaser.Easing.Linear.None, true, 0, 0, false);
	spoutTween.onComplete.add(function(){spoutSprite.destroy();}, this, 0);
};

/**
Create a indicator that a round is starting
@param {int} round - the round that is starting
@param {int} role - whose turn is the starting round. 0: intruder, 1: defender
@param {int} time - the time for the enlarging animation as well as the shrunking animation. The time of the whole animation will be double.
*/
EffectManager.prototype.createRoundSpark = function(round, role, time)
{
	var spark = game.add.text(500, 300, round, this.styleSpark, this.fatherGroup);
	spark.anchor.setTo(0.5);
	var enlargeTween = game.add.tween(spark.scale).to({x: 4, y: 4}, time, Phaser.Easing.Sinusoidal.EaseOut, true, 0, 0, false);
	enlargeTween.onComplete.add(function(){
		var moveTween = game.add.tween(spark).to({x: this.X[role], y: this.Y[role]}, time, Phaser.Easing.Linear.None, true, 0, 0, false);
		var shrunkTween = game.add.tween(spark.scale).to({x: 1, y: 1}, time, Phaser.Easing.Sinusoidal.EaseIn, true, 0, 0, false);
		moveTween.onComplete.add(function(){spark.destroy();}, this, 0);
		}, this, 0);
};

/**
Create the animation for applying each act
@param {int} type - the animation to create, based on the character and the effect. 0: defender defends, 1: intruder strengthens, 2: intruder attack defended, 3: intruder unlucky, 4:intruder successful
@param {int} damage - (type == 5 only) the damage dealt to the assets
*/
EffectManager.prototype.createActEffect = function(type)
{
	var movingTween;
	switch(type)
	{
		case 0: //defender defends
			this.shield(null, null, 1);
			break;
		case 1: //intruder strengthens
			this.bubble(null, null, 0);
			break;
		case 2: //intruder attack defended
			movingTween = this.bullet();
			movingTween.onComplete.add(this.shield, this, 0);
			break;
		case 3: //intruder unlucky
				movingTween = this.bullet();
				movingTween.onComplete.add(this.miss, this, 0);
			break;
		case 4: //intruder break defence
				movingTween = this.bullet();
				movingTween.onComplete.add(this.shieldBreak, this, 0);
			break;
		case 5: //intruder enforce buff
				movingTween = this.bullet();
				movingTween.onComplete.add(this.sticky, this, 0);
			break;
		case 6: //intruder compromise assets 
				movingTween = this.bullet();
				movingTween.onComplete.add(this.explosion, this, 0);
				var damage = arguments[1];
				if(damage)
					movingTween.onComplete.add(this.damaged, this, 0, damage);
			break;
	}
}
/**
To display the bubble pop up animation. Used at intruder's successful strenthen
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} role - the role of the character on who the shield should pop up
*/
EffectManager.prototype.bubble = function(sprite, pointer, role)
{	
	var still = game.add.image(this.X[role], this.Y[role], "bubble", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	still.scale.setTo(0.01);
	var stillTween = game.add.tween(still.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);

	game.globals.audioManager.defend();
};
/**
To display the shield pop up animation. Used at the defender's successful strenthen of his defence
*/
EffectManager.prototype.shield = function()
{	
	var still = game.add.image(this.X[1], this.Y[1], "shield", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	still.scale.setTo(0.01);
	var stillTween = game.add.tween(still.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);

	game.globals.audioManager.defend();
};
/**
To display the shield break animation. Used at the intruder's successful breach of the defence
*/
EffectManager.prototype.shieldBreak = function()
{	
	var leftPiece = game.add.image(this.X[1], this.Y[1], "shieldLeft", 0, this.fatherGroup);
	var rightPiece = game.add.image(this.X[1], this.Y[1], "shieldRight", 0, this.fatherGroup);
	leftPiece.anchor.setTo(1, 0.5);
	rightPiece.anchor.setTo(0, 0.5);
	var leftTween1 = game.add.tween(leftPiece).to({x: '-50', y: '+30'}, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
	var rightTween1 = game.add.tween(rightPiece).to({x: '+50', y: '+30'}, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
	var leftRotation = game.add.tween(leftPiece).to({rotation: '-0.5'}, 1200, Phaser.Easing.Linear.None, true, 0, 0, false);
	var rightRotation = game.add.tween(rightPiece).to({rotation: '+0.5'}, 1200, Phaser.Easing.Linear.None, true, 0, 0, false);
	leftTween1.onComplete.add(function(){leftPiece.destroy();rightPiece.destroy();}, this, 0);

	game.globals.audioManager.defenceBreak();
};
/**
To display the sticky animation. Used at the intruder's successful enforce of negative buffs
*/
EffectManager.prototype.sticky = function()
{
	var still = game.add.image(this.X[1], this.Y[1], "splatter", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	var stillTween = game.add.tween(still).to({width: 75, height: 75}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);
	
	game.globals.audioManager.sticky();
};
EffectManager.prototype.bullet = function()
{
	var moving = game.add.image(this.X[0], this.Y[0], "bullet", 0, this.fatherGroup);
	moving.anchor.setTo(0.5);
	moving.rotation = Math.atan((this.Y[1]-this.Y[0])/(this.X[1]-this.X[0]));
	var movingTween = game.add.tween(moving).to({x: this.X[1], y: this.Y[1]}, 500, Phaser.Easing.Linear.None, true, 0, 0, false);
	movingTween.onComplete.add(function(){moving.destroy();}, this, 0);
	game.globals.audioManager.shoot();
	
	return movingTween;
};
EffectManager.prototype.miss = function()
{
	var spoutSprite = game.add.text(this.X[1], this.Y[1], "miss", this.styleSpout, this.fatherGroup);
	spoutSprite.anchor.setTo(0.5);
	var spoutTween = game.add.tween(spoutSprite).to({x: "-10", y: "-30"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	spoutTween.onComplete.add(function(){spoutSprite.destroy();}, this, 0);
};
EffectManager.prototype.explosion = function()
{	
	var explosionSprite = game.add.image(this.X[1], this.Y[1], "explosion", 0, this.fatherGroup);
	explosionSprite.anchor.setTo(0.5);
	//explosionSprite.smoothed = false;
	var explosionAnimation = explosionSprite.animations.add("explode");
	explosionAnimation.play(15, false, true);	//explosionAnimation.onComplete.add(function(){explosionSprite.destroy();}, this);
	
	game.globals.audioManager.explode();
};
/**
Create a indicator for the damage dealt to the assets
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} damage - the damage dealt
*/
EffectManager.prototype.damaged = function(sprite, pointer, damage)
{
	var damageText = "-" + damage;
	var damageSprite = game.add.text(this.X[1], this.Y[1], damageText, this.styleDamage, this.fatherGroup);
	var damageTween = game.add.tween(damageSprite).to({x: "-20", y: "-50"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	damageTween.onComplete.add(function(){damageSprite.destroy();}, this, 0);
};

/**
The animation when the player wins or loses
@param {boolean} win - true: player wins, false: player loses
*/
EffectManager.prototype.lastAnimation = function(win)
{
	if(win)
	{
		var spriteKey = "VICTORY";
		var audioFun = game.globals.audioManager.victory;
	}
	else
	{
		var spriteKey = "DEFEAT";
		var audioFun = game.globals.audioManager.defeat;
	}
	var gameoverSprite = game.add.image(game.world.centerX, game.world.centerY, spriteKey, 0);
	gameoverSprite.anchor.setTo(0.5);
	gameoverSprite.scale.setTo(0.01);
	var gameoverTween = game.add.tween(gameoverSprite.scale).to({x: 1, y: 1}, 1500, "Elastic.easeOut", true, 0, 0, false);
	
	audioFun.call(game.globals.audioManager);
};
module.exports = EffectManager;
},{}],9:[function(require,module,exports){
/**
@classdesc A class managing characters and other game related data
It takes the role of Model and Controller in the MVC framework. cyberspace takes the role of View. 
@param {int} index - positive: the index of the scenarioCybers, negative: the inverse of the tutorialCybers
@param {boolean} doublePlayer - true: double player mode(aiManager actually not used); false: single player mode(aiManager used)
@param {BuffManager} buffManager - the reference to the buffManager
@param {cyberspace} cyberspace - the cyberspace state
@constructor
*/
function GameManager(index, doublePlayer, buffManager, cyberspace, aiManager, scriptManager, effectManager, messager, logs)
{
	//constants
	this.servingBonus = 10;
	/*the penalty ratio when a request is not served.
	Considering also the bonus of serving the request, each unserved request results in servingBonus*(1+unservedPenalty) of loss*/
	this.unservedPenalty = 0.5;
	
	this.index = index;
	this.doublePlayer = doublePlayer;
	this.buffManager = buffManager;
	this.cyberspace = cyberspace;
	this.aiManager = aiManager;
	this.scriptManager = scriptManager;
	this.effectManager = effectManager;
	this.messager = messager;
	this.logs = logs;
	
	if(index < 0)
		var cyber = game.globals.tutorialCybers[0-parseInt(index)];
	else var cyber = game.globals.scenarioCybers[index];
	
	//in single player mode, player's role; in double player mode, 1st player's role
	//0 for intruder, 1 for defender
	if(cyber.defensive)
		this.playerRole = 1;
	else this.playerRole = 0;
	//the amount of resource obtained from each served client request
	
	this.currentRound = 0;	//during the game, range of currentRound is in (1,maxRounds]
	this.serverCapacity = cyber.serverCapacity;
	this.serverRequestValley = cyber.serverRequestValley;
	this.serverRequestPeak = cyber.serverRequestPeak;
	this.serverRequestRange = parseInt(cyber.serverRequestPeak) - parseInt(this.serverRequestValley) +1;
	this.resources = [parseInt(cyber.initialResource[0]), parseInt(cyber.initialResource[1])];
	this.constantIncome = cyber.constantIncome;
	this.maxResource = cyber.maxResource;
	this.maxRounds = cyber.maxRounds;
	this.assets = cyber.assets;
	this.offensive = cyber.offensive;	
	/*a flag that is set to true only for disable the controls of players or AI (learning, applying of acts and ending of turn). 
	This happens when the character is offline (1.5s before automatically end turn), or when the game has already ended (2.5s for ending animation)
	between the moment one character wins and
	the actual moment when the game state switches*/
	this.disableControl = false;
}
/**
private function
Generate a number within serverRequestValley and serverRequestPeak (inclusive)
@returns {int} - the integer number within the range, to indicate number of request from legitimated clients
*/
GameManager.prototype.randomRequests = function()
{
	/*serverRequestRange has been +1, and there is Math.floor here. In this way, both lowerbound and upperbound are inclusive*/
	return Math.floor(this.serverRequestValley + Math.random()* this.serverRequestRange);
};
/**
Return the resource of a character
@param {int} role - 0 for intruder, 1 for defender
*/
GameManager.prototype.getResource = function(role)
{
	return this.resources[role];
};
/**
Return the assets on the defender' side
*/
GameManager.prototype.getAssets = function()
{
	return this.assets;
};
/**
Return the current round
*/
GameManager.prototype.getRound = function()
{
	return this.currentRound;
};
/**
Increase the resource of the character
@param {int} role - 0 for intruder, 1 for defender
@param {int} amount - the amount of resource to be added
*/
GameManager.prototype.obtainResource = function(role, amount)
{
	//[0, maxResource]
	this.resources[role] = Math.min(this.resources[role] + parseInt(amount), this.maxResource);
	this.resources[role] = Math.max(this.resources[role], 0);
	this.cyberspace.updateResource(role, this.resources[role]);
};
/**
Decrease the resource of the character
@param {int} role - 0 for intruder, 1 for defender
@param {int} amount - the amount of resource to be substracted
*/
GameManager.prototype.consumeResource = function(role, amount)
{
	this.obtainResource(role, 0- parseInt(amount));
};
/**
Deal damange to the server. Can invoke on game over.
*/
GameManager.prototype.loseAssets = function(amount)
{
	this.assets -= amount;
	//call this.cyberspace.updateAssets(this.assets) after 500ms
	setTimeout(function(fun, context, win){fun.call(context, win);}, 500, this.cyberspace.updateAssets, this.cyberspace, this.assets);
	//deal with gameover
	if(this.assets <= 0)
	{	//intruder wins
		this.disableControl = true;
		if(this.aiManager)
			this.aiManager.stopAct();	//stop all pending AI operations
		//last animation of "VICTORY" or "DEFEAT"
		if(this.playerRole == 0)
			//call this.effectManager.lastAnimation(true) after 550ms
			setTimeout(function(fun, context, win){fun.call(context, win);}, 550, this.effectManager.lastAnimation, this.effectManager, true);
		else //callthis.effectManager.lastAnimation(false) after 550ms
			setTimeout(function(fun, context, win){fun.call(context, win);}, 550, this.effectManager.lastAnimation, this.effectManager, false);
		//calling setTimeout will lose all context. code like this will guarantee context
		setTimeout(function(fun, context, win){fun.call(context, win);}, 2500, this.cyberspace.gameoverFun, this.cyberspace, this.playerRole == 0);
		return;
	}
};
/**
Deal with the initiation of the round: round number and the income
*/
GameManager.prototype.roundInit = function()
{
	//range of currentRound: (1,maxRounds]. Round 1 is defender's round
	this.currentRound++;
	//callbacks
	this.cyberspace.updateRound();
	this.scriptManager.checkScript(this.currentRound);
	
	//constant income
	if(this.currentRound%2 == 0)
	{	//intruder's round: intruder gets resource
		this.obtainResource(0, this.constantIncome[0]);
		/*var upkeep = this.buffManager.totalUpkeep(0);
		if(upkeep != 0)
			this.consumeResource(0, upkeep);*/
	}
	else
	{	//defender round: defender gets resource, also from the server
		this.obtainResource(1, this.constantIncome[1]); 
		//random client requests
		var legitimateRequests = this.randomRequests();
		//superfluous requests
		var superfluousRequests = this.buffManager.totalSuperfluous();
		var DoSSusceptance = this.buffManager.totalDosSusceptance();
		superfluousRequests *= DoSSusceptance;
		var servingRatio = (parseFloat(this.serverCapacity)+parseFloat(this.buffManager.totalCapacity()))/(legitimateRequests+superfluousRequests);
		if(servingRatio >= 1)	//five by five
		{
			var serverIncome = legitimateRequests*this.servingBonus;
			this.obtainResource(1, serverIncome);
			//animation: one happy face for each served client
			this.effectManager.faces(true, legitimateRequests);
			console.log("The server has served all " + legitimateRequests + " legitimated requests");
			console.log("Server net income is: "+serverIncome);
		}
		else	//some clients unserved
		{
			//served legitimated requests
			var servedLegitimated = Math.floor(legitimateRequests*servingRatio);
			var unservedLegitimated = legitimateRequests-servedLegitimated;
			//animation: one happy face for each served client
			this.effectManager.faces(true, servedLegitimated);
			//after 0.5 seconds, animation: one unhappy face for each unserved client
			setTimeout(function(fun, context, param1, param2){fun.call(context, param1, param2);}, 500, this.effectManager.faces, this.effectManager, false, unservedLegitimated);
			
			console.log("The server failed to serve "+(unservedLegitimated)+" legitimated requests");
			//income = bonus - penalty
			var serverIncome = servedLegitimated * this.servingBonus -unservedLegitimated * this.servingBonus * this.unservedPenalty;
			if(serverIncome > 0)
				this.obtainResource(1, serverIncome);
			else this.obtainResource(1, serverIncome);
			console.log("Server net income is: "+serverIncome);
			//a buff just to warn to the defender
			var id = this.buffManager.name2id("503 Server Unavailable");
			if(id == -1)
			{
				var errorMessage = "Error! the buff \"503 Server Unavailable\" should always be activated!\n recheck scenarioX_cyber.json!";
				game.state.start('error', true, false, errorMessage);
			}
			else	//enforce the buff "503 Server Unavailable"
				this.buffManager.addBuff(id, 1, 1);
		}
		var upkeep = this.buffManager.totalUpkeep();
		if(upkeep != 0)
			this.consumeResource(1, upkeep);
	}
	
	//show the list of acts for the current controller
	this.cyberspace.updateActs(0);
	
	//offline management and controller management
	if(!this.doublePlayer && this.currentRound%2 != this.playerRole)
	{	//ai takes control
		//enforce end turn if offline
		if(this.buffManager.offline(1-parseInt(this.playerRole)))
		{
			//calling setTimeout will lose all context. code like this will guarantee context
			setTimeout(function(fun, context){fun.call(context);}, 1500, this.roundFinal, this);
			return;
		}
		//not offline. activate AI
		this.aiManager.control(this, this.currentRound);
		/*shouldn't end turn here. AI is gradually applying acts.
		AI will end turn itself when all acts are applied*/
	}
	else
	{	//player takes control
		//enforce end turn if offline
		if(this.buffManager.offline(this.currentRound%2))
		{
			//no control when offline, including ending turn
			this.disableControl = true;	
			/*calling setTimeout will lose all context. code like this will guarantee the context
			It's non-delayed equivalence: "this.disableControl=false; this.roundFinal();"	*/
			setTimeout(function(fun, context, value){context.disableControl = value; fun.call(context);}, 1501, this.roundFinal, this, false);
		}
		else this.disableControl = false;
	}
};

/**
Deal with the final of the round: decay buff and potential game over
Invokes on roundInit for next round
*/
GameManager.prototype.roundFinal = function()
{
	//catch all attempts to end the turn when the game has already ended.
	if(this.disableControl)
		return;
	
	/*check if a script prevents the turn ends (forces the player to do apply an act). 
	This check is done to the first player only. In fact, no such script is expected for double player mode.*/
	if(this.currentRound%2 == this.playerRole)
	{
		var missingAct = this.notApplied(this.currentRound);
		if(missingAct)
		{
			this.messager.createMessage("You cannot end the turn. You should apply \""+missingAct+"\" !");
			return;	//nullify the end turn attempt
		}
	}
		
	//decay buff
	this.buffManager.decayBuff();
	//check game over
	if(this.currentRound == this.maxRounds)
	{	//outlast. defender wins
		this.disableControl = true;
		//last animation of "VICTORY" or "DEFEAT"
		if(this.playerRole == 1)
			//call this.effectManager.lastAnimation(true) after 550ms
			setTimeout(function(fun, context, win){fun.call(context, win);}, 550, this.effectManager.lastAnimation, this.effectManager, true);
		else //call this.effectManager.lastAnimation(false) after 550ms
			setTimeout(function(fun, context, win){fun.call(context, win);}, 550, this.effectManager.lastAnimation, this.effectManager, false);
		//calling setTimeout will lose all context. code like this will guarantee context
		setTimeout(function(fun, context, win){fun.call(context, win);}, 2500, this.cyberspace.gameoverFun, this.cyberspace, this.playerRole == 1);
		return;
	}
	else this.roundInit();
};

/**
Check if the player has applied all the acts as specified in shouldApply in scripts in the cyber file, and return the first one not applied
@param {int} round - the current round
@returns {string} - the first act that is supposed to be applied but actually not. null if all the necessary acts are applied.
*/
GameManager.prototype.notApplied = function(round)
{
	var shouldApply = this.scriptManager.shouldApply(round);
	if(!shouldApply)
		return null;
	//the player's round and shouldApply specified in the script for the round
	for(var a in shouldApply)
	{
		for(l=0; l<this.logs.length; l++)
			if(this.logs[l].round == round && this.logs[l].act == shouldApply[a])
				break;
		if(l >= this.logs.length) //not found
			return shouldApply[a];
	}
	return null;	//all found
};
module.exports = GameManager;
},{}],10:[function(require,module,exports){
/**
@classdesc A class manageing the pop up prompt. An instance is created for every states where hint boxes are needed.
@param {string} boxKey - the string indicating the image of the hint box
@constructor
*/
function HintBox(boxKey)
{
	this.hintBoxGroup = game.add.group();
	this.hintBox = this.hintBoxGroup.create(0, 0, boxKey);	//create a sprite and add to the group
	this.hintBox.anchor.setTo(0.5);
	this.hintBox.alpha = 0.7;
	this.hintText = game.add.text(0, 0, "",{font: "17px Courier New, monospace", fontWeight: "bold", fill: "#33FF11", align: "center", wordWrap: true, wordWrapWidth: this.hintBox.width - 15}, this.hintBoxGroup);
	this.hintText.anchor.setTo(0.5);	//text and box should use the same anchor, so that there are as much aligned as possible, even faced with large lines of texts
	this.hintBoxGroup.visible = false;
}

/**
provide the button with hint box
@param {Phaser.Sprite} theButton - the button to add hint box on
@param {string} texts - the text to be added to the hint box
*/
HintBox.prototype.setHintBox = function(theButton, texts)
{
	theButton.events.onInputOver.add(this.show, this, 0, texts);
	theButton.events.onInputOut.add(this.hide, this, 0);
}

/**
private function to display the hint
@param {Phaser.Sprite} theButton - the button on which the event occured
@param {Phaser.Pointer} pointer - a pointer
@param {string} hint - the text to be shown in the hint box
*/
HintBox.prototype.show = function(theButton, pointer, hint)
{
	this.hintBoxGroup.setAll("x", theButton.x+10);
	this.hintBoxGroup.setAll("y", theButton.y);
	this.hintText.setText(hint);
	game.world.bringToTop(this.hintBoxGroup);
	this.hintBoxGroup.visible = true;
}

/**
private function to hide the hint
*/
HintBox.prototype.hide = function()
{
	this.hintBoxGroup.visible = false;
}
module.exports = HintBox;
},{}],11:[function(require,module,exports){
/**
Note down the player's attempt to attack or defende. The information will be used in review section
Defence is expected to be always successful in applying acts.
@constructor
*/
function LogEntry(round, act)
{
	this.round = round;		//round number
	this.act = act;			//the act performed
	this.noBuffHurdle = [];	//failed because of the absence of rival buff
	this.buffHurdle = [];	//failed because of the presence of rival buff
	this.unlucky = false;	//failed because of unluck
	this.success = true;
}

/**
Add a buff as the reason why the attack fails
@param {string} buffName - name of the buff
*/
LogEntry.prototype.addBuffHurdle = function(buffName)
{
	this.buffHurdle.push(buffName);
	this.success = false;
};

/**
Add a buff as the reason why the attack fails
@param {string} buffName - name of the buff
*/
LogEntry.prototype.addNoBuffHurdle = function(buffName)
{
	this.noBuffHurdle.push(buffName);
	this.success = false;
};

/**
Add unluck as a reason why the attack fails
*/
LogEntry.prototype.addNoLuck = function()
{
	this.unlucky = true;
	this.success = false;
};

module.exports = LogEntry;

},{}],12:[function(require,module,exports){
var ScrollButtons = require("../modules/ScrollButtons");
var LogEntry = require("./LogEntry");
var HintBox = require("./HintBox");
/**
@classdesc A class managing the display of action logs. Both for cyberspace state and for the review state
N.B. the management of a single log is managed by LogEntry
@param {Array} logs - the array of the action log
@param {int} role - the role of the player. To be displayed as a reminder. 0: intruder, 1: defender
@param {boolean} doublePlayer - true: double player mode, false: single player mode
@param {Notes} notes - the reference to personal notes. Used to open personal notes from logViewer
@param {Messager} messager - the reference to a Messager instance, which is called at warning messages
@param {Phaser.Group} fatherGroup - the group where the whole logViewer is put in. useful for layering
@constructor
*/
function LogViewer(logs, role, doublePlayer, notes, messager, fatherGroup)
{
	//constants
	this.styleHeadline = { font: "25px Courier New, monospace", fontWeight: "bold", fill: "#FFEE11", align: "center"};
	this.style = { font: "20px Courier New, monospace", fill: "#00AA11", align: "center"};
	this.styleIntruder = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#8800EE", align: "center"};
	this.styleDefender = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#2222FF", align: "center"};
	
	this.styleFailed = { font: "20px Courier New, monospace", fill: "#FF8811", fontWeight: "bold", align: "center"};
	this.logsPerPage = 6;
	
	this.logs = logs;
	this.role = role;
	this.doublePlayer = doublePlayer;
	this.notes = notes;
	this.messager = messager;
	this.fatherGroup = fatherGroup;
	
	//layer 1: log entries
	this.logGroup = game.add.group();
		//each contains a log entry: frame+round+act+result
	this.entryGroups = [];
	//layer 2: popup details of one log entry
	this.reasonGroup = game.add.group();
	//layer 3: hintbox
	this.hintBox = new HintBox("box");
	
	fatherGroup.add(this.logGroup);
	fatherGroup.add(this.reasonGroup);
	
	//shortcut key for scroll up and scroll down
	var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
	scrollUpKey.onDown.add(this.scrollFun, this);
	var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
	scrollDownKey.onDown.add(this.scrollFun, this);
}

/**
Create the table of logs
@param {boolean} lastPage - true: display the last page, false: display the first page
@returns {Phaser.Group} group - the group containing newly created sprites
*/
LogViewer.prototype.display = function(lastPage)
{
	var roleText;
	//Frame
	var logFrame = game.add.image(game.world.centerX, game.world.centerY, "PNFrame", 0, this.logGroup);
	logFrame.anchor.setTo(0.5);
	//cyberspace need it to intercept clicking events
	logFrame.inputEnabled = true;
	
	//headline
	var headline = game.add.text(game.world.centerX - 100, 100, "Action Logs", this.styleHeadline, this.logGroup);
	headline.anchor.setTo(0.5);
	//role
	if(!this.doublePlayer)
	{
		if(this.role == 1)
		{
			roleText = "Your role: defender";
			var roleSprite = game.add.text(game.world.centerX + 120, 110, roleText, this.styleDefender, this.logGroup);
		}
		else
		{			
			roleText = "your role: intruder";
			var roleSprite = game.add.text(game.world.centerX + 120, 110, roleText, this.styleIntruder, this.logGroup);
		}
		roleSprite.anchor.setTo(0.5);
	}
	
	//create the battle log
		//caption line
	var roundText = game.add.text(200, 150, "Round", this.style, this.logGroup);
	roundText.anchor.setTo(0.5);
	var actText = game.add.text(450, 150, "Act pattern", this.style, this.logGroup);
	actText.anchor.setTo(0.5);
	var resultText = game.add.text(700, 150, "Result", this.style, this.logGroup);
	resultText.anchor.setTo(0.5);
	//calculate the number of pages
	var NPages = Math.ceil(this.logs.length / this.logsPerPage);
	this.scrollButtons = new ScrollButtons(880, 200, 450, this.updateLogs, this, NPages, this.logGroup);
	
	//exit button
	this.exitButton = game.add.button(810, 80, "cross", function(){this.closeLog();}, this, 0, 0, 1, 0, this.logGroup);
	this.hintBox.setHintBox(this.exitButton, "Close (ESC)");
	if(lastPage)				//at cyberspace, should start with the last page
	{
		this.updateLogs(NPages-1);
		this.scrollButtons.setCurrentPage(NPages-1);
	}
	else this.updateLogs(0);	//at review, should start with the first page
};
/**
Review state only. delete the exit button, which was created with logGroup
*/
LogViewer.prototype.noExit = function()
{
	this.exitButton.destroy();
};

/**
Callback function to update the page in action log.
*/
LogViewer.prototype.updateLogs = function(targetPage)
{
	var i;
	//empty the old log entries
	for(i in this.entryGroups)
		this.entryGroups[i].destroy();
	this.entryGroups = [];
	
	if(this.logs.length == 0)
		return;
	//going to display items of index [nextItem, outerItem)
	var nextItem = targetPage * this.logsPerPage;
	var outerItem = Math.min(nextItem + this.logsPerPage, this.logs.length);
	
	//create new logs
	var frameSprite, roundSprite, actSprite, resultSprite;
	var y = 200;
	for(i=0; nextItem < outerItem; nextItem++, i++, y+=50)
	{
		this.entryGroups[i] = game.add.group();
		var round = this.logs[nextItem].round;
		//entry frame
		frameSprite = game.add.button(game.world.centerX - 20, y, "itemFrames", this.showReason, this, 0, 0, 0, 0, this.entryGroups[i]);
		if(round % 2 == 0)	//different style for the intruder
			frameSprite.setFrames(1, 1, 1, 1);
		//parameters passed through button
		frameSprite.index = nextItem;
		frameSprite.anchor.setTo(0.5);
		/*//add tweening animation
		frameSprite.events.onInputOver.add(this.resultOnOver, this, 0);
		this.resultSprite.events.onInputOut.add(this.resultOnOut, this, 0);*/
		
		//round
		game.add.text(200, y, round, this.style, this.entryGroups[i]);
		//act
		var actSprite = game.add.text(450, y, this.logs[nextItem].act, this.style, this.entryGroups[i]);
			//hint box
		this.hintBox.setHintBox(actSprite, "Find in personal notes");
			//link to open the corresponding entry in personal notes
		actSprite.inputEnabled = true;
		actSprite.events.onInputDown.add(this.seeNotesFun, this);
		//result
		if(this.logs[nextItem].success)
			resultSprite = game.add.text(700, y, "successful", this.style, this.entryGroups[i]);
		else resultSprite = game.add.text(700, y, "failed", this.styleFailed, this.entryGroups[i]);
		
		this.entryGroups[i].callAll("anchor.setTo", "anchor", 0.5);
		this.logGroup.add(this.entryGroups[i]);
	}
};

/**
Open the corresponding entry in personal notes
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
LogViewer.prototype.seeNotesFun = function(sprite, pointer)
{
	this.hintBox.hide();
	this.notes.createNotes();
	var id = this.notes.name2id(sprite.text);
	if(id == -1)
		this.messager.createMessage("Sorry. This entry is not found in personal notes!");
	else this.notes.readNote(id);
};

/**
Show the detailed information, especially, whether the attack failed and why, when the log entry has been clicked
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
LogViewer.prototype.showReason = function(button, pointer)
{
	//this.buttonClickSound.play("", 0, window.game.globals.soundEffectsOn);
	
	var entry = this.logs[button.index];
	//create group

	//frame
	var detailFrame = this.reasonGroup.create(game.world.centerX, game.world.centerY, "dialogueBox");
	detailFrame.anchor.setTo(0.5);
	detailFrame.inputEnabled = true;
	detailFrame.events.onInputDown.add(this.deleteReason, this, 0);
	if(entry.success)
	{	//the act succeeds, no more resaon recorded
		//caption
		this.caption = game.add.text(game.world.centerX, 200, "\"" + entry.act + "\" succeeded", this.styleHeadline, this.reasonGroup);
		game.add.text(game.world.centerX, game.world.centerY, "No definitive hurdle encountered", this.style, this.reasonGroup);
		/*//click to close
		this.reasonGroup.callAll('events.onInputDown.add', 'events.onInputDown', this.deleteReason, this);*/
		this.reasonGroup.callAll("anchor.setTo", "anchor", 0.5);
		return;
	}
	//the act failed. Display the reasons
	this.caption = game.add.text(game.world.centerX, 200, "\"" + entry.act + "\" failed", this.styleHeadline, this.reasonGroup);
	var y = 250;
	//need rival buff
	if(entry.noBuffHurdle.length)
	{
		game.add.text(game.world.centerX, y, "Rival should have these:", this.style, this.reasonGroup);
		y += 40;
		for(var n in entry.noBuffHurdle)
		{
			///also the buff picture?
			game.add.text(game.world.centerX, y, entry.noBuffHurdle[n], this.styleFailed, this.reasonGroup);
			y += 40;
		}
	}
	//need no rival buff
	if(entry.buffHurdle.length)
	{
		game.add.text(game.world.centerX, y, "Hampered by these on the rival:", this.style, this.reasonGroup);
		y += 40;
		for(n in entry.buffHurdle)
		{
			
			///also the buff picture?
			game.add.text(game.world.centerX, y, entry.buffHurdle[n], this.styleFailed, this.reasonGroup);
			y += 40;
		}
	}
	//need luck
	if(entry.unlucky)
		game.add.text(game.world.centerX, y, "Need more luck", this.style, this.reasonGroup);
	/*//click to close
	this.reasonGroup.callAll('events.onInputDown.add', 'events.onInputDown', this.deleteReason, this);*/
	this.reasonGroup.callAll("anchor.setTo", "anchor", 0.5);
};

/**
@param {boolean} scrollup - true: page-up key, false, page-down key
*/
LogViewer.prototype.scrollFun = function(key)
{
	if(this.logGroup.length)
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.scrollButtons.scrollUp();
		else this.scrollButtons.scrollDown();	
};

/**
Delete the detailed information of why the action failed
*/
LogViewer.prototype.deleteReason = function()
{
	this.reasonGroup.removeAll(true);
};
/**
Delete everything of the logGroup
*/
LogViewer.prototype.closeLog = function()
{
	this.hintBox.hide();
	this.logGroup.removeAll(true);
	this.reasonGroup.removeAll(true);
	this.scrollButtons.destroy();
};
module.exports = LogViewer;
},{"../modules/ScrollButtons":20,"./HintBox":10,"./LogEntry":11}],13:[function(require,module,exports){
var HintBox = require("../modules/HintBox");
/**
@classdesc A class managing the popup messages
@param {Phaser.Group} messageGroup - the group in which the messages are going to be displayed
@param {HintBox} hintBox - the reference to hintBox of the context
@constructor
*/
function Messager(messageGroup, hintBox)
{
	this.messageGroup = messageGroup;
	this.hintBox = hintBox;
	messageGroup.x = game.world.centerX;
	messageGroup.y = game.world.centerY;
	messageGroup.pivot = new Phaser.Point(game.world.centerX, game.world.centerY);
	//this.context = context;
	//constants
	this.style = { font: "27px Courier New, monospace", fontWeight: "bold", fill: "#FF5011", align:"center", wordWrap: true, wordWrapWidth: 600};
	this.styleLong = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF5011", align:"center", wordWrap: true, wordWrapWidth: 600};
	
	var pauseShadow = game.add.sprite(game.world.centerX, game.world.centerY, "black", 0, messageGroup);
	pauseShadow.anchor.setTo(0.5);
	pauseShadow.alpha = 0;
	pauseShadow.inputEnabled = true;
	
	//message frame
	var messageFrame = game.add.image(game.world.centerX, game.world.centerY, "dialogueBox", 0, messageGroup);
	messageFrame.anchor.setTo(0.5);
	//message text
	this.messageText = game.add.text(game.world.centerX, game.world.centerY  - 35, "", this.style, this.messageGroup);
	this.messageText.anchor.setTo(0.5);
	//confirmButton
	var confirmButton = game.add.button(game.world.centerX, game.world.centerY + 80, "gotItButton", this.exit, this, 0, 0, 1, 0, this.messageGroup);
	confirmButton.anchor.setTo(0.5);
	this.hintBox.setHintBox(confirmButton, "(Enter or SpaceBar)");
	messageGroup.visible = false;
	
	this.messageQueue = [];	//a queue for messages to be displayed
	//this.callbackQueue = [];	//a queue for the callback function of prompt messages. for alert messages, the values are null
	//this.lastCallback = false;	//null if the last message is an alert message
	//this.data;					//the data inputted by player
	
	//shortcut key for closing message - enter and space
	var enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
	enterKey.onDown.add(this.exit, this);
	var spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
	spaceKey.onDown.add(this.exit, this);
	game.input.keyboard.addKeyCapture(Phaser.Keyboard.SPACEBAR);
}

/**
Create message that for the player. Similar to alert or prompt.
The message is immediately displayed if there is no other messages;
it's cached in queue if there are other messages.
@param {string} texts - the message to be displayed
@param {function} callback - callback function to be called when the player has entered data. If the message is alert message instead of prompt, this value is null. N.B. the context of the callback function is already given at the constructor
*/
Messager.prototype.createMessage = function(texts/*, callback*/)
{
	this.messageQueue.push(texts);
	//this.callbackQueue.push(callback);
	if(this.messageGroup.visible == false)
		this.display();
};
/**
Private function.
Extract one message from the queue and display it
*/
Messager.prototype.display = function()
{
	var message = this.messageQueue.shift();
	//var callback = this.callbackQueue.shift();
	//this.lastCallback = callback;
	this.messageText.setText(message);
	if(message.length<60)	//auto adjust text size depending on text length
		this.messageText.setStyle(this.style);
	else this.messageText.setStyle(this.styleLong);
	this.messageGroup.visible = true;
	//popout animation
	this.messageGroup.scale.setTo(0.01);
	var tween = game.add.tween(this.messageGroup.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
};

/**
Private function.
Close the current message. May start a pending message
*/
Messager.prototype.exit = function()
{
	/*if(this.lastCallback)	//prompt message only
		this.lastCallback(this.context, this.data);*/
	this.messageGroup.visible = false;
	this.hintBox.hide();
	//go to display the next message
	if(this.messageQueue.length)
		this.display();
};

module.exports = Messager;
},{"../modules/HintBox":10}],14:[function(require,module,exports){
var dynamic_text = require("../modules/dynamic_text");

/**
@classdesc The class parses (not json parsing) the data for intro/outro, hall and personal notes. It also deal with the effects like potrait, typing-like animation and the display of image-text-mixed page. The lifecycle of these sprites or groups are also managed here.
The state of intro, outro, credits and tutorial will use the dynamic text and the image-text-mixed page (pattern == 0)
The state of hall (dialogue) needs the typing-like dynamic text and dialogue related things like the speaker potrait (pattern == 1)
The interface of personal notes will use the pure text and the image-text-mixed page (pattern == 2)
Each of the above interface will create one instance of this class
@param {int} x -  the minimum x coordinate to create the sprite/sprites
@param {int} y -  the minimum y coordinate to create the sprite/sprites
@param {int} pattern - which multimedia pattern is requested. 0: intro/outro/credits/tutorial, 1: hall, 2: personal notes
@param {Phaser.Group} fatherGroup - create the elements into this group, and the content will be placed in the right layer
@param {function} callback - (optional) the callback function when the player click on the dialogue. (for dialogue only)
@param {Object} callbackContext - (optional) the context of the callback function (for dialogue only)

@constructor
*/
function MultimediaText(x, y, pattern, fatherGroup)
{
	this.x = x;
	this.y = y;
	this.pattern = pattern;
	//add elements in fatherGroup to be presented in the right layer
	this.fatherGroup = fatherGroup;
	
	//the two default sytles for texts together with image group
	this.styles = { font: "20px Courier New, monospace", fill: "#00AA11", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 310};
	this.styleDialogue = { font: "20px Courier New, monospace", fill: "#FFF022", align: "left", wordWrap: true, wordWrapWidth: game.width - 520};
	this.styleNotes = { font: "20px Segoe Print", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 320};
	this.styleName = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00AA11", align: "left", }; 
	
	//index of the last Image-text-mixed page. It's useful when hiding last image-text-mixed page
	this.lastImagePage = -1;		
	this.pageGroups = [];		//buffer the image pages already created
	
	if(pattern == 0)		//intro, outro, credits and tutorial
	{
	//initialize dynamic text
		this.textSprite = game.add.text(x, y, "", this.styles);
		this.finishSignal = new Phaser.Signal();	//signals when typing finishes
		this.finishSignal.add(this.writeFinishedFunc, this);		
	//initialize image
		
		return this;
	}
	if(pattern == 1)		//hall (dialogue)
	{
		this.dialogueGroup = game.add.group();
		fatherGroup.add(this.dialogueGroup);
	//initialize dynamic text
		
	//dialogue frame, potrait and name of the speaker
		//two arguments expected exclusively for dialogue
		if(arguments.length < 5)
		{
			window.alert("Error! more arguments as callback function when clicking on dialogue are expected!");
			exit(4);
		}
		this.callbackFun = arguments[4];
		this.callbackContext = arguments[5];

		this.dialogueFrame = this.dialogueGroup.create(x-150, y-60, "dialogueBox");
		this.nameSprite = game.add.text(x-130, y-30, "", this.styleName, this.dialogueGroup);		//the speaker name awaits
		//this.nameSprite.anchor.setTo(0.5, 0.5);
		//game.world.bringToTop(this.nameSprite);
		//immediately finish typing animation or dismiss the dialogue page
		//this.dialogueGroup.inputEnabled = true;
		this.dialogueFrame.inputEnabled = true;
		//this.dialogueGroup.input.enableDrag(false, true);
		this.dialogueFrame.events.onInputDown.add(this.tapOnDialogue, this);
		this.dialogueGroup.visible = false;
		//this.textSprite.bringToTop();
		this.textSprite = game.add.text(x, y, "", this.styleDialogue, this.dialogueGroup);
		this.finishSignal = new Phaser.Signal();	//signals when typing finishes
		this.finishSignal.add(this.writeFinishedFunc, this);
		return this;
	}
	if(pattern == 2)		//personal notes
	{
	//initialize pure text
		this.textSprite = game.add.text(this.x, this.y, "", this.styleNotes, this.fatherGroup);
	//initialize image
	
		return this;
	}	
}

/**
Set the single-page dynamic text that has typing animation. no more parsing (not json parsing) is needed
@param {string} pureText - the pure text to display with typing animation. no more parsing (not json parsing) is needed
*/
MultimediaText.prototype.dynamicText = function(pureText)
{
	//stop previous dialogue animation when new dialogue already coming
	this.finishWriting();
	
	this.textSprite.setText("");
	this.pureText = pureText;
	//hide the last image page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	
	this.writeTimer = dynamic_text.write_one(this.textSprite, 20, pureText, this.finishSignal);
	this.writeFinished = false;
	game.globals.audioManager.typingOn();
}

/**
Create dynamic text that involve typing animation.
@parm {string} pureText - a string to be dynamically displayed
@param {Phaser.Key} portrait - the key of the portrait
@param {string} name - the name of the speaker
*/
MultimediaText.prototype.dynamicTextWithPortrait = function(pureText, portrait, name)
{	
	if(this.dialogueGroup.visible == false || this.nameSprite.text != name)
	{//create new dialogue if old one closed, or if speaker name changed
		this.dialogueGroup.visible = true;
		/*because of potential portrait change. the portrait sprite
		always has to be created*/
		if(this.portraitSprite)
			this.portraitSprite.destroy();
		this.portraitSprite = this.dialogueGroup.create(this.x-130, this.y+20, portrait);
		//this.portraitSprite.anchor.setTo(0.5, 0.5);
		
		this.nameSprite.setText(name);
		//game.world.bringToTop(this.nameSprite);
		//game.world.bringToTop(this.textSprite);
		this.dynamicText(pureText);
	}
	else	//continue with old dialogue page (when changing page)
	{
		this.dynamicText(pureText);
	}
}

/**
Set the single-page text.
@param {string} pureText - the pure text to display. no more parsing (not json parsing) is needed
*/
MultimediaText.prototype.normalText = function(pureText)
{
	//hide the last image-text-mixed page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	
	this.textSprite.setText(pureText);
	game.world.bringToTop(this.textSprite);
	
	//this.writeFinished = true;
}

/**
Create a single image-text-mixed page.
Previously visited pages with image are hidden and buffered by this class (instead of been destroyed). This function try to use buffered image page before creation.
For the case of personal notes, changing note will clear the this buffer (because the whole page buffer is changed).
@param {string} textToParse - a string describing a single page with indicators for images and texts. The following parsing process (not json parsing) will create the page by linking the assets and place images and texts in specified location
@param {int} currentPage - the index of the page among all the pages. It helps the function to know where to buffer the page (for future reuse)
@returns {Array} - the image-text-mixed page just created
*/
MultimediaText.prototype.imageText = function(textToParse, currentPage)
{
	this.finishWriting();
	this.textSprite.setText("");
	//hide the last image-text-mixed page if there is one (!=-1)
	if(this.lastImagePage != -1)
		this.pageGroups[this.lastImagePage].visible = false;
	this.lastImagePage = currentPage;

	//If the page has already been opened before, the group is just displayed, instead of recreating all the objects
	if (this.pageGroups[currentPage]) {
		this.pageGroups[currentPage].visible = true;
	}
	else {
		//Creates the current page group
		this.pageGroups[currentPage] = window.game.add.group();
		this.fatherGroup.add(this.pageGroups[currentPage]);

		//Puts all the commands on one line removing the line breaks
		var commands = textToParse.split(/\r\n|\r|\n/).join("");

		//Splits the commands into an array based on the # character
		var commandsArray = commands.split("#");
		var args;

		for(index in commandsArray)
		{
			//Each command is split against the $ character to obtain each argument
			args = commandsArray[index].split("$");

			//Skips the first empty substring (before the first $)
			if (index !== 0) {
				//Identifies if a current command is the creation of an image
				if (args[0] === "image") {
					//Creates an images passing its X and Y coordinates and the sprite key,
					//respectively contained in args[1], args[2], and args[3]
					var image = this.pageGroups[currentPage].create(parseInt(args[1]), parseInt(args[2]), args[3]);
					image.anchor.setTo(0.5, 0.5);
					if(args[4] && args[5])
					{	//optionally two more parameters as the width and height of the displayed size.
						image.width = parseInt(args[4]);
						image.height = parseInt(args[5]);
					}
					else if(args[4] && !args[5])
					{	//one parameter only. It will be used for both width and height.
						image.width = parseInt(args[4]);
						image.height = parseInt(args[4]);
					}
				}
				//Identifies if a current command is the creation of a text box
				else if (args[0] === "text") {
					var text;
					//If the word wrap width has been specified the text style is overwritten
					if (args[4]) {
						if(this.pattern == 2)
							var style = Object.assign({}, this.styleNotes);
						else var style = Object.assign({}, this.styles);
						style.wordWrapWidth = window.game.width - args[4];

						//The text objects is added (X, Y, text, new style object)
						text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], style);
					}
					else {
						//The text object is added (X, Y, text, style object)
						if(this.pattern == 2)
							text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], this.styleNotes);
						else text = window.game.add.text(parseInt(args[1]), parseInt(args[2]), args[3], this.styles);
					}
					text.anchor.setTo(0, 0.5);
					this.pageGroups[currentPage].add(text);
				}
			}
		}
	}
	this.writeFinished = true;
	if(this.pattern == 0)
		this.finishSignal.dispatch();
}

/**
(dialogue only) Invoked when the player clicked on the dialogue.
If typing animation going on, finish animation immediately; if animation finished, call the dismissDialogue function trying to close the current dialogue page
*/
MultimediaText.prototype.tapOnDialogue = function()
{
	if(this.writeFinished == false)
		this.finishWriting();
	else this.callbackFun.call(this.callbackContext);
}

/**
 * Immediately stops the current dynamic writing and prints the whole text. 
 */
MultimediaText.prototype.finishWriting = function(){
	if(this.writeFinished == true)
		return;
	if (this.pureText)
	{
		this.writeTimer.stop();
		game.globals.audioManager.typingOff();
		this.textSprite.setText(this.pureText);
		this.finishSignal.dispatch();
	}
}

/**
 * The text has been completely written.
 private function
 */
MultimediaText.prototype.writeFinishedFunc = function(){
	this.writeFinished = true;
	game.globals.audioManager.typingOff();
}

/**
(dialogue only) Hide the dialogue box (when a NPC finished his/her multi-page dialogue), waiting for potential future reuse
*/
MultimediaText.prototype.hideDialogue = function()
{
	this.dialogueGroup.visible = false;
	this.textSprite.setText("");
}

/**
(personal notes only) Reinitialize the buffer for next piece of personal note
*/
MultimediaText.prototype.reinitialize = function()
{
	if(this.pageGroups.length)
		for(i in this.pageGroups)
			this.pageGroups[i].destroy();
	this.pageGroups = [];
	this.lastImagePage = -1;
}
/**
Recycle resources when a group of pages are closed
When a set of dialogues finishes - destroy the text, the timer and the potrait group (the potrait and the name)
When the intro, outro screen finishes - destroy the text, timer and image-text-mixed pages
When the personal notes is closed - destory the text and image-text page corresponding to the note
*/
MultimediaText.prototype.clean = function()
{
	//maybe unnecessary, destroyed with the class destruction?
	this.textSprite.setText("");
	if(this.writeTimer)
		this.writeTimer.destroy();
	if(this.dialogueGroup)
		this.dialogueGroup.destroy();
	if(this.pageGroups.length)
		for(i in this.pageGroups)
			this.pageGroups[i].destroy();
	game.globals.audioManager.typingOff();
}
module.exports = MultimediaText;
},{"../modules/dynamic_text":21}],15:[function(require,module,exports){
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
				.prerequisites[p].npc			//the requirement on other npcs (denoted by id) before entering the state s
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
					"prerequisites": []};
			npc.speeches.push(speech);
		}
		this.NPCs.push(npc);
	}
	//second round, fill prerequisites, changing the "npc" field from npc names into npc ids
	for(n in this.NPCs)
	{
		npcSource = global.NPCs[n];
		for(s in npcSource.speeches)
			for(p in npcSource.speeches[s].prerequisites)
			{
				//the name of the npc which will be converted into npc id
				string = npcSource.speeches[s].prerequisites[p].npc;
				targetId = this.name2id(string);
				if(targetId == -1)
				{
					var errorMessage = "Error! In the file scenario" + index + "_NPCs.json, in the prerequisites of the speeches, a reference to a npc name is not found!";
					game.state.start('error', true, false, errorMessage);
				}
				else
				{
					pre = { "npc": targetId, 
								"state": npcSource.speeches[s].prerequisites[p].state };
					this.NPCs[n].speeches[s].prerequisites.push(pre);
				}
				/*pre = null;
				for(id in NPCs)
					if(this.NPCs[id].name == string)
					{
						pre = { npc: id, 
								state: npcSource.speeches[s].prerequisites.state };
						break;
					}
				if(pre)
				{
					window.alert("Error! in the scenario file scenario" + scenarioIndex + "NPCs.json, in the prerequisites of the speeches, a reference to a npc name is not found!");
					exit(3);
				}
				else this.NPCs[n].speeches[s].prerequisites.push(pre);*/
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
Check if the speech prerequisites have fullfiled. If so, the NPC's speech state will advance to the next one
Also return the current speech state 
@param {int} id - the id (also the index) of the NPC the player is  talking to
*/
NPCManager.prototype.updateSpeech = function(id)
{
	var state = this.NPCs[id].currentState + 1;		//the potential future state
	var pre = [];		//buffers the prerequisites of the concerned speech state
	var targetId;		//the id of the NPC whose state is checked
	var fullfiled;		//a boolean flage to check if all the update prerequisites are fullfiled
	if(state < this.NPCs[id].speeches.length)		//if this is not the last speech
	{
		fulfilled = true;
		//prerequisites is always defined, even if not specified in file
		pre = this.NPCs[id].speeches[state].prerequisites;
		for(p in pre)	//check each prerequisites
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
},{}],16:[function(require,module,exports){
var PersonalNotes = require("../modules/PersonalNotes");
var ScrollButtons = require("../modules/ScrollButtons");
var MultimediaText = require("../modules/multimediaText");
var HintBox = require("../modules/HintBox");

/**
The class that manages the interface of personal notes. A new instance is created every time the personal notes is refered to.
@param {Phaser.Group} fatherGroup - the group to created notes in
@constructor
*/
function Notes(fatherGroup)
{	
	//constants
	this.namesPerPage = 10;	//maximum number of names that can be shown without scrolling
	this.styleLabel = { font: "12px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleAlsoSee = { font: "15px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleTitle = { font: "17px Segoe Print", fontWeight: "bold", align: "center"};
	this.styleLink = { font: "15px Segoe Print", fontWeight: "bold", fill: "#3300FF", align: "center"};
	//this.style = { font: "16px Courier New, monospace", fontWeight: "bold", fill: "#00FF11", align: "left", wordWrap: true, wordWrapWidth: window.game.width - 95};
	//this.style = { font: '24px Arial', fill: '#fff'};
	this.fatherGroup = arguments[0];
	this.fatherGroup.visible = false;
	
	this.hintBox = new HintBox("box");
	this.noteNames =[];		//array of strings
	this.descTexts = [];	//array of strings. Assigned at each time a name is clicked
	this.nameSprites = [];	//sprites
	this.descGroup;		//sprite

	this.personalNotes = game.globals.personalNotes;
	this.noteNames = this.personalNotes.getNames();	//retrieve the names
	//the number of pages of the names
	this.nameNPage = Math.ceil(this.noteNames.length/this.namesPerPage);
	
	//general frame
	this.PNFrame = game.add.sprite(1000, 0, "notes", 0, this.fatherGroup);
	this.PNFrame.anchor.setTo(1,0);
	/*intercept all clicking events before they reach those buttons covered by this image*/
	this.PNFrame.inputEnabled = true;
	//name panel
	this.nameGroup = game.add.group();
	this.fatherGroup.add(this.nameGroup);
		//scroll buttons for the name list
	this.nameScroll = new ScrollButtons(200, 50, 570, this.updateNamePage, this, this.nameNPage, this.nameGroup);
		
	//description panel
	this.descGroup = game.add.group();
	this.fatherGroup.add(this.descGroup);
	//scroll buttons for the description
		//number of pages of the description is initialized as 0. It will be updated by readNote function
	this.descScroll = new ScrollButtons(955, 100, 500, this.updateDescPage, this, 0, this.descGroup);	
	this.descriptionTitle = game.add.text(550, 30, "", this.styleTitle, this.descGroup);
	this.descriptionTitle.anchor.setTo(0.5);
	this.multimedia = new MultimediaText(230, 50, 2, this.descGroup);	//to manage the the image-text-mixed page
	this.theDesc;		//a pointer to the current pure text description or the image-text-mixed description

	this.internalGroup = game.add.group();
	this.fatherGroup.add(this.internalGroup);
	
	//shortcut key for personal notes
	var escKey = game.input.keyboard.addKey(Phaser.Keyboard.ESC);
	escKey.onDown.add(this.escFun, this);
	var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
	scrollUpKey.onDown.add(this.scrollFun, this);
	var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
	scrollDownKey.onDown.add(this.scrollFun, this);
}
/**
Formally create the personal notes, after the player have clicked on "personal notes"
*/
Notes.prototype.createNotes = function()
{
	if(this.fatherGroup.visible == true)
		return;	//avoid diplaying two personal notes
	this.fatherGroup.visible = true;
	game.globals.audioManager.lowVolume(true);
	
	//exit button
	this.exitButton = game.add.button(game.world.width-30, 30, "cross", this.exitNotes, this, 0, 0, 1, 0, this.fatherGroup);
	this.hintBox.setHintBox(this.exitButton, "Close (ESC)       ");
	this.exitButton.anchor.setTo(0.5);
	
	this.updateNamePage(0);	//name starts at the first page
	/*description starts at the introduction of personal notes
	arguments[2] is the customized one, the id of the entry*/
	this.readNote(0);
};

/**
converts entry name(string) to entry id(int)
@param {string} name - entry name
ret: -1 for not found
*/
Notes.prototype.name2id = function(name)
{
	for(id in this.noteNames)
		if(this.noteNames[id] == name)
			return id;
	return -1;
};

/**
update the page of note names. without clicking on a note name, the description does not change
@param {int} targetPage - the index of the target page among the pages of note names
*/
Notes.prototype.updateNamePage = function(targetPage)
{
	var i;
	//clean old names
	for(i in this.nameSprites)
		this.nameSprites[i].destroy();
	this.nameSprites = [];
	var nextItem = targetPage * this.namesPerPage;
	var outerItem = Math.min(nextItem + this.namesPerPage, this.noteNames.length);
	for(i=0; nextItem < outerItem; nextItem++, i++)
	{
		this.nameSprites[i] = game.add.text(103, 100+47*i, this.noteNames[nextItem], this.styleLabel, this.nameGroup);
		this.nameSprites[i].anchor.setTo(0.5);
		this.nameSprites[i].inputEnabled = true;
		this.nameSprites[i].buttonMode = true;
		//this.nameSprites[i].events.onInputDown.add(this.readNote, this, 0, nextItem);
		this.nameSprites[i].events.onInputDown.add(this.clickOnNote, this, 0, nextItem);
		this.hintBox.setHintBox(this.nameSprites[i], "Click to read");
	}
	/*//if left items are more than one page, set to secenarios per page; it left items less than one page, set to the number of items left
	var itemsThisPage = Math.Min(this.noteNames.length - targetPage*this.namesPerPage, this.namesPerPage);
	for(i=0; i<itemsThisPage; i++)
	{
		this.nameSprites[i] = game.add.text(50, 50+50*i, this.noteNames[this.namesPerPage*targetPage + i], style, nameGroup);
		this.nameSprites[i].anchor.setTo(0, 0);
	}*/
};
/**
Invoked on clicking event on note name. Deligate the work to readNote.
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} id - the id (index) indicating an entry in the note. 
*/
Notes.prototype.clickOnNote = function(sprite, pointer, id)
{
	this.readNote(id);
};

/**
Read the note, displaying the first page of the description
@param {int} id - the id (index) indicating an entry in the note. usually the act name or the buff name
*/
Notes.prototype.readNote = function(id)
{
	/*the first two arguments of the button's callback are occupied
	customized arguments can be passed starting from arguments[2]*/
	///var id = arguments[2];
	this.descriptionTitle.setText(this.noteNames[id]);
	var texts = this.personalNotes.getDesc(id);
	//update the description, which is divided into pages by "^" character
	this.descTexts = texts.split("^");
	//description need to reset of multimediaText's page buffer, as well as updating the scroll button's number of pages
	this.multimedia.reinitialize();
	this.descScroll.setNPages(this.descTexts.length);
	//show the first page of the description
	this.updateDescPage(0);
	this.descScroll.setCurrentPage(0);
	
	//link to other entries within the personal notes
		//clean group
	this.internalGroup.removeAll(true);
		//new internal links
	var internalLinks = this.personalNotes.getInternalLinks(id);
	if(internalLinks && internalLinks.length)
	{
		var length = internalLinks.length;
		game.add.text(230, 550, "Also see:", this.styleAlsoSee, this.internalGroup);
		for(var i = 0; i < length; i++)
		{
			var internalText = game.add.text(300, 590-(length -i)*25, internalLinks[i], this.styleLink, this.internalGroup);
			internalText.inputEnabled = true;
			var newId = this.name2id(internalLinks[i]);
			internalText.events.onInputDown.add(this.internal, this, 0, newId);
			this.hintBox.setHintBox(internalText, "Click to jump to");
		}
	}
		
	//link to external source of knowledge
		//clean button
	if(this.externalButton1)
		this.externalButton1.destroy();
	if(this.externalButton2)
		this.externalButton2.destroy();
		//new button
	var urls = this.personalNotes.getUrls(id);
	if(urls)
	{
		if(urls[0])
		{
			this.externalButton1 = game.add.button(770, 550, "link", this.external, this, 0, 0, 1, 0, this.fatherGroup);
			this.externalButton1.anchor.setTo(0.5);
			this.externalButton1.url = urls[0];
			this.hintBox.setHintBox(this.externalButton1, "View external link");
		}
		if(urls[1])
		{
			this.externalButton2 = game.add.button(620, 550, "link", this.external, this, 0, 0, 1, 0, this.fatherGroup);
			this.externalButton2.anchor.setTo(0.5);
			this.externalButton2.url = urls[1];
			this.hintBox.setHintBox(this.externalButton2, "View external link");
		}
	}
};
/**
Invoked when a internal link is clicked. Will change to the designated entry in the personal notes
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} id - the id of the target entry
*/
Notes.prototype.internal = function(sprite, pointer, id)
{
	if(id == -1)
	{
		game.globals.messager.createMessage("Sorry. This entry is not found in personal notes!");
		return;
	}
	this.hintBox.hide();
	this.readNote(id);
};

/**
Invoked when the external button is clicked. Will open a link to external page, where more comphrehensive knowledge of the topic is put
@param {Phaser.Button} button - the button that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
*/
Notes.prototype.external = function(button, pointer)
{
	this.hintBox.hide();
	var url = button.url;
	window.open(url);
};

/**
update the page of note description part (e.g. to page 3). Does not read other notes ("name" not changed)
@param {int} targetPage - the index of the target page among the pages of descriptions (from one note)
*/
Notes.prototype.updateDescPage = function(targetPage)
{
	var currentText = this.descTexts[targetPage];
	if(currentText[0] != "#")
		this.theDesc = this.multimedia.normalText(currentText);
	else this.theDesc = this.multimedia.imageText(currentText, targetPage);
};

/**
When the player presses on "ESC" key
The function may also be invoked when personal notes not opened!
Therefore, a check is necessary
*/
Notes.prototype.escFun = function()
{
	if(this.fatherGroup.visible == true)
	//if(this.exitButton && this.notes.exitButton.alive == true/*this.nameGroup && this.nameGroup.length*/)
		this.exitNotes();
};
/**
When the player presses on pageUp or pageDown key
*/
Notes.prototype.scrollFun = function(key)
{
	//ignore shortcut key if personal notes not opened
	if(!this.descScroll)
		return;
	if(key.keyCode == Phaser.Keyboard.PAGE_UP)
		this.descScroll.scrollUp();
	else this.descScroll.scrollDown();
};

/**
Close the personal note, and return to where it was
The lower layer sprites are revealed
*/
Notes.prototype.exitNotes = function()
{
	this.hintBox.hide();
	this.fatherGroup.visible = false;
	this.exitButton.destroy();
	/*this.fatherGroup.removeAll(true);
	this.nameGroup.destroy();
	//this.description.destroy();
	
	this.PNFrame.destroy();
	this.nameScroll.destroy();
	delete this.nameScroll;
	this.descriptionTitle.destroy();
	this.descScroll.destroy();
	delete this.descScroll;
	this.multimedia.clean();
	this.internalGroup.destroy(true);
	if(this.externalButton1)
		this.externalButton1.destroy();
	if(this.externalButton2)
		this.externalButton2.destroy();*/
	//restore the music volume
	game.globals.audioManager.lowVolume(false);
};
module.exports = Notes;
},{"../modules/HintBox":10,"../modules/PersonalNotes":17,"../modules/ScrollButtons":20,"../modules/multimediaText":24}],17:[function(require,module,exports){
/**
@classdesc A class storing the personal notes. created at load state in game.globals
@param {Object} parsedNotes - the personal notes object read from the file after json parsing
@constructor
*/
function PersonalNotes(parsedNotes)
{
	this.noteNames = [];
	this.noteDescs = [];
	this.sees = [];
	this.urls = [];
	
	var i, j, id;
	
	//"personal notes" entry
	this.noteNames.push("Personal Notes");
	if(parsedNotes.desc == undefined)
		parsedNotes.desc = "";
	this.noteDescs.push(parsedNotes.desc);


	if(parsedNotes.acts != undefined)
	{
		//"Offensive acts" entry (if present)
		if(parsedNotes.acts.offDesc != undefined)
		{
			this.noteNames.push("Offensive acts");
			this.noteDescs.push(parsedNotes.acts.offDesc);
		}
		
		if(parsedNotes.acts.offensive)
			//add those offensive acts
			for(i=0; i< parsedNotes.acts.offensive.length; i++)	
				if(parsedNotes.acts.offensive[i].name != undefined)
				{
					id = this.noteNames.push(parsedNotes.acts.offensive[i].name);
					this.noteDescs.push(parsedNotes.acts.offensive[i].desc);
					//internal links
					if(parsedNotes.acts.offensive[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.acts.offensive[i].sees)
							this.sees[id-1].push(parsedNotes.acts.offensive[i].sees[j]);
					}
					//if url1 or url2 not defined in the json file, they will just be undefined in the class.
					var urls = [parsedNotes.acts.offensive[i].url1, parsedNotes.acts.offensive[i].url2];
					this.urls[id-1]= urls;
				}
		
		//"Defensive acts" entry (if present)
		if(parsedNotes.acts.defDesc != undefined)
		{
			this.noteNames.push("Defensive acts");
			this.noteDescs.push(parsedNotes.acts.defDesc);
		}
		if(parsedNotes.acts.defensive)
			//add those defensive acts
			for(i=0; i< parsedNotes.acts.defensive.length; i++)	
				if(parsedNotes.acts.defensive[i].name != undefined)
				{
					id = this.noteNames.push(parsedNotes.acts.defensive[i].name);
					this.noteDescs.push(parsedNotes.acts.defensive[i].desc);
					//internal links
					if(parsedNotes.acts.defensive[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.acts.defensive[i].sees)
							this.sees[id-1].push(parsedNotes.acts.defensive[i].sees[j]);
					}
					//if url1 or url2 not defined in the json file, they will jsut be undefined in the class.
					var urls = [parsedNotes.acts.defensive[i].url1, parsedNotes.acts.defensive[i].url2];
					this.urls[id-1]= urls;
				}
	}
	if(parsedNotes.buffs != undefined)
	{
		//"Buffs" entry (if present)
		if(parsedNotes.buffs.buffDesc != undefined)
		{
			this.noteNames.push("Buffs");
			this.noteDescs.push(parsedNotes.buffs.buffDesc);
		}
		//add buffs themselves
		for(i=0; i< parsedNotes.buffs.buffs.length; i++)	
			if(parsedNotes.buffs.buffs[i].name != undefined)
			{
				id = this.noteNames.push(parsedNotes.buffs.buffs[i].name);
				this.noteDescs.push(parsedNotes.buffs.buffs[i].desc);
				//internal links
					if(parsedNotes.buffs.buffs[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.buffs.buffs[i].sees)
							this.sees[id-1].push(parsedNotes.buffs.buffs[i].sees[j]);
					}
				//if url1 or url2 not defined in the json file, they will jsut be undefined in the class.
				var urls = [parsedNotes.buffs.buffs[i].url1, parsedNotes.buffs.buffs[i].url2];
				this.urls[id-1]= urls;
			}
	}
}

/**
get the number of entries in the personal notes
*/
PersonalNotes.prototype.getSize = function()
{
	return this.noteNames.length;
};

/**
retrieve all the note name
@returns {Array} - name array of the notes
*/
PersonalNotes.prototype.getNames = function()
{
	return this.noteNames;
};

/**
Return the entry's description
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getDesc = function(id)
{
	/*for(id=0; id< this.noteNames.length; id++)
		if(this.noteNames[id] == name)
			return this.noteDescs[id];
	return -1;*/
	return this.noteDescs[id];
};

/**
Return the entry's internal links
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getInternalLinks = function(id)
{
	return this.sees[id];
};

/**
Return the entry's two externalLink
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getUrls = function(id)
{
	return this.urls[id];
};
module.exports = PersonalNotes;
},{}],18:[function(require,module,exports){
var LogEntry = require("../modules/LogEntry");

/**
A value class storing the player's record. It is created at one completion of a scenario. scores are calculated at its construction. New record with higher player's score will overwrite the old one.
@param {Array} logs - an array of LogEntry, which record the offensive or defensive actions and their consequences in the last battle
@param {int} role - the player's role in the battle. 0 for intruder, 1 for defender
@param {int} endingRound - at which round the game finishes. useful for calculating the score when the intruder wins
@param {int} assetsCompromised - the amount of assets lost. useful for calculating the score when the defender wins
@constructor
*/
function RecordEntry(logs, role, endingRound, assetsCompromised)
{
	this.logs = logs;
	this.role = role;
	this.endingRound = endingRound;
	this.assetsCompromised = assetsCompromised;
	this.scores = [0, 0];	//an array of the form [intruder's score, defender's score]. used only at double player mode
	this.calculateScores();
	this.score = this.scores[role];	//used by single player mode
}
/**
The function that calculate the scores of the two characters based on the action log
*/
RecordEntry.prototype.calculateScores = function()
{
	for(var l in this.logs)
	{
		if(this.logs[l].round%2 == 0)	//intruder's round
			if(this.logs[l].success)
			//{
				//if(this.role == 0)
					this.scores[0] += 90;	//intruder gains 90 points at each success at his round
			//}
			else //if(this.role == 1)
					this.scores[1] += 100;	//defender gains 100 points at each failure at intruder's round
	}
	//if(this.role == 0)
	//{
		this.scores[0] -= this.endingRound*50;		//intruder loss 40 points for every round the defender survives
		this.scores[0] += this.assetsCompromised*5;	//intruder gains 4 points for every damage dealt to the assets
	//}
	//else 
	//{
		this.scores[1] += this.endingRound*50;		//defender gains 40 points for every round he survives
		this.scores[1] -= this.assetsCompromised*5;	//defender loss 4 points for every damage dealt to the assets
	//}
	/*nagative score is too much frustrating for the players, even if they did play badly.
	nagative scores will be raised to zero, hoping to console them a little*/
	if(this.scores[0] < 0)	
		this.scores[0] = 0;
	if(this.scores[1] < 0)	
		this.scores[1] = 0;
};

module.exports = RecordEntry;

},{"../modules/LogEntry":11}],19:[function(require,module,exports){
var MultimediaText = require("../modules/MultimediaText");

/** 
@classdesc A class managing the in-game scripts used to dynamically show dialogues, unlock acts, or lock on end turn button before player has done an action.
The AI however, is managed by AIManager.
@param {int} index - the scenario number
@param {cyberspace} cyberspace - the reference to cyberspace state
@param {ActManager} actManager - the reference to actManager
@param {AiManager} aiManager - the reference to aiManager. Used only to invoke the attempt to unlock act pattern for the AiManager
@param {Phaser.Group} dialogueGroup - the group to create the dialogues in
@constructor
*/
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

},{"../modules/MultimediaText":14}],20:[function(require,module,exports){
/**
@classdesc The class that manages the construction of scroll arrows, as well as the scrolling.
It updates the current page number, and call the real page update function from the caller.
@param {int} maxX - the maximum x value of the sprite group where the scroll arrows are in.
@param {int} minY - the minimum Y value of the sprite group where the scroll arrows are in.
@param {int} maxY - the maximum Y value of the sprite group where the scroll arrows are in.
@param {function} updateFunction - the update function to call when the scroll up or scroll down arrow is clicked
@param {Object} context - the context of updateFunction
@param {int} NPage - the number of page
@param {Phaser.Group} group - the group this button is to join. Useful for hiding or deleting with a whole group, and useful for aligning it to the right layer.
@constructor
*/
function ScrollButtons(maxX, minY, maxY, updateFunction, context, NPages, fatherGroup)
{
	this.updateFunction = updateFunction;
	this.context = context;
	this.NPages = NPages;
	this.fatherGroup = fatherGroup;
	//constants
	this.style = { font: "15px Segoe UI black", fontWeight: "bold", fill: "#FF3300", align: "right"};
	
	this.currentPage = 0;
	this.scrollGroup = game.add.group();
	//add to the parent group, which is passed as parameter
	fatherGroup.add(this.scrollGroup);
	this.upArrow = game.add.button(maxX, minY+20, "arrowUp", this.scrollUp, this, 0, 0, 0, 0, this.scrollGroup);
	this.upArrow.anchor.setTo(1, 1);
	this.upTween = game.add.tween(this.upArrow.scale).to({y:1.5}, 500,
            Phaser.Easing.Linear.None, false, 0, -1, true).start();
	this.upTween.pause();
	this.upArrow.events.onInputOver.add(this.startTween, this, 0, true);
	this.upArrow.events.onInputOut.add(this.stopTween, this, 0, true);
	
	this.downArrow = game.add.button(maxX, maxY-20, "arrowDown", this.scrollDown, this, 0, 0, 0, 0, this.scrollGroup);
	this.downArrow.anchor.setTo(1, 0);
	//this.downTween = game.add.tween(this.downArrow.scale).to({y: 2}, 500,Phaser.Easing.Bounce.In, true, 0, -1, false).start();
	this.downTween = game.add.tween(this.downArrow.scale).to({y:1.5}, 500, Phaser.Easing.Linear.None, false, 0, -1, true).start();
	this.downTween.pause();
	this.downArrow.events.onInputOver.add(this.startTween, this, 0, false);
	this.downArrow.events.onInputOut.add(this.stopTween, this, 0, false);
	
	//text to indicate the current and maximum page
	this.pageIndicator = game.add.text(maxX, (minY+maxY)/2, parseInt(this.currentPage+1) + "/" + this.NPages, this.style, this.scrollGroup);
	this.pageIndicator.anchor.setTo(1, 0.5);
}
/**
(Used by the description of personal notes or by acts when new acts are added by the script)
Set a new value for the number of pages at runtime
*/
ScrollButtons.prototype.setNPages = function(NPages)
{
	this.NPages = NPages;
	this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
};

/**
Set the current page to num (then pageIndicator will be num+1)
N.B. the content of the page should have already be updated. This function update the indicator only
@param {int} num - the number to set currentPage to
*/
ScrollButtons.prototype.setCurrentPage = function(num)
{
	this.currentPage = num;
	this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
};

/**
Resume the animation when the mouse hover over the arrow
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {boolean} up - true: up arrow, false: down arrow
*/
ScrollButtons.prototype.startTween = function(sprite, pointer, up)
{
	if(up)
		this.upTween.resume();
	else this.downTween.resume();
};
/**
Stop the animation when the mouse hover out of the arrow
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {boolean} up - true: up arrow, false: down arrow
*/
ScrollButtons.prototype.stopTween = function(sprite, pointer, up)
{
	if(up)
		this.upTween.pause();
	else this.downTween.pause();
};

/**
Scroll to the previous page if the current page is more than 0
*/
ScrollButtons.prototype.scrollUp = function()
{
	if(this.currentPage > 0)	//has previous page
	{
		this.currentPage--;
		this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
		this.updateFunction.call(this.context, this.currentPage);
	}
};

/**
Scroll to the next page if there is a next one
*/
ScrollButtons.prototype.scrollDown = function()
{
	if(this.currentPage < this.NPages -1)	//has next page
	{
		this.currentPage++;
		this.pageIndicator.setText(parseInt(this.currentPage+1) + "/" + this.NPages);
		this.updateFunction.call(this.context, this.currentPage);
	}
};

/**
Destroy everything related to the scroll buttons
*/
ScrollButtons.prototype.destroy = function()
{
	this.scrollGroup.destroy();
};
module.exports = ScrollButtons;
},{}],21:[function(require,module,exports){
/**
 * Module used to write text in real time in order to simulate keyboard typing.
 * @type {{write_one: module.exports.write_one}}
 * @module
 * @name Dynamic Text
 */
module.exports = {
    /**
     * Function to simulate keyboard typing writing one character per time.
     * @param {Phaser.Text} text - Phaser text object to write on
     * @param {int} interval - Typing speed in ms
     * @param {string} text_to_write - Text to write dynamically
     * @param {Phaser.Signal} signal - Signal dispatched when the text has been completely written
     */
    write_one: function(text, interval, text_to_write, signal) {
        var count = 0;
		//write a single character, and dispatch wrting finish signal when needed
        var f = function() {
            //The next character is added to the text printed on screen
            text.text += text_to_write[count];
            count++;

            //If all characters have been written, the timer is stopped and the end write signal is dispatched
            if (count >= text_to_write.length) {
                timer.stop();
                timer.destroy();
                if (signal) {
                    signal.dispatch();
                }
            }
        };

        //Initializes timer that loops each predefined amount of ms written in the "interval" variable
        //Each time the timer triggers the "f" function is called
		///is there really the first parameter?
        var timer = window.game.time.create(window.game, false);
        timer.loop(interval, f, this);
        timer.start();

        return timer;
    }
};
},{}],22:[function(require,module,exports){
/* global alertify */
var Messager = require("../modules/Messager");
/**
 * This module handles the CORS request management to send learning data about player's performance to the
 * data gathering server.
 * @type {{createCORSRequest: module.exports.createCORSRequest, getTitle: module.exports.getTitle, makeCorsRequest: module.exports.makeCorsRequest}}
 */
module.exports = {	
    /**
     * Create the XHR object and sets its "Content-Type" and "Content-Length" headers to make it
     * compatible with the CORS protocol.
     * @param {string} method - A string with the HTTP method to perform, e.g. "POST"
     * @param {string} url - The URL to which to make the CORS request
     * @param {string} datas - The data string to send
     * @returns {XMLHttpRequest} The created XHR object.
     */
    createCORSRequest: function(method, url, datas) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // XHR for Chrome/Firefox/Opera/Safari.
            xhr.open(method, url, true);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            //xhr.setRequestHeader("Content-length", datas.length);
        } else if (typeof XDomainRequest !== "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			//xhr.setRequestHeader("Content-length", datas.length);
        } else {
            // CORS not supported.
            xhr = null;
        }
        return xhr;
    },

    /**
     * Helper method to parse the title tag from the response.
     * @param {string} text - Response text
     * @returns {string} The parsed title.
     */
    getTitle: function(text) {
        return text.match('<title>(.*)?</title>')[1];
    },

    /**
     * Makes a CORS request to send learning data to the data gathering service. The service is supposed to be residing
     * on the same machine as the game does. If this is not the case, this function must be changed. It, in fact,
     * derives the request URL from the game one.
     * @param {string} datas - Data string to send
     */
    makeCorsRequest: function(datas) {
        //Deriving URL from the game host server URL
        var url = "http://" + window.location.hostname + ":8080/saveLearningData";

        //Creates the XHR object compliant with the CORS protocol
        var xhr = this.createCORSRequest('POST', url, datas);
        //Checks for CORS compatibility and throws an alert otherwise
        if (!xhr) {
            game.globals.messager.createMessage('CORS not supported');
            return;
        }

        //Sets the callback to execute if the request is successful
        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4 && xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                game.globals.messager.createMessage(response.message);
                //game.globals.messager.createMessage("Link to the second survey: https://goo.gl/FO94LC  (Save it with Ctrl+C and paste it in the address bar with Ctrl+V)");
            }
        };

        //Sets the callback to execute if the request fails
        xhr.onerror = function(){game.globals.messager.createMessage('Error while sending data! Maybe resend another time using the button in the game menu.');};
		

        //Actually sends the request
        xhr.send(datas);
    }
};
},{"../modules/Messager":13}],23:[function(require,module,exports){
/* global alertify */

/**
 * Module that provides data saving functionality. It uses the Web Storage APIs to save data locally on the client.
 * Save data includes completed level along with full statistics and logs.
 * @module
 * @name Load and Save Data
 */
module.exports = {
    /**
     * Loads saved data, if present, and saves them in a global variable.
     */
    loadSaveData: function() {
        if (this.checkCompatibility()) {
            var records = JSON.parse(localStorage.getItem('records'));
            if (records) {
                game.globals.records = records;
            }
        }
    },

    /**
     * Saves data in the local storage if no data for the current level exist or if the current score is higher than the saved one.
     * @param {int} index - The index of the scenario that is currently being saved
		@param {Record}	
     */
    saveSaveData: function(index, record) {
        //Create records if not existent or overwrite it if saved player's score is lower than the new one
        if (!game.globals.records[index] || game.globals.records[index].score < record.score)
		{
			game.globals.records[index] = {logs: record.logs,
											role: record.role,
											endingRound: record.endingRound,
											assetsCompromised: record.assetsCompromised,
											score: record.score
											};
            //Saves the data to the Web Storage if it is supported by the current browser
            if (this.checkCompatibility()) {
                localStorage.setItem('records', JSON.stringify(game.globals.records));
            }
        }
    },

    /**
     * Removes saved data to allow a clean restart.
     * @returns {boolean} True if data have been removed, false otherwise.
     */
    removeSaveData: function() {
        if(game.globals.records.length !== 0) {
			game.globals.records = [];
            delete game.globals.playerName;
            if (this.checkCompatibility()) {
                localStorage.removeItem('records');
                localStorage.removeItem('playerName');
				localStorage.removeItem('learningData');
            }
            return true;
        }
        else {
            return false;
        }
    },

    /**
     * Checks if Web Storage APIs are supported by the player's browser.
     * @returns {boolean} True if Web Storage is supported, false otherwise.
     */
    checkCompatibility: function() {
        var mod = 'checkStorage';
        try {
            localStorage.setItem(mod, mod);
            localStorage.removeItem(mod);
            return true;
        } catch(e) {
            console.log("Web Storage APIs not supported!!!");
            return false;
        }
    },

    /**
     * Asks the player for his/her username if it has not yet been done. If the name is acquired then the game can
     * proceed to load. Otherwise the game enters an error screen, for example the browser does not support the Web
     * Storage APIs.
     * @param {Phaser.Signal} nameSignal - Signals whether has been possible to acquire the name or not
     */
    promptForName: function (nameSignal)
	{
        if (!this.checkCompatibility()) {
            nameSignal.dispatch(false);
            return;
        }
        else if (localStorage.getItem("playerName")) { //Name has already been inserted, do not ask again
            game.globals.playerName = localStorage.getItem("playerName");
            nameSignal.dispatch(true);
            return;
        }
        // prompt dialog
        var context = this;
        var promptDialogue = alertify.prompt("Insert your name as NAME.SURNAME.Any4DigitNumber   (e.g. MARIO.ROSSI.1234)", function (e, str) 
		{	// str is the input text
            if (e) {
                // user clicked "ok"
                if (/^([a-zA-Z]{2,40}\.[a-zA-Z]{2,40}\.[0-9]{4})$/.test(str)) { //Correct name
                    game.globals.playerName = str;
                    localStorage.setItem("playerName", str);
					//alertify.success("Name saved!");
                    alertify.alert("Name saved!");
                    nameSignal.dispatch(true);
                }
                else { //Wrong name
                    alertify.alert("Name not valid! Please input your name");
					//alertify.success("Name not valid! Please input your name");
                    context.promptForName(nameSignal);
                }
            }
			else { //Name not inserted
				//alertify.error("You must insert a name!");
                alertify.alert("You must insert a name!");
                context.promptForName(nameSignal);
            }
        }, "");
    }
};

},{}],24:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"../modules/dynamic_text":21,"dup":14}],25:[function(require,module,exports){
var ScrollButtons = require("../modules/ScrollButtons");
var GameManager = require("../modules/GameManager");
var ActManager = require("../modules/ActManager");
var BuffManager = require("../modules/BuffManager");
var AIManager = require("../modules/AIManager");
var ScriptManager = require("../modules/ScriptManager");
var EffectManager = require("../modules/EffectManager");
var Messager = require("../modules/Messager");
var Notes = require("../modules/Notes");
var LogViewer = require("../modules/LogViewer");
var HintBox = require("../modules/HintBox");
var RecordEntry = require("../modules/RecordEntry");
/**
The cyber battle state. It's a turn-base fight. The turn ranges in (1,maxRound], with odd number being defender's round, even number being intruder's round. The game ends with server's assets all compromised (intruder wins) or with the maxRound reached (defender wins).
It takes the role of View in the MVC framework. GameManager takes the role of Model and Controller.
*/
var cyberspace = {
	/**
	@param {int} index - negative number for tutorials, 0 or positive number for scenarios
	@param {boolean} doublePlayer - true: double player mode, false: single player mode
	*/
	init: function(index, doublePlayer)
	{
		this.doublePlayer = doublePlayer;
		//constants
		this.actsPerPage = 5;
		this.buffsPerPage = 5;
		this.style = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00CC11", align: "left", wordWrap: true, wordWrapWidth: game.width - 270};
		this.styleUnlearnt = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#1144FF", align: "left", wordWrap: true, wordWrapWidth: game.width - 95};
		this.styleName = { font: "22px Courier New, monospace", fontWeight: "bold", fill: "#00CC11", align: "left", wordWrap: true, wordWrapWidth: game.width - 95};
		this.styleCaption = { font: "26px Courier New, monospace", fontWeight: "bold", fill: "#FFEE11", align: "left"};
		this.styleResource = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00AAFF", align: "center", wordWrap: true, wordWrapWidth: 740};
		this.styleAssets = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"};
		this.styleRequire = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#EE00FF", align: "center", wordWrap: true, wordWrapWidth: game.width - 250};
		this.styleResult = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF8800", align: "center", wordWrap: true, wordWrapWidth: game.width - 250};
		this.styleDamage = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF1100", align: "center"};
		
		if(index < 0)
			this.cyber = game.globals.tutorialCybers[0-parseInt(index)];
		else this.cyber = game.globals.scenarioCybers[index];
		this.index = index;
		
		//in single player mode, player's role; in double player mode, 1st player's role
		if(this.cyber.defensive)
			this.role = 1;
		else this.role = 0;
		this.logs = [];
		this.actSprites = [];
		
	//layer 0
		this.panelGroup = game.add.group();
	//layer 1
		this.dialogueGroup = game.add.group();
	//layer 2
		this.buffsGroup = game.add.group();	
	//layer 3
		this.popupGroup = game.add.group();
	//layer 4: the group for action logs
		this.logGroup = game.add.group();
	//layer 5
		this.notesGroup = game.add.group();
	//layer 6
		this.pauseGroup = game.add.group();
	//layer 7
		this.confirmGroup = game.add.group();
	//layer 8
		this.messageGroup = game.add.group();
		//create the managers and personal notes
		if(this.cyber.defensive)
		{
			var X = [850, 100];
			var Y = [50, 550];
		}
		else
		{
			var X = [100, 850];
			var Y = [550, 50];
		}
		
		this.hintBox = new HintBox("box");
		//personal notes  and the managers
		this.notes = new Notes(this.notesGroup);
		this.messager = new Messager(this.messageGroup, this.hintBox);
		game.globals.messager = this.messager;
		
		this.logViewer = new LogViewer(this.logs, this.role, this.doublePlayer, this.notes, this.messager, this.logGroup);
		this.effectManager = new EffectManager(this.logGroup, X, Y, 200, 50, 50, 110);
		this.buffManager = new BuffManager(index, this.messager);
		this.actManager = new ActManager(index, this.doublePlayer, this.buffManager, this.effectManager, this.messager, this.logs, this.role);
		if(!this.doublePlayer)	//no aiManager if double player
			this.aiManager = new AIManager(index, this.actManager, this.buffManager, 1-this.role);
		this.scriptManager = new ScriptManager(index, this, this.actManager, this.aiManager, this.dialogueGroup);
		this.gameManager = new GameManager(index, this.doublePlayer, this.buffManager, this, this.aiManager, this.scriptManager, this.effectManager, this.messager, this.logs);
		//give actManger the reference to GameManager
		this.actManager.setGameManager(this.gameManager);
		
		this.currentRound;	//a copy synchronized with gameManager
		this.controllerRole;
	},
	
	create: function(){
	//layer 0
		var background = game.add.image(game.world.centerX, game.world.centerY, "binary", 0, this.panelGroup);
		background.alpha = 0.2;
		background.anchor.setTo(0.5);
		//create portraits
		var portraits = this.cyber.portrait;
		this.portraitSprites = [,];
		this.portraitSprites[this.role] = game.add.sprite(100, 550, portraits[this.role], 0, this.panelGroup);
		this.hintBox.setHintBox(this.portraitSprites[this.role], "   View buffs on yourself (S)");
		this.portraitSprites[1-this.role] = game.add.sprite(850, 50, portraits[1-this.role], 0, this.panelGroup);
		this.hintBox.setHintBox(this.portraitSprites[1-this.role], "View buffs on rival (R)");
		this.portraitSprites[0].anchor.setTo(0.5);
		this.portraitSprites[1].anchor.setTo(0.5);
		this.portraitSprites[0].inputEnabled = true;
		this.portraitSprites[1].inputEnabled = true;
		this.portraitSprites[0].events.onInputDown.add(this.showBuffs, this, 0, 0);
		this.portraitSprites[1].events.onInputDown.add(this.showBuffs, this, 0, 1);
		//create names
		this.nameSprites = [];
		this.nameSprites[this.role] = game.add.text(100, 480, this.cyber.characterName[this.role], this.styleName, this.panelGroup);
		this.nameSprites[1-this.role] = game.add.text(850, 120, this.cyber.characterName[1-this.role], this.styleName, this.panelGroup);
		this.nameSprites[0].anchor.setTo(0.5);
		this.nameSprites[1].anchor.setTo(0.5);
		//create resource
		this.resourceSprites = [,];
		this.resourceSprites[this.role] = game.add.text(220, 550, "", this.styleResource, this.panelGroup);
		this.resourceSprites[1-this.role] = game.add.text(730, 50, "", this.styleResource, this.panelGroup);
		this.updateResource(0);
		this.updateResource(1);
		this.resourceSprites[0].anchor.setTo(0.5);
		this.resourceSprites[1].anchor.setTo(0.5);
		//create asset sprite
		var x, y;
		if(this.role) {x = 130; y = 455;}
		else {x = 850; y = 145;}
		this.assetsSprite = game.add.text(x, y, "", this.styleAssets, this.panelGroup);
		this.assetsSprite.anchor.setTo(0.5);
		this.updateAssets();
		
		//attack log
		this.logButton = game.add.button(205, 40, "logButton", this.showLog, this, 0, 0, 0, 0, this.panelGroup);
		this.hintBox.setHintBox(this.logButton, "Open action logs (L)");
		this.logButton.anchor.setTo(0.5);
		//round indicator
		this.roundSprite = game.add.text(100, 110, "", this.styleName, this.panelGroup);
		this.roundSprite.anchor.setTo(0.5);
		//create end-turn button
		this.endTurnButton = game.add.button(0, 150, "endTurnButton", this.nextRound, this, 0, 0, 1, 0, this.panelGroup);
		this.endTurnButton.anchor.setTo(0, 0.5);
		//personal notes button
		this.notesButton = game.add.button(110, 40, "book", this.openNotes, this, 0, 0, 1, 0, this.panelGroup);
		this.hintBox.setHintBox(this.notesButton, "Open personal notes (N)");
		this.notesButton.anchor.setTo(0.5);
		//pause button
		this.pauseButton = game.add.button(35, 40, "cross", this.pauseScreen, this, 0, 0, 1, 0, this.panelGroup);
		this.hintBox.setHintBox(this.pauseButton, "    menu (ESC)");
		this.pauseButton.anchor.setTo(0.5);
		
	//act list frame and scroll button
		this.actsGroup = game.add.group();
			//frame of the act list
		this.actsFrame = game.add.image(1000, 600, "computer", 0, this.actsGroup);
		this.panelGroup.add(this.actsGroup);
		this.actsFrame.anchor.setTo(1);
			//act scroll buttons
		this.actScroll = new ScrollButtons(950, 280, 450, this.updateActs, this, 0, this.panelGroup);	
			//act list
		this.updateActs(0);
	//layer 1: dialogue group. Put the dialogue in this group	
	//layer 2: buffs group
		//frame
		var popupFrame = this.buffsGroup.create(game.world.centerX, game.world.centerY, "PNFrame");
		//intercept clicking events through it to the lower layer buttons
		popupFrame.inputEnabled = true;
		popupFrame.anchor.setTo(0.5);
		//caption
		this.buffsCaption = game.add.text(200, 100, "", this.styleCaption);
		this.buffsGroup.add(this.buffsCaption);
		//exit button
		var exitButton = game.add.button(850, 100, "cross", function(){this.buffsGroup.visible = false;this.buffScroll.destroy();this.hintBox.hide();}, this, 0, 0, 1, 0,this.buffsGroup);
		this.hintBox.setHintBox(exitButton, "Close (ESC)");
		exitButton.anchor.setTo(0.5);
		this.buffsGroup.setAll("anchor.setTo", "anchor", 0.5);
		this.buffsGroup.visible = false;
		//sub group of buffsGroup, stores the list of sprites of existing buffs
		this.buffsListGroup = game.add.group();
		
	//layer 3: popup group for act/buff
		/*variableGroup: a child group of popupGroup,
		including only sprites not shared among act/buff window.
		So variableGroup is to be destroyed whenever creating these windows.
		But popupGroup remains, just hide and unhide.*/ 
		this.variableGroup = game.add.group();
		//frame
		this.popupFrame = this.popupGroup.create(game.world.centerX, game.world.centerY, "PNFrame");
		//intercept clicking events through it to the lower layer buttons
		this.popupFrame.inputEnabled = true;
		this.popupFrame.anchor.setTo(0.5);		
		//caption
		this.caption = game.add.text(300, 100, "", this.styleCaption);
		this.popupGroup.add(this.caption);
		//exit button
		this.exitButton = game.add.button(850, 100, "cross", function(){this.popupGroup.visible = false;this.hintBox.hide();}, this, 0, 0, 1, 0,this.popupGroup);
		this.hintBox.setHintBox(this.exitButton, "Close (ESC)");
		this.exitButton.anchor.setTo(0.5);
		this.popupGroup.visible = false;
		
	//layer 4: the group for action logs
	//layer 5: the group for notes
	//layer 6: pause group: restart cyber battle + back to menu + resume button
		//to display clicking events for all lower level buttons
		this.pauseShadow = game.add.sprite(game.world.centerX, game.world.centerY, "black", 0, this.pauseGroup);
		this.pauseShadow.alpha = 0.5;
		this.pauseShadow.inputEnabled = true;
		
		//scenario title
		if(this.index < 0)
		{
			var texts = "Tutorial "+(0-parseInt(this.index))+"\n";
			if(this.index != -1)
				texts += game.globals.tutorialCybers[(0-parseInt(this.index))].name;
		}
		else
		{
			var sceName = game.globals.scenarioCybers[this.index].name;
			var texts = "Scenario "+this.index+"\n"+sceName;
		}
		var title = game.add.text(game.world.centerX, 100, texts, this.styleCaption, this.pauseGroup);
		title.anchor.setTo(0.5);
		//restart battle
		this.restartBattleButton = game.add.button(game.world.centerX, game.world.centerY - 50, "restartButton", this.restartBattle, this, 0, 0, 1, 0, this.pauseGroup);
		//back to start menu
		this.startMenuButton = game.add.button(game.world.centerX, game.world.centerY + 50, "menuButton", this.startMenu, this, 0, 0, 1, 0, this.pauseGroup);
		//resume
		this.resumeButton = game.add.button(game.world.centerX, game.world.centerY + 200, "resumeButton", this.unpause, this, 0, 0, 1, 0, this.pauseGroup);
		this.pauseGroup.callAll("anchor.setTo", "anchor", 0.5);
		this.pauseGroup.visible = false;
		
	//layer 7: the group for "are you sure to quit?"
		//mask lower clicks
		this.mask = game.add.sprite(game.world.centerX, game.world.centerY, "black", 0, this.confirmGroup);
		this.mask.alpha = 0.7;
		this.mask.inputEnabled = true;
		this.dialogue = game.add.text(game.world.centerX, game.world.centerY - 100, "Are you sure to give up the fight?\nYour rival is noticed of a glim of smile on the face.", this.styleDamage, this.confirmGroup);
		this.restartButton = game.add.button(game.world.centerX - 150, game.world.centerY, "restartButton", this.restartFun, this, 0, 0, 1, 0, this.confirmGroup);
		this.menuButton = game.add.button(game.world.centerX - 150, game.world.centerY, "menuButton", this.menuFun, this, 0, 0, 1, 0, this.confirmGroup);
		this.noButton = game.add.button(game.world.centerX + 150, game.world.centerY, "noButton", this.noFun, this, 0, 0, 1, 0, this.confirmGroup);
		
		this.confirmGroup.callAll("anchor.setTo", "anchor", 0.5);
		this.confirmGroup.visible = false;
	//layer 8: the group for messages
		
		this.setKeys();
		
		//BGM
		game.globals.audioManager.cyberMusic();
		//may play a sound or speech at the start of the fight
		if(this.cyber.startingSound)
			game.globals.audioManager.startingSound(this.cyber.startingSound);
	
		this.gameManager.roundInit();
		
		/*game.add.image(0, 0, "black");
		game.add.text(100, 250, "Buff requirements:", this.styleRequire);
		game.add.text(100, 280, "+ Self :", this.styleRequire);
		game.add.text(250, 280, "You should have this buff", this.style);
		game.add.text(100, 310, "- Self :", this.styleRequire);
		game.add.text(250, 310, "You shouldn't have this buff", this.style);
		game.add.text(100, 340, "+ Rival :", this.styleRequire);
		game.add.text(250, 340, "Rival should have this buff", this.style);
		game.add.text(100, 370, "- Rival :", this.styleRequire);
		game.add.text(250, 370, "Rival shouldn't have this buff", this.style);
		game.add.text(100, 400, "Buffs when success:  (4 rounds)", this.styleResult);
		game.add.text(100, 430, "Self + :", this.styleResult);
		game.add.text(250, 430, "Will enforce this buff to you", this.style);
		game.add.text(100, 460, "Self - :", this.styleResult);
		game.add.text(250, 460, "Will clean this buff from you", this.style);
		game.add.text(100, 490, "Rival + :", this.styleResult);
		game.add.text(250, 490, "Will enforce this buff to rival", this.style);
		game.add.text(100, 520, "Rival - :", this.styleResult);
		game.add.text(250, 520, "Will clean this buff from rival", this.style);*/
	},
/* ------------------- update functions starts ----------------------*/	
	/**
	Callback functions to scroll the pages of the acts to the right page.
	Also called at round change, with parameter 0, to refresh the whole list of acts, including scroll buttons
	@param {int} targetPage - the page to scroll to
	*/
	updateActs: function(targetPage)
	{
		//clean old acts
		for(var i in this.actSprites)
			this.actSprites[i].destroy();
		this.actSprites = [];
		this.actTweens = [];
		
		/*due to the possibility of adding acts by script, or changing the controller in double player mode, the array of actNames and the number of pages can change dynamically. Therefore, actScroll is dynamically set here.*/
		var unlockedActs = this.actManager.getUnlockedActs(this.controllerRole);
		var NPages = Math.ceil(unlockedActs.length / this.actsPerPage);
		this.actScroll.setNPages(NPages);
		this.actScroll.setCurrentPage(targetPage);
		
		//going to display items in unlockedActs of index [nextItem, outerItem)
		var nextItem = targetPage * this.actsPerPage;
		var outerItem = Math.min(nextItem + this.actsPerPage, unlockedActs.length);
		var id;
		for(i=0; nextItem < outerItem; nextItem++, i++)
		{
			id = unlockedActs[nextItem];
			//create learnt and unlearnt acts with different color
			if(this.actManager.actLearnt(this.controllerRole, id))
				this.actSprites[i] = game.add.text(450, 260 + 50 * i, this.actManager.getAct(this.controllerRole, id).name, this.style, this.actsGroup);	//green for learnt acts
			else this.actSprites[i] = game.add.text(450, 260 + 50 * i, this.actManager.getAct(this.controllerRole, id).name, this.styleUnlearnt, this.actsGroup);	//blue for act not learnt
		
			this.actSprites[i].inputEnabled = true;
			this.actSprites[i].events.onInputDown.add(this.showAct, this, 0, id, i);
			//enlarging animation when the mouse hover over it
			this.actSprites[i].events.onInputOver.add(this.enlargeActs, this, 0, i);
			this.actSprites[i].events.onInputOut.add(this.normalActs, this, 0, i);
		}
	},
	/**
	Enlarge the an act name on the main panel when the mouse hover over it
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} i - the act's index in the current page
	*/
	enlargeActs: function(sprite, pointer, i)
	{
		game.add.tween(this.actSprites[i].scale).to({x: 1.5, y: 1.5}, 200, Phaser.Easing.Linear.None, true);
	},
	/**
	Reset the size of the an act name on the main panel when the mouse hover over it
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} i - the act's index in the current page
	*/
	normalActs: function(sprite, pointer, i)
	{
		game.add.tween(this.actSprites[i].scale).to({x: 1, y: 1}, 200, Phaser.Easing.Linear.None, true);
	},
	
	/**
	Callback function invoked at resource chage to update the displayed value
	@param {int} role - whose resource to change. 0 for intruder, 1 for defender
	*/
	updateResource: function(role)
	{
		var resText = "Resource:\n"+this.gameManager.getResource(role)+" / "+this.gameManager.maxResource;
		/*var text1 = this.resourceSprites[role].text;
		var text2 = text1.split("\n")[0]+"\n"+resource+" /"+text1.split("/")[1];*/
		this.resourceSprites[role].setText(resText);
	},
	/**
	Callback function invoked at assets change to update the displayed value
	*/
	updateAssets: function()
	{
		var assText = "Assets: " + this.gameManager.getAssets() + " / " + this.cyber.assets;
		/*var text1 = this.assetsSprite.text;
		var text2 = text1.split(":")[0] + ": "+ assets + " /" + text1.split("/")[1];*/
		this.assetsSprite.setText(assText);
	},
	/**
	Callback function invoked at new round initiation to update the displayed value
	Also synchronizes this.currentRound with gameManager, and then update this.controllerRole
	*/
	updateRound: function()
	{
		this.currentRound = this.gameManager.getRound();
		this.controllerRole = this.currentRound%2;	//0 if intruder is controlling, 1 if defender is controlling
		var roundText = "Round: " + this.currentRound + " / " + this.gameManager.maxRounds;
		this.roundSprite.setText(roundText);
		var role = this.currentRound % 2;
		this.effectManager.createRoundSpark("Round:\n"+ this.currentRound, role, 400);
	},
/* -------------------- update functions ends -----------------------*/		
	
/* ---- act/buffs/buff/attack log popup screen functions starts -----*/	
	/**
	When the player clicked on an act.
	Show the act detail, together with learn/apply and seeNote button
	However, for single player mode, at AI's round, the learn/apply button is disabled
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} id - act id
	@param {int} i - the index of the act in the current page. Useful for updating color when the act is just learnt
	*/
	showAct: function(sprite, pointer, id, i)
	{
		var preText;
		var y;
		var p,b;
		//clean the sprites in popup window that are not shared by act, buffs and buff window
		this.variableGroup.removeAll(true);
		this.popupGroup.visible = true;

		var act = this.actManager.getAct(this.controllerRole, id);
		//caption
		this.caption.setText(act.name);
		//seeNotes button
		this.seeNotesButton = game.add.button(200, 530, "book", this.seeNoteFun, this, 0, 0, 1, 0, this.variableGroup);
		this.hintBox.setHintBox(this.seeNotesButton, "Find in personal notes (N)");
			//parameter to be passed to seeNoteFun function
		this.seeNotesButton.entryName = act.name;
		this.seeNotesButton.anchor.setTo(0.5);
		
		//if not learnt
		if(!act.learnt)
		{	//prerequisites
			if(act.prerequisites.length)
			{
				preText = "prerequisites for learning: ";
				for(p in act.prerequisites)
					preText += this.actManager.id2name(this.controllerRole, act.prerequisites[p]) + ", ";
				preText = preText.slice(0, -2);	//delete tail
				this.preSprite = game.add.text(150, 150, preText, this.styleResource, this.variableGroup);
			}
			
			if(!this.doublePlayer && this.role != this.controllerRole)
			{	//single player mode and at AI's round
				this.learningCostSprite = game.add.text(500, 530, "It's an act belonging to AI", this.styleDamage, this.variableGroup);
			}
			else
			{
				//learning cost
				this.learningCostSprite = game.add.text(750, 530, "Learning cost: " + act.learningCost, this.styleResource, this.variableGroup);
				this.learningCostSprite.anchor.setTo(0.5);
				//a button to learn
				this.learnButton = game.add.button(500, 530, "learnButton", this.learnAct, this, 0, 0, 1, 0, this.variableGroup);
				this.hintBox.setHintBox(this.learnButton, "Learn the act (E)");
				this.learnButton.ownerRole = this.controllerRole;
				this.learnButton.id = id;
				this.learnButton.i = i;
				this.learnButton.anchor.setTo(0.5);
			}
			//nullify the pointer so as not to fool the "A" key
			this.applyButton = undefined;
		}
		else //if learnt
		{
			y = 130;
			//buff requirements
			if(act.needSelfBuffs.length || act.needRivalBuffs.length || act.noSelfBuffs.length || act.noRivalBuffs.length)
			{
				this.resultSprite = game.add.text(150, y, "Buff requirements:", this.styleRequire, this.variableGroup);
				y += 30;
				//need on self buffs
				if(act.needSelfBuffs.length)
				{
					preText = "+ Self : ";
					for(b in act.needSelfBuffs)
						preText += this.buffManager.id2name(act.needSelfBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.needSelfSprite = game.add.text(150, y, preText, this.styleRequire, this.variableGroup);
					y += 20;
				}
				//need on rival buffs
				if(act.needRivalBuffs.length)
				{
					preText = "+ Rival : ";
					for(b in act.needRivalBuffs)
						preText += this.buffManager.id2name(act.needRivalBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.needRivalSprite = game.add.text(150, y, preText, this.styleRequire, this.variableGroup);
					y += 20;
				}
				//no on self buffs
				if(act.noSelfBuffs.length)
				{
					preText = "- Self : ";
					for(b in act.noSelfBuffs)
						preText += this.buffManager.id2name(act.noSelfBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.noSelfSprite = game.add.text(150, y, preText, this.styleRequire, this.variableGroup);
				}
				//no on rival buffs
				if(act.noRivalBuffs.length)
				{
					preText = "- Rival : ";
					for(b in act.noRivalBuffs)
						preText += this.buffManager.id2name(act.noRivalBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.noRivalSprite = game.add.text(150, y, preText, this.styleRequire, this.variableGroup);
				}
			}
			//success rate
			y = 230;
			if(act.successRate != 1)
			{
				preText = "Success rate = "+act.successRate*100+" %";
				this.successSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
				y += 30;
			}
			
			//buffs on success
			if(act.selfBuffs.length || act.rivalBuffs.length || act.cleanSelfBuffs.length || act.cleanRivalBuffs.length)
			{
				if(act.buffLength != -1)
					var length = act.buffLength;
				else var length = "infinite";
				preText = "Buffs when success:  ( " + length + " rounds)";
				this.resultSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
				y += 30;
				//enforce self buffs
				if(act.selfBuffs.length)
				{
					preText = "Self + : ";
					for(b in act.selfBuffs)
						preText += this.buffManager.id2name(act.selfBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.selfSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
					y += 20;
				}
				//enforce rival buffs
				if(act.rivalBuffs.length)
				{
					preText = "Rival + : ";
					for(b in act.rivalBuffs)
						preText += this.buffManager.id2name(act.rivalBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.rivalSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
					y += 20;
				}
				//clean self buffs
				if(act.cleanSelfBuffs.length)
				{
					preText = "Self - : ";
					for(b in act.cleanSelfBuffs)
						preText += this.buffManager.id2name(act.cleanSelfBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.cleanSelfSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
					y += 20;
				}
				//clean rival buffs
				if(act.cleanRivalBuffs.length)
				{
					preText = "Rival - : ";
					for(b in act.cleanRivalBuffs)
						preText += this.buffManager.id2name(act.cleanRivalBuffs[b]) + ", ";
					preText = preText.slice(0, -2);	//delete tail
					this.cleanRivalSprite = game.add.text(150, y, preText, this.styleResult, this.variableGroup);
					y += 20;
				}
			}
			
			y += 10;
			//capacity
			if(act.capacity)
				this.capacitySprite = game.add.text(150, y, "Capacity: " + act.capacity , this.styleDamage, this.variableGroup);
			//bonus
			if(act.bonus)
			{
				this.bonusSprite = game.add.text(150, y, "Damange: " + act.bonus , this.styleDamage, this.variableGroup);
				y+=20;
			}
			//superfluous requests
			if(act.superfluousRequests)
				this.superfluousSprite = game.add.text(150, y, "Generate superfluous request: " + act.superfluousRequests , this.styleDamage, this.variableGroup);
			
			if(!this.doublePlayer && this.role != this.controllerRole)
			{	//single player mode and at AI's round
				this.costSprite = game.add.text(500, 530, "It's an act belonging to AI", this.styleDamage, this.variableGroup);
			}
			else
			{
				//cost
				if(act.cost)
				{
					this.costSprite = game.add.text(550, 530, "Cost: " + act.cost, this.styleResource, this.variableGroup);
					this.costSprite.anchor.setTo(0.5);
					//a button to apply
					this.applyButton = game.add.button(750, 530, "applyButton", this.applyAct, this, 0, 0, 1, 0, this.variableGroup);
					this.hintBox.setHintBox(this.applyButton, "Apply the act (A)");
					this.applyButton.ownerRole = this.controllerRole;
					this.applyButton.id = id;
					this.applyButton.anchor.setTo(0.5);
				}
				else
				{				
					this.costSprite = game.add.text(500, 530, "It's not to be used", this.styleResource, this.variableGroup);
					//nullify the pointer so as not to fool the "A" key
					this.applyButton = undefined;
				}
			}
			//nullify the pointer so as not to fool the "E" key
			this.learnButton = undefined;
		}
		//descptions
		this.descText = game.add.text(150, 350, act.desc, this.style, this.variableGroup);
		//modifier will not be displayed. If the information is needed, deliver the information in the description
		
		this.popupGroup.add(this.variableGroup);
	},
	/**
	When the player clicks on the apply button (learning form)
	It verifies if the current controller matches the act owner
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	learnAct: function(button, pointer)
	{	
		//check controller
		if(this.controllerRole != button.ownerRole)
			return;
		//check if disabled
		if(this.gameManager.disableControl)
			return;
			
		this.hintBox.hide();
		//act id
		var id = button.id;
		//act index in the current page
		var i = button.i;
		//var id = this.actManager.name2id(actName);
		if(this.actManager.learnAct(this.controllerRole, id))
		{			
			//update act color
			if(this.actManager.id2name(button.ownerRole, button.id) == this.actSprites[i].text)
				//for fear that the player has scrolled the page after opening act detail
				this.actSprites[i].setStyle(this.style);
			if(this.actManager.getAct(this.controllerRole, id).cost)
				/*refresh act popup screen by mimicing a click
			1st parameter sprite and 2nd parameter pointer is not used by showAct.
			So altough the values are not actually right, it doesn't matter */
				this.showAct(button, pointer, id, i);
			else //close act detail if the act is not to be used
				this.popupGroup.visible = false;
		}
	},
	/**
	When the player clicks on the apply button (applying form)
	It verifies if the current controller matches the act owner
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	applyAct: function(button, pointer)
	{
		//check controller
		if(this.controllerRole != button.ownerRole)
			return;
		//check if disabled
		if(this.gameManager.disableControl)
			return;
		
		this.hintBox.hide();
		var id = button.id;
		var result = this.actManager.applyAct(this.controllerRole, id, this.currentRound);
		//close act detail
		this.popupGroup.visible = false;
	},
	
	/**
	Invoked when the player clicked on the character portrait.
	It shows the buffs on the character.
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} targetRole - the role of the person being clicked. 0 for the intruder, 1 for the defender
	*/
	showBuffs: function(sprite, pointer, targetRole)
	{
		this.hintBox.hide();
		this.targetRole = targetRole;
		//clean the sprites in popup window that are not shared by act, buffs and buff window
		//this.variableGroup.removeAll(true);
		this.buffsGroup.visible = true;
		//caption
		this.buffsCaption.setText("Buffs on " + this.cyber.characterName[targetRole]);
			///now there's only buff length. what if buff picture is added?
		this.buffs = this.buffManager.getLengths(targetRole);
		//N.B. existingBuffs have index inconsistent with buff ids
		this.existingBuffs = this.buffManager.getExistingBuffs(targetRole);
		var NPages = Math.ceil(this.existingBuffs.length / this.buffsPerPage);
		this.buffScroll = new ScrollButtons(870, 200, 450, this.updateBuffs, this, NPages, this.buffsGroup);
		this.updateBuffs(0);
	},
	/**
	Callback functions to scroll the pages of the buffs to the right page
	*/
	updateBuffs: function(targetPage)
	{
		///clean old buffs
		this.buffsListGroup.removeAll(true);
		var frameSprite, nameSprite, lengthSprite;
		var lengthText;
		var id;
		//going to display items in existingBuffs of index [nextItem, outerItem)
		var nextItem = targetPage * this.buffsPerPage;
		var outerItem = Math.min(nextItem + this.buffsPerPage, this.existingBuffs.length);
		var y = 200;
		for(; nextItem < outerItem; nextItem++)
		{				
			id = this.existingBuffs[nextItem];
			//buff frame
			frameSprite = game.add.button(game.world.centerX, y, "itemFrames", this.showBuff, this, 0, 0, 0, 0, this.buffsListGroup);
			//parameters passed through button
			frameSprite.role = this.targetRole;
			frameSprite.id = id;
			///want buff picture?
			//buff name
			nameSprite = game.add.text(350, y, this.buffManager.id2name(id), this.style, this.buffsListGroup);
			//nameSprite.anchor.setTo(0.5);
			//buff length
			lengthText = this.buffs[id];
			//adjust buff frame. Intruder enforced buff use the other image frame
			if(lengthText != -1 && (this.currentRound + lengthText)%2 == 0)
				frameSprite.setFrames(1, 1, 1, 1);
			if(lengthText == -1)
				lengthText = "Infinite";
			lengthSprite = game.add.text(700, y, "remaining: "+lengthText, this.style, this.buffsListGroup);
			
			this.buffsListGroup.callAll("anchor.setTo", "anchor", 0.5);
			y+=50;
		}
		this.buffsGroup.add(this.buffsListGroup);
	},
	/**
	When the player has clicked on a particular buff.
	Show the buff description together with a link to the personal note
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	showBuff: function(button, pointer)
	{
		var role = button.role;
		var id = button.id;
		
		var num;
		var texts;
		//clean the sprites in popup window that are not shared by act, buffs and buff window
		this.variableGroup.removeAll(true);
		this.popupGroup.visible = true;
		
		var buffName = this.buffManager.id2name(id);
		
		//caption
		this.caption.setText(buffName);
		///want buff picture?
		
		//seeNotes button
		this.seeNotesButton = game.add.button(200, 530, "book", this.seeNoteFun, this, 0, 0, 1, 0, this.variableGroup);
		this.hintBox.setHintBox(this.seeNotesButton, "Find in personal notes (N)");
		this.seeNotesButton.entryName = buffName;
		this.seeNotesButton.anchor.setTo(0.5);
		//buff length
		var texts = this.buffManager.buffLengths[role][id];
		if(texts == -1)
			texts = "Infinite";
		this.lengthSprite = game.add.text(150, 150, texts + " rounds remaining", this.style, this.variableGroup);
		//buff upkeep
		num = this.buffManager.getUpkeep(id);
		if(num > 0)
		{
			texts = "Upkeep: "+num;
			var upkeepSprite = game.add.text(150, 200, texts, this.styleDamage, this.variableGroup);
		}
		else if(num < 0)
		{			
			texts = "Gain: " + (0-parseInt(num));
			var upkeepSprite = game.add.text(150, 200, texts, this.styleDamage, this.variableGroup);
		}
		//buff capacity (additional server capacity)
		if(num = this.buffManager.getCapacity(id))
			var capacitySprite = game.add.text(150, 300, "Extra capacity: " + num, this.styleAssets, this.variableGroup);
		//buff superfluous requests
		if(num = this.buffManager.getSuperfluous(id))
			var superfluousSprite = game.add.text(150, 250, "Superfluous requests: " + num, this.styleDamage, this.variableGroup);
		//buff DoS Resistance
		if(num = this.buffManager.getResistance(id))
			var resistanceSprite = game.add.text(150, 250, "DoS resistance: " + num * 100 + " %", this.styleResource, this.variableGroup);
		//buff description
		this.descSprite = game.add.text(150, 350, this.buffManager.id2desc(id), this.style, this.variableGroup);
		
		this.popupGroup.add(this.variableGroup);
	},
	/**
	When the player want to refer to a particular personal note.
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	seeNoteFun: function(button, pointer)
	{
		this.hintBox.hide();
		var entryName = button.entryName;
		this.notes.createNotes();
		var id = this.notes.name2id(entryName);
		if(id == -1)
			this.messager.createMessage("Sorry. This entry is not found in personal notes!");
		else this.notes.readNote(id);
	},
	/**
	To show the player with attack logs
	*/
	showLog: function()
	{
		this.hintBox.hide();
		this.logViewer.display(true);
	},
/* ----- act/buffs/buff/attack log popup screen functions ends -----*/

/* ---------------- pause screen functions starts ------------------*/
	/**
	When the player click on the pause button.
	Create the pause screen.
	*/
	pauseScreen: function()
	{
		this.hintBox.hide();
		this.pauseGroup.visible = true;
	},
	/**
	Open the personal notes
	*/
	openNotes: function()
	{
		//this.unpause();
		this.notes.createNotes();
	},
	/**
	Is about to restart the cyber battle. Still need the last confirm
	*/
	restartBattle: function()
	{
		this.confirmGroup.visible = true;
		this.restartButton.visible = true;
		this.menuButton.visible = false;
	},
	/**
	Is about to return to the start menu. Still need the last confirm
	*/
	startMenu: function()
	{
		this.confirmGroup.visible = true;
		this.menuButton.visible = true;
		this.restartButton.visible = false;
	},
	/**
	The real function that restarts the scenario
	*/
	restartFun: function()
	{
		if(this.aiManager)
			this.aiManager.stopAct();	//stop all pending AI operations
		if(!this.doublePlayer)
			this.state.start("intro", true, false, 0, this.index, false);
		else //restart double player mode
			this.state.start("cyberspace", true, false, this.index, true);
	},
	/**
	The real function that switch to the start menu
	*/
	menuFun: function()
	{
		this.state.start("startMenu", true, false);
	},
	/**
	Cancel the restart/start menu attempt.
	*/
	noFun: function()
	{
		this.confirmGroup.visible = false;
	},
	/**
	When the player click on the resume button.
	Destroy the pause screen.
	*/
	unpause: function()
	{
		this.pauseGroup.visible = false;
		
	},
/* ------------------ pause screen functions ends --------------------*/
	
/* ------------------- key functions starts ----------------------*/
	/**
	Set the shortcut keys for the PC uses for quick access to some functionalities
	*/
	setKeys: function()
	{
		var pauseKey = game.input.keyboard.addKey(Phaser.Keyboard.ESC);
		pauseKey.onDown.add(this.escFun, this);
		
		var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
		scrollUpKey.onDown.add(this.scrollFun, this);
		var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
		scrollDownKey.onDown.add(this.scrollFun, this);
		
		var selfKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
		selfKey.onDown.add(this.showBuffs, this, null, null, this.role);
		var rivalKey = game.input.keyboard.addKey(Phaser.Keyboard.R);
		rivalKey.onDown.add(this.showBuffs, this, null, null, 1-parseInt(this.role));
		
		var logKey = game.input.keyboard.addKey(Phaser.Keyboard.L);
		logKey.onDown.add(this.showLog, this);
		
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.notesFun, this);
		
		var learnKey = game.input.keyboard.addKey(Phaser.Keyboard.E);
		learnKey.onDown.add(this.learnFun, this);
		var applyKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
		applyKey.onDown.add(this.applyFun, this);
	},
	/**
	When the player presses the esc key
	*/
	escFun:	function()
	{
		if(this.messageGroup.visible == true)
			return;
		//when personal notes is opened, it may race with personal notes for esc key.
		if(this.notes.exitButton && this.notes.exitButton.alive == false)
		{	//just been destroyed, but the pointer still remain for a while
			this.notesGroup;
			delete this.notes.exitButton;
			return;
		}
		if(this.confirmGroup.visible == true)
		{
			this.noFun();
			return;
		}
		if(this.pauseGroup.visible == true)
		{
			this.unpause();
			return;
		}
		if(this.logGroup.getAt(0).length)
		{
			this.logViewer.closeLog();
			return;
		}
		if(this.popupGroup.visible == true)
		{
			this.popupGroup.visible = false;
			return;
		}
		if(this.buffsGroup.visible == true)
		{
			this.buffsGroup.visible = false;
			this.buffScroll.destroy();
			return;
		}
		//open menu window
		this.pauseScreen();	
	},
	/**
	When the player presses the pageUp or pageDown key
	@param {boolean} scrollup - true: page-up key, false, page-down key
	*/
	scrollFun: function(key)
	{
		//disable scroll buttons when some windows opened
		if(this.messageGroup.visible == true || this.confirmGroup.visible == true || this.notesGroup.visible == true || this.pauseGroup.visible == true ||  this.popupGroup.visible == true)
			return;
		//this is not the intended handler
		if(this.logGroup.getAt(0).length || this.notesGroup.visible == true)
			return;
		//buffs window open, scroll the buffs
		if(this.buffsGroup.visible == true)
		{
			if(key.keyCode == Phaser.Keyboard.PAGE_UP)
				this.buffScroll.scrollUp();
			else this.buffScroll.scrollDown();
			return;
		}
		else//no window open, scroll the acts
			if(key.keyCode == Phaser.Keyboard.PAGE_UP)
				this.actScroll.scrollUp();
			else this.actScroll.scrollDown();
	},
	/**
	When the player presses the key "N". Open the personal notes with or without target entry
	*/
	notesFun: function()
	{
	if(this.messageGroup.visible == true || this.confirmGroup.visible == true || this.notesGroup.visible == true/*this.notes.exitButton*/|| this.pauseGroup.visible == true)
			return;
		//open notes with specified entry
		if(this.popupGroup.visible == true)
		{
			this.seeNoteFun(this.seeNotesButton, null);
			return;
		}
		//open notes with default entry
		this.openNotes();
	},
	/**
	When the player presses the "E" key
	*/
	learnFun: function()
	{
		if(this.messageGroup.visible == true || this.confirmGroup.visible == true || this.notesGroup.visible == true || this.pauseGroup.visible == true || this.logGroup.getAt(0).length)
			//disable this key when there are other important layers above
			return;
		if(this.popupGroup.visible == true)
		{
			if(this.learnButton != undefined)
				//shortcut key mimics clicking event
				this.learnAct(this.learnButton, null);
		}
	},
	/**
	When the player presses the "A" key
	*/
	applyFun: function()
	{
		if(this.messageGroup.visible == true || this.confirmGroup.visible == true || this.notesGroup.visible == true || this.pauseGroup.visible == true || this.logGroup.getAt(0).length)
			//disable this key when there are other important layers above
			return;
		if(this.popupGroup.visible == true)
		{
			if(this.applyButton != undefined)
				//shortcut key mimics clicking event
				this.applyAct(this.applyButton, null);
		}
	},
/* -------------------- key functions ends -----------------------*/

	/**
	When the player or the rival ends his/her round
	*/
	nextRound: function()
	{
		if(!this.doublePlayer && this.controllerRole != this.role)
			//avoid the player to end turn for the AI
			return;
		this.gameManager.roundFinal();
	},
	
	/**
	Gameover function called when one character wins. Will switch to the outro phase
	@param {boolean} winner - if the player wins
	@param {Array} logs - an array of LogEntry, to be pass to the upcoming review phase
	@param {int} assetsCompromised - the damage already dealt to the assets.
	*/
	gameoverFun: function(win)
	{
		//create recordEntry
		var record = new RecordEntry(this.logs, this.role, this.currentRound, parseInt(this.cyber.assets - this.gameManager.getAssets()));
		
		game.state.start("intro", true, false, 1, this.index, win, record, this.doublePlayer);
	},
	
	/**
	shutdown function is called when exiting this state.
	*/
	shutdown: function()
	{
		delete this.hintBox;
		delete this.notes;
		delete this.logViewer;
		delete this.effectManager;
		delete this.buffManager;
		delete this.gameManager;
		delete this.actManager;
		delete this.aiManager;
		delete this.scriptManager;
	},
};
module.exports = cyberspace;
},{"../modules/AIManager":2,"../modules/ActManager":4,"../modules/BuffManager":7,"../modules/EffectManager":8,"../modules/GameManager":9,"../modules/HintBox":10,"../modules/LogViewer":12,"../modules/Messager":13,"../modules/Notes":16,"../modules/RecordEntry":18,"../modules/ScriptManager":19,"../modules/ScrollButtons":20}],26:[function(require,module,exports){
/**
 * State that manages an error screen which shows a message. Used if the client browser does not provide some needed
 * functionality.
 * @type {{init: module.exports.init, create: module.exports.create, reloadFunc: module.exports.reloadFunc}}
 * @module
 * @name State: Error
 */
var error = {
    /**
     * Receives the string containing the error messages and saves it to an object attribute.
     * @param {string} errorMessage - Error message
     */
    init: function (errorMessage) {
        this.errorMessage = errorMessage;
    },

    /**
     * Prints the error screen.
     */
    create: function() {
        //Creates the error message text
        this.style = {font: "30px Courier New, monospace", fill: "#b50101", fontWeight: "bold", align: "center", wordWrap: true,
            wordWrapWidth: window.game.width - 80};
        this.error_text = window.game.add.text(window.game.world.centerX, window.game.world.centerY - 75, "", this.style);
        this.error_text.anchor.set(0.5, 0.5);
        this.error_text.setText(this.errorMessage);

        //Creates the page reload button
        this.realoadButton = window.game.add.button(window.game.world.centerX, window.game.world.centerY + 75,
        'reloadButton', this.reloadFunc, this, 1, 0);
        this.realoadButton.anchor.set(0.5, 0.5);
    },

    /**
     * Tells the browser to reload the game page.
     */
    reloadFunc: function () {
        window.location.reload(true);
    }
};
module.exports = error;
},{}],27:[function(require,module,exports){
var NPCManager = require("../modules/NPCManager");
var MultimediaText = require("../modules/MultimediaText");
var Notes = require("../modules/Notes");
var HintBox = require("../modules/HintBox");

/**
The hall state.
The player is going to talk with NPCs, retrieving information, before entering the cyberspace.

*/
var hall = {
	/**
	@param {int} index - 0 or more for a scenario, -1 for the tutorial
	*/
	init: function(index)
	{
		this.index = index;
		this.npcManager = new NPCManager(index);
	},
	
	create: function()
	{
		this.createMap();
		//this.groundGroup = game.add.group();
		this.npcGroup = game.add.group();
		this.dialogueGroup = game.add.group();
		this.notesGroup = game.add.group();
		this.createNPCs();
		this.createDialogue();
		
		this.hintBox = new HintBox("box");
		
		this.gateSprite = game.add.button(950, 96, "gate", function(){game.state.start("startMenu", true, false);}, this, 1, 0, 3, 0, this.npcGroup);
		this.gateSprite.anchor.setTo(0.5);
		this.notesButton = game.add.button(50, 40, "book", this.createNotes, this, 0, 0, 1, 0, this.npcGroup);
		this.hintBox.setHintBox(this.notesButton, "   Open personal notes (N)");
		this.notesButton.anchor.setTo(0.5);
		
		
		this.notes = new Notes(this.notesGroup);
		
		//shortcut key for personal notes
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.createNotes, this);
		
		//BGM
		if(this.index < 0 || game.globals.scenarioCybers[this.index].defensive)	//tutorial 1
			game.globals.audioManager.defenderHallMusic();
		else game.globals.audioManager.intruderHallMusic();
		
		//if need a talk at the start
		this.talkTo(null, null, 0);
	},

	/**
     * Creates the background map for the intruder and the defender from tilemap.
     */
    createMap: function() {
		if(this.index%2 == 0)
		{	//intruder's hall
			var hallName = "hallMapIntruder";
			this.map = game.add.tilemap(hallName, 32, 32);
			//imports the tileset image in the map object
			this.map.addTilesetImage('ceramics_32x32aigei_com', 'ceramics_32x32aigei_com');
		}
		else
		{	//defender's hall	
			var hallName = "hallMapDefender";
			this.map = game.add.tilemap(hallName, 32, 32);
			//Imports the tileset image in the map object
			//The first parameter is the tileset name as specified in Tiled, the second is the key to the asset
			this.map.addTilesetImage('floor_tile', 'floor_tile');
			this.map.addTilesetImage('wall', 'wall_tile');
			this.map.addTilesetImage('wallp', 'wall_pieces');
		}
        //Creates layer
        this.backgroundLayer = this.map.createLayer('ground');
    },
	
    /**
     * Creates and draws the NPC sprite objects.
     */
    createNPCs: function() {
		//store all the NPCs in this scenario. The index is the npc id
		var npcs = this.npcManager.NPCs;
		
		var npc;
		//this.multimedia = new MultimediaText();
		for(var n in npcs)
		{
			npc = this.npcGroup.create(npcs[n].x, npcs[n].y, npcs[n].sprite);
			npc.anchor.setTo(0.5);
			npc.scale.setTo(2);
			npc.inputEnabled = true;
			npc.events.onInputDown.add(this.talkTo, this, 0, n);
			//add turning animation
			npc.animations.add("0", [1, 2, 3, 0], 8);
			npc.animations.add("1", [5, 6, 7, 4], 8);
			npc.animations.add("2", [9, 10, 11, 8], 8);
			npc.animations.add("3", [13, 14, 15, 12], 8);
			//when the mouse hover over the NPC sprite, turn the NPC to the player
			npc.events.onInputOver.add(function(sprite){sprite.animations.play(0);}, this, 0, npc);
			//randomly play the turning(moving) animation: wait random time [4s,10s) and call this.randomMove. The function will then recursively call itself
			var delay = 4000 + Math.random()*10000;
			setTimeout(function(fun, context, sprite){fun.call(context, sprite);}, delay, this.randomMove, this, npc);
		}
	},
	
	/**
	Try to open personal notes when player click on notesButton or when pressing "N" key
	Check if there is a mask (yes/no question) before opening personal notes
	*/
	createNotes: function(button, pointer)
	{
		if(this.mask && this.mask.alive == true)
			return;
		this.hintBox.hide();
		this.notes.createNotes();
	},
	
	/**
	A recursive function that calls itself (after a random delay) to constantly play the turning animation of NPC sprite
	@param {Phaser.Sprite} sprite - the NPC sprite whose animation is been set
	*/
	randomMove: function(sprite)
	{
		if(!this.npcManager)	//use it as an indicator for player already left the hall
			return;
		//play a random animation from the animations named "0", "1", "2", "3"
		var integer = Math.floor(Math.random()*4);
		sprite.animations.play(integer);
		//recurse after a random number of seconds within [4, 10)
		var delay = 4000 + Math.random()*10000;
		setTimeout(function(fun, context, sprite){fun.call(context, sprite);}, delay, this.randomMove, this, sprite);
	},
	
	/**
	Create the dialogue sprites and initializes the dialogue contents
	*/
	createDialogue: function()
	{
		this.multimedia = new MultimediaText(250, 470, 1, this.dialogueGroup, this.dismissDialogue, this);
	},
	
	/**
	When the player clicked on an NPC
	Create the multi-page dialogue, and start from the first page
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} id - the id of the NPC been clicked
	*/
	talkTo: function(sprite, pointer, id)
	{
		//turn to player animation
		if(sprite)
		/*sprite is null when the NPC initiate the talk when the player just entered the hall*/
			sprite.animations.play(0);
		/*//click inactive when other dialogue is on going
		if(this.multimedia.dialogueGroup.visible == true)
			return;*/
		this.name = this.npcManager.getName(id);
		this.portrait = this.npcManager.getPortrait(id);
		this.texts = this.npcManager.retrieveSpeech(id).split("^");
		this.NPages = this.texts.length;		//how many pages in total
		//the current page number within the multi-page dialogue. multimedia doesn't keep the page number, hall does
		this.currentPage = 0;
		
		//special character ` indicating it's the time for "Are you ready for the cyber battle?"
		if(this.texts[0][0] == '`')
		{
			//delete other pages except the first one where the ` character is 
			var firstPage = this.texts[0];
			//get rid of the first ` character, the remaining string is the prompt asking "are you ready"
			this.texts[0] = firstPage.slice(1);
			this.multimedia.dynamicTextWithPortrait(this.texts[0], this.portrait, this.name);
			
			//mask all click events except the "yes" and "no" buttons
			this.mask = game.add.sprite(game.world.centerX, game.world.centerY, "black");
			this.mask.anchor.setTo(0.5);
			this.mask.alpha = 0.2;
			this.mask.inputEnabled = true;
			this.yesButton = game.add.button(game.world.centerX-150, game.world.centerY, "yesButton", this.yesFun, this, 0, 0, 1, 0);
			this.yesButton.anchor.setTo(0.5);
			this.noButton = game.add.button(game.world.centerX+150, game.world.centerY, "noButton", this.noFun, this, 0, 0, 1, 0);
			this.noButton.anchor.setTo(0.5);
		}
		else //start the first page of the dialogue
			this.multimedia.dynamicTextWithPortrait(this.texts[0], this.portrait, this.name);
	},
	
	/**
	Callback function when the player clicked on a dialogue already shown.
	The next page of the dialogue may shows. If no more page, the dialogue box will close
	*/
	dismissDialogue: function()
	{
		this.currentPage++;
		if(this.texts.length <= this.currentPage)	//page exhausted
		{
			this.multimedia.hideDialogue();
			return;
		}
		//more pages to show
		this.multimedia.dynamicTextWithPortrait(this.texts[this.currentPage], this.portrait, this.name);
	},
	
	/**
	when the player clicked on "yes" for the question of whether he/she want to start the cyber battle
	*/
	yesFun: function()
	{
		this.multimedia.clean();
		this.mask.destroy();
		this.yesButton.destroy();
		this.noButton.destroy();
		if(this.index == -1)	//tutorial 1 has only hall. after hall, it ends
			game.state.start("startMenu", true, false);
		else this.state.start("cyberspace", true, false, this.index);
	},
	
	/**
	when the player clicked on "no" for the question of whether he/she want to start the cyber battle
	*/
	noFun: function()
	{
		this.multimedia.hideDialogue();
		this.mask.destroy();
		this.yesButton.destroy();
		this.noButton.destroy();	
	},	
	shutdown: function()
	{
		delete this.npcManager;
		delete this.groundGroup;
		delete this.npcGroup;
		delete this.notesGroup;
		delete this.multimedia;
	}
};
module.exports = hall;
},{"../modules/HintBox":10,"../modules/MultimediaText":14,"../modules/NPCManager":15,"../modules/Notes":16}],28:[function(require,module,exports){
var MultimediaText = require("../modules/MultimediaText");
var ScrollButtons = require("../modules/ScrollButtons");
/**
The state of intro/outro/credits/tutorial
this state has text with typing like animation or image-text-mixed page
@param {int} type - 0: intro, 1: outro, 2: credits
@param {int} index - (optional) for intro and outro, the index of the scenario
@param {boolean} win - (for outro only) if the player wins
@param {RecordEntry} record - (for outro only) an object containing logs, role, endingRound and assetsCompromised
@param {boolean} doublePlayer - (outro only) true: double player mode, false: single player mode
*/
var intro = {
	init: function(type)
	{
		this.styleCaption = {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"};
		this.styleScoreInt = {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#8800EE", align: "center"};
		this.styleScoreDef = {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#2222FF", align: "center"};
		
		this.type = type;
		
		var background = game.add.image(0, 0, "tron");
		background.width = game.world.width;
		background.height = game.world.height;
		background.alpha = 0.3;
		
		//obtain text and other data
		switch(type)
		{
			case 0: //intro (including tutorial intro)
				this.index = arguments[1];
				if(this.index < 0)	//tutorial intro
					this.texts = game.globals.tutorialIntros[0-parseInt(this.index)].split("^");
				else //scenario intro
				{	
					var longtext = game.globals.scenarioIntros[this.index];
					if(longtext)	//intro found
						this.texts = longtext.split("^");
					else //intro absent
						game.state.start("hall", true, false, this.index);
				}
				break;
			case 1: //outro
				this.index = arguments[1];
				this.win = arguments[2];
				this.record = arguments[3];
				this.doublePlayer = arguments[4];
				if(!this.doublePlayer)
				{	//single player mode
					if(this.win)
					{
						if(this.index < 0)	//tutorial
						this.texts = game.globals.tutorialOutros[0-parseInt(this.index)].split("^");
						else	//formal scenario
						{
							var longtext = game.globals.scenarioOutros[this.index];
							if(longtext)	//outro found
								this.texts = longtext.split("^");
							else			//outro absent	
								this.texts = ["#text$380$300$Your victory!"];
						}
					}
					else if(this.record.role) this.texts = ["You failed to defend the assets!\n\nMaybe you got some holes in your defence? \n\nDon't lose your heart. From Review you will find where you have not done well, and you can try again.", "If you keep failing, you can probably refer to the section \"Extra guide for the scenarios\" in the user manual. \nUser manual can be opened by appending \"User manual.pdf\" to the current url. But if the current url has \"index.html\", you should replace it with \"User manual.pdf\"."];
						else this.texts = ["Intrusion failed!\n\nMaybe you attacked too aggressively and exhausted all your resources on those well defended? \nMaybe you attacked too timidly and missed too many chances before the rounds expired? \n\nDon't lose heart. From Review you will find where you have not done well, and you can try again.", "If you keep failing, you can probably refer to the section \"Extra guide for the scenarios\" in the user manual. \nUser manual can be opened by appending \"User manual.pdf\" to the current url. But if the current url has \"index.html\", you should replace it with \"User manual.pdf\"."];
				}
				else 
				{	//double player mode
					if(this.record.role == 0 && this.win || this.record.role ==1 && !this.win)
						this.texts = ["#text$380$300$Intruder's Victory!"];
					else this.texts = ["#text$380$300$Defender's Victory!"];
				}
				break;
			case 2: //credit
				this.texts = game.globals.credits.split("^");
				break;
		}
	},
	
	create: function(){
		var group = game.add.group();
		var buttonGroup = game.add.group();
		var scrollGroup = game.add.group();
		//main panel
		var panel = game.add.image(game.world.centerX, game.world.centerY, "PNFrame", 0, group);
		panel.anchor.setTo(0.5);
		
		this.multimedia = new MultimediaText(150, 120, 0, buttonGroup);
		this.scrollButtons = new ScrollButtons(950, 50, 500, this.updatePage, this, this.texts.length, scrollGroup);
		
		//click on the dynamic text to finish writing immediately
		panel.inputEnabled = true;
		panel.events.onInputDown.add(this.multimedia.finishWriting, this.multimedia, 0);
		
		//menu button, play button and review button
		switch(this.type)
		{		
			case 0://intro
				//caption
				if(this.index < 0)	//tutorial intro
				{
					var texts = "Tutorial "+(0-parseInt(this.index))+"\n";
					if(this.index != -1)
						texts += game.globals.tutorialCybers[(0-parseInt(this.index))].name;
				}
				else 				//scenario intro
				{
					var sceName = game.globals.scenarioCybers[this.index].name;
					var texts = "Scenario "+this.index+"\n"+sceName;
					var playButton = game.add.button(game.world.centerX + 150 , 550, "playButton", this.play, this, 0, 0, 1, 0, buttonGroup);
					playButton.anchor.setTo(0.5);
				}
				
				var caption = game.add.text(game.world.centerX, 50, texts, this.styleCaption, group);
				caption.anchor.setTo(0.5);
				//button
				var menuButton = game.add.button(game.world.centerX - 150 , 550, "menuButton", this.menu, this, 0, 0, 1, 0, buttonGroup);
				menuButton.anchor.setTo(0.5);
				break;
			case 1: //outro
				if(this.index < 0)	//tutorial outro
					var texts = "Tutorial "+(0-parseInt(this.index))+"\n outro";
				else 				//scenario outro
				{
					var sceName = game.globals.scenarioCybers[this.index].name;
					var texts = "Scenario "+this.index+" outro\n"+sceName;
					//button
					var reviewButton = game.add.button(game.world.centerX , 550, "reviewButton", this.review, this, 0, 0, 1, 0, buttonGroup);
					reviewButton.anchor.setTo(0.5);
				}
				var caption = game.add.text(game.world.centerX, 50, texts, this.styleCaption, group);
				caption.anchor.setTo(0.5);
				//score
				if(!this.doublePlayer)
				{	//single player
					this.score = this.record.scores[this.record.role];
					if(this.record.role == 0)
						var scoreText = game.add.text(game.world.centerX + 120, 110, "Your score: "+this.score, this.styleScoreInt, group);
					else var scoreText = game.add.text(game.world.centerX + 120, 110, "Your score: "+this.score, this.styleScoreDef, group);
					scoreText.anchor.setTo(0.5);
				}
				else	//doublePlayer
				{
					var scoreTextInt = game.add.text(game.world.centerX + 120, 110, "Intruder's score: "+this.record.scores[0], this.styleScoreInt, group);
					scoreTextInt.anchor.setTo(0.5);
					var scoreTextDef = game.add.text(game.world.centerX + 120, 150, "Defender's score: "+this.record.scores[1], this.styleScoreDef, group);
					scoreTextDef.anchor.setTo(0.5);
				}
				//relaxing music
				game.globals.audioManager.outroMusic();
				break;
			case 2://credits
				//caption
				var caption = game.add.text(game.world.centerX, 50, "credits", this.styleCaption, group);
				caption.anchor.setTo(0.5);
				//button
				var menuButton = game.add.button(game.world.centerX , 550, "menuButton", this.menu, this, 0, 0, 1, 0, buttonGroup);
				menuButton.anchor.setTo(0.5);
				//relaxed music
				game.globals.audioManager.outroMusic();
				break;
		}
		//frame entering animation
		group.y = group.y- 600;
		var tween = game.add.tween(group).to({y: '+600'}, 2500, "Elastic.easeOut", true, 0, 0, false);
		//button entering animation
		buttonGroup.y = buttonGroup.y + 1000;
		var buttonTween = game.add.tween(buttonGroup).to({y: '-1000'}, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
		//stretch animation
		scrollGroup.x = 950;
		scrollGroup.y = 275;
		scrollGroup.pivot = new Phaser.Point(950, 275);
		scrollGroup.scale.setTo(1, 0.5);
		var scrollTween = game.add.tween(scrollGroup.scale).to({x: 1, y: 1}, 2500, "Elastic.easeOut", true, 0, 0, false);
		//create page context
		tween.onComplete.add(function(){if(this.scrollButtons.currentPage == 0) this.updatePage(0);}, this, 0);
		
		//shortcut key for scroll up and scroll down
		var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
		scrollUpKey.onDown.add(this.scrollFun, this);
		var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
		scrollDownKey.onDown.add(this.scrollFun, this);
	},
	
	/**
	Update the page, whether a text page (with typing animation) or an image page
	Global input: this.texts
	*/
	updatePage: function(targetPage)
	{arguments;
		var currentText = this.texts[targetPage];
		//delete newlines at the start of the page
		for(var i=0; currentText[i] == '\r' || currentText[i] == '\n'; i++);
		currentText = currentText.slice(i);
		if(currentText[0] != "#")
			this.theDesc = this.multimedia.dynamicText(currentText);
		else this.theDesc = this.multimedia.imageText(currentText, targetPage);
		
		//tutorial intro: add button to scenario 0 at the last page
		if(this.type == 0 && this.index < 0)
			if(targetPage + 1 == this.texts.length)
				if(!this.playButton)
				{//the button to start scenario 0
					this.playButton = game.add.button(game.world.centerX + 200, 550, "playButton", this.tutorialFun, this);
					this.playButton.anchor.setTo(0.5);
					var playTween = game.add.tween(this.playButton.scale).to({x:1.3, y:1.3}, 3000, Phaser.Easing.Linear.None, false, 0, -1, true).start();
				}
		//tutorial outro: add button to review at the last page
		if(this.type == 1 && this.index < 0)
			if(targetPage + 1 == this.texts.length)
				if(!this.reviewButton)
				{//the button to start scenario 0
					this.reviewButton = game.add.button(game.world.centerX, 550, "reviewButton", this.review, this);
					this.reviewButton.anchor.setTo(0.5);
					var reviewTween = game.add.tween(this.reviewButton.scale).to({x:1.3, y:1.3}, 3000, Phaser.Easing.Linear.None, false, 0, -1, true).start();
				}
	},
	
	/**
	When clicking on "Menu" button
	*/
	menu: function()
	{
		//game.globals.audioManager.typingOff();///
		game.state.start("startMenu", true, false);
	},
	
	/**
	When clicking on "Play" button
	*/
	play: function()
	{
		//game.globals.audioManager.typingOff();///
		game.state.start("hall", true, false, this.index);
	},
	
	/**
	When clicking on "Play" button in the tutorial
	*/
	tutorialFun: function()
	{
		//game.globals.audioManager.typingOff();///
		if(this.index == -1)	//the first tutorial is hall only
			game.state.start("hall", true, false, -1);
		else //other tutorials are cyberspace only
			game.state.start("cyberspace", true, false, this.index, false);
	},
	
	/**
	When clicking on "Review" button
	*/
	review: function()
	{
		//game.globals.audioManager.typingOff();///
		game.state.start("review", true, false, this.index, this.win, this.record, this.doublePlayer);
	},
	
	/**
	@param {boolean} scrollup - true: page-up key, false, page-down key
	*/
	scrollFun: function(key)
	{
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.scrollButtons.scrollUp();
		else this.scrollButtons.scrollDown();	
	},
	
	/**
	shutdown function is called when exiting this state.
	*/
	shutdown: function()
	{
		game.globals.audioManager.typingOff();
		this.playButton = undefined;
		this.reviewButton = undefined;
	}
};
module.exports = intro;
},{"../modules/MultimediaText":14,"../modules/ScrollButtons":20}],29:[function(require,module,exports){
var AjaxFileReader = require('../modules/AjaxFileReader')();
var loadSave =  require("../modules/loadSave");
var PersonalNotes = require("../modules/PersonalNotes");
var AudioManager = require("../modules/AudioManager");
/**
The loading state
*/
var load = {

	preload: function(){
		game.physics.startSystem(Phaser.Physics.ARCADE);
		//load other assets
		this.progressingBar();	//the advancing progress bar
        
		this.loadAssets();
		//load tilemap for the hall
		window.game.load.tilemap('hallMapIntruder', 'scenarios/hallMapIntruder.json', null, Phaser.Tilemap.TILED_JSON);
		window.game.load.tilemap('hallMapDefender', 'scenarios/hallMapDefender.json', null, Phaser.Tilemap.TILED_JSON);
		//try to load the saved data
		loadSave.loadSaveData();

		game.load.onFileComplete.add(function(){
			if(this.loadingText)
				this.loadingText.setText("Loading..."+arguments[0]);});
	},
	
	progressingBar: function(){
		this.loadingText = game.add.text(game.world.centerX, game.world.centerY - 20, "Loading...",{font: "30px Courier New, monospace",  fontWeight: "bold", fill: "#2521FF", align: "center"});
		this.loadingText.anchor.set(0.5);
		
		var barBG = game.add.sprite(game.world.centerX, game.world.centerY + 50, "progressBarBG");
		barBG.anchor.setTo(0.5, 0.5);
		var barFG = game.add.sprite(game.world.centerX - barBG.width/2, game.world.centerY + 50, "progressBarFG");
		barFG.anchor.setTo(0, 0.5);
		game.load.setPreloadSprite(barFG);
	},
	
	/**
	Load the assets as specified in assetsTable.json
	*/
	loadAssets: function()
	{
		var i;
		var sheet;
		//image (assumes no third parameter)
		var imageTable = game.globals.assetsTable.images;
		for(i in imageTable)
			var loader = game.load.image(imageTable[i].key, imageTable[i].url);
		//spritesheets (take care of all parameters)
		var spritesheetTable = game.globals.assetsTable.spritesheets;
		for(i in spritesheetTable)
		{
			sheet = spritesheetTable[i];
			if(sheet.frameMax == undefined)
			{		
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight);
				continue;
			}
			if(sheet.margin == undefined)
			{
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax);
				continue;
			}
			if(sheet.spacing == undefined)
			{
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax, sheet.margin);
				continue;
			}
			else game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax, sheet.margin, sheet.spacing);
		}
		//audio (assume no third parameter)
		var audioTable = game.globals.assetsTable.audios;
		for(i in audioTable)
			game.load.audio(audioTable[i].key, audioTable[i].urls);
	},
	
	create: function(){
		//handle signal when the name, random numbers are entered
		var nameSignal = new Phaser.Signal();
		nameSignal.add(this.signalListener, this);
		loadSave.promptForName(nameSignal);

		/*///my version: get around the step of name or random number
		this.parseSingletons(0);*/
	},
	
	signalListener: function(arg){
		if(!arg)
			this.reportErrorLoading("The loading functionality is not supported. Maybe change for another browser");
		game.globals.audioManager = new AudioManager();
		//start with singlton files.
		this.parseSingletons(0);
	},
	
	/**
		Read and parse credits.json, tutorial.json, common_acts.json and persoanlNotes.json (already serialized in this order). Instance of personal notes is also created.
		At completion, the process flow will continue with parseScenarios.
		@param {int} type - 0: credits, 1: tutorial, 2: common acts, 3: personal notes, 4: extra assets
	*/
	parseSingletons: function(type){
		var filePath;
		switch(type)
		{
			case 0: filePath = "scenarios/credits.txt";
				break;
			case 1: filePath = "scenarios/tutorial1_NPCs.json";
				break;
			case 2: filePath = "scenarios/common_acts.json";
				break;
			case 3: filePath = "scenarios/personalNotes.json";
				break;
			case 4: filePath = "scenarios/tutorial1_intro.txt";
				break;
			case 5: filePath = "scenarios/tutorial2_intro.txt";
				break;
			case 6: filePath = "scenarios/tutorial3_intro.txt";
				break;
			case 7: filePath = "scenarios/tutorial2_outro.txt";
				break;
			case 8: filePath = "scenarios/tutorial3_outro.txt";
				break;
			case 9: filePath = "scenarios/tutorial2_cyber.json";
				break;
			case 10: filePath = "scenarios/tutorial3_cyber.json";
				break;
		}
		this.callbackSingletonFile = function()
		{
			 if(this.Reader.rawFile.readyState === 4)
            {
                if (this.Reader.rawFile.status === 200 || this.Reader.rawFile.status === 304) {
					//store in globals. For personal notes, create the class, and invoke on parseScenarios
					switch(type)
					{
						case 0: game.globals.credits = this.Reader.rawFile.responseText;
							//start dealing with tutorial1_NPC
							this.parseSingletons(1);
							break;
						case 1: game.globals.tutorialNPCs = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with common acts
							this.parseSingletons(2);
							break;
						case 2: game.globals.commonActs = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with personal notes
							this.parseSingletons(3);
							break;
						case 3: //create PersonalNotes
							game.globals.personalNotes = new PersonalNotes(JSON.parse(this.Reader.rawFile.responseText));
							//start dealing with tutorial intro 1
							this.parseSingletons(4);
							break;
						case 4: game.globals.tutorialIntros[1] = this.Reader.rawFile.responseText;
							//start dealing with tutorial intro 2
							this.parseSingletons(5);
							break;
						case 5: game.globals.tutorialIntros[2] = this.Reader.rawFile.responseText;
							//start dealing with tutorial intro 3
							this.parseSingletons(6);
							break;
						case 6: game.globals.tutorialIntros[3] = this.Reader.rawFile.responseText;
							//start dealing with tutorial outro 2
							this.parseSingletons(7);
							break;
						case 7: game.globals.tutorialOutros[2] = this.Reader.rawFile.responseText;
							//start dealing with tutorial outro 3
							this.parseSingletons(8);
							break;
						case 8: game.globals.tutorialOutros[3] = this.Reader.rawFile.responseText;
							//start dealing with tutorial cyber 2
							this.parseSingletons(9);
							break;
						case 9: game.globals.tutorialCybers[2] = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with tutorial cyber 3
							this.parseSingletons(10);
							break;
						case 10: game.globals.tutorialCybers[3] = JSON.parse(this.Reader.rawFile.responseText);		
							
							//the number of scenario. will be obtained when reading scenarioX_cyber.json
							this.NScenarios = Number.MAX_VALUE;
							//go on with the scenario files (cyber file, scenario 0)
							this.parseScenarios(0, 0);
							break;
					}
                }
                else {
                    this.reportErrorLoading("Error while loading " +filePath + " !");
                }
            }
		};
		this.Reader = new AjaxFileReader();
        this.Reader.readTextFile(filePath, this.callbackSingletonFile.bind(this), this.reportErrorLoading.bind(this, "Error while loading " +filePath + " !"));
	},
	
	/**
	Read scenarioX_cyber.json, scenarioX_NPCs.json, scenarioX_intro.txt and scenarioX_outro.txt (already serialized in this order). The two json files experience json parsing. But the txt files, before displayed, will also need parsing (non-json parsing based on the format defined in this game)
	At completion, the process flow will continue with loadDynamicAssets.
	@param {int} type - 0: scenarioX_cyber.json, 1: scenario_NPCs.json, 2: scenarioX_intro.txt, 3: scenarioX_outro.txt
	@param {int} index - the index of the next scenario to be processed
	*/
	parseScenarios: function(type){
		//each file type recurses this outer loop
		
		var index = 0;
		//prefix of the file path
		var prefix = "scenarios/scenario";
		//suffix of the file path. depends on file type
		var suffix;
		switch(type)
		{
			case 0: suffix = "_cyber.json";
				break;
			case 1: suffix = "_NPCs.json";
				break;
			case 2: suffix = "_intro.txt";
				break;
			case 3: suffix = "_outro.txt";
				break;
		}
		this.callbackScenarios = function ()
        {	//within a file type, each scenario recurses this innner loop
            if(this.Reader.rawFile.readyState === 4)
            {
                if (this.Reader.rawFile.status === 200 || this.Reader.rawFile.status === 304) {
					//store in globals
					switch(type)
					{
						case 0: game.globals.scenarioCybers[index] = JSON.parse(this.Reader.rawFile.responseText);
							break;
						case 1: game.globals.scenarioNPCs[index] = JSON.parse(this.Reader.rawFile.responseText);
							break;
						case 2: game.globals.scenarioIntros[index] = this.Reader.rawFile.responseText;
							break;
						case 3: game.globals.scenarioOutros[index] = this.Reader.rawFile.responseText;
							break;
					}
                    this.Reader = new AjaxFileReader();
                    index++;
					if(index < this.NScenarios)
						this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this),
                        null);
					else
					{//when read successfully, and this is the last scenario. NPC and intro go on with the next type; outro goes on with loadDynamicAssets
						if(type == 1)
							this.parseScenarios(2);
						else if(type == 2)
							this.parseScenarios(3);
							else if(type == 3)
								game.state.start('startMenu');
					}
                }
                else //non-200 return. could be file not found
				{
					switch(type)
					{
						case 0: //when no more cyber files detected, take the number as the number of scenarios
							this.NScenarios = index;
							console.log(this.NScenarios + " scenarios found");
							//start dealing with npc
							this.parseScenarios(1);
							break;
						case 1: //npc file absent
							game.globals.scenarioNPCs[index] = null;
							console.log("scenario"+index+"_NPCs.json not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //start dealing with intro
								this.parseScenarios(2);
							break;
						case 2: //intro file absent
							game.globals.scenarioIntros[index] = null;
							console.log("scenario"+index+"_intro.txt not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //start dealing with outro
								this.parseScenarios(3);
							break;
						case 3: //outro file absent
							game.globals.scenarioOutros[index] = null;
							console.log("scenario"+index+"_outro.txt not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //proceed to start menu
								game.state.start('startMenu');
							break;
					}
					/*else this.reportErrorLoading("Error while loading " + filePrefix +index + fileSuffix + " !");
					return;*/
                }
            }
        };
		this.Reader = new AjaxFileReader();
		this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), this.reportErrorLoading.bind(this, "Error while loading " + prefix + index + suffix + " !"));
	},
	
	/**
	Load other assets, specified by the scenario NPC files or scenario cyber files
	At completion, the process flow will go to the startMenu state
	*/
	/*loadDynamicAssets: function()
	{///should I load always preset assets, allowing json files to pick assets from them, instead of picking assets anywhere in the filepath?
		var s,n;

		for(s in game.globals.scenarioNPCs)
			if(game.globals.scenarioNPCs[s])	//some scenarioNPCs could be null: NPC file not defined
				for(n in game.globals.scenarioNPCs[s].NPCs )
				{
					//NPC sprite
					game.load.image("npcSprite"+s+"_"+n, game.globals.scenarioNPCs[s].NPCs[n].sprite);
					//NPC portrait
					game.load.image("npcPortrait"+s+"_"+n, game.globals.scenarioNPCs[s].NPCs[n].portrait);
				}
		for(s in game.globals.scenarioCybers)
		{
			//portraits
			game.load.image("cyberPortraits"+s+"_"+0, game.globals.scenarioCybers[s].portrait[0]);
			game.load.image("cyberPortraits"+s+"_"+1, game.globals.scenarioCybers[s].portrait[1]);
		}
		
		game.state.start('startMenu');
	},*/
	
	/**
     * Launches the error state if a fatal error has occurred during game loading.
     * @param {string} message - String containing the error message
     */
    reportErrorLoading: function (message) {
        if (!this.errorMessage)
		{
            this.errorMessage = message;
            game.state.start('error', true, false, this.errorMessage);
        }
    }
};
module.exports = load;
},{"../modules/AjaxFileReader":5,"../modules/AudioManager":6,"../modules/PersonalNotes":17,"../modules/loadSave":23}],30:[function(require,module,exports){
var HintBox = require("../modules/HintBox");
var LogViewer = require("../modules/LogViewer");
var Notes = require("../modules/Notes");
var Messager = require("../modules/Messager");
var loadSave = require("../modules/loadSave");
var CORSSender = require("../modules/learning_data_send");

/**
The review state after the cyber battle. It shows the offensive and defensive behaviors as well as their consequences during that battle.

*/
var review = {
	/**
	@param {int} index - the index of the scenario/tutorial
	@param {boolean} win - if the player wins
	@param {RecordEntry} record - an object containing logs, role, endingRound and assetsCompromised
	@param {int} doublePlayer - true: double player mode, false: single player mode
	*/
	init: function(index, win, record, doublePlayer)
	{
		this.index = index;
		this.win = win;
		this.record = record;
		this.doublePlayer = doublePlayer;
		
		if(index >= 0 && !game.globals.scenarioCybers[index+1])
			this.lastLevel = true;
		
		this.bgGroup = game.add.group();
		this.logGroup = game.add.group();
		this.notesGroup = game.add.group();
		this.notes = new Notes(this.notesGroup);
		this.messageGroup = game.add.group();
		
		this.hintBox = new HintBox("box");
		this.messager = new Messager(this.messageGroup, this.hintBox);
		game.globals.messager = this.messager;
		this.logViewer = new LogViewer(this.record.logs, this.record.role, this.doublePlayer, this.notes, this.messager, this.logGroup);
	},	
	
	create: function(){		
		var background = game.add.image(0, 0, "tron", 0, this.bgGroup);
		background.width = game.world.width;
		background.height = game.world.height;
		background.alpha = 0.6;
		
		this.logViewer.display(false);
		this.logViewer.noExit();
    
		/*this.buttonGroup = game.add.group();*/
		
		//menu button
		this.menuButton = game.add.button(game.world.centerX - 150 , 550, "menuButton", function(){game.state.start("startMenu");}, this, 0, 0, 1, 0, this.logGroup);
		this.menuButton.anchor.setTo(0.5);
		//personal notes button
		this.notesButton = game.add.button(game.world.centerX + 50, 550, "book", this.openNotes, this, 0, 0, 1, 0, this.logGroup);
		this.hintBox.setHintBox(this.notesButton, "Open personal notes (N)");
		this.notesButton.anchor.setTo(0.5);
		//shortcut key for personal notes
		var notesKey = game.input.keyboard.addKey(Phaser.Keyboard.N);
		notesKey.onDown.add(this.openNotes, this);
		
		if(!this.doublePlayer)
		{
			//restart button if not win
			if(!this.win)
			{
				this.restartButton = game.add.button(game.world.centerX +250, 550, "restartButton", function(){this.state.start("intro", true, false, 0, this.index);}, this, 0, 0, 1, 0, this.logGroup);
				this.restartButton.anchor.setTo(0.5);
			}
			else if(this.index >= 0)	//win: try to save data
			{
				loadSave.saveSaveData(this.index, this.record);
				this.messager.createMessage("Progress saved!");
				if(!game.globals.scenarioCybers[this.index+1] || !game.globals.scenarioCybers[this.index+2])	//when finishing one of the last two scenarios
				{	//create and send the learning data
					var learningData = {};
					//add playerName as username
					learningData.username = game.globals.playerName;
					learningData.records = [];
					
					//copy, but also abbreviate ER and AC, converting NobuffHurdle and buffHurdle into strings, and add index
					for(r in game.globals.records)
					{
						var record = game.globals.records[r];
						
						if(record == null)
							/*unfinished scenario found. e.g. one of the last two scenarios is not yet finished*/
							return;
						//convert noBuffHurdle and buffHurdle in logs into strings
						var newLogs = [];
						for(var l in record.logs)
						{
							newLogs[l] = {	round: record.logs[l].round,
										act: record.logs[l].act,
										noBuffHurdle: String(record.logs[l].noBuffHurdle),
										buffHurdle: String(record.logs[l].buffHurdle),
										unlucky: record.logs[l].unlucky,
										success: record.logs[l].success
							};
						}
						learningData.records[r] = {	logs: newLogs,
													role: record.role,
													ER: record.endingRound,
													AC: record.assetsCompromised,
													score: record.score,
													index: r
						}
					}
					localStorage.setItem("learningData", JSON.stringify(learningData));
					game.globals.messager = this.messager;
					CORSSender.makeCorsRequest(JSON.stringify(learningData));
				}
			}
		}
	},
	/**
	Open personal notes while also hide the hintBox
	*/
	openNotes: function()
	{
		this.hintBox.hide();
		this.notes.createNotes();
	},
	/**
	A function called at the ending phase of this state, when the game switch to another state. One can recycle or nullify some elements of this state, so that there will be no problem when returning to the state.
	*/
	shutdown: function()
	{
		delete this.notes;
		delete this.hintBox;
		delete this.messager;
		delete this.logViewer;
		this.bgGroup.destroy();
		this.logGroup.destroy();
		this.notesGroup.destroy();
		this.messageGroup.destroy();
	}	
};
module.exports = review;
},{"../modules/HintBox":10,"../modules/LogViewer":12,"../modules/Messager":13,"../modules/Notes":16,"../modules/learning_data_send":22,"../modules/loadSave":23}],31:[function(require,module,exports){
/**
The first state where the game is scaled to fix the screen size
In preparation for load state, load screen assets is also loaded here, 
and extraAssets.json is read and parsed here
*/

var scaling = {
	init: function()
	{
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;	//or Phaser.ScaleManager.RESIZE
		game.scale.minWidth = 500;
		game.scale.minHeight = 300;			
		game.scale.maxWidth = 1000;
		game.scale.maxHeight = 600;
		game.scale.pageAlignHorizontally = true;
		game.scale.pageAlignVertically = false;
		game.scale.forceLandscape = true;
		//or game.scale.forceOrientation(true,false);
		/*if(!game.device.desktop)
		{
			window.game.scale.hasResized.add(window.game.gameResized, this);
			window.game.scale.enterIncorrectOrientation.add(window.game.scale.enterIncorrectOrientation, this);
            window.game.scale.leaveIncorrectOrientation.add(window.game.scale.leaveIncorrectOrientation, this);
            window.game.scale.setScreenSize(true);
		}*/		
		var ow = parseInt(window.game.canvas.style.width,10);
        var oh = parseInt(window.game.canvas.style.height,10);
        var r = Math.max(window.innerWidth/ow,window.innerHeight/oh);
        var nw = ow*r;
        var nh = oh*r;
        window.game.canvas.style.width = nw+"px";
        window.game.canvas.style.height= nh+"px";
        window.game.canvas.style.marginLeft = (window.innerWidth/2 - nw/2)+"px";
        window.game.canvas.style.marginTop = (window.innerHeight/2 - nh/2)+"px";
        document.getElementById("game").style.width = window.innerWidth+"px";
        document.getElementById("game").style.height = window.innerHeight-1+"px";//The css for body includes 1px top margin, I believe this is the cause for this -1
        document.getElementById("game").style.overflow = "hidden";
	},
	/**
	In order to display loading animation, load screen assets need to be loaded before loading really starts. Therefore, here, in the preload in a state before load state.
	*/
	preload: function()
	{
		//read assetsTable.json, which contains a table of all assets and its corresponding key
		var loader = game.load.json('assetsTable', 'scenarios/assetsTable.json');

		//error state asset
		game.load.spritesheet('reloadButton', 'assets/images/reload_button.png', 208, 58);
		
		//load progress bar for load state
		game.load.image("progressBarBG", "assets/images/progress_bar_bg.png");		//empty progress bar
		game.load.image("progressBarFG", "assets/images/progress_bar_fg.png");		//full progress bar
		
		game.physics.startSystem(Phaser.Physics.ARCADE);
	},
	
	create: function()
	{
		//set the global variable ready for loading at load state
		game.globals.assetsTable = game.cache.getJSON("assetsTable");
		if(game.globals.assetsTable == null)
		{
			var errorMessage = "Cannot find scenarios/assetsTable.json or the file is corrupted!";
			game.state.start('error', true, false, errorMessage);
		}
		else game.state.start("load");
	}
};
module.exports = scaling;
},{}],32:[function(require,module,exports){
var ScrollButtons = require("../modules/ScrollButtons");
var loadSave =  require("../modules/loadSave");

var selection = {
	/**
	Distinguish between tutorial selection and scenario selection
	@param {boolean} type - 0 for tutorial selection, 1 for single player scenario selection, 2 for double player scenario selection
	*/
	init: function(type)
	{	this.type = type;
		
		//constants
		this.scePerPage = 6; //maximum number of scenarios in each page
		this.style = { font: "22px Segoe UI Black", fill: "#00EEFF", fontWeight: "bold", align: "center", wordWrap: true, wordWrapWidth: 280};
		this.styleScore = { font: "19px Segoe UI Black", fill: "#99FF00", align: "center"};
		
		this.group = game.add.group();
		this.scenarioButtons = [];
		//texts on the button
		this.scenarioTexts = [];
	},
	
	create: function(){
		if(this.type == 0)
			this.NPages = 1;
		else if(this.type == 1)
				this.NPages = Math.ceil(game.globals.scenarioCybers.length / this.scePerPage);
			else	//double player mode considers only those scenarios with doublePlayer == true
			{
				this.NDoubleScenarios = 0;	//number of scenarios supporting double player mode
				for(cyb in game.globals.scenarioCybers)
					if(game.globals.scenarioCybers[cyb].doublePlayer)
						this.NDoubleScenarios++;
				this.NPages = Math.ceil(this.NDoubleScenarios / this.scePerPage);
			}		
		this.scrollButtons = new ScrollButtons(950, 50, 500, this.toPage, this, this.NPages, this.group);
		//caption
		if(this.type == 0)
			var texts = "Tutorial Selection";
		else var texts = "Scenario Selection";
		var caption = game.add.text(game.world.centerX, 50, texts, {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"});
		caption.anchor.setTo(0.5);
		//back to menu button
		this.menuButton = game.add.button(game.world.centerX , 550, "menuButton", this.back2Menu, this, 0, 0, 1, 0, this.group);
		this.menuButton.anchor.setTo(0.5);
		
		//display the first page
		this.toPage(0);
		
		var scrollUpKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_UP);
		scrollUpKey.onDown.add(this.scrollFun, this);
		var scrollDownKey = game.input.keyboard.addKey(Phaser.Keyboard.PAGE_DOWN);
		scrollDownKey.onDown.add(this.scrollFun, this);
	},
	
	/**
	When the player presses on pageUp or pageDown key
	*/
	scrollFun: function(key)
	{
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.scrollButtons.scrollUp();
		else this.scrollButtons.scrollDown();
	},
	
	/**
	update the page to the one indicated by currentPage
	*/
	toPage: function(currentPage)
	{
		var i;
		//clean buttons of the previous page
		for(i in this.scenarioButtons)
		{
			this.scenarioButtons[i].destroy();
			this.scenarioTexts[i].destroy();
			if(this.scoreSprites[i])
				this.scoreSprites[i].destroy();
			if(this.lockingMasks[i])
				this.lockingMasks[i].destroy();
		}
		this.scenarioButtons = [];
		this.scenarioTexts = [];
		this.scoreSprites = [];
		this.lockingMasks = [];
		
		if(this.type == 0)	//tutorial selection
			var itemsThisPage = 3;
		else if(this.type == 1)//if left items are more than one page, set to secenarios per page; it left items less than one page, set to the number of items left
			var itemsThisPage = Math.min(game.globals.scenarioCybers.length - currentPage*this.scePerPage, this.scePerPage);
			else var itemsThisPage = Math.min(this.NDoubleScenarios - currentPage*this.scePerPage, this.scePerPage);
		var x,y;
		var SB;	//alias of scenarioButtons[i], just to speed up
		//used by double player mode, this index is the actual index of the scenario
		var scenarioIndex = 0;
		for(i=0; i< itemsThisPage; i++)
		{
			x = 200 + 300 * (i % 3);
			y = 180 + 200 * Math.floor(i / 3);
			var index = currentPage * this.scePerPage + i;	//displayed index
			
			if(this.type == 0)	//tutorials
			{				
				SB = game.add.button(x, y, "computerSmall1", this.selectOne, this, 0, 0, 0, 0, this.group);
				//store the index in the button sprite
				SB.index = index+1;
			}
			else if(this.type == 1)	//single player scenarios
				{
					SB = game.add.button(x, y, "computerSmall2", this.selectOne, this, 0, 0, 0, 0, this.group);
					//store the index in the button sprite
					SB.index = index;
				}
				else	//double player scenarios
				{
					//find the next scenario allowing double player
					while(!game.globals.scenarioCybers[scenarioIndex].doublePlayer)
						scenarioIndex++;
					SB = game.add.button(x, y, "computerSmall2", this.selectOne, this, 0, 0, 0, 0, this.group);
					//store the index in the button sprite
					SB.index = scenarioIndex;
				}
			SB.anchor.setTo(0.6, 0.4);
			SB.events.onInputOver.add(this.enlarge, this, 0, i);
			SB.events.onInputOut.add(this.normal, this, 0, i);
			
			this.scenarioButtons[i] = SB;
			//create texts over the button
			if(this.type == 0)	//tutorials
			{
				this.scenarioTexts[i] = game.add.text(x, y, "Tutorial "+index+"\n", this.style, this.group);
				switch(index)
				{	//set tutorial name
					case 0: this.scenarioTexts[i].text += "Hall\n";
							break;
					case 1: this.scenarioTexts[i].text += "Defender\n";
							break;
					case 2: this.scenarioTexts[i].text += "Intruder\n";
							break;
				}
				this.scenarioTexts[i].anchor.setTo(0.43, 0.35);
			}
			else if(this.type == 1)	//single player
				{
					this.scenarioTexts[i] = game.add.text(x, y, "Scenario "+index+"\n"+game.globals.scenarioCybers[index].name, this.style, this.group);
					this.scenarioTexts[i].anchor.setTo(0.6, 0.5);
				}
				else //double player (type == 2)
				{
					this.scenarioTexts[i] = game.add.text(x, y, "Scenario "+scenarioIndex+"\n"+game.globals.scenarioCybers[scenarioIndex].name, this.style, this.group);
					this.scenarioTexts[i].anchor.setTo(0.6, 0.5);
					
					scenarioIndex++;	//increment for the next iteration
				}
			//lock some of the scenarios
			if(this.type == 1)	//single player scenario only
			{
				if(game.globals.records && game.globals.records[index])
				{	//highest score
					var score = game.globals.records[index].score;
					this.scoreSprites[i] = game.add.text(x, y, "Highest Score: "+score, this.styleScore, this.group);
					this.scoreSprites[i].anchor.setTo(0.5, -1.5);
				}
				else if(index >= 2)
					if(!game.globals.records || (!game.globals.records[index- index%2 - 2] || !game.globals.records[index - index%2 -1]))
					{	//scenario lock
						this.lockingMasks[i] = game.add.button(x, y, "lock", game.globals.audioManager.accessDenied, game.globals.audioManager, 0, 0, 0, 0, this.group);
						this.lockingMasks[i].anchor.setTo(0.6, 0.4);
						this.lockingMasks[i].width = SB.width;
						this.lockingMasks[i].height = SB.height;
						this.lockingMasks[i].alpha = 0.5;
					}
			}
		}
	},
	/**
	Enlarge the scenario button when the mouse hover over it
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} i - the index of the scenario button in the current page
	*/
	enlarge: function(sprite, pointer, i)
	{
		game.add.tween(this.scenarioButtons[i].scale).to({x: 1.5, y: 1.5}, 400, Phaser.Easing.Linear.None, true);
		game.add.tween(this.scenarioTexts[i].scale).to({x: 1.5, y: 1.5}, 400, Phaser.Easing.Linear.None, true);
		if(this.scoreSprites[i])
			game.add.tween(this.scoreSprites[i].scale).to({x: 1.5, y: 1.5}, 400, Phaser.Easing.Linear.None, true);
	},
	/**
	Reset the scenario button when the mouse hover out of it
	@param {Phaser.Sprite} sprite - the sprite that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	@param {int} i - the index of the scenario button in the current page
	*/
	normal: function(sprite, pointer, i)
	{
		game.add.tween(this.scenarioButtons[i].scale).to({x: 1, y: 1}, 400, Phaser.Easing.Linear.None, true);
		game.add.tween(this.scenarioTexts[i].scale).to({x: 1, y: 1}, 400, Phaser.Easing.Linear.None, true);
		if(this.scoreSprites[i])
			game.add.tween(this.scoreSprites[i].scale).to({x: 1, y: 1}, 400, Phaser.Easing.Linear.None, true);
	},
	
	/**
	when the player click on a scenario. start the scenario.
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	selectOne: function(button, pointer)
	{
		game.globals.audioManager.accessGranted();
		if(this.type == 0)
			game.state.start("intro", true, false, 0, 0-parseInt(button.index));	//tutorial
		else if(this.type == 1)
				game.state.start("intro", true, false, 0, button.index);			//single player
			else game.state.start("cyberspace", true, false, button.index, true);	//double player
	},
	
	/**
	when the player click on the "menu" button. return to the menu
	*/
	back2Menu: function()
	{
		game.state.start("startMenu");
	}
};
module.exports = selection;
},{"../modules/ScrollButtons":20,"../modules/loadSave":23}],33:[function(require,module,exports){
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
},{"../modules/HintBox":10,"../modules/Messager":13,"../modules/Notes":16,"../modules/learning_data_send":22,"../modules/loadSave":23}]},{},[1]);

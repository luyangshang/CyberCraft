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
				/*if(!Number.isInteger(this.ai[i].pattern[a]))	//still name string
				{
					id = this.actManager.name2id(this.role, this.ai[i].pattern[a]);
					if(id != -1)
					{
						this.ai[i].patternap] = id;
					}
					else	//act still not defined
					{
						found = true;
						break;
					}
				}*/
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
		setTimeout(function(fun, context){fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
		//this.gameManager.roundFinal();
		return;
	}
	
	//got a plan (old plan or new plan), will follow the pattern
	//guarantee learnt
	for(var a in this.ai[this.currentPlan].pattern)
		if(this.learnAct(this.ai[this.currentPlan].pattern[a]) == false)
		{	//cannot learn them all
			//calling setTimeout will lose all context. code like this will guarantee context
			setTimeout(function(fun, context){fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
			//this.gameManager.roundFinal();
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
	if(gameManager.getResource(this.role) < allResource)
	{
		//calling setTimeout will lose all context. code like this will guarantee context
		setTimeout(function(fun, context){fun.call(context);}, this.operationDelay, this.gameManager.roundFinal, this.gameManager);
		//this.gameManager.roundFinal();
		return;
	}
	//resource also enough. ready to apply acts according to time interval
	setTimeout(this.singleAct, this.operationDelay, this, this.ai[this.currentPlan].pattern, 0, round);
	/*for(a in this.ai[this.currentPlan].pattern)
	{
		///need 1.5s idle between each act?
		this.actManager.applyAct(this.role, this.ai[this.currentPlan].pattern[a], round);
	}
	//plan executed. ready for another plan
	this.currentPlan = -1;*/
};
/**
Function invoked for each single act in the selected action pattern.
It will recursively call itself after each operatioDelay
@param {Array} pattern - the array of acts to performed. N.B. pattern is passed by reference. One should not modify it.
@param {int} i - the index in the pattern: which act to apply
*/
AIManager.prototype.singleAct = function(context, pattern, i, round)
{
	try{
		if(i >= pattern.length)
		{//plan executed. get ready for another plan
			context.currentPlan = -1;
			context.gameManager.roundFinal();
			return;
		}
		
		context.actManager.applyAct(context.role, pattern[i], round);
		setTimeout(context.singleAct, context.operationDelay, context, pattern, i+1, round);
	}catch(e){console.log("Game already ended.");}
};
/**
Recursive function to lean an act. Recursively invoke the learning of the prerequist.
@returns {boolean} - true for it was learnt or it's successfully learnt, false for leaning failure (insufficient resource)
*/
AIManager.prototype.learnAct = function(id)
{
	if(this.actManager.actLearnt(this.role, id))
		return true;
	//not learnt
	var result;
	//whether prerequists meet
	for(var p in this.actManager.getAct(this.role, id).prerequists)
	{	
		result = this.learnAct(this.actManager.getAct(this.role, id).prerequists[p]);
		if(!result)	//prerequists can't be learnt
			return;
	}
	//prerequists meet
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
Check if the action pattern (actually the last one of the acts) will enforce more buffs or clean any existing buffs on success
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
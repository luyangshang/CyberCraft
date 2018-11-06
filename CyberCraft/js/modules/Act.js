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
@param {int} spamRequests - the amount of spam requests to generate
@param {string} modifier - a string that is used to modifies other properties
@param {int} learnt - if the act is already learnt at the beginning
@param {int} enabled - if the act is enabled at the beginning (otherwise, it should be later on enabled by script)
@constructor
*/
function Act(name, prerequisites, learningCost, desc, needSelfBuffs, needRivalBuffs, noSelfBuffs, noRivalBuffs, cost, successRate, selfBuffs, rivalBuffs, cleanSelfBuffs, cleanRivalBuffs, buffLength, bonus, spamRequests, modifier, learnt, unlocked)
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
	this.spamRequests = spamRequests;
	this.modifier = modifier;
	//dynamic properties not specified in the json files
	this.learnt = learnt;
	this.unlocked = unlocked;
}
module.exports = Act;

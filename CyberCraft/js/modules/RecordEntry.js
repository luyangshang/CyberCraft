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

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

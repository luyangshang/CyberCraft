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
	///animation?
	this.resources[role] = Math.min(this.resources[role] + parseInt(amount), this.maxResource);
	this.cyberspace.updateResource(role, this.resources[role]);
};
/**
Decrease the resource of the character
@param {int} role - 0 for intruder, 1 for defender
@param {int} amount - the amount of resource to be substracted
*/
GameManager.prototype.consumeResource = function(role, amount)
{
	this.resources[role] -= amount;
	this.cyberspace.updateResource(role, this.resources[role]);
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
		//spam requests
		var spamRequests = this.buffManager.totalSpam();
		var DoSSusceptance = this.buffManager.totalDosSusceptance();
		spamRequests *= DoSSusceptance;
		var servingRatio = (parseFloat(this.serverCapacity)+parseFloat(this.buffManager.totalCapacity()))/(legitimateRequests+spamRequests);
		if(servingRatio >= 1)	//five by five
		{
			var serverIncome = legitimateRequests*this.servingBonus;
			this.obtainResource(1, serverIncome);
			//animation: one happy face for each served client
			this.effectManager.faces(true, legitimateRequests);
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
			if(this.logs[l].round == round && this.logs[l].actPattern == shouldApply[a])
				break;
		if(l >= this.logs.length) //not found
			return shouldApply[a];
	}
	return null;	//all found
};
module.exports = GameManager;
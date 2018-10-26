var MultimediaText = require("../modules/MultimediaText");
var ScrollButtons = require("../modules/ScrollButtons");
/**
The state of intro/outro/credits/tutorial
this state has text with typing like animation or image-text-mixed page
@param {int} type - 0: intro, 1: outro, 2: credits
@param {int} index - (optional) for intro and outro, the index of the scenario
@param {boolean} win - (for outro only) if the player wins
@param {Object} logs - (for outro only)an array of LogEntry, which record the offensive or defensive actions and their consequences in the last battle
@param {int} role - (for outro only)the player's role in the battle. 0 for intruder, 1 for defender
@param {int} endingRound - (for outro only) at which round the game finishes. useful for calculating the score when the intruder wins
@param {int} assetsCompromised - (for outro only)the amount of assets lost. useful for calculating the score when the defender wins
*/
var intro = {
	init: function(type)
	{
		this.styleCaption = {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"};
		this.styleScore = {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#5522FF", align: "center"};
		
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
				this.logs = arguments[3];
				this.role = arguments[4];
				this.endingRound = arguments[5];
				this.assetsCompromised = arguments[6];
				if(this.win)
				{
					if(this.index < 0)
					this.texts = game.globals.tutorialOutros[0-parseInt(this.index)].split("^");
					else
					{
						var longtext = game.globals.scenarioOutros[this.index];
						if(longtext)	//outro found
							this.texts = longtext.split("^");
						else
						{	//outro absent
							this.score = this.calculateScore();
							game.state.start("review", true, false, this.win, this.score, this.logs, this.role, this.index);
						}
					}
				}
				else if(this.role) this.texts = ["You failed to defend the assets!\n\nMaybe you got some holes in your defence? \n\nDon't lose your heart. From Review you will find where you have not done well, and you can try again.", "If you keep failing, you can probably refer to the section \"Extra guide for the scenarios\" in the user manual. \nUser manual can be opened by appending \"User manual.pdf\" to the current url. But if the current url has \"index.html\", you should replace it with \"User manual.pdf\"."];
					else this.texts = ["Intrusion failed!\n\nMaybe you attacked too aggressively and exhausted all your resources on those well defended? \nMaybe you attacked too timidly and missed too many chances before the rounds expired? \n\nDon't lose heart. From Review you will find where you have not done well, and you can try again.", "If you keep failing, you can probably refer to the section \"Extra guide for the scenarios\" in the user manual. \nUser manual can be opened by appending \"User manual.pdf\" to the current url. But if the current url has \"index.html\", you should replace it with \"User manual.pdf\"."];
				break;
			case 2: //credit
				this.texts = game.globals.credits.split("^");
				break;
		}
	},
	
	create: function(){
		var group = game.add.group();
		//background
		var bg = game.add.image(game.world.centerX, game.world.centerY-600, "PNFrame", 0, group);
		bg.anchor.setTo(0.5);
		
		this.multimedia = new MultimediaText(150, 150, 0);
		this.scrollButtons = new ScrollButtons(950, 50, 500, this.updatePage, this, this.texts.length);
		
		//click on the dynamic text to finish writing immediately
		bg.inputEnabled = true;
		bg.events.onInputDown.add(this.multimedia.finishWriting, this.multimedia, 0);
		
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
					var playButton = game.add.button(game.world.centerX + 150 , 550-600, "playButton", this.play, this, 0, 0, 1, 0, group);
					playButton.anchor.setTo(0.5);
				}
				
				var caption = game.add.text(game.world.centerX, 50-600, texts, this.styleCaption, group);
				caption.anchor.setTo(0.5);
				//button
				var menuButton = game.add.button(game.world.centerX - 150 , 550-600, "menuButton", this.menu, this, 0, 0, 1, 0, group);
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
					var reviewButton = game.add.button(game.world.centerX , 550-600, "reviewButton", this.review, this, 0, 0, 1, 0, group);
					reviewButton.anchor.setTo(0.5);
				}
				var caption = game.add.text(game.world.centerX, 50-600, texts, this.styleCaption, group);
				caption.anchor.setTo(0.5);
				this.score = this.calculateScore();
				var scoreText = game.add.text(game.world.centerX + 120, 110-600, "Your score: "+this.score, this.styleScore, group);
				scoreText.anchor.setTo(0.5);
				//relaxed music
				game.globals.audioManager.outroMusic();
				break;
			case 2://credits
				//caption
				var caption = game.add.text(game.world.centerX, 50-600, "credits", this.styleCaption, group);
				caption.anchor.setTo(0.5);
				//button
				var menuButton = game.add.button(game.world.centerX , 550-600, "menuButton", this.menu, this, 0, 0, 1, 0, group);
				menuButton.anchor.setTo(0.5);
				//relaxed music
				game.globals.audioManager.outroMusic();
				break;
		}
		//entering animation
		var tween = game.add.tween(group).to({y: '+600'}, 2500, "Elastic.easeOut", true, 0, 0, false);
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
					var playTween = game.add.tween(this.playButton.scale).to({x:1.3, y:1.3}, 2500, Phaser.Easing.Linear.None, false, 0, -1, true).start();
				}
		//tutorial outro: add button to review at the last page
		if(this.type == 1 && this.index < 0)
			if(targetPage + 1 == this.texts.length)
				if(!this.reviewButton)
				{//the button to start scenario 0
					this.reviewButton = game.add.button(game.world.centerX, 550, "reviewButton", this.review, this);
					this.reviewButton.anchor.setTo(0.5);
					var playTween = game.add.tween(this.reviewButton.scale).to({x:1.3, y:1.3}, 2500, Phaser.Easing.Linear.None, false, 0, -1, true).start();
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
			game.state.start("cyberspace", true, false, this.index);
	},
	
	/**
	When clicking on "Review" button
	*/
	review: function()
	{
		//game.globals.audioManager.typingOff();///
		game.state.start("review", true, false, this.win, this.score, this.logs, this.role, this.index);
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
	The function that calculate the score of the player based on the action log
	@returns {int} - the score
	*/
	calculateScore: function()
	{
		var score = 0;
		for(var l in this.logs)
		{
			if(this.logs[l].round%2 == 0)	//intruder's round
				if(this.logs[l].success)
				{
					if(this.role == 0)
						score +=100;	//intruder gains 100 points at each success at his round
				}
				else if(this.role == 1)
						score += 100;	//defender gains 100 points at each failure at intruder's round
		}
		if(this.role == 0)
		{
			score -= this.endingRound*40;		//intruder loss 40 points for every round the defender survives
			score += this.assetsCompromised*4;	//intruder gains 4 points for every damage dealt to the assets
		}
		else 
		{
			score += this.endingRound*40;		//defender gains 40 points for every round he survives
			score -= this.assetsCompromised*4;	//defender loss 4 points for every damage dealt to the assets
		}
		/*nagative score is too much frustrating for the players, even if they did play badly.
		nagative scores will be rised to zero, hoping to console them a little*/
		if(score < 0)	
			score = 0;
		return score;
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
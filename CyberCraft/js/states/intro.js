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
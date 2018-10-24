var ScrollButtons = require("../modules/ScrollButtons");
var loadSave =  require("../modules/loadSave");

var selection = {
	/**
	Distinguish between tutorial selection and scenario selection
	@param {boolean} type - 0 for tutorial selection, 1 for scenario selection
	*/
	init: function(type)
	{	this.type = type;
		
		//constants
		this.scePerPage = 6; //maximum number of scenarios in each page
		this.style = { font: "21px Segoe UI Black", fill: "#3333FF", fontWeight: "bold", align: "center", wordWrap: true, wordWrapWidth: game.width - 95};
		this.styleScore = { font: "19px Segoe UI Black", fill: "#BBFF00", align: "center"};
		
		this.scenarioButtons = [];
		//texts on the button
		this.scenarioTexts = [];
	},
	
	create: function(){
		if(!this.type)
			this.NPages = 1;
		else this.NPages = Math.ceil(game.globals.scenarioCybers.length / this.scePerPage);
		this.scrollButtons = new ScrollButtons(950, 50, 500, this.toPage, this, this.NPages);
		//caption
		if(!this.type)
			var texts = "Tutorial Selection";
		else var texts = "Scenario Selection";
		var caption = game.add.text(game.world.centerX, 50, texts, {font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"});
		caption.anchor.setTo(0.5);
		//back to menu button
		this.menuButton = game.add.button(game.world.centerX , 550, "menuButton", this.back2Menu, this);
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
		
		if(!this.type)
			var itemsThisPage = 3;
		else //if left items are more than one page, set to secenarios per page; it left items less than one page, set to the number of items left
			var itemsThisPage = Math.min(game.globals.scenarioCybers.length - currentPage*this.scePerPage, this.scePerPage);
		var x,y;
		var SB;	//alias of scenarioButtons[i], just to speed up
		for(i=0; i< itemsThisPage; i++)
		{
			x = 200 + 300 * (i % 3);
			y = 180 + 200 * Math.floor(i / 3);
			var index = currentPage * this.scePerPage + i;	//displayed index
			if(!this.type)
			{				
				index++;
				SB = game.add.button(x, y, "computerSmall1", this.selectOne, this, 0, 0, 0, 0);
			}
			else SB = game.add.button(x, y, "computerSmall2", this.selectOne, this, 0, 0, 0, 0);
			SB.anchor.setTo(0.6, 0.4);
			SB.events.onInputOver.add(this.enlarge, this, 0, i);
			SB.events.onInputOut.add(this.normal, this, 0, i);
			//store the scenarioIndex in the button sprite
			SB.index = index;
			this.scenarioButtons[i] = SB;
			//create texts over the button
			if(!this.type)
			{
				this.scenarioTexts[i] = game.add.text(x, y+20, "Tutorial "+index+"\n"/*+game.globals.scenarioCybers[index].name*/, this.style);
				switch(index)
				{
					case 1: this.scenarioTexts[i].text += "Hall\n";
							break;
					case 2: this.scenarioTexts[i].text += "Defender\n";
							break;
					case 3: this.scenarioTexts[i].text += "Intruder\n";
							break;
				}
			}
			else this.scenarioTexts[i] = game.add.text(x, y, "Scenario "+index+"\n"+game.globals.scenarioCybers[index].name, this.style);
			this.scenarioTexts[i].anchor.setTo(0.5);
			//lock some of the scenarios
			if(this.type)
			{
				if(game.globals.savedata && game.globals.savedata[index])
				{
					var score = game.globals.savedata[index].score;
					this.scoreSprites[i] = game.add.text(x, y, "Highest Score: "+score, this.styleScore);
					this.scoreSprites[i].anchor.setTo(0.5, -1.5);
				}
				else if(index >= 2)
					if(!game.globals.savedata || (!game.globals.savedata[index- index%2 - 2] || !game.globals.savedata[index - index%2 -1]))
					{
						this.lockingMasks[i] = game.add.button(x, y, "lock", game.globals.audioManager.accessDenied, game.globals.audioManager);
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
		if(!this.type)
			game.state.start("intro", true, false, 0, 0-parseInt(button.index));	//tutorial
		else game.state.start("intro", true, false, 0, button.index);				//scenario
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
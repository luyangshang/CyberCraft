var ScrollButtons = require("../modules/ScrollButtons");
var GameManager = require("../modules/GameManager");
var ActManager = require("../modules/ActManager");
var BuffManager = require("../modules/BuffManager");
var AIManager = require("../modules/AIManager");
var ScriptManager = require("../modules/ScriptManager");
var EffectManager = require("../modules/EffectManager");
var Notes = require("../modules/Notes");
var LogViewer = require("../modules/LogViewer");
var HintBox = require("../modules/HintBox");
/**
The cyber battle state. It's a turn-base fight. The turn ranges in (1,maxRound], with odd number being defender's round, even number being intruder's round. The game ends with server's assets all compromised (intruder wins) or with the maxRound reached (defender wins).
It takes the role of View in the MVC framework. GameManager takes the role of Model and Controller.
*/
var cyberspace = {
	/**
	@param {int} index - negative number for tutorials, 0 or positive number for scenarios
	*/
	init: function(index)
	{
		//constants
		this.actsPerPage = 5;
		this.buffsPerPage = 5;
		this.style = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00CC11", align: "left", wordWrap: true, wordWrapWidth: game.width - 270};
		this.styleUnlearnt = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#1144FF", align: "left", wordWrap: true, wordWrapWidth: game.width - 95};
		this.styleName = { font: "22px Courier New, monospace", fontWeight: "bold", fill: "#00CC11", align: "left", wordWrap: true, wordWrapWidth: game.width - 95};
		this.styleCaption = { font: "26px Courier New, monospace", fontWeight: "bold", fill: "#FFEE11", align: "left"};
		this.styleResource = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#00AAFF", align: "center"};
		this.styleAssets = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FFEE00", align: "center"};
		this.styleRequire = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#EE00FF", align: "center", wordWrap: true, wordWrapWidth: game.width - 250};
		this.styleResult = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF8800", align: "center", wordWrap: true, wordWrapWidth: game.width - 250};
		this.styleDamage = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF1100", align: "center"};
		
		if(index < 0)
			this.cyber = game.globals.tutorialCybers[0-parseInt(index)];
		else this.cyber = game.globals.scenarioCybers[index];
		this.index = index;
		
		//the player's role
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
		this.pauseGroup = game.add.group();
	//layer 6
		this.confirmGroup = game.add.group();
		
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
		this.notes = new Notes(this);
		
		this.logViewer = new LogViewer(this.logs, this.role, this.notes, this.logGroup);
		this.effectManager = new EffectManager(this.logGroup, X, Y, 200, 50, 50, 110);
		this.buffManager = new BuffManager(index);
		this.actManager = new ActManager(index, this.buffManager, this.effectManager, this.logs, this.role);
		this.aiManager = new AIManager(index, this.actManager, this.buffManager, 1-this.role);
		this.scriptManager = new ScriptManager(index, this, this.actManager, this.aiManager, this.dialogueGroup);
		
		this.gameManager = new GameManager(index, this.buffManager, this,this.aiManager, this.scriptManager, this.effectManager, this.logs);
		
		//give actManger the reference to GameManager
		this.actManager.setGameManager(this.gameManager);
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
		this.resourceSprites[this.role] = game.add.text(210, 550, "", this.styleResource, this.panelGroup);
		this.resourceSprites[1-this.role] = game.add.text(740, 50, "", this.styleResource, this.panelGroup);
		this.updateResource(0);
		this.updateResource(1);
		this.resourceSprites[0].anchor.setTo(0.5);
		this.resourceSprites[1].anchor.setTo(0.5);
		//create assert sprite
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
	//layer 5: pause group: restart cyber battle + back to menu + resume button
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
		
	//layer 6: the group for "are you sure to quit?"
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
	Callback functions to scroll the pages of the acts to the right page
	*/
	updateActs: function(targetPage)
	{
		//clean old acts
		for(var i in this.actSprites)
			this.actSprites[i].destroy();
		this.actSprites = [];
		this.actTweens = [];
		
		/*due to the possibility of add acts by script, array of actNames and the number of pages can change dynamically. Therefore, actScroll are dynamically set here.*/
		var unlockedActs = this.actManager.getUnlockedActs(this.role);
		//this.actNames = this.actManager.getActNames(this.role);
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
			if(this.actManager.actLearnt(this.role, id))
				this.actSprites[i] = game.add.text(450, 260 + 50 * i, this.actManager.getAct(this.role, id).name, this.style, this.actsGroup);	//green for learnt acts
			else this.actSprites[i] = game.add.text(450, 260 + 50 * i, this.actManager.getAct(this.role, id).name, this.styleUnlearnt, this.actsGroup);	//blue for act not learnt
		
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
	*/
	updateRound: function()
	{
		var round = this.gameManager.getRound();
		var roundText = "Round: " + round + " / " + this.gameManager.maxRounds;
		this.roundSprite.setText(roundText);
		var role = round % 2;
		this.effectManager.createRoundSpark("Round:\n"+round, role, 400);
	},
	/**
	Activate or deactivate player's learning and applying functionality, base on whether it's the player's role
	@param {boolean} playerRound - true: player's round, false: rival's round
	*/
	changeControl: function(playerRound)
	{
		this.playerRound = playerRound;
	},
/* -------------------- update functions ends -----------------------*/		
	
/* ---- act/buffs/buff/attack log popup screen functions starts -----*/	
	/**
	When the player clicked on an act.
	Show the act detail, together with learn/apply and seeNote button
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

		var act = this.actManager.getAct(this.role, id);
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
		{	//prerequisits
			if(act.prerequists.length)
			{
				preText = "Prerequisits for learning: ";
				for(p in act.prerequists)
					preText += this.actManager.id2name(this.role, act.prerequists[p]) + ", ";
				preText = preText.slice(0, -2);	//delete tail
				this.preSprite = game.add.text(150, 150, preText, this.styleResource, this.variableGroup);
			}
			
			//learning cost
			this.learningCostSprite = game.add.text(750, 530, "Learning cost: " + act.learningCost, this.styleResource, this.variableGroup);
			this.learningCostSprite.anchor.setTo(0.5);
			//a button to learn
			this.learnButton = game.add.button(500, 530, "learnButton", this.learnAct, this, 0, 0, 1, 0, this.variableGroup);
			this.hintBox.setHintBox(this.learnButton, "Learn the act (E)");
			this.learnButton.id = id;
			this.learnButton.i = i;
			this.learnButton.anchor.setTo(0.5);
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
			//spam requests
			if(act.spamRequests)
				this.spamSprite = game.add.text(150, y, "Generate spam request: " + act.spamRequests , this.styleDamage, this.variableGroup);
			
			//cost
			if(act.cost)
			{
				this.costSprite = game.add.text(550, 530, "Cost: " + act.cost, this.styleResource, this.variableGroup);
				this.costSprite.anchor.setTo(0.5);
				//a button to apply
				this.applyButton = game.add.button(750, 530, "applyButton", this.applyAct, this, 0, 0, 1, 0, this.variableGroup);
				this.hintBox.setHintBox(this.applyButton, "Apply the act (A)");
				this.applyButton.id = id;
				this.applyButton.anchor.setTo(0.5);
			}
			else
			{				
				this.costSprite = game.add.text(500, 530, "It's not to be used", this.styleResource, this.variableGroup);
				//nullify the pointer so as not to fool the "A" key
				this.applyButton = undefined;
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
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	learnAct: function(button, pointer)
	{
		if(!this.playerRound)
			return;
		
		this.hintBox.hide();
		//act id
		var id = button.id;
		//act index in the current page
		var i = button.i;
		//var id = this.actManager.name2id(actName);
		if(this.actManager.learnAct(this.role, id))
		{			
			//update act color
			this.actSprites[i].setStyle(this.style);
			if(this.actManager.getAct(this.role, id).cost)
				/*refresh act popup screen by mimicing a click
			1st parameter sprite and 2nd parameter pointer is not used by showAct.
			So altough the values are not actually right, it doesn't matter */
				this.showAct(button, pointer, id, i);
			else this.popupGroup.visible = false;
		}
	},
	/**
	When the player clicks on the apply button (applying form)
	@param {Phaser.Button} button - the button that invokes this
	@param {Phaser.Pointer} pointer - the mouse pointer object
	*/
	applyAct: function(button, pointer)
	{
		if(!this.playerRound)
			return;
		
		this.hintBox.hide();
		var id = button.id;
		var result = this.actManager.applyAct(this.role, id, this.gameManager.getRound());
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
			if(lengthText != -1 && (this.gameManager.getRound() + lengthText)%2 == 0)
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
		
		//buff spam requests
		if(num = this.buffManager.getSpam(id))
			var spamSprite = game.add.text(150, 250, "Spam requests: " + num, this.styleDamage, this.variableGroup);
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
			window.alert("Sorry. This entry is not found in personal notes!");
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
		this.state.start("intro", true, false, 0, this.index);
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
		//close the opened windows
		if(this.notes.exitButton && this.notes.exitButton.alive == false)
		{	//just been destroyed, but the pointer still remain for a while
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
		if(this.confirmGroup.visible == true || this.pauseGroup.visible == true || this.logGroup.getAt(0).length || this.popupGroup.visible == true)
			return;
		//buffs window open, scroll the buffs
		if(this.buffsGroup.visible == true)
		{
			if(key.keyCode == Phaser.Keyboard.PAGE_UP)
				this.buffScroll.scrollUp();
			else this.buffScroll.scrollDown();
			return;
		}
		//no window open, scroll the acts
		if(key.keyCode == Phaser.Keyboard.PAGE_UP)
			this.actScroll.scrollUp();
		else this.actScroll.scrollDown();
	},
	/**
	When the player presses the key "N". Open the personal notes with or without target entry
	*/
	notesFun: function()
	{
		if(this.confirmGroup.visible == true || this.pauseGroup.visible == true || this.notes.exitButton)
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
		if(this.confirmGroup.visible == true || this.pauseGroup.visible == true || this.logGroup.getAt(0).length)
			return;
		if(this.popupGroup.visible == true)
		{
			if(this.learnButton != undefined)
				this.learnAct(this.learnButton, null);
		}
	},
	/**
	When the player presses the "A" key
	*/
	applyFun: function()
	{
		if(this.confirmGroup.visible == true || this.pauseGroup.visible == true || this.logGroup.getAt(0).length)
			return;
		if(this.popupGroup.visible == true)
		{
			if(this.applyButton != undefined)
				this.applyAct(this.applyButton, null);
		}
	},
/* -------------------- key functions ends -----------------------*/

	/**
	When the player or the rival ends his/her round
	*/
	nextRound: function()
	{
		if(!this.playerRound)
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
		game.state.start("intro", true, false, 1, this.index, win, this.logs, this.role, this.gameManager.getRound(), parseInt(this.cyber.assets - this.gameManager.getAssets()));
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
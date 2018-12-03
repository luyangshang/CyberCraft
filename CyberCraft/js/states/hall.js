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
		this.multimedia = new MultimediaText(250, 470, 1, this.dialogueGroup, this.dismissDialogue, this, );
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
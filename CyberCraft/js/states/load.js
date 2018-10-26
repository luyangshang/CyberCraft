var AjaxFileReader = require('../modules/AjaxFileReader')();
var loadSave =  require("../modules/loadSave");
var PersonalNotes = require("../modules/PersonalNotes");
var AudioManager = require("../modules/AudioManager");
/**
The loading state
*/
var load = {

	preload: function(){
		game.physics.startSystem(Phaser.Physics.ARCADE);
		//load other assets
		this.progressingBar();	//the advancing progress bar
        
		this.loadAssets();
		//load tilemap for the hall
		window.game.load.tilemap('hallMapIntruder', 'scenarios/hallMapIntruder.json', null, Phaser.Tilemap.TILED_JSON);
		window.game.load.tilemap('hallMapDefender', 'scenarios/hallMapDefender.json', null, Phaser.Tilemap.TILED_JSON);
		//try to load the saved data
		loadSave.loadSaveData();

		game.load.onFileComplete.add(function(){
			if(this.loadingText)
				this.loadingText.setText("Loading..."+arguments[0]);});
	},
	
	progressingBar: function(){
		this.loadingText = game.add.text(game.world.centerX, game.world.centerY - 20, "Loading...",{font: "30px Courier New, monospace",  fontWeight: "bold", fill: "#2521FF", align: "center"});
		this.loadingText.anchor.set(0.5);
		
		var barBG = game.add.sprite(game.world.centerX, game.world.centerY + 50, "progressBarBG");
		barBG.anchor.setTo(0.5, 0.5);
		var barFG = game.add.sprite(game.world.centerX - barBG.width/2, game.world.centerY + 50, "progressBarFG");
		barFG.anchor.setTo(0, 0.5);
		game.load.setPreloadSprite(barFG);
	},
	
	/**
	Load the assets as specified in assetsTable.json
	*/
	loadAssets: function()
	{
		var i;
		var sheet;
		//image (assumes no third parameter)
		var imageTable = game.globals.assetsTable.images;
		for(i in imageTable)
			var loader = game.load.image(imageTable[i].key, imageTable[i].url);
		//spritesheets (take care of all parameters)
		var spritesheetTable = game.globals.assetsTable.spritesheets;
		for(i in spritesheetTable)
		{
			sheet = spritesheetTable[i];
			if(sheet.frameMax == undefined)
			{		
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight);
				continue;
			}
			if(sheet.margin == undefined)
			{
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax);
				continue;
			}
			if(sheet.spacing == undefined)
			{
				game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax, sheet.margin);
				continue;
			}
			else game.load.spritesheet(sheet.key, sheet.url, sheet.frameWidth, sheet.frameHeight, sheet.frameMax, sheet.margin, sheet.spacing);
		}
		//audio (assume no third parameter)
		var audioTable = game.globals.assetsTable.audios;
		for(i in audioTable)
			game.load.audio(audioTable[i].key, audioTable[i].urls);
	},
	
	create: function(){
		//handle signal when the name, random numbers are entered
		var nameSignal = new Phaser.Signal();
		nameSignal.add(this.signalListener, this);
		loadSave.promptForName(nameSignal);

		/*///my version: get around the step of name or random number
		this.parseSingletons(0);*/
	},
	
	signalListener: function(arg){
		if(!arg)
			this.reportErrorLoading("The loading functionality is not supported. Maybe change for another browser");
		game.globals.audioManager = new AudioManager();
		//start with singlton files.
		this.parseSingletons(0);
	},
	
	/**
		Read and parse credits.json, tutorial.json, common_acts.json and persoanlNotes.json (already serialized in this order). Instance of personal notes is also created.
		At completion, the process flow will continue with parseScenarios.
		@param {int} type - 0: credits, 1: tutorial, 2: common acts, 3: personal notes, 4: extra assets
	*/
	parseSingletons: function(type){
		var filePath;
		switch(type)
		{
			case 0: filePath = "scenarios/credits.txt";
				break;
			case 1: filePath = "scenarios/tutorial1_NPCs.json";
				break;
			case 2: filePath = "scenarios/common_acts.json";
				break;
			case 3: filePath = "scenarios/personalNotes.json";
				break;
			case 4: filePath = "scenarios/tutorial1_intro.txt";
				break;
			case 5: filePath = "scenarios/tutorial2_intro.txt";
				break;
			case 6: filePath = "scenarios/tutorial3_intro.txt";
				break;
			case 7: filePath = "scenarios/tutorial2_outro.txt";
				break;
			case 8: filePath = "scenarios/tutorial3_outro.txt";
				break;
			case 9: filePath = "scenarios/tutorial2_cyber.json";
				break;
			case 10: filePath = "scenarios/tutorial3_cyber.json";
				break;
		}
		this.callbackSingletonFile = function()
		{
			 if(this.Reader.rawFile.readyState === 4)
            {
                if (this.Reader.rawFile.status === 200 || this.Reader.rawFile.status === 304) {
					//store in globals. For personal notes, create the class, and invoke on parseScenarios
					switch(type)
					{
						case 0: game.globals.credits = this.Reader.rawFile.responseText;
							//start dealing with tutorial1_NPC
							this.parseSingletons(1);
							break;
						case 1: game.globals.tutorialNPCs = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with common acts
							this.parseSingletons(2);
							break;
						case 2: game.globals.commonActs = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with personal notes
							this.parseSingletons(3);
							break;
						case 3: //create PersonalNotes
							game.globals.personalNotes = new PersonalNotes(JSON.parse(this.Reader.rawFile.responseText));
							//start dealing with tutorial intro 1
							this.parseSingletons(4);
							break;
						case 4: game.globals.tutorialIntros[1] = this.Reader.rawFile.responseText;
							//start dealing with tutorial intro 2
							this.parseSingletons(5);
							break;
						case 5: game.globals.tutorialIntros[2] = this.Reader.rawFile.responseText;
							//start dealing with tutorial intro 3
							this.parseSingletons(6);
							break;
						case 6: game.globals.tutorialIntros[3] = this.Reader.rawFile.responseText;
							//start dealing with tutorial outro 2
							this.parseSingletons(7);
							break;
						case 7: game.globals.tutorialOutros[2] = this.Reader.rawFile.responseText;
							//start dealing with tutorial outro 3
							this.parseSingletons(8);
							break;
						case 8: game.globals.tutorialOutros[3] = this.Reader.rawFile.responseText;
							//start dealing with tutorial cyber 2
							this.parseSingletons(9);
							break;
						case 9: game.globals.tutorialCybers[2] = JSON.parse(this.Reader.rawFile.responseText);
							//start dealing with tutorial cyber 3
							this.parseSingletons(10);
							break;
						case 10: game.globals.tutorialCybers[3] = JSON.parse(this.Reader.rawFile.responseText);		
							
							//the number of scenario. will be obtained when reading scenarioX_cyber.json
							this.NScenarios = Number.MAX_VALUE;
							//go on with the scenario files (cyber file, scenario 0)
							this.parseScenarios(0, 0);
							break;
					}
                }
                else {
                    this.reportErrorLoading("Error while loading " +filePath + " !");
                }
            }
		};
		this.Reader = new AjaxFileReader();
        this.Reader.readTextFile(filePath, this.callbackSingletonFile.bind(this), this.reportErrorLoading.bind(this, "Error while loading " +filePath + " !"));
	},
	
	/**
	Read scenarioX_cyber.json, scenarioX_NPCs.json, scenarioX_intro.txt and scenarioX_outro.txt (already serialized in this order). The two json files experience json parsing. But the txt files, before displayed, will also need parsing (non-json parsing based on the format defined in this game)
	At completion, the process flow will continue with loadDynamicAssets.
	@param {int} type - 0: scenarioX_cyber.json, 1: scenario_NPCs.json, 2: scenarioX_intro.txt, 3: scenarioX_outro.txt
	@param {int} index - the index of the next scenario to be processed
	*/
	parseScenarios: function(type){
		//each file type recurses this outer loop
		
		var index = 0;
		//prefix of the file path
		var prefix = "scenarios/scenario";
		//suffix of the file path. depends on file type
		var suffix;
		switch(type)
		{
			case 0: suffix = "_cyber.json";
				break;
			case 1: suffix = "_NPCs.json";
				break;
			case 2: suffix = "_intro.txt";
				break;
			case 3: suffix = "_outro.txt";
				break;
		}
		this.callbackScenarios = function ()
        {	//within a file type, each scenario recurses this innner loop
            if(this.Reader.rawFile.readyState === 4)
            {
                if (this.Reader.rawFile.status === 200 || this.Reader.rawFile.status === 304) {
					//store in globals
					switch(type)
					{
						case 0: game.globals.scenarioCybers[index] = JSON.parse(this.Reader.rawFile.responseText);
							break;
						case 1: game.globals.scenarioNPCs[index] = JSON.parse(this.Reader.rawFile.responseText);
							break;
						case 2: game.globals.scenarioIntros[index] = this.Reader.rawFile.responseText;
							break;
						case 3: game.globals.scenarioOutros[index] = this.Reader.rawFile.responseText;
							break;
					}
                    this.Reader = new AjaxFileReader();
                    index++;
					if(index < this.NScenarios)
						this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this),
                        null);
					else
					{//when read successfully, and this is the last scenario. NPC and intro go on with the next type; outro goes on with loadDynamicAssets
						if(type == 1)
							this.parseScenarios(2);
						else if(type == 2)
							this.parseScenarios(3);
							else if(type == 3)
								game.state.start('startMenu');
					}
                }
                else //non-200 return. could be file not found
				{
					switch(type)
					{
						case 0: //when no more cyber files detected, take the number as the number of scenarios
							this.NScenarios = index;
							console.log(this.NScenarios + " scenarios found");
							//start dealing with npc
							this.parseScenarios(1);
							break;
						case 1: //npc file absent
							game.globals.scenarioNPCs[index] = null;
							console.log("scenario"+index+"_NPCs.json not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //start dealing with intro
								this.parseScenarios(2);
							break;
						case 2: //intro file absent
							game.globals.scenarioIntros[index] = null;
							console.log("scenario"+index+"_intro.txt not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //start dealing with outro
								this.parseScenarios(3);
							break;
						case 3: //outro file absent
							game.globals.scenarioOutros[index] = null;
							console.log("scenario"+index+"_outro.txt not defined.");
							this.Reader = new AjaxFileReader();
							index++;
							if(index < this.NScenarios)
								this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), null);
							else //proceed to start menu
								game.state.start('startMenu');
							break;
					}
					/*else this.reportErrorLoading("Error while loading " + filePrefix +index + fileSuffix + " !");
					return;*/
                }
            }
        };
		this.Reader = new AjaxFileReader();
		this.Reader.readTextFile(prefix + index + suffix, this.callbackScenarios.bind(this), this.reportErrorLoading.bind(this, "Error while loading " + prefix + index + suffix + " !"));
	},
	
	/**
	Load other assets, specified by the scenario NPC files or scenario cyber files
	At completion, the process flow will go to the startMenu state
	*/
	/*loadDynamicAssets: function()
	{///should I load always preset assets, allowing json files to pick assets from them, instead of picking assets anywhere in the filepath?
		var s,n;

		for(s in game.globals.scenarioNPCs)
			if(game.globals.scenarioNPCs[s])	//some scenarioNPCs could be null: NPC file not defined
				for(n in game.globals.scenarioNPCs[s].NPCs )
				{
					//NPC sprite
					game.load.image("npcSprite"+s+"_"+n, game.globals.scenarioNPCs[s].NPCs[n].sprite);
					//NPC portrait
					game.load.image("npcPortrait"+s+"_"+n, game.globals.scenarioNPCs[s].NPCs[n].portrait);
				}
		for(s in game.globals.scenarioCybers)
		{
			//portraits
			game.load.image("cyberPortraits"+s+"_"+0, game.globals.scenarioCybers[s].portrait[0]);
			game.load.image("cyberPortraits"+s+"_"+1, game.globals.scenarioCybers[s].portrait[1]);
		}
		
		game.state.start('startMenu');
	},*/
	
	/**
     * Launches the error state if a fatal error has occurred during game loading.
     * @param {string} message - String containing the error message
     */
    reportErrorLoading: function (message) {
        if (!this.errorMessage)
		{
            this.errorMessage = message;
            game.state.start('error', true, false, this.errorMessage);
        }
    }
};
module.exports = load;
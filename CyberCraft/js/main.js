var scaling = require("./states/scaling.js");
var load = require("./states/load.js");
var startMenu = require("./states/startMenu.js");
var intro = require("./states/intro.js");
var selection = require("./states/selection.js");
var hall = require("./states/hall.js");
var cyberspace = require("./states/cyberspace.js");
var review = require("./states/review.js");
var error = require("./states/error.js");
//var tryMenu = require("./states/tryMenu.js");	///

game = new Phaser.Game(1000, 600, Phaser.AUTO, 'game');
//Phaser.CANVAS was said to be better for mobile

game.globals ={		//global data loaded from json and txt files
	assetsTable: null,
	commonActs: null,
	scenarioActs: [],
	scenarioCybers: [],
	scenarioNPCs: [],
	scenarioIntros: [],
	scenarioOutros: [],
	tutorialNPCs: null,
	tutorialIntros: [],
	tutorialOutros: [],
	tutorialCybers: [],
	credits: null,
	personalNotes: null,
	audioManager: null,
	memory: null,
	records: [],
	playerName: null
};

game.state.add("scaling", scaling);
game.state.add("load", load);
game.state.add("startMenu", startMenu);
game.state.add("intro", intro);
game.state.add("selection", selection);
game.state.add("hall", hall);
game.state.add("cyberspace", cyberspace);
game.state.add("review", review);
game.state.add("error", error);

game.state.start("scaling");
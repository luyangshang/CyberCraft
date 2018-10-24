/**
The first state where the game is scaled to fix the screen size
In preparation for load state, load screen assets is also loaded here, 
and extraAssets.json is read and parsed here
*/

var scaling = {
	init: function()
	{
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;	//or Phaser.ScaleManager.RESIZE
		game.scale.minWidth = 500;
		game.scale.minHeight = 300;			
		game.scale.maxWidth = 1000;
		game.scale.maxHeight = 600;
		game.scale.pageAlignHorizontally = true;
		game.scale.pageAlignVertically = false;
		game.scale.forceLandscape = true;
		//or game.scale.forceOrientation(true,false);
		/*if(!game.device.desktop)
		{
			window.game.scale.hasResized.add(window.game.gameResized, this);
			window.game.scale.enterIncorrectOrientation.add(window.game.scale.enterIncorrectOrientation, this);
            window.game.scale.leaveIncorrectOrientation.add(window.game.scale.leaveIncorrectOrientation, this);
            window.game.scale.setScreenSize(true);
		}*/		
		var ow = parseInt(window.game.canvas.style.width,10);
        var oh = parseInt(window.game.canvas.style.height,10);
        var r = Math.max(window.innerWidth/ow,window.innerHeight/oh);
        var nw = ow*r;
        var nh = oh*r;
        window.game.canvas.style.width = nw+"px";
        window.game.canvas.style.height= nh+"px";
        window.game.canvas.style.marginLeft = (window.innerWidth/2 - nw/2)+"px";
        window.game.canvas.style.marginTop = (window.innerHeight/2 - nh/2)+"px";
        document.getElementById("game").style.width = window.innerWidth+"px";
        document.getElementById("game").style.height = window.innerHeight-1+"px";//The css for body includes 1px top margin, I believe this is the cause for this -1
        document.getElementById("game").style.overflow = "hidden";
	},
	/**
	In order to display loading animation, load screen assets need to be loaded before loading really starts. Therefore, here, in the preload in a state before load state.
	*/
	preload: function()
	{
		//read assetsTable.json, which contains a table of all assets and its corresponding key
		var loader = game.load.json('assetsTable', 'scenarios/assetsTable.json');

		//error state asset
		game.load.spritesheet('reloadButton', 'assets/images/reload_button.png', 208, 58);
		
		//load progress bar for load state
		game.load.image("progressBarBG", "assets/images/progress_bar_bg.png");		//empty progress bar
		game.load.image("progressBarFG", "assets/images/progress_bar_fg.png");		//full progress bar
		
		game.physics.startSystem(Phaser.Physics.ARCADE);
	},
	
	create: function()
	{
		//set the global variable ready for loading at load state
		game.globals.assetsTable = game.cache.getJSON("assetsTable");
		if(game.globals.assetsTable == null)
		{
			var errorMessage = "Cannot find scenarios/assetsTable.json or the file is corrupted!";
			game.state.start('error', true, false, errorMessage);
		}
		else game.state.start("load");
	}
};
module.exports = scaling;
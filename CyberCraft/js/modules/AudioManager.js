/**
@classdesc A class managing all the sounds
*/
function AudioManager()
{
	//constants
	this.volumeH = 0.3;
	this.volumeL = 0.1;
	this.NCyberBGMs = 4;
	
	this.typing = game.add.audio("typing");
	this.accessGrantedSound = game.add.audio("accessGranted");
	this.accessDeniedSound = game.add.audio("accessDenied");
	this.noticeSound = game.add.audio("notice");
	this.shootSound = game.add.audio("blaster");
	this.explodeSound = game.add.audio("explosion");
	this.defendSound = game.add.audio("sword");
	this.shieldBreakSound = game.add.audio("shieldBreak");
	this.stickySound = game.add.audio("sticky");
	this.victorySound = game.add.audio("acceptSound");
	this.defeatSound = game.add.audio("errorSound");

	this.mainBGM = game.add.audio("mainBGM");
	this.intruderBGM = game.add.audio("intruderBGM");
	this.defenderBGM = game.add.audio("defenderBGM");
	this.cyberBGM = [];
	for(var i=0; i<this.NCyberBGMs; i++)
	{
		this.cyberBGM[i] = game.add.audio("cyberBGM"+i);
		this.cyberBGM[i].onStop.add(this.cyberMusic, this);
	}
	this.outroBGM = game.add.audio("outroBGM");
	//the pointer to the BGM currently been played
	this.BGM = "";
}
/* -------------------- sound effects start -----------------------*/
/**
Start the typing sound
*/
AudioManager.prototype.typingOn = function()
{
	this.typing.play("", 0, this.volumH, true);
};
/**
Stop the typing sound
*/
AudioManager.prototype.typingOff = function()
{
	this.typing.stop();
};

/**
Crate the "Access Granted" sound effect
*/
AudioManager.prototype.accessGranted = function()
{
	this.accessGrantedSound.play();
};
/**
Crate the "Access Denied" sound effect
*/
AudioManager.prototype.accessDenied = function()
{
	this.accessDeniedSound.play();
};
/**
Crate the sound at the start of the cyber battle, based on the cyber file
@param {string} soundKey - the key for the sound specified in the cyber file
*/
AudioManager.prototype.startingSound = function(soundKey)
{
	var sound = game.add.audio(soundKey);
	if(sound)
		sound.play();
};
/**
Crate the a sound effect for a kind of something new
*/
AudioManager.prototype.notice = function()
{
	this.noticeSound.play();
};
/**
Crate the shooting sound effect
*/
AudioManager.prototype.shoot = function()
{
	this.shootSound.play();
};
/**
Crate the explosion sound effect
*/
AudioManager.prototype.explode = function()
{
	this.explodeSound.play();
};
/**
Crate the defence sound effect
*/
AudioManager.prototype.defend = function()
{
	this.defendSound.play();
	
};
/**
Crate the defence break sound effect
*/
AudioManager.prototype.defenceBreak = function()
{
	this.shieldBreakSound.play();
	
};
/**
Crate the sticky sound effect
*/
AudioManager.prototype.sticky = function()
{
	this.stickySound.play();
	
};
/**
Crate the victory sound effect
*/
AudioManager.prototype.victory = function()
{
	this.victorySound.play();
	
};
/**
Crate the defeat sound effect
*/
AudioManager.prototype.defeat = function()
{
	this.defeatSound.play();
	
};
/* -------------------- sound effects end -----------------------*/

/* ------------------------ BGMs start ---------------------------*/
/**
Play the main menu BGM
*/
AudioManager.prototype.mainMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.mainBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the intruder's hall BGM
*/
AudioManager.prototype.intruderHallMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.intruderBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the defender's hall BGM
*/
AudioManager.prototype.defenderHallMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.defenderBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/**
Play the the BGMs randomly for cyberspace
*/
AudioManager.prototype.cyberMusic = function()
{
	if(this.BGM)	//the BGM of hall may not have been stoped yet
		this.BGM.pause();
	//play a random one among the BGMs for cyberspace
	//[0, NCyberBGMs)
	var integer = Math.floor(Math.random()*this.NCyberBGMs);
	this.BGM = this.cyberBGM[integer];
	this.BGM.play("", 0, this.volumeH);
};
/**
Play the the review's BGM
*/
AudioManager.prototype.outroMusic = function()
{
	if(this.BGM)
		this.BGM.pause();
	this.BGM = this.outroBGM;
	this.BGM.play("", 0, this.volumeH, true);
};
/* ------------------------ BGMs ends ---------------------------*/

/**
Set the volume to low or high
@param {boolean} low - true: to low volume, false: to high volume
*/
AudioManager.prototype.lowVolume = function(low)
{
	if(low)
		this.BGM.volume = this.volumeL;
	else this.BGM.volume = this.volumeH;
};
module.exports = AudioManager;
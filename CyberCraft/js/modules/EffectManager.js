/**
@classdesc A class managing the animations
@param {Phaser.Group} fatherGroup - the group (layer) to create effect in
@param {int} playerX - the x coordinates of the sprite of the player
@param {int} playerY - the y coordinates of the sprite of the player
@param {int} rivalX - the x coordinates of the sprite of the rival
@param {int} rivalY - the y coordinates of the sprite of the rival
@param {int} logX - the x coordinates of the the action log button
@param {int} logY - the y coordinates of the the action log button
*/
function EffectManager(fatherGroup, X, Y, logX, logY, roundX, roundY)
{
	//constants
	this.styleSpout = { font: "28px Courier New, monospace", fontWeight: "bold", fill: "#FF5011"};
	this.styleSpark = { font: "31px Courier New, monospace", fontWeight: "bold", fill: "#11DD11", align:"center"};
	this.styleDamage = { font: "33px Courier New, monospace", fontWeight: "bold", fill: "#FF0000"};
	
	this.fatherGroup = fatherGroup;
	this.X = X;
	this.Y = Y;
	this.logX = logX;
	this.logY = logY;
	this.roundX = roundX;
	this.roundY = roundY;
	
	/*to display adjacent words with offset: toggle it on and off*/
	this.offset = false;
	
	//to manage the happy faces
	this.happyGroup = game.add.group();
	this.fatherGroup.add(this.happyGroup);
	//to manage the unhappy faces
	this.unhappyGroup = game.add.group();
	this.fatherGroup.add(this.unhappyGroup);
}

/**
Create the happy or unhappy animation on the defender's server. One happy face for each served client and one unhappy face for unserved one.
@param {boolean} happy - true: create happy faces, false, create unhappy faces
@param {int} num - the number of happy or unhappy faces to display
*/
EffectManager.prototype.faces = function(happy, num)
{
	if(num == 0)
		return;
	if(happy)
	{
		var faceGroup = this.happyGroup;
		var spriteKey = "happy";
		var X = this.X[1];
		var Y = this.Y[1];
	}
	else
	{	
		var faceGroup = this.unhappyGroup;
		var spriteKey = "unhappy";
		var X = this.X[1];
		var Y = this.Y[1]+40;
	}
	//adjust to the center so that it will not be out of window
	if(X<500)
	{
		X += 65;
		Y -= 30;
	}
	else
	{		
		X -= 65;
		Y += 30;
	}
	faceGroup.removeAll(true);
	for(var i=0; i < num; i++)
		game.add.image(X+i*40, Y, spriteKey, 0, faceGroup);
	faceGroup.setAll("anchor.setTo", "anchor", 0.5);
	var faceTween = game.add.tween(faceGroup).to({x: "-20", y: "-40"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	faceTween.onComplete.add(function(){faceGroup.removeAll(true); faceGroup.x+=20; faceGroup.y+=40;}, this, 0);
};

/**
Create a text on the player or the rival, and tween it towards the action log
@param {string} texts - the word to create
@param {boolean} role - create the text at the whose position? 0: intruder, 1: defender
@param {int} time - the tweening time
*/
EffectManager.prototype.createWord = function(texts, role, time)
{
	//a text spout of when an act is applyed
	var spoutSprite = game.add.text(0, 0, texts, this.styleSpout, this.fatherGroup);
	spoutSprite.anchor.setTo(0.5);
	spoutSprite.x = this.X[role];
	spoutSprite.y = this.Y[role];
	this.offset = !this.offset;
	//create adjacent sprites with different y, avoiding word overlaping
	if(this.offset)	spoutSprite.y += 30;
	var spoutTween = game.add.tween(spoutSprite).to({x: this.logX, y: this.logY}, time, Phaser.Easing.Linear.None, true, 0, 0, false);
	spoutTween.onComplete.add(function(){spoutSprite.destroy();}, this, 0);
};

/**
Create a indicator that a round is starting
@param {int} round - the round that is starting
@param {int} role - whose turn is the starting round. 0: intruder, 1: defender
@param {int} time - the time for the enlarging animation as well as the shrunking animation. The time of the whole animation will be double.
*/
EffectManager.prototype.createRoundSpark = function(round, role, time)
{
	var spark = game.add.text(500, 300, round, this.styleSpark, this.fatherGroup);
	spark.anchor.setTo(0.5);
	var enlargeTween = game.add.tween(spark.scale).to({x: 4, y: 4}, time, Phaser.Easing.Sinusoidal.EaseOut, true, 0, 0, false);
	enlargeTween.onComplete.add(function(){
		var moveTween = game.add.tween(spark).to({x: this.X[role], y: this.Y[role]}, time, Phaser.Easing.Linear.None, true, 0, 0, false);
		var shrunkTween = game.add.tween(spark.scale).to({x: 1, y: 1}, time, Phaser.Easing.Sinusoidal.EaseIn, true, 0, 0, false);
		moveTween.onComplete.add(function(){spark.destroy();}, this, 0);
		}, this, 0);
};

/**
Create the animation for applying each act
@param {int} type - the animation to create, based on the character and the effect. 0: defender defends, 1: intruder strengthens, 2: intruder attack defended, 3: intruder unlucky, 4:intruder successful
@param {int} damage - (type == 5 only) the damage dealt to the assets
*/
EffectManager.prototype.createActEffect = function(type)
{
	var movingTween;
	switch(type)
	{
		case 0: //defender defends
			this.shield(null, null, 1);
			break;
		case 1: //intruder strengthens
			this.bubble(null, null, 0);
			break;
		case 2: //intruder attack defended
			movingTween = this.bullet();
			movingTween.onComplete.add(this.shield, this, 0);
			break;
		case 3: //intruder unlucky
				movingTween = this.bullet();
				movingTween.onComplete.add(this.miss, this, 0);
			break;
		case 4: //intruder break defence
				movingTween = this.bullet();
				movingTween.onComplete.add(this.shieldBreak, this, 0);
			break;
		case 5: //intruder enforce buff
				movingTween = this.bullet();
				movingTween.onComplete.add(this.sticky, this, 0);
			break;
		case 6: //intruder compromise assets 
				movingTween = this.bullet();
				movingTween.onComplete.add(this.explosion, this, 0);
				var damage = arguments[1];
				if(damage)
					movingTween.onComplete.add(this.damaged, this, 0, damage);
			break;
	}
}
/**
To display the bubble pop up animation. Used at intruder's successful strenthen
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} role - the role of the character on who the shield should pop up
*/
EffectManager.prototype.bubble = function(sprite, pointer, role)
{	
	var still = game.add.image(this.X[role], this.Y[role], "bubble", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	still.scale.setTo(0.01);
	var stillTween = game.add.tween(still.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);

	game.globals.audioManager.defend();
};
/**
To display the shield pop up animation. Used at the defender's successful strenthen of his defence
*/
EffectManager.prototype.shield = function()
{	
	var still = game.add.image(this.X[1], this.Y[1], "shield", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	still.scale.setTo(0.01);
	var stillTween = game.add.tween(still.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);

	game.globals.audioManager.defend();
};
/**
To display the shield break animation. Used at the intruder's successful breach of the defence
*/
EffectManager.prototype.shieldBreak = function()
{	
	var leftPiece = game.add.image(this.X[1], this.Y[1], "shieldLeft", 0, this.fatherGroup);
	var rightPiece = game.add.image(this.X[1], this.Y[1], "shieldRight", 0, this.fatherGroup);
	leftPiece.anchor.setTo(1, 0.5);
	rightPiece.anchor.setTo(0, 0.5);
	var leftTween1 = game.add.tween(leftPiece).to({x: '-50', y: '+30'}, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
	var rightTween1 = game.add.tween(rightPiece).to({x: '+50', y: '+30'}, 1000, Phaser.Easing.Linear.None, true, 0, 0, false);
	var leftRotation = game.add.tween(leftPiece).to({rotation: '-0.5'}, 1200, Phaser.Easing.Linear.None, true, 0, 0, false);
	var rightRotation = game.add.tween(rightPiece).to({rotation: '+0.5'}, 1200, Phaser.Easing.Linear.None, true, 0, 0, false);
	leftTween1.onComplete.add(function(){leftPiece.destroy();rightPiece.destroy();}, this, 0);

	game.globals.audioManager.defenceBreak();
};
/**
To display the sticky animation. Used at the intruder's successful enforce of negative buffs
*/
EffectManager.prototype.sticky = function()
{
	var still = game.add.image(this.X[1], this.Y[1], "splatter", 0, this.fatherGroup);
	still.anchor.setTo(0.5);
	var stillTween = game.add.tween(still).to({width: 75, height: 75}, 1000, "Elastic.easeOut", true, 0, 0, false);
	stillTween.onComplete.add(function(){still.destroy();}, this, 0);
	
	game.globals.audioManager.sticky();
};
EffectManager.prototype.bullet = function()
{
	var moving = game.add.image(this.X[0], this.Y[0], "bullet", 0, this.fatherGroup);
	moving.anchor.setTo(0.5);
	moving.rotation = Math.atan((this.Y[1]-this.Y[0])/(this.X[1]-this.X[0]));
	var movingTween = game.add.tween(moving).to({x: this.X[1], y: this.Y[1]}, 500, Phaser.Easing.Linear.None, true, 0, 0, false);
	movingTween.onComplete.add(function(){moving.destroy();}, this, 0);
	game.globals.audioManager.shoot();
	
	return movingTween;
};
EffectManager.prototype.miss = function()
{
	var spoutSprite = game.add.text(this.X[1], this.Y[1], "miss", this.styleSpout, this.fatherGroup);
	spoutSprite.anchor.setTo(0.5);
	var spoutTween = game.add.tween(spoutSprite).to({x: "-10", y: "-30"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	spoutTween.onComplete.add(function(){spoutSprite.destroy();}, this, 0);
};
EffectManager.prototype.explosion = function()
{	
	var explosionSprite = game.add.image(this.X[1], this.Y[1], "explosion", 0, this.fatherGroup);
	explosionSprite.anchor.setTo(0.5);
	//explosionSprite.smoothed = false;
	var explosionAnimation = explosionSprite.animations.add("explode");
	explosionAnimation.play(15, false, true);	//explosionAnimation.onComplete.add(function(){explosionSprite.destroy();}, this);
	
	game.globals.audioManager.explode();
};
/**
Create a indicator for the damage dealt to the assets
@param {Phaser.Sprite} sprite - the sprite that invokes this
@param {Phaser.Pointer} pointer - the mouse pointer object
@param {int} damage - the damage dealt
*/
EffectManager.prototype.damaged = function(sprite, pointer, damage)
{
	var damageText = "-" + damage;
	var damageSprite = game.add.text(this.X[1], this.Y[1], damageText, this.styleDamage, this.fatherGroup);
	var damageTween = game.add.tween(damageSprite).to({x: "-20", y: "-50"}, 2500, "Elastic.easeOut", true, 0, 0, false);
	damageTween.onComplete.add(function(){damageSprite.destroy();}, this, 0);
};

/**
The animation when the player wins or loses
@param {boolean} win - true: player wins, false: player loses
*/
EffectManager.prototype.lastAnimation = function(win)
{
	if(win)
	{
		var spriteKey = "VICTORY";
		var audioFun = game.globals.audioManager.victory;
	}
	else
	{
		var spriteKey = "DEFEAT";
		var audioFun = game.globals.audioManager.defeat;
	}
	var gameoverSprite = game.add.image(game.world.centerX, game.world.centerY, spriteKey, 0);
	gameoverSprite.anchor.setTo(0.5);
	gameoverSprite.scale.setTo(0.01);
	var gameoverTween = game.add.tween(gameoverSprite.scale).to({x: 1, y: 1}, 1500, "Elastic.easeOut", true, 0, 0, false);
	
	audioFun.call(game.globals.audioManager);
};
module.exports = EffectManager;
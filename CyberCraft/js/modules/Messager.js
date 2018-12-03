var HintBox = require("../modules/HintBox");
/**
@classdesc A class managing the popup messages
@param {Phaser.Group} messageGroup - the group in which the messages are going to be displayed
@param {HintBox} hintBox - the reference to hintBox of the context
@constructor
*/
function Messager(messageGroup, hintBox)
{
	this.messageGroup = messageGroup;
	this.hintBox = hintBox;
	messageGroup.x = game.world.centerX;
	messageGroup.y = game.world.centerY;
	messageGroup.pivot = new Phaser.Point(game.world.centerX, game.world.centerY);
	//this.context = context;
	//constants
	this.style = { font: "27px Courier New, monospace", fontWeight: "bold", fill: "#FF5011", align:"center", wordWrap: true, wordWrapWidth: 600};
	this.styleLong = { font: "20px Courier New, monospace", fontWeight: "bold", fill: "#FF5011", align:"center", wordWrap: true, wordWrapWidth: 600};
	
	var pauseShadow = game.add.sprite(game.world.centerX, game.world.centerY, "black", 0, messageGroup);
	pauseShadow.anchor.setTo(0.5);
	pauseShadow.alpha = 0;
	pauseShadow.inputEnabled = true;
	
	//message frame
	var messageFrame = game.add.image(game.world.centerX, game.world.centerY, "dialogueBox", 0, messageGroup);
	messageFrame.anchor.setTo(0.5);
	//message text
	this.messageText = game.add.text(game.world.centerX, game.world.centerY  - 35, "", this.style, this.messageGroup);
	this.messageText.anchor.setTo(0.5);
	//confirmButton
	var confirmButton = game.add.button(game.world.centerX, game.world.centerY + 80, "gotItButton", this.exit, this, 0, 0, 1, 0, this.messageGroup);
	confirmButton.anchor.setTo(0.5);
	this.hintBox.setHintBox(confirmButton, "(Enter or SpaceBar)");
	messageGroup.visible = false;
	
	this.messageQueue = [];	//a queue for messages to be displayed
	//this.callbackQueue = [];	//a queue for the callback function of prompt messages. for alert messages, the values are null
	//this.lastCallback = false;	//null if the last message is an alert message
	//this.data;					//the data inputted by player
	
	//shortcut key for closing message - enter and space
	var enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
	enterKey.onDown.add(this.exit, this);
	var spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
	spaceKey.onDown.add(this.exit, this);
	game.input.keyboard.addKeyCapture(Phaser.Keyboard.SPACEBAR);
}

/**
Create message that for the player. Similar to alert or prompt.
The message is immediately displayed if there is no other messages;
it's cached in queue if there are other messages.
@param {string} texts - the message to be displayed
@param {function} callback - callback function to be called when the player has entered data. If the message is alert message instead of prompt, this value is null. N.B. the context of the callback function is already given at the constructor
*/
Messager.prototype.createMessage = function(texts/*, callback*/)
{
	this.messageQueue.push(texts);
	//this.callbackQueue.push(callback);
	if(this.messageGroup.visible == false)
		this.display();
};
/**
Private function.
Extract one message from the queue and display it
*/
Messager.prototype.display = function()
{
	var message = this.messageQueue.shift();
	//var callback = this.callbackQueue.shift();
	//this.lastCallback = callback;
	this.messageText.setText(message);
	if(message.length<60)	//auto adjust text size depending on text length
		this.messageText.setStyle(this.style);
	else this.messageText.setStyle(this.styleLong);
	this.messageGroup.visible = true;
	//popout animation
	this.messageGroup.scale.setTo(0.01);
	var tween = game.add.tween(this.messageGroup.scale).to({x: 1, y: 1}, 1000, "Elastic.easeOut", true, 0, 0, false);
};

/**
Private function.
Close the current message. May start a pending message
*/
Messager.prototype.exit = function()
{
	/*if(this.lastCallback)	//prompt message only
		this.lastCallback(this.context, this.data);*/
	this.messageGroup.visible = false;
	this.hintBox.hide();
	//go to display the next message
	if(this.messageQueue.length)
		this.display();
};

module.exports = Messager;
/** 
A class managing a chain of buffs on the player or on the rival.
buff functionalities are done by other classes.
*/
var buff = require("./buff");

function buffManager()
{
	this.buffs = [];	//an array of buffs
}

buffManager.prototype.getBuffs()
{
	return buffs;
}

/**
add new buff if not yet exisit; overwrite buff length is the new buff lasts longer
*/
buffManager.prototype.addBuff(buffName, length)
{
	//check existence
	for(tempBuff in buffs)
		if(tempBuff.getName() == buffName)
		{
			temp.renewBuff(length);	//the called function manages length comparision
			return;
		}
	//add non-existing buff
	buffs.push(new Buff(buffName, length));
}

/**
remove the specific buff
*/
buffManager.prototype.removeBuff(buffName)
{
	length = buffs.length;
	for(i=0; i < length ;i++)
		if(buffs[i].getName() == buffName)
		{	//move the elements in the array after the one to be deleted
			length--;
			for(; i < length ; i++)
				buffs[i] = buff[i+1];
			buffs.pop();
			return;
		}	
}


/**
reduce the buff lengths at the end of a round
manages buff removal
*/
buffManager.prototype.reduce()
{
	length = this.buffs.length;
	for(i=0; i<length ; i++)
		buffs[i].reduce();
	//removal all buffs with length==0
	for(i=0; i<length; i++)
		if(buffs[i].length ==0)
		{
			for(j=i+1; j<length; j++)	//move elements in the array
				if(buffs[j].length!=0)
				{
					buffs[i] = buffs[j];
					i++;
				}
			for(; i<length; i++)	//remove the tail of the array
				buffs.pop();
		}
}

module.exports = buffManager;
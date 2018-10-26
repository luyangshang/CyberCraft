/** A class managing a single buff: it's name and length. 
buff functionalities are done by other classes.
*/

function buff(buffName, length)
{
	this.name = buffName;
	this.length = length;	//length is the rounds remaining
}

buff.prototype.getName()
{
	return name;
}

/**
renew buff, if the new buff lasts longer
N.B. length ==-1 means infinite length
*/
buff.prototype.renewBuff(length)
{
	if(this.length == -1)
		return;
	if(this.length < length || length ==-1)
		this.length = length;
}

/**
reduce the buff length at the end of a round
does not manage buff removal
*/
buff.prototpye.reduce()
{
	if(buff.length!=-1)	//finite buff
		this.length--;
}

module.exports = buff;
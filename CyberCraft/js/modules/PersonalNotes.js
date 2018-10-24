/**
@classdesc A class storing the personal notes. created at load state in game.globals
@param {Object} parsedNotes - the personal notes object read from the file after json parsing
@constructor
*/
function PersonalNotes(parsedNotes)
{
	this.noteNames = [];
	this.noteDescs = [];
	this.sees = [];
	this.urls = [];
	
	var i, j, id;
	
	//"personal notes" entry
	this.noteNames.push("Personal Notes");
	if(parsedNotes.desc == undefined)
		parsedNotes.desc = "";
	this.noteDescs.push(parsedNotes.desc);


	if(parsedNotes.acts != undefined)
	{
		//"Offensive acts" entry (if present)
		if(parsedNotes.acts.offDesc != undefined)
		{
			this.noteNames.push("Offensive acts");
			this.noteDescs.push(parsedNotes.acts.offDesc);
		}
		
		if(parsedNotes.acts.offensive)
			//add those offensive acts
			for(i=0; i< parsedNotes.acts.offensive.length; i++)	
				if(parsedNotes.acts.offensive[i].name != undefined)
				{
					id = this.noteNames.push(parsedNotes.acts.offensive[i].name);
					this.noteDescs.push(parsedNotes.acts.offensive[i].desc);
					//internal links
					if(parsedNotes.acts.offensive[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.acts.offensive[i].sees)
							this.sees[id-1].push(parsedNotes.acts.offensive[i].sees[j]);
					}
					//if url1 or url2 not defined in the json file, they will just be undefined in the class.
					var urls = [parsedNotes.acts.offensive[i].url1, parsedNotes.acts.offensive[i].url2];
					this.urls[id-1]= urls;
				}
		
		//"Defensive acts" entry (if present)
		if(parsedNotes.acts.defDesc != undefined)
		{
			this.noteNames.push("Defensive acts");
			this.noteDescs.push(parsedNotes.acts.defDesc);
		}
		if(parsedNotes.acts.defensive)
			//add those defensive acts
			for(i=0; i< parsedNotes.acts.defensive.length; i++)	
				if(parsedNotes.acts.defensive[i].name != undefined)
				{
					id = this.noteNames.push(parsedNotes.acts.defensive[i].name);
					this.noteDescs.push(parsedNotes.acts.defensive[i].desc);
					//internal links
					if(parsedNotes.acts.defensive[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.acts.defensive[i].sees)
							this.sees[id-1].push(parsedNotes.acts.defensive[i].sees[j]);
					}
					//if url1 or url2 not defined in the json file, they will jsut be undefined in the class.
					var urls = [parsedNotes.acts.defensive[i].url1, parsedNotes.acts.defensive[i].url2];
					this.urls[id-1]= urls;
				}
	}
	if(parsedNotes.buffs != undefined)
	{
		//"Buffs" entry (if present)
		if(parsedNotes.buffs.buffDesc != undefined)
		{
			this.noteNames.push("Buffs");
			this.noteDescs.push(parsedNotes.buffs.buffDesc);
		}
		//add buffs themselves
		for(i=0; i< parsedNotes.buffs.buffs.length; i++)	
			if(parsedNotes.buffs.buffs[i].name != undefined)
			{
				id = this.noteNames.push(parsedNotes.buffs.buffs[i].name);
				this.noteDescs.push(parsedNotes.buffs.buffs[i].desc);
				//internal links
					if(parsedNotes.buffs.buffs[i].sees)
					{
						this.sees[id-1] = [];
						for(j in parsedNotes.buffs.buffs[i].sees)
							this.sees[id-1].push(parsedNotes.buffs.buffs[i].sees[j]);
					}
				//if url1 or url2 not defined in the json file, they will jsut be undefined in the class.
				var urls = [parsedNotes.buffs.buffs[i].url1, parsedNotes.buffs.buffs[i].url2];
				this.urls[id-1]= urls;
			}
	}
}

/**
get the number of entries in the personal notes
*/
PersonalNotes.prototype.getSize = function()
{
	return this.noteNames.length;
};

/**
retrieve all the note name
@returns {Array} - name array of the notes
*/
PersonalNotes.prototype.getNames = function()
{
	return this.noteNames;
};

/**
Return the entry's description
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getDesc = function(id)
{
	/*for(id=0; id< this.noteNames.length; id++)
		if(this.noteNames[id] == name)
			return this.noteDescs[id];
	return -1;*/
	return this.noteDescs[id];
};

/**
Return the entry's internal links
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getInternalLinks = function(id)
{
	return this.sees[id];
};

/**
Return the entry's two externalLink
@param {int} id - the id of the entry (usually security term)
*/
PersonalNotes.prototype.getUrls = function(id)
{
	return this.urls[id];
};
module.exports = PersonalNotes;
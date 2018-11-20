/* global alertify */

/**
 * Module that provides data saving functionality. It uses the Web Storage APIs to save data locally on the client.
 * Save data includes completed level along with full statistics and logs.
 * @module
 * @name Load and Save Data
 */
module.exports = {
    /**
     * Loads saved data, if present, and saves them in a global variable.
     */
    loadSaveData: function() {
        if (this.checkCompatibility()) {
            var records = JSON.parse(localStorage.getItem('records'));
            if (records) {
                game.globals.records = records;
            }
        }
    },

    /**
     * Saves data in the local storage if no data for the current level exist or if the current score is higher than the saved one.
     * @param {int} index - The index of the scenario that is currently being saved
		@param {Record}	
     */
    saveSaveData: function(index, record) {
        //Create records if not existent or overwrite it if saved player's score is lower than the new one
        if (!game.globals.records[index] || game.globals.records[index].score < record.score)
		{
			game.globals.records[index] = {logs: record.logs,
											role: record.role,
											endingRound: record.endingRound,
											assetsCompromised: record.assetsCompromised,
											score: record.score
											};
            //Saves the data to the Web Storage if it is supported by the current browser
            if (this.checkCompatibility()) {
                localStorage.setItem('records', JSON.stringify(game.globals.records));
            }
        }
    },

    /**
     * Removes saved data to allow a clean restart.
     * @returns {boolean} True if data have been removed, false otherwise.
     */
    removeSaveData: function() {
        if(game.globals.records.length !== 0) {
			game.globals.records = [];
            delete game.globals.playerName;
            if (this.checkCompatibility()) {
                localStorage.removeItem('records');
                localStorage.removeItem('playerName');
				localStorage.removeItem('learningData');
            }
            return true;
        }
        else {
            return false;
        }
    },

    /**
     * Checks if Web Storage APIs are supported by the player's browser.
     * @returns {boolean} True if Web Storage is supported, false otherwise.
     */
    checkCompatibility: function() {
        var mod = 'checkStorage';
        try {
            localStorage.setItem(mod, mod);
            localStorage.removeItem(mod);
            return true;
        } catch(e) {
            console.log("Web Storage APIs not supported!!!");
            return false;
        }
    },

    /**
     * Asks the player for his/her username if it has not yet been done. If the name is acquired then the game can
     * proceed to load. Otherwise the game enters an error screen, for example the browser does not support the Web
     * Storage APIs.
     * @param {Phaser.Signal} nameSignal - Signals whether has been possible to acquire the name or not
     */
    promptForName: function (nameSignal)
	{
        if (!this.checkCompatibility()) {
            nameSignal.dispatch(false);
            return;
        }
        else if (localStorage.getItem("playerName")) { //Name has already been inserted, do not ask again
            game.globals.playerName = localStorage.getItem("playerName");
            nameSignal.dispatch(true);
            return;
        }
        // prompt dialog
        var context = this;
        var promptDialogue = alertify.prompt("Insert your name as NAME.SURNAME.Any4DigitNumber   (e.g. MARIO.ROSSI.1234)", function (e, str) 
		{	// str is the input text
            if (e) {
                // user clicked "ok"
                if (/^([a-zA-Z]{2,40}\.[a-zA-Z]{2,40}\.[0-9]{4})$/.test(str)) { //Correct name
                    game.globals.playerName = str;
                    localStorage.setItem("playerName", str);
					//alertify.success("Name saved!");
                    alertify.alert("Name saved!");
                    nameSignal.dispatch(true);
                }
                else { //Wrong name
                    alertify.alert("Name not valid! Please input your name");
					//alertify.success("Name not valid! Please input your name");
                    context.promptForName(nameSignal);
                }
            }
			else { //Name not inserted
				//alertify.error("You must insert a name!");
                alertify.alert("You must insert a name!");
                context.promptForName(nameSignal);
            }
        }, "");
    }
};

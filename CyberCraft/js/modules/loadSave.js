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
            var savedata = JSON.parse(localStorage.getItem('savedata'));
            if (savedata) {
                game.globals.savedata = savedata;
            }
        }
    },

    /**
     * Saves data in the local storage if no data for the current level exist or if the current score is higher than the saved one.
     * @param {int} index - The index of the scenario that is currently being saved
     * @param {Object} stats - Object containing notices replies statistics and level score
     * @param {int} shieldsNumber - Shields earned in the level
     * @param {Array} logs - List of the log entries representing the player replies to all the notices
     */
    saveSaveData: function(index, score, logs) {
        //Create savedata if not existent or overwrite it if saved score is lower than the new one
        if (!game.globals.savedata[index] || game.globals.savedata[index].score < score) 
		{
			game.globals.savedata[index] = {};
            game.globals.savedata[index].score = score;
            game.globals.savedata[index].logs = logs;

            //Saves the data to the Web Storage if it is supported by the current browser
            if (this.checkCompatibility()) {
                localStorage.setItem('savedata', JSON.stringify(game.globals.savedata));
            }
        }
    },

    /**
     * Removes saved data to allow a clean restart.
     * @returns {boolean} True if data have been removed, false otherwise.
     */
    removeSaveData: function() {
        if(game.globals.savedata.length !== 0) {
			game.globals.savedata = [];
            delete game.globals.playerName;
            if (this.checkCompatibility()) {
                localStorage.removeItem('savedata');
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
        alertify.prompt("Insert your name as NAME.SURNAME.Any4DigitNumber   (e.g. MARIO.ROSSI.1234)", function (e, str) 
		{	// str is the input text
            if (e) {
                // user clicked "ok"
                if (/^([a-zA-Z]{2,40}\.[a-zA-Z]{2,40}\.[0-9]{4})$/.test(str)) { //Correct name
                    game.globals.playerName = str;
                    localStorage.setItem("playerName", str);
                    alertify.alert("Name saved!");
                    nameSignal.dispatch(true);
                }
                else { //Wrong name
                    alertify.alert("Name not valid! Please input your name");
                    context.promptForName(nameSignal);
                }
            }
			else { //Name not inserted
                alertify.alert("You must insert a name!");
                context.promptForName(nameSignal);
            }
        }, "");
    }
};

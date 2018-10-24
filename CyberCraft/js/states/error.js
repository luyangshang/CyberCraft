/**
 * State that manages an error screen which shows a message. Used if the client browser does not provide some needed
 * functionality.
 * @type {{init: module.exports.init, create: module.exports.create, reloadFunc: module.exports.reloadFunc}}
 * @module
 * @name State: Error
 */
var error = {
    /**
     * Receives the string containing the error messages and saves it to an object attribute.
     * @param {string} errorMessage - Error message
     */
    init: function (errorMessage) {
        this.errorMessage = errorMessage;
    },

    /**
     * Prints the error screen.
     */
    create: function() {
        //Creates the error message text
        this.style = {font: "30px Courier New, monospace", fill: "#b50101", align: "center", wordWrap: true,
            wordWrapWidth: window.game.width - 80};
        this.error_text = window.game.add.text(window.game.world.centerX, window.game.world.centerY - 75, "", this.style);
        this.error_text.anchor.set(0.5, 0.5);
        this.error_text.setText(this.errorMessage);

        //Creates the page reload button
        this.realoadButton = window.game.add.button(window.game.world.centerX, window.game.world.centerY + 75,
        'reloadButton', this.reloadFunc, this, 1, 0);
        this.realoadButton.anchor.set(0.5, 0.5);
    },

    /**
     * Tells the browser to reload the game page.
     */
    reloadFunc: function () {
        window.location.reload(true);
    }
};
module.exports = error;
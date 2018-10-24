/**
 * Module used to write text in real time in order to simulate keyboard typing.
 * @type {{write_one: module.exports.write_one}}
 * @module
 * @name Dynamic Text
 */
module.exports = {
    /**
     * Function to simulate keyboard typing writing one character per time.
     * @param {Phaser.Text} text - Phaser text object to write on
     * @param {int} interval - Typing speed in ms
     * @param {string} text_to_write - Text to write dynamically
     * @param {Phaser.Signal} signal - Signal dispatched when the text has been completely written
     */
    write_one: function(text, interval, text_to_write, signal) {
        var count = 0;
		//write a single character, and dispatch wrting finish signal when needed
        var f = function() {
            //The next character is added to the text printed on screen
            text.text += text_to_write[count];
            count++;

            //If all characters have been written, the timer is stopped and the end write signal is dispatched
            if (count >= text_to_write.length) {
                timer.stop();
                timer.destroy();
                if (signal) {
                    signal.dispatch();
                }
            }
        };

        //Initializes timer that loops each predefined amount of ms written in the "interval" variable
        //Each time the timer triggers the "f" function is called
		///is there really the first parameter?
        var timer = window.game.time.create(window.game, false);
        timer.loop(interval, f, this);
        timer.start();

        return timer;
    }
};
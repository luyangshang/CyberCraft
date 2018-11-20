/* global alertify */
var Messager = require("../modules/Messager");
/**
 * This module handles the CORS request management to send learning data about player's performance to the
 * data gathering server.
 * @type {{createCORSRequest: module.exports.createCORSRequest, getTitle: module.exports.getTitle, makeCorsRequest: module.exports.makeCorsRequest}}
 */
module.exports = {	
    /**
     * Create the XHR object and sets its "Content-Type" and "Content-Length" headers to make it
     * compatible with the CORS protocol.
     * @param {string} method - A string with the HTTP method to perform, e.g. "POST"
     * @param {string} url - The URL to which to make the CORS request
     * @param {string} datas - The data string to send
     * @returns {XMLHttpRequest} The created XHR object.
     */
    createCORSRequest: function(method, url, datas) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // XHR for Chrome/Firefox/Opera/Safari.
            xhr.open(method, url, true);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            //xhr.setRequestHeader("Content-length", datas.length);
        } else if (typeof XDomainRequest !== "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			//xhr.setRequestHeader("Content-length", datas.length);
        } else {
            // CORS not supported.
            xhr = null;
        }
        return xhr;
    },

    /**
     * Helper method to parse the title tag from the response.
     * @param {string} text - Response text
     * @returns {string} The parsed title.
     */
    getTitle: function(text) {
        return text.match('<title>(.*)?</title>')[1];
    },

    /**
     * Makes a CORS request to send learning data to the data gathering service. The service is supposed to be residing
     * on the same machine as the game does. If this is not the case, this function must be changed. It, in fact,
     * derives the request URL from the game one.
     * @param {string} datas - Data string to send
     */
    makeCorsRequest: function(datas) {
        //Deriving URL from the game host server URL
        var url = "http://" + window.location.hostname + ":8080/saveLearningData";

        //Creates the XHR object compliant with the CORS protocol
        var xhr = this.createCORSRequest('POST', url, datas);
        //Checks for CORS compatibility and throws an alert otherwise
        if (!xhr) {
            game.globals.messager.createMessage('CORS not supported');
            return;
        }

        //Sets the callback to execute if the request is successful
        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4 && xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                game.globals.messager.createMessage(response.message);
                //game.globals.messager.createMessage("Link to the second survey: https://goo.gl/FO94LC  (Save it with Ctrl+C and paste it in the address bar with Ctrl+V)");
            }
        };

        //Sets the callback to execute if the request fails
        xhr.onerror = function(){game.globals.messager.createMessage('Error while sending data! Maybe resend another time using the button in the game menu.');};
		

        //Actually sends the request
        xhr.send(datas);
    }
};
module.exports = function() {
    /**
     * @classdesc An asynchronous reader that can make ajax request to a remote url returning the downloaded file.
     * @constructor
     */
    function AjaxFileReader() {
        this.rawFile = new XMLHttpRequest();
    }

    /**
     * Reads the file at the specified url and executes the success callback when the operation has been completed or
     * launches the error callback if an error occurs.
     * @param {string} filePath - URL of the file to be read
     * @param {function} callbackSuccess - Function to execute after the file has been completely received
     * @param {function} callbackError - Function to execute if an error occurs
     */
    AjaxFileReader.prototype.readTextFile = function(filePath, callbackSuccess, callbackError) {
        this.rawFile.open("GET", filePath, true);
        this.rawFile.onload = callbackSuccess;
        if (callbackError) {
            this.rawFile.onerror = callbackError;
        }

        //Actually executes the AJAX request
        this.rawFile.send();
    };

    return AjaxFileReader;
};
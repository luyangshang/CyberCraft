/**
 * Library containing functions to create sprites from tiled maps objects.
 * @type {{findObjectsByType: module.exports.findObjectsByType, createFromTiledObject: module.exports.createFromTiledObject, createObjects: module.exports.createObjects}}
 * @module
 * @name Tile Functions
 */
module.exports = {
    /**
     * Finds all objects in a tiled layer whose 'type' property is equal to the specified value.
     * @param {string} type - Desired value of the 'type' property
     * @param {Object} map - The tiled map to search on
     * @param {string} layer - Layer name of the map on which to search
     * @param {int} adjustment - Offset needed to cope with the different anchor of Tiled and Phaser
     * @returns {Array} Array of found objects with the specified type, empty if none found.
     */
    findObjectsByType: function(type, map, layer, adjustment) {
        var result = [];
        map.objects[layer].forEach(function(element){
            if(element.properties.type === type) {
                //Phaser uses top left, Tiled bottom left so we have to adjust the y position
                //also keep in mind that the cup images are a bit smaller than the tile which is 16x16
                //so they might not be placed in the exact pixel position as in Tiled
                element.y -= map.tileHeight*adjustment;
                result.push(element);
            }
        });
        return result;
    },

    /**
     * Creates a sprite from an object in the tiled map.
     * @param {Object} element - Tiled object to create the sprite from
     * @param {Phaser.Group} group in which the newly created sprite has to be inserted
     */
    createFromTiledObject: function(element, group) {
        var sprite = group.create(element.x, element.y, element.properties.sprite);

        //copy all properties to the sprite
        Object.keys(element.properties).forEach(function(key){
            sprite[key] = element.properties[key];
        });
    },

    /**
     * Uses 'findObjectsByType' and 'createFromTiledObject' to create sprites from the objects in the 'objects' layer
     * with the 'type' property having the specified value.
     * @param {string} type - The type of objects to search
     * @param {Object} map - Tiled map to work on
     * @param {int} adjustment - Offset needed to cope with the different anchor of Tiled and Phaser
     * @returns {Phaser.Group} Newly created Phaser group containing the sprites created from the found objects,
     * null if no object have been found.
     */
    createObjects: function(type, map, adjustment) {
        //create doors
        var group = window.game.add.group();
        var flag = false;
        group.enableBody = true;
        var result = this.findObjectsByType(type, map, 'objects', adjustment);

        result.forEach(function(element){
            flag = true;	//at least one object created
            this.createFromTiledObject(element, group);
        }, this);

        if (flag) {
            return group;
        }
        else {
            return null;
        }
    }
};
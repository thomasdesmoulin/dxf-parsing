"use strict";

var Polygon = require (__dirname + '/polygon'),
    Point   = require (__dirname + '/point');

/**
 * Circle's constructor
 * @constructor
 */
function Circle (layer, rayon, point) {
    if (!(this instanceof Circle))
        throw 'this function in a constructor. Use new to call it';

    this.layer  = layer || 'defaultLayer';
    this.rayon  = rayon || 0;
    this.point  = point || undefined;
}

/**
 * Transform circle into polygon
 * @param   {int}       Sides is an option
 * @returns {Polygon}   polygon
 */
Circle.prototype.toPolygon = function toPolygon(Sides){
    var nbSides   = Sides || 20,
        angSplit  = Math.PI/(nbSides/2),
        polygon   = new Polygon();

    polygon.layer = this.layer;
    polygon.numberPoints = nbSides + 1;

    for (var angCur = 0; angCur <= 2*Math.PI; angCur += angSplit){
        var point = new Point(this.point.x + (this.rayon*Math.cos(angCur)), this.point.y + (this.rayon*Math.sin(angCur)));
        polygon.addPoint(point);
    }
    return polygon;
};


module.exports = Circle;
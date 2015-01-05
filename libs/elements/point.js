"use strict";

/**
 * Points's constructor
 * @constructor
 */
function Point (x, y, bulge) {
    if (!(this instanceof Point))
        throw 'this function in a constructor. Use new to call it';

    this.x = x || 0;
    this.y = y || 0;
    this.bulge = bulge || 0;
}

/**
 * Return if the point is inside a polygon or not
 * @param   {[Point]} points
 * @returns {Boolean}
 */
Point.prototype.isInside = function isInside(points) {
    var i, j, c = false;
    for( i = 0, j = points.length-1; i < points.length; j = i++ ) {
        if( ( ( points[i].y > this.y ) != ( points[j].y > this.y ) ) &&
            ( this.x < ( points[j].x - points[i].x ) * ( this.y - points[i].y ) / ( points[j].y - points[i].y ) + points[i].x ) ) {
            c = !c;
        }
    }
    return c;
};

/**
 * Return the nearest point
 * @param   {[Point]}   points
 * @returns {Point}     nearestPoint
 */
Point.prototype.findNearest = function findNearest(points){
    var minDist = 0,
        nearest = new Point();

    for (var pi = 0; pi < points.length; pi ++ ){
        var distCur  = Math.sqrt(Math.pow(this.x-points[pi].x, 2)+Math.pow(this.y-points[pi].y, 2));
        minDist      = distCur <= minDist ? distCur : (pi == 0 ? distCur : minDist);
        nearest      = distCur <= minDist ? points[pi] : nearest;
    }

    return nearest;
};


module.exports = Point;

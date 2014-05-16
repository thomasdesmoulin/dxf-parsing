'use strict';

var _ = require('underscore');

var Utils = {};


/**
 * Create a point
 * @param x
 * @param y
 */
Utils.point = function (x,y) {

    this.x = x;
    this.y = y;
  };


/**
 * Return a copy of tab without the val
 * @param {Array}   tab
 * @param {Object}  val
 * @returns {Array} newTab
 */
Utils.unset = function(tab, val){

    var newTab=_.map(tab, function(point){
                  if(!_.isEqual(point, val)) return point;
                  else return -1;
              });
    newTab.forEach(function (point, pi){
      if (point===-1) newTab.splice(pi, 1);
    });
    return newTab;
  };

/**
 * Return if a point is inside a polygon or not
 * @param {Array}        points
 * @param {Utils.point}  test
 * @returns {boolean}
 */
Utils.pnpoly = function (points, test) {
  var i, j, c = false;
  for( i = 0, j = points.length-1; i < points.length; j = i++ ) {
    if( ( ( points[i].y > test.y ) != ( points[j].y > test.y ) ) &&
      ( test.x < ( points[j].x - points[i].x ) * ( test.y - points[i].y ) / ( points[j].y - points[i].y ) + points[i].x ) ) {
      c = !c;
    }
  }
  return c;
};

module.exports = Utils;



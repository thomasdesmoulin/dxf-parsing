'use strict';

var _ = require('underscore');

var Utils = {};


Utils.point = function (x,y) {

    this.x = x;
    this.y = y;
  }


Utils.unset = function(tab, val){

    var newTab=_.map(tab, function(point, i){
                  if(!_.isEqual(point, val)) return point;
                  else return -1;
              })
    newTab.forEach(function (point, pi){
      if (point===-1) newTab.splice(pi, 1);
    });
    return newTab;
  }


// return if a point is inside a polygon
Utils.pnpoly = function (points, test) {
  var i, j, c = false;
  for( i = 0, j = points.length-1; i < points.length; j = i++ ) {
    if( ( ( points[i].y > test.y ) != ( points[j].y > test.y ) ) &&
      ( test.x < ( points[j].x - points[i].x ) * ( test.y - points[i].y ) / ( points[j].y - points[i].y ) + points[i].x ) ) {
      c = !c;
    }
  }
  return c;
}

module.exports = Utils;



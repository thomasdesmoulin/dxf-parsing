'use strict';

var _ = require('underscore');

var Utils = {};

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

module.exports = Utils;



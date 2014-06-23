'use strict';

var   byline     = require("byline"),
      fs         = require("fs"),
      utils      = require(__dirname+'/utils.js'),
      Polygon    = require (__dirname + "/elements/polygon"),
      Point      = require (__dirname + "/elements/point");

var Parser = {};

/**
 * Transform a dxf file into an array where keys are the names of dxf sections
 * @param {String}     dxfPath     "path/of/dxf/file"
 * @param {Function}   callback    Callback function
 */
Parser.toArray = function (dxfPath, callback) {

    var stream = byline(fs.createReadStream(dxfPath, { encoding: 'utf8' })),
        sectionNameTab = ['HEADER', 'CLASSES', 'TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS', 'THUMBNAILIMAGE'],
        sectionCur = '',
        dxfTab = [],
        section = false,
        endsec = false;

    stream.on('data', function (line) {
        if (sectionNameTab.indexOf(line) != -1) {
            sectionCur = line.toLowerCase();
            section = true;
            dxfTab[sectionCur] = [];
            endsec = false;
        }
        else if (section == true) {
            if (line == 'ENDSEC') {
                endsec = true;
                section = false;
                sectionCur = '';
            }
            else if (endsec == false) dxfTab[sectionCur].push(line);
        }
    });
    stream.on('end', function () {
        callback(dxfTab);
    });
};

/**
 * Return an array of polygons
 * @param   {Array}   sectionTab      Polygons are in the entities section
 * @returns {Array}   polygons        An array of polygons
 */
Parser.getPolygons = function (sectionTab) {

    var polygons   = [],
        polygon    = undefined,
        sectionTab = sectionTab.entities,
        lwpolyline = false;

    sectionTab.forEach(function (line, li) {
        if (line == 'LWPOLYLINE') {
            lwpolyline = true;
            polygon    = new Polygon();
        }
        else if (lwpolyline == true && line == '  8') polygon.setLayer(sectionTab[li + 1]);
        else if (lwpolyline == true && line == ' 90') polygon.setNumberPoints(parseInt(sectionTab[li + 1]));
        else if (lwpolyline == true && line == ' 10') {
            var point = new Point();
            point.setX(parseFloat(sectionTab[li + 1]));
            point.setY(parseFloat(sectionTab[li + 3]));
            polygon.addPoint(point);
        }
        else if (
            lwpolyline == true &&
            polygon.numberPoints !== 0 &&
            polygon.layer !== '' &&
            polygon.points.length === polygon.numberPoints
         ){
            lwpolyline = false;
            polygons.push(polygon);
         }
    });
    return polygons;
};

/**
 * Return an array of circles
 * @param   {Array}   sectionTab      Circles are in the entities section
 * @returns {Array}   circles         An array of circles
 */
Parser.getCircles = function (sectionTab){

    var circles       = [],
        countCircles  = 0,
        sectionTab    = sectionTab.entities,
        circle        = false;

    sectionTab.forEach(function (line, li){
        if(line == 'CIRCLE'){
            circle = true;
            circles[countCircles] = {layer : '', rayon : 0, point : undefined};
        }
        else if(circle == true && line == '  8') circles[countCircles].layer = sectionTab[li+1];
        else if(circle == true && line == ' 10') circles[countCircles].point = new utils.point(parseFloat(sectionTab[li+1]), parseFloat(sectionTab[li+3]));
        else if(circle == true && line == ' 40') circles[countCircles].rayon = sectionTab[li+1];
        else if(circle == true && circles[countCircles].point != undefined && circles[countCircles].rayon != 0){
            circle = false;
            countCircles++;
        }
    });

    return circles;
};

/**
 * Return an array of texts
 * @param   {Array}   sectionTab     Texts are in the entities section
 * @returns {Array}   texts          An array of texts
 */
Parser.getTexts = function (sectionTab){

  var texts       = [],
      countTexts  = 0,
      sectionTab    = sectionTab.entities,
      text        = false;

  sectionTab.forEach(function (line, li){
    if(line == 'TEXT' || line == 'MTEXT'){
        text = true;
        texts[countTexts] = {layer : '', txt : '', point : undefined};
      }
    else if(text == true && line == '  8') texts[countTexts].layer = sectionTab[li+1];
	  else if(text == true && line == ' 10') texts[countTexts].point = new utils.point(parseFloat(sectionTab[li+1]), parseFloat(sectionTab[li+3]));
	  else if(text == true && line == '  1') texts[countTexts].txt = sectionTab[li+1];
	  else if(text == true && texts[countTexts].point != null && texts[countTexts].txt != null){ 
	    text=false;
	    countTexts++;
	  }
  });

  return texts;
};

/**
 * Return all layers of the appropriate entities
 * @param   {Object}    params       ent : Array("TEXT","MTEXT","LWPOLYLINE","CIRCLES") sectionTab : sectionTab (The layers are in the entities section so you should use sectionTab.entities)
 * @returns {Array}     layers       Layers of the appropriate entities
 */
Parser.getLayersByEntities = function (params){

    var layers  = [],
        tab     = params.ent,
        get     = false;

    params.sectionTab.forEach(function (line, li){
        if(tab.indexOf(line) != -1){
            get = true;
        }
        else if(get == true && line == '  8'){
            if(layers.indexOf(params.sectionTab[li+1]) == -1) layers.push(params.sectionTab[li+1]);
        }
    });

    return layers;
};

/**
 * Return the all layers of the dxf file
 * @param {Array}    sectionTab     All layers are in the tables section so you should use sectionTab.tables
 * @returns {Array}  layer
 */
Parser.getAllLayers = function (sectionTab){

    var layers       = [],
        getLayer     = false;

    sectionTab.forEach(function (line, li){
        if(line == "AcDbLayerTableRecord") getLayer = true;

        else if(getLayer == true && line == '  2'){

            if(layers.indexOf(sectionTab[li+1]) == -1){
                layers.push(sectionTab[li+1]);
                getLayer = false;
            }
        }
    });

    return layers;
};

/**
 * Get Parameters : the origin point of the view, its center point and its rotate angle
 * @param {Array}    sectionTab     The parameters are in the tables section so you should use sectionTab.tables
 * @returns {Object} params         originPoint, viewCenterPoint, rotateAngle
 */
Parser.getParameters = function (sectionTab) {

    var params = {originPoint: null, viewCenterPoint: null, rotateAngle: null},
        vPort = false;

    sectionTab.forEach(function (line, li) {
        if (line == 'AcDbViewportTableRecord') vPort = true;

        else if (vPort == true && line == ' 12') params.viewCenterPoint = new utils.point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3]));
        else if (vPort == true && line == ' 13') params.originPoint = new utils.point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3]));
        else if (vPort == true && line == ' 51') params.rotateAngle = parseFloat(sectionTab[li + 1]);

        else if (vPort == true && params.rotateAngle != null && params.originPoint != null && params.viewCenterPoint != null) vPort = false;
    });

    return params;
};




module.exports = Parser;

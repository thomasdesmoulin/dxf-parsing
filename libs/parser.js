'use strict';

var   byline     = require("byline"),
      fs         = require("fs"),
      utils      = require(__dirname+'/utils.js'),
      staff      = require(__dirname+'/staff.js');
	    
var Parser = {};

/**
 * Transform a dxf file into an array where keys are the names of dxf sections
 * @param {Object}     params      dxfPah : path/of/dxf/file, [sectionName : header|classes|tables|blocks|entities|objects|tumbnailimage]
 * @param {Function}   callback    Callback function
 */
Parser.getSections = function (params, callback) {

    var stream = byline(fs.createReadStream(params.dxfPath, { encoding: 'utf8' })),
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
        if (params.sectionName != null) callback(dxfTab[params.sectionName]);
        else callback(dxfTab);
    });
};


/**
 * Return an array of polygons
 * @param   {Array}   sectionTab      The polygons are in the entities section so you should use sectionTab.entities
 * @returns {Array}   polygons        An array of polygons
 */
Parser.getPolygons = function (sectionTab) {

    var polygons = [],
        countPoly = 0,
        lwpolyline = false;

    sectionTab.forEach(function (line, li) {
        if (line == 'LWPOLYLINE') {
            lwpolyline = true;
            polygons[countPoly] = {pInd: countPoly, layer: null, nPoint: null, points: []};
        }
        else if (lwpolyline == true && line == '  8') polygons[countPoly].layer = sectionTab[li + 1];
        else if (lwpolyline == true && line == ' 90') polygons[countPoly].nPoint = parseInt(sectionTab[li + 1]);
        else if (lwpolyline == true && line == ' 10') polygons[countPoly].points.push(new utils.point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3])));
        else if (lwpolyline == true && polygons[countPoly].points.length === polygons[countPoly].nPoint) {
            lwpolyline = false;
            countPoly++;
        }
    });

    return polygons;
};

/**
 * Return an array of circles
 * @param   {Array}   sectionTab      The circles are in the entities section so you should use sectionTab.entities
 * @returns {Array}   circles         An array of circles
 */
Parser.getCircles = function (sectionTab){

    var circles       = [],
        countCircles  = 0,
        circle        = false;

    sectionTab.forEach(function (line, li){
        if(line == 'CIRCLE'){
            circle = true;
            circles[countCircles] = {cInd : countCircles, layer : null, rayon : null, point : null};
        }
        else if(circle == true && line == '  8') circles[countCircles].layer = sectionTab[li+1];
        else if(circle == true && line == ' 10') circles[countCircles].point = new utils.point(parseFloat(sectionTab[li+1]), parseFloat(sectionTab[li+3]));
        else if(circle == true && line == ' 40') circles[countCircles].rayon = sectionTab[li+1];
        else if(circle == true && circles[countCircles].point != null && circles[countCircles].rayon != null){
            circle=false;
            countCircles++;
        }
    });

    return circles;
};



/**
 * Return an array of texts
 * @param   {Array}   sectionTab     The texts are in the entities section so you should use sectionTab.entities
 * @returns {Array}   texts          An array of texts
 */
Parser.getTexts = function (sectionTab){

  var texts       = [],
      countTexts  = 0,
      text        = false;

  sectionTab.forEach(function (line, li){
    if(line == 'TEXT' || line == 'MTEXT'){
        text = true;
        texts[countTexts] = {tInd : countTexts, layer : null, txt : null, point : null};
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
 * Established a mapping between polygons and texts
 * @param {Array}    texts
 * @param {Array}    polygons
 * @returns {Object} {map: Array, textsAlone: *}
 */
Parser.getMappings = function (texts, polygons){

  var mapping=[], textsAlone= texts;

  texts.forEach(function (text){
    polygons.forEach(function (polygon, p){
      if(utils.pnpoly(polygon.points, text.point)){
        if(!mapping[p]) {
          mapping[p] = {polygon : polygon, nText : 1 ,texts : [text]};
          textsAlone = utils.unset(textsAlone, text);
        }
        else{
          mapping[p].texts.push(text);
          mapping[p].nText=mapping[p].nText+1;
          textsAlone = utils.unset(textsAlone, text);
        }
      }
    });
  });
    return {map : mapping, textsAlone : textsAlone};
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



/**
 * Return the min x,z  and the max x,y of the polygon's array
 * @param   {Array}     polygons
 * @returns {Object}    {min: point, max: point}
 */
Parser.getDimension = function (polygons){

  var minPoint = new utils.point(0,0),
      maxPoint = new utils.point(0,0);

  polygons.forEach(function (polygon, p) {
    polygon.points.forEach(function (tpoint, i) {
      minPoint.x = tpoint.x < minPoint.x ? tpoint.x : (i === 0 && p === 0 ? tpoint.x : minPoint.x);
      minPoint.y = tpoint.y < minPoint.y ? tpoint.y : (i === 0 && p === 0 ? tpoint.y : minPoint.y);
      maxPoint.x = tpoint.x > maxPoint.x ? tpoint.x : (i === 0 && p === 0 ? tpoint.x : maxPoint.x);
      maxPoint.y = tpoint.y > maxPoint.y ? tpoint.y : (i === 0 && p === 0 ? tpoint.y : maxPoint.y);
    });
  });
  return {'min': minPoint,
          'max': maxPoint}
};

/**
 * Function made to split the polygons with four points where there are two or four text
 * @param {Object}      mappings
 * @param {Array}       polygons
 * @returns {Array}     polygons   theses polygons were split
 */
Parser.splitPoly = function (mappings, polygons){

  mappings.forEach(function (mapping){

    var newPoint    = new utils.point(0,0), newPoint1 = new utils.point(0,0), 
        newPoint2   = new utils.point(0,0), newPoint3 = new utils.point(0,0),
        fourthPoint = new utils.point(0,0), fourthPoint1 = new utils.point(0,0),
        center      = new utils.point(0,0), 
        newPolygons = [], tabNearestPoints = [], tabPolyPointsTmp = [];

    if(mapping.polygon.nPoint===4 && mapping.nText===2){
          
      tabPolyPointsTmp=mapping.polygon.points;

      (mapping.texts).forEach(function (text, ti){
        tabNearestPoints[ti] = staff.findNearestPoint(mapping.polygon.points, text.point);
        tabPolyPointsTmp=utils.unset(tabPolyPointsTmp, tabNearestPoints[ti]);
      });
      if (tabNearestPoints[0]!==tabNearestPoints[1]){
        newPoint.x=(tabNearestPoints[0].x+tabNearestPoints[1].x)/2;
        newPoint.y=(tabNearestPoints[0].y+tabNearestPoints[1].y)/2;
        newPoint1.x=(tabPolyPointsTmp[0].x+tabPolyPointsTmp[1].x)/2;
        newPoint1.y=(tabPolyPointsTmp[0].y+tabPolyPointsTmp[1].y)/2;
        fourthPoint=staff.findNearestPoint(tabPolyPointsTmp, tabNearestPoints[0]);
        fourthPoint1=staff.findNearestPoint(tabPolyPointsTmp, tabNearestPoints[1]);

        newPolygons[0]=[newPoint, tabNearestPoints[0], fourthPoint, newPoint1];
        newPolygons[1]=[newPoint, tabNearestPoints[1], fourthPoint1, newPoint1];

        polygons=utils.unset(polygons, {pInd : mapping.polygon.pInd, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: mapping.polygon.points});
        polygons.push({pInd : mapping.polygon.pInd, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[0]});
        polygons.push({pInd : mapping.polygon.pInd + polygons.length, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[1]}); 
      }
    }
    else if (mapping.polygon.nPoint===4 && mapping.nText===4){

      center=staff.getCenter(mapping.polygon.points);

      newPoint.x=(mapping.polygon.points[0].x+mapping.polygon.points[1].x)/2;
      newPoint.y=(mapping.polygon.points[0].y+mapping.polygon.points[1].y)/2;

      newPoint1.x=(mapping.polygon.points[1].x+mapping.polygon.points[2].x)/2;
      newPoint1.y=(mapping.polygon.points[1].y+mapping.polygon.points[2].y)/2;

      newPoint2.x=(mapping.polygon.points[2].x+mapping.polygon.points[3].x)/2;
      newPoint2.y=(mapping.polygon.points[2].y+mapping.polygon.points[3].y)/2;

      newPoint3.x=(mapping.polygon.points[3].x+mapping.polygon.points[0].x)/2;
      newPoint3.y=(mapping.polygon.points[3].y+mapping.polygon.points[0].y)/2;

      newPolygons[0]=[newPoint, mapping.polygon.points[0], newPoint3, center];
      newPolygons[1]=[newPoint, mapping.polygon.points[1], newPoint1, center];
      newPolygons[2]=[newPoint2, mapping.polygon.points[2], newPoint1, center];
      newPolygons[3]=[newPoint2, mapping.polygon.points[3], newPoint3, center];

      polygons=utils.unset(polygons, {pInd : mapping.polygon.pInd, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: mapping.polygon.points});
      polygons.push({pInd : mapping.polygon.pInd, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[0]});
      polygons.push({pInd : mapping.polygon.pInd+polygons.length, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[1]}); 
      polygons.push({pInd : mapping.polygon.pInd+polygons.length+1, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[2]});
      polygons.push({pInd : mapping.polygon.pInd+polygons.length+2, layer : mapping.polygon.layer, nPoint : mapping.polygon.nPoint, points: newPolygons[3]});
    }
  });

  return polygons;
};


module.exports = Parser;

'use strict';

var   byline     = require("byline"),
      fs         = require("fs"),
      utils      = require (__dirname + '/utils'),
      Polygon    = require (__dirname + "/elements/polygon"),
      Circle     = require (__dirname + "/elements/circle"),
      Text       = require (__dirname + "/elements/text"),
      Point      = require (__dirname + "/elements/point");

var Parser = {};

/**
 * Transform a dxf file into an array where keys are the names of dxf sections
 * @param {String}     dxfPath     "path/of/dxf/file"
 * @param {Function}   callback    Callback function
 */
Parser.toArray = function (dxfPath, callback) {

    var stream         = byline(fs.createReadStream(dxfPath, { encoding: 'utf8' })),
        sectionNameTab = ['HEADER', 'CLASSES', 'TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS', 'THUMBNAILIMAGE'],
        sectionCur     = '',
        dxfTab         = [],
        section        = false,
        endsec         = false;

    stream.on('data', function (line) {
        if (sectionNameTab.indexOf(line) != -1) {
            sectionCur = line.toLowerCase();
            section = true;
            dxfTab[sectionCur] = [];
            endsec = false;
        }
        else if (section === true) {
            if (line === 'ENDSEC') {
                endsec = true;
                section = false;
                sectionCur = '';
            }
            else if (endsec === false) {
                dxfTab[sectionCur].push(line);
            }
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

    var polygons    = [],
        polygon     = undefined,
        sectionTab  = sectionTab.entities,
        polygonBool = false;

    sectionTab.forEach(function (line, li) {
        if (line === 'LWPOLYLINE') {
            polygonBool = true;
            polygon    = new Polygon();
        }
        else if (polygonBool === true && line === '  8') polygon.setLayer(sectionTab[li + 1]);
        else if (polygonBool === true && line === ' 90') polygon.setNumberPoints(parseInt(sectionTab[li + 1]));
        else if (polygonBool === true && line === ' 10') {
            var point = new Point();
            point.setX(parseFloat(sectionTab[li + 1]));
            point.setY(parseFloat(sectionTab[li + 3]));
            polygon.addPoint(point);
        }
        else if (
            polygonBool === true &&
            polygon.numberPoints !== 0 &&
            polygon.layer !== 'defaultLayer' &&
            polygon.points.length === polygon.numberPoints
         ){
            polygonBool = false;
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

    var circles    = [],
        circle     = undefined,
        sectionTab = sectionTab.entities,
        circleBool = false;

    sectionTab.forEach(function (line, li){
        if(line === 'CIRCLE'){
            circleBool = true;
            circle = new Circle();
        }
        else if(circleBool === true && line === '  8') circle.setLayer(sectionTab[li+1]);
        else if(circleBool === true && line === ' 10') {
            var point = new Point();
            point.setX(parseFloat(sectionTab[li + 1]));
            point.setY(parseFloat(sectionTab[li + 3]));
            circle.setPoint(point);
        }
        else if(circleBool === true && line === ' 40') circle.setRayon(sectionTab[li+1]);
        else if(
            circleBool === true &&
            circle.layer !== 'defaultLayer' &&
            circle.point !== undefined &&
            circle.rayon !== 0
        ){
            circleBool = false;
            circles.push(circle);
        }
    });
    return circles;
};

/**
 * Return an array of texts
 * @param   {Array}   sectionTab     The texts are in the entities section
 * @returns {Array}   texts          An array of texts
 */
Parser.getTexts = function (sectionTab){

    var texts       = [],
        text        = undefined,
        sectionTab  = sectionTab.entities,
        textBool    = false;

    sectionTab.forEach(function (line, li){
        if(line == 'TEXT' || line == 'MTEXT'){
            textBool = true;
            text = new Text();
        }
        else if(textBool == true && line == '  8') text.setLayer(sectionTab[li+1]);
        else if(textBool == true && line == ' 10') {
            var point = new Point();
            point.setX(parseFloat(sectionTab[li + 1]));
            point.setY(parseFloat(sectionTab[li + 3]));
            text.setPoint(point);
        }
        else if(textBool == true && line == '  1') {
            text.setContents(sectionTab[li+1]);
            text.parse();
        }
        else if(
            textBool == true &&
            text.layer != 'defaultLayer' &&
            text.contents != 'defaultContents' &&
            text.point != undefined

        ){
            textBool = false;
            if(text.contents !== '') texts.push(text);
        }
    });
    return texts;
};

/**
 * Get Parameters : the origin point of the view, its center point and its rotate angle
 * @param   {Array}    sectionTab     The parameters are in the tables section
 * @returns {Object}   params         originPoint, viewCenterPoint, rotateAngle
 */
Parser.getParameters = function (sectionTab) {

    var params     = {originPoint: null, viewCenterPoint: null, rotateAngle: null},
        sectionTab = sectionTab.tables,
        vPort      = false;

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
 * Return all layers of the appropriate entities
 * @param    {Array}    sectionTab     The specific layers are in the entities section
 * @param    {Array}    tabEnt         You can put "text","polygon" or "circle" in the tabEnt (all by default)
 * @returns  {Array}    layers
 */
Parser.getLayersByEntities = function (sectionTab, tabEnt){

    var layers     = [],
        tabTmp     = tabEnt || 'all',
        ent        = false;

    if(tabTmp === 'all') layers = Parser.getAllLayers(sectionTab);
    else{
        var sectionTab = sectionTab.entities,
            tabEnt     = [];

        if (tabTmp.indexOf("text") !== -1) tabEnt.push("MTEXT", "TEXT");
        if (tabTmp.indexOf("polygon") !== -1) tabEnt.push("LWPOLYLINE");
        if (tabTmp.indexOf("circle") !== -1) tabEnt.push("CIRCLE");

        sectionTab.forEach(function (line, li){
            if(tabEnt.indexOf(line) !== -1) ent = true;
            else if(ent === true && line == '  8'){
                if(layers.indexOf(sectionTab[li+1]) === -1) layers.push(sectionTab[li+1]);
            }
        });
    }
    return layers;
};

/**
 * Return the all layers of the dxf file
 * @param   {Array}    sectionTab     All layers are in the tables section
 * @returns {Array}    layer
 */
Parser.getAllLayers = function (sectionTab){

    var layers       = [],
        sectionTab   = sectionTab.tables,
        getLayer     = false;

    sectionTab.forEach(function (line, li){
        if(line === "AcDbLayerTableRecord") getLayer = true;
        else if(getLayer === true && line === '  2'){
            if(layers.indexOf(sectionTab[li+1]) === -1){
                layers.push(sectionTab[li+1]);
                getLayer = false;
            }
        }
    });
    return layers;
};

module.exports = Parser;

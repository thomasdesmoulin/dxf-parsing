'use strict';

var   byline     = require("byline"),
      fs         = require("fs"),
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
        sectionNameTab = ['TABLES', 'ENTITIES'],
        //sectionNameTab = ['HEADER', 'CLASSES', 'TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS', 'THUMBNAILIMAGE'],
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
    stream.on('error', function (error) {
        callback(error);   
    });
    stream.on('end', function () {
        callback(null, dxfTab);
    });
};

/**
 * Get the polygons in the DXF file
 * @param   {Array}   sections      Polygons are in the entities section
 * @returns {Array}   polygons        An array of polygons
 */
Parser.getPolygons = function (sections) {

    var polygons    = [],
        polygon     = undefined,
        sectionTab  = sections.entities,
        polygonBool = false;

    sectionTab.forEach(function (line, li) {
        if (line === 'LWPOLYLINE') {
            polygonBool = true;
            polygon     = new Polygon();
        }
        else if (polygonBool === true && line === '  8') polygon.layer = sectionTab[li + 1].replace(/ {1,}/g,"");
        else if (polygonBool === true && line === ' 90') polygon.numberPoints = parseInt(sectionTab[li + 1]);
        else if (polygonBool === true && line === ' 10') {
            var point = new Point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3]));
            if (sectionTab[li + 4] === ' 42') point.bulge = parseFloat(sectionTab[li + 5]);
            polygon.addPoint(point);
        }
        else if (
            polygonBool === true &&
            polygon.numberPoints !== 0 &&
            polygon.layer !== 'defaultLayer' &&
            polygon.points.length === polygon.numberPoints
        ){
            polygonBool = false;
            if (!polygons[polygon.layer]) polygons[polygon.layer] = [polygon];
            else polygons[polygon.layer].push(polygon);
        }
    });
    return polygons;
};

/**
 * Get the circles in the DXF file
 * @param   {Array}     sections          Circles are in the entities section
 * @param   {object}    options             Function options
 * @param   {boolean}   options.toPolygon   true if you want to transforrm directly the circles into polygons
 * @param   {int}       options.nbSides     you can choose the number of sides of polygons from circle (default 20 sides)
 * @returns {Array}     circles             An array of circles
 */
Parser.getCircles = function (sections, options){

    var circles             = [],
        polygonFromCircle   = undefined,
        circle              = undefined,
        sectionTab          = sections.entities,
        toPolygon           = options !== undefined ? options.toPolygon : false,
        nbSides             = options !== undefined ? options.nbSides : 20,
        circleBool          = false;

    sectionTab.forEach(function (line, li){
        if(line === 'CIRCLE'){
            circleBool = true;
            circle = new Circle();
        }
        else if(circleBool === true && line === '  8') circle.layer = sectionTab[li+1].replace(/ {1,}/g,"");
        else if(circleBool === true && line === ' 10') {
            circle.point = new Point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3]));
        }
        else if(circleBool === true && line === ' 40') circle.rayon = sectionTab[li+1];
        else if(
            circleBool === true &&
            circle.layer !== 'defaultLayer' &&
            circle.point !== undefined &&
            circle.rayon !== 0
        ){
            circleBool = false;
            if (toPolygon){
                polygonFromCircle = circle.toPolygon(nbSides);
                if(!circles[polygonFromCircle.layer]) circles[polygonFromCircle.layer] = [polygonFromCircle];
                else circles[polygonFromCircle.layer].push(polygonFromCircle);
            }
            else{
                if(!circles[circle.layer]) circles[circle.layer] = [circle];
                else circles[circle.layer].push(circle);
            }
        }
    });
    return circles;
};

/**
 * Get the texts in the DXF file
 * @param   {Array}    sections           The texts are in the entities section
 * @returns {Array}    texts              An array of texts
 */
Parser.getTexts = function (sections){

    var texts         = [],
        text          = undefined,
        sectionTab    = sections.entities,
        textBool      = false;

    sectionTab.forEach(function (line, li){
        if(line == 'TEXT' || line == 'MTEXT'){
            textBool = true;
            text = new Text();
        }
        else if(textBool == true && line == '  8') text.layer = sectionTab[li+1].replace(/ {1,}/g,"");
        else if(textBool == true && line == ' 10') {
            text.point = new Point(parseFloat(sectionTab[li + 1]), parseFloat(sectionTab[li + 3]));
        }
        else if(textBool == true && line == '  1') {
            text.contents = sectionTab[li+1];
            text.contentsParse();
        }
        else if(
            textBool == true &&
            text.layer != 'defaultLayer' &&
            text.contents != 'defaultContents' &&
            text.point != undefined

        ){
            textBool = false;
            if(text.contents !== ''){
                if(!texts[text.layer]) texts[text.layer] = [text];
                else texts[text.layer].push(text);
            }
        }
    });
    return texts;
};

/**
 * Get Parameters : the origin point of the view, its center point and its rotate angle
 * @param   {Array}    sections       The parameters are in the tables section
 * @returns {Object}   params         rotateAngle
 */
Parser.getParameters = function (sections) {

    var params     = {rotateAngle: undefined},
        sectionTab = sections.tables,
        vPort      = false;

    sectionTab.forEach(function (line, li) {
        if (line == 'AcDbViewportTableRecord') vPort = true;
        else if (vPort == true && line == ' 51') params.rotateAngle = parseFloat(sectionTab[li + 1]);
        else if (vPort == true && params.rotateAngle != undefined) vPort = false;
    });
    return params;
};

/**
 * Get the layers of the appropriate entities in the DXF file
 * @param    {Array}    sections     The specific layers are in the entities section
 * @param    {Array}    ents         You can put "text","polygon" or "circle" in the tabEnt (all by default)
 * @returns  {Array}    layers
 */
Parser.getLayersByEntities = function (sections, ents){

    var layers     = [],
        tabTmp     = ents || 'all',
        ent        = false,
        entCur     = '';

    if(tabTmp === 'all') layers = Parser.getAllLayers(sections);
    else{
        var sectionTab = sections.entities,
            tabEnt     = [];

        if (tabTmp.indexOf("text") !== -1) tabEnt.push("MTEXT", "TEXT");
        if (tabTmp.indexOf("polygon") !== -1) tabEnt.push("LWPOLYLINE");
        if (tabTmp.indexOf("circle") !== -1) tabEnt.push("CIRCLE");

        sectionTab.forEach(function (line, li){
            if(tabEnt.indexOf(line) !== -1){
                if (line === "MTEXT" || line === "TEXT" ) entCur = "text";
                else if (line === "LWPOLYLINE") entCur = "polygon";
                else if (line === "CIRCLE" || line === "TEXT" ) entCur = "circle";
                ent = true;
            }
            else if(ent === true && line == '  8'){
                var layerCur = sectionTab[li+1].replace(/ {1,}/g,"");
                if (!layers[entCur]){
                    layers[entCur] = [layerCur];
                    ent = false;
                    entCur = '';
                }
                else if (layers[entCur].indexOf(layerCur) === -1){
                    layers[entCur].push(layerCur);
                    ent = false;
                    entCur = '';
                }
            }
        });
    }
    return layers;
};

/**
 * Get all layers of the DXF file
 * @param   {Array}    sections     All layers are in the tables section
 * @returns {Array}    layer
 */
Parser.getAllLayers = function (sections){

    var layers       = [],
        sectionTab   = sections.tables,
        getLayer     = false;

    sectionTab.forEach(function (line, li){
        if(line === "AcDbLayerTableRecord") getLayer = true;
        else if(getLayer === true && line === '  2'){
            if(layers.indexOf(sectionTab[li+1].replace(/ {1,}/g,"")) === -1){
                layers.push(sectionTab[li+1].replace(/ {1,}/g,""));
                getLayer = false;
            }
        }
    });
    return layers;
};

/**
 * Established a mapping between polygons and texts
 * @param    {object}    polygons
 * @param    {object}    texts
 * @returns  {Array}     mapping
 */
Parser.makeMappings = function (polygons, texts){

    var mappings = [];

    texts.forEach(function (text){
        polygons.forEach(function (polygon, p){
            if(polygon.points !== undefined){
                if(text.point.isInside(polygon.points)){
                    if(!mappings[p]) mappings[p] = {polygon : polygon, texts : [text]};
                    else mappings[p].texts.push(text);
                }
            }
        });
    });
    return mappings;
};

/**
 * Get the polygons of the DXF file which does not have text
 * @param   {Array}  polygons
 * @param   {Array}  texts
 * @returns {Array}  polygonWithoutText
 */
Parser.getPolygonsWithoutText = function (polygons, texts){

    var polygonWithoutText = [];

    polygons.forEach(function(polygon){

        var textInPolygon = [];

        texts.forEach(function (text, t){
            if(polygon.points !== undefined){
                if(text.point.isInside(polygon.points)) textInPolygon.push(t);
            }
        });
        if (textInPolygon.length === 0) polygonWithoutText.push(polygon);
    });
    return polygonWithoutText;
};

/**
 * Get the Texts of the DXF file which does not have polygon
 * @param   {Array}  texts
 * @param   {Array}  polygons
 * @returns {Array}  textsWithoutPolygon
 */
Parser.getTextsWithoutPolygon = function (texts, polygons){

    var textsWithoutPolygon = [];

    texts.forEach(function(text){

        var polygonWithText = [];

        polygons.forEach(function (polygon, p){
            if(polygon.points !== undefined){
                if(text.point.isInside(polygon.points)) polygonWithText.push(p);
            }
        });
        if (polygonWithText.length === 0) textsWithoutPolygon.push(text);
    });
    return textsWithoutPolygon;
};

/**
 * Return the min x,z  and the max x,y of the polygon's array
 * @param   {Array}     polygons
 * @returns {Object}    {min: point, max: point}
 */
Parser.getDimensions = function (polygons){

    var minPoint = new Point(),
        maxPoint = new Point();

    polygons.forEach(function (polygon, p) {
        polygon.points.forEach(function (tpoint, i) {
            minPoint.x = tpoint.x < minPoint.x ? tpoint.x : (i === 0 && p === 0 ? tpoint.x : minPoint.x);
            minPoint.y = tpoint.y < minPoint.y ? tpoint.y : (i === 0 && p === 0 ? tpoint.y : minPoint.y);
            maxPoint.x = tpoint.x > maxPoint.x ? tpoint.x : (i === 0 && p === 0 ? tpoint.x : maxPoint.x);
            maxPoint.y = tpoint.y > maxPoint.y ? tpoint.y : (i === 0 && p === 0 ? tpoint.y : maxPoint.y);
        });
    });
    return {
        'min': minPoint,
        'max': maxPoint
    }
};

module.exports = Parser;

var dxf = require (__dirname + '/libs/parser');



dxf.toArray('test.dxf', function(sectionTab){

    var polygons = [];

    polygons = dxf.getPolygons(sectionTab);

    console.log(polygons[1].points);
    console.log("----------------------");
    console.log(polygons[19].points);
    console.log("----------------------");
    console.log(polygons[14].points);
    console.log("----------------------");




});
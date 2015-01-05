dxf-parsing
========

dxf-parsing is made to parse dxf files : polygons, texts, circles ...

## Install

```
npm install dxf-parsing
```

## Usage

```javascript
var dxfparsing = require('dxf-parsing');

var dxf = dxfparsing.Parser;


dxf.toArray("path/to/dxf", function(error, sectionTab) {

       //Extract polygons and texts and do a mapping
       polygons = dxf.getPolygons(sectionTab);
       texts = dxf.getTexts(sectionTab);
       mapping = dxf.makeMappings(polygons, texts);



       //You can also extract the circles
       circles = dxf.getCircles(sectionTab);

       //and transform directly circles into polygons with options
       circles = dxf.getCircles(sectionTab, {toPolygon : true, nbSides : 16});

       //Extract layers
       allLayers = dxf.getAllLayers(sectionTab);

       layersByEntities = dxf.getLayersByEntities(sectionTab, ["text", "polygon", "circle"]);

       //extract parameters and dimension
       parameters = dxf.getParameters(sectionTab);
       dimensions = dxf.getDimensions(polygons);

    }
```
    	   
    	   
    	   


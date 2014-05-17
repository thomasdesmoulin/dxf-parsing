dxf-parsing
========

dxf-parsing is made to parse dxf files : polygons, texts, circles ...

## Install

```
npm install dxf-parsing
```

## Usage

```javascript
var dxfParsing = require('dxf-parsing');

var dxf       = dxfParsing.Parser,
	polygons  = [], circles = [], texts = [],
	allLayers = [], layersByEntities = [], mapping = [],
	parameters = {}, dimensions = {};


var section = dxf.toArray("path/to/dxf", function(sectionTab) {

       //Extract polygons and texts and do a mapping
       polygons = dxf.getPolygons(sectionTab.entities);
       texts = dxf.getTexts(sectionTab.entities);
       mapping = dxf.getMappings(texts, polygons);



       //You can also extract the circles
       circles = dxf.getCircles(sectionTab.entities);

       //Extract layers
       allLayers = dxf.getAllLayers(sectionTab.tables);

       layersByEntities = dxf.getLayersByEntities({
                            ent : ["TEXT", "MTEXT"], //you can also put "LWPOLYLINE" and "CIRCLE"
                            sectionTab : sectionTab.entities
                         });

       //extract parameters and dimension
       parameters = dxf.getParameters(sectionTab.tables);
       dimensions = dxf.getDimensions(polygons);

    }
```
    	   
    	   
    	   


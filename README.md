dxf-parsing
========

dxf-parsing is made to parse dxf files, polygon and text right now.

## Install

```
npm install dxf-parsing
```

## Usage

```javascript
var dxfParsing = require('dxf-parsing').Parser;

var dxf = new dxfParsing.Parser();


var section = dxf.getSections({ dxfPath : dxfPath, 
                                [sectionName : "entities"]
    	}, function(sectionTab) {
    	   polygons = dxf.getPolygons(sectionTab);
    	   texts = dxf.getTexts(sectionTab);
    	   ...
```
    	   
    	   
    	   


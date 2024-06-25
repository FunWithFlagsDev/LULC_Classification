var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos_WorldViewe/3 - segmentacao');

var image = imageModule.mosaic3.select('b5_mean','b1_mean','b3_mean','b2_mean','b4_mean','pc1_mean',
'NDVI_mean','b6_mean','pc2_mean','pc5_mean','NDWI_mean','pc4_mean','pc3_mean','b7_mean','b8_mean','b7_savg_mean');

var importedSamples = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/amostras_CG');

var samples = importedSamples.randomColumn('random');
print('5 - How many samples do we have?', samples);

// Splitting training and testing samples
var trainingSamples = samples.filter(ee.Filter.lt('random', 0.7));
var testingSamples = samples.filter(ee.Filter.gte('random', 0.7));

var colorPalette = [
    '#2495ff', // Water
    '#d6ffa8', // Grass Vegetation
    '#73a800', // Tree Vegetation
    '#808080', // Asphalt Pavement
    '#FF0000', // Buildings
    '#ffff00', // Exposed Soil
    '#000000'  // Shadows
];
  
// Training
var trainingPixel = image.sampleRegions({
  collection: trainingSamples,
  scale: 0.5,
  properties: ['landcover'],
  tileScale: 16
});

// Defining the classifier
var classifier = ee.Classifier.smileRandomForest(100)
  .train({
    features: trainingPixel,
    classProperty: 'landcover', // The property name that contains the land cover classes
    inputProperties: image.bandNames() // Use all image bands for training
  });

// Classifying the image
var classifiedImage = image.classify(classifier);

// Visualizing the classification result
Map.addLayer(classifiedImage, {
  min: 1, max: 7, // Adjust these values based on the number of classes you have
  palette: ['#2495ff', '#d6ffa8', '#73a800', '#808080', '#FF0000', '#ffff00', '#000000'] // Your color palette
}, 'Classification', 0);

// Evaluating feature importance
var importances = classifier.explain().get('importance');

// Displaying band importance
print('6 - Band Importance:', importances);

// Extracting band importances
var importances = ee.Dictionary(classifier.explain().get('importance'));

// Calculating the total sum of importances
var totalImportance = ee.Number(importances.values().reduce(ee.Reducer.sum()));

// Normalizing importances to make the total sum 100%
var normalizedImportances = importances.map(function(key, value) {
    return ee.Number(value).divide(totalImportance).multiply(100);
});

// Printing normalized importances
print('7 - Normalized Importances:', normalizedImportances);

// Converting normalized importances to numerical lists
var bands = ee.List(normalizedImportances.keys());
var importancesList = bands.map(function(band) {
  return normalizedImportances.get(band);
});

// Creating a bar chart of band importances
var chart = ui.Chart.array.values({
  array: ee.Array(importancesList),
  axis: 0,
  xLabels: bands
}).setChartType('ColumnChart').setOptions({
  title: 'Band Importance - GEOBIA approach (WorldView 2)',
  titleTextStyle: {
    bold: true,
    fontSize: 16,
    italic: false
  },
  hAxis: {
    title: 'Bands',
    slantedText: true,
    slantedTextAngle: 45
  },
  vAxis: {
    title: 'Importance (%)'
  },
  legend: {position: 'none'},
  chartArea: {left: '10%', width: '80%'}
});

// Displaying the chart
print(chart);

// Accuracy evaluation
var evaluation = classifiedImage.sampleRegions({
  collection: testingSamples,
  properties: ['landcover'],
  tileScale: 16,
  scale: 0.5,
});

var confusionMatrix = evaluation.errorMatrix('landcover', 'classification');

print('8 - Confusion Matrix', confusionMatrix);
print('9 - Accuracy Evaluation', confusionMatrix.accuracy());
print('10 - Producer\'s Accuracy:', confusionMatrix.producersAccuracy());
print('11 - Consumer\'s Accuracy:', confusionMatrix.consumersAccuracy());
print('12 - Kappa:', confusionMatrix.kappa());
print('13 - F-score:', confusionMatrix.fscore());

// Legend for the classification

// Class names in the legend
var names = ['Water', 'Grass Vegetation', 'Tree Vegetation', 'Asphalt Pavement', 'Buildings', 'Exposed Soil', 'Shadows'];
// Set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Parameters for legend title
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});

// Adding the title
legend.add(legendTitle);
 
// Style for the legend
var makeRow = function(color, name) {
      var colorBox = ui.Label({
        style: {
          backgroundColor: '' + color,
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
for (var i = 0; i < 7; i++) {
  legend.add(makeRow(colorPalette[i], names[i]));
}  
// Adding the legend to the map
Map.add(legend);

// Define the desired dimensions for each part of the image
// var width = 17920; // width of each part of the image
// var height = 17920; // height of each part of the image

// Export the image divided into 10 parts
Export.image.toDrive({
  image: classifiedImage,
  description: 'WorldView2_Class_Geobia_CG',
  folder: 'Classificação Mestrado',
  scale: 0.5,
  maxPixels: 1e13,
 // fileDimensions: {
 //   'width': width,
 //   'height': height
 // }
});

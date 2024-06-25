var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos_Landsat8/2 - analise_pca');

var image = imageModule.mosaic2.select('B7','B11','B1','B6','B8','NDVI','B10','NDWI',
'B3','B4','B2','B5_savg','B5','pc5','pc2','Gradiente_NDVI','B5_shade','B5_corr','pc4','B5_dvar');

var importedSamples = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/amostras_CG');

var samples = importedSamples.randomColumn('random');
print('5 - How many samples do we have?', samples);

// Splitting the training and testing samples
var trainingSamples = samples.filter(ee.Filter.lt('random', 0.7));
var testingSamples = samples.filter(ee.Filter.gte('random', 0.7));

var colorPalette = [
    '#2495ff', // Water
    '#d6ffa8', // Grass Vegetation
    '#73a800', // Tree Vegetation
    '#808080', // Asphalt Pavement
    '#FF0000', // Buildings
    '#ffff00', // Exposed Soil
    '#000000'  // Shadow
];

// Training
var pixelTraining = image.sampleRegions({
  collection: trainingSamples,
  scale: 30,
  properties: ['landcover'],
  tileScale: 16
});

// Defining the classifier
var classifier = ee.Classifier.smileRandomForest(100)
  .train({
    features: pixelTraining,
    classProperty: 'landcover', // The property name containing land cover classes
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

// Displaying the band importances
print('6 - Band Importance:', importances);

// Extracting band importances
var importances = ee.Dictionary(classifier.explain().get('importance'));

// Calculating the total sum of importances
var totalImportance = ee.Number(importances.values().reduce(ee.Reducer.sum()));

// Normalizing the importances so that the total sum is 100%
var normalizedImportances = importances.map(function(key, value) {
    return ee.Number(value).divide(totalImportance).multiply(100);
});

// Printing normalized importances
print('7 - Normalized Importances:', normalizedImportances);

// Converting normalized importances to numeric lists
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
  title: 'Band Importance (Pixel-Based Approach, Landsat 8)',
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

// Accuracy assessment
var evaluation = classifiedImage.sampleRegions({
  collection: testingSamples,
  properties: ['landcover'],
  tileScale: 16,
  scale: 30,
});

var confusionMatrix = evaluation.errorMatrix('landcover', 'classification');

print('8 - Confusion Matrix', confusionMatrix);
print('9 - Accuracy Assessment', confusionMatrix.accuracy());
print('10 - Producer\'s Accuracy:', confusionMatrix.producersAccuracy());
print('11 - Consumer\'s Accuracy:', confusionMatrix.consumersAccuracy());
print('12 - Kappa:', confusionMatrix.kappa());
print('13 - F-score:', confusionMatrix.fscore());

// Legend for classification

// Class names in the legend
var names = ['Water', 'Grass Vegetation', 'Tree Vegetation', 'Asphalt Pavement', 'Buildings', 'Exposed Soil', 'Shadow'];
// Set position of the panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Legend title parameters
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

// Legend style
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
    style: { margin: '0 0 4px 6px' }
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

// Export the image divided into 10 parts
Export.image.toDrive({
  image: classifiedImage,
  description: 'Landsat8_Class_Pixel_CG',
  folder: 'Mestrado Classification',
  scale: 30,
  maxPixels: 1e13
  // fileDimensions: {
  //   'width': width,
  //   'height': height
  // }
});

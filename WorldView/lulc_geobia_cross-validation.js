var colorPalette = [
    '#2495ff', // Water
    '#d6ffa8', // Grass Vegetation
    '#73a800', // Tree Vegetation
    '#808080', // Asphalt Pavement
    '#FF0000', // Buildings
    '#ffff00', // Exposed Soil
    '#000000'  // Shadows
];

var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos_WorldViewe/3 - segmentacao');

var image = imageModule.mosaic3.select("b1_mean","b2_mean","b3_mean","b4_mean","b5_mean",
"b6_mean","b7_mean","b8_mean","NDVI_mean","NDWI_mean","b7_savg_mean","pc1_mean","pc2_mean",
"pc3_mean","pc4_mean","pc5_mean");

var importedSamples = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/amostras_CG');

var samples = importedSamples.randomColumn('random');
print('5 - How many samples do we have?', samples);

// Training
var trainingSamples = image.sampleRegions({
  collection: samples,
  scale: 0.5,
  properties: ['landcover'],
  tileScale: 16
});

// Function for k-fold cross-validation with 5 folds
function kFoldCv(data, k, seed) {
  data = ee.FeatureCollection(data);
  k = k || 5;
  k = ee.Number(k);
  seed = seed || false;

  var indices = data.aggregate_array('system:index').shuffle(seed);

  var folds = ee.List.sequence(0, k.subtract(1));
  folds = folds.map(function(fold) {
    var n = ee.Number(data.size());
    var foldSize = n.divide(k).floor();

    var start = ee.Number(fold).multiply(foldSize);
    var end = start.add(foldSize);

    var testIndices = indices.slice(start, end);
    var trainingIndices = indices.removeAll(testIndices);

    var testData = data.filter(ee.Filter.inList('system:index', testIndices));
    testData = testData.map(function(ft) {
      return ft.set({'fold': fold, 'role': 'test'});
    });

    var trainingData = data.filter(ee.Filter.inList('system:index', trainingIndices));
    trainingData = trainingData.map(function(ft) {
      return ft.set({'fold': fold, 'role': 'training'});
    });

    return trainingData.merge(testData);
  });

  var foldNames = ee.List.sequence(0, k.subtract(1)).map(function(index) {
    index = ee.Number(index).format('%d');
    return ee.String('Fold').cat(index);
  });

  return ee.Dictionary.fromLists(foldNames, folds);
}

// Number of folds
var k = 5;
var seed = 42;
var folds = kFoldCv(trainingSamples, k, seed);

print('folds:', folds);

var errorOOF = ee.List([]);

for (var i = 0; i < k; i++) {
  var foldName = 'Fold' + i.toString();
  var fold = ee.FeatureCollection(folds.get(foldName));

  var training = fold.filter(ee.Filter.eq('role', 'training'));
  var validation = fold.filter(ee.Filter.eq('role', 'test'));

  var trainingSize = training.size();
  var validationSize = validation.size();
  
  print('Training Fold ' + (i + 1) + ' Size: ', trainingSize);
  print('Validation Fold ' + (i + 1) + ' Size: ', validationSize);

  // If either set is empty, skip to the next fold
  if (trainingSize.getInfo() === 0 || validationSize.getInfo() === 0) {
    print('Fold ' + (i + 1) + ' skipped due to empty training or validation set');
    continue;
  }

  Map.addLayer(training.style({color: 'cyan', pointSize: 5, pointShape: 'circle'}), {}, 'Training Fold ' + (i + 1), 0);
  Map.addLayer(validation.style({color: 'yellow', pointSize: 5, pointShape: 'circle'}), {}, 'Validation Fold ' + (i + 1), 0);

  var classifier = ee.Classifier.smileRandomForest(100)
    .train({
      features: training,
      classProperty: 'landcover',
      inputProperties: image.bandNames()
    });

  // Calculating training error
  var trainingAccuracy = classifier.confusionMatrix().accuracy();
  print('Training Fold ' + (i + 1) + ' Accuracy: ', trainingAccuracy);

  // Classifying validation samples
  var validationClassified = validation.classify(classificador);

  // Calculating validation error
  var validationAccuracy = validationClassified.errorMatrix('landcover', 'classification');
  print('Validation Fold ' + (i + 1) + ' Accuracy: ', validationAccuracy.accuracy());
  print('Validation Fold ' + (i + 1) + ' Producers Accuracy: ', validationAccuracy.producersAccuracy());
  print('Validation Fold ' + (i + 1) + ' Consumers Accuracy: ', validationAccuracy.consumersAccuracy());
  print('Validation Fold ' + (i + 1) + ' Fscore Accuracy: ', validationAccuracy.fscore());

  errorOOF = errorOOF.add(validationAccuracy.accuracy());

  // Classifying the image
  var classifiedImage = image.classify(classificador);
  Map.addLayer(classifiedImage, {
    min: 1, max: 7,
    palette: colorPalette
  }, 'Classified Fold ' + (i + 1), 0);
}

print('Mean OOF error: ', ee.Array(errorOOF).reduce(ee.Reducer.mean(), [0]));

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

var paleta_cores = [
    '#2495ff', // Água
    '#d6ffa8', // Vegetação Rasteira
    '#73a800', // Vegetação Arbórea
    '#808080', // Pavimento Asfáltico
    '#FF0000', // Edificações
    '#ffff00', // Solo Exposto
    '#000000'  // Sombra
];

var imagemModulo = require('users/Jhonnattan_Oliveira/Mestrado:modulos_Landsat8/3 - segmentacao');

var imagem = imagemModulo.mosaic3.select("B1_mean","B2_mean","B3_mean","B4_mean","B5_mean","B6_mean",
 "B7_mean","B8_mean","B9_mean","B10_mean","B11_mean","NDVI_mean","Gradiente_NDVI_mean","NDWI_mean",
 "B5_asm_mean","B5_contrast_mean","B5_corr_mean","B5_var_mean","B5_idm_mean","B5_savg_mean","B5_svar_mean",
 "B5_sent_mean","B5_ent_mean","B5_dvar_mean","B5_dent_mean","B5_imcorr1_mean","B5_imcorr2_mean","B5_maxcorr_mean",
 "B5_diss_mean","B5_inertia_mean","B5_shade_mean","B5_prom_mean","pc1_mean","pc2_mean","pc3_mean","pc4_mean","pc5_mean");

var imp_amostras = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/amostras_CG');


var amostras = imp_amostras.randomColumn('random');
print('5 - Quantas amostras temos?',amostras);

//Treinando
var amostrasPixel = imagem.sampleRegions({
  collection: amostras,
  scale: 30,
  properties: ['landcover'],
  tileScale: 16
});

//Função para a validação cruzada k-folf 5
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

// Número de folds
var k = 5;
var seed = 42;
var folds = kFoldCv(amostrasPixel, k, seed);

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

  // Se qualquer conjunto estiver vazio, continue para o próximo fold
  if (trainingSize.getInfo() === 0 || validationSize.getInfo() === 0) {
    print('Fold ' + (i + 1) + ' skipped due to empty training or validation set');
    continue;
  }

  Map.addLayer(training.style({color: 'cyan', pointSize: 5, pointShape: 'circle'}), {}, 'Training Fold ' + (i + 1), 0);
  Map.addLayer(validation.style({color: 'yellow', pointSize: 5, pointShape: 'circle'}), {}, 'Validation Fold ' + (i + 1), 0);

  var classificador = ee.Classifier.smileRandomForest(100)
    .train({
      features: training,
      classProperty: 'landcover',
      inputProperties: imagem.bandNames()
    });

  // Calculando o erro de treinamento
  var trainingAccuracy = classificador.confusionMatrix().accuracy();
  print('Training Fold ' + (i + 1) + ' Accuracy: ', trainingAccuracy);

  // Classificando as amostras de validação
  var validationClassified = validation.classify(classificador);

  // Calculando o erro de validação
  var validationAccuracy = validationClassified.errorMatrix('landcover', 'classification');
  print('Validation Fold ' + (i + 1) + ' Accuracy: ', validationAccuracy.accuracy());
  print('Validation Fold ' + (i + 1) + ' Producers Accuracy: ', validationAccuracy.producersAccuracy());
  print('Validation Fold ' + (i + 1) + ' Consumers Accuracy: ', validationAccuracy.consumersAccuracy());
  print('Validation Fold ' + (i + 1) + ' Fscore Accuracy: ', validationAccuracy.fscore());

  errorOOF = errorOOF.add(validationAccuracy.accuracy());

  // Classificando a imagem
  var imagemClassificada = imagem.classify(classificador);
  Map.addLayer(imagemClassificada, {
    min: 1, max: 7,
    palette: paleta_cores
  }, 'Classified Fold ' + (i + 1), 0);
}

print('Mean OOF error: ', ee.Array(errorOOF).reduce(ee.Reducer.mean(), [0]));

//Legenda para a classificação

//Nome das classes na legenda
var names = ['Agua','Vegetacao Rasteira','Vegetacao Arborea','Pavimento Asfáltico','Edificações','Solo Exposto','Sombra'];
// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
//Parametros titulo da legenda
var legendTitle = ui.Label({
  value: 'Legenda',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});

// Adicionando o titulo 
legend.add(legendTitle);
 
// Estilo da legenda
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
  legend.add(makeRow(paleta_cores[i], names[i]));
  }  
//Adiciona a legenda ao mapa
Map.add(legend);

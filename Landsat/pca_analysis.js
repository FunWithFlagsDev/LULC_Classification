var finalImage = require('users/Jhonnattan_Oliveira/Mestrado:modulos_Landsat8/1 - calculo_indices_espectrais');

var roi = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/LIMITE_CG');

var image = finalImage.mosaic1;

var geometry = roi;
var scale = 30;

// Run the PCA calculation function
var pca = PCA(image);

var variance = pca.toDictionary();

var pca = PCA(image).select(['pc1', 'pc2', 'pc3', 'pc4', 'pc5']);

// Extensive PCA calculation may expire when displayed on the map
// Export the results and import them back
Export.image.toAsset({
  image: pca,
  description: 'Principal_Components_Image',
  assetId: 'users/Jhonnattan_Oliveira/CG-MS/CG_5pca30',
  region: geometry,
  scale: scale,
  maxPixels: 1e10
});

// Once the export is complete, import the asset
var pcaImported = ee.Image('users/Jhonnattan_Oliveira/CG-MS/CG_5pca30');
var pcaVisParams = { bands: ['pc1', 'pc2', 'pc3'], min: -2, max: 2 };
Map.addLayer(pcaImported, pcaVisParams, 'Principal Components', 0);

// Preparing the final image, adding the Principal Component Analysis (PCA)
var finalImage2 = image.addBands(pcaImported);
print('4 - Final Image 2', finalImage2);

// Export the processed final image as an object
exports.mosaic2 = finalImage2;


//************************************************************************** 
// Function to calculate principal components
// Adapted from https://developers.google.com/earth-engine/guides/arrays_eigen_analysis
//************************************************************************** 
function PCA(maskedImage) {
  var image = maskedImage.unmask();
  var scale = scale;
  var region = geometry;
  var bandNames = image.bandNames();
  
  // Mean center the data to enable a faster covariance reducer
  // and an SD stretch of the principal components.
  var meanDict = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: region,
    scale: scale,
    maxPixels: 1e13,
    tileScale: 16
  });
  var means = ee.Image.constant(meanDict.values(bandNames));
  var centered = image.subtract(means);
  
  // This helper function returns a list of new band names.
  var getNewBandNames = function(prefix) {
    var seq = ee.List.sequence(1, bandNames.length());
    return seq.map(function(b) {
      return ee.String(prefix).cat(ee.Number(b).int());
    });
  };
  
  // This function accepts mean centered imagery, a scale, and
  // a region in which to perform the analysis. It returns the
  // Principal Components (PC) in the region as a new image.
  var getPrincipalComponents = function(centered, scale, region) {
    // Collapse the bands of the image into a 1D array per pixel.
    var arrays = centered.toArray();
    
    // Compute the covariance of the bands within the region.
    var covar = arrays.reduceRegion({
      reducer: ee.Reducer.centeredCovariance(),
      geometry: region,
      scale: scale,
      maxPixels: 1e13,
      tileScale: 16
    });

    // Get the 'array' covariance result and cast to an array.
    // This represents the band-to-band covariance within the region.
    var covarArray = ee.Array(covar.get('array'));

    // Perform an eigen analysis and slice apart the values and vectors.
    var eigens = covarArray.eigen();

    // This is a P-length vector of Eigenvalues.
    var eigenValues = eigens.slice(1, 0, 1);
    
    // Compute the Percentage Variance of each component
    // This will allow us to decide how many components capture
    // most of the variance in the input
    var eigenValuesList = eigenValues.toList().flatten();
    var total = eigenValuesList.reduce(ee.Reducer.sum());

    var percentageVariance = eigenValuesList.map(function(item) {
      var component = eigenValuesList.indexOf(item).add(1).format('%02d');
      var variance = ee.Number(item).divide(total).multiply(100).format('%.2f');
      return ee.List([component, variance]);
    });
    
    // Create a dictionary that will be used to set properties on the final image
    var varianceDict = ee.Dictionary(percentageVariance.flatten());
    
    // This is a PxP matrix with eigenvectors in rows.
    var eigenVectors = eigens.slice(1, 1);
    
    // Convert the array image to 2D arrays for matrix computations.
    var arrayImage = arrays.toArray(1);

    // Left multiply the image array by the matrix of eigenvectors.
    var principalComponents = ee.Image(eigenVectors).matrixMultiply(arrayImage);

    // Turn the square roots of the Eigenvalues into a P-band image.
    // Call abs() to turn negative eigenvalues to positive before
    // taking the square root
    var sdImage = ee.Image(eigenValues.abs().sqrt())
      .arrayProject([0]).arrayFlatten([getNewBandNames('sd')]);

    // Turn the PCs into a P-band image, normalized by SD.
    return principalComponents
      // Throw out an unneeded dimension, [[]] -> [].
      .arrayProject([0])
      // Make the one-band array image a multi-band image, [] -> image.
      .arrayFlatten([getNewBandNames('pc')])
      // Normalize the PCs by their SDs.
      .divide(sdImage)
      .set(varianceDict);
  };
  
  var pcImage = getPrincipalComponents(centered, scale, region);
  return pcImage.mask(maskedImage.mask());
}

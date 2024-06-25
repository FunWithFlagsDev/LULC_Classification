var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos_WorldViewe/2 - analise_pca');

var image = imageModule.mosaic2;

// Define parameters for SNIC
var segmentation = ee.Algorithms.Image.Segmentation.SNIC({
  image: image,
  compactness: 0,
  connectivity: 8,
  neighborhoodSize: 32,
  size: 2,
});

// Visualize the generated clusters
Map.addLayer(segmentation.randomVisualizer(), {}, 'clusters', 0);
print('5 - Final Image 3', segmentation);

// Export the final processed image as an object
exports.mosaic3 = segmentation;

var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos_Landsat8/2 - analise_pca');

var image = imageModule.mosaico2;

// Define the parameters for SNIC
var segmentation = ee.Algorithms.Image.Segmentation.SNIC({
  image: image,
  compactness: 0,
  connectivity: 8,
  neighborhoodSize: 48,
  size: 2,
});

// Visualizing the Generated Clusters
Map.addLayer(segmentation.randomVisualizer(), {}, 'clusters', 0);
print('5 - Final Image 3', segmentation);

// Export the processed final image as an object
exports.mosaic3 = segmentation;

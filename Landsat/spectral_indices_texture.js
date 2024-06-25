/************************** PREPARING THE DATASET **************************/ 

// Defining the area of interest
Map.addLayer(roi.draw('blue'), {}, 'ROI', false);
Map.centerObject(roi, 13);

// Base image to be classified
var Landsat8 = ee.Image('LANDSAT/LC08/C02/T1_TOA/LC08_225074_20190624');
var image = Landsat8.select('B.*').clip(roi);

print('1 - Landsat 8 Image', image);

// Creating visualizations for the Landsat 8 image
Map.addLayer(image, { min: 0.0, max: 0.25, bands: ['B4', 'B3', 'B2'] }, 'RGB 543', 0);
Map.addLayer(image, { min: 0.0, max: 0.43, bands: ['B5', 'B4', 'B3'] }, 'RGB 753', 0);

// Calculating auxiliary data

// NDVI Index
var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
Map.addLayer(ndvi, { min: -0.75, max: 0.76, palette: ["red", "orange", "yellow", "green"] }, "NDVI", 0);

// NDVI Gradient
var gradienteNDVI = ndvi.gradient().pow(2).reduce('sum').sqrt().rename('Gradiente_NDVI');
Map.addLayer(gradienteNDVI, { min: 0, max: 0.004 }, 'NDVI Gradient', 0);

// NDWI Index
var ndwi = image.normalizedDifference(['B3', 'B5']).rename('NDWI');
Map.addLayer(ndwi, { min: -0.65, max: 0.0, palette: ["white", "gray", "cyan", "blue"] }, "NDWI", 0);

// Gray Level Co-occurrence Matrix - Texture Metrics
var glcm = image.select('B5').unitScale(0, 0.30).multiply(100).toInt().glcmTexture({ size: 1, average: true });

print('2 - GLCM', glcm);

// ASM - Reflects the uniformity of the distribution of pixel values. Higher values indicate a more uniform distribution and therefore a more homogeneous texture.
var asm = glcm.select('B5_asm');
Map.addLayer(asm, { min: 0, max: 0.5, palette: ['0000FF', 'FF0000'] }, 'ASM', 0);

// Contrast - Measures local variation in the image. Higher values indicate greater differences in intensity between a pixel and its neighbors.
var contrast = glcm.select('B5_contrast');
Map.addLayer(contrast, { min: 2, max: 955, palette: ['0000FF', 'FF0000'] }, 'Contrast', 0);

// Correlation - Measures the linear correlation between pixel values in the image. Values close to 1 or -1 indicate strong positive or negative correlation, respectively.
var correlation = glcm.select('B5_corr');
Map.addLayer(correlation, { min: -0.99, max: 0.39, palette: ['0000FF', 'FF0000'] }, 'Correlation', 0);

// Variance - Measures the dispersion of pixel intensity values relative to the mean.
var variance = glcm.select('B5_var');
Map.addLayer(variance, { min: 0.5, max: 424, palette: ['0000FF', 'FF0000'] }, 'Variance', 0);

// Homogeneity - Measures the closeness of elements in the GLCM to the diagonal of the matrix. Higher values indicate less contrast and greater homogeneity in the image.
var homogeneity = glcm.select('B5_idm');
Map.addLayer(homogeneity, { min: 0, max: 0.49, palette: ['0000FF', 'FF0000'] }, 'Homogeneity', 0);

// Sum Average - Measures the average of the sum of GLCM values, interpreted as the mean of image intensity values.
var savg = glcm.select('B5_savg');
Map.addLayer(savg, { min: 89, max: 335, palette: ['0000FF', 'FF0000'] }, 'SAVG', 0);

// Sum Variance - Measures the variance of the sum of GLCM values, representing the dispersion of image intensity values relative to the mean sum.
var svar = glcm.select('B5_svar');
Map.addLayer(svar, { min: 89, max: 335, palette: ['0000FF', 'FF0000'] }, 'SVAR', 0);

// Sum Entropy - Measures the uncertainty associated with image intensity values. Higher entropy values indicate greater complexity or disorder in the image.
var sent = glcm.select('B5_sent');
Map.addLayer(sent, { min: 0, max: 1.6, palette: ['0000FF', 'FF0000'] }, 'SENT', 0);

// Entropy - Higher entropy values indicate greater complexity or disorder in image texture.
var entropy = glcm.select('B5_ent');
Map.addLayer(entropy, { min: 0.5, max: 2.3, palette: ['0000FF', 'FF0000'] }, 'Entropy', 0);

// Difference Variance (DVAR) - Measures the variance of pixel values relative to the mean intensity difference. High values may indicate significant texture variation.
var dvar = glcm.select('B5_dvar');
Map.addLayer(dvar, { min: 0, max: 10, palette: ['0000FF', 'FF0000'] }, 'DVAR', 0);

// Difference Entropy (DENT) - Measures the amount of information or complexity in texture based on the intensity difference between pixels. High values indicate high texture complexity or variability.
var dent = glcm.select('B5_dent');
Map.addLayer(dent, { min: 0, max: 2.5, palette: ['0000FF', 'FF0000'] }, 'DENT', 0);

// Information Measures of Correlation - Provide measures of texture complexity based on informational correlations in the GLCM.
var imcorr1 = glcm.select('B5_imcorr1');
Map.addLayer(imcorr1, { min: -1, max: 1, palette: ['0000FF', 'FF0000'] }, 'IMCORR1', 0);

var imcorr2 = glcm.select('B5_imcorr2');
Map.addLayer(imcorr2, { min: -1, max: 1, palette: ['0000FF', 'FF0000'] }, 'IMCORR2', 0);

// Maximal Correlation Coefficient (MAXCORR) - Reflects the maximum correlation between pixel values in the image for a given displacement. Higher values indicate stronger correlation.
var maxcorr = glcm.select('B5_maxcorr');
Map.addLayer(maxcorr, { min: -1, max: 1, palette: ['0000FF', 'FF0000'] }, 'MAXCORR', 0);

// Dissimilarity (DISS) - Provides a measure of dissimilarity between neighboring pixel values. High dissimilarity values indicate significant texture variation between neighboring pixels.
var diss = glcm.select('B5_diss');
Map.addLayer(diss, { min: 0, max: 20, palette: ['0000FF', 'FF0000'] }, 'DISS', 0);

// Inertia (INERTIA) - Also known as second moment contrast, this metric measures the squared intensity variation. Higher values may indicate areas with more pronounced contrast and complex texture.
var inertia = glcm.select('B5_inertia');
Map.addLayer(inertia, { min: 0, max: 500, palette: ['0000FF', 'FF0000'] }, 'INERTIA', 0);

// Shade (SHADE) - Calculates a measure of GLCM skewness. High values may indicate skewness in the intensity distribution in the image.
var shade = glcm.select('B5_shade');
Map.addLayer(shade, { min: -10, max: 10, palette: ['0000FF', 'FF0000'] }, 'SHADE', 0);

// Prominence (PROM) - Reflects the prominence of values in the GLCM. High values may indicate a predominance of certain texture patterns in the image.
var prom = glcm.select('B5_prom');
Map.addLayer(prom, { min: -10, max: 10, palette: ['0000FF', 'FF0000'] }, 'PROM', 0);

// Preparing the final image, which contains all the relevant bands for classification
var finalImage = image.addBands(ndvi).addBands(gradienteNDVI).addBands(ndwi).addBands(glcm);
print('3 - Final Image 1', finalImage);

// Export the processed final image as an object
exports.mosaic1 = finalImage;

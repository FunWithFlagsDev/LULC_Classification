/*
This module calculates spectral indices and texture metrics for the WorldView 2 image 
for the urban perimeter of Campo Grande - MS.

Use the function require('users/Jhonnattan_Oliveira/Mestrado:modulos/calculo_indices_metricas') 
to use it.

WorldView-2 image characteristics, year 2019:

- Spatial resolution of 0.5 m.

Available bands:
- b1: Coastal Blue
- b2: Blue
- b3: Green
- b4: Yellow
- b5: Red
- b6: Red Edge
- b7: NIR 1
- b8: NIR 2

Calculated indices and metrics:

- NDVI: Normalized Difference Vegetation Index
- NDWI: Normalized Difference Water Index
- GLCM: Gray Level Co-occurrence Matrix Textures

Exported Features:
- mosaic: Image mosaic with original bands and new calculated bands.

Usage Example:
var imageModule = require('users/Jhonnattan_Oliveira/Mestrado:modulos/calculo_indices_metricas');
var processedImage = imageModule.finalProcessedImage;
Map.addLayer(processedImage);

/************************** PREPARING THE DATASET **************************/ 

// Defining area of interest

var roi = ee.FeatureCollection('users/Jhonnattan_Oliveira/CG-MS/LIMITE_CG');
Map.addLayer(roi.draw('blue'), {}, 'ROI', false);
Map.centerObject(roi, 13);

// Base image to be classified

var WorldView2 = ee.Image('users/arqjhonnattan/asset_id');
var image = WorldView2.clip(roi);

print('1 - WorldView Image', image);

// Creating visualizations for the WorldView-2 image

Map.addLayer(image, { min: 13, max: 198, bands: ['b5', 'b3', 'b2']}, 'RGB 543', 0);
Map.addLayer(image, { min: 13, max: 198, bands: ['b7', 'b5', 'b3']}, 'RGB 753', 0);

// Calculating auxiliary data

// NDVI Index

var ndvi = image.normalizedDifference(['b7', 'b5']).rename('NDVI');
Map.addLayer(ndvi, {min: -0.78, max: 0.76, palette: ["red", "orange", "yellow", "green"]}, "NDVI", 0);

// NDVI Gradient

var ndviGradient = ndvi.gradient().pow(2).reduce('sum').sqrt().rename('NDVI_Gradient');
Map.addLayer(ndviGradient, {min: 0, max: 0.004}, 'NDVI Gradient', 0);

// NDWI Index

var ndwi = image.normalizedDifference(['b3', 'b8']).rename('NDWI');
Map.addLayer(ndwi, {min: -0.66, max: 0.73, palette: ["white", "gray", "cyan", "blue"]}, "NDWI", 0);

// Gray Level Co-occurrence Matrix - Texture Metrics

var glcm = image.select('b7').glcmTexture({size: 1, average: true});

print('2 - GLCM', glcm);

/* ASM - Reflects the uniformity of pixel value distribution. Higher values indicate a 
more uniform distribution and thus a more homogeneous texture. */

var asm = glcm.select('b7_asm');
Map.addLayer(asm, {min: 0, max: 0.5, palette: ['0000FF', 'FF0000']}, 'ASM', 0);

/* Contrast - Measures local variation in the image. Higher values indicate greater differences in 
intensity between a pixel and its neighbors. */

var contrast = glcm.select('b7_contrast');
Map.addLayer(contrast, {min: 0, max: 4450, palette: ['0000FF', 'FF0000']}, 'Contrast', 0);

/* Correlation - Measures the linear correlation between pixel values in the image. Values close 
to 1 or -1 indicate strong positive or negative correlation, respectively. */

var correlation = glcm.select('b7_corr');
Map.addLayer(correlation, {min: -1, max: 0.4, palette: ['0000FF', 'FF0000']}, 'Correlation', 0);

/* Variance measures the dispersion of pixel intensity values relative to the mean. */

var variance = glcm.select('b7_var');
Map.addLayer(variance, {min: 2, max: 1465, palette: ['0000FF', 'FF0000']}, 'Variance', 0);

/* Homogeneity - is a measure of the closeness of the GLCM elements to the diagonal of the matrix. 
Higher values indicate less contrast and greater homogeneity in the image. */

var homogeneity = glcm.select('b7_idm');
Map.addLayer(homogeneity, {min: 0, max: 0.4, palette: ['0000FF', 'FF0000']}, 'Homogeneity', 0);

/* The sum average of GLCM values, which can be interpreted as the mean of the 
image intensity values. */

var savg = glcm.select('b7_savg');
Map.addLayer(savg, {min: 89, max: 335, palette: ['0000FF', 'FF0000']}, 'SAVG', 0);

/* The sum variance of GLCM values, which is a measure of dispersion of 
image intensity values relative to the sum mean. */

var svar = glcm.select('b7_svar');
Map.addLayer(svar, {min: 89, max: 335, palette: ['0000FF', 'FF0000']}, 'SVAR', 0);

/* Sum entropy measures the uncertainty associated with the image intensity values. 
High entropy values indicate greater complexity or disorder in the image. */

var sent = glcm.select('b7_sent');
Map.addLayer(sent, {min: 0, max: 1.6, palette: ['0000FF', 'FF0000']}, 'SENT', 0);

/* High entropy values indicate greater complexity or disorder in the image texture. */

var entropy = glcm.select('b7_ent');
Map.addLayer(entropy, {min: 0.5, max: 2.3, palette: ['0000FF', 'FF0000']}, 'Entropy', 0);

/* Difference Variance (DVAR) - Measures the variation of pixel values relative to the mean intensity difference. 
High values may indicate a texture with significant variation. */

var dvar = glcm.select('b7_dvar');
Map.addLayer(dvar, {min: 0, max: 10, palette: ['0000FF', 'FF0000']}, 'DVAR', 0);

/* Difference Entropy (DENT) - Measures the amount of information or complexity in the texture based on the intensity difference between pixels. 
High values indicate high complexity or variability in the texture. */

var dent = glcm.select('b7_dent');
Map.addLayer(dent, {min: 0, max: 2.5, palette: ['0000FF', 'FF0000']}, 'DENT', 0);

/* Information Measures of Correlation - Provide measures of texture complexity based on informational correlations in the GLCM. */

var imcorr1 = glcm.select('b7_imcorr1');
Map.addLayer(imcorr1, {min: -1, max: 1, palette: ['0000FF', 'FF0000']}, 'IMCORR1', 0);

var imcorr2 = glcm.select('b7_imcorr2');
Map.addLayer(imcorr2, {min: -1, max: 1, palette: ['0000FF', 'FF0000']}, 'IMCORR2', 0);

/* Maximal Correlation Coefficient (MAXCORR) - Reflects the maximum correlation between pixel values for a given offset. 
High values indicate a stronger correlation. */

var maxcorr = glcm.select('b7_maxcorr');
Map.addLayer(maxcorr, {min: -1, max: 1, palette: ['0000FF', 'FF0000']}, 'MAXCORR', 0);

/* Dissimilarity (DISS) - Provides a measure of dissimilarity between neighboring pixel values. 
High dissimilarity values indicate significant variation in texture between neighboring pixels. */

var diss = glcm.select('b7_diss');
Map.addLayer(diss, {min: 0, max: 20, palette: ['0000FF', 'FF0000']}, 'DISS', 0);

/* Inertia (INERTIA) - Also known as the second moment contrast, this metric measures the squared intensity variation. 
Higher values may indicate areas with more pronounced contrast and more complex texture. */

var inertia = glcm.select('b7_inertia');
Map.addLayer(inertia, {min: 0, max: 500, palette: ['0000FF', 'FF0000']}, 'INERTIA', 0);

/* Shade (SHADE) - Calculates a measure of the GLCM asymmetry. High values may indicate an asymmetry in the distribution of intensities in the image. */

var shade = glcm.select('b7_shade');
Map.addLayer(shade, {min: -10, max: 10, palette: ['0000FF', 'FF0000']}, 'SHADE', 0);

/* Prominence (PROM) - Reflects the prominence of values in the GLCM. High values may indicate a predominance of certain texture patterns in the image. */

var prom = glcm.select('b7_prom');
Map.addLayer(prom, {min: -10, max: 10, palette: ['0000FF', 'FF0000']}, 'PROM', 0);

// Preparing the final image, it contains all relevant bands for classification

var finalImage = image.addBands(ndvi).addBands(ndviGradient).addBands(ndwi).addBands(glcm);
print('3 - Final Image 1', finalImage);

// Exporting the final processed image as an object

exports.mosaic1 = finalImage;

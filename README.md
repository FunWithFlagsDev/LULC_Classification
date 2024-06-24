# LULC_Classification


Urban Land Use and Land Cover Classification

This repository contains the source code and data used in my master's thesis, which addresses the classification of land use and cover in urban areas. 
The work explores two image classification methodologies: PIXEL approach and GEOBIA (Geographic Object-Based Image Analysis).


Methodologies:

PIXEL: Classification based on each individual pixel of the image.
GEOBIA: Uses image segments for classification, considering the spatial relationship between pixels.


Validation:
To ensure the robustness and accuracy of the classifications, two validation methods were implemented:

Holdout: Partitioning the data set into training and test subsets.
K-fold Cross Validation: A method that divides the data set into k subsets and performs training and testing iteratively, ensuring that each subset is used for both training and testing.


Repository Contents:

Implementation codes for classifications
Validation scripts
Data set used

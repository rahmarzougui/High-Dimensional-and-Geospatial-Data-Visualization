# Dataset Setup Instructions

## Dataset Files Required

This visualization requires 3 point datasets to be placed in the `public/assets/datasets/points/` folder:

1. `point_world_A.geo.json` - Airports dataset
2. `point_world_B.geo.json` - Major world cities dataset  
3. `point_world_C.geo.json` - Earthquakes dataset

## Setup Steps

1. Copy the dataset files from `../../assets/datasets/points/` to `public/assets/datasets/points/`

2. The files should be accessible at:
   - `/assets/datasets/points/point_world_A.geo.json`
   - `/assets/datasets/points/point_world_B.geo.json`
   - `/assets/datasets/points/point_world_C.geo.json`

3. The visualization will automatically load the selected dataset when you change the dropdown.

## Note

If the datasets are already in the root `assets/` folder, you can either:
- Copy them to `public/assets/datasets/points/` for Vite to serve them
- Or update the paths in `src/components/MapDisplay.tsx` to point to the correct location


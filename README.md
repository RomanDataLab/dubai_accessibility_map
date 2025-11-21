# Dubai Map

A WebGL-based 3D visualization of buildings in Dubai, the UAE, extracted from OpenStreetMap using the Overpass API.

## Features

- 🏢 Fetches 3D building data from OpenStreetMap via Overpass API
- 🎨 Renders buildings in 3D using Three.js and WebGL
- 🖱️ Interactive camera controls (rotate, pan, zoom)
- 📊 Shows building count and loading status

## Getting Started

### Option 1: Using a Local Server (Recommended)

1. Install dependencies (optional, for local server):
```bash
npm install
```

2. Start a local server:
```bash
npm start
```

Or use any other local server:
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# PHP
php -S localhost:8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

### Option 2: Direct File Access

You can also open `index.html` directly in your browser, but note that some browsers may have CORS restrictions when fetching from Overpass API.

## Usage

- **Left Click + Drag**: Rotate the camera around the scene
- **Right Click + Drag**: Pan the camera
- **Scroll Wheel**: Zoom in/out

## How It Works

1. **Data Fetching**: Queries the Overpass API for buildings in Almere with height information
2. **Data Processing**: Extracts building coordinates and heights from OSM data
3. **3D Rendering**: Creates 3D geometries using Three.js and displays them in a WebGL canvas

## Technical Details

- Uses Three.js for WebGL rendering
- Converts geographic coordinates (lat/lon) to local 3D coordinates
- Extrudes building footprints to create 3D shapes based on height data
- Falls back to default heights if building height is not specified in OSM

## Exporting Buildings as GeoJSON

To export buildings from Dubai Waterfront as GeoJSON with all properties:

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the export script:
```bash
python get_dubai_buildings.py
```

This will create a GeoJSON file (e.g., `dubai_waterfront_buildings_20240115_123456.geojson`) in the project directory containing all buildings with their complete properties from OpenStreetMap.

The script:
- Fetches buildings from Dubai Waterfront area using Overpass API
- Extracts all available properties (tags) from each building
- Converts to GeoJSON format with polygon geometries
- Saves the file with a timestamp in the filename

## Notes

- The Overpass API may take some time to respond, especially for large areas
- Buildings without height data will use a default height of 10 meters
- The visualization shows buildings with height or min_height tags in OpenStreetMap
- The Python script extracts buildings directly from OpenStreetMap, not from Cesium tileset

## License

MIT


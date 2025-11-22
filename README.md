# Dubai 3D Accessibility Map

A WebGL-based 3D visualization of Dubai's accessibility infrastructure, including buildings, metro stations, tram stations, monorail stations, schools, and isochrones (walking distance areas).

## Features

- 🏢 Displays 3D building data from Cesium Ion
- 🚇 Metro stations with color-coded icons (Red Line, Green Line)
- 🚊 Tram stations with orange icons
- 🚈 Monorail stations with blue icons
- 🏫 Schools with yellow icons
- 🚶 Isochrone visualization (5, 10, 15 minute walking distances)
- 🎨 Interactive 3D map using Cesium
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

1. **3D Buildings**: Loads 3D building data from Cesium Ion for Dubai
2. **Station Data**: Loads metro, tram, and monorail station locations from CSV files
3. **School Data**: Loads school locations from Dubai Open Data Portal
4. **Isochrones**: Generates walking distance areas using OpenRouteService API
5. **3D Rendering**: Displays everything in an interactive 3D map using Cesium

## Technical Details

- Uses Cesium for 3D globe rendering
- Custom icon generation for stations (metro, tram, monorail) using HTML5 Canvas
- School icons loaded from SVG and colorized
- Isochrone data generated using OpenRouteService API
- Station data from Dubai Open Data Portal
- Deployed on Vercel with proper static asset handling

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

## Data Sources

- **3D Buildings**: Cesium Ion
- **Metro/Tram/Monorail Stations**: Dubai Open Data Portal
- **Schools**: Dubai Open Data Portal (KHDA)
- **Isochrones**: OpenRouteService API

## Notes

- Requires Cesium Ion access token (configured in app.js)
- Requires OpenRouteService API key for isochrone generation
- Station icons are dynamically generated using Canvas API
- Isochrone generation may take time depending on the number of stations

## License

MIT


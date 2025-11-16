import { CESIUM_CONFIG, ORS_CONFIG } from './config.js';

// Verify config is loaded
console.log('App.js: ORS_CONFIG check:', {
    hasConfig: !!ORS_CONFIG,
    hasApiKey: !!ORS_CONFIG?.apiKey,
    apiKey: ORS_CONFIG?.apiKey ? ORS_CONFIG.apiKey.substring(0, 20) + '...' : 'MISSING',
    url: ORS_CONFIG?.url
});

if (!ORS_CONFIG || !ORS_CONFIG.apiKey) {
    console.error('ERROR: OpenRouteService API key not found in config.js');
    console.error('ORS_CONFIG:', ORS_CONFIG);
    console.error('window.__ENV__:', window.__ENV__);
}

// Dubai Marina tram station coordinates
const DUBAI_CENTER = {
    lat: 25.080803,
    lon: 55.146909
};

// Get color based on building age (for legend)
function getColorByAge(year) {
    const currentYear = new Date().getFullYear();
    
    if (!year) {
        // Unknown age - gray
        return Cesium.Color.GRAY.withAlpha(0.7);
    }
    
    const age = currentYear - year;
    
    // Color scheme based on age ranges
    if (age >= 150) {
        // Very old (pre-1870s) - Dark brown/red
        return Cesium.Color.fromBytes(139, 69, 19, 200); // SaddleBrown
    } else if (age >= 100) {
        // Old (1870s-1920s) - Brown/red
        return Cesium.Color.fromBytes(205, 92, 92, 200); // IndianRed
    } else if (age >= 70) {
        // Mid-old (1930s-1950s) - Orange/red
        return Cesium.Color.fromBytes(255, 140, 0, 200); // DarkOrange
    } else if (age >= 50) {
        // Mid-century (1960s-1970s) - Yellow/orange
        return Cesium.Color.fromBytes(255, 215, 0, 200); // Gold
    } else if (age >= 30) {
        // Late 20th century (1980s-1990s) - Light yellow/green
        return Cesium.Color.fromBytes(154, 205, 50, 200); // YellowGreen
    } else if (age >= 15) {
        // Early 21st century (2000s-2010s) - Green
        return Cesium.Color.fromBytes(50, 205, 50, 200); // LimeGreen
    } else {
        // Very recent (2010s+) - Bright green/cyan
        return Cesium.Color.fromBytes(0, 191, 255, 200); // DeepSkyBlue
    }
}

// Get color hex string for legend
function getColorHex(year) {
    const color = getColorByAge(year);
    const r = Math.floor(color.red * 255);
    const g = Math.floor(color.green * 255);
    const b = Math.floor(color.blue * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Create Cesium3DTileStyle for buildings by height (since age data isn't available)
// Cesium OSM Buildings doesn't consistently include construction date/age data
function createBuildingStyle() {
    // Since age data isn't available in Cesium OSM Buildings,
    // we'll colorize by building height instead
    // Handle undefined height values safely
    return new Cesium.Cesium3DTileStyle({
        defines: {
            // Safely extract height, default to 0 if undefined/null
            buildingHeight: "isNaN(Number(\${height})) ? 0 : Number(\${height})"
        },
        color: {
            conditions: [
                // Very tall buildings (100m+) - Dark blue
                [`\${buildingHeight} >= 100`, `color("rgb(25, 25, 112)")`],
                // Tall buildings (50-100m) - Blue
                [`\${buildingHeight} >= 50`, `color("rgb(0, 100, 200)")`],
                // Medium-tall buildings (30-50m) - Cyan
                [`\${buildingHeight} >= 30`, `color("rgb(0, 191, 255)")`],
                // Medium buildings (15-30m) - Light green
                [`\${buildingHeight} >= 15`, `color("rgb(144, 238, 144)")`],
                // Low buildings (5-15m) - Yellow
                [`\${buildingHeight} >= 5`, `color("rgb(255, 215, 0)")`],
                // Very low buildings (<5m but >0) - Orange
                [`\${buildingHeight} > 0`, `color("rgb(255, 140, 0)")`],
                // Unknown height (0 or undefined) - Gray (default)
                ['true', `color("${getColorHex(null)}")`]
            ]
        }
    });
}

// Initialize Cesium viewer
async function initCesium() {
    // Set Cesium Ion access token from config
    Cesium.Ion.defaultAccessToken = CESIUM_CONFIG.accessToken;
    
    // Create terrain provider asynchronously
    let terrainProvider;
    try {
        terrainProvider = await Cesium.createWorldTerrainAsync();
    } catch (error) {
        console.warn('Could not load world terrain, using ellipsoid:', error);
        // Fallback to ellipsoid terrain
        terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
    
    const viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: terrainProvider,
        baseLayerPicker: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false, // Disable default infoBox, we'll use custom hover tooltip
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        animation: false,
        shouldAnimate: false,
        fullscreenButton: false
    });
    
    // Set initial camera position to Dubai Marina tram station
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
            DUBAI_CENTER.lon,
            DUBAI_CENTER.lat,
            5000 // altitude in meters - closer view of Dubai Marina area
        ),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0
        }
    });
    
    // Adjust lighting to make white buildings more visible
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.dynamicAtmosphereLighting = false;
    
    return viewer;
}

// Generate color palette from blue to red using Cesium.Color
function generateColorPalette(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1 || 1); // 0 to 1
        // Blue (0,0,255) to Red (255,0,0) through cyan, green, yellow
        let r, g, b;
        if (ratio < 0.25) {
            // Blue to Cyan
            const t = ratio / 0.25;
            r = 0 + t * 0;
            g = 0 + t * 255;
            b = 255;
        } else if (ratio < 0.5) {
            // Cyan to Green
            const t = (ratio - 0.25) / 0.25;
            r = 0;
            g = 255;
            b = 255 - t * 255;
        } else if (ratio < 0.75) {
            // Green to Yellow
            const t = (ratio - 0.5) / 0.25;
            r = 0 + t * 255;
            g = 255;
            b = 0;
        } else {
            // Yellow to Red
            const t = (ratio - 0.75) / 0.25;
            r = 255;
            g = 255 - t * 255;
            b = 0;
        }
        // Create Cesium.Color object
        const color = Cesium.Color.fromBytes(
            Math.round(r),
            Math.round(g),
            Math.round(b),
            255
        );
        colors.push(color);
    }
    return colors;
}

// Convert Cesium.Color to string format for style conditions
function cesiumColorToString(color) {
    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    return `rgb(${r}, ${g}, ${b})`;
}

// Collect unique building types from tileset
async function collectBuildingTypes(tileset) {
    const buildingTypes = new Set();
    
    // Wait for tileset to be ready
    if (tileset.readyPromise) {
        await tileset.readyPromise;
    }
    
    const rootTiles = tileset.root;
    if (!rootTiles) return [];
    
    const tilesToProcess = [rootTiles];
    let sampleCount = 0;
    const maxSamples = 50000; // Increased sampling for better coverage
    
    while (tilesToProcess.length > 0 && sampleCount < maxSamples) {
        const tile = tilesToProcess.shift();
        
        if (!tile.ready || !tile.content) {
            continue;
        }
        
        const content = tile.content;
        const length = Math.min(content.featuresLength, maxSamples - sampleCount);
        
        for (let i = 0; i < length; i++) {
            try {
                const feature = content.getFeature(i);
                if (!feature) continue;
                
                // Get building property - this is the main property name in OSM Buildings
                const buildingType = feature.getProperty('building');
                
                // Debug: log first few features to see what properties are available
                if (sampleCount < 5) {
                    const propIds = feature.getPropertyIds ? feature.getPropertyIds() : [];
                    console.log(`Sample feature ${sampleCount}:`, {
                        building: buildingType,
                        availableProps: propIds.slice(0, 10)
                    });
                }
                
                if (buildingType !== null && buildingType !== undefined) {
                    const typeStr = String(buildingType).trim();
                    // Skip 'yes', empty, null - these will be handled as 'mixed use'
                    // Only add actual building type names
                    if (typeStr && 
                        typeStr !== 'yes' && 
                        typeStr !== 'null' && 
                        typeStr !== 'undefined' && 
                        typeStr !== 'NaN' &&
                        typeStr !== '') {
                        buildingTypes.add(typeStr);
                    }
                }
                sampleCount++;
            } catch (e) {
                // Skip errors
                continue;
            }
        }
        
        if (tile.children) {
            tilesToProcess.push(...tile.children);
        }
    }
    
    // Sort and return unique types (excluding 'yes' which will be 'mixed use')
    return Array.from(buildingTypes).sort();
}

// Create style based on building types with Jenks-like color assignment
function createBuildingTypeStyle(buildingTypes, mixedUseColor = Cesium.Color.GRAY) {
    // Generate color palette from blue to red using Cesium.Color
    const palette = generateColorPalette(buildingTypes.length);
    
    // Create color map for building types (using Cesium.Color objects)
    const colorMap = {};
    buildingTypes.forEach((type, index) => {
        colorMap[type] = palette[index];
    });
    
    // Build conditions for style
    // IMPORTANT: Order matters! Check specific types FIRST, then mixed use cases
    const conditions = [];
    
    // Convert mixed use color to string
    const mixedUseColorStr = cesiumColorToString(mixedUseColor);
    
    // First, add conditions for each specific building type
    // These must come BEFORE the mixed use conditions so they match first
    buildingTypes.forEach(type => {
        const color = colorMap[type];
        const colorStr = cesiumColorToString(color);
        // Escape quotes and special characters in building type
        const escapedType = String(type)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'");
        // Use strict equality check with Cesium color function
        conditions.push([`\${building} === "${escapedType}"`, `color("${colorStr}")`]);
    });
    
    // Then handle mixed use cases (yes, empty, null, undefined)
    // These come AFTER specific types so they only match if no specific type matched
    conditions.push(['${building} === "yes"', `color("${mixedUseColorStr}")`]);
    conditions.push(['${building} === null', `color("${mixedUseColorStr}")`]);
    conditions.push(['${building} === undefined', `color("${mixedUseColorStr}")`]);
    conditions.push(['${building} === ""', `color("${mixedUseColorStr}")`]);
    
    // Default fallback (for any other unknown types - also treat as mixed use)
    conditions.push(['true', `color("${mixedUseColorStr}")`]);
    
    console.log(`Created style with ${buildingTypes.length} building types + mixed use`);
    console.log('Sample building types:', buildingTypes.slice(0, 10));
    console.log('Mixed use color:', mixedUseColorStr);
    
    return new Cesium.Cesium3DTileStyle({
        color: {
            conditions: conditions
        }
    });
}

// Count buildings in tileset
async function countBuildings(tileset) {
    let count = 0;
    
    try {
        // Wait for tileset to be ready
        if (tileset.readyPromise) {
            await tileset.readyPromise;
        } else {
            // Wait a bit if readyPromise doesn't exist
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Count features by traversing tiles
        const countFeatures = (tile) => {
            if (!tile || !tile.content) return;
            
            try {
                if (tile.content.featuresLength !== undefined) {
                    count += tile.content.featuresLength;
                }
            } catch (e) {
                // Ignore errors
            }
            
            // Recursively count children
            if (tile.children) {
                tile.children.forEach(countFeatures);
            }
        };
        
        // Start counting from root
        if (tileset.root) {
            countFeatures(tileset.root);
        }
        
        // Also listen to tiles as they load
        tileset.tileLoaded.addEventListener((tile) => {
            try {
                if (tile.content && tile.content.featuresLength !== undefined) {
                    count += tile.content.featuresLength;
                }
            } catch (e) {
                // Ignore errors
            }
        });
        
    } catch (error) {
        console.warn('Error counting buildings:', error);
    }
    
    return count;
}

// Add OSM Buildings from Cesium Ion
async function addOsmBuildings(viewer) {
    try {
        // Create OSM Buildings tileset
        const tileset = await Cesium.createOsmBuildingsAsync();
        
        // Add to scene
        viewer.scene.primitives.add(tileset);
        
        console.log('OSM Buildings loaded');
        
        // Store reference for GeoJSON export
        window.osmBuildingsTileset = tileset;
        window.cesiumViewer = viewer;
        
        // Count buildings and update display
        setTimeout(async () => {
            const buildingCount = await countBuildings(tileset);
            const buildingCountEl = document.getElementById('building-count');
            if (buildingCountEl) {
                if (buildingCount > 0) {
                    buildingCountEl.textContent = `Buildings: ${buildingCount.toLocaleString()}`;
                } else {
                    buildingCountEl.textContent = 'Buildings: Loading...';
                    // Try again after more time
                    setTimeout(async () => {
                        const recount = await countBuildings(tileset);
                        if (recount > 0) {
                            buildingCountEl.textContent = `Buildings: ${recount.toLocaleString()}`;
                        } else {
                            buildingCountEl.textContent = 'Buildings: Cesium OSM Buildings';
                        }
                    }, 5000);
                }
            }
        }, 3000);
        
        return tileset;
    } catch (error) {
        console.error('Error loading OSM Buildings:', error);
        throw error;
    }
}

// Extract buildings from tileset and convert to GeoJSON
async function extractBuildingsToGeoJSON() {
    const tileset = window.osmBuildingsTileset;
    const viewer = window.cesiumViewer;
    
    if (!tileset || !viewer) {
        console.error('Buildings tileset not loaded');
        return null;
    }
    
    const features = [];
    const processedIds = new Set();
    
    // Wait for tileset to be ready (if readyPromise exists)
    if (tileset.readyPromise) {
        await tileset.readyPromise;
    }
    
    // Traverse all tiles and extract features
    const rootTiles = tileset.root;
    if (!rootTiles) {
        console.warn('Tileset root not available');
        return null;
    }
    
    const tilesToProcess = [rootTiles];
    
    while (tilesToProcess.length > 0) {
        const tile = tilesToProcess.shift();
        
        if (!tile.ready || !tile.content) {
            continue;
        }
        
        // Process features in this tile
        const content = tile.content;
        const length = content.featuresLength;
        
        for (let i = 0; i < length; i++) {
            const feature = content.getFeature(i);
            
            if (!feature) continue;
            
            // Get feature ID to avoid duplicates
            const featureId = feature.getProperty('id') || 
                            feature.getProperty('osm_id') || 
                            `feature_${i}_${tile._level}`;
            
            if (processedIds.has(featureId)) {
                continue;
            }
            processedIds.add(featureId);
            
            try {
                // Get all properties
                const properties = {};
                const propertyIds = feature.getPropertyIds();
                
                for (let j = 0; j < propertyIds.length; j++) {
                    const propId = propertyIds[j];
                    const value = feature.getProperty(propId);
                    properties[propId] = value;
                }
                
                // Get geometry (bounding box or center point)
                // For 3D Tiles, we'll use the bounding box
                const boundingSphere = feature.boundingSphere;
                
                if (boundingSphere) {
                    const center = boundingSphere.center;
                    const cartographic = Cesium.Cartographic.fromCartesian(center);
                    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
                    
                    // Create a simple point geometry (or you could extract full polygon)
                    // For now, using point with bounding box info
                    const geometry = {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    };
                    
                    // Add bounding box info to properties
                    properties._bbox = {
                        center: [longitude, latitude],
                        radius: boundingSphere.radius
                    };
                    
                    features.push({
                        type: 'Feature',
                        geometry: geometry,
                        properties: properties
                    });
                }
            } catch (error) {
                console.warn('Error processing feature:', error);
            }
        }
        
        // Add child tiles to process
        if (tile.children) {
            tilesToProcess.push(...tile.children);
        }
    }
    
    const geoJSON = {
        type: 'FeatureCollection',
        features: features
    };
    
    return geoJSON;
}

// Export GeoJSON to file
function downloadGeoJSON(geoJSON, filename = 'buildings.geojson') {
    const jsonString = JSON.stringify(geoJSON, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export buildings as GeoJSON
async function exportBuildingsGeoJSON() {
    const loadingEl = document.getElementById('loading');
    const exportBtn = document.getElementById('export-btn');
    
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
    }
    
    loadingEl.textContent = 'Extracting buildings to GeoJSON...';
    loadingEl.classList.remove('hidden');
    
    try {
        const geoJSON = await extractBuildingsToGeoJSON();
        
        if (geoJSON && geoJSON.features.length > 0) {
            const filename = `dubai_waterfront_buildings_${new Date().toISOString().split('T')[0]}.geojson`;
            downloadGeoJSON(geoJSON, filename);
            
            loadingEl.textContent = `Exported ${geoJSON.features.length} buildings to GeoJSON!`;
            setTimeout(() => {
                loadingEl.classList.add('hidden');
            }, 3000);
            
            console.log(`Exported ${geoJSON.features.length} buildings to GeoJSON`);
        } else {
            loadingEl.textContent = 'No buildings found to export';
            setTimeout(() => {
                loadingEl.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error('Error exporting GeoJSON:', error);
        loadingEl.textContent = `Error: ${error.message}`;
        setTimeout(() => {
            loadingEl.classList.add('hidden');
        }, 5000);
    } finally {
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export GeoJSON';
        }
    }
}

// Create legend with isochrones
function createLegend(buildingTypes = [], colorMap = {}) {
    const legendEl = document.getElementById('legend');
    if (!legendEl) return;
    
    // Count stations by type
    const stations = window.allStations || [];
    const metroStations = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'metro';
    });
    const redLineStations = metroStations.filter(s => {
        const location = (s.stationLocation || '').toLowerCase();
        return location.includes('red') || location.includes('mred');
    });
    const greenLineStations = metroStations.filter(s => {
        const location = (s.stationLocation || '').toLowerCase();
        return location.includes('green') || location.includes('mgrn');
    });
    const tramStations = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'tram';
    });
    const monorailStations = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'monorail';
    });
    
    let legendHTML = '<button id="legend-minimize-btn" title="Minimize/Expand">-</button>';
    legendHTML += '<div class="legend-content">';
    legendHTML += '<h3>Rail Stations/ Run isochrones / Show isochrones</h3>';
    legendHTML += '<div class="legend-container">';
    
    // Left column: Rail lines
    legendHTML += '<div class="legend-column">';
    // Red Line isochrone
    legendHTML += '<div class="legend-item" style="margin-top: 10px;">';
    legendHTML += `<span class="legend-color" style="background-color: rgba(255,0,0,0.25); border: 2px solid #FF0000;"></span>`;
    legendHTML += `<span class="legend-label">Red Line (${redLineStations.length})</span>`;
    legendHTML += '</div>';
    
    // Green Line isochrone
    legendHTML += '<div class="legend-item">';
    legendHTML += `<span class="legend-color" style="background-color: rgba(0,170,0,0.25); border: 2px solid #00AA00;"></span>`;
    legendHTML += `<span class="legend-label">Green Line (${greenLineStations.length})</span>`;
    legendHTML += '</div>';
    
    // Tram Line isochrone
    legendHTML += '<div class="legend-item">';
    legendHTML += `<span class="legend-color" style="background-color: rgba(255,140,0,0.25); border: 2px solid #FF8C00;"></span>`;
    legendHTML += `<span class="legend-label">Tram Line (${tramStations.length})</span>`;
    legendHTML += '</div>';
    
    // Monorail Line isochrone
    legendHTML += '<div class="legend-item">';
    legendHTML += `<span class="legend-color" style="background-color: rgba(0,102,255,0.25); border: 2px solid #0066FF;"></span>`;
    legendHTML += `<span class="legend-label">Monorail Line (${monorailStations.length})</span>`;
    legendHTML += '</div>';
    legendHTML += '</div>'; // End left column
    
    // Middle column: Isochrone generation buttons
    legendHTML += '<div class="legend-column">';
    legendHTML += '<button id="isochrone-btn-5min" class="dashboard-button" disabled>';
    legendHTML += '5min';
    legendHTML += '</button>';
    legendHTML += '<button id="isochrone-btn-10min" class="dashboard-button" disabled>';
    legendHTML += '10min';
    legendHTML += '</button>';
    legendHTML += '<button id="isochrone-btn-15min" class="dashboard-button" disabled>';
    legendHTML += '15min';
    legendHTML += '</button>';
    legendHTML += '<button id="isochrone-btn-stop" class="dashboard-button" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); margin-top: 15px;" disabled>';
    legendHTML += 'Stop';
    legendHTML += '</button>';
    legendHTML += '</div>'; // End middle column
    
    // Right column: Merged isochrone toggle buttons
    legendHTML += '<div class="legend-column-right">';
    legendHTML += '<button id="merged-isochrone-btn-5min" class="isochrone-toggle-btn">';
    legendHTML += '5min';
    legendHTML += '</button>';
    legendHTML += '<button id="merged-isochrone-btn-10min" class="isochrone-toggle-btn">';
    legendHTML += '10min';
    legendHTML += '</button>';
    legendHTML += '<button id="merged-isochrone-btn-15min" class="isochrone-toggle-btn">';
    legendHTML += '15min';
    legendHTML += '</button>';
    legendHTML += '</div>'; // End right column
    
    legendHTML += '</div>'; // End legend-container
    
    legendHTML += '</div>'; // End legend-content
    
    legendEl.innerHTML = legendHTML;
    
    // Setup minimize button
    setupLegendMinimize();
    
    // Re-setup buttons after legend is updated
    setupIsochroneButton();
}

// Setup legend minimize/expand functionality
function setupLegendMinimize() {
    const legendEl = document.getElementById('legend');
    const minimizeBtn = document.getElementById('legend-minimize-btn');
    
    if (!legendEl || !minimizeBtn) return;
    
    // Detect mobile browsers
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 768);
    
    // Set minimized by default on mobile
    if (isMobile) {
        legendEl.classList.add('minimized');
        minimizeBtn.textContent = 'o';
        minimizeBtn.title = 'Expand';
    }
    
    // Toggle minimize/expand on button click
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        legendEl.classList.toggle('minimized');
        
        if (legendEl.classList.contains('minimized')) {
            minimizeBtn.textContent = 'o';
            minimizeBtn.title = 'Expand';
        } else {
            minimizeBtn.textContent = '-';
            minimizeBtn.title = 'Minimize';
        }
    });
}

// Update legend with building types
function updateLegendWithBuildingTypes(buildingTypes, colorMap = null) {
    if (!colorMap) {
        colorMap = {};
        const palette = generateColorPalette(buildingTypes.length);
        buildingTypes.forEach((type, index) => {
            colorMap[type] = cesiumColorToString(palette[index]);
        });
    }
    createLegend(buildingTypes, colorMap);
}

// List of KML files to load
const KML_FILES = [
    './Metro_Stations_Gis_2025-10-30_00-00-00.kml'
];

// Add KML layer to the map
async function addKmlLayer(viewer, kmlUrl, options = {}) {
    try {
        console.log('Loading KML layer from:', kmlUrl);
        
        // Load KML data source
        const kmlDataSource = await Cesium.KmlDataSource.load(kmlUrl, {
            camera: viewer.scene.camera,
            canvas: viewer.scene.canvas,
            clampToGround: options.clampToGround !== false, // Default to true
            ...options
        });
        
        // Add the data source to the viewer
        viewer.dataSources.add(kmlDataSource);
        
        // Optionally fly to the KML data bounds
        if (options.flyTo !== false) {
            viewer.flyTo(kmlDataSource);
        }
        
        console.log('KML layer loaded successfully:', kmlUrl);
        return kmlDataSource;
        
    } catch (error) {
        console.error('Error loading KML layer:', kmlUrl, error);
        throw error;
    }
}

// Create Metro station icon: 'M' letter in a circle
function createMetroIcon(color = '#FF0000', size = 24, opacity = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Set global alpha for transparency
    ctx.globalAlpha = opacity;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 1; // Leave small margin
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw white border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw white 'M' letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.6)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', centerX, centerY);
    
    return canvas.toDataURL();
}

// Create Tram station icon: 'T' letter in an orange circle
function createTramIcon(color = '#FF8C00', size = 24, opacity = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Set global alpha for transparency
    ctx.globalAlpha = opacity;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 1; // Leave small margin
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw white border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw white 'T' letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.6)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', centerX, centerY);
    
    return canvas.toDataURL();
}

// Create Monorail station icon: 'L' letter in a blue circle
function createMonorailIcon(color = '#0066FF', size = 24, opacity = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Set global alpha for transparency
    ctx.globalAlpha = opacity;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 1; // Leave small margin
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw white border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw white 'L' letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.6)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', centerX, centerY);
    
    return canvas.toDataURL();
}

// Determine line color from station location
function getLineColor(stationLocation) {
    if (!stationLocation) return '#FF0000'; // Default to red
    
    const location = stationLocation.toLowerCase();
    if (location.includes('green') || location.includes('mgrn')) {
        return '#00AA00'; // Green
    } else if (location.includes('red') || location.includes('mred')) {
        return '#FF0000'; // Red
    } else if (location.includes('tram')) {
        return '#FF8C00'; // Orange for tram
    } else if (location.includes('monorail')) {
        return '#0066FF'; // Blue for monorail
    }
    
    return '#FF0000'; // Default to red
}

// Load monorail stations from CSV and add to map
async function addMonorailStationsFromCSV(viewer, csvFile) {
    try {
        const response = await fetch(csvFile);
        const csvText = await response.text();
        
        // Parse CSV (handles quoted fields)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Find column indices
        const lonIdx = headers.indexOf('longitude');
        const latIdx = headers.indexOf('latitude');
        const nameIdx = headers.indexOf('station_name');
        
        if (lonIdx === -1 || latIdx === -1) {
            throw new Error('CSV missing longitude or latitude columns');
        }
        
        const stations = [];
        
        // Parse each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV with quoted fields
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.replace(/^"|"$/g, '').trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.replace(/^"|"$/g, '').trim());
            
            if (values.length <= Math.max(lonIdx, latIdx)) continue;
            
            const lon = parseFloat(values[lonIdx]);
            const lat = parseFloat(values[latIdx]);
            const nameEn = nameIdx >= 0 ? values[nameIdx].replace(/_/g, ' ') : '';
            
            if (isNaN(lon) || isNaN(lat)) continue;
            
            stations.push({ 
                lon: Number(lon.toFixed(6)), 
                lat: Number(lat.toFixed(6)), 
                nameEn,
                stationLocation: 'Monorail line'
            });
        }
        
        console.log(`Loaded ${stations.length} monorail stations from CSV`);
        
        // Add stations as entities
        const stationEntities = [];
        const monorailColor = '#0066FF'; // Blue
        const cesiumMonorailColor = Cesium.Color.fromCssColorString(monorailColor);
        
        for (const station of stations) {
            // Create icon for monorail (blue 'L')
            const iconImage = createMonorailIcon(monorailColor, 24, 0.5);
            
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat),
                billboard: {
                    image: iconImage,
                    width: 24,
                    height: 24,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: station.nameEn || 'Monorail Station',
                    font: 'bold 13pt sans-serif',
                    fillColor: cesiumMonorailColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -60),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scale: 1.0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            });
            stationEntities.push(entity);
        }
        
        console.log(`Added ${stationEntities.length} monorail station markers with labels`);
        
        // Adjust overlapping labels after a short delay
        setTimeout(() => {
            adjustOverlappingLabels(viewer, stationEntities);
        }, 1000);
        
        // Store stations globally for button-triggered isochrone creation
        if (!window.allStations) {
            window.allStations = [];
        }
        window.allStations.push(...stations.map(s => ({ ...s, type: 'monorail' })));
        window.cesiumViewer = viewer;
        
        return stationEntities;
        
    } catch (error) {
        console.error('Error loading monorail stations from CSV:', error);
        throw error;
    }
}

// Load tram stations from CSV and add to map
async function addTramStationsFromCSV(viewer, csvFile) {
    try {
        const response = await fetch(csvFile);
        const csvText = await response.text();
        
        // Parse CSV (handles quoted fields)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Find column indices
        const lonIdx = headers.indexOf('station_location_longitude');
        const latIdx = headers.indexOf('station_location_latitude');
        const nameEnIdx = headers.indexOf('location_name_english');
        
        if (lonIdx === -1 || latIdx === -1) {
            throw new Error('CSV missing longitude or latitude columns');
        }
        
        const stations = [];
        
        // Parse each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV with quoted fields
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.replace(/^"|"$/g, '').trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.replace(/^"|"$/g, '').trim());
            
            if (values.length <= Math.max(lonIdx, latIdx)) continue;
            
            const lon = parseFloat(values[lonIdx]);
            const lat = parseFloat(values[latIdx]);
            const nameEn = nameEnIdx >= 0 ? values[nameEnIdx] : '';
            
            if (isNaN(lon) || isNaN(lat)) continue;
            
            stations.push({ 
                lon: Number(lon.toFixed(6)), 
                lat: Number(lat.toFixed(6)), 
                nameEn,
                stationLocation: 'Tram line'
            });
        }
        
        console.log(`Loaded ${stations.length} tram stations from CSV`);
        
        // Add stations as entities
        const stationEntities = [];
        const tramColor = '#FF8C00'; // Orange
        const cesiumTramColor = Cesium.Color.fromCssColorString(tramColor);
        
        for (const station of stations) {
            // Create icon for tram (orange 'T')
            const iconImage = createTramIcon(tramColor, 24, 0.5);
            
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat),
                billboard: {
                    image: iconImage,
                    width: 24,
                    height: 24,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: station.nameEn || 'Tram Station',
                    font: 'bold 13pt sans-serif',
                    fillColor: cesiumTramColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -60),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scale: 1.0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            });
            stationEntities.push(entity);
        }
        
        console.log(`Added ${stationEntities.length} tram station markers with labels`);
        
        // Adjust overlapping labels after a short delay
        setTimeout(() => {
            adjustOverlappingLabels(viewer, stationEntities);
        }, 1000);
        
        // Store stations globally for button-triggered isochrone creation
        if (!window.allStations) {
            window.allStations = [];
        }
        window.allStations.push(...stations.map(s => ({ ...s, type: 'tram' })));
        window.cesiumViewer = viewer;
        
        return stationEntities;
        
    } catch (error) {
        console.error('Error loading tram stations from CSV:', error);
        throw error;
    }
}

// Load metro stations from CSV and add to map
async function addMetroStationsFromCSV(viewer, csvFile) {
    try {
        const response = await fetch(csvFile);
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const lonIdx = headers.indexOf('longitude');
        const latIdx = headers.indexOf('latitude');
        const nameEnIdx = headers.indexOf('STATION_NAME_EN');
        const locationIdx = headers.indexOf('STATION_LOCATION');
        
        if (lonIdx === -1 || latIdx === -1) {
            throw new Error('CSV missing longitude or latitude columns');
        }
        
        const stations = [];
        
        // Parse each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple CSV parsing (handles quoted fields)
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current);
            
            if (values.length <= Math.max(lonIdx, latIdx)) continue;
            
            const lon = parseFloat(values[lonIdx]);
            const lat = parseFloat(values[latIdx]);
            const nameEn = nameEnIdx >= 0 ? values[nameEnIdx] : '';
            const stationLocation = locationIdx >= 0 ? values[locationIdx] : '';
            
            if (isNaN(lon) || isNaN(lat)) continue;
            
            stations.push({ lon, lat, nameEn, stationLocation });
        }
        
        console.log(`Loaded ${stations.length} stations from CSV`);
        
        // Add stations as entities
        const stationEntities = [];
        for (const station of stations) {
            // Determine color based on line
            const lineColor = getLineColor(station.stationLocation);
            
            // Convert hex color to Cesium Color
            const cesiumLineColor = Cesium.Color.fromCssColorString(lineColor);
            
            // Create icon for this station's line color (2x smaller, 50% transparent)
            const iconImage = createMetroIcon(lineColor, 24, 0.5);
            
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat),
                billboard: {
                    image: iconImage,
                    width: 24,
                    height: 24,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: station.nameEn || 'Station',
                    font: 'bold 13pt sans-serif',
                    fillColor: cesiumLineColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -60),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scale: 1.0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            });
            stationEntities.push(entity);
        }
        
        console.log(`Added ${stationEntities.length} station markers with labels`);
        
        // Adjust overlapping labels after a short delay to ensure rendering
        setTimeout(() => {
            adjustOverlappingLabels(viewer, stationEntities);
        }, 1000);
        
        // Store stations globally for button-triggered isochrone creation
        if (!window.allStations) {
            window.allStations = [];
        }
        window.allStations.push(...stations.map(s => ({ ...s, type: 'metro' })));
        window.cesiumViewer = viewer;
        
        return stationEntities;
        
    } catch (error) {
        console.error('Error loading stations from CSV:', error);
        throw error;
    }
}

// Isochrone configuration
const ISO_RANGE_SECONDS = 600; // Default: 10 minutes walking

// Fetch isochrone from OpenRouteService
async function fetchIsochroneORS(lon, lat, stationName = '', rangeSeconds = ISO_RANGE_SECONDS) {
    const body = {
        locations: [[lon, lat]],
        range: [rangeSeconds],
        range_type: "time"
    };
    
    try {
        const requestStartTime = Date.now();
        
        // Detect if running locally or on Vercel
        const hostname = window.location.hostname;
        const isLocalDev = hostname === 'localhost' || 
                           hostname === '127.0.0.1' ||
                           hostname.includes('localhost');
        // Use /api/isochrones - proxy server (local) or serverless function (Vercel) handles API key
        const apiUrl = '/api/isochrones';
        
        console.log('🔍 Environment detection:', {
            hostname: hostname,
            isLocalDev: isLocalDev,
            apiUrl: apiUrl,
            note: 'API key handled by proxy/serverless function'
        });
        
        isochroneLog.addEntry('request', `API Request for station: ${stationName || 'Unknown'}`, {
            station: stationName,
            coordinates: { lon, lat },
            requestBody: body,
            url: apiUrl,
            isLocalDev: isLocalDev,
            hostname: hostname
        });
        
        console.log('Making ORS API request:', {
            isLocalDev: isLocalDev,
            apiUrl: apiUrl,
            hostname: hostname,
            body: body
        });
        
        // Headers - API key is handled by proxy/serverless function
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json"
        };
        
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            mode: "cors",
            credentials: "omit"
        });
        
        console.log('ORS API Response:', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            headers: Object.fromEntries(res.headers.entries())
        });
        
        const requestDuration = Date.now() - requestStartTime;
        
        isochroneLog.addEntry('response', `API Response received`, {
            station: stationName,
            status: res.status,
            statusText: res.statusText,
            duration: `${requestDuration}ms`,
            headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
            let txt = '';
            try {
                txt = await res.text();
            } catch (e) {
                txt = 'Could not read response body';
            }
            
            // Try to parse error JSON
            let errorDetails = txt;
            try {
                const errorJson = JSON.parse(txt);
                errorDetails = JSON.stringify(errorJson, null, 2);
            } catch (e) {
                // Not JSON, use text as is
            }
            
            // Log detailed error for debugging
            console.error(`❌ ORS API Error for ${stationName}:`, {
                status: res.status,
                statusText: res.statusText,
                error: errorDetails,
                url: apiUrl,
                isLocalDev: isLocalDev,
                hostname: hostname,
                requestBody: body
            });
            
            // Show user-friendly error in console
            if (res.status === 401) {
                console.error('🔑 Authentication failed - API key may be invalid or expired');
            } else if (res.status === 403) {
                console.error('🚫 Access forbidden - Check API key permissions');
            } else if (res.status === 429) {
                console.error('⏱️ Rate limit exceeded - Too many requests');
            }
            
            isochroneLog.addEntry('error', `API Error Response`, {
                station: stationName,
                status: res.status,
                statusText: res.statusText,
                errorBody: errorDetails
            });
            
            throw new Error(`ORS API Error ${res.status}: ${res.statusText}\nDetails: ${errorDetails}`);
        }
        
        let geojson;
        try {
            geojson = await res.json();
        } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            const textResponse = await res.text();
            console.error('Response text:', textResponse);
            throw new Error(`Failed to parse API response as JSON: ${jsonError.message}`);
        }
        
        isochroneLog.addEntry('success', `API Success - Features received`, {
            station: stationName,
            featureCount: geojson.features?.length || 0,
            featureTypes: geojson.features?.map(f => f.geometry?.type).filter(Boolean) || []
        });
        
        return geojson; // GeoJSON FeatureCollection
    } catch (error) {
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            isochroneLog.addEntry('error', `Network Error`, {
                station: stationName,
                errorType: 'network',
                errorMessage: error.message,
                errorName: error.name
            });
            throw new Error(`Network error connecting to OpenRouteService: ${error.message}`);
        }
        // Re-throw if already formatted
        if (error.message.includes('ORS API Error')) {
            throw error;
        }
        // Format other errors
        isochroneLog.addEntry('error', `Unexpected Error`, {
            station: stationName,
            errorType: 'unexpected',
            errorMessage: error.message,
            errorStack: error.stack
        });
        throw new Error(`Unexpected error: ${error.message}`);
    }
}

// Style isochrone entities
function styleIsochroneDataSource(dataSource, lineColor) {
    dataSource.entities.values.forEach((entity) => {
        if (entity.polygon) {
            // Use color from GeoJSON properties if available, otherwise use provided lineColor
            let fillColor = lineColor || '#FF0000';
            let strokeColor = lineColor || '#FF0000';
            
            if (entity.properties) {
                // Check for fillColor or strokeColor in properties
                const fillColorProp = entity.properties.fillColor || entity.properties.fill;
                const strokeColorProp = entity.properties.strokeColor || entity.properties.stroke;
                
                if (fillColorProp) {
                    try {
                        fillColor = fillColorProp.getValue ? fillColorProp.getValue() : fillColorProp;
                    } catch (e) {
                        fillColor = fillColorProp;
                    }
                }
                if (strokeColorProp) {
                    try {
                        strokeColor = strokeColorProp.getValue ? strokeColorProp.getValue() : strokeColorProp;
                    } catch (e) {
                        strokeColor = strokeColorProp;
                    }
                }
            }
            
            // Use line color with 25% transparency (0.25 alpha)
            const fill = Cesium.Color.fromCssColorString(fillColor);
            entity.polygon.material = Cesium.Color.fromAlpha(fill, 0.25);
            entity.polygon.outline = true;
            entity.polygon.outlineColor = Cesium.Color.fromCssColorString(strokeColor);
            entity.polygon.outlineWidth = 2;
            entity.polygon.extrudedHeight = 0;
            entity.polygon.height = 0;
        }
    });
}

// Load GeoJSON isochrone into Cesium
async function loadIsochroneToCesium(viewer, geojson, lineColor, isochroneType = null) {
    try {
        const ds = await Cesium.GeoJsonDataSource.load(geojson, {
            clampToGround: true
        });
        
        styleIsochroneDataSource(ds, lineColor);
        viewer.dataSources.add(ds);
        
        // Store reference for later removal
        if (!window.isochroneDataSources) {
            window.isochroneDataSources = [];
        }
        window.isochroneDataSources.push(ds);
        
        // Track by type if type is provided
        if (isochroneType && window.isochroneTypes[isochroneType]) {
            window.isochroneTypes[isochroneType].dataSources.push(ds);
        }
        
        return ds;
    } catch (error) {
        console.error('Error loading isochrone GeoJSON:', error);
        throw error;
    }
}

// Isochrone logging system
const isochroneLog = {
    entries: [],
    startTime: null,
    endTime: null,
    
    addEntry(type, message, data = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: type, // 'info', 'request', 'response', 'success', 'error', 'retry'
            message: message,
            data: data
        };
        this.entries.push(entry);
        console.log(`[LOG ${type.toUpperCase()}] ${message}`, data);
    },
    
    getLogText() {
        let logText = '=== ISOCHRONE CREATION LOG ===\n\n';
        logText += `Start Time: ${this.startTime || 'N/A'}\n`;
        logText += `End Time: ${this.endTime || 'N/A'}\n`;
        if (this.startTime && this.endTime) {
            const duration = (new Date(this.endTime) - new Date(this.startTime)) / 1000;
            logText += `Total Duration: ${duration.toFixed(2)} seconds\n`;
        }
        logText += `Total Entries: ${this.entries.length}\n\n`;
        logText += '=== DETAILED LOG ENTRIES ===\n\n';
        
        this.entries.forEach((entry, index) => {
            logText += `[${index + 1}] [${entry.timestamp}] [${entry.type.toUpperCase()}]\n`;
            logText += `Message: ${entry.message}\n`;
            if (Object.keys(entry.data).length > 0) {
                logText += `Data: ${JSON.stringify(entry.data, null, 2)}\n`;
            }
            logText += '\n';
        });
        
        return logText;
    },
    
    downloadLog() {
        const logText = this.getLogText();
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `isochrone_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    reset() {
        this.entries = [];
        this.startTime = null;
        this.endTime = null;
    }
};

// Analyze error to determine root cause
function analyzeIsochroneError(error, lon, lat, stationName) {
    const analysis = {
        station: stationName,
        coordinates: { lon, lat },
        errorType: 'unknown',
        possibleCauses: [],
        suggestions: []
    };
    
    const errorMsg = error.message || String(error);
    
    // Check for API errors
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        analysis.errorType = 'authentication';
        analysis.possibleCauses.push('Invalid or expired API key');
        analysis.suggestions.push('Check ORS_API_KEY in config.js');
    } else if (errorMsg.includes('402') || errorMsg.includes('Payment')) {
        analysis.errorType = 'quota';
        analysis.possibleCauses.push('API quota exceeded');
        analysis.suggestions.push('Check OpenRouteService account quota');
    } else if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        analysis.errorType = 'rate_limit';
        analysis.possibleCauses.push('Rate limit exceeded');
        analysis.suggestions.push('Increase delay between requests');
    } else if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        analysis.errorType = 'invalid_request';
        analysis.possibleCauses.push('Invalid coordinates or request parameters');
        analysis.suggestions.push('Verify coordinates are valid (lon: -180 to 180, lat: -90 to 90)');
    } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
        analysis.errorType = 'server_error';
        analysis.possibleCauses.push('OpenRouteService server error');
        analysis.suggestions.push('Retry later or check ORS service status');
    } else if (errorMsg.includes('Network error') || errorMsg.includes('fetch')) {
        analysis.errorType = 'network';
        analysis.possibleCauses.push('Network connectivity issue');
        analysis.suggestions.push('Check internet connection');
    } else if (errorMsg.includes('No features')) {
        analysis.errorType = 'empty_response';
        analysis.possibleCauses.push('No isochrone could be generated for this location');
        analysis.suggestions.push('Location may be in area without walking routes (water, restricted area)');
    } else {
        analysis.errorType = 'unknown';
        analysis.possibleCauses.push('Unexpected error');
    }
    
    return analysis;
}

// Create isochrone with retry logic
async function createIsochroneWithRetry(lon, lat, stationName, maxRetries = 3, rangeSeconds = ISO_RANGE_SECONDS) {
    let lastError = null;
    
    isochroneLog.addEntry('info', `Starting isochrone creation for station: ${stationName}`, {
        station: stationName,
        coordinates: { lon, lat },
        maxRetries: maxRetries
    });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            isochroneLog.addEntry('info', `Attempt ${attempt}/${maxRetries} for ${stationName}`, {
                station: stationName,
                attempt: attempt,
                maxRetries: maxRetries
            });
            
            const geojson = await fetchIsochroneORS(lon, lat, stationName, rangeSeconds);
            
            // Verify geojson has features
            if (!geojson || !geojson.features || geojson.features.length === 0) {
                throw new Error('No features in isochrone response');
            }
            
            isochroneLog.addEntry('success', `Successfully created isochrone for ${stationName} on attempt ${attempt}`, {
                station: stationName,
                attempt: attempt,
                featureCount: geojson.features.length
            });
            
            return geojson;
        } catch (error) {
            lastError = error;
            
            // Analyze error
            const analysis = analyzeIsochroneError(error, lon, lat, stationName);
            
            isochroneLog.addEntry('retry', `Attempt ${attempt} failed for ${stationName}`, {
                station: stationName,
                attempt: attempt,
                maxRetries: maxRetries,
                errorType: analysis.errorType,
                errorMessage: error.message,
                possibleCauses: analysis.possibleCauses,
                suggestions: analysis.suggestions,
                analysis: analysis
            });
            
            if (attempt === maxRetries) {
                // Final attempt failed - log detailed analysis
                isochroneLog.addEntry('error', `Failed to create isochrone for ${stationName} after ${maxRetries} attempts`, {
                    station: stationName,
                    totalAttempts: maxRetries,
                    finalError: error.message,
                    analysis: analysis
                });
                throw error;
            }
            
            // Wait before retry (exponential backoff)
            const delay = 1000 * attempt;
            isochroneLog.addEntry('info', `Waiting ${delay}ms before retry ${attempt + 1} for ${stationName}`, {
                station: stationName,
                delay: delay,
                nextAttempt: attempt + 1
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError || new Error('Unknown error');
}

// Setup isochrone button event listeners
function setupIsochroneButton() {
    // Helper function to setup a button with specific time range
    const setupButton = (buttonId, minutes, rangeSeconds) => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        
            btn.addEventListener('click', async () => {
            console.log(`🚀 Isochrone button clicked: ${minutes}min`);
            
            const viewer = window.cesiumViewer;
            const stations = window.allStations;
            const typeKey = `${minutes}min`;
            
            console.log('Button click - checking prerequisites:', {
                hasViewer: !!viewer,
                hasStations: !!stations,
                stationCount: stations?.length || 0,
                hasORSConfig: !!ORS_CONFIG,
                hasApiKey: !!ORS_CONFIG?.apiKey
            });
            
            if (!viewer) {
                console.error('❌ Cesium viewer not initialized');
                alert('Cesium viewer not initialized');
                return;
            }
            
            if (!stations || stations.length === 0) {
                console.error('❌ No stations loaded');
                alert('No stations loaded. Please wait for stations to load.');
                return;
            }
            
            if (!ORS_CONFIG || !ORS_CONFIG.url) {
                console.error('❌ ORS configuration not available');
                alert('OpenRouteService configuration is not available. Check console for details.');
                return;
            }
            
            // If this type was stopped before, clear existing isochrones of this type
            if (window.isochroneTypes[typeKey] && window.isochroneTypes[typeKey].stopped) {
                console.log(`Clearing existing ${typeKey} isochrones before restarting...`);
                clearIsochronesByType(viewer, typeKey);
            }
            
            // Disable all buttons during processing except stop button
            const allButtons = ['isochrone-btn-5min', 'isochrone-btn-10min', 'isochrone-btn-15min'];
            allButtons.forEach(id => {
                const b = document.getElementById(id);
                if (b) b.disabled = true;
            });
            
            // Enable stop button
            const stopBtn = document.getElementById('isochrone-btn-stop');
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.textContent = 'Stop';
            }
            
            btn.textContent = `Creating ${minutes}min...`;
            
            try {
                console.log(`📊 Starting isochrone creation for ${stations.length} stations (${minutes} minutes)`);
                
                // Create isochrones for all stations with specified time range
                await createIsochronesForStations(viewer, stations, null, rangeSeconds, typeKey);
                
                console.log(`✅ Isochrone creation completed for ${minutes}min`);
                
                // Check if stopped
                if (window.stopIsochroneCreation) {
                    btn.textContent = `${minutes}min (Stopped)`;
                    console.log(`⏸ Isochrone creation was stopped for ${minutes}min`);
                } else {
                    btn.textContent = `${minutes}min ✓`;
                    console.log(`✓ Successfully completed ${minutes}min isochrones`);
                }
                
                // Disable stop button and re-enable other buttons
                if (stopBtn) {
                    stopBtn.disabled = true;
                }
                
                setTimeout(() => {
                    btn.textContent = `${minutes}min`;
                    allButtons.forEach(id => {
                        const b = document.getElementById(id);
                        if (b) b.disabled = false;
                    });
                }, 3000);
            } catch (error) {
                console.error(`❌ Error creating ${minutes}min isochrones:`, error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                btn.textContent = `${minutes}min (Error)`;
                
                // Show user-friendly error
                const statusEl = document.getElementById('isochrone-status');
                if (statusEl) {
                    statusEl.innerHTML = `❌ Error: ${error.message}`;
                    statusEl.style.color = 'rgba(255,0,0,0.9)';
                    statusEl.style.display = 'block';
                }
                
                // Disable stop button and re-enable other buttons
                if (stopBtn) {
                    stopBtn.disabled = true;
                }
                
                setTimeout(() => {
                    btn.textContent = `${minutes}min`;
                    allButtons.forEach(id => {
                        const b = document.getElementById(id);
                        if (b) b.disabled = false;
                    });
                }, 3000);
            }
        });
        
        // Enable button once stations are loaded
        setTimeout(() => {
            const stations = window.allStations;
            if (stations && stations.length > 0) {
                btn.disabled = false;
                console.log(`Enabled ${buttonId} button - ${stations.length} stations loaded`);
            } else {
                console.warn(`Could not enable ${buttonId} button - no stations found`);
            }
        }, 2000);
    };
    
    // Setup all three buttons
    setupButton('isochrone-btn-5min', 5, 300);   // 5 minutes = 300 seconds
    setupButton('isochrone-btn-10min', 10, 600); // 10 minutes = 600 seconds
    setupButton('isochrone-btn-15min', 15, 900); // 15 minutes = 900 seconds
    
    // Setup stop button
    const stopBtn = document.getElementById('isochrone-btn-stop');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            window.stopIsochroneCreation = true;
            stopBtn.disabled = true;
            stopBtn.textContent = 'Stopping...';
            console.log('Stop button clicked - stopping isochrone creation');
        });
    }
    
    // Setup merged isochrone buttons
    setupMergedIsochroneButtons();
}

// Setup merged isochrone toggle buttons
function setupMergedIsochroneButtons() {
    // Initialize merged isochrone data sources storage
    if (!window.mergedIsochroneDataSources) {
        window.mergedIsochroneDataSources = {};
    }
    
    // Setup buttons for 5min, 10min, 15min
    ['5min', '10min', '15min'].forEach(range => {
        const btn = document.getElementById(`merged-isochrone-btn-${range}`);
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            toggleMergedIsochrone(range, btn);
        });
        
        // Double click to hide
        btn.addEventListener('dblclick', () => {
            hideMergedIsochrone(range, btn);
        });
    });
}

// Toggle merged isochrone on/off
async function toggleMergedIsochrone(range, button) {
    const viewer = window.cesiumViewer;
    if (!viewer) {
        console.error('Cesium viewer not initialized');
        return;
    }
    
    // Check if already loaded
    if (window.mergedIsochroneDataSources[range]) {
        // Hide it
        hideMergedIsochrone(range, button);
        return;
    }
    
    // Load and show
    try {
        button.disabled = true;
        button.textContent = 'Loading...';
        
        // Load merged GeoJSON file
        const filename = `isochrones_${range}_merged.geojson`;
        const response = await fetch(filename);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        
        const geojson = await response.json();
        
        // Load into Cesium
        const ds = await Cesium.GeoJsonDataSource.load(geojson, {
            clampToGround: true
        });
        
        // Style the isochrones
        styleIsochroneDataSource(ds, null); // Use colors from GeoJSON properties
        
        viewer.dataSources.add(ds);
        
        // Store reference
        window.mergedIsochroneDataSources[range] = ds;
        
        // Update button state
        button.classList.add('active');
        button.textContent = range;
        button.disabled = false;
        
        // Block left-side buttons for this range
        blockIsochroneButtons(range, true);
        
        console.log(`✅ Loaded merged ${range} isochrones`);
    } catch (error) {
        console.error(`Error loading merged ${range} isochrones:`, error);
        button.disabled = false;
        button.textContent = range;
        alert(`Failed to load merged ${range} isochrones: ${error.message}`);
    }
}

// Hide merged isochrone
function hideMergedIsochrone(range, button) {
    const viewer = window.cesiumViewer;
    if (!viewer) return;
    
    const ds = window.mergedIsochroneDataSources[range];
    if (ds) {
        viewer.dataSources.remove(ds);
        delete window.mergedIsochroneDataSources[range];
        
        // Update button state
        button.classList.remove('active');
        button.textContent = range;
        
        // Unblock left-side buttons
        blockIsochroneButtons(range, false);
        
        console.log(`✅ Hidden merged ${range} isochrones`);
    }
}

// Block/unblock left-side isochrone generation buttons
function blockIsochroneButtons(range, block) {
    const buttonId = `isochrone-btn-${range}`;
    const btn = document.getElementById(buttonId);
    
    if (btn) {
        if (block) {
            btn.disabled = true;
            btn.title = `Disabled: Merged ${range} isochrones are currently displayed`;
        } else {
            // Only enable if stations are loaded
            const stations = window.allStations;
            if (stations && stations.length > 0) {
                btn.disabled = false;
                btn.title = '';
            }
        }
    }
}

// Update isochrone status in UI
function updateIsochroneStatus(stationName, current, total, status = 'processing') {
    const statusEl = document.getElementById('isochrone-status');
    if (!statusEl) return;
    
    statusEl.style.display = 'block';
    
    if (status === 'processing') {
        statusEl.innerHTML = `🔄 Creating isochrone: <strong>${stationName}</strong> (${current}/${total})`;
        statusEl.style.color = 'rgba(255,255,255,0.9)';
    } else if (status === 'success') {
        statusEl.innerHTML = `✓ Completed: <strong>${stationName}</strong> (${current}/${total})`;
        statusEl.style.color = 'rgba(0,255,0,0.9)';
    } else if (status === 'error') {
        statusEl.innerHTML = `✗ Failed: <strong>${stationName}</strong> (${current}/${total})`;
        statusEl.style.color = 'rgba(255,0,0,0.9)';
    } else if (status === 'finished') {
        statusEl.innerHTML = `✓ All isochrones completed (${current} successful)`;
        statusEl.style.color = 'rgba(0,255,0,0.9)';
        // Hide after 5 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    } else if (status === 'stopped') {
        statusEl.innerHTML = `⏸ Isochrone creation stopped (${current} completed)`;
        statusEl.style.color = 'rgba(255, 200, 0, 0.9)';
        // Hide after 5 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Global flag to stop isochrone creation
window.stopIsochroneCreation = false;

// Track isochrone types and their stopped state
window.isochroneTypes = {
    '5min': { stopped: false, dataSources: [] },
    '10min': { stopped: false, dataSources: [] },
    '15min': { stopped: false, dataSources: [] }
};

// Clear isochrones by type
function clearIsochronesByType(viewer, isochroneType) {
    if (!viewer || !isochroneType || !window.isochroneTypes[isochroneType]) {
        return;
    }
    
    const typeData = window.isochroneTypes[isochroneType];
    let removedCount = 0;
    
    // Remove all data sources of this type from viewer
    typeData.dataSources.forEach(ds => {
        try {
            viewer.dataSources.remove(ds, true);
            removedCount++;
        } catch (e) {
            console.warn('Error removing isochrone data source:', e);
        }
    });
    
    // Remove from global array
    if (window.isochroneDataSources) {
        window.isochroneDataSources = window.isochroneDataSources.filter(ds => 
            !typeData.dataSources.includes(ds)
        );
    }
    
    // Clear the type's data sources array
    typeData.dataSources = [];
    
    console.log(`Cleared ${removedCount} isochrone data sources for type: ${isochroneType}`);
}

// Create isochrones for all stations (can handle mixed metro/tram)
async function createIsochronesForStations(viewer, stations, stationType = null, rangeSeconds = ISO_RANGE_SECONDS, isochroneType = null) {
    // Reset stop flag
    window.stopIsochroneCreation = false;
    
    // Reset stopped state for this type
    if (isochroneType && window.isochroneTypes[isochroneType]) {
        window.isochroneTypes[isochroneType].stopped = false;
    }
    
    // Initialize log
    isochroneLog.reset();
    isochroneLog.startTime = new Date().toISOString();
    
    // Count station types
    const metroCount = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'metro';
    }).length;
    const tramCount = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'tram';
    }).length;
    const monorailCount = stations.filter(s => {
        const type = s.type || (s.stationLocation && s.stationLocation.toLowerCase().includes('tram') ? 'tram' : 
                                s.stationLocation && s.stationLocation.toLowerCase().includes('monorail') ? 'monorail' : 'metro');
        return type === 'monorail';
    }).length;
    
    const rangeMinutes = rangeSeconds / 60;
    
    isochroneLog.addEntry('info', `Starting isochrone creation process`, {
        stationType: stationType || 'mixed',
        totalStations: stations.length,
        metroStations: metroCount,
        tramStations: tramCount,
        monorailStations: monorailCount,
        isoRangeSeconds: rangeSeconds,
        isoRangeMinutes: rangeMinutes,
        delayBetweenRequests: '1200ms'
    });
    
    console.log(`🔄 Creating isochrones for ${stations.length} stations (${rangeMinutes} minutes)...`);
    console.log('ORS Config check:', {
        url: ORS_CONFIG.url,
        usingProxy: ORS_CONFIG.url.startsWith('/api/')
    });
    
    let successCount = 0;
    let failCount = 0;
    const processedStations = [];
    const failedStations = [];
    
    // Process ALL stations with a delay to avoid rate limiting
    for (let i = 0; i < stations.length; i++) {
        // Check if stop was requested
        if (window.stopIsochroneCreation) {
            console.log('Isochrone creation stopped by user');
            isochroneLog.addEntry('info', `Isochrone creation stopped by user`, {
                stoppedAt: i,
                totalStations: stations.length,
                processedBeforeStop: processedStations.length
            });
            updateIsochroneStatus('', processedStations.length, stations.length, 'stopped');
            
            // Mark this type as stopped
            if (isochroneType && window.isochroneTypes[isochroneType]) {
                window.isochroneTypes[isochroneType].stopped = true;
            }
            break;
        }
        
        const station = stations[i];
        
        // Validate station data
        if (!station || isNaN(station.lon) || isNaN(station.lat)) {
            isochroneLog.addEntry('error', `Skipping invalid station at index ${i}`, {
                index: i,
                station: station,
                reason: 'Invalid coordinates'
            });
            console.warn(`Skipping invalid station at index ${i}:`, station);
            failCount++;
            continue;
        }
        
        // Determine station type and line color
        const actualStationType = station.type || stationType || 
            (station.stationLocation && station.stationLocation.toLowerCase().includes('monorail') ? 'monorail' :
             station.stationLocation && station.stationLocation.toLowerCase().includes('tram') ? 'tram' : 'metro');
        let lineColor;
        if (actualStationType === 'tram') {
            lineColor = '#FF8C00'; // Orange for tram
        } else if (actualStationType === 'monorail') {
            lineColor = '#0066FF'; // Blue for monorail
        } else {
            lineColor = getLineColor(station.stationLocation);
        }
        const stationName = station.nameEn || `Station ${i + 1}`;
        
        isochroneLog.addEntry('info', `Processing ${actualStationType} station ${i + 1}/${stations.length}: ${stationName}`, {
            stationType: actualStationType,
            index: i + 1,
            total: stations.length,
            station: stationName,
            coordinates: { lon: station.lon, lat: station.lat },
            lineColor: lineColor,
            stationLocation: station.stationLocation
        });
        
        // Update UI status
        updateIsochroneStatus(stationName, i + 1, stations.length, 'processing');
        
        console.log(`Processing station ${i + 1}/${stations.length}: ${stationName} (${station.lon}, ${station.lat})`);
        
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
            isochroneLog.addEntry('info', `Waiting 1200ms before next request`, {
                previousStation: processedStations[processedStations.length - 1] || 'N/A',
                nextStation: stationName
            });
            await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay between requests
        }
        
        try {
            // Use retry logic for isochrone creation
            const geojson = await createIsochroneWithRetry(station.lon, station.lat, stationName, 3, rangeSeconds);
            
            isochroneLog.addEntry('info', `Loading isochrone GeoJSON into Cesium for ${stationName}`, {
                station: stationName,
                featureCount: geojson.features?.length || 0
            });
            
            await loadIsochroneToCesium(viewer, geojson, lineColor, isochroneType);
            
            successCount++;
            processedStations.push(stationName);
            
            isochroneLog.addEntry('success', `Successfully completed isochrone for ${stationName}`, {
                station: stationName,
                successCount: successCount,
                remaining: stations.length - (i + 1)
            });
            
            // Update UI status to success
            updateIsochroneStatus(stationName, i + 1, stations.length, 'success');
            
            console.log(`✓ Isochrone created for station: ${stationName}`);
            
            // Brief delay to show success status
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            failCount++;
            
            // Analyze the error
            const analysis = analyzeIsochroneError(error, station.lon, station.lat, stationName);
            
            failedStations.push({ 
                name: stationName, 
                lon: station.lon, 
                lat: station.lat, 
                error: error.message,
                analysis: analysis
            });
            
            isochroneLog.addEntry('error', `Failed to create isochrone for ${stationName}`, {
                station: stationName,
                coordinates: { lon: station.lon, lat: station.lat },
                error: error.message,
                errorStack: error.stack,
                analysis: analysis,
                failCount: failCount
            });
            
            // Update UI status to error
            updateIsochroneStatus(stationName, i + 1, stations.length, 'error');
            
            console.error(`✗ Failed to create isochrone for station ${stationName} at (${station.lon}, ${station.lat})`);
            console.error(`Error: ${error.message}`);
            console.error(`Error Analysis:`, analysis);
            
            // Brief delay to show error status
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Finalize log
    isochroneLog.endTime = new Date().toISOString();
    
    // Show final status
    if (window.stopIsochroneCreation) {
        updateIsochroneStatus('', successCount, stations.length, 'stopped');
    } else {
        updateIsochroneStatus('', successCount, stations.length, 'finished');
    }
    
    // Add summary to log
    isochroneLog.addEntry('info', `Isochrone creation process completed`, {
        totalStations: stations.length,
        successCount: successCount,
        failCount: failCount,
        successRate: `${((successCount / stations.length) * 100).toFixed(1)}%`,
        failedRate: `${((failCount / stations.length) * 100).toFixed(1)}%`,
        processedStations: processedStations,
        failedStations: failedStations.map(fs => ({
            name: fs.name,
            coordinates: { lon: fs.lon, lat: fs.lat },
            error: fs.error,
            errorType: fs.analysis?.errorType
        }))
    });
    
    console.log(`Finished creating isochrones: ${successCount} successful, ${failCount} failed`);
    console.log(`Successfully processed stations:`, processedStations);
    
    if (failedStations.length > 0) {
        console.error(`\n=== FAILED STATIONS ANALYSIS ===`);
        console.error(`Total failed: ${failedStations.length}`);
        
        // Group failures by error type
        const failuresByType = {};
        failedStations.forEach(fs => {
            const errorType = fs.analysis?.errorType || 'unknown';
            if (!failuresByType[errorType]) {
                failuresByType[errorType] = [];
            }
            failuresByType[errorType].push(fs);
        });
        
        console.error(`\nFailures by error type:`);
        Object.keys(failuresByType).forEach(errorType => {
            const failures = failuresByType[errorType];
            console.error(`  ${errorType}: ${failures.length} station(s)`);
            failures.forEach(fs => {
                console.error(`    - ${fs.name} (${fs.lon}, ${fs.lat})`);
                if (fs.analysis?.possibleCauses) {
                    console.error(`      Possible causes: ${fs.analysis.possibleCauses.join(', ')}`);
                }
                if (fs.analysis?.suggestions) {
                    console.error(`      Suggestions: ${fs.analysis.suggestions.join(', ')}`);
                }
            });
        });
        
        console.error(`\nDetailed failed stations list:`, failedStations);
        
        // Summary statistics
        console.error(`\n=== SUMMARY ===`);
        console.error(`Success rate: ${((successCount / stations.length) * 100).toFixed(1)}%`);
        console.error(`Failed rate: ${((failCount / stations.length) * 100).toFixed(1)}%`);
    }
    
    // Log file is available in console but not automatically downloaded
    console.log(`\n=== ISOCHRONE CREATION COMPLETE ===`);
    console.log(`Log entries available in console. Use isochroneLog.downloadLog() to download if needed.`);
}

// Adjust overlapping labels - move later ones up
function adjustOverlappingLabels(viewer, entities) {
    const labelInfo = [];
    const labelHeight = 20; // Approximate label height in pixels (13pt font)
    const labelPadding = 5; // Padding for overlap detection
    
    // Collect label information with screen positions
    entities.forEach((entity, index) => {
        if (!entity.label || !entity.position) return;
        
        const cartesian = entity.position.getValue(viewer.clock.currentTime);
        const screenPos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, cartesian);
        
        if (!screenPos) return;
        
        const labelText = entity.label.text.getValue(viewer.clock.currentTime);
        // Estimate label width based on text length (rough approximation)
        const labelWidth = labelText.length * 8; // ~8 pixels per character for 13pt font
        
        labelInfo.push({
            entity: entity,
            index: index,
            screenX: screenPos.x,
            screenY: screenPos.y,
            labelWidth: labelWidth,
            labelHeight: labelHeight,
            pixelOffset: entity.label.pixelOffset ? 
                entity.label.pixelOffset.getValue(viewer.clock.currentTime) : 
                new Cesium.Cartesian2(0, -60)
        });
    });
    
    // Check for overlaps and adjust
    for (let i = 0; i < labelInfo.length; i++) {
        for (let j = i + 1; j < labelInfo.length; j++) {
            const label1 = labelInfo[i];
            const label2 = labelInfo[j];
            
            // Calculate label bounding boxes
            const label1X = label1.screenX + label1.pixelOffset.x - label1.labelWidth / 2;
            const label1Y = label1.screenY + label1.pixelOffset.y - label1.labelHeight;
            const label1Right = label1X + label1.labelWidth;
            const label1Bottom = label1Y + label1.labelHeight;
            
            const label2X = label2.screenX + label2.pixelOffset.x - label2.labelWidth / 2;
            const label2Y = label2.screenY + label2.pixelOffset.y - label2.labelHeight;
            const label2Right = label2X + label2.labelWidth;
            const label2Bottom = label2Y + label2.labelHeight;
            
            // Check if labels overlap
            const overlapX = !(label1Right < label2X || label1X > label2Right);
            const overlapY = !(label1Bottom < label2Y || label1Y > label2Bottom);
            
            if (overlapX && overlapY) {
                // Labels overlap - move the later one (label2) up
                const currentOffsetY = label2.pixelOffset.y;
                const newOffsetY = currentOffsetY - (labelHeight + labelPadding);
                
                label2.entity.label.pixelOffset = new Cesium.Cartesian2(
                    label2.pixelOffset.x,
                    newOffsetY
                );
                
                // Update the stored pixelOffset for future checks
                label2.pixelOffset = new Cesium.Cartesian2(
                    label2.pixelOffset.x,
                    newOffsetY
                );
                
                console.log(`Adjusted overlapping labels: moved "${label2.entity.label.text.getValue(viewer.clock.currentTime)}" up`);
            }
        }
    }
}

// Load all KML files (excluding stations, we'll use CSV instead)
async function addAllKmlLayers(viewer, options = {}) {
    const loadedLayers = [];
    const failedLayers = [];
    
    // Only load non-station KML files
    const nonStationKmlFiles = KML_FILES.filter(file => !file.includes('Stations'));
    
    for (const kmlFile of nonStationKmlFiles) {
        try {
            const kmlDataSource = await addKmlLayer(viewer, kmlFile, {
                clampToGround: true,
                flyTo: false,
                ...options
            });
            loadedLayers.push({ file: kmlFile, dataSource: kmlDataSource });
        } catch (error) {
            failedLayers.push({ file: kmlFile, error: error.message });
            console.warn(`Failed to load KML file: ${kmlFile}`, error);
        }
    }
    
    console.log(`Loaded ${loadedLayers.length} KML layer(s), ${failedLayers.length} failed`);
    if (failedLayers.length > 0) {
        console.warn('Failed KML files:', failedLayers);
    }
    
    return { loadedLayers, failedLayers };
}

// Load schools from CSV and add to map
async function addSchoolsFromCSV(viewer, csvFile) {
    try {
        const response = await fetch(csvFile);
        const csvText = await response.text();
        
        // Parse CSV (handles quoted fields)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Find column indices
        const latIdx = headers.indexOf('lat');
        const lonIdx = headers.indexOf('long');
        const nameIdx = headers.indexOf('name_eng');
        
        if (latIdx === -1 || lonIdx === -1) {
            throw new Error('CSV missing latitude or longitude columns');
        }
        
        const schools = [];
        
        // Parse each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV with quoted fields
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.replace(/^"|"$/g, '').trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.replace(/^"|"$/g, '').trim());
            
            if (values.length <= Math.max(latIdx, lonIdx)) continue;
            
            const lat = parseFloat(values[latIdx]);
            const lon = parseFloat(values[lonIdx]);
            const name = nameIdx >= 0 ? values[nameIdx] : '';
            
            if (isNaN(lat) || isNaN(lon)) continue;
            
            schools.push({ 
                lon: Number(lon.toFixed(6)), 
                lat: Number(lat.toFixed(6)), 
                name: name || 'School'
            });
        }
        
        console.log(`Loaded ${schools.length} schools from CSV`);
        
        // Create yellow school icon from SVG
        const createYellowSchoolIcon = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            
            // Load SVG and draw it in yellow
            const img = new Image();
            return new Promise((resolve) => {
                img.onload = () => {
                    // Draw SVG to canvas
                    ctx.drawImage(img, 0, 0, 16, 16);
                    
                    // Convert to yellow by applying yellow color overlay
                    const imageData = ctx.getImageData(0, 0, 16, 16);
                    const data = imageData.data;
                    
                    // Make all non-transparent pixels yellow
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 0) { // If pixel is not transparent
                            data[i] = 255;     // R
                            data[i + 1] = 255; // G
                            data[i + 2] = 0;   // B
                            // Keep alpha as is
                        }
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL());
                };
                img.src = './school.svg';
            });
        };
        
        // Create yellow icon once
        const yellowIconUrl = await createYellowSchoolIcon();
        
        // Add schools as entities with yellow school icon
        const schoolEntities = [];
        
        for (const school of schools) {
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(school.lon, school.lat),
                billboard: {
                    image: yellowIconUrl,
                    width: 16,
                    height: 16,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                name: school.name,
                description: `<div style="padding: 5px; font-weight: bold;">${school.name}</div>`
            });
            schoolEntities.push(entity);
        }
        
        // Store school entities for reference
        window.schoolEntities = schoolEntities;
        
        // Create custom tooltip for school names on hover
        const tooltip = document.createElement('div');
        tooltip.id = 'school-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            display: none;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        `;
        document.body.appendChild(tooltip);
        
        // Add hover handler for schools
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement) => {
            const pickedObject = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
                const entity = pickedObject.id;
                if (entity.name && schoolEntities.includes(entity)) {
                    // Show tooltip next to cursor/icon
                    viewer.canvas.style.cursor = 'pointer';
                    tooltip.textContent = entity.name;
                    tooltip.style.display = 'block';
                    
                    // Get canvas position relative to page
                    const canvasRect = viewer.canvas.getBoundingClientRect();
                    tooltip.style.left = (canvasRect.left + movement.endPosition.x + 15) + 'px';
                    tooltip.style.top = (canvasRect.top + movement.endPosition.y - 10) + 'px';
                } else {
                    viewer.canvas.style.cursor = 'default';
                    tooltip.style.display = 'none';
                }
            } else {
                viewer.canvas.style.cursor = 'default';
                tooltip.style.display = 'none';
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        
        console.log(`Added ${schoolEntities.length} school markers`);
        
        return schoolEntities;
        
    } catch (error) {
        console.error('Error loading schools from CSV:', error);
        throw error;
    }
}

// Main function
async function main() {
    const loadingEl = document.getElementById('loading');
    const buildingCountEl = document.getElementById('building-count');
    
    try {
        loadingEl.textContent = 'Initializing Cesium viewer...';
        
        // Initialize Cesium viewer
        const viewer = await initCesium();
        
        loadingEl.textContent = 'Loading OSM Buildings from Cesium...';
        
        // Add OSM Buildings
        await addOsmBuildings(viewer);
        
        // Add all KML layers (excluding stations)
        try {
            loadingEl.textContent = 'Loading KML layers...';
            const kmlResult = await addAllKmlLayers(viewer, {
                clampToGround: true,
                flyTo: false // Don't change camera position
            });
            console.log(`Successfully loaded ${kmlResult.loadedLayers.length} KML layer(s)`);
        } catch (error) {
            console.warn('Error loading KML layers:', error.message);
            // Continue without KML layers if they fail
        }
        
        // Add metro stations from CSV with custom icons and labels
        try {
            loadingEl.textContent = 'Loading metro stations...';
            await addMetroStationsFromCSV(viewer, './metro_stations_20251114_215239.csv');
            console.log('Metro stations added successfully');
        } catch (error) {
            console.warn('Error loading metro stations:', error.message);
            // Continue without stations if they fail
        }
        
        // Add tram stations from CSV with custom icons and labels
        try {
            loadingEl.textContent = 'Loading tram stations...';
            await addTramStationsFromCSV(viewer, './Tram_Stations.csv');
            console.log('Tram stations added successfully');
        } catch (error) {
            console.warn('Error loading tram stations:', error.message);
            // Continue without stations if they fail
        }
        
        // Add monorail stations from CSV with custom icons and labels
        try {
            loadingEl.textContent = 'Loading monorail stations...';
            await addMonorailStationsFromCSV(viewer, './monorail.csv');
            console.log('Monorail stations added successfully');
        } catch (error) {
            console.warn('Error loading monorail stations:', error.message);
            // Continue without stations if they fail
        }
        
        // Add schools from CSV
        try {
            loadingEl.textContent = 'Loading schools...';
            await addSchoolsFromCSV(viewer, './School_Search.csv');
            console.log('Schools added successfully');
        } catch (error) {
            console.warn('Error loading schools:', error.message);
            // Continue without schools if they fail
        }
        
        // Create legend with station counts (after all stations are loaded)
        createLegend();
        
        // Update UI (building count will be updated by addOsmBuildings)
        loadingEl.classList.add('hidden');
        
        // Make export function available globally
        window.exportBuildingsGeoJSON = exportBuildingsGeoJSON;
        
        console.log('Successfully loaded Cesium OSM Buildings');
        
    } catch (error) {
        console.error('Error in main:', error);
        loadingEl.innerHTML = `
            <div style="color: #ff6b6b;">
                <p>Failed to load buildings</p>
                <p style="margin-top: 10px; font-size: 12px;">${error.message}</p>
                <p style="margin-top: 10px; font-size: 11px;">Check console for details</p>
            </div>
        `;
    }
}

// Test function to verify ORS API key (can be called from browser console)
window.testORSAPI = async function(lon = 55.146909, lat = 25.080803) {
    console.log('🧪 Testing OpenRouteService API...');
    console.log('API Key:', ORS_CONFIG.apiKey ? ORS_CONFIG.apiKey.substring(0, 30) + '...' : 'MISSING');
    console.log('URL:', ORS_CONFIG.url);
    
    const testBody = {
        locations: [[lon, lat]],
        range: [300], // 5 minutes
        range_type: "time"
    };
    
    try {
        const res = await fetch(ORS_CONFIG.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": ORS_CONFIG.apiKey,
                "Accept": "application/json, application/geo+json"
            },
            body: JSON.stringify(testBody),
            mode: "cors",
            credentials: "omit"
        });
        
        console.log('Response Status:', res.status, res.statusText);
        
        if (res.ok) {
            const geojson = await res.json();
            console.log('✅ API Test SUCCESS!', {
                features: geojson.features?.length || 0,
                type: geojson.type
            });
            return geojson;
        } else {
            const errorText = await res.text();
            console.error('❌ API Test FAILED:', {
                status: res.status,
                statusText: res.statusText,
                error: errorText
            });
            return null;
        }
    } catch (error) {
        console.error('❌ API Test ERROR:', error);
        return null;
    }
};

// Start the application
main();


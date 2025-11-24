import * as d3 from "d3";
import { useRef, useEffect, useState } from "react";
import worldMap from "../assets/world.geo.json";

// Airport coordinates
const airports = {
  ICN: { label: "ICN", coords: [126.4505, 37.4691] }, // Seoul
  DXB: { label: "DXB", coords: [55.3644, 25.2532] }, // Dubai
  TUN: { label: "TUN", coords: [10.2270, 36.8510] }  // Tunis
};

// Flight routes
const flightRoutes = [
  {
    name: "ICN → DXB",
    start: airports.ICN.coords,
    end: airports.DXB.coords,
    color: "#d94d4c"
  },
  {
    name: "DXB → TUN",
    start: airports.DXB.coords,
    end: airports.TUN.coords,
    color: "#ff8c42"
  }
];

// Dataset paths - files should be in public/assets/datasets/points/ folder
// In Vite, files in public folder are served at root
const datasetPaths = {
  airports: "/assets/datasets/points/point_world_A.geo.json",
  cities: "/assets/datasets/points/point_world_B.geo.json",
  earthquakes: "/assets/datasets/points/point_world_C.geo.json"
};

const MapDisplay = () => {
  const [projectionType, setProjectionType] = useState<string>("mercator");
  const [datasetType, setDatasetType] = useState<string>("airports");
  const [datasetData, setDatasetData] = useState<GeoJSON.FeatureCollection | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 900;
  const height = 600;

  // Load dataset
  useEffect(() => {
    const loadDataset = async () => {
      try {
        const path = datasetPaths[datasetType as keyof typeof datasetPaths];
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          setDatasetData(data);
        } else {
          console.error(`Failed to load dataset: ${path}`);
          setDatasetData(null);
        }
      } catch (error) {
        console.error(`Error loading dataset:`, error);
        setDatasetData(null);
      }
    };
    loadDataset();
  }, [datasetType]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const featureCollection: GeoJSON.FeatureCollection = worldMap as GeoJSON.FeatureCollection;

    // Create projection
    let projection: d3.GeoProjection;
    switch (projectionType) {
      case "mercator":
        projection = d3.geoMercator();
        break;
      case "equalEarth":
        projection = d3.geoEqualEarth();
        break;
      case "equirectangular":
        projection = d3.geoEquirectangular();
        break;
      default:
        projection = d3.geoMercator();
    }

    projection.fitSize([width, height], featureCollection);
    const pathGenerator = d3.geoPath()
      .projection(projection)
      .pointRadius(0);

    // Clear all previous content completely
    svg.selectAll("*").remove();

    // Create layers for proper z-ordering
    const mapLayer = svg.append("g").attr("class", "map-layer");
    const datasetLayer = svg.append("g").attr("class", "dataset-layer");
    const tissotLayer = svg.append("g").attr("class", "tissot-layer");
    const routeLayer = svg.append("g").attr("class", "route-layer");
    const airportLayer = svg.append("g").attr("class", "airport-layer");

    // 1. Draw world map (background)
    mapLayer
      .selectAll(".country")
      .data(featureCollection.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d) => {
        const path = pathGenerator(d);
        return path || "";
      })
      .attr("stroke", "#999")
      .attr("fill", "#f2f2f2")
      .attr("stroke-width", 0.4);

    // 2. Draw dataset points (if loaded)
    if (datasetData && datasetData.features) {
      const validPoints = datasetData.features
        .filter(f => f.geometry && f.geometry.type === "Point")
        .map(f => {
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const projected = projection(coords);
          return { feature: f, projected };
        })
        .filter(item => item.projected !== null && 
                       !isNaN(item.projected![0]) && 
                       !isNaN(item.projected![1]) &&
                       item.projected![0] >= -width && 
                       item.projected![0] <= width * 2 &&
                       item.projected![1] >= -height && 
                       item.projected![1] <= height * 2);

      datasetLayer
        .selectAll(".dataset-point")
        .data(validPoints)
        .enter()
        .append("circle")
        .attr("class", "dataset-point")
        .attr("cx", (d) => d.projected![0])
        .attr("cy", (d) => d.projected![1])
        .attr("r", 2)
        .attr("fill", "#3498db")
        .attr("opacity", 0.6);
    }

    // 3. Draw Tissot's indicatrices using d3.geoCircle
    // Grid every 20° latitude and longitude
    const gridSpacing = 20;
    const circleRadiusDegrees = 2; // Small circle radius in degrees

    for (let lat = -80; lat <= 80; lat += gridSpacing) {
      for (let lon = -180; lon < 180; lon += gridSpacing) {
        const circle = d3.geoCircle()
          .center([lon, lat])
          .radius(circleRadiusDegrees)();

        const path = pathGenerator(circle);
        if (path) {
          tissotLayer
            .append("path")
            .datum(circle)
            .attr("class", "tissot-indicatrix")
            .attr("d", path)
            .attr("fill", "rgba(255,0,0,0.12)")
            .attr("stroke", "#ff0000")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,2");
        }
      }
    }

    // 4. Draw flight routes as geodesic lines (on top of indicatrices)
    flightRoutes.forEach(route => {
      // Generate great circle path
      const interpolate = d3.geoInterpolate(route.start, route.end);
      const coordinates: [number, number][] = [];
      for (let i = 0; i <= 100; i++) {
        coordinates.push(interpolate(i / 100));
      }

      const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates
        },
        properties: {}
      };

      const routePath = pathGenerator(routeFeature);
      if (routePath) {
        routeLayer
          .append("path")
          .datum(routeFeature)
          .attr("class", "flight-route")
          .attr("d", routePath)
          .attr("fill", "none")
          .attr("stroke", route.color)
          .attr("stroke-width", 2.5);
      }
    });

    // 5. Draw airport markers and labels (top layer)
    Object.values(airports).forEach(airport => {
      const projected = projection(airport.coords);
      if (!projected) return;

      // Airport marker
      airportLayer
        .append("circle")
        .attr("class", "airport-marker")
        .attr("cx", projected[0])
        .attr("cy", projected[1])
        .attr("r", 5)
        .attr("fill", "#e63946")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

      // Airport label - larger and darker for better visibility
      airportLayer
        .append("text")
        .attr("class", "airport-label")
        .attr("x", projected[0] + 8)
        .attr("y", projected[1])
        .text(airport.label)
        .attr("font-size", "18px")
        .attr("font-weight", "700")
        .attr("fill", "#000")
        .attr("stroke", "#fff")
        .attr("stroke-width", "0.5px")
        .attr("paint-order", "stroke fill");
    });

  }, [projectionType, datasetType, datasetData, width, height]);

  return (
    <div className="map-display-container">
      {/* Controls */}
      <div className="controls-row">
        <div className="control-group">
          <label htmlFor="projection-select" className="control-label">
            Projection:
          </label>
          <select
            id="projection-select"
            className="control-select"
            value={projectionType}
            onChange={(e) => setProjectionType(e.target.value)}
          >
            <option value="mercator">Mercator</option>
            <option value="equalEarth">Equal Earth</option>
            <option value="equirectangular">Equirectangular</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="dataset-select" className="control-label">
            Dataset:
          </label>
          <select
            id="dataset-select"
            className="control-select"
            value={datasetType}
            onChange={(e) => setDatasetType(e.target.value)}
          >
            <option value="airports">Airports</option>
            <option value="cities">Cities</option>
            <option value="earthquakes">Earthquakes</option>
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height} 
          className="map-svg"
          style={{ display: 'block' }}
        />
        
        {/* Student Name - Top Left */}
        <div className="student-name">
          <div className="student-name-main">MARZOUGUI RAHMA</div>
          <div className="student-name-uni">Seoul National University</div>
        </div>
        
        {/* Route Legend - Top Left (below name) */}
        <div className="route-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#d94d4c' }}></span>
            <span>ICN → DXB</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#ff8c42' }}></span>
            <span>DXB → TUN</span>
          </div>
        </div>
        
        {/* Tissot Legend - Bottom Right */}
        <div className="tissot-legend">
          <div className="legend-item">
            <span className="legend-circle"></span>
            <span><strong>Red Ellipses</strong> → Distortion of shape + scale</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDisplay;

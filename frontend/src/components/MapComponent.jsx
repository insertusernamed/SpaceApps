/* eslint-disable no-unused-vars */
import "ol/ol.css";
import { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Icon, Stroke, Fill } from "ol/style";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import KML from "ol/format/KML";
import Bands from "./Bands";
import locationIcon from "../assets/current-location.svg";

const MapComponent = () => {
    const map = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const kmlLayerRef = useRef(null);
    const borderLayerRef = useRef(null);
    const searchBoxRef = useRef(null);
    const [boundingBox, setBoundingBox] = useState(null);
    const [coordinates, setCoordinates] = useState(null);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    useEffect(() => {
        if (window.google && window.google.maps) {
            setIsGoogleLoaded(true);
            return;
        }

        window.initMap = () => {
            setIsGoogleLoaded(true);
        };

        if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyACLSNOSRpuGzMdAOAD5Rh5sJnxA91CIZ0&libraries=places&callback=initMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        return () => {
            delete window.initMap;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !isGoogleLoaded) return;
        const sceneCenter = fromLonLat([-79.457808, 44.593214]);

        const markerFeature = new Feature({
            geometry: new Point(sceneCenter),
        });

        const markerStyle = new Style({
            image: new Icon({
                src: "/marker.png",
                scale: 0.05,
            }),
        });

        markerFeature.setStyle(markerStyle);
        markerRef.current = markerFeature;

        const vectorSource = new VectorSource({
            features: [markerFeature],
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
        });

        const kmlLayer = new VectorLayer({
            source: new VectorSource({
                url: "worldwide.kml",
                format: new KML(),
            }),
            opacity: 0,
        });

        kmlLayerRef.current = kmlLayer;

        const borderSource = new VectorSource();
        const borderLayer = new VectorLayer({
            source: borderSource,
            style: new Style({
                stroke: new Stroke({
                    color: "white",
                    width: 2,
                }),
                fill: new Fill({
                    color: "rgba(94, 129, 172, 0.3)",
                }),
            }),
        });
        borderLayerRef.current = borderLayer;

        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                vectorLayer,
                kmlLayer,
                borderLayer,
            ],
            view: new View({
                center: sceneCenter,
                zoom: 14,
            }),
        });

        initialMap.on("singleclick", (event) => {
            const coordinate = event.coordinate;
            updateMarkerPosition(coordinate);
        });

        map.current = initialMap;

        const searchBox = new window.google.maps.places.Autocomplete(
            searchBoxRef.current
        );

        searchBox.addListener("place_changed", () => {
            const place = searchBox.getPlace();
            if (!place.geometry) {
                console.log(
                    "No details available for input: '" + place.name + "'"
                );
                return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            setLat(lat.toFixed(6));
            setLng(lng.toFixed(6));

            const newCoordinate = fromLonLat([lng, lat]);
            updateMarkerPosition(newCoordinate);

            map.current.getView().setCenter(newCoordinate);
            map.current.getView().setZoom(14);
        });

        return () => {
            if (map.current) map.current.setTarget(null);
        };
    }, [isGoogleLoaded]);

    const updateMarkerPosition = (coordinate) => {
        if (markerRef.current) {
            markerRef.current.getGeometry().setCoordinates(coordinate);
        }

        const [lngValue, latValue] = toLonLat(coordinate);
        setCoordinates({ lat: latValue.toFixed(6), lng: lngValue.toFixed(6) });

        setLat(latValue.toFixed(6));
        setLng(lngValue.toFixed(6));

        displayClosestKmlPoint(coordinate);
    };

    const isPointInPolygon = (point, polygon) => {
        const x = point[0],
            y = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0],
                yi = polygon[i][1];
            const xj = polygon[j][0],
                yj = polygon[j][1];

            const intersect =
                yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

            if (intersect) inside = !inside;
        }

        return inside;
    };

    const displayClosestKmlPoint = (coordinate) => {
        if (!kmlLayerRef.current) return;

        const kmlFeatures = kmlLayerRef.current.getSource().getFeatures();

        let containingFeature = null;

        for (const feature of kmlFeatures) {
            const coords = feature.getGeometry().flatCoordinates;
            const polygonCoords = [
                [coords[0], coords[1]],
                [coords[3], coords[4]],
                [coords[6], coords[7]],
                [coords[9], coords[10]],
            ];

            if (isPointInPolygon(coordinate, polygonCoords)) {
                containingFeature = feature;
                break;
            }
        }

        if (containingFeature) {
            const coords = containingFeature.getGeometry().flatCoordinates;

            const polygonCoords = [
                [coords[3], coords[4]],
                [coords[6], coords[7]],
                [coords[9], coords[10]],
                [coords[12], coords[13]],
                [coords[3], coords[4]],
            ];

            const boundingBoxCoords = [
                toLonLat([coords[3], coords[4]]),
                toLonLat([coords[6], coords[7]]),
                toLonLat([coords[9], coords[10]]),
                toLonLat([coords[12], coords[13]]),
            ];

            const latLng = averageCoordinates(boundingBoxCoords);

            setBoundingBox(latLng);

            function averageCoordinates(coords) {
                if (!coords || coords.length === 0) return null;

                let latSum = 0,
                    lonSum = 0;

                coords.forEach((coord) => {
                    lonSum += coord[0];
                    latSum += coord[1];
                });

                const avgLat = latSum / coords.length;
                const avgLon = lonSum / coords.length;

                let maxLatDist = 0,
                    maxLonDist = 0;
                coords.forEach((coord) => {
                    const latDist = Math.abs(coord[1] - avgLat);
                    const lonDist = Math.abs(coord[0] - avgLon);

                    if (latDist > maxLatDist) maxLatDist = latDist;
                    if (lonDist > maxLonDist) maxLonDist = lonDist;
                });

                const minLat = avgLat - maxLatDist;
                const maxLat = avgLat + maxLatDist;
                const minLon = avgLon - maxLonDist;
                const maxLon = avgLon + maxLonDist;

                return { minLat, maxLat, minLon, maxLon };
            }

            const borderPolygon = new Feature({
                geometry: new Polygon([polygonCoords]),
            });

            borderLayerRef.current.getSource().clear();
            borderLayerRef.current.getSource().addFeature(borderPolygon);

            const extent = containingFeature.getGeometry().getExtent();
            setTimeout(() => {
                map.current.getView().fit(extent, {
                    padding: [100, 100, 100, 100],
                    duration: 1000,
                });
            }, 0);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const element = document.getElementById("bands-page");
        if (element) {
            element.scrollIntoView();
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLat(latitude.toFixed(6));
                    setLng(longitude.toFixed(6));

                    const newCoordinate = fromLonLat([longitude, latitude]);
                    updateMarkerPosition(newCoordinate);
                    map.current.getView().setCenter(newCoordinate);
                    map.current.getView().setZoom(14);
                },
                (error) => {
                    console.error("Error fetching location", error);
                }
            );
        } else {
            console.error("Geolocation is not supported by this browser.");
        }
    };

    return (
        <>
            {!isGoogleLoaded ? (
                <div style={{ padding: "20px", textAlign: "center" }}>
                    Loading map...
                </div>
            ) : (
                <div id="main-container">
                    <div className="sidebar">
                        <div className="form-header">
                            <h1 className="text-center pt-4">
                                Search Location
                            </h1>
                            <div className="search-container">
                                <input
                                    id="search-box"
                                    ref={searchBoxRef}
                                    type="text"
                                    placeholder="Search by Name..."
                                />
                                <button
                                    type="button"
                                    className="currentLocationButton"
                                    onClick={handleUseCurrentLocation}
                                >
                                    <img
                                        className="currentLocationButton"
                                        src={locationIcon}
                                        alt="Use Current Location"
                                    />
                                </button>
                            </div>
                            <p className="text-center pt-2">
                                Or input Lat/Long manually:
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label>Latitude</label>
                            <input
                                id="lat-input"
                                type="number"
                                step="any"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                required
                            />
                            <label>Longitude</label>
                            <input
                                id="lng-input"
                                type="number"
                                step="any"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                                required
                            />

                            <button
                                id="submit"
                                className="mtt-4 mt-4 primary-button"
                                type="submit"
                            >
                                Next
                            </button>
                        </form>
                    </div>

                    <div id="map-container">
                        <div
                            ref={mapRef}
                            id="map"
                            style={{
                                width: "100%",
                                maxWidth: "1200px",
                                height: "600px",
                                border: "2px solid white",
                                borderRadius: "5px",
                                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                            }}
                        ></div>
                    </div>
                </div>
            )}
            <div className="landsart-data-container">
                <Bands
                    coordinates={coordinates}
                    boundingBoxCoordinates={boundingBox}
                />
            </div>
        </>
    );
};

export default MapComponent;

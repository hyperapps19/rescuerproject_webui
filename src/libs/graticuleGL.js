'use strict';
import * as turf from "@turf/turf";
// copied from
// https://github.com/turban/Leaflet.Graticule/blob/master/L.Graticule.js

function graticule(intervalKm, corner1, corner2) {
    if (corner1[0] > corner2[0]) [corner1[0], corner2[0]] = [corner2[0], corner1[0]]
    if (corner1[1] > corner2[1]) [corner1[1], corner2[1]] = [corner2[1], corner1[1]]

    const from = turf.point(corner1);
    const to1 = turf.point([corner1[0], corner2[1]]);
    const to2 = turf.point([corner2[0], corner1[1]]);
    const interval1 = (corner2[0] - corner1[0]) / (turf.distance(from, to1) / intervalKm);
    const interval2 = (corner2[1] - corner1[1]) / (turf.distance(from, to2) / intervalKm);

    const features = [];

    for (let lng = corner1[0]; lng <= corner2[0]; lng += interval1)
        features.push(makeFeature(makeMeridian(lng, corner1[1], corner2[1])));

    for (let lat = corner1[1]; lat <= corner2[1]; lat += (interval2 /2))
        features.push(makeFeature(makeParallel(lat, corner1[0], corner2[0])));

    return {
        type: 'FeatureCollection',
        features
    };
}

function makeMeridian(lng, lat1, lat2) {
    lng = lngFix(lng);
    const coords = [];
    coords.push([lng, lat1]);
    coords.push([lng, lat2]);
    return coords;
}

function makeParallel(lat, lng1, lng2) {
    const coords = [];
    coords.push([lngFix(lng1), lat]);
    coords.push([lngFix(lng2), lat]);
    return coords;
}

function makeFeature(coordinates) {
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates
        }
    };
}

function lngFix(lng) {
    if (lng >= 180) return 179.999999;
    if (lng <= -180) return -179.999999;
    return lng;
}

export default graticule;
import './style.scss';
import io from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import * as turf from '@turf/turf';
import graticule from "./libs/graticuleGL";
import yellowFlag_image from '../res/yellow_flag.svg';
import blackBall_image from '../res/black_ball.png';
import alarm_sound from '../res/alarm_sound.mp3'
import 'typeface-roboto'

const alarmSound = new Audio(alarm_sound)
let map;
const socket = io('http://localhost:8090');
socket.on('config', displayMap);
socket.on('data', processData);
socket.on('alarm', alarm);
let devices = new Map();


function slowlyMovingAnimateMarker(marker, startCoords, endCoords, fraction) {
    marker.setLngLat([(startCoords[0] + ((endCoords[0] - startCoords[0]) * fraction)),
        (startCoords[1] + ((endCoords[1] - startCoords[1]) * fraction))])

    if (fraction < 1)
        requestAnimationFrame(slowlyMovingAnimateMarker.bind(null, marker, startCoords, endCoords, fraction + 0.01));

}

let swimmersCounter = document.getElementById("swimmersCounter").innerHTML;
let currValue = 0;

function placeNewMarker(c) {
    devices.set(c['deviceId'], new mapboxgl.Marker({color: 'green'})
        .setLngLat(c['coords'])
        .addTo(map))
    currValue++;
    swimmersCounter = currValue.toString()
}

function changeMarkerPlace(c) {
    const m = devices.get(c['deviceId']);
    const startCoords = m.getLngLat();
    requestAnimationFrame(slowlyMovingAnimateMarker.bind(null, m, [startCoords.lng, startCoords.lat], c['coords'], 0))
}

function alarm(c) {
    alarmSound.play()
    const mkr = devices.get(c['deviceId']);
    setInterval(() => {
        if (mkr.getElement().style.visibility === "hidden")
            mkr.getElement().style.visibility = ""
        else mkr.getElement().style.visibility = "hidden"
    }, 300)
}

function processData(data) {
    if (devices.has(data['deviceId'])) changeMarkerPlace(data)
    else placeNewMarker(data)
}

let isSwimmingAllowed = true;
const btn = document.getElementById("btnChangeIsSwimmingAllowed");

window.changeIsSwimmingAllowed = () => {
    isSwimmingAllowed = !isSwimmingAllowed;
    let img;
    if (isSwimmingAllowed) img = yellowFlag_image
    else img = blackBall_image
    btn.setAttribute('src', img)
    socket.emit('isSwimmingAllowedChangeEvent', isSwimmingAllowed)
}


function addGraticuleToMap(graticuleInterval, bearing) {
    const bounds = map.getBounds()
    const c1 = [bounds._ne.lng + 0.1, bounds._ne.lat + 0.1]
    const c2 = [bounds._sw.lng - 0.1, bounds._sw.lat - 0.1]

    const data = turf.transformRotate(graticule(graticuleInterval, c1, c2), bearing)
    map.addSource('graticule', {
        'type': 'geojson',
        'data': data
    });

    map.addLayer({
        'id': 'graticule',
        'type': 'line',
        'source': 'graticule',
        'paint': {
            'line-color': '#000',
            'line-opacity': 1,
            'line-width': 1.5
        }
    });
}

function destroyGraticule() {
    map.removeLayer('graticule').removeSource('graticule');
}

let fnCreateGraticule;

window.reloadGraticule = function() {
    if (typeof fnCreateGraticule !== 'undefined') {
        destroyGraticule();
        fnCreateGraticule();
    }
}

function displayMap(data) {
    mapboxgl.accessToken = data['mapboxAccessToken']
    map = new mapboxgl.Map({
        container: 'map',
        style: data['style'],
        center: data['center'],
        zoom: data['zoom'],
        bearing: data['bearing'],
        interactive: false,
        attributionControl: false
    });
    map.addControl(new MapboxLanguage());
    new mapboxgl.Marker({color: 'blue'})
        .setLngLat(data['rescuerBaseCoords'])
        .addTo(map);
    fnCreateGraticule = addGraticuleToMap.bind(null, data['graticuleInterval'], data['bearing']);
    map.on('load', fnCreateGraticule);
}

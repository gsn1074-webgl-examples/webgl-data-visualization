var status = document.getElementById("loadStatus");

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var mouseX = 0;
var mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var camera;
var scene;
var renderer; 
var composer;
var group;
var shaderTime = 0;

var badTVParams;
var badTVPass; 
var rgbPass; 
var filmPass;
var renderPass; 
var copyPass;

var loaded = 0;
var toLoad = 1;

requestData();

//data pull functions

var data;
var title;
var date;
var amount;
var httpRequest;

function requestData() {

    httpRequest = new XMLHttpRequest();

    if (!httpRequest) {

        alert('Cannot create an XMLHTTP instance');
        return false;
    }

    httpRequest.onreadystatechange = handleDataResponse;
    httpRequest.open('GET', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson');
    httpRequest.send();
}

function handleDataResponse() {

    if (httpRequest.readyState === XMLHttpRequest.DONE) {

        if (httpRequest.status === 200) {

            data = JSON.parse(httpRequest.responseText);
            title = document.getElementById("dataSource");
            amount = document.getElementById("dataSummary");
            title.innerHTML = data.metadata.title;

            var d = new Date();
            var y = d.getFullYear();
            var month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", ];
            var m = month[d.getMonth()];
            amount.innerHTML = m + " " + y + ", Last 7 Days: " + data.metadata.count + " Earthquakes";

            init();

        } else {

            alert('There was a problem with the request.');
        }
    }
}

//display functions

function init() {

    status.innerHTML = "Loading Scene";

    var container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);
    camera.position.y = 100;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.004);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0x030f0f);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    renderPass = new THREE.RenderPass(scene, camera);
    badTVPass = new THREE.ShaderPass(THREE.BadTVShader);
    rgbPass = new THREE.ShaderPass(THREE.RGBShiftShader);
    filmPass = new THREE.ShaderPass(THREE.FilmShader);
    copyPass = new THREE.ShaderPass(THREE.CopyShader);

    filmPass.uniforms.grayscale.value = 0;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(filmPass);
    composer.addPass(badTVPass);
    composer.addPass(rgbPass);
    composer.addPass(copyPass);

    copyPass.renderToScreen = true;

    badTVPass.uniforms['distortion'].value = 0.9;
    badTVPass.uniforms['distortion2'].value = 0.5;
    badTVPass.uniforms['speed'].value = 0.05;
    badTVPass.uniforms['rollSpeed'].value = 0;

    rgbPass.uniforms['angle'].value = 0;
    rgbPass.uniforms['amount'].value = 0.003;

    filmPass.uniforms['sCount'].value = 1000;
    filmPass.uniforms['sIntensity'].value = 0.6;
    filmPass.uniforms['nIntensity'].value = 0.4;

    group = new THREE.Group();
    scene.add(group);

    //start create/add earth

    var geometry = new THREE.SphereBufferGeometry(100, 350, 350);

    var textureLoader = new THREE.TextureLoader();
    var planetTexture = textureLoader.load('../img/earth_map.png', function(tex) {loader();});

    var material = new THREE.MeshBasicMaterial({
        map: planetTexture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    var earth = new THREE.Mesh(geometry, material);
    group.add(earth);

    //end create/add earth

    //start create/add quakes

    for (var i = 0; i < data.features.length; i++) {

        var geometry = new THREE.Geometry();
        var lat = data.features[i].geometry.coordinates[1];
        var lon = data.features[i].geometry.coordinates[0];
        var mag = data.features[i].properties.mag;

        var radius = 100;

        if (mag > 0) {

            var nmag = map(mag, 0, 8, 0, 1);
            var phi = (90 - lat) * (Math.PI / 180);
            var theta = (lon + 180) * (Math.PI / 180);
            var x = -((radius) * Math.sin(phi) * Math.cos(theta));
            var z = ((radius) * Math.sin(phi) * Math.sin(theta));
            var y = ((radius) * Math.cos(phi));
            var vertex = new THREE.Vector3(x, y, z);
            geometry.vertices.push(vertex);

            var vertex2 = vertex.clone();
            vertex2.multiplyScalar((nmag * 0.4) + 1);
            geometry.vertices.push(vertex2);
            var myCol = new THREE.Color(0xffffff);
            myCol.setHSL((mag / 5), 0.9, 0.6);
            var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: myCol, linewidth: 1}));

            group.add(line);
        }
    }

    //end create/add quakes
    
    group.rotation.x = 0; //keep earth vertical

    //add event listeners

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);
    document.addEventListener('touchmove', onDocumentTouchMove, false);
    window.addEventListener('resize', onWindowResize, false);
}

function loader() {

    loaded++;

    if (loaded >= toLoad) {

        var preloadScreen = document.getElementById("preloader").style.visibility = 'hidden';
        animate();
    }
}

function animate() {

    requestAnimationFrame(animate);
    render();
}

function render() {

    group.rotation.y += 0.005;
    camera.position.x += ((mouseX / 4) + 200 - camera.position.x) * 0.05;
    camera.position.y += (-(mouseY / 4) - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    shaderTime += 0.1;
    badTVPass.uniforms['time'].value = shaderTime;
    filmPass.uniforms['time'].value = shaderTime;
    composer.render(0.1);
}

//event handlers

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
}

function onDocumentTouchStart(event) {

    if (event.touches.length > 1) {

        event.preventDefault();

        mouseX = event.touches[0].pageX - windowHalfX;
        mouseY = event.touches[0].pageY - windowHalfY;
    }
}

function onDocumentTouchMove(event) {

    if (event.touches.length == 1) {

        event.preventDefault();

        mouseX = event.touches[0].pageX - windowHalfX;
        mouseY = event.touches[0].pageY - windowHalfY;
    }
}

//helper functions

function map(n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}


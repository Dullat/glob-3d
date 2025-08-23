import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";

const AttackGlobe = () => {
  const globeRef = useRef();
  const [countries, setCountries] = useState({ features: [] });

  useEffect(() => {
    // Natural earth data
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
      });
  }, []);

  useEffect(() => {
    if (!countries.features.length) return;
    const world = Globe()(globeRef.current)
      //.globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")

      // polygone
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3) // Hexagon size (0-15, 3 is good balance)
      .hexPolygonMargin(0.3) // Gap between hexagons (0-1)
      .hexPolygonUseDots(false) // Set to true for circular dots instead of hexagons
      .hexPolygonColor(() => `hsl(${Math.random() * 60 + 180}, 80%, 60%)`) // Random blue/cyan colors
      .hexPolygonAltitude(0.005) // Slight elevation
      .hexPolygonCurvatureResolution(5) // Surface curvature detail

      // Arc styling for attacks
      .arcColor(
        () => ["#ff4444", "#ff8800", "#ffaa00"][Math.floor(Math.random() * 3)],
      )
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2000)
      .arcsTransitionDuration(0)
      .arcStroke(0.5)

      // Add country dots
      .pointsData(generateCountryDots())
      .pointColor(() => "#4FC3F7")
      .pointAltitude(0.01)
      .pointRadius(0.15)
      .pointsMerge(true)

      // Atmosphere
      .showAtmosphere(true)
      .atmosphereColor("#3a228a")
      .atmosphereAltitude(0.25)

      // Globe material
      .globeMaterial(
        new THREE.MeshPhongMaterial({
          color: "#1a1a2e",
          shininess: 0.1,
          transparent: true,
          opacity: 0.9,
        }),
      );

    // Enhanced lighting setup
    const scene = world.scene();

    // Clear existing lights
    scene.children = scene.children.filter(
      (child) => !(child instanceof THREE.Light),
    );

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Main directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(-800, 2000, 400);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Secondary directional light for fill
    const fillLight = new THREE.DirectionalLight(0x3a228a, 0.9);
    fillLight.position.set(800, -1000, -400);
    scene.add(fillLight);

    // Point light for rim lighting effect
    const rimLight = new THREE.PointLight(0x4fc3f7, 0.8, 1000);
    rimLight.position.set(-400, 800, 600);
    scene.add(rimLight);

    // Hemisphere light for subtle environment
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x000000, 0.3);
    scene.add(hemiLight);

    // Camera setup
    const camera = world.camera();
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);

    // Enhanced background with gradient effect
    scene.background = new THREE.Color(0x040d21);

    // Add starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8,
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
      starsVertices.push(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
      );
    }
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3),
    );

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Enhanced attack simulation
    const attacks = [];
    const attackSources = [
      { lat: 39.9042, lng: 116.4074, name: "Beijing" },
      { lat: 55.7558, lng: 37.6173, name: "Moscow" },
      { lat: 40.7128, lng: -74.006, name: "New York" },
      { lat: 51.5074, lng: -0.1278, name: "London" },
      { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
      { lat: -33.8688, lng: 151.2093, name: "Sydney" },
      { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
      { lat: 52.52, lng: 13.405, name: "Berlin" },
    ];

    const targets = [
      { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
      { lat: 40.7128, lng: -74.006, name: "New York" },
      { lat: 51.5074, lng: -0.1278, name: "London" },
      { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    ];

    const attackInterval = setInterval(() => {
      const source =
        attackSources[Math.floor(Math.random() * attackSources.length)];
      const target = targets[Math.floor(Math.random() * targets.length)];

      if (source !== target) {
        const newArc = {
          startLat: source.lat,
          startLng: source.lng,
          endLat: target.lat,
          endLng: target.lng,
          strokeWidth: Math.random() * 2 + 0.5,
        };

        attacks.push(newArc);
        if (attacks.length > 25) attacks.shift();
        world.arcsData([...attacks]);
      }
    }, 800);

    // Auto rotation
    const rotationSpeed = 0.2;
    const rotateGlobe = () => {
      const camera = world.camera();
      const { x, y, z } = camera.position;

      camera.position.x =
        x * Math.cos(rotationSpeed * 0.01) - z * Math.sin(rotationSpeed * 0.01);
      camera.position.z =
        x * Math.sin(rotationSpeed * 0.01) + z * Math.cos(rotationSpeed * 0.01);
      camera.lookAt(0, 0, 0);

      requestAnimationFrame(rotateGlobe);
    };
    rotateGlobe();

    // Cleanup
    return () => {
      clearInterval(attackInterval);
    };
  }, [countries]);

  // Generate country dots data
  const generateCountryDots = () => {
    const dots = [];

    // Major cities and regions for dots
    const locations = [
      // North America
      { lat: 40.7128, lng: -74.006 },
      { lat: 34.0522, lng: -118.2437 },
      { lat: 41.8781, lng: -87.6298 },
      { lat: 29.7604, lng: -95.3698 },
      { lat: 33.4484, lng: -112.074 },
      { lat: 39.7392, lng: -104.9903 },

      // Europe
      { lat: 51.5074, lng: -0.1278 },
      { lat: 48.8566, lng: 2.3522 },
      { lat: 52.52, lng: 13.405 },
      { lat: 41.9028, lng: 12.4964 },
      { lat: 40.4168, lng: -3.7038 },
      { lat: 59.9311, lng: 30.3609 },

      // Asia
      { lat: 35.6762, lng: 139.6503 },
      { lat: 39.9042, lng: 116.4074 },
      { lat: 31.2304, lng: 121.4737 },
      { lat: 28.6139, lng: 77.209 },
      { lat: 1.3521, lng: 103.8198 },
      { lat: 37.5665, lng: 126.978 },

      // Others
      { lat: -33.8688, lng: 151.2093 },
      { lat: -23.5505, lng: -46.6333 },
      { lat: 30.0444, lng: 31.2357 },
      { lat: -26.2041, lng: 28.0473 },
    ];

    // Add some random scatter around each location
    locations.forEach((location) => {
      for (let i = 0; i < 3; i++) {
        dots.push({
          lat: location.lat + (Math.random() - 0.5) * 10,
          lng: location.lng + (Math.random() - 0.5) * 10,
          size: Math.random() * 0.3 + 0.1,
          color: "#4FC3F7",
        });
      }
    });

    return dots;
  };

  return <div ref={globeRef} className="w-full h-screen" />;
};

export default AttackGlobe;

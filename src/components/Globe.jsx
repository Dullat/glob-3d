// Globe Main player
import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";

const AttackGlobe = () => {
  const globeEl = useRef(null);
  const globeInstance = useRef(null);
  const spawnArc = useRef(null);
  const [loading, setLoading] = useState(true);
  const canvaRef = useRef(null);

  const [countries, setCountries] = useState({ features: [] });

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((e) => console.error("Failed to load countries:", e));
  }, []);

  useEffect(() => {
    if (!countries.features.length || globeInstance.current) return;

    const world = Globe()(globeEl.current)
      // Land polygons
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.3)
      .hexPolygonUseDots(false)
      .hexPolygonColor(() => `hsl(${Math.random() * 60 + 180}, 80%, 60%)`)
      .hexPolygonAltitude(0.005)
      .hexPolygonCurvatureResolution(5)

      // Arc, Use pre-arc
      .arcColor((a) => [a.colorHead || "#ff4d6d", a.colorTail || "#ffe3ea"])
      .arcStroke((a) => a.strokeWidth ?? 0.5)
      .arcAltitude((a) => a.altitude ?? 0.35)
      .arcAltitudeAutoScale(0.6)
      .arcDashLength((a) => a.dashLength ?? 0.2)
      .arcDashGap((a) => a.dashGap ?? 0.8)
      .arcDashInitialGap((a) => a.initialGap ?? 0)
      .arcDashAnimateTime((a) => a.animateTime ?? 1000)
      .arcsTransitionDuration(200)

      // Points
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

    // Spawns one traveling arc and remove it after lifetimeMs, This is the main shit
    function createAndDestroyArc(
      globe,
      {
        startLat,
        startLng,
        endLat,
        endLng,
        colorHead = "#ff4d6d",
        colorTail = "#ffe3ea",
        altitude = 0.5,
        animateTime = 2000, // travel speed
        lifetimeMs = 3000, // keep slightly longer than animateTime
        strokeWidth,
      },
    ) {
      if (!globe) return;

      const id = `arc_${Math.random().toString(36).slice(2)}`;
      const arc = {
        id,
        startLat,
        startLng,
        endLat,
        endLng,
        colorHead,
        colorTail,
        altitude,
        initialGap: 0.9,
        dashLength: 0.5,
        dashGap: 1.1,
        animateTime,
        strokeWidth,
      };

      // Append this arc
      const current = globe.arcsData();
      globe.arcsData([...current, arc]);

      // Remove this arc after lifetimeMs
      const t = setTimeout(() => {
        try {
          const after = globe.arcsData().filter((a) => a.id !== id);
          globe.arcsData(after);
        } finally {
          clearTimeout(t);
        }
      }, lifetimeMs);
    }

    // Lights
    const scene = world.scene();
    scene.children = scene.children.filter((c) => !(c instanceof THREE.Light));
    scene.add(new THREE.AmbientLight(0x404040, 0.4));

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(-800, 2000, 400);
    dir.castShadow = true;
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0x3a228a, 0.9);
    fill.position.set(800, -1000, -400);
    scene.add(fill);

    const rim = new THREE.PointLight(0x4fc3f7, 0.8, 1000);
    rim.position.set(-400, 800, 600);
    scene.add(rim);

    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x000000, 0.3));

    // Camera/background
    const camera = world.camera();
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);
    scene.background = new THREE.Color(0x040d21);
    scene.fog = new THREE.FogExp2(0x2a1a4e, 0.0005);

    // Stars
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
    scene.add(new THREE.Points(starsGeometry, starsMaterial));

    // Orbit
    const rotationSpeed = 0.2;
    let firstFrameDone = false;
    let rafId;
    const loop = () => {
      const { x, z } = camera.position;
      const angle = rotationSpeed * 0.01;
      camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      camera.lookAt(0, 0, 0);
      rafId = requestAnimationFrame(loop);
      if (!firstFrameDone) {
        firstFrameDone = true;
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    };
    loop();

    // Use world here coz globeInstance is not set yet
    spawnArc.current = (data) => {
      console.log(data);
      const severityColorMap = {
        low: "#4caf50",
        med: "#ff9800",
        high: "#f44336",
      };
      const color = severityColorMap[data.severity?.toLowerCase()] || "#9e9e9e";

      const intensity = data.intensity / 100;
      const tailColor = "#1BFFFF"; //`rgba(255, 0, 0, ${intensity}`;

      createAndDestroyArc(world, {
        startLat: data.startLat,
        startLng: data.startLng,
        endLat: data.endLat,
        endLng: data.endLng,
        animateTime: 5000,
        lifetimeMs: 7000,
        colorHead: color,
        colorTail: color,
        strokeWidth: intensity,
      });
    };

    globeInstance.current = world; // Will be used outside for later work

    return () => {
      cancelAnimationFrame(rafId);
      try {
        world._destructor && world._destructor();
      } catch {}
      globeInstance.current = null;
    };
  }, [countries]);

  // Get data and spawn arc with loop
  useEffect(() => {
    if (!globeInstance.current) return;
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/attacks");
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.attacks)) return;
        console.log(data);
        data.attacks.forEach((a) => spawnArc.current(a));
      } catch (err) {
        console.log("no data", err);
      }
    };
    fetchData();
  }, [loading]);

  return (
    <div className="relative w-full h-screen">
      <button
        onClick={() => spawnArc.current()}
        className="absolute left-5 top-5  text-white z-50 bg-amber-500"
      >
        hhhh
      </button>
      <div ref={globeEl} className="w-full h-full" />
    </div>
  );
};

const generateCountryDots = () => {
  const dots = [];
  const locations = [
    { lat: 40.7128, lng: -74.006 },
    { lat: 34.0522, lng: -118.2437 },
    { lat: 41.8781, lng: -87.6298 },
    { lat: 51.5074, lng: -0.1278 },
    { lat: 48.8566, lng: 2.3522 },
    { lat: 35.6762, lng: 139.6503 },
    { lat: -33.8688, lng: 151.2093 },
    { lat: 55.7558, lng: 37.6176 },
  ];

  locations.forEach((loc) => {
    for (let i = 0; i < 3; i++) {
      dots.push({
        lat: loc.lat + (Math.random() - 0.5) * 10,
        lng: loc.lng + (Math.random() - 0.5) * 10,
        size: Math.random() * 0.3 + 0.1,
        color: "#4FC3F7",
      });
    }
  });
  return dots;
};

export default AttackGlobe;

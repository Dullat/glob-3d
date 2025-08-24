// Just fuking with my own brain
import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { colorFromSeverityIntensity } from "./setColors";
import clamp01 from "./clamp";

const AttackGlobe = () => {
  const globeEl = useRef(null);
  const globeInstance = useRef(null);
  const spawnArc = useRef(null);
  const [loading, setLoading] = useState(true);

  const [hoveredArc, setHoveredArc] = useState({});
  const [showToolTip, setShowToolTip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const toolTipTimeoutRef = useRef(null);

  const [countries, setCountries] = useState({ features: [] });

  // Satellite
  const [isSatellite, setIsSatellite] = useState(false);

  // ================== Satellite Static Data ================== //
  const sat = {
    id: "sat-1",
    // name: "NEON-SAT-1",
    lat: 60, // Russia
    lng: 90,
    altitude: 0.18,
  };
  // ======================================================================== //

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

      // Arcs
      .arcColor((a) => [a.colorHead || "#ff4d6d", a.colorTail || "#ffe3ea"])
      .arcStroke((a) => a.strokeWidth ?? 0.5)
      .arcAltitude((a) => a.altitude ?? 0.35)
      .arcAltitudeAutoScale(0.6)
      .arcDashLength((a) => a.dashLength ?? 0.2)
      .arcDashGap((a) => a.dashGap ?? 0.8)
      .arcDashInitialGap((a) => a.initialGap ?? 0)
      .arcDashAnimateTime((a) => a.animateTime ?? 1000)
      .arcsTransitionDuration(200)
      .onArcHover((arc) => {
        if (toolTipTimeoutRef.current) clearTimeout(toolTipTimeoutRef.current);
        if (arc) {
          setHoveredArc(arc.data);
          setIsSatellite(false);
          setShowToolTip(true);
          console.log(arc.data);
        } else {
          toolTipTimeoutRef.current = setTimeout(() => {
            setShowToolTip(false);
          }, 2000);
        }
      })

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

    // ================== Satellite model with GLTFLoader (no R3Fiber) ================== //
    const gltfCache = { sat: null };
    const loader = new GLTFLoader();

    function addHalo(group, radius = 3.2) {
      const haloGeom = new THREE.SphereGeometry(radius, 200, 200);
      const haloMat = new THREE.MeshBasicMaterial({
        color: "#00e5ff",
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      group.add(halo);
    }

    function makeSatelliteObject() {
      const group = new THREE.Group();
      group.userData.kind = "satellite";

      if (gltfCache.sat) {
        const inst = gltfCache.sat.clone(true);
        inst.scale.set(3.0, 3.0, 3.0); // adjust to taste
        // For now its not working , just keep it static
        // inst.rotation.set(
        //   THREE.MathUtils.degToRad(10),
        //   THREE.MathUtils.degToRad(45),
        //   THREE.MathUtils.degToRad(0)
        // );
        group.add(inst);
        addHalo(group);
        return group;
      }

      // Placeholder while GLB loading
      const placeholder = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshStandardMaterial({
          color: "#00e5ff",
          emissive: "#0077ff",
          emissiveIntensity: 1.3,
          metalness: 0.25,
          roughness: 0.35,
        }),
      );
      group.add(placeholder);
      addHalo(group);

      // Load GLB from public/
      loader.load(
        "/satelite2.glb",
        (gltf) => {
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material?.isMeshStandardMaterial) {
                o.material.emissive ||= new THREE.Color("#0088ff");
                o.material.emissiveIntensity = Math.max(
                  0.6,
                  o.material.emissiveIntensity || 0.6,
                );
              }
            }
          });

          gltfCache.sat = gltf.scene;

          // Replace placeholder wtih model
          group.remove(placeholder);
          const inst = gltfCache.sat.clone(true);
          inst.scale.set(3.0, 3.0, 3.0);
          group.add(inst);
        },
        undefined,
        (err) => console.error("Failed to load /satelite2.glb:", err),
      );

      return group;
    }

    world
      .objectsData([sat])
      .objectThreeObject(() => makeSatelliteObject())
      // .objectLabel(
      //   (obj) => `🛰 ${obj.name}<br/>Alt: ${obj.altitude.toFixed(2)} R`,
      // )
      .objectLat((obj) => obj.lat)
      .objectLng((obj) => obj.lng)
      .objectAltitude((obj) => obj.altitude)
      .objectFacesSurface(true)
      .objectRotation({ x: 10, y: 45, z: 90 })
      .onObjectHover((o) => {
        if (toolTipTimeoutRef.current) clearTimeout(toolTipTimeoutRef.current);
        if (o) {
          setHoveredArc(o);
          setIsSatellite(true);
          setShowToolTip(false);
          console.log(o);
        } else {
          toolTipTimeoutRef.current = setTimeout(() => {
            setIsSatellite(false);
          }, 2000);
        }
      });
    // ========================= End of Satellite ================================= //

    // Spawns one traveling arc and remove it after lifetimeMs
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
        animateTime = 2000,
        lifetimeMs = 3000,
        strokeWidth,
        data = "no-data",
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
        dashGap: 1.1, // Keep it based on initialGap otherwise you fkd
        animateTime,
        strokeWidth,
        data,
      };

      const current = globe.arcsData();
      globe.arcsData([...current, arc]);

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

    // Hover mesh helper, it adds invisible around the Arc for better Hover detection
    scene.traverse((child) => {
      if (child.isMesh && child.userData.type === "arc") {
        const hoverGeometry = child.geometry.clone();
        hoverGeometry.scale(5, 5, 5);
        const hoverMesh = new THREE.Mesh(
          hoverGeometry,
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
          }),
        );
        hoverMesh.userData.originalArc = child;
        scene.add(hoverMesh);
      }
    });

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

    // ================== Orbit (camera ONLY, satellite is static for now) ================== //
    const rotationSpeed = 0.2;
    let firstFrameDone = false;
    let rafId;

    const loop = () => {
      // Camera orbit
      const { x, z } = camera.position;
      const angle = rotationSpeed * 0.01;
      camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      camera.lookAt(0, 0, 0);

      rafId = requestAnimationFrame(loop);

      if (!firstFrameDone) {
        firstFrameDone = true;
        setTimeout(() => setLoading(false), 0);
      }
    };
    loop();
    // =============================================================================== //

    // Arc spawner
    spawnArc.current = (data) => {
      const { head, tail } = colorFromSeverityIntensity(
        data.severity,
        data.intensity,
      );

      createAndDestroyArc(world, {
        startLat: data.startLat,
        startLng: data.startLng,
        endLat: data.endLat,
        endLng: data.endLng,
        animateTime: 4000,
        lifetimeMs: 6000,
        colorHead: head,
        colorTail: tail,
        strokeWidth: 0.6,
        altitude: Math.round((data.altitude ?? 0.5) * 100) / 100,
        data: {
          intensity: data.intensity,
          severity: data.severity,
          attackType: data.attackType,
          target: data.target,
          targetCountry: data.targetCountry,
          sourceCountry: data.sourceCountry,
          between: `${data.sourceCountry} ---> ${data.targetCountry}`,
          head: head,
          tail: tail,
        },
      });
    };

    globeInstance.current = world;

    return () => {
      cancelAnimationFrame(rafId);
      try {
        world._destructor && world._destructor();
      } catch {}
      globeInstance.current = null;
    };
  }, [countries]);

  // Mouse position to globe container
  useEffect(() => {
    const handleMouseMove = (event) => {
      const rect = globeEl.current.getBoundingClientRect();
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    if (globeEl.current) {
      globeEl.current.addEventListener("mousemove", handleMouseMove);
      return () => {
        globeEl.current?.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, []);

  // Get data and spawn arc with loop
  useEffect(() => {
    if (!globeInstance.current) return;
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/attacks");
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.attacks)) return;
        data.attacks.forEach((a) => spawnArc.current(a));
      } catch {}
    };

    let timeoutId;
    const scheduleNext = async () => {
      const delay = 1000 + Math.random() * 4000;
      timeoutId = setTimeout(async () => {
        await fetchData();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [loading]);

  return (
    <div className="relative w-full h-screen">
      {showToolTip && !isSatellite && (
        <div
          className="absolute z-30 flex flex-col p-2 rounded font-light min-w-max text-blue-50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            backgroundColor: `rgba(0, 0, 0, 0.5)`,
            border: `1px solid blue`,
            fontSize: `10px`,
            boxShadow: `
              0 0 10px ${hoveredArc.head},
              0 0 10px ${hoveredArc.head},
              0 0 10px ${hoveredArc.tail},
              inset 0 0 5px rgba(0, 255, 255, 0.1)
            `,
            transform: `translateX(20%)`,
          }}
        >
          <p>Intensity: {hoveredArc.intensity}</p>
          <p>Sevearty : {hoveredArc.severity}</p>
          <p>Target : {hoveredArc.target}</p>
          <p>{hoveredArc.between}</p>
        </div>
      )}
      {isSatellite && (
        <div
          className="absolute z-30 flex flex-col p-2 rounded font-light min-w-max text-blue-50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            backgroundColor: `rgba(0, 0, 0, 0.5)`,
            border: `1px solid #ff2dc6`,
            fontSize: `10px`,
            boxShadow: `
                0 0 7px #ff2dc6,
                0 0 10px #ff2dc6,
                0 0 10px #ff00ff,
                inset 0 0 5px rgba(0, 255, 255, 0.1)
              `,
            transform: `translateX(20%)`,
          }}
        >
          <p>SE-SAT-1</p>
          <p>Lat: {hoveredArc.lat} </p>
          <p>Lng: {hoveredArc.lng} </p>
          <button style={{ color: `#ff2dc6` }}> Click me For More</button>
        </div>
      )}
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

"use client";
// 3D viewer (/tools/3d-viewer).
// Drop in a model — GLB/GLTF, OBJ (+MTL), STL, PLY, FBX or 3MF — and turn it over in your
// hands. A .gltf or .obj that points at sidecar files (.bin, .mtl, textures) works when
// those files are dropped alongside it: every loader request is resolved against the
// dropped set by file name. The scene wears the active Potter flavor.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { FlavorSwitch } from "./flavor-switch";
import { saveToolFiles } from "../lib/tool-files";

type Phase = "idle" | "loading" | "ready" | "error";

type Stats = { meshes: number; triangles: number; vertices: number; size: THREE.Vector3; animations: number };

// Most-specific first: a dropped .gltf wins over the textures dropped next to it.
const MODEL_EXTS = ["glb", "gltf", "fbx", "obj", "stl", "ply", "3mf"] as const;
type ModelExt = (typeof MODEL_EXTS)[number];

const ACCEPT = ".glb,.gltf,.bin,.obj,.mtl,.stl,.ply,.fbx,.3mf,.png,.jpg,.jpeg,.webp,.ktx2,.tga,.bmp";
const DRACO_DECODERS = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const baseName = (url: string) => decodeURIComponent(url.split(/[?#]/)[0].split(/[\\/]/).pop() ?? "").toLowerCase();

function cssColor(name: string, fallback: string): THREE.Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  try {
    return new THREE.Color(v || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function accentColor(): THREE.Color {
  const css = getComputedStyle(document.documentElement);
  const v = (css.getPropertyValue("--site-accent") || css.getPropertyValue("--potter-peach")).trim();
  // --site-accent may be a var() reference; resolve it through a throwaway element.
  if (v.startsWith("var(")) {
    const probe = document.createElement("span");
    probe.style.color = v;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return new THREE.Color(resolved);
  }
  return new THREE.Color(v || "#e08a6a");
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}

function measure(root: THREE.Object3D, animations: number): Stats {
  let meshes = 0;
  let triangles = 0;
  let vertices = 0;
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g?.attributes?.position) return;
    meshes++;
    vertices += g.attributes.position.count;
    if ((o as THREE.Mesh).isMesh) triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { meshes, triangles: Math.round(triangles), vertices, size, animations };
}

/** (Re)builds the floor grid in the current flavor's colours; GridHelper bakes colours in. */
function placeGrid(t: { scene: THREE.Scene; grid: THREE.GridHelper | null }, size: number, divisions: number) {
  const visible = t.grid?.visible ?? true;
  if (t.grid) {
    t.scene.remove(t.grid);
    t.grid.geometry.dispose();
    (t.grid.material as THREE.Material).dispose();
  }
  t.grid = new THREE.GridHelper(size, divisions, cssColor("--potter-overlay0", "#888"), cssColor("--potter-surface1", "#555"));
  t.grid.userData = { size, divisions };
  t.grid.visible = visible;
  t.scene.add(t.grid);
}

function sampleModel(): THREE.Object3D {
  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1, 0.32, 220, 32),
    new THREE.MeshStandardMaterial({ color: accentColor(), roughness: 0.35, metalness: 0.15 }),
  );
  mesh.name = "sample";
  return mesh;
}

async function loadModel(
  files: File[],
  urls: Map<string, string>,
): Promise<{ object: THREE.Object3D; animations: THREE.AnimationClip[]; name: string }> {
  const main = MODEL_EXTS.map((e) => files.find((f) => ext(f.name) === e)).find(Boolean);
  if (!main) throw new Error("No model in there — try a .glb, .gltf, .obj, .stl, .ply, .fbx or .3mf.");

  for (const f of files) urls.set(f.name.toLowerCase(), URL.createObjectURL(f));
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => urls.get(baseName(url)) ?? url);
  const mainUrl = urls.get(main.name.toLowerCase())!;
  const kind = ext(main.name) as ModelExt;
  const material = () => new THREE.MeshStandardMaterial({ color: accentColor(), roughness: 0.5, metalness: 0.1 });

  switch (kind) {
    case "glb":
    case "gltf": {
      const draco = new DRACOLoader(manager).setDecoderPath(DRACO_DECODERS);
      const loader = new GLTFLoader(manager).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
      try {
        const gltf = await loader.loadAsync(mainUrl);
        return { object: gltf.scene, animations: gltf.animations, name: main.name };
      } finally {
        draco.dispose();
      }
    }
    case "obj": {
      const loader = new OBJLoader(manager);
      const mtl = files.find((f) => ext(f.name) === "mtl");
      if (mtl) {
        const materials = await new MTLLoader(manager).loadAsync(urls.get(mtl.name.toLowerCase())!);
        materials.preload();
        loader.setMaterials(materials);
      }
      const object = await loader.loadAsync(mainUrl);
      if (!mtl) object.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material = material()) : null));
      return { object, animations: [], name: main.name };
    }
    case "stl": {
      const geometry = await new STLLoader(manager).loadAsync(mainUrl);
      const mat = material();
      if (geometry.hasAttribute("color")) mat.vertexColors = true;
      return { object: new THREE.Mesh(geometry, mat), animations: [], name: main.name };
    }
    case "ply": {
      const geometry = await new PLYLoader(manager).loadAsync(mainUrl);
      const vertexColors = geometry.hasAttribute("color");
      if (!geometry.index) {
        // No faces: it's a point cloud.
        const pts = new THREE.PointsMaterial({ size: 0.01, sizeAttenuation: true, vertexColors });
        if (!vertexColors) pts.color = accentColor();
        return { object: new THREE.Points(geometry, pts), animations: [], name: main.name };
      }
      if (!geometry.hasAttribute("normal")) geometry.computeVertexNormals();
      const mat = material();
      mat.vertexColors = vertexColors;
      return { object: new THREE.Mesh(geometry, mat), animations: [], name: main.name };
    }
    case "fbx": {
      const object = await new FBXLoader(manager).loadAsync(mainUrl);
      return { object, animations: object.animations, name: main.name };
    }
    case "3mf": {
      const object = await new ThreeMFLoader(manager).loadAsync(mainUrl);
      return { object, animations: [], name: main.name };
    }
  }
}

export function ModelViewer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("sample");
  const [stats, setStats] = useState<Stats | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [grid, setGrid] = useState(true);
  const [playing, setPlaying] = useState(true);

  const hostRef = useRef<HTMLDivElement>(null);
  const three = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    grid: THREE.GridHelper | null;
    model: THREE.Object3D | null;
    mixer: THREE.AnimationMixer | null;
    home: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  } | null>(null);
  const urlsRef = useRef(new Map<string, string>());
  const loadId = useRef(0);

  const revokeUrls = useCallback(() => {
    for (const u of urlsRef.current.values()) URL.revokeObjectURL(u);
    urlsRef.current.clear();
  }, []);

  /** Swap the model in, sit it on the grid, and frame it. */
  const show = useCallback((object: THREE.Object3D, animations: THREE.AnimationClip[]) => {
    const t = three.current;
    if (!t) return;
    if (t.model) {
      t.scene.remove(t.model);
      disposeObject(t.model);
    }
    t.mixer?.stopAllAction();
    t.mixer = null;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    t.scene.add(object);
    t.model = object;

    const radius = Math.max(size.length() / 2, 1e-3);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(t.camera.fov / 2)) * 1.15;
    t.camera.near = dist / 1000;
    t.camera.far = dist * 100;
    t.camera.updateProjectionMatrix();
    const target = new THREE.Vector3(0, size.y / 2, 0);
    const position = target.clone().add(new THREE.Vector3(0.9, 0.55, 1).normalize().multiplyScalar(dist));
    t.camera.position.copy(position);
    t.controls.target.copy(target);
    t.controls.maxDistance = dist * 20;
    t.controls.update();
    t.home = { position: position.clone(), target: target.clone() };

    // Grid lines every power of ten that gives ~10–100 cells under the model.
    const span = Math.max(size.x, size.z) * 3 || 1;
    const step = Math.pow(10, Math.floor(Math.log10(span / 10)));
    const gridSize = Math.ceil(span / step) * step;
    placeGrid(t, gridSize, Math.round(gridSize / step));

    if (animations.length) {
      t.mixer = new THREE.AnimationMixer(object);
      t.mixer.clipAction(animations[0]).play();
    }
    setStats(measure(object, animations.length));
  }, []);

  // --- scene setup ---
  useEffect(() => {
    const host = hostRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(3, 6, 4);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 1.5;

    three.current = { renderer, scene, camera, controls, grid: null, model: null, mixer: null, home: null };

    const paint = () => {
      scene.background = cssColor("--potter-mantle", "#1c1812");
      const t = three.current;
      if (t?.grid) placeGrid(t, t.grid.userData.size, t.grid.userData.divisions);
    };
    paint();
    // Follow flavor/accent changes made anywhere on the page.
    const themeWatch = new MutationObserver(paint);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-potter-flavor", "style"] });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    show(sampleModel(), []);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      three.current?.mixer?.update(dt);
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      themeWatch.disconnect();
      ro.disconnect();
      controls.dispose();
      const t = three.current;
      if (t?.model) disposeObject(t.model);
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      three.current = null;
      revokeUrls();
    };
  }, [show, revokeUrls]);

  // --- view toggles ---
  useEffect(() => {
    if (three.current) three.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const t = three.current;
    if (t?.grid) t.grid.visible = grid;
  }, [grid, stats]);

  useEffect(() => {
    three.current?.model?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ("wireframe" in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe;
      }
    });
  }, [wireframe, stats]);

  useEffect(() => {
    const mixer = three.current?.mixer;
    if (mixer) mixer.timeScale = playing ? 1 : 0;
  }, [playing, stats]);

  // --- file intake ---
  const intake = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      if (!files.length) return;
      const id = ++loadId.current;
      setError(null);
      setPhase("loading");
      saveToolFiles("3d-viewer", files);
      revokeUrls();
      try {
        const { object, animations, name } = await loadModel(files, urlsRef.current);
        if (id !== loadId.current) return disposeObject(object);
        show(object, animations);
        setName(name.replace(/\.[^.]+$/, ""));
        setPlaying(true);
        setPhase("ready");
      } catch (e) {
        if (id !== loadId.current) return;
        setError(e instanceof Error ? e.message : "Couldn't read that model.");
        setPhase("error");
      }
    },
    [show, revokeUrls],
  );

  const resetView = useCallback(() => {
    const t = three.current;
    if (!t?.home) return;
    t.camera.position.copy(t.home.position);
    t.controls.target.copy(t.home.target);
    t.controls.update();
  }, []);

  const snapshot = useCallback(() => {
    const t = three.current;
    if (!t) return;
    // Render and read in the same task so the drawing buffer is still intact.
    t.renderer.render(t.scene, t.camera);
    t.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-snapshot.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [name]);

  const fmt = (n: number) => n.toLocaleString("en-US");
  const dim = (n: number) => (n === 0 ? "0" : n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toPrecision(2));

  return (
    <div style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--potter-subtext1)" }}>
            <Link href="/tools" className="transition-opacity hover:opacity-70">Tools</Link>
            <FlavorSwitch size="sm" />
          </div>
        </div>

        <header className="mt-10 sm:mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            3d viewer
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Turn it over in your hands
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Drop in a GLB, GLTF, OBJ, STL, PLY, FBX or 3MF model and orbit, zoom and inspect it. Got a .gltf
            or .obj with textures? Drop the whole lot in together.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.length) intake(e.dataTransfer.files);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              className="relative overflow-hidden rounded-2xl"
              style={{
                height: "min(70vh, 560px)",
                minHeight: 360,
                border: dragging ? "2px dashed var(--site-accent, var(--potter-peach))" : "1px solid var(--potter-surface0)",
              }}
            >
              <div ref={hostRef} className="absolute inset-0" style={{ touchAction: "none" }} />

              {phase === "idle" && (
                <p
                  className="pointer-events-none absolute bottom-3 left-3 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.7)", color: "var(--potter-subtext1)" }}
                >
                  drop a model here
                </p>
              )}

              {phase === "loading" && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.6)" }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-subtext1)" }}>
                    reading the model…
                  </p>
                </div>
              )}

              {error && (
                <p
                  className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-center text-sm"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.85)", color: "var(--potter-red)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
              drag to orbit · right-drag to pan · scroll to zoom · models you open are saved to Potter&apos;s storage
            </p>
          </div>

          <aside className="space-y-6">
            <div className="space-y-2">
              <Label>Model</Label>
              <label
                className="block cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors"
                style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
              >
                Open model
                <input
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) intake(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {stats && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]" style={{ color: "var(--potter-subtext0)" }}>
                  <dt style={{ color: "var(--potter-overlay2)" }}>file</dt>
                  <dd className="truncate" title={name}>{name}</dd>
                  <dt style={{ color: "var(--potter-overlay2)" }}>meshes</dt>
                  <dd>{fmt(stats.meshes)}</dd>
                  <dt style={{ color: "var(--potter-overlay2)" }}>triangles</dt>
                  <dd>{fmt(stats.triangles)}</dd>
                  <dt style={{ color: "var(--potter-overlay2)" }}>vertices</dt>
                  <dd>{fmt(stats.vertices)}</dd>
                  <dt style={{ color: "var(--potter-overlay2)" }}>size</dt>
                  <dd>
                    {dim(stats.size.x)} × {dim(stats.size.y)} × {dim(stats.size.z)}
                  </dd>
                  {stats.animations > 0 && (
                    <>
                      <dt style={{ color: "var(--potter-overlay2)" }}>animations</dt>
                      <dd>{stats.animations}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>

            <div className="space-y-2">
              <Label>View</Label>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={autoRotate} onClick={() => setAutoRotate((v) => !v)}>Spin</Pill>
                <Pill active={wireframe} onClick={() => setWireframe((v) => !v)}>Wireframe</Pill>
                <Pill active={grid} onClick={() => setGrid((v) => !v)}>Grid</Pill>
                {stats && stats.animations > 0 && (
                  <Pill active={playing} onClick={() => setPlaying((v) => !v)}>Animate</Pill>
                )}
              </div>
              <button
                onClick={resetView}
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
              >
                Reset view
              </button>
            </div>

            <button
              onClick={snapshot}
              className="w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
            >
              Save snapshot PNG
            </button>

            <p className="text-xs leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
              Rendering happens in your browser with three.js. Draco-compressed GLBs fetch their decoder from
              Google&apos;s CDN the first time.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-overlay2)" }}>
      {children}
    </p>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--site-accent, var(--potter-peach))" : "var(--potter-surface0)",
        color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
      }}
    >
      {children}
    </button>
  );
}

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';

// --- Types ---
interface CoinParams {
  thickness: number;
  color: string;
  metalness: number;
  roughness: number;
  burstPower: number;
  gravity: number;
}

interface ButtonParams {
  width: number;
  height: number;
  stroke: number;
  verticalPos: number; // New parameter for vertical position
}

interface CoinBurstRef {
  burst: (x: number, y: number) => void;
}

// --- 3D Coin Scene Component ---
const CoinBurstScene = forwardRef<CoinBurstRef, { params: CoinParams }>(({ params }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef(params);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    coins: Array<{
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      rotationSpeed: THREE.Vector3;
      life: number;
    }>;
  } | null>(null);

  // Keep paramsRef in sync
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 150);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 100);
    pointLight2.position.set(-5, 3, 2);
    scene.add(pointLight2);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    scene.add(hemisphereLight);

    camera.position.z = 10;

    sceneRef.current = { scene, camera, renderer, coins: [] };

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const state = sceneRef.current;
      if (state) {
        for (let i = state.coins.length - 1; i >= 0; i--) {
          const coin = state.coins[i];
          
          coin.mesh.position.add(coin.velocity);
          coin.velocity.y -= paramsRef.current.gravity; 
          
          coin.mesh.rotation.x += coin.rotationSpeed.x;
          coin.mesh.rotation.y += coin.rotationSpeed.y;
          coin.mesh.rotation.z += coin.rotationSpeed.z;

          coin.life -= 0.01;
          
          if (coin.life < 0.5) {
            const material = coin.mesh.material as THREE.MeshStandardMaterial;
            material.transparent = true;
            material.opacity = Math.max(0, coin.life * 2);
          }

          if (coin.life <= 0) {
            state.scene.remove(coin.mesh);
            state.coins.splice(i, 1);
          }
        }
        
        state.renderer.render(state.scene, state.camera);
      }
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); 

  useImperativeHandle(ref, () => ({
    burst: (screenX: number, screenY: number) => {
      const state = sceneRef.current;
      if (!state) return;

      const vector = new THREE.Vector3(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1,
        0.5
      );
      vector.unproject(state.camera);
      const dir = vector.sub(state.camera.position).normalize();
      const distance = -state.camera.position.z / dir.z;
      const pos = state.camera.position.clone().add(dir.multiplyScalar(distance));

      const coinCount = 50; 
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, paramsRef.current.thickness, 32); 
      
      for (let i = 0; i < coinCount; i++) {
        const coinMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(paramsRef.current.color),
          metalness: paramsRef.current.metalness,
          roughness: paramsRef.current.roughness,
          emissive: new THREE.Color(paramsRef.current.color).multiplyScalar(0.2),
          emissiveIntensity: 0.5
        });

        const coinMesh = new THREE.Mesh(geometry, coinMaterial);
        coinMesh.position.copy(pos);
        
        coinMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        
        state.scene.add(coinMesh);
        
        state.coins.push({
          mesh: coinMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * paramsRef.current.burstPower,
            Math.random() * paramsRef.current.burstPower * 1.25 + paramsRef.current.burstPower * 0.5,
            (Math.random() - 0.5) * paramsRef.current.burstPower * 0.5
          ),
          rotationSpeed: new THREE.Vector3(
            Math.random() * 0.2,
            Math.random() * 0.2,
            Math.random() * 0.2
          ),
          life: 2.0 + Math.random()
        });
      }
    }
  }));

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9999]" />;
});

CoinBurstScene.displayName = 'CoinBurstScene';

// --- Main App Component ---

export default function App() {
  const [isOn, setIsOn] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const burstRef = useRef<CoinBurstRef>(null);

  // Coin Parameters (Saved Defaults)
  const [params] = useState<CoinParams>({
    thickness: 0.1,
    color: '#ffd700',
    metalness: 0.8,
    roughness: 0.2,
    burstPower: 0.4,
    gravity: 0.015
  });

  // Button Parameters (Further scaled to 80% of previous)
  const [btnParams] = useState<ButtonParams>({
    width: 164,
    height: 82,
    stroke: 2,
    verticalPos: 30 // Default height at 30%
  });

  const handleToggle = () => {
    if (isAnimating) return;

    setIsOn(true);
    setIsAnimating(true);
    
    if (buttonRef.current && burstRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      burstRef.current.burst(centerX, centerY);
    }

    setTimeout(() => {
      setIsOn(false);
      setTimeout(() => {
        setIsAnimating(false);
      }, 600); 
    }, 1800);
  };

  // Calculate knob size and travel distance
  const padding = 4;
  const knobSize = btnParams.height - (btnParams.stroke * 2) - (padding * 2);
  const travelDistance = btnParams.width - knobSize - (btnParams.stroke * 2) - (padding * 2);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 font-sans overflow-hidden relative">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} 
      />
      
      <CoinBurstScene ref={burstRef} params={params} />
      
      {/* Main Button Container */}
      <div 
        className="relative z-10 transition-all duration-300 ease-out"
        style={{ 
          marginTop: `${btnParams.verticalPos}vh`,
          transform: 'translateY(-50%)'
        }}
      >
        <button
          ref={buttonRef}
          onClick={handleToggle}
          disabled={isAnimating}
          className="relative flex items-center cursor-pointer outline-none group active:scale-95 transition-transform"
          id="coin-toggle-button"
        >
          {/* Background & Border */}
          <motion.div
            style={{
              width: btnParams.width,
              height: btnParams.height,
              borderWidth: btnParams.stroke,
              padding: padding
            }}
            className="rounded-full flex items-center"
            animate={{
              backgroundColor: isOn ? '#E8F0FE' : '#D1D5DB',
              borderColor: isOn ? '#4285F4' : '#BCC1C8',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Knob */}
            <motion.div
              layout
              style={{
                width: knobSize,
                height: knobSize
              }}
              className="rounded-full"
              animate={{
                x: isOn ? travelDistance : 0,
                backgroundColor: isOn ? '#4285F4' : '#FFFFFF',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            />
          </motion.div>
        </button>
      </div>
    </div>
  );
}

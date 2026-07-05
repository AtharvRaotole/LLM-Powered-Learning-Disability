import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

export default function ShaderBackground() {
  return (
    <ShaderGradientCanvas
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      pixelDensity={1}
      fov={45}
    >
      <ShaderGradient
        animate="off"
        axesHelper="off"
        brightness={1.2}
        cAzimuthAngle={180}
        cDistance={3.6}
        cPolarAngle={90}
        cameraZoom={1}
        color1="#6BCB77"
        color2="#5DADE2"
        color3="#FFFFFF"
        destination="onCanvas"
        embedMode="off"
        envPreset="city"
        format="gif"
        fov={45}
        frameRate={10}
        gizmoHelper="hide"
        grain="on"
        lightType="3d"
        pixelDensity={1}
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        range="disabled"
        rangeEnd={40}
        rangeStart={0}
        reflection={0.1}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        shader="defaults"
        type="plane"
        uAmplitude={1}
        uDensity={1.3}
        uFrequency={5.5}
        uSpeed={0.1}
        uStrength={1.3}
        uTime={0}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}

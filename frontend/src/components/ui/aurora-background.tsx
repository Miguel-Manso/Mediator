import React, { useMemo } from 'react';

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  gradientColors?: string[];
  pulseDuration?: number;
  starCount?: number;
  showRadialGradient?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = '',
  gradientColors = [
    'rgba(222, 108, 32, 0.40)', // Laranja Mediator (#DE6C20)
    'rgba(13, 34, 58, 0.75)',   // Azul Escuro (#0D223A)
    'rgba(42, 75, 110, 0.50)',  // Azul Ardósia (#2A4B6E)
    'rgba(240, 138, 60, 0.30)', // Laranja Dourado
  ],
  pulseDuration = 8,
  starCount = 80,
  showRadialGradient = true,
  ...props
}) => {
  // Gera posições e tempos para as estrelas cintilantes
  const stars = useMemo(() => {
    return Array.from({ length: starCount }, (_, i) => {
      const top = ((i * 19 + 29) % 97) + (i % 3);
      const left = ((i * 37 + 43) % 97) + (i % 4);
      const size = (i % 3) + 1;
      const opacity = ((i % 5) + 3) / 10;
      const delay = (i % 7) * 0.6;
      const duration = 2.5 + (i % 4) * 1.1;
      return { id: i, top, left, size, opacity, delay, duration };
    });
  }, [starCount]);

  const color1 = gradientColors[0] || 'rgba(222, 108, 32, 0.40)';
  const color2 = gradientColors[1] || 'rgba(13, 34, 58, 0.75)';
  const color3 = gradientColors[2] || 'rgba(42, 75, 110, 0.50)';
  const color4 = gradientColors[3] || 'rgba(240, 138, 60, 0.30)';

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[#07111D] text-slate-100 flex items-center justify-center ${className}`}
      {...props}
    >
      {/* Camada 1: Campo de Estrelas Cintilantes (Twinkling Stars) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white transition-opacity"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Camada 2: Ondas e Feixes Aurora Fluidos com Paleta Laranja & Azul Escuro */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Feixe 1: Laranja Quente (#DE6C20) no canto superior */}
        <div
          className="absolute -top-[25%] -left-[10%] h-[75vh] w-[75vw] rounded-full blur-[90px] mix-blend-screen opacity-70 will-change-transform"
          style={{
            background: `radial-gradient(circle at center, ${color1} 0%, transparent 70%)`,
            animation: `aurora-drift-1 ${pulseDuration * 1.5}s ease-in-out infinite alternate`,
          }}
        />

        {/* Feixe 2: Azul Profundo Mediator (#0D223A) à direita */}
        <div
          className="absolute top-[10%] -right-[15%] h-[85vh] w-[80vw] rounded-full blur-[100px] mix-blend-screen opacity-80 will-change-transform"
          style={{
            background: `radial-gradient(circle at center, ${color2} 0%, transparent 70%)`,
            animation: `aurora-drift-2 ${pulseDuration * 2}s ease-in-out infinite alternate`,
          }}
        />

        {/* Feixe 3: Azul Ardósia (#2A4B6E) na base */}
        <div
          className="absolute -bottom-[20%] left-[20%] h-[70vh] w-[70vw] rounded-full blur-[90px] mix-blend-screen opacity-75 will-change-transform"
          style={{
            background: `radial-gradient(circle at center, ${color3} 0%, transparent 70%)`,
            animation: `aurora-drift-3 ${pulseDuration * 1.7}s ease-in-out infinite alternate`,
          }}
        />

        {/* Feixe 4: Laranja Dourado Brilhante Central */}
        <div
          className="absolute top-[35%] left-[30%] h-[60vh] w-[50vw] rounded-full blur-[80px] mix-blend-screen opacity-65 will-change-transform"
          style={{
            background: `radial-gradient(circle at center, ${color4} 0%, transparent 65%)`,
            animation: `aurora-pulse ${pulseDuration}s ease-in-out infinite alternate`,
          }}
        />
      </div>

      {/* Camada 3: Máscara Radial / Vinheta Suave de Foco */}
      {showRadialGradient && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(7, 17, 29, 0.65) 75%, rgba(7, 17, 29, 0.95) 100%)',
          }}
        />
      )}

      {/* Conteúdo em Primeiro Plano */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;


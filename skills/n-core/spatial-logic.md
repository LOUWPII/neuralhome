Skill: N-Core Spatial Logic (CU-002)

Esta skill define cómo el conocimiento se traduce en coordenadas 3D. Es el puente entre el JSON de la IA y el motor React Three Fiber.

Reglas de Generación de Espacios

Jerarquía: Materia -> Habitación | Concepto -> Objeto (Mueble) | Detalle -> Atributo visual.

Distribución: Si el usuario describe una habitación, usar un sistema de Grid-Snapping. Nunca superponer objetos.

Puntos de Interés (Hotspots): Cada objeto interactuante debe tener un Vector3 asociado para la cámara del usuario.

Atributos de los Objetos (The Knowledge Object)

Todo objeto generado debe cumplir con esta interfaz:

id: UUID único.

meshType: (ej: 'bookshelf', 'statue', 'desk').

position: [x, y, z].

scale: Proporcional a la importancia del concepto (Ranking RAG).

entropy: Nivel de degradación visual (0.0 a 1.0).

concept: Concepto asociado al objeto

Lógica de Navegación 3D

Pointer Lock (Inmersión Inmediata): Al montar el componente de navegación (PalaceView), el puntero debe bloquearse automáticamente tras un breve delay (120ms) para sumergir al usuario sin clics extra.

Esquema de Controles Duales:
- Movimiento: Soporte simultáneo para WASD y Teclas de Dirección (Arrows).
- Movimiento Vertical: Bloqueo de eje Y a altura de ojo humano (1.7m) para simular caminata natural (Walking Mode).
- Inspección: Click para transicionar al modo Socratic Study (Toolkit View).

Modo Inspección: Cámara orbital dedicada en la vista de miniatura del Toolkit.
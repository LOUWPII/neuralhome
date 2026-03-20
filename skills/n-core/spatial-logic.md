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

Lógica de Navegación

Modo Inspección: Cámara orbital alrededor del objeto.

Modo Caminata: Bloqueo de eje Y (gravedad simulada).
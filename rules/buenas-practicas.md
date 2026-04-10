---
trigger: always_on
---

NeuralHome Workspace Rules

1. Misión del Agente

Eres el ingeniero principal de NeuralHome. Tu objetivo es transformar PDFs en experiencias 3D. Debes priorizar la inmersión, el rendimiento del motor 3D y la coherencia pedagógica.

2. Principios de Código (Vibe Coding)

Modularidad Radical: Cada Caso de Uso (CU) debe vivir en su propio módulo. No mezcles lógica de IA con lógica de renderizado.

Contrato JSON Primero: Antes de crear cualquier función de integración, verifica que el JSON respete el esquema definido en el "Contrato de Datos Principal".

Internacionalización (i18n): Todos los componentes de IA y UI deben respetar la preferencia de idioma del usuario almacenada en `AuthContext`. No mezclar idiomas.

Zero-Trust UI: Asume que el motor 3D puede fallar. Siempre incluye placeholders y fallbacks visuales.

3. Estándares Técnicos

Frontend: React + React Three Fiber. Usa componentes funcionales y Hooks para el estado del mundo.

Backend: FastAPI con tipado estricto (Pydantic).

Persistencia: Supabase para Auth y tablas relacionales de retención.

Controles Inmersivos: Todas las vistas 3D deben implementar `PointerLockControls` con auto-lock y soporte dual (`WASD` + `Arrows`).

4. Gestión de Skills

Antes de ejecutar una tarea compleja (como generar el algoritmo de entropía), busca en la carpeta .skills/ si existe una metodología predefinida. Si no existe y la tarea es recurrente, crea una nueva skill.
# NeuralHome: Documentación Técnica y Arquitectura (V1.2)

## 📌 1. Visión General del Proyecto
**NeuralHome** es una aplicación innovadora de "Palacio Mental 3D" (Mind Palace) que transforma documentos de estudio (PDFs) estructurados y aburridos en un entorno espacial interactivo en 3D. 

El sistema utiliza **RAG (Retrieval-Augmented Generation)** combinado con motores de renderizado web **WebGL (Three.js)**. La premisa es mejorar la retención de memoria alojando físicamente "conceptos de conocimiento" extraídos por Inteligencia Artificial sobre objetos 3D interactivos dentro de diversas habitaciones temáticas.

---

## 🏗 2. Arquitectura del Sistema

La aplicación sigue una arquitectura cliente-servidor estrictamente desacoplada usando REST APIs y validación por JWT:

### 🖥 Frontend (Cliente 3D & Estudio)
- **Framework Core**: React 18 + Vite.
- **Renderizado 3D**: `Three.js` vía `@react-three/fiber` y `@react-three/drei`.
- **Navegación**: `react-router-dom` con rutas protegidas.
- **Autenticación**: Supabase Auth con soporte para **preferencias de idioma (ES/EN)** en `user_metadata`.
- **Vistas Especializadas**: 
  - `PalaceView`: Exploración inmersiva en primera persona (FPS).
  - `StudyToolkitView`: Interfaz de estudio *split-screen* (Chat Socrático + Miniatura 3D).

### ⚙️ Backend (API Inteligente)
- **Framework Core**: `FastAPI` (Python 3.10+) ejecutado por Uvicorn (`app.main`).
- **Lectura de PDF**: `PyMuPDF` (`fitz`), escogido por su velocidad y eficiencia en memoria.
- **IA Generativa (Groq)**:
  - `llama-3.1-8b-instant`: Chat conversacional socrático (latencia < 200ms).
  - `llama-3.3-70b-versatile`: Extracción de conceptos y mapeo espacial 1-a-1.
- **Embeddings**: 'BAAI/bge-small-en-v1.5' (HuggingFace local).
- **Control de Acceso**: Inyección de dependencias de FastAPI verificando los JWT headers (`SupabaseDep`).

### 🗄 Base de Datos y Seguridad (Supabase/PostgreSQL)
- Las tablas clave son `palaces` (habitaciones) y `concepts` (los objetos generados dentro de la habitación).
- **Vector Search**: Extensión `pgvector` activada para buscar la similitud del texto con los embeddings (futuro).
- **Seguridad**: `Row Level Security (RLS)` para garantizar un *multi-tenant* seguro. Cada usuario solo puede consultar y eliminar (vía `ON DELETE CASCADE`) su propia data vinculada a su `auth.uid()`.

---

## 🔄 3. Flujos de Datos Clave (Pipelines)

### A. Pre-Ingesta: "El Neural Architect"
Antes de construir la habitación, el usuario interactúa con un asesor IA socrático (endpoint `/api/ingest/architect`). El objetivo es estructurar la mentalidad del usuario, ayudarle a definir "Qué quiero aprender", pero **no** genera la habitación aún.

### B. Ingesta RAG y Mapeo Cognitivo (`rag_pipeline.py`)
Cuando el usuario envía el formulario con el PDF, se ejecuta este pipeline crítico de 5 pasos:
1. **Extracción**: `PyMuPDF` extrae un texto plano crudo pero rápido.
2. **Chunking Traslapado**: El texto se divide en piezas de ~300 tokens solapando los bordes para mantener contexto.
3. **Embeddings**: El modelo local genera los vectores matemáticos de todos los chunks.
4. **Extracción Lógica (Limitada 1-a-1)**: El texto resumido se envía al Heavy-LLM (Llama-70B). El backend le inyecta las **"Anclas"** de la habitación seleccionada (Ej. escritorio, servidores, puerta). *Regla estricta:* Extraer exactamente tantos conceptos como objetos físicos haya en el espacio, ni más ni menos (evita overlaps).
5. **Alineación de Contexto**: Se cruzan los conceptos del LLM con el mejor *Chunk* generado, pegándole su embedding para futuras consultas. Se guarda todo en Supabase de forma estructurada.

### C. Visualización Espacial (`RoomEnvironment.jsx` y `KnowledgeObject.jsx`)
- El frontend consulta a Supabase y levanta el entorno 3D.
- Dinámicamente selecciona el diseño de la habitación (Ej. `neon_dev` o `silicon_valley`).
- Despliega objetos interactivos invisibles con iluminaciones y etiquetas de "Feynman Summary" que flotan en las posiciones fijas (`roomAnchors.js`) donde el modelo lógico del Backend decidió engancharlos.

### D. Modo Estudio Inmersivo (Socratic Chat)
Al hacer clic en un objeto, el sistema transiciona a una vista de estudio:
1. **Frontend**: Carga `StudyToolkitView` con el ID del concepto.
2. **Backend**: Recupera el `chunk_text` (contexto) y el idioma del usuario.
3. **LLM**: El tutor socrático genera preguntas, pistas o explicaciones basadas en el contexto y el idioma preferido.

---

## 🚨 4. Correcciones y Bugs Críticos Resueltos en Sprint 1
1. **Geometric Primitives & Realistic Assets**: Se migró de usar bloques y esferas abstractas a etiquetas interactuables (hitboxes) invisibles y luces atadas a los objetos fijos reales del mapa (escritorios, monitores, columnas).
2. **Solapamiento Visual**: Se implementó una traba en `llm_service.py` (`PALACE_EXTRACTION_PROMPT`) reduciendo las alucinaciones del modelo para asignar 1 concepto estricto por ancla, logrando orden en pantalla.
3. **Ghost Deletion (RLS Cascade)**: Se parcheó un conocido bug de Postgres vía PostgREST, implementando una eliminación manual por fases en el backend (`DELETE /palace/{id}`) borrando primero hijos y luego padres independientemente.

---


## ✨ 5. Mejoras de UI/UX — Sprint 2 (Landing Page)

En este sprint se trabajó exclusivamente sobre la **Landing Page** (`LandingPage.jsx`), mejorando su nivel de impacto visual y experiencia de usuario de forma significativa.

### 5.1 Logo en Navbar
**Archivo afectado**: `frontend/src/pages/LandingPage.jsx`, `frontend/public/logo.png`

- Se reemplazó el placeholder de círculo morado sólido del navbar por el **logo oficial de NeuralHome** (ícono de cerebro-casa, neon lila).
- El logo PNG fue procesado programáticamente para eliminar su fondo blanco y convertirlo a **PNG transparente** con tono neón `#c4b5fd` mediante un script Python (`Pillow`), pixel a pixel.
- En el JSX, se aplicó `filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.7))` para que el logo emita el característico glow del sistema de diseño.
- Las proporciones se mantienen con `objectFit: contain` a `34×34px`, perfectamente alineado al texto con `gap: 0.5rem`.

```jsx
<img
  src="/logo.png"
  alt="NeuralHome Logo"
  style={{
    width: '34px',
    height: '34px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.7))',
  }}
/>
```

### 5.2 Efecto de Mouse Trail (Partículas en Canvas)
**Archivo creado**: `frontend/src/components/HeroParticleCanvas.jsx`

Se construyó un componente React nuevo que encapsula un **loop de renderizado Canvas 2D de alto rendimiento** que genera un rastro de partículas brillantes tipo estrella al mover el cursor sobre el área principal del Landing.

#### Características técnicas:
| Aspecto | Detalle |
|---|---|
| **Renderer** | Canvas 2D nativo (`requestAnimationFrame` loop a ~60fps) |
| **Scoping** | Scoped vía `containerRef` al `<main>` del Landing (no contamina otras páginas) |
| **Mobile** | Detecta `@media (hover: none)` y desactiva el efecto completamente en dispositivos táctiles |
| **Partículas** | 2–4 por evento de mousemove, pool máx. 300 |
| **Física** | Drift vertical suave (`vy -= 0.015`), drag horizontal (`vx *= 0.98`), desvanecimiento por `decay` individual |
| **Glow** | Doble render: aura radial externa suave + núcleo brillante blanco sólido |
| **Colores** | Variación HSL en rango 255-284 (violeta/lila) con `sat: 70-90%` y `light: 70-90%` |

#### Corrección crítica del bug RAF (Race Condition):
El efecto paraba de funcionar a los ~2 segundos en modo desarrollo debido a una **race condition entre React StrictMode y `requestAnimationFrame`**. StrictMode monta/desmonta componentes dos veces intencionalmente; cuando el cleanup corría, el frame RAF ya en cola se ejecutaba de todas formas y re-agendaba el loop creando un **loop zombie**.

**Solución**: Se introdujo el flag `isCleanedUpRef`:
```js
// En cleanup
isCleanedUpRef.current = true;  // señal de "terminado"

// Primera línea del render loop
if (isCleanedUpRef.current) return; // el zombie se detiene solo
```
Adicionalmente, el `useEffect` usa `deps: []` (corre exactamente una vez por montaje), y el listener de mousemove usa `{ passive: true }` para mejor rendimiento de scroll.

### 5.3 Expansión del Área Interactiva
**Archivo afectado**: `frontend/src/pages/LandingPage.jsx`

El efecto de partículas originalmente estaba scoped solo a la sección `<section>` del hero. Las figuras geométricas decorativas (⌬ ◆ ⎔) estaban en un bloque hermano **afuera del canvas**, por lo que el efecto se cortaba al bajar.

**Solución**: Se reorganizó el JSX creando un `<main ref={heroRef}>` unificado que envuelve tanto la sección del hero como el bloque decorativo:

```
<main ref={heroRef}> ← Canvas scoped aquí (cubre todo)
  <HeroParticleCanvas containerRef={heroRef} />
  <section> ... Hero text y botones ... </section>
  <div> ... Figuras ⌬ ◆ ⎔ ... </div>
</main>
```

---

## ✨ 4. Logros Recientes — Sprint 3 (Socratic Toolkit)

Se ha completado la integración del **Tutor Socrático Inmersivo**, elevando la aplicación de una herramienta de visualización a una plataforma de aprendizaje activo.

### 4.1 Panel de Estudio Split-Screen
**Archivo**: `frontend/src/pages/StudyToolkitView.jsx`
- **Diseño 40/60**: Panel de chat izquierdo (vidrio esmerilado) y visualización 3D derecha.
- **Miniatura 3D (`ConceptMiniature.jsx`)**: Representación visual abstracta e interactiva que flota para anclar la memoria visual mientras se chatea.
- **Resumen Feynman**: Acordeón integrado para lectura rápida de la síntesis del concepto.

### 4.2 Lógica de Tutoría Socrática
**Archivo**: `backend/app/services/llm_service.py`
- **Estrategia de 3 Fases**:
  1. *Fase 1*: Solo preguntas abiertas.
  2. *Fase 2*: Preguntas + pistas espaciales (referenciando el objeto en el palacio).
  3. *Fase 3*: Preguntas + explicaciones breves tras fallos repetidos.
- **Detección de Fatiga**: El modelo simplifica el lenguaje si detecta frustración del usuario.

### 4.3 Internacionalización Dinámica
- El sistema ahora solicita el idioma preferido (**Español/Inglés**) al crear la cuenta.
- El chatbot adapta estrictamente su respuesta al idioma seleccionado por el usuario, eliminando mezclas lingüísticas indeseadas.

### 4.4 Mejoras UX de Navegación
- **Auto-Lock 3D**: Al entrar a una habitación, el puntero se bloquea automáticamente en el entorno 3D, eliminando clics innecesarios.
- **Controles Duales**: Soporte simultáneo para `WASD` y `Flechas de Dirección`.

---

## 🚀 6. Próximos Pasos & Roadmap (Sprints 3-Parte 2)

1. **Socratic Study Toolkit**: Al dar *click* real en los objetos holográficos 3D, se abrirá el socratic chat. Inyectando el *embedding vec* específico de ese objeto para charlar con la IA solo sobre ese concepto concreto.
2. **Inyección de Modelos GLTF/GLB**: Reemplazar y enriquecer la infraestructura harcodeada del entorno con modelos CAD o GLB externos (sillas fotorrealistas, tazas lofi, etc). La estructura del *KnowledgeObject* ya está lista para anclarse encima de ellos.
3. **"Upload Photo to Room"**: Extender la creación de habitaciones implementando un modelo LLM con Visión que analice fotos de la vida real (ej. el cuarto real del usuario) e infiera colores/entornos, re-generando automáticamente las anclas.
4. **Persistencia del Estado del Knowledge**: Añadir un indicador visual semáforo (ej. Rojo/Amarillo/Verde) a los conceptos según el progreso en el chat Socrático del usuario (midiendo su asimilación del tema).
5. **Gamificación del Dominio**:
   - Implementar un sistema de calificación (0-100%) basado en el asimilamiento detectado por el tutor socrático.
   - Cambiar el color/aura del objeto en el palacio 3D (El objeto se va volviendo a escala de grises a medida de que el usuario no practique el concepto o falle demasiado al responder las preguntas del tutor socrático).
6. **Multi-Model Assets**: Reemplazar hitboxes básicos por modelos GLTF realistas (muebles, gadgets, arte) para mayor inmersión.

---

## 🛠 6. Estándares de Desarrollo
- **Backend**: FastAPI con inyección de dependencias `SupabaseDep`.
- **Frontend**: Componentes funcionales, Vanilla CSS, R3F para la capa espacial.
- **Git**: Flujo de ramas `feat/name` y `fix/name`.
- **Estética**: Prioridad absoluta al Glassmorphism, Neones y Glow effects.

---

## 🛠 7. Cambios y Modificaciones Restantes para el Siguiente Sprint

Para lograr los puntos del Roadmap anterior, se deben ejecutar los siguientes cambios en la infraestructura de la app:

### Integración del Socratic Chat & Study Toolkits
- **`src/3d/KnowledgeObject.jsx`**: Se añadirá un evento `onClick` que navegará (o transicionará de pantalla) llevando consigo el ID del concepto seleccionado hacia el modo "Inmersión de Estudio".
- **Nueva Interfaz de Estudio Dedicada**: En vez de solo abrir un panel lateral sobre el Palacio Mental, se cambiará a una vista completa diseñada para concentración:
  - **Encabezado**: Mostrará una pequeña imagen/miniatura en 3D del concepto y su objeto físico correspondiente que fue clickeado, a modo de ancla mental.
  - **Lado Izquierdo (40% de la pantalla)**: Albergara el **Chat Socrático**. Una interfaz fluida y amena para conversar y debatir con el LLM sobre ese concepto específico.
  - **Lado Derecho (60% de la pantalla)**: Exhibirá el panel de **Study Toolkits** (Herramientas de Estudio) permitiendo alternar o visualizar opciones como: *Flashcards*, *Feynman Technique* (ejercicios de explicárselo a la IA), *Cuestionarios (Quizzes)* y *Hands-on Practice*.
- **Backend API (`app/api/endpoints/chat.py` o `study.py`)**: Se crearán los nuevos endpoints REST/WebSocket necesarios para el Chat Socrático y la generación en tiempo real de los Flashcards y Quizzes.
- **Backend LLM (`app/services/llm_service.py`)**: Se conectará `chat_about_concept` utilizando RAG sobre el `chunk_text` atado al objeto, integrando a **Llama 3.1 (8B)** para una respuesta conversacional ultra rápida.

### Gamificación del Espacio 3D (Dominio Cognitivo)
- Se activará en uso de la columna `status` en la tabla `concepts` (Supabase). Cuando el chat socrático termine, un LLM evaluador (en el background) calificará el conocimiento de 0.0 a 1.0. 
- En el frontend, `KnowledgeObject.jsx` leerá el estado (0=rojo, 0.5=amarillo, 1.0=verde brillante/destrucción del cascarón oscuro) cambiando su material visualmente para indicar progreso.

### Transición Total a Materiales GLTF/GLB
- La carpeta pública `public/models/` deberá hospedar los diferentes assets interactivos definitivos obtenidos de repositorios CC0.
- El archivo constructivo central `RoomEnvironment.jsx` cambiará su código nativo manual (ej. `<boxGeometry />`) por nodos importados de los archivos binarios 3D vía `const { nodes, materials } = useGLTF('/models/monitor.glb')` de *Drei*. Las lógicas de las anclas `getAnchorDisplayPosition` están preparadas para simplemente colocar las etiquetas encima de este nuevo andamiaje ultrarrealista sin necesidad de reescribir la capa de abstracción.

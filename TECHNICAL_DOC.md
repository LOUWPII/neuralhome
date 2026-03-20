# NeuralHome: Documentación Técnica y Arquitectura (V1.0)

## 📌 1. Visión General del Proyecto
**NeuralHome** es una aplicación innovadora de "Palacio Mental 3D" (Mind Palace) que transforma documentos de estudio (PDFs) estructurados y aburridos en un entorno espacial interactivo en 3D. 

El sistema utiliza **RAG (Retrieval-Augmented Generation)** combinado con motores de renderizado web **WebGL (Three.js)**. La premisa es mejorar la retención de memoria alojando físicamente "conceptos de conocimiento" extraídos por Inteligencia Artificial sobre objetos 3D interactivos dentro de diversas habitaciones temáticas.

---

## 🏗 2. Arquitectura del Sistema

La aplicación sigue una arquitectura cliente-servidor estrictamente desacoplada usando REST APIs y validación por JWT:

### 🖥 Frontend (Cliente 3D)
- **Framework Core**: React 18 + Vite.
- **Renderizado 3D**: `Three.js` implementado de forma declarativa mediante `@react-three/fiber` y `@react-three/drei`.
- **Navegación & Estado**: `react-router-dom` y React Hooks.
- **Autenticación & DB**: SDK de Supabase JS (`@supabase/supabase-js`).
- **Estilos**: Vanilla CSS puro (`index.css`) con variables CSS modernas y animaciones glassmorfismo.

### ⚙️ Backend (API Inteligente)
- **Framework Core**: `FastAPI` (Python 3.10+) ejecutado por Uvicorn (`app.main`).
- **Lectura de PDF**: `PyMuPDF` (`fitz`), escogido por su velocidad y eficiencia en memoria.
- **Motor de Embeddings (Local)**: 'BAAI/bge-small-en-v1.5' operando en hugging face
- **Motor LLM (Nube)**: `Groq` API (compatible con OpenAI Wrapper) utilizando:
  - `llama-3.1-8b-instant`: Para chat en tiempo real rápido (Neural Architect).
  - `llama-3.3-70b-versatile`: Para el procesamiento profundo (mapeo lógico 1-a-1 de conceptos a anclas espaciales).
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

---

## 🚨 4. Correcciones y Bugs Críticos Resueltos en Sprint 1
1. **Geometric Primitives & Realistic Assets**: Se migró de usar bloques y esferas abstractas a etiquetas interactuables (hitboxes) invisibles y luces atadas a los objetos fijos reales del mapa (escritorios, monitores, columnas).
2. **Solapamiento Visual**: Se implementó una traba en `llm_service.py` (`PALACE_EXTRACTION_PROMPT`) reduciendo las alucinaciones del modelo para asignar 1 concepto estricto por ancla, logrando orden en pantalla.
3. **Ghost Deletion (RLS Cascade)**: Se parcheó un conocido bug de Postgres vía PostgREST, implementando una eliminación manual por fases en el backend (`DELETE /palace/{id}`) borrando primero hijos y luego padres independientemente.

---

## 🚀 5. Próximos Pasos & Roadmap (Sprints 2+)

1. **Socratic Study Toolkit**: Al dar *click* real en los objetos holográficos 3D, se abrirá un chat socrático lateral. Se inyectará el contexto y el *embedding vec* específico de ese objeto para charlar con la IA solo sobre ese concepto concreto.
2. **Inyección de Modelos GLTF/GLB**: Reemplazar y enriquecer la infraestructura harcodeada del entorno con modelos CAD o GLB externos (sillas fotorrealistas, tazas lofi, etc). La estructura del *KnowledgeObject* ya está lista para anclarse encima de ellos.
3. **"Upload Photo to Room"**: Extender la creación de habitaciones implementando un modelo LLM con Visión que analice fotos de la vida real (ej. el cuarto real del usuario) e infiera colores/entornos, re-generando automáticamente las anclas.
4. **Persistencia del Estado del Knowledge**: Añadir un indicador visual semáforo (ej. Rojo/Amarillo/Verde) a los conceptos según el progreso en el chat Socrático del usuario (midiendo su asimilación del tema).

---

## 🛠 6. Cambios y Modificaciones Restantes para el Siguiente Sprint

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

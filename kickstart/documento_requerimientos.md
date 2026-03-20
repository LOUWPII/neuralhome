# NeuralHome AI: Briefing Estratégico para el

# Equipo de Desarrollo

## 1. La Visión

**NeuralHome** no es una aplicación de estudio tradicional; es una **Interfaz de
Navegación del Conocimiento**. Nuestra tesis es que el cerebro humano no evolucionó
para leer listas de texto plano, sino para navegar espacios físicos. Estamos
construyendo una plataforma que usa IA para transformar documentos pasivos (PDFs)
en **Palacios Mentales 3D dinámicos**. Lo ideal es que el usuario pueda ver su palacio
mental completo, que sería como una casa partida por la mitad para ver las
habitaciones y sus nombres, si la persona no tiene todavia habitaciones deberá poder
crear una habitacion desde cero y cargar el contenido,lo ideal es que una persona
pueda cargar la imagen de alguna habitacion o describir la habitacion y neuralhome se
la creará en 3D. las habitciones son áreas de conocimiento o asignaturas.

## 2. El Problema que Resolvemos

- **Crisis de Atención:** Los métodos de estudio actuales son pasivos e ineficientes.
- **Sobrecarga Cognitiva:** El 70% de lo aprendido se olvida en 24 horas.
- **El "Burnout" Académico:** Los estudiantes gastan más energía organizando la
    información que aprendiéndola.

## 3. Arquitectura del Ecosistema (Nuestros 5 Pilares)

Para que el equipo trabaje de forma desacoplada, hemos dividido el sistema en 5
Casos de Uso (CU):

1. **CU-001 (Brain Ingest):** Pipeline RAG donde Gemini analiza el PDF y
    extrae una jerarquía de conceptos en formato JSON.
2. **CU-002 (Spatial Engine):** Motor 3D (React Three Fiber) que toma ese JSON y
    construye una habitación explorable automáticamente.
3. **CU-003 (Study Toolkit):** Interfaz de interacción donde una guía socrática (IA)
    ayuda al usuario a estudiar cada objeto mediante la técnica de Feynman.
4. **CU-004 (Entropy Engine):** Lógica que degrada visualmente los objetos
    (polvo/oscuridad) si el usuario no repasa, basándose en la curva del olvido.


5. **CU-005 (Analytics Dashboard):** Panel 2D de control para ver métricas de
    retención y progreso global.

## 4. Stack Tecnológico (2026 Workflow)

No queremos reinventar la rueda. Vamos a iterar a máxima velocidad usando:

- **Backend:** FastAPI (Python) + Google Gemini API (Vertex AI).
- **Frontend:** React + Vite + React Three Fiber (Three.js para React).
- **Persistencia:** Supabase (Auth, DB y Storage).
- **Metodología:** _Vibe Coding_ asistido por IA, google antigravity

## 5. El "Contrato" de Datos Principal

El puente entre la IA y el 3D será un objeto JSON. Todos los desarrolladores deben
respetar esta estructura:

- id: Identificador del concepto.
- label: Nombre del objeto.
- position: Coordenadas {x, y, z}.
- status: Nivel de retención (0.0 a 1.0).
- context: Texto original del PDF para el tutor.

## 6. Filosofía de Desarrollo

1. **IA-Primero:** Si una tarea toma más de 10 minutos de búsqueda en Google,
    pídele a la IA que genere un prototipo o resuelva el bug.
2. **Modularidad Estricta:** El motor 3D no debe saber cómo se analizó el PDF, solo
    debe saber cómo renderizar el JSON resultante.
3. **MVP Funcional:** Priorizamos que el flujo "PDF -> Habitación -> Chat" funcione,
    antes de preocuparnos por la estética final de los muebles.

**NeuralHome es donde la mnemotecnia milenaria se encuentra con la Inteligencia
Artificial de vanguardia. Bienvenidos al equipo.**


# Hoja de Ruta: NeuralHome MVP (

# Sprints)

Este plan está diseñado para un equipo de 4 personas utilizando herramientas de IA
(Cursor, Gemini 1.5 Pro, Supabase).

## 🟢 SPRINT 1: "El Latido Digital" (Infraestructura y

## Pipeline)

**Objetivo:** Lograr el flujo "Documento -> Datos -> Objeto 3D básico".

- **Backend:** Configuración de FastAPI y conexión con Gemini 1.5 Pro. Crear el
    prompt que extrae conceptos y les asigna coordenadas (JSON).
- **Frontend:** Configurar el entorno con React + Vite + React Three Fiber. Renderizar
    una habitación vacía con un suelo y una luz.
- **Integración:** El sistema debe recibir un PDF y mostrar un "cubo" en el espacio
    3D por cada concepto extraído.
- **Hito Final:** Subo un PDF de 2 páginas y veo 5 cubos posicionados en una escena
    3D en el navegador.

## 🟡 SPRINT 2: "Habitación de la Memoria" (Motor 3D y

## Persistencia)

**Objetivo:** Transformar cubos en una experiencia de navegación real.

- **3D Engine:** Implementar controles de primera persona (WASD) y colisiones.
    Sustituir cubos por modelos 3D reales (.glb) usando librerías gratuitas.
- **Database:** Configurar Supabase para guardar los palacios. Si cierro el
    navegador y vuelvo a entrar, mi habitación debe estar ahí.
- **UI/UX:** Crear la interfaz de carga (Drag & Drop) y un "Loader" con estética
    futurista mientras la IA procesa.
- **Hito Final:** Puedo caminar dentro de una biblioteca virtual donde los
    libros/objetos representan mis temas de estudio.


## 🟠 SPRINT 3: "El Tutor Socrático" (Interacción y

## Toolkit)

**Objetivo:** Hacer que el conocimiento sea interactivo y conversacional.

- **Study Toolkit:** Implementar el "Raycasting" (clic en objeto) para abrir un panel
    lateral de estudio.
- **AI Tutor:** Conectar el chat con el contexto del objeto. Programar el "Modo
    Feynman" donde la IA me escucha/lee y me califica.
- **Contextualización:** El tutor debe poder citar la página exacta del PDF original
    cuando el usuario tenga dudas.
- **Hito Final:** Hago clic en un busto romano en mi palacio y empiezo a chatear con
    Gemini sobre "Derecho Romano" basándose en mis apuntes.

## 🔴 SPRINT 4: "Biología del Olvido" (Entropía y

## Dashboard)

**Objetivo:** Cerrar el ciclo con métricas y efectos visuales de retención.

- **Algoritmo de Olvido:** Programar la lógica de repetición espaciada. Si no entro
    en 24h, los objetos pierden brillo.
- **Shaders de Entropía:** Añadir efectos visuales (polvo o transparencia) a los
    objetos que necesitan repaso.
- **Dashboard:** Crear la vista 2D con gráficas de Supabase que muestren cuánta
    "maestría" tengo en cada tema.
- **Despliegue:** Publicar la app en Vercel (Frontend) y Cloud Run (Backend).
- **Hito Final:** Presentación del MVP completo: un palacio vivo que se degrada si no
    estudio y un reporte que me dice qué tan cerca estoy del examen.

## 🛠️ Matriz de Responsabilidades (Sugerida)

```
Rol Encargado de... Herramienta Clave
```
```
Líder (Tú) System Prompts y lógica RAG. Google AI Studio
```

```
Dev
Backend
```
```
FastAPI, Supabase y Algoritmo de
Olvido. Cursor + Python^
```
```
Dev
Frontend
```
```
UI de React, Dashboard y Conexiones
API. Cursor + Tailwind^
```
```
Dev 3D
```
```
Escena R3F, Navegación y Modelos
GLB.
```
```
Cursor + React Three
Fiber
```
## 🚀 Criterios de Éxito del MVP

1. **Carga:** < 15s para procesar un documento estándar.
2. **Persistencia:** Los objetos no se mueven de sitio solos entre sesiones.
3. **Valor:** El usuario siente que "entiende" más el tema después de hablar con el
    tutor que solo leyendo el PDF.

# Especificación de Requerimientos

# Funcionales: CU- 01

**Caso de Uso:** Ingesta, Pipeline y Creación Arquitectónica. **Objetivo:** Transformar un
documento pasivo (PDF) en una estructura de datos activa para un entorno 3D.

## 1. Gestión de Documentos y Carga

- **RF-01.1: Soporte Multiformato:** El sistema debe permitir la carga de archivos
    en formato PDF (prioritario), permitiendo en futuras iteraciones imágenes
    (JPG/PNG).
- **RF-01.2: Límite de Tamaño:** El sistema debe soportar archivos de hasta 20MB o
    un equivalente a 500 páginas (aprovechando la ventana de contexto de Gemini).
- **RF-01.3: Validación de Carga:** El sistema debe verificar que el archivo no esté
    corrupto y que el contenido sea legible (OCR básico si el PDF es imagen).


## 2. Inteligencia de Extracción (Brain Pipeline)

- **RF-01.4: Extracción Semántica:** El sistema debe identificar los conceptos
    clave, definiciones y jerarquías del documento sin intervención humana.
- **RF-01.5: Mapeo de Objetos (Mapping):** El sistema debe asignar un objeto
    mnemotécnico a cada concepto principal basado en la relevancia y el tema (ej.
    Concepto de "Sanción" -> Objeto "Martillo de Juez").
- **RF-01.6: Generación de Resúmenes Feynman:** Para cada concepto extraído,
    la IA debe generar una explicación simplificada (Nivel 5 años) que se
    almacenará como metadato del objeto.

## 3. Generación Arquitectónica (Spatial Engine)

- **RF-01.7: Generación de Coordenadas:** El sistema debe calcular posiciones
    relativas (X, Y, Z) para cada objeto dentro de los límites de la habitación
    predefinida para evitar colisiones visuales.
- **RF-01.8: Determinismo JSON:** El pipeline debe devolver un esquema JSON
    estandarizado que incluya: ID_Objeto, Tipo_Modelo_3D, Posicion, Escala,
    Concepto_Asociado y Metadata_Estudio.
- **RF-01.9: Persistencia de Palacio:** Una vez generado el plano, el sistema debe
    guardar la configuración en la base de datos vinculada al userId del estudiante.

## 4. Interfaz y Feedback (UI/UX)

- **RF-01.10: Indicador de Progreso Real:** El sistema debe mostrar al usuario en
    qué etapa del pipeline se encuentra (Extrayendo texto -> Analizando conceptos -
    > Construyendo habitación).
- **RF-01.11: Previsualización de Selección:** El usuario debe poder confirmar o
    regenerar la propuesta de la IA si los conceptos extraídos no son de su interés
    antes de entrar al 3D.

## Criterios de Aceptación (Para el QA del equipo)

1. **Éxito:** Al subir un PDF de 10 páginas, el sistema debe tardar menos de 15
    segundos en proponer el esquema de la habitación.
2. **Integridad:** El JSON resultante debe ser válido y contener al menos 5 objetos
    distribuidos en la escena.
3. **Consistencia:** Si se sube el mismo documento dos veces, la selección de
    conceptos principales debe ser coherente (mínimo 80% de coincidencia).


# Especificación de Requerimientos

# Funcionales: CU- 002

**Caso de Uso:** Motor de Visualización y Navegación del Palacio Mental 3D **Actor:**
Estudiante / Motor Gráfico (Sistema)

## 1. Descripción del Caso de Uso

El sistema debe proveer un entorno tridimensional inmersivo que actúe como la
interfaz principal de navegación del conocimiento. Este motor es responsable de
transformar la jerarquía de datos generada en el CU-001 en una estructura
arquitectónica explorable, gestionando el renderizado, las físicas de colisión y la
persistencia de la ubicación espacial de los activos.

## 2. Requerimientos Funcionales del Motor 3D

### A. Generación Arquitectónica y Layout

- **RF-02.1: Instanciación de Ambientes:** El sistema debe renderizar el escenario
    base (ej. Aula, Templo, Bosque) basado en la temática seleccionada,
    asegurando que el espacio sea finito pero expandible.
- **RF-02.2: Mapeo de Conceptos a Objetos (Spatial Mapping):** El sistema debe
    instanciar modelos 3D únicos para cada nodo de información. Cada "objeto de
    conocimiento" debe tener coordenadas (X, Y, Z) persistentes.
- **RF-02.3: Jerarquía Espacial:** El motor debe agrupar conceptos relacionados en
    "estancias" o zonas comunes, utilizando la proximidad física para representar la
    relación semántica entre temas.

### B. Sistema de Locomoción y Control

- **RF-02.4: Control de Primera Persona (FPS):** Implementación de una cámara
    subjetiva con controles de teclado (WASD) y ratón para el movimiento y la
    rotación de la vista.
- **RF-02.5: Navegación por Teletransporte (Point-and-Click):** Capacidad de
    seleccionar un punto en el suelo o un objeto para desplazarse
    instantáneamente, optimizando la accesibilidad.


- **RF-02.6: Sistema de Colisiones:** El motor debe impedir que el usuario atraviese
    paredes u objetos de conocimiento, garantizando el sentido de "presencia"
    física.

### C. Fidelidad Visual y Dinámica de Objetos

- **RF-02.7: Renderizado de Shaders Dinámicos:** Los objetos deben soportar
    cambios en sus propiedades visuales (brillo, textura, opacidad) en tiempo real,
    permitiendo que el motor refleje estados externos (como la entropía del CU-
    004).
- **RF-02.8: Nivel de Detalle Adaptativo (LOD):** El sistema debe gestionar la carga
    de modelos 3D según la distancia de la cámara para optimizar el rendimiento
    del navegador.
- **RF-02.9: Iluminación y Ambiente:** Implementación de luces dinámicas (puntos
    de luz, sombras) que ayuden a resaltar objetos de interés o áreas de estudio
    activas.

### D. Interacción con el Entorno

- **RF-02.10: Raycasting de Selección:** El sistema debe detectar con precisión el
    objeto al que el usuario está apuntando o haciendo clic para activar eventos de
    foco.
- **RF-02.11: Transformación de Objetos:** Capacidad del usuario para reubicar
    objetos dentro del palacio (drag-and-drop en 3D) para personalizar su propio
    mapa mnemotécnico.

## 3. Requerimientos No Funcionales

- **RNF-02.1: Tasa de Refresco (Frame Rate):** El motor debe mantener un mínimo
    de 60 FPS en hardware estándar para evitar fatiga visual.
- **RNF-02.2: Compatibilidad de Formatos:** El sistema debe soportar la carga
    dinámica de activos en formatos estándares de la industria (glTF 2.0 / GLB).
- **RNF-02.3: Tiempo de Carga Inicial:** El entorno base debe estar disponible para
    exploración en menos de 5 segundos tras la autenticación.

## 4. Escenarios de Excepción

- **EX-02.1: Error de Carga de Asset:** Si un modelo 3D específico no carga, el
    sistema debe sustituirlo automáticamente por un polígono primitivo (cubo o
    esfera) con la etiqueta del concepto para no interrumpir la navegación.


- **EX-02.2: Caída de Performance:** Si el hardware no alcanza los FPS mínimos, el
    sistema debe degradar automáticamente la calidad de las sombras y el
    antialiasing.

# Especificación de Requerimientos

# Funcionales: CU- 003

**Caso de Uso:** Study Toolkit y Guía Socrática (Capa de Interacción Pedagógica)
**Actores:** Estudiante / Tutor IA (Gemini) / Sistema de Persistencia

## 1. Descripción del Caso de Uso

El **Study Toolkit** es el conjunto de herramientas de aprendizaje activo que se activan al
interactuar con un objeto en el Palacio 3D. Este módulo gestiona el diálogo socrático,
la evaluación de conceptos y la implementación de técnicas de estudio
científicamente validadas, actuando como el puente entre la curiosidad del usuario y la
base de conocimientos del documento original.

## 2. Requerimientos del Tutor IA (Guía Socrática)

- **RF-03.1: Orquestación de Chat Contextual:** El sistema debe iniciar una sesión
    de chat donde la IA posee el contexto específico del objeto seleccionado, el
    contenido del PDF relacionado y el historial de estudio previo del usuario.
- **RF-03.2: Personalidad de Tutor Socrático:** La IA no debe entregar respuestas
    directas; debe guiar al usuario mediante preguntas que fomenten la deducción y
    la conexión de ideas (Método Socrático).
- **RF-03.3: Soporte Multimodal en Chat:** El tutor debe ser capaz de explicar
    conceptos utilizando texto, generación de diagramas simples o referencias a la
    ubicación exacta de otros objetos relacionados en el palacio.

## 3. Herramientas del Toolkit (Active Learning)

- **RF-03.4: Modo de Explicación Feynman:** El sistema debe permitir al usuario
    explicar el concepto con sus propias palabras (voz o texto). La IA evaluará la
    claridad, identificará lagunas de conocimiento y calificará la simplicidad de la
    explicación.


- **RF-03.5: Generador de Flashcards Dinámicas:** El sistema debe crear tarjetas
    de repaso (pregunta/respuesta) basadas en el contenido del objeto,
    permitiendo al usuario autoevaluarse dentro de la interfaz 3D.
- **RF-03.6: Módulo de Analogías Creativas:** A petición del usuario, la IA debe
    generar analogías basadas en los intereses del estudiante (ej. explicar leyes de
    física mediante metáforas de fútbol) para facilitar la codificación
    mnemotécnica.
- **RF-03.7: Citación y Fuente Directa:** El toolkit debe permitir al usuario ver el
    fragmento exacto del PDF original de donde se extrajo el concepto, garantizando
    la trazabilidad y veracidad de la información.

## 4. Gestión de la Sesión y Feedback

- **RF-03.8: Evaluación de Dominio Post-Sesión:** Al finalizar una interacción con
    una herramienta, la IA debe emitir un "Veredicto de Comprensión" que se
    enviará al CU-004 para actualizar las métricas de retención.
- **RF-03.9: Marcadores de Duda:** El usuario debe poder marcar un objeto como
    "No comprendido", lo cual disparará una prioridad de repaso en futuras
    sesiones.

## 5. Requisitos No Funcionales

- **RNF-03.1: Latencia de Respuesta de IA:** La respuesta inicial del tutor no debe
    superar los 2.5 segundos para mantener el flujo de la conversación.
- **RNF-03.2: Consistencia Pedagógica:** El sistema debe asegurar que el nivel de
    lenguaje del tutor se ajuste al perfil académico del usuario definido en los
    metadatos.
- **RNF-03.3: Manejo de Alucinaciones:** El sistema debe restringir las respuestas
    de la IA estrictamente al contenido del documento y conocimientos generales
    verificados, evitando la invención de datos técnicos.

## 6. Escenarios de Excepciones

- **EX-03.1: Input Ambiguo o Erróneo:** Si la explicación del usuario en el modo
    Feynman es incoherente, la IA debe pedir aclaraciones amablemente en lugar
    de emitir una calificación negativa.
- **EX-03.2: Desconexión del Servicio de IA:** El sistema debe informar al usuario si
    el tutor no está disponible, permitiendo el acceso a las fuentes del PDF de
    manera estática (Modo Lectura).


## 7. Criterios de Aceptación

1. El usuario puede abrir y cerrar el toolkit sin salir de la vista focal del objeto 3D.
2. La IA reconoce correctamente el concepto asociado al objeto con el que se
    interactúa.
3. El sistema registra el resultado de la sesión de estudio (dominio del tema) de
    manera exitosa.

# Especificación de Requerimientos

# Funcionales: CU- 004

**Caso de Uso:** Gestión de Retención y Entropía (Dinámica del Palacio) **Actores:** Motor
de Persistencia / Sistema de Notificaciones / Interfaz 3D

## 1. Descripción del Caso de Uso

Este módulo es el responsable de la "gamificación científica" del sistema. Utiliza
algoritmos de **Repetición Espaciada (Spaced Repetition)** y el concepto de **Entropía
Visual** para obligar al usuario a interactuar con el conocimiento antes de que este se
"olvide". El estado del conocimiento del usuario se manifiesta físicamente en la
apariencia de los objetos del Palacio.

## 2. Motor de Repetición Espaciada (Algoritmo)

- **RF-04.1: Cálculo de Intervalos de Repaso:** El sistema debe implementar un
    algoritmo basado en _SuperMemo- 2_ o similar para calcular la fecha del próximo
    repaso basado en el desempeño del usuario en el **CU- 003**.
- **RF-04.2: Clasificación de Dominio:** Los conceptos se categorizarán en 4
    estados:
       o **Nuevo:** Recién generado, requiere fijación inmediata.
       o **En Proceso:** Repaso frecuente.
       o **Consolidado:** Repaso a largo plazo.
       o **Maestría:** Solo repasos de mantenimiento anual.


## 3. Sistema de Entropía Visual (Feedback 3D)

- **RF-04.3: Degradación de Objetos:** Si un concepto supera su fecha de repaso
    sin interacción, el objeto asociado en el CU-002 debe mostrar signos de
    "entropía" (ej. volverse translúcido, cubrirse de polvo digital, o empezar a
    fragmentarse).
- **RF-04.4: Indicadores de Salud Cognitiva:** El palacio debe tener una
    visualización global (ej. un cielo o iluminación) que cambie según el promedio
    de retención de todos los conceptos cargados.
- **RF-04.5: Recompensa Visual por Maestría:** Los objetos con nivel "Maestría"
    deben adquirir propiedades especiales (ej. emisión de luz, partículas o texturas
    premium) para incentivar el progreso del usuario.

## 4. Alertas y Flujo de Recuperación

- **RF-04.6: Notificaciones de Olvido Crítico:** El sistema debe disparar alertas
    proactivas cuando un concepto fundamental (según la jerarquía del CU-001)
    esté a punto de entrar en un estado de olvido irreversible.
- **RF-04.7: Modo "Restauración":** El usuario puede activar una ruta de
    navegación que lo lleve directamente por todos los objetos que presentan
    mayor entropía, optimizando el tiempo de estudio.

## 5. Requisitos No Funcionales

- **RNF-04.1: Persistencia Transversal:** El estado de degradación de cada objeto
    debe guardarse en tiempo real para que la experiencia sea consistente entre
    dispositivos.
- **RNF-04.2: Escalabilidad de Datos:** El motor debe ser capaz de gestionar las
    fechas de repaso de miles de objetos simultáneamente sin degradar el
    rendimiento del navegador.

## 6. Lógica de Negocio (Entropía vs. Acción)

```
Acción del
Usuario
```
```
Resultado en el
Sistema Impacto Visual (CU-002)^
```

```
Falla un test (CU-
003)
```
```
Acorta intervalo de
repaso El objeto vibra o se vuelve rojo^
```
```
Acierto perfecto
```
```
Alarga intervalo de
repaso El objeto se vuelve nítido y sólido^
```
```
Inactividad
prolongada
```
```
Aumenta Entropía
```
```
El objeto pierde color o se vuelve
"fantasma"
```
## 7. Criterios de Aceptación

1. El sistema actualiza automáticamente el estado de "salud" de un objeto
    inmediatamente después de una sesión del Study Toolkit.
2. Los objetos degradados visualmente son fácilmente identificables desde la
    vista de mapa del palacio.
3. El algoritmo de repetición espaciada ajusta las fechas basándose fielmente en
    el feedback de la IA del CU-003.

# Especificación de Requerimientos

# Funcionales: CU- 005

**Caso de Uso:** Dashboard de Analítica y Gestión de Conocimiento **Actores:** Estudiante /
Administrador / Sistema de Persistencia

## 1. Descripción del Caso de Uso

El Dashboard es el centro de control fuera del entorno 3D. Permite al usuario visualizar
el estado global de su red de palacios, analizar métricas de rendimiento cognitivo y
gestionar la biblioteca de documentos. Es el punto de entrada para la planificación del
estudio y la exportación de resultados.


## 2. Requerimientos de Visualización de Datos

## (Analytics)

- **RF-05.1: Mapa de Calor del Conocimiento:** Representación visual de los temas
    con mayor y menor nivel de retención, permitiendo identificar lagunas de
    conocimiento de forma rápida.
- **RF-05.2: Gráficas de Progreso Temporal:** Visualización de la evolución del
    "Score de Dominio" a lo largo del tiempo por cada documento o materia.
- **RF-05.3: Contador de Tiempo de Enfoque:** Registro y visualización del tiempo
    efectivo de interacción activa en el Study Toolkit, diferenciándolo del tiempo de
    navegación pasiva.
- **RF-05.4: Predicción de Olvido:** Proyección basada en el algoritmo del CU- 004
    que indica cuántos conceptos entrarán en "estado crítico" en los próximos 7
    días si no se realiza estudio.

## 3. Gestión de la Biblioteca y Archivos

- **RF-05.5: Inventario de Palacios:** Panel de administración para renombrar,
    organizar por carpetas o eliminar habitaciones generadas.
- **RF-05.6: Control de Ingesta:** Interfaz para gestionar la subida de nuevos
    documentos y visualizar el historial de procesamiento del CU-001.
- **RF-05.7: Sincronización Multi-Palacio:** Capacidad de fusionar conceptos de
    diferentes PDFs en una "Mega-Habitación" o "Ciudad del Conocimiento".

## 4. Exportación y Portabilidad

- **RF-05.8: Exportación de Resúmenes IA:** Generación de un documento
    (PDF/Markdown) que contenga los resúmenes Feynman y las analogías creadas
    por el tutor durante las sesiones inmersivas.
- **RF-05.9: Backup de Memoria:** Función para exportar la base de datos de
    retención del usuario para su uso en otras herramientas de estudio compatibles
    (ej. exportación de Flashcards a formato Anki).

## 5. Requisitos No Funcionales

- **RNF-05.1: Responsividad del Dashboard:** La interfaz debe ser 100% funcional
    en dispositivos móviles (a diferencia del entorno 3D que es prioritario para
    desktop).


- **RNF-05.2: Seguridad de Datos:** Acceso restringido mediante protocolos de
    autenticación robustos, asegurando que la analítica de aprendizaje sea privada.
- **RNF-05.3: Latencia de Carga de Métricas:** Las consultas complejas a la base
    de datos de interacción deben resolverse en menos de 1 segundo mediante el
    uso de índices optimizados.

## 6. Escenarios de Excepción

- **EX-05.1: Datos Insuficientes:** Si el usuario es nuevo, el sistema debe mostrar
    "Estados Placeholder" o guías de uso en lugar de gráficas vacías para evitar la
    desmotivación.
- **EX-05.2: Error de Exportación:** Si la generación del PDF de resumen falla, el
    sistema debe permitir la visualización del contenido en formato texto plano para
    su copia manual.

## 7. Criterios de Aceptación

1. El usuario puede ver una lista clara de todos sus documentos y el estado de
    retención de cada uno.
2. Las gráficas de progreso se actualizan correctamente tras cada sesión de
    estudio en el 3D.
3. El archivo exportado contiene la información verídica generada por el Tutor IA.



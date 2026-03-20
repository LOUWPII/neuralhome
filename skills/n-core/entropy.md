Skill: N-Core Entropy Engine (CU-003)

Esta skill gestiona la retención de memoria a través del aspecto visual de la habitación. Implementa la "Curva del Olvido".

Estados de Degradación

Fresh (1.0 - 0.8): Texturas nítidas, colores vibrantes, iluminación clara.

Dusty (0.7 - 0.5): Desaturación de colores, partículas de polvo flotando (shaders).

Decaying (0.4 - 0.2): Texturas con grietas, parpadeo de luces, el objeto se vuelve translúcido.

Void (0.1 - 0.0): El objeto desaparece o solo queda un contorno de "fantasma".

Lógica de Restauración

Trigger: Una respuesta correcta en el "Socratic Tutor" reinicia la entropy a 1.0.

Cálculo: entropy_t = entropy_initial * e^(-k * t), donde t es el tiempo transcurrido desde el último repaso.
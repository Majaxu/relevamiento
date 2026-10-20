# Relevamiento de tareas · Administración · Juárez Beltrán

Formulario online para que cada persona de Administración describa **las tareas que hace hoy**, con sus palabras:
cómo las hace, si son mecánicas o requieren criterio, cada cuánto, cuánto le llevan, de quién depende y quién la
reemplaza. Suma preguntas sobre la carga a lo largo del mes, las esperas entre sectores y qué parte del trabajo se podría automatizar.

Sirve para tener una foto actualizada de qué hace cada uno y detectar qué partes del trabajo se pueden
resolver con herramientas o automatizaciones.

Es **online y multiusuario**: corre sobre **Google Apps Script + Google Sheets**, igual que
[Biprop](https://github.com/Majaxu/Biprop) y [Pipeline ACM](https://github.com/Majaxu/pipelineacm).
Cada persona entra con su cuenta de Google del dominio y puede contestar desde su casa.

## Acceso

Se entra desde **https://majaxu.github.io/relevamiento/**, que redirige al formulario (hay que iniciar sesión con la
cuenta del dominio `@juarezbeltran.com.ar`). Esa página es el `index.html` de la raíz, servido por GitHub Pages.

## Cómo funciona

1. La app identifica a la persona por su cuenta de Google y busca su fila en la hoja `Personas` de la planilla.
2. Mientras escribe, **se guarda solo**: en el navegador al instante y en la planilla cada pocos segundos.
3. Al enviar, se escribe una fila por tarea y una fila con las respuestas generales, y llega un mail de aviso.
4. Después de enviar no se puede editar, salvo que se le reabra desde la planilla.

Las personas habilitadas, con sus mails, **no están en este repo**: se cargan en la planilla.

## Estructura

```
relevamiento/
├── apps-script/                → la app que se publica en Google Apps Script
│   ├── Code.gs                 → backend (identidad, preguntas, borradores, envío, instalación)
│   ├── Index.html              → el formulario (HTML + CSS + JS en un solo archivo)
│   ├── appsscript.json         → manifiesto (permisos y acceso por dominio)
│   └── DEPLOY.md               → guía paso a paso para publicarla
├── index.html                  → página de acceso (GitHub Pages): redirige al formulario
├── favicon*.png, icon-*.png, apple-touch-icon-180.png, favicon.ico   → íconos de JB
├── logo-jb-blanco.png          → logo de JB
└── README.md
```

## Puesta en marcha

Ver **[apps-script/DEPLOY.md](apps-script/DEPLOY.md)**. En resumen, logueado como `mjuarez@`: crear el proyecto en
[script.google.com](https://script.google.com) con los archivos de `apps-script/`, ejecutar `instalar` (crea la
planilla), cargar las personas en la hoja `Personas`, publicarlo como **Aplicación web** (ejecutar como el dueño,
acceso restringido al dominio) y pegar la URL en el `index.html` de la raíz.

## Dónde quedan los datos

En la planilla **Relevamiento Administración · Respuestas**, en el Drive de quien publica la app:

| Hoja | Contenido |
|---|---|
| `Personas` | Quién puede contestar (email, nombre, rol) y el avance de cada uno |
| `Tareas` | Una fila por tarea enviada |
| `Respuestas` | Una fila por persona, una columna por pregunta |
| `Borradores` | Lo que cada uno lleva escrito sin enviar |

## Cambiar el cuestionario

Las preguntas, los ejemplos en gris y las opciones están en `apps-script/Code.gs`, en la sección
"CONTENIDO DEL CUESTIONARIO". Después de cambiar algo hay que publicar una versión nueva de la aplicación web.

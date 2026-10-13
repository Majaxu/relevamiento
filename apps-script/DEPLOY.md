# Relevamiento de tareas · Puesta en marcha (Google)

El relevamiento es un formulario online para que cada persona de Administración describa sus tareas.
Corre sobre **Google Apps Script + Google Sheets**, igual que Biprop y Pipeline ACM:

- Cada persona entra con **su cuenta de Google del dominio `juarezbeltran.com.ar`**. No hay usuario ni contraseña propios, y puede contestar desde su casa.
- **Se guarda solo** mientras escribe. Puede cortar y seguir otro día, desde otra computadora o desde el celular.
- Las respuestas quedan en **una planilla de Google Sheets** en el Drive de `mjuarez@juarezbeltran.com.ar`, y cada envío manda un mail de aviso a esa cuenta.
- No hace falta servidor ni pagar hosting.

> **Importante:** hacé todos los pasos **logueado como `mjuarez@juarezbeltran.com.ar`**, para que la planilla
> quede en ese Drive y los avisos lleguen a ese mail. Conviene usar una ventana de incógnito con esa sola
> cuenta abierta, así Google no mezcla sesiones.

---

## Archivos de esta carpeta

| Archivo            | Qué es                                                                  |
|--------------------|-------------------------------------------------------------------------|
| `Code.gs`          | Backend: quién es cada uno, las preguntas, el guardado y el envío        |
| `Index.html`       | El formulario (pantalla, estilos y lógica en un solo archivo)            |
| `appsscript.json`  | Configuración (permisos que pide y acceso por dominio)                   |

---

## Paso 1 · Crear el proyecto de Apps Script

1. Entrá a <https://script.google.com> como `mjuarez@`.
2. **Nuevo proyecto**. Arriba a la izquierda, cambiale el nombre a **Relevamiento de tareas**.
3. Borrá el contenido del archivo `Código.gs` que viene por defecto y pegá **todo** el contenido de `Code.gs` de esta carpeta.
4. Creá el archivo HTML:
   - Botón **+** al lado de "Archivos" → **HTML** → nombralo exactamente **`Index`** (sin `.html`).
   - Borrá lo que trae y pegá **todo** el contenido de `Index.html` de esta carpeta.
5. Mostrá el manifiesto y pegá la configuración:
   - Rueda de **Configuración del proyecto** (⚙️) → tildá **"Mostrar el archivo de manifiesto appsscript.json"**.
   - Volvé al editor, abrí `appsscript.json` y reemplazá su contenido por el de esta carpeta.
6. Guardá todo (Ctrl+S).

No hay que completar ningún ID a mano: la planilla la crea la app en el paso siguiente.

---

## Paso 2 · Crear la planilla

1. Arriba, en el desplegable de funciones, elegí **`instalar`** y tocá **Ejecutar** (▶).
2. La primera vez te pide **autorizar permisos**: aceptá con la cuenta `mjuarez@`
   (ver tu email, trabajar con tus planillas y mandar mails en tu nombre, que es el aviso de cada envío).
3. Abajo, en **Registro de ejecución**, aparece un renglón `OK   Planilla lista:` con un link. **Abrilo y guardalo.**

La planilla se llama **Relevamiento Administración · Respuestas** y queda en la raíz de tu Drive. Tiene cuatro hojas:

| Hoja         | Para qué sirve                                                                 |
|--------------|--------------------------------------------------------------------------------|
| `Personas`   | Quién puede contestar. **Es la única que se completa a mano.** También muestra el avance de cada uno. |
| `Tareas`     | Una fila por cada tarea enviada.                                                |
| `Respuestas` | Una fila por persona, con una columna por cada pregunta general.                |
| `Borradores` | Lo que cada uno lleva escrito y todavía no envió. No se toca.                   |

---

## Paso 3 · Cargar las personas

En la hoja **`Personas`**, completá una fila por cada persona. Solo las tres primeras columnas:

| Email | Nombre | Rol |
|---|---|---|
| el mail de Google de la persona | como querés que figure (Milton, Pao, …) | vacío, `Traspaso`, `Gerencia` o `Prueba` |

- **Nombre** es el que ven los demás en las opciones ("¿Quién te da tareas?", "Si faltás, ¿quién la hace?").
- **Rol** casi siempre va vacío. Poné `Traspaso` a quien deja el puesto (le suma el bloque de traspaso de tareas) y
  `Gerencia` al gerente (le suma el bloque de gerencia).
- La primera fila ya viene cargada con tu cuenta y el rol `Prueba`: es para que pruebes la app. Quien tiene rol
  `Prueba` ve todos los bloques y **no aparece** en las listas del equipo.
- Las columnas `Estado`, `Tareas cargadas`, `Última actividad` y `Enviado el` las completa la app.

Cuando termines, volvé al editor, elegí la función **`verificarInstalacion`** y tocá **Ejecutar**.
Tienen que aparecer renglones que empiezan con `OK`. Si alguno empieza con `MAL`, dice qué fila corregir.

---

## Paso 4 · Publicar como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En el engranaje elegí el tipo **Aplicación web**.
3. Configurá:
   - **Descripción:** `Relevamiento de tareas`
   - **Ejecutar como:** *Yo* (`mjuarez@juarezbeltran.com.ar`).
   - **Quién tiene acceso:** *Cualquier usuario de Juárez Beltrán* (el dominio).
4. **Implementar**.
5. Te da una **URL** que termina en `/exec`. **Ese es el formulario.** Guardala: la vas a usar en el Paso 5.

> Cada vez que cambies el código (por ejemplo, el texto de una pregunta), entrá a
> **Implementar → Gestionar implementaciones → (lápiz) → Versión: Nueva → Implementar**
> para publicar la actualización en la misma URL. Si creás una implementación nueva, cambia la URL.

---

## Paso 5 · Página de acceso (GitHub Pages)

Sirve para tener un link fácil de mandar por WhatsApp o mail.

1. En el repo, abrí el `index.html` de la **raíz** y reemplazá `PEGAR_AQUI_LA_URL_DE_LA_APP` por la URL `/exec` del Paso 4. Guardá y subí el cambio.
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. En un par de minutos queda disponible **https://majaxu.github.io/relevamiento/**, que redirige al formulario.

Si el repo no se llama `relevamiento` o no está en la cuenta `Majaxu`, cambiá la constante `FAVICON_URL` en `Code.gs`
(solo afecta al ícono de la pestaña).

---

## Paso 6 · Probar

Hacé esta prueba completa antes de mandarle el link a nadie.

1. Abrí la URL `/exec` con tu cuenta. Arriba tiene que aparecer el recuadro amarillo **Modo prueba**.
2. Cargá una tarea, tocá **Listo, crear esta tarea** y esperá unos segundos: arriba a la derecha tiene que decir **Guardado** y la hora.
3. Cerrá la pestaña, volvé a entrar y verificá que lo que escribiste sigue ahí.
4. Completá lo obligatorio (marcado con `*`), tocá **Revisar y enviar** y después **Sí, enviar mis respuestas**.
5. Revisá que:
   - En la planilla haya una fila en `Tareas` y otra en `Respuestas`, las dos con la persona `PRUEBA · Prueba`.
   - En `Personas`, tu fila diga `Enviado`.
   - Te haya llegado el mail de aviso.
6. En el formulario, tocá **Borrar mi prueba y empezar de nuevo** (dos veces). Las filas de prueba tienen que desaparecer de la planilla.
7. Pedile a una persona de la lista que entre desde su casa o su celular y verificá que le aparezca su nombre arriba.

---

## Paso 7 · Mandar el link

Mandales **https://majaxu.github.io/relevamiento/** y avisales que tienen que entrar con su cuenta de Juárez Beltrán.

---

## Seguimiento

Abrí la hoja **`Personas`**. La columna `Estado` dice cómo va cada uno:

- vacío: todavía no entró o no escribió nada.
- `En curso`: empezó. `Tareas cargadas` y `Última actividad` muestran cuánto lleva y cuándo fue la última vez.
- `Enviado`: terminó. Sus respuestas ya están en `Tareas` y `Respuestas`.

---

## Preguntas frecuentes

**Alguien envió y quiere corregir algo.**
En la hoja `Personas`, borrá la celda **`Enviado el`** de su fila. Cuando vuelva a entrar se le abre el formulario con todo
lo que había escrito. Al enviar de nuevo, sus filas viejas en `Tareas` y `Respuestas` se reemplazan por las nuevas.

**Entra y le dice que su cuenta no está en la lista.**
Falta su fila en `Personas`, o el mail está mal escrito. El mensaje le muestra con qué cuenta entró: copiá ese mail tal cual.

**Entra y se queda en blanco, o le dice que no pudo identificar la cuenta.**
Casi siempre es porque el navegador tiene abierta otra cuenta de Google además de la del dominio. Que pruebe en una ventana
de incógnito, entrando solo con la cuenta `@juarezbeltran.com.ar`.

**¿Qué pasa si se le corta internet mientras escribe?**
Arriba a la derecha aparece "Sin conexión. Queda guardado en este dispositivo". Puede seguir escribiendo: cuando vuelve
la conexión se sincroniza solo. Si cierra y vuelve a entrar desde el mismo navegador, recupera lo último que escribió.

**¿Pueden ver las respuestas de los demás?**
No. Cada uno ve solo lo suyo. La planilla está en tu Drive y no se comparte con nadie salvo que la compartas vos.

**Quiero cambiar una pregunta o un ejemplo.**
Están todos en `Code.gs`, en la sección "CONTENIDO DEL CUESTIONARIO". Después de cambiar, publicá una versión nueva
(nota del Paso 4). Conviene no cambiar preguntas cuando ya hay gente contestando: las columnas de `Respuestas` cambian de título.

**No quiero recibir un mail por cada envío.**
En `Code.gs`, cambiá `AVISAR_POR_MAIL = true` por `false` y publicá una versión nueva.

**¿Cuánto cuesta?**
$0 dentro de los límites gratuitos de Google Apps Script.

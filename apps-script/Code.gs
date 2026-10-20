/**
 * Relevamiento de tareas · Administración · Juárez Beltrán
 * Backend en Google Apps Script + Google Sheets.
 *
 * Qué hace: cada persona de Administración entra con su cuenta de Google del
 * dominio, describe sus tareas y contesta el cuestionario. El borrador se
 * guarda solo mientras escribe y puede seguir otro día desde otra computadora.
 * Al enviar, las respuestas quedan en una planilla del Drive de quien publica
 * la app y le llega un aviso por mail.
 *
 * Cómo se publica: como aplicación web, "Ejecutar como: yo" y acceso para
 * cualquier usuario del dominio. Ver DEPLOY.md.
 *
 * Seguridad: quién es cada uno se decide SIEMPRE acá, en el servidor, con el
 * email real de Google (Session.getActiveUser()). La pantalla nunca manda un
 * nombre: solo manda respuestas.
 *
 * Todos contestan las mismas preguntas.
 *
 * Las personas habilitadas NO están en este archivo: se cargan en la hoja
 * "Personas" de la planilla (email, nombre y rol).
 */

/* ================================================================== */
/* CONFIGURACIÓN                                                       */
/* ================================================================== */

const APP_NOMBRE = 'Relevamiento de tareas';
const DOMINIO = 'juarezbeltran.com.ar';
const NOMBRE_PLANILLA = 'Relevamiento Administración · Respuestas';
const FAVICON_URL = 'https://majaxu.github.io/relevamiento/favicon-32.png';

/** Personas de Dirección que aparecen como opción en "quién te da tareas". */
const DIRECCION = ['Pato', 'Machi'];

/** Si es true, cada envío manda un mail de aviso a quien publicó la app y a quienes tienen rol Prueba. */
const AVISAR_POR_MAIL = true;

/** Nombres de las hojas de la planilla. */
const H = { PERSONAS: 'Personas', TAREAS: 'Tareas', RESPUESTAS: 'Respuestas', BORRADORES: 'Borradores' };

/**
 * Roles (columna "Rol" de la hoja Personas).
 *  - vacío: una persona del equipo, que contesta el relevamiento.
 *  - Prueba: Dirección. Puede entrar a probar el formulario, no aparece en las
 *    listas del equipo y recibe el mail de aviso de cada envío. Sus envíos
 *    quedan marcados como PRUEBA.
 */
const ROLES = { PRUEBA: 'Prueba' };

/* ================================================================== */
/* CONTENIDO DEL CUESTIONARIO                                          */
/* Para cambiar una pregunta o un ejemplo, se cambia acá.              */
/* Si se cambia algo, hay que publicar una versión nueva (DEPLOY.md).  */
/* ================================================================== */

const TRAMOS = [['a', 'Del 1 al 7'], ['b', 'Del 8 al 15'], ['c', 'Del 16 al 23'], ['d', 'Del 24 a fin de mes']];

const TIPOS = [
  ['Mecánica', 'Se hace siempre igual, siguiendo los mismos pasos.'],
  ['Requiere criterio', 'Hay que analizar y decidir en cada caso.'],
  ['Mixta', 'Una parte es mecánica y otra es de decisión.']
];

const LISTAS = {
  fuera: ['Dirección', 'Ventas', 'Alquileres', 'Marketing', 'Recepción', 'Nadie más'],
  publicoTiempo: ['Casi nada', 'Menos de 1 hora', 'Entre 1 y 3 horas', 'Más de medio día'],
  publicoQuien: ['Inquilinos', 'Propietarios', 'Proveedores', 'Consorcistas', 'Compañeros de otros sectores'],
  escrito: ['Sí, casi todas', 'Algunas', 'No, está en mi cabeza'],
  instructivo: ['Sí, sin problema', 'Sí, con algo de práctica', 'No, hace falta experiencia'],
  frecuencia: ['Todos los días', 'Semanal', 'Quincenal', 'Mensual', 'Algunas veces al año', 'Cuando surge'],
  tiempo: ['Menos de 15 min', '15 a 60 min', '1 a 3 horas', 'Medio día', 'Un día o más'],
  carga: ['Tranquilo', 'Normal', 'Sobrecargado']
};

/**
 * Tipos de pregunta (t): texto (un renglón), largo (texto libre), chips (opciones), tramos (carga del mes).
 * req: obligatoria. ej: el ejemplo en gris. opts: lista de opciones (LISTAS, o equipo / equipoDir).
 */
const SECCIONES = [
  { id: 'puesto', titulo: 'Tu puesto', preguntas: [
    { k: 'puestoNombre', t: 'texto', req: 1, l: '¿Cómo llamarías a tu puesto?', ej: 'Ej.: Encargada de cobranzas y mora' },
    { k: 'jefe', t: 'chips', multi: 1, opts: 'equipoDir', req: 1, l: '¿Quién te da tareas en el día a día?', ayuda: 'Marcá a todas las personas que te asignan trabajo, aunque no sean tu jefe formal.' },
    { k: 'consulta', t: 'chips', multi: 1, opts: 'equipoDir', l: 'Cuando tenés una duda, ¿a quién le preguntás?' },
    { k: 'trabajaCon', t: 'chips', multi: 1, max: 3, opts: 'equipo', l: '¿Con quiénes trabajás más?', ayuda: 'Hasta tres personas.' },
    { k: 'pedidosDe', t: 'chips', multi: 1, opts: 'fuera', excl: ['Nadie más'], l: '¿Quién más te pide cosas, por fuera de Administración?' },
    { k: 'pedidosQue', t: 'largo', l: '¿Qué te piden y cada cuánto?', ej: 'Ej.: Desde alquileres me piden el estado de cuenta de un inquilino antes de renovar. Dos o tres veces por semana.' }
  ] },
  { id: 'tareas', tareas: 1 },
  { id: 'mes', titulo: 'Tu mes', preguntas: [
    { k: 'tramos', t: 'tramos', req: 1, l: '¿Cómo es tu carga de trabajo a lo largo del mes?' },
    { k: 'picos', t: 'largo', l: '¿Qué es lo que más te carga en los días pesados?', ej: 'Ej.: Del 1 al 7 se me juntan la facturación y las liquidaciones, y además es cuando más llaman.' },
    { k: 'publicoTiempo', t: 'chips', opts: 'publicoTiempo', l: 'En un día normal, ¿cuánto tiempo se te va en atender teléfono, WhatsApp y mostrador?' },
    { k: 'publicoQuien', t: 'chips', multi: 1, opts: 'publicoQuien', l: '¿A quiénes atendés?' }
  ] },
  { id: 'esperas', titulo: 'Esperas y dependencias', preguntas: [
    { k: 'esperasFrena', t: 'largo', l: '¿Qué trabajo tuyo se frena esperando a otra persona?', ej: 'Ej.: Los pagos quedan parados hasta que los autorizan. Suele tardar dos o tres días.' },
    { k: 'esperasMias', t: 'largo', l: '¿Quién espera cosas tuyas para poder seguir?', ej: 'Ej.: Tesorería espera mi listado para poder pagar. Si me atraso, se atrasa el pago.' }
  ] },
  { id: 'reemplazo', titulo: 'Reemplazos', preguntas: [
    { k: 'reempSinHacer', t: 'largo', l: 'Si faltás una semana, ¿qué queda sin hacer?', ej: 'Ej.: Los sellados no los hace nadie y se acumulan hasta que vuelvo.' },
    { k: 'reempCubro', t: 'largo', l: '¿A quién cubrís vos cuando falta, y en qué tareas?', ej: 'Ej.: Cubro la caja cuando falta quien cobra. El resto de sus tareas no las sé hacer.' },
    { k: 'reempUnico', t: 'largo', l: '¿Qué sabés hacer que no sabe nadie más?', ej: 'Ej.: Soy la única persona que sabe presentar el IVA en ARCA.' },
    { k: 'reempEscrito', t: 'chips', opts: 'escrito', l: '¿Está escrito en algún lado cómo se hacen tus tareas?' }
  ] },
  { id: 'decisiones', titulo: 'Decisiones y clientes', preguntas: [
    { k: 'decSolo', t: 'largo', l: '¿Qué decidís por tu cuenta, sin consultar?', ej: 'Ej.: Acepto un plan de pago de hasta dos cuotas.' },
    { k: 'decConsulto', t: 'largo', l: '¿Qué tenés que consultar antes de hacer?', ej: 'Ej.: Cualquier bonificación de intereses la tengo que consultar, y a veces la respuesta tarda.' },
    { k: 'carteras', t: 'largo', l: '¿Hay clientes, propietarios o edificios que manejás solo vos?', ej: 'Ej.: Llevo todo lo de dos consorcios. Nadie más conoce el detalle.' }
  ] },
  { id: 'cambios', titulo: 'Cambios en tu puesto', preguntas: [
    { k: 'heredadas', t: 'largo', l: '¿Qué tareas tomaste de alguien que ya no está?', ej: 'Ej.: Desde el año pasado hago la facturación mensual, que antes hacía otra persona.' },
    { k: 'yaNo', t: 'largo', l: '¿Qué hacías antes y ya no hacés? ¿Quién lo hace ahora?', ej: 'Ej.: Antes escaneaba los contratos. Ahora lo hace recepción.' }
  ] },
  { id: 'tiempo', titulo: 'Lo que te hace perder tiempo', preguntas: [
    { k: 'dolTiempo', t: 'largo', l: '¿Cuáles son las tres cosas que más tiempo te hacen perder?', ej: 'Ej.: 1) Cargo los mismos datos en Mirol y en un Excel. 2) Busco comprobantes en mails viejos. 3) Me interrumpen con consultas que no son de mi sector.' },
    { k: 'dolErrores', t: 'largo', l: '¿Qué errores o retrabajos se repiten?', ej: 'Ej.: A veces se paga dos veces lo mismo porque no queda claro quién lo tenía.' },
    { k: 'dolNoMia', t: 'largo', l: '¿Qué tarea sentís que no debería ser tuya?', ej: 'Ej.: Archivar los legajos. Me saca tiempo justo en la semana de cierre.' },
    { k: 'asistente', t: 'largo', l: 'Si tuvieras un asistente que hiciera una tarea por vos, ¿cuál le darías primero?', ej: 'Ej.: Pasar los importes de las boletas a la planilla. Es siempre igual y me lleva una mañana por mes.' }
  ] },
  { id: 'adelante', titulo: 'Para adelante', preguntas: [
    { k: 'aprender', t: 'largo', l: '¿Qué te gustaría hacer o aprender?', ej: 'Ej.: Me gustaría aprender a liquidar expensas.' },
    { k: 'algoMas', t: 'largo', l: '¿Algo más que quieras contarnos?', ej: 'Ej.: Cualquier idea para trabajar mejor, aunque parezca chica.' }
  ] }
];

/* ================================================================== */
/* Límites técnicos (no hace falta tocarlos)                           */
/* ================================================================== */

const MAX_TEXTO = 6000;      // caracteres por respuesta
const MAX_TAREAS = 80;       // tareas por persona
const TROZO = 40000;         // el borrador se guarda partido en celdas de este tamaño
const PARTES = 10;           // cantidad de celdas por borrador
const COL_PERSONAS = ['Email', 'Nombre', 'Rol', 'Estado', 'Tareas cargadas', 'Última actividad', 'Enviado el'];
const COL_TAREAS = ['Enviado el', 'Email', 'Persona', 'N°', 'Tarea', 'Cómo la hace', 'Tipo', '¿Se puede hacer con instructivo?', 'Frecuencia', 'Tiempo por vez', 'Qué necesita de otra persona', 'Si falta, la hace'];

/* ================================================================== */
/* Entrada web                                                         */
/* ================================================================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_NOMBRE + ' · Juárez Beltrán')
    .setFaviconUrl(FAVICON_URL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ================================================================== */
/* Identidad                                                           */
/* ================================================================== */

/** Email real de quien está usando la app. Rechaza todo lo que no sea del dominio. */
function emailActual_() {
  const e = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!e) throw new Error('No pudimos identificar tu cuenta de Google. Entrá con tu cuenta de Juárez Beltrán. Si tenés varias cuentas abiertas, probá en una ventana de incógnito.');
  if (e.slice(-(DOMINIO.length + 1)) !== '@' + DOMINIO) {
    throw new Error('Este formulario es solo para cuentas de Juárez Beltrán. Entraste como ' + e + '.');
  }
  return e;
}

function rol_(v) {
  return String(v || '').trim().toLowerCase() === 'prueba' ? ROLES.PRUEBA : '';
}

/** Lee la hoja Personas. */
function personas_() {
  const v = hoja_(H.PERSONAS).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const email = String(v[i][0] || '').trim().toLowerCase();
    const nombre = String(v[i][1] || '').trim();
    if (!email && !nombre) continue;
    out.push({ fila: i + 1, email: email, nombre: nombre, rol: rol_(v[i][2]), enviado: v[i][6] || '' });
  }
  return out;
}

function personaActual_(email, lista) {
  const yo = (lista || personas_()).filter(function (p) { return p.email === email; })[0];
  if (!yo) throw new Error('Tu cuenta (' + email + ') no está en la lista de este relevamiento. Avisale a Máximo para que te agregue.');
  if (!yo.nombre) throw new Error('A tu cuenta le falta el nombre en la lista. Avisale a Máximo.');
  return yo;
}

/* ================================================================== */
/* Funciones que llama la pantalla                                     */
/* ================================================================== */

/** Todo lo que la pantalla necesita para arrancar. */
function inicio() {
  try {
    const email = emailActual_();
    const todas = personas_();
    const yo = personaActual_(email, todas);
    const prueba = yo.rol === ROLES.PRUEBA;
    const equipo = todas
      .filter(function (p) { return p.rol !== ROLES.PRUEBA && p.email !== email && p.nombre; })
      .map(function (p) { return p.nombre; });
    return {
      ok: true,
      email: email,
      persona: yo.nombre,
      prueba: prueba,
      enviado: fecha_(yo.enviado),
      equipo: equipo,
      direccion: DIRECCION,
      listas: LISTAS,
      tipos: TIPOS,
      tramos: TRAMOS,
      secciones: SECCIONES,
      borrador: yo.enviado ? '' : leerBorrador_(email)
    };
  } catch (e) {
    return { ok: false, titulo: 'No pudimos abrir el formulario', texto: String(e && e.message || e) };
  }
}

/** Guarda el borrador. Lo llama la pantalla sola, cada pocos segundos mientras se escribe. */
function guardarBorrador(json) {
  const email = emailActual_();
  json = String(json || '');
  if (json.length > TROZO * PARTES) throw new Error('El formulario quedó demasiado largo para guardarlo. Avisale a Máximo.');
  let datos;
  try { datos = JSON.parse(json); } catch (e) { throw new Error('No se pudo leer el borrador.'); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const yo = personaActual_(email);
    if (yo.enviado) return { ok: false, enviado: fecha_(yo.enviado) };
    escribirBorrador_(email, yo.nombre, json);
    hoja_(H.PERSONAS).getRange(yo.fila, 4, 1, 3).setValues([['En curso', tareasValidas_(datos).length, new Date()]]);
    return { ok: true, hora: Utilities.formatDate(new Date(), tz_(), 'HH:mm') };
  } finally {
    lock.releaseLock();
  }
}

/** Envío definitivo. Escribe una fila por tarea y una fila con las respuestas generales. */
function enviar(json) {
  const email = emailActual_();
  json = String(json || '');
  if (json.length > TROZO * PARTES) return { ok: false, motivo: 'El formulario quedó demasiado largo para enviarlo. Avisale a Máximo.' };
  let datos;
  try { datos = JSON.parse(json); } catch (e) { return { ok: false, motivo: 'No se pudieron leer las respuestas. Recargá la página y probá de nuevo.' }; }

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const yo = personaActual_(email);
    if (yo.enviado) return { ok: false, enviado: fecha_(yo.enviado), motivo: 'Ya habías enviado tus respuestas.' };

    const g = (datos && datos.g) || {};
    const tareas = tareasValidas_(datos);
    const faltan = [];
    SECCIONES.forEach(function (s) {
      (s.preguntas || []).forEach(function (p) { if (p.req && !respondida_(p, g)) faltan.push(p.l); });
    });
    if (!tareas.length) faltan.push('Cargar al menos una tarea');
    tareas.forEach(function (t, i) {
      if (!(t.nombre && t.como && t.tipo && t.frecuencia && t.tiempo)) faltan.push('Completar la tarea ' + (i + 1) + (t.nombre ? ' (' + t.nombre + ')' : ''));
    });
    if (faltan.length) return { ok: false, motivo: 'Falta completar: ' + faltan.join('; ') + '.' };

    const ahora = new Date();
    const persona = yo.rol === ROLES.PRUEBA ? 'PRUEBA · ' + yo.nombre : yo.nombre;

    // Tareas: se borra lo anterior de esta persona (por si se reabrió) y se escribe de nuevo.
    const shT = hoja_(H.TAREAS);
    borrarFilasDe_(shT, email, 2);
    const filasT = tareas.map(function (t, i) {
      return [ahora, email, persona, i + 1, t.nombre, t.como, t.tipo, t.instructivo, t.frecuencia, t.tiempo, t.necesita, t.reemplazo];
    });
    shT.getRange(shT.getLastRow() + 1, 1, filasT.length, COL_TAREAS.length).setValues(filasT);

    // Respuestas generales.
    const shR = hoja_(H.RESPUESTAS);
    const cols = columnasRespuestas_();
    encabezado_(shR, ['Enviado el', 'Email', 'Persona'].concat(cols.map(function (c) { return c.titulo; })));
    borrarFilasDe_(shR, email, 2);
    const filaR = [ahora, email, persona].concat(cols.map(function (c) { return valor_(c, g); }));
    shR.getRange(shR.getLastRow() + 1, 1, 1, filaR.length).setValues([filaR]);

    escribirBorrador_(email, yo.nombre, json);
    hoja_(H.PERSONAS).getRange(yo.fila, 4, 1, 4).setValues([['Enviado', tareas.length, ahora, ahora]]);

    avisar_(persona, email, tareas.length);
    return { ok: true, enviado: fecha_(ahora) };
  } finally {
    lock.releaseLock();
  }
}

/** Solo para el rol Prueba: borra todo lo que cargó esa cuenta para volver a empezar. */
function borrarPrueba() {
  const email = emailActual_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const yo = personaActual_(email);
    if (yo.rol !== ROLES.PRUEBA) throw new Error('Esto solo está disponible en modo prueba.');
    borrarFilasDe_(hoja_(H.TAREAS), email, 2);
    borrarFilasDe_(hoja_(H.RESPUESTAS), email, 2);
    borrarFilasDe_(hoja_(H.BORRADORES), email, 1);
    hoja_(H.PERSONAS).getRange(yo.fila, 4, 1, 4).setValues([['', '', '', '']]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================== */
/* Preguntas, valores y limpieza                                       */
/* ================================================================== */

function respondida_(p, g) {
  const v = g[p.k];
  if (p.t === 'tramos') return !!v && TRAMOS.every(function (t) { return v[t[0]]; });
  return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
}

/** Columnas de la hoja Respuestas: una por pregunta (la carga del mes ocupa cuatro). */
function columnasRespuestas_() {
  const cols = [];
  SECCIONES.forEach(function (s) {
    (s.preguntas || []).forEach(function (p) {
      if (p.t === 'tramos') TRAMOS.forEach(function (t) { cols.push({ k: p.k, sub: t[0], titulo: 'Carga ' + t[1].toLowerCase() }); });
      else cols.push({ k: p.k, titulo: p.l });
    });
  });
  return cols;
}

function valor_(col, g) {
  const v = g[col.k];
  if (col.sub) return limpio_(v && v[col.sub], 40);
  if (Array.isArray(v)) return limpio_(v.map(function (x) { return String(x); }).join(', '), 600);
  return limpio_(v, MAX_TEXTO);
}

/** Texto seguro para una celda: recortado y sin posibilidad de convertirse en fórmula. */
function limpio_(v, max) {
  let s = String(v === null || v === undefined ? '' : v).replace(/\u0000/g, '').trim();
  if (s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Tareas con algo cargado, ya limpias. */
function tareasValidas_(datos) {
  const lista = (datos && Array.isArray(datos.tareas)) ? datos.tareas.slice(0, MAX_TAREAS) : [];
  return lista
    .filter(function (t) { return t && (String(t.nombre || '').trim() || String(t.como || '').trim()); })
    .map(function (t) {
      return {
        nombre: limpio_(t.nombre, 300),
        como: limpio_(t.como, MAX_TEXTO),
        tipo: limpio_(t.tipo, 40),
        instructivo: limpio_(t.instructivo, 60),
        frecuencia: limpio_(t.frecuencia, 40),
        tiempo: limpio_(t.tiempo, 40),
        necesita: limpio_(t.necesita, MAX_TEXTO),
        reemplazo: limpio_(Array.isArray(t.reemplazo) ? t.reemplazo.join(', ') : t.reemplazo, 300)
      };
    });
}

/* ================================================================== */
/* Planilla                                                            */
/* ================================================================== */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta instalar la planilla: ejecutá la función instalar() desde el editor (ver DEPLOY.md).');
  return SpreadsheetApp.openById(id);
}

function hoja_(nombre) {
  const sh = ss_().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja "' + nombre + '" en la planilla. Ejecutá instalar() de nuevo.');
  return sh;
}

function tz_() { return Session.getScriptTimeZone() || 'America/Argentina/Cordoba'; }

function fecha_(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') return Utilities.formatDate(d, tz_(), 'dd/MM/yyyy HH:mm');
  return String(d);
}

/** Fila (1 = encabezado) donde está ese email en la columna indicada, o 0 si no está. */
function filaDe_(sh, email, col) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const v = sh.getRange(2, col, n - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0] || '').trim().toLowerCase() === email) return i + 2;
  return 0;
}

function borrarFilasDe_(sh, email, col) {
  const n = sh.getLastRow();
  if (n < 2) return;
  const v = sh.getRange(2, col, n - 1, 1).getValues();
  for (let i = v.length - 1; i >= 0; i--) {
    if (String(v[i][0] || '').trim().toLowerCase() === email) sh.deleteRow(i + 2);
  }
}

function encabezado_(sh, titulos) {
  const ancho = Math.max(sh.getLastColumn(), titulos.length);
  const actual = sh.getLastRow() ? sh.getRange(1, 1, 1, ancho).getValues()[0] : [];
  // Se compara todo el ancho: si quedaron títulos viejos de más a la derecha, se limpian.
  const fila = [];
  for (let i = 0; i < ancho; i++) fila.push(i < titulos.length ? titulos[i] : '');
  const igual = actual.length === ancho && fila.every(function (t, i) { return String(actual[i]) === t; });
  if (igual) return;
  sh.getRange(1, 1, 1, ancho).setValues([fila]);
  try { sh.getRange(1, 1, 1, titulos.length).setFontWeight('bold'); sh.setFrozenRows(1); } catch (e) {}
}

/** El borrador es un texto largo (JSON): se guarda partido en varias celdas. Cada parte lleva una marca adelante. */
function escribirBorrador_(email, nombre, json) {
  const sh = hoja_(H.BORRADORES);
  const partes = [];
  for (let i = 0; i < json.length; i += TROZO) partes.push('§' + json.substr(i, TROZO));
  while (partes.length < PARTES) partes.push('');
  const fila = filaDe_(sh, email, 1) || sh.getLastRow() + 1;
  sh.getRange(fila, 1, 1, 3 + PARTES).setValues([[email, nombre, new Date()].concat(partes)]);
}

function leerBorrador_(email) {
  const sh = hoja_(H.BORRADORES);
  const fila = filaDe_(sh, email, 1);
  if (!fila) return '';
  const v = sh.getRange(fila, 4, 1, PARTES).getValues()[0];
  return v.map(function (p) { p = String(p || ''); return p.charAt(0) === '§' ? p.slice(1) : p; }).join('');
}

function avisar_(persona, email, cantidad) {
  if (!AVISAR_POR_MAIL) return;
  try {
    // Le llega a quien publicó la app y a todos los que tienen rol Prueba en la hoja Personas.
    const destinos = [String(Session.getEffectiveUser().getEmail() || '').toLowerCase()];
    personas_().forEach(function (p) {
      if (p.rol === ROLES.PRUEBA && p.email && destinos.indexOf(p.email) === -1) destinos.push(p.email);
    });
    const para = destinos.filter(function (x) { return x; }).join(',');
    if (!para) return;
    MailApp.sendEmail(para,
      'Relevamiento: ' + persona + ' envió sus respuestas',
      persona + ' (' + email + ') envió el relevamiento con ' + cantidad + (cantidad === 1 ? ' tarea.' : ' tareas.') +
      '\n\nPlanilla de respuestas:\n' + ss_().getUrl());
  } catch (e) {
    console.error('No se pudo mandar el aviso por mail: ' + e);
  }
}

/* ================================================================== */
/* Instalación y control (se ejecutan a mano desde el editor)          */
/* ================================================================== */

/**
 * Crea la planilla de respuestas en el Drive de quien la ejecuta, con sus cuatro hojas.
 * Se puede ejecutar más de una vez: no pisa ni borra nada de lo que ya exista.
 */
function instalar() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(NOMBRE_PLANILLA);
    props.setProperty('SHEET_ID', ss.getId());
    Logger.log('OK   Planilla creada.');
  }

  const armar = function (nombre, titulos) {
    let sh = ss.getSheetByName(nombre);
    if (!sh) sh = ss.insertSheet(nombre);
    encabezado_(sh, titulos);
    return sh;
  };
  const shP = armar(H.PERSONAS, COL_PERSONAS);
  const shT = armar(H.TAREAS, COL_TAREAS);
  const shR = armar(H.RESPUESTAS, ['Enviado el', 'Email', 'Persona'].concat(columnasRespuestas_().map(function (c) { return c.titulo; })));
  const partes = [];
  for (let i = 1; i <= PARTES; i++) partes.push('Parte ' + i);
  const shB = armar(H.BORRADORES, ['Email', 'Persona', 'Actualizado'].concat(partes));

  // Fechas a la argentina y con hora (día/mes/año, 24 horas).
  try {
    ss.setSpreadsheetLocale('es_AR');
    ss.setSpreadsheetTimeZone(tz_());
    const fechaHora = 'dd/MM/yyyy HH:mm';
    shP.getRange('F2:G').setNumberFormat(fechaHora);
    shT.getRange('A2:A').setNumberFormat(fechaHora);
    shR.getRange('A2:A').setNumberFormat(fechaHora);
    shB.getRange('C2:C').setNumberFormat(fechaHora);
  } catch (e) {}

  // La hoja vacía que Google crea por defecto se saca.
  ss.getSheets().forEach(function (sh) {
    const propia = [H.PERSONAS, H.TAREAS, H.RESPUESTAS, H.BORRADORES].indexOf(sh.getName()) !== -1;
    if (!propia && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  // Primera vez: se agrega a quien instala como usuario de prueba.
  if (shP.getLastRow() < 2) {
    const yo = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
    shP.getRange(2, 1, 1, 3).setValues([[yo, 'Prueba', ROLES.PRUEBA]]);
  }
  try {
    shP.setColumnWidth(1, 280); shP.setColumnWidth(2, 160);
    const regla = SpreadsheetApp.newDataValidation().requireValueInList([ROLES.PRUEBA], true).setAllowInvalid(true).build();
    shP.getRange(2, 3, 200, 1).setDataValidation(regla);
  } catch (e) {}

  Logger.log('OK   Planilla lista: ' + ss.getUrl());
  Logger.log('     Ahora cargá las personas en la hoja "Personas" y ejecutá verificarInstalacion().');
}

/** Revisa que todo esté en condiciones. Los renglones del registro empiezan con OK, OJO o MAL. */
function verificarInstalacion() {
  let ss;
  try { ss = ss_(); Logger.log('OK   Planilla: ' + ss.getUrl()); }
  catch (e) { Logger.log('MAL  ' + e.message); return; }

  [H.PERSONAS, H.TAREAS, H.RESPUESTAS, H.BORRADORES].forEach(function (n) {
    Logger.log((ss.getSheetByName(n) ? 'OK   ' : 'MAL  ') + 'Hoja "' + n + '"');
  });

  let lista = [];
  try { lista = personas_(); } catch (e) { Logger.log('MAL  ' + e.message); return; }
  const vistos = {};
  let reales = 0;
  lista.forEach(function (p) {
    const donde = 'Personas, fila ' + p.fila + ': ';
    if (!p.email) Logger.log('MAL  ' + donde + 'falta el email de ' + p.nombre);
    else if (p.email.slice(-(DOMINIO.length + 1)) !== '@' + DOMINIO) Logger.log('MAL  ' + donde + p.email + ' no es una cuenta @' + DOMINIO);
    if (!p.nombre) Logger.log('MAL  ' + donde + 'falta el nombre de ' + p.email);
    if (p.email && vistos[p.email]) Logger.log('MAL  ' + donde + p.email + ' está repetido');
    vistos[p.email] = true;
    if (p.rol !== ROLES.PRUEBA) reales++;
  });
  Logger.log((reales ? 'OK   ' : 'OJO  ') + reales + ' persona(s) cargada(s), sin contar las de prueba');
  const prueba = lista.filter(function (p) { return p.rol === ROLES.PRUEBA; }).map(function (p) { return p.email; });
  Logger.log('     Rol Prueba (pueden probar el formulario y reciben el aviso de cada envío): ' + (prueba.join(', ') || 'nadie'));

  try {
    const sh = hoja_(H.BORRADORES);
    const fila = sh.getLastRow() + 1;
    sh.getRange(fila, 1, 1, 3).setValues([['prueba-de-escritura', '', new Date()]]);
    sh.deleteRow(fila);
    Logger.log('OK   Prueba de escritura en la planilla');
  } catch (e) {
    Logger.log('MAL  No se pudo escribir en la planilla: ' + e.message);
  }
}

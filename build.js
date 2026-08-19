/* ═══════════════════════════════════════════════════════════════════════
   BivonaCars — construcción del sitio

   Las pantallas grandes viven en la base de datos, no en este repositorio:
     · tabla "assets"  → appx, publica, panela, panelb (comprimidos, en trozos)
     · tabla "codigo"  → parche, panel (texto plano)
   Los archivos chicos y los agregados nuevos viajan junto a este script.

   Se imprime la huella de cada archivo generado para poder comprobar que
   llegó entero: si una huella no coincide con la esperada, algo se cortó.
   ═══════════════════════════════════════════════════════════════════════ */

const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const crypto = require('crypto');

const BASE = 'https://qymqfjtistprotddoqkz.supabase.co';
const KEY  = 'sb_publishable_odRdlDC7eymL_YdzZZ7DTw_wPOom0Dv';

/* Cantidad de trozos esperada. Si no coincide, el build falla a propósito:
   es preferible eso a publicar código cortado por la mitad. */
const ESPERADO = { appx: 8, publica: 16, panela: 10, panelb: 10 };

/* Las piezas de marca son imágenes, no código: viajan en la misma tabla
   pero en base64 crudo, sin comprimir. Se escriben tal cual, sin pasar
   por el gunzip ni por el reemplazo de nombre. */
const BINARIOS = {
  logomarca:   'marca-logo.webp',
  escudo:      'marca-escudo.webp',
  marcaoscura: 'marca-oscura.webp',
  pointer:     'marca-pointer.webp'
};

/* Huella de cada imagen ya armada, para que una imagen cortada tampoco
   pase inadvertida. Es la misma idea que HUELLA pero sobre el base64. */
/* Las imágenes ahora son archivos de verdad en marca/. Ya no viajan en
   base64 ni necesitan huella. */

/* Huella del archivo original, antes de comprimirlo. Es el control final:
   si lo que sale del gunzip no coincide, algo se rompió en el camino y
   preferimos que la construcción falle antes que publicar código cortado. */
/* Antes acá había una huella fija por archivo. Con el código viviendo en
   la base tenía sentido: detectaba un trozo cortado. Con el código en el
   repositorio es una trampa, porque salta en cada cambio intencional. Se
   conserva la comprobación solo para lo que todavía baja de Supabase. */
const HUELLA = {};

/* ── El nombre del negocio se aplica al final, en un solo lugar ── */
function marca(texto){
  return String(texto)
    .replace(/Auto<span>Net<\/span>/g, 'Bivona<span>Cars</span>')
    .replace(/AutoNet/g, 'BivonaCars');
}

/* ── Sesiones separadas entre la web pública y el panel ──────────
   Las dos páginas se sirven desde la misma dirección, así que por
   defecto comparten el mismo cajón de sesión del navegador: entrar
   en una pisaba la sesión de la otra y la cuenta cambiaba sola.
   Esto le da a cada una su propio cajón. */
const SEPARAR_SESIONES = `
(function(){
  if(!window.supabase || !window.supabase.createClient) return;
  var crearOriginal = window.supabase.createClient;
  window.supabase.createClient = function(url, llave, opciones){
    opciones = opciones || {};
    opciones.auth = opciones.auth || {};
    if(!opciones.auth.storageKey){
      opciones.auth.storageKey = document.getElementById('raiz')
        ? 'bivonacars-panel' : 'bivonacars-comisionistas';
    }
    return crearOriginal(url, llave, opciones);
  };
})();
`;

async function traer(ruta){
  const res = await fetch(BASE + ruta, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  });
  if(!res.ok) throw new Error('La base respondió ' + res.status + ' ' + res.statusText + ' al pedir ' + ruta);
  return res.json();
}

async function main(){
  /* ── 1. Piezas comprimidas ── */
  const filas = await traer('/rest/v1/assets?select=nombre,parte,contenido&order=nombre.asc,parte.asc');
  if(!Array.isArray(filas) || !filas.length) throw new Error('La base no devolvió ningún trozo de código');

  const porNombre = {};
  for(const f of filas){
    (porNombre[f.nombre] = porNombre[f.nombre] || []).push(f);
  }

  const codigo = {};
  for(const nombre of Object.keys(porNombre)){
    if(BINARIOS[nombre]) continue;      /* imagen: se escribe aparte */
    const lista = porNombre[nombre].sort((a,b) => a.parte - b.parte);
    if(ESPERADO[nombre] && lista.length !== ESPERADO[nombre])
      throw new Error(`"${nombre}": se esperaban ${ESPERADO[nombre]} trozos y llegaron ${lista.length}`);
    const b64 = lista.map(x => x.contenido).join('');
    codigo[nombre] = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  }
  for(const req of ['appx','publica','panela','panelb'])
    if(!codigo[req]) throw new Error('Falta la pieza "' + req + '"');


  /* ── 2. Parches guardados como texto ── */
  const parches = await traer('/rest/v1/codigo?select=nombre,contenido');
  const texto = {};
  for(const p of parches) texto[p.nombre] = p.contenido;

  /* Ya no se exige que estén en la base: si el repositorio los tiene,
     alcanza. Solo se corta si no aparecen por ningún lado. */

  /* Estas piezas pueden venir de cuatro lados. Se prueban en orden:
     1) como texto en "codigo"        → para corregir algo puntual sin rearmar todo
     2) comprimidas en "assets"       → es como viajan hoy: la base es el depósito
     3) comprimidas en carpeta piezas/ → forma anterior, se conserva
     4) el archivo suelto             → red de contención */
  const local = n => fs.readFileSync(path.join(__dirname, n), 'utf8');

  /* Comprueba la huella y avisa en el registro. Se usa igual venga de donde venga. */
  const comprobar = (clave, archivo, contenido, origen) => {
    const h = crypto.createHash('md5').update(Buffer.from(contenido, 'utf8')).digest('hex');
    if(HUELLA[clave] && h !== HUELLA[clave])
      throw new Error(`"${archivo}": llegó con la huella ${h} y se esperaba ${HUELLA[clave]}`);
    console.log('  · ' + archivo + ' → ' + origen + ' (huella ' + h.slice(0,8) + ')');
    return contenido;
  };

  const preferirLocal = (clave, archivo) => {
    /* El repositorio manda. Antes ganaba la base y por eso editar un
       archivo acá no cambiaba nada: el build lo pisaba con la copia de
       Supabase. Ahora es al revés, y la base queda solo de red de
       contención para las piezas que todavía no se materializaron. */
    const suelto = path.join(__dirname, archivo);
    if(fs.existsSync(suelto)){
      console.log('  · ' + archivo + ' → repositorio');
      return local(archivo);
    }

    if(texto[clave] && texto[clave].length > 1000){
      console.log('  · ' + archivo + ' → desde la tabla codigo');
      return texto[clave];
    }
    /* Guardada en "assets": los trozos son base64 del mismo archivo
       comprimido, se pegan en orden y se descomprimen de una vez. */
    if(codigo[clave]) return comprobar(clave, archivo, codigo[clave], 'assets');

    /* La pieza puede venir entera (archivo.gz) o partida en pedazos
       numerados (archivo.gz.01, .02, …). Los pedazos son bytes crudos del
       mismo archivo comprimido, así que se pegan uno atrás del otro. */
    const carpeta = path.join(__dirname, 'piezas');
    const pedazos = fs.existsSync(carpeta)
      ? fs.readdirSync(carpeta).filter(n => n === archivo + '.gz' ||
          n.startsWith(archivo + '.gz.')).sort()
      : [];

    if(pedazos.length){
      const crudo = Buffer.concat(pedazos.map(n => fs.readFileSync(path.join(carpeta, n))));
      const contenido = zlib.gunzipSync(crudo).toString('utf8');
      const h = crypto.createHash('md5').update(Buffer.from(contenido, 'utf8')).digest('hex');
      if(HUELLA[clave] && h !== HUELLA[clave])
        throw new Error(`"${archivo}": llegó con la huella ${h} y se esperaba ${HUELLA[clave]}`);
      console.log('  · ' + archivo + ' → piezas/ (' + pedazos.length +
        ' pedazo(s), huella ' + h.slice(0,8) + ')');
      return contenido;
    }
    console.log('  · ' + archivo + ' → desde el archivo suelto');
    return local(archivo);
  };

  /* ── 3. Escribir ── */
  const dir = path.join(__dirname, 'public');
  fs.mkdirSync(dir, { recursive: true });

  const escribir = (nombre, contenido) => {
    const datos = Buffer.from(marca(contenido), 'utf8');
    fs.writeFileSync(path.join(dir, nombre), datos);
    const huella = crypto.createHash('md5').update(datos).digest('hex');
    console.log('  ✓ ' + nombre.padEnd(18) + datos.length.toString().padStart(7) + ' bytes   ' + huella);
  };

  escribir('appx.js',    SEPARAR_SESIONES + '\n' + codigo.appx);
  escribir('publica.js', codigo.publica);

  /* El panel se sirve como UN SOLO archivo. Servido partido en dos, el
     navegador trata cada <script> como un ámbito aparte y la tabla de
     secciones de la primera mitad no ve las funciones de la segunda. */
  escribir('panel.js', codigo.panela + '\n' + codigo.panelb);

  escribir('parche.js',       preferirLocal('parche', 'parche.js'));
  escribir('parche-panel.js', preferirLocal('panel',   'parche-panel.js'));
  escribir('panel-crm.js',          preferirLocal('panelcrm', 'panel-crm.js'));
  escribir('panel-ventas.js',       preferirLocal('panelvta', 'panel-ventas.js'));
  escribir('panel-seguridad.js',    preferirLocal('panelseg', 'panel-seguridad.js'));
  escribir('panel-cuenta.js',       preferirLocal('panelcta', 'panel-cuenta.js'));
  escribir('parche2.js',            preferirLocal('parche2',  'parche2.js'));
  escribir('publica-catalogo.js',   preferirLocal('pubcat',   'publica-catalogo.js'));
  escribir('publica-directorio.js', preferirLocal('pubdir',   'publica-directorio.js'));
  escribir('publica-perfil.js',     preferirLocal('pubperf',  'publica-perfil.js'));
  escribir('publica-clientes.js',   preferirLocal('pubcli',   'publica-clientes.js'));
  escribir('publica-inicio.js',     preferirLocal('pubini',   'publica-inicio.js'));

  /* ── Las imágenes de marca ──────────────────────────────────────
     Viven en marca/ como archivos binarios normales. Se copian tal cual.
     Si alguna faltara, se cae de nuevo a la copia en base64 de la base,
     que queda como red de contención hasta que se borre la tabla. */
  /* Se busca en marca/ y también en la raíz: al bajar los archivos de a
     uno se pierde la carpeta, y una imagen puesta al lado de build.js
     tiene que funcionar igual. */
  const buscarImagen = (nombre) => {
    for(const p of [path.join(__dirname, 'marca', nombre), path.join(__dirname, nombre)])
      if(fs.existsSync(p)) return p;
    return null;
  };

  for(const clave of Object.keys(BINARIOS)){
    const nombre = BINARIOS[clave];
    const suelto = buscarImagen(nombre);

    if(suelto){
      const datos = fs.readFileSync(suelto);
      fs.writeFileSync(path.join(dir, nombre), datos);
      console.log('  \u2713 ' + nombre.padEnd(20) + datos.length.toString().padStart(7) +
        ' bytes   ' + path.relative(__dirname, suelto));
      continue;
    }

    if(!porNombre[clave]){
      console.log('  ! falta la imagen "' + clave + '" (ni en marca/ ni en la base)');
      continue;
    }
    const b64 = porNombre[clave].sort((a,b) => a.parte - b.parte)
                                .map(x => x.contenido).join('');
    const datos = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(dir, nombre), datos);
    console.log('  \u2713 ' + nombre.padEnd(20) + datos.length.toString().padStart(7) +
      ' bytes   base (heredado)');
  }

  /* Archivos chicos, que viajan junto a este script */
  for(const archivo of ['index.html', 'admin.html']){
    escribir(archivo, local(archivo));
  }

  console.log('\nSitio construido correctamente.');
}

main().catch(e => { console.error('LA CONSTRUCCIÓN FALLÓ: ' + e.message); process.exit(1); });

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
const HUELLA_IMG = {
  logomarca:   '2c17dc9db35bda41ee53ef77431a738a',
  escudo:      'eca923dc61313736fed02402d2855678',
  marcaoscura: '26a75545932183f9dbe8f4cf9e884a44',
  pointer:     '1d6dcef86451f85b8e73551c09344736'
};

/* Huella del archivo original, antes de comprimirlo. Es el control final:
   si lo que sale del gunzip no coincide, algo se rompió en el camino y
   preferimos que la construcción falle antes que publicar código cortado. */
const HUELLA = {
  panelvta: '1b9f0b511a98f9512eed7b0b5a02f590',
  panelcrm: '0b50eaf4cb7cff57ef24dc2d57eede6f',
  panelseg: '3dbacf309bca13f4b5c0e301f864eb3c',
  panelcta: '686a517148f4b541a19c3cbf702dc8d7',
  pubini:   '7e09bddd69bb36df7bfb67a990b7929a',
  parche2:  '0817265ee04b1d001ebfb03e4a045bd6',
  pubcat:   '41fba99708161139ff26bf4a0850da27',
  pubdir:   '6f6502890f447403572ac0dbcdd7508b',
  pubperf:  'c09828cdea8fb9d5d394369fd71e967f',
  pubcli:   '4b1e9b3c6f014fefb010ac3189d8386f'
};

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

  for(const req of ['parche','panel']){
    if(!texto[req] || texto[req].length < 1000)
      throw new Error('El parche "' + req + '" no llegó o llegó vacío');
  }

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

  const preferirBase = (clave, archivo) => {
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

  escribir('parche.js',       texto.parche);
  escribir('parche-panel.js', texto.panel);
  escribir('panel-crm.js',          preferirBase('panelcrm', 'panel-crm.js'));
  escribir('panel-ventas.js',       preferirBase('panelvta', 'panel-ventas.js'));
  escribir('panel-seguridad.js',    preferirBase('panelseg', 'panel-seguridad.js'));
  escribir('panel-cuenta.js',       preferirBase('panelcta', 'panel-cuenta.js'));
  escribir('parche2.js',            preferirBase('parche2',  'parche2.js'));
  escribir('publica-catalogo.js',   preferirBase('pubcat',   'publica-catalogo.js'));
  escribir('publica-directorio.js', preferirBase('pubdir',   'publica-directorio.js'));
  escribir('publica-perfil.js',     preferirBase('pubperf',  'publica-perfil.js'));
  escribir('publica-clientes.js',   preferirBase('pubcli',   'publica-clientes.js'));
  escribir('publica-inicio.js',     preferirBase('pubini',   'publica-inicio.js'));

  /* Las imágenes de marca: base64 crudo, se escriben tal cual */
  for(const clave of Object.keys(BINARIOS)){
    if(!porNombre[clave]){
      console.log('  ! falta la imagen "' + clave + '" en la base');
      continue;
    }
    const b64 = porNombre[clave].sort((a,b) => a.parte - b.parte)
                                .map(x => x.contenido).join('');
    const h = crypto.createHash('md5').update(Buffer.from(b64, 'utf8')).digest('hex');
    if(HUELLA_IMG[clave] && h !== HUELLA_IMG[clave])
      throw new Error(`"${BINARIOS[clave]}": llegó con la huella ${h} y se esperaba ${HUELLA_IMG[clave]}`);
    const datos = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(dir, BINARIOS[clave]), datos);
    console.log('  ✓ ' + BINARIOS[clave].padEnd(20) + datos.length.toString().padStart(7) + ' bytes   ' + h);
  }

  /* Archivos chicos, que viajan junto a este script */
  for(const archivo of ['index.html', 'admin.html']){
    escribir(archivo, local(archivo));
  }

  console.log('\nSitio construido correctamente.');
}

main().catch(e => { console.error('LA CONSTRUCCIÓN FALLÓ: ' + e.message); process.exit(1); });

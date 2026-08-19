/* ═══════════════════════════════════════════════════════════════════════
   Termina la mudanza del código: saca de Supabase las últimas piezas y
   las deja como archivos del repositorio.

   Se corre UNA sola vez:

       node build.js          (arma public/ bajando lo que falte)
       node materializar.js   (copia esas piezas a la raíz)

   Después de esto la base ya no guarda código: se puede borrar las tablas
   "assets" y "codigo" sin que el sitio se caiga.
   ═══════════════════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

const PIEZAS = ['appx.js', 'publica.js', 'panel.js', 'marca-pointer.webp'];

const origen = path.join(__dirname, 'public');
if(!fs.existsSync(origen)){
  console.error('No existe public/. Corré primero:  node build.js');
  process.exit(1);
}

let copiadas = 0, yaEstaban = 0, faltantes = [];

for(const pieza of PIEZAS){
  const desde = path.join(origen, pieza);
  const hacia = path.join(__dirname, pieza);

  if(!fs.existsSync(desde)){ faltantes.push(pieza); continue; }

  if(fs.existsSync(hacia)){
    /* Ya materializada. No se pisa: si se editó a mano, el build ya la
       estaba usando y volver a copiarla desde public/ perdería el cambio. */
    console.log('  = ' + pieza.padEnd(22) + 'ya estaba en el repositorio, no la toco');
    yaEstaban++;
    continue;
  }

  const datos = fs.readFileSync(desde);
  fs.writeFileSync(hacia, datos);
  console.log('  ✓ ' + pieza.padEnd(22) + datos.length.toString().padStart(8) + ' bytes copiados');
  copiadas++;
}

console.log('');
if(faltantes.length){
  console.log('Faltan en public/: ' + faltantes.join(', '));
  console.log('Corré "node build.js" de nuevo y volvé a intentar.');
  process.exit(1);
}

console.log('Copiadas ' + copiadas + ', ya estaban ' + yaEstaban + '.');
console.log('');
console.log('Comprobá que el sitio se arme sin la base:');
console.log('    node build.js --sin-base');
console.log('');
console.log('Si eso funciona, subilo:');
console.log('    git add -A && git commit -m "materializa las ultimas piezas" && git push');

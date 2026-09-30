/* BivonaCars — El catálogo para el que todavía no es nadie.

   Hasta ahora el sitio público era una página de reclutamiento: el
   visitante veía la presentación, "Ingresar" y "Registrarme". Los autos
   estaban del lado de adentro, detrás del login, porque el catálogo
   arrancaba con `if(!perfil) return vLogin()`. Un cliente no tenía forma
   de ver un solo vehículo.

   Esto invierte el orden y lo pone como tiene que ser:

       ve los autos → elige uno → elige quién lo atiende → habla por WhatsApp

   La regla del negocio no se toca. Acá no se compra nada, no hay precio
   negociable, no hay botón de reservar: se mira y se pide hablar con un
   comisionista. La venta sigue pasando por ellos, que es lo único que
   importa. Lo que cambia es que ahora hay una puerta de entrada.

   Lo que NO se muestra: comisiones, precio mínimo, datos del propietario,
   ni nada de lo que se habla puertas adentro.

   Se carga en el sitio público, antes de publica-directorio.js. */

(function(){
'use strict';

var A = {
  autos: [],
  fotos: {},        /* vehiculo_id -> [rutas] */
  cargado: false,
  orden: 'nuevos',
  abierto: false,   /* el panel de filtros, plegado en celular */
  f: {
    texto: '', marca: '', carroceria: '', combustible: '', transmision: '',
    precioMin: '', precioMax: '', anioMin: '', anioMax: '', kmMax: '',
    permuta: false, financia: false
  }
};

var FILTROS_VACIOS = {
  texto: '', marca: '', carroceria: '', combustible: '', transmision: '',
  precioMin: '', precioMax: '', anioMin: '', anioMax: '', kmMax: '',
  permuta: false, financia: false
};

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function usd(n){ return 'USD ' + Number(n||0).toLocaleString('es-AR'); }

/* Un vehículo puede estar publicado en dólares o en pesos. La moneda y la
   cotización a la que se fijó el precio viajan en la propia fila.

   Para MOSTRAR se usa la moneda tal cual: al que mira el auto no se le
   convierte nada, ve el precio como está publicado.

   Para COMPARAR (ordenar por precio, filtrar por rango) hay que llevar
   todo a una sola unidad, porque si no un auto de 15 millones de pesos
   se ordena como si fuera más caro que uno de 40.000 dólares. Se usa la
   cotización congelada de la fila, no una viva: así el orden no cambia
   solo porque se movió el dólar. */
function precio(v){
  var n = Number((v && v.precio) || 0);
  return ((v && v.moneda === 'ARS') ? '$ ' : 'USD ') + n.toLocaleString('es-AR');
}
function precioUSD(v){
  var n = Number((v && v.precio) || 0);
  var c = Number((v && v.cotizacion) || 0);
  if(v && v.moneda === 'ARS' && c > 0) return n / c;
  return n;
}
function num(n){ return Number(n||0).toLocaleString('es-AR'); }

function urlFoto(ruta){
  if(!ruta) return null;
  try { return sb.storage.from('vehiculos').getPublicUrl(ruta).data.publicUrl; }
  catch(e){ return null; }
}

function titulo(v){
  return [v.marca, v.modelo, v.version].filter(Boolean).join(' ');
}

/* ═══════════════════════════════════════════════════════════════
   DATOS
   ═══════════════════════════════════════════════════════════════ */

async function cargarAutos(){
  try {
    /* Las reglas de la base ya se encargan de que un visitante solo vea
       lo que está realmente a la venta: nada vendido, nada con seña. */
    var r = await sb.from('vehiculos').select('*')
      .eq('estado','disponible').order('creado_en',{ascending:false});
    A.autos = r.data || [];

    var f = await sb.from('vehiculo_fotos').select('vehiculo_id,ruta,portada,orden')
      .order('portada',{ascending:false}).order('orden',{ascending:true});
    A.fotos = {};
    (f.data || []).forEach(function(x){
      (A.fotos[x.vehiculo_id] = A.fotos[x.vehiculo_id] || []).push(x.ruta);
    });
  } catch(e){ A.autos = []; A.fotos = {}; }
  A.cargado = true;
}

function portada(v){
  var l = A.fotos[v.id];
  return (l && l.length) ? urlFoto(l[0]) : null;
}

/* ═══════════════════════════════════════════════════════════════
   LA TARJETA
   ═══════════════════════════════════════════════════════════════ */

function tarjeta(v){
  var f = portada(v);
  var t = titulo(v);

  return '<div class="vcard">'+
    '<div class="vimg" style="cursor:pointer;'+
      (f ? 'background-image:url('+esc(f)+');background-size:cover;background-position:center' : '')+
      '" onclick="verAuto('+v.id+')">'+
      (f ? '' : esc(v.icono || '🚗'))+
      '<span class="pill p-blue gama">'+esc(GAMA_LABEL[v.gama] || '')+'</span>'+
      (v.anio ? '<span class="pill p-gray est">'+v.anio+'</span>' : '')+
    '</div>'+
    '<div class="vbody">'+
      '<div class="vtitle" style="cursor:pointer" onclick="verAuto('+v.id+')">'+esc(t)+'</div>'+
      '<div class="vmeta">'+
        (v.km ? num(v.km)+' km' : 'Km sin declarar')+
        (v.combustible ? ' · '+esc(v.combustible) : '')+
        (v.transmision ? ' · '+esc(v.transmision) : '')+
      '</div>'+
      '<div class="vprice">'+precio(v)+'</div>'+
      '<div class="vspecs" style="margin-top:11px">'+
        (v.acepta_permuta   ? '<span class="spec">Acepta permuta</span>' : '')+
        (v.unico_dueno      ? '<span class="spec">Único dueño</span>' : '')+
        (v.service_al_dia   ? '<span class="spec">Service al día</span>' : '')+
        (v.acepta_financiacion ? '<span class="spec">Financiación</span>' : '')+
      '</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn" style="flex:1;min-width:120px" '+
          'onclick="consultarPorVehiculo('+v.id+',\''+esc(t).replace(/'/g,"\\'")+'\')">Consultar</button>'+
        '<button class="btn btn-o btn-sm" onclick="verAuto('+v.id+')">Ver ficha</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   LA FICHA COMPLETA
   ═══════════════════════════════════════════════════════════════ */

/* ── Jerarquía tipográfica de la ficha ──────────────────────────────────
   Cambio 1 de BIVONACARS-DISENO.md. El lujo se lee en el espacio en blanco,
   no en la cantidad de dorado: el nombre del vehículo pasa a ser lo más
   grande de la pantalla, y todo lo que lo rodea —precio, kilometraje,
   ficha técnica— baja de peso para que no le compita. No cambia ni un dato:
   es sólo tipografía, aire e interlineado, y va scopeado a `.ovl-ficha`
   para no tocar el resto de los modales del sitio. */
function estilosFicha(){
  if(document.getElementById('estilosFicha')) return;
  var s = document.createElement('style');
  s.id = 'estilosFicha';
  s.textContent =
    /* más ancho: el aire necesita lugar donde existir */
    '.ovl-ficha .mod{max-width:680px}' +
    '.ovl-ficha .mod-h{padding:30px 34px 20px;' +
      'border-bottom:1px solid rgba(226,232,240,.6)}' +
    /* el nombre del auto es lo que domina la pantalla */
    '.ovl-ficha .mod-h h3{font-size:clamp(1.45rem,3.6vw,1.95rem);font-weight:600;' +
      'letter-spacing:-.8px;line-height:1.18;padding-right:16px}' +
    '.ovl-ficha .mod-b{padding:26px 34px 30px}' +
    '.ovl-ficha .mod-f{padding:20px 34px}' +
    /* la foto respira y se ve de verdad */
    '.ovl-ficha .ficha-fotos{display:flex;gap:12px;overflow-x:auto;' +
      'margin:0 0 30px;padding-bottom:6px}' +
    '.ovl-ficha .ficha-fotos img{height:232px;border-radius:12px;' +
      'flex-shrink:0;object-fit:cover}' +
    /* el precio es un dato, no un grito: no le gana al nombre */
    '.ovl-ficha .ficha-precio{font-size:1.3rem;font-weight:600;' +
      'letter-spacing:-.2px;color:var(--navy);margin-bottom:6px}' +
    '.ovl-ficha .ficha-meta{margin-bottom:26px;letter-spacing:.2px}' +
    '.ovl-ficha .ficha-desc{font-size:.9rem;line-height:1.85;' +
      'margin-bottom:26px;color:#3A4757;white-space:pre-wrap}' +
    /* la ficha técnica se lee, no se grita */
    '.ovl-ficha .detail-row{padding:11px 0;font-size:.86rem}' +
    '.ovl-ficha .detail-row span:first-child{font-weight:500}' +
    '.ovl-ficha .detail-row span:last-child{font-weight:600;color:var(--ink)}' +
    /* ── Lo que sabemos de este auto (cambio 3) ─────────────────────
       La mala noticia se marca en ámbar y la buena se deja neutra. Al
       revés —premiar en verde lo que está bien— el bloque se leería
       como una lista de argumentos de venta, que es justo lo que no es. */
    '.ovl-ficha .ficha-saber{margin-top:26px;padding:20px 18px 6px;' +
      'background:var(--bg);border:1px solid var(--line);border-radius:11px}' +
    '.ovl-ficha .ficha-saber>b{display:block;font-size:.95rem;font-weight:600;' +
      'color:var(--navy);letter-spacing:-.3px}' +
    '.ovl-ficha .ficha-saber>p{margin:6px 0 14px;line-height:1.6}' +
    '.ovl-ficha .ficha-saber .detail-row span:last-child{font-weight:600}' +
    '.ovl-ficha .sab-mal{color:var(--amber)!important;font-weight:700!important}' +
    '.ovl-ficha .sab-nd{color:var(--gray-l)!important;font-weight:500!important}' +
    '@media(max-width:620px){' +
      '.ovl-ficha .mod-h{padding:22px 20px 15px}' +
      '.ovl-ficha .mod-b{padding:20px 20px 24px}' +
      '.ovl-ficha .mod-f{padding:16px 20px}' +
      '.ovl-ficha .ficha-fotos img{height:178px}}';
  document.head.appendChild(s);
}

function dato(etiqueta, valor){
  if(valor === null || valor === undefined || valor === '' || valor === false) return '';
  return '<div class="detail-row"><span>'+etiqueta+'</span><span>'+esc(valor)+'</span></div>';
}

/* ── "Lo que sabemos de este auto" ──────────────────────────────────────
   Cambio 3 de BIVONACARS-DISENO.md, y el de más valor de los seis. Estos
   datos ya estaban en la base y en el formulario de publicación, y no se
   mostraban en ningún lado: deuda de patentes, infracciones, prenda, VTV,
   choques, dueños, service, llaves. Acá se muestran TODOS, incluidas las
   respuestas malas, porque decir "tiene una deuda de patentes" vende más
   que no decir nada — es el mismo hallazgo que el de las 25 fotos.

   La redacción es deliberada. Los booleanos de la tabla son NOT NULL con
   default `false`, así que un `false` significa "el que publicó no lo
   tildó", no "el auto está verificado sin deuda". Por eso ninguna línea
   afirma un hecho sobre el auto: todas dicen qué se DECLARA. "Sin deuda
   declarada" es cierto siempre; "no tiene deuda" sería una garantía que
   el dato no respalda, y una garantía falsa es peor que el silencio. */

function fechaCorta(iso){
  if(!iso) return '';
  var p = String(iso).slice(0,10).split('-');
  return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : String(iso);
}
function hoyISO(){
  var d = new Date();
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}

/* tono: '' neutro (dato sin carga), 'mal' (lo incómodo, en ámbar),
   'nd' (no declarado, en gris: la ausencia también es información) */
function filaSaber(etiqueta, texto, tono){
  if(!texto) return '';
  return '<div class="detail-row"><span>'+etiqueta+'</span><span'+
    (tono ? ' class="sab-'+tono+'"' : '')+'>'+esc(texto)+'</span></div>';
}

function bloqueSaber(v){
  var f = '';

  /* Primero lo que el comprador teme: papeles y plata. */
  f += filaSaber('Deuda de patentes',
        v.deuda_patentes ? 'Tiene deuda declarada' : 'Sin deuda declarada',
        v.deuda_patentes ? 'mal' : '');
  f += filaSaber('Infracciones',
        v.deuda_infracciones ? 'Tiene infracciones impagas' : 'Sin infracciones declaradas',
        v.deuda_infracciones ? 'mal' : '');
  f += filaSaber('Prenda',
        v.prenda ? 'Tiene prenda declarada' : 'Sin prenda declarada',
        v.prenda ? 'mal' : '');

  /* VTV: si la fecha ya pasó, se dice que está vencida. */
  if(v.vtv_vence){
    var vencida = String(v.vtv_vence).slice(0,10) < hoyISO();
    f += filaSaber('VTV',
          (vencida ? 'Vencida el ' : 'Vigente hasta ')+fechaCorta(v.vtv_vence),
          vencida ? 'mal' : '');
  } else {
    f += filaSaber('VTV', 'Sin declarar', 'nd');
  }

  /* Historial: el texto va tal como lo declaró quien publicó. */
  f += v.historial_choques
    ? filaSaber('Historial de choques', v.historial_choques, '')
    : filaSaber('Historial de choques', 'Sin declarar', 'nd');

  f += v.unico_dueno
    ? filaSaber('Dueños', 'Único dueño', '')
    : (v.duenos_anteriores !== null && v.duenos_anteriores !== undefined && v.duenos_anteriores !== ''
        ? filaSaber('Dueños', num(v.duenos_anteriores)+' anteriores', '')
        : filaSaber('Dueños', 'Sin declarar', 'nd'));

  f += v.service_al_dia
    ? filaSaber('Service', 'Al día'+(v.service_oficial ? ', en servicio oficial' : ''), '')
    : filaSaber('Service', 'Sin declarar al día', 'nd');

  var ult = [];
  if(v.ultimo_service_km)    ult.push(num(v.ultimo_service_km)+' km');
  if(v.ultimo_service_fecha) ult.push(fechaCorta(v.ultimo_service_fecha));
  if(ult.length) f += filaSaber('Último service', ult.join(' · '), '');

  if(v.uso_previo) f += filaSaber('Uso previo', v.uso_previo, '');
  if(v.importado)  f += filaSaber('Origen', 'Importado', '');

  f += (v.cantidad_llaves !== null && v.cantidad_llaves !== undefined && v.cantidad_llaves !== '')
    ? filaSaber('Llaves', num(v.cantidad_llaves), '')
    : filaSaber('Llaves', 'Sin declarar', 'nd');

  var trae = [];
  if(v.tiene_manual)  trae.push('manual');
  if(v.tiene_auxilio) trae.push('auxilio');
  if(v.tiene_criquet) trae.push('criquet');
  f += trae.length
    ? filaSaber('Entrega con', trae.join(' · '), '')
    : filaSaber('Entrega con', 'Sin declarar', 'nd');

  if(!f) return '';

  return '<div class="ficha-saber">'+
    '<b>Lo que sabemos de este auto</b>'+
    '<p class="mini">Todo esto lo declara quien publica el vehículo. Lo que figura '+
    'como sin declarar no está verificado: preguntáselo al comisionista antes de avanzar.</p>'+
    f+'</div>';
}

window.verAuto = function(id){
  var v = A.autos.filter(function(x){ return x.id === id; })[0];
  if(!v) return;
  estilosFicha();
  var t = titulo(v);
  var fotos = (A.fotos[v.id] || []).map(urlFoto).filter(Boolean);

  modal(esc(t) + (v.anio ? ' ' + v.anio : ''),
    (fotos.length
      ? '<div class="ficha-fotos">'+
        fotos.map(function(u){
          return '<img src="'+esc(u)+'" alt="">';
        }).join('')+'</div>'
      : '')+

    '<div class="ficha-precio">'+precio(v)+'</div>'+
    '<div class="mini ficha-meta">'+
      (v.km ? num(v.km)+' km' : 'Kilometraje sin declarar')+
      (v.ubicacion ? ' · '+esc(v.ubicacion) : '')+'</div>'+

    (v.descripcion ? '<div class="ficha-desc">'+esc(v.descripcion)+'</div>' : '')+

    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:4px 15px">'+
      dato('Moneda', v.moneda === 'ARS' ? 'Pesos argentinos' : '')+
      dato('Año', v.anio)+
      dato('Carrocería', v.carroceria)+
      dato('Motor', v.motor)+
      dato('Cilindrada', v.cilindrada)+
      dato('Potencia', v.potencia_hp ? v.potencia_hp + ' HP' : '')+
      dato('Combustible', v.combustible)+
      dato('Transmisión', v.transmision)+
      dato('Tracción', v.traccion)+
      dato('Puertas', v.puertas)+
      dato('Color', v.color)+
      dato('Estado general', v.estado_general)+
      dato('GNC', v.tiene_gnc ? 'Sí' : '')+
      dato('Garantía de fábrica hasta', v.garantia_hasta)+
      dato('Transferencia a cargo de', v.transferencia_a_cargo)+
      dato('Se puede ver', v.disponible_para_ver)+
      dato('Test drive', v.test_drive===true ? 'Sí' : (v.test_drive===false ? 'No' : ''))+
    '</div>'+

    (v.equipamiento && v.equipamiento.length
      ? '<div style="margin-top:14px"><b style="font-size:.85rem;color:var(--navy)">Equipamiento</b>'+
        '<div class="vspecs" style="margin-top:8px">'+
        v.equipamiento.map(function(e){ return '<span class="spec">'+esc(e)+'</span>'; }).join('')+
        '</div></div>'
      : '')+

    bloqueSaber(v)+

    (v.detalles_esteticos || v.detalles_mecanicos
      ? '<div class="note w" style="margin-top:14px"><b>Detalles a tener en cuenta</b><br>'+
        esc([v.detalles_esteticos, v.detalles_mecanicos].filter(Boolean).join(' · '))+'</div>'
      : '')+

    '<div class="note" style="margin-top:14px">Para ver el vehículo, coordinar una prueba o hacer '+
    'una oferta, hablás con un comisionista de la red. Él te acompaña hasta la transferencia.</div>',

    [{txt:'Cerrar', clase:'btn-o', fn:'cerrarModal()'},
     {txt:'Consultar este vehículo', clase:'',
      fn:'cerrarModal();consultarPorVehiculo('+v.id+',\''+esc(t).replace(/'/g,"\\'")+'\')'}]);


  var capa = document.getElementById('modalOvl');
  if(capa) capa.classList.add('ovl-ficha');
};

/* ═══════════════════════════════════════════════════════════════
   LA PANTALLA
   ═══════════════════════════════════════════════════════════════ */

/* ── Las opciones salen de los autos que hay, no de una lista inventada ──
   Si nunca cargaste una pick-up, no tiene sentido ofrecer "Pick-up" en el
   filtro y que el que la elija se encuentre con la pantalla vacía. */
function opciones(campo){
  var vistos = {}, salida = [];
  A.autos.forEach(function(v){
    var x = v[campo];
    if(x && !vistos[x]){ vistos[x] = 1; salida.push(x); }
  });
  return salida.sort();
}

function selector(campo, etiqueta){
  var lista = opciones(campo);
  if(!lista.length) return '';
  return '<div><label class="mini" style="font-weight:700;display:block;margin-bottom:4px">'+
    etiqueta+'</label><select style="width:100%" onchange="filtrar(\''+campo+'\',this.value)">'+
    '<option value="">Cualquiera</option>'+
    lista.map(function(x){
      return '<option value="'+esc(x)+'"'+(A.f[campo]===x?' selected':'')+'>'+esc(x)+'</option>';
    }).join('')+'</select></div>';
}

function numerito(campo, etiqueta, marcador){
  return '<div><label class="mini" style="font-weight:700;display:block;margin-bottom:4px">'+
    etiqueta+'</label><input type="number" inputmode="numeric" style="width:100%" '+
    'placeholder="'+esc(marcador)+'" value="'+esc(A.f[campo])+'" '+
    'onchange="filtrar(\''+campo+'\',this.value)"></div>';
}

function pasaElFiltro(v){
  var f = A.f;
  if(f.texto){
    var t = (titulo(v)+' '+(v.anio||'')+' '+(v.color||'')+' '+(v.carroceria||'')).toLowerCase();
    if(t.indexOf(f.texto.toLowerCase()) < 0) return false;
  }
  if(f.marca       && v.marca       !== f.marca)       return false;
  if(f.carroceria  && v.carroceria  !== f.carroceria)  return false;
  if(f.combustible && v.combustible !== f.combustible) return false;
  if(f.transmision && v.transmision !== f.transmision) return false;
  if(f.precioMin && precioUSD(v) < Number(f.precioMin)) return false;
  if(f.precioMax && precioUSD(v) > Number(f.precioMax)) return false;
  if(f.anioMin   && Number(v.anio||0) < Number(f.anioMin))  return false;
  if(f.anioMax   && Number(v.anio||9999) > Number(f.anioMax)) return false;
  if(f.kmMax     && Number(v.km||0) > Number(f.kmMax))      return false;
  if(f.permuta   && !v.acepta_permuta)      return false;
  if(f.financia  && !v.acepta_financiacion) return false;
  return true;
}

function hayFiltros(){
  for(var k in A.f) if(A.f[k]) return true;
  return false;
}

function vistaAutos(){
  if(!A.cargado){
    cargarAutos().then(function(){ if(typeof render === 'function') render(); });
    return '<div class="wrap"><div class="empty">Cargando vehículos…</div></div>';
  }

  var lista = A.autos.filter(pasaElFiltro);

  if(A.orden === 'baratos') lista.sort(function(a,b){ return precioUSD(a) - precioUSD(b); });
  if(A.orden === 'caros')   lista.sort(function(a,b){ return precioUSD(b) - precioUSD(a); });
  if(A.orden === 'km')      lista.sort(function(a,b){ return (a.km||0) - (b.km||0); });
  if(A.orden === 'nuevo')   lista.sort(function(a,b){ return (b.anio||0) - (a.anio||0); });

  var abierto = A.abierto;
  var activos = hayFiltros();

  return '<div class="wrap">'+
    '<h2 class="sec">Vehículos disponibles</h2>'+
    '<p class="sub">Buscá el que te interesa. Cuando encuentres uno, te ponemos en contacto '+
      'con un comisionista de la red, que es quien te acompaña en toda la operación.</p>'+

    /* Buscador siempre a la vista; el resto se despliega */
    '<div class="filters" style="margin-bottom:12px">'+
      '<input id="catBuscar" placeholder="Buscar marca, modelo, año…" value="'+esc(A.f.texto)+'" '+
        'oninput="buscarAuto(this.value)">'+
      '<select onchange="A_orden(this.value)">'+
        '<option value="nuevos"'+(A.orden==='nuevos'?' selected':'')+'>Recién publicados</option>'+
        '<option value="baratos"'+(A.orden==='baratos'?' selected':'')+'>Menor precio</option>'+
        '<option value="caros"'+(A.orden==='caros'?' selected':'')+'>Mayor precio</option>'+
        '<option value="km"'+(A.orden==='km'?' selected':'')+'>Menos kilómetros</option>'+
        '<option value="nuevo"'+(A.orden==='nuevo'?' selected':'')+'>Más nuevos</option>'+
      '</select>'+
      '<button class="btn '+(activos?'':'btn-o')+' btn-sm" onclick="A_abrir()">'+
        (abierto ? 'Ocultar filtros' : 'Más filtros')+'</button>'+
      (activos && !abierto
        ? '<button class="btn btn-o btn-sm" onclick="limpiarFiltros()">Limpiar</button>'
        : '')+
    '</div>'+

    (abierto
      ? '<div class="card" style="padding:18px;margin-bottom:18px">'+
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">'+
            selector('marca','Marca')+
            selector('carroceria','Tipo')+
            selector('combustible','Combustible')+
            selector('transmision','Transmisión')+
            numerito('precioMin','Precio desde (USD)','0')+
            numerito('precioMax','Precio hasta (USD)','Sin tope')+
            numerito('anioMin','Año desde','1990')+
            numerito('anioMax','Año hasta','2026')+
            numerito('kmMax','Kilómetros hasta','Sin tope')+
          '</div>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center">'+
            '<label class="chk" style="margin:0"><input type="checkbox"'+
              (A.f.permuta?' checked':'')+' onchange="filtrar(\'permuta\',this.checked)">'+
              '<span>Acepta permuta</span></label>'+
            '<label class="chk" style="margin:0"><input type="checkbox"'+
              (A.f.financia?' checked':'')+' onchange="filtrar(\'financia\',this.checked)">'+
              '<span>Acepta financiación</span></label>'+
            '<div style="flex:1"></div>'+
            (hayFiltros()
              ? '<button class="btn btn-o btn-sm" onclick="limpiarFiltros()">Limpiar todo</button>'
              : '')+
          '</div>'+
        '</div>'
      : '')+

    '<div class="mini" style="margin-bottom:14px">'+
      lista.length+' vehículo'+(lista.length===1?'':'s')+
      (hayFiltros() ? ' de '+A.autos.length : '')+'</div>'+

    (lista.length
      ? '<div class="grid">'+lista.map(tarjeta).join('')+'</div>'
      : '<div class="empty"><div class="ic">🚗</div>'+
        (A.autos.length
          ? '<b>Ningún vehículo coincide con lo que buscás</b>'+
            '<div class="mini" style="margin-top:6px">Probá aflojando algún filtro.</div>'+
            '<button class="btn btn-o btn-sm" style="margin-top:14px" '+
              'onclick="limpiarFiltros()">Limpiar los filtros</button>'
          : '<b>Todavía no hay vehículos publicados</b>'+
            '<div class="mini" style="margin-top:6px">Estamos cargando el catálogo. '+
            'Volvé en unos días o escribinos y te avisamos.</div>')+'</div>')+
  '</div>';
}

window.buscarAuto = function(t){
  A.f.texto = t;
  render();
  /* Redibujar la pantalla le saca el cursor al que está tipeando, así que
     se lo devolvemos donde estaba. */
  var e = document.getElementById('catBuscar');
  if(e){ e.focus(); e.setSelectionRange(e.value.length, e.value.length); }
};

window.filtrar = function(campo, valor){ A.f[campo] = valor; render(); };
window.A_orden = function(v){ A.orden = v; render(); };
window.A_abrir = function(){ A.abierto = !A.abierto; render(); };
window.limpiarFiltros = function(){
  A.f = Object.assign({}, FILTROS_VACIOS);
  A.abierto = true;
  render();
};

/* ═══════════════════════════════════════════════════════════════
   LOS ACCESOS
   ═══════════════════════════════════════════════════════════════ */

/* La barra de arriba, para el que no tiene cuenta, no tenía ni un enlace
   a los autos: solo Ingresar y Registrarme. */
function accesosVisitante(){
  if(typeof perfil !== 'undefined' && perfil) return;
  var nav = document.getElementById('nav');
  if(!nav || document.getElementById('navAutos')) return;

  var b = document.createElement('button');
  b.id = 'navAutos';
  b.textContent = 'Ver autos';
  b.className = (typeof vista !== 'undefined' && vista === 'autos') ? 'on' : '';
  b.onclick = function(){ vista = 'autos'; render(); };
  nav.insertBefore(b, nav.firstChild);
}

/* Y en la portada, el botón grande. La página de presentación está escrita
   para reclutar comisionistas; el que entra buscando un auto necesita ver
   enseguida que acá hay autos. */
function botonEnLaPortada(){
  if(typeof perfil !== 'undefined' && perfil) return;
  if(typeof vista !== 'undefined' && vista !== 'landing') return;
  setTimeout(function(){
    var cta = document.querySelector('#app .hero-cta');
    if(!cta || document.getElementById('ctaAutos')) return;
    var b = document.createElement('button');
    b.id = 'ctaAutos';
    b.className = 'btn-hero';
    b.textContent = 'Ver los autos disponibles';
    b.onclick = function(){ vista = 'autos'; render(); };
    cta.insertBefore(b, cta.firstChild);
  }, 40);
}

var renderPrevioCat = window.render;
window.render = function(){
  if(typeof vista !== 'undefined' && vista === 'autos'){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vistaAutos();
    accesosVisitante();
    if(typeof pintarPieLegal === 'function') try { pintarPieLegal(); } catch(e){}
    return;
  }
  var r = renderPrevioCat.apply(this, arguments);
  accesosVisitante();
  botonEnLaPortada();
  return r;
};

})();

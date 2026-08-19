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

function dato(etiqueta, valor){
  if(valor === null || valor === undefined || valor === '' || valor === false) return '';
  return '<div class="detail-row"><span>'+etiqueta+'</span><span>'+esc(valor)+'</span></div>';
}

window.verAuto = function(id){
  var v = A.autos.filter(function(x){ return x.id === id; })[0];
  if(!v) return;
  var t = titulo(v);
  var fotos = (A.fotos[v.id] || []).map(urlFoto).filter(Boolean);

  modal(esc(t) + (v.anio ? ' ' + v.anio : ''),
    (fotos.length
      ? '<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px">'+
        fotos.map(function(u){
          return '<img src="'+esc(u)+'" alt="" style="height:170px;border-radius:10px;'+
            'flex-shrink:0;object-fit:cover">';
        }).join('')+'</div>'
      : '')+

    '<div style="font-size:1.7rem;font-weight:800;color:var(--navy);letter-spacing:-.5px;'+
      'margin-bottom:4px">'+precio(v)+'</div>'+
    '<div class="mini" style="margin-bottom:16px">'+
      (v.km ? num(v.km)+' km' : 'Kilometraje sin declarar')+
      (v.ubicacion ? ' · '+esc(v.ubicacion) : '')+'</div>'+

    (v.descripcion ? '<div style="font-size:.88rem;line-height:1.65;margin-bottom:16px;'+
      'white-space:pre-wrap">'+esc(v.descripcion)+'</div>' : '')+

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
      dato('Dueños anteriores', v.duenos_anteriores)+
      dato('Estado general', v.estado_general)+
      dato('GNC', v.tiene_gnc ? 'Sí' : '')+
      dato('VTV vigente hasta', v.vtv_vence)+
      dato('Garantía de fábrica hasta', v.garantia_hasta)+
      dato('Transferencia a cargo de', v.transferencia_a_cargo)+
      dato('Se puede ver', v.disponible_para_ver)+
    '</div>'+

    (v.equipamiento && v.equipamiento.length
      ? '<div style="margin-top:14px"><b style="font-size:.85rem;color:var(--navy)">Equipamiento</b>'+
        '<div class="vspecs" style="margin-top:8px">'+
        v.equipamiento.map(function(e){ return '<span class="spec">'+esc(e)+'</span>'; }).join('')+
        '</div></div>'
      : '')+

    (v.detalles_esteticos || v.detalles_mecanicos
      ? '<div class="note w" style="margin-top:14px"><b>Detalles a tener en cuenta</b><br>'+
        esc([v.detalles_esteticos, v.detalles_mecanicos].filter(Boolean).join(' · '))+'</div>'
      : '')+

    '<div class="note" style="margin-top:14px">Para ver el vehículo, coordinar una prueba o hacer '+
    'una oferta, hablás con un comisionista de la red. Él te acompaña hasta la transferencia.</div>',

    [{txt:'Cerrar', clase:'btn-o', fn:'cerrarModal()'},
     {txt:'Consultar este vehículo', clase:'',
      fn:'cerrarModal();consultarPorVehiculo('+v.id+',\''+esc(t).replace(/'/g,"\\'")+'\')'}]);
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

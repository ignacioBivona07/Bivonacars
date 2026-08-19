/* BivonaCars — El directorio de comisionistas.

   Acá se resuelve la tensión central del negocio: queremos que la gente
   vea los autos, pero no queremos que nadie compre por afuera de un
   comisionista. Si el que entra a la página no conoce a ninguno, antes
   se quedaba sin puerta de entrada y la venta se perdía.

   La puerta es esta: el que pregunta por un auto elige con quién hablar.
   Si no quiere elegir, le asignamos uno por turno riguroso entre los que
   tienen ese auto en su cupo — son los que más ganas tienen de venderlo.
   Nadie queda salteado y nadie puede acusar a la casa de repartir a dedo.

   Se carga en el sitio público, después de parche2.js. */

(function(){
'use strict';

var G = {
  lista: [],            /* comisionistas publicados */
  cargado: false,
  buscar: '',
  vehiculo: null,       /* si viene desde un auto puntual */
  vehiculoDesc: '',
  destacados: [],       /* ids de los que tienen ese auto tomado */
  resenas: {},          /* id -> array */
  abierto: null         /* ficha desplegada */
};

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function nombreDe(u){ return ((u.nombre||'')+' '+(u.apellido||'')).trim(); }

function urlFoto(ruta){
  if(!ruta) return null;
  try { return sb.storage.from('perfiles').getPublicUrl(ruta).data.publicUrl; }
  catch(e){ return null; }
}

function avatar(u, t){
  var f = urlFoto(u.foto_path);
  if(f) return '<img src="'+esc(f)+'" alt="'+esc(nombreDe(u))+'" style="width:'+t+'px;height:'+t+'px;'+
    'border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #fff;box-shadow:var(--shadow)">';
  return '<div style="width:'+t+'px;height:'+t+'px;border-radius:50%;background:var(--navy);color:#fff;'+
    'display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:'+Math.round(t/2.6)+'px">'+
    esc((u.nombre||'?').charAt(0).toUpperCase())+'</div>';
}

function estrellas(n, tam){
  var s = '';
  for(var i=1;i<=5;i++) s += (i <= Math.round(n) ? '★' : '☆');
  return '<span style="color:#B45309;letter-spacing:2px;font-size:'+(tam||'.95rem')+'">'+s+'</span>';
}

/* ── El número para WhatsApp ───────────────────────────────────────
   La gente carga el teléfono de veinte maneras distintas. Esto lo lleva
   al formato internacional que espera wa.me, asumiendo Argentina cuando
   no viene código de país. */
function paraWhatsapp(tel){
  var n = String(tel||'').replace(/[^0-9]/g,'');
  if(!n) return null;
  if(n.indexOf('54') === 0)  return n;
  if(n.charAt(0) === '0')    n = n.slice(1);
  if(n.length >= 10)         return '549' + n;
  return '54' + n;
}

function enlaceWa(u, texto){
  var n = paraWhatsapp(u.wa_tel);
  if(!n) return null;
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
}

function mensajeParaWa(u){
  var t = 'Hola ' + (u.nombre||'') + ', te escribo desde la página de BivonaCars.';
  if(G.vehiculoDesc) t += ' Me interesa el ' + G.vehiculoDesc + '.';
  else t += ' Quería consultarte por un vehículo.';
  return t;
}

/* ═══════════════════════════════════════════════════════════════
   DATOS
   ═══════════════════════════════════════════════════════════════ */

async function cargarDirectorio(){
  try {
    var r = await sb.from('comisionistas_publicos').select('*');
    G.lista = r.data || [];
  } catch(e){ G.lista = []; }
  G.cargado = true;
}

async function cargarDestacados(vehiculoId){
  G.destacados = [];
  if(!vehiculoId) return;
  try {
    var r = await sb.rpc('comisionistas_del_vehiculo', { p_vehiculo_id: vehiculoId });
    if(r.data) G.destacados = r.data.map(function(x){ return (x && x.usuario_id) ? x.usuario_id : x; });
  } catch(e){ G.destacados = []; }
}

async function cargarResenas(id){
  if(G.resenas[id]) return;
  try {
    var r = await sb.from('resenas').select('autor,puntaje,comentario,creado_en')
      .eq('comisionista_id', id).eq('estado','visible')
      .order('creado_en',{ascending:false}).limit(20);
    G.resenas[id] = r.data || [];
  } catch(e){ G.resenas[id] = []; }
}

/* ═══════════════════════════════════════════════════════════════
   LA FICHA DE CADA UNO
   ═══════════════════════════════════════════════════════════════ */

function fichaComisionista(u){
  var destacado = G.destacados.indexOf(u.id) >= 0;
  var wa = enlaceWa(u, mensajeParaWa(u));
  var abierta = G.abierto === u.id;
  var rs = G.resenas[u.id] || [];

  return '<div class="card" style="padding:20px;'+
      (destacado ? 'border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)' : '')+'">'+

    (destacado ? '<div style="background:var(--blue-l);color:var(--blue-d);font-size:.72rem;'+
      'font-weight:800;padding:5px 10px;border-radius:7px;margin-bottom:13px;display:inline-block">'+
      'TIENE ESTE VEHÍCULO</div>' : '')+

    '<div style="display:flex;gap:14px;align-items:flex-start">'+
      avatar(u, 62)+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:1.02rem;font-weight:800;color:var(--navy);line-height:1.25">'+
          esc(nombreDe(u))+'</div>'+
        '<div class="mini" style="margin-top:2px">'+
          esc(u.nivel||'')+(u.localidad ? ' · '+esc(u.localidad) : '')+
          (u.ventas ? ' · '+u.ventas+' venta'+(u.ventas===1?'':'s') : '')+'</div>'+
        '<div style="margin-top:6px">'+
          (Number(u.resenas) > 0
            ? estrellas(u.puntaje)+' <span class="mini">'+u.puntaje+' ('+u.resenas+')</span>'
            : '<span class="mini">Todavía sin reseñas</span>')+
        '</div>'+
      '</div>'+
    '</div>'+

    (u.descripcion ? '<div style="font-size:.87rem;line-height:1.6;color:var(--ink);margin-top:13px;'+
      'white-space:pre-wrap">'+esc(u.descripcion)+'</div>' : '')+

    '<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap">'+
      (wa
        ? '<a class="btn" style="flex:1;min-width:130px;text-decoration:none" target="_blank" '+
          'rel="noopener" href="'+esc(wa)+'">Contactar</a>'
        : '<button class="btn" disabled style="flex:1;min-width:130px">Sin contacto cargado</button>')+
      '<button class="btn btn-o btn-sm" onclick="verResenas(\''+esc(u.id)+'\')">'+
        (abierta ? 'Ocultar' : 'Reseñas')+'</button>'+
    '</div>'+

    (abierta
      ? '<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--line)">'+
          (rs.length
            ? rs.map(function(r){
                return '<div style="padding:9px 0;border-bottom:1px solid var(--line)">'+
                  '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">'+
                    '<b style="font-size:.84rem">'+esc(r.autor)+'</b>'+estrellas(r.puntaje,'.8rem')+'</div>'+
                  (r.comentario ? '<div style="font-size:.83rem;line-height:1.5;color:var(--gray);'+
                    'margin-top:3px;white-space:pre-wrap">'+esc(r.comentario)+'</div>' : '')+
                '</div>';
              }).join('')
            : '<div class="mini">Nadie dejó una reseña todavía.</div>')+
          '<button class="btn btn-o btn-sm btn-block" style="margin-top:12px" '+
            'onclick="dejarResena(\''+esc(u.id)+'\',\''+esc(nombreDe(u))+'\')">Dejar una reseña</button>'+
        '</div>'
      : '')+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   LA PANTALLA
   ═══════════════════════════════════════════════════════════════ */

function vistaDirectorio(){
  if(!G.cargado){
    cargarDirectorio().then(function(){ if(typeof render === 'function') render(); });
    return '<div class="wrap"><div class="empty">Cargando comisionistas…</div></div>';
  }

  var texto = G.buscar.toLowerCase();
  var lista = G.lista.filter(function(u){
    if(!texto) return true;
    return (nombreDe(u) + ' ' + (u.localidad||'') + ' ' + (u.provincia||'')).toLowerCase().indexOf(texto) >= 0;
  });

  /* Primero los que tienen el auto en su cupo: son los que más lo
     conocen y los que más apuro tienen por venderlo. */
  lista.sort(function(a,b){
    var da = G.destacados.indexOf(a.id) >= 0 ? 0 : 1;
    var db = G.destacados.indexOf(b.id) >= 0 ? 0 : 1;
    if(da !== db) return da - db;
    if(Number(b.puntaje) !== Number(a.puntaje)) return Number(b.puntaje) - Number(a.puntaje);
    return Number(b.ventas||0) - Number(a.ventas||0);
  });

  return '<div class="wrap">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">'+
      '<div>'+
        '<h2 class="sec">Nuestros comisionistas</h2>'+
        '<p class="sub">'+
          (G.vehiculoDesc
            ? 'Cualquiera de ellos te puede vender el <b>'+esc(G.vehiculoDesc)+'</b>. '+
              'Arriba están los que ya lo tienen tomado.'
            : 'Toda venta se hace a través de un comisionista. Elegí con quién querés hablar.')+
        '</p>'+
      '</div>'+
      '<button class="btn btn-o btn-sm" onclick="volverAlCatalogo()">← Volver a los autos</button>'+
    '</div>'+

    '<div class="filters">'+
      '<input id="dirBuscar" placeholder="Buscar por nombre o localidad…" value="'+esc(G.buscar)+'" '+
        'oninput="buscarComisionista(this.value)">'+
      (G.vehiculo
        ? '<button class="btn btn-sm" onclick="queMeAtiendaAlguien('+G.vehiculo+')">Que me atienda alguien</button>'
        : '<button class="btn btn-sm" onclick="queMeAtiendaAlguien(null)">Que me atienda alguien</button>')+
    '</div>'+

    (lista.length
      ? '<div class="grid">'+lista.map(fichaComisionista).join('')+'</div>'
      : '<div class="empty"><div class="ic">👥</div>'+
        (G.lista.length
          ? '<b>Nadie coincide con esa búsqueda</b>'
          : '<b>Todavía no hay comisionistas publicados</b>'+
            '<div class="mini" style="margin-top:6px">Estamos armando el equipo. '+
            'Escribinos y te ponemos en contacto.</div>')+'</div>')+
  '</div>';
}

/* El visitante y el comisionista tienen catálogos distintos: uno mira para
   comprar, el otro para tomar vehículos en su cupo. Volver al lugar
   equivocado manda al comisionista a una pantalla sin sus herramientas, y
   al visitante directo al formulario de ingreso. */
window.volverAlCatalogo = function(){
  vista = (typeof perfil !== 'undefined' && perfil) ? 'catalogo' : 'autos';
  render();
};

window.buscarComisionista = function(t){
  G.buscar = t;
  var foco = document.activeElement && document.activeElement.id;
  render();
  if(foco === 'dirBuscar'){
    var e = document.getElementById('dirBuscar');
    if(e){ e.focus(); e.setSelectionRange(e.value.length, e.value.length); }
  }
};

window.verResenas = async function(id){
  G.abierto = (G.abierto === id) ? null : id;
  if(G.abierto){ await cargarResenas(id); }
  render();
};

/* ── Que me atienda alguien ────────────────────────────────────────
   Turno riguroso, decidido en el servidor. Que lo decida el servidor no
   es un detalle técnico: si lo eligiera el navegador, cualquiera podría
   hacer que le toque siempre el mismo. */
window.queMeAtiendaAlguien = async function(vehiculoId){
  cargando(true, 'Buscando quién te atienda…');
  var r = await sb.rpc('asignar_comisionista', { p_vehiculo_id: vehiculoId || null });
  cargando(false);

  if(r.error || !r.data){
    return modal('No hay nadie disponible ahora',
      '<div class="note w">En este momento no tenemos comisionistas publicados para atenderte. '+
      'Volvé a intentar en un rato.</div>', [{txt:'Cerrar',clase:'',fn:'cerrarModal()'}]);
  }

  if(!G.cargado) await cargarDirectorio();
  var u = G.lista.filter(function(x){ return x.id === r.data; })[0];
  if(!u){
    return modal('No pudimos completar la asignación',
      '<div class="note w">Probá eligiendo vos de la lista.</div>',
      [{txt:'Ver la lista',clase:'',fn:"cerrarModal();vista='comisionistas';render()"}]);
  }

  var wa = enlaceWa(u, mensajeParaWa(u));
  modal('Te va a atender ' + esc(u.nombre),
    '<div style="text-align:center;padding:6px 0 2px">'+
      '<div style="display:inline-block">'+avatar(u, 84)+'</div>'+
      '<div style="font-size:1.1rem;font-weight:800;color:var(--navy);margin-top:12px">'+
        esc(nombreDe(u))+'</div>'+
      '<div class="mini">'+esc(u.nivel||'')+(u.localidad?' · '+esc(u.localidad):'')+'</div>'+
      (Number(u.resenas) > 0
        ? '<div style="margin-top:6px">'+estrellas(u.puntaje)+' <span class="mini">('+u.resenas+')</span></div>'
        : '')+
    '</div>'+
    (u.descripcion ? '<div style="font-size:.86rem;line-height:1.6;margin-top:14px;text-align:center;'+
      'color:var(--gray);white-space:pre-wrap">'+esc(u.descripcion)+'</div>' : '')+
    '<div class="mini" style="margin-top:16px;text-align:center">Le toca por orden de turno: '+
      'es el que hace más tiempo que no recibe una consulta.</div>',
    [{txt:'Prefiero elegir yo', clase:'btn-o', fn:"cerrarModal();vista='comisionistas';render()"},
     {txt:'Volver', clase:'btn-o', fn:'cerrarModal()'}]
      .concat(wa
        ? [{txt:'Escribirle por WhatsApp', clase:'',
            fn:"window.open('"+wa.replace(/'/g,"\\'")+"','_blank');cerrarModal()"}]
        : []));
};

/* ── Dejar una reseña ──────────────────────────────────────────────
   Abierta a cualquiera: alguien puede haber sido bien atendido aunque
   todavía no haya comprado nada, y esa opinión también vale. El precio
   de esa apertura es la moderación, que se hace desde el panel. */
window.dejarResena = function(id, nombre){
  modal('Contá cómo te atendió ' + esc(nombre),
    '<div class="fld"><label>Tu nombre</label><input id="rsAutor" maxlength="60" placeholder="Cómo querés que aparezca"></div>'+
    '<div class="fld"><label>¿Cómo fue la atención?</label>'+
      '<div id="rsEstrellas" style="display:flex;gap:6px;font-size:2rem;color:#CBD5E1;cursor:pointer">'+
        [1,2,3,4,5].map(function(n){
          return '<span onclick="puntuar('+n+')" data-n="'+n+'" style="transition:.1s">★</span>';
        }).join('')+
      '</div><input type="hidden" id="rsPuntaje" value="0"></div>'+
    '<div class="fld"><label>Comentario <span class="mini">(opcional)</span></label>'+
      '<textarea id="rsComentario" rows="3" maxlength="600" '+
      'placeholder="Qué te pareció el trato, si respondió rápido, si te resolvió las dudas…"></textarea></div>'+
    '<div id="rsError" style="color:#DC2626;font-weight:700;font-size:.82rem;min-height:18px"></div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Publicar reseña',clase:'',fn:"guardarResena('"+esc(id)+"')"}]);
};

window.puntuar = function(n){
  var c = document.getElementById('rsPuntaje');
  if(c) c.value = n;
  var e = document.querySelectorAll('#rsEstrellas span');
  for(var i=0;i<e.length;i++)
    e[i].style.color = (i < n) ? '#B45309' : '#CBD5E1';
};

window.guardarResena = async function(id){
  var err = document.getElementById('rsError');
  function fallar(t){ if(err) err.textContent = t; }

  var autor = val('rsAutor');
  var puntaje = Number(val('rsPuntaje'));
  if(!autor)   return fallar('Poné tu nombre.');
  if(!puntaje) return fallar('Tocá las estrellas para puntuar.');

  cargando(true, 'Publicando…');
  var r = await sb.rpc('dejar_resena', {
    p_comisionista: id, p_autor: autor,
    p_puntaje: puntaje, p_comentario: val('rsComentario') || null
  });
  cargando(false);

  if(r.error) return fallar(r.error.message || 'No se pudo publicar.');

  cerrarModal();
  delete G.resenas[id];
  G.cargado = false;
  await cargarDirectorio();
  await cargarResenas(id);
  toast('Gracias. Tu reseña ya está publicada.','ok');
  render();
};

/* ═══════════════════════════════════════════════════════════════
   EL BOTÓN EN CADA AUTO
   ═══════════════════════════════════════════════════════════════ */

window.consultarPorVehiculo = async function(id, desc){
  G.vehiculo = id;
  G.vehiculoDesc = desc || '';
  cargando(true, 'Buscando quién te puede atender…');
  await cargarDestacados(id);
  if(!G.cargado) await cargarDirectorio();
  cargando(false);

  modal('¿Cómo querés seguir?',
    '<div style="font-size:.9rem;line-height:1.65;margin-bottom:16px">'+
      'Todas nuestras ventas pasan por un comisionista: es la persona que te acompaña, '+
      'te muestra el auto y te ayuda con los papeles. Elegí cómo preferís seguir.</div>'+
    '<button class="btn btn-block" onclick="cerrarModal();queMeAtiendaAlguien('+id+')">'+
      'Que me atienda alguien</button>'+
    '<button class="btn btn-o btn-block" style="margin-top:9px" '+
      'onclick="cerrarModal();vista=\'comisionistas\';render()">Ver todos y elegir yo</button>',
    []);
};

/* Se cuelga de cada tarjeta del catálogo, igual que los otros botones */
function botonConsultar(){
  if(typeof vista !== 'undefined' && vista !== 'catalogo' && vista !== 'landing') return;
  if(typeof perfil !== 'undefined' && perfil) return;   /* el comisionista no se consulta a sí mismo */

  setTimeout(function(){
    var tarjetas = document.querySelectorAll('#app .card');
    for(var i=0;i<tarjetas.length;i++){
      var t = tarjetas[i];
      if(t.querySelector('.accConsultar')) continue;
      var b = t.querySelector('button[onclick^="verVehiculo("]');
      if(!b) continue;
      var m = /verVehiculo\((\d+)\)/.exec(b.getAttribute('onclick'));
      if(!m) continue;

      var titulo = t.querySelector('.vtitle');
      var desc = titulo ? titulo.textContent.trim() : '';

      var c = document.createElement('button');
      c.className = 'btn btn-sm accConsultar';
      c.style.cssText = 'flex:1 1 100%;margin-top:8px';
      c.textContent = 'Consultar este vehículo';
      c.setAttribute('onclick', "event.stopPropagation();consultarPorVehiculo(" + m[1] +
        ",'" + desc.replace(/'/g,"\\'") + "')");
      b.parentNode.appendChild(c);
    }
  }, 60);
}

/* ═══════════════════════════════════════════════════════════════
   ENGANCHE

   El directorio no tiene puerta propia en la barra de arriba, y es a
   propósito. Una lista de comisionistas suelta, sin un auto de por medio,
   no le sirve a nadie: el que entra a la página viene por un vehículo, no
   a conocer vendedores. Recién cuando se interesa en un auto concreto
   tiene sentido preguntarle con quién quiere hablar — ahí la lista deja
   de ser un directorio y pasa a ser una decisión con contexto.
   ═══════════════════════════════════════════════════════════════ */

var renderPrevioDir = window.render;
window.render = function(){
  if(typeof vista !== 'undefined' && vista === 'comisionistas'){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vistaDirectorio();
    return;
  }
  var r = renderPrevioDir.apply(this, arguments);
  botonConsultar();
  return r;
};

})();

/* BivonaCars — Prospectos y clientes del comisionista, con su ficha.

   "Mis interesados" era una lista de nombres con un teléfono al lado.
   Servía para el primer llamado y para nada más.

   El problema real aparece al tercer mes: llamás a alguien que te
   preguntó por una camioneta en marzo y no te acordás de nada. Si en la
   ficha dice "Marcelo, laburante de la construcción, tres pibes, quería
   algo para llevar herramientas, en marzo no llegaba con la plata",
   arrancás la charla en otro lado. Eso es la diferencia entre un
   contacto y un cliente.

   Por eso los campos personales están separados de los comerciales y
   tienen nombre propio: un cuadro de "notas" en blanco se queda en
   blanco, uno que pregunta "¿de qué trabaja?" se completa.

   Se carga en el sitio público, después de parche2.js. */

(function(){
'use strict';

var K = {
  gente: [],
  cargado: false,
  buscar: '',
  filtro: 'todos',
  abierta: null,      /* ficha desplegada */
  historial: {},
  ranking: [],
  rankOk: false
};

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function hoyISO(){ return new Date().toISOString().slice(0,10); }
function dia(f){
  if(!f) return '—';
  var p = String(f).slice(0,10).split('-');
  return p[2]+'/'+p[1]+'/'+p[0];
}
function tel(t){ return String(t||'').replace(/[^0-9]/g,''); }
function nom(c){ return ((c.nombre||'')+' '+(c.apellido||'')).trim(); }

var ETAPAS = {
  nuevo:'Recién llegado', interesado:'Interesado', visitando:'Yendo a ver',
  negociando:'Negociando', reservado:'Con seña', comprado:'Compró', perdido:'Se cayó'
};

/* ═══════════════════════════════════════════════════════════════
   DATOS
   ═══════════════════════════════════════════════════════════════ */

async function cargarGente(){
  if(typeof perfil === 'undefined' || !perfil){ K.cargado = true; return; }
  try {
    var r = await sb.from('clientes').select('*')
      .eq('comisionista_id', perfil.id)
      .order('actualizado_en', { ascending: false });
    K.gente = r.data || [];
  } catch(e){ K.gente = []; }
  K.cargado = true;
}

async function cargarHistorial(id){
  if(K.historial[id]) return;
  try {
    var r = await sb.from('interacciones').select('*')
      .eq('cliente_id', id).order('fecha', { ascending: false }).limit(30);
    K.historial[id] = r.data || [];
  } catch(e){ K.historial[id] = []; }
}

async function cargarRanking(){
  try {
    var r = await sb.from('ranking_comisionistas').select('*')
      .order('puesto', { ascending: true });
    K.ranking = r.data || [];
  } catch(e){ K.ranking = []; }
  K.rankOk = true;
}

/* Las pantallas viejas siguen funcionando; solo hay que enterarse de que
   cambiaron algo para no mostrar datos viejos. */
['nuevoInteresado','anotarMio','guardarInteresado','guardarAnotacion'].forEach(function(f){
  var previo = window[f];
  if(typeof previo !== 'function') return;
  window[f] = function(){
    K.cargado = false;
    return previo.apply(this, arguments);
  };
});

/* ═══════════════════════════════════════════════════════════════
   LA FICHA DE LA PERSONA
   ═══════════════════════════════════════════════════════════════ */

function bloque(titulo, texto, vacio){
  return '<div style="margin-bottom:12px">'+
    '<div class="mini" style="font-weight:800;color:var(--navy);margin-bottom:2px">'+titulo+'</div>'+
    '<div style="font-size:.87rem;line-height:1.6;white-space:pre-wrap'+
      (texto?'':';color:var(--gray-l)')+'">'+
      (texto ? esc(texto) : vacio)+'</div></div>';
}

function fichaDe(c){
  var h = K.historial[c.id] || [];
  var vacio = '<i>Sin anotar</i>';

  return '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">'+

    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
      '<b style="color:var(--navy);font-size:.9rem">Quién es</b>'+
      '<button class="btn btn-o btn-sm" onclick="editarFicha('+c.id+')">Editar</button>'+
    '</div>'+

    bloque('De qué trabaja', c.ocupacion, vacio)+
    bloque('Familia', c.familia, vacio)+
    bloque('Cómo llegó', c.como_lo_conoci, vacio)+
    bloque('Para tener en cuenta', c.notas_personales,
      '<i>Nada anotado. Acá va lo que no se pregunta dos veces: si es hincha de algo, '+
      'si trabaja de noche, si el auto es para la mujer.</i>')+

    '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">'+
      '<b style="color:var(--navy);font-size:.9rem">Qué busca</b>'+
      '<div style="font-size:.87rem;line-height:1.6;margin-top:6px">'+
        (c.busca ? esc(c.busca) : '<span style="color:var(--gray-l)"><i>Sin especificar</i></span>')+
        (c.presupuesto_max
          ? '<div class="mini" style="margin-top:3px">Hasta USD '+
            Number(c.presupuesto_max).toLocaleString('es-AR')+'</div>' : '')+
        (c.tiene_permuta ? '<div class="mini">Entrega un usado'+
          (c.permuta_detalle ? ': '+esc(c.permuta_detalle) : '')+'</div>' : '')+
        (c.necesita_financiacion ? '<div class="mini">Necesita financiación</div>' : '')+
      '</div>'+
    '</div>'+

    '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">'+
      '<b style="color:var(--navy);font-size:.9rem">Lo que fue pasando</b>'+
      (h.length
        ? '<div style="margin-top:8px">'+h.map(function(i){
            return '<div style="padding:8px 0;border-bottom:1px solid var(--line)">'+
              '<div class="mini">'+dia(i.fecha)+(i.tipo?' · '+esc(i.tipo):'')+'</div>'+
              '<div style="font-size:.85rem;line-height:1.5">'+esc(i.detalle||'')+'</div>'+
            '</div>';
          }).join('')+'</div>'
        : '<div class="mini" style="margin-top:6px">Todavía no anotaste ningún contacto.</div>')+
    '</div>'+
  '</div>';
}

window.verFicha = async function(id){
  K.abierta = (K.abierta === id) ? null : id;
  if(K.abierta) await cargarHistorial(id);
  render();
};

window.editarFicha = function(id){
  var c = K.gente.filter(function(x){ return x.id === id; })[0];
  if(!c) return;

  modal('Ficha de ' + esc(nom(c)),
    '<div class="note" style="margin-bottom:14px">Esto no lo ve el cliente. Es tu memoria: '+
    'dentro de seis meses, cuando lo llames de nuevo, va a ser la diferencia entre '+
    '"hola, ¿se acuerda de mí?" y una charla de verdad.</div>'+

    '<div class="fld"><label>¿De qué trabaja?</label>'+
      '<input id="fkOcupacion" value="'+esc(c.ocupacion||'')+'" '+
      'placeholder="Albañil, tiene su cuadrilla"></div>'+

    '<div class="fld"><label>Familia</label>'+
      '<input id="fkFamilia" value="'+esc(c.familia||'')+'" '+
      'placeholder="Casado, dos hijos chicos"></div>'+

    '<div class="fld"><label>¿Cómo llegó a vos?</label>'+
      '<input id="fkComo" value="'+esc(c.como_lo_conoci||'')+'" '+
      'placeholder="Lo mandó Ramiro, el del taller"></div>'+

    '<div class="fld"><label>Para tener en cuenta</label>'+
      '<textarea id="fkNotas" rows="4" placeholder="Trabaja hasta las 6, llamarlo después. '+
      'Quiere algo que aguante ripio. La decisión la toma con la mujer.">'+
      esc(c.notas_personales||'')+'</textarea></div>'+

    '<div class="fld"><label>Qué está buscando</label>'+
      '<input id="fkBusca" value="'+esc(c.busca||'')+'" '+
      'placeholder="Camioneta usada, caja grande"></div>',

    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarFicha('+id+')'}]);
};

window.guardarFicha = async function(id){
  cargando(true,'Guardando…');
  var r = await sb.from('clientes').update({
    ocupacion:        val('fkOcupacion') || null,
    familia:          val('fkFamilia')   || null,
    como_lo_conoci:   val('fkComo')      || null,
    notas_personales: val('fkNotas')     || null,
    busca:            val('fkBusca')     || null
  }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal();
  K.cargado = false;
  await cargarGente();
  toast('Ficha guardada','ok');
  render();
};

/* ═══════════════════════════════════════════════════════════════
   LA PANTALLA
   ═══════════════════════════════════════════════════════════════ */

function tarjeta(c){
  var atrasado = c.proximo_contacto && c.proximo_contacto <= hoyISO() &&
                 c.etapa !== 'comprado' && c.etapa !== 'perdido';
  var abierta = K.abierta === c.id;
  var cliente = c.etapa === 'comprado';
  var sinFicha = !c.ocupacion && !c.familia && !c.notas_personales;

  return '<div class="card"><div class="card-b" style="padding:15px 17px">'+
    '<div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
      '<div style="flex:1;min-width:190px">'+
        '<b style="color:var(--navy)">'+esc(nom(c))+'</b>'+
        (cliente ? ' <span class="pill p-green" style="font-size:.66rem">CLIENTE</span>' : '')+
        '<div class="mini" style="margin-top:2px">'+esc(c.tel||c.email||'')+
          (c.ocupacion ? ' · '+esc(c.ocupacion) : '')+'</div>'+
        (c.busca ? '<div class="mini">Busca '+esc(c.busca)+'</div>' : '')+
        (c.proximo_contacto
          ? '<div class="mini" style="margin-top:3px'+(atrasado?';color:#DC2626;font-weight:700':'')+'">'+
            (atrasado?'⏰ Tenías que llamarlo el ':'Volver a contactar el ')+dia(c.proximo_contacto)+'</div>'
          : '')+
        (sinFicha
          ? '<div class="mini" style="margin-top:3px;color:#B45309">Sin ficha personal</div>' : '')+
      '</div>'+
      '<div style="text-align:right">'+
        '<span class="pill p-blue" style="font-size:.72rem">'+
          esc(ETAPAS[c.etapa] || c.etapa || '')+'</span>'+
        '<div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'+
          (c.tel ? '<a class="btn btn-o btn-sm" target="_blank" rel="noopener" '+
            'href="https://wa.me/549'+tel(c.tel)+'">WhatsApp</a>' : '')+
          '<button class="btn btn-o btn-sm" onclick="verFicha('+c.id+')">'+
            (abierta?'Cerrar':'Ficha')+'</button>'+
          '<button class="btn btn-sm" onclick="anotarMio('+c.id+')">Anotar</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
    (abierta ? fichaDe(c) : '')+
  '</div></div>';
}

function vistaGente(){
  if(!K.cargado){
    cargarGente().then(function(){ render(); });
    return '<div class="wrap"><div class="empty">Cargando…</div></div>';
  }

  var t = K.buscar.toLowerCase();
  var lista = K.gente.filter(function(c){
    if(K.filtro === 'hoy'){
      if(!(c.proximo_contacto && c.proximo_contacto <= hoyISO() &&
           c.etapa !== 'comprado' && c.etapa !== 'perdido')) return false;
    }
    if(K.filtro === 'prospectos' && c.etapa === 'comprado') return false;
    if(K.filtro === 'clientes'   && c.etapa !== 'comprado') return false;
    if(!t) return true;
    return (nom(c)+' '+(c.tel||'')+' '+(c.ocupacion||'')+' '+(c.busca||'')).toLowerCase().indexOf(t) >= 0;
  });

  var pend = K.gente.filter(function(c){
    return c.proximo_contacto && c.proximo_contacto <= hoyISO() &&
           c.etapa !== 'comprado' && c.etapa !== 'perdido'; }).length;
  var clientes = K.gente.filter(function(c){ return c.etapa === 'comprado'; }).length;

  function chip(id, txt, n){
    return '<button class="btn '+(K.filtro===id?'':'btn-o')+' btn-sm" '+
      'onclick="filtroGente(\''+id+'\')">'+txt+
      (n ? ' <span style="background:rgba(0,0,0,.15);padding:0 6px;border-radius:8px">'+n+'</span>' : '')+
      '</button>';
  }

  return '<div class="wrap">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">'+
      '<div><h2 class="sec">Prospectos y clientes</h2>'+
      '<p class="sub">Tu gente. Cuanto mejor los conozcas, más fácil es la segunda charla.</p></div>'+
      '<button class="btn btn-sm" onclick="nuevoInteresado()">+ Cargar persona</button>'+
    '</div>'+

    (pend
      ? '<div class="note w" style="margin-bottom:16px"><b>Tenés '+pend+' persona'+
        (pend>1?'s':'')+' para contactar hoy.</b> La mayoría de las ventas se cierran en el '+
        'segundo o tercer llamado, no en el primero.</div>'
      : '')+

    '<div class="filters">'+
      '<input id="gnBuscar" placeholder="Buscar por nombre, teléfono, trabajo…" '+
        'value="'+esc(K.buscar)+'" oninput="buscarGente(this.value)">'+
      chip('todos','Todos', K.gente.length)+
      chip('hoy','Para hoy', pend)+
      chip('prospectos','Prospectos', K.gente.length - clientes)+
      chip('clientes','Clientes', clientes)+
    '</div>'+

    (lista.length
      ? '<div style="display:grid;gap:11px">'+lista.map(tarjeta).join('')+'</div>'
      : '<div class="card"><div class="card-b" style="text-align:center;padding:52px 20px">'+
        '<div style="font-size:2.6rem;margin-bottom:10px">📋</div>'+
        '<b style="color:var(--navy)">'+
          (K.gente.length ? 'Nadie coincide con eso' : 'Todavía no cargaste a nadie')+'</b>'+
        '<div class="mini" style="margin-top:6px;max-width:430px;margin-left:auto;margin-right:auto">'+
          (K.gente.length
            ? 'Probá con otra búsqueda o sacá el filtro.'
            : 'Cada persona que te pregunta por un auto vale plata. Si la anotás acá, el sistema '+
              'te recuerda cuándo volver a llamarla y vos tenés dónde guardar lo que sabés de ella.')+
        '</div>'+
        (K.gente.length ? '' :
          '<button class="btn btn-sm" style="margin-top:16px" onclick="nuevoInteresado()">'+
          '+ Cargar la primera</button>')+
        '</div></div>')+
  '</div>';
}

window.filtroGente = function(f){ K.filtro = f; render(); };
window.buscarGente = function(t){
  K.buscar = t;
  render();
  var e = document.getElementById('gnBuscar');
  if(e){ e.focus(); e.setSelectionRange(e.value.length, e.value.length); }
};

/* ═══════════════════════════════════════════════════════════════
   LA TABLA DE POSICIONES
   ═══════════════════════════════════════════════════════════════ */

function vistaRanking(){
  if(!K.rankOk){
    cargarRanking().then(function(){ render(); });
    return '<div class="wrap"><div class="empty">Cargando…</div></div>';
  }

  var yo = (typeof perfil !== 'undefined' && perfil) ? perfil.id : null;
  var miPuesto = K.ranking.filter(function(u){ return u.id === yo; })[0];

  function medalla(p){ return p===1?'🥇':p===2?'🥈':p===3?'🥉':''; }

  return '<div class="wrap" style="max-width:760px">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">'+
      '<div><h2 class="sec">Tabla de posiciones</h2>'+
      '<p class="sub">Se compite por autos vendidos. Si hay empate, gana el que movió más plata.</p></div>'+
      '<button class="btn btn-o btn-sm" onclick="vista=\'catalogo\';render()">← Volver</button>'+
    '</div>'+

    (miPuesto
      ? '<div class="dash-head" style="margin-bottom:18px">'+
          '<div><div class="em">Tu posición</div>'+
          '<h2>'+(medalla(Number(miPuesto.puesto)) || ('#'+miPuesto.puesto))+' de '+
            K.ranking.length+'</h2></div>'+
          '<div class="lvl-box"><div class="nm">'+miPuesto.ventas+' venta'+
            (Number(miPuesto.ventas)===1?'':'s')+'</div>'+
            '<div class="ds">USD '+Number(miPuesto.capital||0).toLocaleString('es-AR')+
            ' movidos</div></div>'+
        '</div>'
      : '')+

    '<div class="card"><div class="card-b">'+
      (K.ranking.length
        ? K.ranking.map(function(u){
            var p = Number(u.puesto), mio = u.id === yo;
            return '<div class="rank" style="'+(mio?'background:var(--blue-l);border-radius:9px;padding:11px 12px':'')+'">'+
              '<div class="pos" style="'+(p<=3&&Number(u.ventas)>0?'background:var(--blue)':'')+'">'+
                (medalla(p) || p)+'</div>'+
              '<div class="nm">'+esc(((u.nombre||'')+' '+(u.apellido||'')).trim())+
                (mio ? ' <span class="pill p-blue" style="font-size:.62rem">VOS</span>' : '')+
                '<div class="mini" style="font-weight:500">'+esc(u.nivel||'')+
                (u.provincia ? ' · '+esc(u.provincia) : '')+'</div></div>'+
              '<div style="text-align:right">'+
                '<div class="vl">'+u.ventas+'</div>'+
                '<div class="mini">USD '+Number(u.capital||0).toLocaleString('es-AR')+'</div>'+
              '</div></div>';
          }).join('')
        : '<div class="mini">Todavía no hay nadie en la tabla.</div>')+
    '</div></div>'+

    '<div class="mini" style="margin-top:14px;text-align:center">'+
      'La tabla se actualiza sola con cada venta cerrada.</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   LOS ACCESOS
   ═══════════════════════════════════════════════════════════════ */

function retocarAccesos(){
  if(typeof perfil === 'undefined' || !perfil || perfil.rol === 'admin') return;
  var barra = document.getElementById('accesosNuevos');
  if(!barra) return;

  /* El botón viejo se llamaba "Mis interesados", que es como llamarle
     "los que todavía no me compraron". Ahora incluye a los que sí. */
  var botones = barra.querySelectorAll('button');
  for(var i=0;i<botones.length;i++){
    if(/Mis interesados/.test(botones[i].textContent)){
      var n = botones[i].innerHTML.replace('Mis interesados','Prospectos y clientes');
      botones[i].innerHTML = n;
    }
  }

  if(!document.getElementById('btnRanking')){
    var b = document.createElement('button');
    b.id = 'btnRanking';
    b.className = 'btn btn-o btn-sm';
    b.textContent = '🏆 Posiciones';
    b.onclick = function(){ vista = 'ranking'; render(); };
    var hueco = barra.querySelector('div[style*="flex:1"]');
    if(hueco) barra.insertBefore(b, hueco); else barra.appendChild(b);
  }
}

/* La barra de accesos la dibuja el módulo anterior y queda puesta entre
   pantalla y pantalla, así que acá solo hay que retocarla. */
var renderPrevioK = window.render;
window.render = function(){
  var soyComi = typeof perfil !== 'undefined' && perfil && perfil.rol !== 'admin';

  if(soyComi && (vista === 'interesados' || vista === 'ranking')){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML =
      (vista === 'ranking') ? vistaRanking() : vistaGente();
    retocarAccesos();
    return;
  }

  var r = renderPrevioK.apply(this, arguments);
  retocarAccesos();
  return r;
};

})();

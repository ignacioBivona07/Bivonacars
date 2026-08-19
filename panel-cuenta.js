/* BivonaCars — Panel: la cuenta propia y la moderación del directorio.

   Dos cosas que faltaban:

   1. Cambiar la contraseña. Cuando el dueño crea una cuenta para alguien
      del equipo, el sistema le inventa una contraseña y se la pasa por
      fuera — por WhatsApp, en un papel, como sea. Esa contraseña la
      vieron dos personas, así que no puede quedarse para siempre. Hasta
      ahora no había forma de cambiarla desde el panel.

   2. Moderar el directorio público. Los comisionistas suben su foto y su
      descripción, y cualquiera puede dejarles una reseña. Eso hay que
      poder mirarlo y, si hace falta, bajarlo.

   Se carga después de panel-seguridad.js. */

(function(){
'use strict';

var M = { perfiles: [], resenas: [], cargado: false, filtro: 'pendiente' };

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function ficha(titulo, extra, cuerpo){
  return '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>'+titulo+'</h3>'+
    (extra||'')+'</div><div class="card-b">'+cuerpo+'</div></div>';
}
function nombreDe(u){ return ((u.nombre||'')+' '+(u.apellido||'')).trim() || 'Sin nombre'; }

function urlFoto(ruta){
  if(!ruta) return null;
  try { return sb.storage.from('perfiles').getPublicUrl(ruta).data.publicUrl; }
  catch(e){ return null; }
}

function avatar(u, tam){
  var t = tam || 46;
  var f = urlFoto(u.foto_path);
  if(f) return '<img src="'+esc(f)+'" alt="" style="width:'+t+'px;height:'+t+'px;border-radius:50%;'+
    'object-fit:cover;flex-shrink:0;border:1px solid var(--line)">';
  return '<div style="width:'+t+'px;height:'+t+'px;border-radius:50%;background:var(--navy);color:#fff;'+
    'display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:'+(t/2.8)+'px">'+
    esc((u.nombre||'?').charAt(0).toUpperCase())+'</div>';
}

function estrellas(n){
  var s = '';
  for(var i=1;i<=5;i++) s += (i <= Math.round(n) ? '★' : '☆');
  return '<span style="color:#B45309;letter-spacing:1px">'+s+'</span>';
}

/* ═══════════════════════════════════════════════════════════════
   1. CAMBIAR LA CONTRASEÑA
   ═══════════════════════════════════════════════════════════════ */

/* Se pide la actual además de la nueva. No es un trámite: es lo que
   impide que alguien que te encuentre la sesión abierta en la compu
   te cambie la clave y te deje afuera de tu propio negocio. */
window.cambiarClave = function(obligatorio){
  var aviso = obligatorio
    ? '<div class="note w" style="margin-bottom:16px"><b>Esta contraseña la generó el sistema '+
      'y alguien más la vio</b> para poder pasártela. Elegí una tuya antes de seguir.</div>'
    : '<div class="note" style="margin-bottom:16px">La contraseña nueva tiene que tener al menos '+
      '8 caracteres. Si la cambiás, vas a seguir con la sesión abierta acá.</div>';

  modal(obligatorio ? 'Elegí tu contraseña' : 'Cambiar la contraseña',
    aviso +
    '<div class="fld"><label>Contraseña actual</label>'+
      '<input id="clActual" type="password" autocomplete="current-password"></div>'+
    '<div class="fld"><label>Contraseña nueva</label>'+
      '<input id="clNueva" type="password" autocomplete="new-password"></div>'+
    '<div class="fld"><label>Repetila</label>'+
      '<input id="clNueva2" type="password" autocomplete="new-password" '+
      'onkeydown="if(event.key===\'Enter\')guardarClave('+(obligatorio?'true':'false')+')"></div>'+
    '<div id="clError" style="color:#DC2626;font-weight:700;font-size:.82rem;min-height:18px"></div>',

    (obligatorio ? [] : [{txt:'Cancelar', clase:'btn-o', fn:'cerrarModal()'}])
      .concat([{txt:'Guardar', clase:'', fn:'guardarClave('+(obligatorio?'true':'false')+')'}]));

  setTimeout(function(){ var c = document.getElementById('clActual'); if(c) c.focus(); }, 120);
};

window.guardarClave = async function(obligatorio){
  var err = document.getElementById('clError');
  function fallar(t){ if(err) err.textContent = t; }

  var actual = val('clActual'), nueva = val('clNueva'), nueva2 = val('clNueva2');
  if(!actual)                return fallar('Escribí tu contraseña actual.');
  if(nueva.length < 8)       return fallar('La nueva tiene que tener al menos 8 caracteres.');
  if(nueva !== nueva2)       return fallar('Las dos contraseñas nuevas no coinciden.');
  if(nueva === actual)       return fallar('La nueva tiene que ser distinta de la actual.');

  cargando(true, 'Cambiando la contraseña…');
  try {
    /* Comprobar la actual: se vuelve a entrar con ella. Si es incorrecta,
       Supabase lo dice y no tocamos nada. */
    var s = await sb.auth.getSession();
    var correo = s.data.session && s.data.session.user && s.data.session.user.email;
    if(!correo){ cargando(false); return fallar('Se perdió la sesión. Volvé a entrar.'); }

    var v = await sb.auth.signInWithPassword({ email: correo, password: actual });
    if(v.error){ cargando(false); return fallar('La contraseña actual no es correcta.'); }

    var r = await sb.auth.updateUser({ password: nueva });
    if(r.error){
      cargando(false);
      return fallar(/should be|at least|weak/i.test(r.error.message||'')
        ? 'Esa contraseña es demasiado corta o demasiado común. Probá otra.'
        : mensajeError(r.error));
    }

    try { await sb.rpc('ya_cambie_la_clave'); } catch(e){ /* cosmético */ }
    if(typeof perfil !== 'undefined' && perfil) perfil.clave_provisoria = false;

    cargando(false);
    cerrarModal();
    toast('Listo. Tu contraseña quedó cambiada.', 'ok');
    if(obligatorio && typeof render === 'function') render();
  } catch(e){
    cargando(false);
    fallar('No se pudo completar el cambio. Probá de nuevo.');
  }
};

/* ── El botón, abajo de todo, al lado de "Cerrar sesión" ───────────
   No va en el menú porque el menú se recorta por permisos y esto lo
   tiene que poder hacer cualquiera que entre, sin excepción. */
function ponerBotonClave(){
  var pie = document.querySelector('.side-foot');
  if(!pie || document.getElementById('btnCambiarClave')) return;
  var b = document.createElement('button');
  b.id = 'btnCambiarClave';
  b.textContent = 'Cambiar contraseña';
  b.onclick = function(){ window.cambiarClave(false); };
  var salir = pie.querySelector('button');
  if(salir) pie.insertBefore(b, salir); else pie.appendChild(b);
}

/* ═══════════════════════════════════════════════════════════════
   2. MODERACIÓN DEL DIRECTORIO
   ═══════════════════════════════════════════════════════════════ */

async function cargarModeracion(){
  try {
    var p = await sb.from('perfiles')
      .select('id,nombre,apellido,foto_path,descripcion,wa_tel,perfil_estado,perfil_nota,perfil_enviado_en,nivel,ventas')
      .eq('rol','comisionista')
      .order('perfil_enviado_en', { ascending: false });
    M.perfiles = p.data || [];

    var r = await sb.from('resenas')
      .select('*').order('creado_en', { ascending: false }).limit(200);
    M.resenas = r.data || [];
  } catch(e){ M.perfiles = []; M.resenas = []; }
  M.cargado = true;
}

function pendientes(){
  return M.perfiles.filter(function(u){ return u.perfil_estado === 'pendiente'; });
}

function fichaPendiente(u){
  return '<div style="display:flex;gap:14px;padding:14px;background:var(--bg);border:1px solid var(--line);'+
    'border-radius:11px;margin-bottom:10px;align-items:flex-start">'+
    avatar(u, 58)+
    '<div style="flex:1;min-width:0">'+
      '<b style="font-size:.92rem">'+esc(nombreDe(u))+'</b>'+
      '<div class="mini" style="margin:2px 0 8px">'+esc(u.nivel||'')+
        (u.wa_tel ? ' · WhatsApp '+esc(u.wa_tel) : ' · <span style="color:#B45309">sin WhatsApp cargado</span>')+'</div>'+
      '<div style="font-size:.85rem;line-height:1.55;white-space:pre-wrap">'+
        (u.descripcion ? esc(u.descripcion) : '<i style="color:var(--gray)">Sin descripción</i>')+'</div>'+
      '<div style="margin-top:11px;display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-sm btn-green" onclick="aprobarFicha(\''+esc(u.id)+'\')">Publicar</button>'+
        '<button class="btn btn-sm btn-o" onclick="rechazarFicha(\''+esc(u.id)+'\')">Pedir cambios</button>'+
      '</div>'+
    '</div></div>';
}

function vistaModeracion(){
  if(!M.cargado){
    cargarModeracion().then(function(){ if(typeof render === 'function') render(); });
    return ficha('Directorio público', '', '<div class="mini">Cargando…</div>');
  }

  var pend = pendientes();
  var publicados = M.perfiles.filter(function(u){ return u.perfil_estado === 'aprobado'; });
  var visibles = M.resenas.filter(function(r){ return r.estado === 'visible'; });

  var bloquePerfiles = ficha('Fichas esperando tu visto bueno',
    '<span class="pill '+(pend.length?'p-amber':'p-green')+'">'+
      (pend.length ? pend.length+' pendiente'+(pend.length>1?'s':'') : 'Todo al día')+'</span>',
    (pend.length
      ? '<div class="mini" style="margin-bottom:12px">Así se va a ver en la página pública. '+
        'Mirá que la foto sea de la persona y que la descripción no prometa nada que no podamos cumplir.</div>'+
        pend.map(fichaPendiente).join('')
      : '<div class="mini">No hay fichas nuevas para revisar. '+
        'Hay <b>'+publicados.length+'</b> comisionista'+(publicados.length===1?'':'s')+
        ' publicado'+(publicados.length===1?'':'s')+' en el directorio.</div>'));

  var bloqueResenas = ficha('Reseñas',
    '<span class="pill p-blue">'+visibles.length+' visible'+(visibles.length===1?'':'s')+'</span>',
    '<div class="note w" style="margin-bottom:14px">Las reseñas las puede dejar cualquiera, no hace falta '+
    'haber comprado. Es a propósito, para que alguien bien atendido pueda decirlo aunque todavía no haya '+
    'cerrado nada — pero significa que hay que mirarlas. Si una es falsa o agresiva, ocultala.</div>'+
    (M.resenas.length
      ? M.resenas.slice(0, 60).map(function(r){
          var u = M.perfiles.filter(function(x){ return x.id === r.comisionista_id; })[0] || {};
          var oculta = r.estado !== 'visible';
          return '<div style="padding:12px 14px;border:1px solid var(--line);border-radius:10px;'+
            'margin-bottom:9px;background:'+(oculta?'#FEF2F2':'#fff')+'">'+
            '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">'+
              '<div style="min-width:0">'+
                '<b style="font-size:.87rem">'+esc(r.autor)+'</b> '+estrellas(r.puntaje)+
                '<div class="mini">sobre '+esc(nombreDe(u))+' · '+
                  new Date(r.creado_en).toLocaleDateString('es-AR')+'</div>'+
              '</div>'+
              '<button class="btn btn-sm '+(oculta?'btn-green':'btn-o')+'" '+
                'onclick="alternarResena('+r.id+','+(oculta?'false':'true')+')">'+
                (oculta?'Volver a mostrar':'Ocultar')+'</button>'+
            '</div>'+
            (r.comentario ? '<div style="font-size:.85rem;line-height:1.55;margin-top:7px;'+
              'white-space:pre-wrap">'+esc(r.comentario)+'</div>' : '')+
            (oculta ? '<div class="mini" style="margin-top:6px;color:#DC2626">Oculta: no se ve en la página</div>' : '')+
          '</div>';
        }).join('')
      : '<div class="mini">Todavía no hay reseñas.</div>'));

  return bloquePerfiles + bloqueResenas;
}

window.aprobarFicha = async function(id){
  cargando(true,'Publicando…');
  var r = await sb.from('perfiles')
    .update({ perfil_estado:'aprobado', perfil_nota:null }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  M.cargado = false;
  toast('Ficha publicada en el directorio','ok');
  await cargarModeracion();
  if(typeof render === 'function') render();
};

window.rechazarFicha = function(id){
  modal('Pedir cambios',
    '<div class="fld"><label>¿Qué tiene que corregir?</label>'+
    '<textarea id="mfNota" rows="3" placeholder="Ej: la foto está muy oscura, no se te ve la cara"></textarea>'+
    '<div class="hint">Lo va a ver cuando entre a su perfil.</div></div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Enviar',clase:'',fn:"confirmarRechazo('"+esc(id)+"')"}]);
};

window.confirmarRechazo = async function(id){
  var nota = val('mfNota');
  if(!nota) return toast('Escribile qué corregir','error');
  cargando(true,'Enviando…');
  var r = await sb.from('perfiles')
    .update({ perfil_estado:'rechazado', perfil_nota:nota }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal();
  M.cargado = false;
  await cargarModeracion();
  toast('Le avisamos qué corregir','ok');
  if(typeof render === 'function') render();
};

window.alternarResena = async function(id, ocultar){
  cargando(true, ocultar ? 'Ocultando…' : 'Mostrando…');
  var r = await sb.from('resenas').update({
    estado: ocultar ? 'oculta' : 'visible',
    moderada_por: (typeof perfil !== 'undefined' && perfil) ? perfil.id : null,
    moderada_en: new Date().toISOString()
  }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  M.cargado = false;
  await cargarModeracion();
  if(typeof render === 'function') render();
};

/* ═══════════════════════════════════════════════════════════════
   3. LA TABLA DE POSICIONES

   Se compite por autos vendidos; si dos empatan, gana el que movió más
   plata. El orden lo calcula la base, no el navegador: si el ranking lo
   armara cada pantalla por su cuenta, dos personas podrían estar viendo
   podios distintos y la competencia se volvería discutible.
   ═══════════════════════════════════════════════════════════════ */

var R = { lista: [], cargado: false };

async function cargarRanking(){
  try {
    var r = await sb.from('ranking_comisionistas').select('*')
      .order('puesto', { ascending: true });
    R.lista = r.data || [];
  } catch(e){ R.lista = []; }
  R.cargado = true;
}
window.cargarRanking = cargarRanking;

function medalla(p){
  return p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '';
}

function vistaRanking(){
  if(!R.cargado){
    cargarRanking().then(function(){ if(typeof render === 'function') render(); });
    return ficha('Tabla de posiciones','','<div class="mini">Cargando…</div>');
  }

  var conVentas = R.lista.filter(function(u){ return Number(u.ventas) > 0; });

  return ficha('Tabla de posiciones',
    '<span class="mini">Por autos vendidos · desempata el monto</span>',
    (R.lista.length
      ? R.lista.map(function(u){
          var p = Number(u.puesto);
          var destacado = p <= 3 && Number(u.ventas) > 0;
          return '<div class="rank" style="'+(destacado?'background:var(--bg);border-radius:9px;padding-left:10px;padding-right:10px':'')+'">'+
            '<div class="pos" style="'+(destacado?'background:var(--blue)':'')+'">'+
              (medalla(p) || p)+'</div>'+
            avatar(u, 34)+
            '<div class="nm">'+esc(nombreDe(u))+
              '<div class="mini" style="font-weight:500">'+esc(u.nivel||'')+
              (u.provincia ? ' · '+esc(u.provincia) : '')+'</div></div>'+
            '<div style="text-align:right">'+
              '<div class="vl">'+u.ventas+' venta'+(Number(u.ventas)===1?'':'s')+'</div>'+
              '<div class="mini">USD '+Number(u.capital||0).toLocaleString('es-AR')+'</div>'+
            '</div>'+
          '</div>';
        }).join('')+
        (conVentas.length === 0
          ? '<div class="mini" style="margin-top:12px">Todavía nadie cerró una venta. '+
            'La tabla se ordena sola apenas empiecen.</div>'
          : '')
      : '<div class="mini">Todavía no hay comisionistas verificados.</div>'));
}

/* ═══════════════════════════════════════════════════════════════
   4. LOS VEHÍCULOS QUE SON NUESTROS

   Un auto que recibimos en parte de pago no deja comisión: deja margen
   o deja pérdida, y la diferencia es plata nuestra. Merece su propia
   cuenta, separada de los autos de terceros que publicamos al 5%.
   ═══════════════════════════════════════════════════════════════ */

function propios(){
  return ((typeof D !== 'undefined' && D.vehiculos) || [])
    .filter(function(v){ return v.es_propio && v.estado !== 'vendido'; });
}

function vistaPropios(){
  var lista = propios();
  if(!lista.length) return '';

  var invertido = lista.reduce(function(s,v){ return s + Number(v.costo_adquisicion||0); }, 0);
  var publicado = lista.reduce(function(s,v){ return s + Number(v.precio||0); }, 0);
  var borradores = lista.filter(function(v){ return v.estado === 'borrador'; });
  var conPrecio = lista.filter(function(v){ return Number(v.precio) > 0; });
  var margen = conPrecio.reduce(function(s,v){
    return s + (Number(v.precio||0) - Number(v.costo_adquisicion||0)); }, 0);

  function usd(n){ return 'USD ' + Number(n||0).toLocaleString('es-AR'); }

  return ficha('Vehículos propios',
    '<span class="pill '+(borradores.length?'p-amber':'p-blue')+'">'+lista.length+' en stock'+
      (borradores.length ? ' · '+borradores.length+' sin completar' : '')+'</span>',

    '<div class="grid3" style="margin-bottom:16px">'+
      '<div class="kpi"><div class="lb">Puesto de tu bolsillo</div>'+
        '<div class="vl">'+usd(invertido)+'</div></div>'+
      '<div class="kpi g"><div class="lb">Publicado en</div>'+
        '<div class="vl">'+usd(publicado)+'</div>'+
        (conPrecio.length < lista.length
          ? '<div class="df a">'+(lista.length-conPrecio.length)+' sin precio</div>' : '')+'</div>'+
      '<div class="kpi '+(margen>=0?'g':'')+'"><div class="lb">Margen a precio actual</div>'+
        '<div class="vl" style="'+(margen<0?'color:#DC2626':'')+'">'+usd(margen)+'</div>'+
        '<div class="df '+(margen<0?'n':'')+'">'+
          (invertido > 0 ? Math.round(margen / invertido * 100) + '% sobre lo invertido' : '—')+
        '</div></div>'+
    '</div>'+

    (borradores.length
      ? '<div class="note w" style="margin-bottom:14px"><b>Hay '+borradores.length+
        ' vehículo'+(borradores.length>1?'s':'')+' esperando que lo completes.</b> '+
        'Mientras estén en borrador no se publican y no le sirven a nadie: cargales los datos, '+
        'las fotos y el precio desde Stock.</div>'
      : '')+

    '<div class="tbl-wrap"><table><thead><tr>'+
      '<th>Vehículo</th><th>Estado</th><th>Te costó</th><th>Publicado</th><th>Margen</th>'+
    '</tr></thead><tbody>'+
      lista.map(function(v){
        var m = Number(v.precio||0) - Number(v.costo_adquisicion||0);
        var sinPrecio = !(Number(v.precio) > 0);
        return '<tr>'+
          '<td><b>'+esc(((v.marca||'')+' '+(v.modelo||'')).trim())+'</b>'+
            (v.anio ? ' <span class="mini">'+v.anio+'</span>' : '')+'</td>'+
          '<td><span class="pill '+(v.estado==='borrador'?'p-amber':'p-green')+'">'+
            (v.estado==='borrador'?'Sin completar':'Publicado')+'</span></td>'+
          '<td>'+usd(v.costo_adquisicion)+'</td>'+
          '<td>'+(sinPrecio ? '<span class="mini">falta ponerle precio</span>' : usd(v.precio))+'</td>'+
          '<td>'+(sinPrecio ? '—' :
            '<b style="color:'+(m>=0?'var(--green)':'#DC2626')+'">'+usd(m)+'</b>')+'</td>'+
        '</tr>';
      }).join('')+
    '</tbody></table></div>');
}

/* ── Se cuelga de la sección que ya existe ─────────────────────────
   No inventa una sección nueva en el menú: todo esto es parte de
   administrar comisionistas y stock, y de paso hereda el permiso
   correcto sin tener que tocar el sistema de permisos. */
if(typeof SECCIONES !== 'undefined' && SECCIONES.vendedores){
  var vendedoresPrevio = SECCIONES.vendedores.f;
  SECCIONES.vendedores.f = function(){
    /* La pantalla original lista TODOS los perfiles, así que el equipo de
       Admin aparecía mezclado entre los comisionistas con cupo cero y sin
       ventas. Se le acota la lista mientras dibuja y se le devuelve
       completa después: el resto del panel la sigue necesitando entera
       para resolver nombres. */
    var todos = D.perfiles;
    D.perfiles = todos.filter(function(u){ return u.rol === 'comisionista'; });
    var base;
    try { base = vendedoresPrevio(); }
    finally { D.perfiles = todos; }

    return vistaRanking() + vistaModeracion() + base;
  };
}

if(typeof SECCIONES !== 'undefined' && SECCIONES.stock){
  var stockPrevio = SECCIONES.stock.f;
  SECCIONES.stock.f = function(){ return vistaPropios() + stockPrevio(); };
}

/* ═══════════════════════════════════════════════════════════════
   5. UN AUTO VENDIDO NO SIGUE EN EL CATÁLOGO

   La base ya impide venderlo dos veces, pero el catálogo lo seguía
   listando con su botón de "Cerrar venta" al lado. Ofrecer un botón que
   siempre va a fallar es peor que no ofrecerlo: te hace dudar de si el
   sistema entendió que ya lo vendiste.

   El vehículo vendido vive en Historial y en la operación. En el
   catálogo, que es lo que está a la venta, no tiene nada que hacer.
   ═══════════════════════════════════════════════════════════════ */

if(typeof SECCIONES !== 'undefined' && SECCIONES.catalogo){
  var catalogoPrevio = SECCIONES.catalogo.f;
  SECCIONES.catalogo.f = function(){
    var todos = D.vehiculos;
    D.vehiculos = todos.filter(function(v){ return v.estado !== 'vendido'; });
    try { return catalogoPrevio(); }
    finally { D.vehiculos = todos; }
  };
}

/* Red de contención: si en alguna otra pantalla quedó un botón de cerrar
   venta apuntando a un auto ya vendido, se saca después de dibujar. */
function limpiarBotonesDeVenta(){
  var vendidos = {};
  ((typeof D !== 'undefined' && D.vehiculos) || []).forEach(function(v){
    if(v.estado === 'vendido') vendidos[v.id] = 1;
  });
  if(!Object.keys(vendidos).length) return;

  var botones = document.querySelectorAll('button[onclick*="cerrarVenta("]');
  for(var i=0;i<botones.length;i++){
    var m = /cerrarVenta\((\d+)\)/.exec(botones[i].getAttribute('onclick') || '');
    if(m && vendidos[m[1]]) botones[i].remove();
  }
}

/* ═══════════════════════════════════════════════════════════════
   3. ENGANCHE
   ═══════════════════════════════════════════════════════════════ */

var renderPrevioCta = window.render;
if(typeof renderPrevioCta === 'function'){
  window.render = function(){
    var r = renderPrevioCta.apply(this, arguments);
    ponerBotonClave();
    limpiarBotonesDeVenta();
    return r;
  };
}

/* Si entró con la contraseña que le generó el sistema, no lo dejamos
   avanzar hasta que elija una suya. */
var yaPedida = false;
setInterval(function(){
  if(yaPedida) return;
  if(typeof perfil === 'undefined' || !perfil) return;
  if(!perfil.clave_provisoria) return;
  if(document.getElementById('modalOvl')) return;
  yaPedida = true;
  window.cambiarClave(true);
}, 900);

})();

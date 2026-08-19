/* AutoNet — web pública: correcciones y pantallas nuevas
   Se carga después de publica.js y reemplaza lo que hace falta corregir. */

(function(){
'use strict';

var DOCUMENTOS = ['dniFrente','dniDorso','constancia'];
var ETIQUETA = {
  dniFrente : 'Foto del DNI — frente',
  dniDorso  : 'Foto del DNI — dorso',
  constancia: 'Constancia de inscripción de AFIP'
};
var BASE  = 'https://qymqfjtistprotddoqkz.supabase.co';
var FOTOS = BASE + '/storage/v1/object/public/vehiculos/';

var fotosPorVehiculo = {};
var elegidos = {};

/* ── Utilidades ─────────────────────────────────────────────────────── */
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fotosDe(id){ return fotosPorVehiculo[id] || []; }
function portadaDe(id){
  var f = fotosDe(id);
  if(!f.length) return null;
  var p = f.filter(function(x){ return x.portada; })[0] || f[0];
  return FOTOS + p.ruta;
}
async function cargarFotos(){
  try {
    var r = await sb.from('vehiculo_fotos').select('*').order('orden');
    fotosPorVehiculo = {};
    (r.data || []).forEach(function(f){
      (fotosPorVehiculo[f.vehiculo_id] = fotosPorVehiculo[f.vehiculo_id] || []).push(f);
    });
  } catch(e){ fotosPorVehiculo = {}; }
}

/* ── Documentación ──────────────────────────────────────────────────── */
function faltanDocumentos(p){
  if(!p) return false;
  if(p.rol === 'admin') return false;
  if(!p.dni_frente_path || !p.dni_dorso_path) return true;
  if(p.condicion_fiscal && p.condicion_fiscal !== 'No inscripto' && !p.constancia_path) return true;
  return false;
}
function documentosQueFaltan(p){
  var f = [];
  if(!p.dni_frente_path) f.push('dniFrente');
  if(!p.dni_dorso_path)  f.push('dniDorso');
  if(p.condicion_fiscal && p.condicion_fiscal !== 'No inscripto' && !p.constancia_path) f.push('constancia');
  return f;
}
async function subirDocumentos(uid, lista){
  var rutas = {};
  for(var i=0; i<DOCUMENTOS.length; i++){
    var clave = DOCUMENTOS[i], f = lista[clave];
    if(!f) continue;
    var ext = (String(f.name||'').split('.').pop() || 'dat').toLowerCase();
    var ruta = uid + '/' + clave + '.' + ext;
    var res = await sb.storage.from('documentos').upload(ruta, f, { upsert:true });
    if(res.error) throw new Error('No se pudo subir ' + ETIQUETA[clave] + ': ' + mensajeError(res.error));
    rutas[clave] = ruta;
  }
  if(!Object.keys(rutas).length) return false;
  var cambios = {};
  if(rutas.constancia) cambios.constancia_path = rutas.constancia;
  if(rutas.dniFrente)  cambios.dni_frente_path = rutas.dniFrente;
  if(rutas.dniDorso)   cambios.dni_dorso_path  = rutas.dniDorso;
  var upd = await sb.from('perfiles').update(cambios).eq('id', uid);
  if(upd.error) throw new Error(mensajeError(upd.error));
  return true;
}

window.elegirDocumento = function(clave, input){
  var f = input.files[0];
  if(!f) return;
  if(f.size > 5*1024*1024) return toast('El archivo supera los 5 MB','error');
  elegidos[clave] = f;
  var caja = document.getElementById('doc_'+clave);
  if(caja){
    caja.classList.add('has');
    caja.querySelector('.ic').textContent = '✓';
    caja.querySelector('b').textContent = f.name;
    caja.querySelector('small').textContent = 'Archivo cargado — clic para reemplazar';
  }
};

window.enviarDocumentos = async function(){
  var faltan = documentosQueFaltan(perfil);
  for(var i=0;i<faltan.length;i++)
    if(!elegidos[faltan[i]]) return toast('⚠ Falta cargar: '+ETIQUETA[faltan[i]],'error');
  cargando(true,'Subiendo documentos…');
  try { await subirDocumentos(perfil.id, elegidos); }
  catch(e){ cargando(false); return toast(e.message,'error'); }
  elegidos = {};
  await cargarSesion(); await cargarTodo();
  cargando(false); vista='panel'; render();
  toast('Documentación recibida. Tu cuenta queda <b>pendiente de verificación</b>.','ok');
};

function cajaDocumento(clave){
  var f = elegidos[clave];
  return '<label class="drop '+(f?'has':'')+'" id="doc_'+clave+'">'+
    '<div class="ic">'+(f?'✓':'📄')+'</div>'+
    '<b>'+(f?esc(f.name):ETIQUETA[clave])+'</b>'+
    '<small>'+(f?'Archivo cargado — clic para reemplazar':'PDF, JPG o PNG · hasta 5 MB')+'</small>'+
    '<input type="file" accept=".pdf,.jpg,.jpeg,.png" onchange="elegirDocumento(\''+clave+'\', this)"></label>';
}

function vDocumentos(){
  return '<div class="wrap" style="max-width:640px">'+
    '<h2 class="sec">Último paso: tu documentación</h2>'+
    '<p class="sub">Hola '+esc(perfil.nombre)+'. Tus datos ya están guardados. Solo falta esto para que podamos verificarte.</p>'+
    '<div class="note w" style="margin:18px 0">Sin la constancia de inscripción de AFIP no podemos habilitarte para operar.</div>'+
    '<div style="display:grid;gap:12px">'+documentosQueFaltan(perfil).map(cajaDocumento).join('')+'</div>'+
    '<button class="btn btn-block" style="margin-top:20px" onclick="enviarDocumentos()">Enviar documentación</button>'+
    '<div style="text-align:center;margin-top:14px"><a onclick="salir()" style="cursor:pointer;font-size:.82rem;color:var(--gray);font-weight:600">Cerrar sesión</a></div></div>';
}

/* ── Registro: los datos viajan con el alta; los papeles van después ─── */
function metadatosDe(d){
  return { nombre:d.nombre, apellido:d.apellido, dni:d.dni,
    nacimiento:d.nacimiento||'', tel:d.tel||'', provincia:d.provincia||'',
    localidad:d.localidad||'', domicilio:d.domicilio||'', cuit:d.cuit||'',
    condicion_fiscal:d.condicionFiscal||'', categoria_mono:d.categoriaMono||'',
    fecha_inscripcion:d.fechaInscripcion||'', cbu:d.cbu||'', alias_cbu:d.aliasCbu||'',
    banco:d.banco||'', experiencia:d.experiencia||'', rubro:d.rubro||'',
    concesionaria:d.concesionaria||'no' };
}
function modoCompletar(){ return !!(sesion && !perfil); }

/* Durante el alta no se piden archivos: se piden una sola vez, al volver
   del correo de confirmación. Así nunca se piden dos veces. */
var validarOriginal = window.validarPaso;
window.validarPaso = function(){
  var e = validarOriginal();
  if(e && /DNI|constancia/i.test(e) && /Sub[ií]/i.test(e)) return null;
  return e;
};

window.finalizarRegistro = async function(){
  leerPaso();
  var err = validarPaso();
  if(err) return toast('⚠ '+err,'error');
  var d = regData;

  if(modoCompletar()){
    var uid = sesion.user.id;
    cargando(true,'Guardando tus datos…');
    var ins = await sb.from('perfiles').insert({
      id:uid, nombre:d.nombre, apellido:d.apellido, dni:d.dni,
      nacimiento:d.nacimiento||null, tel:d.tel||null, provincia:d.provincia||null,
      localidad:d.localidad||null, domicilio:d.domicilio||null, cuit:d.cuit||null,
      condicion_fiscal:d.condicionFiscal||null, categoria_mono:d.categoriaMono||null,
      fecha_inscripcion:d.fechaInscripcion||null, cbu:d.cbu||null,
      alias_cbu:d.aliasCbu||null, banco:d.banco||null, experiencia:d.experiencia||null,
      rubro:d.rubro||null, concesionaria:d.concesionaria||'no' });
    if(ins.error){ cargando(false); return toast(mensajeError(ins.error),'error'); }
    await cargarSesion(); await cargarTodo();
    cargando(false); render();
    return toast('Datos guardados. Ahora subí tu documentación.','ok');
  }

  cargando(true,'Creando tu cuenta…');
  var alta = await sb.auth.signUp({
    email:d.email, password:d.pass,
    options:{ emailRedirectTo: location.origin + '/', data: metadatosDe(d) } });
  if(alta.error){ cargando(false); return toast(mensajeError(alta.error),'error'); }
  var nuevoId = alta.data.user && alta.data.user.id;
  if(!nuevoId){ cargando(false); return toast('No se pudo crear la cuenta. Intentá de nuevo.','error'); }

  if(!alta.data.session){
    cargando(false);
    return modal('Confirmá tu correo','<div class="note g">'+
      'Tus datos ya quedaron guardados. Te enviamos un correo a <b>'+esc(d.email)+'</b>.'+
      '<br><br>Abrilo, tocá el enlace de confirmación y volvés acá para subir tu constancia y tu DNI.'+
      '</div><div class="note w" style="margin-top:12px">Si no lo ves, revisá el correo no deseado.</div>',
      [{txt:'Entendido',clase:'',fn:"cerrarModal();ir('login')"}]);
  }
  await cargarSesion(); await cargarTodo();
  cargando(false); render();
  toast('Cuenta creada. Subí tu documentación para que podamos verificarte.','ok');
};

/* ── Compra de cupo con pago real ───────────────────────────────────── */
window.comprarCupo = async function(){
  if(!perfil) return;
  if(perfil.estado_verificacion !== 'aprobado')
    return toast('Necesitás tener la cuenta verificada para comprar cupos','error');

  cargando(true,'Consultando el precio…');
  var cfg = await sb.from('config').select('clave,valor');
  cargando(false);
  if(cfg.error) return toast(mensajeError(cfg.error),'error');

  var c = {};
  (cfg.data||[]).forEach(function(x){ c[x.clave] = Number(x.valor); });
  var usd = c.precio_cupo_usd || 100;
  var cot = c.cotizacion_dolar || 0;
  if(!cot) return toast('El precio no está configurado. Escribinos y lo resolvemos.','error');
  var ars = Math.round(usd * cot);

  modal('Comprar un cupo extra',
    '<div class="note g" style="margin-bottom:14px">Sumás <b>un vehículo más</b> en simultáneo, de forma permanente. '+
    'No vence y se acumula con los que ya tenés.</div>'+
    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:16px;margin-bottom:14px">'+
      '<div style="display:flex;justify-content:space-between;padding:5px 0"><span>Cupo extra</span><b>USD '+usd+'</b></div>'+
      '<div style="display:flex;justify-content:space-between;padding:5px 0;color:var(--gray);font-size:.85rem"><span>Cotización</span><span>$'+cot.toLocaleString('es-AR')+' por dólar</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:8px;border-top:1px solid var(--line);font-size:1.05rem"><b>Total a pagar</b><b style="color:var(--green)">$'+ars.toLocaleString('es-AR')+'</b></div>'+
    '</div>'+
    '<div class="mini">Pagás en Mercado Pago con tarjeta de crédito, débito, dinero en cuenta o efectivo. '+
    'El cupo se habilita solo, apenas se acredita el pago.</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Ir a pagar',clase:'',fn:'irAPagar()'}]);
};

window.irAPagar = async function(){
  cerrarModal();
  cargando(true,'Preparando el pago…');
  try {
    var s = await sb.auth.getSession();
    var token = s.data.session && s.data.session.access_token;
    if(!token){ cargando(false); return toast('Se cerró tu sesión. Ingresá de nuevo.','error'); }

    var r = await fetch(BASE + '/functions/v1/crear-pago', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' },
      body:'{}'
    });
    var j = await r.json().catch(function(){ return {}; });
    cargando(false);
    if(!r.ok || !j.url) return toast(j.error || 'No se pudo iniciar el pago. Probá de nuevo.','error');
    location.href = j.url;
  } catch(e){
    cargando(false);
    toast('No se pudo contactar al sistema de pagos. Revisá tu conexión.','error');
  }
};

/* ── Vuelta desde Mercado Pago ──────────────────────────────────────── */
async function avisarResultadoDelPago(){
  var q = new URLSearchParams(location.search);
  var estado = q.get('pago');
  if(!estado) return;
  history.replaceState({}, '', location.pathname);

  if(estado === 'aprobado'){
    cargando(true,'Confirmando tu pago…');
    for(var i=0;i<6;i++){
      await new Promise(function(r){ setTimeout(r, 1500); });
      await cargarSesion();
      var ref = q.get('ref');
      var p = await sb.from('pagos_cupo').select('estado').eq('referencia', ref).maybeSingle();
      if(p.data && p.data.estado === 'aprobado'){
        await cargarTodo(); cargando(false); render();
        return toast('¡Pago acreditado! Ya tenés un cupo más.','ok');
      }
    }
    cargando(false); render();
    return modal('Pago recibido','<div class="note g">Mercado Pago está terminando de procesar el pago. '+
      'El cupo se habilita solo en cuanto se acredite, normalmente en menos de un minuto. '+
      'Podés recargar la página para verlo.</div>', [{txt:'Entendido',clase:'',fn:'cerrarModal()'}]);
  }
  if(estado === 'pendiente'){
    return modal('Pago pendiente','<div class="note w">Tu pago quedó pendiente de acreditación. '+
      'Si pagaste en efectivo puede tardar hasta 48 horas. El cupo se habilita solo cuando se acredite.</div>',
      [{txt:'Entendido',clase:'',fn:'cerrarModal()'}]);
  }
  if(estado === 'rechazado'){
    return modal('Pago rechazado','<div class="note r">Mercado Pago rechazó el pago y no se te cobró nada. '+
      'Podés intentar con otro medio de pago.</div>', [{txt:'Entendido',clase:'',fn:'cerrarModal()'}]);
  }
}

/* ── Catálogo con fotos ─────────────────────────────────────────────── */
function tarjetaVehiculo(v, tomado){
  var portada = portadaDe(v.id);
  var cantidad = fotosDe(v.id).length;
  var nv = NIVELES[perfil.nivel];
  var puede = puedeTomar(perfil, penas, asigs, v);
  var comision = Math.round(v.precio * 0.02);

  return '<div class="card" style="overflow:hidden;display:flex;flex-direction:column">'+
    '<div style="position:relative;height:190px;background:#0A2540;cursor:pointer" onclick="verVehiculo('+v.id+')">'+
      (portada
        ? '<img src="'+esc(portada)+'" alt="'+esc(v.marca+' '+v.modelo)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">'
        : '<div style="width:100%;height:100%;display:grid;place-items:center;font-size:3.4rem">'+(v.icono||'🚗')+'</div>')+
      '<div style="position:absolute;top:10px;left:10px;background:rgba(10,37,64,.86);color:#fff;padding:4px 10px;border-radius:7px;font-size:.7rem;font-weight:800;letter-spacing:.4px;text-transform:uppercase">'+esc(GAMA_LABEL[v.gama])+'</div>'+
      (cantidad>1?'<div style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.62);color:#fff;padding:3px 9px;border-radius:7px;font-size:.72rem;font-weight:700">📷 '+cantidad+'</div>':'')+
      (tomado?'<div style="position:absolute;top:10px;right:10px;background:var(--green);color:#fff;padding:4px 10px;border-radius:7px;font-size:.7rem;font-weight:800">LO ESTÁS VENDIENDO</div>':'')+
    '</div>'+
    '<div style="padding:15px 17px;flex:1;display:flex;flex-direction:column">'+
      '<div style="font-weight:800;font-size:1.02rem;color:var(--navy);line-height:1.25">'+esc(v.marca+' '+v.modelo)+'</div>'+
      '<div class="mini" style="margin-top:2px">'+esc([v.version, v.anio, fmtNum(v.km)+' km', v.transmision].filter(Boolean).join(' · '))+'</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px">'+
        '<div><div style="font-size:1.25rem;font-weight:800;color:var(--navy)">'+fmtUSD(v.precio)+'</div>'+
        '<div class="mini" style="color:var(--green);font-weight:700">Ganás '+fmtUSD(comision)+'</div></div>'+
        '<div class="mini" style="text-align:right">'+esc(v.ubicacion||'')+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;margin-top:14px">'+
        '<button class="btn btn-o btn-sm" style="flex:1" onclick="verVehiculo('+v.id+')">Ver ficha</button>'+
        (tomado
          ? '<button class="btn btn-sm" style="flex:1" onclick="ir(\'panel\')">Mi panel</button>'
          : (puede.ok
              ? '<button class="btn btn-sm" style="flex:1" onclick="tomarVehiculo('+v.id+')">Vender este</button>'
              : '<button class="btn btn-sm" style="flex:1;opacity:.45;cursor:not-allowed" onclick="toast(\''+esc(puede.motivo).replace(/'/g,'&#39;')+'\',\'error\')">No disponible</button>'))+
      '</div>'+
    '</div></div>';
}

window.vCatalogo = function(){
  if(!perfil) return vLogin();
  var nv = NIVELES[perfil.nivel];
  var cupo = cupoEfectivo(perfil, penas), tomados = asigs.length;

  var lista = vehiculos.slice();
  if(filtro.gama) lista = lista.filter(function(v){ return v.gama === filtro.gama; });
  if(filtro.texto){
    var q = filtro.texto.toLowerCase();
    lista = lista.filter(function(v){
      return (v.marca+' '+v.modelo+' '+(v.version||'')+' '+(v.ubicacion||'')).toLowerCase().indexOf(q) >= 0;
    });
  }
  if(filtro.orden === 'precio-asc') lista.sort(function(a,b){ return a.precio-b.precio; });
  else if(filtro.orden === 'precio-desc') lista.sort(function(a,b){ return b.precio-a.precio; });

  var mios = asigs.map(function(a){ return a.vehiculo_id; });

  return '<div class="wrap">'+
    (perfil.estado_verificacion !== 'aprobado'
      ? '<div class="note w" style="margin-bottom:20px"><b>Tu cuenta está '+esc(VERIF_LABEL[perfil.estado_verificacion].toLowerCase())+'.</b> '+
        'Podés mirar el catálogo pero todavía no podés tomar vehículos.'+
        (perfil.observaciones?'<br>Nota del equipo: '+esc(perfil.observaciones):'')+'</div>'
      : '')+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px">'+
      '<div><h2 class="sec">Catálogo de vehículos</h2>'+
      '<p class="sub" style="margin:0">Nivel <b style="color:'+nv.color+'">'+nv.nombre+'</b> · '+esc(nv.detalle)+'</p></div>'+
      '<div style="display:flex;gap:9px;align-items:center">'+
        '<span class="pill '+(tomados>=cupo?'p-red':'p-blue')+'" style="padding:8px 16px;font-size:.8rem">Cupo '+tomados+'/'+cupo+'</span>'+
        '<button class="btn btn-o btn-sm" onclick="comprarCupo()">+ Cupo extra</button>'+
      '</div></div>'+
    '<div class="filters" style="margin-bottom:20px">'+
      '<input placeholder="Buscar marca, modelo, versión o zona…" value="'+esc(filtro.texto)+'" oninput="filtro.texto=this.value;render()">'+
      '<select onchange="filtro.gama=this.value;render()">'+
        '<option value="">Todas las gamas</option>'+
        ['baja','media','alta'].map(function(g){
          return '<option value="'+g+'" '+(filtro.gama===g?'selected':'')+'>'+GAMA_LABEL[g]+'</option>'; }).join('')+
      '</select>'+
      '<select onchange="filtro.orden=this.value;render()">'+
        '<option value="reciente" '+(filtro.orden==='reciente'?'selected':'')+'>Más recientes</option>'+
        '<option value="precio-asc" '+(filtro.orden==='precio-asc'?'selected':'')+'>Menor precio</option>'+
        '<option value="precio-desc" '+(filtro.orden==='precio-desc'?'selected':'')+'>Mayor precio</option>'+
      '</select></div>'+
    (lista.length
      ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px">'+
        lista.map(function(v){ return tarjetaVehiculo(v, mios.indexOf(v.id)>=0); }).join('')+'</div>'
      : '<div class="card"><div class="card-b" style="text-align:center;padding:60px 20px">'+
        '<div style="font-size:2.6rem;margin-bottom:10px">🚘</div>'+
        '<b style="color:var(--navy)">Todavía no hay vehículos publicados</b>'+
        '<div class="mini" style="margin-top:5px">En cuanto el equipo cargue unidades vas a verlas acá.</div></div></div>')+
    '</div>';
};

/* ── Ficha del vehículo con galería ─────────────────────────────────── */
function filaDato(etiqueta, valor){
  if(valor === null || valor === undefined || valor === '' || valor === false) return '';
  return '<div style="display:flex;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px solid var(--line)">'+
    '<span style="color:var(--gray);font-size:.83rem">'+etiqueta+'</span>'+
    '<b style="font-size:.85rem;text-align:right">'+esc(valor)+'</b></div>';
}

window.verFoto = function(id, i){
  var f = fotosDe(id);
  if(!f.length) return;
  var actual = ((i % f.length) + f.length) % f.length;
  var ovl = document.getElementById('visorFoto');
  if(!ovl){
    ovl = document.createElement('div');
    ovl.id = 'visorFoto';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(3,10,20,.94);z-index:9000;display:grid;place-items:center';
    ovl.onclick = function(e){ if(e.target === ovl) ovl.remove(); };
    document.body.appendChild(ovl);
  }
  ovl.innerHTML =
    '<img src="'+esc(FOTOS+f[actual].ruta)+'" style="max-width:92vw;max-height:84vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6)">'+
    '<div style="position:absolute;top:18px;right:22px"><button onclick="document.getElementById(\'visorFoto\').remove()" style="background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:9px;width:40px;height:40px;font-size:1.3rem;cursor:pointer">×</button></div>'+
    (f.length>1
      ? '<button onclick="event.stopPropagation();verFoto('+id+','+(actual-1)+')" style="position:absolute;left:18px;background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:50%;width:46px;height:46px;font-size:1.5rem;cursor:pointer">‹</button>'+
        '<button onclick="event.stopPropagation();verFoto('+id+','+(actual+1)+')" style="position:absolute;right:18px;background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:50%;width:46px;height:46px;font-size:1.5rem;cursor:pointer">›</button>'+
        '<div style="position:absolute;bottom:22px;color:#fff;font-weight:700;font-size:.85rem">'+(actual+1)+' de '+f.length+'</div>'
      : '');
};

window.verVehiculo = function(id){
  var v = vehiculos.filter(function(x){ return x.id === id; })[0];
  if(!v) return;
  var f = fotosDe(id);
  var tomado = asigs.filter(function(a){ return a.vehiculo_id === id; })[0];
  var puede = puedeTomar(perfil, penas, asigs, v);
  var comision = Math.round(v.precio * 0.02);

  var galeria = f.length
    ? '<div style="margin:-4px -4px 16px">'+
        '<img src="'+esc(FOTOS+(f.filter(function(x){return x.portada;})[0]||f[0]).ruta)+'" onclick="verFoto('+id+',0)" style="width:100%;height:270px;object-fit:cover;border-radius:11px;cursor:zoom-in;display:block">'+
        (f.length>1
          ? '<div style="display:flex;gap:7px;margin-top:8px;overflow-x:auto;padding-bottom:4px">'+
            f.map(function(x,i){ return '<img src="'+esc(FOTOS+x.ruta)+'" onclick="verFoto('+id+','+i+')" style="width:78px;height:58px;object-fit:cover;border-radius:7px;cursor:pointer;flex-shrink:0;border:2px solid transparent">'; }).join('')+
            '</div>'
          : '')+
      '</div>'
    : '<div style="height:150px;display:grid;place-items:center;background:var(--bg);border-radius:11px;font-size:3rem;margin-bottom:16px">'+(v.icono||'🚗')+'</div>';

  var equipamiento = (v.equipamiento && v.equipamiento.length)
    ? '<div style="margin-top:14px"><div style="font-weight:800;color:var(--navy);font-size:.9rem;margin-bottom:7px">Equipamiento</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
      v.equipamiento.map(function(e){ return '<span class="pill p-blue" style="font-size:.74rem">'+esc(e)+'</span>'; }).join('')+
      '</div></div>'
    : '';

  var papeles = [
    ['Título y cédula', v.doc_dominio], ['Patentes al día', v.doc_patentes],
    ['VTV vigente', v.doc_vtv], ['Informe de dominio', v.doc_policial], ['Mandato firmado', v.doc_mandato]
  ].map(function(p){
    return '<div style="display:flex;align-items:center;gap:7px;font-size:.82rem;padding:3px 0">'+
      '<span style="color:'+(p[1]?'var(--green)':'#DC2626')+';font-weight:800">'+(p[1]?'✓':'✕')+'</span>'+p[0]+'</div>';
  }).join('');

  modal(esc(v.marca+' '+v.modelo)+(v.version?' <span style="font-weight:600;color:var(--gray)">'+esc(v.version)+'</span>':''),
    galeria+
    '<div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border-radius:11px;padding:14px 16px;margin-bottom:16px">'+
      '<div><div class="mini">Precio de venta</div><div style="font-size:1.4rem;font-weight:800;color:var(--navy)">'+fmtUSD(v.precio)+'</div></div>'+
      '<div style="text-align:right"><div class="mini">Tu comisión (2%)</div><div style="font-size:1.2rem;font-weight:800;color:var(--green)">'+fmtUSD(comision)+'</div></div>'+
    '</div>'+
    (v.descripcion?'<div style="font-size:.88rem;line-height:1.6;margin-bottom:14px">'+esc(v.descripcion)+'</div>':'')+
    '<div class="grid2" style="gap:0 22px">'+
      '<div>'+
        filaDato('Tipo', v.tipo)+ filaDato('Año', v.anio)+
        filaDato('Kilómetros', fmtNum(v.km)+' km')+ filaDato('Motor', v.motor)+
        filaDato('Cilindrada', v.cilindrada)+ filaDato('Potencia', v.potencia_hp?v.potencia_hp+' HP':'')+
        filaDato('Combustible', v.combustible)+ filaDato('Transmisión', v.transmision)+
        filaDato('Tracción', v.traccion)+ filaDato('Puertas', v.puertas)+
        filaDato('Plazas', v.plazas)+
      '</div>'+
      '<div>'+
        filaDato('Color', v.color)+ filaDato('Interior', v.color_interior)+
        filaDato('Estado general', v.estado_general)+
        filaDato('Único dueño', v.unico_dueno?'Sí':'')+
        filaDato('Dueños anteriores', v.duenos_anteriores)+
        filaDato('Importado', v.importado?'Sí':'')+
        filaDato('GNC', v.tiene_gnc?'Sí':'')+
        filaDato('Service al día', v.service_al_dia?'Sí':'')+
        filaDato('Último service', v.ultimo_service_km?fmtNum(v.ultimo_service_km)+' km':'')+
        filaDato('VTV vence', v.vtv_vence?fmtFecha(v.vtv_vence):'')+
        filaDato('Acepta permuta', v.acepta_permuta?'Sí':'')+
        filaDato('Ubicación', v.ubicacion)+
      '</div>'+
    '</div>'+
    equipamiento+
    (v.detalles_esteticos?'<div style="margin-top:14px"><div style="font-weight:800;color:var(--navy);font-size:.9rem;margin-bottom:4px">Detalles estéticos</div><div style="font-size:.85rem;line-height:1.55">'+esc(v.detalles_esteticos)+'</div></div>':'')+
    (v.detalles_mecanicos?'<div style="margin-top:12px"><div style="font-weight:800;color:var(--navy);font-size:.9rem;margin-bottom:4px">Detalles mecánicos</div><div style="font-size:.85rem;line-height:1.55">'+esc(v.detalles_mecanicos)+'</div></div>':'')+
    '<div style="margin-top:16px"><div style="font-weight:800;color:var(--navy);font-size:.9rem;margin-bottom:5px">Documentación</div>'+papeles+'</div>'+
    ((v.deuda_patentes||v.deuda_infracciones)
      ? '<div class="note w" style="margin-top:12px"><b>Atención:</b> este vehículo tiene '+
        [v.deuda_patentes?'deuda de patentes':'', v.deuda_infracciones?'infracciones impagas':''].filter(Boolean).join(' y ')+
        '. Avisale al comprador antes de señar.</div>'
      : ''),
    tomado
      ? [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
         {txt:'Pedir una visita',clase:'',fn:'cerrarModal();pedirVisita('+id+')'}]
      : (puede.ok
          ? [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
             {txt:'Quiero vender este',clase:'',fn:'cerrarModal();tomarVehiculo('+id+')'}]
          : [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'}]));
};

/* ── Enganche ───────────────────────────────────────────────────────── */
function ocultarPedidoDeArchivos(){
  if(document.getElementById('estiloSinArchivos')) return;
  var s = document.createElement('style');
  s.id = 'estiloSinArchivos';
  s.textContent = '#app .drop{display:none !important}';
  document.head.appendChild(s);
}
function mostrarPedidoDeArchivos(){
  var s = document.getElementById('estiloSinArchivos');
  if(s) s.remove();
}
function ocultarContrasenas(){
  ['rPass','rPass2'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.closest){ var c = el.closest('.fld'); if(c) c.style.display = 'none'; }
  });
}

var renderOriginal = window.render;

window.render = function(){
  if(sesion && !perfil){
    regData.email = regData.email || sesion.user.email;
    regData.pass  = regData.pass  || 'cuenta-ya-creada';
    regData.pass2 = regData.pass;
    renderNav();
    document.getElementById('app').innerHTML =
      '<div class="wrap" style="max-width:760px;padding-bottom:0"><div class="note w">'+
      '<b>Tu registro quedó a mitad de camino.</b> La cuenta existe pero faltan tus datos.</div></div>' + vRegistro();
    ocultarPedidoDeArchivos();
    setTimeout(ocultarContrasenas, 0);
    return;
  }
  if(perfil && faltanDocumentos(perfil)){
    renderNav();
    mostrarPedidoDeArchivos();
    document.getElementById('app').innerHTML = vDocumentos();
    return;
  }
  if(vista === 'registro') ocultarPedidoDeArchivos(); else mostrarPedidoDeArchivos();
  renderOriginal();
};

var cargarTodoOriginal = window.cargarTodo;
window.cargarTodo = async function(){
  await cargarTodoOriginal();
  await cargarFotos();
};

(async function arranque(){
  try {
    await cargarSesion();
    await cargarFotos();
    if(perfil) vista = 'panel';
    render();
    await avisarResultadoDelPago();
  } catch(e){ /* el arranque normal sigue su curso */ }
})();

})();

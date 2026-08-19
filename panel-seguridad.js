/* BivonaCars — Panel: seguridad de la cuenta.

   La cuenta dueña es la llave maestra del negocio: ve todo, cierra ventas,
   cambia permisos y toca la plata. Hasta acá alcanzaba con una contraseña.
   Este archivo suma la verificación en dos pasos: además de la contraseña,
   un código de seis dígitos que cambia cada 30 segundos y vive solo en el
   teléfono. Si alguien te roba la contraseña, sin el teléfono no entra.

   Se carga después de panel-crm.js. */

(function(){
'use strict';

var S = { factores: [], nivel: null, cargado: false };

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }

function tarjeta(titulo, extra, cuerpo){
  return '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>'+titulo+'</h3>'+
    (extra||'')+'</div><div class="card-b">'+cuerpo+'</div></div>';
}

/* ═══════════════════════════════════════════════════════════════
   1. ESTADO DE LA CUENTA
   ═══════════════════════════════════════════════════════════════ */

function verificados(){
  return S.factores.filter(function(f){ return f.status === 'verified'; });
}

/** Los intentos a medio terminar quedan colgados en la cuenta y después
    no dejan volver a empezar. Se limpian solos. */
async function limpiarInconclusos(){
  var sueltos = S.factores.filter(function(f){ return f.status !== 'verified'; });
  for(var i=0;i<sueltos.length;i++){
    try { await sb.auth.mfa.unenroll({ factorId: sueltos[i].id }); } catch(e){ /* seguimos */ }
  }
  if(sueltos.length) await cargarFactores();
}

async function cargarFactores(){
  try {
    var r = await sb.auth.mfa.listFactors();
    S.factores = (r.data && (r.data.totp || r.data.all)) || [];
    var n = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    S.nivel = n.data || null;
  } catch(e){ S.factores = []; S.nivel = null; }
  S.cargado = true;
}
window.cargarFactores = cargarFactores;

/* ═══════════════════════════════════════════════════════════════
   2. PANTALLA
   ═══════════════════════════════════════════════════════════════ */

function vistaSeguridad(){
  var activa = verificados().length > 0;

  return tarjeta('Verificación en dos pasos',
    '<span class="pill '+(activa?'p-green':'p-red')+'">'+(activa?'Activada':'Sin activar')+'</span>',

    (activa
      ? '<div style="font-size:.87rem;line-height:1.65;margin-bottom:14px">'+
        'Tu cuenta pide un código del teléfono además de la contraseña. '+
        'Es la protección más importante que tiene el sistema: aunque alguien te '+
        'saque la contraseña, sin tu teléfono no entra.</div>'+
        verificados().map(function(f){
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;'+
            'padding:11px 13px;background:var(--bg);border:1px solid var(--line);border-radius:9px;margin-bottom:9px">'+
            '<div><b style="font-size:.87rem">'+esc(f.friendly_name || 'Aplicación de códigos')+'</b>'+
            '<div class="mini">Activada el '+new Date(f.created_at).toLocaleDateString('es-AR')+'</div></div>'+
            '<button class="btn btn-o btn-sm" onclick="quitarSegundoPaso(\''+esc(f.id)+'\')">Desactivar</button></div>';
        }).join('')

      : '<div class="note w" style="margin-bottom:14px"><b>Tu cuenta está protegida solo por una contraseña.</b> '+
        'Esta cuenta ve los datos fiscales de todos tus comisionistas, sus CBU, y puede cerrar ventas '+
        'y mover permisos. Es la que más conviene blindar.</div>'+
        '<div style="font-size:.87rem;line-height:1.65;margin-bottom:14px">'+
        'Vas a necesitar una aplicación de códigos en el celular. Las gratuitas y conocidas son '+
        '<b>Google Authenticator</b>, <b>Microsoft Authenticator</b> o <b>Authy</b>. '+
        'Bajás cualquiera, escaneás el código que te muestro y listo.</div>'+
        '<button class="btn" onclick="activarSegundoPaso()">Activar la verificación en dos pasos</button>'
    )+

    '<div class="mini" style="margin-top:14px;line-height:1.6"><b>Importante:</b> guardá la clave de '+
    'respaldo que te muestro al activarla. Si perdés el teléfono y no la tenés, la única forma de volver '+
    'a entrar es desde el panel de Supabase.</div>'
  );
}

/* ── Activar ───────────────────────────────────────────────────── */
window.activarSegundoPaso = async function(){
  cargando(true, 'Preparando…');
  await cargarFactores();
  await limpiarInconclusos();

  var r = await sb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'BivonaCars ' + new Date().toLocaleDateString('es-AR')
  });
  cargando(false);

  if(r.error) return toast(mensajeError(r.error), 'error');

  var t = r.data.totp || {};
  modal('Escaneá este código con tu aplicación',
    '<div style="text-align:center">'+
      '<div style="background:#fff;padding:14px;border-radius:12px;border:1px solid var(--line);'+
      'display:inline-block;margin-bottom:14px">'+
      '<img src="'+esc(t.qr_code)+'" alt="Código QR" style="width:190px;height:190px;display:block"></div>'+
    '</div>'+
    '<div style="font-size:.86rem;line-height:1.6;margin-bottom:12px">'+
    'Abrí Google Authenticator (o la que uses), tocá <b>+</b> y escaneá el cuadrito de arriba. '+
    'Te va a aparecer un número de seis dígitos que cambia cada 30 segundos.</div>'+

    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:14px">'+
      '<div class="mini" style="margin-bottom:4px">Si no podés escanear, cargá esta clave a mano '+
      '(y guardala en un lugar seguro, es tu respaldo):</div>'+
      '<code style="font-size:.82rem;word-break:break-all;font-weight:700;letter-spacing:.5px">'+
      esc(t.secret)+'</code></div>'+

    '<div class="fld"><label>Escribí el código que te muestra la aplicación</label>'+
    '<input id="mfaCodigo" inputmode="numeric" maxlength="6" placeholder="123456" '+
    'style="font-size:1.3rem;letter-spacing:6px;text-align:center;font-weight:800" '+
    'onkeydown="if(event.key===\'Enter\')confirmarSegundoPaso(\''+esc(r.data.id)+'\')"></div>',

    [{txt:'Cancelar', clase:'btn-o', fn:'cancelarSegundoPaso(\''+esc(r.data.id)+'\')'},
     {txt:'Confirmar', clase:'', fn:'confirmarSegundoPaso(\''+esc(r.data.id)+'\')'}]);

  setTimeout(function(){ var c = document.getElementById('mfaCodigo'); if(c) c.focus(); }, 120);
};

window.cancelarSegundoPaso = async function(id){
  cerrarModal();
  try { await sb.auth.mfa.unenroll({ factorId: id }); } catch(e){ /* nada */ }
  await cargarFactores();
};

window.confirmarSegundoPaso = async function(id){
  var codigo = val('mfaCodigo').replace(/[^0-9]/g,'');
  if(codigo.length !== 6) return toast('El código son seis números', 'error');

  cargando(true, 'Verificando…');
  var r = await sb.auth.mfa.challengeAndVerify({ factorId: id, code: codigo });
  cargando(false);

  if(r.error){
    return toast('Ese código no es válido. Fijate que sea el que muestra la aplicación '+
      'en este momento — cambia cada 30 segundos.', 'error');
  }

  cerrarModal();
  await cargarFactores();
  toast('Listo. Tu cuenta ahora pide el código al ingresar.', 'ok');
  if(typeof render === 'function') render();
};

/* ── Desactivar ────────────────────────────────────────────────── */
window.quitarSegundoPaso = function(id){
  modal('¿Desactivar la verificación en dos pasos?',
    '<div class="note r">Tu cuenta vuelve a quedar protegida solamente por la contraseña. '+
    'Con los datos fiscales y bancarios de tus comisionistas adentro, no es lo recomendable.</div>'+
    '<div style="font-size:.87rem;line-height:1.6;margin-top:12px">Si la estás desactivando porque '+
    'cambiaste de teléfono, es mejor activarla de nuevo con el teléfono nuevo apenas termines.</div>',
    [{txt:'Dejarla activada', clase:'btn-o', fn:'cerrarModal()'},
     {txt:'Desactivar igual', clase:'btn-red', fn:'confirmarQuitar(\''+esc(id)+'\')'}]);
};

window.confirmarQuitar = async function(id){
  cargando(true, 'Desactivando…');
  var r = await sb.auth.mfa.unenroll({ factorId: id });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error), 'error');
  cerrarModal();
  await cargarFactores();
  toast('Verificación en dos pasos desactivada', 'ok');
  if(typeof render === 'function') render();
};

/* ═══════════════════════════════════════════════════════════════
   3. PEDIR EL CÓDIGO AL INGRESAR
   ═══════════════════════════════════════════════════════════════ */

/** ¿Esta sesión ya cumplió con el segundo paso?

    Ojo con esto, que fue el error que nos tuvo dando vueltas: la respuesta
    de Supabase trae dos datos, "en qué nivel estás" y "a qué nivel podés
    llegar". El segundo lo calcula mirando la lista de factores que viene
    DENTRO de la sesión — y cuando entrás con contraseña esa lista viene
    vacía. Resultado: decía "no hace falta ningún código" y nunca se pedía,
    mientras la base de datos, que mira los factores de verdad, negaba los
    permisos. Las dos mitades del sistema se contradecían.

    Así que del nivel actual nos fiamos (sale del propio token), pero si no
    llegó a aal2 vamos a preguntar por los factores de verdad. */
async function nivelResuelto(){
  var n = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  var d = (n && n.data) || {};

  if(d.currentLevel === 'aal2') return true;   /* ya pasó el código */

  var r = await sb.auth.mfa.listFactors();     /* esto sí consulta al servidor */
  var verificados = ((r.data && r.data.totp) || [])
    .filter(function(f){ return f.status === 'verified'; });

  return verificados.length === 0;             /* sin factor no hay segundo paso */
}

/* ── La pantalla del código ────────────────────────────────────────
   Antes esto era una ventanita flotante, y esa fue la falla: el panel
   arranca solo por su cuenta y al terminar redibuja la pantalla, así que
   la ventanita podía no llegar a verse nunca. El dueño quedaba adentro
   pero sin permisos, mirando un cartel que le decía que le pidiera
   permiso al dueño.

   Ahora es una pantalla completa que ocupa el lugar del panel y que se
   vuelve a dibujar sola si algo intenta taparla. */

var esperandoCodigo = false;

function pantallaCodigo(mensaje){
  var raiz = document.getElementById('raiz');
  if(!raiz) return;

  raiz.innerHTML =
  '<div style="min-height:100vh;display:grid;place-items:center;background:var(--bg);padding:20px">'+
    '<div style="width:100%;max-width:410px;background:#fff;border:1px solid var(--line);'+
      'border-radius:16px;padding:32px 28px;box-shadow:var(--shadow);text-align:center">'+

      '<div style="width:52px;height:52px;background:var(--navy);border-radius:13px;'+
        'display:grid;place-items:center;margin:0 auto 14px;font-size:1.3rem;color:#fff">🔒</div>'+

      '<h3 style="margin:0 0 6px;color:var(--navy);font-size:1.1rem">Verificación en dos pasos</h3>'+
      '<p style="margin:0 0 20px;color:var(--gray);font-size:.87rem;line-height:1.55">'+
        'Abrí tu aplicación de códigos y escribí el número de seis dígitos.</p>'+

      '<input id="mfaEntrada" inputmode="numeric" maxlength="6" placeholder="000000" '+
        'style="width:100%;font-size:1.6rem;letter-spacing:9px;text-align:center;font-weight:800;'+
        'padding:12px;border:1.5px solid var(--line);border-radius:10px;color:var(--navy)" '+
        'onkeydown="if(event.key===\'Enter\')window.__verificarEntrada()">'+

      '<div id="mfaError" style="color:#DC2626;font-weight:700;font-size:.8rem;'+
        'min-height:19px;margin-top:9px">'+(mensaje||'')+'</div>'+

      '<button class="btn btn-block" style="margin-top:6px" '+
        'onclick="window.__verificarEntrada()">Entrar</button>'+

      '<button class="btn btn-o btn-block" style="margin-top:9px" '+
        'onclick="window.__salirDelCodigo()">Cerrar sesión</button>'+

      '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);'+
        'font-size:.76rem;color:var(--gray);line-height:1.6;text-align:left">'+
        '<b style="color:var(--navy)">¿Perdiste el teléfono?</b><br>'+
        'Entrá a supabase.com → proyecto <b>autonet</b> → Authentication → Users → '+
        'tu usuario → borrá el factor de verificación. Con eso volvés a entrar solo '+
        'con la contraseña, y después la podés activar de nuevo.</div>'+
    '</div>'+
  '</div>';

  setTimeout(function(){
    var c = document.getElementById('mfaEntrada');
    if(c) c.focus();
  }, 60);
}

/* ── El candado del dibujado ───────────────────────────────────────
   Esto arregla el problema que nos tuvo dando vueltas dos días, y que
   no tenía nada que ver con el segundo paso.

   El panel arranca solo al abrir la página: pregunta si hay sesión y,
   si no hay, dibuja el formulario de ingreso. Hasta ahí bien. Pero el
   módulo del CRM también arranca por su cuenta, tarda más porque hace
   veinte consultas, y al terminar volvía a dibujar el panel ENCIMA del
   formulario — con el perfil vacío, porque nunca hubo sesión.

   El resultado era un panel fantasma: menú lateral en blanco, sin
   nombre abajo, y cada sección mostrando "solo la cuenta dueña puede
   entrar acá". La cuenta estaba perfecta; simplemente no había nadie
   adentro. Y al cerrar sesión y recargar, el fantasma volvía.

   Regla nueva y simple: sin perfil cargado no se dibuja el panel.

   Pero "sin perfil" son dos situaciones muy distintas, y confundirlas era
   la otra mitad del problema:

     · No hay sesión            → hay que mostrar el formulario de ingreso.
     · Hay sesión y el perfil
       todavía está viajando    → NO hay que mostrarlo. Si aparece el
       formulario, uno cree que se le cerró la sesión y vuelve a escribir
       la contraseña al pedo. Eso era lo que obligaba a "iniciar sesión
       todo el tiempo" al recargar la página.

   Para distinguirlas se mira el cajón del navegador donde supabase-js
   guarda la sesión. Es una lectura instantánea, así que sirve para
   decidir en el mismo momento en que hay que dibujar. */

function haySesionGuardada(){
  try {
    var v = window.localStorage.getItem('bivonacars-panel');
    return !!(v && v.indexOf('access_token') >= 0);
  } catch(e){ return false; }   /* navegador con el almacenamiento bloqueado */
}

function pantallaEsperando(){
  var raiz = document.getElementById('raiz');
  if(!raiz || document.getElementById('bcEsperando')) return;
  raiz.innerHTML =
    '<div id="bcEsperando" style="display:grid;place-items:center;height:100vh;text-align:center;color:#64748B">'+
      '<div><div class="spin" style="border-color:rgba(10,37,64,.15);border-top-color:#1665D8"></div>'+
      '<div style="margin-top:14px;font-weight:600;font-size:.92rem">Entrando a tu panel…</div></div>'+
    '</div>';
}

var renderPrevioSeg = window.render;
if(typeof renderPrevioSeg === 'function'){
  window.render = function(){
    if(esperandoCodigo){ pantallaCodigo(); return; }

    if(typeof perfil === 'undefined' || !perfil){
      if(haySesionGuardada()) pantallaEsperando();
      else {
        var raiz = document.getElementById('raiz');
        if(raiz && !document.getElementById('adEmail') && typeof pantallaLogin === 'function')
          raiz.innerHTML = pantallaLogin();
      }
      return;
    }

    return renderPrevioSeg.apply(this, arguments);
  };
}

/* Que nadie quede mirando "Entrando…" para siempre: si el perfil no llegó
   en un tiempo razonable es que algo se cortó en el camino. Se lo decimos
   y le damos las dos salidas útiles, en vez de dejar la pantalla colgada. */
setTimeout(function(){
  if((typeof perfil !== 'undefined' && perfil) || !haySesionGuardada()) return;
  var raiz = document.getElementById('raiz');
  if(!raiz || !document.getElementById('bcEsperando')) return;

  raiz.innerHTML =
  '<div style="display:grid;place-items:center;height:100vh;padding:20px">'+
    '<div style="max-width:400px;text-align:center;background:#fff;border:1px solid var(--line);'+
      'border-radius:16px;padding:30px 26px;box-shadow:var(--shadow)">'+
      '<h3 style="color:var(--navy);font-size:1.05rem;margin-bottom:8px">No pudimos cargar tu panel</h3>'+
      '<p style="color:var(--gray);font-size:.87rem;line-height:1.6;margin-bottom:18px">'+
        'Tu sesión sigue abierta, pero los datos no llegaron. Casi siempre es la conexión.</p>'+
      '<button class="btn btn-block" onclick="location.reload()">Reintentar</button>'+
      '<button class="btn btn-o btn-block" style="margin-top:9px" '+
        'onclick="window.__salirDelCodigo()">Cerrar sesión y empezar de nuevo</button>'+
    '</div></div>';
}, 15000);

window.__salirDelCodigo = async function(){
  esperandoCodigo = false;
  try { await sb.auth.signOut(); } catch(e){ /* igual recargamos */ }
  location.reload();
};

function pedirCodigo(){
  return new Promise(function(listo){
    sb.auth.mfa.listFactors().then(function(r){
      var f = ((r.data && r.data.totp) || []).filter(function(x){ return x.status === 'verified'; })[0];
      if(!f){ esperandoCodigo = false; return listo(true); }

      esperandoCodigo = true;
      pantallaCodigo();

      window.__verificarEntrada = async function(){
        var e = document.getElementById('mfaEntrada');
        var codigo = (e ? String(e.value) : '').replace(/[^0-9]/g,'');
        var err = document.getElementById('mfaError');

        if(codigo.length !== 6){
          if(err) err.textContent = 'Son seis números.';
          return;
        }

        cargando(true, 'Verificando…');
        var v = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: codigo });
        cargando(false);

        if(v.error){
          pantallaCodigo('Código incorrecto o vencido. Probá con el que aparece ahora.');
          return;
        }

        esperandoCodigo = false;
        listo(true);
      };
    }).catch(function(){
      /* Si no se puede averiguar, no dejamos a nadie encerrado */
      esperandoCodigo = false;
      listo(true);
    });
  });
}

async function exigirSegundoPaso(){
  var s = await sb.auth.getSession();
  if(!s.data || !s.data.session) return;
  if(await nivelResuelto()) return;

  await pedirCodigo();
  /* Con la sesión ya en el segundo nivel, los datos que antes vinieron
     vacíos ahora sí vienen completos. */
  if(typeof arrancar === 'function') await arrancar();
}
window.exigirSegundoPaso = exigirSegundoPaso;

/* Al ingresar con usuario y contraseña */
var loginPrevio = window.loginAdmin;
if(typeof loginPrevio === 'function'){
  window.loginAdmin = async function(){
    await loginPrevio();
    await exigirSegundoPaso();
  };
}

/* ═══════════════════════════════════════════════════════════════
   4. ENGANCHE CON LA SECCIÓN DE MOVIMIENTOS
   ═══════════════════════════════════════════════════════════════ */

if(typeof SECCIONES !== 'undefined' && SECCIONES.auditoria){
  var auditoriaPrevia = SECCIONES.auditoria.f;
  SECCIONES.auditoria.f = function(){
    var base = auditoriaPrevia();
    if(!perfil || !perfil.es_dueno) return base;
    if(!S.cargado){
      cargarFactores().then(function(){ if(typeof render === 'function') render(); });
      return base;
    }
    /* La tarjeta de seguridad va primero: es lo más importante de la pantalla. */
    return base.replace('<div style="max-width:1020px">',
      '<div style="max-width:1020px">' + vistaSeguridad());
  };
}

(async function arranqueSeguridad(){
  try {
    var s = await sb.auth.getSession();
    if(!s.data || !s.data.session) return;
    await cargarFactores();
    await exigirSegundoPaso();
    if(typeof render === 'function') render();
  } catch(e){ /* el panel sigue igual */ }
})();

})();

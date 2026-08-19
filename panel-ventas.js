/* BivonaCars — cierre de venta con permuta, y contacto reservado.

   Se carga después de panel-crm.js y corrige tres cosas:

   1. La permuta no es un descuento. Si vendés en 30.000 y tomás un usado
      en 10.000, la comisión sale igual de los 30.000 — el trabajo de
      vender fue el mismo. Antes había un solo campo "precio final" y de
      ahí salía todo, así que al cargar los 20.000 que se transfieren la
      comisión se calculaba mal para todos.

   2. Había dos caminos distintos para cerrar una venta (desde el catálogo
      y desde señas) y se pisaban entre ellos: los dos definían una función
      con el mismo nombre. Ahora hay uno solo.

   3. El desplegable de comisionistas listaba a cualquiera con cuenta,
      administradores incluidos. Ahora lista solo comisionistas aprobados.

   Y suma la reserva del contacto del prospecto hasta que haya seña. */

(function(){
'use strict';

/* ─────────────────── Utilidades ─────────────────── */
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function num(id){ var v = Number(val(id)); return isFinite(v) ? v : 0; }
function chk(id){ var e = document.getElementById(id); return !!(e && e.checked); }
function usd(n){ return 'USD ' + Math.round(Number(n)||0).toLocaleString('es-AR'); }
function hoy(){ return new Date().toISOString().slice(0,10); }
function puedo(c){ return !!(perfil && (perfil.es_dueno || (perfil.permisos||[]).indexOf(c) >= 0)); }

/* ═══════════════════════════════════════════════════════════════
   1. QUIÉN PUEDE FIGURAR COMO COMISIONISTA

   Un administrador no cobra comisión: cobra sueldo o es el dueño.
   Ponerlo en esta lista era lo que después descuadraba el reparto.
   ═══════════════════════════════════════════════════════════════ */
function comisionistas(){
  return (D.perfiles || []).filter(function(p){
    return p.rol === 'comisionista' && p.estado_verificacion === 'aprobado';
  }).sort(function(a,b){
    return (a.nombre||'').localeCompare(b.nombre||'');
  });
}

function opcionesComisionistas(elegido){
  var lista = comisionistas();
  if(!lista.length){
    return '<option value="">— todavía no tenés comisionistas aprobados —</option>';
  }
  return '<option value="">— venta directa, sin comisionista —</option>' +
    lista.map(function(p){
      return '<option value="'+esc(p.id)+'" '+(elegido === p.id ? 'selected' : '')+'>'+
        esc(nombreDe(p)) + ' · ' + esc(p.nivel || '') + '</option>';
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   2. UN SOLO CIERRE DE VENTA
   ═══════════════════════════════════════════════════════════════ */

var cierre = null;   /* { vehiculo, reserva, cliente } */

function vehiculoDe(id){
  for(var i=0;i<(D.vehiculos||[]).length;i++)
    if(D.vehiculos[i].id === id) return D.vehiculos[i];
  return null;
}

/* Desde el catálogo: no hay seña previa */
window.cerrarVenta = async function(vehiculoId){
  var v = vehiculoDe(vehiculoId);
  if(!v) return toast('No encuentro ese vehículo','error');

  cargando(true,'Buscando la seña…');
  /* Puede haber una reserva activa aunque hayas entrado por el catálogo */
  var r = await sb.from('reservas').select('*')
    .eq('vehiculo_id', vehiculoId).eq('estado','activa')
    .order('id',{ascending:false}).limit(1);
  cargando(false);

  var reserva = (r.data && r.data[0]) || null;
  abrirCierre(v, reserva);
};

/* Desde la pantalla de señas */
window.cerrarConReserva = async function(reservaId){
  cargando(true,'Cargando la operación…');
  var r = await sb.from('reservas').select('*').eq('id', reservaId).maybeSingle();
  cargando(false);
  if(r.error || !r.data) return toast('No encuentro esa seña','error');

  var v = vehiculoDe(r.data.vehiculo_id);
  if(!v) return toast('No encuentro el vehículo de esa seña','error');
  abrirCierre(v, r.data);
};

async function abrirCierre(v, reserva){
  var cliente = null, permuta = null;

  if(reserva){
    if(reserva.cliente_id){
      var c = await sb.from('clientes').select('*').eq('id', reserva.cliente_id).maybeSingle();
      cliente = c.data || null;
    }
    var pm = await sb.from('permutas').select('*').eq('reserva_id', reserva.id).maybeSingle();
    permuta = pm.data || null;
  }

  cierre = { vehiculo: v, reserva: reserva, cliente: cliente, permuta: permuta };

  var pactado  = (reserva && reserva.precio_acordado) || v.precio || 0;
  var tomado   = (permuta && (permuta.valor_tomado || permuta.tasacion)) || 0;
  var hayPerm  = !!(permuta || (reserva && reserva.incluye_permuta));
  var sena     = (reserva && reserva.monto_sena) || 0;

  modal('Cerrar la venta de ' + esc(v.marca + ' ' + v.modelo + ' ' + (v.anio||'')),

    (cliente
      ? '<div class="note g" style="margin-bottom:14px">Comprador: <b>'+
        esc((cliente.nombre||'') + ' ' + (cliente.apellido||''))+'</b>'+
        (sena ? ' · Seña ya cobrada: <b>'+usd(sena)+'</b>' : '')+'</div>'
      : '')+

    '<div class="fld"><label>Precio pactado del vehículo (USD) <span style="color:#DC2626">*</span></label>'+
      '<input id="cvPactado" type="number" value="'+esc(pactado)+'" oninput="bcRecalcular()">'+
      '<div class="mini" style="margin-top:4px">Es el precio que acordaron por el auto, '+
      'antes de restar nada. De este número sale la comisión.</div></div>'+

    '<label class="chk" style="margin:14px 0 4px"><input type="checkbox" id="cvHayPermuta" '+
      (hayPerm?'checked':'')+' onchange="bcRecalcular()">'+
      '<span>El comprador entrega un vehículo en parte de pago</span></label>'+

    '<div id="cvBloquePermuta" style="display:'+(hayPerm?'block':'none')+';'+
      'background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:14px">'+

      '<div class="fld"><label>Al usado se lo toma en (USD)</label>'+
        '<input id="cvPermutaValor" type="number" value="'+esc(tomado||'')+'" '+
        'placeholder="10000" oninput="bcRecalcular()"></div>'+

      '<div class="fld"><label>¿Quién se queda ese usado?</label>'+
        '<select id="cvPermutaDestino" onchange="bcRecalcular()">'+
          '<option value="vendedor">El dueño del vehículo que estoy vendiendo</option>'+
          '<option value="agencia">BivonaCars — me lo quedo yo</option>'+
        '</select>'+
        '<div class="mini" style="margin-top:4px">Si se lo queda el dueño, vos no ponés un peso: '+
        'él recibe menos efectivo y sabe que igual te paga el 5% del precio pactado. '+
        'Si te lo quedás vos, le transferís la diferencia de tu bolsillo y el usado pasa a ser '+
        'mercadería tuya.</div></div>'+

      '<div id="cvBloqueDesembolso" style="display:none">'+
        '<div class="fld"><label>Lo que ponés de tu bolsillo (USD)</label>'+
          '<input id="cvDesembolso" type="number" placeholder="10000" oninput="bcRecalcular()">'+
          '<div class="mini" style="margin-top:4px">Normalmente es igual al valor del usado. '+
          'Cambialo si arreglaste otra cosa.</div></div>'+

        /* Qué auto es. Sin esto el usado entraba al stock como "Usado a
           completar" y a los tres días nadie se acordaba de cuál era. */
        '<div style="font-weight:800;color:var(--navy);font-size:.85rem;margin:6px 0 8px">'+
          '¿Qué vehículo estás recibiendo?</div>'+
        '<div class="grid2">'+
          '<div class="fld"><label>Marca</label>'+
            '<input id="cvPermMarca" placeholder="Volkswagen"></div>'+
          '<div class="fld"><label>Modelo</label>'+
            '<input id="cvPermModelo" placeholder="Gol Trend"></div>'+
        '</div>'+
        '<div class="grid3">'+
          '<div class="fld"><label>Año</label>'+
            '<input id="cvPermAnio" type="number" placeholder="2013"></div>'+
          '<div class="fld"><label>Kilómetros</label>'+
            '<input id="cvPermKm" type="number" placeholder="120000"></div>'+
          '<div class="fld"><label>Patente</label>'+
            '<input id="cvPermPatente" placeholder="AB123CD"></div>'+
        '</div>'+
        '<div class="note" style="margin-bottom:4px">El usado entra al catálogo como '+
        '<b>borrador</b>: queda guardado como tuyo y con lo que te costó, pero no se publica '+
        'hasta que le completes los datos y le pongas precio de venta.</div>'+
      '</div>'+
    '</div>'+

    /* Resumen en vivo */
    '<div id="cvResumen" style="background:var(--navy);color:#fff;border-radius:10px;'+
      'padding:14px 16px;margin-bottom:16px;font-size:.86rem;line-height:1.85"></div>'+

    '<div class="grid2">'+
      '<div class="fld"><label>Comisionista que la trabajó</label>'+
        '<select id="cvCom">'+opcionesComisionistas(reserva && reserva.comisionista_id)+'</select></div>'+
      '<div class="fld"><label>Fecha de cierre</label>'+
        '<input id="cvFecha" type="date" value="'+hoy()+'"></div>'+
    '</div>'+

    '<div class="grid2">'+
      '<div class="fld"><label>Forma de pago del efectivo</label><select id="cvPago">'+
        ['Transferencia','Contado','Financiación','Mixto'].map(function(o){
          return '<option>'+o+'</option>'; }).join('')+'</select></div>'+
      '<div class="fld"><label>Nombre del comprador</label>'+
        '<input id="cvComprador" value="'+
        esc(cliente ? ((cliente.nombre||'')+' '+(cliente.apellido||'')).trim() : '')+
        '" placeholder="Nombre y apellido"></div>'+
    '</div>',

    [{txt:'Cancelar', clase:'btn-o', fn:'cerrarModal()'},
     {txt:'Confirmar la venta', clase:'', fn:'bcConfirmarVenta()'}]);

  setTimeout(bcRecalcular, 40);
}

/* Recalcula el resumen a medida que se escribe */
window.bcRecalcular = function(){
  var hay      = chk('cvHayPermuta');
  var bloque   = document.getElementById('cvBloquePermuta');
  if(bloque) bloque.style.display = hay ? 'block' : 'none';

  var destino  = val('cvPermutaDestino') || 'vendedor';
  var bloqueD  = document.getElementById('cvBloqueDesembolso');
  if(bloqueD) bloqueD.style.display = (hay && destino === 'agencia') ? 'block' : 'none';

  var pactado  = num('cvPactado');
  var permuta  = hay ? num('cvPermutaValor') : 0;
  var efectivo = Math.max(0, pactado - permuta);
  var comEmp   = Math.round(pactado * 0.03);
  var comVen   = Math.round(pactado * 0.02);
  var sena     = (cierre && cierre.reserva && cierre.reserva.monto_sena) || 0;

  var caja = document.getElementById('cvResumen');
  if(!caja) return;

  var filas = [
    ['Precio pactado',            usd(pactado), true],
    hay ? ['Usado tomado en',   '− ' + usd(permuta), false] : null,
    ['Efectivo del comprador',    usd(efectivo), true],
    sena ? ['Ya cobrado de seña','− ' + usd(sena), false] : null,
    sena ? ['Saldo a cobrar hoy', usd(Math.max(0, efectivo - sena)), true] : null
  ].filter(Boolean);

  var html = filas.map(function(f){
    return '<div style="display:flex;justify-content:space-between;gap:16px'+
      (f[2]?';font-weight:700':';opacity:.75')+'">'+
      '<span>'+f[0]+'</span><span>'+f[1]+'</span></div>';
  }).join('');

  html += '<div style="border-top:1px solid rgba(255,255,255,.2);margin:9px 0 7px"></div>'+
    '<div style="display:flex;justify-content:space-between;gap:16px">'+
      '<span>Comisión BivonaCars (3%)</span><span style="font-weight:700">'+usd(comEmp)+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;gap:16px">'+
      '<span>Comisión del comisionista (2%)</span><span style="font-weight:700">'+usd(comVen)+'</span></div>';

  if(hay && val('cvPermutaDestino') === 'agencia'){
    var des = num('cvDesembolso') || permuta;
    html += '<div style="border-top:1px solid rgba(255,255,255,.2);margin:9px 0 7px"></div>'+
      '<div style="display:flex;justify-content:space-between;gap:16px;color:#FCA5A5">'+
        '<span>Sale de tu bolsillo</span><span style="font-weight:700">− '+usd(des)+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;gap:16px;color:#86EFAC">'+
        '<span>Entra a tu stock</span><span style="font-weight:700">1 unidad · '+usd(permuta)+'</span></div>';
  }

  if(hay && permuta > 0 && val('cvPermutaDestino') === 'vendedor'){
    html += '<div class="mini" style="color:#B9CBE4;margin-top:8px;font-size:.76rem;line-height:1.5">'+
      'El dueño del vehículo recibe '+usd(efectivo)+' en efectivo más el usado, '+
      'y de ahí te paga los '+usd(comEmp + comVen)+' de comisión.</div>';
  }

  caja.innerHTML = html;
};

window.bcConfirmarVenta = async function(){
  if(!cierre) return;

  var pactado = num('cvPactado');
  if(!(pactado > 0)) return toast('Poné el precio pactado del vehículo','error');

  var hay      = chk('cvHayPermuta');
  var permuta  = hay ? num('cvPermutaValor') : 0;
  var destino  = hay && permuta > 0 ? (val('cvPermutaDestino') || 'vendedor') : null;
  var desemb   = destino === 'agencia' ? (num('cvDesembolso') || permuta) : 0;

  if(hay && !(permuta > 0))
    return toast('Poné en cuánto tomás el usado, o destildá la permuta','error');
  if(permuta > pactado)
    return toast('El usado no puede valer más que el precio pactado','error');

  var comprador = val('cvComprador') ||
    (cierre.cliente ? ((cierre.cliente.nombre||'')+' '+(cierre.cliente.apellido||'')).trim() : '') ||
    'Sin registrar';

  cargando(true,'Cerrando la venta…');

  /* El usado viaja junto con la venta, en una sola operación. Antes se
     cerraba la venta y después se intentaba ingresar el usado por
     separado: si ese segundo paso fallaba, la venta ya estaba hecha y el
     auto que habías pagado no existía en ningún lado. Ahora entra o no
     entra junto con todo lo demás. */
  var res = await sb.rpc('concretar_venta', {
    p_vehiculo_id:    cierre.vehiculo.id,
    p_usuario_id:     val('cvCom') || null,
    p_precio:         pactado,
    p_comprador:      comprador,
    p_fecha:          val('cvFecha') || hoy(),
    p_hash:           (cierre.reserva && cierre.reserva.recibo_nro) || null,
    p_cliente_id:     (cierre.reserva && cierre.reserva.cliente_id) || null,
    p_reserva_id:     (cierre.reserva && cierre.reserva.id) || null,
    p_forma_pago:     val('cvPago'),
    p_permuta_valor:  permuta,
    p_permuta_destino: destino,
    p_desembolso:     desemb,
    p_permuta_marca:   destino === 'agencia' ? (val('cvPermMarca')  || null) : null,
    p_permuta_modelo:  destino === 'agencia' ? (val('cvPermModelo') || null) : null,
    p_permuta_anio:    destino === 'agencia' ? (num('cvPermAnio')   || null) : null,
    p_permuta_km:      destino === 'agencia' ? (num('cvPermKm')     || null) : null,
    p_permuta_patente: destino === 'agencia' ? (val('cvPermPatente')|| null) : null
  });

  if(res.error){ cargando(false); return toast(mensajeError(res.error),'error'); }

  cargando(false);
  cerrarModal();
  if(typeof cargarTodo === 'function') await cargarTodo();
  if(typeof cargarCrm === 'function') await cargarCrm();
  if(typeof render === 'function') render();

  toast('Venta cerrada. Comisión calculada sobre '+usd(pactado)+'.','ok');
  if(res.data && typeof imprimirBoleto === 'function')
    setTimeout(function(){ imprimirBoleto(res.data); }, 400);
};

/* ═══════════════════════════════════════════════════════════════
   3. EL CONTACTO DEL PROSPECTO QUEDA RESERVADO

   Un comisionista no va a cargar a su gente en el sistema si eso
   significa entregar la agenda. Así que mientras la persona no haya
   señado, el teléfono y el mail no aparecen en pantalla, y el día que
   alguien los abre queda anotado en el historial de esa ficha — que el
   comisionista ve desde su cuenta.

   Sin vueltas: esto no es una caja fuerte. Quien administra la base
   siempre puede leerla. Lo que da es que no esté a la vista todos los
   días y que cada consulta deje rastro.
   ═══════════════════════════════════════════════════════════════ */

var contactos = {};   /* los que se destaparon en esta sesión */

function reservado(c){
  if(!c || !perfil) return false;
  if(contactos[c.id]) return false;                 /* ya se destapó */
  if(c.comisionista_id === perfil.id) return false; /* es tuyo */
  if(!c.comisionista_id) return false;              /* no lo trajo nadie */
  return c.etapa !== 'comprado' && c.etapa !== 'reservado';
}

/* Los datos se tapan antes de que lleguen a la pantalla */
try {
  var fromPrevio = sb.from.bind(sb);
  sb.from = function(tabla){
    var q = fromPrevio(tabla);
    if(tabla !== 'clientes' || !q || typeof q.then !== 'function') return q;

    var thenPrevio = q.then.bind(q);
    q.then = function(ok, err){
      return thenPrevio(function(res){
        try {
          if(res && res.data && res.data.length){
            res.data.forEach(function(c){
              if(reservado(c)){
                c._reservado = true;
                c.tel = null; c.tel2 = null; c.email = null;
              }
            });
          }
        } catch(e){ /* si algo falla, se muestra como antes */ }
        return ok ? ok(res) : res;
      }, err);
    };
    return q;
  };
} catch(e){ /* el panel sigue funcionando igual */ }

window.verContacto = async function(id){
  cargando(true,'Abriendo el contacto…');
  var r = await sb.rpc('revelar_contacto', { p_cliente_id: id });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');

  var d = (r.data && r.data[0]) || {};
  contactos[id] = d;

  modal('Datos de contacto',
    '<div class="note w" style="margin-bottom:14px">Quedó anotado en el historial de esta '+
    'ficha que abriste el contacto, y el comisionista que lo trajo recibió el aviso.</div>'+
    '<div style="font-size:1rem;line-height:2">'+
      (d.tel   ? '<div><b>Teléfono:</b> '+esc(d.tel)+'</div>'   : '')+
      (d.tel2  ? '<div><b>Otro:</b> '+esc(d.tel2)+'</div>'      : '')+
      (d.email ? '<div><b>Correo:</b> '+esc(d.email)+'</div>'   : '')+
      (!d.tel && !d.email ? '<div class="mini">No tiene datos de contacto cargados.</div>' : '')+
    '</div>',
    [{txt:'Cerrar', clase:'btn-o', fn:'cerrarModal()'}]);

  if(typeof cargarCrm === 'function') await cargarCrm();
  if(typeof render === 'function') render();
};

/* En la ficha del cliente, un cartel en vez del teléfono en blanco */
var verClientePrevio = window.verCliente;
if(typeof verClientePrevio === 'function'){
  window.verCliente = function(id){
    verClientePrevio(id);
    setTimeout(function(){
      var cuerpo = document.querySelector('#modalOvl .mod-b');
      if(!cuerpo || contactos[id]) return;
      if(cuerpo.querySelector('.avisoReservado')) return;

      /* Solo si quedó tapado: la ficha no muestra ningún teléfono */
      if(cuerpo.innerHTML.indexOf('Teléfono') >= 0) return;

      var aviso = document.createElement('div');
      aviso.className = 'note w avisoReservado';
      aviso.style.cssText = 'margin-bottom:14px;display:flex;justify-content:space-between;' +
        'align-items:center;gap:12px;flex-wrap:wrap';
      aviso.innerHTML = '<span><b>Contacto reservado.</b> Lo trajo un comisionista y todavía '+
        'no señó. Si lo abrís, queda anotado y él se entera.</span>'+
        '<button class="btn btn-sm" onclick="verContacto('+id+')">Ver contacto</button>';
      cuerpo.insertBefore(aviso, cuerpo.firstChild);
    }, 60);
  };
}

/* En el listado, "sin contacto" es confuso: no es que no tenga */
if(typeof SECCIONES !== 'undefined' && SECCIONES.clientes){
  var clientesPrevio = SECCIONES.clientes.f;
  SECCIONES.clientes.f = function(){
    return clientesPrevio().replace(/sin contacto/g, '🔒 reservado');
  };
}

})();

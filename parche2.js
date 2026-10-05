/* BivonaCars — sitio del comisionista: herramientas de venta.
   Se carga después de parche.js. Suma: compartir por WhatsApp, ficha
   imprimible, cartola de comisiones, carga de interesados propios,
   avisos, favoritos y los textos legales. */

(function(){
'use strict';

var BASE  = 'https://qymqfjtistprotddoqkz.supabase.co';
var FOTOS = BASE + '/storage/v1/object/public/vehiculos/';

var P = { comisiones:[], avisos:[], mios:[], legales:[], aceptadas:[] };

/* Se pone en true sólo cuando la lectura de `aceptaciones` salió bien.
   Una lectura fallida no es lo mismo que "no aceptó nada": si se tratara
   igual, el porton le volveria a pedir todo a alguien que ya aceptó. */
var aceptadasCargadas = false;
var favoritos = [];
try { favoritos = JSON.parse(localStorage.getItem('bc_favoritos') || '[]'); } catch(e){ favoritos = []; }

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function chk(id){ var e = document.getElementById(id); return !!(e && e.checked); }
function usd(n){ return 'USD ' + Math.round(Number(n)||0).toLocaleString('es-AR'); }
function dia(f){ if(!f) return '—';
  return new Date(f + (String(f).length<=10?'T12:00:00':'')).toLocaleDateString('es-AR'); }
function hoy(){ return new Date().toISOString().slice(0,10); }
function soloTel(t){ return String(t||'').replace(/[^0-9]/g,''); }
function vehDe(id){
  for(var i=0;i<vehiculos.length;i++) if(vehiculos[i].id === id) return vehiculos[i];
  return null;
}

/* ═══════════ Compartir el auto ═══════════ */

function textoDelAuto(v){
  var l = [];
  l.push('🚗 *' + v.marca + ' ' + v.modelo + (v.version ? ' ' + v.version : '') + '*');
  if(v.anio) l.push('Año ' + v.anio);
  if(v.km) l.push(Number(v.km).toLocaleString('es-AR') + ' km');
  if(v.combustible) l.push(v.combustible);
  if(v.transmision) l.push(v.transmision);
  var ficha = l.slice(1).join(' · ');

  var t = l[0] + '\n' + ficha + '\n\n';
  t += '💵 *' + usd(v.precio) + '*\n';
  if(v.ubicacion) t += '📍 ' + v.ubicacion + '\n';
  if(v.estado_general) t += '✅ Estado ' + v.estado_general.toLowerCase() + '\n';

  var extras = [];
  if(v.unico_dueno) extras.push('único dueño');
  if(v.service_al_dia) extras.push('service al día');
  if(!v.deuda_patentes && !v.deuda_infracciones) extras.push('sin deudas');
  if(v.acepta_permuta) extras.push('acepta permuta');
  if(v.acepta_financiacion) extras.push('acepta financiación');
  if(extras.length) t += '\n' + extras.join(' · ') + '\n';

  if(v.descripcion) t += '\n' + v.descripcion + '\n';
  t += '\nEscribime y coordinamos para verlo.';
  return t;
}

window.compartirAuto = function(id){
  var v = vehDe(id); if(!v) return;
  var texto = textoDelAuto(v);

  if(navigator.share){
    navigator.share({ title: v.marca+' '+v.modelo, text: texto })
      .catch(function(){ abrirWhatsApp(texto); });
  } else {
    abrirWhatsApp(texto);
  }
};
function abrirWhatsApp(texto){
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
}

window.copiarAuto = function(id){
  var v = vehDe(id); if(!v) return;
  var t = textoDelAuto(v).replace(/\*/g,'');
  if(navigator.clipboard){
    navigator.clipboard.writeText(t)
      .then(function(){ toast('Descripción copiada. Pegala donde quieras.','ok'); })
      .catch(function(){ toast('No se pudo copiar','error'); });
  }
};

window.fichaImprimible = function(id){
  var v = vehDe(id); if(!v) return;
  var fs = (typeof fotosDe === 'function') ? [] : [];
  var w = window.open('', '_blank', 'width=820,height=980');
  if(!w) return toast('Tu navegador bloqueó la ventana. Permitila y probá de nuevo.','error');

  var equipo = (v.equipamiento||[]).map(esc).join(' · ');
  w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'+
    '<title>'+esc(v.marca+' '+v.modelo)+'</title><style>'+
    'body{font:13px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#111;margin:0;padding:34px 40px;max-width:820px}'+
    '.m{font-size:11px;letter-spacing:2px;color:#1665D8;font-weight:800;text-transform:uppercase}'+
    'h1{font-size:23px;margin:2px 0 4px;color:#0A2540}'+
    '.sub{color:#666;font-size:13px;margin-bottom:14px}'+
    '.precio{font-size:27px;font-weight:800;color:#0A2540;margin:12px 0}'+
    'hr{border:0;border-top:2px solid #0A2540;margin:12px 0 18px}'+
    'table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #eee}'+
    'td.e{width:180px;color:#666}h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:#0A2540;margin:20px 0 6px}'+
    '.chico{font-size:10.5px;color:#777;margin-top:26px;line-height:1.5}'+
    '@media print{body{padding:18px}.noimp{display:none}}'+
    '.noimp{margin-top:26px;text-align:center}'+
    '.noimp button{font:600 13px system-ui;padding:9px 22px;background:#1665D8;color:#fff;border:0;border-radius:6px;cursor:pointer}'+
    '</style></head><body>'+
    '<div class="m">BivonaCars</div>'+
    '<h1>'+esc(v.marca+' '+v.modelo)+'</h1>'+
    '<div class="sub">'+esc([v.version, v.anio, (v.km||0).toLocaleString('es-AR')+' km',
      v.combustible, v.transmision].filter(Boolean).join(' · '))+'</div>'+
    '<div class="precio">'+usd(v.precio)+'</div>'+
    '<hr>'+
    '<table>'+
    ['Año|'+(v.anio||'—'), 'Kilómetros|'+(v.km||0).toLocaleString('es-AR')+' km',
     'Motor|'+(v.motor||'—'), 'Combustible|'+(v.combustible||'—'),
     'Transmisión|'+(v.transmision||'—'), 'Tracción|'+(v.traccion||'—'),
     'Color|'+(v.color||'—'), 'Estado general|'+(v.estado_general||'—'),
     'Ubicación|'+(v.ubicacion||'—'),
     'Service al día|'+(v.service_al_dia?'Sí':'No'),
     'Acepta permuta|'+(v.acepta_permuta?'Sí':'No')].map(function(x){
      var p = x.split('|');
      return '<tr><td class="e">'+p[0]+'</td><td><b>'+esc(p[1])+'</b></td></tr>';
    }).join('')+'</table>'+
    (v.descripcion?'<h2>Descripción</h2><p>'+esc(v.descripcion)+'</p>':'')+
    (equipo?'<h2>Equipamiento</h2><p>'+equipo+'</p>':'')+
    '<div class="chico">Precio sujeto a confirmación. La unidad puede retirarse de la venta sin previo aviso. '+
    'Documentación disponible para verificar antes de señar.</div>'+
    '<div class="noimp"><button onclick="window.print()">Imprimir o guardar en PDF</button></div>'+
    '</body></html>');
  w.document.close();
};

/* ═══════════ Favoritos ═══════════ */

window.marcarFavorito = function(id, ev){
  if(ev) ev.stopPropagation();
  var i = favoritos.indexOf(id);
  if(i >= 0) favoritos.splice(i,1); else favoritos.push(id);
  try { localStorage.setItem('bc_favoritos', JSON.stringify(favoritos)); } catch(e){}
  render();
};

/* ═══════════ Mis interesados ═══════════ */

window.vInteresados = function(){
  var pend = P.mios.filter(function(c){
    return c.proximo_contacto && c.proximo_contacto <= hoy() &&
           c.etapa !== 'comprado' && c.etapa !== 'perdido'; });

  var ET = { nuevo:'Sin contactar', contactado:'Contactado', interesado:'Interesado',
    negociando:'Negociando', reservado:'Señó', comprado:'Compró', perdido:'Se perdió' };

  return '<div class="wrap">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">'+
      '<div><h2 class="sec">Mis interesados</h2>'+
      '<p class="sub" style="margin:0">La gente que te preguntó por un auto. Anotalos y no se te escapa ninguno.</p></div>'+
      '<button class="btn btn-sm" onclick="nuevoInteresado()">+ Cargar interesado</button>'+
    '</div>'+

    (pend.length
      ? '<div class="note w" style="margin-bottom:18px"><b>Tenés '+pend.length+' persona'+
        (pend.length>1?'s':'')+' para volver a contactar.</b> '+
        pend.slice(0,3).map(function(c){ return esc(c.nombre); }).join(', ')+
        (pend.length>3?' y más.':'.')+'</div>'
      : '')+

    (P.mios.length
      ? '<div style="display:grid;gap:11px">'+
        P.mios.map(function(c){
          var atrasado = c.proximo_contacto && c.proximo_contacto <= hoy() &&
                         c.etapa !== 'comprado' && c.etapa !== 'perdido';
          return '<div class="card"><div class="card-b" style="padding:15px 17px">'+
            '<div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
              '<div style="flex:1;min-width:190px">'+
                '<b style="color:var(--navy)">'+esc(c.nombre+' '+(c.apellido||''))+'</b>'+
                '<div class="mini" style="margin-top:2px">'+esc(c.tel||c.email||'')+
                (c.busca?' · busca '+esc(c.busca):'')+'</div>'+
                (c.proximo_contacto
                  ? '<div class="mini" style="margin-top:3px'+(atrasado?';color:#DC2626;font-weight:700':'')+'">'+
                    (atrasado?'⏰ Tenías que llamarlo el ':'Volver a contactar el ')+dia(c.proximo_contacto)+'</div>'
                  : '')+
              '</div>'+
              '<div style="text-align:right">'+
                '<span class="pill p-blue" style="font-size:.72rem">'+(ET[c.etapa]||c.etapa)+'</span>'+
                '<div style="margin-top:7px;display:flex;gap:6px">'+
                (c.tel?'<a class="btn btn-o btn-sm" href="https://wa.me/54'+soloTel(c.tel)+'" target="_blank">WhatsApp</a>':'')+
                '<button class="btn btn-sm" onclick="anotarMio('+c.id+')">Anotar</button>'+
                '</div></div>'+
            '</div></div></div>';
        }).join('')+'</div>'
      : '<div class="card"><div class="card-b" style="text-align:center;padding:52px 20px">'+
        '<div style="font-size:2.6rem;margin-bottom:10px">📋</div>'+
        '<b style="color:var(--navy)">Todavía no cargaste a nadie</b>'+
        '<div class="mini" style="margin-top:6px;max-width:420px;margin-left:auto;margin-right:auto">'+
        'Cada persona que te pregunta por un auto vale plata. Si la anotás acá, el sistema te recuerda '+
        'cuándo volver a llamarla. La mayoría de las ventas se cierran en el segundo o tercer contacto, '+
        'no en el primero.</div>'+
        '<button class="btn btn-sm" style="margin-top:16px" onclick="nuevoInteresado()">+ Cargar el primero</button>'+
        '</div></div>')+
    '</div>';
};

window.nuevoInteresado = function(){
  var en2 = new Date(); en2.setDate(en2.getDate()+2);
  modal('Cargar un interesado',
    '<div class="grid2">'+
      '<div class="fld"><label>Nombre <span style="color:#DC2626">*</span></label><input id="inNombre"></div>'+
      '<div class="fld"><label>Apellido</label><input id="inApellido"></div>'+
    '</div><div class="grid2">'+
      '<div class="fld"><label>Teléfono <span style="color:#DC2626">*</span></label>'+
        '<input id="inTel" placeholder="11 5555 5555"></div>'+
      '<div class="fld"><label>Correo</label><input id="inEmail" type="email"></div>'+
    '</div>'+
    '<div class="fld"><label>Vehículo por el que pregunta</label><select id="inVeh">'+
      '<option value="">— todavía no sabe —</option>'+
      vehiculos.map(function(v){
        return '<option value="'+v.id+'">'+esc(v.marca+' '+v.modelo+' '+(v.anio||''))+'</option>'; }).join('')+
    '</select></div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>O qué está buscando</label>'+
        '<input id="inBusca" placeholder="Camioneta 4x4 hasta 30.000"></div>'+
      '<div class="fld"><label>Hasta cuánto puede pagar (USD)</label><input id="inPres" type="number"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Cuándo lo volvés a contactar</label>'+
        '<input id="inProximo" type="date" value="'+en2.toISOString().slice(0,10)+'"></div>'+
      '<div class="fld"><label>Qué tan interesado está</label><select id="inTemp">'+
        '<option value="caliente">Muy interesado</option>'+
        '<option value="tibio" selected>Más o menos</option>'+
        '<option value="frio">Recién preguntó</option></select></div>'+
    '</div>'+
    '<div class="grid2" style="margin-bottom:10px">'+
      '<label class="chk"><input type="checkbox" id="inPermuta"><span>Entrega un usado</span></label>'+
      '<label class="chk"><input type="checkbox" id="inFinanc"><span>Necesita financiación</span></label>'+
    '</div>'+
    '<div class="fld"><label>Notas</label><textarea id="inNotas" rows="2" '+
      'placeholder="Lo llamé, le interesa pero quiere verlo el sábado."></textarea></div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarInteresado()'}]);
};

window.guardarInteresado = async function(){
  var nombre = val('inNombre'), tel = val('inTel');
  if(!nombre) return toast('Poné el nombre','error');
  if(!tel && !val('inEmail')) return toast('Necesitás un teléfono o un correo','error');

  cargando(true,'Guardando…');
  var r = await sb.from('clientes').insert({
    nombre: nombre, apellido: val('inApellido')||null, tel: tel||null,
    email: val('inEmail')||null,
    vehiculo_interes_id: val('inVeh') ? Number(val('inVeh')) : null,
    busca: val('inBusca')||null,
    presupuesto_max: Number(val('inPres'))||null,
    proximo_contacto: val('inProximo')||null,
    temperatura: val('inTemp'),
    tiene_permuta: chk('inPermuta'), necesita_financiacion: chk('inFinanc'),
    notas: val('inNotas')||null,
    origen: 'Comisionista', etapa: 'contactado',
    comisionista_id: perfil.id, creado_por: perfil.id
  });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarMios(); render();
  toast('Interesado cargado. Te aviso cuando toque volver a llamarlo.','ok');
};

window.anotarMio = function(id){
  var c = P.mios.filter(function(x){ return x.id === id; })[0];
  if(!c) return;
  var en2 = new Date(); en2.setDate(en2.getDate()+2);
  modal('Anotar contacto con '+esc(c.nombre),
    '<div class="fld"><label>Qué pasó <span style="color:#DC2626">*</span></label>'+
      '<textarea id="amDetalle" rows="3"></textarea></div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>En qué quedó</label><select id="amEtapa">'+
        ['nuevo','contactado','interesado','negociando','perdido'].map(function(e){
          return '<option value="'+e+'" '+(c.etapa===e?'selected':'')+'>'+
            ({nuevo:'Sin contactar',contactado:'Contactado',interesado:'Interesado',
              negociando:'Negociando',perdido:'Se perdió'})[e]+'</option>'; }).join('')+
      '</select></div>'+
      '<div class="fld"><label>Volver a llamarlo el</label>'+
        '<input id="amProximo" type="date" value="'+en2.toISOString().slice(0,10)+'"></div>'+
    '</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarAnotacionMia('+id+')'}]);
};

window.guardarAnotacionMia = async function(id){
  var detalle = val('amDetalle');
  if(!detalle) return toast('Contá qué pasó','error');
  cargando(true,'Guardando…');
  var a = await sb.from('interacciones').insert({
    cliente_id: id, tipo:'llamada', detalle: detalle, usuario_id: perfil.id });
  if(a.error){ cargando(false); return toast(mensajeError(a.error),'error'); }
  var b = await sb.from('clientes').update({
    etapa: val('amEtapa'), proximo_contacto: val('amProximo')||null }).eq('id', id);
  cargando(false);
  if(b.error) return toast(mensajeError(b.error),'error');
  cerrarModal(); await cargarMios(); render();
  toast('Anotado','ok');
};

/* ═══════════ Mi plata ═══════════ */

window.vMisComisiones = function(){
  var pend = P.comisiones.filter(function(c){ return c.estado === 'pendiente'; });
  var pag  = P.comisiones.filter(function(c){ return c.estado === 'pagada'; });
  var tp = pend.reduce(function(s,c){ return s + Number(c.monto_usd||0); }, 0);
  var tc = pag.reduce(function(s,c){ return s + Number(c.monto_usd||0); }, 0);

  return '<div class="wrap">'+
    '<h2 class="sec">Mis comisiones</h2>'+
    '<p class="sub">Todo lo que ganaste, lo que ya cobraste y lo que te queda por cobrar.</p>'+

    '<div class="kpis" style="margin:18px 0">'+
      '<div class="kpi a"><div class="lb">Por cobrar</div><div class="vl">'+usd(tp)+'</div>'+
        '<div class="df">'+pend.length+' operación'+(pend.length===1?'':'es')+'</div></div>'+
      '<div class="kpi g"><div class="lb">Ya cobrado</div><div class="vl">'+usd(tc)+'</div>'+
        '<div class="df">'+pag.length+' liquidación'+(pag.length===1?'':'es')+'</div></div>'+
      '<div class="kpi"><div class="lb">Total ganado</div><div class="vl">'+usd(tp+tc)+'</div>'+
        '<div class="df">desde que empezaste</div></div>'+
    '</div>'+

    (P.comisiones.length
      ? '<div class="card"><div class="card-b">'+
        '<table><thead><tr><th>Operación</th><th>Comisión</th><th>Estado</th><th>Cobrada el</th></tr></thead><tbody>'+
        P.comisiones.map(function(c){
          return '<tr><td class="mini">'+dia(String(c.creado_en).slice(0,10))+'</td>'+
            '<td><b>'+usd(c.monto_usd)+'</b></td>'+
            '<td>'+(c.estado==='pagada'
              ? '<span class="pill p-green">Cobrada</span>'
              : '<span class="pill p-amber">Pendiente</span>')+'</td>'+
            '<td>'+(c.fecha_pago?dia(c.fecha_pago):'—')+'</td></tr>';
        }).join('')+'</tbody></table></div></div>'
      : '<div class="card"><div class="card-b" style="text-align:center;padding:50px 20px">'+
        '<div style="font-size:2.4rem;margin-bottom:8px">💵</div>'+
        '<b style="color:var(--navy)">Todavía no cerraste ninguna venta</b>'+
        '<div class="mini" style="margin-top:5px">Cuando cierres la primera, la comisión aparece acá automáticamente.</div>'+
        '</div></div>')+

    (pend.length
      ? '<div class="note w" style="margin-top:18px"><b>Para cobrar necesitás facturar.</b> '+
        'Emitir la factura por el monto de tu comisión es lo que habilita el pago. '+
        'Si tenés dudas de cómo hacerla, escribinos.</div>'
      : '')+
    '</div>';
};

/* ═══════════ Legales ═══════════ */

/* Huella del texto exacto que se aceptó.
   La fecha y el número de versión solos no prueban QUÉ se aceptó: si el
   cuerpo de un documento cambiara sin que nadie suba la versión, todas las
   aceptaciones anteriores pasarían a decir, sin aviso, que se aceptó el
   texto nuevo. Guardando la huella eso se puede comprobar: si el documento
   que está hoy en la base no da la misma huella, no es el que se aceptó.
   (Del lado de la base hay además un disparador que congela un documento
   en cuanto alguien lo aceptó, así que la huella es el segundo control, no
   el único.)
   Si el navegador no tiene crypto.subtle devuelve null, y quien llama
   guarda el cuerpo completo en su lugar: la columna hash_cuerpo y la
   columna texto_aceptado no pueden ser las dos nulas. */
async function huellaTexto(t){
  try {
    if(!(window.crypto && window.crypto.subtle)) return null;
    var datos = new TextEncoder().encode(String(t));
    var h = await window.crypto.subtle.digest('SHA-256', datos);
    return Array.prototype.map.call(new Uint8Array(h), function(x){
      return ('0' + x.toString(16)).slice(-2); }).join('');
  } catch(e){ return null; }
}

window.verLegal = function(clave){
  var d = docsAceptables().filter(function(x){ return x.clave === clave; })[0];
  if(!d) return toast('No pude cargar el documento','error');
  modal(esc(d.titulo),
    '<div style="font-size:.87rem;line-height:1.65;max-height:60vh;overflow-y:auto;padding-right:6px">'+
      d.cuerpo + '</div>',
    [{txt:'Cerrar',clase:'',fn:'cerrarModal()'}]);
};

/* Las condiciones del alta son el cuarto documento del porton, y no viven en
   documentos_legales: viven en el codigo (condicionesAlta(), publica.js),
   porque sus numeros --el cupo, los dias de penalizacion-- se resuelven al
   mostrarse. Se las envuelve con la misma forma que un documento legal para
   que el porton las trate igual, en vez de tener dos caminos que con el
   tiempo se desincronizan.

   Por que hace falta: el alta escribe la fila de aceptacion, pero si esa
   escritura falla el usuario ve el aviso y NADIE se lo vuelve a pedir, porque
   el porton solo recorria documentos_legales. Y los perfiles anteriores a
   octubre de 2026 tildaron las cuatro condiciones sin que se guardara nada.
   En los dos casos lo que falta es la prueba, no la voluntad, y la forma de
   recuperarla es volver a preguntar --no rellenarla por ellos, que seria
   fabricarla. */
function docCondicionesAlta(){
  if(typeof condicionesAlta !== 'function') return null;
  if(typeof textoCondicionesAlta !== 'function') return null;
  if(typeof CONDICIONES_ALTA_VERSION === 'undefined') return null;
  var items;
  try { items = condicionesAlta(); } catch(e){ return null; }
  if(!items || !items.length) return null;
  return { clave:'condiciones_alta', version:CONDICIONES_ALTA_VERSION,
           titulo:'Condiciones del acuerdo',
           cuerpo:'<ol style="padding-left:20px;display:grid;gap:10px;margin:0">'+
             items.map(function(c){ return '<li>'+c[2]+'</li>'; }).join('')+'</ol>',
           items:items, enCodigo:true };
}

/* Todo lo que hay que aceptar: los documentos vigentes de la base, mas las
   condiciones del alta. */
function docsAceptables(){
  var lista = P.legales.slice();
  var alta = docCondicionesAlta();
  if(alta) lista.push(alta);
  return lista;
}

function pendientesDeAceptar(){
  return docsAceptables().filter(function(d){
    return !P.aceptadas.filter(function(a){
      return a.clave === d.clave && a.version === d.version; }).length;
  });
}

function faltaAceptar(){
  if(!perfil || perfil.rol === 'admin') return null;
  if(!aceptadasCargadas) return null;
  return pendientesDeAceptar()[0] || null;
}

/* El estilo de la tilde se escribe acá y no en una clase: `.chk` nunca tuvo
   regla de CSS en ningún archivo, así que las tildes de esta pantalla venían
   saliendo sin formato. Es el mismo estilo que usa el paso 4 del registro,
   a propósito: lo que se vuelve a pedir tiene que verse como lo que se
   pidió la primera vez. */
var ESTILO_TILDE = 'display:flex;gap:10px;align-items:flex-start;padding:12px;'+
  'background:var(--bg);border:1px solid var(--line);border-radius:9px;'+
  'cursor:pointer;font-size:.83rem;line-height:1.55';

/* Las condiciones del alta se muestran enteras y con una tilde cada una,
   igual que en el registro. Una sola tilde para las cuatro sería una prueba
   más débil que la que pide el alta, y el porton existe justamente para que
   no haya dos niveles de prueba para lo mismo. */
function bloqueCondicionesAlta(d){
  return '<div class="card"><div class="card-b" style="padding:16px 18px">'+
    '<b style="color:var(--navy)">'+esc(d.titulo)+'</b>'+
    '<div class="mini">versión '+esc(d.version)+'</div>'+
    '<div style="display:grid;gap:8px;margin-top:13px">'+
    d.items.map(function(c,n){
      return '<label style="'+ESTILO_TILDE+'">'+
        '<input type="checkbox" id="ac_condiciones_alta_'+(n+1)+'" '+
          'style="width:17px;height:17px;accent-color:var(--blue);flex-shrink:0;margin-top:1px">'+
        '<span>'+c[2]+'</span></label>';
    }).join('')+'</div>'+
  '</div></div>';
}

function vAceptarLegales(){
  var pendientes = pendientesDeAceptar();

  return '<div class="wrap" style="max-width:760px">'+
    '<h2 class="sec">Antes de empezar</h2>'+
    '<p class="sub">Necesitamos que leas y aceptes esto. Es lo que deja claro cómo trabajamos, '+
    'cuánto cobrás y qué hacemos con tus datos. Queda guardado con la fecha '+
    '<b>y el texto exacto</b> que estás aceptando, así siempre se puede saber qué decía.</p>'+

    '<div style="display:grid;gap:11px;margin:20px 0">'+
    pendientes.map(function(d){
      if(d.enCodigo) return bloqueCondicionesAlta(d);
      return '<div class="card"><div class="card-b" style="padding:16px 18px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">'+
          '<div><b style="color:var(--navy)">'+esc(d.titulo)+'</b>'+
          '<div class="mini">versión '+esc(d.version)+'</div></div>'+
          '<button class="btn btn-o btn-sm" onclick="verLegal(\''+esc(d.clave)+'\')">Leer</button>'+
        '</div>'+
        '<label style="'+ESTILO_TILDE+';margin-top:12px">'+
          '<input type="checkbox" id="ac_'+esc(d.clave)+'" '+
            'style="width:17px;height:17px;accent-color:var(--blue);flex-shrink:0;margin-top:1px">'+
        '<span>Leí y acepto '+esc(d.titulo.toLowerCase())+'</span></label>'+
      '</div></div>';
    }).join('')+'</div>'+

    '<button class="btn btn-block" onclick="confirmarLegales()">Aceptar y continuar</button>'+
    '<div style="text-align:center;margin-top:14px">'+
      '<a onclick="salir()" style="cursor:pointer;font-size:.82rem;color:var(--gray);font-weight:600">Cerrar sesión</a></div>'+
    '</div>';
}

window.confirmarLegales = async function(){
  var pendientes = pendientesDeAceptar();
  for(var i=0;i<pendientes.length;i++){
    var p = pendientes[i];
    if(p.enCodigo){
      for(var k=0;k<p.items.length;k++)
        if(!chk('ac_condiciones_alta_' + (k+1)))
          return toast('Tenés que aceptar las cuatro condiciones del acuerdo','error');
    } else if(!chk('ac_' + p.clave)){
      return toast('Falta aceptar: ' + p.titulo, 'error');
    }
  }

  cargando(true,'Guardando…');
  var filas = [];
  for(var j=0;j<pendientes.length;j++){
    var d = pendientes[j];
    if(d.enCodigo){
      /* Acá se archiva el TEXTO y no la huella, y es a propósito: el cuerpo de
         un documento legal está en la base, así que una huella se puede
         comprobar contra él; las condiciones del alta viven en el código y se
         reemplazan en cada despliegue, así que una huella sola no tendría
         contra qué compararse. Se guarda el texto ya resuelto --con el cupo y
         los días que leyó-- y con la misma forma que escribe el alta, para que
         las dos filas sean indistinguibles. */
      filas.push({ usuario_id: perfil.id, clave: d.clave, version: d.version,
                   navegador: String(navigator.userAgent).slice(0,180),
                   hash_cuerpo: null,
                   texto_aceptado: textoCondicionesAlta() });
      continue;
    }
    var h = await huellaTexto(d.cuerpo);
    filas.push({ usuario_id: perfil.id, clave: d.clave, version: d.version,
                 navegador: String(navigator.userAgent).slice(0,180),
                 hash_cuerpo: h,
                 texto_aceptado: h ? null : d.cuerpo });
  }
  var r = await sb.from('aceptaciones').insert(filas);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  await cargarLegales(); render();
  toast('Listo. Ya podés trabajar.','ok');
};

/* ═══════════ Avisos ═══════════ */

window.verAvisosComi = function(){
  modal('Avisos',
    P.avisos.length
      ? P.avisos.map(function(n){
          var d = new Date(n.creado_en);
          return '<div style="padding:11px 0;border-bottom:1px solid var(--line);'+(n.leida?'opacity:.55':'')+'">'+
            '<b style="font-size:.88rem">'+esc(n.titulo)+'</b>'+
            (n.cuerpo?'<div style="font-size:.84rem;line-height:1.5;margin-top:2px">'+esc(n.cuerpo)+'</div>':'')+
            '<div class="mini">'+d.toLocaleDateString('es-AR')+'</div></div>';
        }).join('')
      : '<div class="mini">No tenés avisos.</div>',
    [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Marcar leídos',clase:'',fn:'leerAvisos()'}]);
};

window.leerAvisos = async function(){
  await sb.from('notificaciones').update({ leida:true })
    .eq('usuario_id', perfil.id).eq('leida', false);
  cerrarModal(); await cargarAvisos(); render();
};

/* ═══════════ Carga de datos ═══════════ */

async function cargarMios(){
  if(!perfil) return;
  var r = await sb.from('clientes').select('*')
    .eq('comisionista_id', perfil.id).order('proximo_contacto',{ascending:true});
  P.mios = r.data || [];
}
async function cargarComisiones(){
  if(!perfil) return;
  var r = await sb.from('pagos_comision').select('*')
    .eq('usuario_id', perfil.id).order('creado_en',{ascending:false});
  P.comisiones = r.data || [];
}
async function cargarAvisos(){
  if(!perfil) return;
  var r = await sb.from('notificaciones').select('*')
    .order('creado_en',{ascending:false}).limit(30);
  P.avisos = r.data || [];
}
async function cargarLegales(){
  var a = await sb.from('documentos_legales').select('*').eq('vigente', true);
  P.legales = a.data || [];
  if(perfil){
    var b = await sb.from('aceptaciones').select('*').eq('usuario_id', perfil.id);
    P.aceptadas = b.data || [];
    aceptadasCargadas = !b.error;
  }
}

async function cargarTodoLoMio(){
  try {
    await Promise.all([cargarMios(), cargarComisiones(), cargarAvisos(), cargarLegales()]);
  } catch(e){ /* la web sigue andando */ }
}

/* ═══════════ Enganche con la web existente ═══════════ */

/* Botones de venta dentro de la ficha del vehículo */
var verVehiculoPrevio = window.verVehiculo;
window.verVehiculo = function(id){
  verVehiculoPrevio(id);
  setTimeout(function(){
    var pie = document.querySelector('.modal-foot, .mfoot, .modal .acciones');
    if(!pie) pie = document.querySelector('.modal-box > div:last-child');
    if(!pie || document.getElementById('barraCompartir')) return;
    var barra = document.createElement('div');
    barra.id = 'barraCompartir';
    barra.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;padding:12px 0 0;border-top:1px solid var(--line);margin-top:14px';
    barra.innerHTML =
      '<button class="btn btn-sm" onclick="compartirAuto('+id+')">Enviar por WhatsApp</button>'+
      '<button class="btn btn-o btn-sm" onclick="copiarAuto('+id+')">Copiar descripción</button>'+
      '<button class="btn btn-o btn-sm" onclick="fichaImprimible('+id+')">Ficha imprimible</button>';
    pie.parentNode.insertBefore(barra, pie);
  }, 60);
};

/* El pie legal ya está escrito en index.html; esto solo lo agrega si
   por alguna razón no estuviera (por ejemplo, en una versión vieja). */
function pintarPieLegal(){
  if(document.querySelector('footer') || document.getElementById('pieLegal')) return;
  var p = document.createElement('div');
  p.id = 'pieLegal';
  p.style.cssText = 'padding:26px 20px 30px;text-align:center;border-top:1px solid var(--line);'+
    'margin-top:40px;font-size:.78rem;color:var(--gray)';
  p.innerHTML = '<b style="color:var(--navy)">BivonaCars</b> · '+
    '<a onclick="verLegal(\'terminos\')" style="cursor:pointer;color:var(--blue);font-weight:600">Términos y condiciones</a> · '+
    '<a onclick="verLegal(\'privacidad\')" style="cursor:pointer;color:var(--blue);font-weight:600">Política de privacidad</a> · '+
    '<a onclick="verLegal(\'contrato\')" style="cursor:pointer;color:var(--blue);font-weight:600">Acuerdo de colaboración</a>';
  document.body.appendChild(p);
}

/* Accesos nuevos: barra propia arriba del contenido, así no depende
   de cómo esté armada la navegación original. */
function pintarAccesos(){
  var vieja = document.getElementById('accesosNuevos');
  if(vieja) vieja.remove();
  if(!perfil || perfil.rol === 'admin') return;
  if(vista === 'registro' || vista === 'login') return;
  var app = document.getElementById('app');
  if(!app) return;

  var pend = P.mios.filter(function(c){
    return c.proximo_contacto && c.proximo_contacto <= hoy() &&
           c.etapa !== 'comprado' && c.etapa !== 'perdido'; }).length;
  var sinLeer = P.avisos.filter(function(a){ return !a.leida; }).length;
  var porCobrar = P.comisiones.filter(function(c){ return c.estado === 'pendiente'; })
    .reduce(function(s,c){ return s + Number(c.monto_usd||0); }, 0);

  function pastilla(n){
    return n ? '<span style="background:#DC2626;color:#fff;font-size:.62rem;font-weight:800;'+
      'padding:1px 6px;border-radius:9px;margin-left:5px">'+n+'</span>' : '';
  }

  var d = document.createElement('div');
  d.id = 'accesosNuevos';
  d.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;'+
    'max-width:1180px;margin:0 auto;padding:14px 20px 0';
  d.innerHTML =
    '<button class="btn '+(vista==='catalogo'?'':'btn-o')+' btn-sm" onclick="vista=\'catalogo\';render()">Catálogo</button>'+
    '<button class="btn '+(vista==='interesados'?'':'btn-o')+' btn-sm" onclick="vista=\'interesados\';render()">'+
      'Mis interesados'+pastilla(pend)+'</button>'+
    '<button class="btn '+(vista==='comisiones'?'':'btn-o')+' btn-sm" onclick="vista=\'comisiones\';render()">'+
      'Mi plata'+(porCobrar?' · '+usd(porCobrar):'')+'</button>'+
    '<div style="flex:1"></div>'+
    '<button class="btn btn-o btn-sm" onclick="verAvisosComi()">🔔'+pastilla(sinLeer)+'</button>';
  app.parentNode.insertBefore(d, app);
}

var renderPrevio2 = window.render;
window.render = function(){
  /* Antes de nada: si falta aceptar algo, no se avanza.
     Ya no se pide `P.legales.length`: esa guarda estaba para no encerrar a
     nadie si fallaba la lectura de documentos_legales, pero también hacía
     que las condiciones del alta --que viven en el código y siempre están--
     no se pidieran nunca. El resguardo real es `aceptadasCargadas`, que
     distingue "no aceptó" de "no se pudo leer qué aceptó". */
  if(perfil && perfil.rol !== 'admin' && faltaAceptar()){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vAceptarLegales();
    return;
  }

  if(vista === 'interesados'){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vInteresados();
    pintarPieLegal();
    return;
  }
  if(vista === 'comisiones'){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vMisComisiones();
    pintarPieLegal();
    return;
  }

  renderPrevio2();
  pintarPieLegal();
  pintarAccesos();
  agregarBotonesDeTarjeta();
};

/* Botones rápidos en cada tarjeta del catálogo */
function agregarBotonesDeTarjeta(){
  if(vista !== 'catalogo' && vista !== 'panel') return;
  setTimeout(function(){
    var tarjetas = document.querySelectorAll('#app .card');
    for(var i=0;i<tarjetas.length;i++){
      var t = tarjetas[i];
      if(t.querySelector('.accWa')) continue;
      var b = t.querySelector('button[onclick^="verVehiculo("]');
      if(!b) continue;
      var m = /verVehiculo\((\d+)\)/.exec(b.getAttribute('onclick'));
      if(!m) continue;
      var id = m[1];
      var cont = b.parentNode;
      var wa = document.createElement('button');
      wa.className = 'btn btn-o btn-sm accWa';
      wa.style.cssText = 'flex:0 0 auto;padding:7px 10px';
      wa.title = 'Enviar por WhatsApp';
      wa.textContent = '↗';
      wa.setAttribute('onclick', 'event.stopPropagation();compartirAuto('+id+')');
      cont.appendChild(wa);
    }
  }, 40);
}

var cargarTodoPrevio2 = window.cargarTodo;
window.cargarTodo = async function(){
  await cargarTodoPrevio2();
  await cargarTodoLoMio();
};

(async function arranque(){
  try {
    await cargarLegales();
    if(perfil) await cargarTodoLoMio();
    if(typeof render === 'function') render();
  } catch(e){ /* sigue */ }
})();

})();

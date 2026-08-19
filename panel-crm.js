/* BivonaCars — Panel: clientes, señas, stock, papeleo y control interno.
   Se carga después de parche-panel.js. Todo lo que hay acá es nuevo:
   la cartera de compradores, las reservas con seña, el stock editable,
   el trámite de transferencia, las comisiones a pagar y la auditoría. */

(function(){
'use strict';

var BASE  = 'https://qymqfjtistprotddoqkz.supabase.co';
var FOTOS = BASE + '/storage/v1/object/public/vehiculos/';

/* Datos que maneja este archivo */
var C = { clientes:[], interacciones:[], reservas:[], cobros:[], transferencias:[],
          comisiones:[], notificaciones:[], internos:{}, fotos:{}, permutas:[],
          precios:[], auditoria:[] };

var clienteAbierto = null, vehiculoEditando = null, filtroCli = { texto:'', etapa:'', mias:false };

/* ─────────────────── Utilidades ─────────────────── */
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function num(id){ var v = Number(val(id)); return isFinite(v) && val(id) !== '' ? v : null; }
function chk(id){ var e = document.getElementById(id); return !!(e && e.checked); }
function usd(n){ return 'USD ' + Math.round(Number(n)||0).toLocaleString('es-AR'); }
function ars(n){ return '$ '   + Math.round(Number(n)||0).toLocaleString('es-AR'); }
function plata(m, n){ return (m === 'ARS' ? ars(n) : usd(n)); }

/* La cotización de Configuración. La publica parche-panel.js al cargarla,
   porque este archivo tiene su propio cierre y no ve aquel "config". */
function cotizacionDeReferencia(){ return Number(window.cotizacionDolar) || 0; }

/* Cambiar de moneda convierte el precio ya escrito en vez de obligar a
   recalcularlo a mano. */
window.cambiarMonedaEdicion = function(){
  var e = document.getElementById('evMoneda');
  if(!e) return;
  var nueva  = e.value === 'ARS' ? 'ARS' : 'USD';
  var previa = e.getAttribute('data-previa') || 'USD';
  e.setAttribute('data-previa', nueva);
  if(nueva === previa) return;

  var cot = Number(val('evCotiz')) || cotizacionDeReferencia();
  var p   = Number(val('evPrecio'));
  if(!(cot > 0)) return toast('Falta la cotización del dólar para convertir','error');
  if(!(p > 0)) return;

  var campo = document.getElementById('evPrecio');
  if(campo) campo.value = Math.round(nueva === 'ARS' ? p * cot : p / cot);
  var campoC = document.getElementById('evCotiz');
  if(campoC && !campoC.value) campoC.value = cot;
  toast('Precio convertido a ' + nueva + ' con cotización ' + cot, 'ok');
};
function dia(f){ if(!f) return '—'; var d = new Date(f + (String(f).length<=10?'T12:00:00':''));
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function hoy(){ return new Date().toISOString().slice(0,10); }
function diasDesde(f){ if(!f) return 0;
  return Math.floor((Date.now() - new Date(f).getTime()) / 86400000); }
function puedo(c){ return !!(perfil && (perfil.es_dueno || (perfil.permisos||[]).indexOf(c) >= 0)); }
function soloTel(t){ return String(t||'').replace(/[^0-9]/g,''); }

function tarjeta(titulo, extra, cuerpo){
  return '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>'+titulo+'</h3>'+
    (extra||'')+'</div><div class="card-b">'+cuerpo+'</div></div>';
}
function sinPermiso(area){
  return '<div class="note r"><b>No tenés acceso a esta sección.</b> '+
    'Pedile al dueño del negocio que te habilite el permiso de '+area+'.</div>';
}
function campo(et, id, tipo, extra, obl){
  return '<div class="fld"><label>'+et+(obl?' <span style="color:#DC2626">*</span>':'')+'</label>'+
    '<input id="'+id+'" type="'+(tipo||'text')+'" '+(extra||'')+'></div>';
}
function selec(et, id, ops, actual){
  return '<div class="fld"><label>'+et+'</label><select id="'+id+'">'+
    ops.map(function(o){
      return '<option value="'+esc(o)+'" '+(String(actual)===String(o)?'selected':'')+'>'+esc(o||'—')+'</option>';
    }).join('')+'</select></div>';
}
function tilde(et, id, marcado){
  return '<label class="chk"><input type="checkbox" id="'+id+'" '+(marcado?'checked':'')+'><span>'+et+'</span></label>';
}
function fila(et, v){
  if(v === null || v === undefined || v === '' || v === false) return '';
  return '<div style="display:flex;justify-content:space-between;gap:14px;padding:6px 0;border-bottom:1px solid var(--line)">'+
    '<span style="color:var(--gray);font-size:.82rem">'+et+'</span>'+
    '<b style="font-size:.84rem;text-align:right">'+esc(v)+'</b></div>';
}

/* ═══════════════════════════════════════════════════════════════
   1. CLIENTES Y PROSPECTOS
   ═══════════════════════════════════════════════════════════════ */

var ETAPAS = ['nuevo','contactado','interesado','negociando','reservado','comprado','perdido'];
var ETAPA_TXT = { nuevo:'Sin contactar', contactado:'Contactado', interesado:'Interesado',
  negociando:'Negociando', reservado:'Señó', comprado:'Compró', perdido:'Se perdió' };
var ETAPA_COLOR = { nuevo:'p-red', contactado:'p-blue', interesado:'p-blue',
  negociando:'p-amber', reservado:'p-green', comprado:'p-green', perdido:'' };
var TEMP_TXT = { frio:'❄ Frío', tibio:'● Tibio', caliente:'🔥 Caliente' };
var ORIGENES = ['Comisionista','Instagram','TikTok','Facebook','WhatsApp','Referido',
                'Vino al local','Llamado','Cartelería','Otro'];

function activos(){ return C.clientes.filter(function(c){
  return c.etapa !== 'comprado' && c.etapa !== 'perdido'; }); }

function vencidos(){ return activos().filter(function(c){
  return c.proximo_contacto && c.proximo_contacto <= hoy(); }); }

function vehiculoDe(id){
  for(var i=0;i<D.vehiculos.length;i++) if(D.vehiculos[i].id === id) return D.vehiculos[i];
  return null;
}
function nombreVeh(id){
  var v = vehiculoDe(id);
  return v ? (v.marca+' '+v.modelo+(v.anio?' '+v.anio:'')) : '—';
}

function vistaClientes(){
  if(!puedo('clientes') && !puedo('cerrar_ventas')) return sinPermiso('clientes y prospectos');

  var esProspecto = filtroCli.tab !== 'clientes';
  var base = C.clientes.filter(function(c){
    return esProspecto ? c.tipo === 'prospecto' : c.tipo === 'cliente';
  });

  if(filtroCli.mias) base = base.filter(function(c){ return c.comisionista_id === perfil.id; });
  if(filtroCli.etapa) base = base.filter(function(c){ return c.etapa === filtroCli.etapa; });
  if(filtroCli.texto){
    var q = filtroCli.texto.toLowerCase();
    base = base.filter(function(c){
      return ((c.nombre||'')+' '+(c.apellido||'')+' '+(c.tel||'')+' '+(c.email||'')+' '+(c.busca||''))
        .toLowerCase().indexOf(q) >= 0;
    });
  }

  base.sort(function(a,b){
    var av = a.proximo_contacto || '9999', bv = b.proximo_contacto || '9999';
    return av < bv ? -1 : av > bv ? 1 : 0;
  });

  var porEtapa = {};
  ETAPAS.forEach(function(e){ porEtapa[e] = C.clientes.filter(function(c){ return c.etapa === e; }).length; });
  var atrasados = vencidos();
  var deHoy = activos().filter(function(c){ return c.proximo_contacto === hoy(); });

  return '<div style="max-width:1180px">'+

  '<div class="kpis" style="margin-bottom:18px">'+
    '<div class="kpi"><div class="lb">En seguimiento</div><div class="vl">'+activos().length+'</div>'+
      '<div class="df">'+C.clientes.length+' contactos en total</div></div>'+
    '<div class="kpi '+(atrasados.length?'':'g')+'"><div class="lb">Para llamar hoy</div>'+
      '<div class="vl">'+(atrasados.length + deHoy.length - deHoy.filter(function(c){
        return atrasados.indexOf(c)>=0; }).length)+'</div>'+
      '<div class="df '+(atrasados.length?'n':'')+'">'+
      (atrasados.length ? atrasados.length+' con fecha vencida' : 'al día')+'</div></div>'+
    '<div class="kpi a"><div class="lb">Negociando</div><div class="vl">'+porEtapa.negociando+'</div>'+
      '<div class="df">'+porEtapa.reservado+' con seña puesta</div></div>'+
    '<div class="kpi g"><div class="lb">Cerrados</div><div class="vl">'+porEtapa.comprado+'</div>'+
      '<div class="df">'+porEtapa.perdido+' perdidos</div></div>'+
  '</div>'+

  /* Embudo */
  tarjeta('Embudo de venta','',
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
    ETAPAS.filter(function(e){ return e !== 'perdido'; }).map(function(e,i,arr){
      var n = porEtapa[e], max = Math.max.apply(null, arr.map(function(x){ return porEtapa[x]; })) || 1;
      return '<div onclick="filtrarEtapa(\''+e+'\')" style="flex:1;min-width:96px;cursor:pointer;'+
        'background:var(--bg);border:1px solid '+(filtroCli.etapa===e?'var(--blue)':'var(--line)')+';'+
        'border-radius:10px;padding:11px 12px">'+
        '<div style="font-size:1.5rem;font-weight:800;color:var(--navy);line-height:1">'+n+'</div>'+
        '<div class="mini" style="margin-top:3px">'+ETAPA_TXT[e]+'</div>'+
        '<div style="height:4px;background:var(--line);border-radius:3px;margin-top:7px">'+
        '<i style="display:block;height:100%;border-radius:3px;background:var(--blue);width:'+
        Math.round((n/max)*100)+'%"></i></div></div>';
    }).join('')+'</div>'+
    (filtroCli.etapa?'<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="filtrarEtapa(\'\')">Ver todas las etapas</button></div>':''))+

  /* Pendientes de llamar */
  (atrasados.length
    ? tarjeta('⏰ Te comprometiste a llamarlos y ya pasó la fecha','',
        atrasados.slice(0,8).map(function(c){
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line)">'+
            '<div><b>'+esc(c.nombre+' '+(c.apellido||''))+'</b>'+
            '<div class="mini">'+esc(c.busca || nombreVeh(c.vehiculo_interes_id))+' · '+
            'debías llamarlo el '+dia(c.proximo_contacto)+'</div></div>'+
            '<div style="display:flex;gap:6px">'+
            (c.tel?'<a class="btn btn-o btn-sm" href="https://wa.me/54'+soloTel(c.tel)+'" target="_blank">WhatsApp</a>':'')+
            '<button class="btn btn-sm" onclick="verCliente('+c.id+')">Abrir</button></div></div>';
        }).join(''))
    : '')+

  /* Las dos partes */
  '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">'+
    '<button class="btn '+(esProspecto?'':'btn-o')+' btn-sm" onclick="tabClientes(\'prospectos\')">'+
      'Prospectos ('+C.clientes.filter(function(c){return c.tipo==='prospecto';}).length+')</button>'+
    '<button class="btn '+(esProspecto?'btn-o':'')+' btn-sm" onclick="tabClientes(\'clientes\')">'+
      'Clientes ('+C.clientes.filter(function(c){return c.tipo==='cliente';}).length+')</button>'+
    '<div style="flex:1"></div>'+
    '<button class="btn btn-sm" onclick="nuevoCliente()">+ Cargar contacto</button>'+
  '</div>'+

  '<div class="filters" style="margin-bottom:14px">'+
    '<input placeholder="Buscar por nombre, teléfono, mail o lo que busca…" value="'+esc(filtroCli.texto)+'" '+
      'oninput="filtroCli.texto=this.value;render()">'+
    '<label class="chk" style="margin:0"><input type="checkbox" '+(filtroCli.mias?'checked':'')+
      ' onchange="filtroCli.mias=this.checked;render()"><span>Solo los míos</span></label>'+
  '</div>'+

  (base.length
    ? '<div class="tbl-wrap"><div class="tbl-scroll"><table><thead><tr>'+
      '<th>Contacto</th><th>Etapa</th><th>Interés</th><th>Presupuesto</th>'+
      '<th>Próximo paso</th><th>Trae</th><th></th></tr></thead><tbody>'+
      base.map(function(c){
        var atrasado = c.proximo_contacto && c.proximo_contacto < hoy() &&
                       c.etapa !== 'comprado' && c.etapa !== 'perdido';
        return '<tr>'+
          '<td><b>'+esc(c.nombre+' '+(c.apellido||''))+'</b>'+
            '<div class="mini">'+esc(c.tel||c.email||'sin contacto')+
            (c.origen?' · '+esc(c.origen):'')+'</div></td>'+
          '<td><span class="pill '+(ETAPA_COLOR[c.etapa]||'')+'">'+ETAPA_TXT[c.etapa]+'</span>'+
            '<div class="mini">'+(TEMP_TXT[c.temperatura]||'')+'</div></td>'+
          '<td>'+esc(c.vehiculo_interes_id ? nombreVeh(c.vehiculo_interes_id) : (c.busca||'—'))+'</td>'+
          '<td>'+(c.presupuesto_max ? usd(c.presupuesto_max) : '<span class="mini">—</span>')+'</td>'+
          '<td'+(atrasado?' style="color:#DC2626;font-weight:700"':'')+'>'+
            (c.proximo_contacto ? dia(c.proximo_contacto) : '<span class="mini">sin agendar</span>')+'</td>'+
          '<td>'+(c.tiene_permuta?'<span class="pill p-amber" style="font-size:.68rem">permuta</span> ':'')+
            (c.necesita_financiacion?'<span class="pill p-blue" style="font-size:.68rem">financia</span>':'')+'</td>'+
          '<td style="white-space:nowrap">'+
            (c.tel?'<a class="btn btn-o btn-sm" href="https://wa.me/54'+soloTel(c.tel)+'" target="_blank">WA</a> ':'')+
            '<button class="btn btn-sm" onclick="verCliente('+c.id+')">Abrir</button></td>'+
        '</tr>';
      }).join('')+'</tbody></table></div></div>'
    : '<div class="card"><div class="card-b" style="text-align:center;padding:48px 20px">'+
      '<div style="font-size:2.4rem;margin-bottom:8px">👥</div>'+
      '<b style="color:var(--navy)">'+(esProspecto?'Todavía no cargaste ningún prospecto':'Todavía no hay clientes')+'</b>'+
      '<div class="mini" style="margin-top:5px">Cada persona que pregunta por un auto va acá. '+
      'Es lo que después te dice qué se está por cerrar y a quién hay que llamar.</div>'+
      '<button class="btn btn-sm" style="margin-top:14px" onclick="nuevoCliente()">+ Cargar el primero</button>'+
      '</div></div>')+
  '</div>';
}

window.tabClientes  = function(t){ filtroCli.tab = t; render(); };
window.filtrarEtapa = function(e){ filtroCli.etapa = (filtroCli.etapa === e ? '' : e); render(); };

/* ── Ficha completa del contacto ───────────────────────────────── */
window.verCliente = function(id){
  var c = C.clientes.filter(function(x){ return x.id === id; })[0];
  if(!c) return;
  clienteAbierto = id;

  var hist = C.interacciones.filter(function(i){ return i.cliente_id === id; })
    .sort(function(a,b){ return a.fecha < b.fecha ? 1 : -1; });

  var res = C.reservas.filter(function(r){ return r.cliente_id === id; });
  var tel = soloTel(c.tel);

  modal(esc(c.nombre+' '+(c.apellido||'')) +
    ' <span class="pill '+(ETAPA_COLOR[c.etapa]||'')+'" style="font-size:.7rem;vertical-align:middle">'+
    ETAPA_TXT[c.etapa]+'</span>',

    '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px">'+
      (tel?'<a class="btn btn-sm" href="https://wa.me/54'+tel+'" target="_blank">WhatsApp</a>':'')+
      (tel?'<a class="btn btn-o btn-sm" href="tel:'+esc(c.tel)+'">Llamar</a>':'')+
      '<button class="btn btn-o btn-sm" onclick="anotarContacto('+id+')">Anotar contacto</button>'+
      '<button class="btn btn-o btn-sm" onclick="editarCliente('+id+')">Editar datos</button>'+
      (puedo('cerrar_ventas')||puedo('clientes')
        ? '<button class="btn btn-sm" onclick="cerrarModal();tomarSena(null,'+id+')">Tomar seña</button>' : '')+
    '</div>'+

    '<div class="grid2" style="gap:0 22px">'+
      '<div>'+
        '<div style="font-weight:800;color:var(--navy);font-size:.88rem;margin-bottom:4px">Contacto</div>'+
        fila('Teléfono', c.tel)+ fila('Otro teléfono', c.tel2)+ fila('Correo', c.email)+
        fila('Documento', c.dni)+ fila('CUIT', c.cuit)+
        fila('Localidad', [c.localidad, c.provincia].filter(Boolean).join(', '))+
        fila('Domicilio', c.domicilio)+
      '</div>'+
      '<div>'+
        '<div style="font-weight:800;color:var(--navy);font-size:.88rem;margin-bottom:4px">La operación</div>'+
        fila('Qué busca', c.vehiculo_interes_id ? nombreVeh(c.vehiculo_interes_id) : c.busca)+
        fila('Presupuesto', c.presupuesto_max ? usd(c.presupuesto_min||0)+' a '+usd(c.presupuesto_max) : '')+
        fila('Cómo paga', c.forma_pago_prevista)+
        fila('Entrega un usado', c.tiene_permuta ? (c.permuta_detalle||'Sí') : '')+
        fila('Necesita financiación', c.necesita_financiacion ? 'Sí' : '')+
        fila('Temperatura', TEMP_TXT[c.temperatura])+
        fila('Llegó por', c.origen)+
        fila('Lo trajo', c.comisionista_id ? nombreDe(D.perfiles.filter(function(p){
          return p.id === c.comisionista_id; })[0]) : '')+
        fila('Último contacto', c.ultimo_contacto ? dia(c.ultimo_contacto) : '')+
        fila('Volver a llamar', c.proximo_contacto ? dia(c.proximo_contacto) : '')+
        (c.motivo_perdida ? fila('Por qué se perdió', c.motivo_perdida) : '')+
      '</div>'+
    '</div>'+

    (c.notas ? '<div style="margin-top:14px"><div style="font-weight:800;color:var(--navy);font-size:.88rem;margin-bottom:4px">Notas</div>'+
      '<div style="font-size:.85rem;line-height:1.55;white-space:pre-wrap">'+esc(c.notas)+'</div></div>' : '')+

    (res.length
      ? '<div style="margin-top:16px"><div style="font-weight:800;color:var(--navy);font-size:.88rem;margin-bottom:6px">Señas</div>'+
        res.map(function(r){
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">'+
            '<div><b style="font-size:.85rem">'+esc(nombreVeh(r.vehiculo_id))+'</b>'+
            '<div class="mini">'+plata(r.moneda,r.monto_sena)+' · '+esc(r.recibo_nro||'')+' · '+esc(r.estado)+'</div></div>'+
            '<button class="btn btn-o btn-sm" onclick="imprimirRecibo('+r.id+')">Recibo</button></div>';
        }).join('')+'</div>'
      : '')+

    '<div style="margin-top:18px"><div style="font-weight:800;color:var(--navy);font-size:.88rem;margin-bottom:8px">'+
      'Historial ('+hist.length+')</div>'+
    (hist.length
      ? '<div style="max-height:280px;overflow-y:auto;padding-right:4px">'+
        hist.map(function(i){
          var ic = { llamada:'📞', whatsapp:'💬', email:'✉', visita:'🚗', presencial:'🤝',
                     nota:'📝', oferta:'💵', sistema:'⚙' }[i.tipo] || '•';
          return '<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">'+
            '<div style="font-size:1rem;width:22px;flex-shrink:0">'+ic+'</div>'+
            '<div style="flex:1"><div style="font-size:.86rem;line-height:1.5">'+esc(i.detalle)+'</div>'+
            (i.monto_ofrecido?'<div style="font-size:.82rem;color:var(--green);font-weight:700">Ofreció '+usd(i.monto_ofrecido)+'</div>':'')+
            '<div class="mini">'+dia(String(i.fecha).slice(0,10))+
            (i.usuario_id?' · '+esc(nombreDe(D.perfiles.filter(function(p){return p.id===i.usuario_id;})[0])):'')+
            (i.resultado?' · '+esc(i.resultado):'')+'</div></div></div>';
        }).join('')+'</div>'
      : '<div class="mini">Todavía no hay contactos anotados.</div>')+
    '</div>',

    [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Anotar contacto',clase:'',fn:'anotarContacto('+id+')'}]);
};

/* ── Anotar un contacto ────────────────────────────────────────── */
window.anotarContacto = function(id){
  var c = C.clientes.filter(function(x){ return x.id === id; })[0];
  if(!c) return;
  var enUna = new Date(); enUna.setDate(enUna.getDate()+2);

  modal('Anotar contacto con '+esc(c.nombre),
    '<div class="grid2">'+
      selec('Cómo fue','icTipo',['llamada','whatsapp','email','visita','presencial','nota','oferta'],'llamada')+
      selec('Cómo quedó','icTemp',['caliente','tibio','frio'], c.temperatura)+
    '</div>'+
    '<div class="fld"><label>Qué pasó <span style="color:#DC2626">*</span></label>'+
      '<textarea id="icDetalle" rows="3" placeholder="Le mostré la Hilux, le gustó pero quiere pensarlo. Ofreció 34.000."></textarea></div>'+
    '<div class="grid2">'+
      campo('Si ofreció un precio (USD)','icMonto','number','placeholder="34000"')+
      selec('En qué etapa queda','icEtapa', ETAPAS, c.etapa)+
    '</div>'+
    '<div class="grid2">'+
      campo('Cuándo lo volvés a contactar','icProximo','date','value="'+enUna.toISOString().slice(0,10)+'"')+
      '<div class="fld"><label>Vehículo del que se habló</label><select id="icVeh">'+
        '<option value="">—</option>'+
        D.vehiculos.map(function(v){
          return '<option value="'+v.id+'" '+(c.vehiculo_interes_id===v.id?'selected':'')+'>'+
            esc(v.marca+' '+v.modelo+' '+(v.anio||''))+'</option>'; }).join('')+
      '</select></div>'+
    '</div>'+
    '<div class="mini">Si lo marcás como perdido te va a pedir el motivo. Saber por qué se cae una '+
    'operación vale tanto como saber por qué se cierra.</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarContacto('+id+')'}]);
};

window.guardarContacto = async function(id){
  var detalle = val('icDetalle');
  if(!detalle) return toast('Contá qué pasó en el contacto','error');
  var etapa = val('icEtapa'), motivo = null;

  if(etapa === 'perdido'){
    motivo = prompt('¿Por qué se perdió? (precio, se decidió por otro, no responde…)');
    if(motivo === null) return;
  }

  cargando(true,'Guardando…');
  var ins = await sb.from('interacciones').insert({
    cliente_id: id, tipo: val('icTipo'), detalle: detalle,
    monto_ofrecido: num('icMonto'),
    vehiculo_id: val('icVeh') ? Number(val('icVeh')) : null,
    usuario_id: perfil.id
  });
  if(ins.error){ cargando(false); return toast(mensajeError(ins.error),'error'); }

  var cambios = { etapa: etapa, temperatura: val('icTemp'),
                  proximo_contacto: val('icProximo') || null };
  if(val('icVeh')) cambios.vehiculo_interes_id = Number(val('icVeh'));
  if(motivo) cambios.motivo_perdida = motivo;

  var upd = await sb.from('clientes').update(cambios).eq('id', id);
  cargando(false);
  if(upd.error) return toast(mensajeError(upd.error),'error');

  cerrarModal(); await cargarCrm(); render();
  toast('Contacto anotado','ok');
};

/* ── Alta y edición del contacto ───────────────────────────────── */
window.nuevoCliente  = function(){ formCliente(null); };
window.editarCliente = function(id){
  formCliente(C.clientes.filter(function(x){ return x.id === id; })[0]);
};

function formCliente(c){
  c = c || {};
  var mios = D.perfiles.filter(function(p){ return p.rol === 'comisionista'; });

  modal(c.id ? 'Editar contacto' : 'Cargar un contacto nuevo',
    '<div class="grid3">'+
      '<div class="fld"><label>Nombre <span style="color:#DC2626">*</span></label>'+
        '<input id="clNombre" value="'+esc(c.nombre||'')+'"></div>'+
      '<div class="fld"><label>Apellido</label><input id="clApellido" value="'+esc(c.apellido||'')+'"></div>'+
      '<div class="fld"><label>Teléfono <span style="color:#DC2626">*</span></label>'+
        '<input id="clTel" value="'+esc(c.tel||'')+'" placeholder="11 5555 5555"></div>'+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Otro teléfono</label><input id="clTel2" value="'+esc(c.tel2||'')+'"></div>'+
      '<div class="fld"><label>Correo</label><input id="clEmail" type="email" value="'+esc(c.email||'')+'"></div>'+
      '<div class="fld"><label>Documento</label><input id="clDni" value="'+esc(c.dni||'')+'"></div>'+
    '</div><div class="grid3">'+
      '<div class="fld"><label>CUIT</label><input id="clCuit" value="'+esc(c.cuit||'')+'"></div>'+
      '<div class="fld"><label>Localidad</label><input id="clLocalidad" value="'+esc(c.localidad||'')+'"></div>'+
      '<div class="fld"><label>Provincia</label><input id="clProvincia" value="'+esc(c.provincia||'')+'"></div>'+
    '</div>'+
    '<div class="fld"><label>Domicilio</label><input id="clDomicilio" value="'+esc(c.domicilio||'')+'"></div>'+

    '<div style="font-weight:800;color:var(--navy);font-size:.9rem;margin:16px 0 8px">Qué está buscando</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Vehículo del catálogo</label><select id="clVeh"><option value="">— cualquiera —</option>'+
        D.vehiculos.map(function(v){
          return '<option value="'+v.id+'" '+(c.vehiculo_interes_id===v.id?'selected':'')+'>'+
            esc(v.marca+' '+v.modelo+' '+(v.anio||''))+'</option>'; }).join('')+'</select></div>'+
      '<div class="fld"><label>O descripción libre</label>'+
        '<input id="clBusca" value="'+esc(c.busca||'')+'" placeholder="Camioneta 4x4 diésel, hasta 2019"></div>'+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Presupuesto desde (USD)</label>'+
        '<input id="clPresMin" type="number" value="'+esc(c.presupuesto_min||'')+'"></div>'+
      '<div class="fld"><label>Presupuesto hasta (USD)</label>'+
        '<input id="clPresMax" type="number" value="'+esc(c.presupuesto_max||'')+'"></div>'+
      selec('Cómo va a pagar','clPago',['','Contado','Transferencia','Financiación','Permuta + efectivo','Mixto'], c.forma_pago_prevista)+
    '</div>'+
    '<div class="grid3" style="margin-bottom:10px">'+
      tilde('Entrega un usado','clPermuta', c.tiene_permuta)+
      tilde('Necesita financiación','clFinanc', c.necesita_financiacion)+
    '</div>'+
    '<div class="fld"><label>Qué usado entrega</label>'+
      '<input id="clPermutaDet" value="'+esc(c.permuta_detalle||'')+'" placeholder="Corolla 2015, 120.000 km"></div>'+

    '<div style="font-weight:800;color:var(--navy);font-size:.9rem;margin:16px 0 8px">Seguimiento</div>'+
    '<div class="grid3">'+
      selec('Cómo llegó','clOrigen', ORIGENES, c.origen)+
      selec('Temperatura','clTemp',['caliente','tibio','frio'], c.temperatura || 'tibio')+
      '<div class="fld"><label>Volver a contactar el</label>'+
        '<input id="clProximo" type="date" value="'+esc(c.proximo_contacto||'')+'"></div>'+
    '</div>'+
    '<div class="grid2">'+
      selec('Etapa','clEtapa', ETAPAS, c.etapa || 'nuevo')+
      '<div class="fld"><label>Comisionista que lo trajo</label><select id="clCom"><option value="">—</option>'+
        mios.map(function(p){
          return '<option value="'+p.id+'" '+(c.comisionista_id===p.id?'selected':'')+'>'+
            esc(nombreDe(p))+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="fld"><label>Notas</label><textarea id="clNotas" rows="2">'+esc(c.notas||'')+'</textarea></div>',

    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarCliente('+(c.id||'null')+')'}]);
}

window.guardarCliente = async function(id){
  var nombre = val('clNombre'), tel = val('clTel');
  if(!nombre) return toast('Poné al menos el nombre','error');
  if(!tel && !val('clEmail')) return toast('Necesitás un teléfono o un correo para poder contactarlo','error');

  var datos = {
    nombre: nombre, apellido: val('clApellido')||null, tel: tel||null, tel2: val('clTel2')||null,
    email: val('clEmail')||null, dni: val('clDni')||null, cuit: val('clCuit')||null,
    localidad: val('clLocalidad')||null, provincia: val('clProvincia')||null,
    domicilio: val('clDomicilio')||null,
    vehiculo_interes_id: val('clVeh') ? Number(val('clVeh')) : null,
    busca: val('clBusca')||null,
    presupuesto_min: num('clPresMin'), presupuesto_max: num('clPresMax'),
    forma_pago_prevista: val('clPago')||null,
    tiene_permuta: chk('clPermuta'), permuta_detalle: val('clPermutaDet')||null,
    necesita_financiacion: chk('clFinanc'),
    origen: val('clOrigen'), temperatura: val('clTemp'),
    proximo_contacto: val('clProximo')||null, etapa: val('clEtapa'),
    comisionista_id: val('clCom')||null, notas: val('clNotas')||null
  };
  if(!id) datos.creado_por = perfil.id;

  cargando(true,'Guardando…');
  var r = id ? await sb.from('clientes').update(datos).eq('id', id)
             : await sb.from('clientes').insert(datos);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarCrm(); render();
  toast(id ? 'Contacto actualizado' : 'Contacto cargado','ok');
};

/* ═══════════════════════════════════════════════════════════════
   2. SEÑAS Y RESERVAS
   ═══════════════════════════════════════════════════════════════ */

function vistaReservas(){
  if(!puedo('cerrar_ventas') && !puedo('clientes')) return sinPermiso('reservas y cierre de ventas');

  var activas  = C.reservas.filter(function(r){ return r.estado === 'activa'; });
  var cerradas = C.reservas.filter(function(r){ return r.estado !== 'activa'; });
  var porVencer = activas.filter(function(r){ return diasDesde(r.vence) >= -2; });

  var totalSena = activas.reduce(function(s,r){
    return s + (r.moneda === 'USD' ? Number(r.monto_sena) : 0); }, 0);

  return '<div style="max-width:1120px">'+

  '<div class="note w" style="margin-bottom:18px"><b>Cómo funciona.</b> '+
  'Cuando alguien seña, el vehículo pasa a <b>reservado</b> y deja de estar disponible para el resto '+
  'de los comisionistas: se termina el problema de dos personas vendiendo el mismo auto. '+
  'Si vence el plazo sin concretarse, vuelve solo al catálogo.</div>'+

  '<div class="kpis" style="margin-bottom:18px">'+
    '<div class="kpi"><div class="lb">Señas activas</div><div class="vl">'+activas.length+'</div>'+
      '<div class="df">'+usd(totalSena)+' en mano</div></div>'+
    '<div class="kpi '+(porVencer.length?'a':'g')+'"><div class="lb">Vencen esta semana</div>'+
      '<div class="vl">'+porVencer.length+'</div>'+
      '<div class="df">'+(porVencer.length?'hay que cerrarlas':'ninguna urgente')+'</div></div>'+
    '<div class="kpi g"><div class="lb">Concretadas</div>'+
      '<div class="vl">'+cerradas.filter(function(r){return r.estado==='concretada';}).length+'</div>'+
      '<div class="df">terminaron en venta</div></div>'+
    '<div class="kpi p"><div class="lb">Caídas</div>'+
      '<div class="vl">'+cerradas.filter(function(r){return r.estado!=='concretada';}).length+'</div>'+
      '<div class="df">vencidas o canceladas</div></div>'+
  '</div>'+

  tarjeta('Señas activas','<button class="btn btn-sm" onclick="tomarSena()">+ Tomar una seña</button>',
    activas.length
      ? '<div style="overflow-x:auto"><table><thead><tr>'+
        '<th>Vehículo</th><th>Comprador</th><th>Seña</th><th>Precio pactado</th>'+
        '<th>Saldo</th><th>Vence</th><th></th></tr></thead><tbody>'+
        activas.map(function(r){
          var cli = C.clientes.filter(function(c){ return c.id === r.cliente_id; })[0];
          var d = -diasDesde(r.vence);
          var saldo = Number(r.precio_acordado) - Number(r.monto_sena);
          return '<tr>'+
            '<td><b>'+esc(nombreVeh(r.vehiculo_id))+'</b>'+
              '<div class="mini">recibo '+esc(r.recibo_nro||'—')+'</div></td>'+
            '<td>'+esc(cli ? cli.nombre+' '+(cli.apellido||'') : '—')+
              (cli && cli.tel ? '<div class="mini">'+esc(cli.tel)+'</div>' : '')+'</td>'+
            '<td><b>'+plata(r.moneda, r.monto_sena)+'</b><div class="mini">'+esc(r.metodo_pago)+'</div></td>'+
            '<td>'+plata(r.moneda, r.precio_acordado)+'</td>'+
            '<td><b style="color:var(--amber)">'+plata(r.moneda, saldo)+'</b></td>'+
            '<td'+(d<=2?' style="color:#DC2626;font-weight:700"':'')+'>'+dia(r.vence)+
              '<div class="mini">'+(d<0?'vencida':'en '+d+' día'+(d===1?'':'s'))+'</div></td>'+
            '<td style="white-space:nowrap">'+
              '<button class="btn btn-o btn-sm" onclick="imprimirRecibo('+r.id+')">Recibo</button> '+
              (puedo('cerrar_ventas')
                ? '<button class="btn btn-sm" onclick="cerrarConReserva('+r.id+')">Cerrar venta</button> ' : '')+
              '<button class="btn btn-o btn-sm" onclick="soltarReserva('+r.id+')">Dar de baja</button></td>'+
          '</tr>';
        }).join('')+'</tbody></table></div>'
      : '<div class="mini">No hay señas activas. Cuando tomes una, el vehículo se bloquea automáticamente.</div>')+

  (cerradas.length
    ? tarjeta('Historial de señas','',
        '<div style="overflow-x:auto"><table><thead><tr>'+
        '<th>Vehículo</th><th>Comprador</th><th>Seña</th><th>Fecha</th><th>Cómo terminó</th></tr></thead><tbody>'+
        cerradas.slice(0,40).map(function(r){
          var cli = C.clientes.filter(function(c){ return c.id === r.cliente_id; })[0];
          var et = { concretada:'<span class="pill p-green">Se vendió</span>',
                     vencida:'<span class="pill p-red">Venció</span>',
                     cancelada:'<span class="pill p-red">Cancelada</span>',
                     devuelta:'<span class="pill p-amber">Seña devuelta</span>' }[r.estado] || r.estado;
          return '<tr><td>'+esc(nombreVeh(r.vehiculo_id))+'</td>'+
            '<td>'+esc(cli ? cli.nombre+' '+(cli.apellido||'') : '—')+'</td>'+
            '<td>'+plata(r.moneda, r.monto_sena)+'</td>'+
            '<td>'+dia(r.fecha)+'</td>'+
            '<td>'+et+(r.motivo_cierre?'<div class="mini">'+esc(r.motivo_cierre)+'</div>':'')+'</td></tr>';
        }).join('')+'</tbody></table></div>')
    : '')+
  '</div>';
}

window.tomarSena = function(vehiculoId, clienteId){
  var libres = D.vehiculos.filter(function(v){ return v.estado === 'disponible'; });
  if(!libres.length) return toast('No hay vehículos disponibles para señar','error');

  var candidatos = C.clientes.filter(function(c){ return c.etapa !== 'perdido'; });
  if(!candidatos.length) return toast('Primero cargá el contacto del comprador en Clientes','error');

  var vence = new Date(); vence.setDate(vence.getDate()+7);

  modal('Tomar una seña',
    '<div class="note g" style="margin-bottom:14px">Al guardar, el vehículo queda <b>reservado</b> y '+
    'se genera el recibo numerado para imprimir y firmar.</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Vehículo <span style="color:#DC2626">*</span></label><select id="snVeh">'+
        libres.map(function(v){
          return '<option value="'+v.id+'" '+(vehiculoId===v.id?'selected':'')+'>'+
            esc(v.marca+' '+v.modelo+' '+(v.anio||''))+' — '+usd(v.precio)+'</option>'; }).join('')+
      '</select></div>'+
      '<div class="fld"><label>Comprador <span style="color:#DC2626">*</span></label><select id="snCli">'+
        candidatos.map(function(c){
          return '<option value="'+c.id+'" '+(clienteId===c.id?'selected':'')+'>'+
            esc(c.nombre+' '+(c.apellido||'')+(c.tel?' · '+c.tel:''))+'</option>'; }).join('')+
      '</select></div>'+
    '</div>'+
    '<div class="grid3">'+
      campo('Monto de la seña','snMonto','number','placeholder="2000"',true)+
      selec('Moneda','snMoneda',['USD','ARS'],'USD')+
      selec('Cómo pagó','snMetodo',['Efectivo','Transferencia','Depósito','Cheque','Mercado Pago','Otro'],'Efectivo')+
    '</div>'+
    '<div class="grid2">'+
      campo('Precio final pactado','snPrecio','number','placeholder="19500"',true)+
      campo('Días de vigencia','snDias','number','value="7"')+
    '</div>'+
    '<div class="grid3" style="margin-bottom:10px">'+
      tilde('Entrega un usado','snPermuta')+ tilde('Con financiación','snFinanc')+
      selec('Transferencia a cargo de','snGastos',['Comprador','Vendedor','Compartida'],'Comprador')+
    '</div>'+
    '<div class="fld"><label>Condiciones pactadas</label>'+
      '<textarea id="snCond" rows="2" placeholder="Entrega el saldo contra transferencia. Se le hace el service antes de retirar."></textarea></div>'+
    '<div class="mini">Lo que escribas acá se imprime en el recibo. Cuanto más claro, menos discusión después.</div>',

    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Tomar la seña',clase:'',fn:'guardarSena()'}]);
};

window.guardarSena = async function(){
  var monto = Number(val('snMonto')), precio = Number(val('snPrecio'));
  if(!(monto > 0))  return toast('Poné el monto de la seña','error');
  if(!(precio > 0)) return toast('Poné el precio final pactado','error');
  if(monto >= precio) return toast('La seña no puede ser igual o mayor al precio total','error');

  cargando(true,'Registrando la seña…');
  var r = await sb.rpc('reservar_vehiculo', {
    p_vehiculo_id: Number(val('snVeh')), p_cliente_id: Number(val('snCli')),
    p_monto_sena: monto, p_moneda: val('snMoneda'), p_metodo: val('snMetodo'),
    p_precio_acordado: precio, p_dias: Number(val('snDias'))||7,
    p_condiciones: val('snCond')||null, p_permuta: chk('snPermuta'),
    p_financiacion: chk('snFinanc'), p_gastos: val('snGastos')
  });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');

  cerrarModal(); await cargarTodo(); await cargarCrm(); render();
  toast('Seña registrada. El vehículo quedó reservado.','ok');
  if(r.data && r.data.id) setTimeout(function(){ imprimirRecibo(r.data.id); }, 400);
};

window.soltarReserva = async function(id){
  var motivo = prompt('¿Por qué se da de baja la reserva?');
  if(motivo === null) return;
  var devolver = confirm('¿Se le devuelve la seña al comprador?\n\nAceptar = sí, se devuelve.\nCancelar = no, la seña queda.');

  cargando(true,'Dando de baja…');
  var r = await sb.rpc('cancelar_reserva', { p_reserva_id:id, p_motivo:motivo, p_devolver:devolver });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  await cargarTodo(); await cargarCrm(); render();
  toast('Reserva dada de baja. El vehículo volvió al catálogo.','ok');
};

window.cerrarConReserva = function(id){
  var r = C.reservas.filter(function(x){ return x.id === id; })[0];
  if(!r) return;
  var cli = C.clientes.filter(function(c){ return c.id === r.cliente_id; })[0];
  var vendedores = D.perfiles.filter(function(p){ return p.rol === 'comisionista'; });

  modal('Cerrar la venta de '+esc(nombreVeh(r.vehiculo_id)),
    '<div class="note g" style="margin-bottom:14px">Comprador: <b>'+esc(cli?cli.nombre+' '+(cli.apellido||''):'—')+'</b>'+
    ' · Seña cobrada: <b>'+plata(r.moneda,r.monto_sena)+'</b></div>'+
    '<div class="grid2">'+
      campo('Precio final de venta','cvPrecio','number','value="'+esc(r.precio_acordado)+'"',true)+
      campo('Fecha','cvFecha','date','value="'+hoy()+'"')+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Comisionista que la trabajó</label><select id="cvCom"><option value="">— sin comisionista —</option>'+
        vendedores.map(function(p){
          return '<option value="'+p.id+'" '+(r.comisionista_id===p.id?'selected':'')+'>'+
            esc(nombreDe(p))+'</option>'; }).join('')+'</select></div>'+
      selec('Forma de pago','cvPago',['Contado','Transferencia','Financiación','Permuta + efectivo','Mixto'],'Transferencia')+
    '</div>'+
    '<div class="mini">Al confirmar se genera la comisión del 2% para el comisionista, arranca el trámite '+
    'de transferencia y el vehículo queda marcado como vendido (no se borra: podés reimprimir el boleto cuando quieras).</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Confirmar la venta',clase:'',fn:'confirmarVenta('+id+')'}]);
};

window.confirmarVenta = async function(reservaId){
  var r = C.reservas.filter(function(x){ return x.id === reservaId; })[0];
  var precio = Number(val('cvPrecio'));
  if(!(precio > 0)) return toast('Poné el precio final','error');
  var cli = C.clientes.filter(function(c){ return c.id === r.cliente_id; })[0];

  cargando(true,'Cerrando la venta…');
  var res = await sb.rpc('concretar_venta', {
    p_vehiculo_id: r.vehiculo_id,
    p_usuario_id: val('cvCom') || null,
    p_precio: precio,
    p_comprador: cli ? (cli.nombre+' '+(cli.apellido||'')).trim() : 'Comprador',
    p_fecha: val('cvFecha') || hoy(),
    p_hash: r.recibo_nro || null,
    p_cliente_id: r.cliente_id,
    p_reserva_id: reservaId,
    p_forma_pago: val('cvPago')
  });
  cargando(false);
  if(res.error) return toast(mensajeError(res.error),'error');

  cerrarModal(); await cargarTodo(); await cargarCrm(); render();
  toast('Venta cerrada. Se generó la comisión y el trámite de transferencia.','ok');
  if(res.data) setTimeout(function(){ imprimirBoleto(res.data); }, 400);
};

/* ═══════════════════════════════════════════════════════════════
   3. STOCK: EDITAR, PAUSAR, ANTIGÜEDAD
   ═══════════════════════════════════════════════════════════════ */

function vistaStock(){
  if(!puedo('publicar') && !puedo('editar_vehiculos')) return sinPermiso('gestión de stock');

  var lista = D.vehiculos.slice().sort(function(a,b){
    return new Date(a.creado_en||a.ingreso||0) - new Date(b.creado_en||b.ingreso||0);
  });

  var disp = lista.filter(function(v){ return v.estado === 'disponible'; });
  var resv = lista.filter(function(v){ return v.estado === 'reservado'; });
  var paus = lista.filter(function(v){ return v.estado === 'pausado'; });
  var viejos = disp.filter(function(v){ return diasDesde(v.creado_en||v.ingreso) > 60; });
  var valorStock = disp.reduce(function(s,v){ return s + Number(v.precio||0); }, 0);

  return '<div style="max-width:1180px">'+

  '<div class="kpis" style="margin-bottom:18px">'+
    '<div class="kpi"><div class="lb">A la venta</div><div class="vl">'+disp.length+'</div>'+
      '<div class="df">'+usd(valorStock)+' en vidriera</div></div>'+
    '<div class="kpi a"><div class="lb">Reservados</div><div class="vl">'+resv.length+'</div>'+
      '<div class="df">con seña puesta</div></div>'+
    '<div class="kpi '+(viejos.length?'p':'g')+'"><div class="lb">Más de 60 días</div>'+
      '<div class="vl">'+viejos.length+'</div>'+
      '<div class="df '+(viejos.length?'n':'')+'">'+(viejos.length?'revisar precio':'stock sano')+'</div></div>'+
    '<div class="kpi"><div class="lb">Pausados</div><div class="vl">'+paus.length+'</div>'+
      '<div class="df">fuera del catálogo</div></div>'+
  '</div>'+

  (viejos.length
    ? '<div class="note w" style="margin-bottom:18px"><b>'+viejos.length+' vehículo'+
      (viejos.length>1?'s llevan':' lleva')+' más de dos meses sin venderse.</b> '+
      'En una concesionaria eso es señal de precio alto, fotos flojas o descripción incompleta. '+
      'Bajar el precio a tiempo cuesta menos que tener plata parada.</div>'
    : '')+

  tarjeta('Todo el stock','<span class="hint">Ordenado del más antiguo al más nuevo</span>',
    lista.length
      ? '<div style="overflow-x:auto"><table><thead><tr>'+
        '<th></th><th>Vehículo</th><th>Precio</th><th>Mínimo</th><th>Días</th>'+
        '<th>Estado</th><th>Fotos</th><th></th></tr></thead><tbody>'+
        lista.map(function(v){
          var d = diasDesde(v.creado_en || v.ingreso);
          var int = C.internos[v.id] || {};
          var fs = C.fotos[v.id] || [];
          var portada = fs.filter(function(f){ return f.portada; })[0] || fs[0];
          var color = d > 90 ? '#DC2626' : d > 60 ? '#D97706' : 'var(--gray)';
          var etiq = { disponible:'<span class="pill p-green">A la venta</span>',
                       reservado:'<span class="pill p-amber">Reservado</span>',
                       vendido:'<span class="pill p-blue">Vendido</span>',
                       pausado:'<span class="pill p-red">Pausado</span>' }[v.estado] || v.estado;
          var cambios = C.precios.filter(function(p){ return p.vehiculo_id === v.id; }).length;
          return '<tr>'+
            '<td style="width:62px">'+(portada
              ? '<img src="'+esc(FOTOS+portada.ruta)+'" style="width:54px;height:40px;object-fit:cover;border-radius:6px;display:block">'
              : '<div style="width:54px;height:40px;background:var(--bg);border-radius:6px;display:grid;place-items:center">🚗</div>')+'</td>'+
            '<td><b>'+esc(v.marca+' '+v.modelo)+'</b>'+
              '<div class="mini">'+esc([v.version,v.anio,(v.km||0).toLocaleString('es-AR')+' km'].filter(Boolean).join(' · '))+'</div></td>'+
            '<td><b>'+usd(v.precio)+'</b>'+
              (cambios?'<div class="mini" style="cursor:pointer" onclick="verPrecios('+v.id+')">'+cambios+' cambio'+(cambios>1?'s':'')+'</div>':'')+'</td>'+
            '<td>'+(int.precio_minimo?'<span style="color:var(--gray)">'+usd(int.precio_minimo)+'</span>':'<span class="mini">—</span>')+'</td>'+
            '<td><b style="color:'+color+'">'+d+'</b></td>'+
            '<td>'+etiq+'</td>'+
            '<td>'+fs.length+'</td>'+
            '<td style="white-space:nowrap">'+
              '<button class="btn btn-o btn-sm" onclick="editarVehiculo('+v.id+')">Editar</button> '+
              (v.estado==='disponible'
                ? '<button class="btn btn-o btn-sm" onclick="pausarVehiculo('+v.id+',true)">Pausar</button>'
                : v.estado==='pausado'
                  ? '<button class="btn btn-sm" onclick="pausarVehiculo('+v.id+',false)">Reactivar</button>'
                  : '')+
            '</td></tr>';
        }).join('')+'</tbody></table></div>'
      : '<div class="mini">Todavía no hay vehículos cargados.</div>')+
  '</div>';
}

window.pausarVehiculo = async function(id, pausar){
  cargando(true, pausar ? 'Pausando…' : 'Reactivando…');
  var r = await sb.from('vehiculos').update({ estado: pausar ? 'pausado' : 'disponible' }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  await cargarTodo(); render();
  toast(pausar ? 'Sacado del catálogo. Nadie lo ve hasta que lo reactives.' : 'Volvió al catálogo','ok');
};

window.verPrecios = function(id){
  var h = C.precios.filter(function(p){ return p.vehiculo_id === id; })
    .sort(function(a,b){ return a.creado_en < b.creado_en ? 1 : -1; });
  modal('Historial de precio — '+esc(nombreVeh(id)),
    h.length
      ? '<table><thead><tr><th>Fecha</th><th>De</th><th>A</th><th>Quién</th></tr></thead><tbody>'+
        h.map(function(p){
          var q = D.perfiles.filter(function(u){ return u.id === p.usuario_id; })[0];
          return '<tr><td>'+dia(String(p.creado_en).slice(0,10))+'</td>'+
            '<td>'+(p.precio_anterior?usd(p.precio_anterior):'—')+'</td>'+
            '<td><b>'+usd(p.precio_nuevo)+'</b></td>'+
            '<td>'+esc(q?nombreDe(q):'—')+'</td></tr>';
        }).join('')+'</tbody></table>'
      : '<div class="mini">Sin cambios de precio registrados.</div>',
    [{txt:'Cerrar',clase:'',fn:'cerrarModal()'}]);
};

window.editarVehiculo = function(id){
  var v = vehiculoDe(id); if(!v) return;
  var i = C.internos[id] || {};
  vehiculoEditando = id;

  modal('Editar '+esc(v.marca+' '+v.modelo),
    '<div style="font-weight:800;color:var(--navy);font-size:.9rem;margin-bottom:8px">Lo que ve el comisionista</div>'+
    '<div class="grid3">'+
      campo('Marca','evMarca','text','value="'+esc(v.marca)+'"',true)+
      campo('Modelo','evModelo','text','value="'+esc(v.modelo)+'"',true)+
      campo('Versión','evVersion','text','value="'+esc(v.version||'')+'"')+
    '</div><div class="grid3">'+
      campo('Año','evAnio','number','value="'+esc(v.anio||'')+'"')+
      campo('Kilómetros','evKm','number','value="'+esc(v.km||'')+'"')+
      campo('Precio de venta','evPrecio','number','value="'+esc(v.precio)+'"',true)+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Moneda del precio</label>'+
        '<select id="evMoneda" data-previa="'+esc(v.moneda||'USD')+'" onchange="cambiarMonedaEdicion()">'+
          ['USD','ARS'].map(function(o){
            return '<option value="'+o+'"'+((v.moneda||'USD')===o?' selected':'')+'>'+o+'</option>';
          }).join('')+'</select></div>'+
      campo('Cotización usada','evCotiz','number',
        'value="'+esc(v.cotizacion || cotizacionDeReferencia() || '')+'" placeholder="pesos por dólar"')+
      '<div class="fld"><label>&nbsp;</label><div class="mini" style="line-height:1.45">'+
        'Viene de Configuración. Al cambiar de moneda el precio se convierte '+
        'solo. Queda congelada con el vehículo: ordena el catálogo y calcula '+
        'la gama, y no se mueve cuando se mueve el dólar.</div></div>'+
    '</div><div class="grid3">'+
      campo('Color','evColor','text','value="'+esc(v.color||'')+'"')+
      selec('Combustible','evComb',['Nafta','Diésel','Híbrido','Eléctrico','GNC','Nafta/GNC'], v.combustible)+
      selec('Transmisión','evTrans',['Manual','Automática','Automática secuencial','CVT'], v.transmision)+
    '</div><div class="grid3">'+
      campo('Ubicación','evUbic','text','value="'+esc(v.ubicacion||'')+'"')+
      selec('Estado general','evEstadoGral',['Excelente','Muy bueno','Bueno','Regular','A reparar'], v.estado_general)+
      selec('Estado en el sistema','evEstado',['disponible','pausado'], v.estado)+
    '</div>'+
    '<div class="fld"><label>Descripción pública</label>'+
      '<textarea id="evDesc" rows="3">'+esc(v.descripcion||'')+'</textarea></div>'+
    '<div class="grid3" style="margin-bottom:8px">'+
      tilde('Acepta permuta','evPermuta', v.acepta_permuta)+
      tilde('Acepta financiación','evFinanc', v.acepta_financiacion)+
      tilde('Service al día','evService', v.service_al_dia)+
    '</div>'+
    '<div class="grid3" style="margin-bottom:8px">'+
      tilde('Deuda de patentes','evDeudaPat', v.deuda_patentes)+
      tilde('Infracciones impagas','evDeudaInf', v.deuda_infracciones)+
      tilde('Tiene prenda','evPrenda', v.prenda)+
    '</div>'+
    '<div class="grid3" style="margin-bottom:8px">'+
      tilde('Título y cédula','evDocDom', v.doc_dominio)+
      tilde('Patentes al día','evDocPat', v.doc_patentes)+
      tilde('VTV vigente','evDocVtv', v.doc_vtv)+
    '</div>'+
    '<div class="grid3" style="margin-bottom:12px">'+
      tilde('Informe de dominio','evDocPol', v.doc_policial)+
      tilde('Mandato firmado','evDocMan', v.doc_mandato)+
    '</div>'+

    '<div style="font-weight:800;color:var(--navy);font-size:.9rem;margin:16px 0 6px">'+
      'Solo para el equipo <span class="mini" style="font-weight:500">— el comisionista nunca ve esto</span></div>'+
    '<div class="grid2">'+
      campo('Precio mínimo aceptable','evPrecioMin','number','value="'+esc(i.precio_minimo||'')+'"')+
      campo('Teléfono del propietario','evTel','text','value="'+esc(i.tel_propietario||'')+'"')+
    '</div><div class="grid3">'+
      campo('Patente','evPatente','text','value="'+esc(v.patente||'')+'"')+
      campo('Nº de chasis','evChasis','text','value="'+esc(i.nro_chasis||'')+'"')+
      campo('Nº de motor','evMotor','text','value="'+esc(i.nro_motor||'')+'"')+
    '</div>'+
    '<div class="fld"><label>Titular registral</label>'+
      '<input id="evTitular" value="'+esc(i.titular_registral||'')+'"></div>'+
    '<div class="fld"><label>Notas internas</label>'+
      '<textarea id="evNotas" rows="2">'+esc(i.notas_internas||'')+'</textarea></div>'+
    '<div class="mini">Cada cambio de precio queda registrado con tu nombre y la fecha.</div>',

    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar cambios',clase:'',fn:'guardarVehiculo('+id+')'}]);
};

window.guardarVehiculo = async function(id){
  if(!val('evMarca') || !val('evModelo')) return toast('Marca y modelo no pueden quedar vacíos','error');
  var precio = Number(val('evPrecio'));
  if(!(precio > 0)) return toast('El precio tiene que ser mayor a cero','error');

  var moneda = val('evMoneda') === 'ARS' ? 'ARS' : 'USD';
  var cotiz  = Number(val('evCotiz')) || cotizacionDeReferencia() || null;

  /* Un precio en pesos sin cotización no se puede comparar con nada: no
     entra en el orden del catálogo ni cae en la gama que le corresponde.
     Mejor frenarlo acá que publicarlo mal. */
  if(moneda === 'ARS' && !(cotiz > 0))
    return toast('Falta la cotización del dólar. Cargala en Configuración o escribila acá','error');
  if(moneda === 'USD') cotiz = null;

  var v = vehiculoDe(id);
  if(v && (Number(v.precio) !== precio || (v.moneda||'USD') !== moneda)){
    if(!confirm('Vas a cambiar el precio de '+plata(v.moneda||'USD', v.precio)+
                ' a '+plata(moneda, precio)+'.\n\n'+
                'El cambio queda registrado con tu nombre. ¿Confirmás?')) return;
  }

  cargando(true,'Guardando…');
  var up = await sb.from('vehiculos').update({
    marca: val('evMarca'), modelo: val('evModelo'), version: val('evVersion')||null,
    anio: num('evAnio'), km: num('evKm')||0, precio: precio,
    moneda: moneda, cotizacion: cotiz,
    color: val('evColor')||null, combustible: val('evComb'), transmision: val('evTrans'),
    ubicacion: val('evUbic')||null, estado_general: val('evEstadoGral'),
    estado: val('evEstado'), descripcion: val('evDesc')||null, patente: val('evPatente')||null,
    acepta_permuta: chk('evPermuta'), acepta_financiacion: chk('evFinanc'),
    service_al_dia: chk('evService'),
    deuda_patentes: chk('evDeudaPat'), deuda_infracciones: chk('evDeudaInf'), prenda: chk('evPrenda'),
    doc_dominio: chk('evDocDom'), doc_patentes: chk('evDocPat'), doc_vtv: chk('evDocVtv'),
    doc_policial: chk('evDocPol'), doc_mandato: chk('evDocMan')
  }).eq('id', id);
  if(up.error){ cargando(false); return toast(mensajeError(up.error),'error'); }

  var interno = await sb.from('vehiculos_internos').upsert({
    vehiculo_id: id, precio_minimo: num('evPrecioMin'),
    tel_propietario: val('evTel')||null, nro_chasis: val('evChasis')||null,
    nro_motor: val('evMotor')||null, titular_registral: val('evTitular')||null,
    notas_internas: val('evNotas')||null, actualizado_en: new Date().toISOString()
  }, { onConflict:'vehiculo_id' });
  cargando(false);
  if(interno.error) return toast(mensajeError(interno.error),'error');

  cerrarModal(); await cargarTodo(); await cargarCrm(); render();
  toast('Vehículo actualizado','ok');
};

/* ═══════════════════════════════════════════════════════════════
   4. TRANSFERENCIAS
   ═══════════════════════════════════════════════════════════════ */

var PASOS_TRANSF = [
  ['form_08_firmado','Formulario 08 firmado'],
  ['firmas_certificadas','Firmas certificadas'],
  ['verificacion_policial','Verificación policial'],
  ['informe_dominio','Informe de dominio'],
  ['libre_deuda_patentes','Libre deuda de patentes'],
  ['libre_multas','Libre de multas'],
  ['titulo_entregado','Título entregado'],
  ['cedula_entregada','Cédula entregada'],
  ['formulario_12','Formulario 12 (verificación técnica)']
];

function vistaTransferencias(){
  if(!puedo('cerrar_ventas') && !puedo('documentacion')) return sinPermiso('documentación');

  var pend = C.transferencias.filter(function(t){ return t.estado !== 'inscripto'; });
  var listas = C.transferencias.filter(function(t){ return t.estado === 'inscripto'; });

  function opDe(t){ return D.operaciones.filter(function(o){ return o.id === t.operacion_id; })[0] || {}; }
  function avance(t){
    var hechos = PASOS_TRANSF.filter(function(p){ return t[p[0]]; }).length;
    return Math.round((hechos / PASOS_TRANSF.length) * 100);
  }

  return '<div style="max-width:1080px">'+
  '<div class="note w" style="margin-bottom:18px"><b>Una venta no termina cuando se cobra: termina cuando se transfiere.</b> '+
  'Un auto vendido y sin transferir sigue siendo un problema tuyo: las multas y las patentes le llegan al titular anterior. '+
  'Acá cada operación arrastra su checklist hasta quedar inscripta.</div>'+

  '<div class="kpis" style="margin-bottom:18px">'+
    '<div class="kpi '+(pend.length?'a':'g')+'"><div class="lb">Trámites abiertos</div>'+
      '<div class="vl">'+pend.length+'</div><div class="df">sin inscribir todavía</div></div>'+
    '<div class="kpi g"><div class="lb">Inscriptos</div><div class="vl">'+listas.length+'</div>'+
      '<div class="df">cerrados del todo</div></div>'+
  '</div>'+

  tarjeta('Transferencias en curso','',
    pend.length
      ? pend.map(function(t){
          var o = opDe(t), a = avance(t);
          return '<div style="padding:14px 0;border-bottom:1px solid var(--line)">'+
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">'+
              '<div style="flex:1;min-width:220px">'+
                '<b>'+esc(o.vehiculo_desc||'—')+'</b>'+
                '<div class="mini">'+esc(o.comprador||'')+' · vendido el '+dia(o.fecha)+
                ' · a cargo de '+esc(t.a_cargo_de||'—')+'</div>'+
                '<div class="prog-bar" style="margin-top:8px;max-width:320px"><i style="width:'+a+'%"></i></div>'+
                '<div class="mini" style="margin-top:3px">'+a+'% completo'+
                (t.turno_registro?' · turno '+dia(t.turno_registro):'')+'</div>'+
              '</div>'+
              '<button class="btn btn-sm" onclick="abrirTransferencia('+t.id+')">Ver checklist</button>'+
            '</div></div>';
        }).join('')
      : '<div class="mini">No hay trámites pendientes.</div>')+
  '</div>';
}

window.abrirTransferencia = function(id){
  var t = C.transferencias.filter(function(x){ return x.id === id; })[0];
  if(!t) return;
  var o = D.operaciones.filter(function(x){ return x.id === t.operacion_id; })[0] || {};

  modal('Transferencia — '+esc(o.vehiculo_desc||''),
    '<div class="note g" style="margin-bottom:14px">Comprador: <b>'+esc(o.comprador||'—')+'</b> · '+
    'Vendido el '+dia(o.fecha)+' · Gastos a cargo de <b>'+esc(t.a_cargo_de||'—')+'</b></div>'+
    '<div style="display:grid;gap:6px;margin-bottom:14px">'+
      PASOS_TRANSF.map(function(p){
        return '<label class="chk" style="margin:0"><input type="checkbox" id="tr_'+p[0]+'" '+
          (t[p[0]]?'checked':'')+'><span>'+p[1]+'</span></label>';
      }).join('')+'</div>'+
    '<div class="grid3">'+
      campo('Turno en el Registro','trTurno','date','value="'+esc(t.turno_registro||'')+'"')+
      campo('Presentado el','trPresentado','date','value="'+esc(t.presentado_el||'')+'"')+
      campo('Inscripto el','trInscripto','date','value="'+esc(t.inscripto_el||'')+'"')+
    '</div><div class="grid3">'+
      campo('Registro seccional','trSeccional','text','value="'+esc(t.registro_seccional||'')+'"')+
      campo('Gestor','trGestor','text','value="'+esc(t.gestor||'')+'"')+
      campo('Costo del trámite (ARS)','trCosto','number','value="'+esc(t.costo_trámite||t.costo_tramite||'')+'"')+
    '</div>'+
    selec('Estado','trEstado',['pendiente','en_tramite','presentado','inscripto','observado'], t.estado)+
    '<div class="fld"><label>Observaciones</label>'+
      '<textarea id="trObs" rows="2">'+esc(t.observaciones||'')+'</textarea></div>',
    [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarTransferencia('+id+')'}]);
};

window.guardarTransferencia = async function(id){
  var datos = { turno_registro: val('trTurno')||null, presentado_el: val('trPresentado')||null,
    inscripto_el: val('trInscripto')||null, registro_seccional: val('trSeccional')||null,
    gestor: val('trGestor')||null, costo_tramite: num('trCosto'),
    estado: val('trEstado'), observaciones: val('trObs')||null,
    actualizado_en: new Date().toISOString() };
  PASOS_TRANSF.forEach(function(p){ datos[p[0]] = chk('tr_'+p[0]); });

  if(datos.inscripto_el && datos.estado !== 'inscripto') datos.estado = 'inscripto';

  cargando(true,'Guardando…');
  var r = await sb.from('transferencias').update(datos).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarCrm(); render();
  toast('Trámite actualizado','ok');
};

/* ═══════════════════════════════════════════════════════════════
   5. COMISIONES A PAGAR
   ═══════════════════════════════════════════════════════════════ */

function vistaComisiones(){
  if(!puedo('comisionistas') && !puedo('estadisticas')) return sinPermiso('comisionistas');

  var pend = C.comisiones.filter(function(c){ return c.estado === 'pendiente'; });
  var pag  = C.comisiones.filter(function(c){ return c.estado === 'pagada'; });
  var totalPend = pend.reduce(function(s,c){ return s + Number(c.monto_usd||0); }, 0);
  var totalPag  = pag.reduce(function(s,c){ return s + Number(c.monto_usd||0); }, 0);

  var porPersona = {};
  pend.forEach(function(c){
    porPersona[c.usuario_id] = (porPersona[c.usuario_id]||0) + Number(c.monto_usd||0); });

  return '<div style="max-width:1020px">'+
  '<div class="note w" style="margin-bottom:18px">Cada venta genera sola la comisión del 2% del comisionista. '+
  'Se paga contra factura: por eso el sistema te pide el número de comprobante al marcarla pagada. '+
  'Así queda respaldado el gasto para tu contabilidad.</div>'+

  '<div class="kpis" style="margin-bottom:18px">'+
    '<div class="kpi a"><div class="lb">Debés</div><div class="vl">'+usd(totalPend)+'</div>'+
      '<div class="df">'+pend.length+' comisiones sin pagar</div></div>'+
    '<div class="kpi g"><div class="lb">Pagado</div><div class="vl">'+usd(totalPag)+'</div>'+
      '<div class="df">'+pag.length+' liquidaciones</div></div>'+
    '<div class="kpi"><div class="lb">Comisionistas con saldo</div>'+
      '<div class="vl">'+Object.keys(porPersona).length+'</div><div class="df">esperando cobrar</div></div>'+
  '</div>'+

  tarjeta('Comisiones pendientes de pago','',
    pend.length
      ? '<div style="overflow-x:auto"><table><thead><tr>'+
        '<th>Comisionista</th><th>Operación</th><th>Monto</th><th>Fecha</th><th></th></tr></thead><tbody>'+
        pend.map(function(c){
          var u = D.perfiles.filter(function(p){ return p.id === c.usuario_id; })[0];
          var o = D.operaciones.filter(function(x){ return x.id === c.operacion_id; })[0] || {};
          return '<tr>'+
            '<td><b>'+esc(u?nombreDe(u):'—')+'</b>'+
              (u&&u.cuit?'<div class="mini">CUIT '+esc(u.cuit)+'</div>':'')+'</td>'+
            '<td>'+esc(o.vehiculo_desc||'—')+'<div class="mini">'+esc(o.comprador||'')+'</div></td>'+
            '<td><b>'+usd(c.monto_usd)+'</b></td>'+
            '<td>'+dia(String(c.creado_en).slice(0,10))+'</td>'+
            '<td><button class="btn btn-sm" onclick="pagarComision('+c.id+')">Marcar pagada</button></td>'+
          '</tr>';
        }).join('')+'</tbody></table></div>'
      : '<div class="mini">No hay comisiones pendientes.</div>')+

  (pag.length
    ? tarjeta('Ya pagadas','',
        '<div style="overflow-x:auto"><table><thead><tr>'+
        '<th>Comisionista</th><th>Monto</th><th>Pagada el</th><th>Cómo</th><th>Factura</th></tr></thead><tbody>'+
        pag.slice(0,30).map(function(c){
          var u = D.perfiles.filter(function(p){ return p.id === c.usuario_id; })[0];
          return '<tr><td>'+esc(u?nombreDe(u):'—')+'</td><td>'+usd(c.monto_usd)+'</td>'+
            '<td>'+dia(c.fecha_pago)+'</td><td>'+esc(c.metodo||'—')+'</td>'+
            '<td>'+esc(c.factura_nro||'—')+'</td></tr>';
        }).join('')+'</tbody></table></div>')
    : '')+
  '</div>';
}

window.pagarComision = function(id){
  var c = C.comisiones.filter(function(x){ return x.id === id; })[0];
  if(!c) return;
  var u = D.perfiles.filter(function(p){ return p.id === c.usuario_id; })[0];

  modal('Registrar el pago de la comisión',
    '<div class="note g" style="margin-bottom:14px">A <b>'+esc(u?nombreDe(u):'—')+'</b>'+
    (u&&u.cbu?'<br>CBU: <span class="hash">'+esc(u.cbu)+'</span>':'')+
    (u&&u.alias_cbu?'<br>Alias: <span class="hash">'+esc(u.alias_cbu)+'</span>':'')+
    '<br>Monto: <b>'+usd(c.monto_usd)+'</b></div>'+
    '<div class="grid2">'+
      selec('Cómo se paga','pcMetodo',['Transferencia','Efectivo','Mercado Pago','Cheque','Otro'],'Transferencia')+
      campo('Fecha','pcFecha','date','value="'+hoy()+'"')+
    '</div><div class="grid2">'+
      campo('Nº de factura del comisionista','pcFactura','text','placeholder="0001-00000123"')+
      campo('Comprobante de la transferencia','pcComprobante','text','')+
    '</div>'+
    '<div class="fld"><label>Notas</label><textarea id="pcNotas" rows="2"></textarea></div>'+
    '<div class="mini">Sin factura no deberías pagar: es el respaldo del gasto ante AFIP y '+
    'lo que sostiene que la relación es entre independientes.</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Confirmar pago',clase:'',fn:'guardarPagoComision('+id+')'}]);
};

window.guardarPagoComision = async function(id){
  cargando(true,'Guardando…');
  var r = await sb.from('pagos_comision').update({
    estado:'pagada', metodo: val('pcMetodo'), fecha_pago: val('pcFecha')||hoy(),
    factura_nro: val('pcFactura')||null, comprobante: val('pcComprobante')||null,
    notas: val('pcNotas')||null, registrado_por: perfil.id
  }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarCrm(); render();
  toast('Comisión marcada como pagada','ok');
};

/* ═══════════════════════════════════════════════════════════════
   6. AUDITORÍA
   ═══════════════════════════════════════════════════════════════ */

var TABLA_TXT = { vehiculos:'Vehículo', operaciones:'Venta', reservas:'Reserva',
  clientes:'Cliente', perfiles:'Cuenta', cobros:'Cobro', transferencias:'Transferencia',
  config:'Configuración', gastos:'Gasto', campanas:'Campaña', permutas:'Permuta',
  vehiculos_internos:'Datos internos del vehículo' };
var ACCION_TXT = { alta:'creó', cambio:'modificó', baja:'borró' };

function vistaAuditoria(){
  if(!perfil || !perfil.es_dueno)
    return '<div class="note r">Solo la cuenta dueña del negocio puede ver el historial de movimientos.</div>';

  return '<div style="max-width:1020px">'+
  '<div class="note w" style="margin-bottom:18px"><b>Todo cambio queda registrado.</b> '+
  'Quién tocó qué, cuándo, y qué valor tenía antes. Es lo que te permite reconstruir qué pasó '+
  'si algo aparece cambiado y nadie sabe por qué. Los datos sensibles (CBU, documento) se marcan '+
  'como cambiados pero no se copian acá.</div>'+

  tarjeta('Últimos movimientos','<span class="hint">'+C.auditoria.length+' registros cargados</span>',
    C.auditoria.length
      ? '<div class="tbl-scroll"><table><thead><tr>'+
        '<th>Cuándo</th><th>Quién</th><th>Qué hizo</th><th>Sobre</th><th>Campos</th></tr></thead><tbody>'+
        C.auditoria.map(function(a){
          var d = new Date(a.creado_en);
          return '<tr>'+
            '<td style="white-space:nowrap">'+d.toLocaleDateString('es-AR')+
              '<div class="mini">'+d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+'</div></td>'+
            '<td>'+esc(a.usuario_nombre || 'sistema')+'</td>'+
            '<td>'+ACCION_TXT[a.accion]+'</td>'+
            '<td>'+esc(TABLA_TXT[a.tabla]||a.tabla)+' <span class="mini">#'+esc(a.registro_id||'')+'</span></td>'+
            '<td>'+((a.campos||[]).length
              ? (a.campos||[]).slice(0,4).map(function(c){
                  return '<span class="pill p-blue" style="font-size:.66rem">'+esc(c)+'</span>'; }).join(' ')+
                ((a.campos||[]).length>4?' <span class="mini">+'+((a.campos||[]).length-4)+'</span>':'')
              : '<span class="mini">—</span>')+'</td>'+
          '</tr>';
        }).join('')+'</tbody></table></div>'
      : '<div class="mini">Todavía no hay movimientos registrados.</div>')+

  tarjeta('Copia de seguridad','',
    '<div style="font-size:.87rem;line-height:1.65;margin-bottom:12px">Descargá todo el contenido del negocio '+
    'en un archivo que podés guardar donde quieras. Sirve para dormir tranquilo y para llevarte los datos '+
    'si algún día cambiás de sistema.</div>'+
    '<button class="btn" onclick="bajarRespaldo()">Descargar copia de seguridad</button>')+
  '</div>';
}

window.bajarRespaldo = async function(){
  cargando(true,'Armando la copia…');
  try {
    var todo = {
      generado: new Date().toISOString(),
      perfiles: D.perfiles, vehiculos: D.vehiculos, internos: C.internos,
      operaciones: D.operaciones, clientes: C.clientes, interacciones: C.interacciones,
      reservas: C.reservas, cobros: C.cobros, transferencias: C.transferencias,
      comisiones: C.comisiones, asignaciones: D.asignaciones, visitas: D.visitas,
      pagos_cupo: D.pagos
    };
    var blob = new Blob([JSON.stringify(todo, null, 2)], { type:'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bivonacars-respaldo-' + hoy() + '.json';
    a.click();
    cargando(false);
    toast('Copia descargada. Guardala en un lugar seguro.','ok');
  } catch(e){ cargando(false); toast('No se pudo generar la copia','error'); }
};

/* ═══════════════════════════════════════════════════════════════
   7. DOCUMENTOS IMPRIMIBLES
   ═══════════════════════════════════════════════════════════════ */

function hoja(titulo, cuerpo){
  var w = window.open('', '_blank', 'width=820,height=980');
  if(!w) return toast('Tu navegador bloqueó la ventana. Permitila y probá de nuevo.','error');
  w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>'+titulo+'</title><style>'+
    '*{box-sizing:border-box}body{font:13px/1.6 Georgia,"Times New Roman",serif;color:#111;margin:0;padding:38px 44px;max-width:820px}'+
    'h1{font-size:19px;margin:0 0 2px;letter-spacing:.5px}'+
    '.marca{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#1665D8;font-weight:bold;font-family:Arial,sans-serif}'+
    '.nro{float:right;text-align:right;font-family:Arial,sans-serif;font-size:11px;color:#555}'+
    'hr{border:0;border-top:1.5px solid #0A2540;margin:14px 0 20px}'+
    'h2{font-size:13px;margin:22px 0 7px;text-transform:uppercase;letter-spacing:.8px;font-family:Arial,sans-serif;color:#0A2540}'+
    'table{width:100%;border-collapse:collapse;margin:8px 0}'+
    'td{padding:5px 0;vertical-align:top}td.e{width:170px;color:#555}'+
    '.caja{border:1px solid #bbb;padding:12px 14px;margin:10px 0;background:#fafafa}'+
    '.total{font-size:17px;font-weight:bold}'+
    '.firmas{margin-top:56px;display:flex;gap:60px}'+
    '.firma{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;text-align:center;font-family:Arial,sans-serif}'+
    '.chico{font-size:10.5px;color:#666;line-height:1.5;font-family:Arial,sans-serif}'+
    '@media print{body{padding:20px}.noimp{display:none}}'+
    '.noimp{margin-top:30px;text-align:center}'+
    '.noimp button{font:600 13px Arial;padding:9px 22px;background:#1665D8;color:#fff;border:0;border-radius:6px;cursor:pointer}'+
    '</style></head><body>'+cuerpo+
    '<div class="noimp"><button onclick="window.print()">Imprimir o guardar en PDF</button></div>'+
    '</body></html>');
  w.document.close();
}

window.imprimirRecibo = function(reservaId){
  var r = C.reservas.filter(function(x){ return x.id === reservaId; })[0];
  if(!r) return toast('No encuentro esa reserva','error');
  var c = C.clientes.filter(function(x){ return x.id === r.cliente_id; })[0] || {};
  var v = vehiculoDe(r.vehiculo_id) || {};
  var saldo = Number(r.precio_acordado) - Number(r.monto_sena);

  hoja('Recibo de seña '+(r.recibo_nro||''),
    '<div class="nro">Recibo N.º <b>'+esc(r.recibo_nro||'—')+'</b><br>'+dia(r.fecha)+'</div>'+
    '<div class="marca">BivonaCars</div>'+
    '<h1>Recibo de seña</h1>'+
    '<hr>'+
    '<p>Recibí de <b>'+esc((c.nombre||'')+' '+(c.apellido||''))+'</b>'+
    (c.dni?', documento N.º '+esc(c.dni):'')+
    (c.domicilio?', con domicilio en '+esc(c.domicilio):'')+
    ', la suma de <b>'+plata(r.moneda, r.monto_sena)+'</b> en concepto de <b>seña</b> por la compra '+
    'del vehículo que se detalla a continuación.</p>'+

    '<h2>Vehículo</h2>'+
    '<table>'+
    '<tr><td class="e">Marca y modelo</td><td><b>'+esc((v.marca||'')+' '+(v.modelo||'')+' '+(v.version||''))+'</b></td></tr>'+
    '<tr><td class="e">Año</td><td>'+esc(v.anio||'—')+'</td></tr>'+
    '<tr><td class="e">Kilómetros</td><td>'+(v.km||0).toLocaleString('es-AR')+' km</td></tr>'+
    '<tr><td class="e">Dominio</td><td>'+esc(v.patente||'—')+'</td></tr>'+
    '<tr><td class="e">Color</td><td>'+esc(v.color||'—')+'</td></tr>'+
    '</table>'+

    '<h2>Condiciones de la operación</h2>'+
    '<div class="caja">'+
    '<table>'+
    '<tr><td class="e">Precio total pactado</td><td class="total">'+plata(r.moneda, r.precio_acordado)+'</td></tr>'+
    '<tr><td class="e">Seña entregada</td><td><b>'+plata(r.moneda, r.monto_sena)+'</b> — '+esc(r.metodo_pago)+'</td></tr>'+
    '<tr><td class="e">Saldo a abonar</td><td><b>'+plata(r.moneda, saldo)+'</b></td></tr>'+
    '<tr><td class="e">Vigencia de la reserva</td><td>hasta el <b>'+dia(r.vence)+'</b></td></tr>'+
    '<tr><td class="e">Gastos de transferencia</td><td>a cargo de <b>'+esc(r.gastos_transferencia||'Comprador')+'</b></td></tr>'+
    (r.incluye_permuta?'<tr><td class="e">Permuta</td><td>la operación incluye la entrega de un vehículo usado</td></tr>':'')+
    (r.incluye_financiacion?'<tr><td class="e">Financiación</td><td>la operación se completa con financiación</td></tr>':'')+
    '</table></div>'+

    (r.condiciones?'<h2>Condiciones particulares</h2><p>'+esc(r.condiciones)+'</p>':'')+

    '<p class="chico">La presente seña se otorga conforme los artículos 1059 y 1060 del Código Civil y Comercial '+
    'de la Nación. El vehículo queda reservado a favor del comprador hasta la fecha indicada. '+
    'Vencido dicho plazo sin haberse concretado la operación, la reserva caduca de pleno derecho. '+
    'El comprador declara haber inspeccionado la unidad y conocer su estado.</p>'+

    '<div class="firmas">'+
    '<div class="firma">Firma del comprador<br>'+esc((c.nombre||'')+' '+(c.apellido||''))+'</div>'+
    '<div class="firma">Por BivonaCars<br>Aclaración y sello</div>'+
    '</div>');
};

window.imprimirBoleto = function(operacionId){
  var o = D.operaciones.filter(function(x){ return x.id === operacionId; })[0];
  if(!o) return toast('No encuentro esa operación','error');
  var c = C.clientes.filter(function(x){ return x.id === o.cliente_id; })[0] || {};
  var v = vehiculoDe(o.vehiculo_id) || {};
  var i = C.internos[o.vehiculo_id] || {};
  var sena = Number(o.sena_monto||0), saldo = Number(o.precio) - sena;

  hoja('Boleto de compraventa',
    '<div class="nro">'+dia(o.fecha)+(o.hash?'<br>Ref. '+esc(o.hash):'')+'</div>'+
    '<div class="marca">BivonaCars</div>'+
    '<h1>Boleto de compraventa de automotor</h1>'+
    '<hr>'+

    '<p>En la Ciudad de Buenos Aires, a los '+new Date(o.fecha+'T12:00:00').getDate()+' días del mes de '+
    new Date(o.fecha+'T12:00:00').toLocaleDateString('es-AR',{month:'long'})+' de '+
    new Date(o.fecha+'T12:00:00').getFullYear()+', entre <b>'+esc(v.propietario||'el vendedor')+'</b> '+
    '(en adelante, "el VENDEDOR"), con la intervención de <b>BivonaCars</b> en calidad de intermediaria, '+
    'y <b>'+esc(o.comprador||'')+'</b>'+(c.dni?', documento N.º '+esc(c.dni):'')+
    ' (en adelante, "el COMPRADOR"), se conviene la presente compraventa.</p>'+

    '<h2>Primera — Objeto</h2>'+
    '<p>El VENDEDOR vende y el COMPRADOR adquiere el automotor que se describe:</p>'+
    '<table>'+
    '<tr><td class="e">Marca y modelo</td><td><b>'+esc((v.marca||'')+' '+(v.modelo||'')+' '+(v.version||''))+'</b></td></tr>'+
    '<tr><td class="e">Año</td><td>'+esc(v.anio||'—')+'</td></tr>'+
    '<tr><td class="e">Dominio</td><td><b>'+esc(v.patente||'—')+'</b></td></tr>'+
    '<tr><td class="e">N.º de chasis</td><td>'+esc(i.nro_chasis||'—')+'</td></tr>'+
    '<tr><td class="e">N.º de motor</td><td>'+esc(i.nro_motor||'—')+'</td></tr>'+
    '<tr><td class="e">Kilometraje</td><td>'+(v.km||0).toLocaleString('es-AR')+' km</td></tr>'+
    '<tr><td class="e">Color</td><td>'+esc(v.color||'—')+'</td></tr>'+
    '<tr><td class="e">Titular registral</td><td>'+esc(i.titular_registral||v.propietario||'—')+'</td></tr>'+
    '</table>'+

    '<h2>Segunda — Precio y forma de pago</h2>'+
    '<div class="caja"><table>'+
    '<tr><td class="e">Precio total</td><td class="total">'+usd(o.precio)+'</td></tr>'+
    (sena?'<tr><td class="e">Seña ya entregada</td><td>'+usd(sena)+'</td></tr>':'')+
    (sena?'<tr><td class="e">Saldo abonado en este acto</td><td><b>'+usd(saldo)+'</b></td></tr>':'')+
    '<tr><td class="e">Forma de pago</td><td>'+esc(o.forma_pago||'—')+'</td></tr>'+
    '</table></div>'+

    '<h2>Tercera — Entrega y estado</h2>'+
    '<p>El COMPRADOR declara haber inspeccionado el vehículo, verificado su funcionamiento y '+
    'aceptarlo en el estado en que se encuentra, que declara conocer.'+
    ((v.deuda_patentes||v.deuda_infracciones||v.prenda)
      ? ' Se deja expresa constancia de que el vehículo registra '+
        [v.deuda_patentes?'deuda de patentes':'', v.deuda_infracciones?'infracciones impagas':'',
         v.prenda?'prenda inscripta':''].filter(Boolean).join(', ')+
        ', circunstancia que el COMPRADOR declara conocer y aceptar.'
      : ' Se deja constancia de que el vehículo no registra deudas de patentes, infracciones impagas ni prenda.')+
    '</p>'+

    '<h2>Cuarta — Transferencia</h2>'+
    '<p>Las partes se obligan a suscribir el Formulario 08 y a realizar la inscripción del cambio de '+
    'titularidad ante el Registro Nacional de la Propiedad del Automotor dentro de los diez (10) días '+
    'corridos. Los gastos del trámite quedan a cargo del '+
    esc((v.transferencia_a_cargo||'COMPRADOR')).toUpperCase()+'.</p>'+

    '<h2>Quinta — Responsabilidad</h2>'+
    '<p>A partir de la entrega del vehículo, el COMPRADOR asume la guarda, el uso y toda responsabilidad '+
    'civil, contravencional y de tránsito derivada de su circulación, manteniendo indemne al VENDEDOR '+
    'y a la intermediaria.</p>'+

    (o.observaciones?'<h2>Sexta — Observaciones</h2><p>'+esc(o.observaciones)+'</p>':'')+

    '<p class="chico">Se firman dos ejemplares de un mismo tenor y a un solo efecto. Para cualquier '+
    'controversia las partes se someten a los tribunales ordinarios de la jurisdicción correspondiente '+
    'al domicilio del vendedor.</p>'+

    '<div class="firmas">'+
    '<div class="firma">VENDEDOR<br>'+esc(v.propietario||'')+'</div>'+
    '<div class="firma">COMPRADOR<br>'+esc(o.comprador||'')+'</div>'+
    '</div>'+
    '<div class="firmas" style="margin-top:40px">'+
    '<div class="firma" style="max-width:280px;margin:0 auto">Por BivonaCars — intermediaria</div>'+
    '</div>');
};

window.imprimirFicha = function(vehiculoId){
  var v = vehiculoDe(vehiculoId); if(!v) return;
  var fs = C.fotos[vehiculoId] || [];
  var portada = fs.filter(function(f){ return f.portada; })[0] || fs[0];

  hoja('Ficha '+v.marca+' '+v.modelo,
    '<div class="marca">BivonaCars</div>'+
    '<h1>'+esc(v.marca+' '+v.modelo+' '+(v.version||''))+'</h1>'+
    '<hr>'+
    (portada?'<img src="'+esc(FOTOS+portada.ruta)+'" style="width:100%;max-height:300px;object-fit:cover;margin-bottom:16px">':'')+
    '<div class="caja"><table>'+
    '<tr><td class="e">Precio</td><td class="total">'+usd(v.precio)+'</td></tr>'+
    '<tr><td class="e">Año</td><td>'+esc(v.anio||'—')+'</td></tr>'+
    '<tr><td class="e">Kilómetros</td><td>'+(v.km||0).toLocaleString('es-AR')+' km</td></tr>'+
    '<tr><td class="e">Combustible</td><td>'+esc(v.combustible||'—')+'</td></tr>'+
    '<tr><td class="e">Transmisión</td><td>'+esc(v.transmision||'—')+'</td></tr>'+
    '<tr><td class="e">Color</td><td>'+esc(v.color||'—')+'</td></tr>'+
    '<tr><td class="e">Estado general</td><td>'+esc(v.estado_general||'—')+'</td></tr>'+
    '<tr><td class="e">Ubicación</td><td>'+esc(v.ubicacion||'—')+'</td></tr>'+
    '</table></div>'+
    (v.descripcion?'<h2>Descripción</h2><p>'+esc(v.descripcion)+'</p>':'')+
    ((v.equipamiento||[]).length?'<h2>Equipamiento</h2><p>'+v.equipamiento.map(esc).join(' · ')+'</p>':'')+
    '<p class="chico">Precio sujeto a confirmación. La unidad puede ser retirada de la venta sin previo aviso.</p>');
};

/* ═══════════════════════════════════════════════════════════════
   8. AVISOS EN EL PANEL
   ═══════════════════════════════════════════════════════════════ */

function pintarCampana(){
  var pend = C.notificaciones.filter(function(n){ return !n.leida; });
  var caja = document.querySelector('.topbar2');
  if(!caja) return;
  var vieja = document.getElementById('campanaAvisos');
  if(vieja) vieja.remove();

  var b = document.createElement('div');
  b.id = 'campanaAvisos';
  b.style.cssText = 'position:relative;cursor:pointer;padding:6px 10px;border-radius:8px;font-size:1.15rem';
  b.innerHTML = '🔔' + (pend.length
    ? '<span style="position:absolute;top:1px;right:2px;background:#DC2626;color:#fff;font-size:.6rem;'+
      'font-weight:800;padding:1px 5px;border-radius:9px;font-family:system-ui">'+pend.length+'</span>' : '');
  b.onclick = verAvisos;
  caja.appendChild(b);
}

function verAvisos(){
  var lista = C.notificaciones.slice(0,30);
  modal('Avisos',
    lista.length
      ? lista.map(function(n){
          var d = new Date(n.creado_en);
          return '<div style="padding:11px 0;border-bottom:1px solid var(--line);'+
            (n.leida?'opacity:.55':'')+'">'+
            '<b style="font-size:.88rem">'+esc(n.titulo)+'</b>'+
            (n.cuerpo?'<div style="font-size:.84rem;line-height:1.5;margin-top:2px">'+esc(n.cuerpo)+'</div>':'')+
            '<div class="mini">'+d.toLocaleDateString('es-AR')+' '+
            d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+'</div></div>';
        }).join('')
      : '<div class="mini">No tenés avisos.</div>',
    [{txt:'Cerrar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Marcar todo leído',clase:'',fn:'marcarLeidos()'}]);
}

window.marcarLeidos = async function(){
  await sb.from('notificaciones').update({ leida:true }).eq('usuario_id', perfil.id).eq('leida', false);
  cerrarModal(); await cargarCrm(); render();
};

/* ═══════════════════════════════════════════════════════════════
   9. CARGA DE DATOS Y ENGANCHE
   ═══════════════════════════════════════════════════════════════ */

async function cargarCrm(){
  var pedidos = [
    sb.from('clientes').select('*').order('creado_en',{ascending:false}),
    sb.from('interacciones').select('*').order('fecha',{ascending:false}).limit(600),
    sb.from('reservas').select('*').order('creado_en',{ascending:false}),
    sb.from('cobros').select('*'),
    sb.from('transferencias').select('*'),
    sb.from('pagos_comision').select('*').order('creado_en',{ascending:false}),
    sb.from('notificaciones').select('*').order('creado_en',{ascending:false}).limit(40),
    sb.from('vehiculos_internos').select('*'),
    sb.from('vehiculo_fotos').select('*').order('orden'),
    sb.from('historial_precios').select('*').order('creado_en',{ascending:false}).limit(300)
  ];
  if(perfil && perfil.es_dueno)
    pedidos.push(sb.from('auditoria').select('*').order('creado_en',{ascending:false}).limit(200));

  var r = await Promise.all(pedidos.map(function(p){
    return p.then(function(x){ return x; }).catch(function(){ return { data:[] }; });
  }));

  C.clientes       = r[0].data || [];
  C.interacciones  = r[1].data || [];
  C.reservas       = r[2].data || [];
  C.cobros         = r[3].data || [];
  C.transferencias = r[4].data || [];
  C.comisiones     = r[5].data || [];
  C.notificaciones = r[6].data || [];
  C.precios        = r[9].data || [];
  C.auditoria      = (r[10] && r[10].data) || [];

  C.internos = {};
  (r[7].data || []).forEach(function(i){ C.internos[i.vehiculo_id] = i; });

  C.fotos = {};
  (r[8].data || []).forEach(function(f){
    (C.fotos[f.vehiculo_id] = C.fotos[f.vehiculo_id] || []).push(f); });
}
window.cargarCrm = cargarCrm;

/* Secciones nuevas */
SECCIONES.clientes       = { t:'Clientes y prospectos', s:'Quién preguntó, en qué anda y cuándo volver a llamarlo', f:vistaClientes };
SECCIONES.reservas       = { t:'Señas y reservas',      s:'Vehículos con seña puesta y cierre de operaciones',      f:vistaReservas };
SECCIONES.stock          = { t:'Stock y precios',       s:'Editar, pausar y controlar la antigüedad del inventario', f:vistaStock };
SECCIONES.transferencias = { t:'Transferencias',        s:'El trámite después de la venta, paso por paso',           f:vistaTransferencias };
SECCIONES.comisiones     = { t:'Comisiones a pagar',    s:'Lo que le debés a cada comisionista',                     f:vistaComisiones };
SECCIONES.auditoria      = { t:'Movimientos',           s:'Quién cambió qué y cuándo',                               f:vistaAuditoria };

/* Menú: se arma completo y después se recorta por permisos */
MENU.splice(1, 0, { grupo:'Ventas', items:[
  { id:'clientes',  ic:'👥', txt:'Clientes',  cnt:function(){ return vencidos().length; } },
  { id:'reservas',  ic:'🤝', txt:'Señas',     cnt:function(){
      return C.reservas.filter(function(r){ return r.estado==='activa'; }).length; } },
  { id:'stock',     ic:'📦', txt:'Stock' }
]});

MENU.push({ grupo:'Cierre', items:[
  { id:'transferencias', ic:'📋', txt:'Transferencias', cnt:function(){
      return C.transferencias.filter(function(t){ return t.estado!=='inscripto'; }).length; } },
  { id:'comisiones',     ic:'💵', txt:'Comisiones',     cnt:function(){
      return C.comisiones.filter(function(c){ return c.estado==='pendiente'; }).length; } },
  { id:'auditoria',      ic:'🔍', txt:'Movimientos' }
]});

/* ── Cada área ve solo lo suyo ─────────────────────────────────── */
var REQUIERE = {
  resumen:'estadisticas', catalogo:'publicar', verificar:'verificaciones',
  vendedores:'comisionistas', visitas:'visitas', docs:'documentacion',
  historial:'cerrar_ventas', estadisticas:'estadisticas', marketing:'marketing',
  fiscal:'fiscal', publicar:'publicar', configuracion:'configuracion',
  clientes:'clientes', reservas:'cerrar_ventas', stock:'publicar',
  transferencias:'documentacion', comisiones:'comisionistas',
  equipo:'__dueno__', auditoria:'__dueno__'
};
var ALTERNATIVAS = {
  catalogo:      ['publicar','editar_vehiculos','cerrar_ventas'],
  stock:         ['publicar','editar_vehiculos'],
  historial:     ['cerrar_ventas','estadisticas'],
  resumen:       ['estadisticas','cerrar_ventas'],
  clientes:      ['clientes','cerrar_ventas'],
  reservas:      ['cerrar_ventas','clientes'],
  transferencias:['documentacion','cerrar_ventas'],
  comisiones:    ['comisionistas','estadisticas']
};

function habilitado(id){
  if(!perfil) return false;
  if(perfil.es_dueno) return true;
  if(REQUIERE[id] === '__dueno__') return false;
  var lista = ALTERNATIVAS[id] || [REQUIERE[id]];
  var mios = perfil.permisos || [];
  for(var i=0;i<lista.length;i++) if(mios.indexOf(lista[i]) >= 0) return true;
  return false;
}

/* La foto del menú completo se saca en el primer dibujado, no al
   cargar el archivo: así incluye lo que agreguen otros archivos. */
var menuCompleto = null;

function recortarMenu(){
  if(!menuCompleto) menuCompleto = MENU.slice();
  var nuevo = [];
  for(var g=0; g<menuCompleto.length; g++){
    var items = menuCompleto[g].items.filter(function(i){ return habilitado(i.id); });
    if(items.length) nuevo.push({ grupo: menuCompleto[g].grupo, items: items });
  }
  MENU.length = 0;
  for(var k=0;k<nuevo.length;k++) MENU.push(nuevo[k]);
  return nuevo;
}

var renderPrevio = window.render;
window.render = function(){
  var grupos = recortarMenu();
  if(!habilitado(seccion))
    seccion = (grupos[0] && grupos[0].items[0]) ? grupos[0].items[0].id : 'equipo';

  renderPrevio();

  var pie = document.querySelector('.side-foot b');
  if(pie && perfil && !perfil.es_dueno && !document.getElementById('etiquetaAreas')){
    var e = document.createElement('div');
    e.id = 'etiquetaAreas';
    e.style.cssText = 'font-size:.66rem;color:#5F7893;font-weight:700;margin-top:2px';
    e.textContent = (perfil.permisos||[]).length + ' área(s) habilitada(s)';
    pie.parentNode.insertBefore(e, pie.nextSibling);
  }
  pintarCampana();
};

var cargarPrevio = window.cargarTodo;
window.cargarTodo = async function(){
  await cargarPrevio();
  await cargarCrm();
};

(async function arranque(){
  try {
    await cargarCrm();
    await sb.rpc('vencer_reservas');
    if(typeof render === 'function') render();
  } catch(e){ /* el panel sigue funcionando igual */ }
})();

})();

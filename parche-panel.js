/* AutoNet — panel de gestión. Reemplaza las secciones que hacía falta
   rehacer y agrega las que faltaban. Se carga después de panel.js. */

(function(){
'use strict';

var BASE  = 'https://qymqfjtistprotddoqkz.supabase.co';
var FOTOS = BASE + '/storage/v1/object/public/vehiculos/';

var fotosElegidas = [];
var config = {}, permisosDisponibles = [], campanas = [], gastos = [], recurrentes = [];
var periodo = new Date().toISOString().slice(0,7);

var EQUIPAMIENTO = ['Aire acondicionado','Climatizador bizona','Dirección asistida','Levantavidrios eléctricos',
  'Cierre centralizado','Alarma','Airbags','ABS','Control de estabilidad','Control de tracción',
  'Tapizado de cuero','Butacas eléctricas','Butacas calefaccionadas','Techo corredizo','Llantas de aleación',
  'Faros LED','Faros antiniebla','Cámara de retroceso','Cámara 360','Sensores de estacionamiento',
  'Pantalla táctil','Android Auto / CarPlay','Bluetooth','GPS','Control crucero','Control crucero adaptativo',
  'Computadora de a bordo','Volante multifunción','Levas al volante','Asistente de carril','Frenado automático',
  'Barras de techo','Enganche','Cubrecaja','Estribos','Cobertor de caja','Tercera fila de asientos'];

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function num(id){ var v = Number(val(id)); return isFinite(v) && v !== 0 ? v : null; }
function chk(id){ var e = document.getElementById(id); return !!(e && e.checked); }
function pesos(n){ return '$ ' + Math.round(Number(n)||0).toLocaleString('es-AR'); }
function puedo(clave){ return !!(perfil && (perfil.es_dueno || (perfil.permisos||[]).indexOf(clave) >= 0)); }

function campo(etiqueta, id, tipo, extra, obligatorio){
  return '<div class="fld"><label>'+etiqueta+(obligatorio?' <span style="color:#DC2626">*</span>':'')+'</label>'+
    '<input id="'+id+'" type="'+(tipo||'text')+'" '+(extra||'')+'></div>';
}
function seleccion(etiqueta, id, opciones, obligatorio){
  return '<div class="fld"><label>'+etiqueta+(obligatorio?' <span style="color:#DC2626">*</span>':'')+'</label>'+
    '<select id="'+id+'">'+opciones.map(function(o){
      return '<option value="'+esc(o)+'">'+esc(o||'—')+'</option>'; }).join('')+'</select></div>';
}
function tilde(etiqueta, id){
  return '<label class="chk"><input type="checkbox" id="'+id+'"><span>'+etiqueta+'</span></label>';
}
function tarjeta(titulo, hint, cuerpo){
  return '<div class="card" style="margin-bottom:18px"><div class="card-h"><h3>'+titulo+'</h3>'+
    (hint?'<span class="hint">'+hint+'</span>':'')+'</div><div class="card-b">'+cuerpo+'</div></div>';
}
function sinPermiso(area){
  return '<div class="note r"><b>No tenés acceso a esta sección.</b> '+
    'Pedile al dueño del negocio que te habilite el permiso de '+area+'.</div>';
}

/* ═══════════════ ALTA DE VEHÍCULO ═══════════════ */
window.elegirFotos = function(input){
  var nuevos = Array.prototype.slice.call(input.files || []);
  for(var i=0;i<nuevos.length;i++){
    if(nuevos[i].size > 8*1024*1024){ toast('"'+nuevos[i].name+'" supera los 8 MB','error'); continue; }
    fotosElegidas.push(nuevos[i]);
  }
  input.value = '';
  if(fotosElegidas.length > 25){ fotosElegidas = fotosElegidas.slice(0,25); toast('Máximo 25 fotos','error'); }
  dibujarFotos();
};
window.quitarFoto   = function(i){ fotosElegidas.splice(i,1); dibujarFotos(); };
window.haciaPortada = function(i){ fotosElegidas.unshift(fotosElegidas.splice(i,1)[0]); dibujarFotos(); };

function dibujarFotos(){
  var c = document.getElementById('galeriaAlta');
  if(!c) return;
  if(!fotosElegidas.length){
    c.innerHTML = '<div class="mini" style="padding:12px 0">Todavía no cargaste fotos. La primera es la portada del catálogo.</div>';
    return;
  }
  c.innerHTML = fotosElegidas.map(function(f,i){
    return '<div style="position:relative;border-radius:9px;overflow:hidden;border:2px solid '+(i===0?'var(--blue)':'var(--line)')+'">'+
      '<img src="'+URL.createObjectURL(f)+'" style="width:100%;height:92px;object-fit:cover;display:block">'+
      (i===0?'<div style="position:absolute;top:0;left:0;right:0;background:var(--blue);color:#fff;font-size:.62rem;font-weight:800;text-align:center;padding:2px">PORTADA</div>':'')+
      '<div style="position:absolute;bottom:0;left:0;right:0;display:flex">'+
        (i!==0?'<button type="button" onclick="haciaPortada('+i+')" style="flex:1;background:rgba(10,37,64,.82);color:#fff;border:0;font-size:.62rem;font-weight:700;padding:3px;cursor:pointer">Portada</button>':'')+
        '<button type="button" onclick="quitarFoto('+i+')" style="flex:1;background:rgba(185,28,28,.86);color:#fff;border:0;font-size:.62rem;font-weight:700;padding:3px;cursor:pointer">Quitar</button>'+
      '</div></div>';
  }).join('');
}

function vistaPublicar(){
  if(!puedo('publicar')) return sinPermiso('publicar vehículos');
  setTimeout(dibujarFotos, 30);
  return '<div style="max-width:980px">'+

  tarjeta('📷 Fotos del vehículo','Obligatorio · la primera es la portada',
    '<label class="drop" style="margin-bottom:12px"><div class="ic">📷</div>'+
      '<b>Agregar fotos</b><small>JPG, PNG o WEBP · hasta 8 MB cada una · hasta 25 fotos</small>'+
      '<input type="file" accept="image/*" multiple onchange="elegirFotos(this)"></label>'+
    '<div id="galeriaAlta" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:9px"></div>')+

  tarjeta('Identificación','',
    '<div class="grid3">'+
      seleccion('Tipo','pvTipo',['Auto','Camioneta','SUV','Pick-up','Utilitario','Furgón','Moto','Cuatriciclo','Otro'],true)+
      campo('Marca','pvMarca','text','placeholder="Toyota"',true)+
      campo('Modelo','pvModelo','text','placeholder="Hilux"',true)+
    '</div><div class="grid3">'+
      campo('Versión','pvVersion','text','placeholder="SRX 4x4 AT"')+
      campo('Año','pvAnio','number','placeholder="2021"',true)+
      campo('Kilómetros','pvKm','number','placeholder="45000"',true)+
    '</div><div class="grid3">'+
      campo('Carrocería','pvCarroceria','text','placeholder="Doble cabina"')+
      seleccion('Uso anterior','pvUso',['Particular','Taxi','Remis','Flota empresarial','Escuela de manejo','Alquiler','Otro'])+
      campo('Patente','pvPatente','text','placeholder="AB123CD"')+
    '</div><div class="grid3">'+
      campo('Nº de chasis','pvChasis','text','placeholder="Solo para el equipo"')+
      campo('Nº de motor','pvMotorNro','text','placeholder="Solo para el equipo"')+
      campo('Titular registral','pvTitular','text','placeholder="Quién figura en el título"')+
    '</div>')+

  tarjeta('Mecánica','',
    '<div class="grid3">'+
      campo('Motor','pvMotor','text','placeholder="2.8 TDI"')+
      campo('Cilindrada','pvCilindrada','text','placeholder="2800 cc"')+
      campo('Potencia (HP)','pvPotencia','number','placeholder="204"')+
    '</div><div class="grid3">'+
      seleccion('Combustible','pvComb',['Nafta','Diésel','Híbrido','Eléctrico','GNC','Nafta/GNC'])+
      seleccion('Transmisión','pvTrans',['Manual','Automática','Automática secuencial','CVT'])+
      seleccion('Tracción','pvTraccion',['','4x2','4x4','AWD','Delantera','Trasera'])+
    '</div><div class="grid3">'+
      campo('Puertas','pvPuertas','number','placeholder="4"')+
      campo('Plazas','pvPlazas','number','placeholder="5"')+
      campo('Color exterior','pvColor','text','placeholder="Gris plata"')+
    '</div><div class="grid3">'+
      campo('Color interior','pvColorInt','text','placeholder="Negro"')+
      seleccion('Estado general','pvEstadoGral',['Excelente','Muy bueno','Bueno','Regular','A reparar'])+
      campo('Dueños anteriores','pvDuenos','number','placeholder="1"')+
    '</div><div class="grid3" style="margin-top:4px">'+
      tilde('Único dueño','pvUnico')+ tilde('Importado','pvImportado')+ tilde('Tiene GNC','pvGnc')+
    '</div>')+

  tarjeta('Estado, service y papeles','',
    '<div class="grid3">'+
      campo('Último service (km)','pvServiceKm','number','')+
      campo('Fecha del último service','pvServiceFecha','date','')+
      campo('Vencimiento de VTV','pvVtv','date','')+
    '</div><div class="grid3">'+
      campo('Cantidad de llaves','pvLlaves','number','placeholder="2"')+
      campo('Garantía de fábrica hasta','pvGarantiaHasta','date','')+
      seleccion('Gastos de transferencia','pvTransfer',['Comprador','Vendedor','Compartida'])+
    '</div><div class="grid3" style="margin-bottom:6px">'+
      tilde('Service al día','pvServiceOk')+ tilde('Service oficial','pvServiceOficial')+ tilde('Garantía de fábrica vigente','pvGarantia')+
    '</div><div class="grid3" style="margin-bottom:6px">'+
      tilde('Manual y libreta','pvManual')+ tilde('Rueda de auxilio','pvAuxilio')+ tilde('Criquet y llave de rueda','pvCriquet')+
    '</div><div class="grid3" style="margin-bottom:12px">'+
      tilde('Deuda de patentes','pvDeudaPat')+ tilde('Infracciones impagas','pvDeudaInf')+ tilde('Tiene prenda','pvPrenda')+
    '</div>'+
    '<div class="fld"><label>Historial de choques o arreglos de chapa</label>'+
      '<textarea id="pvChoques" rows="2" placeholder="Golpe en paragolpes trasero reparado en 2023, sin daño estructural."></textarea></div>'+
    '<div class="fld"><label>Detalles estéticos</label>'+
      '<textarea id="pvEstetica" rows="2" placeholder="Rayón en puerta trasera derecha, tapizado sin roturas…"></textarea></div>'+
    '<div class="fld"><label>Detalles mecánicos</label>'+
      '<textarea id="pvMecanica" rows="2" placeholder="Cubiertas al 70%, embrague cambiado a los 90.000 km…"></textarea></div>')+

  tarjeta('Equipamiento','Lo que marques se muestra en la ficha pública',
    '<div style="display:flex;flex-wrap:wrap;gap:7px">'+
      EQUIPAMIENTO.map(function(e,i){
        return '<label class="chk" style="margin:0;padding:6px 11px"><input type="checkbox" id="eq'+i+'"><span>'+esc(e)+'</span></label>';
      }).join('')+'</div>')+

  tarjeta('Precio, propietario y condiciones','',
    '<div class="grid3">'+
      campo('Precio de venta','pvPrecio','number','placeholder="38000"',true)+
      '<div class="fld"><label>Moneda del precio</label>'+
        '<select id="pvMoneda" onchange="cambiarMonedaAlta()">'+
          '<option value="USD">USD</option><option value="ARS">ARS</option>'+
        '</select></div>'+
      campo('Cotización usada','pvCotiz','number',
        'onchange="recalcularCotizAlta()" placeholder="pesos por dólar"')+
    '</div><div class="grid3">'+
      campo('Precio mínimo','pvPrecioMin','number','placeholder="Solo para el equipo"')+
      campo('Ubicación','pvUbic','text','placeholder="Vicente López, GBA Norte"')+
      '<div class="fld"><label>&nbsp;</label><div class="mini" style="line-height:1.45">'+
        'Se completa con la cotización de Configuración. Al cambiar de moneda '+
        'el precio se convierte solo. Queda congelada con el vehículo: es la '+
        'que ordena el catálogo y calcula la gama.</div></div>'+
    '</div><div class="grid3">'+
      campo('Propietario','pvProp','text','placeholder="Nombre y apellido"',true)+
      campo('Teléfono del propietario','pvTel','text','placeholder="+54 9 11 …"')+
      campo('Motivo de venta','pvMotivo','text','placeholder="Cambio de unidad"')+
    '</div><div class="grid3">'+
      campo('Disponibilidad para verlo','pvVerlo','text','placeholder="Lunes a viernes de 9 a 18"')+
    '</div><div class="grid3" style="margin-bottom:12px">'+
      tilde('Acepta permuta','pvPermuta')+ tilde('Acepta financiación','pvFinanciacion')+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Test drive</label><select id="pvTestDrive">'+
        '<option value="">Todavía no lo pregunté</option>'+
        '<option value="si">El dueño permite probarlo</option>'+
        '<option value="no">El dueño no permite probarlo</option>'+
      '</select></div>'+
    '</div>'+
    '<div class="fld"><label>Descripción pública</label>'+
      '<textarea id="pvDesc" rows="3" placeholder="Lo que ve el comisionista y le cuenta al comprador."></textarea></div>'+
    '<div class="fld"><label>Notas internas <span class="mini">(no se muestran en la web pública)</span></label>'+
      '<textarea id="pvNotas" rows="2" placeholder="El dueño acepta hasta 36.000. Retirar entre semana."></textarea></div>')+

  tarjeta('Documentación del vehículo','',
    '<div class="grid3">'+
      tilde('Título y cédula','dcDominio')+ tilde('Patentes al día','dcPatentes')+ tilde('VTV vigente','dcVtv')+
      tilde('Informe de dominio','dcPolicial')+ tilde('Mandato firmado','dcMandato')+
    '</div>')+

  '<div style="display:flex;gap:10px;flex-wrap:wrap;max-width:560px">'+
    '<button class="btn" style="flex:1;min-width:190px" onclick="publicarVehiculo()">Publicar vehículo</button>'+
    '<button class="btn btn-o" style="flex:1;min-width:190px" onclick="guardarBorrador()">Guardar borrador</button>'+
  '</div>'+
  '<div class="mini" style="margin-top:9px;max-width:560px">El borrador no sale a la web. '+
    'Además, lo que vas escribiendo queda recordado en este navegador aunque se cierre la página.</div></div>';
}

/* ═══════════════ BORRADORES Y DATOS INTERNOS ═══════════════
   Dos redes distintas para no volver a perder una carga larga:
   1) el navegador recuerda lo tipeado aunque se caiga la página
   2) "Guardar borrador" lo deja en el servidor, sin salir a la web    */

var CAJON = 'bivonacars-alta';
var borradorId = null;

/* Precio mínimo, teléfono, chasis, motor, titular y notas son del equipo:
   viven en "vehiculos_internos" y no en la ficha del vehículo. */
async function guardarInternos(idv){
  var algo = val('pvPrecioMin') || val('pvTel') || val('pvChasis') ||
             val('pvMotorNro')  || val('pvTitular') || val('pvNotas');
  if(!algo) return null;
  return await sb.from('vehiculos_internos').upsert({
    vehiculo_id: idv,
    precio_minimo: num('pvPrecioMin'),
    tel_propietario: val('pvTel')||null,
    nro_chasis: val('pvChasis')||null,
    nro_motor: val('pvMotorNro')||null,
    titular_registral: val('pvTitular')||null,
    notas_internas: val('pvNotas')||null,
    actualizado_en: new Date().toISOString()
  }, { onConflict:'vehiculo_id' });
}

function leerTestDrive(){
  var v = val('pvTestDrive');
  return v === 'si' ? true : (v === 'no' ? false : null);
}

/* La moneda del alta. Un precio en pesos sin cotización no se puede
   comparar con el resto del catálogo: no entra en el orden por precio ni
   cae en la gama que le corresponde. Por eso se exige al publicar; en un
   borrador se deja pasar, que para eso es un borrador. */
function cotizacionGeneral(){
  return Number(config.cotizacion_dolar ? config.cotizacion_dolar.valor : 0) || 0;
}

/* La cotización del alta arranca con la de Configuración, para no tener
   que escribirla en cada carga. Se puede pisar a mano si ese auto en
   particular se pactó a otro valor. */
function cotizacionDelAlta(){
  return Number(val('pvCotiz')) || cotizacionGeneral();
}

function monedaDelAlta(){
  var m = val('pvMoneda') === 'ARS' ? 'ARS' : 'USD';
  return { moneda: m, cotizacion: m === 'ARS' ? (cotizacionDelAlta() || null) : null };
}

/* Al cambiar de moneda se convierte el precio que ya está escrito, en vez
   de obligar a recalcularlo a mano. Se redondea: un precio de lista con
   centavos no le sirve a nadie. */
window.cambiarMonedaAlta = function(){
  var e = document.getElementById('pvMoneda');
  var nueva = (e && e.value === 'ARS') ? 'ARS' : 'USD';
  var previa = e ? (e.getAttribute('data-previa') || 'USD') : 'USD';
  if(e) e.setAttribute('data-previa', nueva);

  var cot = cotizacionDelAlta();
  var p   = Number(val('pvPrecio'));

  if(p > 0 && cot > 0 && nueva !== previa){
    var convertido = (nueva === 'ARS') ? p * cot : p / cot;
    ponerVal('pvPrecio', Math.round(convertido));
    toast('Precio convertido a ' + nueva + ' con cotización ' + cot, 'ok');
  } else if(nueva === 'ARS' && !(cot > 0)){
    toast('Cargá la cotización del dólar en Configuración para convertir solo','error');
  }
  if(nueva === 'ARS' && cot > 0 && !val('pvCotiz')) ponerVal('pvCotiz', cot);
};

/* Si se corrige la cotización a mano y el precio ya está en pesos, se
   reexpresa con el valor nuevo. */
window.recalcularCotizAlta = function(){
  var e = document.getElementById('pvMoneda');
  if(!e || e.value !== 'ARS') return;
  var cot = Number(val('pvCotiz'));
  var p   = Number(val('pvPrecio'));
  if(cot > 0 && p > 0) toast('Cotización actualizada a ' + cot, 'ok');
};

function camposDelAlta(){
  return document.querySelectorAll('[id^="pv"],[id^="dc"],[id^="eq"]');
}

function recordarAlta(){
  try{
    var d = {}, n = camposDelAlta();
    for(var i=0;i<n.length;i++){
      d[n[i].id] = (n[i].type === 'checkbox') ? !!n[i].checked : n[i].value;
    }
    d.__id = borradorId;
    window.localStorage.setItem(CAJON, JSON.stringify(d));
  }catch(e){}
}

function leerCajon(){
  try{ return JSON.parse(window.localStorage.getItem(CAJON) || 'null'); }
  catch(e){ return null; }
}

function hayAltaGuardada(){
  var d = leerCajon();
  if(!d) return false;
  return Object.keys(d).some(function(k){
    return k !== '__id' && d[k] !== '' && d[k] !== false && d[k] != null;
  });
}

function olvidarAlta(){
  try{ window.localStorage.removeItem(CAJON); }catch(e){}
  borradorId = null;
}

window.retomarBorrador = function(){
  var d = leerCajon();
  if(!d) return;
  Object.keys(d).forEach(function(id){
    if(id === '__id') return;
    var e = document.getElementById(id);
    if(!e) return;
    if(e.type === 'checkbox') e.checked = !!d[id];
    else e.value = d[id];
  });
  borradorId = d.__id || null;
  var a = document.getElementById('avisoBorrador');
  if(a) a.remove();
  toast('Listo, recuperé lo que habías cargado','ok');
};

window.descartarBorrador = function(){
  if(!confirm('Se borra lo que habías cargado en este navegador. ¿Seguro?')) return;
  olvidarAlta();
  var a = document.getElementById('avisoBorrador');
  if(a) a.remove();
};

/* ── Borradores guardados en el servidor ──────────────────────
   Guardar no alcanza: hay que poder volver a abrirlos. */
async function pintarBorradores(){
  var caja = document.querySelector('.content');
  if(!caja || document.getElementById('cajaBorradores')) return;
  var r = await sb.from('vehiculos')
    .select('id,marca,modelo,version,anio')
    .eq('estado','borrador').order('id',{ ascending:false });
  if(r.error || !r.data || !r.data.length) return;

  var filas = r.data.map(function(v){
    return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;'+
      'padding:9px 0;border-top:1px solid var(--line)">'+
      '<b style="flex:1;min-width:190px;font-size:.9rem">'+
        esc(v.marca+' '+v.modelo+(v.version ? ' '+v.version : '')+(v.anio ? ' · '+v.anio : ''))+
      '</b>'+
      '<button class="btn" style="padding:6px 14px;font-size:.8rem" '+
        'onclick="retomarVehiculo('+v.id+')">Continuar</button>'+
      '<button class="btn btn-o" style="padding:6px 14px;font-size:.8rem" '+
        'onclick="borrarBorrador('+v.id+')">Descartar</button>'+
    '</div>';
  }).join('');

  var d = document.createElement('div');
  d.id = 'cajaBorradores';
  d.style.cssText = 'background:#fff;border:1px solid var(--line);border-radius:13px;'+
    'padding:16px 20px;margin-bottom:16px;box-shadow:var(--shadow)';
  d.innerHTML = '<div style="font-weight:800;color:var(--navy)">Borradores sin terminar</div>'+
    '<div class="mini" style="margin-bottom:4px">No están en la web. '+
    'Abrí uno para completarlo y publicarlo.</div>'+ filas;
  caja.insertBefore(d, caja.firstChild);
}

function ponerVal(id, v){
  var e = document.getElementById(id);
  if(e) e.value = (v == null ? '' : v);
}
function ponerChk(id, v){
  var e = document.getElementById(id);
  if(e) e.checked = !!v;
}

window.borrarBorrador = async function(id){
  if(!confirm('Se borra este borrador y no se puede deshacer. ¿Seguro?')) return;
  cargando(true,'Borrando…');
  var r = await sb.from('vehiculos').delete().eq('id', id).eq('estado','borrador');
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  if(borradorId === id) olvidarAlta();
  var c = document.getElementById('cajaBorradores');
  if(c) c.remove();
  pintarBorradores();
  toast('Borrador descartado','ok');
};

window.retomarVehiculo = async function(id){
  cargando(true,'Abriendo el borrador…');
  var v = await sb.from('vehiculos').select('*').eq('id', id).single();
  if(v.error){ cargando(false); return toast(mensajeError(v.error),'error'); }
  var i = await sb.from('vehiculos_internos').select('*').eq('vehiculo_id', id).maybeSingle();
  cargando(false);
  var d = v.data, n = (i && i.data) || {};

  ponerVal('pvTipo', d.tipo);              ponerVal('pvMarca', d.marca);
  ponerVal('pvModelo', d.modelo);          ponerVal('pvVersion', d.version);
  ponerVal('pvAnio', d.anio);              ponerVal('pvKm', d.km);
  ponerVal('pvPrecio', d.precio);          ponerVal('pvUbic', d.ubicacion);
  ponerVal('pvMoneda', d.moneda || 'USD');  ponerVal('pvCotiz', d.cotizacion);
  ponerVal('pvCarroceria', d.carroceria);  ponerVal('pvUso', d.uso_previo);
  ponerVal('pvPatente', d.patente);        ponerVal('pvProp', d.propietario);
  ponerVal('pvMotivo', d.motivo_venta);    ponerVal('pvVerlo', d.disponible_para_ver);
  ponerVal('pvMotor', d.motor);            ponerVal('pvCilindrada', d.cilindrada);
  ponerVal('pvPotencia', d.potencia_hp);   ponerVal('pvComb', d.combustible);
  ponerVal('pvTrans', d.transmision);      ponerVal('pvTraccion', d.traccion);
  ponerVal('pvPuertas', d.puertas);        ponerVal('pvPlazas', d.plazas);
  ponerVal('pvColor', d.color);            ponerVal('pvColorInt', d.color_interior);
  ponerVal('pvEstadoGral', d.estado_general);
  ponerVal('pvDuenos', d.duenos_anteriores);
  ponerVal('pvServiceKm', d.ultimo_service_km);
  ponerVal('pvServiceFecha', d.ultimo_service_fecha);
  ponerVal('pvVtv', d.vtv_vence);          ponerVal('pvLlaves', d.cantidad_llaves);
  ponerVal('pvGarantiaHasta', d.garantia_hasta);
  ponerVal('pvTransfer', d.transferencia_a_cargo);
  ponerVal('pvChoques', d.historial_choques);
  ponerVal('pvEstetica', d.detalles_esteticos);
  ponerVal('pvMecanica', d.detalles_mecanicos);
  ponerVal('pvDesc', d.descripcion);
  ponerVal('pvTestDrive', d.test_drive === true ? 'si' : (d.test_drive === false ? 'no' : ''));

  ponerChk('pvUnico', d.unico_dueno);          ponerChk('pvImportado', d.importado);
  ponerChk('pvGnc', d.tiene_gnc);              ponerChk('pvServiceOk', d.service_al_dia);
  ponerChk('pvServiceOficial', d.service_oficial);
  ponerChk('pvManual', d.tiene_manual);        ponerChk('pvAuxilio', d.tiene_auxilio);
  ponerChk('pvCriquet', d.tiene_criquet);      ponerChk('pvGarantia', d.garantia_fabrica);
  ponerChk('pvDeudaPat', d.deuda_patentes);    ponerChk('pvDeudaInf', d.deuda_infracciones);
  ponerChk('pvPrenda', d.prenda);              ponerChk('pvPermuta', d.acepta_permuta);
  ponerChk('pvFinanciacion', d.acepta_financiacion);
  ponerChk('dcDominio', d.doc_dominio);        ponerChk('dcPatentes', d.doc_patentes);
  ponerChk('dcVtv', d.doc_vtv);                ponerChk('dcPolicial', d.doc_policial);
  ponerChk('dcMandato', d.doc_mandato);

  var tiene = d.equipamiento || [];
  EQUIPAMIENTO.forEach(function(e,k){ ponerChk('eq'+k, tiene.indexOf(e) >= 0); });

  ponerVal('pvPrecioMin', n.precio_minimo);    ponerVal('pvTel', n.tel_propietario);
  ponerVal('pvChasis', n.nro_chasis);          ponerVal('pvMotorNro', n.nro_motor);
  ponerVal('pvTitular', n.titular_registral);  ponerVal('pvNotas', n.notas_internas);

  borradorId = id;
  recordarAlta();
  var c = document.getElementById('cajaBorradores');  if(c) c.remove();
  var a = document.getElementById('avisoBorrador');   if(a) a.remove();
  toast('Listo. Cargá las fotos y dale a Publicar','ok');
};

window.guardarBorrador = async function(){
  var marca = val('pvMarca'), modelo = val('pvModelo');
  if(!marca || !modelo) return toast('Para guardar un borrador necesito al menos marca y modelo','error');

  var equipo = [];
  EQUIPAMIENTO.forEach(function(e,i){ if(chk('eq'+i)) equipo.push(e); });

  var ficha = {
    tipo: val('pvTipo')||'Auto', marca: marca, modelo: modelo, version: val('pvVersion')||null,
    anio: num('pvAnio'), km: Number(val('pvKm'))||0,
    precio: Number(val('pvPrecio'))||null, estado: 'borrador',
    moneda: monedaDelAlta().moneda, cotizacion: monedaDelAlta().cotizacion,
    carroceria: val('pvCarroceria')||null, uso_previo: val('pvUso')||'Particular',
    ubicacion: val('pvUbic')||null, propietario: val('pvProp')||'A completar',
    patente: val('pvPatente')||null,
    motor: val('pvMotor')||null, cilindrada: val('pvCilindrada')||null, potencia_hp: num('pvPotencia'),
    combustible: val('pvComb'), transmision: val('pvTrans'), traccion: val('pvTraccion')||null,
    puertas: num('pvPuertas'), plazas: num('pvPlazas'),
    color: val('pvColor')||null, color_interior: val('pvColorInt')||null,
    estado_general: val('pvEstadoGral')||'Muy bueno', duenos_anteriores: num('pvDuenos'),
    unico_dueno: chk('pvUnico'), importado: chk('pvImportado'), tiene_gnc: chk('pvGnc'),
    service_al_dia: chk('pvServiceOk'), service_oficial: chk('pvServiceOficial'),
    ultimo_service_km: num('pvServiceKm'), ultimo_service_fecha: val('pvServiceFecha')||null,
    vtv_vence: val('pvVtv')||null, cantidad_llaves: num('pvLlaves'),
    tiene_manual: chk('pvManual'), tiene_auxilio: chk('pvAuxilio'), tiene_criquet: chk('pvCriquet'),
    garantia_fabrica: chk('pvGarantia'), garantia_hasta: val('pvGarantiaHasta')||null,
    transferencia_a_cargo: val('pvTransfer')||'Comprador',
    deuda_patentes: chk('pvDeudaPat'), deuda_infracciones: chk('pvDeudaInf'), prenda: chk('pvPrenda'),
    historial_choques: val('pvChoques')||null,
    detalles_esteticos: val('pvEstetica')||null, detalles_mecanicos: val('pvMecanica')||null,
    equipamiento: equipo, descripcion: val('pvDesc')||null, motivo_venta: val('pvMotivo')||null,
    acepta_permuta: chk('pvPermuta'), acepta_financiacion: chk('pvFinanciacion'),
    disponible_para_ver: val('pvVerlo')||null, test_drive: leerTestDrive(), icono: '🚗',
    doc_dominio: chk('dcDominio'), doc_patentes: chk('dcPatentes'), doc_vtv: chk('dcVtv'),
    doc_policial: chk('dcPolicial'), doc_mandato: chk('dcMandato')
  };

  cargando(true,'Guardando borrador…');
  var r = borradorId
    ? await sb.from('vehiculos').update(ficha).eq('id', borradorId).select('id').single()
    : await sb.from('vehiculos').insert(ficha).select('id').single();
  if(r.error){ cargando(false); return toast(mensajeError(r.error),'error'); }
  borradorId = r.data.id;

  var interno = await guardarInternos(borradorId);
  if(interno && interno.error){ cargando(false); return toast(mensajeError(interno.error),'error'); }

  recordarAlta();
  await cargarTodo(); cargando(false);
  toast('Borrador guardado. No está en la web; lo retomás cuando quieras','ok');
};

window.publicarVehiculo = async function(){
  var marca = val('pvMarca'), modelo = val('pvModelo');
  var precio = Number(val('pvPrecio')), prop = val('pvProp'), anio = Number(val('pvAnio'));

  if(!marca || !modelo) return toast('Completá marca y modelo','error');
  if(!anio)   return toast('Completá el año','error');
  if(!precio) return toast('Completá el precio de venta','error');
  var mon = monedaDelAlta();
  if(mon.moneda === 'ARS' && !(mon.cotizacion > 0))
    return toast('Falta la cotización del dólar. Cargala en Configuración o escribila acá','error');
  if(!prop)   return toast('Completá el propietario','error');
  if(!fotosElegidas.length) return toast('Cargá al menos una foto del vehículo','error');

  var equipo = [];
  EQUIPAMIENTO.forEach(function(e,i){ if(chk('eq'+i)) equipo.push(e); });

  cargando(true,'Publicando…');
  var ficha = {
    tipo: val('pvTipo')||'Auto', marca: marca, modelo: modelo, version: val('pvVersion')||null,
    anio: anio, km: Number(val('pvKm'))||0, precio: precio, estado: 'disponible',
    moneda: mon.moneda, cotizacion: mon.cotizacion,
    carroceria: val('pvCarroceria')||null, uso_previo: val('pvUso')||'Particular',
    ubicacion: val('pvUbic')||'CABA', propietario: prop, patente: val('pvPatente')||null,
    motor: val('pvMotor')||null, cilindrada: val('pvCilindrada')||null, potencia_hp: num('pvPotencia'),
    combustible: val('pvComb'), transmision: val('pvTrans'), traccion: val('pvTraccion')||null,
    puertas: num('pvPuertas'), plazas: num('pvPlazas'),
    color: val('pvColor')||null, color_interior: val('pvColorInt')||null,
    estado_general: val('pvEstadoGral')||'Muy bueno', duenos_anteriores: num('pvDuenos'),
    unico_dueno: chk('pvUnico'), importado: chk('pvImportado'), tiene_gnc: chk('pvGnc'),
    service_al_dia: chk('pvServiceOk'), service_oficial: chk('pvServiceOficial'),
    ultimo_service_km: num('pvServiceKm'), ultimo_service_fecha: val('pvServiceFecha')||null,
    vtv_vence: val('pvVtv')||null, cantidad_llaves: num('pvLlaves'),
    tiene_manual: chk('pvManual'), tiene_auxilio: chk('pvAuxilio'), tiene_criquet: chk('pvCriquet'),
    garantia_fabrica: chk('pvGarantia'), garantia_hasta: val('pvGarantiaHasta')||null,
    transferencia_a_cargo: val('pvTransfer')||'Comprador',
    deuda_patentes: chk('pvDeudaPat'), deuda_infracciones: chk('pvDeudaInf'), prenda: chk('pvPrenda'),
    historial_choques: val('pvChoques')||null,
    detalles_esteticos: val('pvEstetica')||null, detalles_mecanicos: val('pvMecanica')||null,
    equipamiento: equipo, descripcion: val('pvDesc')||null, motivo_venta: val('pvMotivo')||null,
    acepta_permuta: chk('pvPermuta'), acepta_financiacion: chk('pvFinanciacion'),
    disponible_para_ver: val('pvVerlo')||null, test_drive: leerTestDrive(), icono: '🚗',
    doc_dominio: chk('dcDominio'), doc_patentes: chk('dcPatentes'), doc_vtv: chk('dcVtv'),
    doc_policial: chk('dcPolicial'), doc_mandato: chk('dcMandato')
  };

  /* Si esto venía de un borrador se completa esa misma ficha en lugar de
     crear una segunda publicación del mismo vehículo. */
  var alta = borradorId
    ? await sb.from('vehiculos').update(ficha).eq('id', borradorId).select('id').single()
    : await sb.from('vehiculos').insert(ficha).select('id').single();

  if(alta.error){ cargando(false); return toast(mensajeError(alta.error),'error'); }
  var idv = alta.data.id, subidas = 0;

  /* Estos datos son del equipo, no del vehículo: viven en otra tabla.
     Mandarlos junto al resto era lo que hacía fallar el alta entera. */
  var interno = await guardarInternos(idv);
  if(interno && interno.error){ cargando(false); return toast(mensajeError(interno.error),'error'); }

  for(var i=0; i<fotosElegidas.length; i++){
    cargando(true,'Subiendo foto '+(i+1)+' de '+fotosElegidas.length+'…');
    var f = fotosElegidas[i];
    var ext = (String(f.name||'').split('.').pop() || 'jpg').toLowerCase();
    var ruta = idv + '/' + Date.now() + '-' + i + '.' + ext;
    var sub = await sb.storage.from('vehiculos').upload(ruta, f, { upsert:true, contentType:f.type });
    if(sub.error){ cargando(false); return toast('Se publicó pero falló una foto: '+mensajeError(sub.error),'error'); }
    var reg = await sb.from('vehiculo_fotos').insert({ vehiculo_id: idv, ruta: ruta, orden: i, portada: i===0 });
    if(reg.error){ cargando(false); return toast(mensajeError(reg.error),'error'); }
    subidas++;
  }

  fotosElegidas = []; olvidarAlta();
  await cargarTodo(); cargando(false); ir('catalogo');
  toast(marca+' '+modelo+' publicado con '+subidas+' foto'+(subidas>1?'s':'')+' — ya está en la web','ok');
};

/* ═══════════════ MARKETING ═══════════════ */
function metricasCampana(c){
  var invertido = Number(c.invertido)||0;
  var registros = D.perfiles.filter(function(p){ return p.campana_id === c.id; });
  var ids = registros.map(function(p){ return p.id; });
  var ventas = D.operaciones.filter(function(o){ return ids.indexOf(o.usuario_id) >= 0; });
  var ingresos = ventas.reduce(function(s,o){ return s + Number(o.com_empresa||0); }, 0);
  var cot = Number(config.cotizacion_dolar ? config.cotizacion_dolar.valor : 0) || 0;
  var ingresosArs = ingresos * cot;
  return {
    invertido: invertido, registros: registros.length, ventas: ventas.length,
    ingresosUsd: ingresos, ingresosArs: ingresosArs,
    costoPorRegistro: registros.length ? invertido / registros.length : null,
    costoPorVenta: ventas.length ? invertido / ventas.length : null,
    retorno: invertido > 0 ? ((ingresosArs - invertido) / invertido) * 100 : null
  };
}

function vistaMarketing(){
  if(!puedo('marketing')) return sinPermiso('marketing');

  var totInv = campanas.reduce(function(s,c){ return s + (Number(c.invertido)||0); }, 0);
  var tot = campanas.map(metricasCampana);
  var totReg = tot.reduce(function(s,m){ return s + m.registros; }, 0);
  var totVen = tot.reduce(function(s,m){ return s + m.ventas; }, 0);
  var totIng = tot.reduce(function(s,m){ return s + m.ingresosArs; }, 0);
  var retTotal = totInv > 0 ? ((totIng - totInv) / totInv) * 100 : null;

  return '<div style="max-width:1040px">'+
    '<div class="note w" style="margin-bottom:18px"><b>Cómo se calcula el retorno acá.</b> '+
    'No se inventa nada. Cada comisionista que se registra queda vinculado a la campaña por la que llegó '+
    '(con un código de invitación). Cuando esa persona cierra una venta, la comisión que te queda a vos se '+
    'suma a esa campaña. El retorno es: <b>(lo que ganaste − lo que invertiste) ÷ lo que invertiste</b>. '+
    'Si una campaña todavía no generó ventas, vas a ver el costo por registro, que es la señal temprana.</div>'+

    '<div class="kpis" style="margin-bottom:18px">'+
      '<div class="kpi"><div class="lb">Invertido</div><div class="vl">'+pesos(totInv)+'</div><div class="df">'+campanas.length+' campañas</div></div>'+
      '<div class="kpi a"><div class="lb">Comisionistas captados</div><div class="vl">'+totReg+'</div>'+
        '<div class="df">'+(totReg?pesos(totInv/totReg)+' cada uno':'sin datos todavía')+'</div></div>'+
      '<div class="kpi g"><div class="lb">Ventas generadas</div><div class="vl">'+totVen+'</div>'+
        '<div class="df">'+(totVen?pesos(totInv/totVen)+' por venta':'sin ventas todavía')+'</div></div>'+
      '<div class="kpi p"><div class="lb">Retorno</div><div class="vl">'+(retTotal===null?'—':retTotal.toFixed(0)+'%')+'</div>'+
        '<div class="df '+(retTotal!==null&&retTotal<0?'n':'')+'">'+(retTotal===null?'Cargá una inversión':pesos(totIng)+' generados')+'</div></div>'+
    '</div>'+

    tarjeta('Campañas', '<button class="btn btn-sm" onclick="nuevaCampana()">+ Nueva campaña</button>',
      campanas.length
        ? '<div style="overflow-x:auto"><table><thead><tr>'+
          '<th>Campaña</th><th>Canal</th><th>Invertido</th><th>Alcance</th><th>Clics</th>'+
          '<th>Registros</th><th>Ventas</th><th>Retorno</th><th></th></tr></thead><tbody>'+
          campanas.map(function(c){
            var m = metricasCampana(c);
            return '<tr>'+
              '<td><b>'+esc(c.nombre)+'</b><div class="mini">'+esc(c.estado)+' · código <span class="hash">'+esc(c.codigo||'—')+'</span></div></td>'+
              '<td>'+esc(c.canal)+'</td>'+
              '<td>'+pesos(c.invertido)+'</td>'+
              '<td>'+Number(c.alcance||0).toLocaleString('es-AR')+'</td>'+
              '<td>'+Number(c.clics||0).toLocaleString('es-AR')+'</td>'+
              '<td><b>'+m.registros+'</b>'+(m.costoPorRegistro?'<div class="mini">'+pesos(m.costoPorRegistro)+' c/u</div>':'')+'</td>'+
              '<td><b>'+m.ventas+'</b></td>'+
              '<td>'+(m.retorno===null?'<span class="mini">—</span>':'<b style="color:'+(m.retorno>=0?'var(--green)':'#DC2626')+'">'+m.retorno.toFixed(0)+'%</b>')+'</td>'+
              '<td><button class="btn btn-o btn-sm" onclick="editarCampana('+c.id+')">Editar</button></td>'+
            '</tr>';
          }).join('')+'</tbody></table></div>'
        : '<div class="mini">Todavía no cargaste ninguna campaña. Creá una para empezar a medir.</div>')+

    tarjeta('Conectar Instagram y TikTok','Datos automáticos',
      '<div style="font-size:.87rem;line-height:1.7">Hoy el alcance y los clics se cargan a mano. '+
      'Se pueden traer solos, pero <b>no alcanza con tener la cuenta</b>: las dos plataformas exigen una cuenta '+
      '<b>de empresa</b> y una aplicación de desarrollador aprobada.<br><br>'+
      '<b>Instagram:</b> convertir la cuenta a Empresa, vincularla a una página de Facebook, crear una app en '+
      'developers.facebook.com y pedir los permisos <i>instagram_basic</i> e <i>instagram_manage_insights</i>. '+
      'Meta revisa la solicitud, tarda entre unos días y dos semanas.<br>'+
      '<b>TikTok:</b> cuenta Business y app en developers.tiktok.com con el permiso de <i>Research/Insights</i>.<br><br>'+
      'Cuando los tengas, van como datos secretos en Supabase → Edge Functions → Secrets:<br>'+
      '<span class="hash">META_ACCESS_TOKEN</span> · <span class="hash">IG_BUSINESS_ID</span> · '+
      '<span class="hash">TIKTOK_ACCESS_TOKEN</span> · <span class="hash">TIKTOK_BUSINESS_ID</span><br><br>'+
      'Avisame cuando estén cargados y programo la actualización automática diaria.</div>');
}

window.nuevaCampana = function(){ formularioCampana(null); };
window.editarCampana = function(id){ formularioCampana(campanas.filter(function(c){ return c.id===id; })[0]); };

function formularioCampana(c){
  c = c || {};
  var canales = ['Instagram','TikTok','Facebook','YouTube','Google','WhatsApp','Boca en boca','Cartelería','Radio','Referidos','Otro'];
  modal(c.id ? 'Editar campaña' : 'Nueva campaña',
    '<div class="grid2">'+
      '<div class="fld"><label>Nombre <span style="color:#DC2626">*</span></label><input id="cpNombre" value="'+esc(c.nombre||'')+'"></div>'+
      '<div class="fld"><label>Canal</label><select id="cpCanal">'+canales.map(function(x){
        return '<option '+(c.canal===x?'selected':'')+'>'+x+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Presupuesto (ARS)</label><input id="cpPres" type="number" value="'+esc(c.presupuesto||'')+'"></div>'+
      '<div class="fld"><label>Invertido hasta hoy (ARS)</label><input id="cpInv" type="number" value="'+esc(c.invertido||'')+'"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Desde</label><input id="cpIni" type="date" value="'+esc(c.inicio||new Date().toISOString().slice(0,10))+'"></div>'+
      '<div class="fld"><label>Hasta</label><input id="cpFin" type="date" value="'+esc(c.fin||'')+'"></div>'+
    '</div>'+
    '<div class="grid3">'+
      '<div class="fld"><label>Alcance</label><input id="cpAlc" type="number" value="'+esc(c.alcance||'')+'"></div>'+
      '<div class="fld"><label>Clics</label><input id="cpClic" type="number" value="'+esc(c.clics||'')+'"></div>'+
      '<div class="fld"><label>Contactos</label><input id="cpCont" type="number" value="'+esc(c.contactos||'')+'"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label>Código de invitación</label><input id="cpCod" value="'+esc(c.codigo||'')+'" placeholder="INSTA-MARZO"></div>'+
      '<div class="fld"><label>Estado</label><select id="cpEstado">'+
        ['planificada','activa','pausada','finalizada'].map(function(x){
          return '<option '+(c.estado===x?'selected':'')+'>'+x+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="fld"><label>Notas</label><textarea id="cpNotas" rows="2">'+esc(c.notas||'')+'</textarea></div>'+
    '<div class="mini">El código de invitación es lo que hace medible la campaña: se lo das a quien se registra '+
    'y así el sistema sabe por dónde llegó.</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarCampana('+(c.id||'null')+')'}]);
}

window.guardarCampana = async function(id){
  var nombre = val('cpNombre');
  if(!nombre) return toast('Ponele un nombre a la campaña','error');
  var datos = {
    nombre: nombre, canal: val('cpCanal'),
    presupuesto: Number(val('cpPres'))||0, invertido: Number(val('cpInv'))||0,
    inicio: val('cpIni')||null, fin: val('cpFin')||null,
    alcance: Number(val('cpAlc'))||0, clics: Number(val('cpClic'))||0,
    contactos: Number(val('cpCont'))||0,
    codigo: val('cpCod').toUpperCase()||null, estado: val('cpEstado'), notas: val('cpNotas')||null
  };
  cargando(true,'Guardando…');
  var r = id ? await sb.from('campanas').update(datos).eq('id',id)
             : await sb.from('campanas').insert(datos);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarTodo(); render();
  toast('Campaña guardada','ok');
};

/* ═══════════════ ESTADÍSTICAS Y GASTOS ═══════════════ */
function vistaEstadisticas(){
  if(!puedo('estadisticas')) return sinPermiso('estadísticas');

  var cot = Number(config.cotizacion_dolar ? config.cotizacion_dolar.valor : 0) || 0;
  var delMes = gastos.filter(function(g){ return String(g.fecha).slice(0,7) === periodo; });
  var gastoMes = delMes.reduce(function(s,g){
    return s + (g.moneda === 'USD' ? Number(g.monto)*cot : Number(g.monto)); }, 0);
  var pendiente = delMes.filter(function(g){ return !g.pagado; })
    .reduce(function(s,g){ return s + (g.moneda === 'USD' ? Number(g.monto)*cot : Number(g.monto)); }, 0);

  var ventasMes = D.operaciones.filter(function(o){ return String(o.fecha).slice(0,7) === periodo; });
  var ingresoUsd = ventasMes.reduce(function(s,o){ return s + Number(o.com_empresa||0); }, 0);
  var cuposMes = (D.pagos||[]).filter(function(p){
    return p.estado === 'aprobado' && String(p.creado_en||p.fecha).slice(0,7) === periodo; });
  var ingresoCuposArs = cuposMes.reduce(function(s,p){ return s + Number(p.monto_ars||0); }, 0);
  var ingresoArs = ingresoUsd * cot + ingresoCuposArs;
  var resultado = ingresoArs - gastoMes;

  var meses = [];
  for(var i=5;i>=0;i--){
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    meses.push(d.toISOString().slice(0,7));
  }

  return '<div style="max-width:1040px">'+
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap">'+
      '<label style="font-weight:700;font-size:.85rem;color:var(--gray)">Período</label>'+
      '<select onchange="cambiarPeriodo(this.value)" style="max-width:180px">'+
        meses.map(function(m){ return '<option value="'+m+'" '+(m===periodo?'selected':'')+'>'+m+'</option>'; }).join('')+
      '</select>'+
      '<button class="btn btn-o btn-sm" onclick="generarGastos()">Generar gastos fijos del mes</button>'+
      '<button class="btn btn-sm" onclick="nuevoGasto()">+ Registrar gasto</button>'+
    '</div>'+

    '<div class="kpis" style="margin-bottom:18px">'+
      '<div class="kpi g"><div class="lb">Ingresos del mes</div><div class="vl">'+pesos(ingresoArs)+'</div>'+
        '<div class="df">'+ventasMes.length+' ventas + '+cuposMes.length+' cupos</div></div>'+
      '<div class="kpi p"><div class="lb">Gastos del mes</div><div class="vl">'+pesos(gastoMes)+'</div>'+
        '<div class="df">'+delMes.length+' registros</div></div>'+
      '<div class="kpi '+(resultado>=0?'g':'')+'"><div class="lb">Resultado</div><div class="vl">'+pesos(resultado)+'</div>'+
        '<div class="df '+(resultado<0?'n':'')+'">'+(ingresoArs?((resultado/ingresoArs)*100).toFixed(0)+'% de margen':'sin ingresos')+'</div></div>'+
      '<div class="kpi a"><div class="lb">Sin pagar</div><div class="vl">'+pesos(pendiente)+'</div>'+
        '<div class="df">'+delMes.filter(function(g){return !g.pagado;}).length+' vencimientos</div></div>'+
    '</div>'+

    tarjeta('Gastos fijos que se repiten','<button class="btn btn-sm" onclick="nuevoRecurrente()">+ Agregar</button>',
      '<div class="note w" style="margin-bottom:14px">Cargá acá una sola vez el dominio, el monotributo, el hosting o lo que pagues '+
      'todos los meses. Después tocás <b>Generar gastos fijos del mes</b> y aparecen solos, sin cargarlos de nuevo. '+
      'No existe ninguna API de AFIP que informe cuánto pagás de monotributo: la categoría la ponés vos y cuando '+
      'cambia el valor lo actualizás acá.</div>'+
      (recurrentes.length
        ? '<table><thead><tr><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Cada</th><th>Vence</th><th></th></tr></thead><tbody>'+
          recurrentes.map(function(r){
            return '<tr><td><b>'+esc(r.concepto)+'</b>'+(r.proveedor?'<div class="mini">'+esc(r.proveedor)+'</div>':'')+'</td>'+
              '<td>'+esc(r.categoria)+'</td>'+
              '<td>'+(r.moneda==='USD'?'USD '+Number(r.monto).toLocaleString('es-AR'):pesos(r.monto))+'</td>'+
              '<td>'+esc(r.periodicidad)+'</td>'+
              '<td>día '+r.dia_vence+'</td>'+
              '<td><button class="btn btn-o btn-sm" onclick="editarRecurrente('+r.id+')">Editar</button></td></tr>';
          }).join('')+'</tbody></table>'
        : '<div class="mini">Todavía no cargaste ningún gasto fijo.</div>'))+

    tarjeta('Gastos de '+periodo,'',
      delMes.length
        ? '<table><thead><tr><th>Concepto</th><th>Categoría</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>'+
          delMes.map(function(g){
            return '<tr><td><b>'+esc(g.concepto)+'</b>'+(g.proveedor?'<div class="mini">'+esc(g.proveedor)+'</div>':'')+'</td>'+
              '<td>'+esc(g.categoria)+'</td><td>'+esc(g.tipo)+'</td>'+
              '<td>'+(g.moneda==='USD'?'USD '+Number(g.monto).toLocaleString('es-AR'):pesos(g.monto))+'</td>'+
              '<td>'+fmtFecha(g.fecha)+'</td>'+
              '<td>'+(g.pagado?'<span class="pill p-green">Pagado</span>':'<span class="pill p-red">Pendiente</span>')+'</td>'+
              '<td>'+(g.pagado?'':'<button class="btn btn-sm" onclick="marcarPagado('+g.id+')">Marcar pagado</button>')+'</td></tr>';
          }).join('')+'</tbody></table>'
        : '<div class="mini">No hay gastos cargados en este período.</div>')+
    '</div>';
}

window.cambiarPeriodo = function(p){ periodo = p; render(); };

window.generarGastos = async function(){
  cargando(true,'Generando…');
  var r = await sb.rpc('generar_gastos_del_periodo', { p_periodo: periodo });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  await cargarTodo(); render();
  toast(r.data ? 'Se generaron '+r.data+' gastos fijos' : 'No había gastos fijos nuevos para este mes','ok');
};

window.marcarPagado = async function(id){
  cargando(true,'Guardando…');
  var r = await sb.from('gastos').update({ pagado:true }).eq('id',id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  await cargarTodo(); render();
};

var CATEGORIAS = ['Operativo','Impuestos','Marketing','Servicios','Sueldos','Transporte','Legal','Bancario','Otro'];

window.nuevoGasto = function(){
  modal('Registrar un gasto',
    '<div class="grid2">'+
      '<div class="fld"><label>Concepto <span style="color:#DC2626">*</span></label><input id="gsConcepto" placeholder="Dominio autonet.com.ar"></div>'+
      '<div class="fld"><label>Proveedor</label><input id="gsProv" placeholder="NIC.ar"></div>'+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Categoría</label><select id="gsCat">'+CATEGORIAS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div>'+
      '<div class="fld"><label>Tipo</label><select id="gsTipo"><option value="fijo">Fijo</option><option value="variable">Variable</option><option value="marketing">Marketing</option></select></div>'+
      '<div class="fld"><label>Moneda</label><select id="gsMon"><option>ARS</option><option>USD</option></select></div>'+
    '</div><div class="grid2">'+
      '<div class="fld"><label>Monto <span style="color:#DC2626">*</span></label><input id="gsMonto" type="number" step="0.01"></div>'+
      '<div class="fld"><label>Fecha</label><input id="gsFecha" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
    '</div>'+
    '<label class="chk"><input type="checkbox" id="gsPagado" checked><span>Ya está pagado</span></label>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},{txt:'Guardar',clase:'',fn:'guardarGasto()'}]);
};

window.guardarGasto = async function(){
  var concepto = val('gsConcepto'), monto = Number(val('gsMonto'));
  if(!concepto) return toast('Poné el concepto','error');
  if(!(monto > 0)) return toast('El monto tiene que ser mayor a cero','error');
  cargando(true,'Guardando…');
  var r = await sb.from('gastos').insert({
    concepto: concepto, proveedor: val('gsProv')||null, categoria: val('gsCat'),
    tipo: val('gsTipo'), moneda: val('gsMon'), monto: monto,
    fecha: val('gsFecha'), pagado: chk('gsPagado'), periodo: val('gsFecha').slice(0,7) });
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarTodo(); render();
  toast('Gasto registrado','ok');
};

window.nuevoRecurrente   = function(){ formularioRecurrente(null); };
window.editarRecurrente  = function(id){ formularioRecurrente(recurrentes.filter(function(r){ return r.id===id; })[0]); };

function formularioRecurrente(r){
  r = r || {};
  modal(r.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo',
    '<div class="grid2">'+
      '<div class="fld"><label>Concepto <span style="color:#DC2626">*</span></label><input id="rcConcepto" value="'+esc(r.concepto||'')+'" placeholder="Monotributo categoría B"></div>'+
      '<div class="fld"><label>Proveedor</label><input id="rcProv" value="'+esc(r.proveedor||'')+'" placeholder="AFIP"></div>'+
    '</div><div class="grid3">'+
      '<div class="fld"><label>Categoría</label><select id="rcCat">'+CATEGORIAS.map(function(c){
        return '<option '+(r.categoria===c?'selected':'')+'>'+c+'</option>'; }).join('')+'</select></div>'+
      '<div class="fld"><label>Moneda</label><select id="rcMon">'+['ARS','USD'].map(function(m){
        return '<option '+(r.moneda===m?'selected':'')+'>'+m+'</option>'; }).join('')+'</select></div>'+
      '<div class="fld"><label>Monto <span style="color:#DC2626">*</span></label><input id="rcMonto" type="number" step="0.01" value="'+esc(r.monto||'')+'"></div>'+
    '</div><div class="grid2">'+
      '<div class="fld"><label>Se paga cada</label><select id="rcPer">'+
        ['mensual','bimestral','trimestral','semestral','anual'].map(function(p){
          return '<option '+(r.periodicidad===p?'selected':'')+'>'+p+'</option>'; }).join('')+'</select></div>'+
      '<div class="fld"><label>Día de vencimiento</label><input id="rcDia" type="number" min="1" max="28" value="'+esc(r.dia_vence||10)+'"></div>'+
    '</div>'+
    '<label class="chk"><input type="checkbox" id="rcActivo" '+(r.id===undefined||r.activo?'checked':'')+'><span>Activo</span></label>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},
     {txt:'Guardar',clase:'',fn:'guardarRecurrente('+(r.id||'null')+')'}]);
}

window.guardarRecurrente = async function(id){
  var concepto = val('rcConcepto'), monto = Number(val('rcMonto'));
  if(!concepto) return toast('Poné el concepto','error');
  if(!(monto > 0)) return toast('El monto tiene que ser mayor a cero','error');
  var datos = { concepto:concepto, proveedor:val('rcProv')||null, categoria:val('rcCat'),
    moneda:val('rcMon'), monto:monto, periodicidad:val('rcPer'),
    dia_vence:Number(val('rcDia'))||10, activo:chk('rcActivo') };
  cargando(true,'Guardando…');
  var r = id ? await sb.from('gastos_recurrentes').update(datos).eq('id',id)
             : await sb.from('gastos_recurrentes').insert(datos);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarTodo(); render();
  toast('Gasto fijo guardado','ok');
};

/* ═══════════════ CONFIGURACIÓN ═══════════════ */
function vistaConfiguracion(){
  if(!puedo('configuracion')) return sinPermiso('configuración');
  var cot = config.cotizacion_dolar ? config.cotizacion_dolar.valor : '';
  var usd = config.precio_cupo_usd  ? config.precio_cupo_usd.valor  : '';
  var total = (Number(cot)||0) * (Number(usd)||0);

  return '<div style="max-width:680px">'+
    tarjeta('💵 Cotización del dólar','Define cuánto se cobra un cupo extra',
      '<div class="note w" style="margin-bottom:16px">Mercado Pago cobra en pesos. Cambiá este valor cuando se '+
      'mueva el dólar y el próximo cobro ya sale actualizado.</div>'+
      '<div class="grid2">'+
        '<div class="fld"><label>Pesos por dólar</label><input id="cfgCot" type="number" step="0.01" value="'+esc(cot)+'"></div>'+
        '<div class="fld"><label>Precio del cupo (USD)</label><input id="cfgUsd" type="number" step="0.01" value="'+esc(usd)+'"></div>'+
      '</div>'+
      '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:6px 0 16px;display:flex;justify-content:space-between;align-items:center">'+
        '<span style="font-weight:700;color:var(--gray);font-size:.85rem">Un cupo extra se cobra</span>'+
        '<b style="font-size:1.25rem;color:var(--green)">'+pesos(total)+'</b></div>'+
      '<button class="btn" onclick="guardarConfig()">Guardar cambios</button>')+
    tarjeta('Probar el cobro sin gastar','',
      '<div style="font-size:.87rem;line-height:1.65">Poné el precio del cupo en <b>1</b> y la cotización en <b>100</b>. '+
      'Un cupo pasa a costar $100: comprate uno desde la web pública y verificá que se acredita solo. '+
      'Después devolvés los valores reales.</div>')+
    '</div>';
}

window.guardarConfig = async function(){
  var cot = Number(val('cfgCot')), usd = Number(val('cfgUsd'));
  if(!(cot > 0)) return toast('La cotización tiene que ser mayor a cero','error');
  if(!(usd > 0)) return toast('El precio del cupo tiene que ser mayor a cero','error');
  cargando(true,'Guardando…');
  var a = await sb.from('config').update({ valor:String(cot) }).eq('clave','cotizacion_dolar');
  var b = await sb.from('config').update({ valor:String(usd) }).eq('clave','precio_cupo_usd');
  cargando(false);
  if(a.error || b.error) return toast(mensajeError(a.error||b.error),'error');
  await cargarConfig(); render();
  toast('Listo. Un cupo extra pasa a costar '+pesos(cot*usd),'ok');
};

/* ═══════════════ EQUIPO DEL PANEL ═══════════════ */
function vistaEquipo(){
  if(!perfil || !perfil.es_dueno)
    return '<div class="note r">Solo la cuenta dueña del negocio puede administrar el equipo.</div>';

  var equipo = D.perfiles.filter(function(u){ return u.rol === 'admin'; });

  return '<div style="max-width:860px">'+
    '<div class="note g" style="margin-bottom:18px"><b>Sos el dueño del negocio.</b> Tenés acceso a todo y sos el '+
    'único que puede crear cuentas del equipo o cambiar permisos. Nadie puede quitarte la titularidad.</div>'+

    '<div class="note w" style="margin-bottom:18px">Las cuentas del equipo <b>no se registran solas</b>. '+
    'Vos las creás acá, el sistema genera una contraseña temporal y se la pasás a la persona. '+
    'Son cuentas distintas a las de los comisionistas: entran por <span class="hash">/admin</span> y no aparecen en el catálogo.</div>'+

    tarjeta('Equipo con acceso al panel','<button class="btn btn-sm" onclick="nuevoTrabajador()">+ Crear cuenta</button>',
      equipo.map(function(u){
        var lista = u.es_dueno
          ? '<span class="pill p-green">Acceso total · dueño</span>'
          : ((u.permisos||[]).length
              ? u.permisos.map(function(p){
                  var d = permisosDisponibles.filter(function(x){ return x.clave===p; })[0];
                  return '<span class="pill p-blue" style="font-size:.72rem">'+esc(d?d.nombre:p)+'</span>';
                }).join(' ')
              : '<span class="pill p-red">Sin permisos</span>');
        return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)">'+
          '<div style="flex:1"><b>'+esc(nombreDe(u))+'</b>'+(u.es_dueno?' 👑':'')+
          '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:5px">'+lista+'</div></div>'+
          (u.es_dueno?'':'<button class="btn btn-o btn-sm" onclick="editarPermisos(\''+u.id+'\')">Permisos</button>')+
          '</div>';
      }).join(''))+
    '</div>';
}

window.nuevoTrabajador = function(){
  modal('Crear cuenta del equipo',
    '<div class="grid2">'+
      '<div class="fld"><label>Nombre <span style="color:#DC2626">*</span></label><input id="twNombre"></div>'+
      '<div class="fld"><label>Apellido <span style="color:#DC2626">*</span></label><input id="twApellido"></div>'+
    '</div><div class="grid2">'+
      '<div class="fld"><label>Documento <span style="color:#DC2626">*</span></label><input id="twDni"></div>'+
      '<div class="fld"><label>Teléfono</label><input id="twTel"></div>'+
    '</div>'+
    '<div class="fld"><label>Correo <span style="color:#DC2626">*</span></label><input id="twEmail" type="email" placeholder="persona@correo.com"></div>'+
    '<div style="font-weight:800;color:var(--navy);font-size:.9rem;margin:14px 0 8px">¿Qué va a poder hacer?</div>'+
    '<div style="display:grid;gap:7px">'+
      permisosDisponibles.map(function(p){
        return '<label class="chk" style="align-items:flex-start;padding:10px 12px">'+
          '<input type="checkbox" id="tw_'+p.clave+'">'+
          '<span><b>'+esc(p.nombre)+'</b><div class="mini" style="font-weight:500">'+esc(p.descripcion)+'</div></span></label>';
      }).join('')+'</div>',
    [{txt:'Cancelar',clase:'btn-o',fn:'cerrarModal()'},{txt:'Crear cuenta',clase:'',fn:'crearTrabajador()'}]);
};

window.crearTrabajador = async function(){
  var permisos = [];
  permisosDisponibles.forEach(function(p){ if(chk('tw_'+p.clave)) permisos.push(p.clave); });
  if(!permisos.length) return toast('Marcá al menos un permiso','error');

  cargando(true,'Creando la cuenta…');
  try {
    var s = await sb.auth.getSession();
    var token = s.data.session && s.data.session.access_token;
    var r = await fetch(BASE + '/functions/v1/crear-trabajador', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' },
      body: JSON.stringify({ nombre:val('twNombre'), apellido:val('twApellido'),
        dni:val('twDni'), tel:val('twTel'), email:val('twEmail'), permisos:permisos })
    });
    var j = await r.json().catch(function(){ return {}; });
    cargando(false);
    if(!r.ok) return toast(j.error || 'No se pudo crear la cuenta','error');

    cerrarModal();
    await cargarTodo(); render();
    modal('Cuenta creada',
      '<div class="note g">Pasale estos datos a la persona. La contraseña se muestra una sola vez.</div>'+
      '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:16px;margin-top:12px">'+
        '<div style="padding:5px 0"><span class="mini">Dirección</span><br><b>'+location.origin+'/admin</b></div>'+
        '<div style="padding:5px 0"><span class="mini">Correo</span><br><b>'+esc(j.email)+'</b></div>'+
        '<div style="padding:5px 0"><span class="mini">Contraseña temporal</span><br>'+
        '<b style="font-size:1.15rem;letter-spacing:1px" class="hash">'+esc(j.clave_temporal)+'</b></div>'+
      '</div>'+
      '<div class="note w" style="margin-top:12px">Decile que la cambie en su primer ingreso.</div>',
      [{txt:'Listo',clase:'',fn:'cerrarModal()'}]);
  } catch(e){
    cargando(false);
    toast('No se pudo contactar al servidor','error');
  }
};

window.editarPermisos = function(id){
  var u = D.perfiles.filter(function(x){ return x.id === id; })[0];
  if(!u) return;
  var actuales = u.permisos || [];
  modal('Permisos de '+esc(nombreDe(u)),
    '<div style="display:grid;gap:7px">'+
      permisosDisponibles.map(function(p){
        return '<label class="chk" style="align-items:flex-start;padding:10px 12px">'+
          '<input type="checkbox" id="pm_'+p.clave+'" '+(actuales.indexOf(p.clave)>=0?'checked':'')+'>'+
          '<span><b>'+esc(p.nombre)+'</b><div class="mini" style="font-weight:500">'+esc(p.descripcion)+'</div></span></label>';
      }).join('')+'</div>',
    [{txt:'Quitar del panel',clase:'btn-o',fn:"guardarPermisos('"+id+"',true)"},
     {txt:'Guardar',clase:'',fn:"guardarPermisos('"+id+"',false)"}]);
};

window.guardarPermisos = async function(id, quitar){
  var elegidos = [];
  if(!quitar){
    permisosDisponibles.forEach(function(p){ if(chk('pm_'+p.clave)) elegidos.push(p.clave); });
    if(!elegidos.length) return toast('Marcá al menos un área, o usá "Quitar del panel"','error');
  }
  cargando(true,'Guardando…');
  var r = await sb.from('perfiles')
    .update({ rol: quitar ? 'comisionista' : 'admin', permisos: quitar ? [] : elegidos }).eq('id', id);
  cargando(false);
  if(r.error) return toast(mensajeError(r.error),'error');
  cerrarModal(); await cargarTodo(); render();
  toast(quitar ? 'Se le quitó el acceso al panel' : 'Permisos actualizados','ok');
};

/* ═══════════════ ENGANCHE ═══════════════ */
async function cargarConfig(){
  var r = await sb.from('config').select('*');
  config = {};
  (r.data||[]).forEach(function(c){ config[c.clave] = c; });

  /* panel-crm.js vive en su propio cierre y no ve este "config".
     Se expone la cotización sola, que es lo único que necesita de acá. */
  window.cotizacionDolar = cotizacionGeneral();
}
async function cargarExtras(){
  var r = await Promise.all([
    sb.from('permisos_disponibles').select('*').order('orden'),
    sb.from('campanas').select('*').order('creado_en',{ascending:false}),
    sb.from('gastos').select('*').order('fecha',{ascending:false}),
    sb.from('gastos_recurrentes').select('*').order('concepto')
  ]);
  permisosDisponibles = r[0].data || [];
  campanas    = r[1].data || [];
  gastos      = r[2].data || [];
  recurrentes = r[3].data || [];
}

/* La tabla de secciones guarda la función, no su nombre: hay que
   reemplazar la referencia, no alcanza con redefinir la función. */
SECCIONES.publicar.f      = vistaPublicar;
SECCIONES.publicar.post   = function(){
  /* Se recuerda lo tipeado a medida que se escribe: si algo falla,
     no hay que volver a cargar todo desde cero. */
  var n = camposDelAlta();
  for(var i=0;i<n.length;i++){
    n[i].addEventListener('change', recordarAlta);
    n[i].addEventListener('input',  recordarAlta);
  }

  /* La cotización se completa sola con la de Configuración: no tiene
     sentido escribirla en cada carga. Y se anota la moneda de partida
     para saber en qué sentido convertir cuando se cambie. */
  var sel = document.getElementById('pvMoneda');
  if(sel && !sel.getAttribute('data-previa')) sel.setAttribute('data-previa', sel.value || 'USD');
  if(!val('pvCotiz') && cotizacionGeneral() > 0) ponerVal('pvCotiz', cotizacionGeneral());

  pintarBorradores();
  if(!hayAltaGuardada()) return;
  var caja = document.querySelector('.content') || document.getElementById('app');
  if(!caja || document.getElementById('avisoBorrador')) return;
  var a = document.createElement('div');
  a.id = 'avisoBorrador';
  a.style.cssText = 'background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;' +
    'padding:12px 16px;margin-bottom:16px;font-size:.87rem;font-weight:700;color:#78350F;' +
    'display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  a.innerHTML = 'Quedó una carga sin terminar en este navegador.' +
    '<button class="btn" style="padding:6px 14px;font-size:.8rem" onclick="retomarBorrador()">Recuperar</button>' +
    '<button class="btn btn-o" style="padding:6px 14px;font-size:.8rem" onclick="descartarBorrador()">Descartar</button>';
  caja.insertBefore(a, caja.firstChild);
};
SECCIONES.marketing.f     = vistaMarketing;
SECCIONES.marketing.post  = null;
SECCIONES.estadisticas.f  = vistaEstadisticas;
SECCIONES.estadisticas.post = null;
SECCIONES.estadisticas.s  = 'Ingresos, gastos y resultado real del mes';
SECCIONES.marketing.s     = 'Campañas, inversión y retorno medido';
SECCIONES.configuracion   = { t:'Configuración', s:'Cotización del dólar y precio de los cupos', f:vistaConfiguracion };
SECCIONES.equipo          = { t:'Equipo del panel', s:'Quién entra y qué puede hacer', f:vistaEquipo };

MENU.push({ grupo:'Negocio', items:[
  { id:'configuracion', ic:'⚙',  txt:'Configuración' },
  { id:'equipo',        ic:'🔑', txt:'Equipo del panel' }
]});

var cargarTodoOriginal = window.cargarTodo;
window.cargarTodo = async function(){
  await cargarTodoOriginal();
  await cargarConfig();
  await cargarExtras();
};

/* ═══════════════ CATÁLOGO: WHATSAPP Y RETIRO ═══════════════
   Los botones se agregan sobre la tabla ya dibujada. Así no hay que
   tocar la vista del catálogo, que vive en otro archivo. */

var telefonos = null;

async function cargarTelefonos(){
  if(telefonos) return telefonos;
  var r = await sb.from('vehiculos_internos').select('vehiculo_id,tel_propietario');
  telefonos = {};
  if(!r.error && r.data) r.data.forEach(function(x){ telefonos[x.vehiculo_id] = x.tel_propietario; });
  return telefonos;
}

/* WhatsApp quiere 549 + área + abonado, sin ceros, sin quince y sin
   separadores. Los teléfonos se cargan a mano, así que llegan de todas
   las formas posibles. */
function paraWhatsapp(tel){
  var n = String(tel || '').replace(/[^0-9]/g, '');
  if(!n) return '';
  if(n.indexOf('54') === 0) n = n.slice(2);
  if(n.indexOf('0')  === 0) n = n.slice(1);
  if(n.indexOf('9')  === 0) n = n.slice(1);
  n = n.replace(/^(\d{2,4})15/, '$1');
  return '549' + n;
}

function vehiculoDelCatalogo(id){
  var lista = (typeof D !== 'undefined' && D.vehiculos) ? D.vehiculos : [];
  for(var i=0;i<lista.length;i++) if(String(lista[i].id) === String(id)) return lista[i];
  return {};
}

window.contactarDueno = async function(id){
  var t = await cargarTelefonos();
  var num = paraWhatsapp(t[id]);
  if(!num) return toast('Este vehículo no tiene cargado el teléfono del propietario','error');
  var v = vehiculoDelCatalogo(id);
  var nombre = String(v.propietario || '').split(' ')[0];
  var texto = 'Hola' + (nombre ? ' ' + nombre : '') + ', te escribo de BivonaCars por tu ' +
    (v.marca || '') + ' ' + (v.modelo || '') + (v.anio ? ' ' + v.anio : '') + '.';
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(texto), '_blank');
};

window.retirarVehiculo = async function(id){
  var v = vehiculoDelCatalogo(id);
  if(!confirm('Retirar ' + (v.marca||'') + ' ' + (v.modelo||'') + ' del catálogo.\n\n' +
    'Deja de verse en la web y se libera el cupo de los comisionistas que lo tenían.\n' +
    'Lo podés volver a publicar cuando quieras. ¿Confirmás?')) return;
  cargando(true,'Retirando…');
  var up = await sb.from('vehiculos').update({ estado:'pausado' }).eq('id', id);
  if(up.error){ cargando(false); return toast(mensajeError(up.error),'error'); }
  await sb.from('asignaciones').update({ estado:'pausado' })
    .eq('vehiculo_id', id).eq('estado','activo');
  await cargarTodo(); cargando(false); render();
  toast('Retirado del catálogo. El dueño se lo puede llevar','ok');
};

window.volverAPublicar = async function(id){
  cargando(true,'Publicando…');
  var up = await sb.from('vehiculos').update({ estado:'disponible' }).eq('id', id);
  if(up.error){ cargando(false); return toast(mensajeError(up.error),'error'); }
  await sb.from('asignaciones').update({ estado:'activo' })
    .eq('vehiculo_id', id).eq('estado','pausado');
  await cargarTodo(); cargando(false); render();
  toast('Vuelve a estar publicado','ok');
};

function botonesDeCatalogo(){
  var vistos = document.querySelectorAll('button[onclick^="verVeh("]');
  for(var i=0;i<vistos.length;i++){
    var b = vistos[i];
    if(!b.parentNode || b.parentNode.querySelector('.bc-extra')) continue;
    var m = /verVeh\((\d+)\)/.exec(b.getAttribute('onclick') || '');
    if(!m) continue;
    var id = m[1], v = vehiculoDelCatalogo(id);

    var wa = document.createElement('button');
    wa.className = 'btn btn-sm bc-extra';
    wa.style.cssText = 'background:#25D366;color:#06301a;margin-right:4px';
    wa.textContent = 'WhatsApp';
    wa.setAttribute('onclick', 'contactarDueno(' + id + ')');
    b.parentNode.insertBefore(wa, b);

    var r = document.createElement('button');
    r.className = 'btn btn-o btn-sm bc-extra';
    r.style.cssText = 'margin-left:4px';
    if(v.estado === 'pausado'){
      r.textContent = 'Volver a publicar';
      r.setAttribute('onclick', 'volverAPublicar(' + id + ')');
    } else {
      r.textContent = 'Retirar';
      r.setAttribute('onclick', 'retirarVehiculo(' + id + ')');
    }
    b.parentNode.appendChild(r);
  }
}

if(typeof SECCIONES !== 'undefined' && SECCIONES.catalogo){
  var catalogoPostPrevio = SECCIONES.catalogo.post;
  SECCIONES.catalogo.post = function(){
    if(catalogoPostPrevio) catalogoPostPrevio.apply(this, arguments);
    cargarTelefonos().then(botonesDeCatalogo);
    botonesDeCatalogo();
  };
}

(async function arranque(){
  try { await cargarConfig(); await cargarExtras(); } catch(e){ /* sigue */ }
})();

})();

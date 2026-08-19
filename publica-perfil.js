/* BivonaCars — La ficha pública del comisionista.

   Si el comisionista va a aparecer en el directorio, tiene que poder
   armar su propia presentación: la foto, cómo se describe y a qué
   número quiere que le escriban.

   Lo carga él y lo aprueba la agencia. No es burocracia: la ficha es la
   cara del negocio para alguien que todavía no nos conoce, y una foto
   borrosa o un texto que prometa cosas que no podemos cumplir nos sale
   caro a todos. Mientras está en revisión, la anterior sigue publicada.

   Se carga en el sitio público, después de publica-directorio.js. */

(function(){
'use strict';

var F = { archivo: null, previa: null };

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }

function urlFoto(ruta){
  if(!ruta) return null;
  try { return sb.storage.from('perfiles').getPublicUrl(ruta).data.publicUrl + '?v=' + Date.now(); }
  catch(e){ return null; }
}

var ESTADOS = {
  incompleto: { pill:'p-gray',  txt:'Sin publicar' },
  pendiente:  { pill:'p-amber', txt:'Esperando aprobación' },
  aprobado:   { pill:'p-green', txt:'Publicada' },
  rechazado:  { pill:'p-red',   txt:'Hay que corregirla' }
};

function vistaMiFicha(){
  var p = perfil || {};
  var e = ESTADOS[p.perfil_estado] || ESTADOS.incompleto;
  var foto = F.previa || urlFoto(p.foto_path);

  return '<div class="wrap" style="max-width:720px">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">'+
      '<div><h2 class="sec">Mi ficha pública</h2>'+
      '<p class="sub">Así te va a ver alguien que entra a la página buscando un auto.</p></div>'+
      '<button class="btn btn-o btn-sm" onclick="vista=\'catalogo\';render()">← Volver</button>'+
    '</div>'+

    '<div class="card" style="padding:22px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">'+
        '<b style="color:var(--navy)">Estado</b>'+
        '<span class="pill '+e.pill+'">'+e.txt+'</span>'+
      '</div>'+

      (p.perfil_estado === 'rechazado' && p.perfil_nota
        ? '<div class="note r" style="margin-bottom:18px"><b>Nos falta que corrijas esto:</b><br>'+
          esc(p.perfil_nota)+'</div>' : '')+

      (p.perfil_estado === 'pendiente'
        ? '<div class="note w" style="margin-bottom:18px">Tu ficha está en revisión. '+
          'Te avisamos apenas la aprobemos.</div>' : '')+

      (p.estado_verificacion !== 'aprobado'
        ? '<div class="note w" style="margin-bottom:18px">Tu cuenta todavía no está verificada. '+
          'Podés dejar la ficha lista, pero no va a salir publicada hasta que se apruebe tu constancia.</div>' : '')+

      '<div style="display:flex;gap:18px;align-items:center;margin-bottom:20px;flex-wrap:wrap">'+
        (foto
          ? '<img src="'+esc(foto)+'" alt="" style="width:96px;height:96px;border-radius:50%;'+
            'object-fit:cover;border:1px solid var(--line)">'
          : '<div style="width:96px;height:96px;border-radius:50%;background:var(--navy);color:#fff;'+
            'display:grid;place-items:center;font-size:2.2rem;font-weight:800">'+
            esc((p.nombre||'?').charAt(0).toUpperCase())+'</div>')+
        '<div style="flex:1;min-width:200px">'+
          '<label class="drop" style="padding:14px">'+
            '<div class="ic">📷</div>'+
            '<b id="mfNombreArchivo">'+(F.archivo ? esc(F.archivo.name) : 'Elegir una foto')+'</b>'+
            '<small>Que se te vea la cara, de frente y con buena luz. Hasta 3 MB.</small>'+
            '<input type="file" accept="image/*" onchange="elegirFoto(this)">'+
          '</label>'+
        '</div>'+
      '</div>'+

      '<div class="fld"><label>Cómo te presentás</label>'+
        '<textarea id="mfDesc" rows="4" maxlength="500" '+
        'placeholder="Ej: Trabajo en la zona sur del Gran Buenos Aires. Te acompaño desde que elegís el auto hasta que tenés la transferencia hecha.">'+
        esc(p.descripcion||'')+'</textarea>'+
        '<div class="hint">Contá dónde trabajás y qué puede esperar de vos alguien que te escribe. '+
        'Sin promesas de precio ni de financiación: eso lo arregla cada operación.</div></div>'+

      '<div class="fld"><label>WhatsApp para que te escriban</label>'+
        '<input id="mfWa" value="'+esc(p.wa_tel||'')+'" placeholder="11 2345 6789">'+
        '<div class="hint">Es el número que va a ver cualquiera que entre a la página. '+
        'Si preferís tener uno aparte del personal, cargá ese.</div></div>'+

      '<button class="btn btn-block" style="margin-top:8px" onclick="guardarMiFicha()">'+
        (p.perfil_estado === 'aprobado' ? 'Guardar y mandar a revisar de nuevo' : 'Enviar para que la aprueben')+
      '</button>'+
      (p.perfil_estado === 'aprobado'
        ? '<div class="mini" style="margin-top:9px;text-align:center">Mientras la revisamos, '+
          'la ficha que ya tenés publicada se sigue viendo.</div>' : '')+
    '</div>'+
  '</div>';
}

window.elegirFoto = function(input){
  var f = input.files && input.files[0];
  if(!f) return;
  if(f.size > 3 * 1024 * 1024) return toast('La foto no puede pesar más de 3 MB','error');
  F.archivo = f;
  try { F.previa = URL.createObjectURL(f); } catch(e){ F.previa = null; }
  render();
};

window.guardarMiFicha = async function(){
  var desc = val('mfDesc'), wa = val('mfWa');
  if(desc.length < 20) return toast('Escribí un poco más: al menos un par de renglones.','error');
  if(!wa)              return toast('Falta el WhatsApp donde te van a escribir.','error');

  cargando(true,'Guardando…');
  try {
    var cambios = { descripcion: desc, wa_tel: wa, perfil_estado: 'pendiente',
                    perfil_enviado_en: new Date().toISOString() };

    if(F.archivo){
      var ext = (F.archivo.name.split('.').pop() || 'jpg').toLowerCase();
      if(['jpg','jpeg','png','webp','avif'].indexOf(ext) < 0) ext = 'jpg';
      var ruta = perfil.id + '/foto.' + ext;
      var s = await sb.storage.from('perfiles')
        .upload(ruta, F.archivo, { upsert: true, contentType: F.archivo.type });
      if(s.error){ cargando(false); return toast('No se pudo subir la foto: '+s.error.message,'error'); }
      cambios.foto_path = ruta;
    }

    var r = await sb.from('perfiles').update(cambios).eq('id', perfil.id);
    if(r.error){ cargando(false); return toast(mensajeError(r.error),'error'); }

    var f = await sb.from('perfiles').select('*').eq('id', perfil.id).maybeSingle();
    if(f.data) perfil = f.data;

    F.archivo = null; F.previa = null;
    cargando(false);
    toast('Listo. Te avisamos apenas la aprobemos.','ok');
    render();
  } catch(e){
    cargando(false);
    toast('No se pudo guardar. Probá de nuevo.','error');
  }
};

/* ── El acceso, junto a los otros del comisionista ─────────────────── */
function accesoMiFicha(){
  if(!perfil || perfil.rol === 'admin') return;
  var barra = document.getElementById('accesosNuevos');
  if(!barra || document.getElementById('btnMiFicha')) return;

  var b = document.createElement('button');
  b.id = 'btnMiFicha';
  b.className = 'btn btn-o btn-sm';
  b.innerHTML = 'Mi ficha' +
    (perfil.perfil_estado !== 'aprobado'
      ? '<span style="background:#B45309;color:#fff;font-size:.62rem;font-weight:800;'+
        'padding:1px 6px;border-radius:9px;margin-left:5px">!</span>'
      : '');
  b.onclick = function(){ vista = 'miperfil'; render(); };

  var hueco = barra.querySelector('div[style*="flex:1"]');
  if(hueco) barra.insertBefore(b, hueco); else barra.appendChild(b);
}

var renderPrevioPerf = window.render;
window.render = function(){
  if(typeof vista !== 'undefined' && vista === 'miperfil' && perfil){
    if(typeof renderNav === 'function') renderNav();
    document.getElementById('app').innerHTML = vistaMiFicha();
    return;
  }
  var r = renderPrevioPerf.apply(this, arguments);
  accesoMiFicha();
  return r;
};

})();

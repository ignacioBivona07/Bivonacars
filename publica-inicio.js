/* BivonaCars — La portada.

   La portada anterior estaba escrita para reclutar comisionistas y decía
   en voz alta cuánto se lleva cada uno. Dos problemas con eso:

   1. El que entra buscando un auto no entiende dónde cayó.
   2. Publicar el porcentaje invita a discutir la tajada de la casa, y un
      número redondo puesto en la portada se vuelve una promesa que
      después hay que sostener. Al comisionista se le habla del monto que
      se lleva por ESE auto, que es verificable y no compromete nada.
      El porcentaje queda donde corresponde: en los términos y en el
      acuerdo de colaboración.

   Se carga en el sitio público, después de publica-clientes.js. */

(function(){
'use strict';

var I = { comisionistas: null };

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function usd(n){ return 'USD ' + Number(n||0).toLocaleString('es-AR'); }

/* El precio de un vehículo ya no es siempre en dólares: la moneda viaja
   en la propia fila. Una fila sin moneda se lee como USD, que es lo que
   era todo hasta que se agregó la columna. */
function precio(v){
  var n = Number((v && v.precio) || 0);
  return ((v && v.moneda === 'ARS') ? '$ ' : 'USD ') + n.toLocaleString('es-AR');
}

function autos(){
  var v = (typeof vehiculos !== 'undefined' && vehiculos) ? vehiculos : [];
  return v.filter(function(x){ return x.estado === 'disponible'; });
}

/* La foto de marca es directamente el fondo de la sección, entera y sin
   recortar. Encima va un velo que arranca transparente arriba —donde está
   el logo— y se oscurece abajo, que es donde se escribe. Así no hay
   ninguna imagen pegada sobre otra cosa: la imagen ES la sección. */
function fondo(archivo, velo, base, posicion){
  return 'background:' + velo + ',' +
    "url('" + archivo + "') " + (posicion || 'center top') + '/cover no-repeat,' +
    base + ';background-blend-mode:normal';
}
var VELO_VERDE = 'linear-gradient(180deg,rgba(6,18,12,0) 0%,rgba(6,18,12,.12) 40%,'+
                 'rgba(6,18,12,.80) 68%,rgba(6,18,12,.96) 100%)';
var VELO_NEGRO = 'linear-gradient(180deg,rgba(0,0,0,.30) 0%,rgba(0,0,0,.15) 34%,'+
                 'rgba(0,0,0,.82) 74%,rgba(0,0,0,.97) 100%)';

function estilos(){
  if(document.getElementById('estilosInicio')) return;
  var s = document.createElement('style');
  s.id = 'estilosInicio';
  s.textContent =
    '.bc-hero{' + fondo('marca-logo.webp', VELO_VERDE, '#16382a', 'center 32%') + ';' +
      'color:#fff;text-align:center;min-height:clamp(560px,82vh,840px);' +
      'display:flex;flex-direction:column;justify-content:flex-end;padding:48px 24px 62px}' +
    /* El logo ya está en la foto de fondo: no hace falta ninguna imagen suelta. */
    '.bc-hero h1{font-size:clamp(1.9rem,4.4vw,3rem);font-weight:800;letter-spacing:-1px;' +
      'line-height:1.14;max-width:760px;margin:0 auto 16px}' +
    '.bc-hero h1 em{font-style:normal;color:#C9A961}' +
    '.bc-hero p.lead{font-size:1.03rem;color:#C3D6C8;max-width:580px;margin:0 auto 30px;line-height:1.66}' +
    '.bc-cta{display:flex;gap:13px;justify-content:center;flex-wrap:wrap}' +
    '.bc-btn{padding:14px 30px;border-radius:10px;font-weight:700;font-size:.98rem;cursor:pointer;' +
      'border:0;transition:.15s;text-decoration:none;display:inline-block}' +
    '.bc-btn.oro{background:linear-gradient(160deg,#D4B978,#B08D4A);color:#14261c;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.4)}' +
    '.bc-btn.oro:hover{filter:brightness(1.08)}' +
    '.bc-btn.linea{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.26);color:#fff}' +
    '.bc-btn.linea:hover{background:rgba(255,255,255,.15)}' +
    '.bc-lema{margin-top:34px;font-size:.76rem;letter-spacing:5px;color:#8FA894;font-weight:700}' +
    '.bc-sec{max-width:1120px;margin:0 auto;padding:64px 24px}' +
    '.bc-sec h2{font-size:clamp(1.4rem,2.6vw,1.9rem);font-weight:800;color:var(--navy);' +
      'letter-spacing:-.6px;margin-bottom:10px}' +
    '.bc-sec p.sub2{color:var(--gray);font-size:.97rem;line-height:1.65;max-width:620px;margin-bottom:30px}' +
    '.bc-pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}' +
    '.bc-paso{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;' +
      'box-shadow:var(--shadow)}' +
    '.bc-paso .n{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;' +
      'font-weight:800;background:#14261c;color:#C9A961;margin-bottom:13px}' +
    '.bc-paso h4{font-size:1rem;font-weight:800;color:var(--navy);margin-bottom:6px}' +
    '.bc-paso p{font-size:.88rem;color:var(--gray);line-height:1.6}' +
    /* El escudo era el fondo de toda la sección y el texto le caía encima:
       con el velo puesto no se leía ni una cosa ni la otra. Ahora es una
       pieza al costado, a tamaño real, sobre el verde de la marca. */
    '.bc-familia{background:linear-gradient(158deg,#1E3527 0%,#16261C 100%);' +
      'color:#fff;min-height:clamp(440px,62vh,660px);' +
      'display:flex;align-items:center;padding:58px 24px}' +
    '.bc-familia .caja{max-width:1020px;margin:0 auto;display:grid;' +
      'grid-template-columns:minmax(0,290px) minmax(0,1fr);gap:46px;' +
      'align-items:center;text-align:left}' +
    '.bc-familia .escudo{width:100%;max-width:290px;height:auto;display:block;' +
      'justify-self:center;filter:drop-shadow(0 14px 34px rgba(0,0,0,.45))}' +
    '.bc-familia .txt{width:100%}' +
    '@media(max-width:760px){' +
      '.bc-familia .caja{grid-template-columns:1fr;gap:30px;text-align:center}' +
      '.bc-familia .escudo{max-width:200px}}' +
    '.bc-familia h2{font-size:clamp(1.4rem,2.6vw,2rem);font-weight:800;letter-spacing:-.6px;margin-bottom:14px}' +
    '.bc-familia p{color:#C3D6C8;font-size:.97rem;line-height:1.75;margin-bottom:12px}' +
    '.bc-cifras{display:flex;justify-content:center;flex-wrap:wrap;background:#fff;' +
      'border-top:1px solid var(--line);border-bottom:1px solid var(--line)}' +
    '.bc-cifra{padding:26px 44px;text-align:center}' +
    '.bc-cifra b{display:block;font-size:1.9rem;font-weight:800;color:var(--navy);letter-spacing:-1px}' +
    '.bc-cifra span{font-size:.78rem;color:var(--gray);font-weight:600}' +
    '.bc-faq{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 20px;' +
      'margin-bottom:10px}' +
    '.bc-faq summary{font-weight:700;color:var(--navy);cursor:pointer;font-size:.93rem;list-style:none}' +
    '.bc-faq summary::-webkit-details-marker{display:none}' +
    '.bc-faq summary:before{content:"+";color:#C9A961;font-weight:800;margin-right:9px}' +
    '.bc-faq[open] summary:before{content:"–"}' +
    '.bc-faq p{font-size:.88rem;color:var(--gray);line-height:1.68;margin-top:11px}' +
    /* El cierre va en cuero negro: descansa la vista del verde y le da
       peso al final de la página. */
    '.bc-cierre{' + fondo('marca-oscura.webp', VELO_NEGRO, '#0d0d0d', 'center 70%') + ';' +
      'color:#fff;text-align:center;min-height:clamp(460px,64vh,680px);' +
      'display:flex;flex-direction:column;justify-content:flex-end;padding:48px 24px 54px}' +
    '@media(max-width:700px){.bc-cifra{padding:20px 26px}}';
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════
   LA PORTADA
   ═══════════════════════════════════════════════════════════════ */

function paso(n, titulo, texto){
  return '<div class="bc-paso"><div class="n">'+n+'</div>'+
    '<h4>'+titulo+'</h4><p>'+texto+'</p></div>';
}

function faq(p, r){
  return '<details class="bc-faq"><summary>'+p+'</summary><p>'+r+'</p></details>';
}

function vistaInicio(){
  estilos();

  var lista = autos();
  var destacados = lista.slice()
    .sort(function(a,b){ return new Date(b.creado_en) - new Date(a.creado_en); })
    .slice(0,3);

  var provincias = {};
  lista.forEach(function(v){ if(v.ubicacion) provincias[v.ubicacion] = 1; });

  var haySesion = typeof perfil !== 'undefined' && perfil;

  return '' +

  /* ── Portada ─────────────────────────────────────────────── */
  '<div class="bc-hero">'+
    '<h1>El auto que buscás, con <em>alguien que te acompaña</em> hasta el final.</h1>'+
    '<p class="lead">No somos un clasificado. Cada vehículo de nuestro catálogo tiene detrás '+
      'una persona de la red que te muestra el auto, te dice la verdad sobre su estado y te '+
      'acompaña hasta que la transferencia esté hecha.</p>'+
    '<div class="bc-cta">'+
      '<button class="bc-btn oro" onclick="vista=\'autos\';render()">Ver los autos disponibles</button>'+
      (haySesion ? '' :
        '<button class="bc-btn linea" onclick="ir(\'registro\')">Quiero vender con ustedes</button>')+
    '</div>'+
  '</div>'+

  /* ── Cifras reales, sin plata ────────────────────────────── */
  '<div class="bc-cifras">'+
    '<div class="bc-cifra"><b>'+lista.length+'</b><span>VEHÍCULOS PUBLICADOS</span></div>'+
    '<div class="bc-cifra"><b>'+(I.comisionistas === null ? '—' : I.comisionistas)+'</b>'+
      '<span>PERSONAS EN LA RED</span></div>'+
    '<div class="bc-cifra"><b>'+(Object.keys(provincias).length || '—')+'</b>'+
      '<span>ZONAS CON STOCK</span></div>'+
  '</div>'+

  /* ── Cómo funciona ───────────────────────────────────────── */
  '<div class="bc-sec">'+
    '<h2>Cómo funciona</h2>'+
    '<p class="sub2">Comprar un usado da miedo, y con razón. El sistema está armado para que '+
      'no tengas que confiar en un desconocido por teléfono.</p>'+
    '<div class="bc-pasos">'+
      paso(1,'Mirás el catálogo',
        'Cada ficha tiene el año, los kilómetros, el estado real y los detalles que otros '+
        'esconden. Si un auto tiene una abolladura, está escrito.')+
      paso(2,'Elegís quién te atiende',
        'Podés elegir de la lista o pedir que te asignemos a alguien. Le toca por turno al '+
        'que hace más tiempo que no recibe una consulta: no repartimos a dedo.')+
      paso(3,'Lo ves en persona',
        'Coordinás con esa persona, lo revisás, lo probás. Si no te convence, no pasa nada '+
        'y seguís mirando.')+
      paso(4,'Cerrás con papeles en regla',
        'Boleto de compraventa, formulario 08, verificación policial e informe de dominio. '+
        'Te acompañamos hasta que el auto figure a tu nombre.')+
    '</div>'+
  '</div>'+

  /* ── El escudo de la familia ─────────────────────────────── */
  '<div class="bc-familia"><div class="caja">'+
    '<img class="escudo" src="marca-escudo.webp" width="560" height="560" '+
      'loading="lazy" alt="Escudo de BivonaCars">'+
    '<div class="txt">'+
      '<h2>Un auto casi nunca es sólo un auto</h2>'+
      '<p>Es llevar a los chicos al colegio. Es la changa que podés aceptar porque ahora '+
        'llegás. Es irte el fin de semana sin pedirle el auto a nadie.</p>'+
      '<p>Por eso no trabajamos con vendedores de paso. Trabajamos con gente de cada zona, '+
        'que vive donde vos vivís y que va a cruzarte en el barrio la semana que viene. '+
        'Eso hace que la conversación sea distinta.</p>'+
      '<p style="color:#C9A961;font-weight:700;letter-spacing:3px;font-size:.8rem;'+
        'margin-top:20px">OMNIA POSSUNT · TODO ES POSIBLE</p>'+
    '</div>'+
  '</div></div>'+

  /* ── Destacados ──────────────────────────────────────────── */
  (destacados.length
    ? '<div class="bc-sec">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;'+
          'flex-wrap:wrap;gap:14px;margin-bottom:26px">'+
          '<div><h2 style="margin-bottom:6px">Últimos que entraron</h2>'+
          '<p class="sub2" style="margin:0">Lo más nuevo del catálogo.</p></div>'+
          '<button class="btn btn-o btn-sm" onclick="vista=\'autos\';render()">Ver todos</button>'+
        '</div>'+
        '<div class="grid">'+
          destacados.map(function(v){
            var t = [v.marca, v.modelo, v.version].filter(Boolean).join(' ');
            return '<div class="vcard"><div class="vimg">'+esc(v.icono || '🚗')+
              (v.anio ? '<span class="pill p-gray est">'+v.anio+'</span>' : '')+'</div>'+
              '<div class="vbody">'+
                '<div class="vtitle">'+esc(t)+'</div>'+
                '<div class="vmeta">'+(v.km ? Number(v.km).toLocaleString('es-AR')+' km' : 'Km sin declarar')+
                  (v.combustible ? ' · '+esc(v.combustible) : '')+'</div>'+
                '<div class="vprice">'+precio(v)+'</div>'+
                '<button class="btn btn-block" style="margin-top:13px" '+
                  'onclick="consultarPorVehiculo('+v.id+',\''+esc(t).replace(/'/g,"\\'")+'\')">'+
                  'Consultar</button>'+
              '</div></div>';
          }).join('')+
        '</div>'+
      '</div>'
    : '')+

  /* ── Para el que quiere vender ───────────────────────────── */
  (haySesion ? '' :
  '<div style="background:var(--bg);border-top:1px solid var(--line)">'+
    '<div class="bc-sec">'+
      '<h2>¿Querés vender con nosotros?</h2>'+
      '<p class="sub2">Buscamos gente de cada zona del país. No hace falta local, ni stock, '+
        'ni poner un peso: tomás vehículos del catálogo, los ofrecés y cobrás por cada uno '+
        'que vendas.</p>'+
      '<div class="bc-pasos">'+
        paso('◈','Sin invertir capital',
          'Los autos no son tuyos ni los pagás. Tomás los que quieras dentro de tu cupo y '+
          'los trabajás. Si no vendés, no perdiste nada.')+
        paso('◈','Sabés cuánto ganás antes de empezar',
          'Cada vehículo del catálogo te muestra en pantalla el monto exacto que te llevás '+
          'por venderlo. Sin cuentas raras ni sorpresas al cobrar.')+
        paso('◈','Cobrás cuando se cierra',
          'La operación se registra, la comisión queda a tu nombre y se paga. Todo queda '+
          'escrito y lo podés ver desde tu cuenta.')+
        paso('◈','Crecés con lo que vendés',
          'A medida que cerrás operaciones subís de nivel y accedés a vehículos de más valor '+
          'y a más lugares en tu cupo.')+
      '</div>'+
      '<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">'+
        '<button class="btn" onclick="ir(\'registro\')">Sumarme a la red</button>'+
        '<button class="btn btn-o" onclick="ir(\'reglas\')">Ver cómo funciona en detalle</button>'+
      '</div>'+
    '</div>'+
  '</div>')+

  /* ── Preguntas ───────────────────────────────────────────── */
  '<div class="bc-sec">'+
    '<h2>Preguntas que nos hacen seguido</h2>'+
    '<div style="max-width:760px;margin-top:24px">'+
      faq('¿Puedo comprar directamente, sin pasar por un comisionista?',
        'No, y es a propósito. La persona que te atiende es la que se hace responsable de '+
        'mostrarte el auto, contarte su historia real y acompañarte con los papeles. Sin esa '+
        'figura seríamos un clasificado más.')+
      faq('¿Me cobran algo por usar la página?',
        'No. Buscar, consultar y hablar con un comisionista es gratis. El precio que ves '+
        'publicado es el precio del vehículo.')+
      faq('¿Los autos son de ustedes?',
        'Algunos sí y otros son de particulares que nos los confiaron para venderlos. En '+
        'los dos casos el vehículo pasa por la misma revisión y los papeles se tramitan igual.')+
      faq('¿Puedo entregar mi auto usado como parte de pago?',
        'En muchos casos sí. Fijate en la ficha del vehículo si dice que acepta permuta, y '+
        'habláramoslo con el comisionista: se tasa el tuyo y se descuenta del precio.')+
      faq('¿Qué pasa si el auto que me interesa ya tiene una seña?',
        'Sale del catálogo mientras se cierra esa operación. Si se cae, vuelve a aparecer '+
        'publicado automáticamente.')+
      faq('¿Cómo sé que el comisionista que me toca es confiable?',
        'Cada uno tiene su ficha con foto, zona, cantidad de ventas cerradas y las reseñas '+
        'de la gente que lo trató. Podés leerlas antes de escribirle, y elegir a otro si preferís.')+
    '</div>'+
  '</div>'+

  /* ── Cierre ──────────────────────────────────────────────── */
  '<div class="bc-cierre">'+
    '<h2 style="font-size:clamp(1.4rem,3vw,2.1rem);font-weight:800;letter-spacing:-.7px;'+
      'margin-bottom:12px">Mirá lo que hay hoy</h2>'+
    '<p style="color:#C3D6C8;max-width:480px;margin:0 auto 26px;line-height:1.65">'+
      'El catálogo cambia todas las semanas. Si no está el que buscás, decíselo a cualquiera '+
      'de la red y te avisamos cuando entre.</p>'+
    '<button class="bc-btn oro" onclick="vista=\'autos\';render()">Ver los autos disponibles</button>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   ENGANCHE
   ═══════════════════════════════════════════════════════════════ */

async function contarRed(){
  try {
    var r = await sb.from('comisionistas_publicos').select('id');
    I.comisionistas = (r.data || []).length;
  } catch(e){ I.comisionistas = 0; }
}

window.vLanding = vistaInicio;

var renderPrevioI = window.render;
window.render = function(){
  var r = renderPrevioI.apply(this, arguments);
  if(I.comisionistas === null && typeof vista !== 'undefined' && vista === 'landing'){
    I.comisionistas = 0;                 /* evita pedirlo dos veces */
    contarRed().then(function(){ render(); });
  }
  return r;
};

})();

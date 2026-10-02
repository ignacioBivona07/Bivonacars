let sesion=null,perfil=null,penas=[],asigs=[],vehiculos=[],visitas=[],operaciones=[],pagos=[],vista="landing",tabPanel="activos",filtro={gama:"",texto:"",orden:"reciente"},wizPaso=1,regData={},archivos={};function ir(a){vista=a,render(),window.scrollTo(0,0)}async function cargarSesion(){const{data:a}=await sb.auth.getSession();if(sesion=a.session,!sesion){perfil=null;return}const{data:e}=await sb.from("perfiles").select("*").eq("id",sesion.user.id).maybeSingle();perfil=e}async function cargarTodo(){const a=[sb.from("vehiculos").select("*").neq("estado","vendido").order("creado_en",{ascending:!1})];perfil&&(a.push(sb.from("asignaciones").select("*, vehiculos(*)").eq("usuario_id",perfil.id)),a.push(sb.from("penalizaciones").select("*").eq("usuario_id",perfil.id)),a.push(sb.from("visitas").select("*, vehiculos(marca,modelo,icono,ubicacion)").eq("usuario_id",perfil.id).order("fecha")),a.push(sb.from("operaciones").select("*").eq("usuario_id",perfil.id).order("fecha",{ascending:!1})),a.push(sb.from("pagos_cupo").select("*").eq("usuario_id",perfil.id).order("fecha",{ascending:!1})));const e=await Promise.all(a);vehiculos=e[0].data||[],asigs=perfil?e[1].data||[]:[],penas=perfil?e[2].data||[]:[],visitas=perfil?e[3].data||[]:[],operaciones=perfil?e[4].data||[]:[],pagos=perfil?e[5].data||[]:[]}function renderNav(){$("nav").innerHTML=perfil?`
    <button class="${vista==="catalogo"?"on":""}" onclick="ir('catalogo')">Catálogo</button>
    <button class="${vista==="panel"?"on":""}" onclick="ir('panel')">Mi panel</button>
    <button class="${vista==="reglas"?"on":""}" onclick="ir('reglas')">Niveles y cupos</button>
  `:`
    <button class="${vista==="landing"?"on":""}" onclick="ir('landing')">Inicio</button>
    <button class="${vista==="reglas"?"on":""}" onclick="ir('reglas')">Cómo funciona</button>
  `,$("authArea").innerHTML=perfil?`
    <div class="userchip">
      <div class="avatar">${(perfil.nombre[0]||"")+(perfil.apellido[0]||"")}</div>
      <div><div style="font-weight:700">${perfil.nombre} ${perfil.apellido}</div>
        <div style="font-size:.71rem;color:#9FC2EE">${NIVELES[perfil.nivel].nombre}${perfil.estado_verificacion!=="aprobado"?" · sin verificar":""}</div></div>
      <button onclick="salir()" style="background:rgba(255,255,255,.12);color:#fff;padding:5px 11px;border-radius:6px;font-size:.75rem;font-weight:700;margin-left:6px">Salir</button>
    </div>`:`
    <div style="display:flex;gap:9px">
      <button class="btn btn-o btn-sm" onclick="ir('login')">Ingresar</button>
      <button class="btn btn-sm" onclick="wizPaso=1;regData={};archivos={};ir('registro')">Registrarme</button>
    </div>`}async function salir(){await sb.auth.signOut(),perfil=null,sesion=null,ir("landing"),toast("Sesión cerrada")}function vLanding(){const a=vehiculos.filter(i=>i.estado==="disponible"),e=a.length?Math.max(...a.map(i=>Number(i.precio)))*.02:2e3;return`
  <div class="hero">
    <div class="tag">Nuevo modelo de venta de vehículos</div>
    <h1>Vendé vehículos.<br>Cobrá en <em>dólares</em>. Sin invertir un peso.</h1>
    <p>Accedé a un catálogo de vehículos verificados y ganá el 2% de comisión por cada operación que cierres. Hasta 5 vehículos en venta al mismo tiempo.</p>
    <div class="hero-cta">
      <button class="btn-hero" onclick="wizPaso=1;regData={};archivos={};ir('registro')">Quiero empezar a vender</button>
      <button class="btn-ghost" onclick="ir('login')">Ya tengo cuenta</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><b>2%</b><small>Tu comisión por venta</small></div>
    <div class="stat"><b>${a.length}</b><small>Vehículos disponibles</small></div>
    <div class="stat"><b>5</b><small>Vehículos simultáneos</small></div>
    <div class="stat"><b>${fmtUSD(Math.round(e))}</b><small>Comisión más alta del catálogo</small></div>
  </div>
  <div class="wrap">
    <h2 class="sec">Cómo funciona</h2>
    <p class="sub">Cuatro pasos desde que te registrás hasta que cobrás</p>
    <div class="steps">
      <div class="stp"><div class="n">1</div><h4>Registrate y verificate</h4><p>Cargás tus datos y la constancia de monotributo. Revisamos tu cuenta y la habilitamos.</p></div>
      <div class="stp"><div class="n">2</div><h4>Tomá vehículos</h4><p>Elegís del catálogo según tu nivel. Cada vehículo tomado genera tu código único de vendedor.</p></div>
      <div class="stp"><div class="n">3</div><h4>Conseguí el comprador</h4><p>Le pasás tu código al señar. Así queda registrado que la operación es tuya.</p></div>
      <div class="stp"><div class="n">4</div><h4>Facturá y cobrá</h4><p>Cerrada la venta y transferido el dominio, emitís tu factura y cobrás el 2%.</p></div>
    </div>
    <div style="margin-top:50px">
      <h2 class="sec">Niveles y cupos</h2>
      <p class="sub">Cuanto más vendés, más alto es el valor de los vehículos que podés ofrecer</p>
      ${htmlNiveles()}
    </div>
    <div style="margin-top:50px;text-align:center;background:linear-gradient(135deg,var(--navy),var(--navy-2));border-radius:18px;padding:52px 32px;color:#fff">
      <h2 style="font-size:1.9rem;font-weight:800;margin-bottom:11px;letter-spacing:-.5px">Una sola venta puede superar un sueldo</h2>
      <p style="color:#B9CBE4;max-width:520px;margin:0 auto 28px;line-height:1.65">El 2% de un vehículo de USD 100.000 son USD 2.000. Vos elegís cuánto trabajás y cuánto ganás.</p>
      <button class="btn-hero" onclick="wizPaso=1;regData={};archivos={};ir('registro')">Crear mi cuenta</button>
    </div>
  </div>`}function htmlNiveles(){return`<div class="levels">${Object.values(NIVELES).map(a=>`
    <div class="lvl">
      <div class="lvl-badge" style="background:${a.bg};color:${a.color}">${a.emoji}</div>
      <h4 style="color:${a.color}">${a.nombre}</h4>
      <div class="rng">${a.limite>9e5?"Sin límite":"Hasta "+fmtUSD(a.limite)}</div>
      <p>${a.detalle}</p>
      <div class="req">${a.siguiente}</div>
    </div>`).join("")}</div>`}function vReglas(){return`<div class="wrap">
    <h2 class="sec">Niveles, cupos y reglas</h2>
    <p class="sub">Todo lo que define cuántos y qué vehículos podés tener en venta al mismo tiempo</p>
    ${htmlNiveles()}
    <div class="card" style="padding:26px;margin-top:24px">
      <h3 style="font-size:1.05rem;font-weight:800;color:var(--navy);margin-bottom:14px">Cupo de vehículos simultáneos</h3>
      <div class="detail-row"><span>Cupo incluido para todos</span><span>${CUPO_BASE} vehículos a la vez</span></div>
      <div class="detail-row"><span>Nivel Bronce</span><span>Solo gama baja, hasta completar el cupo</span></div>
      <div class="detail-row"><span>Nivel Plata</span><span>Máximo 3 de gama media en simultáneo</span></div>
      <div class="detail-row"><span>Nivel Oro</span><span>Gama media sin tope · gama alta 1 por vez</span></div>
      <div class="detail-row"><span>Cupo adicional</span><span>${fmtUSD(PRECIO_CUPO_EXTRA)} por cada vehículo extra</span></div>
    </div>
    <div class="card" style="padding:26px;margin-top:18px">
      <h3 style="font-size:1.05rem;font-weight:800;color:var(--navy);margin-bottom:14px">Penalización por liberar un vehículo</h3>
      <div class="note w" style="margin-bottom:14px">Si liberás un vehículo que habías tomado, tu cupo baja en 1 durante <b>${DIAS_PENALIZACION} días</b>. Pasás a tener ${CUPO_BASE-1} disponibles en lugar de ${CUPO_BASE}.</div>
      <div class="detail-row"><span>Por qué existe</span><span>Evita que se bloqueen vehículos sin intención real de venderlos</span></div>
      <div class="detail-row"><span>Duración</span><span>${DIAS_PENALIZACION} días corridos</span></div>
      <div class="detail-row"><span>¿Se acumula?</span><span>Sí, cada liberación descuenta un cupo más</span></div>
      <div class="detail-row"><span>¿Se puede compensar?</span><span>Sí, comprando un cupo extra por ${fmtUSD(PRECIO_CUPO_EXTRA)}</span></div>
    </div>
    <div class="card" style="padding:26px;margin-top:18px">
      <h3 style="font-size:1.05rem;font-weight:800;color:var(--navy);margin-bottom:14px">Requisitos para operar</h3>
      <div class="detail-row"><span>Condición fiscal</span><span>Monotributista o Responsable Inscripto activo</span></div>
      <div class="detail-row"><span>Documentación</span><span>Constancia de inscripción AFIP vigente + DNI</span></div>
      <div class="detail-row"><span>Cuenta bancaria</span><span>CBU o alias a tu nombre</span></div>
      <div class="detail-row"><span>Verificación</span><span>Revisamos la documentación antes de habilitarte</span></div>
    </div>
  </div>`}function vLogin(){return`<div class="auth-bg"><div class="auth">
    <h3>Ingresar</h3><p class="lead">Accedé a tu panel de comisionista</p>
    <div class="fld"><label>Correo electrónico</label><input id="lgEmail" type="email" placeholder="tucorreo@mail.com" autocomplete="email"></div>
    <div class="fld"><label>Contraseña</label><input id="lgPass" type="password" placeholder="••••••" autocomplete="current-password"
      onkeydown="if(event.key==='Enter')hacerLogin()"></div>
    <button class="btn btn-block" style="margin-top:8px" onclick="hacerLogin()">Ingresar</button>
    <div class="auth-alt">¿No tenés cuenta? <a onclick="wizPaso=1;regData={};archivos={};ir('registro')">Registrate acá</a></div>
  </div></div>`}async function hacerLogin(){const a=$("lgEmail").value.trim(),e=$("lgPass").value;if(!a||!e)return toast("Completá correo y contraseña","error");cargando(!0,"Ingresando…");const{error:i}=await sb.auth.signInWithPassword({email:a,password:e});if(i)return cargando(!1),toast(mensajeError(i),"error");await cargarSesion(),await cargarTodo(),cargando(!1),vista="panel",render(),toast("Bienvenido, "+perfil.nombre,"ok")}const PASOS=["Datos personales","Contacto","Situación fiscal","Cobros y contrato"];function vRegistro(){return`<div class="auth-bg"><div class="auth wide">
    <h3>Registro de comisionista</h3>
    <p class="lead">Necesitamos estos datos para habilitarte a operar y pagarte tus comisiones</p>
    <div class="wiz">${PASOS.map((a,e)=>`
      <div class="wstep ${wizPaso===e+1?"on":""} ${wizPaso>e+1?"done":""}">
        <div class="b">${wizPaso>e+1?"✓":e+1}</div><div class="t">${a}</div></div>`).join("")}</div>
    <div id="wizBody">${[pasoDatos,pasoContacto,pasoFiscal,pasoCobros][wizPaso-1]()}</div>
    <div style="display:flex;gap:10px;margin-top:22px">
      ${wizPaso>1?'<button class="btn btn-o" onclick="wizAtras()">← Atrás</button>':""}
      <button class="btn" style="flex:1" onclick="${wizPaso<4?"wizSiguiente()":"finalizarRegistro()"}">
        ${wizPaso<4?"Continuar →":"✓ Crear mi cuenta"}</button>
    </div>
    <div class="auth-alt">¿Ya tenés cuenta? <a onclick="ir('login')">Ingresá acá</a></div>
  </div></div>`}function pasoDatos(){const a=regData;return`
  <div class="row2">
    <div class="fld"><label>Nombre <span class="req">*</span></label><input id="rNombre" value="${a.nombre||""}" placeholder="Juan"></div>
    <div class="fld"><label>Apellido <span class="req">*</span></label><input id="rApellido" value="${a.apellido||""}" placeholder="Pérez"></div>
  </div>
  <div class="row2">
    <div class="fld"><label>DNI <span class="req">*</span></label><input id="rDni" value="${a.dni||""}" placeholder="35123456">
      <div class="hint">Sin puntos ni espacios</div></div>
    <div class="fld"><label>Fecha de nacimiento <span class="req">*</span></label><input id="rNacimiento" type="date" value="${a.nacimiento||""}">
      <div class="hint">Tenés que ser mayor de 18 años</div></div>
  </div>
  <div class="fld"><label>Foto del DNI — frente <span class="req">*</span></label>${dropzone("dniFrente","📇","Subí la foto del frente de tu DNI")}</div>
  <div class="fld"><label>Foto del DNI — dorso <span class="req">*</span></label>${dropzone("dniDorso","📇","Subí la foto del dorso de tu DNI")}</div>
  <div class="note">Los datos del DNI se usan para verificar tu identidad y deben coincidir con el titular del CUIT que declares en el paso 3. Los archivos se guardan cifrados y solo los ve el equipo de verificación.</div>`}function pasoContacto(){const a=regData,e=["CABA","Buenos Aires","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán"];return`
  <div class="row2">
    <div class="fld"><label>Correo electrónico <span class="req">*</span></label><input id="rEmail" type="email" value="${a.email||""}" placeholder="juan@mail.com">
      <div class="hint">Con este correo vas a ingresar a la plataforma</div></div>
    <div class="fld"><label>Teléfono / WhatsApp <span class="req">*</span></label><input id="rTel" value="${a.tel||""}" placeholder="11-5555-1234"></div>
  </div>
  <div class="row2">
    <div class="fld"><label>Provincia <span class="req">*</span></label>
      <select id="rProvincia">${e.map(i=>`<option ${a.provincia===i?"selected":""}>${i}</option>`).join("")}</select></div>
    <div class="fld"><label>Localidad <span class="req">*</span></label><input id="rLocalidad" value="${a.localidad||""}" placeholder="San Isidro"></div>
  </div>
  <div class="fld"><label>Domicilio</label><input id="rDomicilio" value="${a.domicilio||""}" placeholder="Av. Santa Fe 3200, piso 4"></div>
  <div class="row2">
    <div class="fld"><label>Experiencia en ventas</label>
      <select id="rExperiencia">
        <option value="0-2" ${a.experiencia==="0-2"?"selected":""}>Menos de 2 años</option>
        <option value="2-5" ${a.experiencia==="2-5"?"selected":""}>Entre 2 y 5 años</option>
        <option value="5-10" ${a.experiencia==="5-10"?"selected":""}>Entre 5 y 10 años</option>
        <option value="10+" ${a.experiencia==="10+"?"selected":""}>Más de 10 años</option>
      </select></div>
    <div class="fld"><label>Rubro principal</label>
      <select id="rRubro">${["Concesionaria oficial","Agencia de usados","Inmobiliaria","Seguros","Finanzas","Otro"].map(i=>`<option ${a.rubro===i?"selected":""}>${i}</option>`).join("")}</select></div>
  </div>
  <div class="fld"><label>¿Trabajaste alguna vez en una concesionaria?</label>
    <select id="rConcesionaria">
      <option value="si" ${a.concesionaria==="si"?"selected":""}>Sí</option>
      <option value="no" ${a.concesionaria==="no"?"selected":""}>No</option>
    </select><div class="hint">No es excluyente, pero nos ayuda a orientarte mejor</div></div>`}function pasoFiscal(){const a=regData;return`
  <div class="note w" style="margin-bottom:18px">
    <b>Requisito obligatorio.</b> Para cobrar comisiones tenés que poder emitirnos factura. Solo habilitamos cuentas con inscripción activa en AFIP y constancia verificada.
  </div>
  <div class="fld"><label>Condición fiscal <span class="req">*</span></label>
    <select id="rCondicion" onchange="cambioCondicion()">
      <option value="">— Seleccioná —</option>
      <option value="Monotributista" ${a.condicionFiscal==="Monotributista"?"selected":""}>Monotributista</option>
      <option value="Responsable Inscripto" ${a.condicionFiscal==="Responsable Inscripto"?"selected":""}>Responsable Inscripto</option>
      <option value="No inscripto" ${a.condicionFiscal==="No inscripto"?"selected":""}>Todavía no estoy inscripto</option>
    </select></div>
  <div id="fiscalDetalle">${htmlFiscalDetalle()}</div>`}function htmlFiscalDetalle(){const a=regData,e=a.condicionFiscal||"";return e==="No inscripto"?`<div class="note r">
    <b>No podemos habilitarte todavía.</b> Sin inscripción en AFIP no podés emitirnos factura y por lo tanto no podemos pagarte comisiones.<br><br>
    Podés dejar tu solicitud igual: te vamos a contactar con la guía para inscribirte en el Monotributo. Cuando tengas tu constancia la cargás y activamos tu cuenta.</div>`:e?`
  <div class="row2">
    <div class="fld"><label>CUIT <span class="req">*</span></label><input id="rCuit" value="${a.cuit||""}" placeholder="20-35123456-7">
      <div class="hint">Debe coincidir con el DNI que cargaste</div></div>
    <div class="fld"><label>Fecha de inscripción <span class="req">*</span></label><input id="rFechaInsc" type="date" value="${a.fechaInscripcion||""}"></div>
  </div>
  ${e==="Monotributista"?`
  <div class="fld"><label>Categoría de monotributo <span class="req">*</span></label>
    <select id="rCategoria"><option value="">— Seleccioná —</option>
      ${["A","B","C","D","E","F","G","H","I","J","K"].map(i=>`<option ${a.categoriaMono===i?"selected":""}>${i}</option>`).join("")}
    </select><div class="hint">La encontrás en tu constancia de inscripción</div></div>`:""}
  <div class="fld"><label>Constancia de inscripción AFIP <span class="req">*</span></label>
    ${dropzone("constancia","📄","Subí el PDF de tu constancia de inscripción")}
    <div class="hint">La descargás desde afip.gob.ar → Constancia de inscripción. Debe estar vigente.</div></div>
  <div class="note g"><b>Qué verificamos.</b> Que el CUIT esté activo, que la condición declarada coincida con la constancia, y que el titular sea la misma persona del DNI.</div>`:""}function cambioCondicion(){regData.condicionFiscal=$("rCondicion").value,$("fiscalDetalle").innerHTML=htmlFiscalDetalle()}function avisoCuentaSueldo(v){return v==="si"?`<div class="note w" style="margin-bottom:4px"><b>Mejor declará otra cuenta.</b> Si las comisiones entran en la misma cuenta donde cobrás tu sueldo, se mezcla un empleo en relación de dependencia con trabajo independiente. Podés seguir con el alta igual — no te lo vamos a trabar — pero conviene una caja de ahorro o una billetera aparte.</div>`:""}function cambioCuentaSueldo(){regData.cuentaSueldo=$("rCuentaSueldo").value;const a=$("avisoCuentaSueldo");a&&(a.innerHTML=avisoCuentaSueldo(regData.cuentaSueldo))}function pasoCobros(){const a=regData;return`
  <div class="note" style="margin-bottom:18px">Las comisiones se transfieren a una cuenta bancaria <b>a tu nombre</b>. No aceptamos cuentas de terceros.</div>
  <div class="fld"><label>CBU o CVU <span class="req">*</span></label><input id="rCbu" value="${a.cbu||""}" placeholder="0170099220000012345678" maxlength="22">
    <div class="hint">22 dígitos, sin espacios ni guiones</div></div>
  <div class="fld"><label>Alias de la cuenta</label><input id="rAlias" value="${a.aliasCbu||""}" placeholder="juan.perez.mp"></div>
  <div class="fld"><label>Banco o billetera</label>
    <select id="rBanco">${["Mercado Pago","Banco Galicia","Banco Nación","Banco Santander","BBVA","Banco Macro","Brubank","Ualá","Otro"].map(e=>`<option ${a.banco===e?"selected":""}>${e}</option>`).join("")}</select></div>

  <div class="fld"><label>¿Esa cuenta es tu cuenta sueldo? <span class="req">*</span></label>
    <select id="rCuentaSueldo" onchange="cambioCuentaSueldo()">
      <option value="">— Seleccioná —</option>
      <option value="no" ${a.cuentaSueldo==="no"?"selected":""}>No — es una cuenta mía que no recibe sueldo</option>
      <option value="si" ${a.cuentaSueldo==="si"?"selected":""}>Sí — en esa cuenta cobro un sueldo</option>
    </select>
    <div class="hint">El número de CBU no dice de qué tipo es la cuenta: eso sólo lo sabés vos. Te lo preguntamos porque cobrás como trabajador independiente, y una cuenta sueldo es de un empleo en relación de dependencia.</div></div>
  <div id="avisoCuentaSueldo">${avisoCuentaSueldo(a.cuentaSueldo)}</div>

  <div style="margin-top:22px;padding-top:20px;border-top:1px solid var(--line)">
    <h4 style="font-size:.95rem;font-weight:800;color:var(--navy);margin-bottom:12px">Condiciones del acuerdo</h4>
    ${[["rAcepta1","acepta1","Declaro que actúo como <b>trabajador independiente</b>, bajo mi propio riesgo, sin relación de dependencia con BivonaCars, y que puedo prestar servicios a terceros."],["rAcepta2","acepta2","Me comprometo a <b>emitir factura</b> por mis honorarios como condición para el cobro de cada comisión."],["rAcepta3","acepta3",`Acepto las reglas de <b>cupos y penalizaciones</b>: hasta ${CUPO_BASE} vehículos simultáneos, y ${DIAS_PENALIZACION} días de cupo reducido si libero un vehículo tomado.`],["rAcepta4","acepta4","Me comprometo a mantener la <b>confidencialidad</b> de los datos de propietarios y vehículos del catálogo."]].map(([e,i,s])=>`
      <label style="display:flex;gap:10px;align-items:flex-start;padding:12px;background:var(--bg);border:1px solid var(--line);border-radius:9px;margin-bottom:8px;cursor:pointer;font-size:.83rem;line-height:1.55">
        <input type="checkbox" id="${e}" ${regData[i]?"checked":""} style="width:17px;height:17px;accent-color:var(--blue);flex-shrink:0;margin-top:1px">
        <span>${s}</span></label>`).join("")}
  </div>
  <div class="row2" style="margin-top:18px">
    <div class="fld"><label>Contraseña <span class="req">*</span></label><input id="rPass" type="password" value="${a.pass||""}" placeholder="Mínimo 6 caracteres"></div>
    <div class="fld"><label>Repetir contraseña <span class="req">*</span></label><input id="rPass2" type="password" value="${a.pass2||""}" placeholder="Repetila"></div>
  </div>`}function dropzone(a,e,i){const s=archivos[a];return`<label class="drop ${s?"has":""}" id="dz_${a}">
    <div class="ic">${s?"✓":e}</div>
    <b>${s?s.name:i}</b>
    <small>${s?"Archivo cargado — clic para reemplazar":"PDF, JPG o PNG · hasta 5 MB"}</small>
    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onchange="tomarArchivo('${a}', this)">
  </label>`}function tomarArchivo(a,e){const i=e.files[0];if(!i)return;if(i.size>5*1024*1024)return toast("El archivo supera los 5 MB","error");archivos[a]=i;const s=$("dz_"+a);s.classList.add("has"),s.querySelector(".ic").textContent="✓",s.querySelector("b").textContent=i.name,s.querySelector("small").textContent="Archivo cargado — clic para reemplazar"}function leerPaso(){const a=e=>$(e)?$(e).value.trim():"";wizPaso===1&&Object.assign(regData,{nombre:a("rNombre"),apellido:a("rApellido"),dni:a("rDni"),nacimiento:a("rNacimiento")}),wizPaso===2&&Object.assign(regData,{email:a("rEmail"),tel:a("rTel"),provincia:a("rProvincia"),localidad:a("rLocalidad"),domicilio:a("rDomicilio"),experiencia:a("rExperiencia"),rubro:a("rRubro"),concesionaria:a("rConcesionaria")}),wizPaso===3&&Object.assign(regData,{condicionFiscal:a("rCondicion"),cuit:a("rCuit"),fechaInscripcion:a("rFechaInsc"),categoriaMono:a("rCategoria")}),wizPaso===4&&Object.assign(regData,{cbu:a("rCbu"),aliasCbu:a("rAlias"),banco:a("rBanco"),cuentaSueldo:a("rCuentaSueldo"),pass:a("rPass"),pass2:a("rPass2"),acepta1:$("rAcepta1")&&$("rAcepta1").checked,acepta2:$("rAcepta2")&&$("rAcepta2").checked,acepta3:$("rAcepta3")&&$("rAcepta3").checked,acepta4:$("rAcepta4")&&$("rAcepta4").checked})}function validarPaso(){const a=regData;if(wizPaso===1){if(!a.nombre||!a.apellido||!a.dni||!a.nacimiento)return"Completá nombre, apellido, DNI y fecha de nacimiento";if(!/^\d{7,8}$/.test(a.dni))return"El DNI debe tener 7 u 8 dígitos, sin puntos";if((Date.now()-new Date(a.nacimiento))/315576e5<18)return"Tenés que ser mayor de 18 años para operar";if(!archivos.dniFrente||!archivos.dniDorso)return"Subí las fotos del frente y dorso de tu DNI"}if(wizPaso===2){if(!a.email||!a.tel||!a.localidad)return"Completá correo, teléfono y localidad";if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email))return"El correo no tiene un formato válido"}if(wizPaso===3){if(!a.condicionFiscal)return"Seleccioná tu condición fiscal";if(a.condicionFiscal!=="No inscripto"){if(!a.cuit)return"Ingresá tu CUIT";if(!/^\d{2}-?\d{8}-?\d$/.test(a.cuit.replace(/\s/g,"")))return"El CUIT debe tener el formato 20-35123456-7";if(!a.fechaInscripcion)return"Ingresá la fecha de inscripción";if(a.condicionFiscal==="Monotributista"&&!a.categoriaMono)return"Seleccioná tu categoría de monotributo";if(!archivos.constancia)return"Subí tu constancia de inscripción de AFIP — es obligatoria"}}if(wizPaso===4){if(!a.cbu)return"Ingresá tu CBU o CVU para poder pagarte";if(!/^\d{22}$/.test(a.cbu.replace(/\s|-/g,"")))return"El CBU debe tener exactamente 22 dígitos";if(!a.cuentaSueldo)return"Decinos si esa cuenta es tu cuenta sueldo";if(!a.pass||a.pass.length<6)return"La contraseña debe tener al menos 6 caracteres";if(a.pass!==a.pass2)return"Las contraseñas no coinciden";if(!(a.acepta1&&a.acepta2&&a.acepta3&&a.acepta4))return"Tenés que aceptar las cuatro condiciones del acuerdo"}return null}function wizSiguiente(){leerPaso();const a=validarPaso();if(a)return toast("⚠ "+a,"error");wizPaso++,render()}function wizAtras(){leerPaso(),wizPaso--,render()}async function finalizarRegistro(){leerPaso();const a=validarPaso();if(a)return toast("⚠ "+a,"error");const e=regData;cargando(!0,"Creando tu cuenta…");const{data:i,error:s}=await sb.auth.signUp({email:e.email,password:e.pass});if(s)return cargando(!1),toast(mensajeError(s),"error");const c=i.user&&i.user.id;if(!c)return cargando(!1),toast("No se pudo crear la cuenta. Intentá de nuevo.","error");if(!i.session)return cargando(!1),modal("Revisá tu correo",`<div class="note g">
      Te enviamos un correo a <b>${e.email}</b> para confirmar tu cuenta.
      Confirmalo y volvé a ingresar para completar tu registro.</div>`,[{txt:"Entendido",clase:"",fn:"cerrarModal();ir('login')"}]);cargando(!0,"Subiendo documentos…");const o={};for(const t of["dniFrente","dniDorso","constancia"]){const l=archivos[t];if(!l)continue;const p=l.name.split(".").pop().toLowerCase(),r=`${c}/${t}.${p}`,{error:d}=await sb.storage.from("documentos").upload(r,l,{upsert:!0});if(d)return cargando(!1),toast("Error al subir "+l.name+": "+mensajeError(d),"error");o[t]=r}cargando(!0,"Guardando tus datos…");const{error:n}=await sb.from("perfiles").insert({id:c,nombre:e.nombre,apellido:e.apellido,dni:e.dni,nacimiento:e.nacimiento,tel:e.tel,provincia:e.provincia,localidad:e.localidad,domicilio:e.domicilio||null,cuit:e.cuit||null,condicion_fiscal:e.condicionFiscal,categoria_mono:e.categoriaMono||null,fecha_inscripcion:e.fechaInscripcion||null,constancia_path:o.constancia||null,dni_frente_path:o.dniFrente||null,dni_dorso_path:o.dniDorso||null,cbu:e.cbu,alias_cbu:e.aliasCbu||null,banco:e.banco||null,cuenta_sueldo:e.cuentaSueldo?e.cuentaSueldo==="si":null,cuenta_sueldo_declarada_en:e.cuentaSueldo?new Date().toISOString():null,experiencia:e.experiencia||null,rubro:e.rubro||null,concesionaria:e.concesionaria||"no"});if(n)return cargando(!1),toast(mensajeError(n),"error");await cargarSesion(),await cargarTodo(),cargando(!1),vista="panel",render(),toast("Cuenta creada. Queda <b>pendiente de verificación</b> hasta que revisemos tu constancia.","ok")}function vCatalogo(){if(!perfil)return vLogin();const a=NIVELES[perfil.nivel],e=cupoEfectivo(perfil,penas),i=asigs.length;let s=vehiculos.slice();if(filtro.gama&&(s=s.filter(o=>o.gama===filtro.gama)),filtro.texto){const o=filtro.texto.toLowerCase();s=s.filter(n=>(n.marca+" "+n.modelo+" "+(n.ubicacion||"")).toLowerCase().includes(o))}filtro.orden==="precio-asc"?s.sort((o,n)=>o.precio-n.precio):filtro.orden==="precio-desc"&&s.sort((o,n)=>n.precio-o.precio);const c=asigs.map(o=>o.vehiculo_id);return`<div class="wrap">
    ${perfil.estado_verificacion!=="aprobado"?`<div class="note w" style="margin-bottom:20px">
      <b>Tu cuenta está ${VERIF_LABEL[perfil.estado_verificacion].toLowerCase()}.</b> Podés explorar el catálogo pero todavía no podés tomar vehículos.
      ${perfil.observaciones?"<br>Nota del equipo: "+perfil.observaciones:""}</div>`:""}

    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px">
      <div><h2 class="sec">Catálogo de vehículos</h2>
        <p class="sub" style="margin:0">Nivel <b style="color:${a.color}">${a.nombre}</b> · ${a.detalle}</p></div>
      <div style="display:flex;gap:9px;align-items:center">
        <span class="pill ${i>=e?"p-red":"p-blue"}" style="padding:8px 16px;font-size:.8rem">Cupo ${i}/${e}</span>
        <button class="btn btn-o btn-sm" onclick="comprarCupo()">+ Cupo extra</button>
      </div>
    </div>

    <div class="filters">
      <input placeholder="Buscar marca, modelo o zona…" value="${filtro.texto}" oninput="filtro.texto=this.value;render()">
      <select onchange="filtro.gama=this.value;render()">
        <option value="">Todas las gamas</option>
        <option value="baja" ${filtro.gama==="baja"?"selected":""}>Gama baja</option>
        <option value="media" ${filtro.gama==="media"?"selected":""}>Gama media</option>
        <option value="alta" ${filtro.gama==="alta"?"selected":""}>Gama alta</option>
      </select>
      <select onchange="filtro.orden=this.value;render()">
        <option value="reciente">Más recientes</option>
        <option value="precio-desc" ${filtro.orden==="precio-desc"?"selected":""}>Mayor comisión</option>
        <option value="precio-asc" ${filtro.orden==="precio-asc"?"selected":""}>Menor precio</option>
      </select>
    </div>

    ${s.length===0?'<div class="empty"><div class="ic">🔍</div>No hay vehículos que coincidan</div>':`<div class="grid">${s.map(o=>{const n=c.includes(o.id),t=n?{ok:!1,codigo:"tengo"}:puedeTomar(perfil,penas,asigs,o);return`<div class="vcard ${!t.ok&&!n?"locked":""}">
        <div class="vimg">${o.icono||"🚗"}
          <span class="pill gama ${o.gama==="alta"?"p-amber":o.gama==="media"?"p-blue":"p-gray"}">${GAMA_LABEL[o.gama]}</span>
          ${o.estado==="reservado"?'<span class="pill est p-amber">Reservado</span>':""}</div>
        <div class="vbody">
          <div class="vtitle">${o.marca} ${o.modelo}</div>
          <div class="vmeta">${o.anio||""} · ${fmtNum(o.km)} km · ${o.ubicacion||""}</div>
          <div class="vprice">${fmtUSD(o.precio)}</div>
          <div class="vcom">Tu comisión: ${fmtUSD(Math.round(o.precio*.02))}</div>
          <div class="vspecs"><span class="spec">${o.combustible||"—"}</span><span class="spec">${o.transmision||"—"}</span><span class="spec">${o.color||"—"}</span></div>
          ${n?`<button class="btn btn-o btn-block btn-sm" onclick="ir('panel')">Ya lo estás vendiendo →</button>`:`<button class="btn btn-block btn-sm" onclick="verVehiculo(${o.id})">Ver detalle</button>`}
        </div>
        ${!t.ok&&!n?`<div class="lock-ov"><div>
          <div class="ic">${t.codigo==="cupo"||t.codigo==="tope-gama"?"⛔":t.codigo==="penalizacion"?"⏳":t.codigo==="no-verificado"?"⏱":"🔒"}</div>
          <b>${t.codigo==="cupo"?"Cupo completo":t.codigo==="tope-gama"?"Tope de gama alcanzado":t.codigo==="penalizacion"?"Cupo reducido":t.codigo==="no-verificado"?"Cuenta sin verificar":"Requiere nivel superior"}</b>
          <small>${t.motivo}</small>
          ${t.codigo==="cupo"||t.codigo==="penalizacion"?`<button class="btn btn-sm" style="margin-top:11px" onclick="comprarCupo()">Comprar cupo · ${fmtUSD(PRECIO_CUPO_EXTRA)}</button>`:""}
        </div></div>`:""}
      </div>`}).join("")}</div>`}
  </div>`}function verVehiculo(a){const e=vehiculos.find(o=>o.id===a),i=puedeTomar(perfil,penas,asigs,e),c=[e.doc_dominio,e.doc_patentes,e.doc_vtv,e.doc_policial,e.doc_mandato].filter(Boolean).length;modal(`${e.marca} ${e.modelo}`,`
    <div style="text-align:center;font-size:4rem;background:linear-gradient(135deg,#EDF3FB,#DCE9FA);border-radius:12px;padding:24px;margin-bottom:20px">${e.icono||"🚗"}</div>
    <div class="detail-row"><span>Precio de venta</span><span>${fmtUSD(e.precio)}</span></div>
    <div class="detail-row"><span>Tu comisión (2%)</span><span style="color:var(--green)">${fmtUSD(Math.round(e.precio*.02))}</span></div>
    <div class="detail-row"><span>Gama</span><span>${GAMA_LABEL[e.gama]}</span></div>
    <div class="detail-row"><span>Año / Kilometraje</span><span>${e.anio||"—"} · ${fmtNum(e.km)} km</span></div>
    <div class="detail-row"><span>Combustible / Caja</span><span>${e.combustible||"—"} · ${e.transmision||"—"}</span></div>
    <div class="detail-row"><span>Color</span><span>${e.color||"—"}</span></div>
    <div class="detail-row"><span>Ubicación</span><span>${e.ubicacion||"—"}</span></div>
    <div class="detail-row"><span>Documentación</span><span>${c===5?'<span class="pill p-green">Completa</span>':'<span class="pill p-amber">'+c+" de 5</span>"}</span></div>
    ${i.ok?'<div class="note g" style="margin-top:18px">Al tomarlo se genera tu <b>código único de vendedor</b>. Se lo pasás a tu comprador al señar para que la operación quede registrada a tu nombre.</div>':`<div class="note r" style="margin-top:18px"><b>No podés tomar este vehículo.</b><br>${i.motivo}</div>`}
  `,[{txt:"Cerrar",clase:"btn-o",fn:"cerrarModal()"},...i.ok?[{txt:"Tomar este vehículo",clase:"",fn:`tomarVehiculo(${e.id})`}]:i.codigo==="cupo"||i.codigo==="penalizacion"?[{txt:"Comprar cupo extra",clase:"",fn:"cerrarModal();comprarCupo()"}]:[]])}async function tomarVehiculo(a){cerrarModal(),cargando(!0,"Tomando el vehículo…");const e=nuevoHash(),{error:i}=await sb.from("asignaciones").insert({vehiculo_id:a,usuario_id:perfil.id,hash:e});if(i)return cargando(!1),toast(mensajeError(i),"error");await cargarTodo(),cargando(!1),tabPanel="activos",vista="panel",render(),toast("Vehículo tomado — tu código es <b>"+e+"</b>","ok")}function comprarCupo(){if(perfil.estado_verificacion!=="aprobado")return toast("Necesitás tener la cuenta verificada para comprar cupos","error");const a=cupoEfectivo(perfil,penas),e=penalizacionesActivas(penas);modal("Comprar cupo adicional",`
    <div class="detail-row"><span>Cupo incluido</span><span>${CUPO_BASE} vehículos</span></div>
    <div class="detail-row"><span>Cupos extra comprados</span><span>+${perfil.slots_extra||0}</span></div>
    ${e.length?`<div class="detail-row"><span>Penalizaciones activas</span><span style="color:var(--red)">−${e.length}</span></div>`:""}
    <div class="detail-row"><span><b>Cupo actual</b></span><span style="font-size:1.05rem">${a} · usás ${asigs.length}</span></div>
    <div class="detail-row"><span><b>Cupo después de la compra</b></span><span style="color:var(--green);font-size:1.05rem">${a+1}</span></div>
    <div class="note" style="margin-top:18px"><b>Precio: ${fmtUSD(PRECIO_CUPO_EXTRA)}</b> por un vehículo adicional en simultáneo.<br>
      El cupo extra es permanente y sirve para compensar penalizaciones.</div>
    <div class="fld" style="margin-top:16px"><label>Método de pago</label>
      <select id="cpMetodo"><option>Transferencia bancaria</option><option>Mercado Pago</option><option>Descuento de próxima comisión</option></select></div>
  `,[{txt:"Cancelar",clase:"btn-o",fn:"cerrarModal()"},{txt:`Comprar por ${fmtUSD(PRECIO_CUPO_EXTRA)}`,clase:"btn-green",fn:"confirmarCupo()"}])}async function confirmarCupo(){const a=$("cpMetodo").value;cerrarModal(),cargando(!0,"Acreditando el cupo…");const{data:e,error:i}=await sb.rpc("comprar_cupo",{p_metodo:a});if(i)return cargando(!1),toast(mensajeError(i),"error");await cargarSesion(),await cargarTodo(),cargando(!1),render(),toast("Cupo acreditado. Ahora podés tener <b>"+e+"</b> vehículos en simultáneo.","ok")}function vPanel(){if(!perfil)return vLogin();const a=NIVELES[perfil.nivel],e=cupoEfectivo(perfil,penas),i=penalizacionesActivas(penas),s=conteoPorGama(asigs);let c=100,o="Nivel máximo alcanzado";return perfil.nivel==="BRONCE"?(c=Math.min(100,Math.max(perfil.ventas/3,perfil.capital/45e3)*100),o=`${perfil.ventas}/3 ventas hacia Plata`):perfil.nivel==="PLATA"&&(c=Math.min(100,Math.max(perfil.ventas/8,perfil.capital/18e4)*100),o=`${perfil.ventas}/8 ventas hacia Oro`),`<div class="wrap">
    ${perfil.estado_verificacion==="pendiente"?`<div class="note w" style="margin-bottom:20px">
      <b>⏱ Tu cuenta está pendiente de verificación.</b> Estamos revisando tu constancia de ${(perfil.condicion_fiscal||"").toLowerCase()}.
      Te avisamos apenas esté aprobada. Mientras tanto podés explorar el catálogo.</div>`:""}
    ${perfil.estado_verificacion==="rechazado"?`<div class="note r" style="margin-bottom:20px">
      <b>✕ Tu solicitud fue rechazada.</b> ${perfil.observaciones||"Revisá la documentación cargada."}</div>`:""}
    ${perfil.estado_verificacion==="observado"?`<div class="note w" style="margin-bottom:20px">
      <b>⚠ Tu cuenta tiene observaciones.</b> ${perfil.observaciones||""}</div>`:""}

    <div class="dash-head">
      <div><h2>Hola, ${perfil.nombre}</h2>
        <div class="em">Comisionista desde ${fmtFecha(perfil.creado_en)} · CUIT ${perfil.cuit||"—"}</div></div>
      <div class="lvl-box">
        <div class="nm" style="color:${perfil.nivel==="ORO"?"#FDE68A":perfil.nivel==="PLATA"?"#E2E8F0":"#FCD34D"}">${a.emoji} ${a.nombre}</div>
        <div class="ds">${a.desc}</div>
        <div class="prog"><i style="width:${c}%"></i></div>
        <div class="ds" style="margin-top:6px">${o}</div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="lb">Ganancia acumulada</div><div class="vl">${fmtUSD(perfil.ganancia)}</div><div class="df">Desde tu alta</div></div>
      <div class="kpi"><div class="lb">Ventas concretadas</div><div class="vl">${perfil.ventas}</div><div class="df">${fmtUSD(perfil.capital)} en volumen</div></div>
      <div class="kpi"><div class="lb">Cupo en uso</div><div class="vl">${asigs.length}/${e}</div>
        <div class="df ${i.length?"a":""}">${i.length?i.length+" penalización activa":"Cupo completo disponible"}</div></div>
      <div class="kpi"><div class="lb">Visitas agendadas</div><div class="vl">${visitas.filter(n=>n.estado!=="realizada"&&n.estado!=="cancelada").length}</div><div class="df">Próximos días</div></div>
    </div>

    <div class="cupo">
      <div class="cupo-top">
        <div><h4>Tus cupos de venta</h4>
          <div class="mini">${CUPO_BASE} incluidos${perfil.slots_extra?` + ${perfil.slots_extra} comprado${perfil.slots_extra>1?"s":""}`:""}${i.length?` − ${i.length} penalizado${i.length>1?"s":""}`:""} = <b>${e} disponibles</b></div></div>
        <button class="btn btn-o btn-sm" onclick="comprarCupo()">+ Comprar cupo · ${fmtUSD(PRECIO_CUPO_EXTRA)}</button>
      </div>
      <div class="slots">
        ${Array.from({length:Math.max(e,asigs.length)+i.length},(n,t)=>{if(t<asigs.length){const l=asigs[t].vehiculos;return`<div class="slot full" title="${l?l.marca+" "+l.modelo:""}">${l&&l.icono||"🚗"}</div>`}return t<e?`<div class="slot ${t>=CUPO_BASE?"extra":""}" title="Cupo libre">+</div>`:'<div class="slot block" title="Bloqueado por penalización">✕</div>'}).join("")}
      </div>
      ${i.length?`<div class="note w" style="margin-top:14px"><b>Cupo reducido.</b>
        ${i.map(n=>`Liberaste un vehículo el ${fmtFecha(n.fecha)} — se restablece el ${fmtFecha(n.hasta)}`).join("<br>")}</div>`:""}
      <div class="gama-count">
        <div class="gc"><b>${s.baja}</b><span>Gama baja · sin tope</span></div>
        <div class="gc"><b>${s.media}${a.topes.media<99?"/"+a.topes.media:""}</b><span>Gama media · ${a.topes.media===0?"no habilitada":a.topes.media<99?"máx "+a.topes.media:"sin tope"}</span></div>
        <div class="gc"><b>${s.alta}${a.topes.alta<99?"/"+a.topes.alta:""}</b><span>Gama alta · ${a.topes.alta===0?"no habilitada":"máx "+a.topes.alta}</span></div>
      </div>
    </div>

    <div class="tabs">
      <button class="${tabPanel==="activos"?"on":""}" onclick="tabPanel='activos';render()">Vehículos activos (${asigs.length})</button>
      <button class="${tabPanel==="historial"?"on":""}" onclick="tabPanel='historial';render()">Historial de ventas (${operaciones.length})</button>
      <button class="${tabPanel==="visitas"?"on":""}" onclick="tabPanel='visitas';render()">Visitas (${visitas.length})</button>
      <button class="${tabPanel==="cuenta"?"on":""}" onclick="tabPanel='cuenta';render()">Mi cuenta</button>
    </div>
    ${tabPanel==="activos"?tablaActivos():tabPanel==="historial"?tablaHistorial():tabPanel==="visitas"?tablaVisitas():tablaCuenta()}
  </div>`}function tablaActivos(){return asigs.length?`<table><thead><tr>
    <th>Vehículo</th><th>Gama</th><th>Precio</th><th>Tu comisión</th><th>Tu código</th><th>Estado</th><th>Acciones</th>
  </tr></thead><tbody>${asigs.map(a=>{const e=a.vehiculos;return e?`<tr>
      <td><b>${e.icono||"🚗"} ${e.marca} ${e.modelo}</b><div class="mini">${e.anio||""} · ${e.ubicacion||""} · desde ${fmtFecha(a.fecha)}</div></td>
      <td><span class="pill ${e.gama==="alta"?"p-amber":e.gama==="media"?"p-blue":"p-gray"}">${GAMA_LABEL[e.gama]}</span></td>
      <td><b>${fmtUSD(e.precio)}</b></td>
      <td style="color:var(--green);font-weight:800">${fmtUSD(Math.round(e.precio*.02))}</td>
      <td><span class="hash">${a.hash}<button onclick="copiar('${a.hash}')">copiar</button></span></td>
      <td><span class="pill ${a.estado==="reservado"?"p-amber":"p-green"}">${a.estado==="reservado"?"Reservado":"Activo"}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-o btn-sm" onclick="pedirVisita(${e.id})">Visita</button>
        <button class="btn btn-o btn-sm" onclick="confirmarLiberar(${a.id})" style="color:var(--red);border-color:#FECACA">Liberar</button>
      </td></tr>`:""}).join("")}</tbody></table>`:`<div class="empty"><div class="ic">🚘</div>
    <b style="display:block;margin-bottom:6px;color:var(--ink)">Todavía no tomaste ningún vehículo</b>
    <div style="margin-bottom:16px">Entrá al catálogo y elegí uno para empezar</div>
    <button class="btn" onclick="ir('catalogo')">Ver catálogo</button></div>`}function tablaHistorial(){if(!operaciones.length)return'<div class="empty"><div class="ic">📄</div>Todavía no cerraste ninguna venta</div>';const a=operaciones.reduce((e,i)=>e+Number(i.com_vendedor),0);return`<table><thead><tr><th>Vehículo</th><th>Comprador</th><th>Fecha</th><th>Precio</th><th>Tu comisión</th><th>Código</th></tr></thead>
    <tbody>${operaciones.map(e=>`<tr>
      <td><b>${e.vehiculo_desc}</b></td><td>${e.comprador||"—"}</td><td>${fmtFecha(e.fecha)}</td>
      <td>${fmtUSD(e.precio)}</td><td style="color:var(--green);font-weight:800">${fmtUSD(e.com_vendedor)}</td>
      <td><span class="hash" style="font-size:.74rem">${e.hash||"—"}</span></td></tr>`).join("")}
    <tr style="background:var(--blue-l)"><td colspan="4" style="text-align:right;font-weight:800">Total ganado</td>
      <td style="color:var(--green);font-weight:800;font-size:1rem">${fmtUSD(a)}</td><td></td></tr></tbody></table>`}function tablaVisitas(){return visitas.length?`<table><thead><tr><th>Vehículo</th><th>Tipo</th><th>Fecha y hora</th><th>Estado</th><th>Nota</th></tr></thead>
    <tbody>${visitas.map(a=>{const e=a.vehiculos;return`<tr><td><b>${e?(e.icono||"🚗")+" "+e.marca+" "+e.modelo:"—"}</b></td>
      <td><span class="pill ${a.tipo==="fotos"?"p-blue":"p-pur"}">${a.tipo==="fotos"?"📷 Fotos":"👤 Con interesado"}</span></td>
      <td>${fmtFecha(a.fecha)} · ${a.hora||""}</td>
      <td><span class="pill ${a.estado==="confirmada"?"p-green":a.estado==="pendiente"?"p-amber":"p-gray"}">${a.estado}</span></td>
      <td class="mini">${a.nota||"—"}</td></tr>`}).join("")}</tbody></table>`:`<div class="empty"><div class="ic">📅</div>
    <b style="display:block;margin-bottom:6px;color:var(--ink)">No tenés visitas agendadas</b>
    <div>Pedí una visita desde tus vehículos activos</div></div>`}function tablaCuenta(){const a=perfil;return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div class="card" style="padding:22px">
      <h4 style="font-size:.98rem;font-weight:800;color:var(--navy);margin-bottom:14px">Datos personales</h4>
      <div class="detail-row"><span>Nombre completo</span><span>${a.nombre} ${a.apellido}</span></div>
      <div class="detail-row"><span>DNI</span><span>${a.dni}</span></div>
      <div class="detail-row"><span>Nacimiento</span><span>${fmtFecha(a.nacimiento)}</span></div>
      <div class="detail-row"><span>Teléfono</span><span>${a.tel||"—"}</span></div>
      <div class="detail-row"><span>Ubicación</span><span>${a.localidad||""}, ${a.provincia||""}</span></div>
      <div class="detail-row"><span>Domicilio</span><span>${a.domicilio||"—"}</span></div>
    </div>
    <div class="card" style="padding:22px">
      <h4 style="font-size:.98rem;font-weight:800;color:var(--navy);margin-bottom:14px">Situación fiscal</h4>
      <div class="detail-row"><span>Estado de la cuenta</span>
        <span><span class="pill ${a.estado_verificacion==="aprobado"?"p-green":a.estado_verificacion==="pendiente"?"p-amber":"p-red"}">${VERIF_LABEL[a.estado_verificacion]}</span></span></div>
      <div class="detail-row"><span>Condición</span><span>${a.condicion_fiscal||"—"}</span></div>
      <div class="detail-row"><span>CUIT</span><span>${a.cuit||"—"}</span></div>
      ${a.categoria_mono?`<div class="detail-row"><span>Categoría monotributo</span><span>${a.categoria_mono}</span></div>`:""}
      <div class="detail-row"><span>Inscripción</span><span>${fmtFecha(a.fecha_inscripcion)}</span></div>
      <div class="detail-row"><span>Constancia</span><span>${a.constancia_path?'<span class="pill p-green">✓ Cargada</span>':'<span class="pill p-red">Sin cargar</span>'}</span></div>
    </div>
    <div class="card" style="padding:22px">
      <h4 style="font-size:.98rem;font-weight:800;color:var(--navy);margin-bottom:14px">Datos de cobro</h4>
      <div class="detail-row"><span>CBU / CVU</span><span style="font-family:Consolas,monospace;font-size:.8rem">${a.cbu||"—"}</span></div>
      <div class="detail-row"><span>Alias</span><span>${a.alias_cbu||"—"}</span></div>
      <div class="detail-row"><span>Banco</span><span>${a.banco||"—"}</span></div>
    </div>
    <div class="card" style="padding:22px">
      <h4 style="font-size:.98rem;font-weight:800;color:var(--navy);margin-bottom:14px">Cupos comprados</h4>
      ${pagos.length?pagos.map(e=>`<div class="detail-row"><span>${fmtFecha(e.fecha)} · ${e.metodo||""}</span>
        <span>${fmtUSD(e.monto)} <span class="pill p-green">${e.estado}</span></span></div>`).join(""):'<div class="mini">Todavía no compraste cupos adicionales</div>'}
      <button class="btn btn-o btn-sm btn-block" style="margin-top:14px" onclick="comprarCupo()">+ Comprar cupo · ${fmtUSD(PRECIO_CUPO_EXTRA)}</button>
    </div>
  </div>`}function pedirVisita(a){const e=vehiculos.find(s=>s.id===a)||(asigs.find(s=>s.vehiculo_id===a)||{}).vehiculos,i=new Date;i.setDate(i.getDate()+2),modal("Solicitar visita — "+e.marca+" "+e.modelo,`
    <div class="fld"><label>Tipo de visita</label>
      <select id="vsTipo">
        <option value="fotos">📷 Solo para sacar fotos del vehículo</option>
        <option value="interesado">👤 Con un comprador interesado</option>
      </select></div>
    <div class="row2">
      <div class="fld"><label>Fecha</label><input id="vsFecha" type="date" value="${i.toISOString().slice(0,10)}"></div>
      <div class="fld"><label>Hora</label><input id="vsHora" type="time" value="15:00"></div>
    </div>
    <div class="fld"><label>Nota para el equipo (opcional)</label>
      <textarea id="vsNota" rows="3" placeholder="Ej: el comprador viene con mecánico propio"></textarea></div>
    <div class="note">La visita queda pendiente hasta que el equipo la confirme con el propietario.</div>
  `,[{txt:"Cancelar",clase:"btn-o",fn:"cerrarModal()"},{txt:"Solicitar",clase:"",fn:`confirmarVisita(${a})`}])}async function confirmarVisita(a){const e=$("vsTipo").value,i=$("vsFecha").value,s=$("vsHora").value,c=$("vsNota").value.trim();cerrarModal(),cargando(!0,"Enviando solicitud…");const{error:o}=await sb.from("visitas").insert({vehiculo_id:a,usuario_id:perfil.id,tipo:e,fecha:i,hora:s,nota:c});if(o)return cargando(!1),toast(mensajeError(o),"error");await cargarTodo(),cargando(!1),tabPanel="visitas",render(),toast("Visita solicitada — el equipo la va a confirmar","ok")}function confirmarLiberar(a){const e=asigs.find(o=>o.id===a),i=e.vehiculos;if(e.estado==="reservado")return toast("No podés liberar un vehículo con seña activa","error");const s=cupoEfectivo(perfil,penas),c=new Date;c.setDate(c.getDate()+DIAS_PENALIZACION),modal("Liberar vehículo",`
    <div class="note r" style="margin-bottom:18px"><b>Atención: esto tiene una penalización.</b><br>
      Si liberás este vehículo, tu cupo baja de ${s} a ${s-1} vehículos simultáneos durante ${DIAS_PENALIZACION} días.</div>
    <div class="detail-row"><span>Vehículo a liberar</span><span>${i.icono||"🚗"} ${i.marca} ${i.modelo}</span></div>
    <div class="detail-row"><span>Lo tomaste el</span><span>${fmtFecha(e.fecha)}</span></div>
    <div class="detail-row"><span>Tu cupo actual</span><span>${s} vehículos</span></div>
    <div class="detail-row"><span>Cupo durante la penalización</span><span style="color:var(--red)">${s-1} vehículos</span></div>
    <div class="detail-row"><span>Se restablece el</span><span>${fmtFecha(c.toISOString().slice(0,10))}</span></div>
    <div class="note" style="margin-top:18px">Podés compensar la penalización comprando un cupo extra por ${fmtUSD(PRECIO_CUPO_EXTRA)}.</div>
  `,[{txt:"No, cancelar",clase:"btn-o",fn:"cerrarModal()"},{txt:"Sí, liberar y aceptar penalización",clase:"btn-red",fn:`liberar(${a})`}])}async function liberar(a){cerrarModal(),cargando(!0,"Liberando…");const{error:e}=await sb.from("asignaciones").delete().eq("id",a);if(e)return cargando(!1),toast(mensajeError(e),"error");await cargarSesion(),await cargarTodo(),cargando(!1),render(),toast("Vehículo liberado. Tu cupo queda en <b>"+cupoEfectivo(perfil,penas)+"</b> por "+DIAS_PENALIZACION+" días.","ok")}function render(){renderNav();const a={landing:vLanding,login:vLogin,registro:vRegistro,catalogo:vCatalogo,panel:vPanel,reglas:vReglas};$("app").innerHTML=(a[vista]||vLanding)()}(async function(){await cargarSesion(),await cargarTodo(),perfil&&(vista="panel"),render()})();

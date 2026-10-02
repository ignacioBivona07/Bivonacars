let sesion=null,perfil=null,seccion="resumen",charts={},D={perfiles:[],vehiculos:[],asignaciones:[],visitas:[],operaciones:[],penalizaciones:[],pagos:[],facturas:[],impuestos:[],costos:[],marketing:[]},fCat={texto:"",estado:""};const MENU=[{grupo:"Operación",items:[{id:"resumen",ic:"▦",txt:"Resumen"},{id:"catalogo",ic:"🚘",txt:"Catálogo",cnt:()=>0},{id:"verificar",ic:"🛡",txt:"Verificaciones",cnt:()=>D.perfiles.filter(i=>i.estado_verificacion==="pendiente").length},{id:"vendedores",ic:"👥",txt:"Comisionistas",cnt:()=>0},{id:"visitas",ic:"📅",txt:"Visitas",cnt:()=>D.visitas.filter(i=>i.estado==="pendiente").length},{id:"docs",ic:"📋",txt:"Documentación",cnt:()=>0},{id:"historial",ic:"🗂",txt:"Ventas cerradas",cnt:()=>0}]},{grupo:"Análisis",items:[{id:"estadisticas",ic:"📊",txt:"Estadísticas"},{id:"marketing",ic:"📣",txt:"Marketing"},{id:"fiscal",ic:"🧾",txt:"Fiscal"}]},{grupo:"Administración",items:[{id:"publicar",ic:"➕",txt:"Publicar vehículo"}]}],SECCIONES={resumen:{t:"Resumen general",s:"Estado del negocio de un vistazo",f:sResumen,post:chartsResumen},catalogo:{t:"Catálogo de vehículos",s:"Vehículos publicados y su estado",f:sCatalogo},verificar:{t:"Verificaciones",s:"Alta de comisionistas y control fiscal",f:sVerificar},vendedores:{t:"Comisionistas",s:"Red de vendedores, cupos y penalizaciones",f:sVendedores},visitas:{t:"Visitas",s:"Coordinación con propietarios",f:sVisitas},docs:{t:"Documentación",s:"Control de papeles por vehículo y venta",f:sDocs},historial:{t:"Ventas cerradas",s:"Histórico completo de operaciones",f:sHistorial},estadisticas:{t:"Estadísticas",s:"Rentabilidad, costos y proyecciones",f:sEstadisticas,post:chartsEstadisticas},marketing:{t:"Marketing",s:"Rendimiento de canales e inversión",f:sMarketing,post:chartsMarketing},fiscal:{t:"Fiscal",s:"Facturación e impuestos",f:sFiscal},publicar:{t:"Publicar vehículo",s:"Alta de una unidad en el catálogo",f:sPublicar}};function ir(i){seccion=i,render()}async function cargarTodo(){const i=await Promise.all([sb.from("perfiles").select("*").order("creado_en",{ascending:!1}),sb.from("vehiculos").select("*").order("creado_en",{ascending:!1}),sb.from("asignaciones").select("*, vehiculos(*), perfiles(nombre,apellido,tel)"),sb.from("visitas").select("*, vehiculos(marca,modelo,icono,ubicacion), perfiles(nombre,apellido,tel)").order("fecha"),sb.from("operaciones").select("*, perfiles(nombre,apellido)").order("fecha",{ascending:!1}),sb.from("penalizaciones").select("*"),sb.from("pagos_cupo").select("*"),sb.from("facturas").select("*").order("fecha",{ascending:!1}),sb.from("impuestos").select("*").order("vence"),sb.from("costos").select("*"),sb.from("marketing").select("*")]);D={perfiles:i[0].data||[],vehiculos:i[1].data||[],asignaciones:i[2].data||[],visitas:i[3].data||[],operaciones:i[4].data||[],penalizaciones:i[5].data||[],pagos:i[6].data||[],facturas:i[7].data||[],impuestos:i[8].data||[],costos:i[9].data||[],marketing:i[10].data||[]}}const penasDe=i=>D.penalizaciones.filter(a=>a.usuario_id===i),asigsDe=i=>D.asignaciones.filter(a=>a.usuario_id===i),nombreDe=i=>i?i.nombre+" "+i.apellido:"—";function metricas(){const i=D.operaciones,a=i.reduce((d,l)=>d+Number(l.com_empresa),0),s=i.reduce((d,l)=>d+Number(l.com_vendedor),0),e=i.reduce((d,l)=>d+Number(l.precio),0),n=D.costos.filter(d=>d.tipo==="fijo").reduce((d,l)=>d+Number(l.monto),0),t=D.costos.filter(d=>d.tipo==="variable").reduce((d,l)=>d+Number(l.monto),0),c=D.vehiculos.reduce((d,l)=>d+Number(l.precio),0),o=D.marketing.reduce((d,l)=>d+Number(l.inversion),0),r=D.marketing.reduce((d,l)=>d+Number(l.retorno),0),p=D.pagos.reduce((d,l)=>d+Number(l.monto),0);return{ingresos:a,pagado:s,volumen:e,cf:n,cv:t,stock:c,invMkt:o,retMkt:r,cupos:p,total:a+p,resultado:a+p-n-t,margen:a+p?(a+p-n-t)/(a+p)*100:0,ticket:i.length?e/i.length:0,roas:o?r/o:0}}function serieMensual(){const i=[],a=[],s=new Date;for(let o=7;o>=0;o--){const r=new Date(s.getFullYear(),s.getMonth()-o,1);a.push(r.toISOString().slice(0,7)),i.push(r.toLocaleDateString("es-AR",{month:"short"}))}const e=a.map(o=>D.operaciones.filter(r=>String(r.fecha).slice(0,7)===o).length),n=a.map(o=>D.operaciones.filter(r=>String(r.fecha).slice(0,7)===o).reduce((r,p)=>r+Number(p.com_empresa),0)),t=metricas(),c=a.map(()=>Math.round(t.cf+t.cv));return{meses:i,ops:e,ing:n,cos:c}}function destruirCharts(){Object.values(charts).forEach(i=>{try{i.destroy()}catch{}}),charts={}}function sResumen(){const i=metricas(),a=D.visitas.filter(o=>o.estado==="pendiente"),s=D.perfiles.filter(o=>o.estado_verificacion==="pendiente"),e=D.vehiculos.filter(o=>!(o.doc_dominio&&o.doc_patentes&&o.doc_vtv&&o.doc_policial&&o.doc_mandato)),n=D.impuestos.filter(o=>o.estado==="pendiente"),t=D.perfiles.slice().sort((o,r)=>r.ganancia-o.ganancia).slice(0,5),c=a.length+s.length+e.length+n.length;return`
  <div class="kpis">
    <div class="kpi g"><div class="lb">Ingresos acumulados</div><div class="vl">${fmtUSD(i.total)}</div>
      <div class="df">Comisiones ${fmtUSD(i.ingresos)} + cupos ${fmtUSD(i.cupos)}</div></div>
    <div class="kpi"><div class="lb">Volumen operado</div><div class="vl">${fmtUSD(i.volumen)}</div>
      <div class="df">${D.operaciones.length} ventas · ticket ${fmtUSD(Math.round(i.ticket))}</div></div>
    <div class="kpi a"><div class="lb">Valor en catálogo</div><div class="vl">${fmtUSD(i.stock)}</div>
      <div class="df">${D.vehiculos.length} vehículos activos</div></div>
    <div class="kpi p"><div class="lb">Resultado neto</div><div class="vl">${fmtUSD(i.resultado)}</div>
      <div class="df ${i.resultado<0?"n":""}">Margen ${i.margen.toFixed(1)}%</div></div>
  </div>

  ${c?`<div class="card" style="margin-bottom:20px">
    <div class="card-h"><h3>⚠ Requiere tu atención</h3><span class="hint">${c} pendientes</span></div>
    <div class="card-b" style="display:grid;gap:10px">
      ${s.length?`<div class="note w"><b>${s.length} solicitud${s.length>1?"es":""} de alta sin verificar</b> — hay personas esperando poder operar.
        <a onclick="ir('verificar')" style="cursor:pointer;font-weight:800">Revisar →</a></div>`:""}
      ${a.length?`<div class="note w"><b>${a.length} visita${a.length>1?"s":""} sin confirmar</b> — hay comisionistas esperando respuesta.
        <a onclick="ir('visitas')" style="cursor:pointer;font-weight:800">Ver visitas →</a></div>`:""}
      ${e.length?`<div class="note w"><b>${e.length} vehículo${e.length>1?"s":""} con documentación incompleta</b> — no deberían publicarse así.
        <a onclick="ir('docs')" style="cursor:pointer;font-weight:800">Revisar →</a></div>`:""}
      ${n.length?`<div class="note w"><b>${n.length} obligación${n.length>1?"es":""} fiscal${n.length>1?"es":""} por vencer</b> — ${fmtARS(n.reduce((o,r)=>o+Number(r.monto),0))} en total.
        <a onclick="ir('fiscal')" style="cursor:pointer;font-weight:800">Ver fiscal →</a></div>`:""}
    </div></div>`:'<div class="note g" style="margin-bottom:20px"><b>✓ Todo al día.</b> No hay pendientes que requieran tu atención.</div>'}

  <div class="grid2" style="margin-bottom:20px">
    <div class="card"><div class="card-h"><h3>Ingresos y costos por mes</h3><span class="hint">USD</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chIng"></canvas></div></div></div>
    <div class="card"><div class="card-h"><h3>Operaciones cerradas</h3><span class="hint">Unidades</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chOps"></canvas></div></div></div>
  </div>

  <div class="grid2">
    <div class="card"><div class="card-h"><h3>Top comisionistas</h3><span class="hint">Por comisión ganada</span></div>
      <div class="card-b">${t.length?t.map((o,r)=>`<div class="rank">
        <div class="pos" style="${r===0?"background:#A16207":r===1?"background:#64748B":""}">${r+1}</div>
        <div class="nm">${nombreDe(o)}<div class="mini">${o.ventas} ventas · ${NIVELES[o.nivel].nombre} · cupo ${asigsDe(o.id).length}/${cupoEfectivo(o,penasDe(o.id))}</div></div>
        <div class="vl">${fmtUSD(o.ganancia)}</div></div>`).join(""):'<div class="mini">Todavía no hay comisionistas registrados</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Últimas operaciones</h3><span class="hint">Cerradas</span></div>
      <div class="card-b" style="padding:0">
        ${D.operaciones.length?`<table><tbody>${D.operaciones.slice(0,5).map(o=>`<tr>
          <td><b>${o.vehiculo_desc}</b><div class="mini">${nombreDe(o.perfiles)} · ${fmtFecha(o.fecha)}</div></td>
          <td style="text-align:right"><b>${fmtUSD(o.precio)}</b><div class="mini" style="color:var(--green)">+${fmtUSD(o.com_empresa)}</div></td>
        </tr>`).join("")}</tbody></table>`:'<div class="card-b mini">Todavía no hay ventas cerradas</div>'}
      </div></div>
  </div>`}function chartsResumen(){const i=serieMensual();charts.ing=new Chart($("chIng"),{type:"bar",data:{labels:i.meses,datasets:[{label:"Ingresos",data:i.ing,backgroundColor:"#1665D8",borderRadius:5},{label:"Costos",data:i.cos,backgroundColor:"#CBD5E1",borderRadius:5}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{boxWidth:11,font:{size:11}}}},scales:{y:{beginAtZero:!0,grid:{color:"#EEF2F7"},ticks:{font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}}),charts.ops=new Chart($("chOps"),{type:"line",data:{labels:i.meses,datasets:[{label:"Operaciones",data:i.ops,borderColor:"#0A2540",backgroundColor:"rgba(22,101,216,.12)",fill:!0,tension:.35,borderWidth:2.5,pointBackgroundColor:"#1665D8",pointRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#EEF2F7"},ticks:{stepSize:1,font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}})}function sCatalogo(){let i=D.vehiculos.slice();if(fCat.estado&&(i=i.filter(a=>a.estado===fCat.estado)),fCat.texto){const a=fCat.texto.toLowerCase();i=i.filter(s=>(s.marca+" "+s.modelo+" "+s.propietario+" "+(s.ubicacion||"")).toLowerCase().includes(a))}return`
  <div class="filters">
    <input placeholder="Buscar vehículo, propietario o zona…" value="${fCat.texto}" oninput="fCat.texto=this.value;render()">
    <select onchange="fCat.estado=this.value;render()">
      <option value="">Todos los estados</option>
      <option value="disponible" ${fCat.estado==="disponible"?"selected":""}>Disponible</option>
      <option value="reservado" ${fCat.estado==="reservado"?"selected":""}>Reservado</option>
      <option value="pausado" ${fCat.estado==="pausado"?"selected":""}>Pausado</option>
    </select>
    <button class="btn" onclick="ir('publicar')">➕ Publicar vehículo</button>
  </div>
  ${i.length===0?'<div class="empty"><div class="ic">🚘</div>No hay vehículos que coincidan</div>':`
  <div class="tbl-wrap"><div class="tbl-scroll"><table>
    <thead><tr><th>Vehículo</th><th>Propietario</th><th>Precio</th><th>Comisiones</th><th>Comisionistas</th><th>Docs</th><th>Estado</th><th></th></tr></thead>
    <tbody>${i.map(a=>{const s=D.asignaciones.filter(t=>t.vehiculo_id===a.id),e=[a.doc_dominio,a.doc_patentes,a.doc_vtv,a.doc_policial,a.doc_mandato],n=e.filter(Boolean).length;return`<tr>
        <td><b>${a.icono||"🚗"} ${a.marca} ${a.modelo}</b><div class="mini">${a.anio||""} · ${fmtNum(a.km)} km · ${a.ubicacion||""}</div>
          <span class="pill ${a.gama==="alta"?"p-amber":a.gama==="media"?"p-blue":"p-gray"}">${GAMA_LABEL[a.gama]}</span></td>
        <td>${a.propietario}<div class="mini">${a.tel_propietario||"—"}</div></td>
        <td><b>${fmtUSD(a.precio)}</b></td>
        <td><div class="mini">Empresa <b style="color:var(--green)">${fmtUSD(Math.round(a.precio*.03))}</b></div>
            <div class="mini">Vendedor <b>${fmtUSD(Math.round(a.precio*.02))}</b></div></td>
        <td>${s.length===0?'<span class="pill p-gray">Sin asignar</span>':s.map(t=>`
          <div style="margin-bottom:3px"><span class="pill p-blue">${t.perfiles?t.perfiles.nombre:"—"}</span> <span class="hash">${t.hash}</span></div>`).join("")}</td>
        <td><div class="docdots">${e.map(t=>`<div class="dot ${t?"ok":"no"}"></div>`).join("")}</div><div class="mini">${n}/5</div></td>
        <td><span class="pill ${a.estado==="disponible"?"p-green":a.estado==="reservado"?"p-amber":"p-gray"}">${ESTADO_LABEL[a.estado]}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-o btn-sm" onclick="verVeh(${a.id})">Ver</button>
          <button class="btn btn-green btn-sm" onclick="cerrarVenta(${a.id})">Cerrar venta</button>
        </td></tr>`}).join("")}
    </tbody></table></div></div>`}`}function verVeh(i){const a=D.vehiculos.find(t=>t.id===i),s=D.asignaciones.filter(t=>t.vehiculo_id===i),e=D.visitas.filter(t=>t.vehiculo_id===i),n={doc_dominio:"Informe de dominio",doc_patentes:"Libre deuda patentes",doc_vtv:"VTV vigente",doc_policial:"Verificación policial",doc_mandato:"Contrato de mandato"};modal(`${a.icono||"🚗"} ${a.marca} ${a.modelo}`,`
    <div class="detail-row"><span>Precio de venta</span><span>${fmtUSD(a.precio)}</span></div>
    <div class="detail-row"><span>Comisión total (5%)</span><span>${fmtUSD(Math.round(a.precio*.05))}</span></div>
    <div class="detail-row"><span>· Para la empresa (3%)</span><span style="color:var(--green)">${fmtUSD(Math.round(a.precio*.03))}</span></div>
    <div class="detail-row"><span>· Para el comisionista (2%)</span><span>${fmtUSD(Math.round(a.precio*.02))}</span></div>
    <div class="detail-row"><span>Propietario</span><span>${a.propietario} · ${a.tel_propietario||"—"}</span></div>
    <div class="detail-row"><span>Ficha técnica</span><span>${a.anio||""} · ${fmtNum(a.km)} km · ${a.combustible||""} · ${a.transmision||""}</span></div>
    <div class="detail-row"><span>Ingreso al catálogo</span><span>${fmtFecha(a.ingreso)}</span></div>
    <h4 style="margin:20px 0 9px;font-size:.9rem;font-weight:800;color:var(--navy)">Documentación</h4>
    ${Object.entries(n).map(([t,c])=>`<div class="detail-row"><span>${c}</span>
      <span class="pill ${a[t]?"p-green":"p-red"}">${a[t]?"✓ Completo":"✗ Falta"}</span></div>`).join("")}
    <h4 style="margin:20px 0 9px;font-size:.9rem;font-weight:800;color:var(--navy)">Comisionistas asignados</h4>
    ${s.length?s.map(t=>`<div class="detail-row"><span>${nombreDe(t.perfiles)} · desde ${fmtFecha(t.fecha)}</span><span class="hash">${t.hash}</span></div>`).join(""):'<div class="mini">Ningún comisionista lo tomó todavía</div>'}
    <h4 style="margin:20px 0 9px;font-size:.9rem;font-weight:800;color:var(--navy)">Visitas</h4>
    ${e.length?e.map(t=>`<div class="detail-row"><span>${fmtFecha(t.fecha)} ${t.hora||""} · ${nombreDe(t.perfiles)}</span>
      <span class="pill ${t.estado==="confirmada"?"p-green":"p-amber"}">${t.tipo==="fotos"?"Fotos":"Interesado"} · ${t.estado}</span></div>`).join(""):'<div class="mini">Sin visitas agendadas</div>'}
  `,[{txt:"Cerrar",clase:"btn-o",fn:"cerrarModal()"},{txt:"Cerrar venta",clase:"btn-green",fn:`cerrarModal();cerrarVenta(${a.id})`}])}function cerrarVenta(i){const a=D.vehiculos.find(e=>e.id===i),s=D.asignaciones.filter(e=>e.vehiculo_id===i);modal("Registrar venta cerrada",`
    <div class="note" style="margin-bottom:18px">Al registrar la venta, el vehículo sale del catálogo, se acredita la comisión al comisionista y se recalcula su nivel automáticamente.</div>
    <div class="detail-row" style="margin-bottom:14px"><span>Vehículo</span><span>${a.icono||"🚗"} ${a.marca} ${a.modelo}</span></div>
    <div class="fld"><label>Comisionista que cerró la venta</label>
      <select id="cvUser">
        ${s.length?s.map(e=>`<option value="${e.usuario_id}|${e.hash}">${nombreDe(e.perfiles)} — código ${e.hash}</option>`).join(""):D.perfiles.map(e=>`<option value="${e.id}|">${nombreDe(e)} (sin código previo)</option>`).join("")}
        <option value="|">Venta directa (sin comisionista)</option>
      </select></div>
    <div class="row2">
      <div class="fld"><label>Precio final de venta (USD)</label><input id="cvPrecio" type="number" value="${a.precio}"></div>
      <div class="fld"><label>Fecha de cierre</label><input id="cvFecha" type="date" value="${hoyISO()}"></div>
    </div>
    <div class="fld"><label>Nombre del comprador</label><input id="cvComprador" placeholder="Nombre y apellido"></div>
  `,[{txt:"Cancelar",clase:"btn-o",fn:"cerrarModal()"},{txt:"Registrar venta",clase:"btn-green",fn:`confirmarVenta(${i})`}])}async function confirmarVenta(i){const[a,s]=$("cvUser").value.split("|"),e=Number($("cvPrecio").value),n=$("cvFecha").value,t=$("cvComprador").value.trim()||"Sin registrar";if(!e)return toast("Ingresá el precio final","error");cerrarModal(),cargando(!0,"Registrando la venta…");const{error:c}=await sb.rpc("cerrar_venta",{p_vehiculo_id:i,p_usuario_id:a||null,p_precio:e,p_comprador:t,p_fecha:n,p_hash:s||nuevoHash()});if(c)return cargando(!1),toast(mensajeError(c),"error");await cargarTodo(),cargando(!1),ir("historial"),toast("Venta registrada — comisión de "+fmtUSD(Math.round(e*.03))+" para la empresa","ok")}function sVerificar(){const i=D.perfiles.filter(s=>s.estado_verificacion==="pendiente"),a=D.perfiles.filter(s=>s.estado_verificacion!=="pendiente");return`
  <div class="kpis">
    <div class="kpi a"><div class="lb">Esperando revisión</div><div class="vl">${i.length}</div><div class="df ${i.length?"n":""}">Requieren tu acción</div></div>
    <div class="kpi g"><div class="lb">Aprobados</div><div class="vl">${D.perfiles.filter(s=>s.estado_verificacion==="aprobado").length}</div><div class="df">Habilitados a operar</div></div>
    <div class="kpi"><div class="lb">Monotributistas</div><div class="vl">${D.perfiles.filter(s=>s.condicion_fiscal==="Monotributista").length}</div><div class="df">Pueden facturar</div></div>
    <div class="kpi p"><div class="lb">Rechazados</div><div class="vl">${D.perfiles.filter(s=>s.estado_verificacion==="rechazado").length}</div><div class="df">No habilitados</div></div>
  </div>
  <div class="note" style="margin-bottom:20px"><b>Qué revisar en cada solicitud.</b> Que el CUIT esté activo en AFIP, que la condición declarada coincida con la constancia, que el titular del CUIT sea la misma persona del DNI, y que el CBU esté a su nombre.</div>

  ${i.length===0?'<div class="empty"><div class="ic">✓</div><b style="display:block;color:var(--ink);margin-bottom:5px">No hay solicitudes pendientes</b><div>Todas las cuentas están revisadas</div></div>':`
  <div class="card" style="margin-bottom:20px">
    <div class="card-h"><h3>Solicitudes pendientes</h3><span class="hint">${i.length} en cola</span></div>
    <div class="card-b" style="padding:0"><table>
      <thead><tr><th>Solicitante</th><th>Condición fiscal</th><th>Documentación</th><th>Cobro</th><th>Alta</th><th></th></tr></thead>
      <tbody>${i.map(s=>{const e=[s.dni_frente_path,s.dni_dorso_path,s.constancia_path].filter(Boolean).length;return`<tr>
          <td><b>${nombreDe(s)}</b><div class="mini">DNI ${s.dni} · ${fmtFecha(s.nacimiento)}</div><div class="mini">${s.tel||""}</div></td>
          <td><span class="pill ${s.condicion_fiscal==="Monotributista"?"p-blue":s.condicion_fiscal==="Responsable Inscripto"?"p-pur":"p-red"}">${s.condicion_fiscal||"—"}</span>
              <div class="mini">${s.cuit||"sin CUIT"}${s.categoria_mono?" · cat. "+s.categoria_mono:""}</div></td>
          <td><span class="pill ${e===3?"p-green":"p-amber"}">${e}/3 archivos</span>
              <div class="mini">${s.constancia_path?"📄 Constancia":"⚠ Sin constancia"}</div>
              <div class="mini">${s.dni_frente_path&&s.dni_dorso_path?"📇 DNI completo":"⚠ DNI incompleto"}</div></td>
          <td class="mini" style="font-family:Consolas,monospace;font-size:.72rem">${s.cbu||"—"}<br>${s.alias_cbu||""}</td>
          <td class="mini">${fmtFecha(s.creado_en)}</td>
          <td><button class="btn btn-sm" onclick="revisarSolicitud('${s.id}')">Revisar</button></td>
        </tr>`}).join("")}</tbody></table></div></div>`}

  <div class="card"><div class="card-h"><h3>Cuentas ya revisadas</h3><span class="hint">${a.length} cuentas</span></div>
    <div class="card-b" style="padding:0">${a.length?`<table>
      <thead><tr><th>Comisionista</th><th>CUIT</th><th>Verificado el</th><th>Estado</th><th></th></tr></thead>
      <tbody>${a.map(s=>`<tr>
        <td><b>${nombreDe(s)}</b><div class="mini">${s.condicion_fiscal||""}</div></td>
        <td class="mini">${s.cuit||"—"}</td><td class="mini">${fmtFecha(s.verificado_el)}</td>
        <td><span class="pill ${s.estado_verificacion==="aprobado"?"p-green":s.estado_verificacion==="observado"?"p-amber":"p-red"}">${VERIF_LABEL[s.estado_verificacion]}</span>
          ${s.observaciones?`<div class="mini">${s.observaciones}</div>`:""}</td>
        <td><button class="btn btn-o btn-sm" onclick="revisarSolicitud('${s.id}')">Revisar</button></td>
      </tr>`).join("")}</tbody></table>`:'<div class="card-b mini">Todavía no hay cuentas revisadas</div>'}</div></div>`}async function revisarSolicitud(i){const a=D.perfiles.find(t=>t.id===i);modal("Revisar solicitud — "+nombreDe(a),`
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin-bottom:9px">Identidad</h4>
    <div class="detail-row"><span>Nombre completo</span><span>${nombreDe(a)}</span></div>
    <div class="detail-row"><span>DNI</span><span>${a.dni}</span></div>
    <div class="detail-row"><span>Nacimiento</span><span>${fmtFecha(a.nacimiento)}</span></div>
    <div class="detail-row"><span>Teléfono</span><span>${a.tel||"—"}</span></div>
    <div class="detail-row"><span>Domicilio</span><span>${a.domicilio||"—"}, ${a.localidad||""}, ${a.provincia||""}</span></div>
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Situación fiscal</h4>
    <div class="detail-row"><span>Condición declarada</span><span>${a.condicion_fiscal||"—"}</span></div>
    <div class="detail-row"><span>CUIT</span><span style="font-family:Consolas,monospace">${a.cuit||"—"}</span></div>
    ${a.categoria_mono?`<div class="detail-row"><span>Categoría monotributo</span><span>${a.categoria_mono}</span></div>`:""}
    <div class="detail-row"><span>Fecha de inscripción</span><span>${fmtFecha(a.fecha_inscripcion)}</span></div>
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Documentos cargados</h4>
    <div id="docsLinks"><div class="mini">Generando enlaces seguros…</div></div>
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Datos de cobro</h4>
    <div class="detail-row"><span>CBU / CVU</span><span style="font-family:Consolas,monospace;font-size:.78rem">${a.cbu||"—"}</span></div>
    <div class="detail-row"><span>Alias · Banco</span><span>${a.alias_cbu||"—"} · ${a.banco||"—"}</span></div>
    <div class="detail-row"><span>¿Es cuenta sueldo?</span><span>${a.cuenta_sueldo===!0?'<b style="color:var(--red)">Sí, lo declaró</b>':a.cuenta_sueldo===!1?"No, lo declaró":"<b>No lo declaró</b> — preguntale"}</span></div>
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Perfil</h4>
    <div class="detail-row"><span>Experiencia</span><span>${a.experiencia||"—"}</span></div>
    <div class="detail-row"><span>Rubro</span><span>${a.rubro||"—"}</span></div>
    <div class="detail-row"><span>Trabajó en concesionaria</span><span>${a.concesionaria==="si"?"Sí":"No"}</span></div>
    ${a.condicion_fiscal==="No inscripto"?'<div class="note w" style="margin-top:16px"><b>No está inscripto en AFIP.</b> No puede emitir factura, así que no debería aprobarse hasta que regularice.</div>':""}
    <div class="fld" style="margin-top:18px"><label>Observaciones (las ve el comisionista)</label>
      <textarea id="vfObs" rows="2" placeholder="Ej: la constancia está vencida, cargá una actualizada">${a.observaciones||""}</textarea></div>
  `,[{txt:"Cerrar",clase:"btn-o",fn:"cerrarModal()"},{txt:"✕ Rechazar",clase:"btn-o",fn:`resolverVerif('${a.id}','rechazado')`},{txt:"⚠ Observar",clase:"btn-o",fn:`resolverVerif('${a.id}','observado')`},{txt:"✓ Aprobar",clase:"btn-green",fn:`resolverVerif('${a.id}','aprobado')`}]);const s=[["constancia_path","📄 Constancia de AFIP"],["dni_frente_path","📇 DNI frente"],["dni_dorso_path","📇 DNI dorso"]],e=[];for(const[t,c]of s){if(!a[t]){e.push(`<div class="detail-row"><span>${c}</span><span class="pill p-red">No cargado</span></div>`);continue}const{data:o}=await sb.storage.from("documentos").createSignedUrl(a[t],3600);e.push(`<div class="detail-row"><span>${c}</span>
      <span>${o&&o.signedUrl?`<a href="${o.signedUrl}" target="_blank" style="font-weight:800">Abrir documento ↗</a>`:'<span class="pill p-amber">No se pudo abrir</span>'}</span></div>`)}const n=$("docsLinks");n&&(n.innerHTML=e.join(""))}async function resolverVerif(i,a){const s=$("vfObs")?$("vfObs").value.trim():"",e=D.perfiles.find(t=>t.id===i);cerrarModal(),cargando(!0,"Guardando…");const{error:n}=await sb.from("perfiles").update({estado_verificacion:a,verificado_el:hoyISO(),observaciones:s||(a==="rechazado"?"La documentación presentada no cumple los requisitos.":null)}).eq("id",i);if(n)return cargando(!1),toast(mensajeError(n),"error");await cargarTodo(),cargando(!1),render(),toast(a==="aprobado"?`${e.nombre} fue habilitado — ya puede tomar vehículos`:a==="observado"?`${e.nombre} quedó con observaciones`:`Solicitud de ${e.nombre} rechazada`,"ok")}function sVendedores(){const i=D.perfiles.slice().sort((s,e)=>e.ganancia-s.ganancia),a=i.filter(s=>penalizacionesActivas(penasDe(s.id)).length).length;return`
  <div class="kpis">
    <div class="kpi"><div class="lb">Comisionistas</div><div class="vl">${i.length}</div>
      <div class="df">${i.filter(s=>s.estado_verificacion==="aprobado").length} verificados</div></div>
    <div class="kpi g"><div class="lb">Comisiones pagadas</div><div class="vl">${fmtUSD(i.reduce((s,e)=>s+Number(e.ganancia),0))}</div><div class="df">Acumulado histórico</div></div>
    <div class="kpi a"><div class="lb">Con penalización</div><div class="vl">${a}</div><div class="df ${a?"n":""}">Cupo reducido</div></div>
    <div class="kpi p"><div class="lb">Cupos extra vendidos</div><div class="vl">${D.pagos.length}</div><div class="df">${fmtUSD(D.pagos.reduce((s,e)=>s+Number(e.monto),0))} facturados</div></div>
  </div>
  ${i.length===0?'<div class="empty"><div class="ic">👥</div>Todavía no hay comisionistas registrados</div>':`
  <div class="tbl-wrap"><div class="tbl-scroll"><table>
    <thead><tr><th>Comisionista</th><th>Fiscal</th><th>Nivel</th><th>Cupo</th><th>Ventas</th><th>Ganancia</th><th>Estado</th><th></th></tr></thead>
    <tbody>${i.map(s=>{const e=penalizacionesActivas(penasDe(s.id)),n=asigsDe(s.id).length,t=cupoEfectivo(s,penasDe(s.id)),c=NIVELES[s.nivel];return`<tr>
        <td><b>${nombreDe(s)}</b><div class="mini">DNI ${s.dni} · ${s.localidad||""}, ${s.provincia||""}</div><div class="mini">${s.tel||""}</div></td>
        <td><span class="pill ${s.condicion_fiscal==="Monotributista"?"p-blue":s.condicion_fiscal==="Responsable Inscripto"?"p-pur":"p-red"}">${s.condicion_fiscal||"—"}</span>
            <div class="mini">${s.cuit||"sin CUIT"}${s.categoria_mono?" · cat. "+s.categoria_mono:""}</div></td>
        <td><span class="pill" style="background:${c.bg};color:${c.color}">${c.emoji} ${c.nombre}</span></td>
        <td><b>${n}/${t}</b><div class="mini">${CUPO_BASE}${s.slots_extra?" +"+s.slots_extra:""}${e.length?" −"+e.length:""}</div>
            ${e.length?'<span class="pill p-red">penalizado</span>':""}</td>
        <td><b>${s.ventas}</b><div class="mini">${fmtUSD(s.capital)}</div></td>
        <td style="color:var(--green);font-weight:800">${fmtUSD(s.ganancia)}</td>
        <td><span class="pill ${s.estado_verificacion==="aprobado"?"p-green":s.estado_verificacion==="pendiente"?"p-amber":"p-red"}">${VERIF_LABEL[s.estado_verificacion]}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-o btn-sm" onclick="revisarSolicitud('${s.id}')">Ficha</button>
          <button class="btn btn-o btn-sm" onclick="gestionCupo('${s.id}')">Cupo</button>
        </td></tr>`}).join("")}
    </tbody></table></div></div>`}`}function gestionCupo(i){const a=D.perfiles.find(c=>c.id===i),s=penalizacionesActivas(penasDe(i)),e=asigsDe(i),n=NIVELES[a.nivel],t=conteoPorGama(e);modal("Cupos — "+nombreDe(a),`
    <div class="detail-row"><span>Cupo base incluido</span><span>${CUPO_BASE} vehículos</span></div>
    <div class="detail-row"><span>Cupos extra comprados</span><span style="color:var(--purple)">+${a.slots_extra||0}</span></div>
    <div class="detail-row"><span>Penalizaciones activas</span><span style="color:${s.length?"var(--red)":"inherit"}">−${s.length}</span></div>
    <div class="detail-row"><span><b>Cupo efectivo</b></span><span style="font-size:1.05rem">${cupoEfectivo(a,penasDe(i))} · usa ${e.length}</span></div>
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Topes por gama — nivel ${n.nombre}</h4>
    <div class="detail-row"><span>Gama baja</span><span>${t.baja} tomados · sin tope</span></div>
    <div class="detail-row"><span>Gama media</span><span>${t.media} tomados · ${n.topes.media===0?"no habilitada":n.topes.media>=99?"sin tope":"máx "+n.topes.media}</span></div>
    <div class="detail-row"><span>Gama alta</span><span>${t.alta} tomados · ${n.topes.alta===0?"no habilitada":"máx "+n.topes.alta}</span></div>
    ${s.length?`<h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Penalizaciones vigentes</h4>
      ${s.map(c=>`<div class="detail-row"><span>${c.motivo||"Liberación"} · ${fmtFecha(c.fecha)}</span><span style="color:var(--red)">hasta ${fmtFecha(c.hasta)}</span></div>`).join("")}`:""}
    <h4 style="font-size:.88rem;font-weight:800;color:var(--navy);margin:18px 0 9px">Compras de cupo</h4>
    ${D.pagos.filter(c=>c.usuario_id===i).map(c=>`<div class="detail-row"><span>${fmtFecha(c.fecha)} · ${c.metodo||""}</span>
      <span>${fmtUSD(c.monto)} <span class="pill p-green">${c.estado}</span></span></div>`).join("")||'<div class="mini">Sin compras registradas</div>'}
  `,[{txt:"Cerrar",clase:"btn-o",fn:"cerrarModal()"},...s.length?[{txt:"Levantar penalización",clase:"btn-o",fn:`levantarPen('${i}')`}]:[],{txt:"+ Otorgar cupo",clase:"btn-green",fn:`otorgarCupo('${i}')`}])}async function otorgarCupo(i){const a=D.perfiles.find(e=>e.id===i);cerrarModal(),cargando(!0,"Otorgando cupo…");const s=(await sb.from("perfiles").update({slots_extra:(a.slots_extra||0)+1}).eq("id",i)).error;if(s)return cargando(!1),toast(mensajeError(s),"error");await sb.from("pagos_cupo").insert({usuario_id:i,monto:PRECIO_CUPO_EXTRA,metodo:"Otorgado desde gestión"}),await cargarTodo(),cargando(!1),render(),toast(`Cupo otorgado a ${a.nombre}`,"ok")}async function levantarPen(i){const a=D.perfiles.find(e=>e.id===i);cerrarModal(),cargando(!0,"Levantando penalizaciones…");const{error:s}=await sb.from("penalizaciones").delete().eq("usuario_id",i).gt("hasta",hoyISO());if(s)return cargando(!1),toast(mensajeError(s),"error");await cargarTodo(),cargando(!1),render(),toast(`Penalizaciones de ${a.nombre} levantadas`,"ok")}

function sVisitas(){const a=D.visitas,t=a.filter(i=>i.estado==="pendiente");return`
  <div class="kpis">
    <div class="kpi a"><div class="lb">Pendientes de confirmar</div><div class="vl">${t.length}</div><div class="df ${t.length?"n":""}">Requieren tu acción</div></div>
    <div class="kpi g"><div class="lb">Confirmadas</div><div class="vl">${a.filter(i=>i.estado==="confirmada").length}</div><div class="df">Agendadas</div></div>
    <div class="kpi"><div class="lb">Con interesado</div><div class="vl">${a.filter(i=>i.tipo==="interesado").length}</div><div class="df">Potencial de cierre</div></div>
    <div class="kpi p"><div class="lb">Sesiones de fotos</div><div class="vl">${a.filter(i=>i.tipo==="fotos").length}</div><div class="df">Para publicaciones</div></div>
  </div>
  ${a.length===0?'<div class="empty"><div class="ic">📅</div>No hay visitas agendadas</div>':`
  <div class="tbl-wrap"><table>
    <thead><tr><th>Fecha y hora</th><th>Vehículo</th><th>Comisionista</th><th>Tipo</th><th>Nota</th><th>Estado</th><th></th></tr></thead>
    <tbody>${a.map(i=>{const o=i.vehiculos;return`<tr>
        <td><b>${fmtFecha(i.fecha)}</b><div class="mini">${i.hora||""} hs</div></td>
        <td>${o?`<b>${o.icono||"🚗"} ${o.marca} ${o.modelo}</b><div class="mini">${o.ubicacion||""}</div>`:"—"}</td>
        <td>${nombreDe(i.perfiles)}<div class="mini">${i.perfiles&&i.perfiles.tel||""}</div></td>
        <td><span class="pill ${i.tipo==="fotos"?"p-blue":"p-pur"}">${i.tipo==="fotos"?"📷 Fotos":"👤 Interesado"}</span></td>
        <td class="mini" style="max-width:200px">${i.nota||"—"}</td>
        <td><span class="pill ${i.estado==="confirmada"?"p-green":i.estado==="pendiente"?"p-amber":"p-gray"}">${i.estado}</span></td>
        <td style="white-space:nowrap">
          ${i.estado==="pendiente"?`<button class="btn btn-green btn-sm" onclick="estadoVisita(${i.id},'confirmada')">Confirmar</button>`:""}
          ${i.estado==="confirmada"?`<button class="btn btn-o btn-sm" onclick="estadoVisita(${i.id},'realizada')">Realizada</button>`:""}
          <button class="btn btn-o btn-sm" onclick="borrarVisita(${i.id})" style="color:var(--red);border-color:#FECACA">✕</button>
        </td></tr>`}).join("")}
    </tbody></table></div>`}`}async function estadoVisita(a,t){cargando(!0,"Actualizando…");const{error:i}=await sb.from("visitas").update({estado:t}).eq("id",a);if(i)return cargando(!1),toast(mensajeError(i),"error");await cargarTodo(),cargando(!1),render(),toast(t==="confirmada"?"Visita confirmada — el comisionista ya la ve en su panel":"Visita marcada como realizada","ok")}async function borrarVisita(a){cargando(!0,"Cancelando…");const{error:t}=await sb.from("visitas").delete().eq("id",a);if(t)return cargando(!1),toast(mensajeError(t),"error");await cargarTodo(),cargando(!1),render(),toast("Visita cancelada","ok")}function sDocs(){const a={doc_dominio:"Informe dominio",doc_patentes:"Libre deuda",doc_vtv:"VTV",doc_policial:"Verif. policial",doc_mandato:"Mandato"},t={doc_mandato:"Mandato",doc_compraventa:"Compraventa",doc_f08:"Formulario 08",doc_factura_empresa:"Factura empresa",doc_factura_vendedor:"Factura vendedor"},i=D.vehiculos,o=i.filter(e=>!Object.keys(a).every(s=>e[s])),d=D.operaciones.filter(e=>!Object.keys(t).every(s=>e[s]));return`
  <div class="kpis">
    <div class="kpi g"><div class="lb">Vehículos en regla</div><div class="vl">${i.length-o.length}</div><div class="df">De ${i.length} en catálogo</div></div>
    <div class="kpi a"><div class="lb">Con faltantes</div><div class="vl">${o.length}</div><div class="df ${o.length?"n":""}">No deberían publicarse</div></div>
    <div class="kpi"><div class="lb">Operaciones abiertas</div><div class="vl">${d.length}</div><div class="df">Con trámites pendientes</div></div>
    <div class="kpi p"><div class="lb">Documentos firmados</div><div class="vl">${D.operaciones.reduce((e,s)=>e+Object.keys(t).filter(l=>s[l]).length,0)}</div><div class="df">Archivo histórico</div></div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="card-h"><h3>Documentación de vehículos</h3><span class="hint">Clic en un casillero para cambiar su estado</span></div>
    <div class="card-b" style="padding:0">${i.length?`<table>
      <thead><tr><th>Vehículo</th>${Object.values(a).map(e=>`<th style="text-align:center">${e}</th>`).join("")}<th style="text-align:center">Estado</th></tr></thead>
      <tbody>${i.map(e=>{const s=Object.keys(a).every(l=>e[l]);return`<tr><td><b>${e.icono||"🚗"} ${e.marca} ${e.modelo}</b><div class="mini">${e.propietario}</div></td>
        ${Object.keys(a).map(l=>`<td style="text-align:center"><input type="checkbox" ${e[l]?"checked":""}
          onchange="togDocVeh(${e.id},'${l}',this.checked)" style="width:17px;height:17px;accent-color:var(--green);cursor:pointer"></td>`).join("")}
        <td style="text-align:center"><span class="pill ${s?"p-green":"p-red"}">${s?"Completo":"Faltantes"}</span></td></tr>`}).join("")}
      </tbody></table>`:'<div class="card-b mini">No hay vehículos en el catálogo</div>'}</div></div>

  <div class="card"><div class="card-h"><h3>Trámites de operaciones cerradas</h3><span class="hint">Seguimiento post-venta</span></div>
    <div class="card-b" style="padding:0">${D.operaciones.length?`<table>
      <thead><tr><th>Operación</th>${Object.values(t).map(e=>`<th style="text-align:center">${e}</th>`).join("")}<th style="text-align:center">Avance</th></tr></thead>
      <tbody>${D.operaciones.map(e=>{const s=Object.keys(t).filter(l=>e[l]).length;return`<tr><td><b>${e.vehiculo_desc}</b><div class="mini">${e.comprador||""} · ${fmtFecha(e.fecha)}</div></td>
        ${Object.keys(t).map(l=>`<td style="text-align:center"><input type="checkbox" ${e[l]?"checked":""}
          onchange="togDocOp(${e.id},'${l}',this.checked)" style="width:17px;height:17px;accent-color:var(--green);cursor:pointer"></td>`).join("")}
        <td style="text-align:center;min-width:96px"><div class="prog-bar"><i style="width:${s/5*100}%;background:${s===5?"var(--green)":"var(--amber)"}"></i></div>
          <div class="mini" style="margin-top:3px">${s}/5</div></td></tr>`}).join("")}
      </tbody></table>`:'<div class="card-b mini">Todavía no hay operaciones cerradas</div>'}</div></div>`}async function togDocVeh(a,t,i){const{error:o}=await sb.from("vehiculos").update({[t]:i}).eq("id",a);if(o)return toast(mensajeError(o),"error");await cargarTodo()}async function togDocOp(a,t,i){const{error:o}=await sb.from("operaciones").update({[t]:i}).eq("id",a);if(o)return toast(mensajeError(o),"error");await cargarTodo()}function sHistorial(){const a=D.operaciones,t=metricas();return`
  <div class="kpis">
    <div class="kpi"><div class="lb">Operaciones cerradas</div><div class="vl">${a.length}</div><div class="df">Histórico total</div></div>
    <div class="kpi"><div class="lb">Volumen operado</div><div class="vl">${fmtUSD(t.volumen)}</div><div class="df">Ticket ${fmtUSD(Math.round(t.ticket))}</div></div>
    <div class="kpi g"><div class="lb">Comisión empresa</div><div class="vl">${fmtUSD(t.ingresos)}</div><div class="df">3% de cada venta</div></div>
    <div class="kpi a"><div class="lb">Pagado a la red</div><div class="vl">${fmtUSD(t.pagado)}</div><div class="df">2% de cada venta</div></div>
  </div>
  ${a.length===0?'<div class="empty"><div class="ic">🗂</div>Todavía no hay ventas cerradas</div>':`
  <div class="tbl-wrap"><table>
    <thead><tr><th>Vehículo</th><th>Comprador</th><th>Comisionista</th><th>Código</th><th>Fecha</th><th>Precio</th><th>Empresa</th><th>Vendedor</th></tr></thead>
    <tbody>${a.map(i=>`<tr>
      <td><b>${i.vehiculo_desc}</b></td><td>${i.comprador||"—"}</td><td>${nombreDe(i.perfiles)}</td>
      <td><span class="hash">${i.hash||"—"}</span></td><td>${fmtFecha(i.fecha)}</td>
      <td><b>${fmtUSD(i.precio)}</b></td><td style="color:var(--green);font-weight:800">${fmtUSD(i.com_empresa)}</td>
      <td>${fmtUSD(i.com_vendedor)}</td></tr>`).join("")}
    <tr style="background:var(--blue-l);font-weight:800"><td colspan="5" style="text-align:right">Totales</td>
      <td>${fmtUSD(t.volumen)}</td><td style="color:var(--green)">${fmtUSD(t.ingresos)}</td><td>${fmtUSD(t.pagado)}</td></tr>
    </tbody></table></div>`}`}function sEstadisticas(){const a=metricas(),t=D.costos.filter(d=>d.tipo==="fijo"),i=D.costos.filter(d=>d.tipo==="variable"),o=a.ticket?Math.ceil((a.cf+a.cv)/(a.ticket*.03)):"—";return`
  <div class="kpis">
    <div class="kpi g"><div class="lb">Ingresos</div><div class="vl">${fmtUSD(a.total)}</div><div class="df">Comisiones + cupos</div></div>
    <div class="kpi a"><div class="lb">Costos mensuales</div><div class="vl">${fmtUSD(a.cf+a.cv)}</div><div class="df">Fijos ${fmtUSD(a.cf)} · Variables ${fmtUSD(a.cv)}</div></div>
    <div class="kpi"><div class="lb">Resultado neto</div><div class="vl">${fmtUSD(a.resultado)}</div><div class="df ${a.resultado<0?"n":""}">Margen ${a.margen.toFixed(1)}%</div></div>
    <div class="kpi p"><div class="lb">Punto de equilibrio</div><div class="vl">${o}</div><div class="df">Operaciones necesarias / mes</div></div>
  </div>
  <div class="grid2" style="margin-bottom:18px">
    <div class="card"><div class="card-h"><h3>Evolución de ingresos</h3><span class="hint">USD por mes</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chEvo"></canvas></div></div></div>
    <div class="card"><div class="card-h"><h3>Rentabilidad mensual</h3><span class="hint">Ingresos − costos</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chRent"></canvas></div></div></div>
  </div>
  <div class="grid3">
    <div class="card"><div class="card-h"><h3>Ventas por gama</h3></div>
      <div class="card-b"><div class="chartbox sm"><canvas id="chGama"></canvas></div></div></div>
    <div class="card"><div class="card-h"><h3>Costos fijos</h3><span class="hint">${fmtUSD(a.cf)}/mes</span></div>
      <div class="card-b">${t.map(d=>`<div class="detail-row"><span>${d.concepto}</span><span>${fmtUSD(d.monto)}</span></div>`).join("")}
        <div class="detail-row" style="border-top:2px solid var(--navy);margin-top:5px;padding-top:9px"><span><b>Total</b></span><span>${fmtUSD(a.cf)}</span></div></div></div>
    <div class="card"><div class="card-h"><h3>Costos variables</h3><span class="hint">${fmtUSD(a.cv)}/mes</span></div>
      <div class="card-b">${i.map(d=>`<div class="detail-row"><span>${d.concepto}</span><span>${fmtUSD(d.monto)}</span></div>`).join("")}
        <div class="detail-row" style="border-top:2px solid var(--navy);margin-top:5px;padding-top:9px"><span><b>Total</b></span><span>${fmtUSD(a.cv)}</span></div></div></div>
  </div>`}function chartsEstadisticas(){const a=serieMensual();charts.evo=new Chart($("chEvo"),{type:"line",data:{labels:a.meses,datasets:[{label:"Ingresos",data:a.ing,borderColor:"#1665D8",backgroundColor:"rgba(22,101,216,.13)",fill:!0,tension:.35,borderWidth:2.5,pointRadius:4,pointBackgroundColor:"#0A2540"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#EEF2F7"},ticks:{font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}});const t=a.ing.map((o,d)=>o-a.cos[d]);charts.rent=new Chart($("chRent"),{type:"bar",data:{labels:a.meses,datasets:[{label:"Resultado",data:t,backgroundColor:t.map(o=>o>=0?"#059669":"#DC2626"),borderRadius:5}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{grid:{color:"#EEF2F7"},ticks:{font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}});const i={baja:0,media:0,alta:0};D.operaciones.forEach(o=>i[gamaDeVehiculo(Number(o.precio))]++),charts.gama=new Chart($("chGama"),{type:"doughnut",data:{labels:["Gama baja","Gama media","Gama alta"],datasets:[{data:[i.baja,i.media,i.alta],backgroundColor:["#94A3B8","#1665D8","#0A2540"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"62%",plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:10.5},padding:12}}}}})}function sMarketing(){const a=D.marketing,t=a.reduce((e,s)=>e+Number(s.inversion),0),i=a.reduce((e,s)=>e+Number(s.retorno),0),o=a.reduce((e,s)=>e+Number(s.leads),0),d=a.reduce((e,s)=>e+Number(s.alcance),0);return`
  <div class="kpis">
    <div class="kpi"><div class="lb">Alcance total</div><div class="vl">${fmtNum(d)}</div><div class="df">Impresiones del mes</div></div>
    <div class="kpi a"><div class="lb">Inversión publicitaria</div><div class="vl">${fmtUSD(t)}</div><div class="df">Todos los canales</div></div>
    <div class="kpi g"><div class="lb">Retorno generado</div><div class="vl">${fmtUSD(i)}</div><div class="df">ROAS ${t?(i/t).toFixed(1):"—"}x</div></div>
    <div class="kpi p"><div class="lb">Leads captados</div><div class="vl">${o}</div><div class="df">Costo por lead ${o?fmtUSD((t/o).toFixed(1)):"—"}</div></div>
  </div>
  <div class="grid2" style="margin-bottom:18px">
    <div class="card"><div class="card-h"><h3>Registros de comisionistas</h3><span class="hint">Altas por mes</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chAltas"></canvas></div></div></div>
    <div class="card"><div class="card-h"><h3>Inversión vs retorno por canal</h3><span class="hint">USD</span></div>
      <div class="card-b"><div class="chartbox"><canvas id="chRoas"></canvas></div></div></div>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Canal</th><th>Seguidores</th><th>Crecimiento</th><th>Alcance</th><th>Leads</th><th>Inversión</th><th>Retorno</th><th>ROAS</th></tr></thead>
    <tbody>${a.map(e=>`<tr>
      <td><b>${e.canal}</b></td><td>${e.seguidores?fmtNum(e.seguidores):"—"}</td>
      <td>${Number(e.crecimiento)?`<span class="pill p-green">↑ ${e.crecimiento}%</span>`:"—"}</td>
      <td>${fmtNum(e.alcance)}</td><td><b>${e.leads}</b></td>
      <td>${Number(e.inversion)?fmtUSD(e.inversion):"—"}</td>
      <td style="color:var(--green);font-weight:800">${fmtUSD(e.retorno)}</td>
      <td>${Number(e.inversion)?`<span class="pill ${e.retorno/e.inversion>10?"p-green":"p-blue"}">${(e.retorno/e.inversion).toFixed(1)}x</span>`:'<span class="pill p-pur">Orgánico</span>'}</td>
    </tr>`).join("")}
    <tr style="background:var(--blue-l);font-weight:800"><td colspan="4" style="text-align:right">Totales</td>
      <td>${o}</td><td>${fmtUSD(t)}</td><td style="color:var(--green)">${fmtUSD(i)}</td><td>${t?(i/t).toFixed(1):"—"}x</td></tr>
    </tbody></table></div>`}function chartsMarketing(){const a=D.marketing,t=[],i=[],o=new Date;for(let e=7;e>=0;e--){const s=new Date(o.getFullYear(),o.getMonth()-e,1);i.push(s.toISOString().slice(0,7)),t.push(s.toLocaleDateString("es-AR",{month:"short"}))}const d=i.map(e=>D.perfiles.filter(s=>String(s.creado_en).slice(0,7)===e).length);charts.altas=new Chart($("chAltas"),{type:"line",data:{labels:t,datasets:[{label:"Altas",data:d,borderColor:"#7C3AED",backgroundColor:"rgba(124,58,237,.12)",fill:!0,tension:.35,borderWidth:2.5,pointRadius:4,pointBackgroundColor:"#5B21B6"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#EEF2F7"},ticks:{stepSize:1,font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}}),charts.roas=new Chart($("chRoas"),{type:"bar",data:{labels:a.map(e=>e.canal),datasets:[{label:"Inversión",data:a.map(e=>e.inversion),backgroundColor:"#CBD5E1",borderRadius:5},{label:"Retorno",data:a.map(e=>e.retorno),backgroundColor:"#059669",borderRadius:5}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{boxWidth:11,font:{size:11}}}},scales:{y:{beginAtZero:!0,grid:{color:"#EEF2F7"},ticks:{font:{size:10}}},x:{grid:{display:!1},ticks:{font:{size:10}}}}}})}function sFiscal(){const a=D.facturas,t=D.impuestos,i=a.reduce((s,l)=>s+Number(l.monto),0),o=t.filter(s=>s.estado==="pendiente"),d=t.filter(s=>s.estado==="pagado"),e=a.map(s=>parseInt((s.nro||"0001-00000000").split("-")[1])).sort((s,l)=>l-s)[0]||0;return`
  <div class="kpis">
    <div class="kpi g"><div class="lb">Facturado</div><div class="vl">${fmtUSD(i)}</div><div class="df">${a.length} comprobantes emitidos</div></div>
    <div class="kpi a"><div class="lb">Impuestos pendientes</div><div class="vl">${fmtARS(o.reduce((s,l)=>s+Number(l.monto),0))}</div><div class="df ${o.length?"n":""}">${o.length} vencimientos próximos</div></div>
    <div class="kpi"><div class="lb">Impuestos pagados</div><div class="vl">${fmtARS(d.reduce((s,l)=>s+Number(l.monto),0))}</div><div class="df">Al día</div></div>
    <div class="kpi p"><div class="lb">Próximo comprobante</div><div class="vl" style="font-size:1.15rem">0001-${String(e+1).padStart(8,"0")}</div><div class="df">Punto de venta 0001</div></div>
  </div>
  <div class="note" style="margin-bottom:18px"><b>Emisión de facturas.</b> El sistema registra el comprobante en la base. Para obtener el CAE oficial hay que conectar los Web Services de AFIP (WSFEv1) con certificado digital — es el paso siguiente cuando tengas la inscripción activa.</div>

  <div class="card" style="margin-bottom:18px">
    <div class="card-h"><h3>Facturas emitidas</h3><button class="btn btn-sm" onclick="nuevaFactura()">🧾 Emitir factura</button></div>
    <div class="card-b" style="padding:0">${a.length?`<table>
      <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>CUIT</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead>
      <tbody>${a.map(s=>`<tr><td><b>${s.nro}</b></td><td>${fmtFecha(s.fecha)}</td><td>${s.cliente||"—"}</td>
        <td class="mini">${s.cuit||"—"}</td><td class="mini">${s.concepto||""}</td>
        <td><span class="pill p-blue">Tipo ${s.tipo}</span></td><td style="font-weight:800">${fmtUSD(s.monto)}</td></tr>`).join("")}
      </tbody></table>`:'<div class="card-b mini">Todavía no emitiste facturas</div>'}</div></div>

  <div class="card"><div class="card-h"><h3>Obligaciones fiscales</h3><span class="hint">Monotributo e Ingresos Brutos</span></div>
    <div class="card-b" style="padding:0"><table>
      <thead><tr><th>Concepto</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th></th></tr></thead>
      <tbody>${t.map(s=>`<tr><td><b>${s.concepto}</b></td><td>${fmtFecha(s.vence)}</td>
        <td style="font-weight:800">${fmtARS(s.monto)}</td>
        <td><span class="pill ${s.estado==="pagado"?"p-green":"p-amber"}">${s.estado}</span></td>
        <td>${s.estado==="pendiente"?`<button class="btn btn-green btn-sm" onclick="pagarImp(${s.id})">Marcar pagado</button>`:""}</td></tr>`).join("")}
      </tbody></table></div></div>`}async function pagarImp(a){cargando(!0,"Actualizando…");const{error:t}=await sb.from("impuestos").update({estado:"pagado"}).eq("id",a);if(t)return cargando(!1),toast(mensajeError(t),"error");await cargarTodo(),cargando(!1),render(),toast("Obligación marcada como pagada","ok")}function nuevaFactura(){const a=D.operaciones.filter(t=>!t.doc_factura_empresa);modal("Emitir factura",`
    <div class="note" style="margin-bottom:18px">Seleccioná una operación cerrada y se completan los datos automáticamente.</div>
    <div class="fld"><label>Operación a facturar</label>
      <select id="fcOp" onchange="autoFactura()"><option value="">— Facturación manual —</option>
        ${a.map(t=>`<option value="${t.id}">${t.vehiculo_desc} · ${t.comprador||""} · ${fmtUSD(t.com_empresa)}</option>`).join("")}
      </select></div>
    <div class="row2">
      <div class="fld"><label>Cliente (propietario)</label><input id="fcCliente" placeholder="Nombre y apellido"></div>
      <div class="fld"><label>CUIT</label><input id="fcCuit" placeholder="20-12345678-9"></div>
    </div>
    <div class="fld"><label>Concepto</label><input id="fcConcepto" placeholder="Honorarios por gestión de mandato de venta"></div>
    <div class="row3">
      <div class="fld"><label>Importe (USD)</label><input id="fcMonto" type="number" placeholder="0"></div>
      <div class="fld"><label>Tipo</label><select id="fcTipo"><option>C</option><option>A</option><option>B</option></select></div>
      <div class="fld"><label>Fecha</label><input id="fcFecha" type="date" value="${hoyISO()}"></div>
    </div>
  `,[{txt:"Cancelar",clase:"btn-o",fn:"cerrarModal()"},{txt:"Emitir factura",clase:"btn-green",fn:"confirmarFactura()"}])}function autoFactura(){const a=$("fcOp").value;if(!a)return;const t=D.operaciones.find(i=>i.id==a);$("fcCliente").value="Propietario — "+t.vehiculo_desc,$("fcConcepto").value="Honorarios por gestión de mandato de venta — "+t.vehiculo_desc,$("fcMonto").value=t.com_empresa}async function confirmarFactura(){const a=Number($("fcMonto").value);if(!a)return toast("Ingresá el importe","error");const t=D.facturas.map(s=>parseInt((s.nro||"0001-00000000").split("-")[1])).sort((s,l)=>l-s)[0]||0,i="0001-"+String(t+1).padStart(8,"0"),o=$("fcOp").value,d={nro:i,fecha:$("fcFecha").value,cliente:$("fcCliente").value||"Sin nombre",cuit:$("fcCuit").value||null,concepto:$("fcConcepto").value||"Honorarios por gestión",monto:a,tipo:$("fcTipo").value,operacion_id:o||null};cerrarModal(),cargando(!0,"Emitiendo…");const{error:e}=await sb.from("facturas").insert(d);if(e)return cargando(!1),toast(mensajeError(e),"error");o&&await sb.from("operaciones").update({doc_factura_empresa:!0}).eq("id",o),await cargarTodo(),cargando(!1),render(),toast("Factura "+i+" registrada","ok")}function sPublicar(){return`<div style="max-width:760px">
    <div class="note" style="margin-bottom:20px">Los vehículos que publiques aparecen <b>inmediatamente en la web pública</b>, visibles para los comisionistas cuyo nivel se lo permita. La gama se asigna sola según el precio.</div>
    <div class="card"><div class="card-h"><h3>Datos del vehículo</h3></div><div class="card-b">
      <div class="row3">
        <div class="fld"><label>Marca <span style="color:var(--red)">*</span></label><input id="pvMarca" placeholder="Toyota"></div>
        <div class="fld"><label>Modelo <span style="color:var(--red)">*</span></label><input id="pvModelo" placeholder="Hilux SRX"></div>
        <div class="fld"><label>Año</label><input id="pvAnio" type="number" placeholder="2023"></div>
      </div>
      <div class="row3">
        <div class="fld"><label>Precio USD <span style="color:var(--red)">*</span></label><input id="pvPrecio" type="number" placeholder="42000" oninput="previewGama()"></div>
        <div class="fld"><label>Kilómetros</label><input id="pvKm" type="number" placeholder="28000"></div>
        <div class="fld"><label>Color</label><input id="pvColor" placeholder="Negro"></div>
      </div>
      <div class="row3">
        <div class="fld"><label>Combustible</label><select id="pvComb"><option>Nafta</option><option>Diésel</option><option>Híbrido</option><option>Eléctrico</option><option>GNC</option></select></div>
        <div class="fld"><label>Transmisión</label><select id="pvTrans"><option>Automática</option><option>Manual</option></select></div>
        <div class="fld"><label>Ícono</label><select id="pvIcono">
          <option value="🚗">🚗 Auto</option><option value="🚙">🚙 Sedán</option><option value="🛻">🛻 Pick-up</option>
          <option value="🚐">🚐 SUV</option><option value="🏎️">🏎️ Deportivo / Premium</option></select></div>
      </div>
      <div id="gamaPrev"></div>
    </div></div>

    <div class="card" style="margin-top:18px"><div class="card-h"><h3>Propietario y ubicación</h3></div><div class="card-b">
      <div class="row3">
        <div class="fld"><label>Propietario <span style="color:var(--red)">*</span></label><input id="pvProp" placeholder="Carlos Méndez"></div>
        <div class="fld"><label>Teléfono</label><input id="pvTel" placeholder="11-4444-5555"></div>
        <div class="fld"><label>Ubicación</label><input id="pvUbic" placeholder="CABA"></div>
      </div></div></div>

    <div class="card" style="margin-top:18px"><div class="card-h"><h3>Documentación verificada</h3><span class="hint">Marcá lo que ya tenés</span></div>
      <div class="card-b">
        <label class="chk"><input type="checkbox" id="dcDominio"> Informe de dominio del RNPA</label>
        <label class="chk"><input type="checkbox" id="dcPatentes"> Libre deuda de patentes</label>
        <label class="chk"><input type="checkbox" id="dcVtv"> VTV vigente</label>
        <label class="chk"><input type="checkbox" id="dcPolicial"> Verificación policial de chasis y motor</label>
        <label class="chk"><input type="checkbox" id="dcMandato"> Contrato de mandato firmado</label>
        <div class="note w" style="margin-top:12px">Un vehículo sin contrato de mandato firmado no debería publicarse — sin él no tenés derecho contractual a cobrar la comisión.</div>
      </div></div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button class="btn btn-o" onclick="ir('catalogo')">Cancelar</button>
      <button class="btn btn-green" onclick="publicarVehiculo()">✓ Publicar en el catálogo</button>
    </div></div>`}function previewGama(){const a=Number($("pvPrecio").value);if(!a)return $("gamaPrev").innerHTML="";const t=gamaDeVehiculo(a),i=t==="baja"?"Bronce":t==="media"?"Plata":"Oro";$("gamaPrev").innerHTML=`<div class="note g" style="margin-top:6px"><b>${GAMA_LABEL[t]}</b> — visible para comisionistas de nivel <b>${i}</b> o superior.<br>
    Comisión empresa: <b>${fmtUSD(Math.round(a*.03))}</b> · Comisión comisionista: <b>${fmtUSD(Math.round(a*.02))}</b></div>`}async function publicarVehiculo(){const a=$("pvMarca").value.trim(),t=$("pvModelo").value.trim(),i=Number($("pvPrecio").value),o=$("pvProp").value.trim();if(!a||!t||!i||!o)return toast("Completá marca, modelo, precio y propietario","error");cargando(!0,"Publicando…");const{error:d}=await sb.from("vehiculos").insert({marca:a,modelo:t,anio:Number($("pvAnio").value)||null,km:Number($("pvKm").value)||0,precio:i,ubicacion:$("pvUbic").value.trim()||"CABA",propietario:o,tel_propietario:$("pvTel").value.trim()||null,color:$("pvColor").value.trim()||null,combustible:$("pvComb").value,transmision:$("pvTrans").value,icono:$("pvIcono").value,doc_dominio:$("dcDominio").checked,doc_patentes:$("dcPatentes").checked,doc_vtv:$("dcVtv").checked,doc_policial:$("dcPolicial").checked,doc_mandato:$("dcMandato").checked});if(d)return cargando(!1),toast(mensajeError(d),"error");await cargarTodo(),cargando(!1),ir("catalogo"),toast(`${a} ${t} publicado — ya está visible en la web`,"ok")}function pantallaLogin(a){return`<div class="auth-bg" style="min-height:100vh"><div class="auth">
    <div style="text-align:center;margin-bottom:22px">
      <div style="width:52px;height:52px;background:var(--navy);border-radius:13px;display:grid;place-items:center;margin:0 auto 12px;font-size:1.4rem;color:#fff">◈</div>
      <h3 style="margin-bottom:4px">Panel de Gestión</h3>
      <p class="lead" style="margin:0">Acceso restringido al equipo de BivonaCars</p></div>
    ${a?`<div class="note r" style="margin-bottom:18px">${a}</div>`:""}
    <div class="fld"><label>Correo</label><input id="adEmail" type="email" placeholder="tucorreo@mail.com" autocomplete="email"></div>
    <div class="fld"><label>Contraseña</label><input id="adPass" type="password" placeholder="••••••" autocomplete="current-password"
      onkeydown="if(event.key==='Enter')loginAdmin()"></div>
    <button class="btn btn-block" style="margin-top:8px" onclick="loginAdmin()">Ingresar</button>
    <div class="auth-alt"><a href="index.html">← Volver al sitio público</a></div>
  </div></div>`}async function loginAdmin(){const a=$("adEmail").value.trim(),t=$("adPass").value;if(!a||!t)return toast("Completá correo y contraseña","error");cargando(!0,"Ingresando…");const{error:i}=await sb.auth.signInWithPassword({email:a,password:t});if(i)return cargando(!1),toast(mensajeError(i),"error");cargando(!1),arrancar()}async function salir(){await sb.auth.signOut(),location.reload()}function render(){destruirCharts();const a=SECCIONES[seccion]||SECCIONES.resumen;$("raiz").innerHTML=`
  <div class="app">
    <aside class="side">
      <div class="side-brand"><div class="logo"><div class="mk">◈</div>Bivona<span>Cars</span></div><small>Panel de gestión</small></div>
      <nav class="side-nav">${MENU.map(t=>`
        <div class="side-lbl">${t.grupo}</div>
        ${t.items.map(i=>{const o=i.cnt?i.cnt():0;return`<a class="${seccion===i.id?"on":""}" onclick="ir('${i.id}')"><span class="ic">${i.ic}</span><span>${i.txt}</span>${o?`<span class="cnt">${o}</span>`:""}</a>`}).join("")}`).join("")}</nav>
      <div class="side-foot"><b>${perfil?perfil.nombre+" "+perfil.apellido:""}</b>Administrador
        <button onclick="salir()">Cerrar sesión</button></div>
    </aside>
    <div class="main">
      <div class="topbar2">
        <div><h1>${a.t}</h1><div class="sb">${a.s}</div></div>
        <div style="display:flex;gap:9px">
          <a href="index.html" target="_blank" class="btn btn-o btn-sm" style="text-decoration:none">🌐 Ver web pública</a>
          <button class="btn btn-sm" onclick="ir('publicar')">➕ Publicar vehículo</button>
        </div>
      </div>
      <div class="content" id="contenido"></div>
    </div>
  </div>`,$("contenido").innerHTML=a.f(),a.post&&setTimeout(a.post,50)}async function arrancar(){const{data:a}=await sb.auth.getSession();if(sesion=a.session,!sesion){$("raiz").innerHTML=pantallaLogin();return}const{data:t}=await sb.from("perfiles").select("*").eq("id",sesion.user.id).maybeSingle();if(perfil=t,!perfil||perfil.rol!=="admin"){await sb.auth.signOut(),$("raiz").innerHTML=pantallaLogin("Esta cuenta no tiene permisos de administrador.");return}cargando(!0,"Cargando datos…"),await cargarTodo(),cargando(!1),render()}arrancar();

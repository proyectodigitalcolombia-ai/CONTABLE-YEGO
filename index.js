const express = require('express'), { Sequelize, DataTypes, Op } = require('sequelize'), app = express();
app.use(express.urlencoded({ extended: true })); app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, { 
  dialect: 'postgres', 
  logging: false, 
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } 
});

const C = db.define('Carga', {
  oficina: DataTypes.STRING,
  emp_gen: DataTypes.STRING,
  comercial: DataTypes.STRING,
  pto: DataTypes.STRING,
  refleja: DataTypes.STRING,
  f_doc: DataTypes.STRING,
  h_doc: DataTypes.STRING,
  do_bl: DataTypes.STRING,
  cli: DataTypes.STRING,
  subc: DataTypes.STRING,
  mod: DataTypes.STRING,
  lcl: DataTypes.STRING,
  cont: DataTypes.STRING,
  peso: DataTypes.STRING,
  unid: DataTypes.STRING,
  prod: DataTypes.STRING,
  esq: DataTypes.STRING,
  vence: DataTypes.STRING,
  orig: DataTypes.STRING,
  dest: DataTypes.STRING,
  t_v: DataTypes.STRING,
  ped: DataTypes.STRING,
  f_c: DataTypes.STRING,
  h_c: DataTypes.STRING,
  f_d: DataTypes.STRING,
  h_d: DataTypes.STRING,
  placa: DataTypes.STRING,
  f_p: DataTypes.STRING,
  f_f: DataTypes.STRING,
  obs_e: { type: DataTypes.STRING, defaultValue: 'PENDIENTE INSTRUCCIONES' },
  f_act: DataTypes.STRING,
  obs: DataTypes.TEXT,
  cond: DataTypes.TEXT,
  h_t: DataTypes.STRING,
  muc: DataTypes.STRING,
  desp: DataTypes.STRING,
  f_fin: DataTypes.STRING,
  est_real: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { timestamps: true });

const opts = {
  oficina: ['CARTAGENA', 'BOGOTÁ', 'BUENAVENTURA', 'MEDELLÍN'],
  puertos: ['SPIA', 'SPRB', 'TCBUEN', 'CONTECAR', 'SPRC', 'PUERTO COMPAS CCTO', 'PUERTO BAHÍA', 'SOCIEDAD PORTUARIA REGIONAL DE CARTAGENA', 'SPIA - AGUADULCE', 'PLANTA ESENTTIA KM 8 VIA MAMONAL', 'PLANTA YARA CARTAGENA MAMONAL', 'N/A'],
  clientes: ['GEODIS COLOMBIA LTDA', 'MAERSK LOGISTICS SERVICES LTDA', 'SAMSUNG SDS COLOMBIA GLOBAL', 'ENVAECOL', 'SEA CARGO COLOMBIA LTDA', 'YARA COLOMBIA', 'ESENTTIA SA', 'BRINSA SA', 'ACERIAS PAZ DEL RIO', 'TERNIUM DEL ATLANTICO', 'PLASTICOS ESPECIALES SAS', 'INGENIO MAYAGUEZ', 'TENARIS', 'CASA LUKER', 'CORONA', 'EDITORIAL NOMOS', 'ALIMENTOS POLAR', 'PLEXA SAS ESP', 'FAJOBE'],
  modalidades: ['NACIONALIZADO', 'OTM', 'DTA', 'TRASLADO', 'NACIONALIZADO EXP', 'ITR', 'VACÍO EN EXPRESO', 'VACÍO CONSOLIDADO', 'NACIONALIZADO IMP'],
  lcl_fcl: ['CARGA SUELTA', 'CONTENEDOR 40', 'CONTENEDOR 20', 'REFER 40', 'REFER 20', 'FLAT RACK 20', 'FLAT RACK 40'],
  esquemas: ['1 ESCOLTA - SELLO', '2 ESCOLTAS SELLO - SPIA', 'SELLO', '1 ESCOLTA', '2 ESCOLTA', 'NO REQUIERE', '2 ESCOLTAS SELLO', 'INSPECTORES VIALES'],
  vehiculos: ['TURBO 2.5 TN', 'TURBO 4.5 TN', 'TURBO SENCILLO', 'SENCILLO 9 TN', 'PATINETA 2S3', 'TRACTOMULA 3S2', 'TRACTOMULA 3S3', 'CAMA BAJA', 'DOBLE TROQUE'],
  ciudades: ['BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA', 'CARTAGENA', 'BUENAVENTURA', 'SANTA MARTA', 'CÚCUTA', 'IBAGUÉ', 'PEREIRA', 'MANIZALES', 'NEIVA', 'VILLAVICENCIO', 'YOPAL', 'SIBERIA', 'FUNZA', 'MOSQUERA', 'MADRID', 'FACATATIVÁ', 'TOCANCIPÁ', 'CHÍA', 'CAJICÁ'],
  subclientes: ['HIKVISION', 'PAYLESS COLOMBIA', 'INDUSTRIAS DONSSON', 'SAMSUNG SDS', 'ÉXITO', 'ALKOSTO', 'FALABELLA', 'SODIMAC', 'ENVAECOL', 'ALPLA', 'AMCOR', 'MEXICHEM', 'KOBA D1', 'JERONIMO MARTINS', 'TERNIUM', 'BRINSA', 'TENARIS', 'CORONA', 'FAJOBE'],
  estados: ['ASIGNADO VEHÍCULO', 'PENDIENTE CITA ASIGNADO', 'VEHÍCULO CON CITA', 'CANCELADO POR CLIENTE', 'CANCELADO POR NEGLIGENCIA OPERATIVA', 'CONTENEDOR EN INSPECCIÓN', 'CONTENEDOR RETIRADO PARA ITR', 'DESPACHADO', 'DESPACHADO CON NOVEDAD', 'EN CONSECUCIÓN', 'EN PROGRAMACIÓN', 'EN SITIO DE CARGUE', 'FINALIZADO CON NOVEDAD', 'FINALIZADO SIN NOVEDAD', 'HOJA DE VIDA EN ESTUDIO', 'MERCANCÍA EN INSPECCIÓN', 'NOVEDAD', 'PENDIENTE BAJAR A PATIO', 'PENDIENTE INSTRUCCIONES', 'PRE ASIGNADO', 'RETIRADO DE PUERTO PENDIENTE CONSOLIDADO', 'CANCELADO POR GERENCIA', 'VEHICULO EN RUTA'],
  despachadores: ['ABNNER MARTINEZ', 'CAMILO TRIANA', 'FREDY CARRILLO', 'RAUL LOPEZ', 'EDDIER RIVAS']
};

/**
 * AJUSTE DE HORA COLOMBIA
 * Forzamos el uso de America/Bogota para corregir el desfase del servidor
 */
const getNow = () => {
  return new Date().toLocaleString('es-CO', { 
    timeZone: 'America/Bogota', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  }).replace(/\//g, '-');
};

const css = `<style>
  body{background:#0f172a;color:#fff;font-family:sans-serif;margin:0;padding:20px}
  .sc{width:100%;overflow-x:auto;background:#1e293b;border:1px solid #334155;border-radius:8px}
  .fs{height:12px;margin-bottom:5px}
  .fc{width:8600px;height:1px}
  table{border-collapse:collapse;min-width:8600px;font-size:10px;table-layout: fixed;}
  th{background:#1e40af;padding:10px 5px;text-align:center;position:sticky;top:0;border-right:1px solid #3b82f6; word-wrap: break-word; white-space: normal; vertical-align: middle;}
  td{padding:6px;border:1px solid #334155;white-space:nowrap;text-align:center; overflow: hidden; text-overflow: ellipsis;}
  .col-num { width: 30px; }
  .col-id { width: 40px; font-weight: bold; }
  .col-reg { width: 110px; font-size: 9px; }
  .col-emp { width: 150px; text-align: center !important; }
  .col-placa { width: 120px; }
  .in-placa { width: 75px !important; font-size: 11px !important; font-weight: bold; height: 25px; }
  .col-est { width: 210px; padding: 0 !important; }
  .sel-est { background:#334155; color:#fff; border:none; padding:4px; font-size:9px; width:100%; height: 100%; cursor:pointer; text-align: center; }
  .col-desp { width: 130px; }
  .col-hfin { width: 115px; font-size: 9px; }
  .col-acc { width: 70px; }
  .acc-cell { display: flex; align-items: center; justify-content: center; gap: 8px; height: 35px; }
  .form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:25px;background:#1e293b;padding:20px;border-radius:8px;border:1px solid #2563eb}
  .fg{display:flex;flex-direction:column;gap:4px}
  label{font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:700}
  input,select,textarea{padding:8px;border-radius:4px;border:none;font-size:11px;color:#000;text-align:center}
  .btn-submit-serious{
    grid-column:1/-1; background:#1e40af; color:#fff; padding:12px; cursor:pointer; border:none; font-weight:700; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:10px; transition: background 0.2s;
  }
  .btn-submit-serious:hover{ background:#1d4ed8; }
  .icon-serious{ width:20px; height:20px; fill:#fff; }
  .btn-xls{background:#556b2f;color:white;padding:10px 15px;border-radius:6px;font-weight:bold;border:none;cursor:pointer;height:38px;box-sizing:border-box;}
  .btn-stats{background:#4c1d95;color:white;padding:10px 15px;border-radius:6px;font-weight:bold;border:none;cursor:pointer;text-decoration:none;font-size:13px;height:38px;box-sizing:border-box;display:flex;align-items:center;}
  .container-check-all{background:#2563eb;padding:5px 10px;border-radius:6px;display:flex;align-items:center;gap:5px;height:38px;box-sizing:border-box;}
  .btn-del-mult{background:#ef4444;color:white;padding:10px 15px;border-radius:6px;font-weight:bold;border:none;cursor:pointer;display:none;height:38px;box-sizing:border-box;}
  #busq{padding:10px;width:250px;border-radius:6px;border:1px solid #3b82f6;background:#1e293b;color:white;font-weight:bold;height:38px;box-sizing:border-box;}
  .vence-rojo{background:#dc2626 !important;color:#fff !important;font-weight:bold;animation: blink 2s infinite;cursor:pointer}
  .vence-amarillo{background:#fbbf24 !important;color:#000 !important;font-weight:bold}
  @keyframes blink { 0% {opacity:1} 50% {opacity:0.6} 100% {opacity:1} }
  tr:hover td { background: #334155; }
</style>`;

app.get('/', async (req, res) => {
  try {
    const d = await C.findAll({ order: [['id', 'DESC']] });
    let rows = '';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    let index = 1;

    for (let c of d) {
      const isLocked = c.f_fin ? 'disabled' : '';
      let displayReal = 'PENDIENTE';
      let stClass = 'background:#475569;color:#cbd5e1'; 

      if (c.f_fin) {
          displayReal = 'FINALIZADO';
          stClass = 'background:#1e40af;color:#bfdbfe'; 
      } else if (c.placa) {
          displayReal = 'DESPACHADO';
          stClass = 'background:#065f46;color:#34d399'; 
      }
      
      let venceStyle = '';
      if (c.vence && !c.f_fin) {
        const fVence = new Date(c.vence);
        const diffDays = Math.ceil((fVence - hoy) / 864e5);
        if (diffDays <= 2) venceStyle = 'vence-rojo';
        else if (diffDays <= 6) venceStyle = 'vence-amarillo';
      }

      const selectEstado = `<select class="sel-est" ${isLocked} onchange="updState(${c.id}, this.value)">${opts.estados.map(st => `<option value="${st}" ${c.obs_e === st ? 'selected' : ''}>${st}</option>`).join('')}</select>`;
      let accionFin = c.f_fin ? `✓` : (c.placa ? `<a href="/finish/${c.id}" style="background:#10b981;color:white;padding:3px 6px;border-radius:4px;text-decoration:none;font-size:9px" onclick="return confirm('¿Finalizar?')">FIN</a>` : `...`);
      const idUnico = c.id.toString().padStart(4, '0');

      // AJUSTE EN LA COLUMNA DE REGISTRO PARA MOSTRAR HORA COLOMBIA SIEMPRE
      const fechaLocal = new Date(c.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

      rows += `<tr class="fila-datos">
        <td class="col-num">${index++}</td>
        <td class="col-id">${idUnico}</td>
        <td class="col-reg">${fechaLocal}</td>
        <td>${c.oficina||''}</td>
        <td class="col-emp" title="${c.emp_gen||''}">${c.emp_gen||''}</td>
        <td>${c.comercial||''}</td>
        <td>${c.pto||''}</td>
        <td>${c.refleja||''}</td>
        <td>${c.f_doc||''}</td>
        <td>${c.h_doc||''}</td>
        <td>${c.do_bl||''}</td>
        <td>${c.cli||''}</td>
        <td>${c.subc||''}</td>
        <td>${c.mod||''}</td>
        <td>${c.lcl||''}</td>
        <td>${c.cont||''}</td>
        <td>${c.float||''}</td>
        <td>${c.unid||''}</td>
        <td>${c.prod||''}</td>
        <td>${c.esq||''}</td>
        <td class="${venceStyle}" onclick="silenciar(this)">${c.vence||''}</td>
        <td>${c.orig||''}</td>
        <td>${c.dest||''}</td>
        <td>${c.t_v||''}</td>
        <td>${c.ped||''}</td>
        <td>${c.f_c||''}</td>
        <td>${c.h_c||''}</td>
        <td>${c.f_d||''}</td>
        <td>${c.h_d||''}</td>
        <td class="col-placa">
          <form action="/u/${c.id}" method="POST" style="margin:0;display:flex;gap:4px;justify-content:center;align-items:center">
            <input name="placa" class="in-placa" value="${c.placa||''}" ${isLocked} placeholder="PLACA" oninput="this.value=this.value.toUpperCase()">
            <button ${isLocked} style="background:#10b981;color:#fff;border:none;padding:5px;border-radius:3px;cursor:pointer;font-weight:bold">OK</button>
          </form>
        </td>
        <td>${c.f_p||''}</td>
        <td>${c.f_f||''}</td>
        <td class="col-est">${selectEstado}</td>
        <td style="width:115px;color:#fbbf24">${c.f_act||''}</td>
        <td style="width:100px"><span style="padding:2px 6px;border-radius:10px;font-weight:bold;font-size:8px;${stClass}">${displayReal}</span></td>
        <td style="white-space:normal;min-width:250px;text-align:left">${c.obs||''}</td>
        <td style="white-space:normal;min-width:250px;text-align:left">${c.cond||''}</td>
        <td>${c.h_t||''}</td>
        <td>${c.muc||''}</td>
        <td class="col-desp">${c.desp||''}</td>
        <td>${accionFin}</td>
        <td class="col-hfin"><b style="color:#3b82f6">${c.f_fin||'--'}</b></td>
        <td class="col-acc">
          <div class="acc-cell">
            <a href="#" style="color:#f87171;text-decoration:none;font-size:10px" onclick="eliminarConClave(${c.id})">🗑️</a>
            <input type="checkbox" class="row-check" value="${c.id}" onclick="toggleDelBtn()">
          </div>
        </td>
      </tr>`;
    }

    res.send(`<html><head><meta charset="UTF-8"><title>LOGISV20</title>${css}</head><body onclick="activarAudio()">
      <h2 style="color:#3b82f6; margin: 0 0 10px 0;">SISTEMA LOGISTICO DE YEGO ECO T S.A.S</h2>
      <div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;">
          <input type="text" id="busq" onkeyup="buscar()" placeholder="🔍 Filtrar por Placa, Cliente, ID...">
          <button class="btn-xls" onclick="exportExcel()">Excel</button>
          <a href="/stats" class="btn-stats">📈 Indicadores</a>
          <button id="btnDelMult" class="btn-del-mult" onclick="eliminarSeleccionados()">Borrar (<span id="count">0</span>)</button>
          <div class="container-check-all">
            <label style="font-size:10px;color:#fff;">Todos</label>
            <input type="checkbox" id="checkAll" onclick="selectAll(this)">
          </div>
      </div>
      
      <form action="/add" method="POST" class="form" style="padding:10px; gap:8px;">
        <datalist id="list_ciud">${opts.ciudades.map(c=>`<option value="${c}">`).join('')}</datalist>
        <div class="fg"><label>Oficina</label><select name="oficina">${opts.oficina.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Empresa</label><select name="emp_gen"><option value="YEGO ECO-T SAS">YEGO ECO-T SAS</option></select></div>
        <div class="fg"><label>Comercial</label><select name="comercial"><option value="RAÚL LÓPEZ">RAÚL LÓPEZ</option></select></div>
        <div class="fg"><label>Puerto</label><select name="pto">${opts.puertos.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Refleja</label><select name="refleja"><option value="SI">SI</option><option value="NO">NO</option></select></div>
        <div class="fg"><label>F. Doc</label><input name="f_doc" type="date"></div>
        <div class="fg"><label>H. Doc</label><input name="h_doc" type="time"></div>
        <div class="fg"><label>DO/BL</label><input name="do_bl"></div>
        <div class="fg"><label>Cliente</label><select name="cli">${opts.clientes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Subcliente</label><select name="subc">${opts.subclientes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Modalidad</label><select name="mod">${opts.modalidades.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>LCL/FCL</label><select name="lcl">${opts.lcl_fcl.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Contenedor</label><input name="cont" oninput="this.value=this.value.toUpperCase()"></div>
        <div class="fg"><label>Peso</label><input name="peso"></div>
        <div class="fg"><label>Unid</label><input name="unid"></div>
        <div class="fg"><label>Prod</label><input name="prod"></div>
        <div class="fg"><label>Esq</label><select name="esq">${opts.esquemas.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Vence</label><input name="vence" type="date"></div>
        <div class="fg"><label>Origen</label><input name="orig" list="list_ciud"></div>
        <div class="fg"><label>Destino</label><input name="dest" list="list_ciud"></div>
        <div class="fg"><label>Vehículo</label><select name="t_v">${opts.vehiculos.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Pedido</label><input name="ped"></div>
        <div class="fg"><label>F.C</label><input name="f_c" type="date"></div>
        <div class="fg"><label>H.C</label><input name="h_c" type="time"></div>
        <div class="fg"><label>F.D</label><input name="f_d" type="date"></div>
        <div class="fg"><label>H.D</label><input name="h_d" type="time"></div>
        <div class="fg"><label>F. Pagar</label><input name="f_p"></div>
        <div class="fg"><label>F. Fact</label><input name="f_f"></div>
        <div class="fg"><label>Estado</label><select name="obs_e">${opts.estados.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg"><label>Horario</label><input name="h_t"></div>
        <div class="fg"><label>MUC</label><input name="muc"></div>
        <div class="fg"><label>Despachador</label><select name="desp">${opts.despachadores.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column: span 2"><label>Obs</label><textarea name="obs" rows="1"></textarea></div>
        <div class="fg" style="grid-column: span 2"><label>Cond</label><textarea name="cond" rows="1"></textarea></div>
        <button class="btn-submit-serious">
          <svg class="icon-serious" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          REGISTRAR SERVICIO
        </button>
      </form>

      <div class="sc fs" id="st"><div class="fc"></div></div>
      <div class="sc" id="sm">
        <table id="tabla">
          <thead>
            <tr>
              <th class="col-num">#</th><th class="col-id">ID</th><th class="col-reg">REGISTRO</th><th>OFICINA</th><th class="col-emp">EMPRESA</th><th>COMERCIAL</th><th>PUERTO</th><th>REFLEJA</th><th>F.DOC</th><th>H.DOC</th><th>DO/BL</th><th>CLIENTE</th><th>SUBCLIENTE</th><th>MODALIDAD</th><th>LCL/FCL</th><th>CONTENEDOR</th><th>PESO</th><th>UNID</th><th>PRODUCTO</th><th>ESQUEMA</th><th>VENCE</th><th>ORIGEN</th><th>DESTINO</th><th>VEHICULO</th><th>PEDIDO</th><th>F.C</th><th>H.C</th><th>F.D</th><th>H.D</th><th class="col-placa">PLACA</th><th>PAGAR</th><th>FACTURA</th><th class="col-est">ESTADO</th><th>ACTUALIZACIÓN</th><th>ESTADO FINAL</th><th>OBSERVACIONES</th><th>CONDICIONES</th><th>HORA</th><th>MUC</th><th class="col-desp">DESPACHADOR</th><th>FIN</th><th class="col-hfin">H.FIN</th><th class="col-acc">ACCIONES</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <script>
      const CLAVE_ADMIN = "ADMIN123";
      const t=document.getElementById('st'),m=document.getElementById('sm');
      t.onscroll=()=>m.scrollLeft=t.scrollLeft;
      m.onscroll=()=>t.scrollLeft=m.scrollLeft;
      
      function selectAll(source){ 
        const checkboxes = document.getElementsByClassName('row-check'); 
        for(let i=0; i<checkboxes.length; i++){
          if(checkboxes[i].closest('tr').style.display !== 'none') checkboxes[i].checked = source.checked;
        }
        toggleDelBtn(); 
      }
      
      function toggleDelBtn(){ 
        const checked = document.querySelectorAll('.row-check:checked');
        const btn = document.getElementById('btnDelMult');
        document.getElementById('count').innerText = checked.length;
        btn.style.display = checked.length > 0 ? 'inline-block' : 'none'; 
      }
      
      function eliminarConClave(id){
        const pw = prompt("Ingrese contraseña para borrar despacho:");
        if(pw === CLAVE_ADMIN){
           if(confirm("¿Seguro que desea eliminar el registro?")) {
              window.location.href = "/d/" + id;
           }
        } else if(pw !== null) {
           alert("Contraseña incorrecta");
        }
      }
      
      function eliminarSeleccionados(){ 
        const pw = prompt("Ingrese contraseña para borrar selección:");
        if(pw !== CLAVE_ADMIN) return alert("Acceso denegado");
        const checked = document.querySelectorAll('.row-check:checked');
        const ids = Array.from(checked).map(cb => cb.value);
        if(!confirm('¿Eliminar ' + ids.length + ' registros?')) return; 
        fetch('/delete-multiple',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})}).then(()=>location.reload()); 
      }
      
      function updState(id,v){
        fetch('/state/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({obs_e:v})}).then(()=>location.reload());
      }
      
      function buscar(){
        let f = document.getElementById("busq").value.toUpperCase();
        let filas = document.querySelectorAll(".fila-datos");
        let visibleCount = 1;
        filas.forEach(fila => {
          let textoCeldas = fila.innerText.toUpperCase();
          let inputs = Array.from(fila.querySelectorAll("input")).map(i => i.value.toUpperCase()).join(" ");
          let selects = Array.from(fila.querySelectorAll("select")).map(s => s.value.toUpperCase()).join(" ");
          let contenidoTotal = textoCeldas + " " + inputs + " " + selects;
          let mostrar = contenidoTotal.includes(f);
          fila.style.display = mostrar ? "" : "none";
          if(mostrar) { fila.querySelector('.col-num').innerText = visibleCount++; }
        });
      }
      
      function exportExcel(){
        let csv="sep=;\\n";
        document.querySelectorAll("#tabla tr").forEach(row=>{
          if(row.style.display!=="none"){
            let cols=Array.from(row.querySelectorAll("td, th")).map(c=>{
              let inp=c.querySelector("input,select,textarea");
              return '"'+(inp?inp.value:c.innerText.split('\\n')[0]).replace(/;/g,",").trim()+'"';
            });
            csv+=cols.slice(0,-1).join(";")+"\\n";
          }
        });
        const b=new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),u=URL.createObjectURL(b),a=document.createElement("a");
        a.href=u;a.download="Reporte.csv";a.click();
      }
      
      let audioContext; 
      function activarAudio(){ 
        if(!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
        playAlert(); 
      }
      
      function silenciar(el){ 
        el.dataset.silenced = "true"; 
        el.style.animation = "none"; 
        el.style.background = "#450a0a"; 
      }
      
      function playAlert(){ 
        let reds = Array.from(document.querySelectorAll('.vence-rojo')).filter(el => el.dataset.silenced !== "true");
        if(reds.length > 0 && audioContext){ 
          let osc=audioContext.createOscillator(),gain=audioContext.createGain(); 
          osc.type='square'; osc.frequency.setValueAtTime(440, audioContext.currentTime); 
          gain.gain.setValueAtTime(0.1, audioContext.currentTime); 
          osc.connect(gain); gain.connect(audioContext.destination); 
          osc.start(); osc.stop(audioContext.currentTime+0.5); 
          setTimeout(playAlert, 2000); 
        }
      } 
      window.onload=()=>setTimeout(playAlert,1000);
      </script></body></html>`);
  } catch (e) { res.send(e.message); }
});

app.post('/add', async (req, res) => { req.body.f_act = getNow(); await C.create(req.body); res.redirect('/'); });
app.get('/d/:id', async (req, res) => { await C.destroy({ where: { id: req.params.id } }); res.redirect('/'); });
app.post('/delete-multiple', async (req, res) => { await C.destroy({ where: { id: { [Op.in]: req.body.ids } } }); res.sendStatus(200); });
app.post('/u/:id', async (req, res) => { await C.update({ placa: req.body.placa.toUpperCase(), est_real: 'DESPACHADO', f_act: getNow() }, { where: { id: req.params.id } }); res.redirect('/'); });
app.post('/state/:id', async (req, res) => { await C.update({ obs_e: req.body.obs_e, f_act: getNow() }, { where: { id: req.params.id } }); res.sendStatus(200); });
app.get('/finish/:id', async (req, res) => { const ahora = getNow(); await C.update({ f_fin: ahora, obs_e: 'FINALIZADO SIN NOVEDAD', est_real: 'FINALIZADO', f_act: ahora }, { where: { id: req.params.id } }); res.redirect('/'); });

// --- INDICADORES REQUERIDOS ---
app.get('/stats', async (req, res) => {
  try {
    const cargas = await C.findAll();
    const hoyDate = new Date();
    // Ajustar hoyStr para comparación en Colombia
    const hoyStr = hoyDate.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const mesActualStr = hoyStr.substring(0, 7);
    
    const cancelTags = ['CANCELADO POR CLIENTE', 'CANCELADO POR NEGLIGENCIA OPERATIVA', 'CANCELADO POR GERENCIA'];
    const perdidosTotal = cargas.filter(c => cancelTags.includes(c.obs_e));
    const perdidaConteo = perdidosTotal.length;
    const perdidaPorcentaje = cargas.length > 0 ? ((perdidaConteo / cargas.length) * 100).toFixed(1) : 0;
    const perdidaMesActual = perdidosTotal.filter(c => {
       const f = new Date(c.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
       return f.startsWith(mesActualStr);
    }).length;

    const despLog = {};
    cargas.forEach(c => {
      const d = c.desp || 'SIN ASIGNAR';
      const fCrea = new Date(c.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      const mCrea = fCrea.substring(0, 7);
      if(!despLog[d]) despLog[d] = { hoy:0, mes:0 };
      if(fCrea === hoyStr) despLog[d].hoy++;
      if(mCrea === mesActualStr) despLog[d].mes++;
    });

    const total = cargas.length;
    const fin = cargas.filter(c => c.f_fin).length;
    const desp = cargas.filter(c => c.placa && !c.f_fin).length;
    const ofis = {}; cargas.forEach(c => { if(c.oficina) ofis[c.oficina] = (ofis[c.oficina] || 0) + 1; });

    res.send(`<html><head><meta charset="UTF-8"><title>KPI - LOGISV20</title><script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body{background:#0f172a;color:#fff;font-family:sans-serif;margin:0;padding:25px;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #1e40af;padding-bottom:15px;}
      .btn-back{background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;}
      .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;margin-bottom:25px;}
      .card{background:#1e293b;padding:20px;border-radius:10px;border:1px solid #334155;text-align:center;}
      .card h3{margin:0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;}
      .card p{margin:10px 0 0;font-size:32px;font-weight:bold;color:#3b82f6;}
      .lost-card{border-left: 5px solid #ef4444; background: rgba(239, 68, 68, 0.05);}
      .lost-card p{color:#f87171;}
      .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin-bottom:25px;}
      .chart-box{background:#1e293b;padding:20px;border-radius:10px;border:1px solid #334155;text-align:center;}
      table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;}
      th{background:#1e40af;padding:12px;font-size:11px;text-align:center;}
      td{padding:12px;border-bottom:1px solid #334155;font-size:13px;text-align:center;}
      .badge{padding:4px 10px;border-radius:15px;font-weight:bold;font-size:12px;color:#fff;}
      .prog-wrapper{display:flex;align-items:center;justify-content:center;gap:10px;}
      .prog-bg{width:150px;background:#334155;height:12px;border-radius:6px;overflow:hidden;}
      .prog-fill{background:#10b981;height:100%;border-radius:6px;}
    </style></head>
    <body>
      <div class="header">
        <h2 style="margin:0;">TABLERO DE INDICADORES</h2>
        <a href="/" class="btn-back">VOLVER</a>
      </div>
      <div class="kpi-grid">
        <div class="card"><h3>Total Servicios</h3><p>${total}</p></div>
        <div class="card"><h3>Finalizados</h3><p style="color:#10b981">${fin}</p></div>
        <div class="card"><h3>En Ruta</h3><p style="color:#fbbf24">${desp}</p></div>
        <div class="card lost-card">
            <h3>Pérdida Emergente</h3>
            <p>${perdidaConteo} (${perdidaPorcentaje}%)</p>
            <div style="font-size:11px; margin-top:5px; color:#94a3b8;">
                Mes Actual: <b>${perdidaMesActual}</b>
            </div>
        </div>
      </div>
      <div class="charts">
        <div class="chart-box"><h4>OPERACIÓN</h4><canvas id="c1"></canvas></div>
        <div class="chart-box"><h4>OFICINAS</h4><canvas id="c2"></canvas></div>
      </div>
      <h3 style="color:#3b82f6; border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom:15px;">PRODUCTIVIDAD POR DESPACHADOR</h3>
      <table>
        <thead>
            <tr>
                <th>DESPACHADOR</th>
                <th>HOY</th>
                <th>MES</th>
                <th>PRODUCTIVIDAD (%)</th>
            </tr>
        </thead>
        <tbody>
          ${Object.entries(despLog).map(([name, s]) => {
            const prodPerc = total > 0 ? ((s.mes/total)*100).toFixed(1) : 0;
            return `
            <tr>
              <td><b>${name}</b></td>
              <td><span class="badge" style="background:#3b82f6">${s.hoy}</span></td>
              <td><span class="badge" style="background:#8b5cf6">${s.mes}</span></td>
              <td>
                <div class="prog-wrapper">
                    <div class="prog-bg"><div style="width:${prodPerc}%" class="prog-fill"></div></div>
                    <b style="color:#10b981">${prodPerc}%</b>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <script>
        new Chart(document.getElementById('c1'),{type:'doughnut',data:{labels:['Fin','Ruta','Perdida','Otros'],datasets:[{data:[${fin},${desp},${perdidaConteo},${total-fin-desp-perdidaConteo}],backgroundColor:['#10b981','#fbbf24','#ef4444','#475569'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom',labels:{color:'#fff'}}}}});
        new Chart(document.getElementById('c2'),{type:'bar',data:{labels:${JSON.stringify(Object.keys(ofis))},datasets:[{label:'Servicios',data:${JSON.stringify(Object.values(ofis))},backgroundColor:'#3b82f6'}]},options:{scales:{y:{beginAtZero:true,ticks:{color:'#fff'}},x:{ticks:{color:'#fff'}}},plugins:{legend:{display:false}}}});
      </script>
    </body></html>`);
  } catch (e) { res.send(e.message); }
});

db.sync({ alter: true }).then(() => app.listen(process.env.PORT || 3000));

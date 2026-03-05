const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONEXIÓN A LA BASE DE DATOS (NODE_VERSION 20) ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// --- MODELO CARGA (ESPEJO DE LOGISV20) ---
// Mapeamos los nombres del código a las columnas reales en MAYÚSCULAS de tu DB
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, field: 'ID' },
  oficina: { type: DataTypes.STRING, field: 'OFICINA' },
  emp_gen: { type: DataTypes.STRING, field: 'EMP_GEN' },
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  pto: { type: DataTypes.STRING, field: 'PTO' },
  do_bl: { type: DataTypes.STRING, field: 'DO_BL' },
  cli: { type: DataTypes.STRING, field: 'CLI' },
  subc: { type: DataTypes.STRING, field: 'SUBC' },
  cont: { type: DataTypes.STRING, field: 'CONT' },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  f_d: { type: DataTypes.STRING, field: 'F_D' },
  desp: { type: DataTypes.STRING, field: 'DESP' },
  f_fin: { type: DataTypes.STRING, field: 'F_FIN' },
  createdAt: { type: DataTypes.DATE, field: 'createdAt' }
}, { 
  tableName: 'Cargas', 
  timestamps: true 
});

// --- MODELO FINANZAS (TU TABLA DE CONTROL DE PAGOS) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

// Relación entre tablas
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;margin:0;padding:20px}
  .container{max-width:1400px;margin:auto}
  h1{color:#3b82f6;display:flex;align-items:center;gap:10px;margin-bottom:20px}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px;margin-bottom:25px}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;box-shadow:0 4px 6px -1px #000}
  .sc{overflow-x:auto;background:#1e293b;border-radius:12px;border:1px solid #334155}
  table{width:100%;border-collapse:collapse;font-size:11px;min-width:1300px}
  th{background:#1e40af;color:#fff;padding:12px;text-align:left;text-transform:uppercase}
  td{padding:10px;border-bottom:1px solid #334155}
  tr:hover{background:#1e3a8a44}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:10px}
  .badge{padding:4px 10px;border-radius:20px;font-weight:bold;font-size:10px}
  .pend{background:#7f1d1d;color:#fecaca}
  .pago{background:#065f46;color:#a7f3d0}
  .val-flete{color:#34d399;font-weight:bold;font-size:14px}
  #busq{padding:10px;width:300px;border-radius:6px;border:1px solid #3b82f6;background:#1e293b;color:white;margin-bottom:15px}
</style>`;

// --- RUTA PRINCIPAL (LISTADO) ---
app.get('/', async (req, res) => {
  try {
    const data = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Sincronizar automáticamente registros faltantes en Finanzas
    for (let c of data) {
      if (!c.Finanza) await Finanza.create({ cargaId: c.id });
    }

    let totalPendiente = 0;
    let filas = data.map(c => {
      const v = parseFloat(c.Finanza?.v_flete || 0);
      if(c.Finanza?.est_pago !== 'PAGADO') totalPendiente += v;
      
      return `<tr class="fila">
        <td>#${c.id}</td>
        <td><b>${c.placa || '---'}</b></td>
        <td>${c.cli || '---'}</td>
        <td>${c.subc || '---'}</td>
        <td>${c.cont || '---'}</td>
        <td>${c.pto || '---'}</td>
        <td>${c.do_bl || '---'}</td>
        <td>${c.f_d || '---'}</td>
        <td class="val-flete">$ ${v.toLocaleString()}</td>
        <td><span class="badge ${c.Finanza?.est_pago === 'PAGADO' ? 'pago' : 'pend'}">${c.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td>${c.desp || '---'}</td>
        <td><a href="/editar/${c.id}" class="btn">GESTIONAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO FINANZAS</title>${css}</head><body>
      <div class="container">
        <h1>YEGO 💰 Control de Cuentas</h1>
        <div class="kpi-grid">
          <div class="card"><small>CARTERA POR COBRAR</small><br><span style="font-size:24px;color:#34d399;font-weight:bold">$ ${totalPendiente.toLocaleString()}</span></div>
          <div class="card"><small>TOTAL SERVICIOS</small><br><span style="font-size:24px;font-weight:bold">${data.length}</span></div>
        </div>
        <input type="text" id="busq" onkeyup="buscar()" placeholder="🔍 Buscar por Placa, Cliente o ID...">
        <div class="sc">
          <table id="tabla">
            <thead>
              <tr>
                <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>SUBCLIENTE</th><th>CONTENEDOR</th><th>PUERTO</th><th>DO/BL</th><th>F. DESPACHO</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
      <script>
        function buscar(){
          let f = document.getElementById("busq").value.toUpperCase();
          let rows = document.querySelectorAll(".fila");
          rows.forEach(r => {
            r.style.display = r.innerText.toUpperCase().includes(f) ? "" : "none";
          });
        }
      </script>
    </body></html>`);
  } catch (err) {
    res.status(500).send(`<h2>Error de Sincronización</h2><p>Detalle: ${err.message}</p>`);
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:450px;margin-top:50px">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="margin-top:0">Gestionar #${f.cargaId}</h2>
      <p style="color:#94a3b8;font-size:13px"><b>Placa:</b> ${f.Carga?.placa}<br><b>Cliente:</b> ${f.Carga?.cli}</p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:11px;color:#94a3b8">VALOR DEL FLETE</label>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#10b981;border:1px solid #334155;border-radius:8px;font-size:18px;font-weight:bold">
        
        <label style="font-size:11px;color:#94a3b8">ESTADO DE PAGO</label>
        <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>

        <label style="font-size:11px;color:#94a3b8">OBSERVACIONES</label>
        <textarea name="obs_fin" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px" rows="3">${f.obs_fin || ''}</textarea>
        
        <button type="submit" class="btn" style="width:100%;padding:15px;margin-top:10px;font-size:14px;cursor:pointer">GUARDAR CAMBIOS</button>
        <a href="/" style="display:block;text-align:center;margin-top:15px;color:#64748b;text-decoration:none;font-size:12px">Volver</a>
      </form>
    </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

// --- INICIO ---
const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("Finanzas YEGO en línea")));

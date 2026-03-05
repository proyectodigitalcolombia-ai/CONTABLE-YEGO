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

// --- MODELO CARGA (ESPEJO EXACTO DE LOGISV20) ---
// Usamos "field" para forzar la búsqueda en MAYÚSCULAS y evitar el "column does not exist"
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
  f_fin: { type: DataTypes.STRING, field: 'F_FIN' }
}, { 
  tableName: 'Cargas', 
  timestamps: true 
});

// --- MODELO FINANZAS (TU NUEVA TABLA CONTABLE) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

// Relación entre logística y finanzas
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- DISEÑO VISUAL (CSS) ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:'Segoe UI',sans-serif;margin:0;padding:20px}
  .container{max-width:1400px;margin:auto}
  h1{color:#3b82f6;border-bottom:2px solid #1e40af;padding-bottom:10px;display:flex;align-items:center;gap:10px}
  .kpi-card{background:#1e293b;padding:20px;border-radius:12px;border-left:5px solid #10b981;margin-bottom:20px;box-shadow:0 4px 6px -1px #000}
  .table-wrapper{overflow-x:auto;background:#1e293b;border-radius:12px;border:1px solid #334155}
  table{width:100%;border-collapse:collapse;font-size:12px;min-width:1200px}
  th{background:#1e40af;color:#fff;padding:12px;text-align:left;text-transform:uppercase}
  td{padding:10px;border-bottom:1px solid #334155}
  tr:hover{background:#1e3a8a44}
  .badge{padding:4px 10px;border-radius:20px;font-weight:bold;font-size:10px}
  .pend{background:#7f1d1d;color:#fecaca}
  .pago{background:#065f46;color:#a7f3d0}
  .btn{background:#2563eb;color:white;padding:8px 15px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:11px}
  .flete-total{color:#10b981;font-weight:bold;font-size:18px}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const servicios = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Sincronización automática: si no existe en finanzas, lo crea
    for (let s of servicios) {
      if (!s.Finanza) await Finanza.create({ cargaId: s.id });
    }

    let totalCartera = 0;
    let filas = servicios.map(s => {
      const valor = parseFloat(s.Finanza?.v_flete || 0);
      totalCartera += valor;
      const claseEstado = s.Finanza?.est_pago === 'PAGADO' ? 'pago' : 'pend';
      
      return `<tr>
        <td>#${s.id}</td>
        <td><b>${s.placa || '---'}</b></td>
        <td>${s.cli || '---'}</td>
        <td>${s.subc || '---'}</td>
        <td>${s.cont || '---'}</td>
        <td>${s.pto || '---'}</td>
        <td>${s.do_bl || '---'}</td>
        <td>${s.f_d || '---'}</td>
        <td class="flete-total">$ ${valor.toLocaleString()}</td>
        <td><span class="badge ${claseEstado}">${s.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td>${s.desp || '---'}</td>
        <td><a href="/editar/${s.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO FINANZAS</title>${css}</head><body>
      <div class="container">
        <h1>YEGO 💰 Control Financiero</h1>
        <div class="kpi-card">
          <small style="color:#94a3b8">CARTERA TOTAL PENDIENTE</small><br>
          <span style="font-size:32px;font-weight:bold;color:#10b981">$ ${totalCartera.toLocaleString()}</span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>SUBCLIENTE</th><th>CONTENEDOR</th><th>PUERTO</th><th>DO/BL</th><th>FECHA DESP.</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
    </body></html>`);
  } catch (err) {
    res.status(500).send(`<h2>Error de Sincronización</h2><p>${err.message}</p>`);
  }
});

// --- RUTA EDITAR (FORMULARIO) ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:450px;margin-top:50px">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="margin-top:0">Liquidar Servicio #${f.cargaId}</h2>
      <p style="color:#94a3b8;font-size:13px">
        <b>Cliente:</b> ${f.Carga?.cli}<br>
        <b>Placa:</b> ${f.Carga?.placa}
      </p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:11px;color:#94a3b8">VALOR DEL FLETE</label>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#10b981;border:1px solid #334155;border-radius:8px;font-size:20px;font-weight:bold">
        
        <label style="font-size:11px;color:#94a3b8">ESTADO DE PAGO</label>
        <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>

        <label style="font-size:11px;color:#94a3b8">NOTAS</label>
        <textarea name="obs_fin" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px" rows="3">${f.obs_fin || ''}</textarea>
        
        <button type="submit" class="btn" style="width:100%;padding:15px;margin-top:10px;font-size:14px">GUARDAR LIQUIDACIÓN</button>
        <a href="/" style="display:block;text-align:center;margin-top:15px;color:#64748b;text-decoration:none;font-size:12px">Volver al listado</a>
      </form>
    </div></div></body></html>`);
});

// --- RUTA GUARDAR ---
app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log(`🚀 Finanzas YEGO corriendo en puerto ${PORT}`));
});

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE BASE DE DATOS (DATABASE_URL de Render) ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// --- MODELO 1: CARGAS (Espejo de tu plataforma operativa) ---
const Carga = db.define('Carga', {
  cli: DataTypes.STRING,
  placa: DataTypes.STRING,
  cont: DataTypes.STRING,
  orig: DataTypes.STRING,
  dest: DataTypes.STRING,
  est_real: DataTypes.STRING
}, { tableName: 'Cargas' });

// --- MODELO 2: YEGO FINANZAS (Tabla propia de este módulo) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_descuentos: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs: DataTypes.TEXT
}, { tableName: 'Yego_Finanzas' });

// Relación entre tablas
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS (Inyectados para no usar archivos extra) ---
const css = `<style>
  body { background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3b82f6; padding-bottom:10px; margin-bottom:20px; }
  .card-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:20px; }
  .card { background:#1e293b; padding:15px; border-radius:8px; border:1px solid #334155; text-align:center; }
  .card h3 { font-size:12px; color:#94a3b8; margin:0; }
  .card p { font-size:20px; font-weight:bold; margin:10px 0 0; color:#34d399; }
  table { width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden; }
  th { background:#334155; color:#94a3b8; padding:12px; text-align:left; font-size:12px; }
  td { padding:12px; border-bottom:1px solid #334155; font-size:13px; }
  .btn { background:#2563eb; color:white; padding:6px 12px; border-radius:4px; text-decoration:none; font-weight:bold; font-size:11px; }
  .status { padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold; }
</style>`;

// --- RUTA PRINCIPAL (DASHBOARD) ---
app.get('/', async (req, res) => {
  try {
    // 1. Buscamos cargas que ya tengan placa asignada
    const despachos = await Carga.findAll({
      where: { placa: { [Op.ne]: null } },
      include: [Finanza],
      order: [['createdAt', 'DESC']]
    });

    // 2. Sincronización automática de registros financieros
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    // 3. Cálculos de KPIs
    let totalFlete = 0, totalSaldos = 0;
    despachos.forEach(d => {
      totalFlete += parseFloat(d.Finanza?.v_flete || 0);
      totalSaldos += parseFloat(d.Finanza?.v_saldo || 0);
    });

    // 4. Construcción de filas de tabla
    let rows = despachos.map(d => `
      <tr>
        <td>${d.id}</td>
        <td><b>${d.placa}</b></td>
        <td>${d.cli}</td>
        <td>$ ${parseFloat(d.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td>$ ${parseFloat(d.Finanza?.v_saldo || 0).toLocaleString()}</td>
        <td><span class="status" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#991b1b'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">GESTIONAR</a></td>
      </tr>
    `).join('');

    res.send(`<html><head><title>YEGO - Contabilidad</title>${css}</head><body>
      <div class="header">
        <h1>YEGO | Finanzas de Transporte</h1>
        <span style="color:#94a3b8">Módulo Independiente</span>
      </div>
      <div class="card-grid">
        <div class="card"><h3>VENTAS TOTALES</h3><p>$ ${totalFlete.toLocaleString()}</p></div>
        <div class="card"><h3>CARTERA POR COBRAR</h3><p style="color:#fbbf24">$ ${totalSaldos.toLocaleString()}</p></div>
        <div class="card"><h3>SERVICIOS</h3><p style="color:#3b82f6">${despachos.length}</p></div>
      </div>
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>SALDO</th><th>ESTADO</th><th>ACCION</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
  } catch (err) { res.send("Error de conexión: " + err.message); }
});

// --- RUTA: FORMULARIO DE EDICIÓN ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body>
    <div style="max-width:500px; margin:50px auto; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #3b82f6">
      <h2>Liquidar Placa: ${f.Carga.placa}</h2>
      <form action="/guardar/${f.cargaId}" method="POST" style="display:flex; flex-direction:column; gap:15px">
        <label>Valor Flete:</label>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="padding:8px; border-radius:4px; border:none">
        <label>Anticipo:</label>
        <input type="number" name="v_anticipo" value="${f.v_anticipo}" step="0.01" style="padding:8px; border-radius:4px; border:none">
        <label>Estado:</label>
        <select name="est_pago" style="padding:8px; border-radius:4px;">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="padding:12px; font-size:14px">GUARDAR EN YEGO</button>
        <a href="/" style="color:#94a3b8; text-align:center; text-decoration:none; font-size:12px">Volver</a>
      </form>
    </div>
  </body></html>`);
});

// --- RUTA: GUARDAR DATOS ---
app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo, est_pago } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.update({ v_flete, v_anticipo, v_saldo, est_pago }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

// --- CONEXIÓN A DB (Usando tu DATABASE_URL de Render) ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false // Para limpiar la consola
});

// --- MODELO 1: CARGAS (Ajustado para evitar errores de nombres de columna) ---
// Nota: Sequelize por defecto busca "cli", "placa", etc. 
// Si en tu tabla original se llaman diferente, cámbialos aquí abajo.
const Carga = db.define('Carga', {
  cli: { type: DataTypes.STRING, field: 'cli' },       // Prueba con 'cliente' si falla
  placa: { type: DataTypes.STRING, field: 'placa' },
  cont: { type: DataTypes.STRING, field: 'cont' },
  orig: { type: DataTypes.STRING, field: 'orig' },
  dest: { type: DataTypes.STRING, field: 'dest' },
  est_real: { type: DataTypes.STRING, field: 'est_real' }
}, { 
  tableName: 'Cargas', // Asegúrate que tu tabla principal se llame 'Cargas'
  timestamps: true 
});

// --- MODELO 2: YEGO FINANZAS (Tabla propia de este módulo) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS ---
const css = `<style>
  body { background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3b82f6; padding-bottom:10px; margin-bottom:20px; }
  .card-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:20px; }
  .card { background:#1e293b; padding:15px; border-radius:8px; border:1px solid #334155; text-align:center; border-top: 4px solid #3b82f6; }
  .card h3 { font-size:10px; color:#94a3b8; margin:0; text-transform:uppercase; }
  .card p { font-size:22px; font-weight:bold; margin:10px 0 0; color:#34d399; }
  table { width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden; }
  th { background:#334155; color:#94a3b8; padding:12px; text-align:left; font-size:11px; }
  td { padding:12px; border-bottom:1px solid #334155; font-size:13px; }
  .btn { background:#2563eb; color:white; padding:6px 12px; border-radius:4px; text-decoration:none; font-weight:bold; font-size:11px; display:inline-block; }
  .status { padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold; }
  input, select { width:100%; padding:10px; border-radius:4px; border:1px solid #334155; background:#0f172a; color:white; margin-top:5px; }
</style>`;

// --- RUTA PRINCIPAL (DASHBOARD) ---
app.get('/', async (req, res) => {
  try {
    // Buscamos solo cargas que ya tengan placa
    const despachos = await Carga.findAll({
      where: { placa: { [Op.ne]: null } },
      include: [Finanza],
      order: [['createdAt', 'DESC']]
    });

    // Crear registro financiero si no existe para la carga
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let totalFlete = 0, totalSaldos = 0;
    despachos.forEach(d => {
      totalFlete += parseFloat(d.Finanza?.v_flete || 0);
      totalSaldos += parseFloat(d.Finanza?.v_saldo || 0);
    });

    let rows = despachos.map(d => `
      <tr>
        <td>#${d.id}</td>
        <td><b>${d.placa || 'SIN PLACA'}</b></td>
        <td>${d.cli || 'N/A'}</td>
        <td style="color:#34d399">$ ${parseFloat(d.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td style="color:#fbbf24">$ ${parseFloat(d.Finanza?.v_saldo || 0).toLocaleString()}</td>
        <td><span class="status" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#991b1b'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>
    `).join('');

    res.send(`<html><head><title>YEGO - Finanzas</title>${css}</head><body>
      <div class="header">
        <h1 style="margin:0; color:#3b82f6">YEGO 💰</h1>
        <div style="text-align:right"><small style="color:#94a3b8">Logística Contable</small></div>
      </div>
      <div class="card-grid">
        <div class="card"><h3>Fletamento Total</h3><p>$ ${totalFlete.toLocaleString()}</p></div>
        <div class="card" style="border-top-color:#fbbf24"><h3>Cartera Pendiente</h3><p style="color:#fbbf24">$ ${totalSaldos.toLocaleString()}</p></div>
        <div class="card" style="border-top-color:#8b5cf6"><h3>Viajes</h3><p style="color:#8b5cf6">${despachos.length}</p></div>
      </div>
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>SALDO</th><th>ESTADO</th><th>ACCION</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
  } catch (err) { 
    res.send(`<h2>Error de Base de Datos</h2><p style="color:red">${err.message}</p><p>Verifica si la columna 'cli' existe en tu tabla 'Cargas'.</p>`); 
  }
});

// --- RUTA: FORMULARIO DE EDICIÓN ---
app.get('/editar/:id', async (req, res) => {
  try {
    const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
    res.send(`<html><head><title>YEGO - Editar</title>${css}</head><body>
      <div style="max-width:400px; margin:40px auto; background:#1e293b; padding:25px; border-radius:12px; border:1px solid #3b82f6">
        <h2 style="color:#3b82f6; margin-top:0">Liquidar Placa: ${f.Carga.placa}</h2>
        <form action="/guardar/${f.cargaId}" method="POST">
          <label>Valor Flete:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01">
          <br><br>
          <label>Anticipo:</label>
          <input type="number" name="v_anticipo" value="${f.v_anticipo}" step="0.01">
          <br><br>
          <label>Estado:</label>
          <select name="est_pago">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" class="btn" style="width:100%; padding:12px; margin-top:20px; cursor:pointer">GUARDAR</button>
          <p style="text-align:center"><a href="/" style="color:#94a3b8; font-size:12px; text-decoration:none">Volver</a></p>
        </form>
      </div>
    </body></html>`);
  } catch (e) { res.send(e.message); }
});

// --- RUTA: GUARDAR ---
app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo, est_pago } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.update({ v_flete, v_anticipo, v_saldo, est_pago }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

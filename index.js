const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

// --- CONEXIÓN A LA BASE DE DATOS ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELO CARGAS (TABLA OPERATIVA EXISTENTE) ---
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: 'ID' // Corrige el error: column Carga.ID does not exist
  },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  cont: { type: DataTypes.STRING, field: 'CONTENEDOR' },
  empresa: { type: DataTypes.STRING, field: 'EMPRESA' }, // Corrige el "N/A"
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  puerto: { type: DataTypes.STRING, field: 'PUERTO' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// --- MODELO FINANZAS (TU TABLA DE CONTROL) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;}
  .container{max-width:1200px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;}
  th,td{padding:12px;border-bottom:1px solid #334155;text-align:left;}
  th{background:#334155;color:#94a3b8;text-transform:uppercase;font-size:11px;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;display:inline-block;margin-bottom:20px;}
  .btn{background:#2563eb;color:white;padding:8px 15px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;}
  .status{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;}
  .pendiente{background:#7f1d1d; color:#fecaca;}
  .pagado{background:#065f46; color:#a7f3d0;}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Auto-crear registro financiero si no existe
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let total = 0;
    let rows = despachos.map(d => {
      const v = parseFloat(d.Finanza?.v_flete || 0);
      total += v;
      return `<tr>
        <td>#${d.id}</td>
        <td><b>${d.placa || '--'}</b></td>
        <td>${d.cont || '--'}</td>
        <td>${d.empresa || 'N/A'}</td>
        <td style="color:#34d399; font-weight:bold;">$ ${v.toLocaleString()}</td>
        <td><span class="status ${d.Finanza?.est_pago === 'PAGADO' ? 'pagado' : 'pendiente'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO Finanzas</title>${css}</head><body><div class="container">
      <h1>YEGO 💰 Finanzas</h1>
      <div class="card"><h3>Total Cartera</h3><p style="font-size:24px;color:#34d399;margin:0;">$ ${total.toLocaleString()}</p></div>
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CONT</th><th>EMPRESA</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCION</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></body></html>`);
  } catch (err) {
    res.send(`<h2>Error de Sincronización</h2><p>Detalle técnico: ${err.message}</p>`);
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:400px;margin-top:50px;">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2>Liquidar #${f.cargaId}</h2>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="color:#94a3b8;font-size:12px;">VALOR FLETE</label>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;">
        <label style="color:#94a3b8;font-size:12px;">ESTADO</label>
        <select name="est_pago" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="width:100%;padding:12px;margin-top:10px;cursor:pointer;">GUARDAR CAMBIOS</button>
      </form>
    </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

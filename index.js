const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELOS ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING }
}, { tableName: 'Cargas', timestamps: false });

const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;}
  .container{max-width:1100px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;}
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;border:none;cursor:pointer;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:200px;text-align:center;}
  .status{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;background:#7f1d1d;}
  .status.pagado{background:#065f46;}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Sincronizar registros financieros
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
        <td style="color:#34d399; font-weight:bold">$ ${v.toLocaleString()}</td>
        <td><span class="status ${d.Finanza?.est_pago === 'PAGADO' ? 'pagado' : ''}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO</title>${css}</head><body><div class="container">
      <h1 style="color:#3b82f6">YEGO 💰 Finanzas</h1>
      <div class="card"><h3>Total Facturado</h3><p style="font-size:24px; color:#34d399">$ ${total.toLocaleString()}</p></div>
      <table><thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead><tbody>${rows}</tbody></table>
    </div></body></html>`);
  } catch (err) { res.send(err.message); }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:400px; margin-top:50px;">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="color:#3b82f6">Liquidación #${f.cargaId}</h2>
      <p>Placa: <b>${f.Carga.placa}</b></p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:12px; color:#94a3b8">VALOR FLETE</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:18px;">
        <label style="font-size:12px; color:#94a3b8">ESTADO</label><br>
        <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:6px;">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="width:100%;padding:15px;">GUARDAR CAMBIOS</button>
        <br><br><a href="/" style="color:#94a3b8; text-decoration:none; font-size:12px;">← Volver</a>
      </form>
    </div></div></body></html>`);
});

// --- RUTA GUARDAR ---
app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

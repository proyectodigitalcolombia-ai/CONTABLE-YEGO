const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELO: CARGAS (Añadimos Empresa y Estado Real) ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING },
  empresa: { type: DataTypes.STRING }, // Columna nueva
  est_real: { type: DataTypes.STRING }, // Columna nueva
  f_act: { type: DataTypes.STRING }     // Columna nueva
}, { tableName: 'Cargas', timestamps: false });

const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;margin:0;}
  .container{max-width:1250px;margin:auto;}
  .header-flex{display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;font-size:13px;}
  th,td{padding:12px 15px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;text-transform:uppercase; font-size:11px;}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:6px;font-size:11px;font-weight:bold;border:none;cursor:pointer;}
  .card{background:#1e293b;padding:15px 25px;border-radius:12px;border-top:4px solid #3b82f6;text-align:center;}
  .status{padding:3px 8px;border-radius:12px;font-size:10px;font-weight:bold;}
  .badge-log{background:#475569; color:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:11px;}
</style>`;

app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let total = 0;
    let rows = despachos.map(d => {
      const v = parseFloat(d.Finanza?.v_flete || 0);
      total += v;
      return `<tr>
        <td><span style="color:#64748b">#${d.id}</span></td>
        <td><b style="color:#fff; font-size:15px">${d.placa || '--'}</b></td>
        <td>${d.cont || '--'}</td>
        <td><span class="badge-log">${d.empresa || 'N/A'}</span></td>
        <td style="font-size:11px; color:#94a3b8">${d.est_real || 'S/D'}</td>
        <td style="color:#34d399; font-weight:bold; font-size:15px">$ ${v.toLocaleString()}</td>
        <td><span class="status" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO MASTER</title>${css}</head><body><div class="container">
      <div class="header-flex">
        <h1 style="color:#3b82f6">YEGO 💰 <small style="color:#94a3b8">Control Total</small></h1>
        <div class="card"><h3>Total Cartera</h3><p style="font-size:24px; color:#34d399; margin:0;">$ ${total.toLocaleString()}</p></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>PLACA</th>
            <th>CONTENEDOR</th>
            <th>EMPRESA</th>
            <th>ESTADO LOGÍSTICO</th>
            <th>VALOR FLETE</th>
            <th>PAGO</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div></body></html>`);
  } catch (err) { res.send(err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:450px; margin-top:50px;">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="color:#3b82f6; margin-bottom:5px;">Liquidar #${f.cargaId}</h2>
      <p style="margin-bottom:20px; color:#94a3b8;">${f.Carga.empresa} | ${f.Carga.placa}</p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:12px; color:#94a3b8">VALOR DEL FLETE ACORDADO</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:20px; font-weight:bold;">
        <label style="font-size:12px; color:#94a3b8">ESTADO DEL PAGO</label><br>
        <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:6px;">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="width:100%;padding:15px; font-size:14px;">GUARDAR EN CONTABILIDAD</button>
        <p style="text-align:center;"><a href="/" style="color:#64748b; text-decoration:none; font-size:12px;">Cancelar</a></p>
      </form>
    </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

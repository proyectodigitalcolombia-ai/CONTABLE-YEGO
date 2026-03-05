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

// --- MODELO: CARGAS (Conectando a tu tabla real) ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING },
  est_real: { type: DataTypes.STRING }
}, { 
  tableName: 'Cargas', // Sequelize suele usar mayúscula inicial por defecto
  timestamps: true 
});

// --- MODELO: YEGO FINANZAS (Nuestra tabla de cobros) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;margin:0;} 
  .container{max-width:1100px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;} 
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;} 
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:220px;text-align:center;}
  .status{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;}
</style>`;

app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });

    if (!despachos || despachos.length === 0) {
      return res.send(`<html><head>${css}</head><body><div class="container"><h1>YEGO 💰</h1><p>Conectado a logistica_v20, pero no se encontraron registros en la tabla 'Cargas'.</p></div></body></html>`);
    }

    // Crear registros financieros para los viajes que no los tengan
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let totalCaja = 0;
    let rows = despachos.map(d => {
      const flete = parseFloat(d.Finanza?.v_flete || 0);
      totalCaja += flete;
      return `<tr>
        <td>#${d.id}</td>
        <td><b style="color:#fff; font-size:16px">${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td style="color:#34d399; font-weight:bold; font-size:15px">$ ${flete.toLocaleString()}</td>
        <td><span class="status" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO FINANZAS</title>${css}</head><body><div class="container">
      <h1 style="color:#3b82f6">YEGO 💰 <small style="color:#94a3b8; font-size:14px">Control Contable</small></h1>
      <div class="card"><h3>Cartera Total</h3><p style="font-size:24px; color:#34d399">$ ${totalCaja.toLocaleString()}</p></div>
      <table><thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead><tbody>${rows}</tbody></table>
    </div></body></html>`);
  } catch (err) { res.send(`Error: ${err.message}`); }
});

app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:400px; margin-top:50px;">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="color:#3b82f6">Liquidar ID #${f.cargaId}</h2>
      <p><b>Placa:</b> ${f.Carga.placa}</p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="color:#94a3b8; font-size:12px;">VALOR FLETE TOTAL</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:8px 0 20px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:18px;font-weight:bold;">
        <label style="color:#94a3b8; font-size:12px;">ESTADO DE PAGO</label><br>
        <select name="est_pago" style="width:100%;padding:12px;margin:8px 0 20px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:6px;">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="width:100%;padding:15px;cursor:pointer">GUARDAR LIQUIDACIÓN</button>
      </form>
    </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete, est_pago } = req.body;
  await Finanza.update({ v_flete, est_pago }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

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

// --- MODELO 1: CARGAS (Ajuste de nombres de tabla y columnas) ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING },
  est_real: { type: DataTypes.STRING },
  f_act: { type: DataTypes.STRING }
}, { 
  tableName: 'Cargas', // Si falla, probaremos con 'cargas' en minúscula
  timestamps: true 
});

// --- MODELO 2: YEGO FINANZAS ---
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
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;} 
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;} 
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;} 
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:220px;text-align:center;}
</style>`;

app.get('/', async (req, res) => {
  try {
    // Buscamos todas las cargas. Si la tabla está vacía, mostrará el mensaje de error.
    const despachos = await Carga.findAll({ include: [Finanza] });

    if (despachos.length === 0) {
      return res.send(`<html><head>${css}</head><body><h1>YEGO 💰</h1><p>Conectado, pero no hay datos en la tabla 'Cargas'. Asegúrate de haber registrado viajes en tu plataforma logística.</p></body></html>`);
    }

    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let totalCaja = 0;
    let rows = despachos.map(d => {
      const flete = parseFloat(d.Finanza?.v_flete || 0);
      totalCaja += flete;
      return `<tr>
        <td>#${d.id}</td>
        <td><b>${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td>${d.f_act || '---'}</td>
        <td style="color:#34d399; font-weight:bold">$ ${flete.toLocaleString()}</td>
        <td>${d.Finanza?.est_pago || 'PENDIENTE'}</td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO</title>${css}</head><body>
      <h1>YEGO 💰 Finanzas</h1>
      <div class="card"><h3>Total Facturado</h3><p style="font-size:24px; color:#34d399">$ ${totalCaja.toLocaleString()}</p></div>
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>FECHA</th><th>FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
  } catch (err) { 
    res.send(`<h2>Error de sincronización</h2><p>${err.message}</p>`); 
  }
});

app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body>
    <div style="max-width:400px;margin:40px auto;background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2>Placa: ${f.Carga.placa}</h2>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label>VALOR FLETE</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
        <label>ANTICIPO</label><input type="number" name="v_anticipo" value="${f.v_anticipo}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
        <label>ESTADO</label><select name="est_pago" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" class="btn" style="width:100%;padding:15px;cursor:pointer">GUARDAR</button>
      </form>
    </div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo, est_pago } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.update({ v_flete, v_anticipo, v_saldo, est_pago }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

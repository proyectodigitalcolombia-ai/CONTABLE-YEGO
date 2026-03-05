const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

// --- CONEXIÓN A DB ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELO 1: CARGAS (Ajustado a tu tabla real) ---
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  placa: { type: DataTypes.STRING },
  cont: { type: DataTypes.STRING },
  est_real: { type: DataTypes.STRING },
  f_act: { type: DataTypes.STRING }
}, { 
  tableName: 'cargas', // En minúsculas para que coincida con Render/Postgres
  timestamps: false    // Desactivado porque tu tabla original no usa createdAt/updatedAt
});

// --- MODELO 2: YEGO FINANZAS (Nuestra tabla de cobros) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_saldo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { 
  tableName: 'yego_finanzas',
  timestamps: true 
});

// Relaciones
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px;margin:0;} 
  .container{max-width:1100px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;margin-top:20px;box-shadow:0 4px 15px rgba(0,0,0,0.3);} 
  th,td{padding:15px;border-bottom:1px solid #334155; text-align:left;} 
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block;}
  .card-grid{display:flex;gap:20px;margin-bottom:20px;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;flex:1;text-align:center;}
  .status-tag{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    // Traemos todos los registros de la tabla cargas
    const despachos = await Carga.findAll({
      include: [Finanza],
      order: [['id', 'DESC']]
    });

    // Si no hay nada, avisamos
    if (!despachos || despachos.length === 0) {
      return res.send(`<html><head>${css}</head><body><div class="container"><h1>YEGO 💰</h1><p>No se encontraron datos en la tabla 'cargas'. Verifica que tengas viajes creados en tu otra plataforma.</p></div></body></html>`);
    }

    // Crear registro financiero si falta
    for (let d of despachos) {
      if (!d.Finanza) {
        await Finanza.create({ cargaId: d.id });
      }
    }

    let totalFlete = 0;
    let rows = despachos.map(d => {
      const flete = parseFloat(d.Finanza?.v_flete || 0);
      totalFlete += flete;
      return `<tr>
        <td>#${d.id}</td>
        <td><b style="color:#fff; font-size:15px">${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td style="color:#34d399; font-weight:bold">$ ${flete.toLocaleString()}</td>
        <td><span class="status-tag" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO FINANZAS</title>${css}</head><body>
      <div class="container">
        <h1 style="color:#3b82f6">YEGO 💰 <small style="color:#94a3b8; font-size:14px">Finanzas</small></h1>
        <div class="card-grid">
          <div class="card"><h3>Total Flete</h3><p style="font-size:24px; color:#34d399">$ ${totalFlete.toLocaleString()}</p></div>
          <div class="card" style="border-top-color:#8b5cf6"><h3>Viajes</h3><p style="font-size:24px; color:#8b5cf6">${despachos.length}</p></div>
        </div>
        <table>
          <thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </body></html>`);
  } catch (err) { 
    res.send(`<h2>Error de Base de Datos</h2><p>${err.message}</p>`); 
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  try {
    const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
    res.send(`<html><head>${css}</head><body>
      <div style="max-width:400px;margin:40px auto;background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
        <h2 style="color:#3b82f6">Liquidar Placa: ${f.Carga.placa}</h2>
        <form action="/guardar/${f.cargaId}" method="POST">
          <label>VALOR FLETE</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:18px">
          <br><label>ANTICIPO</label><br>
          <input type="number" name="v_anticipo" value="${f.v_anticipo}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#fbbf24;border:1px solid #334155;border-radius:6px">
          <br><label>ESTADO</label><br>
          <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" class="btn" style="width:100%;padding:15px;cursor:pointer">GUARDAR CAMBIOS</button>
        </form>
      </div></body></html>`);
  } catch (e) { res.send(e.message); }
});

// --- RUTA GUARDAR ---
app.post('/guardar/:id', async (req, res) => {
  const { v_flete, v_anticipo, est_pago } = req.body;
  const v_saldo = parseFloat(v_flete) - parseFloat(v_anticipo);
  await Finanza.update({ v_flete, v_anticipo, v_saldo, est_pago }, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log("YEGO Online"));
});

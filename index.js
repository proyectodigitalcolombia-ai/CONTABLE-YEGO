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

// --- MODELO CON NOMBRES DE COLUMNA EXACTOS ---
// PostgreSQL es sensible a mayúsculas y espacios si se crearon con comillas
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, field: 'ID' },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  cont: { type: DataTypes.STRING, field: 'CONTENEDOR' },
  empresa: { type: DataTypes.STRING, field: 'EMPRESA' }, 
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  puerto: { type: DataTypes.STRING, field: 'PUERTO' },
  // Si la columna tiene espacio en la DB, se pone exactamente así:
  fecha: { type: DataTypes.STRING, field: 'FECHA REGISTRO' } 
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
  .container{max-width:1300px;margin:auto;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;font-size:12px;margin-top:20px;}
  th,td{padding:12px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;text-transform:uppercase; font-size:10px;}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:6px;font-size:11px;font-weight:bold;display:inline-block;}
  .card{background:#1e293b;padding:15px 25px;border-radius:12px;border-top:4px solid #3b82f6;display:inline-block;}
  .status{padding:3px 8px;border-radius:12px;font-size:10px;font-weight:bold;}
  .badge{background:#0f172a; padding:4px 8px; border-radius:6px; color:#3b82f6; font-weight:bold; border:1px solid #334155;}
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
        <td><b style="color:#fff; font-size:14px">${d.placa || '--'}</b></td>
        <td>${d.cont || '--'}</td>
        <td><span class="badge">${d.empresa || 'N/A'}</span></td>
        <td>${d.comercial || '--'}</td>
        <td>${d.puerto || '--'}</td>
        <td style="color:#34d399; font-weight:bold; font-size:14px">$ ${v.toLocaleString()}</td>
        <td><span class="status" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO MASTER</title>${css}</head><body><div class="container">
      <h1 style="color:#3b82f6">YEGO 💰 Finanzas</h1>
      <div class="card"><h3>Cartera Total</h3><p style="font-size:24px; color:#34d399; margin:0;">$ ${total.toLocaleString()}</p></div>
      <table>
        <thead><tr>
          <th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>EMPRESA</th><th>COMERCIAL</th><th>PUERTO</th><th>VALOR FLETE</th><th>PAGO</th><th>ACCIÓN</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></body></html>`);
  } catch (err) { 
    res.send(`<h2>Error de Datos</h2><p>${err.message}</p>`); 
  }
});

// --- LAS RUTAS DE EDITAR Y GUARDAR SE MANTIENEN IGUAL ---
app.get('/editar/:id', async (req, res) => {
    const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
    res.send(`<html><head>${css}</head><body><div class="container" style="max-width:400px; margin-top:50px;">
      <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
        <h2 style="color:#3b82f6">Liquidar #${f.cargaId}</h2>
        <p style="color:#94a3b8">Placa: ${f.Carga.placa} | Cliente: ${f.Carga.empresa}</p>
        <form action="/guardar/${f.cargaId}" method="POST">
          <label style="font-size:11px; color:#94a3b8">VALOR FLETE</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:18px;">
          <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:6px;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" class="btn" style="width:100%;padding:15px; margin-top:10px;">ACTUALIZAR FLETE</button>
        </form>
      </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("YEGO Online")));

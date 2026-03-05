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

// --- MODELO 1: CARGAS (Solo con lo que hay en tu DB real) ---
const Carga = db.define('Carga', {
  placa: { type: DataTypes.STRING, field: 'placa' },
  cont: { type: DataTypes.STRING, field: 'cont' },
  est_real: { type: DataTypes.STRING, field: 'est_real' },
  f_act: { type: DataTypes.STRING, field: 'f_act' }
}, { 
  tableName: 'Cargas', 
  timestamps: true 
});

// --- MODELO 2: YEGO FINANZAS (Nuestra tabla de cobros) ---
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
  th{background:#334155;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
  .btn{background:#2563eb;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block;}
  .card{background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);padding:20px;border-radius:12px;border:1px solid #334155;border-top:4px solid #3b82f6;margin-bottom:20px;display:inline-block;min-width:220px;text-align:center;}
  .status-tag{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;text-transform:uppercase;}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({
      where: { placa: { [Op.ne]: null } },
      include: [Finanza],
      order: [['createdAt', 'DESC']]
    });

    // Asegurar que cada carga tenga su registro financiero
    for (let d of despachos) {
      if (!d.Finanza) await Finanza.create({ cargaId: d.id });
    }

    let totalCaja = 0;
    let rows = despachos.map(d => {
      const flete = parseFloat(d.Finanza?.v_flete || 0);
      totalCaja += flete;
      return `
      <tr>
        <td><span style="color:#94a3b8">#${d.id}</span></td>
        <td><b style="font-size:16px; color:#fff">${d.placa}</b></td>
        <td>${d.cont || '---'}</td>
        <td>${d.f_act || 'Sin fecha'}</td>
        <td style="color:#34d399; font-weight:bold; font-size:15px">$ ${flete.toLocaleString()}</td>
        <td><span class="status-tag" style="background:${d.Finanza?.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO FINANZAS</title>${css}</head><body>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h1 style="color:#3b82f6; margin:0">YEGO 💰 <small style="color:#94a3b8; font-size:14px">Finanzas</small></h1>
      </div>
      <br>
      <div class="card"><h3>Total Facturado</h3><p style="font-size:24px; color:#34d399; margin:5px 0">$ ${totalCaja.toLocaleString()}</p></div>
      <div class="card" style="border-top-color:#8b5cf6"><h3>Viajes Activos</h3><p style="font-size:24px; color:#8b5cf6; margin:5px 0">${despachos.length}</p></div>
      
      <table>
        <thead><tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>ACTUALIZACIÓN</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
  } catch (err) { res.send(`<h2 style="color:red">Error</h2><p>${err.message}</p>`); }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body>
    <div style="max-width:400px;margin:40px auto;background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6;box-shadow: 0 10px 25px rgba(0,0,0,0.5)">
      <h2 style="color:#3b82f6;margin-top:0">Liquidar Placa: ${f.Carga.placa}</h2>
      <p style="color:#94a3b8">Contenedor: ${f.Carga.cont || 'No registrado'}</p>
      <hr style="border:0;border-top:1px solid #334155;margin:20px 0">
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:12px; color:#94a3b8">VALOR TOTAL FLETE</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:8px 0 20px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:6px;font-size:18px;font-weight:bold">
        
        <label style="font-size:12px; color:#94a3b8">ANTICIPO ENTREGADO</label><br>
        <input type="number" name="v_anticipo" value="${f.v_anticipo}" step="0.01" style="width:100%;padding:12px;margin:8px 0 20px 0;background:#0f172a;color:#fbbf24;border:1px solid #334155;border-radius:6px;font-size:18px">
        
        <label style="font-size:12px; color:#94a3b8">ESTADO DE PAGO</label><br>
        <select name="est_pago

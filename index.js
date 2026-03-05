const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));

// --- CONEXIÓN A LA DB ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// --- MODELO CARGA (ESPEJO DE LOGISV20) ---
// Usamos "field" para que coincida con las mayúsculas de la DB
const Carga = db.define('Carga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, field: 'ID' },
  oficina: { type: DataTypes.STRING, field: 'OFICINA' },
  emp_gen: { type: DataTypes.STRING, field: 'EMP_GEN' },
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  pto: { type: DataTypes.STRING, field: 'PTO' },
  do_bl: { type: DataTypes.STRING, field: 'DO_BL' },
  cli: { type: DataTypes.STRING, field: 'CLI' },
  subc: { type: DataTypes.STRING, field: 'SUBC' },
  cont: { type: DataTypes.STRING, field: 'CONT' },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  f_d: { type: DataTypes.STRING, field: 'F_D' }, // Fecha Despacho
  desp: { type: DataTypes.STRING, field: 'DESP' }, // Despachador
  f_fin: { type: DataTypes.STRING, field: 'F_FIN' } // Fecha Finalizado
}, { 
  tableName: 'Cargas', 
  timestamps: true // LOGISV20 usa timestamps
});

// --- MODELO FINANZAS (NUEVO CONTROL) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;margin:0;padding:20px}
  .container{max-width:1400px;margin:auto}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .sc{overflow-x:auto;background:#1e293b;border-radius:12px;border:1px solid #334155;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1)}
  table{width:100%;border-collapse:collapse;font-size:11px;min-width:1200px}
  th{background:#1e40af;color:#fff;padding:12px;text-align:left;text-transform:uppercase;letter-spacing:1px}
  td{padding:10px;border-bottom:1px solid #334155}
  tr:hover{background:#334155}
  .btn{background:#2563eb;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:10px}
  .badge{padding:3px 8px;border-radius:12px;font-weight:bold;font-size:10px}
  .status-pend{background:#7f1d1d;color:#fecaca}
  .status-pagado{background:#065f46;color:#a7f3d0}
  .val-flete{color:#34d399;font-weight:bold;font-size:14px}
  .card-stats{background:#1e293b;padding:15px 25px;border-radius:12px;border-left:5px solid #3b82f6;margin-bottom:20px}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const data = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Auto-crear registros en finanzas
    for (let c of data) {
      if (!c.Finanza) await Finanza.create({ cargaId: c.id });
    }

    let totalCuentas = 0;
    let rows = data.map(c => {
      const v = parseFloat(c.Finanza?.v_flete || 0);
      totalCuentas += v;
      const stClass = c.Finanza?.est_pago === 'PAGADO' ? 'status-pagado' : 'status-pend';
      
      return `<tr>
        <td>#${c.id}</td>
        <td><b>${c.placa || '---'}</b></td>
        <td>${c.cli || '---'}</td>
        <td>${c.subc || '---'}</td>
        <td>${c.cont || '---'}</td>
        <td>${c.pto || '---'}</td>
        <td>${c.do_bl || '---'}</td>
        <td>${c.f_d || '---'}</td>
        <td class="val-flete">$ ${v.toLocaleString()}</td>
        <td><span class="badge ${stClass}">${c.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td>${c.desp || '---'}</td>
        <td><a href="/editar/${c.id}" class="btn">GESTIONAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>FINANZAS YEGO</title>${css}</head><body>
      <div class="container">
        <div class="header">
          <h1>YEGO 💰 Finanzas <small style="font-size:12px;color:#94a3b8">Sync: LOGISV20</small></h1>
        </div>
        <div class="card-stats">
          <small style="color:#94a3b8">CARTERA TOTAL</small><br>
          <span style="font-size:28px;color:#34d399;font-weight:bold">$ ${totalCuentas.toLocaleString()}</span>
        </div>
        <div class="sc">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>SUBCLIENTE</th><th>CONTENEDOR</th><th>PUERTO</th><th>DO/BL</th><th>F. DESPACHO</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </body></html>`);
  } catch (err) {
    res.send(`Error: ${err.message}`);
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(`<html><head>${css}</head><body><div class="container" style="max-width:450px;margin-top:50px">
    <div style="background:#1e293b;padding:30px;border-radius:15px;border:1px solid #3b82f6">
      <h2 style="margin-top:0">Liquidar Servicio #${f.cargaId}</h2>
      <p style="color:#94a3b8;font-size:13px">
        <b>Placa:</b> ${f.Carga?.placa}<br>
        <b>Cliente:</b> ${f.Carga?.cli}<br>
        <b>Contenedor:</b> ${f.Carga?.cont}
      </p>
      <form action="/guardar/${f.cargaId}" method="POST">
        <label style="font-size:11px;color:#94a3b8">VALOR DEL FLETE ($)</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:#34d399;border:1px solid #334155;border-radius:8px;font-size:18px;font-weight:bold">
        
        <label style="font-size:11px;color:#94a3b8">ESTADO DE PAGO</label><br>
        <select name="est_pago" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>

        <label style="font-size:11px;color:#94a3b8">OBSERVACIONES FINANCIERAS</label><br>
        <textarea name="obs_fin" style="width:100%;padding:12px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:8px" rows="3">${f.obs_fin || ''}</textarea>
        
        <button type="submit" class="btn" style="width:100%;padding:15px;margin-top:10px;font-size:14px">GUARDAR LIQUIDACIÓN</button>
        <a href="/" style="display:block;text-align:center;margin-top:15px;color:#64748b;text-decoration:none;font-size:12px">Volver al listado</a>
      </form>
    </div></div></body></html>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log("Finanzas YEGO Activo")));

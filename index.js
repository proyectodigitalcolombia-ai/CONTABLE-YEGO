const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONEXIÓN A LA BASE DE DATOS (LOGISV20) ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: { 
    ssl: { require: true, rejectUnauthorized: false } 
  }
});

// --- MODELO CARGA (CON MAPEO DE MAYÚSCULAS) ---
// Aquí corregimos el error "column Carga.ID does not exist"
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: 'ID' // Forzamos a buscar la columna en mayúsculas
  },
  oficina: { type: DataTypes.STRING, field: 'OFICINA' },
  empresa: { type: DataTypes.STRING, field: 'EMP_GEN' },
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  cli: { type: DataTypes.STRING, field: 'CLI' },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  fecha: { type: DataTypes.STRING, field: 'F_D' },
  despachador: { type: DataTypes.STRING, field: 'DESP' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// --- MODELO FINANZAS (TU TABLA CONTABLE) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

// Relación entre logística y finanzas
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS VISUALES ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;margin:0;padding:20px}
  .container{max-width:1200px;margin:auto}
  h1{color:#3b82f6;border-bottom:2px solid #1e40af;padding-bottom:10px}
  .card-resumen{background:#1e293b;padding:15px;border-radius:10px;margin-bottom:20px;border-left:5px solid #10b981}
  .table-container{overflow-x:auto;background:#1e293b;border-radius:12px;border:1px solid #334155}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1e40af;color:#fff;padding:12px;text-align:left}
  td{padding:10px;border-bottom:1px solid #334155}
  .badge{padding:4px 8px;border-radius:15px;font-weight:bold;font-size:10px}
  .pend{background:#7f1d1d;color:#fecaca}
  .pago{background:#065f46;color:#a7f3d0}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:5px;font-size:11px}
</style>`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const servicios = await Carga.findAll({ include: [Finanza], order: [['id', 'DESC']] });
    
    // Sincronización automática de registros faltantes
    for (let s of servicios) {
      if (!s.Finanza) await Finanza.create({ cargaId: s.id });
    }

    let filas = servicios.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><b>${s.placa || '---'}</b></td>
        <td>${s.cli || '---'}</td>
        <td>${s.fecha || '---'}</td>
        <td style="color:#10b981;font-weight:bold">$ ${(parseFloat(s.Finanza?.v_flete || 0)).toLocaleString()}</td>
        <td><span class="badge ${s.Finanza?.est_pago === 'PAGADO' ? 'pago' : 'pend'}">${s.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td>${s.despachador || '---'}</td>
        <td><a href="/editar/${s.id}" class="btn">GESTIONAR</a></td>
      </tr>`).join('');

    res.send(\`<html><head><title>YEGO Finanzas</title>\${css}</head><body>
      <div class="container">
        <h1>💰 Control Contable - YEGO</h1>
        <div class="card-resumen">
          <strong>Estado de Sincronización:</strong> ✅ Conectado a LOGISV20
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FECHA</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>\${filas}</tbody>
          </table>
        </div>
      </div>
    </body></html>\`);
  } catch (err) {
    res.status(500).send(\`<h2>Error de Sincronización</h2><p>Detalle técnico: \${err.message}</p>\`);
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOne({ where: { cargaId: req.params.id }, include: [Carga] });
  res.send(\`<html><head>\${css}</head><body><div class="container" style="max-width:400px;margin-top:50px">
    <div style="background:#1e293b;padding:25px;border-radius:15px;border:1px solid #3b82f6">
      <h3>Liquidar Servicio #\${f.cargaId}</h3>
      <form action="/guardar/\${f.cargaId}" method="POST">
        <label>VALOR FLETE:</label><br>
        <input type="number" name="v_flete" value="\${f.v_flete}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:#10b981;border:1px solid #334155;border-radius:5px;font-size:18px"><br>
        <label>ESTADO:</label><br>
        <select name="est_pago" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
          <option \${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option \${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select><br>
        <label>OBSERVACIONES:</label><br>
        <textarea name="obs_fin" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">\${f.obs_fin || ''}</textarea>
        <button type="submit" class="btn" style="width:100%;padding:12px;margin-top:10px;cursor:pointer">GUARDAR CAMBIOS</button>
      </form>
    </div></div></body></html>\`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

// --- INICIALIZACIÓN ---
const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log('🚀 Finanzas YEGO operativo'));
});
